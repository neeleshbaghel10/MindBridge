// MINDBRIDGE - AI Psychological First-Aid Assistant Architecture Types & Contracts

export type RiskLevel = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRISIS';

export type UserIntent =
  | 'NORMAL_CONVERSATION'
  | 'ANXIETY'
  | 'ACADEMIC_STRESS'
  | 'LONELINESS'
  | 'SLEEP_ISSUES'
  | 'DIAGNOSIS_REQUEST'
  | 'MEDICATION_REQUEST'
  | 'CRISIS'
  | 'PROMPT_INJECTION'
  | 'ABUSIVE'
  | 'EMPTY';

export interface GroundingExercise {
  type: 'BREATHING_4_7_8' | 'BOX_BREATHING' | 'GROUNDING_5_4_3_2_1' | 'COGNITIVE_REFRAME';
  title: string;
  instructions: string[];
}

export interface ResourceMetadata {
  id: string;
  title: string;
  category: 'ANXIETY' | 'STRESS' | 'SLEEP' | 'MINDFULNESS' | 'ACADEMIC' | 'LONELINESS' | 'GENERAL';
  language: 'en' | 'hi';
  source: string;
  evidenceLevel: 'Level 1 (RCT Supported)' | 'Level 2 (Clinical Guidelines)' | 'Level 3 (Evidence-Informed Practice)';
  reviewDate: string;
  approvedStatus: 'APPROVED' | 'UNDER_REVIEW' | 'ARCHIVED';
  summary: string;
  slug?: string;
  actionableSteps: string[];
  groundingExercise?: GroundingExercise;
}

export interface ConversationTurn {
  sender: 'STUDENT' | 'AI_ASSISTANT';
  content: string;
}

export interface SafetyScanResult {
  isSafe: boolean;
  isCrisis: boolean;
  isAbusive: boolean;
  isPromptInjection: boolean;
  riskLevel: RiskLevel;
  riskCategory?: 'SUICIDAL_IDEATION' | 'SELF_HARM' | 'ACUTE_PANIC' | 'VIOLENCE' | 'PROMPT_INJECTION' | 'ABUSIVE_INPUT';
  matchedTriggers: string[];
  helplineRequired: boolean;
}

export interface IntentClassificationResult {
  intent: UserIntent;
  confidence: number;
  detectedKeywords: string[];
}

export interface VerifiedHelpline {
  name: string;
  number: string;
  availableHours: string;
  description: string;
  verifiedOfficial: boolean;
}

export interface PfaPipelineResult {
  message: string;
  intent: UserIntent;
  riskLevel: RiskLevel;
  isCrisis: boolean;
  groundingExercise?: GroundingExercise;
  suggestedAction?: string;
  counsellorReferralPrompt: boolean;
  recommendedResources: ResourceMetadata[];
  helplines?: VerifiedHelpline[];
  safetyFlags: {
    boundaryRefusalApplied?: boolean;
    nonDiagnosticDisclaimerIncluded?: boolean;
    promptInjectionBlocked?: boolean;
    abusiveContentHandled?: boolean;
  };
}

// 1. LLM Provider Interface (Vendor-Agnostic)
export interface LLMProvider {
  name: string;
  generateResponse(
    prompt: string,
    history: ConversationTurn[],
    retrievedResources: ResourceMetadata[]
  ): Promise<string>;
}

// 2. Safety Classifier Interface
export interface SafetyClassifier {
  scan(content: string): SafetyScanResult;
}

// 3. Intent Classifier Interface
export interface IntentClassifier {
  classify(content: string, safetyResult: SafetyScanResult): IntentClassificationResult;
}

// 4. Retrieval Service (RAG) Interface
export interface RetrievalService {
  retrieve(intent: UserIntent, content: string, language?: string): Promise<ResourceMetadata[]>;
  getAllApprovedResources(): ResourceMetadata[];
}

// 5. Response Guard Interface
export interface ResponseGuard {
  verifyAndSanitize(
    rawResponse: string,
    intent: UserIntent,
    retrievedResources: ResourceMetadata[]
  ): {
    sanitizedResponse: string;
    boundaryEnforced: boolean;
    violationsDetected: string[];
  };
}

// 6. Crisis Service Interface
export interface CrisisService {
  getVerifiedHelplines(institutionCode?: string): VerifiedHelpline[];
  buildCrisisEscalationResponse(
    scanResult: SafetyScanResult,
    institutionCode?: string
  ): PfaPipelineResult;
  recordCrisisEvent(studentProfileId: string, scanResult: SafetyScanResult): Promise<void>;
}
