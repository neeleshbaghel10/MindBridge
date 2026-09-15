// MINDBRIDGE - Shared Types & Contracts (SIH 25092)

export type UserRole = 'STUDENT' | 'COUNSELLOR' | 'PEER_VOLUNTEER' | 'INSTITUTION_ADMIN' | 'SUPER_ADMIN';

export type ConsentType = 
  | 'TERMS_OF_SERVICE' 
  | 'PRIVACY_POLICY' 
  | 'EMERGENCY_DISCLOSURE' 
  | 'COUNSELLOR_DATA_SHARING' 
  | 'ANONYMOUS_RESEARCH';

export type ConsentStatus = 'GRANTED' | 'REVOKED';

export type RiskLevel = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRISIS';

export type CrisisStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'COUNSELLOR_DISPATCHED' | 'RESOLVED';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type MeetingType = 'IN_PERSON' | 'VIRTUAL';

export type PostStatus = 'PENDING_REVIEW' | 'APPROVED' | 'FLAGGED' | 'REMOVED';

export type ModerationAction = 'APPROVE' | 'REJECT' | 'WARN_USER' | 'ESCALATE_RISK';

export type NotificationType = 'APPOINTMENT' | 'CHECKIN_REMINDER' | 'RISK_ALERT' | 'PEER_REPLY' | 'SYSTEM';

// User & Profile Interfaces
export interface IUser {
  id: string;
  institutionId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface IStudentProfile {
  id: string;
  userId: string;
  anonymousAlias: string;
  department: string;
  yearOfStudy: number;
  onboardingCompleted: boolean;
  preferredLanguage: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactConsent: boolean;
}

export interface ICounsellorProfile {
  id: string;
  userId: string;
  licenseNumber: string;
  specialization: string[];
  bio?: string;
  qualification: string;
  languagesSpoken: string[];
  isAvailable: boolean;
  maxDailySlots: number;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface IInstitution {
  id: string;
  name: string;
  code: string;
  domain: string;
  contactEmail: string;
  crisisHotline: string;
  campusSecurityNo?: string;
}

// Daily Wellbeing Checkin
export interface IWellbeingCheckin {
  id: string;
  studentProfileId: string;
  date: string;
  moodScore: number; // 1-5
  sleepHours: number;
  stressLevel: number; // 1-5
  energyLevel: number; // 1-5
  notes?: string;
  tags: string[];
  createdAt: string;
}

// Clinical Screenings (PHQ-9, GAD-7, WHO-5)
export interface IAssessmentQuestion {
  id: string;
  text: string;
  options: { label: string; value: number }[];
}

export interface IAssessment {
  id: string;
  code: string;
  title: string;
  description: string;
  clinicalDisclaimer: string;
  questions: IAssessmentQuestion[];
  maxScore: number;
}

export interface IAssessmentResponse {
  id: string;
  studentProfileId: string;
  assessmentId: string;
  assessmentCode: string;
  score: number;
  severityCategory: string;
  answers: Record<string, number>;
  completedAt: string;
  recommendations?: string[];
}

// AI Chat & Safety
export interface IChatMessage {
  id: string;
  sessionId: string;
  sender: 'USER' | 'AI_ASSISTANT' | 'CRISIS_SYSTEM';
  content: string;
  riskDetected?: boolean;
  flags?: Record<string, any>;
  groundingExercise?: {
    type: 'BREATHING_4_7_8' | 'BOX_BREATHING' | 'GROUNDING_5_4_3_2_1' | 'COGNITIVE_REFRAME';
    title: string;
    instructions: string[];
  };
  suggestedAction?: string;
  createdAt: string;
}

export interface ICrisisAlert {
  isCrisis: boolean;
  riskLevel: RiskLevel;
  crisisHelplines: {
    name: string;
    number: string;
    availableHours: string;
    description: string;
  }[];
  campusEmergencyContact?: string;
  immediateSafetyGuidance: string[];
}

// Appointments
export interface ICounsellorSlot {
  id: string;
  counsellorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
  isRecurring: boolean;
  isBooked?: boolean;
}

export interface IAppointment {
  id: string;
  studentProfileId: string;
  counsellorId: string;
  scheduledAt: string;
  durationMin: number;
  status: AppointmentStatus;
  meetingType: MeetingType;
  meetingLinkOrLocation?: string;
  studentNotes?: string;
  privateCounsellorNotes?: string;
  student?: {
    anonymousAlias: string;
    department: string;
    yearOfStudy: number;
  };
  counsellor?: {
    user: {
      firstName: string;
      lastName: string;
    };
    specialization: string[];
  };
}

// Peer Support Community
export interface IPeerPost {
  id: string;
  studentProfileId: string;
  anonymousAuthorName: string;
  title: string;
  content: string;
  category: string;
  status: PostStatus;
  upvotesCount: number;
  flagCount: number;
  createdAt: string;
  commentsCount?: number;
}

export interface IPeerComment {
  id: string;
  postId: string;
  studentProfileId: string;
  anonymousAuthorName: string;
  content: string;
  status: PostStatus;
  createdAt: string;
}

// Psychoeducational Resources
export interface IResource {
  id: string;
  title: string;
  slug: string;
  category: string;
  contentMarkdown: string;
  mediaUrl?: string;
  readingTimeMin: number;
  tags: string[];
  language: string;
  isCompleted?: boolean;
  bookmarked?: boolean;
}

// Institutional Aggregate Analytics (k-anonymity N>=10)
export interface IInstitutionAnalyticsOverview {
  totalStudentsMonitored: number;
  cohortPrivacyThresholdMet: boolean;
  averageCampusMoodScore: number; // 1-5
  averageStressIndex: number; // 1-5
  averageSleepHours: number;
  totalCheckinsThisMonth: number;
  assessmentsCompletedCount: number;
  counsellorAppointmentsHeld: number;
  mostCommonStressFactors: { tag: string; count: number }[];
  departmentBreakdown: {
    department: string;
    studentCount: number;
    avgStress: number;
    avgMood: number;
  }[];
  crisisInterventionsCount: number; // completely aggregated count, no PII
}

// API Standard Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
