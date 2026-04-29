import type { QueueId } from "@voycelink/contracts";
import { Call, CallEvent } from "../domain/call";

export interface CallRow {
  id: Call["id"];
  type: Call["type"];
  status: Call["status"];
  queue_id: Call["queueId"];
  start_time: Call["startTime"];
  end_time: Call["endTime"] | null;
}

export interface CallEventRow {
  id: CallEvent["id"];
  call_id: CallEvent["callId"];
  type: CallEvent["type"];
  timestamp: CallEvent["timestamp"];
  metadata: CallEvent["metadata"] | null;
}

export function mapCallRow(row: CallRow): Call {
  return new Call(
    row.id,
    row.type,
    row.status,
    row.queue_id,
    row.start_time,
    row.end_time ?? undefined,
  );
}

export function mapCallEventRow(row: CallEventRow): CallEvent {
  return new CallEvent(
    row.id,
    row.call_id,
    row.type,
    row.timestamp,
    row.metadata ?? undefined,
  );
}
