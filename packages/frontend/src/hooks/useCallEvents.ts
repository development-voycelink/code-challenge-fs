'use client';

import { useState, useEffect } from 'react';
import { CallEvent } from '../types';
import { fetchCallEvents } from '@/lib/api';
import { getSocket, subscribeToCall, unsubscribeFromCall } from '@/lib/socket';

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

    async function loadCallEvents() {
      setLoading(true);
      try {
        const data = await fetchCallEvents(callId as string);
        setEvents(data);
      } catch (error) {
        console.error('Error fetching call events:', error);
        // Optionally set an error state here
      } finally {
        setLoading(false);
      }
    }

    loadCallEvents();
  }, [callId]);

  useEffect(() => {
    if (!callId) {
      return;
    }

    const socket = getSocket();

    socket.on('call_status_update', console.log);
    subscribeToCall(callId);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('call_status_update', console.log);
      unsubscribeFromCall(callId);
    };
  }, [callId]);

  return { events, loading };
}
