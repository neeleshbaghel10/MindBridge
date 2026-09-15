// ============================================================
// MINDBRIDGE INSTITUTIONAL ANALYTICS & PRIVACY TEST SUITE
// ============================================================

import { prisma } from '../prisma/client';
import { AnalyticsService, PRIVACY_THRESHOLD } from '../analytics/analyticsService';

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

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data, headers: res.headers };
  }
  const text = await res.text();
  return { status: res.status, ok: res.ok, text, headers: res.headers };
}

async function runTests() {
  console.log('============================================================');
  console.log('📊 MINDBRIDGE INSTITUTIONAL ANALYTICS & PRIVACY TEST SUITE');
  console.log('============================================================\n');

  // --- Setup Test Users & Fixtures ---
  const institution = await prisma.institution.findFirst();
  if (!institution) throw new Error('Database not seeded with institution.');

  const adminUser = await prisma.user.findFirst({ where: { role: 'INSTITUTION_ADMIN' } });
  if (!adminUser) throw new Error('No institution admin found.');

  const studentUser = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  if (!studentUser) throw new Error('No student user found.');

  const counsellorUser = await prisma.user.findFirst({ where: { role: 'COUNSELLOR' } });
  if (!counsellorUser) throw new Error('No counsellor user found.');

  const jwt = await import('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_jwt_mindbridge_2026';

  const tokenAdmin = jwt.default.sign(
    { userId: adminUser.id, role: 'INSTITUTION_ADMIN', institutionId: institution.id },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const tokenStudent = jwt.default.sign(
    { userId: studentUser.id, role: 'STUDENT', institutionId: institution.id },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const tokenCounsellor = jwt.default.sign(
    { userId: counsellorUser.id, role: 'COUNSELLOR', institutionId: institution.id },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Role-Based Authorization & Boundary Security ---');
  // -------------------------------------------------------------------------
  {
    // Student blocked from analytics
    const studentRes = await request('/analytics/overview', { token: tokenStudent });
    assert(studentRes.status === 403, 'Student blocked from analytics overview with 403 FORBIDDEN_ROLE');

    // Counsellor blocked from institutional Dean dashboard
    const counsellorRes = await request('/analytics/overview', { token: tokenCounsellor });
    assert(counsellorRes.status === 403, 'Counsellor blocked from institutional admin analytics with 403 FORBIDDEN_ROLE');

    // Unauthenticated access blocked
    const unauthRes = await request('/analytics/overview');
    assert(unauthRes.status === 401, 'Unauthenticated access rejected with 401 UNAUTHORIZED');

    // Institution Admin authorized
    const adminRes = await request('/analytics/overview', { token: tokenAdmin });
    assert(adminRes.status === 200, 'Institution Admin successfully authorized with 200 OK');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Zero-PII Guarantee Across All Analytics Outputs ---');
  // -------------------------------------------------------------------------
  {
    const overviewRes = await request('/analytics/overview', { token: tokenAdmin });
    const jsonStr = JSON.stringify(overviewRes.data);

    assert(!jsonStr.includes('@test.aiths.ac.in'), 'Response contains zero student emails');
    assert(!jsonStr.includes('passwordHash'), 'Response contains zero password hashes');
    assert(!jsonStr.includes('notesEncrypted'), 'Response contains zero encrypted clinical notes');
    assert(!jsonStr.includes('answersJson'), 'Response contains zero individual answers');
    assert(!jsonStr.includes('firstName'), 'Response contains zero student first names');
    assert(!jsonStr.includes('lastName'), 'Response contains zero student last names');

    // Verify trends endpoint
    const trendsRes = await request('/analytics/trends?range=30d', { token: tokenAdmin });
    const trendsStr = JSON.stringify(trendsRes.data);
    assert(!trendsStr.includes('studentProfileId'), 'Trends series contains zero individual student profile IDs');

    // Verify assessments endpoint
    const assessRes = await request('/analytics/assessments', { token: tokenAdmin });
    const assessStr = JSON.stringify(assessRes.data);
    assert(!assessStr.includes('studentProfileId'), 'Assessment distributions contain zero student IDs');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Mathematical k-Anonymity (k >= 10) Enforcement ---');
  // -------------------------------------------------------------------------
  {
    assert(PRIVACY_THRESHOLD === 10, 'k-Anonymity privacy threshold constant is strictly >= 10');

    // Test service layer with dummy institution having < 10 students
    const smallInst = await prisma.institution.create({
      data: {
        name: 'Small Research Satellite Lab',
        code: 'SRSL_' + Date.now().toString().slice(-4),
        domain: 'srsl.test.ac.in',
        contactEmail: 'admin@srsl.test.ac.in',
      },
    });

    const suppressedOverview = await AnalyticsService.getCampusOverview(smallInst.id);
    assert(suppressedOverview.privacyThresholdMet === false, 'Institution with < 10 students triggers privacyThresholdMet=false');
    assert(!!suppressedOverview.privacyNotice, 'Includes clear k-anonymity privacy notice message');
    assert((suppressedOverview.totalStudentsMonitored ?? 0) < 10, 'Monitored count correctly reported below threshold');

    // Demographic cohort suppression test on main institution
    const breakdowns = await AnalyticsService.getDemographicBreakdowns(institution.id);
    assert(Array.isArray(breakdowns.departments), 'Departments breakdown returned as array');

    // Check CSE (cohort >= 10) vs Mechanical (cohort < 10)
    const largeDept = breakdowns.departments.find(d => d.cohortSize >= 10);
    const smallDept = breakdowns.departments.find(d => d.cohortSize < 10);

    assert(!!largeDept, 'Found qualifying cohort with N >= 10 students');
    assert(largeDept?.isSuppressed === false, 'Qualifying cohort is NOT suppressed');
    assert(typeof largeDept?.avgMood === 'number', 'Qualifying cohort provides valid average mood score');
    assert(typeof largeDept?.avgStress === 'number', 'Qualifying cohort provides valid average stress level');

    assert(!!smallDept, 'Found small cohort with N < 10 students');
    assert(smallDept?.isSuppressed === true, 'Small cohort is mathematically SUPPRESSED');
    assert(smallDept?.avgMood === null, 'Small cohort avgMood is strictly null (withheld)');
    assert(smallDept?.avgStress === null, 'Small cohort avgStress is strictly null (withheld)');
    assert(smallDept?.avgSleep === null, 'Small cohort avgSleep is strictly null (withheld)');
    assert(!!smallDept?.suppressionNotice, 'Small cohort provides k-anonymity protection notice');

    // Cleanup dummy small institution
    await prisma.institution.delete({ where: { id: smallInst.id } });
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Campus Overview Executive KPIs Mathematical Accuracy ---');
  // -------------------------------------------------------------------------
  {
    const res = await request('/analytics/overview?range=90d', { token: tokenAdmin });
    const kpi = res.data.data.kpiSummary;

    assert(kpi.totalStudentsMonitored >= 20, 'Total monitored students count >= 20 (found: ' + kpi.totalStudentsMonitored + ')');
    assert(kpi.activeEngagedStudents > 0, 'Active engaged students > 0 (found: ' + kpi.activeEngagedStudents + ')');
    assert(kpi.activeEngagementRate >= 0 && kpi.activeEngagementRate <= 100, 'Engagement rate is valid percentage (found: ' + kpi.activeEngagementRate + '%)');
    assert(kpi.averageCampusMoodScore >= 1.0 && kpi.averageCampusMoodScore <= 5.0, 'Campus mood score in [1.0, 5.0] range (got ' + kpi.averageCampusMoodScore + ')');
    assert(kpi.averageCampusStressIndex >= 1.0 && kpi.averageCampusStressIndex <= 5.0, 'Campus stress index in [1.0, 5.0] range (got ' + kpi.averageCampusStressIndex + ')');
    assert(kpi.averageCampusSleepHours >= 4.0 && kpi.averageCampusSleepHours <= 12.0, 'Campus sleep average in realistic human range (got ' + kpi.averageCampusSleepHours + 'h)');
    assert(kpi.totalCheckinsLogged > 0, 'Check-ins logged count > 0 (found: ' + kpi.totalCheckinsLogged + ')');
    assert(kpi.assessmentParticipationRate >= 0 && kpi.assessmentParticipationRate <= 100, 'Assessment rate is valid percentage');
    assert(kpi.counsellingCompletionRate >= 0 && kpi.counsellingCompletionRate <= 100, 'Counselling completion rate is valid percentage');
    assert(kpi.totalCrisisEscalations >= 0, 'Crisis escalations count is non-negative');

    // Verify top stress drivers
    const drivers = res.data.data.topStressDrivers;
    assert(Array.isArray(drivers) && drivers.length > 0, 'Top stress drivers returned as non-empty list');
    assert(typeof drivers[0].tag === 'string' && typeof drivers[0].count === 'number', 'Driver entry has tag and count');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Time-Based Trend Analysis ---');
  // -------------------------------------------------------------------------
  {
    const trends7d = await request('/analytics/trends?range=7d', { token: tokenAdmin });
    assert(trends7d.status === 200, 'Trends 7d endpoint returned 200 OK');
    assert(trends7d.data.data.series.length === 7, '7-day range returns exactly 7 data points');

    const trends30d = await request('/analytics/trends?range=30d', { token: tokenAdmin });
    assert(trends30d.status === 200, 'Trends 30d endpoint returned 200 OK');
    assert(trends30d.data.data.series.length === 30, '30-day range returns exactly 30 data points');

    const firstPt = trends30d.data.data.series[0];
    assert(!!firstPt.date, 'Series point contains date attribute');
    assert(typeof firstPt.avgMood === 'number', 'Series point contains avgMood');
    assert(typeof firstPt.avgStress === 'number', 'Series point contains avgStress');
    assert(typeof firstPt.checkinVolume === 'number', 'Series point contains checkinVolume');
    assert(typeof firstPt.appointmentsBooked === 'number', 'Series point contains appointmentsBooked');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Clinical Screening & Severity Distribution ---');
  // -------------------------------------------------------------------------
  {
    const res = await request('/analytics/assessments', { token: tokenAdmin });
    assert(res.status === 200, 'Assessment analytics endpoint returned 200 OK');

    const gad7 = res.data.data.gad7;
    assert(gad7.totalTaken > 0, 'GAD-7 total taken > 0 (found: ' + gad7.totalTaken + ')');
    assert(gad7.maxPossibleScore === 21, 'GAD-7 max possible score is 21');
    assert(typeof gad7.distribution['Minimal Anxiety'] === 'number', 'GAD-7 contains Minimal Anxiety bucket');
    assert(typeof gad7.distribution['Mild Anxiety'] === 'number', 'GAD-7 contains Mild Anxiety bucket');
    assert(typeof gad7.distribution['Moderate Anxiety'] === 'number', 'GAD-7 contains Moderate Anxiety bucket');
    assert(typeof gad7.distribution['Severe Anxiety'] === 'number', 'GAD-7 contains Severe Anxiety bucket');

    const phq9 = res.data.data.phq9;
    assert(phq9.totalTaken > 0, 'PHQ-9 total taken > 0 (found: ' + phq9.totalTaken + ')');
    assert(phq9.maxPossibleScore === 27, 'PHQ-9 max possible score is 27');
    assert(typeof phq9.distribution['Minimal Depression'] === 'number', 'PHQ-9 contains Minimal Depression bucket');
    assert(typeof phq9.distribution['Severe Depression'] === 'number', 'PHQ-9 contains Severe Depression bucket');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Counselling Demand & Intervention Funnel ---');
  // -------------------------------------------------------------------------
  {
    const res = await request('/analytics/overview?range=semester', { token: tokenAdmin });
    const funnel = res.data.data.counsellingFunnel;

    assert(funnel.total > 0, 'Counselling funnel total appointments > 0 (found: ' + funnel.total + ')');
    assert(funnel.completed >= 0, 'Completed appointments tracked');
    assert(funnel.cancelled >= 0, 'Cancelled appointments tracked');
    assert(funnel.noShow >= 0, 'No-show appointments tracked');
    assert(typeof funnel.completionRate === 'number', 'Completion rate calculated');

    // Crisis risk tier distribution
    const tiers = res.data.data.crisisRiskTiers;
    assert(typeof tiers.LEVEL_0 === 'number', 'Crisis tier LEVEL_0 tracked');
    assert(typeof tiers.LEVEL_1 === 'number', 'Crisis tier LEVEL_1 tracked');
    assert(typeof tiers.LEVEL_2 === 'number', 'Crisis tier LEVEL_2 tracked');
    assert(typeof tiers.LEVEL_3 === 'number', 'Crisis tier LEVEL_3 tracked');
    assert(typeof tiers.LEVEL_4 === 'number', 'Crisis tier LEVEL_4 tracked');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Privacy-Preserving Report Exporting ---');
  // -------------------------------------------------------------------------
  {
    // CSV Export
    const csvRes = await request('/analytics/export?format=csv', { token: tokenAdmin });
    assert(csvRes.status === 200, 'CSV export endpoint returned 200 OK');
    assert(csvRes.headers.get('content-type')?.includes('text/csv') || false, 'Content-Type header is text/csv');
    assert(csvRes.text?.includes('MINDBRIDGE INSTITUTIONAL WELLBEING REPORT (ZERO-PII)') || false, 'CSV includes title disclaimer header');
    assert(csvRes.text?.includes('DPDP Act 2023 Compliant') || false, 'CSV includes DPDP compliance declaration');
    assert(csvRes.text?.includes('Campus Mood Index') || false, 'CSV includes KPI rows');

    // JSON Export
    const jsonRes = await request('/analytics/export?format=json', { token: tokenAdmin });
    assert(jsonRes.status === 200, 'JSON export endpoint returned 200 OK');
    assert(!!jsonRes.data.metadata?.governance, 'JSON export contains governance metadata');
    assert(Array.isArray(jsonRes.data.metadata?.privacyGuarantees), 'JSON export includes explicit privacy guarantees');
    assert(!!jsonRes.data.overview?.kpiSummary, 'JSON export includes full overview metrics');
  }

  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: Tamper-Evident Administrative Audit Logging ---');
  // -------------------------------------------------------------------------
  {
    // Verify VIEW_INSTITUTIONAL_ANALYTICS log exists
    const auditRes = await request('/analytics/audit?limit=10', { token: tokenAdmin });
    assert(auditRes.status === 200, 'Audit trail endpoint returned 200 OK');
    assert(Array.isArray(auditRes.data.data.logs), 'Audit logs returned as array');
    assert(auditRes.data.data.totalCount > 0, 'Audit trail contains logged events');

    const viewLog = await prisma.auditLog.findFirst({
      where: { action: 'VIEW_INSTITUTIONAL_ANALYTICS' },
      orderBy: { timestamp: 'desc' },
    });
    assert(!!viewLog, 'VIEW_INSTITUTIONAL_ANALYTICS event persisted in AuditLog');
    assert(viewLog?.entityType === 'AnalyticsOverview', 'Audit log entityType is AnalyticsOverview');
    assert(!!viewLog?.userId, 'Audit log records operator userId');
    assert(!!viewLog?.timestamp, 'Audit log records exact timestamp');

    const exportLog = await prisma.auditLog.findFirst({
      where: { action: 'EXPORT_ANALYTICS_REPORT' },
      orderBy: { timestamp: 'desc' },
    });
    assert(!!exportLog, 'EXPORT_ANALYTICS_REPORT event persisted in AuditLog');
  }

  console.log('\n============================================================');
  console.log('🏁 INSTITUTIONAL ANALYTICS QA RESULTS: ' + passedTests + ' PASSED, ' + failedTests + ' FAILED (Total: ' + totalTests + ')');
  console.log('============================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
