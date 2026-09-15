import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { getEmergencyHelplines } from '../services/safety.service';
import { defaultPfaPipeline, ConversationTurn } from '../ai';
import { recordAuditLog } from '../middleware/audit.middleware';

const router = Router();

router.use(authenticateJwt);
router.use(requireRoles(['STUDENT', 'PEER_VOLUNTEER']));

const messageSchema = z.object({
  content: z.string().min(1).max(2000),
});

// 1. Get or create active chat session
router.post('/sessions', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentProfileId = req.user?.studentProfileId;
    if (!studentProfileId) {
      res.status(400).json({
        success: false,
        error: { code: 'PROFILE_REQUIRED', message: 'Student profile required.' },
      });
      return;
    }

    // Find recent active session (within 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let session = await prisma.chatSession.findFirst({
      where: {
        studentProfileId,
        status: 'ACTIVE',
        lastActivityAt: { gte: twentyFourHoursAgo },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          studentProfileId,
          title: 'Support & Grounding Session',
          status: 'ACTIVE',
        },
        include: {
          messages: true,
        },
      });

      // Seed initial welcoming message from MindBridge AI
      const initialWelcome = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          sender: 'AI_ASSISTANT',
          content: 'Hello. I am MINDBRIDGE, your confidential student wellbeing companion. I am here to listen, offer grounding tools, and support you through campus stress. How are you feeling right now?',
          flagsJson: JSON.stringify({ isWelcome: true }),
        },
      });

      session.messages = [initialWelcome];
    }

    res.json({
      success: true,
      data: {
        id: session.id,
        title: session.title,
        status: session.status,
        messages: session.messages.map(m => ({
          id: m.id,
          sender: m.sender,
          content: m.content,
          riskDetected: m.riskDetected,
          flags: m.flagsJson ? JSON.parse(m.flagsJson) : {},
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 2. Post a message to session with Deterministic Crisis Interception
router.post('/sessions/:id/messages', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = String(req.params.id);
    const studentProfileId = req.user?.studentProfileId;
    const { content } = messageSchema.parse(req.body);

    const sessionWithMessages = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!sessionWithMessages || sessionWithMessages.studentProfileId !== studentProfileId) {
      res.status(404).json({
        success: false,
        error: { code: 'SESSION_NOT_FOUND', message: 'Chat session not found or unauthorized.' },
      });
      return;
    }

    // Extract messages before any narrowing operations
    const recentMessages = sessionWithMessages.messages;

    // Process through the MindBridge AI Psychological First-Aid Assistant Pipeline
    const historyTurns: ConversationTurn[] = recentMessages.slice().reverse().map((m: { sender: string; content: string }) => ({
      sender: m.sender === 'USER' ? 'STUDENT' : 'AI_ASSISTANT',
      content: m.content,
    }));

    const institutionId = req.user?.institutionId;
    const pipelineResult = await defaultPfaPipeline.processStudentMessage(
      content,
      historyTurns,
      studentProfileId,
      institutionId
    );

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        sender: 'USER',
        content,
        riskDetected: pipelineResult.isCrisis || pipelineResult.riskLevel === 'MODERATE',
        flagsJson: JSON.stringify({
          intent: pipelineResult.intent,
          riskLevel: pipelineResult.riskLevel,
        }),
      },
    });

    if (pipelineResult.isCrisis) {
      // Save deterministic Crisis System Message
      const crisisSystemMsg = await prisma.chatMessage.create({
        data: {
          sessionId,
          sender: 'CRISIS_SYSTEM',
          content: pipelineResult.message,
          riskDetected: true,
          flagsJson: JSON.stringify({
            isCrisisBanner: true,
            helplines: pipelineResult.helplines,
            suggestedAction: pipelineResult.suggestedAction,
          }),
        },
      });

      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { status: 'ESCALATED', lastActivityAt: new Date() },
      });

      res.status(200).json({
        success: true,
        data: {
          isCrisis: true,
          userMessage: {
            id: userMessage.id,
            sender: userMessage.sender,
            content: userMessage.content,
            createdAt: userMessage.createdAt,
          },
          aiResponse: {
            id: crisisSystemMsg.id,
            sender: crisisSystemMsg.sender,
            content: crisisSystemMsg.content,
            riskDetected: true,
            flags: JSON.parse(crisisSystemMsg.flagsJson!),
            createdAt: crisisSystemMsg.createdAt,
          },
          emergencyHelplines: pipelineResult.helplines,
        },
      });
      return;
    }

    // Safe / Non-Crisis Response
    const aiMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        sender: 'AI_ASSISTANT',
        content: pipelineResult.message,
        riskDetected: pipelineResult.riskLevel === 'MODERATE',
        flagsJson: JSON.stringify({
          intent: pipelineResult.intent,
          groundingExercise: pipelineResult.groundingExercise,
          suggestedAction: pipelineResult.suggestedAction,
          counsellorReferralPrompt: pipelineResult.counsellorReferralPrompt,
          recommendedResources: pipelineResult.recommendedResources,
          safetyFlags: pipelineResult.safetyFlags,
        }),
      },
    });

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });

    res.json({
      success: true,
      data: {
        isCrisis: false,
        userMessage: {
          id: userMessage.id,
          sender: userMessage.sender,
          content: userMessage.content,
          createdAt: userMessage.createdAt,
        },
        aiResponse: {
          id: aiMessage.id,
          sender: aiMessage.sender,
          content: aiMessage.content,
          riskDetected: aiMessage.riskDetected,
          intent: pipelineResult.intent,
          groundingExercise: pipelineResult.groundingExercise,
          suggestedAction: pipelineResult.suggestedAction,
          counsellorReferralPrompt: pipelineResult.counsellorReferralPrompt,
          recommendedResources: pipelineResult.recommendedResources,
          createdAt: aiMessage.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// 3. Explicit 1-Click SOS Emergency Button
router.post(
  '/crisis/sos',
  recordAuditLog('TRIGGER_SOS', 'CrisisEvent'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentProfileId = req.user?.studentProfileId;
      if (!studentProfileId) {
        res.status(400).json({
          success: false,
          error: { code: 'PROFILE_REQUIRED', message: 'Student profile required.' },
        });
        return;
      }

      // Record RiskEvent & CrisisEvent — use 'PANIC' (valid schema category); SOS origin noted in snippet
      const riskEvent = await prisma.riskEvent.create({
        data: {
          studentProfileId,
          riskCategory: 'PANIC',
          riskScore: 1.0,
          riskLevel: 'CRISIS',
          triggerSnippetRedacted: '[SOS-BUTTON] Student pressed explicit 1-Click Emergency SOS button.',
          handled: false,
        },
      });

      const crisisEvent = await prisma.crisisEvent.create({
        data: {
          riskEventId: riskEvent.id,
          status: 'TRIGGERED',
          helplineProvided: true,
          notes: 'Direct SOS button pressed from student portal.',
        },
      });

      res.json({
        success: true,
        data: {
          crisisEventId: crisisEvent.id,
          helplines: getEmergencyHelplines(),
          campusSecurityContact: '+91-11-2099-0112',
          immediateGuidance: [
            'You are not alone. Help is available right now.',
            'If you are in physical danger, please dial 112 or contact campus security immediately.',
            'Speak with a trained listener free of cost at Tele-MANAS (14416) or KIRAN (1800-599-0019).',
            'Our campus counselling team has been notified for a priority check-in.',
          ],
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
