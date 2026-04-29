import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CallService } from './CallService';
import { callRepository } from '../db/CallRepository';
import { slaManager } from './SlaManager';

vi.mock('../db/CallRepository', () => ({
  callRepository: {
    getEventByIdempotencyKey: vi.fn(),
    processEventTransaction: vi.fn(),
  },
}));

vi.mock('./SlaManager', () => ({
  slaManager: {
    handleTimersAndRules: vi.fn(),
  },
}));

describe('CallService', () => {
  let callService: CallService;

  beforeEach(() => {
    vi.clearAllMocks();
    callService = new CallService();
  });

  it('processes call_initiated and delegates to repository', async () => {
    const payload = {
      event: 'call_initiated' as const,
      callId: 'call-1',
      type: 'voice' as const,
      queueId: 'medical_spanish' as const,
    };

    const result = await callService.processEvent(payload);

    expect(result.type).toBe('call_initiated');
    expect(callRepository.processEventTransaction).toHaveBeenCalledWith(
      payload,
      expect.any(String),
      'waiting',
      expect.any(Date),
      undefined
    );
    expect(slaManager.handleTimersAndRules).toHaveBeenCalledWith(payload, 'waiting');
  });

  it('skips processing if idempotency key exists', async () => {
    const payload = {
      event: 'call_answered' as const,
      callId: 'call-1',
      waitTime: 10,
    };

    const existingEvent = { id: 'evt-1', type: 'call_answered' } as any;
    (callRepository.getEventByIdempotencyKey as any).mockResolvedValue(existingEvent);

    const result = await callService.processEvent(payload, 'idemp-123');

    expect(result).toBe(existingEvent);
    expect(callRepository.processEventTransaction).not.toHaveBeenCalled();
    expect(slaManager.handleTimersAndRules).not.toHaveBeenCalled();
  });
});
