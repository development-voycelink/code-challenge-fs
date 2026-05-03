import {
  Call,
  CallEvent,
  CallFilters,
  CallServiceContract,
  EventPayload,
} from '../domain/call';
import { db } from '../db/client';
import {v4 as uuidv4} from 'uuid'; 
import { redis } from '../lib/redis';
import { callHoldPayloadSchema } from '@voycelink/contracts';

function mapCallEvent(row: any) {
  return {
    id: row.id,
    callId: row.call_id,
    type: row.type,
    timestamp: row.timestamp,
    metadata: row.metadata,
  };
}

export class CallService implements CallServiceContract {
  async processEvent(_payload: EventPayload): Promise<CallEvent> {
    const { callId } = _payload;
    let metadata: Record<string, unknown> | undefined = { ..._payload };
    if (_payload.event === 'call_initiated') {
      const { type, queueId } = _payload;
      await db.query(
        `INSERT INTO calls (id, type, status, queue_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING`,
        [callId, type, 'waiting', queueId]
      );
    }

    if(_payload.event === 'call_answered'){
      const {waitTime} = _payload;
      const callResult = await db.query(
        'SELECT * FROM calls WHERE ID = $1', [callId]
      );

      if(callResult.rowCount === 0) {throw new Error(`Call with ID ${callId} not found`);}
      const call = callResult.rows[0];
      if(call.status !== 'waiting') {throw new Error(`Invalid state transition from ${call.status} to active`);}
      await db.query(`UPDATE  calls SET status = 'active' WHERE id = $1`, [callId]);
      if(waitTime > 30) {
        metadata = {..._payload, flag: 'WAIT_TIME_EXCEEDED'}; 
      }
    }

    if(_payload.event === 'call_hold'){
      const { holdDuration } = _payload;
      const callResult = await db.query('SELECT * FROM calls WHERE id = $1', [callId]);
      if(callResult.rowCount === 0) throw new Error(`call ${callId} not found`);
      const call = callResult.rows[0];
      if(call.status !== 'active') throw new Error(`Invalid state transmition from ${call.status}`);
      await db.query("UPDATE calls SET status = 'on_hold' WHERE id = $1", [callId]);
      if(holdDuration > 60){
        metadata ={..._payload, flag: 'HOLD_TIME_EXCEEDED'};
      }
    }

    if(_payload.event === 'call_ended'){
      const {duration} = _payload;

      const callResult = await db.query(
        `SELECT * FROM calls WHERE id = $1`, [callId]
      );
      if(callResult.rowCount === 0) throw new Error(`Call with ID ${callId} not found`);
      const call = callResult.rows[0];
      if(call.status !== 'active' && call.status !== 'on_hold') throw new Error(`Invalid state transition from ${call.status}`);
      await db.query(`UPDATE calls set status = 'ended', end_time = NOW() WHERE id = $1`, [callId]);
      if(duration < 10){
        metadata ={..._payload, flag:'SHORT_CALL'};
      }
    }

    const result = await db.query(
      `INSERT INTO call_events (id, call_id, type, metadata)
      VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        uuidv4(),
        callId,
        _payload.event,
        metadata 
      ]
    );

    const event =  mapCallEvent(result.rows[0]);
    try {
      await redis.publish('call_events', JSON.stringify(event));
    } catch (error) {
      console.error('Redis publish failed:', error);
    }

    return event;
  }
  

  async getCalls(_filters: CallFilters): Promise<Call[]> {
    let query = 'SELECT * FROM calls';
    const conditions: string[] =[];
    const values: any[] = [];
    if(_filters.status){
      values.push(_filters.status);
      conditions.push(`status = ${values.length}`);
    }

    if(_filters.queueId){
      values.push(_filters.queueId);
      conditions.push(`queue_id = ${values.length}`);
    }

    if(conditions.length > 0){
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY start_time DESC';
    const result = await db.query(query, values);
    return result.rows;
  }

  async getCallEvents(callId: string): Promise<CallEvent[]> {
    const result = await db.query(
      `SELECT * FROM call_events WHERE call_id = $1 ORDER BY timestamp ASC`,[callId]);
    return result.rows;
  }
}
