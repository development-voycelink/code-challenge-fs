import request from 'supertest';
import { app } from '../../index';

const apiKey = 'supersecreta123';

describe('Call lifecycle integration test', () => {
  const callId = 'integration-test-001';

  it('should create and update a call through events', async () => {
    // 1. Enviar call_initiated
    const initiated = await request(app)
      .post('/api/events')
      .set('x-api-key', apiKey)
      .send({
        call_id: callId,
        type: 'call_initiated',
        metadata: {
          via: 'voice',
          queue_id: 'test_queue'
        }
      });

    expect(initiated.status).toBe(201);

    // 2. Enviar call_answered
    const answered = await request(app)
      .post('/api/events')
      .set('x-api-key', apiKey)
      .send({
        call_id: callId,
        type: 'call_answered',
        metadata: {
          agent_id: 'agent123',
          wait_time: 20,
          queue_id: 'test_queue'
        }
      });

    expect(answered.status).toBe(201);

    // 3. Consultar llamada
    const response = await request(app)
      .get('/api/calls?status=active')
      .set('x-api-key', apiKey);

    expect(response.status).toBe(200);

    const match = response.body.find((c: any) => c.id === callId);
    expect(match).toBeDefined();
    expect(match.status).toBe('active');
    expect(match.queue_id).toBe('test_queue');
  });
});
