import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { recordAuditLog } from '../middleware/audit.middleware';
import { SlotScheduler } from '../counselling/slotScheduler';

const router = Router();

router.use(authenticateJwt);

// -------------------------------------------------------------
// 1. Counsellor Directory with Advanced Filtering
// -------------------------------------------------------------
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { specialization, language, dayOfWeek, search } = req.query;

    const counsellors = await prisma.counsellorProfile.findMany({
      where: {
        isAvailable: true,
        deletedAt: null,
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        availabilities: {
          where: { isBlocked: false },
        },
      },
    });

    let mapped = counsellors.map(c => {
      let parsedSpecs: string[] = [];
      let parsedLangs: string[] = [];
      try {
        parsedSpecs = JSON.parse(c.specialization || '[]');
      } catch {
        parsedSpecs = [];
      }
      try {
        parsedLangs = JSON.parse(c.languagesSpoken || '[]');
      } catch {
        parsedLangs = [];
      }

      const fullName = `${c.user.firstName} ${c.user.lastName}`.trim();
      const formattedName = fullName.startsWith('Dr.') || fullName.startsWith('Dr ') ? fullName : `Dr. ${fullName}`;

      return {
        id: c.id,
        name: formattedName,
        // [SEC-008 FIX] Email removed from public counsellor directory.
        // Exposing email to all authenticated students creates social engineering risk
        // and is unnecessary — contact happens through the booking system.
        licenseNumber: c.licenseNumber,
        qualification: c.qualification,
        bio: c.bio,
        specializations: parsedSpecs,
        languages: parsedLangs,
        maxDailySlots: c.maxDailySlots,
        availableDays: Array.from(new Set(c.availabilities.map(a => a.dayOfWeek))),
        availabilities: c.availabilities,
      };
    });

    // Apply query filters
    if (specialization && typeof specialization === 'string' && specialization !== 'ALL') {
      mapped = mapped.filter(c =>
        c.specializations.some(s => s.toLowerCase() === (specialization as string).toLowerCase())
      );
    }

    if (language && typeof language === 'string' && language !== 'ALL') {
      mapped = mapped.filter(c =>
        c.languages.some(l => l.toLowerCase() === (language as string).toLowerCase())
      );
    }

    if (dayOfWeek !== undefined && dayOfWeek !== '') {
      const targetDay = parseInt(dayOfWeek as string, 10);
      if (!isNaN(targetDay)) {
        mapped = mapped.filter(c => c.availableDays.includes(targetDay));
      }
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      mapped = mapped.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.qualification.toLowerCase().includes(q) ||
          (c.bio && c.bio.toLowerCase().includes(q)) ||
          c.specializations.some(s => s.toLowerCase().includes(q))
      );
    }

    res.json({
      success: true,
      data: mapped,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 2. Dynamic Available Slots Calculation (with timezone)
// -------------------------------------------------------------
router.get('/:id/available-slots', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const counsellorId = req.params.id as string;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const timezone = (req.query.timezone as string) || 'Asia/Kolkata';

    // Verify counsellor exists
    const counsellor = await prisma.counsellorProfile.findUnique({
      where: { id: counsellorId },
    });

    if (!counsellor) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Counsellor not found.' },
      });
      return;
    }

    const slotData = await SlotScheduler.getAvailableSlotsForDate({
      counsellorId,
      targetDate: date,
      timezone,
    });

    res.json({
      success: true,
      data: slotData,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 3. Counsellor Self Profile Management
// -------------------------------------------------------------
router.get(
  '/profile/me',
  requireRoles(['COUNSELLOR']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const counsellorProfileId = req.user?.counsellorProfileId;
      if (!counsellorProfileId) {
        res.status(404).json({
          success: false,
          error: { code: 'PROFILE_NOT_FOUND', message: 'Counsellor profile not associated with this account.' },
        });
        return;
      }

      const profile = await prisma.counsellorProfile.findUnique({
        where: { id: counsellorProfileId },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          availabilities: true,
        },
      });

      if (!profile) {
        res.status(404).json({
          success: false,
          error: { code: 'PROFILE_NOT_FOUND', message: 'Profile record not found.' },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: profile.id,
          firstName: profile.user.firstName,
          lastName: profile.user.lastName,
          email: profile.user.email,
          licenseNumber: profile.licenseNumber,
          qualification: profile.qualification,
          bio: profile.bio,
          specializations: JSON.parse(profile.specialization || '[]'),
          languages: JSON.parse(profile.languagesSpoken || '[]'),
          isAvailable: profile.isAvailable,
          maxDailySlots: profile.maxDailySlots,
          availabilities: profile.availabilities,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

const updateProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  qualification: z.string().max(100).optional(),
  specializations: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  maxDailySlots: z.number().int().min(1).max(12).optional(),
  isAvailable: z.boolean().optional(),
});

router.patch(
  '/profile/me',
  requireRoles(['COUNSELLOR']),
  recordAuditLog('UPDATE_COUNSELLOR_PROFILE', 'CounsellorProfile'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const counsellorProfileId = req.user?.counsellorProfileId;
      if (!counsellorProfileId) {
        res.status(404).json({
          success: false,
          error: { code: 'PROFILE_NOT_FOUND', message: 'Counsellor profile required.' },
        });
        return;
      }

      const body = updateProfileSchema.parse(req.body);

      const updateData: any = {};
      if (body.bio !== undefined) updateData.bio = body.bio;
      if (body.qualification !== undefined) updateData.qualification = body.qualification;
      if (body.specializations !== undefined) updateData.specialization = JSON.stringify(body.specializations);
      if (body.languages !== undefined) updateData.languagesSpoken = JSON.stringify(body.languages);
      if (body.maxDailySlots !== undefined) updateData.maxDailySlots = body.maxDailySlots;
      if (body.isAvailable !== undefined) updateData.isAvailable = body.isAvailable;

      const updated = await prisma.counsellorProfile.update({
        where: { id: counsellorProfileId },
        data: updateData,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      });

      res.json({
        success: true,
        data: {
          id: updated.id,
          name: `${updated.user.firstName} ${updated.user.lastName}`,
          bio: updated.bio,
          qualification: updated.qualification,
          specializations: JSON.parse(updated.specialization || '[]'),
          languages: JSON.parse(updated.languagesSpoken || '[]'),
          maxDailySlots: updated.maxDailySlots,
          isAvailable: updated.isAvailable,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 4. Availability & Working Hours Management
// -------------------------------------------------------------
router.get(
  ['/availability', '/availability/slots'],
  requireRoles(['COUNSELLOR']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const counsellorProfileId = req.user?.counsellorProfileId;
      const slots = await prisma.counsellorAvailability.findMany({
        where: { counsellorId: counsellorProfileId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      res.json({
        success: true,
        data: slots,
      });
    } catch (error) {
      next(error);
    }
  }
);

const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDurationMin: z.number().int().default(45),
  timezone: z.string().default('Asia/Kolkata'),
});

router.post(
  ['/availability', '/availability/slots'],
  requireRoles(['COUNSELLOR']),
  recordAuditLog('CREATE_AVAILABILITY_SLOT', 'CounsellorAvailability'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const counsellorProfileId = req.user?.counsellorProfileId;
      if (!counsellorProfileId) {
        res.status(400).json({
          success: false,
          error: { code: 'PROFILE_REQUIRED', message: 'Counsellor profile required.' },
        });
        return;
      }

      const data = availabilitySlotSchema.parse(req.body);

      const slot = await prisma.counsellorAvailability.create({
        data: {
          counsellorId: counsellorProfileId,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          slotDurationMin: data.slotDurationMin,
          timezone: data.timezone,
          isRecurring: true,
        },
      });

      res.status(201).json({
        success: true,
        data: slot,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/availability/slots/:slotId',
  requireRoles(['COUNSELLOR']),
  recordAuditLog('DELETE_AVAILABILITY_SLOT', 'CounsellorAvailability'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const counsellorProfileId = req.user?.counsellorProfileId;
      const slotId = req.params.slotId as string;

      const slot = await prisma.counsellorAvailability.findUnique({
        where: { id: slotId },
      });

      if (!slot || slot.counsellorId !== counsellorProfileId) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Availability slot not found or not owned by you.' },
        });
        return;
      }

      await prisma.counsellorAvailability.delete({
        where: { id: slotId },
      });

      res.json({
        success: true,
        data: { message: 'Availability slot removed.' },
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 5. Follow-Up Clinical Tasks (Counsellor side)
// -------------------------------------------------------------
const createTaskSchema = z.object({
  studentProfileId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
});

router.get(
  '/tasks',
  requireRoles(['COUNSELLOR']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const counsellorProfileId = req.user?.counsellorProfileId;
      if (!counsellorProfileId) {
        res.status(400).json({
          success: false,
          error: { code: 'PROFILE_REQUIRED', message: 'Counsellor profile required.' },
        });
        return;
      }

      const statusFilter = req.query.status as string | undefined;

      const tasks = await prisma.followUpTask.findMany({
        where: {
          counsellorProfileId,
          status: statusFilter ? statusFilter : undefined,
        },
        include: {
          studentProfile: {
            select: { id: true, anonymousAlias: true, department: true, yearOfStudy: true },
          },
          appointment: {
            select: { id: true, scheduledAt: true, status: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/tasks',
  requireRoles(['COUNSELLOR']),
  recordAuditLog('CREATE_FOLLOWUP_TASK', 'FollowUpTask'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const counsellorProfileId = req.user?.counsellorProfileId;
      if (!counsellorProfileId) {
        res.status(400).json({
          success: false,
          error: { code: 'PROFILE_REQUIRED', message: 'Counsellor profile required.' },
        });
        return;
      }

      const body = createTaskSchema.parse(req.body);

      const task = await prisma.followUpTask.create({
        data: {
          counsellorProfileId,
          studentProfileId: body.studentProfileId || null,
          appointmentId: body.appointmentId || null,
          title: body.title,
          description: body.description || null,
          priority: body.priority,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          status: 'PENDING',
        },
      });

      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }
);

const updateTaskSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

router.patch(
  '/tasks/:taskId',
  requireRoles(['COUNSELLOR']),
  recordAuditLog('UPDATE_FOLLOWUP_TASK', 'FollowUpTask'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const counsellorProfileId = req.user?.counsellorProfileId;
      const taskId = req.params.taskId as string;

      const task = await prisma.followUpTask.findUnique({
        where: { id: taskId },
      });

      if (!task || task.counsellorProfileId !== counsellorProfileId) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Follow-up task not found or not owned by you.' },
        });
        return;
      }

      const body = updateTaskSchema.parse(req.body);

      const updateData: any = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.priority !== undefined) updateData.priority = body.priority;
      if (body.status !== undefined) {
        updateData.status = body.status;
        if (body.status === 'COMPLETED') {
          updateData.completedAt = new Date();
        } else {
          updateData.completedAt = null;
        }
      }
      if (body.dueDate !== undefined) {
        updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      }

      const updated = await prisma.followUpTask.update({
        where: { id: taskId },
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

router.delete(
  '/tasks/:taskId',
  requireRoles(['COUNSELLOR']),
  recordAuditLog('DELETE_FOLLOWUP_TASK', 'FollowUpTask'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const counsellorProfileId = req.user?.counsellorProfileId;
      const taskId = req.params.taskId as string;

      const task = await prisma.followUpTask.findUnique({
        where: { id: taskId },
      });

      if (!task || task.counsellorProfileId !== counsellorProfileId) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Follow-up task not found.' },
        });
        return;
      }

      await prisma.followUpTask.delete({
        where: { id: taskId },
      });

      res.json({
        success: true,
        data: { message: 'Task deleted successfully.' },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
