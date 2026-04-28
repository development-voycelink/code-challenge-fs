import { Call, CallEvent } from '../types';

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

export const MOCK_CALLS: Call[] = [
  {
    id: 'c-001',
    type: 'video',
    status: 'active',
    queueId: 'medical_spanish',
    startTime: minsAgo(5),
  },
  {
    id: 'c-002',
    type: 'voice',
    status: 'waiting',
    queueId: 'medical_english',
    startTime: minsAgo(2),
  },
  {
    id: 'c-003',
    type: 'video',
    status: 'on_hold',
    queueId: 'medical_spanish',
    startTime: minsAgo(12),
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
  },
  {
    id: 'c-006',
    type: 'voice',
    status: 'waiting',
    queueId: 'medical_spanish',
    startTime: minsAgo(1),
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
  },
];

export const MOCK_EVENTS: Record<string, CallEvent[]> = {
  'c-001': [
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
  ],
  'c-003': [
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
  ],
  'c-004': [
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
  ],
  'c-007': [
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
  ],
};
