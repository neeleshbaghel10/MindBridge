import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';

const router = Router();

const checkinSchema = z.object({
  moodScore: z.number().int().min(1).max(5),
  sleepHours: z.number().min(0).max(24),
  stressLevel: z.number().int().min(1).max(5),
  energyLevel: z.number().int().min(1).max(5),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string()).default([]),
});

// All check-in endpoints require STUDENT or PEER_VOLUNTEER role
router.use(authenticateJwt);
router.use(requireRoles(['STUDENT', 'PEER_VOLUNTEER']));

// 1. Submit today's check-in
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentProfileId = req.user?.studentProfileId;
    if (!studentProfileId) {
      res.status(400).json({
        success: false,
        error: { code: 'PROFILE_REQUIRED', message: 'Student profile not associated with this account.' },
      });
      return;
    }

    const data = checkinSchema.parse(req.body);

    // Check if check-in already logged in the last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const existingRecent = await prisma.wellbeingCheckin.findFirst({
      where: {
        studentProfileId,
        createdAt: { gte: sixHoursAgo },
      },
    });

    const checkin = await prisma.wellbeingCheckin.create({
      data: {
        studentProfileId,
        moodScore: data.moodScore,
        sleepHours: data.sleepHours,
        stressLevel: data.stressLevel,
        energyLevel: data.energyLevel,
        notes: data.notes || null,
        tags: JSON.stringify(data.tags),
      },
    });

    // If stress is very high (5/5) or mood very low (1/5), proactively generate tailored recommendations
    if (data.stressLevel >= 4 || data.moodScore <= 2) {
      const panicResource = await prisma.resource.findFirst({
        where: { category: { in: ['ANXIETY', 'STRESS'] } },
      });
      if (panicResource) {
        // Use the @@unique compound key (studentProfileId, resourceId) for the upsert
        await prisma.recommendation.upsert({
          where: {
            studentProfileId_resourceId: {
              studentProfileId,
              resourceId: panicResource.id,
            },
          },
          create: {
            studentProfileId,
            resourceId: panicResource.id,
            rationale: 'Recommended based on your recent elevated stress check-in.',
            score: 0.95,
          },
          update: {
            dismissed: false,
            score: 0.95,
          },
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        ...checkin,
        tags: JSON.parse(checkin.tags),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 2. Check today's check-in status
router.get('/today', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentProfileId = req.user?.studentProfileId;
    if (!studentProfileId) {
      res.status(400).json({
        success: false,
        error: { code: 'PROFILE_REQUIRED', message: 'Student profile required.' },
      });
      return;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const latestCheckin = await prisma.wellbeingCheckin.findFirst({
      where: {
        studentProfileId,
        createdAt: { gte: startOfToday },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        hasCheckedInToday: !!latestCheckin,
        latestCheckin: latestCheckin ? {
          ...latestCheckin,
          tags: JSON.parse(latestCheckin.tags || '[]'),
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 3. Longitudinal Wellbeing Timeline (7, 14, 30 days)
router.get('/timeline', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentProfileId = req.user?.studentProfileId;
    if (!studentProfileId) {
      res.status(400).json({
        success: false,
        error: { code: 'PROFILE_REQUIRED', message: 'Student profile required.' },
      });
      return;
    }

    const days = parseInt(req.query.days as string, 10) || 14;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const checkins = await prisma.wellbeingCheckin.findMany({
      where: {
        studentProfileId,
        createdAt: { gte: sinceDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = checkins.map(c => ({
      id: c.id,
      date: c.date.toISOString().split('T')[0],
      moodScore: c.moodScore,
      stressLevel: c.stressLevel,
      sleepHours: c.sleepHours,
      energyLevel: c.energyLevel,
      notes: c.notes,
      tags: JSON.parse(c.tags || '[]'),
      createdAt: c.createdAt,
    }));

    // Calculate longitudinal metrics
    const count = checkins.length;
    const avgMood = count > 0 ? (checkins.reduce((acc, curr) => acc + curr.moodScore, 0) / count).toFixed(1) : 0;
    const avgStress = count > 0 ? (checkins.reduce((acc, curr) => acc + curr.stressLevel, 0) / count).toFixed(1) : 0;
    const avgSleep = count > 0 ? (checkins.reduce((acc, curr) => acc + curr.sleepHours, 0) / count).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        timeline: formatted,
        summary: {
          totalEntries: count,
          avgMood: parseFloat(avgMood.toString()),
          avgStress: parseFloat(avgStress.toString()),
          avgSleep: parseFloat(avgSleep.toString()),
          streakDays: count > 0 ? count : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
