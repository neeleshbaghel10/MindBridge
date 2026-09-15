// MINDBRIDGE - Comprehensive Verification & Test Suite
import { scanMessageForCrisis } from '../services/safety.service';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { generateToken, verifyToken } from '../utils/security';

let passed = 0;
let failed = 0;

const assert = (condition: boolean, testName: string) => {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
};

async function runTests() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING MINDBRIDGE SYSTEM VERIFICATION & QA SUITE');
  console.log('============================================================\n');

  // TEST 1: Deterministic Safety & Crisis Filter Red-Teaming
  console.log('--- TEST GROUP 1: Crisis & Safety Engine Red-Teaming ---');
  const crisisPrompts = [
    'I want to end my life, there is no hope.',
    'I am thinking about suicide tonight.',
    'I want to jump off the roof because exam pressure is too much.',
    'Going to swallow pills and sleep forever.',
    'I feel like cutting my wrists right now.',
  ];

  for (const prompt of crisisPrompts) {
    const result = scanMessageForCrisis(prompt);
    assert(result.isCrisis === true && result.riskLevel === 'CRISIS', `Intercepted severe crisis trigger: "${prompt.slice(0, 30)}..."`);
  }

  const safePrompts = [
    'I am stressed about my compiler assignment.',
    'Can you teach me the 4-7-8 breathing technique?',
    'I had trouble falling asleep last night because of project deadlines.',
    'How do I handle imposter syndrome?',
  ];

  for (const prompt of safePrompts) {
    const result = scanMessageForCrisis(prompt);
    assert(result.isCrisis === false, `Safe conversational prompt correctly not flagged as crisis: "${prompt.slice(0, 30)}..."`);
  }

  // TEST 2: Security & Password Hashing Verification
  console.log('\n--- TEST GROUP 2: Cryptographic Security & Tokens ---');
  const testPassword = 'TestSecurePassword123!';
  const hash = await bcrypt.hash(testPassword, 10);
  const verifyValid = await bcrypt.compare(testPassword, hash);
  const verifyInvalid = await bcrypt.compare('WrongPassword!', hash);
  assert(verifyValid === true, 'Bcrypt password hash matches valid password.');
  assert(verifyInvalid === false, 'Bcrypt password hash rejects invalid password.');

  const tokenPayload = {
    userId: 'test-user-id',
    email: 'test@aiths.ac.in',
    role: 'STUDENT',
    institutionId: 'inst-123',
  };
  const token = generateToken(tokenPayload);
  const decoded = verifyToken(token);
  assert(decoded.userId === tokenPayload.userId && decoded.role === 'STUDENT', 'JWT generation and payload verification succeeded.');

  // TEST 3: Database & Seeder Data Integrity
  console.log('\n--- TEST GROUP 3: Database & Seed Data Integrity ---');
  const userCount = await prisma.user.count();
  assert(userCount >= 5, `All 5 role accounts exist in database (found ${userCount}).`);

  const assessmentCount = await prisma.assessment.count();
  assert(assessmentCount >= 3, `Standardized screenings (PHQ-9, GAD-7, WHO-5) exist in database (found ${assessmentCount}).`);

  const counsellor = await prisma.counsellorProfile.findFirst({
    include: { user: true },
  });
  assert(counsellor !== null && counsellor.isAvailable === true, `Active counsellor verified with license: ${counsellor?.licenseNumber}`);

  const phq9 = await prisma.assessment.findUnique({ where: { code: 'PHQ9' } });
  assert(phq9 !== null && phq9.clinicalDisclaimer.includes('NOT an official psychiatric diagnosis'), 'Clinical disclaimer strictly present in screening instrument.');

  // TEST 4: Screening Scoring Engine Logic
  console.log('\n--- TEST GROUP 4: Screening Scoring & Severity Categorization ---');
  const scoringRules = JSON.parse(phq9?.scoringRulesJson || '{}');
  const calculateSeverity = (score: number) => {
    for (const t of scoringRules.thresholds) {
      if (score >= t.min && score <= t.max) return t.category;
    }
    return 'Unknown';
  };

  assert(calculateSeverity(2) === 'Minimal Depression', 'Score 2 classified as Minimal Depression.');
  assert(calculateSeverity(7) === 'Mild Depression', 'Score 7 classified as Mild Depression.');
  assert(calculateSeverity(12) === 'Moderate Depression', 'Score 12 classified as Moderate Depression.');
  assert(calculateSeverity(16) === 'Moderately Severe Depression', 'Score 16 classified as Moderately Severe Depression.');
  assert(calculateSeverity(22) === 'Severe Depression', 'Score 22 classified as Severe Depression.');

  console.log('\n============================================================');
  console.log(`🏁 QA RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests()
  .catch(e => {
    console.error('Test execution failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
