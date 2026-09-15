// MINDBRIDGE - APPOINTMENT FINITE STATE MACHINE
// Enforces deterministic clinical appointment state transitions, authorization, and cancellation rules

import {
  AppointmentState,
  AppointmentTransitionInput,
  AppointmentTransitionResult,
} from './types';

export class AppointmentStateMachine {
  /**
   * Defines valid state transitions and the roles authorized to execute them.
   */
  private static readonly TRANSITION_RULES: Record<
    AppointmentState,
    Partial<Record<AppointmentState, string[]>>
  > = {
    REQUESTED: {
      CONFIRMED: ['COUNSELLOR', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
      CANCELLED: ['STUDENT', 'COUNSELLOR', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
      RESCHEDULED: ['STUDENT', 'COUNSELLOR', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
    },
    CONFIRMED: {
      RESCHEDULED: ['STUDENT', 'COUNSELLOR', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
      COMPLETED: ['COUNSELLOR', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
      CANCELLED: ['STUDENT', 'COUNSELLOR', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
      NO_SHOW: ['COUNSELLOR', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
    },
    RESCHEDULED: {
      CONFIRMED: ['COUNSELLOR', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
      RESCHEDULED: ['STUDENT', 'COUNSELLOR', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
      COMPLETED: ['COUNSELLOR', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
      CANCELLED: ['STUDENT', 'COUNSELLOR', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
      NO_SHOW: ['COUNSELLOR', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
    },
    // Terminal states cannot transition to any other state
    COMPLETED: {},
    CANCELLED: {},
    NO_SHOW: {},
  };

  /**
   * Terminal states in the appointment lifecycle.
   */
  public static readonly TERMINAL_STATES: ReadonlySet<AppointmentState> = new Set([
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
  ]);

  /**
   * Check if a transition is structurally possible regardless of actor.
   */
  public static isTransitionPossible(current: AppointmentState, target: AppointmentState): boolean {
    if (this.TERMINAL_STATES.has(current)) {
      return false;
    }
    const allowedTargets = this.TRANSITION_RULES[current];
    return !!allowedTargets && target in allowedTargets;
  }

  /**
   * Check if an actor role is authorized to execute a transition.
   */
  public static isRoleAuthorized(
    current: AppointmentState,
    target: AppointmentState,
    role: string
  ): boolean {
    const allowedTargets = this.TRANSITION_RULES[current];
    if (!allowedTargets || !allowedTargets[target]) {
      return false;
    }
    return allowedTargets[target]!.includes(role);
  }

  /**
   * Comprehensive validation of a requested appointment transition.
   */
  public static validateTransition(input: AppointmentTransitionInput): AppointmentTransitionResult {
    const { currentStatus, targetStatus, actorRole, reason, newScheduledAt } = input;

    // 1. Terminal state check
    if (this.TERMINAL_STATES.has(currentStatus)) {
      return {
        allowed: false,
        targetStatus,
        errorMessage: `Cannot transition from terminal state ${currentStatus}. Once an appointment is ${currentStatus.toLowerCase()}, its status is final.`,
      };
    }

    // 2. Same state transition check
    if (currentStatus === targetStatus && targetStatus !== 'RESCHEDULED') {
      return {
        allowed: false,
        targetStatus,
        errorMessage: `Appointment is already in ${currentStatus} state.`,
      };
    }

    // 3. Transition existence check
    const allowedTargets = this.TRANSITION_RULES[currentStatus];
    if (!allowedTargets || !allowedTargets[targetStatus]) {
      return {
        allowed: false,
        targetStatus,
        errorMessage: `Illegal appointment state transition from ${currentStatus} to ${targetStatus}.`,
      };
    }

    // 4. Role authorization check
    const authorizedRoles = allowedTargets[targetStatus]!;
    if (!authorizedRoles.includes(actorRole)) {
      return {
        allowed: false,
        targetStatus,
        errorMessage: `Role ${actorRole} is not authorized to transition appointment from ${currentStatus} to ${targetStatus}. Authorized roles: ${authorizedRoles.join(', ')}.`,
      };
    }

    // 5. Cancellation validation rule: cancellation must provide a reason
    if (targetStatus === 'CANCELLED') {
      if (!reason || reason.trim().length < 3) {
        return {
          allowed: false,
          targetStatus,
          errorMessage: 'A valid cancellation reason (at least 3 characters) is required when cancelling an appointment.',
        };
      }
    }

    // 6. Rescheduling validation rule: new date must be provided and in the future
    if (targetStatus === 'RESCHEDULED') {
      if (!newScheduledAt) {
        return {
          allowed: false,
          targetStatus,
          errorMessage: 'A new scheduled timestamp is required when rescheduling an appointment.',
        };
      }
      if (newScheduledAt.getTime() <= Date.now()) {
        return {
          allowed: false,
          targetStatus,
          errorMessage: 'Rescheduled appointment time must be in the future.',
        };
      }
    }

    return {
      allowed: true,
      targetStatus,
      reason: reason?.trim(),
    };
  }
}
