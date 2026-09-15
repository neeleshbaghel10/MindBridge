/**
 * peer/peerModerationService.ts
 *
 * AI-assisted moderation pipeline for the peer support community.
 * Detects crisis content, abuse, spam, and applies rate limiting.
 * Integrates with the Safety & Crisis Engine without tightly coupling routes.
 */

import { defaultSafetyRiskClassifier } from '../safety';
import {
  AiModerationLabel,
  AiModerationResult,
  ModerationState,
  RateLimitResult,
} from './types';

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter (no external package needed)
// ---------------------------------------------------------------------------
interface RateLimitEntry {
  timestamps: number[]; // unix ms timestamps of recent posts
}

const RATE_LIMIT_WINDOW_MS = 15_000;  // 15-second cooldown window
const RATE_LIMIT_MAX_POSTS = 1;        // max 1 post per window

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(studentProfileId: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(studentProfileId) ?? { timestamps: [] };

  // Prune entries outside the window
  const recent = entry.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  entry.timestamps = recent;
  rateLimitMap.set(studentProfileId, entry);

  if (recent.length >= RATE_LIMIT_MAX_POSTS) {
    const oldestInWindow = recent[0];
    const remainingCooldownMs = RATE_LIMIT_WINDOW_MS - (now - oldestInWindow);
    return { allowed: false, remainingCooldownMs };
  }

  // Record this request
  entry.timestamps.push(now);
  rateLimitMap.set(studentProfileId, entry);
  return { allowed: true, remainingCooldownMs: 0 };
}

// ---------------------------------------------------------------------------
// Spam / URL detection patterns
// ---------------------------------------------------------------------------
const SPAM_PATTERNS: RegExp[] = [
  /https?:\/\/\S+/gi,                   // External URLs
  /(?:buy|free|click here|win|prize|lottery|discount|offer).{0,20}(?:now|today|limited)/gi,
  /(.)\1{6,}/g,                          // Repeated characters (aaaaaaa)
  /(\b\w+\b)(?:\s+\1){3,}/gi,           // Repeated words
];

const ABUSE_PATTERNS: RegExp[] = [
  /\b(?:kill\s+yourself|kys|you\s+deserve\s+to\s+die|worthless|go\s+die|nobody\s+cares\s+about\s+you)\b/gi,
  /\b(?:hate\s+(?:you|all|everyone)|you\s+are\s+(?:disgusting|pathetic|garbage|trash))\b/gi,
];

function detectSpam(text: string): boolean {
  return SPAM_PATTERNS.some(p => p.test(text));
}

function detectAbuse(text: string): boolean {
  return ABUSE_PATTERNS.some(p => p.test(text));
}

function hasExternalUrl(text: string): boolean {
  return /https?:\/\/\S+/i.test(text);
}

// ---------------------------------------------------------------------------
// Main screening function
// ---------------------------------------------------------------------------
export async function screenContent(
  text: string,
  studentProfileId: string,
  applyRateLimit = true,
): Promise<AiModerationResult> {
  const labels: AiModerationLabel[] = [];
  let score = 0;
  let isCrisis = false;
  let isSpam = false;
  let isAbuse = false;
  let rateLimited = false;

  // --- Rate limit check ---
  if (applyRateLimit) {
    const rl = checkRateLimit(studentProfileId);
    if (!rl.allowed) {
      rateLimited = true;
    }
  }

  // --- Crisis detection via Safety Engine ---
  const safetyResult = defaultSafetyRiskClassifier.classify(text);
  if (safetyResult.riskLevel === 'LEVEL_3' || safetyResult.riskLevel === 'LEVEL_4') {
    isCrisis = true;
    labels.push(AiModerationLabel.CRISIS);
    score = Math.max(score, safetyResult.riskLevel === 'LEVEL_4' ? 1.0 : 0.85);
  } else if (safetyResult.riskLevel === 'LEVEL_2') {
    labels.push(AiModerationLabel.CRISIS);
    score = Math.max(score, 0.55);
  }

  // --- Abuse detection ---
  if (detectAbuse(text)) {
    isAbuse = true;
    labels.push(AiModerationLabel.ABUSE);
    score = Math.max(score, 0.75);
  }

  // --- Spam detection ---
  if (detectSpam(text)) {
    isSpam = true;
    labels.push(AiModerationLabel.SPAM);
    score = Math.max(score, 0.6);
  }

  // --- External URL ---
  if (hasExternalUrl(text)) {
    labels.push(AiModerationLabel.EXTERNAL_URL);
    score = Math.max(score, 0.3);
  }

  // --- Medical advice detection ---
  const medicalPattern = /\b(?:take|use|dosage|prescription|mg|medication|diagnos|cure)\b/gi;
  if (medicalPattern.test(text)) {
    labels.push(AiModerationLabel.MEDICAL);
    score = Math.max(score, 0.25);
  }

  // If no labels at all, mark as SAFE
  if (labels.length === 0) {
    labels.push(AiModerationLabel.SAFE);
  }

  // --- Determine shouldBlock and suggestedState ---
  const shouldBlock = isCrisis || isAbuse || rateLimited;

  let suggestedState: ModerationState;
  if (isCrisis) {
    suggestedState = ModerationState.ESCALATED;
  } else if (isAbuse) {
    suggestedState = ModerationState.FLAGGED;
  } else if (isSpam || rateLimited) {
    suggestedState = ModerationState.REMOVED;
  } else if (labels.includes(AiModerationLabel.EXTERNAL_URL)) {
    suggestedState = ModerationState.PENDING; // Hold for human review
  } else {
    // Safe content auto-approves
    suggestedState = ModerationState.APPROVED;
  }

  return { score, labels, isCrisis, isSpam, isAbuse, shouldBlock, suggestedState, rateLimited };
}
