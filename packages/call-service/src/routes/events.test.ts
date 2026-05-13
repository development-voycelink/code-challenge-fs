import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { db } from '../db/client';
import { callsTable, callEventsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

const API_KEY = process.env.API_KEY ?? 'change-me';

const TEST_CALL_ID = 'integration-test-call-001';

afterEach(async () => {
  await db.delete(callEventsTable).where(eq(callEventsTable.callId, TEST_CALL_ID));
  await db.delete(callsTable).where(eq(callsTable.id, TEST_CALL_ID));
});

describe('POST /api/events', () => {
  it('returns 201, persists the call and event for a valid call_initiated payload', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('x-api-key', API_KEY)
      .send({
        event: 'call_initiated',
        callId: TEST_CALL_ID,
        type: 'voice',
        queueId: 'medical_english',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ callId: TEST_CALL_ID, type: 'call_initiated' });

    const [call] = await db.select().from(callsTable).where(eq(callsTable.id, TEST_CALL_ID));
    expect(call).toBeDefined();
    expect(call!.status).toBe('waiting');

    const events = await db
      .select()
      .from(callEventsTable)
      .where(eq(callEventsTable.callId, TEST_CALL_ID));
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('call_initiated');
  });

  it('returns 400 with Zod issues for an invalid payload', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('x-api-key', API_KEY)
      .send({ event: 'call_initiated', callId: TEST_CALL_ID });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'Invalid event payload', issues: expect.any(Array) });
  });

  it('returns 401 when the API key is missing', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({ event: 'call_initiated', callId: TEST_CALL_ID, type: 'voice', queueId: 'medical_english' });

    expect(res.status).toBe(401);
  });
});
