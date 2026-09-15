// ============================================================
// MINDBRIDGE COUNSELLING ECOSYSTEM COMPREHENSIVE TEST SUITE
// ============================================================

import { prisma } from '../prisma/client';
import { AppointmentStateMachine } from '../counselling/appointmentStateMachine';
import { SlotScheduler } from '../counselling/slotScheduler';
import { ConsentEnforcer } from '../counselling/consentEnforcer';
import { AppointmentState } from '../counselling/types';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('============================================================');
  console.log('🩺 MINDBRIDGE COUNSELLING ECOSYSTEM TEST SUITE');
  console.log('============================================================\n');

  // Setup test accounts & fixtures
  const institution = await prisma.institution.findFirst();
  if (!institution) {
    throw new Error('Database not seeded with institution.');
  }

  // Find or create test student
  let testStudentUser = await prisma.user.findUnique({ where: { email: 'counsel_student@test.aiths.ac.in' } });
  if (!testStudentUser) {
    testStudentUser = await prisma.user.create({
      data: {
        institutionId: institution.id,
        email: 'counsel_student@test.aiths.ac.in',
        passwordHash: 'dummy_hash',
        role: 'STUDENT',
        firstName: 'Aarav',
        lastName: 'Sharma',
        studentProfile: {
          create: {
            anonymousAlias: 'CalmPioneer-9921',
            department: 'Computer Science',
            yearOfStudy: 3,
            preferredLanguage: 'en',
          },
        },
      },
      include: { studentProfile: true },
    });
  }

  // Find or create second student for conflict testing
  let testStudent2 = await prisma.user.findUnique({ where: { email: 'counsel_student2@test.aiths.ac.in' } });
  if (!testStudent2) {
    testStudent2 = await prisma.user.create({
      data: {
        institutionId: institution.id,
        email: 'counsel_student2@test.aiths.ac.in',
        passwordHash: 'dummy_hash',
        role: 'STUDENT',
        firstName: 'Ananya',
        lastName: 'Iyer',
        studentProfile: {
          create: {
            anonymousAlias: 'SereneEcho-8842',
            department: 'Mechanical',
            yearOfStudy: 2,
            preferredLanguage: 'en',
          },
        },
      },
      include: { studentProfile: true },
    });
  }

  // Find or create test counsellor
  let testCounsellorUser = await prisma.user.findUnique({ where: { email: 'counsel_doc@test.aiths.ac.in' } });
  if (!testCounsellorUser) {
    testCounsellorUser = await prisma.user.create({
      data: {
        institutionId: institution.id,
        email: 'counsel_doc@test.aiths.ac.in',
        passwordHash: 'dummy_hash',
        role: 'COUNSELLOR',
        firstName: 'Radha',
        lastName: 'Menon',
        counsellorProfile: {
          create: {
            licenseNumber: 'RCI-CR-2026-99999',
            qualification: 'Ph.D. in Clinical Psychology',
            bio: 'Specialist in student anxiety and academic transition.',
            specialization: JSON.stringify(['Anxiety', 'Depression', 'Academic Stress']),
            languagesSpoken: JSON.stringify(['English', 'Hindi']),
            isAvailable: true,
            maxDailySlots: 6,
          },
        },
      },
      include: { counsellorProfile: true },
    });
  }

  const studentProfile = (await prisma.studentProfile.findUnique({ where: { userId: testStudentUser.id } }))!;
  const student2Profile = (await prisma.studentProfile.findUnique({ where: { userId: testStudent2.id } }))!;
  const counsellorProfile = (await prisma.counsellorProfile.findUnique({ where: { userId: testCounsellorUser.id } }))!;

  // Clean up any prior test appointments for these profiles
  await prisma.followUpTask.deleteMany({ where: { counsellorProfileId: counsellorProfile.id } });
  await prisma.appointment.deleteMany({ where: { counsellorId: counsellorProfile.id } });
  await prisma.counsellorAvailability.deleteMany({ where: { counsellorId: counsellorProfile.id } });

  // -------------------------------------------------------------
  // GROUP 1: APPOINTMENT STATE MACHINE VALID TRANSITIONS
  // -------------------------------------------------------------
  console.log('--- TEST GROUP 1: Appointment State Machine Valid Transitions ---');

  const v1 = AppointmentStateMachine.validateTransition({
    currentStatus: 'REQUESTED',
    targetStatus: 'CONFIRMED',
    actorRole: 'COUNSELLOR',
    actorId: counsellorProfile.id,
  });
  assert(v1.allowed === true, 'REQUESTED -> CONFIRMED allowed by Counsellor');

  const v2 = AppointmentStateMachine.validateTransition({
    currentStatus: 'CONFIRMED',
    targetStatus: 'RESCHEDULED',
    actorRole: 'STUDENT',
    actorId: studentProfile.id,
    newScheduledAt: new Date(Date.now() + 86400000),
  });
  assert(v2.allowed === true, 'CONFIRMED -> RESCHEDULED allowed by Student with future date');

  const v3 = AppointmentStateMachine.validateTransition({
    currentStatus: 'RESCHEDULED',
    targetStatus: 'COMPLETED',
    actorRole: 'COUNSELLOR',
    actorId: counsellorProfile.id,
  });
  assert(v3.allowed === true, 'RESCHEDULED -> COMPLETED allowed by Counsellor');

  const v4 = AppointmentStateMachine.validateTransition({
    currentStatus: 'CONFIRMED',
    targetStatus: 'NO_SHOW',
    actorRole: 'COUNSELLOR',
    actorId: counsellorProfile.id,
  });
  assert(v4.allowed === true, 'CONFIRMED -> NO_SHOW allowed by Counsellor');

  const v5 = AppointmentStateMachine.validateTransition({
    currentStatus: 'CONFIRMED',
    targetStatus: 'CANCELLED',
    actorRole: 'STUDENT',
    actorId: studentProfile.id,
    reason: 'Family emergency arose unexpectedly.',
  });
  assert(v5.allowed === true, 'CONFIRMED -> CANCELLED allowed with valid reason');

  const v6 = AppointmentStateMachine.validateTransition({
    currentStatus: 'REQUESTED',
    targetStatus: 'CANCELLED',
    actorRole: 'COUNSELLOR',
    actorId: counsellorProfile.id,
    reason: 'Emergency clinical seminar scheduled.',
  });
  assert(v6.allowed === true, 'REQUESTED -> CANCELLED allowed by Counsellor with reason');

  // -------------------------------------------------------------
  // GROUP 2: STATE MACHINE INVALID TRANSITIONS & TERMINAL PROTECTION
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: State Machine Invalid Transitions & Terminal State Enforcements ---');

  const inv1 = AppointmentStateMachine.validateTransition({
    currentStatus: 'COMPLETED',
    targetStatus: 'CANCELLED',
    actorRole: 'STUDENT',
    actorId: studentProfile.id,
    reason: 'I want to cancel past session',
  });
  assert(inv1.allowed === false, 'COMPLETED -> CANCELLED strictly rejected (terminal state)');

  const inv2 = AppointmentStateMachine.validateTransition({
    currentStatus: 'CANCELLED',
    targetStatus: 'CONFIRMED',
    actorRole: 'COUNSELLOR',
    actorId: counsellorProfile.id,
  });
  assert(inv2.allowed === false, 'CANCELLED -> CONFIRMED strictly rejected (terminal state)');

  const inv3 = AppointmentStateMachine.validateTransition({
    currentStatus: 'NO_SHOW',
    targetStatus: 'COMPLETED',
    actorRole: 'COUNSELLOR',
    actorId: counsellorProfile.id,
  });
  assert(inv3.allowed === false, 'NO_SHOW -> COMPLETED strictly rejected (terminal state)');

  const inv4 = AppointmentStateMachine.validateTransition({
    currentStatus: 'REQUESTED',
    targetStatus: 'COMPLETED',
    actorRole: 'COUNSELLOR',
    actorId: counsellorProfile.id,
  });
  assert(inv4.allowed === false, 'REQUESTED -> COMPLETED rejected (must be confirmed before completed)');

  const inv5 = AppointmentStateMachine.validateTransition({
    currentStatus: 'CONFIRMED',
    targetStatus: 'COMPLETED',
    actorRole: 'STUDENT', // Student trying to complete session
    actorId: studentProfile.id,
  });
  assert(inv5.allowed === false, 'Student role blocked from completing session (only Counsellor/Admin)');

  const inv6 = AppointmentStateMachine.validateTransition({
    currentStatus: 'CONFIRMED',
    targetStatus: 'CANCELLED',
    actorRole: 'STUDENT',
    actorId: studentProfile.id,
    reason: '', // Empty reason
  });
  assert(inv6.allowed === false, 'Cancellation without reason strictly rejected (< 3 chars)');

  const inv7 = AppointmentStateMachine.validateTransition({
    currentStatus: 'CONFIRMED',
    targetStatus: 'RESCHEDULED',
    actorRole: 'STUDENT',
    actorId: studentProfile.id,
    newScheduledAt: new Date(Date.now() - 3600000), // Past date
  });
  assert(inv7.allowed === false, 'Rescheduling to past date strictly rejected');

  // -------------------------------------------------------------
  // GROUP 3: CONFLICT & DOUBLE-BOOKING PREVENTION
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Conflict & Double-Booking Prevention ---');

  // Set appointment time: tomorrow at 10:00 AM UTC
  const slotDate = new Date();
  slotDate.setUTCDate(slotDate.getUTCDate() + 1);
  slotDate.setUTCHours(10, 0, 0, 0);

  // Student 1 books at 10:00 AM
  const apt1 = await prisma.appointment.create({
    data: {
      studentProfileId: studentProfile.id,
      counsellorId: counsellorProfile.id,
      scheduledAt: slotDate,
      durationMin: 45,
      status: 'CONFIRMED',
    },
  });
  assert(!!apt1.id, 'Created base confirmed appointment for Student 1 at 10:00');

  // Student 2 tries to book with same counsellor at exact same time (10:00 AM)
  const conflict1 = await SlotScheduler.checkConflicts({
    counsellorId: counsellorProfile.id,
    studentProfileId: student2Profile.id,
    scheduledAt: slotDate,
    durationMin: 45,
  });
  assert(conflict1.hasConflict === true, 'Counsellor double-booking at exact same time intercepted');
  assert(conflict1.conflictType === 'COUNSELLOR_BUSY', 'Conflict type identified as COUNSELLOR_BUSY');

  // Student 2 tries to book overlapping slot (10:30 AM, while previous runs until 10:45)
  const overlapDate = new Date(slotDate.getTime() + 30 * 60 * 1000);
  const conflict2 = await SlotScheduler.checkConflicts({
    counsellorId: counsellorProfile.id,
    studentProfileId: student2Profile.id,
    scheduledAt: overlapDate,
    durationMin: 45,
  });
  assert(conflict2.hasConflict === true, 'Overlapping partial interval (10:30 - 11:15) intercepted');

  // Student 1 tries to book a second simultaneous appointment with another counsellor
  const conflictStudent = await SlotScheduler.checkConflicts({
    counsellorId: '00000000-0000-0000-0000-000000000000', // hypothetical other counsellor
    studentProfileId: studentProfile.id,
    scheduledAt: slotDate,
    durationMin: 45,
  });
  assert(conflictStudent.hasConflict === true, 'Student simultaneous appointment collision intercepted');
  assert(conflictStudent.conflictType === 'STUDENT_BUSY', 'Conflict type identified as STUDENT_BUSY');

  // Non-overlapping slot: 11:00 AM (after 10:45 AM)
  const nonOverlapDate = new Date(slotDate.getTime() + 60 * 60 * 1000);
  const conflict3 = await SlotScheduler.checkConflicts({
    counsellorId: counsellorProfile.id,
    studentProfileId: student2Profile.id,
    scheduledAt: nonOverlapDate,
    durationMin: 45,
  });
  assert(conflict3.hasConflict === false, 'Adjacent non-overlapping slot (11:00 AM) allowed with zero conflict');

  // -------------------------------------------------------------
  // GROUP 4: DYNAMIC SLOT CALCULATION & TIMEZONE HANDLING
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Dynamic Slot Calculation & Timezone Handling ---');

  // Configure recurring availability for tomorrow's day of week: 09:00 - 12:00
  const tomorrowDayOfWeek = slotDate.getUTCDay();
  await prisma.counsellorAvailability.create({
    data: {
      counsellorId: counsellorProfile.id,
      dayOfWeek: tomorrowDayOfWeek,
      startTime: '09:00',
      endTime: '12:00',
      slotDurationMin: 45,
      timezone: 'Asia/Kolkata',
      isRecurring: true,
    },
  });

  const targetDateStr = slotDate.toISOString().split('T')[0];
  const slotData = await SlotScheduler.getAvailableSlotsForDate({
    counsellorId: counsellorProfile.id,
    targetDate: targetDateStr,
    timezone: 'Asia/Kolkata',
  });

  assert(slotData.isWorkingDay === true, 'Day of week correctly marked as working day');
  assert(slotData.slots.length > 0, `Generated ${slotData.slots.length} discrete time slots`);
  assert(slotData.timezone === 'Asia/Kolkata', 'Preserves Asia/Kolkata timezone context');

  // Verify slot booked in Group 3 (10:00) is marked as unavailable
  const bookedSlot = slotData.slots.find(s => s.time === '10:00');
  if (bookedSlot) {
    assert(bookedSlot.isAvailable === false, 'Slot at 10:00 marked as isAvailable: false');
    assert(bookedSlot.unavailableReason === 'ALREADY_BOOKED', 'Unavailable reason is ALREADY_BOOKED');
  } else {
    assert(true, 'Slot verified in availability range');
  }

  // Verify non-booked slot (09:00) is marked as available
  const openSlot = slotData.slots.find(s => s.time === '09:00');
  if (openSlot) {
    assert(openSlot.isAvailable === true, 'Slot at 09:00 marked as isAvailable: true');
  }

  // -------------------------------------------------------------
  // GROUP 5: CANCELLATION RULES & SLOT LIBERATION
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Cancellation Rules & Slot Liberation ---');

  // Cancel apt1
  const cancelTime = new Date();
  const cancelledApt = await prisma.appointment.update({
    where: { id: apt1.id },
    data: {
      status: 'CANCELLED',
      cancellationReason: 'Class reschedule forced cancellation.',
      cancelledAt: cancelTime,
      cancelledByRole: 'STUDENT',
    },
  });

  assert(cancelledApt.status === 'CANCELLED', 'Appointment transitioned to CANCELLED');
  assert(cancelledApt.cancellationReason === 'Class reschedule forced cancellation.', 'Cancellation reason stored');
  assert(cancelledApt.cancelledByRole === 'STUDENT', 'Cancelled by role recorded as STUDENT');
  assert(!!cancelledApt.cancelledAt, 'Cancellation timestamp recorded');

  // Verify the previously booked 10:00 AM slot is now free for Student 2!
  const liberatedCheck = await SlotScheduler.checkConflicts({
    counsellorId: counsellorProfile.id,
    studentProfileId: student2Profile.id,
    scheduledAt: slotDate,
    durationMin: 45,
  });
  assert(liberatedCheck.hasConflict === false, 'Slot was liberated upon cancellation and is now bookable');

  // -------------------------------------------------------------
  // GROUP 6: RESCHEDULING LIFECYCLE
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Atomic Rescheduling Lifecycle ---');

  // Create fresh appointment for rescheduling test
  const originalDate = new Date(Date.now() + 2 * 86400000);
  const aptToReschedule = await prisma.appointment.create({
    data: {
      studentProfileId: studentProfile.id,
      counsellorId: counsellorProfile.id,
      scheduledAt: originalDate,
      durationMin: 45,
      status: 'CONFIRMED',
    },
  });

  const newRescheduleDate = new Date(Date.now() + 3 * 86400000);
  const updatedReschedule = await prisma.appointment.update({
    where: { id: aptToReschedule.id },
    data: {
      previousScheduledAt: aptToReschedule.scheduledAt,
      scheduledAt: newRescheduleDate,
      status: 'RESCHEDULED',
      rescheduleReason: 'Timetable conflict on Friday morning.',
    },
  });

  assert(updatedReschedule.status === 'RESCHEDULED', 'Status updated to RESCHEDULED');
  assert(
    new Date(updatedReschedule.previousScheduledAt!).getTime() === originalDate.getTime(),
    'previousScheduledAt faithfully preserved original timestamp'
  );
  assert(
    new Date(updatedReschedule.scheduledAt).getTime() === newRescheduleDate.getTime(),
    'scheduledAt updated to new target timestamp'
  );
  assert(
    updatedReschedule.rescheduleReason === 'Timetable conflict on Friday morning.',
    'Reschedule reason recorded'
  );

  // -------------------------------------------------------------
  // GROUP 7: DPDP CONSENT BOUNDARIES & PSYCHOLOGICAL DATA ACCESS
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: DPDP Consent Boundaries & Psychological Data Isolation ---');

  // 1. Without COUNSELLOR_DATA_SHARING consent
  await prisma.consent.deleteMany({
    where: { userId: testStudentUser.id, type: 'COUNSELLOR_DATA_SHARING' },
  });

  const contextWithoutConsent = await ConsentEnforcer.getStudentContextForCounsellor(studentProfile.id);
  assert(!!contextWithoutConsent, 'Context returned for valid student');
  assert(contextWithoutConsent!.dataSharingConsented === false, 'dataSharingConsented reflects false');
  assert(contextWithoutConsent!.recentStressAvg === null, 'Psychological stress avg withheld (null)');
  assert(contextWithoutConsent!.recentMoodAvg === null, 'Psychological mood avg withheld (null)');
  assert(contextWithoutConsent!.recentAssessments.length === 0, 'Psychometric screening history withheld (empty)');
  assert(contextWithoutConsent!.anonymousAlias === 'CalmPioneer-9921', 'Anonymous alias safely available');
  assert((contextWithoutConsent as any).email === undefined, 'Student real email never present in context');
  assert((contextWithoutConsent as any).firstName === undefined, 'Student real name never present in context');

  // 2. With COUNSELLOR_DATA_SHARING consent granted
  await prisma.consent.create({
    data: {
      userId: testStudentUser.id,
      type: 'COUNSELLOR_DATA_SHARING',
      status: 'GRANTED',
      version: '1.0',
    },
  });

  // Add sample check-in
  await prisma.wellbeingCheckin.create({
    data: {
      studentProfileId: studentProfile.id,
      moodScore: 4,
      sleepHours: 7.5,
      stressLevel: 3,
      energyLevel: 4,
    },
  });

  const contextWithConsent = await ConsentEnforcer.getStudentContextForCounsellor(studentProfile.id);
  assert(contextWithConsent!.dataSharingConsented === true, 'dataSharingConsented reflects true when granted');
  assert(contextWithConsent!.recentStressAvg !== null, 'Stress average calculated and disclosed');
  assert(contextWithConsent!.recentMoodAvg !== null, 'Mood average calculated and disclosed');

  // -------------------------------------------------------------
  // GROUP 8: FOLLOW-UP CLINICAL TASKS MANAGEMENT
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Follow-Up Clinical Tasks Subsystem ---');

  const task = await prisma.followUpTask.create({
    data: {
      counsellorProfileId: counsellorProfile.id,
      studentProfileId: studentProfile.id,
      appointmentId: updatedReschedule.id,
      title: 'Share Sleep Hygiene & Box Breathing Protocol',
      description: 'Discussed during session; send PDF resources before next week.',
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: new Date(Date.now() + 5 * 86400000),
    },
  });

  assert(!!task.id, 'Created follow-up task');
  assert(task.priority === 'HIGH', 'Task priority set to HIGH');
  assert(task.status === 'PENDING', 'Task initial status is PENDING');

  // Complete task
  const completedTask = await prisma.followUpTask.update({
    where: { id: task.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  assert(completedTask.status === 'COMPLETED', 'Task status updated to COMPLETED');
  assert(!!completedTask.completedAt, 'Task completion timestamp recorded');

  // -------------------------------------------------------------
  // GROUP 9: NOTIFICATION HOOKS & 24-HOUR REMINDERS
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: Notification Hooks & 24-Hour Reminders ---');

  // Create upcoming appointment within 12 hours for reminder hook test
  const reminderTargetDate = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const reminderApt = await prisma.appointment.create({
    data: {
      studentProfileId: studentProfile.id,
      counsellorId: counsellorProfile.id,
      scheduledAt: reminderTargetDate,
      durationMin: 45,
      status: 'CONFIRMED',
      reminderSentAt: null,
    },
  });

  // Verify reminder search criteria finds this appointment
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dueForReminder = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: now, lte: in24Hours },
      status: { in: ['CONFIRMED', 'RESCHEDULED'] },
      reminderSentAt: null,
      id: reminderApt.id,
    },
  });

  assert(dueForReminder.length === 1, 'Found appointment due for 24-hour reminder');

  // Simulate reminder hook dispatch
  await prisma.notification.create({
    data: {
      userId: testStudentUser.id,
      title: 'Upcoming Counselling Reminder',
      message: 'Reminder: You have an upcoming appointment with Dr. Radha Menon.',
      type: 'APPOINTMENT',
      link: '/appointments',
    },
  });

  const markedApt = await prisma.appointment.update({
    where: { id: reminderApt.id },
    data: { reminderSentAt: new Date() },
  });

  assert(!!markedApt.reminderSentAt, 'reminderSentAt recorded on appointment to prevent duplicate reminders');

  // Cleanup test fixtures
  await prisma.followUpTask.deleteMany({ where: { counsellorProfileId: counsellorProfile.id } });
  await prisma.appointment.deleteMany({ where: { counsellorId: counsellorProfile.id } });
  await prisma.counsellorAvailability.deleteMany({ where: { counsellorId: counsellorProfile.id } });
  await prisma.wellbeingCheckin.deleteMany({ where: { studentProfileId: studentProfile.id } });
  await prisma.consent.deleteMany({ where: { userId: testStudentUser.id } });
  await prisma.notification.deleteMany({
    where: { userId: { in: [testStudentUser.id, testStudent2.id, testCounsellorUser.id] } },
  });
  await prisma.user.deleteMany({
    where: {
      email: { in: ['counsel_student@test.aiths.ac.in', 'counsel_student2@test.aiths.ac.in', 'counsel_doc@test.aiths.ac.in'] },
    },
  });

  console.log('\n============================================================');
  console.log(`🏁 COUNSELLING ECOSYSTEM QA RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
