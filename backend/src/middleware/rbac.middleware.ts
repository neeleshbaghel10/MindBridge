import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '../prisma/client';

export type UserRole = 'STUDENT' | 'COUNSELLOR' | 'PEER_VOLUNTEER' | 'INSTITUTION_ADMIN' | 'SUPER_ADMIN';

export const requireRoles = (allowedRoles: (UserRole | string)[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required before role verification.',
        },
      });
      return;
    }

    const userRole = req.user.role as UserRole;

    // SUPER_ADMIN has global root authorization
    if (userRole === 'SUPER_ADMIN') {
      next();
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      // Log unauthorized escalation attempt asynchronously to AuditLog
      try {
        await prisma.auditLog.create({
          data: {
            userId: req.user.userId,
            action: 'UNAUTHORIZED_ROLE_ESCALATION_ATTEMPT',
            entityType: 'Endpoint',
            entityId: req.originalUrl,
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.get('user-agent') || 'unknown',
            metadataJson: JSON.stringify({
              userRole,
              requiredRoles: allowedRoles,
              path: req.originalUrl,
              method: req.method,
            }),
          },
        });
      } catch (err) {
        // Non-blocking
      }

      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Access denied. Role '${userRole}' lacks sufficient privileges for this operation. Required: [${allowedRoles.join(', ')}]`,
        },
      });
      return;
    }

    next();
  };
};

