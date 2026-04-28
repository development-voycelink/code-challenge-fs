import { CallStatus } from '../types';

const STYLES: Record<CallStatus, string> = {
  waiting: 'bg-yellow-100 text-yellow-800',
  active:  'bg-green-100  text-green-800',
  on_hold: 'bg-orange-100 text-orange-800',
  ended:   'bg-gray-100   text-gray-500',
};

const LABELS: Record<CallStatus, string> = {
  waiting: 'Waiting',
  active:  'Active',
  on_hold: 'On Hold',
  ended:   'Ended',
};

export function StatusBadge({ status }: { status: CallStatus }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
