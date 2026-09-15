import { Router, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { recordAuditLog } from '../middleware/audit.middleware';

const router = Router();

router.use(authenticateJwt);

// 1. Export All Personal Data (GDPR / DPDP Compliance)
router.get(
  '/export',
  recordAuditLog('EXPORT_PERSONAL_DATA', 'User'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          consents: true,
          studentProfile: {
            include: {
              checkins: true,
              assessments: {
                include: { assessment: { select: { code: true, title: true } } },
              },
              appointments: {
                include: { counsellor: { include: { user: { select: { firstName: true, lastName: true } } } } },
              },
              resourceProgress: {
                include: { resource: { select: { title: true, category: true } } },
              },
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User record not found.' },
        });
        return;
      }

      // Strip password hash from export
      const { passwordHash, ...safeUserData } = user;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=mindbridge_export_${userId}.json`);
      res.json({
        exportDate: new Date().toISOString(),
        complianceNotice: 'Generated under Digital Personal Data Protection (DPDP) Act compliance standards.',
        data: safeUserData,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 2. Request Complete Account Deletion
router.post(
  '/delete-request',
  recordAuditLog('REQUEST_ACCOUNT_DELETION', 'User'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;

      // Soft-disable account immediately
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      res.json({
        success: true,
        data: {
          message: 'Account deletion request queued. Your active session has been disabled and data will be permanently expunged according to institutional data retention policy.',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 3. View System Audit Logs (Admin & Super Admin)
router.get(
  '/audit-logs',
  requireRoles(['INSTITUTION_ADMIN', 'SUPER_ADMIN']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100,
        include: {
          user: {
            select: { email: true, role: true, firstName: true, lastName: true },
          },
        },
      });

      res.json({
        success: true,
        data: logs.map(l => ({
          id: l.id,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          performedBy: l.user ? `${l.user.firstName} ${l.user.lastName} (${l.user.role})` : 'System',
          ipAddress: l.ipAddress,
          timestamp: l.timestamp,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
