import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app";
import { CallEvent } from "../domain/call";
import { NotFoundError, InvalidTransitionError } from "../domain/errors";

vi.mock("../services", () => ({
  callService: {
    processEvent: vi.fn(),
  },
}));

import { callService } from "../services";

const API_KEY = process.env.API_KEY ?? "change-me";

const INITIATED_PAYLOAD = {
  event: "call_initiated",
  callId: "call-1",
  type: "voice",
  queueId: "medical_english",
};

const fakeEvent = () =>
  new CallEvent("evt-1", "call-1", "call_initiated", new Date());

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/events", () => {
  it("returns 201 with the created event for a valid payload", async () => {
    vi.mocked(callService.processEvent).mockResolvedValue(fakeEvent());

    const res = await request(app)
      .post("/api/events")
      .set("x-api-key", API_KEY)
      .send(INITIATED_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ callId: "call-1", type: "call_initiated" });
    expect(callService.processEvent).toHaveBeenCalledWith(INITIATED_PAYLOAD);
  });

  it("returns 400 with Zod issues for an invalid payload", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("x-api-key", API_KEY)
      .send({ event: "call_initiated", callId: "call-1" });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      message: "Invalid event payload",
      issues: expect.any(Array),
    });
    expect(callService.processEvent).not.toHaveBeenCalled();
  });

  it("returns 401 when the API key is missing", async () => {
    const res = await request(app).post("/api/events").send(INITIATED_PAYLOAD);

    expect(res.status).toBe(401);
    expect(callService.processEvent).not.toHaveBeenCalled();
  });

  it("returns 404 when the service throws NotFoundError", async () => {
    vi.mocked(callService.processEvent).mockRejectedValue(
      new NotFoundError("call not found"),
    );

    const res = await request(app)
      .post("/api/events")
      .set("x-api-key", API_KEY)
      .send({ event: "call_answered", callId: "missing", waitTime: 5 });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: "call not found" });
  });

  it("returns 422 when the service throws InvalidTransitionError", async () => {
    vi.mocked(callService.processEvent).mockRejectedValue(
      new InvalidTransitionError("illegal transition"),
    );

    const res = await request(app)
      .post("/api/events")
      .set("x-api-key", API_KEY)
      .send({ event: "call_hold", callId: "call-1", holdDuration: 30 });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ message: "illegal transition" });
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(callService.processEvent).mockRejectedValue(
      new Error("unexpected"),
    );

    const res = await request(app)
      .post("/api/events")
      .set("x-api-key", API_KEY)
      .send(INITIATED_PAYLOAD);

    expect(res.status).toBe(500);
  });
});
