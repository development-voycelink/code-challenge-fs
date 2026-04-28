import Redis from 'ioredis';
import { config } from '../config';
import type { CallStatusUpdate } from '../domain/call';

const redis = new Redis(config.redisUrl);

export const CHANNEL = 'call-status-updates';

export async function publishStatusUpdate(
  update: CallStatusUpdate,
): Promise<void> {
  await redis.publish(CHANNEL, JSON.stringify(update));
}
