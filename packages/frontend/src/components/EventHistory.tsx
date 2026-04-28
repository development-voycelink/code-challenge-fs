'use client';

import { CallEvent } from '../types';

interface Props {
  callId: string | null;
  events: CallEvent[];
  loading: boolean;
  onClose: () => void;
}

const EVENT_LABELS: Record<string, string> = {
  call_initiated:  'Call Initiated',
  call_routed:     'Routed to Agent',
  call_answered:   'Answered',
  call_hold:       'Placed on Hold',
  call_retransfer: 'Retransferred',
  call_ended:      'Call Ended',
};

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function EventHistory({ callId, events, loading, onClose }: Props) {
  if (!callId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 h-full flex items-center justify-center">
        <p className="text-sm text-gray-400">Select a call to view its event history.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">
          Event History{' '}
          <span className="font-mono text-gray-500">{callId}</span>
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {loading && (
        <p className="text-sm text-gray-400">Loading events…</p>
      )}

      {!loading && events.length === 0 && (
        <p className="text-sm text-gray-400">No events recorded yet.</p>
      )}

      {!loading && events.length > 0 && (
        <ol className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3">
              <div className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-blue-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">{timeOf(event.timestamp)}</p>
                <p className="text-sm font-medium text-gray-800">
                  {EVENT_LABELS[event.type] ?? event.type}
                </p>
                {event.metadata && (
                  <pre className="mt-1 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 overflow-auto max-h-24">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
