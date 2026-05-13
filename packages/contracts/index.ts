import { z } from "zod";

export const CALL_STATUSES = ["waiting", "active", "on_hold", "ended"] as const;
export const CALL_TYPES = ["voice", "video"] as const;
export const SUPPORTED_QUEUES = [
  "medical_spanish",
  "medical_english",
  "legal_spanish",
  "legal_english",
] as const;

export const callStatusSchema = z.enum(CALL_STATUSES);
export const callTypeSchema = z.enum(CALL_TYPES);
export const queueIdSchema = z.enum(SUPPORTED_QUEUES);
export const metadataSchema = z.record(z.unknown()).optional();

export const callSchema = z.object({
  id: z.string().min(1),
  type: callTypeSchema,
  status: callStatusSchema,
  queueId: queueIdSchema,
  startTime: z.string().min(1),
  endTime: z.string().min(1).optional(),
});

export const callEventSchema = z.object({
  id: z.string().min(1),
  callId: z.string().min(1),
  type: z.string().min(1),
  timestamp: z.string().min(1),
  metadata: metadataSchema,
});

export const callStatusUpdateSchema = z.object({
  callId: z.string().min(1),
  status: callStatusSchema,
  eventType: z.string().min(1),
  timestamp: z.string().min(1),
  metadata: metadataSchema,
});

export const callInitiatedPayloadSchema = z.object({
  event: z.literal("call_initiated"),
  callId: z.string().min(1),
  type: callTypeSchema,
  queueId: queueIdSchema,
});

export const callRoutedPayloadSchema = z.object({
  event: z.literal("call_routed"),
  callId: z.string().min(1),
  agentId: z.string().min(1),
  routingTime: z.number().nonnegative(),
});

export const callAnsweredPayloadSchema = z.object({
  event: z.literal("call_answered"),
  callId: z.string().min(1),
  waitTime: z.number().nonnegative(),
});

export const callHoldPayloadSchema = z.object({
  event: z.literal("call_hold"),
  callId: z.string().min(1),
  holdDuration: z.number().nonnegative(),
});

export const callEndedPayloadSchema = z.object({
  event: z.literal("call_ended"),
  callId: z.string().min(1),
  endReason: z.enum(["completed", "abandoned", "failed"]),
  duration: z.number().nonnegative(),
});

export const eventPayloadSchema = z.discriminatedUnion("event", [
  callInitiatedPayloadSchema,
  callRoutedPayloadSchema,
  callAnsweredPayloadSchema,
  callHoldPayloadSchema,
  callEndedPayloadSchema,
]);

export type CallStatus = z.infer<typeof callStatusSchema>;
export type CallType = z.infer<typeof callTypeSchema>;
export type QueueId = z.infer<typeof queueIdSchema>;
export type Call = z.infer<typeof callSchema>;
export type CallEvent = z.infer<typeof callEventSchema>;
export type CallStatusUpdate = z.infer<typeof callStatusUpdateSchema>;
export type CallInitiatedPayload = z.infer<typeof callInitiatedPayloadSchema>;
export type CallRoutedPayload = z.infer<typeof callRoutedPayloadSchema>;
export type CallAnsweredPayload = z.infer<typeof callAnsweredPayloadSchema>;
export type CallHoldPayload = z.infer<typeof callHoldPayloadSchema>;
export type CallEndedPayload = z.infer<typeof callEndedPayloadSchema>;
export type EventPayload = z.infer<typeof eventPayloadSchema>;

export interface CallFilters {
  status?: CallStatus | "all";
  queueId?: QueueId;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
