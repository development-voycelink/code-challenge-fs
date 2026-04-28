import type {
  CallStatus,
  CallStatusUpdate,
  CallType,
  EventPayload,
  QueueId,
} from '@voycelink/contracts';

export type { CallStatus, CallStatusUpdate, CallType, EventPayload, QueueId };

export interface CallFilters {
  status?: CallStatus;
  queueId?: QueueId;
}

export class Call {
  constructor(
    public readonly id: string,
    public readonly type: CallType,
    public status: CallStatus,
    public readonly queueId: QueueId,
    public readonly startTime: Date,
    public endTime?: Date,
  ) {}
}

export class CallEvent {
  constructor(
    public readonly id: string,
    public readonly callId: string,
    public readonly type: string,
    public readonly timestamp: Date,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}

export interface CallServiceContract {
  processEvent(payload: EventPayload): Promise<CallEvent>;
  getCalls(filters: CallFilters): Promise<Call[]>;
  getCallEvents(callId: string): Promise<CallEvent[]>;
}
