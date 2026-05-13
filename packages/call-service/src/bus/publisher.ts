import Redis from "ioredis";
import { config } from "../config";
import type { CallStatusUpdate } from "../domain/call";

const redis = new Redis(config.redisUrl);

export const CHANNEL = "call-status-updates";

export async function publishStatusUpdate(
  update: CallStatusUpdate,
): Promise<void> {
  const payload = JSON.stringify(update);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await redis.publish(CHANNEL, payload);
      return;
    } catch (err) {
      if (attempt === 3) {
        // DB write already committed
        // degrade gracefully rather than rolling back
        console.error(
          `[publisher] failed after 3 attempts callId=${update.callId}`,
          err,
        );
        return;
      }
      await new Promise((r) => setTimeout(r, 50 * 2 ** attempt));
    }
  }
}
