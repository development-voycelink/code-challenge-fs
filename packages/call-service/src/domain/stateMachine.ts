import type { CallStatus } from '@voycelink/contracts';
import { InvalidTransitionError } from './errors';

const EVENT_STATUS_MAP: Record<string, CallStatus> = {
  call_initiated: 'waiting',
  call_routed:    'waiting',
  call_answered:  'active',
  call_hold:      'on_hold',
  call_ended:     'ended',
};

const VALID_TRANSITIONS: Record<CallStatus, Set<CallStatus>> = {
  waiting:  new Set(['waiting', 'active', 'ended']),
  active:   new Set(['on_hold', 'ended']),
  on_hold:  new Set(['active', 'ended']),
  ended:    new Set([]),
};

export function resolveNextStatus(currentStatus: CallStatus, eventType: string): CallStatus {
  const nextStatus = EVENT_STATUS_MAP[eventType];
  if (!nextStatus) {
    throw new InvalidTransitionError(`Unknown event type: ${eventType}`);
  }
  if (!VALID_TRANSITIONS[currentStatus].has(nextStatus)) {
    throw new InvalidTransitionError(
      `Cannot transition from '${currentStatus}' via '${eventType}'`,
    );
  }
  return nextStatus;
}
