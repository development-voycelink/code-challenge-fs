import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import  app  from '../app';
import { db } from '../db/client';

describe('POST /api/events', () => {
  beforeEach(async () => {
    await db.query('DELETE FROM call_events');
    await db.query('DELETE FROM calls');
  });
  const API_KEY = 'change-me';
  it('returns 201 and persists the event for a valid call_initiated payload', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('x-api-key', API_KEY)
      .send({
        event: 'call_initiated',
        callId: 'int-1',
        type: 'voice',
        queueId: 'medical_spanish',
      });

    expect(res.status).toBe(201);
    expect(res.body.callId).toBe('int-1');

    const result = await db.query(
      'SELECT * FROM calls WHERE id = $1',
      ['int-1']
    );

    expect(result.rowCount).toBe(1);
  });

  it('returns 400 for an invalid payload', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('x-api-key', 'change-me')
      .send({
        event: 'call_initiated',
        callId: 'int-2',
        type: 'voice',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid event payload');
    expect(res.body.issues).toBeDefined();
  });

  it('returns 401 when the API key is missing', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({
        event: 'call_initiated',
        callId: 'int-3',
        type: 'voice',
        queueId: 'medical_spanish',
      });
    expect(res.status).toBe(401);
    expect(res.body.message).toBeDefined();
  });
});
