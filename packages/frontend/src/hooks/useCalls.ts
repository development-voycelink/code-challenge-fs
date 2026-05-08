'use client';

import { useState, useEffect } from 'react';
import { Call, CallFilters } from '../types';
import { fetchCalls } from '../lib/api';
import { getSocket } from '../lib/socket';

/**
 * Returns the live call list and a loading indicator.
 * TODO: replace mock data with real API + Socket.io updates.
 */
export function useCalls(filters: CallFilters) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    async function loadCalls() {
      setLoading(true);
      try {
        const data = await fetchCalls(filters);
        setCalls(data);
      } catch (error) {
        console.error('Error fetching calls:', error);
        // Optionally set an error state here
      } finally {
        setLoading(false);
      }
    }

    loadCalls();
  }, [filters]);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [filters]);

  return { calls, loading, isConnected };
}
