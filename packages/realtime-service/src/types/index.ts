import type { CallStatusUpdate } from '@voycelink/contracts';

export type { CallStatusUpdate };

// ─── Socket.io event maps ─────────────────────────────────────────────────────

/** Events emitted by the server → received by connected clients. */
export interface ServerToClientEvents {
  /** Fires whenever a call's status changes. */
  call_status_update: (update: CallStatusUpdate) => void;
}

/** Events emitted by clients → received by the server. */
export interface ClientToServerEvents {
  /** Client joins the room for a specific call to receive targeted updates. */
  subscribe_call: (callId: string) => void;
  /** Client leaves the room for a specific call. */
  unsubscribe_call: (callId: string) => void;
}
