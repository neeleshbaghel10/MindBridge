import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// [SEC-003 FIX] JWT secret must be explicitly configured via environment variable.
// Falling back to a hardcoded constant in production or development is a critical
// vulnerability that allows offline token forgery with the known secret.
const rawJwtSecret = process.env.JWT_SECRET;
const nodeEnv = process.env.NODE_ENV || 'development';

if (!rawJwtSecret && nodeEnv !== 'test') {
  throw new Error(
    '[SECURITY] JWT_SECRET environment variable is not set. ' +
    'A strong, randomly generated secret (min 64 characters) must be configured before starting the server. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
  );
}

const resolvedJwtSecret =
  rawJwtSecret ||
  'mindbridge_test_only_secret_key_do_not_use_in_production_sih25092';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  jwtSecret: resolvedJwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  aiMockMode: process.env.AI_MOCK_MODE !== 'false',
  crisisHotlineDefault: process.env.DEFAULT_CRISIS_HOTLINE || '14416',
  nationalKiranHotline: process.env.NATIONAL_KIRAN_HOTLINE || '1800-599-0019',
  campusSecurityHotline: process.env.CAMPUS_SECURITY_HOTLINE || '112',
};

