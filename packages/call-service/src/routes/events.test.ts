import express, { Express } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CallNotFoundError } from '../domain/call';

const processEventMock = vi.fn();

vi.mock('../services', () => ({
  callService: {
    processEvent: processEventMock,
  },
}));

describe('POST /api/events', () => {
  let app: Express;

  const validPayload = {
    event: 'call_initiated',
    callId: 'call-1',
    type: 'voice',
    queueId: 'medical_spanish',
  } as const;

  beforeAll(async () => {
    process.env.API_KEY = 'change-me';
    const { default: eventsRouter } = await import('./events');
    app = express();
    app.use(express.json());
    app.use('/api/events', eventsRouter);
  });

  beforeEach(() => {
    processEventMock.mockReset();
  });

  it('returns 201 and persists the event for a valid call_initiated payload', async () => {
    const persistedEvent = {
      id: 'event-1',
      callId: 'call-1',
      type: 'call_initiated',
      timestamp: new Date('2026-01-01T00:00:00.000Z'),
      metadata: { slaSeconds: 30 },
    };
    processEventMock.mockResolvedValueOnce(persistedEvent);

    const response = await request(app)
      .post('/api/events')
      .set('X-API-Key', 'change-me')
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      ...persistedEvent,
      timestamp: persistedEvent.timestamp.toISOString(),
    });
    expect(processEventMock).toHaveBeenCalledOnce();
    expect(processEventMock).toHaveBeenCalledWith(validPayload);
  });

  it('returns 400 for an invalid payload', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('X-API-Key', 'change-me')
      .send({
        event: 'call_initiated',
        callId: 'call-1',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid event payload');
    expect(processEventMock).not.toHaveBeenCalled();
  });

  it('returns 401 when the API key is missing', async () => {
    const response = await request(app).post('/api/events').send(validPayload);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Unauthorized' });
    expect(processEventMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the call does not exist', async () => {
    processEventMock.mockRejectedValueOnce(new CallNotFoundError('missing-call'));

    const response = await request(app)
      .post('/api/events')
      .set('X-API-Key', 'change-me')
      .send({
        event: 'call_ended',
        callId: 'missing-call',
        endReason: 'completed',
        duration: 90,
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Call not found' });
  });
});
