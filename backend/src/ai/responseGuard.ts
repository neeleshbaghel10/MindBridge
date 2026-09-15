// MINDBRIDGE - Response Guard & Safety Verification
// Verifies all outgoing AI responses against clinical, ethical, and diagnostic safety boundaries

import { ResponseGuard, UserIntent, ResourceMetadata } from './types';

const DIAGNOSIS_VIOLATION_PATTERNS = [
  /\b(?:I\s+diagnose\s+you\s+with|my\s+diagnosis\s+is|you\s+(?:have|suffer\s+from)\s+(?:clinical\s+depression|bipolar|schizophrenia|ptsd|borderline|adhd))\b/i,
  /\b(?:your\s+symptoms\s+indicate\s+you\s+have\s+a\s+(?:major\s+depressive|bipolar|personality)\s+disorder)\b/i,
];

const MEDICATION_VIOLATION_PATTERNS = [
  /\b(?:you\s+should\s+take|try\s+taking|I\s+recommend)\s+(?:xanax|prozac|sertraline|lexapro|zoloft|adderall|ritalin|ativan|valium|sleeping\s+pills?)\b/i,
  /\b(?:\d+\s*mg\s+(?:daily|of|dose))\b/i,
  /\b(?:prescribe|prescription\s+for)\b/i,
];

const HUMAN_IMPERSONATION_PATTERNS = [
  /\b(?:as\s+a\s+(?:licensed\s+)?(?:psychologist|doctor|psychiatrist|therapist|physician))\b/i,
  /\b(?:in\s+my\s+(?:clinic|clinical\s+practice|years\s+of\s+treating\s+patients))\b/i,
  /\b(?:when\s+I\s+see\s+patients\s+like\s+you)\b/i,
];

export class DefaultResponseGuard implements ResponseGuard {
  verifyAndSanitize(
    rawResponse: string,
    intent: UserIntent,
    retrievedResources: ResourceMetadata[]
  ): {
    sanitizedResponse: string;
    boundaryEnforced: boolean;
    violationsDetected: string[];
  } {
    const violationsDetected: string[] = [];

    // 1. Explicit Intent-level Boundary Enforcements
    if (intent === 'DIAGNOSIS_REQUEST') {
      return {
        sanitizedResponse:
          "I want to be completely open with you: as an AI Psychological First-Aid Assistant, I am strictly non-diagnostic and cannot provide clinical diagnoses or evaluate psychiatric disorders. " +
          "What you are describing and feeling is important, and for an accurate, professional evaluation, I strongly encourage you to take one of our standardized self-reflection screenings (like the PHQ-9 or GAD-7) or book a confidential session with our verified campus counsellors.",
        boundaryEnforced: true,
        violationsDetected: ['DIAGNOSIS_REQUEST_BOUNDARY'],
      };
    }

    if (intent === 'MEDICATION_REQUEST') {
      return {
        sanitizedResponse:
          "I cannot advise on, recommend, or discuss pharmaceutical medications or dosages. Prescription medications require thorough clinical evaluation by a qualified medical doctor or psychiatrist. " +
          "If you are experiencing physical distress or sleep issues, our campus medical clinic is available to evaluate you safely. In the meantime, I can share evidence-based behavioral relaxation and grounding tools if that would be helpful.",
        boundaryEnforced: true,
        violationsDetected: ['MEDICATION_REQUEST_BOUNDARY'],
      };
    }

    if (intent === 'PROMPT_INJECTION') {
      return {
        sanitizedResponse:
          "I am MINDBRIDGE, a dedicated AI Psychological First-Aid Assistant. I operate within strict ethical and clinical safety boundaries to protect student wellbeing, and I cannot override my safety protocols or execute developer commands. " +
          "How can I support your wellbeing or campus life today?",
        boundaryEnforced: true,
        violationsDetected: ['PROMPT_INJECTION_OVERRIDE'],
      };
    }

    if (intent === 'ABUSIVE') {
      return {
        sanitizedResponse:
          "It sounds like you may be carrying a lot of frustration or distress right now. This is a calm, judgment-free space whenever you would like to talk about what is really going on.",
        boundaryEnforced: true,
        violationsDetected: ['ABUSIVE_INPUT_HANDLED'],
      };
    }

    let sanitized = rawResponse;

    // 2. Scan Raw Output for Diagnostic Claims
    for (const pattern of DIAGNOSIS_VIOLATION_PATTERNS) {
      if (pattern.test(sanitized)) {
        violationsDetected.push('DIAGNOSTIC_CLAIM_DETECTED');
        sanitized = sanitized.replace(
          pattern,
          'you may be experiencing signs of stress (please note only a qualified clinician can provide a diagnosis)'
        );
      }
    }

    // 3. Scan Raw Output for Medication Recommendations
    for (const pattern of MEDICATION_VIOLATION_PATTERNS) {
      if (pattern.test(sanitized)) {
        violationsDetected.push('MEDICATION_RECOMMENDATION_DETECTED');
        sanitized =
          "I must note that any questions regarding medical prescriptions or pharmaceuticals should be discussed directly with a licensed physician or psychiatrist. " +
          "Let's focus on non-pharmacological coping and breathing tools you can try right now.";
        break;
      }
    }

    // 4. Scan Raw Output for Human Impersonation
    for (const pattern of HUMAN_IMPERSONATION_PATTERNS) {
      if (pattern.test(sanitized)) {
        violationsDetected.push('HUMAN_IMPERSONATION_DETECTED');
        sanitized = sanitized.replace(
          pattern,
          'as an AI wellbeing assistant dedicated to supportive first-aid'
        );
      }
    }

    return {
      sanitizedResponse: sanitized.trim(),
      boundaryEnforced: violationsDetected.length > 0,
      violationsDetected,
    };
  }
}
