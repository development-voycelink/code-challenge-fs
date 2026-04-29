'use client';

import { useState, useEffect } from 'react';
import { CallEvent, CallStatusUpdate } from '../types';
import { getSocket, subscribeToCall, unsubscribeFromCall } from '../lib/socket';
import { v4 as uuidv4 } from 'uuid';

export function useCallEvents(callId: string | null) {
  const [events, setEvents] = useState<CallEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!callId) {
      setEvents([]);
      return;
    }

    let active = true;
    const socket = getSocket();

    async function init() {
      try {
        setLoading(true);
        socket.connect();
        subscribeToCall(callId!);

        const res = await fetch(`http://localhost:3001/api/calls/${callId}/events`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();

        if (active) {
          setEvents(prevSocketEvents => {
            const existingIds = new Set(data.map((e: CallEvent) => e.id));
            const newSocketEvents = prevSocketEvents.filter(e => !existingIds.has(e.id));

            return [...data, ...newSocketEvents];
          });
          setLoading(false);
        }
      } catch (err) {
        if (active) setLoading(false);
      }
    }

    const handleUpdate = (update: CallStatusUpdate) => {
      if (update.callId !== callId) return;

      setEvents((prev) => [
        ...prev,
        {
          id: uuidv4(),
          callId: update.callId,
          type: update.eventType,
          timestamp: update.timestamp,
          metadata: update.metadata,
        },
      ]);
    };

    socket.on('call_status_update', handleUpdate);
    init();

    return () => {
      active = false;
      socket.off('call_status_update', handleUpdate);
      unsubscribeFromCall(callId);
    };
  }, [callId]);

  return { events, loading };
}
