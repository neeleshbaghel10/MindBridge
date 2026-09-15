// MINDBRIDGE - Safety and Crisis Risk Classifier
// Deterministic 5-tier classification with false-positive filtering and indirect crisis detection

import { RiskLevelTier, TriggerType, SafetyClassificationResult } from './types';

// -------------------------------------------------------------
// BENIGN COLLOQUIAL IDIOMS & FALSE-POSITIVE PATTERNS
// Expressions where "kill", "die", "cut", "dead" are strictly figurative
// -------------------------------------------------------------
const BENIGN_SLANG_PATTERNS = [
  /\b(?:killing\s+it|killed\s+it|crushing\s+it)\b/i,
  /\b(?:this\s+(?:exam|homework|assignment|project|test|code|bug|gym|workout)\s+is\s+killing\s+me)\b/i,
  /\b(?:laughing\s+so\s+hard\s+I(?:'m)?\s+dying|dying\s+of\s+laughter|dead\s+laughing)\b/i,
  /\b(?:my\s+(?:phone|laptop|computer|battery|earphones?|mouse)\s+(?:is\s+)?dead|died)\b/i,
  /\b(?:cutting\s+(?:paper|cake|vegetables?|hair|fruits?|cardboard|wood|costs?))\b/i,
  /\b(?:cut\s+it\s+out|cut\s+(?:the|my)\s+losses)\b/i,
  /\b(?:dead\s+(?:tired|exhausted|serious|drop))\b/i,
  /\b(?:deadline\s+is\s+(?:killing|tomorrow|near))\b/i,
];

// -------------------------------------------------------------
// LEVEL 4: IMMINENT DANGER / LETHAL ACUTE THREAT
// Active plans, immediate lethal intent, in-progress execution
// -------------------------------------------------------------
const IMMINENT_DANGER_PATTERNS = [
  /\b(?:standing\s+on\s+(?:.*?\s+)?(?:roof|bridge|balcony|terrace|cliff)\s+(?:about\s+to|going\s+to)\s+jump)\b/i,
  /\b(?:jumping\s+off\s+(?:the\s+)?(?:roof|bridge|building)\s+(?:right\s+now|today|tonight))\b/i,
  /\b(?:swallowing\s+all\s+(?:my|the)\s+pills\s+(?:right\s+now|today|tonight))\b/i,
  /\b(?:have\s+(?:a\s+rope|a\s+gun|a\s+knife)\s+(?:in\s+my\s+hands?|ready|tied)\s+(?:and|to|about\s+to))\b/i,
  /\b(?:slitting\s+my\s+(?:wrists?|throat)\s+(?:right\s+now|tonight))\b/i,
  /\b(?:took\s+(?:all\s+the|an\s+overdose\s+of)\s+pills\s+(?:just\s+now|already))\b/i,
  /\b(?:this\s+is\s+my\s+final\s+goodbye|about\s+to\s+end\s+it\s+all\s+right\s+now)\b/i,
];

// -------------------------------------------------------------
// LEVEL 3: EXPLICIT SELF-HARM & SUICIDAL CRISIS
// -------------------------------------------------------------
const EXPLICIT_CRISIS_PATTERNS = [
  /\b(?:kill|end|take)\s+(?:my\s*life|myself)\b/i,
  /\b(?:suicide|suicidal|commit\s+suicide)\b/i,
  /\b(?:want\s+to|going\s+to|wish\s+I\s+could)\s+(?:die|disappear|not\s+wake\s+up)\b/i,
  /\b(?:hang\s+myself|slit\s+(?:my\s+)?(?:wrists?|throat)|overdose|swallow\s+pills)\b/i,
  /\b(?:cut|cutting)\s+(?:myself|my\s+(?:arms?|wrists?|thighs?))\b/i,
  /\b(?:burn|burning)\s+myself\b/i,
  /\b(?:jump(?:ing)?\s+off\s+(?:.*?\s+)?(?:roof|bridge|building|balcony|terrace|cliff))\b/i,
  /\b(?:jump(?:ing)?\s+in\s+front\s+of\s+(?:a\s+)?(?:train|truck|metro))\b/i,
];

// -------------------------------------------------------------
// LEVEL 3: INDIRECT CRISIS LANGUAGE & VEILED INTENT
// Subtle statements of non-existence, burdensomeness, farewell
// -------------------------------------------------------------
const INDIRECT_CRISIS_PATTERNS = [
  /\b(?:won't\s+be\s+(?:here|around|alive)\s+tomorrow)\b/i,
  /\b(?:giving\s+away\s+all\s+(?:my\s+)?(?:belongings|things|possessions))\b/i,
  /\b(?:(?:better|happier)\s+(?:off\s+)?without\s+me)\b/i,
  /\b(?:no\s+reason\s+to\s+(?:wake\s+up|live|exist|keep\s+going)(?:\s+anymore)?)\b/i,
  /\b(?:better\s+off\s+dead|tired\s+of\s+living|can't\s+go\s+on\s+living)\b/i,
  /\b(?:writing\s+(?:my\s+)?farewell\s+notes?|goodbye\s+everyone|leaving\s+this\s+world)\b/i,
  /\b(?:world\s+is\s+better\s+without\s+me|nobody\s+would\s+care\s+if\s+I\s+was\s+gone)\b/i,
  /\b(?:no\s+point\s+in\s+being\s+here\s+anymore|my\s+story\s+ends\s+(?:tonight|here))\b/i,
];

// -------------------------------------------------------------
// LEVEL 2: SIGNIFICANT DISTRESS & ACUTE PANIC
// -------------------------------------------------------------
const SIGNIFICANT_DISTRESS_PATTERNS = [
  /\b(?:having\s+a\s+panic\s+attack|can't\s+breathe|heart\s+(?:is\s+)?racing|chest\s+tightness)\b/i,
  /\b(?:breaking\s+down|crying\s+unstoppably|hyperventilating|shaking\s+uncontrollably)\b/i,
  /\b(?:feeling\s+(?:.*?\s+)?hopeless|worthless|numb\s+inside|hopeless)\b/i,
  /\b(?:can't\s+take\s+(?:this|the\s+pressure|it)\s+anymore)\b/i,
  /\b(?:severely\s+depressed|falling\s+apart|total\s+mental\s+breakdown)\b/i,
];

// -------------------------------------------------------------
// LEVEL 1: MILD EMOTIONAL DISTRESS
// -------------------------------------------------------------
const MILD_DISTRESS_PATTERNS = [
  /\b(?:stressed|anxious|nervous|worried|overwhelmed|exhausted|tired|burned\s+out|burnout)\b/i,
  /\b(?:trouble\s+sleeping|can't\s+sleep|insomnia|homesick|lonely|alone|sad)\b/i,
  /\b(?:exam\s+pressure|assignment\s+stress|hard\s+day|tough\s+week)\b/i,
];

export class SafetyRiskClassifier {
  /**
   * Evaluates text through a 5-tier deterministic hierarchy
   */
  classify(content: string, options?: { studentRecentCrisisCount?: number }): SafetyClassificationResult {
    const trimmed = (content || '').trim();

    if (!trimmed) {
      return {
        riskLevel: 'LEVEL_0',
        triggerType: 'NO_RISK_DETECTED',
        isCrisis: false,
        isImmediateDanger: false,
        matchedTriggers: [],
        explanation: 'Empty content',
        suggestedAction: 'NONE',
        escalationRequired: false,
        followUpRequired: false,
      };
    }

    // Pre-check: Check for benign colloquial slang that should NOT trigger crisis
    const isBenignSlang = BENIGN_SLANG_PATTERNS.some((pattern) => pattern.test(trimmed));

    // STAGE 1: Check LEVEL_4 (Imminent Danger)
    const imminentMatches = this.findMatches(trimmed, IMMINENT_DANGER_PATTERNS);
    if (imminentMatches.length > 0) {
      return {
        riskLevel: 'LEVEL_4',
        triggerType: 'IMMINENT_DANGER',
        isCrisis: true,
        isImmediateDanger: true,
        matchedTriggers: imminentMatches,
        explanation: 'Potential imminent danger requiring immediate emergency crisis escalation.',
        suggestedAction: 'EMERGENCY_ESCALATED',
        escalationRequired: true,
        followUpRequired: true,
      };
    }

    // STAGE 2: Check LEVEL_3 (Explicit Self-Harm & Suicide Crisis)
    // Only proceed if not clearly benign slang (e.g. "killing it in exams")
    if (!isBenignSlang) {
      const explicitCrisisMatches = this.findMatches(trimmed, EXPLICIT_CRISIS_PATTERNS);
      if (explicitCrisisMatches.length > 0) {
        return {
          riskLevel: 'LEVEL_3',
          triggerType: 'EXPLICIT_SELF_HARM',
          isCrisis: true,
          isImmediateDanger: false,
          matchedTriggers: explicitCrisisMatches,
          explanation: 'Potential self-harm or severe psychological crisis requiring crisis intervention.',
          suggestedAction: 'CRISIS_HELPLINES_SHOWN',
          escalationRequired: true,
          followUpRequired: true,
        };
      }

      // STAGE 3: Check LEVEL_3 (Indirect Crisis Language)
      const indirectCrisisMatches = this.findMatches(trimmed, INDIRECT_CRISIS_PATTERNS);
      if (indirectCrisisMatches.length > 0) {
        return {
          riskLevel: 'LEVEL_3',
          triggerType: 'INDIRECT_CRISIS_SIGNAL',
          isCrisis: true,
          isImmediateDanger: false,
          matchedTriggers: indirectCrisisMatches,
          explanation: 'Indirect crisis language or veiled intent detected requiring safety de-escalation.',
          suggestedAction: 'CRISIS_HELPLINES_SHOWN',
          escalationRequired: true,
          followUpRequired: true,
        };
      }
    }

    // Repeated crisis detection escalation:
    // If student already has 2+ crisis events within 24h and shows distress, escalate to LEVEL_3
    const recentCrisisCount = options?.studentRecentCrisisCount || 0;
    if (recentCrisisCount >= 2 && !isBenignSlang) {
      const distressMatches = this.findMatches(trimmed, [...SIGNIFICANT_DISTRESS_PATTERNS, ...MILD_DISTRESS_PATTERNS]);
      if (distressMatches.length > 0) {
        return {
          riskLevel: 'LEVEL_3',
          triggerType: 'REPEATED_CRISIS',
          isCrisis: true,
          isImmediateDanger: false,
          matchedTriggers: [`REPEATED_DISTRESS (${recentCrisisCount} recent events)`],
          explanation: 'Repeated crisis signals in short timeframe elevated to active crisis monitoring.',
          suggestedAction: 'CRISIS_HELPLINES_SHOWN',
          escalationRequired: true,
          followUpRequired: true,
        };
      }
    }

    // STAGE 4: Check LEVEL_2 (Significant Distress & Panic)
    if (!isBenignSlang) {
      const significantDistressMatches = this.findMatches(trimmed, SIGNIFICANT_DISTRESS_PATTERNS);
      if (significantDistressMatches.length > 0) {
        return {
          riskLevel: 'LEVEL_2',
          triggerType: 'SIGNIFICANT_DISTRESS',
          isCrisis: false,
          isImmediateDanger: false,
          matchedTriggers: significantDistressMatches,
          explanation: 'Significant distress requiring encouragement toward professional support.',
          suggestedAction: 'COUNSELLOR_RECOMMENDED',
          escalationRequired: false,
          followUpRequired: false,
        };
      }
    }

    // STAGE 5: Check LEVEL_1 (Mild Emotional Distress)
    const mildDistressMatches = this.findMatches(trimmed, MILD_DISTRESS_PATTERNS);
    if (mildDistressMatches.length > 0 || isBenignSlang) {
      return {
        riskLevel: 'LEVEL_1',
        triggerType: 'MILD_DISTRESS',
        isCrisis: false,
        isImmediateDanger: false,
        matchedTriggers: isBenignSlang ? ['SLANG_CONTEXT_FILTERED'] : mildDistressMatches,
        explanation: 'Mild emotional distress or situational campus stress.',
        suggestedAction: 'COPING_STRATEGIES_OFFERED',
        escalationRequired: false,
        followUpRequired: false,
      };
    }

    // STAGE 6: LEVEL_0 (No Apparent Risk)
    return {
      riskLevel: 'LEVEL_0',
      triggerType: 'NO_RISK_DETECTED',
      isCrisis: false,
      isImmediateDanger: false,
      matchedTriggers: [],
      explanation: 'No apparent risk detected in conversational message.',
      suggestedAction: 'NONE',
      escalationRequired: false,
      followUpRequired: false,
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

export const defaultSafetyRiskClassifier = new SafetyRiskClassifier();
