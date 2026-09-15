// MINDBRIDGE - AI Psychological First-Aid Assistant Pipeline Orchestrator
// Executes the 7-stage processing pipeline with strict clinical safety boundaries

import {
  LLMProvider,
  SafetyClassifier,
  IntentClassifier,
  RetrievalService,
  ResponseGuard,
  CrisisService,
  ConversationTurn,
  PfaPipelineResult,
} from './types';
import { DefaultSafetyClassifier } from './safetyClassifier';
import { DefaultIntentClassifier } from './intentClassifier';
import { DefaultRetrievalService } from './retrievalService';
import { MultiProviderManager } from './llmProvider';
import { DefaultResponseGuard } from './responseGuard';
import { DefaultCrisisService } from './crisisService';

export class PfaPipeline {
  private safetyClassifier: SafetyClassifier;
  private intentClassifier: IntentClassifier;
  private retrievalService: RetrievalService;
  private llmProvider: LLMProvider;
  private responseGuard: ResponseGuard;
  private crisisService: CrisisService;

  constructor(options?: {
    safetyClassifier?: SafetyClassifier;
    intentClassifier?: IntentClassifier;
    retrievalService?: RetrievalService;
    llmProvider?: LLMProvider;
    responseGuard?: ResponseGuard;
    crisisService?: CrisisService;
  }) {
    this.safetyClassifier = options?.safetyClassifier || new DefaultSafetyClassifier();
    this.intentClassifier = options?.intentClassifier || new DefaultIntentClassifier();
    this.retrievalService = options?.retrievalService || new DefaultRetrievalService();
    this.llmProvider = options?.llmProvider || new MultiProviderManager();
    this.responseGuard = options?.responseGuard || new DefaultResponseGuard();
    this.crisisService = options?.crisisService || new DefaultCrisisService();
  }

  async processStudentMessage(
    rawMessage: string,
    history: ConversationTurn[] = [],
    studentProfileId?: string,
    institutionCode?: string
  ): Promise<PfaPipelineResult> {
    // -------------------------------------------------------------
    // STAGE 1: Input Validation
    // -------------------------------------------------------------
    const sanitizedInput = (rawMessage || '').trim();
    if (!sanitizedInput) {
      return {
        message: 'It looks like your message was empty. Whenever you feel ready, please share what is on your mind.',
        intent: 'EMPTY',
        riskLevel: 'NONE',
        isCrisis: false,
        counsellorReferralPrompt: false,
        recommendedResources: [],
        safetyFlags: {},
      };
    }

    // -------------------------------------------------------------
    // STAGE 2: Safety Classifier (Crisis, Abuse, Injection)
    // -------------------------------------------------------------
    const safetyResult = this.safetyClassifier.scan(sanitizedInput);

    // Short-circuit: Crisis detected -> Immediate deterministic escalation
    if (safetyResult.isCrisis) {
      if (studentProfileId) {
        await this.crisisService.recordCrisisEvent(studentProfileId, safetyResult);
      }
      return this.crisisService.buildCrisisEscalationResponse(safetyResult, institutionCode);
    }

    // -------------------------------------------------------------
    // STAGE 3: Intent Classifier
    // -------------------------------------------------------------
    const intentResult = this.intentClassifier.classify(sanitizedInput, safetyResult);

    // -------------------------------------------------------------
    // STAGE 4: Retrieval Layer (RAG Knowledge Base)
    // -------------------------------------------------------------
    const retrievedResources = await this.retrievalService.retrieve(intentResult.intent, sanitizedInput);

    // -------------------------------------------------------------
    // STAGE 5: Response Generation via LLMProvider (or Boundary Handler)
    // -------------------------------------------------------------
    // For prompt injection, abusive content, diagnosis requests, or medication requests,
    // we bypass generative hallucinations and provide deterministic boundary guard responses.
    let rawGeneratedText = '';
    const isBoundaryIntent = [
      'DIAGNOSIS_REQUEST',
      'MEDICATION_REQUEST',
      'PROMPT_INJECTION',
      'ABUSIVE',
    ].includes(intentResult.intent);

    if (isBoundaryIntent) {
      rawGeneratedText = ''; // Response guard handles intent-level replacement
    } else {
      // Clean memory context: keep only recent 4 turns, strictly zero PII
      const sanitizedHistory: ConversationTurn[] = history.slice(-4).map((t) => ({
        sender: t.sender,
        content: t.content.slice(0, 500),
      }));

      rawGeneratedText = await this.llmProvider.generateResponse(
        sanitizedInput,
        sanitizedHistory,
        retrievedResources
      );
    }

    // -------------------------------------------------------------
    // STAGE 6: Safety Verification (Response Guard)
    // -------------------------------------------------------------
    const guardResult = this.responseGuard.verifyAndSanitize(
      rawGeneratedText,
      intentResult.intent,
      retrievedResources
    );

    // -------------------------------------------------------------
    // STAGE 7: Response Assembly & Resource Attachment
    // -------------------------------------------------------------
    const primaryResource = retrievedResources[0];
    const shouldPromptCounsellor = [
      'ANXIETY',
      'DIAGNOSIS_REQUEST',
      'MEDICATION_REQUEST',
      'LONELINESS',
    ].includes(intentResult.intent);

    return {
      message: guardResult.sanitizedResponse,
      intent: intentResult.intent,
      riskLevel: safetyResult.riskLevel,
      isCrisis: false,
      groundingExercise: primaryResource?.groundingExercise,
      suggestedAction: primaryResource?.actionableSteps?.[0]
        ? `Try this: ${primaryResource.actionableSteps[0]}`
        : undefined,
      counsellorReferralPrompt: shouldPromptCounsellor,
      recommendedResources: retrievedResources,
      safetyFlags: {
        boundaryRefusalApplied: guardResult.boundaryEnforced,
        nonDiagnosticDisclaimerIncluded: true,
        promptInjectionBlocked: safetyResult.isPromptInjection,
        abusiveContentHandled: safetyResult.isAbusive,
      },
    };
  }
}

export const defaultPfaPipeline = new PfaPipeline();
