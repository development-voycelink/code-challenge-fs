import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import {
  CALL_EVENTS,
  CALL_STATUSES,
  CALL_SERVICE_CONSTANTS,
} from "@voycelink/contracts";
import {
  mapCallEventRow,
  mapCallRow,
  CallEventRow,
  CallRow,
} from "../db/mappers";
import { publishStatusUpdate } from "../bus/publisher";
import {
  Call,
  CallEvent,
  CallFilters,
  CallNotFoundError,
  CallServiceContract,
  EventPayload,
  CallStatus,
} from "../domain/call";
import { db } from "../db/client";

import {
  INSERT_CALL_SQL,
  SELECT_CALL_BY_ID_SQL,
  UPDATE_CALL_STATUS_SQL,
  SELECT_CALLS_BASE_SQL,
  SELECT_CALL_EVENTS_BY_CALL_ID_SQL,
  INSERT_CALL_EVENT_SQL,
} from "./sql";

const [CALL_INITIATED, CALL_ROUTED, CALL_ANSWERED, CALL_HOLD, CALL_ENDED] =
  CALL_EVENTS;
const [STATUS_WAITING, STATUS_ACTIVE, STATUS_ON_HOLD, STATUS_ENDED] =
  CALL_STATUSES;

const {
  EMPTY_ROW_COUNT,
  SLA_SECONDS,
  REROUTE_THRESHOLD_SECONDS,
  SLA_BREACH_WAIT_SECONDS,
  HOLD_EXCEEDED_THRESHOLD_SECONDS,
  TOO_SHORT_CALL_DURATION_SECONDS,
} = CALL_SERVICE_CONSTANTS;

export class CallService implements CallServiceContract {
  async processEvent(payload: EventPayload): Promise<CallEvent> {
    const { event, callId } = payload;
    const client = await db.connect();
    let nextStatus: CallStatus | null = null;
    let metadata: Record<string, unknown> = {};
    let insertedEvent: CallEventRow | null = null;
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      switch (event) {
        case CALL_INITIATED:
          nextStatus = STATUS_WAITING;
          metadata = { slaSeconds: SLA_SECONDS };
          await client.query(INSERT_CALL_SQL, [
            callId,
            payload.type,
            nextStatus,
            payload.queueId,
          ]);
          break;
        case CALL_ROUTED:
          nextStatus = STATUS_WAITING;
          metadata = {
            agentId: payload.agentId,
            routingTime: payload.routingTime,
            rerouteRecommended: payload.routingTime > REROUTE_THRESHOLD_SECONDS,
          };
          break;
        case CALL_ANSWERED:
          nextStatus = STATUS_ACTIVE;
          metadata = {
            waitTime: payload.waitTime,
            slaBreached: payload.waitTime > SLA_BREACH_WAIT_SECONDS,
          };
          break;
        case CALL_HOLD:
          nextStatus = STATUS_ON_HOLD;
          metadata = {
            holdDuration: payload.holdDuration,
            holdExceeded:
              payload.holdDuration > HOLD_EXCEEDED_THRESHOLD_SECONDS,
          };
          break;
        case CALL_ENDED:
          nextStatus = STATUS_ENDED;
          metadata = {
            endReason: payload.endReason,
            duration: payload.duration,
            tooShort: payload.duration < TOO_SHORT_CALL_DURATION_SECONDS,
          };
          break;
      }

      if (event !== CALL_INITIATED) {
        const existing = await this.getCallById(client, callId);
        if (existing.rowCount === EMPTY_ROW_COUNT) {
          throw new CallNotFoundError(callId);
        }
      }

      if (nextStatus && event !== CALL_INITIATED) {
        await client.query(UPDATE_CALL_STATUS_SQL, [callId, nextStatus]);
      }

      const result = await client.query<CallEventRow>(INSERT_CALL_EVENT_SQL, [
        randomUUID(),
        callId,
        event,
        JSON.stringify(metadata),
      ]);
      insertedEvent = result.rows[0];

      await client.query("COMMIT");
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) {
        await client.query("ROLLBACK");
      }
      throw error;
    } finally {
      client.release();
    }

    if (!insertedEvent) {
      throw new Error("Failed to persist call event");
    }

    if (nextStatus) {
      try {
        await publishStatusUpdate({
          callId,
          status: nextStatus,
          eventType: event,
          timestamp: new Date().toISOString(),
          metadata,
        });
      } catch (error) {
        console.error("Failed to publish status update", {
          callId,
          event,
          error,
        });
      }
    }

    return mapCallEventRow(insertedEvent);
  }

  async getCalls(filters: CallFilters): Promise<Call[]> {
    const { sql, values } = this.buildGetCallsQuery(filters);
    const result = await db.query<CallRow>(sql, values);
    return result.rows.map(mapCallRow);
  }

  async getCallEvents(callId: string): Promise<CallEvent[]> {
    const result = await db.query<CallEventRow>(
      SELECT_CALL_EVENTS_BY_CALL_ID_SQL,
      [callId],
    );
    return result.rows.map(mapCallEventRow);
  }

  private getCallById(client: PoolClient, callId: string) {
    return client.query<CallRow>(SELECT_CALL_BY_ID_SQL, [callId]);
  }

  private buildGetCallsQuery(filters: CallFilters): {
    sql: string;
    values: unknown[];
  } {
    const where: string[] = [];
    const values: unknown[] = [];
    if (filters.status) {
      values.push(filters.status);
      where.push(`status = $${values.length}`);
    }
    if (filters.queueId) {
      values.push(filters.queueId);
      where.push(`queue_id = $${values.length}`);
    }

    const sql = `${SELECT_CALLS_BASE_SQL}
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY start_time DESC`;

    return { sql, values };
  }
}
