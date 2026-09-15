import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken, TokenPayload, tokenBlacklist } from '../utils/security';
import { prisma } from '../prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload & {
    studentProfileId?: string;
    counsellorProfileId?: string;
  };
  token?: string;
}

export const authenticateJwt = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authorization token missing or malformed.',
        },
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // 1. Check if token was revoked via logout
    if (tokenBlacklist.has(token)) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REVOKED',
          message: 'Session has been invalidated. Please log in again.',
        },
      });
      return;
    }

    // 2. Cryptographic token verification
    let decoded: TokenPayload;
    try {
      decoded = verifyToken(token);
    } catch (err: any) {
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Session token has expired. Please re-authenticate.',
          },
        });
        return;
      }
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: 'Invalid or tampered session token.',
        },
      });
      return;
    }

    // 3. Independent backend database verification (User exists, isActive, not soft-deleted)
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        isActive: true,
        deletedAt: true,
        studentProfile: { select: { id: true } },
        counsellorProfile: { select: { id: true } },
      },
    });

    if (!dbUser || !dbUser.isActive || dbUser.deletedAt !== null) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_DEACTIVATED',
          message: 'Account is deactivated, deleted, or does not exist.',
        },
      });
      return;
    }

    // Ensure token role matches current database role (prevent stale privileges)
    if (dbUser.role !== decoded.role) {
      decoded.role = dbUser.role;
    }

    req.user = {
      ...decoded,
      studentProfileId: dbUser.studentProfile?.id,
      counsellorProfileId: dbUser.counsellorProfile?.id,
    };
    req.token = token;

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: 'Failed to authenticate request.',
      },
    });
  }
};

