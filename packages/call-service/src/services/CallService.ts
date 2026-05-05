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
    return this.callRepository.getCalls(filters);
  }

  async getCallEvents(callId: string): Promise<CallEvent[]> {
    return this.callRepository.getCallEvents(callId);
  }
}
