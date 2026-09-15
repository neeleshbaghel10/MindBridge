// MINDBRIDGE - COUNSELLING SLOT SCHEDULER & CONFLICT RESOLVER
// Computes bookable slots, enforces interval overlap rules, and prevents double-booking

import { prisma } from '../prisma/client';
import { TimeSlot } from './types';

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictType?: 'COUNSELLOR_BUSY' | 'STUDENT_BUSY';
  message?: string;
}

export class SlotScheduler {
  public static readonly DEFAULT_TIMEZONE = 'Asia/Kolkata';
  public static readonly DEFAULT_SLOT_DURATION = 45; // minutes

  /**
   * Checks for overlapping appointments for both counsellor and student.
   * Returns a conflict result if an overlapping non-cancelled appointment exists.
   */
  public static async checkConflicts(params: {
    counsellorId: string;
    studentProfileId: string;
    scheduledAt: Date;
    durationMin?: number;
    excludeAppointmentId?: string;
  }): Promise<ConflictCheckResult> {
    const duration = params.durationMin || this.DEFAULT_SLOT_DURATION;
    const slotStart = params.scheduledAt;
    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

    // 1. Check Counsellor double-booking:
    // Look for appointments where:
    // scheduledAt < slotEnd AND (scheduledAt + duration) > slotStart
    const counsellorAppointments = await prisma.appointment.findMany({
      where: {
        counsellorId: params.counsellorId,
        id: params.excludeAppointmentId ? { not: params.excludeAppointmentId } : undefined,
        status: { in: ['REQUESTED', 'CONFIRMED', 'RESCHEDULED'] },
      },
      select: { id: true, scheduledAt: true, durationMin: true },
    });

    for (const apt of counsellorAppointments) {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + apt.durationMin * 60 * 1000);

      // Overlap condition: startA < endB && endA > startB
      if (aptStart < slotEnd && aptEnd > slotStart) {
        return {
          hasConflict: true,
          conflictType: 'COUNSELLOR_BUSY',
          message: 'The counsellor already has another session scheduled during this time slot.',
        };
      }
    }

    // 2. Check Student overlapping appointment:
    // Ensure the student is not trying to book two simultaneous appointments
    const studentAppointments = await prisma.appointment.findMany({
      where: {
        studentProfileId: params.studentProfileId,
        id: params.excludeAppointmentId ? { not: params.excludeAppointmentId } : undefined,
        status: { in: ['REQUESTED', 'CONFIRMED', 'RESCHEDULED'] },
      },
      select: { id: true, scheduledAt: true, durationMin: true },
    });

    for (const apt of studentAppointments) {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + apt.durationMin * 60 * 1000);

      if (aptStart < slotEnd && aptEnd > slotStart) {
        return {
          hasConflict: true,
          conflictType: 'STUDENT_BUSY',
          message: 'You already have another counselling appointment scheduled at this time.',
        };
      }
    }

    return { hasConflict: false };
  }

  /**
   * Generates prospective and bookable discrete time slots for a counsellor on a specific target date.
   */
  public static async getAvailableSlotsForDate(params: {
    counsellorId: string;
    targetDate: string; // YYYY-MM-DD
    timezone?: string;
  }): Promise<{
    date: string;
    timezone: string;
    slots: TimeSlot[];
    isWorkingDay: boolean;
  }> {
    const tz = params.timezone || this.DEFAULT_TIMEZONE;
    // Parse target date (local date components)
    const [yearStr, monthStr, dayStr] = params.targetDate.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const dateObj = new Date(Date.UTC(year, month, day));
    const dayOfWeek = dateObj.getUTCDay(); // 0 (Sun) - 6 (Sat)

    // Check if the counsellor has recurring availability on this weekday
    const availability = await prisma.counsellorAvailability.findFirst({
      where: {
        counsellorId: params.counsellorId,
        dayOfWeek,
        isBlocked: false,
      },
    });

    // Check if the counsellor has blocked this specific date
    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59));

    const dateOverride = await prisma.counsellorAvailability.findFirst({
      where: {
        counsellorId: params.counsellorId,
        overrideDate: { gte: startOfDay, lte: endOfDay },
        isBlocked: true,
      },
    });

    if (!availability || dateOverride) {
      return {
        date: params.targetDate,
        timezone: tz,
        slots: [],
        isWorkingDay: false,
      };
    }

    const slotDuration = availability.slotDurationMin || this.DEFAULT_SLOT_DURATION;
    const [startH, startM] = availability.startTime.split(':').map(Number);
    const [endH, endM] = availability.endTime.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Fetch existing appointments on that date
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        counsellorId: params.counsellorId,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ['REQUESTED', 'CONFIRMED', 'RESCHEDULED'] },
      },
    });

    const slots: TimeSlot[] = [];
    const now = new Date();

    for (let m = startMinutes; m + slotDuration <= endMinutes; m += slotDuration) {
      const slotHour = Math.floor(m / 60);
      const slotMin = m % 60;
      const timeStr = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;

      // Construct UTC ISO timestamp
      const scheduledAtDate = new Date(Date.UTC(year, month, day, slotHour, slotMin, 0));
      const scheduledAtIso = scheduledAtDate.toISOString();
      const endAtDate = new Date(scheduledAtDate.getTime() + slotDuration * 60 * 1000);
      const endAtIso = endAtDate.toISOString();

      // Check if slot has already passed
      if (scheduledAtDate.getTime() <= now.getTime()) {
        slots.push({
          time: timeStr,
          scheduledAt: scheduledAtIso,
          endTime: endAtIso,
          durationMin: slotDuration,
          isAvailable: false,
          unavailableReason: 'OUTSIDE_WORKING_HOURS',
        });
        continue;
      }

      // Check if already booked
      const isBooked = existingAppointments.some(apt => {
        const aptStart = new Date(apt.scheduledAt).getTime();
        const aptEnd = aptStart + apt.durationMin * 60 * 1000;
        return scheduledAtDate.getTime() < aptEnd && endAtDate.getTime() > aptStart;
      });

      slots.push({
        time: timeStr,
        scheduledAt: scheduledAtIso,
        endTime: endAtIso,
        durationMin: slotDuration,
        isAvailable: !isBooked,
        unavailableReason: isBooked ? 'ALREADY_BOOKED' : undefined,
      });
    }

    return {
      date: params.targetDate,
      timezone: tz,
      slots,
      isWorkingDay: true,
    };
  }
}
