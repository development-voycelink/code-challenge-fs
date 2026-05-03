import type { CallStatusUpdate } from '../domain/call';

export const CHANNEL = 'call-status-updates';

export async function publishStatusUpdate(
  update: CallStatusUpdate,
): Promise<void> {
  // Disabled to avoid duplicate Redis publishing.
  // CallService now handles event publishing directly.
  return;
}
