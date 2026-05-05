// Custom error classes for CallService
import {
  ERROR_CALL_ALREADY_EXISTS,
  ERROR_CALL_NOT_FOUND,
  ERROR_INVALID_QUEUE_ID,
  ERROR_UNSUPPORTED_EVENT_TYPE,
} from './constants';

export class CallServiceError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'CallServiceError';
  }
}

export class CallAlreadyExistsError extends CallServiceError {
  constructor(callId: string) {
    super(ERROR_CALL_ALREADY_EXISTS.replace('{callId}', callId), 'CALL_ALREADY_EXISTS');
    this.name = 'CallAlreadyExistsError';
  }
}

export class CallNotFoundError extends CallServiceError {
  constructor(callId: string) {
    super(ERROR_CALL_NOT_FOUND.replace('{callId}', callId), 'CALL_NOT_FOUND');
    this.name = 'CallNotFoundError';
  }
}

export class InvalidQueueIdError extends CallServiceError {
  constructor(queueId: string) {
    super(ERROR_INVALID_QUEUE_ID.replace('{queueId}', queueId), 'INVALID_QUEUE_ID');
    this.name = 'InvalidQueueIdError';
  }
}

export class UnsupportedEventTypeError extends CallServiceError {
  constructor(eventType: string) {
    super(ERROR_UNSUPPORTED_EVENT_TYPE.replace('{eventType}', eventType), 'UNSUPPORTED_EVENT_TYPE');
    this.name = 'UnsupportedEventTypeError';
  }
}