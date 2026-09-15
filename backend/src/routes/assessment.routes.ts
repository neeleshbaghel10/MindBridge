import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateJwt);

// 1. List all active standardized screenings
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        clinicalDisclaimer: true,
      },
    });

    res.json({
      success: true,
      data: assessments,
    });
  } catch (error) {
    next(error);
  }
});

// 2. Get specific assessment with questions and options
router.get('/:code', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const code = String(req.params.code).toUpperCase();
    const assessment = await prisma.assessment.findUnique({
      where: { code },
    });

    if (!assessment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Screening assessment '${code}' not found.` },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: assessment.id,
        code: assessment.code,
        title: assessment.title,
        description: assessment.description,
        clinicalDisclaimer: assessment.clinicalDisclaimer,
        questions: JSON.parse(assessment.questionsJson),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 3. Submit screening answers
const submitSchema = z.object({
  answers: z.record(z.string(), z.number()),
});

router.post('/:code/submit', requireRoles(['STUDENT', 'PEER_VOLUNTEER']), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const code = String(req.params.code).toUpperCase();
    const studentProfileId = req.user?.studentProfileId;

    if (!studentProfileId) {
      res.status(400).json({
        success: false,
        error: { code: 'PROFILE_REQUIRED', message: 'Student profile required to complete assessments.' },
      });
      return;
    }

    const assessment = await prisma.assessment.findUnique({
      where: { code },
    });

    if (!assessment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Assessment '${code}' not found.` },
      });
      return;
    }

    const { answers } = submitSchema.parse(req.body);
    const scoringRules = JSON.parse(assessment.scoringRulesJson);

    // Compute score
    let totalScore = 0;
    for (const val of Object.values(answers)) {
      totalScore += val;
    }

    // Determine severity category
    let severityCategory = 'Undetermined';
    let guidance = '';
    if (scoringRules.thresholds && Array.isArray(scoringRules.thresholds)) {
      for (const t of scoringRules.thresholds) {
        if (totalScore >= t.min && totalScore <= t.max) {
          severityCategory = t.category;
          guidance = t.guidance;
          break;
        }
      }
    }

    // Check for critical item trigger (e.g. PHQ-9 Question 9 >= 1)
    let criticalTriggered = false;
    if (code === 'PHQ9' && answers['q9'] && answers['q9'] > 0) {
      criticalTriggered = true;

      // Log high priority RiskEvent
      const riskEvent = await prisma.riskEvent.create({
        data: {
          studentProfileId,
          riskCategory: 'SUICIDAL_IDEATION',
          riskScore: answers['q9'] === 3 ? 0.95 : (answers['q9'] === 2 ? 0.75 : 0.5),
          riskLevel: answers['q9'] >= 2 ? 'HIGH' : 'MODERATE',
          triggerSnippetRedacted: `PHQ9 Item 9 positive rating: ${answers['q9']}/3`,
          handled: false,
        },
      });

      // Dispatch CrisisEvent for follow-up
      await prisma.crisisEvent.create({
        data: {
          riskEventId: riskEvent.id,
          status: 'TRIGGERED',
          helplineProvided: true,
          notes: 'Auto-triggered by PHQ-9 Question 9 endorsement.',
        },
      });
    }

    // Save assessment response
    const savedResponse = await prisma.assessmentResponse.create({
      data: {
        studentProfileId,
        assessmentId: assessment.id,
        score: totalScore,
        severityCategory,
        answersJson: JSON.stringify(answers),
      },
    });

    // Provide relevant psychoeducational recommendations
    const suggestedResources = await prisma.resource.findMany({
      where: {
        category: code === 'PHQ9' ? { in: ['MINDFULNESS', 'STRESS'] } : { in: ['ANXIETY', 'SLEEP'] },
      },
      take: 2,
    });

    res.status(201).json({
      success: true,
      data: {
        id: savedResponse.id,
        assessmentCode: code,
        assessmentTitle: assessment.title,
        score: totalScore,
        severityCategory,
        guidance,
        criticalTriggered,
        clinicalDisclaimer: assessment.clinicalDisclaimer,
        emergencyHotlines: criticalTriggered ? [
          { name: 'National Tele-MANAS', number: '14416', description: '24x7 Free Psychological First-Aid & Crisis Helpline' },
          { name: 'Kiran Mental Health Support', number: '1800-599-0019', description: '24x7 Ministry of Social Justice' },
          { name: 'Campus 24/7 Security & First Response', number: '112', description: 'Immediate Campus Assistance' },
        ] : null,
        recommendedResources: suggestedResources.map(r => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          category: r.category,
          readingTimeMin: r.readingTimeMin,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 4. Student's past assessment history
router.get('/history/student', requireRoles(['STUDENT', 'PEER_VOLUNTEER']), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentProfileId = req.user?.studentProfileId;
    if (!studentProfileId) {
      res.status(400).json({
        success: false,
        error: { code: 'PROFILE_REQUIRED', message: 'Student profile required.' },
      });
      return;
    }

    const responses = await prisma.assessmentResponse.findMany({
      where: { studentProfileId },
      include: {
        assessment: {
          select: { code: true, title: true },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: responses.map(r => ({
        id: r.id,
        assessmentCode: r.assessment.code,
        assessmentTitle: r.assessment.title,
        score: r.score,
        severityCategory: r.severityCategory,
        completedAt: r.completedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
