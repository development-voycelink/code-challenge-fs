import type { QueueId } from '@voycelink/contracts';
import { Call, CallEvent } from '../domain/call';

export interface CallRow {
  id: string;
  type: Call['type'];
  status: Call['status'];
  queue_id: QueueId;
  start_time: Date;
  end_time: Date | null;
}

export interface CallEventRow {
  id: string;
  call_id: string;
  type: string;
  timestamp: Date;
  metadata: Record<string, unknown> | null;
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
