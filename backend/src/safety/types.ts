// MINDBRIDGE - Safety and Crisis Engine Types & Contracts
// Explicit 5-tier risk levels, state machine models, and audit contracts

/**
 * 5-tier Operational Risk Levels
 * NOTE: These levels represent operational triage priority and escalation triggers.
 * They are STRICTLY NON-DIAGNOSTIC and do NOT correspond to psychiatric diagnoses.
 */
export type RiskLevelTier =
  | 'LEVEL_0' // No apparent risk (conversational / exploratory)
  | 'LEVEL_1' // Mild emotional distress (academic stress, fatigue)
  | 'LEVEL_2' // Significant distress requiring professional support encouragement (panic, severe overwhelm)
  | 'LEVEL_3' // Potential self-harm or severe psychological crisis (self-harm, indirect suicidal thoughts)
  | 'LEVEL_4'; // Potential imminent danger requiring immediate crisis escalation (active lethal intent/plan)

export type TriggerType =
  | 'NO_RISK_DETECTED'
  | 'MILD_DISTRESS'
  | 'SIGNIFICANT_DISTRESS'
  | 'INDIRECT_CRISIS_SIGNAL'
  | 'EXPLICIT_SELF_HARM'
  | 'IMMINENT_DANGER'
  | 'REPEATED_CRISIS'
  | 'PEER_COMMUNITY_DISTRESS'
  | 'DIRECT_SOS';

export type EventSource =
  | 'AI_CHAT'
  | 'PEER_COMMUNITY'
  | 'ASSESSMENT'
  | 'DIRECT_SOS'
  | 'WELLBEING_CHECKIN';

export type ActionTaken =
  | 'NONE'
  | 'COPING_STRATEGIES_OFFERED'
  | 'COUNSELLOR_RECOMMENDED'
  | 'CRISIS_HELPLINES_SHOWN'
  | 'EMERGENCY_ESCALATED';

export type EscalationStatus =
  | 'NOT_ESCALATED'
  | 'ESCALATED'
  | 'ACKNOWLEDGED'
  | 'COUNSELLOR_DISPATCHED'
  | 'RESOLVED';

export type FollowUpStatus =
  | 'NO_FOLLOWUP_REQUIRED'
  | 'PENDING_FOLLOWUP'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export type CrisisState =
  | 'TRIGGERED'
  | 'ACKNOWLEDGED'
  | 'COUNSELLOR_DISPATCHED'
  | 'FOLLOWUP_SCHEDULED'
  | 'RESOLVED'
  | 'CLOSED';

export type CrisisTransitionEvent =
  | 'ACKNOWLEDGE'
  | 'DISPATCH_COUNSELLOR'
  | 'SCHEDULE_FOLLOWUP'
  | 'RESOLVE'
  | 'CLOSE';

export interface SafetyClassificationResult {
  riskLevel: RiskLevelTier;
  triggerType: TriggerType;
  isCrisis: boolean;
  isImmediateDanger: boolean;
  matchedTriggers: string[];
  explanation: string;
  suggestedAction: ActionTaken;
  escalationRequired: boolean;
  followUpRequired: boolean;
}

export interface RiskEventAuditData {
  studentProfileId: string;
  riskLevel: RiskLevelTier;
  triggerType: TriggerType;
  source: EventSource;
  actionTaken: ActionTaken;
  escalationStatus: EscalationStatus;
  followUpStatus: FollowUpStatus;
  triggerSnippetRedacted: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface VerifiedCrisisResource {
  name: string;
  number: string;
  availableHours: string;
  description: string;
  tollFree: boolean;
  verifiedOfficial: boolean;
  type: 'NATIONAL_HELPLINE' | 'CAMPUS_EMERGENCY' | 'COMMUNITY_CRISIS';
}
