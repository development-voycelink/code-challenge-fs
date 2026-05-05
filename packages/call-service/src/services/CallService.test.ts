import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CallService } from "./index";
import {Call, CallEvent} from "../domain/call";
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

// Mock CallRepository
vi.mock('../db/callRepository', () => ({
  CallRepository: vi.fn().mockImplementation(() => ({
    createCall: vi.fn(),
    getCallById: vi.fn(),
    updateCallStatus: vi.fn(),
    createCallEvent: vi.fn(),
    getCalls: vi.fn(),
    getCallEvents: vi.fn()
  }))
}));

describe('CallService', () => {
  let callService: CallService;
  let mockCallRepository: any;

  beforeEach(() => {
    mockCallRepository = {
      createCall: vi.fn(),
      getCallById: vi.fn(),
      updateCallStatus: vi.fn(),
      createCallEvent: vi.fn(),
      getCalls: vi.fn(),
      getCallEvents: vi.fn()
    };
    callService = new CallService(mockCallRepository);
    vi.clearAllMocks();
  });

  describe('processEvent', () => {
    it('processes call_initiated and persists the call', async () => {
      const payload: CallInitiatedPayload = {
        event: 'call_initiated',
        callId: 'test-call-id',
        type: 'voice',
        queueId: 'medical_spanish'
      };

      // Mock repository responses
      mockCallRepository.getCallById.mockResolvedValueOnce(null); // No existing call
      mockCallRepository.createCall.mockResolvedValueOnce({ id: 'test-call-id' });
      mockCallRepository.createCallEvent.mockResolvedValueOnce({ id: 'event-id' });

      const result = await callService.processEvent(payload);

      expect(result).toBeInstanceOf(CallEvent);
      expect(result).toHaveProperty('id');
      expect(result.callId).toBe('test-call-id');
      expect(result.type).toBe('call_initiated');
      expect(mockCallRepository.getCallById).toHaveBeenCalledTimes(1);
      expect(mockCallRepository.createCall).toHaveBeenCalledTimes(1);
      expect(mockCallRepository.createCallEvent).toHaveBeenCalledTimes(1);
    });

    it('throws error for invalid queueId in call_initiated', async () => {
      const payload: CallInitiatedPayload = {
        event: 'call_initiated',
        callId: 'test-call-id',
        type: 'voice',
        queueId: 'invalid_queue' as any
      };

      await expect(callService.processEvent(payload)).rejects.toThrow('Invalid queueId');
    });

    it('throws error for duplicate call in call_initiated', async () => {
      const payload: CallInitiatedPayload = {
        event: 'call_initiated',
        callId: 'test-call-id',
        type: 'voice',
        queueId: 'medical_spanish'
      };

      // Mock repository responses - call already exists
      mockCallRepository.getCallById.mockResolvedValueOnce({ id: 'test-call-id' }); // Existing call found

      await expect(callService.processEvent(payload)).rejects.toThrow('already exists');
    });

    it('processes call_answered and updates call status to active', async () => {
      const payload: CallAnsweredPayload = {
        event: 'call_answered',
        callId: 'test-call-id',
        waitTime: 25
      };

      // Mock repository responses
      const mockCall = { id: 'test-call-id', status: 'waiting', startTime: new Date() };
      mockCallRepository.getCallById.mockResolvedValueOnce(mockCall);
      mockCallRepository.updateCallStatus.mockResolvedValueOnce(undefined);
      mockCallRepository.createCallEvent.mockResolvedValueOnce({ id: 'event-id' });

      const result = await callService.processEvent(payload);

      expect(result).toBeInstanceOf(CallEvent);
      expect(result.callId).toBe('test-call-id');
      expect(result.type).toBe('call_answered');
      expect(result.metadata?.waitTime).toBe(25);
      expect(mockCallRepository.getCallById).toHaveBeenCalledTimes(1);
      expect(mockCallRepository.updateCallStatus).toHaveBeenCalledTimes(1);
      expect(mockCallRepository.createCallEvent).toHaveBeenCalledTimes(1);
    });

    it('flags call_answered when waitTime exceeds 30 seconds', async () => {
      const payload: CallAnsweredPayload = {
        event: 'call_answered',
        callId: 'test-call-id',
        waitTime: 35
      };

      // Mock repository responses
      const mockCall = { id: 'test-call-id', status: 'waiting', startTime: new Date() };
      mockCallRepository.getCallById.mockResolvedValueOnce(mockCall);
      mockCallRepository.updateCallStatus.mockResolvedValueOnce(undefined);
      mockCallRepository.createCallEvent.mockResolvedValueOnce({ id: 'event-id' });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await callService.processEvent(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('SLA breach: Call test-call-id waited 35 seconds before being answered')
      );

      consoleSpy.mockRestore();
    });

    it('processes call_hold and updates call status to on_hold', async () => {
      const payload: CallHoldPayload = {
        event: 'call_hold',
        callId: 'test-call-id',
        holdDuration: 30
      };

      // Mock repository responses
      const mockCall = { id: 'test-call-id', status: 'active', holdStartTime: null };
      mockCallRepository.getCallById.mockResolvedValueOnce(mockCall);
      mockCallRepository.updateCallStatus.mockResolvedValueOnce(undefined);
      mockCallRepository.createCallEvent.mockResolvedValueOnce({ id: 'event-id' });

      const result = await callService.processEvent(payload);

      expect(result).toBeInstanceOf(CallEvent);
      expect(result.callId).toBe('test-call-id');
      expect(result.type).toBe('call_hold');
      expect(result.metadata?.holdDuration).toBe(30);
      expect(mockCallRepository.getCallById).toHaveBeenCalledTimes(1);
      expect(mockCallRepository.updateCallStatus).toHaveBeenCalledTimes(1);
      expect(mockCallRepository.createCallEvent).toHaveBeenCalledTimes(1);
    });

    it('flags call_hold when holdDuration exceeds 60 seconds', async () => {
      const payload: CallHoldPayload = {
        event: 'call_hold',
        callId: 'test-call-id',
        holdDuration: 75
      };

      // Mock repository responses
      const mockCall = { id: 'test-call-id', status: 'active', holdStartTime: null };
      mockCallRepository.getCallById.mockResolvedValueOnce(mockCall);
      mockCallRepository.updateCallStatus.mockResolvedValueOnce(undefined);
      mockCallRepository.createCallEvent.mockResolvedValueOnce({ id: 'event-id' });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await callService.processEvent(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Hold time exceeded: Call test-call-id has been on hold for 75 seconds')
      );

      consoleSpy.mockRestore();
    });

    it('processes call_ended and updates call status to ended', async () => {
      const payload: CallEndedPayload = {
        event: 'call_ended',
        callId: 'test-call-id',
        endReason: 'completed',
        duration: 120
      };

      // Mock repository responses
      const mockCall = { id: 'test-call-id', status: 'active', startTime: new Date() };
      mockCallRepository.getCallById.mockResolvedValueOnce(mockCall);
      mockCallRepository.updateCallStatus.mockResolvedValueOnce(undefined);
      mockCallRepository.createCallEvent.mockResolvedValueOnce({ id: 'event-id' });

      const result = await callService.processEvent(payload);

      expect(result).toBeInstanceOf(CallEvent);
      expect(result.callId).toBe('test-call-id');
      expect(result.type).toBe('call_ended');
      expect(result.metadata?.endReason).toBe('completed');
      expect(result.metadata?.duration).toBe(120);
      expect(mockCallRepository.getCallById).toHaveBeenCalledTimes(1);
      expect(mockCallRepository.updateCallStatus).toHaveBeenCalledTimes(1);
      expect(mockCallRepository.createCallEvent).toHaveBeenCalledTimes(1);
    });

    it('flags call_ended when duration is under 10 seconds', async () => {
      const payload: CallEndedPayload = {
        event: 'call_ended',
        callId: 'test-call-id',
        endReason: 'completed',
        duration: 5
      };

      // Mock repository responses
      const mockCall = { id: 'test-call-id', status: 'active', startTime: new Date() };
      mockCallRepository.getCallById.mockResolvedValueOnce(mockCall);
      mockCallRepository.updateCallStatus.mockResolvedValueOnce(undefined);
      mockCallRepository.createCallEvent.mockResolvedValueOnce({ id: 'event-id' });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await callService.processEvent(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Short call: Call test-call-id ended after only 5 seconds')
      );

      consoleSpy.mockRestore();
    });

    it('throws error for unsupported event type', async () => {
      // @ts-ignore - intentionally testing invalid event type
      const payload = {
        event: 'unsupported_event',
        callId: 'test-call-id',
        // Adding required fields to satisfy TypeScript but they won't be used for this test
        endReason: 'completed',
        duration: 0
      } as CallEndedPayload;

      await expect(callService.processEvent(payload)).rejects.toThrow('Unsupported event type: unsupported_event');
    });
  });

   describe('getCalls', () => {
     it('returns calls with optional filtering', async () => {
       const mockRows = [
         { id: 'call1', type: 'voice' as const, status: 'waiting' as const, queueId: 'medical_spanish' as const, startTime: new Date(), endTime: undefined },
         { id: 'call2', type: 'video' as const, status: 'active' as const, queueId: 'medical_english' as const, startTime: new Date(), endTime: undefined }
       ];

       mockCallRepository.getCalls.mockResolvedValueOnce(mockRows);

       const filters = { status: 'waiting' as const };
       const result = await callService.getCalls(filters);

       expect(result).toHaveLength(2);
       expect(result[0]).toBeInstanceOf(Call);
       expect(result[0].id).toBe('call1');
       expect(result[0].status).toBe('waiting');
       expect(mockCallRepository.getCalls).toHaveBeenCalled();
     });

     it('returns all calls when no filters provided', async () => {
       const mockRows = [
         { id: 'call1', type: 'voice' as const, status: 'waiting' as const, queueId: 'medical_spanish' as const, startTime: new Date(), endTime: undefined }
       ];

       mockCallRepository.getCalls.mockResolvedValueOnce(mockRows);

       const result = await callService.getCalls({});

       expect(result).toHaveLength(1);
       expect(mockCallRepository.getCalls).toHaveBeenCalled();
     });
   });

   describe('getCallEvents', () => {
     it('returns events for a specific call in chronological order', async () => {
       const mockRows = [
         { id: 'event1', callId: 'test-call-id', type: 'call_initiated', timestamp: new Date(Date.now() - 10000), metadata: {} },
         { id: 'event2', callId: 'test-call-id', type: 'call_answered', timestamp: new Date(Date.now() - 5000), metadata: { waitTime: 25 } }
       ];

       // Mock call existence check
       mockCallRepository.getCallById.mockResolvedValueOnce(new Call(
         'test-call-id',
         'voice' as const,
         'waiting' as const,
         'medical_spanish' as const,
         new Date(),
         undefined
       )); // Call exists
       mockCallRepository.getCallEvents.mockResolvedValueOnce(mockRows); // Get events

       const result = await callService.getCallEvents('test-call-id');

       expect(result).toHaveLength(2);
       expect(result[0]).toBeInstanceOf(CallEvent);
       expect(result[0].type).toBe('call_initiated');
       expect(result[1].type).toBe('call_answered');
       expect(mockCallRepository.getCallById).toHaveBeenCalledTimes(1);
       expect(mockCallRepository.getCallEvents).toHaveBeenCalledTimes(1);
     });

     it('throws error for non-existent call', async () => {
       // Mock call existence check - call not found
       mockCallRepository.getCallById.mockResolvedValueOnce(null);

       await expect(callService.getCallEvents('non-existent-call')).rejects.toThrow('Call not found');
     });
   });
});
