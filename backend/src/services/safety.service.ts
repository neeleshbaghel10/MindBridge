// MINDBRIDGE - Deterministic Safety & Crisis Filter

export interface SafetyScanResult {
  isCrisis: boolean;
  riskLevel: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRISIS';
  riskCategory?: 'SUICIDAL_IDEATION' | 'SELF_HARM' | 'ACUTE_PANIC' | 'VIOLENCE';
  matchedTriggers: string[];
  helplineRequired: boolean;
}

// Deterministic high-severity crisis regex patterns (0% hallucination risk)
const CRISIS_PATTERNS = [
  /\b(?:kill|end|take)\s+(?:my\s*life|myself)\b/i,
  /\b(?:suicide|suicidal|commit\s+suicide)\b/i,
  /\b(?:want\s+to|going\s+to|wish\s+I\s+could)\s+(?:die|disappear|not\s+wake\s+up)\b/i,
  /\b(?:no\s+reason\s+to\s+live|better\s+off\s+dead|can't\s+go\s+on\s+living)\b/i,
  /\b(?:hang\s+myself|slit\s+(?:my\s+)?(?:wrists?|throat)|overdose|swallow\s+pills)\b/i,
  /\b(?:cut|cutting)\s+(?:myself|my\s+(?:arms?|wrists?|thighs?))\b/i,
  /\b(?:goodbye\s+cruel\s+world|farewell\s+note|leaving\s+this\s+world)\b/i,
  /\b(?:jump(?:ing)?\s+off\s+(?:a\s+bridge|the\s+roof|a\s+building))\b/i,
];

// Moderate distress patterns (prompt grounding and counsellor suggestion, but not immediate crisis lockout)
const MODERATE_DISTRESS_PATTERNS = [
  /\b(?:having\s+a\s+panic\s+attack|can't\s+breathe|heart\s+racing|chest\s+tightness)\b/i,
  /\b(?:feeling\s+(?:completely\s+)?hopeless|worthless|numb\s+inside)\b/i,
  /\b(?:overwhelmed|breaking\s+down|can't\s+take\s+(?:this|the\s+pressure)\s+anymore)\b/i,
  /\b(?:crying\s+unstoppably|terrified\s+about\s+the\s+future)\b/i,
];

export const scanMessageForCrisis = (content: string): SafetyScanResult => {
  const normalized = content.trim();
  const matchedTriggers: string[] = [];

  // 1. High-severity Crisis Check
  for (const pattern of CRISIS_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      matchedTriggers.push(match[0]);
    }
  }

  if (matchedTriggers.length > 0) {
    return {
      isCrisis: true,
      riskLevel: 'CRISIS',
      riskCategory: 'SUICIDAL_IDEATION',
      matchedTriggers,
      helplineRequired: true,
    };
  }

  // 2. Moderate Distress / Panic Check
  const moderateMatches: string[] = [];
  for (const pattern of MODERATE_DISTRESS_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      moderateMatches.push(match[0]);
    }
  }

  if (moderateMatches.length > 0) {
    return {
      isCrisis: false,
      riskLevel: 'MODERATE',
      riskCategory: 'ACUTE_PANIC',
      matchedTriggers: moderateMatches,
      helplineRequired: false,
    };
  }

  return {
    isCrisis: false,
    riskLevel: 'NONE',
    matchedTriggers: [],
    helplineRequired: false,
  };
};

export const getEmergencyHelplines = () => [
  {
    name: 'National Tele-MANAS',
    number: '14416',
    availableHours: '24 Hours / 7 Days (Toll Free)',
    description: 'Government of India comprehensive mental health support service in 20+ regional languages.',
  },
  {
    name: 'KIRAN Mental Health Helpline',
    number: '1800-599-0019',
    availableHours: '24x7 Multi-lingual Assistance',
    description: 'Ministry of Social Justice and Empowerment psychological first-aid.',
  },
  {
    name: 'Vandrevala Foundation Helpline',
    number: '+91-9999-666-555',
    availableHours: '24 Hours Daily',
    description: 'Free, confidential psychological counselling and emotional crisis mitigation.',
  },
  {
    name: 'Campus Emergency Response & Security',
    number: '112',
    availableHours: 'Immediate Campus Response',
    description: 'On-campus first response, medical dispatch, and student welfare assistance.',
  },
];
