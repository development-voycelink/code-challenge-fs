import { db } from './client';
import { mapCallRow, mapCallEventRow } from './mappers';
import { Call, CallEvent, CallFilters, CallStatus } from '../domain/call';
import { EventPayload } from '../domain/call';

export class CallRepository {
  async getCalls(filters: CallFilters & { limit?: number; offset?: number }): Promise<Call[]> {
    let query = 'SELECT * FROM calls WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }
    if (filters.queueId) {
      query += ` AND queue_id = $${paramIndex++}`;
      params.push(filters.queueId);
    }

    query += ` ORDER BY start_time DESC`;

    if (filters.limit !== undefined) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }
    if (filters.offset !== undefined) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }


    const res = await db.query(query, params);
    return res.rows.map(mapCallRow);
  }

  async getCallEvents(callId: string): Promise<CallEvent[]> {
    console.log('callId ----- ', callId);
    const res = await db.query(
      `SELECT * FROM call_events WHERE call_id = $1 ORDER BY timestamp ASC`,
      [callId]
    );
    return res.rows.map(mapCallEventRow);
  }

  async getEventByIdempotencyKey(key: string): Promise<CallEvent | null> {
    const res = await db.query(
      `SELECT ce.* FROM call_events ce
       JOIN idempotency_keys ik ON ce.id = ik.event_id
       WHERE ik.key = $1`,
      [key]
    );
    if (res.rows.length === 0) return null;
    return mapCallEventRow(res.rows[0]);
  }

  async processEventTransaction(
    payload: EventPayload,
    eventId: string,
    newStatus: CallStatus,
    now: Date,
    idempotencyKey?: string
  ): Promise<void> {
    const { callId, event } = payload;
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      if (event === 'call_initiated') {
        const p = payload as Extract<EventPayload, { event: 'call_initiated' }>;
        await client.query(
          `INSERT INTO calls (id, type, status, queue_id, start_time) VALUES ($1, $2, $3, $4, $5)`,
          [p.callId, p.type, newStatus, p.queueId, now]
        );
      } else {
        if (event === 'call_ended') {
          await client.query(
            `UPDATE calls SET status = $1, end_time = $2 WHERE id = $3`,
            [newStatus, now, callId]
          );
        } else {
          await client.query(
            `UPDATE calls SET status = $1 WHERE id = $2`,
            [newStatus, callId]
          );
        }
      }

      // 2. Insert event
      await client.query(
        `INSERT INTO call_events (id, call_id, type, timestamp, metadata) VALUES ($1, $2, $3, $4, $5)`,
        [eventId, callId, event, now, JSON.stringify(payload)]
      );

      // 3. Optional: idempotency key
      if (idempotencyKey) {
        await client.query(
          `INSERT INTO idempotency_keys (key, event_id, created_at) VALUES ($1, $2, $3)`,
          [idempotencyKey, eventId, now]
        );
      }

      // 4. Outbox event for Redis
      await client.query(
        `INSERT INTO outbox_events (call_id, status, event_type, timestamp, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [callId, newStatus, event, now, JSON.stringify(payload)]
      );

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async insertFlag(callId: string, eventId: string, flagType: string, status: CallStatus): Promise<void> {
    const now = new Date();
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO call_events (id, call_id, type, timestamp, metadata) VALUES ($1, $2, $3, $4, $5)`,
        [eventId, callId, 'flagged', now, JSON.stringify({ reason: flagType })]
      );
      await client.query(
        `INSERT INTO outbox_events (call_id, status, event_type, timestamp, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [callId, status, 'flagged', now, JSON.stringify({ reason: flagType })]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

export const callRepository = new CallRepository();
