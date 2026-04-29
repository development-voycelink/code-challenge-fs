import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import eventsRouter from './events';
import { callService } from '../services';

vi.mock('../services', () => ({
  callService: {
    processEvent: vi.fn(),
  },
}));

vi.mock('../config', () => ({
  config: {
    apiKey: 'test-key',
  },
}));

const app = express();
app.use(express.json());
app.use('/api/events', eventsRouter);

describe('POST /api/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 and persists the event for a valid call_initiated payload', async () => {
    const payload = {
      event: 'call_initiated',
      callId: 'call-1',
      type: 'voice',
      queueId: 'medical_spanish'
    };

    (callService.processEvent as any).mockResolvedValue({ id: 'event-1', type: 'call_initiated' });

    const res = await request(app)
      .post('/api/events')
      .set('x-api-key', 'test-key')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'event-1', type: 'call_initiated' });
    expect(callService.processEvent).toHaveBeenCalledWith(payload, undefined);
  });

  it('returns 400 for an invalid payload', async () => {
    const payload = {
      event: 'call_initiated',
      // missing callId, type, queueId
    };

    const res = await request(app)
      .post('/api/events')
      .set('x-api-key', 'test-key')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid event payload');
  });

  it('returns 401 when the API key is missing', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({}); // No authorization header

    expect(res.status).toBe(401);
  });
});
