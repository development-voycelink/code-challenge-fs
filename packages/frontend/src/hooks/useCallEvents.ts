'use client';

import { useState, useEffect } from 'react';
import { CallEvent } from '../types';
import { MOCK_EVENTS } from '../mocks/data';

/**
 * Returns the event history for a specific call.
 * TODO: replace mock data with a real API call.
 */
export function useCallEvents(callId: string | null) {
  const [events, setEvents] = useState<CallEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!callId) {
      setEvents([]);
      return;
    }

    setLoading(true);
    // TODO: replace with fetchCallEvents(callId)
    const t = setTimeout(() => {
      setEvents(MOCK_EVENTS[callId] ?? []);
      setLoading(false);
    }, 200);

    return () => clearTimeout(t);
  }, [callId]);

  return { events, loading };
}
