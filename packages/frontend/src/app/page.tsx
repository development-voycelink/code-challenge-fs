'use client';

import { useState } from 'react';
import { CallFilters } from '../types';
import { useCalls } from '../hooks/useCalls';
import { useCallEvents } from '../hooks/useCallEvents';
import { StatsBar } from '../components/StatsBar';
import { FilterBar } from '../components/FilterBar';
import { CallsTable } from '../components/CallsTable';
import { EventHistory } from '../components/EventHistory';

export default function DashboardPage() {
  const [filters, setFilters] = useState<CallFilters>({ status: 'all' });
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const { calls, loading, connected } = useCalls(filters);
  const { events, loading: eventsLoading } = useCallEvents(selectedCallId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">VoyceLink</h1>
            <p className="text-xs text-gray-500">Call Center Dashboard</p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 text-xs ${
              connected ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            {connected ? 'Live' : 'Not connected'}
          </span>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Stats */}
        <StatsBar calls={calls} />

        {/* Filters */}
        <div className="flex items-center justify-between">
          <FilterBar filters={filters} onChange={setFilters} />
          <p className="text-xs text-gray-400">{calls.length} call(s)</p>
        </div>

        {/* Table + Event history */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CallsTable
              calls={calls}
              selectedCallId={selectedCallId}
              onSelectCall={setSelectedCallId}
              loading={loading}
            />
          </div>

          <div>
            <EventHistory
              callId={selectedCallId}
              events={events}
              loading={eventsLoading}
              onClose={() => setSelectedCallId(null)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
