import type { Call, CallEvent, CallFilters, EventPayload } from '../types';

const BASE_URL =
  process.env.NEXT_PUBLIC_CALL_SERVICE_URL ?? 'http://localhost:3001';

/**
 * Fetch the current call list from call-service.
 */
export async function fetchCalls(params?: CallFilters): Promise<Call[]> {
  const queryParams = new URLSearchParams();
  if (params?.status && params.status !== 'all') {
    queryParams.set('status', params.status);
  }
  if (params?.queueId) {
    queryParams.set('queueId', params.queueId);
  }

  const query = queryParams.toString();
  const res = await fetch(
    `${BASE_URL}/api/calls${query ? `?${query}` : ''}`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw new Error('Failed to fetch calls');
  return res.json();
}

/**
 * Fetch event history for a specific call.
 */
export async function fetchCallEvents(callId: string): Promise<CallEvent[]> {
  const res = await fetch(`${BASE_URL}/api/calls/${callId}/events`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch call events');
  return res.json();
}

/**
 * Post a lifecycle event to call-service.
 */
export async function postEvent(payload: EventPayload): Promise<CallEvent> {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to post event');
  return res.json();
}
