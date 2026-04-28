'use client';

import { SUPPORTED_QUEUES, CallFilters, CallStatus, QueueId } from '../types';

const STATUSES: { value: CallStatus | 'all'; label: string }[] = [
  { value: 'all',     label: 'All statuses' },
  { value: 'waiting', label: 'Waiting'      },
  { value: 'active',  label: 'Active'       },
  { value: 'on_hold', label: 'On Hold'      },
  { value: 'ended',   label: 'Ended'        },
];

const QUEUES = [
  { value: 'all', label: 'All queues' },
  ...SUPPORTED_QUEUES.map((value) => ({
    value,
    label: value
      .split('_')
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' '),
  })),
];

interface Props {
  filters: CallFilters;
  onChange: (f: CallFilters) => void;
}

/**
 * TODO: wire `onChange` into `useCalls` so that changing a filter
 *       actually fetches filtered results from call-service.
 */
export function FilterBar({ filters, onChange }: Props) {
  const select =
    'border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 ' +
    'bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="flex items-center gap-3">
      <select
        className={select}
        value={filters.status ?? 'all'}
        onChange={(e) =>
          onChange({ ...filters, status: e.target.value as CallStatus | 'all' })
        }
      >
        {STATUSES.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        className={select}
        value={filters.queueId ?? 'all'}
        onChange={(e) =>
          onChange({
            ...filters,
            queueId:
              e.target.value === 'all'
                ? undefined
                : (e.target.value as QueueId),
          })
        }
      >
        {QUEUES.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
