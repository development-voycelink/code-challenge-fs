import { EventPayload } from '../../../domain/call';
import { CallEvent } from '../../../domain/call';
import { CallRepository } from '../../../db/callRepository';

export interface CallEventHandler {
  canHandle(eventType: string): boolean;
  handle(payload: EventPayload): Promise<CallEvent>;
}

export abstract class BaseCallEventHandler implements CallEventHandler {
  protected constructor(protected callRepository: CallRepository) {}

  canHandle(eventType: string): boolean {
    return this.getEventType() === eventType;
  }

  abstract getEventType(): string;
  abstract handle(payload: EventPayload): Promise<CallEvent>;
}