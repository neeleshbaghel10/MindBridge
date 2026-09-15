import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

// 1. List all published resources with category filter
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.q as string | undefined;

    const resources = await prisma.resource.findMany({
      where: {
        isPublished: true,
        ...(category ? { category: category.toUpperCase() } : {}),
        ...(search ? { title: { contains: search } } : {}),
      },
      include: {
        progress: req.user?.studentProfileId ? {
          where: { studentProfileId: req.user.studentProfileId },
        } : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: resources.map(r => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        category: r.category,
        readingTimeMin: r.readingTimeMin,
        tags: JSON.parse(r.tags || '[]'),
        contentMarkdown: r.contentMarkdown,
        isCompleted: r.progress && r.progress.length > 0 ? r.progress[0].isCompleted : false,
        bookmarked: r.progress && r.progress.length > 0 ? r.progress[0].bookmarked : false,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// 2. Personalized Recommendations — MUST be before /:slug to avoid Express treating "user" as a slug param
router.get('/user/recommendations', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentProfileId = req.user?.studentProfileId;
    if (!studentProfileId) {
      res.status(400).json({
        success: false,
        error: { code: 'PROFILE_REQUIRED', message: 'Student profile required.' },
      });
      return;
    }

    const recommendations = await prisma.recommendation.findMany({
      where: {
        studentProfileId,
        dismissed: false,
      },
      include: {
        resource: true,
      },
      orderBy: { score: 'desc' },
      take: 4,
    });

    // Fallback: if no personalized recommendations yet, return default top guides
    if (recommendations.length === 0) {
      const defaultResources = await prisma.resource.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: defaultResources.map(r => ({
          id: `default-${r.id}`,
          rationale: 'Curated wellness toolkit for university students.',
          resource: {
            id: r.id,
            title: r.title,
            slug: r.slug,
            category: r.category,
            readingTimeMin: r.readingTimeMin,
          },
        })),
      });
      return;
    }

    res.json({
      success: true,
      data: recommendations.map(rec => ({
        id: rec.id,
        rationale: rec.rationale,
        resource: {
          id: rec.resource.id,
          title: rec.resource.title,
          slug: rec.resource.slug,
          category: rec.resource.category,
          readingTimeMin: rec.resource.readingTimeMin,
        },
      })),
    });
  } catch (error) {
    next(error);
  }
});

// 3. Get single resource by slug
router.get('/:slug', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resource = await prisma.resource.findUnique({
      where: { slug: String(req.params.slug) },
    });

    if (!resource) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource guide not found.' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: resource.id,
        title: resource.title,
        slug: resource.slug,
        category: resource.category,
        readingTimeMin: resource.readingTimeMin,
        tags: JSON.parse(resource.tags || '[]'),
        contentMarkdown: resource.contentMarkdown,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 4. Update reading progress or bookmark
const progressSchema = z.object({
  isCompleted: z.boolean().optional(),
  bookmarked: z.boolean().optional(),
  timeSpentSec: z.number().int().optional(),
});

router.post('/:id/progress', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentProfileId = req.user?.studentProfileId;
    if (!studentProfileId) {
      res.status(400).json({
        success: false,
        error: { code: 'PROFILE_REQUIRED', message: 'Student profile required.' },
      });
      return;
    }

    const resourceId = String(req.params.id);
    const { isCompleted, bookmarked, timeSpentSec } = progressSchema.parse(req.body);

    const progress = await prisma.resourceProgress.upsert({
      where: {
        studentProfileId_resourceId: {
          studentProfileId,
          resourceId,
        },
      },
      create: {
        studentProfileId,
        resourceId,
        isCompleted: isCompleted ?? false,
        bookmarked: bookmarked ?? false,
        timeSpentSec: timeSpentSec ?? 0,
      },
      update: {
        ...(isCompleted !== undefined ? { isCompleted } : {}),
        ...(bookmarked !== undefined ? { bookmarked } : {}),
        ...(timeSpentSec !== undefined ? { timeSpentSec: { increment: timeSpentSec } } : {}),
        lastAccessedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
});


export default router;

