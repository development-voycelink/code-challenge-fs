import { describe, it, expect, beforeEach} from 'vitest';
import { CallService } from './CallService';
import { db } from '../db/client';

describe('CallService', () => {
    const service = new CallService();

  beforeEach(async () => {
    await db.query('DELETE FROM call_events');
    await db.query('DELETE FROM calls');
  });

  it('processes call_initiated and persists the call', async () => {
    await service.processEvent({
      event: 'call_initiated',
      callId: 'test-1',
      type: 'voice',
      queueId: 'medical_spanish',
    });

    const result = await db.query('SELECT * FROM calls WHERE id = $1',['test-1']);

    expect(result.rowCount).toBe(1);
    expect(result.rows[0].status).toBe('waiting');
  }); 


    it('processes call_answered and updates call status to active', async () => {
    await service.processEvent({
      event: 'call_initiated',
      callId: 'test-2',
      type: 'voice',
      queueId: 'medical_spanish',
    });

    await service.processEvent({
      event: 'call_answered',
      callId: 'test-2',
      waitTime: 10,
    });
    const result = await db.query('SELECT status FROM calls WHERE id = $1',['test-2']);

    expect(result.rows[0].status).toBe('active');
  });


    it('flags call_answered when waitTime exceeds 30 seconds', async () => {
    await service.processEvent({
      event: 'call_initiated',
      callId: 'test-3',
      type: 'voice',
      queueId: 'medical_spanish',
    });

    const event = await service.processEvent({
      event: 'call_answered',
      callId: 'test-3',
      waitTime: 40,
    });

    expect(event.metadata?.flag).toBe('WAIT_TIME_EXCEEDED');
  });

    it('flags call_hold when holdDuration exceeds 60 seconds', async () => {
    await service.processEvent({
      event: 'call_initiated',
      callId: 'test-4',
      type: 'voice',
      queueId: 'medical_spanish',
    });
    await service.processEvent({
      event: 'call_answered',
      callId: 'test-4',
      waitTime: 10,
    });
    const event = await service.processEvent({
      event: 'call_hold',
      callId: 'test-4',
      holdDuration: 70,
    });

    expect(event.metadata?.flag).toBe('HOLD_TIME_EXCEEDED');
  });

    it('flags call_ended when duration is under 10 seconds', async () => {
    await service.processEvent({
      event: 'call_initiated',
      callId: 'test-5',
      type: 'voice',
      queueId: 'medical_spanish',
    });

    await service.processEvent({
      event: 'call_answered',
      callId: 'test-5',
      waitTime: 5,
    });

    const event = await service.processEvent({
      event: 'call_ended',
      callId: 'test-5',
      duration: 5,
      endReason: 'completed',
    });

    expect(event.metadata?.flag).toBe('SHORT_CALL');
  });
});
