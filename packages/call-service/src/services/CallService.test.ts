import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CallService } from "./CallService";
import { CallEvent } from "../domain/call";
import { CallAnsweredPayload, CallEndedPayload, CallHoldPayload, CallInitiatedPayload } from "@voycelink/contracts";
import { db } from '../db/client';

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

describe('CallService', () => {
  let callService: CallService;

  beforeEach(() => {
    callService = new CallService();
    vi.clearAllMocks();
  });

  it.todo('processes call_initiated and persists the call', async () => {
    const payload: CallInitiatedPayload = {
      event: 'call_initiated',
      callId: 'test-call-id',
      type: 'voice',
      queueId: 'medical_spanish'
    };

    // Mock database responses
    (db.query as any).mockResolvedValueOnce({ rowCount: 0 }); // No existing call
    (db.query as any).mockResolvedValueOnce({}); // Insert call
    (db.query as any).mockResolvedValueOnce({}); // Insert event

    const result = await callService.processEvent(payload);

    expect(result).toBeInstanceOf(CallEvent);
    expect(result).toHaveProperty('id');
    expect(result.callId).toBe('test-call-id');
    expect(result.type).toBe('call_initiated');
    expect(db.query).toHaveBeenCalledTimes(3);
  });

  it.todo('processes call_answered and updates call status to active', async () => {
    const payload: CallAnsweredPayload = {
      event: 'call_answered',
      callId: 'test-call-id',
      waitTime: 25
    };

    // Mock database responses
    (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'test-call-id', status: 'waiting', startTime: new Date() }] }); // Get call
    (db.query as any).mockResolvedValueOnce({}); // Update call
    (db.query as any).mockResolvedValueOnce({}); // Insert event

    const result = await callService.processEvent(payload);

    expect(result).toBeInstanceOf(CallEvent);
    expect(result.callId).toBe('test-call-id');
    expect(result.type).toBe('call_answered');
    expect(result.metadata?.waitTime).toBe(25);
    expect(db.query).toHaveBeenCalledTimes(3);
  });

  it.todo('flags call_answered when waitTime exceeds 30 seconds', async () => {
    const payload: CallAnsweredPayload = {
      event: 'call_answered',
      callId: 'test-call-id',
      waitTime: 35
    };

    // Mock database responses
    (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'test-call-id', status: 'waiting', startTime: new Date() }] }); // Get call
    (db.query as any).mockResolvedValueOnce({}); // Update call
    (db.query as any).mockResolvedValueOnce({}); // Insert event

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await callService.processEvent(payload);

    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SLA breach: Call test-call-id waited 35 seconds before being answered')
    );

    consoleSpy.mockRestore();
  });

  it.todo('flags call_hold when holdDuration exceeds 60 seconds', async () => {
    const payload: CallHoldPayload = {
      event: 'call_hold',
      callId: 'test-call-id',
      holdDuration: 75
    };

    // Mock database responses
    (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'test-call-id', status: 'active', holdStartTime: null }] }); // Get call
    (db.query as any).mockResolvedValueOnce({}); // Update call
    (db.query as any).mockResolvedValueOnce({}); // Insert event

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await callService.processEvent(payload);

    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hold time exceeded: Call test-call-id has been on hold for 75 seconds')
    );

    consoleSpy.mockRestore();
  });

  it.todo('flags call_ended when duration is under 10 seconds', async () => {
    const payload: CallEndedPayload = {
      event: 'call_ended',
      callId: 'test-call-id',
      endReason: 'completed',
      duration: 5
    };

    // Mock database responses
    (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'test-call-id', status: 'active', startTime: new Date() }] }); // Get call
    (db.query as any).mockResolvedValueOnce({}); // Update call
    (db.query as any).mockResolvedValueOnce({}); // Insert event

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await callService.processEvent(payload);

    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Short call: Call test-call-id ended after only 5 seconds')
    );

    consoleSpy.mockRestore();
  });
});
