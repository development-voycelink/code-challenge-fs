import Redis from "ioredis";
import { config } from "../config";
import { CallStatusUpdate } from "../types";

const CHANNEL = "call-status-updates";

export function subscribeToCallUpdates(
  onUpdate: (update: CallStatusUpdate) => void,
): void {
  const sub = new Redis(config.redisUrl);

  sub.subscribe(CHANNEL, (err) => {
    if (err) console.error("[redis] subscribe error:", err);
    else console.log(`[redis] subscribed to ${CHANNEL}`);
  });

  sub.on("message", (_, message) => {
    try {
      const update = JSON.parse(message) as CallStatusUpdate;
      onUpdate(update);
    } catch (err) {
      console.error("[redis] failed to parse message:", err);
    }
  });
}
