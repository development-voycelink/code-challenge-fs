import {
  Call,
  CallEvent,
  CallFilters,
  CallServiceContract,
  EventPayload,
} from '../domain/call';
import { CallRepository } from '../db/callRepository';
import { CallEventHandler } from './handlers/CallEventHandler';
import { handlerRegistry } from './HandlerRegistry';

export class CallService implements CallServiceContract {
  private callRepository: CallRepository;
  private handlers: CallEventHandler[];

  constructor(
    callRepository: CallRepository = new CallRepository()
  ) {
    this.callRepository = callRepository;
    // Initialize handlers from registry
    this.handlers = handlerRegistry.getHandlers(callRepository);
  }

  async processEvent(payload: EventPayload): Promise<CallEvent> {
    const handler = this.handlers.find(h => h.canHandle(payload.event));
    if (!handler) {
      throw new Error(`Unsupported event type: ${payload.event}`);
    }
    return handler.handle(payload);
  }

  async getCalls(filters: CallFilters): Promise<Call[]> {
    const rows = await this.callRepository.getCalls(filters);
    return rows.map(row => new Call(
      row.id,
      row.type,
      row.status,
      row.queueId,
      row.startTime,
      row.endTime,
      row.holdStartTime
    ));
  }

  async getCallEvents(callId: string): Promise<CallEvent[]> {
    // First check if call exists
    const call = await this.callRepository.getCallById(callId);
    if (!call) {
      throw new Error('Call not found');
    }
    
    const rows = await this.callRepository.getCallEvents(callId);
    return rows.map(row => new CallEvent(
      row.id,
      row.callId,
      row.type,
      row.timestamp,
      row.metadata
    ));
  }
}
