import type {
  CallStatus,
  CallStatusUpdate,
  CallEventType,
  CallType,
  EventPayload,
  QueueId,
} from '@voycelink/contracts';

export type {
  CallStatus,
  CallStatusUpdate,
  CallEventType,
  CallType,
  EventPayload,
  QueueId,
};

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
    public readonly type: CallEventType,
    public readonly timestamp: Date,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}

export class CallNotFoundError extends Error {
  constructor(callId: string) {
    super(`Call not found: ${callId}`);
    this.name = "CallNotFoundError";
  }
}

export interface CallServiceContract {
  processEvent(payload: EventPayload): Promise<CallEvent>;
  getCalls(filters: CallFilters): Promise<Call[]>;
  getCallEvents(callId: string): Promise<CallEvent[]>;
}
