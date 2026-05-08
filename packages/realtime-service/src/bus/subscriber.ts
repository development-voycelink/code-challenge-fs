import Redis from 'ioredis';
import { CallStatusUpdate } from '../types';

const CHANNEL = 'call-status-updates';

export function subscribeToCallUpdates(
  onUpdate: (update: CallStatusUpdate) => void,
): void {
  const redisUrl = process.env.REDIS_URL;
  const subscriber = new Redis(redisUrl as string);

  subscriber.on('message', (channel, message) => {
    if (channel !== CHANNEL) return;

    try {
      const payload = JSON.parse(message) as CallStatusUpdate;
      onUpdate(payload);
    } catch (error) {
      console.error('[redis] failed to parse call update:', error);
    }
  });

  subscriber.subscribe(CHANNEL).catch((error) => {
    console.error(`[redis] failed to subscribe to ${CHANNEL}:`, error);
  });
}
