'use client';

import { useState, useEffect } from 'react';
import { Call, CallFilters, CallStatusUpdate } from '../types';
import { getSocket, subscribeToDashboard, unsubscribeFromDashboard } from '../lib/socket';
import { fetchCalls } from '../lib/api';

export function useCalls(filters: CallFilters) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const socket = getSocket();

    async function loadCalls() {
      try {
        setLoading(true);
        const data = await fetchCalls(filters);

        if (active) {
          setCalls(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        if (active) setLoading(false);
      }
    }

    socket.connect();
    subscribeToDashboard();
    loadCalls();

    const handleUpdate = (update: CallStatusUpdate) => {
      setCalls((prev) => {
        const idx = prev.findIndex((c) => c.id === update.callId);

        if (idx !== -1) {
          const updatedCalls = [...prev];
          updatedCalls[idx] = {
            ...updatedCalls[idx],
            status: update.status,
            ...(update.status === 'ended' ? { endTime: update.timestamp } : {}),
          };

          if (filters.status && update.status !== filters.status) {
            return updatedCalls.filter((_, i) => i !== idx);
          }

          return updatedCalls;
        }

        if (update.eventType === 'call_initiated' && update.metadata) {
          const payload = update.metadata as any;

          const matchesStatus = !filters.status || update.status === filters.status;
          const matchesQueue = !filters.queueId || payload.queueId === filters.queueId;

          if (matchesStatus && matchesQueue) {
            return [
              {
                id: update.callId,
                type: payload.type,
                status: update.status,
                queueId: payload.queueId,
                startTime: update.timestamp,
              },
              ...prev,
            ];
          }
        }

        return prev;
      });
    };

    socket.on('call_status_update', handleUpdate);

    return () => {
      active = false;
      socket.off('call_status_update', handleUpdate);
      unsubscribeFromDashboard();
    };
  }, [filters.status, filters.queueId]);

  return { calls, loading, setCalls };
}