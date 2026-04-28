import express, { Request, Response } from 'express';
import { validateApiKey } from '../middleware/validateApiKey';
import { eventSchema } from '../validation/eventSchema';
import { saveEvent } from '../services/saveEvent';
import { upsertCall } from '../services/callService';
import { io } from '../index';
import { CallEvent } from '../models/CallEvent';
import { call_status, event_names } from '../utils/enums';

const router = express.Router();

router.get('/api/events', async (req, res) => {
  try {
    const events = await CallEvent.find().sort({ created_at: -1 });
    res.json(events);
  } catch (error) {
    console.error('Error while fetching call events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/api/events', validateApiKey, async function (req, res): Promise<void> {
    const parse = eventSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Invalid event', details: parse.error.flatten() });
      return;
    }
  
    const { call_id, event_name, metadata } = parse.data;
  
    try {
      await saveEvent(call_id, event_name as event_names, metadata);
  
      if ([event_names.call_initiated, event_names.call_routed, event_names.call_answered, event_names.call_hold, event_names.call_ended].includes(event_name as event_names)) {
        const statusMap: Record<string, string> = {
          [event_names.call_initiated]: call_status.waiting,
          [event_names.call_routed]: call_status.waiting,
          [event_names.call_answered]: call_status.active,
          [event_names.call_hold]: call_status.on_hold,
          [event_names.call_ended]: call_status.ended
        };
  
        await upsertCall(call_id, metadata.queue_id || 'default', statusMap[event_name]);
      }
  
      io.emit('new_event', { call_id, event_name, metadata });
  
      res.status(201).json({ message: 'Event recorded' });
    } catch (err) {
      console.error('Error while recording the event:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

export default router;
