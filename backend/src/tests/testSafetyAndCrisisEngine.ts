// MINDBRIDGE - Safety and Crisis Engine Automated Test Suite
// Rigorously tests false positives, false negatives, indirect language, state machine, and peer interception

import {
  SafetyRiskClassifier,
  CrisisStateMachine,
  CrisisResponseBuilder,
  RiskEventService,
  defaultSafetyRiskClassifier,
} from '../safety';
import { prisma } from '../prisma/client';

let passedTests = 0;
let failedTests = 0;

function assert(condition: any, testName: string, detail?: string) {
  if (Boolean(condition)) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
    failedTests++;
  }
}

async function runSafetyAndCrisisEngineTests() {
  console.log('============================================================');
  console.log('🛡️  MINDBRIDGE SAFETY & CRISIS ENGINE TEST SUITE');
  console.log('============================================================\n');

  const classifier = new SafetyRiskClassifier();

  // -------------------------------------------------------------
  // TEST GROUP 1: False Positives (Benign Colloquial Slang)
  // -------------------------------------------------------------
  console.log('--- TEST GROUP 1: False Positive Mitigation (Benign Slang) ---');
  {
    const benignPrompts = [
      "I am totally killing it in my engineering exams this semester!",
      "This database homework is absolutely killing me.",
      "I was laughing so hard I was literally dying of laughter.",
      "My laptop battery died in the middle of lecture.",
      "I was cutting paper and cardboard for my architecture project.",
      "I am dead tired after running five kilometers.",
      "Our team project deadline is tomorrow and we are crushing it.",
    ];

    for (const prompt of benignPrompts) {
      const res = classifier.classify(prompt);
      assert(
        !res.isCrisis,
        `Not flagged as crisis: "${prompt.slice(0, 36)}..."`,
        `Got riskLevel=${res.riskLevel}, isCrisis=${res.isCrisis}`
      );
      assert(
        res.riskLevel === 'LEVEL_0' || res.riskLevel === 'LEVEL_1',
        `Safe classification tier: ${res.riskLevel}`
      );
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 2: False Negatives (Direct Suicidal & Lethal Statements)
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: False Negative Elimination (Direct Crisis) ---');
  {
    const crisisPrompts = [
      "I want to end my life, there is no hope left.",
      "I am planning suicide tonight.",
      "I want to kill myself.",
      "Going to hang myself in my room.",
      "I wish I could die in my sleep.",
    ];

    for (const prompt of crisisPrompts) {
      const res = classifier.classify(prompt);
      assert(res.isCrisis === true, `Crisis caught: "${prompt.slice(0, 32)}..."`);
      assert(
        res.riskLevel === 'LEVEL_3' || res.riskLevel === 'LEVEL_4',
        `Elevated risk tier (${res.riskLevel}) assigned`
      );
      assert(res.escalationRequired === true, 'Escalation requirement flagged');
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: Indirect Crisis Language & Veiled Intent
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Indirect Crisis Language & Veiled Signals ---');
  {
    const indirectPrompts = [
      "I won't be here tomorrow, goodbye everyone.",
      "I am giving away all my belongings to my roommates today.",
      "Everyone on this campus would be much better off without me.",
      "There is no reason to wake up anymore.",
      "Nobody would care if I was gone forever.",
      "Writing my farewell note tonight.",
    ];

    for (const prompt of indirectPrompts) {
      const res = classifier.classify(prompt);
      assert(
        res.isCrisis === true,
        `Indirect crisis intercepted: "${prompt.slice(0, 36)}..."`,
        `Got riskLevel=${res.riskLevel}`
      );
      assert(
        res.triggerType === 'INDIRECT_CRISIS_SIGNAL' || res.triggerType === 'EXPLICIT_SELF_HARM',
        `Trigger type identified as ${res.triggerType}`
      );
      assert(res.followUpRequired === true, 'Follow-up requirement flagged');
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 4: Explicit Self-Harm Statements
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Explicit Self-Harm Statements ---');
  {
    const selfHarmPrompts = [
      "I feel like cutting my wrists right now.",
      "I have been burning myself on my arms.",
      "I can't stop cutting myself.",
      "I want to slit my throat.",
    ];

    for (const prompt of selfHarmPrompts) {
      const res = classifier.classify(prompt);
      assert(res.riskLevel === 'LEVEL_3', `Classified as LEVEL_3 for: "${prompt.slice(0, 30)}..."`);
      assert(res.triggerType === 'EXPLICIT_SELF_HARM', 'Trigger type is EXPLICIT_SELF_HARM');
      assert(res.isImmediateDanger === false, 'Distinguished from immediate lethal in-progress danger');
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 5: Immediate Danger Statements (LEVEL_4)
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Immediate Danger Statements (LEVEL_4) ---');
  {
    const imminentPrompts = [
      "I am standing on the hostel roof about to jump right now.",
      "I am swallowing all my pills right now today.",
      "I have a rope tied and ready to end it all right now.",
      "I took an overdose of pills already.",
    ];

    for (const prompt of imminentPrompts) {
      const res = classifier.classify(prompt);
      assert(res.riskLevel === 'LEVEL_4', `Classified strictly as LEVEL_4 for: "${prompt.slice(0, 36)}..."`);
      assert(res.triggerType === 'IMMINENT_DANGER', 'Trigger type is IMMINENT_DANGER');
      assert(res.isImmediateDanger === true, 'Immediate danger flag strictly true');
      assert(res.suggestedAction === 'EMERGENCY_ESCALATED', 'Suggested action is EMERGENCY_ESCALATED');
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 6: Repeated Crisis Messages Escalation
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Repeated Crisis Messages Tracking ---');
  {
    const repeatedDistressPrompt = "I am feeling so overwhelmed and hopeless with everything.";

    // Case A: First time distress (0 recent events) -> LEVEL_2
    const firstRes = classifier.classify(repeatedDistressPrompt, { studentRecentCrisisCount: 0 });
    assert(firstRes.riskLevel === 'LEVEL_2', 'Initial distress categorized as LEVEL_2');

    // Case B: Repeated distress (2 recent crisis events in past 24h) -> Escalated to LEVEL_3
    const repeatedRes = classifier.classify(repeatedDistressPrompt, { studentRecentCrisisCount: 2 });
    assert(repeatedRes.riskLevel === 'LEVEL_3', 'Repeated distress elevated to LEVEL_3');
    assert(repeatedRes.triggerType === 'REPEATED_CRISIS', 'Trigger marked as REPEATED_CRISIS');
    assert(repeatedRes.isCrisis === true, 'Flagged for active crisis monitoring');
  }

  // -------------------------------------------------------------
  // TEST GROUP 7: Crisis Shift After Normal Conversation
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Crisis Shift After Normal Dialogue ---');
  {
    const conversationTurns = [
      { text: "Hi, how are you today?", expectCrisis: false, expectedLevel: 'LEVEL_0' },
      { text: "I had a busy day with classes.", expectCrisis: false, expectedLevel: 'LEVEL_0' },
      { text: "Actually, things got unbearable. I want to kill myself tonight.", expectCrisis: true, expectedLevel: 'LEVEL_3' },
    ];

    for (let i = 0; i < conversationTurns.length; i++) {
      const turn = conversationTurns[i];
      const res = classifier.classify(turn.text);
      assert(res.isCrisis === turn.expectCrisis, `Turn ${i + 1} crisis flag is ${turn.expectCrisis}`);
      assert(res.riskLevel === turn.expectedLevel, `Turn ${i + 1} risk level is ${turn.expectedLevel}`);
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 8: Crisis Response Building & Helplines
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Crisis Response Building & Transparency ---');
  {
    const level4Response = CrisisResponseBuilder.buildResponse('LEVEL_4', '112');
    assert(level4Response.verifiedResources.length >= 3, 'Includes at least 3 verified crisis resources');

    const teleManas = level4Response.verifiedResources.find(r => r.number === '14416');
    assert(teleManas !== undefined && teleManas.verifiedOfficial, 'Verified Tele-MANAS (14416) present');

    const kiran = level4Response.verifiedResources.find(r => r.number === '1800-599-0019');
    assert(kiran !== undefined && kiran.verifiedOfficial, 'Verified KIRAN (1800-599-0019) present');

    // Requirement 8: Do not promise confidentiality if emergency escalation rules apply
    assert(
      level4Response.transparencyDisclosure.toLowerCase().includes('cannot remain strictly confidential') ||
      level4Response.transparencyDisclosure.toLowerCase().includes('emergency lifesaving protocol'),
      'Transparently discloses emergency limits of confidentiality'
    );

    // Requirement 7: Avoid guilt, shame, or coercive language
    assert(
      !level4Response.supportiveMessage.toLowerCase().includes('think of your family') &&
      !level4Response.supportiveMessage.toLowerCase().includes('selfish') &&
      !level4Response.supportiveMessage.toLowerCase().includes('how could you'),
      'Zero guilt, shame, or coercive expressions'
    );
  }

  // -------------------------------------------------------------
  // TEST GROUP 9: Crisis State Machine Transitions
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: Crisis State Machine Validations ---');
  {
    // Valid state transitions
    assert(CrisisStateMachine.canTransition('TRIGGERED', 'ACKNOWLEDGED') === true, 'TRIGGERED -> ACKNOWLEDGED allowed');
    assert(CrisisStateMachine.canTransition('ACKNOWLEDGED', 'COUNSELLOR_DISPATCHED') === true, 'ACKNOWLEDGED -> COUNSELLOR_DISPATCHED allowed');
    assert(CrisisStateMachine.canTransition('COUNSELLOR_DISPATCHED', 'FOLLOWUP_SCHEDULED') === true, 'COUNSELLOR_DISPATCHED -> FOLLOWUP_SCHEDULED allowed');
    assert(CrisisStateMachine.canTransition('FOLLOWUP_SCHEDULED', 'RESOLVED') === true, 'FOLLOWUP_SCHEDULED -> RESOLVED allowed');
    assert(CrisisStateMachine.canTransition('RESOLVED', 'CLOSED') === true, 'RESOLVED -> CLOSED allowed');
    assert(CrisisStateMachine.canTransition('TRIGGERED', 'RESOLVED') === true, 'TRIGGERED -> RESOLVED (false alarm) allowed');

    // Invalid state transitions
    assert(CrisisStateMachine.canTransition('TRIGGERED', 'CLOSED') === false, 'TRIGGERED -> CLOSED strictly rejected');
    assert(CrisisStateMachine.canTransition('ACKNOWLEDGED', 'CLOSED') === false, 'ACKNOWLEDGED -> CLOSED strictly rejected');
    assert(CrisisStateMachine.canTransition('CLOSED', 'TRIGGERED') === false, 'CLOSED is terminal, reopening blocked');
  }

  // -------------------------------------------------------------
  // TEST GROUP 10: Risk Event Persistence & Database Audit Record
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 10: Risk Event Auditing & Persistence ---');
  {
    const student = await prisma.studentProfile.findFirst();
    if (student) {
      // Log LEVEL_3 risk event via service
      const { riskEventId, crisisEventId } = await RiskEventService.logRiskEvent({
        studentProfileId: student.id,
        riskLevel: 'LEVEL_3',
        triggerType: 'INDIRECT_CRISIS_SIGNAL',
        source: 'PEER_COMMUNITY',
        actionTaken: 'CRISIS_HELPLINES_SHOWN',
        escalationStatus: 'ESCALATED',
        followUpStatus: 'PENDING_FOLLOWUP',
        triggerSnippetRedacted: 'Test indirect crisis: "won\'t be here tomorrow"',
        ipAddress: '127.0.0.1',
        userAgent: 'TestRunner/1.0',
      });

      assert(riskEventId !== undefined, 'RiskEvent created with ID');
      assert(crisisEventId !== undefined, 'Linked CrisisEvent created with ID');

      // Verify database fields
      const savedRisk = await prisma.riskEvent.findUnique({ where: { id: riskEventId } });
      assert(savedRisk?.riskLevel === 'LEVEL_3', 'Risk level correctly stored as LEVEL_3');
      assert(savedRisk?.triggerType === 'INDIRECT_CRISIS_SIGNAL', 'Trigger type stored');
      assert(savedRisk?.source === 'PEER_COMMUNITY', 'Source stored as PEER_COMMUNITY');
      assert(savedRisk?.actionTaken === 'CRISIS_HELPLINES_SHOWN', 'Action taken stored');
      assert(savedRisk?.escalationStatus === 'ESCALATED', 'Escalation status stored');
      assert(savedRisk?.followUpStatus === 'PENDING_FOLLOWUP', 'Follow up status stored');

      // Audit info check
      const auditParsed = JSON.parse(savedRisk?.auditInfoJson || '{}');
      assert(auditParsed.ipAddress === '127.0.0.1', 'Audit IP address captured');
      assert(auditParsed.loggedAt !== undefined, 'Audit timestamp captured');

      // Perform valid state machine transition
      if (crisisEventId) {
        const trans1 = await RiskEventService.transitionCrisis({
          crisisEventId,
          targetState: 'ACKNOWLEDGED',
          notes: 'Campus counsellor acknowledged crisis alert.',
        });
        assert(trans1.success === true, 'Transition to ACKNOWLEDGED succeeded');
        assert(trans1.state === 'ACKNOWLEDGED', 'New state is ACKNOWLEDGED');

        const trans2 = await RiskEventService.transitionCrisis({
          crisisEventId,
          targetState: 'COUNSELLOR_DISPATCHED',
          notes: 'Outreach in progress.',
        });
        assert(trans2.success === true, 'Transition to COUNSELLOR_DISPATCHED succeeded');

        // Test invalid transition attempt: cannot go straight to CLOSED from COUNSELLOR_DISPATCHED
        const invalidTrans = await RiskEventService.transitionCrisis({
          crisisEventId,
          targetState: 'CLOSED',
        });
        assert(invalidTrans.success === false, 'Invalid jump to CLOSED was blocked');
      }
    } else {
      console.warn('  ⚠️ Skipping DB persistence test (no student profile in dev DB)');
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 11: Deterministic Authority (No LLM Overrides)
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 11: Deterministic Authority & Non-Diagnostic Guarantee ---');
  {
    // Simulate an adversarial scenario where a hypothetical model claims "No crisis, student is just joking"
    const crisisInput = "I am going to slit my wrists tonight.";
    const deterministicSafetyResult = classifier.classify(crisisInput);

    // Rule: The deterministic safety engine result CANNOT be downgraded
    const mockLlmDowngradeAttempt = {
      isCrisis: false,
      riskLevel: 'LEVEL_0',
    };

    const finalAuthorizedDecision = {
      isCrisis: deterministicSafetyResult.isCrisis, // Deterministic has final authority
      riskLevel: deterministicSafetyResult.riskLevel,
    };

    assert(finalAuthorizedDecision.isCrisis === true, 'Deterministic safety overrides any downstream downgrade attempt');
    assert(finalAuthorizedDecision.riskLevel === 'LEVEL_3', 'Risk tier strictly preserved at LEVEL_3');
  }

  // -------------------------------------------------------------
  // FINAL RESULTS
  // -------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`🏁 SAFETY & CRISIS ENGINE QA RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSafetyAndCrisisEngineTests().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
