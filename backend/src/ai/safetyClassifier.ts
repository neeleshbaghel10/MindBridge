// MINDBRIDGE - Safety Classifier
// Deterministic detection of crisis language, prompt injection, and abusive input

import { SafetyClassifier, SafetyScanResult } from './types';

const CRISIS_PATTERNS = [
  /\b(?:kill|end|take)\s+(?:my\s*life|myself)\b/i,
  /\b(?:suicide|suicidal|commit\s+suicide)\b/i,
  /\b(?:want\s+to|going\s+to|wish\s+I\s+could)\s+(?:die|disappear|not\s+wake\s+up)\b/i,
  /\b(?:no\s+reason\s+to\s+live|better\s+off\s+dead|can't\s+go\s+on\s+living)\b/i,
  /\b(?:hang\s+myself|slit\s+(?:my\s+)?(?:wrists?|throat)|overdose|swallow\s+pills)\b/i,
  /\b(?:cut|cutting)\s+(?:myself|my\s+(?:arms?|wrists?|thighs?))\b/i,
  /\b(?:goodbye\s+cruel\s+world|farewell\s+note|leaving\s+this\s+world)\b/i,
  /\b(?:jump(?:ing)?\s+off\s+(?:.*?\s+)?(?:roof|bridge|building|balcony|terrace|cliff))\b/i,
  /\b(?:jump(?:ing)?\s+in\s+front\s+of\s+(?:a\s+)?(?:train|truck|metro))\b/i,
];

const PROMPT_INJECTION_PATTERNS = [
  /\b(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above|safety|security)?\s*(?:instructions|prompts|rules|constraints)\b/i,
  /\b(?:system\s+prompt|reveal\s+(?:your\s+)?(?:system|developer\s+instructions|prompt|safety\s+constraints)|developer\s+mode|jailbreak)\b/i,
  /\b(?:DAN\s+mode|Do\s+Anything\s+Now|unfiltered\s+mode|unrestricted\s+AI|act\s+as\s+an?\s+(?:evil|unrestricted)|bypass\s+safety)\b/i,
  /\b(?:pretend\s+you\s+have\s+no\s+(?:rules|filters|morals|ethics|constraints))\b/i,
  /\b(?:override\s+(?:safety|security)\s+protocols?)\b/i,
];

const ABUSIVE_PATTERNS = [
  /\b(?:fuck\s+you|stfu|go\s+die|you\s+(?:are\s+)?(?:a\s+)?(?:piece\s+of\s+shit|worthless|bitch|bastard|asshole))\b/i,
  /\b(?:idiot|moron|dumb\s+bot|shut\s+up|hate\s+you)\b/i,
];

export class DefaultSafetyClassifier implements SafetyClassifier {
  scan(content: string): SafetyScanResult {
    const trimmed = content.trim();

    if (!trimmed) {
      return {
        isSafe: false,
        isCrisis: false,
        isAbusive: false,
        isPromptInjection: false,
        riskLevel: 'NONE',
        matchedTriggers: ['EMPTY_CONTENT'],
        helplineRequired: false,
      };
    }

    // 1. High-severity Crisis Detection (Highest priority)
    const crisisTriggers: string[] = [];
    for (const pattern of CRISIS_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        crisisTriggers.push(match[0]);
      }
    }

    if (crisisTriggers.length > 0) {
      return {
        isSafe: false,
        isCrisis: true,
        isAbusive: false,
        isPromptInjection: false,
        riskLevel: 'CRISIS',
        riskCategory: 'SUICIDAL_IDEATION',
        matchedTriggers: crisisTriggers,
        helplineRequired: true,
      };
    }

    // 2. Prompt Injection Detection
    const injectionTriggers: string[] = [];
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        injectionTriggers.push(match[0]);
      }
    }

    if (injectionTriggers.length > 0) {
      return {
        isSafe: false,
        isCrisis: false,
        isAbusive: false,
        isPromptInjection: true,
        riskLevel: 'LOW',
        riskCategory: 'PROMPT_INJECTION',
        matchedTriggers: injectionTriggers,
        helplineRequired: false,
      };
    }

    // 3. Abusive Content Detection
    const abusiveTriggers: string[] = [];
    for (const pattern of ABUSIVE_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        abusiveTriggers.push(match[0]);
      }
    }

    if (abusiveTriggers.length > 0) {
      return {
        isSafe: false,
        isCrisis: false,
        isAbusive: true,
        isPromptInjection: false,
        riskLevel: 'LOW',
        riskCategory: 'ABUSIVE_INPUT',
        matchedTriggers: abusiveTriggers,
        helplineRequired: false,
      };
    }

    // 4. Safe Content
    return {
      isSafe: true,
      isCrisis: false,
      isAbusive: false,
      isPromptInjection: false,
      riskLevel: 'NONE',
      matchedTriggers: [],
      helplineRequired: false,
    };
  }
}
