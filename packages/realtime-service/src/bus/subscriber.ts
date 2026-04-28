import Redis from 'ioredis';
import { CallStatusUpdate } from '../types';

const CHANNEL = 'call-status-updates';

export function subscribeToCallUpdates(
  onUpdate: (update: CallStatusUpdate) => void,
): void {
  // TODO: subscribe to CHANNEL on Redis and call onUpdate for each message
  void Redis;
  void CHANNEL;
  void onUpdate;
}
