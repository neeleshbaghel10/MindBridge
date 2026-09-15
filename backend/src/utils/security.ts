import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  institutionId: string;
}

export interface ResetTokenPayload {
  userId: string;
  email: string;
  purpose: 'PASSWORD_RESET';
}

export interface VerifyEmailTokenPayload {
  userId: string;
  email: string;
  purpose: 'EMAIL_VERIFICATION';
}

// -------------------------------------------------------------
// 1. PASSWORD HASHING (Bcrypt Cost 12)
// -------------------------------------------------------------
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// -------------------------------------------------------------
// 2. JWT TOKEN ISSUANCE & VERIFICATION
// -------------------------------------------------------------
export const generateToken = (payload: TokenPayload, expiresIn: string | number = '24h'): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: expiresIn as any,
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};

// -------------------------------------------------------------
// 3. PASSWORD RESET TOKENS (15 Minutes Expiration)
// -------------------------------------------------------------
export const generatePasswordResetToken = (userId: string, email: string): string => {
  const payload: ResetTokenPayload = {
    userId,
    email,
    purpose: 'PASSWORD_RESET',
  };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '15m',
  });
};

export const verifyPasswordResetToken = (token: string): ResetTokenPayload => {
  const decoded = jwt.verify(token, config.jwtSecret) as ResetTokenPayload;
  if (decoded.purpose !== 'PASSWORD_RESET') {
    throw new Error('Invalid token purpose');
  }
  return decoded;
};

// -------------------------------------------------------------
// 4. EMAIL VERIFICATION TOKENS (24 Hours Expiration)
// -------------------------------------------------------------
export const generateEmailVerificationToken = (userId: string, email: string): string => {
  const payload: VerifyEmailTokenPayload = {
    userId,
    email,
    purpose: 'EMAIL_VERIFICATION',
  };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '24h',
  });
};

export const verifyEmailVerificationToken = (token: string): VerifyEmailTokenPayload => {
  const decoded = jwt.verify(token, config.jwtSecret) as VerifyEmailTokenPayload;
  if (decoded.purpose !== 'EMAIL_VERIFICATION') {
    throw new Error('Invalid token purpose');
  }
  return decoded;
};

// -------------------------------------------------------------
// 5. TOKEN REVOCATION / BLACKLISTING (In-Memory with TTL)
// -------------------------------------------------------------
class TokenBlacklist {
  private blacklisted = new Map<string, number>();

  add(token: string, expiresAtUnixSec?: number): void {
    const expiresAt = expiresAtUnixSec ? expiresAtUnixSec * 1000 : Date.now() + 24 * 60 * 60 * 1000;
    this.blacklisted.set(token, expiresAt);
    this.cleanup();
  }

  has(token: string): boolean {
    const expiry = this.blacklisted.get(token);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this.blacklisted.delete(token);
      return false;
    }
    return true;
  }

  private cleanup(): void {
    if (this.blacklisted.size > 5000) {
      const now = Date.now();
      for (const [t, exp] of this.blacklisted.entries()) {
        if (now > exp) this.blacklisted.delete(t);
      }
    }
  }
}

export const tokenBlacklist = new TokenBlacklist();

// -------------------------------------------------------------
// 6. BRUTE-FORCE LOGIN PROTECTION (Per Identifier/IP)
// -------------------------------------------------------------
interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
  firstAttempt: number;
}

class LoginAttemptTracker {
  private attempts = new Map<string, AttemptRecord>();
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW_MS = 15 * 60 * 1000;   // 15 minutes window

  isLocked(identifier: string): { locked: boolean; lockTimeRemainingSec: number } {
    const rec = this.attempts.get(identifier.toLowerCase());
    if (!rec || !rec.lockedUntil) {
      return { locked: false, lockTimeRemainingSec: 0 };
    }
    const remainingMs = rec.lockedUntil - Date.now();
    if (remainingMs > 0) {
      return { locked: true, lockTimeRemainingSec: Math.ceil(remainingMs / 1000) };
    }
    // Lockout has expired; reset
    this.attempts.delete(identifier.toLowerCase());
    return { locked: false, lockTimeRemainingSec: 0 };
  }

  recordFailure(identifier: string): { locked: boolean; remainingAttempts: number; lockTimeRemainingSec?: number } {
    const key = identifier.toLowerCase();
    const now = Date.now();
    let rec = this.attempts.get(key);

    if (!rec || (now - rec.firstAttempt > this.ATTEMPT_WINDOW_MS && !rec.lockedUntil)) {
      rec = { count: 1, lockedUntil: null, firstAttempt: now };
      this.attempts.set(key, rec);
      return { locked: false, remainingAttempts: this.MAX_ATTEMPTS - 1 };
    }

    rec.count += 1;
    if (rec.count >= this.MAX_ATTEMPTS) {
      rec.lockedUntil = now + this.LOCKOUT_DURATION_MS;
      return {
        locked: true,
        remainingAttempts: 0,
        lockTimeRemainingSec: Math.ceil(this.LOCKOUT_DURATION_MS / 1000),
      };
    }

    return {
      locked: false,
      remainingAttempts: Math.max(0, this.MAX_ATTEMPTS - rec.count),
    };
  }

  recordSuccess(identifier: string): void {
    this.attempts.delete(identifier.toLowerCase());
  }
}

export const loginAttemptTracker = new LoginAttemptTracker();

// -------------------------------------------------------------
// 7. PII & SENSITIVE DATA REDACTION
// -------------------------------------------------------------
export const redactSensitiveText = (text: string): string => {
  if (!text) return '';
  return text.replace(/\b\d{10}\b/g, '**********').substring(0, 120);
};

