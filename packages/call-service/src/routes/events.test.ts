import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { CallInitiatedPayload } from '@voycelink/contracts';
import {db} from "../db/client";
import {createServer} from "../index";

// Mock the database module
vi.mock('../db/client', () => ({
  db: {
    query: vi.fn()
  }
}));

// Mock the publisher
vi.mock('../bus/publisher', () => ({
  publishStatusUpdate: vi.fn()
}));

describe('POST /api/events', () => {
  let app: ReturnType<typeof createServer>;

  beforeEach(() => {
    app = createServer();
    vi.clearAllMocks();
  });

  it.todo('returns 201 and persists the event for a valid call_initiated payload', async () => {
    const payload: CallInitiatedPayload = {
      event: 'call_initiated',
      callId: 'test-call-id',
      type: 'voice',
      queueId: 'medical_spanish'
    };

    // Mock database responses
    // 1. Check if call exists (rowCount: 0 means it doesn't exist)
    // 2. Insert call (resolve with empty object)
    // 3. Insert event (resolve with empty object)
    (db.query as any)
        .mockResolvedValueOnce({ rowCount: 0 }) // No existing call
        .mockResolvedValueOnce({}) // Insert call
        .mockResolvedValueOnce({}); // Insert event

    const response = await request(app)
        .post('/api/events')
        .set('x-api-key', 'test-api-key')
        .send(payload)
        .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.callId).toBe('test-call-id');
    expect(response.body.type).toBe('call_initiated');
  });

  it.todo('returns 400 for an invalid payload', async () => {
    const invalidPayload = {
      event: 'call_initiated',
      callId: 'test-call-id',
      // Missing required fields
    };

    await request(app)
        .post('/api/events')
        .set('x-api-key', 'test-api-key')
        .send(invalidPayload)
        .expect(400);
  });

  it.todo('returns 401 when the API key is missing', async () => {
    const payload: CallInitiatedPayload = {
      event: 'call_initiated',
      callId: 'test-call-id',
      type: 'voice',
      queueId: 'medical_spanish'
    };

    await request(app)
        .post('/api/events')
        // No API key
        .send(payload)
        .expect(401);
  });
});
