/**
 * prisma/seedAnalyticsData.ts
 *
 * Generates realistic institutional analytics demo data across
 * multiple engineering cohorts, academic timelines, check-ins,
 * standardized screenings, and counselling appointments.
 * Strictly uses synthetic, anonymous mock data — zero real student PII.
 */

import { prisma } from './client';
import bcrypt from 'bcryptjs';

async function seedAnalyticsData() {
  console.log('🌱 Starting Institutional Analytics Demo Data Seeding...');

  const institution = await prisma.institution.findFirst();
  if (!institution) {
    throw new Error('Base institution not found. Run main seed first.');
  }

  const defaultPasswordHash = await bcrypt.hash('StudentDemo123!', 10);

  // Departments and target student counts
  // CSE & ECE have >= 10 students to verify k-anonymity disclosure
  // Mechanical, Civil, IT have < 10 to verify mathematical suppression
  const cohorts = [
    { department: 'Computer Science & Engineering', count: 14, year: 2 },
    { department: 'Electronics & Communication', count: 11, year: 3 },
    { department: 'Mechanical Engineering', count: 4, year: 1 },
    { department: 'Civil Engineering', count: 3, year: 4 },
  ];

  const tagsPool = ['Exams', 'Assignments', 'Deadlines', 'Sleep', 'Hostel', 'Family', 'Placement', 'Burnout'];

  let createdStudents: any[] = [];

  for (const cohort of cohorts) {
    for (let i = 1; i <= cohort.count; i++) {
      const emailPrefix = `${cohort.department.toLowerCase().slice(0, 3)}_${cohort.year}_std${i}_${Date.now().toString().slice(-4)}`;
      const email = `${emailPrefix}@test.aiths.ac.in`;
      const alias = `CampusVitality-${cohort.department.slice(0, 3)}-${1000 + i * 13}-${Math.floor(Math.random() * 90000 + 10000)}`;

      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email },
        include: { studentProfile: true },
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            institutionId: institution.id,
            email,
            passwordHash: defaultPasswordHash,
            role: 'STUDENT',
            firstName: `Student${i}`,
            lastName: cohort.department.slice(0, 3),
            studentProfile: {
              create: {
                anonymousAlias: alias,
                department: cohort.department,
                yearOfStudy: cohort.year,
                preferredLanguage: 'en',
                onboardingCompleted: true,
              },
            },
          },
          include: { studentProfile: true },
        });
      }

      if (user.studentProfile) {
        createdStudents.push(user.studentProfile);
      }
    }
  }

  console.log(`✅ Ensured ${createdStudents.length} demo students across cohorts.`);

  // 2. Generate 90 days of longitudinal check-in data with realistic semester waves
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let checkinTotal = 0;

  for (const student of createdStudents) {
    // Generate check-ins at various intervals over past 60 days
    const checkinDays = [1, 3, 5, 8, 12, 16, 20, 25, 30, 35, 42, 45, 50, 58];
    for (const d of checkinDays) {
      const checkinDate = new Date(now - d * dayMs);

      // Natural exam stress curve: higher stress around day 20-30 (midterms)
      const isMidterms = d >= 20 && d <= 30;
      const mood = isMidterms ? Math.floor(Math.random() * 2) + 2 : Math.floor(Math.random() * 3) + 3; // 2-3 vs 3-5
      const stress = isMidterms ? Math.floor(Math.random() * 2) + 4 : Math.floor(Math.random() * 3) + 1; // 4-5 vs 1-3
      const sleep = isMidterms ? 5.5 + Math.random() * 1.5 : 7.0 + Math.random() * 1.5;

      const randomTags = [
        tagsPool[Math.floor(Math.random() * tagsPool.length)],
        isMidterms ? 'Exams' : tagsPool[Math.floor(Math.random() * tagsPool.length)],
      ];

      await prisma.wellbeingCheckin.create({
        data: {
          studentProfileId: student.id,
          moodScore: Math.min(5, Math.max(1, mood)),
          stressLevel: Math.min(5, Math.max(1, stress)),
          energyLevel: Math.floor(Math.random() * 2) + 3,
          sleepHours: Number(sleep.toFixed(1)),
          tags: JSON.stringify(Array.from(new Set(randomTags))),
          notes: null,
          createdAt: checkinDate,
        },
      });
      checkinTotal++;
    }
  }

  console.log(`✅ Seeded ${checkinTotal} longitudinal check-ins with natural stress waves.`);

  // 3. Seed standardized assessment responses (PHQ-9, GAD-7, WHO-5)
  const phq9 = await prisma.assessment.findUnique({ where: { code: 'PHQ9' } });
  const gad7 = await prisma.assessment.findUnique({ where: { code: 'GAD7' } });
  const who5 = await prisma.assessment.findUnique({ where: { code: 'WHO5' } });

  let assessmentCount = 0;
  if (phq9 && gad7) {
    const severities = [
      { cat: 'Minimal Depression', score: 3 },
      { cat: 'Mild Depression', score: 7 },
      { cat: 'Moderate Depression', score: 12 },
      { cat: 'Moderately Severe Depression', score: 17 },
      { cat: 'Severe Depression', score: 22 },
    ];
    const gadSeverities = [
      { cat: 'Minimal Anxiety', score: 2 },
      { cat: 'Mild Anxiety', score: 6 },
      { cat: 'Moderate Anxiety', score: 11 },
      { cat: 'Severe Anxiety', score: 16 },
    ];

    for (let i = 0; i < createdStudents.length; i++) {
      const student = createdStudents[i];
      const phq = severities[i % severities.length];
      const gad = gadSeverities[i % gadSeverities.length];

      await prisma.assessmentResponse.create({
        data: {
          studentProfileId: student.id,
          assessmentId: phq9.id,
          score: phq.score,
          severityCategory: phq.cat,
          answersJson: JSON.stringify({ q1: 1, q2: 1, q3: 1 }),
          completedAt: new Date(now - (i % 30) * dayMs),
        },
      });

      await prisma.assessmentResponse.create({
        data: {
          studentProfileId: student.id,
          assessmentId: gad7.id,
          score: gad.score,
          severityCategory: gad.cat,
          answersJson: JSON.stringify({ q1: 1, q2: 1 }),
          completedAt: new Date(now - (i % 30) * dayMs),
        },
      });

      if (who5 && i % 2 === 0) {
        await prisma.assessmentResponse.create({
          data: {
            studentProfileId: student.id,
            assessmentId: who5.id,
            score: 65,
            severityCategory: 'Adequate Well-being',
            answersJson: JSON.stringify({ q1: 3, q2: 3 }),
            completedAt: new Date(now - (i % 20) * dayMs),
          },
        });
      }

      assessmentCount += 2;
    }
  }

  console.log(`✅ Seeded ${assessmentCount} standardized assessment responses across severity tiers.`);

  // 4. Seed counselling appointments across states
  const counsellor = await prisma.counsellorProfile.findFirst();
  if (counsellor) {
    const statuses = ['COMPLETED', 'COMPLETED', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'];
    for (let i = 0; i < Math.min(15, createdStudents.length); i++) {
      const student = createdStudents[i];
      const st = statuses[i % statuses.length];
      const apptDate = new Date(now - (i * 3 + 1) * dayMs);

      await prisma.appointment.create({
        data: {
          counsellorId: counsellor.id,
          studentProfileId: student.id,
          scheduledAt: apptDate,
          durationMin: 45,
          status: st,
          cancellationReason: st === 'CANCELLED' ? 'Academic conflict' : null,
          cancelledByRole: st === 'CANCELLED' ? 'STUDENT' : null,
          createdAt: new Date(apptDate.getTime() - 2 * dayMs),
        },
      });
    }
    console.log('✅ Seeded counselling appointment lifecycle funnel records.');
  }

  // 5. Seed psychoeducational resource reading progress
  const resources = await prisma.resource.findMany({ take: 4 });
  for (let i = 0; i < Math.min(12, createdStudents.length); i++) {
    const student = createdStudents[i];
    for (const r of resources) {
      await prisma.resourceProgress.upsert({
        where: {
          studentProfileId_resourceId: {
            studentProfileId: student.id,
            resourceId: r.id,
          },
        },
        update: {},
        create: {
          studentProfileId: student.id,
          resourceId: r.id,
          isCompleted: i % 2 === 0,
          timeSpentSec: 240 + i * 20,
          lastAccessedAt: new Date(now - i * dayMs),
        },
      });
    }
  }

  console.log('✅ Seeded psychoeducational resource progress records.');

  // 6. Seed audit log entries
  const adminUser = await prisma.user.findFirst({ where: { role: 'INSTITUTION_ADMIN' } });
  if (adminUser) {
    const auditActions = [
      { action: 'VIEW_INSTITUTIONAL_ANALYTICS', entity: 'AnalyticsOverview', days: 2 },
      { action: 'VIEW_INSTITUTIONAL_ANALYTICS', entity: 'AnalyticsOverview', days: 7 },
      { action: 'EXPORT_ANALYTICS_REPORT', entity: 'AnalyticsReport', days: 14 },
      { action: 'VIEW_INSTITUTIONAL_ANALYTICS', entity: 'AnalyticsOverview', days: 21 },
    ];

    for (const a of auditActions) {
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: a.action,
          entityType: a.entity,
          ipAddress: '192.168.1.45',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
          timestamp: new Date(now - a.days * dayMs),
        },
      });
    }
    console.log('✅ Seeded administrative audit trail events.');
  }

  console.log('🏁 Institutional Analytics Demo Data Seeding Complete!');
}

seedAnalyticsData()
  .catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
