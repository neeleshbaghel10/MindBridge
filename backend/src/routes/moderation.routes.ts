import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { recordAuditLog } from '../middleware/audit.middleware';
import { ModerationAction, ModerationState } from '../peer/types';

const router = Router();
router.use(authenticateJwt);

// Only COUNSELLOR, ADMIN, and volunteer moderators
const modRoles = requireRoles(['COUNSELLOR', 'PEER_VOLUNTEER', 'INSTITUTION_ADMIN', 'SUPER_ADMIN']);

const actionSchema = z.object({
  entityType: z.enum(['PEER_POST', 'PEER_COMMENT']),
  entityId:   z.string().uuid(),
  action:     z.nativeEnum(ModerationAction),
  reason:     z.string().min(5).max(500),
});

// ─── 1. GET MODERATION QUEUE ─────────────────────────────────────────────────
// Returns PENDING + FLAGGED + ESCALATED posts and comments, enriched with AI labels
router.get('/queue', modRoles, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const statusFilter = (req.query.status as string)?.split(',') ?? ['PENDING', 'FLAGGED', 'ESCALATED'];
    const typeFilter   = req.query.type as string | undefined; // 'PEER_POST' | 'PEER_COMMENT'
    const take         = Math.min(Number(req.query.take ?? 30), 100);

    const [posts, comments] = await Promise.all([
      (!typeFilter || typeFilter === 'PEER_POST')
        ? prisma.peerPost.findMany({
            where: { status: { in: statusFilter }, deletedAt: null },
            orderBy: [{ aiModerationScore: 'desc' }, { createdAt: 'asc' }],
            take,
            select: {
              id: true, title: true, content: true, category: true,
              isAnonymous: true, status: true, aiModerationScore: true,
              aiModerationLabels: true, moderationReason: true, createdAt: true,
              _count: { select: { reports: true, reactions: true } },
            },
          })
        : Promise.resolve([]),
      (!typeFilter || typeFilter === 'PEER_COMMENT')
        ? prisma.peerComment.findMany({
            where: { status: { in: statusFilter }, deletedAt: null },
            orderBy: [{ aiModerationScore: 'desc' }, { createdAt: 'asc' }],
            take,
            select: {
              id: true, postId: true, content: true, isAnonymous: true,
              status: true, aiModerationScore: true, aiModerationLabels: true,
              moderationReason: true, createdAt: true,
              _count: { select: { reports: true, reactions: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const postsWithType  = posts.map(p  => ({ ...p,  entityType: 'PEER_POST',    aiLabels: tryParseJson(p.aiModerationLabels) }));
    const commentsWithType = comments.map(c => ({ ...c, entityType: 'PEER_COMMENT', aiLabels: tryParseJson(c.aiModerationLabels) }));

    const queue = [...postsWithType, ...commentsWithType]
      .sort((a, b) => (b.aiModerationScore ?? 0) - (a.aiModerationScore ?? 0))
      .slice(0, take);

    // Also get pending reports for context
    const pendingReports = await prisma.peerReport.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: { id: true, postId: true, commentId: true, reason: true, details: true, createdAt: true },
    });

    res.json({ success: true, data: { queue, pendingReports, counts: { posts: posts.length, comments: comments.length, reports: pendingReports.length } } });
  } catch (error) { next(error); }
});

// ─── 2. TAKE MODERATION ACTION ────────────────────────────────────────────────
router.post('/action', modRoles, recordAuditLog('MODERATION_ACTION', 'ModerationEvent'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entityType, entityId, action, reason } = actionSchema.parse(req.body);
      const moderatorUserId = req.user!.userId;

      let newStatus: string;
      switch (action) {
        case ModerationAction.APPROVE:                newStatus = ModerationState.APPROVED;  break;
        case ModerationAction.REMOVE:                 newStatus = ModerationState.REMOVED;   break;
        case ModerationAction.ESCALATE_TO_COUNSELLOR: newStatus = ModerationState.ESCALATED; break;
        case ModerationAction.DISMISS_REPORT:         newStatus = ModerationState.APPROVED;  break;
        default: newStatus = ModerationState.PENDING;
      }

      const now = new Date();

      if (entityType === 'PEER_POST') {
        const post = await prisma.peerPost.findUnique({ where: { id: entityId } });
        if (!post) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }); return; }

        if (action === ModerationAction.REMOVE) {
          await prisma.peerPost.update({ where: { id: entityId }, data: { status: newStatus, deletedAt: now, moderationReason: reason, moderatedByUserId: moderatorUserId, moderatedAt: now } });
        } else {
          await prisma.peerPost.update({ where: { id: entityId }, data: { status: newStatus, moderationReason: reason, moderatedByUserId: moderatorUserId, moderatedAt: now } });
        }

        // Mark pending reports on this post as ACTIONED / DISMISSED
        if (action !== ModerationAction.DISMISS_REPORT) {
          await prisma.peerReport.updateMany({ where: { postId: entityId, status: 'PENDING' }, data: { status: 'ACTIONED', reviewedAt: now, reviewedByUserId: moderatorUserId } });
        } else {
          await prisma.peerReport.updateMany({ where: { postId: entityId, status: 'PENDING' }, data: { status: 'DISMISSED', reviewedAt: now, reviewedByUserId: moderatorUserId } });
        }

      } else {
        const comment = await prisma.peerComment.findUnique({ where: { id: entityId } });
        if (!comment) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }); return; }

        if (action === ModerationAction.REMOVE) {
          await prisma.peerComment.update({ where: { id: entityId }, data: { status: newStatus, deletedAt: now, moderationReason: reason, moderatedByUserId: moderatorUserId, moderatedAt: now } });
        } else {
          await prisma.peerComment.update({ where: { id: entityId }, data: { status: newStatus, moderationReason: reason, moderatedByUserId: moderatorUserId, moderatedAt: now } });
        }

        if (action !== ModerationAction.DISMISS_REPORT) {
          await prisma.peerReport.updateMany({ where: { commentId: entityId, status: 'PENDING' }, data: { status: 'ACTIONED', reviewedAt: now, reviewedByUserId: moderatorUserId } });
        } else {
          await prisma.peerReport.updateMany({ where: { commentId: entityId, status: 'PENDING' }, data: { status: 'DISMISSED', reviewedAt: now, reviewedByUserId: moderatorUserId } });
        }
      }

      // Log moderation event
      const aiLabels = entityType === 'PEER_POST'
        ? (await prisma.peerPost.findUnique({ where: { id: entityId }, select: { aiModerationLabels: true } }))?.aiModerationLabels ?? '[]'
        : (await prisma.peerComment.findUnique({ where: { id: entityId }, select: { aiModerationLabels: true } }))?.aiModerationLabels ?? '[]';

      await prisma.moderationEvent.create({
        data: { moderatorUserId, entityType, entityId, action, reason, aiLabels: aiLabels ?? '[]' },
      });

      res.json({ success: true, data: { entityType, entityId, newStatus, action, message: 'Moderation action recorded.' } });
    } catch (error) { next(error); }
  }
);

// ─── 3. GET MODERATION HISTORY FOR AN ENTITY ─────────────────────────────────
router.get('/events/:entityType/:entityId', modRoles,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entityType = String(req.params.entityType);
      const entityId = String(req.params.entityId);
      const events = await prisma.moderationEvent.findMany({
        where: { entityType, entityId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: events });
    } catch (error) { next(error); }
  }
);

// ─── 4. GET REPORTS FOR AN ENTITY ────────────────────────────────────────────
router.get('/reports/:entityType/:entityId', modRoles,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entityType = String(req.params.entityType);
      const entityId = String(req.params.entityId);
      const where = entityType === 'PEER_POST' ? { postId: entityId } : { commentId: entityId };
      const reports = await prisma.peerReport.findMany({ where, orderBy: { createdAt: 'desc' } });
      res.json({ success: true, data: reports });
    } catch (error) { next(error); }
  }
);

// ─── Helper ───────────────────────────────────────────────────────────────────
function tryParseJson(val: string | null | undefined): any[] {
  try { return JSON.parse(val ?? '[]'); } catch { return []; }
}

export default router;
