// MINDBRIDGE - Risk Event & Safety Audit Service
// Persists and tracks all risk events, audit information, and crisis follow-up lifecycles

import { RiskEventAuditData, RiskLevelTier, CrisisState } from './types';
import { CrisisStateMachine } from './crisisStateMachine';
import { prisma } from '../prisma/client';

export class RiskEventService {
  /**
   * Records a full risk event record with complete audit fields
   */
  static async logRiskEvent(data: RiskEventAuditData): Promise<{
    riskEventId: string;
    crisisEventId?: string;
  }> {
    const {
      studentProfileId,
      riskLevel,
      triggerType,
      source,
      actionTaken,
      escalationStatus,
      followUpStatus,
      triggerSnippetRedacted,
      sessionId,
      ipAddress,
      userAgent,
      metadata,
    } = data;

    // Construct minimal necessary audit information
    const auditPayload = {
      ipAddress: ipAddress || 'INTERNAL_SERVICE',
      userAgent: userAgent ? userAgent.slice(0, 100) : 'APP_SESSION',
      loggedAt: new Date().toISOString(),
      source,
      metadata: metadata || {},
    };

    // 1. Create RiskEvent
    const riskEvent = await prisma.riskEvent.create({
      data: {
        studentProfileId,
        sessionId,
        riskCategory: triggerType,
        riskScore: riskLevel === 'LEVEL_4' ? 1.0 : riskLevel === 'LEVEL_3' ? 0.8 : riskLevel === 'LEVEL_2' ? 0.5 : 0.2,
        riskLevel,
        triggerType,
        source,
        actionTaken,
        escalationStatus,
        followUpStatus,
        auditInfoJson: JSON.stringify(auditPayload),
        triggerSnippetRedacted: triggerSnippetRedacted.slice(0, 200),
        handled: ['LEVEL_0', 'LEVEL_1', 'LEVEL_2'].includes(riskLevel), // Auto-handled for non-crisis
        handledAt: ['LEVEL_0', 'LEVEL_1', 'LEVEL_2'].includes(riskLevel) ? new Date() : null,
      },
    });

    let crisisEventId: string | undefined = undefined;

    // 2. If LEVEL_3 or LEVEL_4, instantiate CrisisEvent and queue institutional follow-up
    if (['LEVEL_3', 'LEVEL_4'].includes(riskLevel)) {
      const followUpDate = new Date();
      followUpDate.setHours(followUpDate.getHours() + (riskLevel === 'LEVEL_4' ? 4 : 24));

      const crisisEvent = await prisma.crisisEvent.create({
        data: {
          riskEventId: riskEvent.id,
          status: 'TRIGGERED',
          helplineProvided: true,
          followUpScheduledFor: followUpDate,
          notes: `Automated crisis event initialized at ${riskLevel}. Initialized via ${source}. Follow-up queued for ${followUpDate.toISOString()}`,
        },
      });

      crisisEventId = crisisEvent.id;
    }

    return { riskEventId: riskEvent.id, crisisEventId };
  }

  /**
   * Queries the number of recent crisis events for a student within a given hour window
   */
  static async getStudentRecentCrisisCount(studentProfileId: string, hours: number = 24): Promise<number> {
    if (!studentProfileId) return 0;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    return await prisma.riskEvent.count({
      where: {
        studentProfileId,
        riskLevel: { in: ['LEVEL_3', 'LEVEL_4'] },
        createdAt: { gte: cutoff },
      },
    });
  }

  /**
   * Transitions a crisis event state using the formal state machine
   */
  static async transitionCrisis(options: {
    crisisEventId: string;
    targetState: CrisisState;
    actorUserId?: string;
    notes?: string;
    followUpDate?: Date;
  }) {
    return await CrisisStateMachine.transition(options);
  }

  /**
   * Retrieves active, unhandled crisis events for the campus clinical dashboard
   */
  static async getActiveCrisisEvents() {
    return await prisma.crisisEvent.findMany({
      where: {
        status: { in: ['TRIGGERED', 'ACKNOWLEDGED', 'COUNSELLOR_DISPATCHED', 'FOLLOWUP_SCHEDULED'] },
      },
      include: {
        riskEvent: {
          include: {
            studentProfile: {
              select: { id: true, anonymousAlias: true, department: true, yearOfStudy: true },
            },
          },
        },
        escalatedToCounsellor: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
