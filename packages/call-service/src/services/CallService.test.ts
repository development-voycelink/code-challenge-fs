import { describe, it } from 'vitest';

describe('CallService', () => {
  it.todo('processes call_initiated and persists the call');
  it.todo('processes call_answered and updates call status to active');
  it.todo('flags call_answered when waitTime exceeds 30 seconds');
  it.todo('flags call_hold when holdDuration exceeds 60 seconds');
  it.todo('flags call_ended when duration is under 10 seconds');
});
