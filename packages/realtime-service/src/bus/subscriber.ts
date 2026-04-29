import Redis from 'ioredis';
import { CallStatusUpdate } from '../types';

const CHANNEL = 'call-status-updates';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export function subscribeToCallUpdates(
  onUpdate: (update: CallStatusUpdate) => void,
): void {
  redis.subscribe(CHANNEL, (err, count) => {
    if (err) {
      console.error('Failed to subscribe to redis channel:', err);
      return;
    }
    console.info(`Subscribed to ${count} channels. Listening on ${CHANNEL}...`);
  });

  redis.on('message', (channel, message) => {
    if (channel === CHANNEL) {
      try {
        const update: CallStatusUpdate = JSON.parse(message);
        console.info('Received call update:', update);
        onUpdate(update);
      } catch (err) {
        console.error('Failed to parse redis message:', err);
      }
    }
  });
}
