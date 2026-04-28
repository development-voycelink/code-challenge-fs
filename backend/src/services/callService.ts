import { Call } from '../models/Call';

export async function upsertCall(callId: string, queue_id: string, status: string) {
  const now = new Date();

  await Call.findOneAndUpdate(
    { id: callId },
    {
      id: callId,
      queue_id,
      status,
      start_time: now,
      ...(status === 'ended' && { end_time: now })
    },
    { upsert: true, new: true }
  );
}
