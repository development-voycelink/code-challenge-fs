import Redis from "ioredis";
import { CallStatusUpdate } from "../types";

const CHANNEL = "call-status-updates";

export function subscribeToCallUpdates(
  onUpdate: (update: CallStatusUpdate) => void,
): void {
  const sub = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

  sub.subscribe(CHANNEL, (err) => {
    if (err) console.error("[redis] subscribe error", err);
  });

  sub.on("message", (channel, raw) => {
    if (channel !== CHANNEL) return;
    try {
      const parsed = JSON.parse(raw) as CallStatusUpdate;
      onUpdate(parsed);
    } catch (e) {
      console.error("[redis] invalid message", e);
    }
  });

  sub.on("error", (e) => {
    console.error("[redis] subscriber error", e);
  });
}
