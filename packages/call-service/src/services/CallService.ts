import {
  Call,
  CallEvent,
  CallFilters,
  CallServiceContract,
  EventPayload,
} from '../domain/call';
import { db } from '../db/client';
import {v4 as uuidv4} from 'uuid';
import { Result } from 'pg';

export class CallService implements CallServiceContract {
  async processEvent(_payload: EventPayload): Promise<CallEvent> {
    const { callId } = _payload;
    let metadata: Record<string, unknown> = {..._payload}
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

      if(callResult.rowCount === 0) throw new Error(`Call with ID ${callId} not found`);
      const call = callResult.rows[0];
      if(call.status !== 'waiting') throw new Error(`Invalid state transition from ${call.status} to active`);
      await db.query(`UPDATE  calls SET status = 'active' WHERE ID = $1`, [callId]);
      if(waitTime > 30) {
        metadata = {..._payload, flag: 'WAIT_TIME_EXCEEDED'};
        const result = await db.query(`INSERT INTO call_events (id, call_id, type, metadata) VALUES ($1,$2,$3,$4) RETURNING *`, [uuidv4(), callId, _payload.event, metadata]);
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
        _payload
      ]
    );

    return result.rows[0];
  }

  async getCalls(_filters: CallFilters): Promise<Call[]> {
    throw new Error('CallService.getCalls not implemented');
  }

  async getCallEvents(_callId: string): Promise<CallEvent[]> {
    throw new Error('CallService.getCallEvents not implemented');
  }
}
