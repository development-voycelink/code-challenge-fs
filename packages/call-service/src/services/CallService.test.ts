import { describe, it, expect, vi, beforeEach } from "vitest";
import { CallService } from "./CallService";
import { CallRepository } from "../repositories/CallRepository";
import { CallEventRepository } from "../repositories/CallEventRepository";
import { Call, CallEvent } from "../domain/call";
import { NotFoundError, InvalidTransitionError } from "../domain/errors";
import { resolveNextStatus } from "../domain/stateMachine";
import {
  checkWaitSLA,
  checkHoldLimit,
  checkShortCall,
  checkReroute,
} from "../domain/rules";

// ─── pure domain function tests ───────────────────────────────────────────────

describe("resolveNextStatus", () => {
  it("transitions waiting → active via call_answered", () => {
    expect(resolveNextStatus("waiting", "call_answered")).toBe("active");
  });

  it("transitions active → on_hold via call_hold", () => {
    expect(resolveNextStatus("active", "call_hold")).toBe("on_hold");
  });

  it("transitions on_hold → ended via call_ended", () => {
    expect(resolveNextStatus("on_hold", "call_ended")).toBe("ended");
  });

  it("allows re-routing (waiting → waiting via call_routed)", () => {
    expect(resolveNextStatus("waiting", "call_routed")).toBe("waiting");
  });

  it("throws InvalidTransitionError for illegal transition", () => {
    expect(() => resolveNextStatus("waiting", "call_hold")).toThrow(
      InvalidTransitionError,
    );
  });

  it("throws InvalidTransitionError when transitioning from ended", () => {
    expect(() => resolveNextStatus("ended", "call_answered")).toThrow(
      InvalidTransitionError,
    );
  });
});

describe("rule checks", () => {
  it("checkWaitSLA returns null when within SLA", () => {
    expect(checkWaitSLA(30)).toBeNull();
    expect(checkWaitSLA(29)).toBeNull();
  });

  it("checkWaitSLA flags when wait time exceeds 30s", () => {
    expect(checkWaitSLA(31)).toMatchObject({ rule: "wait_sla_exceeded" });
  });

  it("checkHoldLimit returns null when within limit", () => {
    expect(checkHoldLimit(60)).toBeNull();
  });

  it("checkHoldLimit flags when hold duration exceeds 60s", () => {
    expect(checkHoldLimit(61)).toMatchObject({ rule: "hold_limit_exceeded" });
  });

  it("checkShortCall returns null for normal duration", () => {
    expect(checkShortCall(10)).toBeNull();
    expect(checkShortCall(60)).toBeNull();
  });

  it("checkShortCall flags calls under 10s", () => {
    expect(checkShortCall(9)).toMatchObject({ rule: "short_call" });
  });

  it("checkReroute flags when routing time exceeds 15s", () => {
    expect(checkReroute(16)).toMatchObject({ rule: "rerouted" });
    expect(checkReroute(15)).toBeNull();
  });
});

// ─── CallService unit tests ────────────────────────────────────────────────────

vi.mock("../bus/publisher", () => ({
  publishStatusUpdate: vi.fn().mockResolvedValue(undefined),
}));

import { publishStatusUpdate } from "../bus/publisher";

function makeCallRepo(overrides: Partial<CallRepository> = {}): CallRepository {
  return {
    findCallById: vi.fn().mockResolvedValue(null),
    createCall: vi.fn().mockResolvedValue(undefined),
    updateCallStatus: vi.fn().mockResolvedValue(undefined),
    listCalls: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    ...overrides,
  } as unknown as CallRepository;
}

function makeEventRepo(
  overrides: Partial<CallEventRepository> = {},
): CallEventRepository {
  return {
    recordEvent: vi.fn().mockResolvedValue(undefined),
    listEventsForCall: vi.fn().mockResolvedValue([]),
    findEventByTypeForCall: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as CallEventRepository;
}

function makeExistingCall(): Call {
  return new Call(
    "call-1",
    "voice",
    "waiting",
    "medical_english",
    new Date(),
    undefined,
  );
}

describe("CallService", () => {
  let callRepo: CallRepository;
  let eventRepo: CallEventRepository;
  let service: CallService;

  beforeEach(() => {
    vi.clearAllMocks();
    callRepo = makeCallRepo();
    eventRepo = makeEventRepo();
    service = new CallService(callRepo, eventRepo);
  });

  describe("processEvent: call_initiated", () => {
    it("creates a call with status waiting and records the event", async () => {
      const event = await service.processEvent({
        event: "call_initiated",
        callId: "call-1",
        type: "voice",
        queueId: "medical_english",
      });

      expect(callRepo.createCall).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "call-1",
          status: "waiting",
          type: "voice",
        }),
      );
      expect(eventRepo.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ callId: "call-1", type: "call_initiated" }),
      );
      expect(publishStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ callId: "call-1", status: "waiting" }),
      );
      expect(event.callId).toBe("call-1");
      expect(event.type).toBe("call_initiated");
    });

    it("is idempotent: returns the existing event on duplicate call_initiated", async () => {
      const existingEvent = new CallEvent(
        "evt-1",
        "call-1",
        "call_initiated",
        new Date(),
      );
      eventRepo = makeEventRepo({
        findEventByTypeForCall: vi.fn().mockResolvedValue(existingEvent),
      });
      service = new CallService(callRepo, eventRepo);

      const event = await service.processEvent({
        event: "call_initiated",
        callId: "call-1",
        type: "voice",
        queueId: "medical_english",
      });

      expect(callRepo.createCall).not.toHaveBeenCalled();
      expect(event.id).toBe("evt-1");
    });
  });

  describe("processEvent: call_answered", () => {
    it("updates call status to active", async () => {
      callRepo = makeCallRepo({
        findCallById: vi.fn().mockResolvedValue(makeExistingCall()),
      });
      service = new CallService(callRepo, eventRepo);

      await service.processEvent({
        event: "call_answered",
        callId: "call-1",
        waitTime: 10,
      });

      expect(callRepo.updateCallStatus).toHaveBeenCalledWith(
        "call-1",
        "active",
      );
    });

    it("includes wait_sla_exceeded flag when waitTime exceeds 30s", async () => {
      callRepo = makeCallRepo({
        findCallById: vi.fn().mockResolvedValue(makeExistingCall()),
      });
      service = new CallService(callRepo, eventRepo);

      await service.processEvent({
        event: "call_answered",
        callId: "call-1",
        waitTime: 35,
      });

      expect(eventRepo.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            flags: expect.arrayContaining([
              expect.objectContaining({ rule: "wait_sla_exceeded" }),
            ]),
          }),
        }),
      );
    });

    it("throws NotFoundError for an unknown callId", async () => {
      await expect(
        service.processEvent({
          event: "call_answered",
          callId: "missing",
          waitTime: 5,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("processEvent: call_hold", () => {
    it("updates call status to on_hold", async () => {
      callRepo = makeCallRepo({
        findCallById: vi
          .fn()
          .mockResolvedValue(
            new Call(
              "call-1",
              "voice",
              "active",
              "medical_english",
              new Date(),
            ),
          ),
      });
      service = new CallService(callRepo, eventRepo);

      await service.processEvent({
        event: "call_hold",
        callId: "call-1",
        holdDuration: 30,
      });

      expect(callRepo.updateCallStatus).toHaveBeenCalledWith(
        "call-1",
        "on_hold",
      );
    });

    it("includes hold_limit_exceeded flag when holdDuration exceeds 60s", async () => {
      callRepo = makeCallRepo({
        findCallById: vi
          .fn()
          .mockResolvedValue(
            new Call(
              "call-1",
              "voice",
              "active",
              "medical_english",
              new Date(),
            ),
          ),
      });
      service = new CallService(callRepo, eventRepo);

      await service.processEvent({
        event: "call_hold",
        callId: "call-1",
        holdDuration: 90,
      });

      expect(eventRepo.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            flags: expect.arrayContaining([
              expect.objectContaining({ rule: "hold_limit_exceeded" }),
            ]),
          }),
        }),
      );
    });
  });

  describe("processEvent: call_ended", () => {
    it("updates call status to ended with endTime", async () => {
      callRepo = makeCallRepo({
        findCallById: vi
          .fn()
          .mockResolvedValue(
            new Call(
              "call-1",
              "voice",
              "active",
              "medical_english",
              new Date(),
            ),
          ),
      });
      service = new CallService(callRepo, eventRepo);

      await service.processEvent({
        event: "call_ended",
        callId: "call-1",
        endReason: "completed",
        duration: 60,
      });

      expect(callRepo.updateCallStatus).toHaveBeenCalledWith(
        "call-1",
        "ended",
        expect.any(Date),
      );
    });

    it("includes short_call flag when duration is under 10s", async () => {
      callRepo = makeCallRepo({
        findCallById: vi
          .fn()
          .mockResolvedValue(
            new Call(
              "call-1",
              "voice",
              "active",
              "medical_english",
              new Date(),
            ),
          ),
      });
      service = new CallService(callRepo, eventRepo);

      await service.processEvent({
        event: "call_ended",
        callId: "call-1",
        endReason: "abandoned",
        duration: 5,
      });

      expect(eventRepo.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            flags: expect.arrayContaining([
              expect.objectContaining({ rule: "short_call" }),
            ]),
          }),
        }),
      );
    });
  });

  describe("invalid state transitions", () => {
    it("throws InvalidTransitionError when call_hold is applied to a waiting call", async () => {
      callRepo = makeCallRepo({
        findCallById: vi.fn().mockResolvedValue(makeExistingCall()),
      });
      service = new CallService(callRepo, eventRepo);

      await expect(
        service.processEvent({
          event: "call_hold",
          callId: "call-1",
          holdDuration: 30,
        }),
      ).rejects.toThrow(InvalidTransitionError);
    });
  });

  describe("getCalls", () => {
    it("delegates to callRepo.listCalls and returns paginated result", async () => {
      const mockCalls = [makeExistingCall()];
      callRepo = makeCallRepo({
        listCalls: vi.fn().mockResolvedValue({ data: mockCalls, total: 1 }),
      });
      service = new CallService(callRepo, eventRepo);

      const result = await service.getCalls({});
      expect(result.data).toBe(mockCalls);
      expect(result.total).toBe(1);
    });
  });

  describe("getCallEvents", () => {
    it("delegates to eventRepo.listEventsForCall", async () => {
      const mockEvents = [
        new CallEvent("e1", "call-1", "call_initiated", new Date()),
      ];
      eventRepo = makeEventRepo({
        listEventsForCall: vi.fn().mockResolvedValue(mockEvents),
      });
      service = new CallService(callRepo, eventRepo);

      const result = await service.getCallEvents("call-1");
      expect(result).toBe(mockEvents);
    });
  });
});
