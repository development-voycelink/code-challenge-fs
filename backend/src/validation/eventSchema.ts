import { z } from 'zod';

export const eventSchema = z.object({
  call_id: z.string().min(1),
  event_name: z.enum([
    'call_initiated',
    'call_routed',
    'call_answered',
    'call_hold',
    'call_ended'
  ]),
  metadata: z.object({
    queue_id: z.string().optional(),
    agent_id: z.string().optional(),
    wait_time: z.number().optional(),
    via: z.string().optional()
  })
});
