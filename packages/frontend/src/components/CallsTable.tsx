'use client';

import { useState, useEffect } from 'react';
import { Call } from '../types';
import { StatusBadge } from './StatusBadge';

interface Props {
  calls: Call[];
  selectedCallId: string | null;
  onSelectCall: (id: string) => void;
  loading: boolean;
}

function elapsed(start: string, end?: string): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function LiveDuration({ start, end }: { start: string; end?: string }) {
  const [, tick] = useState(0);

  useEffect(() => {
    if (end) return;

    const timer = setInterval(() => {
      tick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [end]);

  return <>{elapsed(start, end || new Date().toISOString())}</>;
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const HEADERS = ['Call ID', 'Type', 'Queue', 'Status', 'Duration', 'Started'];

export function CallsTable({ calls, selectedCallId, onSelectCall, loading }: Props) {
  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">Loading…</div>;
  }

  if (calls.length === 0) {
    return <div className="py-16 text-center text-sm text-gray-400">No calls found.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {HEADERS.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {calls.map((call) => (
            <tr
              key={call.id}
              onClick={() => onSelectCall(call.id)}
              className={`cursor-pointer transition-colors hover:bg-blue-50 ${selectedCallId === call.id ? 'bg-blue-50' : ''
                }`}
            >
              <td className="px-4 py-3 font-mono text-gray-700">{call.id}</td>
              <td className="px-4 py-3 capitalize text-gray-600">{call.type}</td>
              <td className="px-4 py-3 text-gray-600">{call.queueId}</td>
              <td className="px-4 py-3">
                <StatusBadge status={call.status} />
              </td>
              <td className="px-4 py-3 text-gray-600">
                <LiveDuration start={call.startTime} end={call.endTime} />
              </td>
              <td className="px-4 py-3 text-gray-500">{timeOf(call.startTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
