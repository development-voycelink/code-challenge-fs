import { describe, it, expect, beforeEach } from "vitest";
import { CALL_EVENTS, CALL_STATUSES } from "@voycelink/contracts";
import { CallService } from "./CallService";

const [CALL_INITIATED, , CALL_ANSWERED] = CALL_EVENTS;
const [STATUS_WAITING] = CALL_STATUSES;

describe("CallService", () => {
  let service: CallService;

  beforeEach(() => {
    service = new CallService();
  });

  it("processes call_initiated and persists the call", async () => {
    const event = await service.processEvent({
      event: CALL_INITIATED,
      callId: "call-1",
      type: "voice",
      queueId: "medical_spanish",
    });

    expect(event.callId).toBe("call-1");

    const calls = await service.getCalls({ queueId: "medical_spanish" });
    expect(
      calls.some((c) => c.id === "call-1" && c.status === STATUS_WAITING),
    ).toBe(
      true,
    );
  });

  it("flags call_answered when waitTime exceeds 30 seconds", async () => {
    await service.processEvent({
      event: CALL_INITIATED,
      callId: "call-2",
      type: "video",
      queueId: "medical_english",
    });

    const answered = await service.processEvent({
      event: CALL_ANSWERED,
      callId: "call-2",
      waitTime: 35,
    });

    expect(answered.metadata?.slaBreached).toBe(true);
  });
});
