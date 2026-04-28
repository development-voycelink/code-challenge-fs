const { z } = require('zod');

const CALL_STATUSES = ['waiting', 'active', 'on_hold', 'ended'];
const CALL_TYPES = ['voice', 'video'];
const SUPPORTED_QUEUES = [
  'medical_spanish',
  'medical_english',
  'legal_spanish',
  'legal_english',
];

const callStatusSchema = z.enum(CALL_STATUSES);
const callTypeSchema = z.enum(CALL_TYPES);
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
  type: z.string().min(1),
  timestamp: z.string().min(1),
  metadata: metadataSchema,
});

const callStatusUpdateSchema = z.object({
  callId: z.string().min(1),
  status: callStatusSchema,
  eventType: z.string().min(1),
  timestamp: z.string().min(1),
  metadata: metadataSchema,
});

const callInitiatedPayloadSchema = z.object({
  event: z.literal('call_initiated'),
  callId: z.string().min(1),
  type: callTypeSchema,
  queueId: queueIdSchema,
});

const callRoutedPayloadSchema = z.object({
  event: z.literal('call_routed'),
  callId: z.string().min(1),
  agentId: z.string().min(1),
  routingTime: z.number().nonnegative(),
});

const callAnsweredPayloadSchema = z.object({
  event: z.literal('call_answered'),
  callId: z.string().min(1),
  waitTime: z.number().nonnegative(),
});

const callHoldPayloadSchema = z.object({
  event: z.literal('call_hold'),
  callId: z.string().min(1),
  holdDuration: z.number().nonnegative(),
});

const callEndedPayloadSchema = z.object({
  event: z.literal('call_ended'),
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
  SUPPORTED_QUEUES,
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
