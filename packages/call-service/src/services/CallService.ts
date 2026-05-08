import type { PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { db } from '../db/client';
// import { publishStatusUpdate } from '../bus/publisher';
import {
  Call,
  CallStatus,
  CallEvent,
  CallFilters,
  CallServiceContract,
  EventPayload,
} from '../domain/call';
import {
  CallAnsweredPayload,
  CallEndedPayload,
  CallHoldPayload,
  CallInitiatedPayload,
  CallRoutedPayload,
} from '@voycelink/contracts';

type ProcessEventResult = {
  callEvent: CallEvent;
  status: CallStatus;
};

export class CallService implements CallServiceContract {
  private async insertEvent(
    client: PoolClient,
    callId: string,
    type: EventPayload['event'],
    timestamp: Date,
    metadata: Record<string, unknown>,
  ): Promise<CallEvent> {
    const event = await client.query(
      'INSERT INTO call_events (id, call_id, type, timestamp, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [randomUUID(), callId, type, timestamp, metadata],
    );

    return new CallEvent(
      event.rows[0].id,
      event.rows[0].call_id,
      event.rows[0].type,
      new Date(event.rows[0].timestamp),
      event.rows[0].metadata,
    );
  }

  private async callInitiated(
    client: PoolClient,
    now: Date,
    payload: CallInitiatedPayload): Promise<ProcessEventResult> {

    await client.query(
      'INSERT INTO calls (id, type, status, queue_id, start_time) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [payload.callId, payload.type, 'waiting', payload.queueId, now],
    );

    const callEvent = await this.insertEvent(client, payload.callId, payload.event, now, {
      ...payload,
      slaMax: 30,
    });

    return {
      callEvent,
      status: 'waiting',
    };
  }

  private async callRouted(
    client: PoolClient,
    now: Date,
    payload: CallRoutedPayload): Promise<ProcessEventResult> {

    const query = 'SELECT status FROM calls WHERE id = $1';
    const routedCallResult = await client.query(query, [payload.callId]);

    if (routedCallResult.rowCount === 0) {
      throw new Error(`Call with id ${payload.callId} not found`);
    }

    await client.query(
      'UPDATE calls SET status = $1 WHERE id = $2',
      ['waiting', payload.callId],
    );

    const callEvent = await this.insertEvent(client, payload.callId, payload.event, now, {
      agentId: payload.agentId,
      routingTime: payload.routingTime,
      rerouteAfterSeconds: 15,
      rerouteRequired: payload.routingTime > 15,
    });

    return {
      callEvent,
      status: 'waiting',
    };
  }

  private async callAnswered(
    client: PoolClient,
    now: Date,
    payload: CallAnsweredPayload,
  ): Promise<ProcessEventResult> {
    const query = 'SELECT status FROM calls WHERE id = $1';
    const answeredCallResult = await client.query(query, [payload.callId]);

    if (answeredCallResult.rowCount === 0) {
      throw new Error(`Call with id ${payload.callId} not found`);
    }

    await client.query('UPDATE calls SET status = $1 WHERE id = $2', ['active', payload.callId]);

    const callEvent = await this.insertEvent(client, payload.callId, payload.event, now, {
      waitTime: payload.waitTime,
      slaMax: 30,
    });

    return {
      callEvent,
      status: 'active',
    };
  }

  private async callHold(
    client: PoolClient,
    now: Date,
    payload: CallHoldPayload,
  ): Promise<ProcessEventResult> {
    const query = 'SELECT status FROM calls WHERE id = $1';
    const holdCallResult = await client.query(query, [payload.callId]);
    if (holdCallResult.rowCount === 0) {
      throw new Error(`Call with id ${payload.callId} not found`);
    }

    await client.query('UPDATE calls SET status = $1 WHERE id = $2', ['on_hold', payload.callId]);

    const callEvent = await this.insertEvent(client, payload.callId, payload.event, now, {
      holdDuration: payload.holdDuration,
      maxHoldSeconds: 60,
    });

    return {
      callEvent,
      status: 'on_hold',
    };
  }

  private async callEnded(
    client: PoolClient,
    now: Date,
    payload: CallEndedPayload,
  ): Promise<ProcessEventResult> {
    const query = 'SELECT status FROM calls WHERE id = $1';
    const endedCallResult = await client.query(query, [payload.callId]);
    if (endedCallResult.rowCount === 0) {
      throw new Error(`Call with id ${payload.callId} not found`);
    }

    await client.query(
      'UPDATE calls SET status = $1, end_time = $2 WHERE id = $3',
      ['ended', now, payload.callId],
    );

    const callEvent = await this.insertEvent(client, payload.callId, payload.event, now, {
      endReason: payload.endReason,
      duration: payload.duration,
    });

    return {
      callEvent,
      status: 'ended',
    };
  }

  async processEvent(payload: EventPayload): Promise<CallEvent> {
    const client = await db.connect();

    try {
      const now = new Date();
      await client.query('BEGIN');

      let result: ProcessEventResult;

      if (payload.event === 'call_initiated') {
        result = await this.callInitiated(client, now, payload);
      } else if (payload.event === 'call_routed') {
        result = await this.callRouted(client, now, payload);
      } else if (payload.event === 'call_answered') {
        result = await this.callAnswered(client, now, payload);
      } else if (payload.event === 'call_hold') {
        result = await this.callHold(client, now, payload);
      } else if (payload.event === 'call_ended') {
        result = await this.callEnded(client, now, payload);
      } else {
        throw new Error('Unsupported event type');
      }

      await client.query('COMMIT');

      try {
        // TODO: Publicar en redis
        // await publishStatusUpdate({..});
      } catch (publishError) {
        console.error({ publishError });
      }

      return result.callEvent;
    } catch (error) {
      await client.query('ROLLBACK');
      console.log('Error in processEvent:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getCalls(filters: CallFilters): Promise<Call[]> {
    const queryParts: string[] = ['SELECT * FROM calls'];
    const whereClauses: string[] = [];
    const values: Array<string> = [];

    if (filters.status) {
      values.push(filters.status);
      whereClauses.push(`status = $${values.length}`);
    }

    if (filters.queueId) {
      values.push(filters.queueId);
      whereClauses.push(`queue_id = $${values.length}`);
    }

    if (whereClauses.length > 0) {
      // Seria más facil usar un ORM o query builder para esto
      queryParts.push(`WHERE ${whereClauses.join(' AND ')}`);
    }

    queryParts.push('ORDER BY start_time DESC');

    const query = queryParts.join(' ');

    const calls = await db.query(query, values);
    return calls.rows.map(
      (row) =>
        new Call(
          row.id,
          row.type,
          row.status,
          row.queue_id,
          new Date(row.start_time),
          row.end_time ? new Date(row.end_time) : undefined,
        ),
    );
  }

  async getCallEvents(_callId: string): Promise<CallEvent[]> {
    const query = 'SELECT * FROM call_events where call_id = $1 ORDER BY timestamp DESC';

    const events = await db.query(query, [_callId]);
    return events.rows.map(
      (row) =>
        new CallEvent(
          row.id,
          row.call_id,
          row.type,
          new Date(row.timestamp),
          row.metadata,
        ),
    );
    // throw new Error('CallService.getCallEvents not implemented');
  }
}
