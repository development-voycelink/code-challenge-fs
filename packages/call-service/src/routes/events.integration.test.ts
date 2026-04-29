import "dotenv/config";
import express, { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/client";

describe("POST /api/events (integration)", () => {
  let app: Express;

  beforeAll(async () => {
    process.env.API_KEY = process.env.API_KEY ?? "change-me";
    const { default: eventsRouter } = await import("./events");
    app = express();
    app.use(express.json());
    app.use("/api/events", eventsRouter);
  });

  beforeEach(async () => {
    await db.query("DELETE FROM call_events");
    await db.query("DELETE FROM calls");
  });

  afterAll(async () => {
    await db.end();
  });

  it("ingests call_initiated and persists event + call in database", async () => {
    const callId = `integration-${Date.now()}`;
    const response = await request(app)
      .post("/api/events")
      .set("X-API-Key", process.env.API_KEY as string)
      .send({
        event: "call_initiated",
        callId,
        type: "voice",
        queueId: "medical_spanish",
      });

    expect(response.status).toBe(201);
    expect(response.body.callId).toBe(callId);
    expect(response.body.type).toBe("call_initiated");

    const callResult = await db.query(
      "SELECT id, status, queue_id FROM calls WHERE id = $1",
      [callId],
    );
    expect(callResult.rowCount).toBe(1);
    expect(callResult.rows[0]).toMatchObject({
      id: callId,
      status: "waiting",
      queue_id: "medical_spanish",
    });

    const eventResult = await db.query(
      "SELECT call_id, type, metadata FROM call_events WHERE call_id = $1 ORDER BY timestamp DESC LIMIT 1",
      [callId],
    );
    expect(eventResult.rowCount).toBe(1);
    expect(eventResult.rows[0].call_id).toBe(callId);
    expect(eventResult.rows[0].type).toBe("call_initiated");
    expect(eventResult.rows[0].metadata).toMatchObject({ slaSeconds: 30 });
  });
});
