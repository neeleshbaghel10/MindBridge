import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware';
import { defaultSafetyRiskClassifier, RiskEventService, CrisisResponseBuilder } from '../safety';
import { recordAuditLog } from '../middleware/audit.middleware';
import { screenContent } from '../peer/peerModerationService';
import { ModerationState, ReactionType, ReportReason } from '../peer/types';

const router = Router();
router.use(authenticateJwt);

// Schemas
const postSchema = z.object({
  title:       z.string().min(3).max(150),
  content:     z.string().min(10).max(2000),
  category:    z.enum(['Academic', 'Mindset', 'Burnout', 'Relationships', 'General']).default('General'),
  isAnonymous: z.boolean().default(true),
});

const commentSchema = z.object({
  content:     z.string().min(2).max(800),
  isAnonymous: z.boolean().default(true),
});

const reactSchema    = z.object({ reactionType: z.nativeEnum(ReactionType) });
const reportSchema   = z.object({ reason: z.nativeEnum(ReportReason), details: z.string().max(500).optional() });

async function getStudentProfile(userId: string) {
  return prisma.studentProfile.findUnique({ where: { userId } });
}

// 1. LIST APPROVED POSTS (paginated)
router.get('/posts', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = req.query.category as string | undefined;
    const cursor   = req.query.cursor   as string | undefined;
    const take     = Math.min(Number(req.query.take ?? 20), 50);

    const posts = await prisma.peerPost.findMany({
      where: { status: 'APPROVED', deletedAt: null, ...(category ? { category } : {}) },
      include: {
        reactions: { select: { reactionType: true } },
        _count:    { select: { comments: { where: { status: 'APPROVED', deletedAt: null } }, reports: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = posts.length > take;
    const page    = hasMore ? posts.slice(0, take) : posts;
    const mapped  = page.map(p => {
      const rc: Record<string, number> = {};
      for (const r of p.reactions) rc[r.reactionType] = (rc[r.reactionType] ?? 0) + 1;
      return { id: p.id, title: p.title, content: p.content, category: p.category,
               authorAlias: p.anonymousAuthorName, isAnonymous: p.isAnonymous,
               reactions: rc, commentsCount: p._count.comments, createdAt: p.createdAt };
    });

    res.json({ success: true, data: mapped, meta: { hasMore, nextCursor: hasMore ? page[page.length - 1].id : null } });
  } catch (error) { next(error); }
});

// 2. GET SINGLE POST WITH COMMENTS
router.get('/posts/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const postId = String(req.params.id);
    const post = await prisma.peerPost.findFirst({
      where: { id: postId, status: 'APPROVED', deletedAt: null },
      include: {
        reactions: { select: { reactionType: true } },
        comments: {
          where: { status: 'APPROVED', deletedAt: null },
          include: { reactions: { select: { reactionType: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!post) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }); return; }

    const rc: Record<string, number> = {};
    for (const r of post.reactions) rc[r.reactionType] = (rc[r.reactionType] ?? 0) + 1;

    const comments = post.comments.map((c: any) => {
      const cr: Record<string, number> = {};
      for (const r of c.reactions) cr[r.reactionType] = (cr[r.reactionType] ?? 0) + 1;
      return { id: c.id, authorAlias: c.anonymousAuthorName, isAnonymous: c.isAnonymous,
               content: c.content, reactions: cr, createdAt: c.createdAt };
    });
    res.json({ success: true, data: { ...post, reactions: rc, comments } });
  } catch (error) { next(error); }
});

// 3. CREATE POST (AI-screened)
router.post('/posts', recordAuditLog('CREATE_PEER_POST', 'PeerPost'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentProfile = await getStudentProfile(req.user!.userId);
      if (!studentProfile) { res.status(400).json({ success: false, error: { code: 'PROFILE_REQUIRED' } }); return; }

      const body     = postSchema.parse(req.body);
      const fullText = body.title + ' ' + body.content;
      const mod      = await screenContent(fullText, studentProfile.id, true);

      if (mod.isCrisis) {
        const sr   = defaultSafetyRiskClassifier.classify(fullText);
        await RiskEventService.logRiskEvent({
          studentProfileId: studentProfile.id, riskLevel: sr.riskLevel, triggerType: sr.triggerType,
          source: 'PEER_COMMUNITY', actionTaken: 'CRISIS_HELPLINES_SHOWN', escalationStatus: 'ESCALATED',
          followUpStatus: 'PENDING_FOLLOWUP', triggerSnippetRedacted: 'Peer post crisis intercept',
          ipAddress: req.ip, userAgent: req.headers['user-agent'],
        });
        const built = CrisisResponseBuilder.buildResponse(sr.riskLevel);
        res.status(400).json({ success: false, error: {
          code: 'CRISIS_INTERCEPTED',
          message: 'Because your safety matters, this was not posted publicly. Please reach out immediately.',
          details: { helplines: built.verifiedResources, suggestedAction: built.suggestedAction },
        }}); return;
      }

      if (mod.rateLimited) {
        res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Please wait a moment before posting again.' } }); return;
      }

      const post = await prisma.peerPost.create({
        data: {
          studentProfileId: studentProfile.id, anonymousAuthorName: studentProfile.anonymousAlias,
          title: body.title, content: body.content, category: body.category,
          isAnonymous: body.isAnonymous, status: mod.suggestedState,
          aiModerationScore: mod.score, aiModerationLabels: JSON.stringify(mod.labels),
        },
      });

      const msg = mod.suggestedState === ModerationState.APPROVED
        ? 'Post published to the community.'
        : 'Post submitted and is pending review.';
      res.status(201).json({ success: true, data: post, meta: { message: msg, moderationState: mod.suggestedState } });
    } catch (error) { next(error); }
  }
);

// 4. ADD COMMENT (AI-screened)
router.post('/posts/:id/comments', recordAuditLog('ADD_PEER_COMMENT', 'PeerComment'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentProfile = await getStudentProfile(req.user!.userId);
      if (!studentProfile) { res.status(400).json({ success: false, error: { code: 'PROFILE_REQUIRED' } }); return; }

      const postId = String(req.params.id);
      const post = await prisma.peerPost.findFirst({ where: { id: postId, status: 'APPROVED', deletedAt: null } });
      if (!post) { res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND' } }); return; }

      const body = commentSchema.parse(req.body);
      const mod  = await screenContent(body.content, studentProfile.id, false);

      if (mod.isCrisis) {
        const sr = defaultSafetyRiskClassifier.classify(body.content);
        await RiskEventService.logRiskEvent({
          studentProfileId: studentProfile.id, riskLevel: sr.riskLevel, triggerType: sr.triggerType,
          source: 'PEER_COMMUNITY', actionTaken: 'CRISIS_HELPLINES_SHOWN', escalationStatus: 'ESCALATED',
          followUpStatus: 'PENDING_FOLLOWUP', triggerSnippetRedacted: 'Peer comment crisis intercept',
          ipAddress: req.ip, userAgent: req.headers['user-agent'],
        });
        const built = CrisisResponseBuilder.buildResponse(sr.riskLevel);
        res.status(400).json({ success: false, error: {
          code: 'CRISIS_INTERCEPTED', message: 'Please reach out to support at 14416.',
          details: { helplines: built.verifiedResources },
        }}); return;
      }

      const comment = await prisma.peerComment.create({
        data: {
          postId, studentProfileId: studentProfile.id,
          anonymousAuthorName: studentProfile.anonymousAlias,
          content: body.content, isAnonymous: body.isAnonymous, status: mod.suggestedState,
          aiModerationScore: mod.score, aiModerationLabels: JSON.stringify(mod.labels),
        },
      });
      res.status(201).json({ success: true, data: comment });
    } catch (error) { next(error); }
  }
);

// 5. REACT TO POST (toggle)
router.post('/posts/:id/react', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sp = await getStudentProfile(req.user!.userId);
    if (!sp) { res.status(400).json({ success: false, error: { code: 'PROFILE_REQUIRED' } }); return; }

    const postId = String(req.params.id);
    const { reactionType } = reactSchema.parse(req.body);
    const existing = await prisma.peerReaction.findUnique({
      where: { studentProfileId_postId_reactionType: { studentProfileId: sp.id, postId, reactionType } },
    });
    if (existing) {
      await prisma.peerReaction.delete({ where: { id: existing.id } });
      res.json({ success: true, data: { toggled: false, action: 'removed', reactionType } });
    } else {
      await prisma.peerReaction.create({ data: { studentProfileId: sp.id, postId, reactionType } });
      res.json({ success: true, data: { toggled: true, action: 'added', reactionType } });
    }
  } catch (error) { next(error); }
});

// 6. REACT TO COMMENT (toggle)
router.post('/comments/:id/react', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sp = await getStudentProfile(req.user!.userId);
    if (!sp) { res.status(400).json({ success: false, error: { code: 'PROFILE_REQUIRED' } }); return; }

    const commentId = String(req.params.id);
    const { reactionType } = reactSchema.parse(req.body);
    const existing = await prisma.peerReaction.findUnique({
      where: { studentProfileId_commentId_reactionType: { studentProfileId: sp.id, commentId, reactionType } },
    });
    if (existing) {
      await prisma.peerReaction.delete({ where: { id: existing.id } });
      res.json({ success: true, data: { toggled: false, action: 'removed', reactionType } });
    } else {
      await prisma.peerReaction.create({ data: { studentProfileId: sp.id, commentId, reactionType } });
      res.json({ success: true, data: { toggled: true, action: 'added', reactionType } });
    }
  } catch (error) { next(error); }
});

// 7. REPORT POST
router.post('/posts/:id/report', recordAuditLog('REPORT_PEER_POST', 'PeerReport'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sp = await getStudentProfile(req.user!.userId);
      if (!sp) { res.status(400).json({ success: false, error: { code: 'PROFILE_REQUIRED' } }); return; }

      const postId = String(req.params.id);
      const post = await prisma.peerPost.findFirst({ where: { id: postId, deletedAt: null } });
      if (!post) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }); return; }

      const { reason, details } = reportSchema.parse(req.body);
      const dup = await prisma.peerReport.findFirst({ where: { reporterProfileId: sp.id, postId: post.id, status: 'PENDING' } });
      if (dup) { res.status(409).json({ success: false, error: { code: 'ALREADY_REPORTED' } }); return; }

      const report = await prisma.peerReport.create({
        data: { reporterProfileId: sp.id, postId: post.id, reason, details: details ?? null },
      });

      if (reason === ReportReason.SELF_HARM) {
        await prisma.peerPost.update({ where: { id: post.id }, data: { status: 'FLAGGED' } });
      }

      res.status(201).json({ success: true, data: { message: 'Report submitted. Thank you for helping keep this space safe.', reportId: report.id } });
    } catch (error) { next(error); }
  }
);

// 8. REPORT COMMENT
router.post('/comments/:id/report', recordAuditLog('REPORT_PEER_COMMENT', 'PeerReport'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sp = await getStudentProfile(req.user!.userId);
      if (!sp) { res.status(400).json({ success: false, error: { code: 'PROFILE_REQUIRED' } }); return; }

      const commentId = String(req.params.id);
      const comment = await prisma.peerComment.findFirst({ where: { id: commentId, deletedAt: null } });
      if (!comment) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }); return; }

      const { reason, details } = reportSchema.parse(req.body);
      const dup = await prisma.peerReport.findFirst({ where: { reporterProfileId: sp.id, commentId: comment.id, status: 'PENDING' } });
      if (dup) { res.status(409).json({ success: false, error: { code: 'ALREADY_REPORTED' } }); return; }

      const report = await prisma.peerReport.create({
        data: { reporterProfileId: sp.id, commentId: comment.id, reason, details: details ?? null },
      });

      if (reason === ReportReason.SELF_HARM) {
        await prisma.peerComment.update({ where: { id: comment.id }, data: { status: 'FLAGGED' } });
      }

      res.status(201).json({ success: true, data: { message: 'Report submitted. Thank you.', reportId: report.id } });
    } catch (error) { next(error); }
  }
);

export default router;
