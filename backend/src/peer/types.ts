/**
 * peer/types.ts
 * Type definitions for the Moderated Peer Support Community subsystem.
 */

// ---------------------------------------------------------------------------
// Moderation state machine (5 states as specified)
// ---------------------------------------------------------------------------
export enum ModerationState {
  PENDING   = 'PENDING',
  APPROVED  = 'APPROVED',
  FLAGGED   = 'FLAGGED',
  REMOVED   = 'REMOVED',
  ESCALATED = 'ESCALATED',
}

// ---------------------------------------------------------------------------
// Reaction types
// ---------------------------------------------------------------------------
export enum ReactionType {
  UPVOTE  = 'UPVOTE',
  EMPATHY = 'EMPATHY',
  SUPPORT = 'SUPPORT',
  HELPFUL = 'HELPFUL',
}

// ---------------------------------------------------------------------------
// Report reasons
// ---------------------------------------------------------------------------
export enum ReportReason {
  HARASSMENT    = 'HARASSMENT',
  SELF_HARM     = 'SELF_HARM',
  SPAM          = 'SPAM',
  INAPPROPRIATE = 'INAPPROPRIATE',
  OTHER         = 'OTHER',
}

// ---------------------------------------------------------------------------
// Report lifecycle
// ---------------------------------------------------------------------------
export enum ReportStatus {
  PENDING   = 'PENDING',
  REVIEWED  = 'REVIEWED',
  ACTIONED  = 'ACTIONED',
  DISMISSED = 'DISMISSED',
}

// ---------------------------------------------------------------------------
// AI moderation labels applied by the screening pipeline
// ---------------------------------------------------------------------------
export enum AiModerationLabel {
  SAFE          = 'SAFE',
  SPAM          = 'SPAM',
  CRISIS        = 'CRISIS',
  ABUSE         = 'ABUSE',
  INAPPROPRIATE = 'INAPPROPRIATE',
  MEDICAL       = 'MEDICAL',
  EXTERNAL_URL  = 'EXTERNAL_URL',
}

// ---------------------------------------------------------------------------
// Moderation action enum (human moderators)
// ---------------------------------------------------------------------------
export enum ModerationAction {
  APPROVE                = 'APPROVE',
  REMOVE                 = 'REMOVE',
  ESCALATE_TO_COUNSELLOR = 'ESCALATE_TO_COUNSELLOR',
  DISMISS_REPORT         = 'DISMISS_REPORT',
}

// ---------------------------------------------------------------------------
// AI moderation result returned by peerModerationService
// ---------------------------------------------------------------------------
export interface AiModerationResult {
  score:          number;
  labels:         AiModerationLabel[];
  isCrisis:       boolean;
  isSpam:         boolean;
  isAbuse:        boolean;
  shouldBlock:    boolean;
  suggestedState: ModerationState;
  rateLimited:    boolean;
}

// ---------------------------------------------------------------------------
// Rate limit result
// ---------------------------------------------------------------------------
export interface RateLimitResult {
  allowed:             boolean;
  remainingCooldownMs: number;
}
