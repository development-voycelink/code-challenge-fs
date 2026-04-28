import {
  Call,
  CallEvent,
  CallFilters,
  CallServiceContract,
  EventPayload,
} from '../domain/call';

export class CallService implements CallServiceContract {
  async processEvent(_payload: EventPayload): Promise<CallEvent> {
    throw new Error('CallService.processEvent not implemented');
  }

  async getCalls(_filters: CallFilters): Promise<Call[]> {
    throw new Error('CallService.getCalls not implemented');
  }

  async getCallEvents(_callId: string): Promise<CallEvent[]> {
    throw new Error('CallService.getCallEvents not implemented');
  }
}
