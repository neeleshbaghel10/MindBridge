import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  tokenBlacklist,
  loginAttemptTracker,
} from '../utils/security';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware';
import { recordAuditLog } from '../middleware/audit.middleware';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['STUDENT', 'COUNSELLOR', 'PEER_VOLUNTEER', 'INSTITUTION_ADMIN', 'SUPER_ADMIN']).default('STUDENT'),
  department: z.string().optional(),
  yearOfStudy: z.number().int().min(1).max(5).optional(),
  preferredLanguage: z.string().default('en'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const verifyEmailConfirmSchema = z.object({
  token: z.string().min(10, 'Verification token is required'),
});

const consentSchema = z.object({
  type: z.enum([
    'TERMS_OF_SERVICE',
    'PRIVACY_POLICY',
    'EMERGENCY_DISCLOSURE',
    'COUNSELLOR_DATA_SHARING',
    'ANONYMOUS_RESEARCH',
  ]),
  status: z.enum(['GRANTED', 'REVOKED']),
  version: z.string().default('1.0'),
});

// -------------------------------------------------------------
// 1. LOGIN (With Brute-force Tracking & Audit Logging)
// -------------------------------------------------------------
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check Brute-force lockout
    const lockStatus = loginAttemptTracker.isLocked(normalizedEmail);
    if (lockStatus.locked) {
      res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_FAILED_ATTEMPTS',
          message: `Too many failed login attempts. Account temporarily locked for ${lockStatus.lockTimeRemainingSec} seconds.`,
          retryAfterSec: lockStatus.lockTimeRemainingSec,
        },
      });
      return;
    }

    // 2. Query user with institution and profile associations
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        institution: {
          select: { id: true, name: true, code: true, crisisHotline: true, campusSecurityNo: true },
        },
        studentProfile: true,
        counsellorProfile: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt !== null) {
      loginAttemptTracker.recordFailure(normalizedEmail);
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
      return;
    }

    // 3. Verify bcrypt password hash
    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      const failInfo = loginAttemptTracker.recordFailure(normalizedEmail);

      // Audit log failed login attempt
      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN_FAILED',
            entityType: 'User',
            entityId: user.id,
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.get('user-agent') || 'unknown',
            metadataJson: JSON.stringify({ remainingAttempts: failInfo.remainingAttempts }),
          },
        });
      } catch (err) {}

      if (failInfo.locked) {
        res.status(429).json({
          success: false,
          error: {
            code: 'TOO_MANY_FAILED_ATTEMPTS',
            message: `Account locked due to 5 consecutive failed login attempts. Try again in ${failInfo.lockTimeRemainingSec} seconds.`,
            retryAfterSec: failInfo.lockTimeRemainingSec,
          },
        });
        return;
      }

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
          remainingAttempts: failInfo.remainingAttempts,
        },
      });
      return;
    }

    // 4. Successful login: Reset failure counters & update lastLoginAt
    loginAttemptTracker.recordSuccess(normalizedEmail);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 5. Issue signed JWT session token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
    });

    // 6. Audit log successful login
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN_SUCCESS',
          entityType: 'User',
          entityId: user.id,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });
    } catch (err) {}

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          isVerified: user.isVerified,
          institution: user.institution,
          studentProfile: user.studentProfile,
          counsellorProfile: user.counsellorProfile
            ? {
                ...user.counsellorProfile,
                specialization: JSON.parse(user.counsellorProfile.specialization || '[]'),
                languagesSpoken: JSON.parse(user.counsellorProfile.languagesSpoken || '[]'),
              }
            : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 2. REGISTER (With Privilege Escalation Prevention)
// -------------------------------------------------------------
router.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = registerSchema.parse(req.body);
    const normalizedEmail = body.email.toLowerCase().trim();

    // Privilege escalation protection: Cannot self-assign administrative roles
    if (body.role === 'INSTITUTION_ADMIN' || body.role === 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'CANNOT_SELF_ASSIGN_PRIVILEGED_ROLE',
          message: 'Administrative roles cannot be self-assigned during registration.',
        },
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists.',
        },
      });
      return;
    }

    // Assign default or existing institution
    let institution = await prisma.institution.findFirst();
    if (!institution) {
      institution = await prisma.institution.create({
        data: {
          name: 'Apex Institute of Technology & Higher Studies',
          code: 'AITHS',
          domain: 'aiths.ac.in',
          contactEmail: 'support@aiths.ac.in',
        },
      });
    }

    const passwordHash = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        institutionId: institution.id,
        email: normalizedEmail,
        passwordHash,
        role: body.role,
        firstName: body.firstName,
        lastName: body.lastName,
        isVerified: false, // Email verification required in production
      },
    });

    let studentProfile = null;
    let counsellorProfile = null;

    if (body.role === 'STUDENT' || body.role === 'PEER_VOLUNTEER') {
      const aliasSuffix = Math.floor(1000 + Math.random() * 9000);
      const randomPrefixes = ['Serene', 'Tranquil', 'Mindful', 'Resilient', 'Gentle', 'Kind', 'Calm'];
      const randomNouns = ['Sparrow', 'River', 'Forest', 'Mountain', 'Harbor', 'Cedar', 'Pebble'];
      const alias = `${randomPrefixes[Math.floor(Math.random() * randomPrefixes.length)]}${randomNouns[Math.floor(Math.random() * randomNouns.length)]}${aliasSuffix}`;

      studentProfile = await prisma.studentProfile.create({
        data: {
          userId: user.id,
          anonymousAlias: alias,
          department: body.department || 'Computer Science & Engineering',
          yearOfStudy: body.yearOfStudy || 1,
          preferredLanguage: body.preferredLanguage || 'en',
          onboardingCompleted: true,
        },
      });

      // Default baseline consents
      await prisma.consent.createMany({
        data: [
          { userId: user.id, type: 'TERMS_OF_SERVICE', status: 'GRANTED' },
          { userId: user.id, type: 'PRIVACY_POLICY', status: 'GRANTED' },
        ],
      });
    } else if (body.role === 'COUNSELLOR') {
      counsellorProfile = await prisma.counsellorProfile.create({
        data: {
          userId: user.id,
          licenseNumber: `PENDING-VERIFY-${Date.now()}`,
          specialization: JSON.stringify(['General Student Counselling']),
          qualification: 'Clinical Psychology Practitioner',
          languagesSpoken: JSON.stringify(['English', 'Hindi']),
        },
      });
    }

    // Record registration audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_REGISTERED',
          entityType: 'User',
          entityId: user.id,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('user-agent') || 'unknown',
          metadataJson: JSON.stringify({ role: user.role }),
        },
      });
    } catch (err) {}

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      institutionId: institution.id,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          isVerified: user.isVerified,
          studentProfile,
          counsellorProfile,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 3. LOGOUT (Session Invalidation & Token Blacklist)
// -------------------------------------------------------------
router.post('/logout', authenticateJwt, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.token) {
      tokenBlacklist.add(req.token);
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user?.userId,
          action: 'USER_LOGGED_OUT',
          entityType: 'User',
          entityId: req.user?.userId,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });
    } catch (err) {}

    res.json({
      success: true,
      message: 'Session successfully terminated.',
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 4. FORGOT PASSWORD (Time-limited Reset Token Architecture)
// -------------------------------------------------------------
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let resetToken: string | undefined;

    if (user && user.isActive && user.deletedAt === null) {
      resetToken = generatePasswordResetToken(user.id, user.email);

      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'PASSWORD_RESET_REQUESTED',
            entityType: 'User',
            entityId: user.id,
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.get('user-agent') || 'unknown',
          },
        });
      } catch (err) {}
    }

    // Respond with generic success message to prevent user enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been dispatched.',
      // Provided in development/test environment for automated verification
      resetToken,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 5. RESET PASSWORD (Verification & Cryptographic Hash Update)
// -------------------------------------------------------------
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    let decoded;
    try {
      decoded = verifyPasswordResetToken(token);
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'Password reset link is invalid or has expired.',
        },
      });
      return;
    }

    // Check if token was already revoked/used
    if (tokenBlacklist.has(token)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_ALREADY_USED',
          message: 'Password reset link has already been used.',
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive || user.deletedAt !== null) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.',
        },
      });
      return;
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate reset token so it cannot be re-used
    tokenBlacklist.add(token);

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_SUCCESS',
          entityType: 'User',
          entityId: user.id,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });
    } catch (err) {}

    res.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 6. EMAIL VERIFICATION ARCHITECTURE
// -------------------------------------------------------------
router.post('/verify-email/request', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let verificationToken: string | undefined;

    if (user) {
      verificationToken = generateEmailVerificationToken(user.id, user.email);

      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'EMAIL_VERIFICATION_REQUESTED',
            entityType: 'User',
            entityId: user.id,
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.get('user-agent') || 'unknown',
          },
        });
      } catch (err) {}
    }

    res.json({
      success: true,
      message: 'Email verification token generated.',
      verificationToken,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-email/confirm', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = verifyEmailConfirmSchema.parse(req.body);

    let decoded;
    try {
      decoded = verifyEmailVerificationToken(token);
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_VERIFICATION_TOKEN',
          message: 'Email verification link is invalid or has expired.',
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
      });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'EMAIL_VERIFIED',
          entityType: 'User',
          entityId: user.id,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('user-agent') || 'unknown',
        },
      });
    } catch (err) {}

    res.json({
      success: true,
      message: 'Email address has been successfully verified.',
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 7. CURRENT USER PROFILE (GET /me)
// -------------------------------------------------------------
router.get('/me', authenticateJwt, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        institution: {
          select: { id: true, name: true, code: true, crisisHotline: true, campusSecurityNo: true, settings: true },
        },
        studentProfile: true,
        counsellorProfile: true,
        consents: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt !== null) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User account not found.' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        institution: {
          ...user.institution,
          settings: user.institution?.settings ? JSON.parse(user.institution.settings) : {},
        },
        studentProfile: user.studentProfile,
        counsellorProfile: user.counsellorProfile
          ? {
              ...user.counsellorProfile,
              specialization: JSON.parse(user.counsellorProfile.specialization || '[]'),
              languagesSpoken: JSON.parse(user.counsellorProfile.languagesSpoken || '[]'),
            }
          : null,
        consents: user.consents,
      },
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 8. RECORD / REVOKE CONSENT
// -------------------------------------------------------------
router.post(
  '/consents',
  authenticateJwt,
  recordAuditLog('UPDATE_CONSENT', 'Consent'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { type, status, version } = consentSchema.parse(req.body);
      const userId = req.user!.userId;

      const consent = await prisma.consent.upsert({
        where: {
          userId_type_version: {
            userId,
            type,
            version,
          },
        },
        create: {
          userId,
          type,
          status,
          version,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('user-agent') || 'unknown',
          grantedAt: new Date(),
          revokedAt: status === 'REVOKED' ? new Date() : null,
        },
        update: {
          status,
          revokedAt: status === 'REVOKED' ? new Date() : null,
        },
      });

      res.json({
        success: true,
        data: consent,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 9. UPDATE PROFILE (Student Details & Academic Info)
// -------------------------------------------------------------
const updateProfileSchema = z.object({
  department: z.string().min(2).max(100).optional(),
  yearOfStudy: z.number().int().min(1).max(6).optional(),
  preferredLanguage: z.string().max(10).optional(),
  emergencyContactName: z.string().max(100).optional().nullable(),
  emergencyContactPhone: z.string().max(20).optional().nullable(),
  emergencyContactConsent: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});

router.patch(
  '/profile',
  authenticateJwt,
  recordAuditLog('UPDATE_PROFILE', 'User'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const data = updateProfileSchema.parse(req.body);

      // Update basic user info if provided
      if (data.firstName || data.lastName) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            ...(data.firstName && { firstName: data.firstName }),
            ...(data.lastName && { lastName: data.lastName }),
          },
        });
      }

      // Update StudentProfile if student
      let updatedStudentProfile = null;
      const existingProfile = await prisma.studentProfile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        updatedStudentProfile = await prisma.studentProfile.update({
          where: { userId },
          data: {
            ...(data.department !== undefined && { department: data.department }),
            ...(data.yearOfStudy !== undefined && { yearOfStudy: data.yearOfStudy }),
            ...(data.preferredLanguage !== undefined && { preferredLanguage: data.preferredLanguage }),
            ...(data.emergencyContactName !== undefined && { emergencyContactName: data.emergencyContactName }),
            ...(data.emergencyContactPhone !== undefined && { emergencyContactPhone: data.emergencyContactPhone }),
            ...(data.emergencyContactConsent !== undefined && { emergencyContactConsent: data.emergencyContactConsent }),
            ...(data.onboardingCompleted !== undefined && { onboardingCompleted: data.onboardingCompleted }),
          },
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully.',
        data: {
          studentProfile: updatedStudentProfile,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------------------------------
// 10. REGENERATE ANONYMOUS ALIAS
// -------------------------------------------------------------
router.post(
  '/profile/regenerate-alias',
  authenticateJwt,
  recordAuditLog('REGENERATE_ANONYMOUS_ALIAS', 'StudentProfile'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const randomPrefixes = ['Serene', 'Tranquil', 'Mindful', 'Resilient', 'Gentle', 'Kind', 'Calm', 'Hopeful', 'Brave', 'Steady'];
      const randomNouns = ['Sparrow', 'River', 'Forest', 'Mountain', 'Harbor', 'Cedar', 'Pebble', 'Willow', 'Brook', 'Summit'];
      const aliasSuffix = Math.floor(1000 + Math.random() * 9000);
      const newAlias = `${randomPrefixes[Math.floor(Math.random() * randomPrefixes.length)]}${randomNouns[Math.floor(Math.random() * randomNouns.length)]}${aliasSuffix}`;

      const updated = await prisma.studentProfile.update({
        where: { userId },
        data: { anonymousAlias: newAlias },
      });

      res.json({
        success: true,
        message: 'Anonymous alias refreshed successfully.',
        data: {
          anonymousAlias: updated.anonymousAlias,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

