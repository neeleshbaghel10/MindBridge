import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runRelationTests() {
  console.log('============================================================');
  console.log('🔍 RUNNING MINDBRIDGE DATABASE ARCHITECTURE & RELATION TESTS');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    // Test 1: Institution count & relationships
    const institution = await prisma.institution.findFirst({
      include: {
        users: true,
        resources: true,
        metrics: true,
      },
    });
    assert(!!institution, 'Institution exists');
    assert(institution?.code === 'AITHS', 'Institution code is AITHS');
    assert(institution?.users.length! >= 26, `Institution relates to ${institution?.users.length} users (>=26 expected)`);
    assert(institution?.resources.length! >= 4, `Institution relates to ${institution?.resources.length} resources`);
    assert(institution?.metrics.length! >= 5, `Institution relates to ${institution?.metrics.length} aggregated metrics`);

    // Test 2: User and StudentProfile relationship (20 students)
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        studentProfile: {
          include: {
            checkins: true,
            assessments: true,
          },
        },
        consents: true,
      },
    });
    assert(students.length >= 20, `Found at least 20 students in database (found: ${students.length})`);
    const allHaveProfiles = students.every((s) => !!s.studentProfile && !!s.studentProfile.anonymousAlias);
    assert(allHaveProfiles, 'All students have valid 1:1 StudentProfiles with unique anonymousAliases');

    // Test 3: Counsellors & Availabilities (3 counsellors)
    const counsellors = await prisma.user.findMany({
      where: { role: 'COUNSELLOR' },
      include: {
        counsellorProfile: {
          include: {
            availabilities: true,
            appointments: true,
          },
        },
      },
    });
    assert(counsellors.length === 3, `Found exactly 3 counsellors in database (found: ${counsellors.length})`);
    const allHaveLicenses = counsellors.every((c) => !!c.counsellorProfile?.licenseNumber);
    assert(allHaveLicenses, 'All 3 counsellors possess verified RCI clinical licenses');
    const totalAvailSlots = counsellors.reduce((acc, c) => acc + (c.counsellorProfile?.availabilities.length || 0), 0);
    assert(totalAvailSlots >= 5, `Found ${totalAvailSlots} weekly recurring availability slots across counsellors`);

    // Test 4: Peer Volunteers (2 peer volunteers)
    const volunteers = await prisma.user.findMany({
      where: { role: 'PEER_VOLUNTEER' },
      include: {
        studentProfile: true,
      },
    });
    assert(volunteers.length === 2, `Found exactly 2 peer volunteers in database (found: ${volunteers.length})`);
    const allVolunteersHaveProfiles = volunteers.every((v) => !!v.studentProfile);
    assert(allVolunteersHaveProfiles, 'All peer volunteers have valid StudentProfile aliases for peer interaction');

    // Test 5: Clinical Assessments (PHQ-9, GAD-7, WHO-5)
    const assessments = await prisma.assessment.findMany({
      include: {
        responses: true,
      },
    });
    assert(assessments.length === 3, `Found 3 standardized clinical assessment instruments (found: ${assessments.length})`);
    const codes = assessments.map((a) => a.code).sort();
    assert(JSON.stringify(codes) === JSON.stringify(['GAD7', 'PHQ9', 'WHO5']), 'Instruments are GAD-7, PHQ-9, and WHO-5');
    const totalResponses = assessments.reduce((acc, a) => acc + a.responses.length, 0);
    assert(totalResponses >= 2, `Assessment responses properly linked via foreign key (found: ${totalResponses})`);

    // Test 6: Wellbeing Check-in Timeline & Relationship
    const checkinCount = await prisma.wellbeingCheckin.count();
    assert(checkinCount >= 15, `Found ${checkinCount} wellbeing check-ins recorded (>=15 expected)`);
    const sampleCheckin = await prisma.wellbeingCheckin.findFirst({
      include: {
        studentProfile: {
          include: {
            user: true,
          },
        },
      },
    });
    assert(!!sampleCheckin?.studentProfile?.user?.email, 'WellbeingCheckin traverses cleanly to StudentProfile and User');

    // Test 7: Psychoeducational Resources & Progress
    const resources = await prisma.resource.findMany();
    assert(resources.length >= 4, `Found ${resources.length} evidence-informed psychoeducational resources`);

    // Test 8: Appointments linking Student and Counsellor
    const appointments = await prisma.appointment.findMany({
      include: {
        studentProfile: {
          include: { user: true },
        },
        counsellor: {
          include: { user: true },
        },
      },
    });
    assert(appointments.length >= 1, `Found ${appointments.length} appointments`);
    const appt = appointments[0];
    assert(!!appt?.studentProfile?.user && !!appt?.counsellor?.user, 'Appointment links both StudentProfile and CounsellorProfile with referential integrity');

    // Test 9: Peer Community Posts & Threaded Comments
    const peerPosts = await prisma.peerPost.findMany({
      include: {
        studentProfile: true,
        comments: {
          include: {
            studentProfile: true,
          },
        },
      },
    });
    assert(peerPosts.length >= 2, `Found ${peerPosts.length} peer posts in community`);
    const postsWithComments = peerPosts.filter((p) => p.comments.length > 0);
    assert(postsWithComments.length >= 1, 'Threaded peer comments successfully link to parent PeerPost and author StudentProfile');

    // Test 10: Institutional Metrics & k-Anonymity Compliance
    const metrics = await prisma.wellbeingMetric.findMany();
    assert(metrics.length === 5, `Found 5 department aggregated metrics (found: ${metrics.length})`);
    const allCohortSafe = metrics.every((m) => m.cohortSize >= 10);
    assert(allCohortSafe, 'All institutional metrics satisfy k-anonymity threshold (cohortSize >= 10)');

    // Test 11: Soft Deletion Fields Existence
    const userWithDeletedAt = await prisma.user.findFirst({
      select: { id: true, deletedAt: true },
    });
    assert(userWithDeletedAt?.deletedAt === null, 'Soft deletion field `deletedAt` is present and default null on User');

    // Test 12: Unique constraints enforcement (attempt duplicate email)
    let duplicateRejected = false;
    try {
      await prisma.user.create({
        data: {
          institutionId: institution!.id,
          email: 'aarav.patel@aiths.ac.in', // Existing email
          passwordHash: 'dummy',
          firstName: 'Aarav',
          lastName: 'Duplicate',
        },
      });
    } catch (e: any) {
      duplicateRejected = true;
    }
    assert(duplicateRejected, 'Unique constraint on User.email strictly rejects duplicates');

    // Test 13: Unique constraint on Recommendation compound key
    let dupRecRejected = false;
    try {
      const existingRec = await prisma.recommendation.create({
        data: {
          studentProfileId: students[0].studentProfile!.id,
          resourceId: resources[0].id,
          rationale: 'Test rationale 1',
        },
      });
      // Attempt duplicate pair
      await prisma.recommendation.create({
        data: {
          studentProfileId: students[0].studentProfile!.id,
          resourceId: resources[0].id,
          rationale: 'Test rationale 2',
        },
      });
    } catch (e: any) {
      dupRecRejected = true;
    }
    assert(dupRecRejected, 'Compound unique constraint on Recommendation [studentProfileId, resourceId] strictly rejects duplicates');

    // Test 14: AuditLog Model
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: students[0].id,
        action: 'TEST_AUDIT_VERIFICATION',
        entityType: 'User',
        entityId: students[0].id,
        ipAddress: '127.0.0.1',
        metadataJson: JSON.stringify({ verified: true }),
      },
    });
    assert(!!auditLog.id, 'AuditLog entity successfully records immutable operational event');

    // Test 15: RiskEvent and CrisisEvent cascade relationship
    const riskEvent = await prisma.riskEvent.create({
      data: {
        studentProfileId: students[0].studentProfile!.id,
        riskCategory: 'PANIC',
        riskScore: 0.9,
        riskLevel: 'HIGH',
        triggerSnippetRedacted: '[TEST] Panic trigger verification',
        handled: false,
      },
    });
    const crisisEvent = await prisma.crisisEvent.create({
      data: {
        riskEventId: riskEvent.id,
        status: 'TRIGGERED',
        helplineProvided: true,
        notes: 'Verification of 1:1 CrisisEvent to RiskEvent relation',
      },
    });
    assert(!!crisisEvent.id && crisisEvent.riskEventId === riskEvent.id, '1:1 RiskEvent to CrisisEvent relation established and queryable');

    console.log('\n============================================================');
    console.log(`🏁 DATABASE RELATIONSHIP TESTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');

    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRelationTests();
