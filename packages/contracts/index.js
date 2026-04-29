const { z } = require('zod');

const CALL_STATUSES = ['waiting', 'active', 'on_hold', 'ended'];
const CALL_TYPES = ['voice', 'video'];
const CALL_EVENTS = [
  'call_initiated',
  'call_routed',
  'call_answered',
  'call_hold',
  'call_ended',
];
const SUPPORTED_QUEUES = [
  'medical_spanish',
  'medical_english',
  'legal_spanish',
  'legal_english',
];
const CALL_SERVICE_CONSTANTS = Object.freeze({
  EMPTY_ROW_COUNT: 0,
  SLA_SECONDS: 30,
  REROUTE_THRESHOLD_SECONDS: 15,
  SLA_BREACH_WAIT_SECONDS: 30,
  HOLD_EXCEEDED_THRESHOLD_SECONDS: 60,
  TOO_SHORT_CALL_DURATION_SECONDS: 10,
});

const callStatusSchema = z.enum(CALL_STATUSES);
const callTypeSchema = z.enum(CALL_TYPES);
const callEventTypeSchema = z.enum(CALL_EVENTS);
const queueIdSchema = z.enum(SUPPORTED_QUEUES);
const metadataSchema = z.record(z.unknown()).optional();

const callSchema = z.object({
  id: z.string().min(1),
  type: callTypeSchema,
  status: callStatusSchema,
  queueId: queueIdSchema,
  startTime: z.string().min(1),
  endTime: z.string().min(1).optional(),
});

const callEventSchema = z.object({
  id: z.string().min(1),
  callId: z.string().min(1),
  type: callEventTypeSchema,
  timestamp: z.string().min(1),
  metadata: metadataSchema,
});

const callStatusUpdateSchema = z.object({
  callId: z.string().min(1),
  status: callStatusSchema,
  eventType: callEventTypeSchema,
  timestamp: z.string().min(1),
  metadata: metadataSchema,
});

const callInitiatedPayloadSchema = z.object({
  event: z.literal(CALL_EVENTS[0]),
  callId: z.string().min(1),
  type: callTypeSchema,
  queueId: queueIdSchema,
});

const callRoutedPayloadSchema = z.object({
  event: z.literal(CALL_EVENTS[1]),
  callId: z.string().min(1),
  agentId: z.string().min(1),
  routingTime: z.number().nonnegative(),
});

const callAnsweredPayloadSchema = z.object({
  event: z.literal(CALL_EVENTS[2]),
  callId: z.string().min(1),
  waitTime: z.number().nonnegative(),
});

const callHoldPayloadSchema = z.object({
  event: z.literal(CALL_EVENTS[3]),
  callId: z.string().min(1),
  holdDuration: z.number().nonnegative(),
});

const callEndedPayloadSchema = z.object({
  event: z.literal(CALL_EVENTS[4]),
  callId: z.string().min(1),
  endReason: z.enum(['completed', 'abandoned', 'failed']),
  duration: z.number().nonnegative(),
});

const eventPayloadSchema = z.discriminatedUnion('event', [
  callInitiatedPayloadSchema,
  callRoutedPayloadSchema,
  callAnsweredPayloadSchema,
  callHoldPayloadSchema,
  callEndedPayloadSchema,
]);

module.exports = {
  CALL_STATUSES,
  CALL_TYPES,
  CALL_EVENTS,
  SUPPORTED_QUEUES,
  CALL_SERVICE_CONSTANTS,
  callStatusSchema,
  callTypeSchema,
  queueIdSchema,
  callSchema,
  callEventSchema,
  callStatusUpdateSchema,
  callInitiatedPayloadSchema,
  callRoutedPayloadSchema,
  callAnsweredPayloadSchema,
  callHoldPayloadSchema,
  callEndedPayloadSchema,
  eventPayloadSchema,
};
