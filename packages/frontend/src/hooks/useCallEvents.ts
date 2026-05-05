'use client';

import { useState, useEffect } from 'react';
import { CallEvent } from '../types';
//import { MOCK_EVENTS } from '../mocks/data';
import { getSocket, subscribeToCall, unsubscribeFromCall } from '../lib/socket';

const API_URL = 'http://localhost:3001/api';
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

    const socket = getSocket();
    socket.connect();
    setLoading(true);

   const fetchEvents = async () => {
      const res = await fetch(`${API_URL}/calls/${callId}/events`);
      const data = await res.json();
      setEvents(data);
      setLoading(false);
    };

    fetchEvents();


    subscribeToCall(callId);
    // TODO: replace with fetchCallEvents(callId)
      const handler = (update: any) => {
      console.log('EVENT RECEIVED:', update);

      setEvents((prev) => [...prev, update]);
      setLoading(false);
    };
    socket.on('call_status_update', handler);
    // const t = setTimeout(() => {
    //   setEvents(MOCK_EVENTS[callId] ?? []);
    //   setLoading(false);
    // }, 200);

    return () => {
      socket.off('call_status_update', handler);
       unsubscribeFromCall(callId);
      // clearTimeout(t);
    };
  }, [callId]);

  return { events, loading };
}
