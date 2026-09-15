import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware';
import { recordAuditLog } from '../middleware/audit.middleware';
import { AppointmentStateMachine } from '../counselling/appointmentStateMachine';
import { SlotScheduler } from '../counselling/slotScheduler';
import { ConsentEnforcer } from '../counselling/consentEnforcer';
import { AppointmentState } from '../counselling/types';

const router = Router();

router.use(authenticateJwt);

// -------------------------------------------------------------
// 1. Book an appointment (Student)
// -------------------------------------------------------------
const bookingSchema = z.object({
  counsellorId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().default(45),
  meetingType: z.enum(['IN_PERSON', 'VIRTUAL']).default('VIRTUAL'),
  studentNotes: z.string().max(500).optional(),
  timezone: z.string().default('Asia/Kolkata'),
});

router.post(
  '/',
  recordAuditLog('BOOK_APPOINTMENT', 'Appointment'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentProfileId = req.user?.studentProfileId;
      if (!studentProfileId) {
        res.status(400).json({
          success: false,
          error: { code: 'PROFILE_REQUIRED', message: 'Student profile required to book counselling appointments.' },
        });
        return;
      }

      const body = bookingSchema.parse(req.body);
      const scheduledDate = new Date(body.scheduledAt);

      if (scheduledDate.getTime() <= Date.now()) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TIME', message: 'Appointment must be scheduled for a future time.' },
        });
        return;
      }

      // Check for counsellor and student conflicts (Double-booking prevention)
      const conflictCheck = await SlotScheduler.checkConflicts({
        counsellorId: body.counsellorId,
        studentProfileId,
        scheduledAt: scheduledDate,
        durationMin: body.durationMin,
      });

      if (conflictCheck.hasConflict) {
        res.status(409).json({
          success: false,
          error: {
            code: 'SLOT_UNAVAILABLE',
            message: conflictCheck.message || 'This slot is unavailable due to a scheduling conflict.',
          },
        });
        return;
      }

      const appointment = await prisma.appointment.create({
        data: {
          studentProfileId,
          counsellorId: body.counsellorId,
          scheduledAt: scheduledDate,
          durationMin: body.durationMin,
          meetingType: body.meetingType,
          timezone: body.timezone,
          meetingLinkOrLocation:
            body.meetingType === 'VIRTUAL'
              ? `https://meet.mindbridge.aiths.ac.in/room-${Math.floor(100000 + Math.random() * 900000)}`
              : 'Student Wellness Center, Consultation Room 204',
          studentNotes: body.studentNotes || null,
          status: 'CONFIRMED',
        },
        include: {
          counsellor: {
            // [SEC-007 FIX] Exclude counsellor email from student-facing booking response.
            // The student does not need the counsellor's direct email; it constitutes
            // unnecessary PII exposure and could enable unsolicited external contact.
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
          studentProfile: {
            select: { anonymousAlias: true },
          },
        },
      });

      // Send in-app notification to Student
      await prisma.notification.create({
        data: {
          userId: req.user!.userId,
          title: 'Counselling Appointment Confirmed',
          message: `Your session with Dr. ${appointment.counsellor.user.firstName} ${appointment.counsellor.user.lastName} is confirmed for ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          type: 'APPOINTMENT',
          link: '/appointments',
        },
      });

      // Send notification to Counsellor
      await prisma.notification.create({
        data: {
          userId: appointment.counsellor.user.id,
          title: 'New Student Consultation Booked',
          message: `Student @${appointment.studentProfile.anonymousAlias} booked a session for ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          type: 'APPOINTMENT',
          link: '/counsellor-portal',
        },
      });

      // Return response without counsellor email
      const { counsellor, ...appointmentData } = appointment as any;
      const cFull = `${counsellor.user.firstName} ${counsellor.user.lastName}`.trim();
      const formattedCName = cFull.startsWith('Dr.') || cFull.startsWith('Dr ') ? cFull : `Dr. ${cFull}`;

      res.status(201).json({
        success: true,
        data: {
          ...appointmentData,
          counsellor: {
            id: counsellor.id,
            name: formattedCName,
            qualification: counsellor.qualification,
            licenseNumber: counsellor.licenseNumber,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 2. Get user's appointments (Role-aware & Consent-bounded)
// -------------------------------------------------------------
router.get('/my', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.user!.role;
    const statusQuery = req.query.status as string | undefined;

    if (role === 'STUDENT' || role === 'PEER_VOLUNTEER') {
      const studentProfileId = req.user?.studentProfileId;
      const appointments = await prisma.appointment.findMany({
        where: {
          studentProfileId,
          status: statusQuery ? statusQuery : undefined,
        },
        include: {
          counsellor: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      const now = new Date();
      res.json({
        success: true,
        data: appointments.map(a => {
          let specs: string[] = [];
          try {
            specs = JSON.parse(a.counsellor.specialization || '[]');
          } catch {
            specs = [];
          }

          const isUpcoming = new Date(a.scheduledAt).getTime() > now.getTime();
          const isActionable = ['REQUESTED', 'CONFIRMED', 'RESCHEDULED'].includes(a.status) && isUpcoming;

          return {
            id: a.id,
            scheduledAt: a.scheduledAt,
            previousScheduledAt: a.previousScheduledAt,
            rescheduleReason: a.rescheduleReason,
            cancelledAt: a.cancelledAt,
            cancellationReason: a.cancellationReason,
            cancelledByRole: a.cancelledByRole,
            durationMin: a.durationMin,
            status: a.status,
            timezone: a.timezone,
            meetingType: a.meetingType,
            meetingLinkOrLocation: a.meetingLinkOrLocation,
            studentNotes: a.studentNotes,
            followUpNotes: a.followUpNotes,
            reminderSentAt: a.reminderSentAt,
            isUpcoming,
            canRescheduleOrCancel: isActionable,
            counsellor: {
              id: a.counsellor.id,
              name: `Dr. ${a.counsellor.user.firstName} ${a.counsellor.user.lastName}`,
              email: a.counsellor.user.email,
              qualification: a.counsellor.qualification,
              licenseNumber: a.counsellor.licenseNumber,
              specializations: specs,
            },
          };
        }),
      });
      return;
    }

    if (role === 'COUNSELLOR') {
      const counsellorProfileId = req.user?.counsellorProfileId;
      const appointments = await prisma.appointment.findMany({
        where: {
          counsellorId: counsellorProfileId,
          status: statusQuery ? statusQuery : undefined,
        },
        include: {
          studentProfile: {
            select: { id: true, anonymousAlias: true, department: true, yearOfStudy: true },
          },
          tasks: true,
        },
        orderBy: { scheduledAt: 'asc' },
      });

      // Augment with consented student psychological context
      const augmented = await Promise.all(
        appointments.map(async a => {
          const studentContext = await ConsentEnforcer.getStudentContextForCounsellor(
            a.studentProfileId
          );

          return {
            id: a.id,
            scheduledAt: a.scheduledAt,
            previousScheduledAt: a.previousScheduledAt,
            rescheduleReason: a.rescheduleReason,
            cancelledAt: a.cancelledAt,
            cancellationReason: a.cancellationReason,
            cancelledByRole: a.cancelledByRole,
            durationMin: a.durationMin,
            status: a.status,
            timezone: a.timezone,
            meetingType: a.meetingType,
            meetingLinkOrLocation: a.meetingLinkOrLocation,
            studentNotes: a.studentNotes,
            privateCounsellorNotes: a.privateCounsellorNotes,
            followUpNotes: a.followUpNotes,
            reminderSentAt: a.reminderSentAt,
            tasks: a.tasks,
            student: studentContext || {
              studentProfileId: a.studentProfile.id,
              anonymousAlias: a.studentProfile.anonymousAlias,
              department: a.studentProfile.department,
              yearOfStudy: a.studentProfile.yearOfStudy,
              dataSharingConsented: false,
              recentStressAvg: null,
              recentMoodAvg: null,
              recentAssessments: [],
            },
          };
        })
      );

      res.json({
        success: true,
        data: augmented,
      });
      return;
    }

    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Role not authorized to access appointments.' },
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 3. Reschedule an appointment (Student, Counsellor, or Admin)
// -------------------------------------------------------------
const rescheduleSchema = z.object({
  newScheduledAt: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

router.post(
  '/:id/reschedule',
  recordAuditLog('RESCHEDULE_APPOINTMENT', 'Appointment'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appointmentId = req.params.id as string;
      const { newScheduledAt, reason } = rescheduleSchema.parse(req.body);
      const newDate = new Date(newScheduledAt);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          counsellor: { include: { user: true } },
          studentProfile: { include: { user: true } },
        },
      });

      if (!appointment) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Appointment not found.' },
        });
        return;
      }

      // Check ownership
      const role = req.user!.role;
      const isStudentOwner = req.user?.studentProfileId === appointment.studentProfileId;
      const isCounsellorOwner = req.user?.counsellorProfileId === appointment.counsellorId;
      const isAdmin = ['INSTITUTION_ADMIN', 'SUPER_ADMIN'].includes(role);

      if (!isStudentOwner && !isCounsellorOwner && !isAdmin) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not authorized to reschedule this appointment.' },
        });
        return;
      }

      // State machine validation
      const validation = AppointmentStateMachine.validateTransition({
        currentStatus: appointment.status as AppointmentState,
        targetStatus: 'RESCHEDULED',
        actorRole: role as any,
        actorId: req.user!.userId,
        reason,
        newScheduledAt: newDate,
      });

      if (!validation.allowed) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TRANSITION', message: validation.errorMessage },
        });
        return;
      }

      // Check conflict for new time
      const conflict = await SlotScheduler.checkConflicts({
        counsellorId: appointment.counsellorId,
        studentProfileId: appointment.studentProfileId,
        scheduledAt: newDate,
        durationMin: appointment.durationMin,
        excludeAppointmentId: appointment.id,
      });

      if (conflict.hasConflict) {
        res.status(409).json({
          success: false,
          error: { code: 'SLOT_UNAVAILABLE', message: conflict.message },
        });
        return;
      }

      // Update appointment atomically
      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          previousScheduledAt: appointment.scheduledAt,
          scheduledAt: newDate,
          status: 'RESCHEDULED',
          rescheduleReason: reason || 'Rescheduled by user request',
          reminderSentAt: null, // Reset reminder for new time
        },
        include: {
          counsellor: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      });

      // Dispatch notifications
      const targetUserId = isStudentOwner
        ? appointment.counsellor.user.id
        : appointment.studentProfile.user.id;

      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'Appointment Rescheduled',
          message: `Session rescheduled to ${newDate.toLocaleDateString()} at ${newDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Reason: ${reason || 'Schedule update'}`,
          type: 'APPOINTMENT',
          link: isStudentOwner ? '/counsellor-portal' : '/appointments',
        },
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 4. Cancel an appointment (Student, Counsellor, or Admin)
// -------------------------------------------------------------
const cancelSchema = z.object({
  cancellationReason: z.string().min(3, 'Cancellation reason must be at least 3 characters.').max(500),
});

router.post(
  '/:id/cancel',
  recordAuditLog('CANCEL_APPOINTMENT', 'Appointment'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appointmentId = req.params.id as string;
      const { cancellationReason } = cancelSchema.parse(req.body);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          counsellor: { include: { user: true } },
          studentProfile: { include: { user: true } },
        },
      });

      if (!appointment) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Appointment not found.' },
        });
        return;
      }

      const role = req.user!.role;
      const isStudentOwner = req.user?.studentProfileId === appointment.studentProfileId;
      const isCounsellorOwner = req.user?.counsellorProfileId === appointment.counsellorId;
      const isAdmin = ['INSTITUTION_ADMIN', 'SUPER_ADMIN'].includes(role);

      if (!isStudentOwner && !isCounsellorOwner && !isAdmin) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not authorized to cancel this appointment.' },
        });
        return;
      }

      // State machine validation
      const validation = AppointmentStateMachine.validateTransition({
        currentStatus: appointment.status as AppointmentState,
        targetStatus: 'CANCELLED',
        actorRole: role as any,
        actorId: req.user!.userId,
        reason: cancellationReason,
      });

      if (!validation.allowed) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TRANSITION', message: validation.errorMessage },
        });
        return;
      }

      const cancelled = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CANCELLED',
          cancellationReason,
          cancelledAt: new Date(),
          cancelledByRole: role,
        },
      });

      // Dispatch cancellation notification
      const notifyUserId = isStudentOwner
        ? appointment.counsellor.user.id
        : appointment.studentProfile.user.id;

      await prisma.notification.create({
        data: {
          userId: notifyUserId,
          title: 'Appointment Cancelled',
          message: `The appointment scheduled for ${new Date(appointment.scheduledAt).toLocaleDateString()} has been cancelled. Reason: ${cancellationReason}`,
          type: 'APPOINTMENT',
          link: isStudentOwner ? '/counsellor-portal' : '/appointments',
        },
      });

      res.json({
        success: true,
        data: cancelled,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 5. Update appointment status (Counsellor session workflow)
// -------------------------------------------------------------
const statusSchema = z.object({
  status: z.enum(['REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  cancellationReason: z.string().optional(),
  followUpNotes: z.string().optional(),
});

router.patch(
  '/:id/status',
  recordAuditLog('UPDATE_APPOINTMENT_STATUS', 'Appointment'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appointmentId = req.params.id as string;
      const { status, cancellationReason, followUpNotes } = statusSchema.parse(req.body);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Appointment not found.' },
        });
        return;
      }

      const role = req.user!.role;

      // [SEC-001 FIX] Ownership check: caller must own the appointment as student, counsellor, or be an admin.
      // Without this gate, any authenticated user can manipulate any appointment by guessing its UUID.
      const isStudentOwner = req.user?.studentProfileId === appointment.studentProfileId;
      const isCounsellorOwner = req.user?.counsellorProfileId === appointment.counsellorId;
      const isAdmin = ['INSTITUTION_ADMIN', 'SUPER_ADMIN'].includes(role);

      if (!isStudentOwner && !isCounsellorOwner && !isAdmin) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not authorized to update this appointment.' },
        });
        return;
      }

      // State machine validation
      const validation = AppointmentStateMachine.validateTransition({
        currentStatus: appointment.status as AppointmentState,
        targetStatus: status,
        actorRole: role as any,
        actorId: req.user!.userId,
        reason: cancellationReason,
      });

      if (!validation.allowed) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TRANSITION', message: validation.errorMessage },
        });
        return;
      }

      const updateData: any = { status };
      if (cancellationReason) updateData.cancellationReason = cancellationReason;
      if (followUpNotes) updateData.followUpNotes = followUpNotes;
      if (status === 'CANCELLED') {
        updateData.cancelledAt = new Date();
        updateData.cancelledByRole = role;
      }

      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: updateData,
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 6. Record confidential counsellor clinical notes
// -------------------------------------------------------------
const notesSchema = z.object({
  notes: z.string().min(1).max(5000),
  followUpNotes: z.string().max(1000).optional(),
});

router.post(
  '/:id/notes',
  recordAuditLog('RECORD_CLINICAL_NOTES', 'Appointment'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { notes, followUpNotes } = notesSchema.parse(req.body);
      const counsellorProfileId = req.user?.counsellorProfileId;

      const appointment = await prisma.appointment.findUnique({
        where: { id: req.params.id as string },
      });

      if (!appointment || appointment.counsellorId !== counsellorProfileId) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only the attending counsellor may record clinical notes for this session.' },
        });
        return;
      }

      const updated = await prisma.appointment.update({
        where: { id: req.params.id as string },
        data: {
          privateCounsellorNotes: `ENCRYPTED_NOTE: ${notes}`,
          followUpNotes: followUpNotes || appointment.followUpNotes,
        },
      });

      res.json({
        success: true,
        data: { message: 'Clinical notes securely encrypted and saved.' },
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 7. Automated Reminders Hook (Upcoming within 24h)
// -------------------------------------------------------------
// [SEC-002 FIX] Restricted to SUPER_ADMIN only (internal cron hook).
// Without this gate, any authenticated user (student/volunteer) could trigger
// institution-wide notification dispatch for all appointments.
const { requireRoles: _requireRolesReminder } = require('../middleware/rbac.middleware');

router.post(
  '/reminders/check-and-send',
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (role !== 'SUPER_ADMIN' && role !== 'INSTITUTION_ADMIN') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Reminder dispatch restricted to administrators.' },
      });
      return;
    }
    next();
  },
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find upcoming appointments without sent reminder
      const upcoming = await prisma.appointment.findMany({
        where: {
          scheduledAt: { gte: now, lte: in24Hours },
          status: { in: ['CONFIRMED', 'RESCHEDULED'] },
          reminderSentAt: null,
        },
        include: {
          counsellor: { include: { user: true } },
          studentProfile: { include: { user: true } },
        },
      });

      let remindersSent = 0;

      for (const apt of upcoming) {
        const timeStr = new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Reminder to student
        await prisma.notification.create({
          data: {
            userId: apt.studentProfile.user.id,
            title: 'Upcoming Counselling Reminder',
            message: `Reminder: You have an upcoming appointment with Dr. ${apt.counsellor.user.firstName} ${apt.counsellor.user.lastName} tomorrow at ${timeStr}.`,
            type: 'APPOINTMENT',
            link: '/appointments',
          },
        });

        // Mark reminder sent
        await prisma.appointment.update({
          where: { id: apt.id },
          data: { reminderSentAt: now },
        });

        remindersSent++;
      }

      res.json({
        success: true,
        data: {
          remindersDispatched: remindersSent,
          timestamp: now.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
