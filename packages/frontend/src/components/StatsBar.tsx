import { Call, CallStatus } from '../types';

const STATS: {
  label: string;
  status: CallStatus | 'total';
  color: string;
}[] = [
  { label: 'Total',   status: 'total',   color: 'text-gray-800' },
  { label: 'Active',  status: 'active',  color: 'text-green-600' },
  { label: 'Waiting', status: 'waiting', color: 'text-yellow-600' },
  { label: 'On Hold', status: 'on_hold', color: 'text-orange-500' },
  { label: 'Ended',   status: 'ended',   color: 'text-gray-400'  },
];

export function StatsBar({ calls }: { calls: Call[] }) {
  const count = (s: CallStatus | 'total') =>
    s === 'total' ? calls.length : calls.filter((c) => c.status === s).length;

  return (
    <div className="grid grid-cols-5 gap-3">
      {STATS.map(({ label, status, color }) => (
        <div
          key={status}
          className="bg-white rounded-lg border border-gray-200 px-4 py-3"
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{count(status)}</p>
        </div>
      ))}
    </div>
  );
}
