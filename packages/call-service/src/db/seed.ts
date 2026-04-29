import 'dotenv/config';
import { db } from './client';

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

const MOCK_CALLS = [
  {
    id: 'c-001',
    type: 'video',
    status: 'active',
    queueId: 'medical_spanish',
    startTime: minsAgo(5),
    endTime: null,
  },
  {
    id: 'c-002',
    type: 'voice',
    status: 'waiting',
    queueId: 'medical_english',
    startTime: minsAgo(2),
    endTime: null,
  },
  {
    id: 'c-003',
    type: 'video',
    status: 'on_hold',
    queueId: 'medical_spanish',
    startTime: minsAgo(12),
    endTime: null,
  },
  {
    id: 'c-004',
    type: 'voice',
    status: 'ended',
    queueId: 'medical_english',
    startTime: minsAgo(30),
    endTime: minsAgo(25),
  },
  {
    id: 'c-005',
    type: 'video',
    status: 'active',
    queueId: 'legal_spanish',
    startTime: minsAgo(8),
    endTime: null,
  },
  {
    id: 'c-006',
    type: 'voice',
    status: 'waiting',
    queueId: 'medical_spanish',
    startTime: minsAgo(1),
    endTime: null,
  },
  {
    id: 'c-007',
    type: 'video',
    status: 'ended',
    queueId: 'legal_english',
    startTime: minsAgo(60),
    endTime: minsAgo(45),
  },
  {
    id: 'c-008',
    type: 'voice',
    status: 'active',
    queueId: 'medical_english',
    startTime: minsAgo(3),
    endTime: null,
  },
];

const MOCK_EVENTS = [
  {
    id: 'e-001-1',
    callId: 'c-001',
    type: 'call_initiated',
    timestamp: minsAgo(5),
    metadata: { type: 'video', queueId: 'medical_spanish' },
  },
  {
    id: 'e-001-2',
    callId: 'c-001',
    type: 'call_routed',
    timestamp: minsAgo(4),
    metadata: { agentId: 'agent_42', routingTime: 15 },
  },
  {
    id: 'e-001-3',
    callId: 'c-001',
    type: 'call_answered',
    timestamp: minsAgo(3),
    metadata: { waitTime: 25 },
  },
  {
    id: 'e-003-1',
    callId: 'c-003',
    type: 'call_initiated',
    timestamp: minsAgo(12),
    metadata: { type: 'video', queueId: 'medical_spanish' },
  },
  {
    id: 'e-003-2',
    callId: 'c-003',
    type: 'call_routed',
    timestamp: minsAgo(11),
    metadata: { agentId: 'agent_18', routingTime: 12 },
  },
  {
    id: 'e-003-3',
    callId: 'c-003',
    type: 'call_answered',
    timestamp: minsAgo(10),
    metadata: { waitTime: 12 },
  },
  {
    id: 'e-003-4',
    callId: 'c-003',
    type: 'call_hold',
    timestamp: minsAgo(5),
    metadata: { holdDuration: 45 },
  },
  {
    id: 'e-004-1',
    callId: 'c-004',
    type: 'call_initiated',
    timestamp: minsAgo(30),
    metadata: { type: 'voice', queueId: 'medical_english' },
  },
  {
    id: 'e-004-2',
    callId: 'c-004',
    type: 'call_routed',
    timestamp: minsAgo(29),
    metadata: { agentId: 'agent_07', routingTime: 8 },
  },
  {
    id: 'e-004-3',
    callId: 'c-004',
    type: 'call_answered',
    timestamp: minsAgo(28),
    metadata: { waitTime: 8 },
  },
  {
    id: 'e-004-4',
    callId: 'c-004',
    type: 'call_ended',
    timestamp: minsAgo(25),
    metadata: { endReason: 'completed', duration: 300 },
  },
  {
    id: 'e-007-1',
    callId: 'c-007',
    type: 'call_initiated',
    timestamp: minsAgo(60),
    metadata: { type: 'video', queueId: 'legal_english' },
  },
  {
    id: 'e-007-2',
    callId: 'c-007',
    type: 'call_routed',
    timestamp: minsAgo(58),
    metadata: { agentId: 'agent_33', routingTime: 20 },
  },
  {
    id: 'e-007-3',
    callId: 'c-007',
    type: 'call_answered',
    timestamp: minsAgo(57),
    metadata: { waitTime: 35 },
  },
  {
    id: 'e-007-4',
    callId: 'c-007',
    type: 'call_ended',
    timestamp: minsAgo(45),
    metadata: { endReason: 'completed', duration: 720 },
  },
];

async function seed() {
  console.log('Seeding database...');
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Clean existing data for a fresh seed
    await client.query('DELETE FROM call_events');
    await client.query('DELETE FROM outbox_events');
    await client.query('DELETE FROM calls');
    
    // Insert Calls
    for (const call of MOCK_CALLS) {
      await client.query(
        `INSERT INTO calls (id, type, status, queue_id, start_time, end_time) VALUES ($1, $2, $3, $4, $5, $6)`,
        [call.id, call.type, call.status, call.queueId, call.startTime, call.endTime]
      );
    }

    // Insert Events
    for (const event of MOCK_EVENTS) {
      await client.query(
        `INSERT INTO call_events (id, call_id, type, timestamp, metadata) VALUES ($1, $2, $3, $4, $5)`,
        [event.id, event.callId, event.type, event.timestamp, JSON.stringify(event.metadata)]
      );
    }

    await client.query('COMMIT');
    console.log('Seed completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
