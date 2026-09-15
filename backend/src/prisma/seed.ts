import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MINDBRIDGE database seed...');

  // Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.resourceProgress.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.moderationEvent.deleteMany();
  await prisma.peerComment.deleteMany();
  await prisma.peerPost.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.counsellorAvailability.deleteMany();
  await prisma.crisisEvent.deleteMany();
  await prisma.riskEvent.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.assessmentResponse.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.wellbeingMetric.deleteMany();
  await prisma.wellbeingCheckin.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.counsellorProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.institution.deleteMany();

  // 1. Create Institution
  const institution = await prisma.institution.create({
    data: {
      name: 'Apex Institute of Technology & Higher Studies',
      code: 'AITHS',
      domain: 'aiths.ac.in',
      address: 'Knowledge City Campus, Tech Zone IV, Greater Noida, UP',
      contactEmail: 'wellness@aiths.ac.in',
      crisisHotline: '14416', // Tele-MANAS
      campusSecurityNo: '+91-11-2099-0112',
      settings: JSON.stringify({
        enableAnonymousPeerCommunity: true,
        enableDirectAppointmentBooking: true,
        privacyPreservingCohortMinSize: 10,
        helplines: [
          { name: 'National Tele-MANAS', number: '14416', hours: '24x7 Free' },
          { name: 'KIRAN Mental Health Helpline', number: '1800-599-0019', hours: '24x7 Multilingual' },
          { name: 'Vandrevala Foundation', number: '+91-9999-666-555', hours: '24x7 Free Support' },
          { name: 'Campus 24/7 Security Desk', number: '+91-11-2099-0112', hours: 'Immediate Dispatch' }
        ]
      })
    }
  });
  console.log(`✅ Created Institution: ${institution.name}`);

  // Common password hash for test accounts
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 2. Create 3 Licensed Counsellors
  const counsellorData = [
    {
      firstName: 'Dr. Ananya',
      lastName: 'Sen',
      email: 'dr.ananya@aiths.ac.in',
      licenseNumber: 'RCI-CR-2018-88412',
      specialization: ['Anxiety Disorders', 'Academic Burnout', 'Cognitive Behavioral Therapy (CBT)', 'Mindfulness'],
      bio: 'Licensed Clinical Psychologist with 12+ years of experience specializing in student academic stress, perfectionism, and transition into university life.',
      qualification: 'M.Phil Clinical Psychology (NIMHANS), Ph.D Psychology',
      languagesSpoken: ['English', 'Hindi', 'Bengali'],
      maxDailySlots: 6
    },
    {
      firstName: 'Dr. Vikram',
      lastName: 'Malhotra',
      email: 'dr.vikram@aiths.ac.in',
      licenseNumber: 'RCI-CR-2015-44901',
      specialization: ['Depression & Low Mood', 'Sleep Disorders', 'Social Anxiety', 'Interpersonal Conflict'],
      bio: 'Senior University Counsellor with extensive experience in evidence-based brief interventions and student psychological wellbeing.',
      qualification: 'M.A. Applied Psychology (Delhi University), PGD Counselling',
      languagesSpoken: ['English', 'Hindi', 'Punjabi'],
      maxDailySlots: 5
    },
    {
      firstName: 'Dr. Priyamvada',
      lastName: 'Nair',
      email: 'dr.priyamvada@aiths.ac.in',
      licenseNumber: 'RCI-CR-2020-91204',
      specialization: ['Crisis Intervention', 'Trauma-Informed Care', 'Emotional Dysregulation', 'DBT Skills'],
      bio: 'Clinical Specialist trained in acute crisis response, DBT distress tolerance protocols, and adolescent resilience training.',
      qualification: 'Psy.D. Clinical Psychology, Certified DBT Practitioner',
      languagesSpoken: ['English', 'Hindi', 'Malayalam'],
      maxDailySlots: 4
    }
  ];

  const counsellors = [];
  for (const c of counsellorData) {
    const user = await prisma.user.create({
      data: {
        institutionId: institution.id,
        email: c.email,
        passwordHash,
        role: 'COUNSELLOR',
        firstName: c.firstName,
        lastName: c.lastName,
        isVerified: true
      }
    });

    const profile = await prisma.counsellorProfile.create({
      data: {
        userId: user.id,
        licenseNumber: c.licenseNumber,
        specialization: JSON.stringify(c.specialization),
        bio: c.bio,
        qualification: c.qualification,
        languagesSpoken: JSON.stringify(c.languagesSpoken),
        isAvailable: true,
        maxDailySlots: c.maxDailySlots
      }
    });
    counsellors.push({ user, profile });
  }
  console.log(`✅ Created 3 Licensed Counsellors`);

  // 3. Create 2 Peer Volunteers
  const peerVolunteerData = [
    { firstName: 'Rohan', lastName: 'Mehra', email: 'rohan.peer@aiths.ac.in', department: 'Computer Science & Engineering', year: 4, alias: 'CompassionateOak77' },
    { firstName: 'Anika', lastName: 'Deshmukh', email: 'anika.peer@aiths.ac.in', department: 'Information Technology', year: 3, alias: 'GentleBreeze42' }
  ];

  const peerVolunteers = [];
  for (const p of peerVolunteerData) {
    const user = await prisma.user.create({
      data: {
        institutionId: institution.id,
        email: p.email,
        passwordHash,
        role: 'PEER_VOLUNTEER',
        firstName: p.firstName,
        lastName: p.lastName,
        isVerified: true
      }
    });

    const profile = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        anonymousAlias: p.alias,
        department: p.department,
        yearOfStudy: p.year,
        onboardingCompleted: true,
        preferredLanguage: 'en',
        emergencyContactName: 'Hostel Warden Office',
        emergencyContactPhone: '+91-11-2099-0112',
        emergencyContactConsent: true
      }
    });
    peerVolunteers.push({ user, profile });
  }
  console.log(`✅ Created 2 Peer Volunteers`);

  // 4. Create Institution Admin & Super Admin
  await prisma.user.create({
    data: {
      institutionId: institution.id,
      email: 'dean.welfare@aiths.ac.in',
      passwordHash,
      role: 'INSTITUTION_ADMIN',
      firstName: 'Prof. Meenakshi',
      lastName: 'Iyer',
      isVerified: true
    }
  });

  await prisma.user.create({
    data: {
      institutionId: institution.id,
      email: 'admin@mindbridge.org',
      passwordHash,
      role: 'SUPER_ADMIN',
      firstName: 'System',
      lastName: 'Administrator',
      isVerified: true
    }
  });
  console.log(`✅ Created Campus Dean and Super Admin`);

  // 5. Create 20 Students across various cohorts and departments
  const studentSeeds = [
    { firstName: 'Aarav', lastName: 'Patel', email: 'aarav.patel@aiths.ac.in', dept: 'Computer Science & Engineering', year: 3, alias: 'TranquilSparrow42', lang: 'en', consent: true },
    { firstName: 'Diya', lastName: 'Sharma', email: 'diya.sharma@aiths.ac.in', dept: 'Electronics & Communication', year: 2, alias: 'SereneRiver19', lang: 'hi', consent: false },
    { firstName: 'Kabir', lastName: 'Verma', email: 'kabir.verma@aiths.ac.in', dept: 'Mechanical Engineering', year: 4, alias: 'MindfulCedar88', lang: 'en', consent: true },
    { firstName: 'Isha', lastName: 'Nambiar', email: 'isha.nambiar@aiths.ac.in', dept: 'Civil Engineering', year: 1, alias: 'ResilientFern12', lang: 'en', consent: true },
    { firstName: 'Tanmay', lastName: 'Bhatia', email: 'tanmay.bhatia@aiths.ac.in', dept: 'Computer Science & Engineering', year: 2, alias: 'CalmHorizon55', lang: 'en', consent: true },
    { firstName: 'Sneha', lastName: 'Reddy', email: 'sneha.reddy@aiths.ac.in', dept: 'Information Technology', year: 3, alias: 'QuietStream91', lang: 'te', consent: true },
    { firstName: 'Dev', lastName: 'Singhania', email: 'dev.singhania@aiths.ac.in', dept: 'Electrical Engineering', year: 4, alias: 'SturdyPebble23', lang: 'en', consent: false },
    { firstName: 'Rhea', lastName: 'Kulkarni', email: 'rhea.kulkarni@aiths.ac.in', dept: 'Biotechnology', year: 2, alias: 'GentlePond64', lang: 'mr', consent: true },
    { firstName: 'Arjun', lastName: 'Chaudhary', email: 'arjun.chaudhary@aiths.ac.in', dept: 'Mechanical Engineering', year: 1, alias: 'BraveMeadow37', lang: 'hi', consent: true },
    { firstName: 'Meera', lastName: 'Pillai', email: 'meera.pillai@aiths.ac.in', dept: 'Computer Science & Engineering', year: 4, alias: 'TranquilBamboo18', lang: 'en', consent: true },
    { firstName: 'Varun', lastName: 'Gupta', email: 'varun.gupta@aiths.ac.in', dept: 'Electronics & Communication', year: 3, alias: 'PeacefulValley82', lang: 'en', consent: true },
    { firstName: 'Kavya', lastName: 'Menon', email: 'kavya.menon@aiths.ac.in', dept: 'Civil Engineering', year: 2, alias: 'WarmRadiance49', lang: 'en', consent: false },
    { firstName: 'Nikhil', lastName: 'Sethi', email: 'nikhil.sethi@aiths.ac.in', dept: 'Information Technology', year: 1, alias: 'SteadyCreek05', lang: 'en', consent: true },
    { firstName: 'Tara', lastName: 'Roy', email: 'tara.roy@aiths.ac.in', dept: 'Computer Science & Engineering', year: 2, alias: 'SilentDawn73', lang: 'bn', consent: true },
    { firstName: 'Aditya', lastName: 'Mishra', email: 'aditya.mishra@aiths.ac.in', dept: 'Electrical Engineering', year: 3, alias: 'GoldenSunrise29', lang: 'hi', consent: true },
    { firstName: 'Pooja', lastName: 'Sundaram', email: 'pooja.sundaram@aiths.ac.in', dept: 'Biotechnology', year: 4, alias: 'ClearSky86', lang: 'ta', consent: true },
    { firstName: 'Siddharth', lastName: 'Jain', email: 'siddharth.jain@aiths.ac.in', dept: 'Computer Science & Engineering', year: 1, alias: 'QuietForest14', lang: 'en', consent: true },
    { firstName: 'Ritu', lastName: 'Kaur', email: 'ritu.kaur@aiths.ac.in', dept: 'Mechanical Engineering', year: 2, alias: 'SilverMist58', lang: 'pa', consent: true },
    { firstName: 'Yash', lastName: 'Bansal', email: 'yash.bansal@aiths.ac.in', dept: 'Electronics & Communication', year: 4, alias: 'OceanicWave31', lang: 'en', consent: false },
    { firstName: 'Ananya', lastName: 'Das', email: 'ananya.das@aiths.ac.in', dept: 'Civil Engineering', year: 3, alias: 'EvergreenGrove96', lang: 'en', consent: true }
  ];

  const students = [];
  for (const s of studentSeeds) {
    const user = await prisma.user.create({
      data: {
        institutionId: institution.id,
        email: s.email,
        passwordHash,
        role: 'STUDENT',
        firstName: s.firstName,
        lastName: s.lastName,
        isVerified: true
      }
    });

    const profile = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        anonymousAlias: s.alias,
        department: s.dept,
        yearOfStudy: s.year,
        onboardingCompleted: true,
        preferredLanguage: s.lang,
        emergencyContactName: `${s.firstName} Emergency Contact`,
        emergencyContactPhone: '+91-98765-43210',
        emergencyContactConsent: s.consent
      }
    });

    // Record baseline consents
    const consentTypes = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'EMERGENCY_DISCLOSURE', 'COUNSELLOR_DATA_SHARING', 'ANONYMOUS_RESEARCH'];
    for (const cType of consentTypes) {
      await prisma.consent.create({
        data: {
          userId: user.id,
          type: cType,
          status: 'GRANTED',
          version: '1.0',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
    }

    students.push({ user, profile });
  }
  console.log(`✅ Created 20 Students with Profiles and Consents`);

  const studentProfile1 = students[0].profile;
  const counsellorProfile1 = counsellors[0].profile;


  // 4. Seed Standardized Clinical Assessments (PHQ-9, GAD-7, WHO-5)
  // 4.1 PHQ-9 (Patient Health Questionnaire - 9)
  const phq9 = await prisma.assessment.create({
    data: {
      code: 'PHQ9',
      title: 'PHQ-9 (Patient Health Questionnaire for Depression)',
      description: 'A validated 9-question instrument assessing mood, energy, and depressive symptoms over the past 2 weeks.',
      clinicalDisclaimer: 'NOTICE: This screening is an informational self-assessment and NOT an official psychiatric diagnosis. Scores help gauge emotional wellbeing. If you feel overwhelmed or are in distress, professional help is confidential and accessible.',
      questionsJson: JSON.stringify([
        { id: 'q1', text: 'Little interest or pleasure in doing things', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q2', text: 'Feeling down, depressed, or hopeless', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q3', text: 'Trouble falling or staying asleep, or sleeping too much', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q4', text: 'Feeling tired or having little energy', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q5', text: 'Poor appetite or overeating', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q6', text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q7', text: 'Trouble concentrating on things, such as reading or academic coursework', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q8', text: 'Moving or speaking so slowly that other people could have noticed, or being fidgety/restless', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q9', text: 'Thoughts that you would be better off dead or of hurting yourself in some way', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] }
      ]),
      scoringRulesJson: JSON.stringify({
        thresholds: [
          { min: 0, max: 4, category: 'Minimal Depression', guidance: 'Your responses reflect minimal symptoms. Continue your healthy routines and self-care practices.' },
          { min: 5, max: 9, category: 'Mild Depression', guidance: 'Mild symptoms noted. Psychoeducational tools, sleep hygiene, and mindfulness exercises may be very beneficial.' },
          { min: 10, max: 14, category: 'Moderate Depression', guidance: 'Moderate symptoms observed. We recommend connecting with a campus counsellor for structured guidance.' },
          { min: 15, max: 19, category: 'Moderately Severe Depression', guidance: 'Noticeable symptoms impacting daily life. Professional consultation with our confidential counselling team is strongly encouraged.' },
          { min: 20, max: 27, category: 'Severe Depression', guidance: 'Significant distress detected. Please reach out to university health services or a licensed mental health professional.' }
        ],
        criticalItemTrigger: 'q9'
      })
    }
  });

  // 4.2 GAD-7 (Generalized Anxiety Disorder - 7)
  const gad7 = await prisma.assessment.create({
    data: {
      code: 'GAD7',
      title: 'GAD-7 (Generalized Anxiety Screening)',
      description: 'A 7-item clinically validated scale measuring anxiety symptoms and worry over the past 2 weeks.',
      clinicalDisclaimer: 'NOTICE: This screening provides an estimate of anxiety symptoms. It is non-diagnostic. Confidential student support is available if anxiety is interfering with your studies.',
      questionsJson: JSON.stringify([
        { id: 'q1', text: 'Feeling nervous, anxious, or on edge', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q2', text: 'Not being able to stop or control worrying', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q3', text: 'Worrying too much about different things (exams, future, health)', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q4', text: 'Trouble relaxing', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q5', text: 'Being so restless that it is hard to sit still', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q6', text: 'Becoming easily annoyed or irritable', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] },
        { id: 'q7', text: 'Feeling afraid, as if something awful might happen', options: [{ label: 'Not at all', value: 0 }, { label: 'Several days', value: 1 }, { label: 'More than half the days', value: 2 }, { label: 'Nearly every day', value: 3 }] }
      ]),
      scoringRulesJson: JSON.stringify({
        thresholds: [
          { min: 0, max: 4, category: 'Minimal Anxiety', guidance: 'Normal situational stress. Grounding exercises and regular breaks keep your nervous system balanced.' },
          { min: 5, max: 9, category: 'Mild Anxiety', guidance: 'Mild anxiety present. Box-breathing and cognitive reframing toolkits can help alleviate worry.' },
          { min: 10, max: 14, category: 'Moderate Anxiety', guidance: 'Moderate anxiety detected. Booking a relaxed conversation with our campus counsellor is recommended.' },
          { min: 15, max: 21, category: 'Severe Anxiety', guidance: 'High anxiety levels impacting comfort and focus. Confidential professional support is readily accessible.' }
        ]
      })
    }
  });

  // 4.3 WHO-5 (WHO-5 Wellbeing Index)
  const who5 = await prisma.assessment.create({
    data: {
      code: 'WHO5',
      title: 'WHO-5 (World Health Organization Wellbeing Index)',
      description: 'A 5-item positive psychological index assessing vitality and happiness over the last 14 days.',
      clinicalDisclaimer: 'NOTICE: This questionnaire evaluates overall positive psychological wellbeing.',
      questionsJson: JSON.stringify([
        { id: 'q1', text: 'I have felt cheerful and in good spirits', options: [{ label: 'At no time', value: 0 }, { label: 'Some of the time', value: 1 }, { label: 'Less than half', value: 2 }, { label: 'More than half', value: 3 }, { label: 'Most of the time', value: 4 }, { label: 'All the time', value: 5 }] },
        { id: 'q2', text: 'I have felt calm and relaxed', options: [{ label: 'At no time', value: 0 }, { label: 'Some of the time', value: 1 }, { label: 'Less than half', value: 2 }, { label: 'More than half', value: 3 }, { label: 'Most of the time', value: 4 }, { label: 'All the time', value: 5 }] },
        { id: 'q3', text: 'I have felt active and vigorous', options: [{ label: 'At no time', value: 0 }, { label: 'Some of the time', value: 1 }, { label: 'Less than half', value: 2 }, { label: 'More than half', value: 3 }, { label: 'Most of the time', value: 4 }, { label: 'All the time', value: 5 }] },
        { id: 'q4', text: 'I woke up feeling fresh and rested', options: [{ label: 'At no time', value: 0 }, { label: 'Some of the time', value: 1 }, { label: 'Less than half', value: 2 }, { label: 'More than half', value: 3 }, { label: 'Most of the time', value: 4 }, { label: 'All the time', value: 5 }] },
        { id: 'q5', text: 'My daily life has been filled with things that interest me', options: [{ label: 'At no time', value: 0 }, { label: 'Some of the time', value: 1 }, { label: 'Less than half', value: 2 }, { label: 'More than half', value: 3 }, { label: 'Most of the time', value: 4 }, { label: 'All the time', value: 5 }] }
      ]),
      scoringRulesJson: JSON.stringify({
        thresholds: [
          { min: 0, max: 50, category: 'Low Wellbeing', guidance: 'Indicates reduced vitality and emotional strain. Taking mindful downtime and accessing support is advisable.' },
          { min: 51, max: 75, category: 'Moderate Wellbeing', guidance: 'Balanced emotional state. Strengthening social connection and sleep hygiene can boost your vitality.' },
          { min: 76, max: 100, category: 'Optimal Wellbeing', guidance: 'High vitality, positive emotional resilience, and healthy adaptation.' }
        ]
      })
    }
  });
  console.log('✅ Seeded Standardized Clinical Screenings (PHQ-9, GAD-7, WHO-5)');

  // 5. Seed Historical Check-ins for Student 1 (14-day longitudinal curve)
  const now = new Date();
  for (let i = 14; i >= 0; i--) {
    const checkinDate = new Date(now);
    checkinDate.setDate(now.getDate() - i);

    // Fluctuate mood and stress realistically: mid-term stress dip around day 7
    let mood = 4;
    let stress = 2;
    let sleep = 7.5;
    let energy = 4;
    let tags = ['Balanced', 'Productive'];

    if (i >= 5 && i <= 8) {
      mood = 2;
      stress = 5;
      sleep = 5.2;
      energy = 2;
      tags = ['Exams', 'Deadlines', 'Insomnia'];
    } else if (i < 5) {
      mood = 3;
      stress = 3;
      sleep = 6.8;
      energy = 3;
      tags = ['Recovering', 'Mindfulness'];
    }

    await prisma.wellbeingCheckin.create({
      data: {
        studentProfileId: studentProfile1.id,
        date: checkinDate,
        moodScore: mood,
        stressLevel: stress,
        sleepHours: sleep,
        energyLevel: energy,
        notes: i === 6 ? 'Intense lab submission deadlines, felt overwhelmed late at night.' : 'Routine study schedule.',
        tags: JSON.stringify(tags),
        createdAt: checkinDate
      }
    });
  }

  // 6. Record Past Assessments for Students
  await prisma.assessmentResponse.create({
    data: {
      studentProfileId: studentProfile1.id,
      assessmentId: gad7.id,
      score: 8,
      severityCategory: 'Mild Anxiety',
      answersJson: JSON.stringify({ q1: 2, q2: 1, q3: 2, q4: 1, q5: 1, q6: 1, q7: 0 }),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.assessmentResponse.create({
    data: {
      studentProfileId: studentProfile1.id,
      assessmentId: phq9.id,
      score: 6,
      severityCategory: 'Mild Depression',
      answersJson: JSON.stringify({ q1: 1, q2: 1, q3: 2, q4: 1, q5: 0, q6: 1, q7: 0, q8: 0, q9: 0 }),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.assessmentResponse.create({
    data: {
      studentProfileId: students[1].profile.id,
      assessmentId: who5.id,
      score: 68,
      severityCategory: 'Moderate Wellbeing',
      answersJson: JSON.stringify({ q1: 4, q2: 3, q3: 3, q4: 4, q5: 3 }),
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  });

  // 7. Seed Evidence-Informed Psychoeducational Resources
  const resourcesData = [
    {
      title: 'Conquering Academic Panic: The 4-7-8 Breathing & Grounding Guide',
      slug: 'conquering-academic-panic-4-7-8-breathing',
      category: 'ANXIETY',
      readingTimeMin: 4,
      tags: JSON.stringify(['Anxiety', 'Breathing', 'Panic', 'Grounding']),
      contentMarkdown: `### The Science of Parasympathetic Activation\n\nWhen acute academic panic or sudden anxiety strikes, your sympathetic nervous system initiates the *fight-or-flight* response: cortisol and adrenaline surge, heart rate quickens, and peripheral blood vessels constrict.\n\nBy intentionally modulating respiration with prolonged exhalation, you stimulate the **vagus nerve**, prompting immediate bradycardia (heart rate deceleration) and cognitive stabilization.\n\n#### Step-by-Step 4-7-8 Protocol:\n1. **Empty the lungs**: Exhale completely through your mouth with a soft whooshing sound.\n2. **Inhale quietly through your nose** for a mental count of **4 seconds**.\n3. **Hold your breath gently** for a count of **7 seconds**.\n4. **Exhale completely and audibly through your mouth** for **8 seconds**.\n5. Repeat this cycle 4 times.\n\n*Interactive Tip*: Use this technique 2 minutes before walking into an exam or presentation.`
    },
    {
      title: 'Overcoming Imposter Syndrome in Higher Education',
      slug: 'overcoming-imposter-syndrome-higher-education',
      category: 'STRESS',
      readingTimeMin: 6,
      tags: JSON.stringify(['Imposter Syndrome', 'Self-Worth', 'Academics']),
      contentMarkdown: `### You Belong Here: Deconstructing the "Fraud" Narrative\n\nImposter phenomenon affects upwards of 70% of university students, particularly in competitive engineering, medicine, and research tracks.\n\n#### Three Cognitive Distortions to Watch For:\n- **Discounting Positives**: Attributing your high grades or admissions strictly to "luck" or "mistakes".\n- **Comparison Asymmetry**: Comparing your messy internal reality with peers' polished external presentations.\n- **All-or-Nothing Mastery**: Believing that if you don't grasp an advanced concept immediately, you lack aptitude.\n\n#### Practical Decatastrophizing Toolkit:\nMaintain a tangible *"Evidence Journal"* containing verified feedback, problem sets solved, and milestones reached.`
    },
    {
      title: 'Sleep Architecture & Memory Consolidation for STEM Students',
      slug: 'sleep-architecture-memory-consolidation',
      category: 'SLEEP',
      readingTimeMin: 5,
      tags: JSON.stringify(['Sleep Hygiene', 'Cognition', 'Memory', 'Circadian']),
      contentMarkdown: `### Why Pulling All-Nighters Sabotages Exam Performance\n\nDuring Slow-Wave Sleep (SWS) and Rapid Eye Movement (REM) cycles, hippocampal short-term memory traces are replayed and transferred into neocortical long-term storage.\n\nSacrificing sleep reduces working memory capacity by up to 38% and significantly increases panic susceptibility during analytical problem solving.\n\n#### High-Yield Sleep Hygiene Checklist:\n1. **Zero blue light / screens 45 minutes before bed**: Use amber tint or physical reading.\n2. **Temperature regulation**: Keep sleeping quarters cool (approx. 18-20°C / 65-68°F).\n3. **Caffeine half-life rule**: Eliminate caffeine after 2:00 PM (caffeine has an average 5-7 hour biological half-life).`
    },
    {
      title: 'CBT Thought Challenging: Unpacking The Catastrophizing Spiral',
      slug: 'cbt-thought-challenging-catastrophizing',
      category: 'MINDFULNESS',
      readingTimeMin: 7,
      tags: JSON.stringify(['CBT', 'Cognitive Reframing', 'Stress Management']),
      contentMarkdown: `### Cognitive Behavioral Therapy (CBT) Micro-Intervention\n\nThoughts are hypotheses, not incontrovertible facts.\n\n#### The ABC Model:\n- **A (Activating Event)**: Getting a lower-than-expected grade on Assignment 1.\n- **B (Belief)**: *"I will fail this course, lose my scholarship, and ruin my future."*\n- **C (Consequence)**: Intense paralysis, avoidance of studying, insomnia.\n\n#### The Socratic Reframing Challenge:\nAsk yourself:\n1. What is the objective evidence *for* and *against* this worst-case outcome?\n2. If my closest friend were in this exact situation, what empathetic, realistic advice would I give them?\n3. What is the single most constructive step I can take in the next 30 minutes?`
    }
  ];

  for (const r of resourcesData) {
    await prisma.resource.create({
      data: {
        institutionId: institution.id,
        title: r.title,
        slug: r.slug,
        category: r.category,
        readingTimeMin: r.readingTimeMin,
        tags: r.tags,
        contentMarkdown: r.contentMarkdown,
        isPublished: true,
        language: 'en'
      }
    });
  }
  console.log('✅ Seeded Evidence-Informed Psychoeducational Resources');

  // 8. Seed Counsellor Availability Slots (Weekly Recurring)
  // Days: 1 (Mon) to 5 (Fri), hours 10:00 - 15:00
  for (let day = 1; day <= 5; day++) {
    await prisma.counsellorAvailability.create({
      data: {
        counsellorId: counsellorProfile1.id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '15:00',
        slotDurationMin: 45,
        isRecurring: true
      }
    });
  }

  // 9. Seed Sample Confirmed Appointment
  const nextAppointmentDate = new Date();
  nextAppointmentDate.setDate(now.getDate() + 2);
  nextAppointmentDate.setHours(14, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      studentProfileId: studentProfile1.id,
      counsellorId: counsellorProfile1.id,
      scheduledAt: nextAppointmentDate,
      durationMin: 45,
      status: 'CONFIRMED',
      meetingType: 'VIRTUAL',
      meetingLinkOrLocation: 'https://mindbridge.aiths.ac.in/meet/room-882194',
      studentNotes: 'Feeling anxious about upcoming compiler design viva and placement tests.',
      privateCounsellorNotes: 'ENCRYPTED_NOTE: Prior GAD-7 score is 8 (Mild). Student consented to trend sharing. Recommended 4-7-8 breathing practice and sleep schedule stabilization.'
    }
  });
  console.log('✅ Seeded Counsellor Availability and Confirmed Booking');

  // 10. Seed Peer-to-Peer Moderated Community Posts
  const peerPost1 = await prisma.peerPost.create({
    data: {
      studentProfileId: studentProfile1.id,
      anonymousAuthorName: 'TranquilSparrow42',
      title: 'How do you handle end-semester burnout when assignments stack up?',
      content: 'Hey everyone, 3rd year CSE student here. Lately I have been feeling completely drained by 7 PM every day. It feels like even after finishing one lab report, three more appear. How do you recharge between deadlines without feeling guilty about taking a break?',
      category: 'Academic',
      status: 'APPROVED',
      isAnonymous: true,
    }
  });

  await prisma.peerComment.create({
    data: {
      postId: peerPost1.id,
      studentProfileId: studentProfile1.id,
      anonymousAuthorName: 'MindfulCedar88',
      content: 'I used to feel that exact same guilt! What helped me was scheduling "non-negotiable 30-min downtime" as an actual calendar event, just like a lecture. It stops feeling like slacking off and more like maintenance.',
      status: 'APPROVED',
      isAnonymous: true,
    }
  });

  await prisma.peerPost.create({
    data: {
      studentProfileId: studentProfile1.id,
      anonymousAuthorName: 'ResilientFern12',
      title: 'Reminder: It is completely okay to not have your entire 5-year plan figured out right now',
      content: 'Saw many classmates stressing about placement interviews and summer internships. Just wanted to share a gentle reminder that everyone is running their own race. Focus on today’s small steps. Breathe!',
      category: 'Mindset',
      status: 'APPROVED',
      isAnonymous: true,
    }
  });
  console.log('✅ Seeded Peer-to-Peer Moderated Community');

  // 11. Seed Privacy-Preserving Institutional Wellbeing Metrics (Aggregated, k-anonymity >= 10)
  const departments = [
    'Computer Science & Engineering',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Civil Engineering',
    'Information Technology'
  ];

  for (const dept of departments) {
    await prisma.wellbeingMetric.create({
      data: {
        institutionId: institution.id,
        department: dept,
        periodDate: new Date(now.getFullYear(), now.getMonth(), 1),
        avgMoodScore: dept.includes('Computer') ? 3.1 : 3.6,
        avgStressLevel: dept.includes('Computer') ? 3.9 : 2.8,
        avgSleepHours: dept.includes('Computer') ? 5.8 : 6.9,
        cohortSize: 142
      }
    });
  }
  console.log('✅ Seeded Privacy-Preserving Aggregated Institutional Metrics');

  console.log('\n🎉 MINDBRIDGE Database Seeding Completed Successfully!');
  console.log('------------------------------------------------------------');
  console.log('Test Accounts (Password for all: Password123!):');
  console.log('• STUDENT:           aarav.patel@aiths.ac.in (Aarav Patel)');
  console.log('• STUDENT 2:         diya.sharma@aiths.ac.in (Diya Sharma)');
  console.log('• COUNSELLOR:        dr.ananya@aiths.ac.in (Dr. Ananya Sen, RCI)');
  console.log('• COUNSELLOR 2:      dr.vikram@aiths.ac.in (Dr. Vikram Malhotra)');
  console.log('• PEER VOLUNTEER:    rohan.peer@aiths.ac.in (Rohan Mehra)');
  console.log('• INSTITUTION ADMIN: dean.welfare@aiths.ac.in (Prof. Meenakshi Iyer)');
  console.log('• SUPER ADMIN:       admin@mindbridge.org (System Admin)');
  console.log('------------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
