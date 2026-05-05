import Redis from 'ioredis';
import { CallStatusUpdate } from '../types';

const CHANNEL = 'call_events';
const subscriber = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

export function subscribeToCallUpdates(
  onUpdate: (update: CallStatusUpdate) => void,
): void {subscriber.subscribe(CHANNEL, 
  (err) => {if (err) {
      console.error('Redis subscribe error:', err);} 
      else {
      console.log(`Subscribed to ${CHANNEL}`);}
  });

  subscriber.on('message', (_channel, message) => {
    console.log('Redis event received:', message);
    try {
      const parsed = JSON.parse(message);
      onUpdate(parsed);
    } catch (err) {
      console.error('Invalid message from Redis:', err);
    }
  });
}
