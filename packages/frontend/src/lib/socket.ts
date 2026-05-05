import { io, Socket } from 'socket.io-client';
import { CallStatusUpdate } from '../types';

const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_SERVICE_URL ?? 'http://localhost:3002';

let socket: Socket | null = null;

/** Returns a singleton Socket.io client connected to realtime-service. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(REALTIME_URL, { autoConnect: false });
    socket.connect();
    socket.on('connect', () => {
      console.log('[ws] connected to realtime-service');
    });
    socket.on('disconnect', () => {
      console.log('[ws] disconnected from realtime-service');
    } );
  }
  return socket;
}

/** Subscribe to real-time updates for a specific call room. */
export function subscribeToCall(callId: string): void {
  getSocket().emit('subscribe_call', callId);
}

/** Unsubscribe from a specific call room. */
export function unsubscribeFromCall(callId: string): void {
  getSocket().emit('unsubscribe_call', callId);
}

export type { CallStatusUpdate };
