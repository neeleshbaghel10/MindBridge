// ============================================================
// MINDBRIDGE PEER SUPPORT COMMUNITY & MODERATION TEST SUITE
// ============================================================

import { prisma } from '../prisma/client';
import { screenContent, checkRateLimit } from '../peer/peerModerationService';
import { ModerationState, ReactionType, ReportReason, ModerationAction, AiModerationLabel } from '../peer/types';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log('  PASS: ' + message);
  } else {
    failedTests++;
    console.error('  FAIL: ' + message);
  }
}

const API_BASE = 'http://localhost:5000/api/v1';

async function request(path: string, options: { method?: string; body?: any; token?: string } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = 'Bearer ' + options.token;
  }

  const res = await fetch(API_BASE + path, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('============================================================');
  console.log('MINDBRIDGE PEER SUPPORT COMMUNITY TEST SUITE');
  console.log('============================================================\n');

  // --- Setup test fixtures ---
  const institution = await prisma.institution.findFirst();
  if (!institution) throw new Error('Database not seeded with institution.');

  // Create student 1
  let user1 = await prisma.user.findUnique({ where: { email: 'peer_student1@test.aiths.ac.in' }, include: { studentProfile: true } });
  if (!user1) {
    user1 = await prisma.user.create({
      data: {
        institutionId: institution.id,
        email: 'peer_student1@test.aiths.ac.in',
        passwordHash: 'dummy_hash',
        role: 'STUDENT',
        firstName: 'Dev',
        lastName: 'Patel',
        studentProfile: {
          create: {
            anonymousAlias: 'KindEagle-3142',
            department: 'Computer Science',
            yearOfStudy: 2,
            preferredLanguage: 'en',
          },
        },
      },
      include: { studentProfile: true },
    });
  }

  // Create student 2
  let user2 = await prisma.user.findUnique({ where: { email: 'peer_student2@test.aiths.ac.in' }, include: { studentProfile: true } });
  if (!user2) {
    user2 = await prisma.user.create({
      data: {
        institutionId: institution.id,
        email: 'peer_student2@test.aiths.ac.in',
        passwordHash: 'dummy_hash',
        role: 'STUDENT',
        firstName: 'Ananya',
        lastName: 'Verma',
        studentProfile: {
          create: {
            anonymousAlias: 'GentleRiver-8821',
            department: 'Information Technology',
            yearOfStudy: 3,
            preferredLanguage: 'en',
          },
        },
      },
      include: { studentProfile: true },
    });
  }

  // Find counsellor user for moderation testing
  const counsellorUser = await prisma.user.findFirst({
    where: { role: 'COUNSELLOR' },
  });
  if (!counsellorUser) throw new Error('No counsellor found in test database.');

  // Generate tokens for test users via auth service / sign token
  const jwt = await import('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_jwt_mindbridge_2026';

  const tokenStudent1 = jwt.default.sign(
    { userId: user1.id, role: 'STUDENT', institutionId: institution.id },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const tokenStudent2 = jwt.default.sign(
    { userId: user2.id, role: 'STUDENT', institutionId: institution.id },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const tokenCounsellor = jwt.default.sign(
    { userId: counsellorUser.id, role: 'COUNSELLOR', institutionId: institution.id },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: AI Moderation Service Screening ---');
  // -------------------------------------------------------------------------
  {
    // Test 1.1: Safe supportive content
    const safeResult = await screenContent(
      'Does anyone have recommendations on how to balance project deadlines with sleep?',
      user1.studentProfile!.id,
      false
    );
    assert(safeResult.labels.includes(AiModerationLabel.SAFE), 'Safe message labeled as SAFE');
    assert(safeResult.suggestedState === ModerationState.APPROVED, 'Safe message suggestedState is APPROVED');
    assert(!safeResult.shouldBlock, 'Safe message shouldBlock is false');
    assert(!safeResult.isCrisis, 'Safe message isCrisis is false');

    // Test 1.2: Crisis content (LEVEL_3 / LEVEL_4)
    const crisisResult = await screenContent(
      'I cannot take this anymore, I am planning suicide tonight, goodbye everyone',
      user1.studentProfile!.id,
      false
    );
    assert(crisisResult.isCrisis, 'Suicidal post flagged isCrisis=true');
    assert(crisisResult.labels.includes(AiModerationLabel.CRISIS), 'Crisis label attached');
    assert(crisisResult.suggestedState === ModerationState.ESCALATED, 'Crisis suggestedState is ESCALATED');
    assert(crisisResult.shouldBlock, 'Crisis post shouldBlock is true');
    assert(crisisResult.score >= 0.85, 'Crisis composite risk score >= 0.85 (got ' + crisisResult.score + ')');

    // Test 1.3: Harassment / Abuse content
    const abuseResult = await screenContent(
      'You are disgusting and nobody cares about you, go die',
      user1.studentProfile!.id,
      false
    );
    assert(abuseResult.isAbuse, 'Abuse detected for toxic harassment');
    assert(abuseResult.labels.includes(AiModerationLabel.ABUSE), 'ABUSE label attached');
    assert(abuseResult.suggestedState === ModerationState.FLAGGED, 'Abuse suggestedState is FLAGGED');
    assert(abuseResult.shouldBlock, 'Abuse post shouldBlock is true');

    // Test 1.4: Spam / External link
    const spamResult = await screenContent(
      'Get free exam notes click here now today limited offer http://scam-site.xyz/win',
      user1.studentProfile!.id,
      false
    );
    assert(spamResult.isSpam, 'Spam patterns detected');
    assert(spamResult.labels.includes(AiModerationLabel.SPAM), 'SPAM label attached');
    assert(spamResult.labels.includes(AiModerationLabel.EXTERNAL_URL), 'EXTERNAL_URL label attached');
    assert(spamResult.suggestedState === ModerationState.REMOVED, 'Spam suggestedState is REMOVED');

    // Test 1.5: Medical advice boundary
    const medResult = await screenContent(
      'You should take 50mg of this prescription medication for your insomnia',
      user1.studentProfile!.id,
      false
    );
    assert(medResult.labels.includes(AiModerationLabel.MEDICAL), 'Medical advice pattern labeled MEDICAL');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: In-Memory Sliding Window Rate Limiting ---');
  // -------------------------------------------------------------------------
  {
    const testProfileId = 'rate_limit_test_profile_' + Date.now();
    const firstAttempt = checkRateLimit(testProfileId);
    assert(firstAttempt.allowed, 'First post attempt within window is allowed');
    assert(firstAttempt.remainingCooldownMs === 0, 'First attempt has zero cooldown');

    const secondAttempt = checkRateLimit(testProfileId);
    assert(!secondAttempt.allowed, 'Immediate second post attempt is rate limited');
    assert(secondAttempt.remainingCooldownMs > 0, 'Remaining cooldown is positive (got ' + secondAttempt.remainingCooldownMs + 'ms)');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Peer Post Lifecycle & Safe Publication ---');
  // -------------------------------------------------------------------------
  let testPostId = '';
  {
    const res = await request('/peer-support/posts', {
      method: 'POST',
      token: tokenStudent1,
      body: {
        title: 'Managing third year lab workload and finding balance',
        content: 'I have been finding it helpful to study in pomodoro blocks. Anyone else find 25-min sprints effective?',
        category: 'Academic',
        isAnonymous: true,
      },
    });

    assert(res.status === 201, 'Post created with 201 Created (got ' + res.status + ')');
    assert(res.data.success === true, 'Response success is true');
    assert(res.data.data.status === 'APPROVED', 'Safe post auto-approved into community');
    assert(res.data.data.isAnonymous === true, 'isAnonymous preserved as true');
    assert(res.data.data.anonymousAuthorName === user1.studentProfile!.anonymousAlias, 'Author set to anonymousAlias');
    testPostId = res.data.data.id;

    // Verify public listing excludes PII
    const listRes = await request('/peer-support/posts?category=Academic', {
      token: tokenStudent2,
    });
    assert(listRes.status === 200, 'Peer posts listed successfully (200 OK)');
    const found = listRes.data.data.find((p: any) => p.id === testPostId);
    assert(!!found, 'Newly created post is visible in public approved feed');
    assert(found.authorAlias === user1.studentProfile!.anonymousAlias, 'Public feed shows authorAlias');
    assert(!found.email && !found.firstName, 'Zero PII exposed in public feed');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Crisis Content Interception on Posts ---');
  // -------------------------------------------------------------------------
  {
    const crisisRes = await request('/peer-support/posts', {
      method: 'POST',
      token: tokenStudent2,
      body: {
        title: 'I cannot go on anymore',
        content: 'I am planning to end my life tonight. Nobody cares about me.',
        category: 'Mindset',
        isAnonymous: true,
      },
    });

    assert(crisisRes.status === 400, 'Crisis post rejected with 400 (got ' + crisisRes.status + ')');
    assert(crisisRes.data.error?.code === 'CRISIS_INTERCEPTED', 'Error code is CRISIS_INTERCEPTED');
    assert(!!crisisRes.data.error?.details?.helplines, 'Returns emergency crisis helplines');
    
    // Verify NOT in public feed
    const listRes = await request('/peer-support/posts', { token: tokenStudent1 });
    const leakedPost = listRes.data.data.find((p: any) => p.title === 'I cannot go on anymore');
    assert(!leakedPost, 'Crisis post is strictly withheld from public community feed');

    // Verify RiskEvent audit log created
    const riskEvent = await prisma.riskEvent.findFirst({
      where: {
        studentProfileId: user2.studentProfile!.id,
        source: 'PEER_COMMUNITY',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(!!riskEvent, 'RiskEvent audit record automatically persisted for crisis post');
    assert(riskEvent?.escalationStatus === 'ESCALATED', 'Escalation status set to ESCALATED');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Threaded Comments & Comment Crisis Interception ---');
  // -------------------------------------------------------------------------
  let testCommentId = '';
  {
    // Safe comment
    const safeCommentRes = await request('/peer-support/posts/' + testPostId + '/comments', {
      method: 'POST',
      token: tokenStudent2,
      body: {
        content: 'Pomodoro is fantastic! Pairing it with 5-minute walks really helps.',
        isAnonymous: true,
      },
    });
    assert(safeCommentRes.status === 201, 'Comment created with 201 Created (got ' + safeCommentRes.status + ')');
    assert(safeCommentRes.data.data.status === 'APPROVED', 'Safe comment approved');
    testCommentId = safeCommentRes.data.data.id;

    // Crisis comment
    const crisisCommentRes = await request('/peer-support/posts/' + testPostId + '/comments', {
      method: 'POST',
      token: tokenStudent2,
      body: {
        content: 'I want to kill myself, everything is meaningless.',
        isAnonymous: true,
      },
    });
    assert(crisisCommentRes.status === 400, 'Crisis comment rejected with 400 (got ' + crisisCommentRes.status + ')');
    assert(crisisCommentRes.data.error?.code === 'CRISIS_INTERCEPTED', 'Crisis comment code is CRISIS_INTERCEPTED');

    // Verify crisis comment not in thread
    const postRes = await request('/peer-support/posts/' + testPostId, { token: tokenStudent1 });
    const crisisInThread = postRes.data.data.comments.find((c: any) => c.content.includes('kill myself'));
    assert(!crisisInThread, 'Crisis comment strictly withheld from post comment thread');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Multi-Type Reaction Toggling ---');
  // -------------------------------------------------------------------------
  {
    // Add UPVOTE reaction
    const react1 = await request('/peer-support/posts/' + testPostId + '/react', {
      method: 'POST',
      token: tokenStudent2,
      body: { reactionType: ReactionType.UPVOTE },
    });
    assert(react1.status === 200, 'Reaction toggle 1 returned 200 OK');
    assert(react1.data.data.toggled === true, 'Reaction toggled ON');
    assert(react1.data.data.action === 'added', 'Action is added');

    // Add EMPATHY reaction from same student
    const react2 = await request('/peer-support/posts/' + testPostId + '/react', {
      method: 'POST',
      token: tokenStudent2,
      body: { reactionType: ReactionType.EMPATHY },
    });
    assert(react2.data.data.toggled === true, 'Second distinct reactionType added concurrently');

    // Toggle OFF UPVOTE
    const react3 = await request('/peer-support/posts/' + testPostId + '/react', {
      method: 'POST',
      token: tokenStudent2,
      body: { reactionType: ReactionType.UPVOTE },
    });
    assert(react3.data.data.toggled === false, 'Clicking same reaction toggled OFF');
    assert(react3.data.data.action === 'removed', 'Action is removed');

    // Comment reaction toggle
    const commentReact = await request('/peer-support/comments/' + testCommentId + '/react', {
      method: 'POST',
      token: tokenStudent1,
      body: { reactionType: ReactionType.HELPFUL },
    });
    assert(commentReact.data.data.toggled === true, 'Helpful reaction added to comment');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Reporting Pipeline & Auto-Flagging on Self-Harm ---');
  // -------------------------------------------------------------------------
  {
    // Student 2 reports post for HARASSMENT
    const report1 = await request('/peer-support/posts/' + testPostId + '/report', {
      method: 'POST',
      token: tokenStudent2,
      body: {
        reason: ReportReason.HARASSMENT,
        details: 'Suspected passive-aggressive tone.',
      },
    });
    assert(report1.status === 201, 'Report created with 201 Created (got ' + report1.status + ')');
    assert(!!report1.data.data.reportId, 'Report ID returned');

    // Duplicate report prevention
    const dupReport = await request('/peer-support/posts/' + testPostId + '/report', {
      method: 'POST',
      token: tokenStudent2,
      body: { reason: ReportReason.SPAM },
    });
    assert(dupReport.status === 409, 'Duplicate report rejected with 409 Conflict (got ' + dupReport.status + ')');

    // Self-harm report on comment triggers automatic FLAGGED status
    const selfHarmReport = await request('/peer-support/comments/' + testCommentId + '/report', {
      method: 'POST',
      token: tokenStudent1,
      body: { reason: ReportReason.SELF_HARM, details: 'Concern for user safety.' },
    });
    assert(selfHarmReport.status === 201, 'Self-harm report on comment submitted');
    const flaggedComment = await prisma.peerComment.findUnique({ where: { id: testCommentId } });
    assert(flaggedComment?.status === 'FLAGGED', 'Comment automatically transitioned to FLAGGED state');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Moderation Queue & AI Triage Labels ---');
  // -------------------------------------------------------------------------
  {
    // Student blocked from moderation queue
    const studentQueueRes = await request('/moderation/queue', { token: tokenStudent1 });
    assert(studentQueueRes.status === 403, 'Student blocked from moderation queue with 403 (got ' + studentQueueRes.status + ')');

    // Counsellor accesses queue
    const modQueueRes = await request('/moderation/queue', { token: tokenCounsellor });
    assert(modQueueRes.status === 200, 'Counsellor access to queue allowed with 200 OK (got ' + modQueueRes.status + ')');
    assert(Array.isArray(modQueueRes.data.data.queue), 'Queue returned as array');
    assert(Array.isArray(modQueueRes.data.data.pendingReports), 'Pending reports returned');

    // Verify flagged comment appears in queue
    const flaggedInQueue = modQueueRes.data.data.queue.find((item: any) => item.id === testCommentId);
    assert(!!flaggedInQueue, 'Flagged comment is present in moderation queue');
    assert(flaggedInQueue.entityType === 'PEER_COMMENT', 'Item entityType is PEER_COMMENT');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: Moderator Actions & State Machine Transitions ---');
  // -------------------------------------------------------------------------
  {
    // Action 1: REMOVE flagged comment
    const removeRes = await request('/moderation/action', {
      method: 'POST',
      token: tokenCounsellor,
      body: {
        entityType: 'PEER_COMMENT',
        entityId: testCommentId,
        action: ModerationAction.REMOVE,
        reason: 'Violated community guidelines after report review.',
      },
    });
    assert(removeRes.status === 200, 'REMOVE action succeeded with 200 OK');
    assert(removeRes.data.data.newStatus === ModerationState.REMOVED, 'Status transitioned to REMOVED');

    const removedComment = await prisma.peerComment.findUnique({ where: { id: testCommentId } });
    assert(removedComment?.status === 'REMOVED', 'Database reflects status=REMOVED');
    assert(removedComment?.deletedAt !== null, 'deletedAt timestamp populated for soft deletion');

    // Verify ModerationEvent logged
    const modEvents = await prisma.moderationEvent.findMany({
      where: { entityType: 'PEER_COMMENT', entityId: testCommentId },
    });
    assert(modEvents.length >= 1, 'ModerationEvent audit entry written to database');
    assert(modEvents[0].action === 'REMOVE', 'ModerationEvent records REMOVE action');

    // Action 2: ESCALATE_TO_COUNSELLOR on test post
    const escalateRes = await request('/moderation/action', {
      method: 'POST',
      token: tokenCounsellor,
      body: {
        entityType: 'PEER_POST',
        entityId: testPostId,
        action: ModerationAction.ESCALATE_TO_COUNSELLOR,
        reason: 'Routing to clinical triage.',
      },
    });
    assert(escalateRes.status === 200, 'ESCALATE action succeeded with 200 OK');
    assert(escalateRes.data.data.newStatus === ModerationState.ESCALATED, 'Status transitioned to ESCALATED');

    // Action 3: APPROVE reinstated post
    const approveRes = await request('/moderation/action', {
      method: 'POST',
      token: tokenCounsellor,
      body: {
        entityType: 'PEER_POST',
        entityId: testPostId,
        action: ModerationAction.APPROVE,
        reason: 'Cleared after clinical review; content is safe for peers.',
      },
    });
    assert(approveRes.status === 200, 'APPROVE action reinstated post (200 OK)');
    assert(approveRes.data.data.newStatus === ModerationState.APPROVED, 'Status transitioned to APPROVED');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 10: Non-Therapist Boundary & Volunteer Role Verification ---');
  // -------------------------------------------------------------------------
  {
    // Verify peer volunteer users exist
    const peerVolunteers = await prisma.user.findMany({
      where: { role: 'PEER_VOLUNTEER' },
      include: { studentProfile: true },
    });
    assert(peerVolunteers.length >= 1, 'Found ' + peerVolunteers.length + ' registered peer volunteer(s)');
    assert(peerVolunteers[0].role === 'PEER_VOLUNTEER', 'Role is explicitly PEER_VOLUNTEER');
    assert(peerVolunteers[0].studentProfile !== null, 'Peer volunteer has linked StudentProfile for anonymous peer interactions');
    assert(peerVolunteers[0].role !== 'COUNSELLOR', 'Peer volunteer is strictly distinct from clinical COUNSELLOR role');
  }

  console.log('\n============================================================');
  console.log('PEER COMMUNITY QA RESULTS: ' + passedTests + ' PASSED, ' + failedTests + ' FAILED (Total: ' + totalTests + ')');
  console.log('============================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
