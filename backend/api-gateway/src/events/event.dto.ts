import { z } from 'zod';

const EventSchema = z.object({
  event_type: z.literal(''),
  call_id: z.number(),
});

// The event_type is a discriminated union, meaning it will be used to determine which schema to use based on the value of event_type.
export const injestEventSchema = z.discriminatedUnion('event_type', [
  EventSchema.extend({
    event_type: z.literal('call_initiated'),
    type: z.string(),
    queue_id: z.string(),
  }),
  EventSchema.extend({
    event_type: z.literal('call_routed'),
    agent_id: z.string(),
    routing_time: z.number(),
  }),
  EventSchema.extend({
    event_type: z.literal('call_answered'),
    wait_time: z.number(),
  }),
  EventSchema.extend({
    event_type: z.literal('call_hold'),
    hold_duration: z.number(),
  }),
  EventSchema.extend({
    event_type: z.literal('call_ended'),
    end_reason: z.string(),
    duration: z.number(),
  }),
]);

export type InjestEventDto = z.infer<typeof injestEventSchema>;
