import { EventPayload, CallStatus } from '../domain/call';
import { v4 as uuidv4 } from 'uuid';
import { callRepository } from '../db/CallRepository';

export class SlaManager {
  private slaTimers = new Map<string, NodeJS.Timeout>();
  private callStatuses = new Map<string, CallStatus>();

  handleTimersAndRules(payload: EventPayload, status: CallStatus) {
    const { callId, event } = payload;
    this.callStatuses.set(callId, status);

    if (this.slaTimers.has(callId)) {
      clearTimeout(this.slaTimers.get(callId)!);
      this.slaTimers.delete(callId);
    }

    switch (event) {
      case 'call_initiated':
        this.slaTimers.set(
          callId,
          setTimeout(() => {
            console.warn(`[SLA WARNING] Call ${callId} exceeded 30s max wait time.`);
            this.insertFlag(callId, 'sla_wait_exceeded');
          }, 30000)
        );
        break;

      case 'call_routed':
        this.slaTimers.set(
          callId,
          setTimeout(() => {
            console.warn(`[SLA WARNING] Call ${callId} unanswered after 15s. Re-routing.`);
            this.insertFlag(callId, 'unanswered_reroute_required');
          }, 15000)
        );
        break;

      case 'call_answered':
        const answeredPayload = payload as Extract<EventPayload, { event: 'call_answered' }>;
        if (answeredPayload.waitTime > 30) {
          console.warn(`[SLA WARNING] Call ${callId} answered with waitTime > 30s.`);
        }
        break;

      case 'call_hold':
        this.slaTimers.set(
          callId,
          setTimeout(() => {
            console.warn(`[SLA WARNING] Call ${callId} exceeded 60s max hold time.`);
            this.insertFlag(callId, 'sla_hold_exceeded');
          }, 60000)
        );
        break;

      case 'call_ended':
        const endedPayload = payload as Extract<EventPayload, { event: 'call_ended' }>;
        if (endedPayload.duration < 10) {
          console.warn(`[SLA WARNING] Call ${callId} duration was under 10 seconds.`);
          this.insertFlag(callId, 'short_duration_flag');
        }
        this.callStatuses.delete(callId);
        break;
    }
  }

  private insertFlag(callId: string, flagType: string) {
    const status = this.callStatuses.get(callId) || 'waiting';
    callRepository
      .insertFlag(callId, uuidv4(), flagType, status)
      .catch((err) => console.error(`Failed to insert flag event for call ${callId}:`, err));
  }
}

export const slaManager = new SlaManager();
