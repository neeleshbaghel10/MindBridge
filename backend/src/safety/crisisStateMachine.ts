// MINDBRIDGE - Crisis State Machine
// Finite state machine governing the full crisis lifecycle from trigger to resolution and closure

import { CrisisState, CrisisTransitionEvent } from './types';
import { prisma } from '../prisma/client';

export class CrisisStateMachine {
  private static readonly VALID_TRANSITIONS: Record<CrisisState, CrisisState[]> = {
    TRIGGERED: ['ACKNOWLEDGED', 'RESOLVED'], // Can resolve directly if confirmed false alarm
    ACKNOWLEDGED: ['COUNSELLOR_DISPATCHED', 'RESOLVED'],
    COUNSELLOR_DISPATCHED: ['FOLLOWUP_SCHEDULED', 'RESOLVED'],
    FOLLOWUP_SCHEDULED: ['RESOLVED'],
    RESOLVED: ['CLOSED'],
    CLOSED: [],
  };

  /**
   * Checks if a transition between two crisis states is allowed
   */
  static canTransition(from: CrisisState, to: CrisisState): boolean {
    const allowed = this.VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Executes a validated state machine transition on a CrisisEvent record
   */
  static async transition(options: {
    crisisEventId: string;
    targetState: CrisisState;
    actorUserId?: string;
    notes?: string;
    followUpDate?: Date;
  }): Promise<{ success: boolean; state: CrisisState; error?: string }> {
    const { crisisEventId, targetState, actorUserId, notes, followUpDate } = options;

    const currentEvent = await prisma.crisisEvent.findUnique({
      where: { id: crisisEventId },
    });

    if (!currentEvent) {
      return { success: false, state: 'TRIGGERED', error: 'Crisis event not found' };
    }

    const currentState = currentEvent.status as CrisisState;

    if (!this.canTransition(currentState, targetState)) {
      return {
        success: false,
        state: currentState,
        error: `Invalid crisis state transition from ${currentState} to ${targetState}`,
      };
    }

    const updateData: any = {
      status: targetState,
      notes: notes ? `${currentEvent.notes || ''}\n[${new Date().toISOString()}] ${notes}`.trim() : currentEvent.notes,
    };

    if (targetState === 'COUNSELLOR_DISPATCHED' && actorUserId) {
      // Find counsellor profile if actor is counsellor
      const counsellor = await prisma.counsellorProfile.findUnique({
        where: { userId: actorUserId },
      });
      if (counsellor) {
        updateData.escalatedToCounsellorId = counsellor.id;
      }
    }

    if (targetState === 'FOLLOWUP_SCHEDULED' && followUpDate) {
      updateData.followUpScheduledFor = followUpDate;
    }

    if (targetState === 'RESOLVED') {
      updateData.resolvedAt = new Date();
      updateData.resolutionNotes = notes || 'Resolved by crisis management team.';
    }

    const updated = await prisma.crisisEvent.update({
      where: { id: crisisEventId },
      data: updateData,
    });

    // Also update linked RiskEvent handled flag if resolved or closed
    if (['RESOLVED', 'CLOSED'].includes(targetState)) {
      await prisma.riskEvent.update({
        where: { id: currentEvent.riskEventId },
        data: {
          handled: true,
          handledAt: new Date(),
          escalationStatus: 'RESOLVED',
          followUpStatus: targetState === 'CLOSED' ? 'COMPLETED' : 'IN_PROGRESS',
        },
      });
    }

    return { success: true, state: updated.status as CrisisState };
  }
}
