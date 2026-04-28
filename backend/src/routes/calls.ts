import express from 'express';
import { Call } from '../models/Call';
import { CallEvent } from '../models/CallEvent';

const router = express.Router();

router.get('/api/calls', async (req, res) => {
  const { status, queue_id } = req.query;

  const filter: any = {};

  if (status) {
    const arrStatus = status.toString().split(',');
    filter.status = { $in: arrStatus };
  }

  if (queue_id) {
    filter.queue_id = queue_id;
  }

  try {
    const calls = await Call.find(filter).sort({ start_time: -1 });
    res.json(calls);
  } catch (error) {
    console.error('Error while fetching calls:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/api/calls/:call_id/events', async (req, res) => {
  const { call_id } = req.params;

  try {
    const events = await CallEvent.find({ call_id }).sort({ timestamp: 1 });

    res.json({
      call_id,
      total: events.length,
      events
    });
  } catch (err) {
    console.error('Error while fetching events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
