import { Router, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { recordAuditLog } from '../middleware/audit.middleware';
import { AnalyticsService } from '../analytics/analyticsService';

const router = Router();

router.use(authenticateJwt);
router.use(requireRoles(['INSTITUTION_ADMIN', 'SUPER_ADMIN']));

// 1. Campus Overview & Executive KPIs
router.get(
  '/overview',
  recordAuditLog('VIEW_INSTITUTIONAL_ANALYTICS', 'AnalyticsOverview'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const institutionId = req.user!.institutionId;
      if (!institutionId) {
        res.status(400).json({ success: false, error: { code: 'INSTITUTION_REQUIRED' } });
        return;
      }

      const range = req.query.range as any;
      const department = req.query.department as string | undefined;
      const yearOfStudy = req.query.yearOfStudy ? Number(req.query.yearOfStudy) : undefined;

      const data = await AnalyticsService.getCampusOverview(institutionId, {
        range,
        department,
        yearOfStudy,
      });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

// 2. Time-Based Trend Analysis
router.get(
  '/trends',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const institutionId = req.user!.institutionId;
      if (!institutionId) {
        res.status(400).json({ success: false, error: { code: 'INSTITUTION_REQUIRED' } });
        return;
      }

      const range = (req.query.range as string) || '30d';
      const data = await AnalyticsService.getTimeSeriesTrends(institutionId, range);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

// 3. Clinical Assessment Severity Distributions
router.get(
  '/assessments',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const institutionId = req.user!.institutionId;
      if (!institutionId) {
        res.status(400).json({ success: false, error: { code: 'INSTITUTION_REQUIRED' } });
        return;
      }

      const data = await AnalyticsService.getAssessmentAnalytics(institutionId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

// 4. Anonymous Demographic Breakdowns (k-Anonymity Protected)
router.get(
  '/breakdowns',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const institutionId = req.user!.institutionId;
      if (!institutionId) {
        res.status(400).json({ success: false, error: { code: 'INSTITUTION_REQUIRED' } });
        return;
      }

      const data = await AnalyticsService.getDemographicBreakdowns(institutionId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

// 5. Downloadable Privacy-Preserving Report Export
router.get(
  '/export',
  recordAuditLog('EXPORT_ANALYTICS_REPORT', 'AnalyticsReport'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const institutionId = req.user!.institutionId;
      if (!institutionId) {
        res.status(400).json({ success: false, error: { code: 'INSTITUTION_REQUIRED' } });
        return;
      }

      const format = (req.query.format as 'csv' | 'json') || 'json';
      const result = await AnalyticsService.generateExportReport(institutionId, format);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } catch (error) {
      next(error);
    }
  }
);

// 6. Administrative Audit Trail
router.get(
  '/audit',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const take = Math.min(Number(req.query.limit || 50), 100);
      const skip = Number(req.query.skip || 0);

      const [logs, totalCount] = await Promise.all([
        prisma.auditLog.findMany({
          orderBy: { timestamp: 'desc' },
          take,
          skip,
          include: {
            user: { select: { email: true, role: true } },
          },
        }),
        prisma.auditLog.count(),
      ]);

      const mapped = logs.map(l => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        performedBy: l.user ? `${l.user.role} (${l.user.email})` : 'SYSTEM',
        ipAddress: l.ipAddress || '127.0.0.1',
        timestamp: l.timestamp,
      }));

      res.json({
        success: true,
        data: {
          logs: mapped,
          totalCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
