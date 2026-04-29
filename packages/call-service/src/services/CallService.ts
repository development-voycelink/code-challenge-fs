import { v4 as uuidv4 } from 'uuid';
import { callRepository } from '../db/CallRepository';
import { slaManager } from './SlaManager';
import {
  Call,
  CallEvent,
  CallFilters,
  CallServiceContract,
  EventPayload,
  CallStatus
} from '../domain/call';

export class CallService implements CallServiceContract {
  async processEvent(payload: EventPayload, idempotencyKey?: string): Promise<CallEvent> {
    const { callId, event } = payload;
    const now = new Date();
    const eventId = uuidv4();

    //Check idempotency
    if (idempotencyKey) {
      const existing = await callRepository.getEventByIdempotencyKey(idempotencyKey);
      if (existing) {
        return existing; // Return early if already processed
      }
    }

    let newStatus: CallStatus;
    switch (event) {
      case 'call_initiated':
        newStatus = 'waiting';
        break;
      case 'call_routed':
        newStatus = 'waiting';
        break;
      case 'call_answered':
        newStatus = 'active';
        break;
      case 'call_hold':
        newStatus = 'on_hold';
        break;
      case 'call_ended':
        newStatus = 'ended';
        break;
      default:
        throw new Error(`Unknown event type: ${event}`);
    }

    //Process the transaction
    await callRepository.processEventTransaction(
      payload,
      eventId,
      newStatus,
      now,
      idempotencyKey
    );

    //Handle SLA Timers
    slaManager.handleTimersAndRules(payload, newStatus);

    return new CallEvent(eventId, callId, event, now, payload as unknown as Record<string, unknown>);
  }

  async getCalls(filters: CallFilters & { limit?: number; offset?: number }): Promise<Call[]> {
    return callRepository.getCalls(filters);
  }

  async getCallEvents(callId: string): Promise<CallEvent[]> {
    return callRepository.getCallEvents(callId);
  }
}
