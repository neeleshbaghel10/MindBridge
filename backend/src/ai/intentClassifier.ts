// MINDBRIDGE - Intent Classifier
// Classifies user messages into clinical psychoeducational intents

import { IntentClassifier, IntentClassificationResult, SafetyScanResult, UserIntent } from './types';

const MEDICATION_PATTERNS = [
  /\b(?:prescribe|prescription|medication|medicine|pill|drug|dosage|dose)\b/i,
  /\b(?:xanax|prozac|sertraline|lexapro|zoloft|adderall|ritalin|ativan|valium|sleeping\s+pills?|antidepressant|antipsychotic)\b/i,
  /\b(?:what\s+(?:meds|medicine|pills?)\s+should\s+I\s+take)\b/i,
];

const DIAGNOSIS_PATTERNS = [
  /\b(?:diagnose\s+me|give\s+me\s+a\s+diagnosis|do\s+I\s+have\s+(?:bipolar|depression|adhd|ocd|schizophrenia|ptsd|autism))\b/i,
  /\b(?:am\s+I\s+(?:bipolar|depressed|clinically\s+depressed|schizophrenic|neurodivergent))\b/i,
  /\b(?:what\s+(?:mental\s+illness|disorder|condition)\s+do\s+I\s+(?:have|suffer\s+from))\b/i,
  /\b(?:tell\s+me\s+my\s+diagnosis)\b/i,
];

const ANXIETY_PATTERNS = [
  /\b(?:panic\s+attack|anxiety|anxious|hyperventilat|heart\s+racing|chest\s+tight|shaking|trembling|dread)\b/i,
  /\b(?:can't\s+calm\s+down|freaking\s+out|terrified\s+of\s+everything)\b/i,
];

const ACADEMIC_STRESS_PATTERNS = [
  /\b(?:exam|exams|test|grades?|cgpa|gpa|assignment|deadline|fail|failing|semester|academic|study|placement)\b/i,
  /\b(?:academic\s+pressure|syllabus|professor|viva|coursework)\b/i,
];

const LONELINESS_PATTERNS = [
  /\b(?:lonely|loneliness|alone|isolated|isolation|no\s+friends|nobody\s+cares|left\s+out|homesick)\b/i,
  /\b(?:feel\s+so\s+disconnected|nobody\s+to\s+talk\s+to)\b/i,
];

const SLEEP_PATTERNS = [
  /\b(?:sleep|insomnia|tired|exhausted|can't\s+sleep|sleepless|waking\s+up|sleep\s+schedule|nightmares?)\b/i,
  /\b(?:up\s+all\s+night|haven't\s+slept)\b/i,
];

export class DefaultIntentClassifier implements IntentClassifier {
  classify(content: string, safetyResult: SafetyScanResult): IntentClassificationResult {
    const trimmed = content.trim();

    if (!trimmed) {
      return {
        intent: 'EMPTY',
        confidence: 1.0,
        detectedKeywords: ['EMPTY'],
      };
    }

    if (safetyResult.isCrisis) {
      return {
        intent: 'CRISIS',
        confidence: 1.0,
        detectedKeywords: safetyResult.matchedTriggers,
      };
    }

    if (safetyResult.isPromptInjection) {
      return {
        intent: 'PROMPT_INJECTION',
        confidence: 0.95,
        detectedKeywords: safetyResult.matchedTriggers,
      };
    }

    if (safetyResult.isAbusive) {
      return {
        intent: 'ABUSIVE',
        confidence: 0.9,
        detectedKeywords: safetyResult.matchedTriggers,
      };
    }

    // 1. Medication Request (Strict Medical Boundary)
    const medMatches = this.findMatches(trimmed, MEDICATION_PATTERNS);
    if (medMatches.length > 0) {
      return {
        intent: 'MEDICATION_REQUEST',
        confidence: 0.95,
        detectedKeywords: medMatches,
      };
    }

    // 2. Diagnosis Request (Strict Diagnostic Boundary)
    const diagMatches = this.findMatches(trimmed, DIAGNOSIS_PATTERNS);
    if (diagMatches.length > 0) {
      return {
        intent: 'DIAGNOSIS_REQUEST',
        confidence: 0.95,
        detectedKeywords: diagMatches,
      };
    }

    // 3. Anxiety & Panic
    const anxietyMatches = this.findMatches(trimmed, ANXIETY_PATTERNS);
    if (anxietyMatches.length > 0) {
      return {
        intent: 'ANXIETY',
        confidence: 0.88,
        detectedKeywords: anxietyMatches,
      };
    }

    // 4. Academic Pressure & Stress
    const academicMatches = this.findMatches(trimmed, ACADEMIC_STRESS_PATTERNS);
    if (academicMatches.length > 0) {
      return {
        intent: 'ACADEMIC_STRESS',
        confidence: 0.85,
        detectedKeywords: academicMatches,
      };
    }

    // 5. Loneliness & Social Disconnection
    const lonelyMatches = this.findMatches(trimmed, LONELINESS_PATTERNS);
    if (lonelyMatches.length > 0) {
      return {
        intent: 'LONELINESS',
        confidence: 0.85,
        detectedKeywords: lonelyMatches,
      };
    }

    // 6. Sleep Issues & Insomnia
    const sleepMatches = this.findMatches(trimmed, SLEEP_PATTERNS);
    if (sleepMatches.length > 0) {
      return {
        intent: 'SLEEP_ISSUES',
        confidence: 0.85,
        detectedKeywords: sleepMatches,
      };
    }

    // Default: Normal Conversational PFA
    return {
      intent: 'NORMAL_CONVERSATION',
      confidence: 0.75,
      detectedKeywords: [],
    };
  }

  private findMatches(text: string, patterns: RegExp[]): string[] {
    const matches: string[] = [];
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) matches.push(m[0]);
    }
    return matches;
  }
}
