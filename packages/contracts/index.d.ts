import type { z } from "zod";

export const CALL_STATUSES: readonly ["waiting", "active", "on_hold", "ended"];
export const CALL_TYPES: readonly ["voice", "video"];
export const CALL_EVENTS: readonly [
  "call_initiated",
  "call_routed",
  "call_answered",
  "call_hold",
  "call_ended",
];
export const SUPPORTED_QUEUES: readonly [
  "medical_spanish",
  "medical_english",
  "legal_spanish",
  "legal_english",
];

export const CALL_SERVICE_CONSTANTS: Readonly<{
  EMPTY_ROW_COUNT: 0;
  SLA_SECONDS: 30;
  REROUTE_THRESHOLD_SECONDS: 15;
  SLA_BREACH_WAIT_SECONDS: 30;
  HOLD_EXCEEDED_THRESHOLD_SECONDS: 60;
  TOO_SHORT_CALL_DURATION_SECONDS: 10;
}>;

export type CallStatus = (typeof CALL_STATUSES)[number];
export type CallType = (typeof CALL_TYPES)[number];
export type CallEventType = (typeof CALL_EVENTS)[number];
export type QueueId = (typeof SUPPORTED_QUEUES)[number];

export interface Call {
  id: string;
  type: CallType;
  status: CallStatus;
  queueId: QueueId;
  startTime: string;
  endTime?: string;
}

export interface CallEvent {
  id: string;
  callId: string;
  type: CallEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CallStatusUpdate {
  callId: string;
  status: CallStatus;
  eventType: CallEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CallFilters {
  status?: CallStatus | "all";
  queueId?: QueueId;
}

export interface CallInitiatedPayload {
  event: "call_initiated";
  callId: string;
  type: CallType;
  queueId: QueueId;
}

export interface CallRoutedPayload {
  event: "call_routed";
  callId: string;
  agentId: string;
  routingTime: number;
}

export interface CallAnsweredPayload {
  event: "call_answered";
  callId: string;
  waitTime: number;
}

export interface CallHoldPayload {
  event: "call_hold";
  callId: string;
  holdDuration: number;
}

export interface CallEndedPayload {
  event: "call_ended";
  callId: string;
  endReason: "completed" | "abandoned" | "failed";
  duration: number;
}

export type EventPayload =
  | CallInitiatedPayload
  | CallRoutedPayload
  | CallAnsweredPayload
  | CallHoldPayload
  | CallEndedPayload;

export const callStatusSchema: z.ZodEnum<typeof CALL_STATUSES>;
export const callTypeSchema: z.ZodEnum<typeof CALL_TYPES>;
export const queueIdSchema: z.ZodEnum<typeof SUPPORTED_QUEUES>;
export const callSchema: z.ZodType<Call>;
export const callEventSchema: z.ZodType<CallEvent>;
export const callStatusUpdateSchema: z.ZodType<CallStatusUpdate>;
export const callInitiatedPayloadSchema: z.ZodType<CallInitiatedPayload>;
export const callRoutedPayloadSchema: z.ZodType<CallRoutedPayload>;
export const callAnsweredPayloadSchema: z.ZodType<CallAnsweredPayload>;
export const callHoldPayloadSchema: z.ZodType<CallHoldPayload>;
export const callEndedPayloadSchema: z.ZodType<CallEndedPayload>;
export const eventPayloadSchema: z.ZodType<EventPayload>;
