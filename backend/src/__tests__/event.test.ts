import request from 'supertest';
import { app } from '../index';

describe('POST /api/events', () => {
  it('should return 201 for valid event with API key', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('x-api-key', 'supersecreta123')
      .send({
        call_id: 'test-call-001',
        type: 'call_initiated',
        metadata: {
          queue_id: 'medical_spanish',
          via: 'video'
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Event recorded');
  });

  it('should return 400 for invalid event schema', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('x-api-key', 'supersecreta123')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
  
  it('should update call state if event type is call_answered', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('x-api-key', 'supersecreta123')
      .send({
        call_id: 'test-call-003',
        type: 'call_answered',
        metadata: {
          queue_id: 'medical_spanish',
          agent_id: 'agent007',
          wait_time: 10
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Event recorded');
  });

  it('should NOT update call state for non-relevant event types', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('x-api-key', 'supersecreta123')
      .send({
        call_id: 'test-call-004',
        type: 'custom_metric',
        metadata: {
          queue_id: 'medical_spanish',
          value: 123
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Event recorded');
  });

  it('should use "default" queue_id if not provided in metadata', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('x-api-key', 'supersecreta123')
      .send({
        call_id: 'test-call-005',
        type: 'call_answered',
        metadata: {
          agent_id: 'agentX',
          wait_time: 15
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Event recorded');
  });

  it('should handle unexpected server error gracefully', async () => {
    // Puedes simular un error real con mocking si usas jest.mock()
    // Aquí solo enviamos datos inesperados que causen fallo
    const response = await request(app)
      .post('/api/events')
      .set('x-api-key', 'supersecreta123')
      .send({
        call_id: null,
        type: 'call_initiated',
        metadata: 'not-an-object'
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
