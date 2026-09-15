// MINDBRIDGE COUNSELLING ECOSYSTEM - TYPES & INTERFACES

export type AppointmentState =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'RESCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type MeetingType = 'VIRTUAL' | 'IN_PERSON';

export interface AppointmentTransitionInput {
  currentStatus: AppointmentState;
  targetStatus: AppointmentState;
  actorRole: 'STUDENT' | 'COUNSELLOR' | 'INSTITUTION_ADMIN' | 'SUPER_ADMIN';
  actorId: string;
  reason?: string;
  newScheduledAt?: Date;
}

export interface AppointmentTransitionResult {
  allowed: boolean;
  targetStatus: AppointmentState;
  reason?: string;
  errorMessage?: string;
}

export interface TimeSlot {
  time: string; // "09:00"
  scheduledAt: string; // ISO 8601 string
  endTime: string; // ISO 8601 string
  durationMin: number;
  isAvailable: boolean;
  unavailableReason?: 'ALREADY_BOOKED' | 'OUTSIDE_WORKING_HOURS' | 'DATE_BLOCKED' | 'STUDENT_CONFLICT';
}

export interface CounsellorFilterOptions {
  specialization?: string;
  language?: string;
  dayOfWeek?: number;
  search?: string;
}

export interface ConsentedStudentContext {
  studentProfileId: string;
  anonymousAlias: string;
  department: string;
  yearOfStudy: number;
  preferredLanguage: string;
  dataSharingConsented: boolean;
  recentStressAvg: number | null;
  recentMoodAvg: number | null;
  recentAssessments: Array<{
    code: string;
    title: string;
    score: number;
    severity: string;
    completedAt: Date;
  }>;
}
