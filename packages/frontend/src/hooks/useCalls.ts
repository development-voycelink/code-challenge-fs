'use client';

import { useState, useEffect } from 'react';
import { Call, CallFilters } from '../types';
import { getSocket } from '../lib/socket';
//import { MOCK_CALLS } from '../mocks/data';

/**
 * Returns the live call list and a loading indicator.
 * TODO: replace mock data with real API + Socket.io updates.
 */
const API_URL = 'http://localhost:3001/api/calls';

export function useCalls(_filters: CallFilters) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: replace with fetchCalls(_filters) + socket subscription
    // const t = setTimeout(() => {
    //   setCalls(MOCK_CALLS);
    //   setLoading(false);
    // }, 300);
    //return () => clearTimeout(t);
     const fetchCalls = async () => {
      setLoading(true);

      const params = new URLSearchParams();

      if (_filters.status && _filters.status !== 'all') {
        params.append('status', _filters.status);
      }

      if (_filters.queueId) {
        params.append('queueId', _filters.queueId);
      }

      const res = await fetch(`${API_URL}?${params.toString()}`);
      const data = await res.json();

      setCalls(data);
      setLoading(false);
    };

    fetchCalls();
    
  }, [_filters]);

  useEffect(() => {
  const socket = getSocket();
  socket.connect();
  const handler = async () => {
    console.log('refetch calls');
    const params = new URLSearchParams();
    if (_filters.status && _filters.status !== 'all') {
      params.append('status', _filters.status);
    }
    if (_filters.queueId) {
      params.append('queueId', _filters.queueId);
    }
    const res = await fetch(`${API_URL}?${params}`);
    const data = await res.json();
    setCalls(data);
  };

  socket.on('call_status_update', handler);
  return () => {
    socket.off('call_status_update', handler);
  };
}, [_filters]);

  return { calls, loading, setCalls };
}
