'use client';

import { useState, useEffect } from 'react';
import { Call, CallFilters } from '../types';
import { MOCK_CALLS } from '../mocks/data';

/**
 * Returns the live call list and a loading indicator.
 * TODO: replace mock data with real API + Socket.io updates.
 */
export function useCalls(_filters: CallFilters) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: replace with fetchCalls(_filters) + socket subscription
    const t = setTimeout(() => {
      setCalls(MOCK_CALLS);
      setLoading(false);
    }, 300);

    return () => clearTimeout(t);
  }, []);

  return { calls, loading, setCalls };
}
