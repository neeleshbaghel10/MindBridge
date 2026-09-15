import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '../prisma/client';

export const recordAuditLog = (action: string, entityType: string, getEntityId?: (req: AuthenticatedRequest) => string | undefined) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // Execute audit logging after response finishes
    res.on('finish', async () => {
      // Only log successful or sensitive actions (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const entityId = getEntityId ? getEntityId(req) : (req.params.id ? String(req.params.id) : undefined);
          await prisma.auditLog.create({
            data: {
              userId: req.user?.userId || null,
              action,
              entityType,
              entityId,
              ipAddress: String(req.ip || req.socket.remoteAddress || '127.0.0.1'),
              userAgent: req.get('user-agent') || 'unknown',
              metadataJson: JSON.stringify({
                path: req.originalUrl,
                method: req.method,
                status: res.statusCode,
              }),
            },
          });
        } catch (err) {
          // Silent catch to prevent audit failure from crashing main response
          console.error('AuditLog writing failed:', err);
        }
      }
    });

    next();
  };
};
