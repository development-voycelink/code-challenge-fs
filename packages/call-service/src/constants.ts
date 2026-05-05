// Constants for CallService
export const VALID_QUEUES = ['medical_spanish', 'medical_english', 'legal_spanish', 'legal_english'] as const;
export type ValidQueue = typeof VALID_QUEUES[number];

export const CALL_STATUS_WAITING = 'waiting';
export const CALL_STATUS_ACTIVE = 'active';
export const CALL_STATUS_ON_HOLD = 'on_hold';
export const CALL_STATUS_ENDED = 'ended';

export const SLA_WAIT_TIME_THRESHOLD = 30; // seconds
export const MAX_HOLD_TIME_THRESHOLD = 60; // seconds
export const SHORT_CALL_THRESHOLD = 10; // seconds

// Database table names
export const TABLE_CALLS = 'calls';
export const TABLE_CALL_EVENTS = 'call_events';

// Event types
export const EVENT_CALL_INITIATED = 'call_initiated';
export const EVENT_CALL_ROUTED = 'call_routed';
export const EVENT_CALL_ANSWERED = 'call_answered';
export const EVENT_CALL_HOLD = 'call_hold';
export const EVENT_CALL_ENDED = 'call_ended';

// Error messages
export const ERROR_CALL_ALREADY_EXISTS = 'Call with id {callId} already exists';
export const ERROR_CALL_NOT_FOUND = 'Call with id {callId} not found';
export const ERROR_INVALID_QUEUE_ID = 'Invalid queueId: {queueId}';
export const ERROR_UNSUPPORTED_EVENT_TYPE = 'Unsupported event type: {eventType}';