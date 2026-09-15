import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import checkinRoutes from './routes/checkin.routes';
import assessmentRoutes from './routes/assessment.routes';
import aiChatRoutes from './routes/aichat.routes';
import counsellorRoutes from './routes/counsellor.routes';
import appointmentRoutes from './routes/appointment.routes';
import peerRoutes from './routes/peer.routes';
import moderationRoutes from './routes/moderation.routes';
import resourceRoutes from './routes/resource.routes';
import analyticsRoutes from './routes/analytics.routes';
import privacyRoutes from './routes/privacy.routes';
import notificationRoutes from './routes/notification.routes';

const app = express();

// [SEC-009 FIX] Hardened security headers via Helmet.
// crossOriginResourcePolicy is set to 'same-site' (not 'cross-origin') to prevent
// embedding of API responses in cross-origin contexts.
// Content-Security-Policy blocks inline scripts, restricts frame embedding, and limits fetch sources.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,      // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
}));

// [SEC-009 FIX] CORS — validate origin against explicit allowlist.
// Wildcard-style origins or mutable arrays without validation can allow
// unexpected cross-origin access in misconfigured environments.
const ALLOWED_ORIGINS = new Set([
  config.corsOrigin,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
]);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl in test)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin '${origin}' not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


// Body Parsers
// [SEC-004 FIX] Reduced JSON body limit from 2mb to 100kb to prevent memory-exhaustion DoS
// via intentionally oversized request payloads.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));


// Global Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. Please slow down your requests.',
    },
  },
});

app.use('/api', apiLimiter);

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'HEALTHY',
      service: 'MINDBRIDGE-API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

// API Routes Mounting
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/checkins', checkinRoutes);
app.use('/api/v1/assessments', assessmentRoutes);
app.use('/api/v1/ai-chat', aiChatRoutes);
app.use('/api/v1/counsellors', counsellorRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/peer-support', peerRoutes);
app.use('/api/v1/moderation', moderationRoutes);
app.use('/api/v1/resources', resourceRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/privacy', privacyRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`\n============================================================`);
    console.log(`🚀 MINDBRIDGE Server active on http://localhost:${config.port}`);
    console.log(`🛡️  Crisis & Safety Interceptor: ONLINE`);
    console.log(`🔒 RBAC & Zero-PII Shield: ONLINE`);
    console.log(`============================================================\n`);
  });
}

export default app;
