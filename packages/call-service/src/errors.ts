// Custom error classes for CallService
export class CallServiceError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'CallServiceError';
  }
}

export class CallAlreadyExistsError extends CallServiceError {
  constructor(callId: string) {
    super(`Call with id ${callId} already exists`, 'CALL_ALREADY_EXISTS');
    this.name = 'CallAlreadyExistsError';
  }
}

export class CallNotFoundError extends CallServiceError {
  constructor(callId: string) {
    super(`Call with id ${callId} not found`, 'CALL_NOT_FOUND');
    this.name = 'CallNotFoundError';
  }
}

export class InvalidQueueIdError extends CallServiceError {
  constructor(queueId: string) {
    super(`Invalid queueId: ${queueId}`, 'INVALID_QUEUE_ID');
    this.name = 'InvalidQueueIdError';
  }
}

export class UnsupportedEventTypeError extends CallServiceError {
  constructor(eventType: string) {
    super(`Unsupported event type: ${eventType}`, 'UNSUPPORTED_EVENT_TYPE');
    this.name = 'UnsupportedEventTypeError';
  }
}