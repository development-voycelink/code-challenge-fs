import { Router, Request, Response } from 'express';
import type { QueueId } from '@voycelink/contracts';
import type { CallFilters, CallStatus } from '../domain/call';
import { callService } from '../services';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: CallFilters & { limit?: number; offset?: number } = {
      status:
        typeof req.query.status === 'string' && req.query.status !== 'all'
          ? (req.query.status as CallStatus)
          : undefined,
      queueId:
        typeof req.query.queueId === 'string'
          ? (req.query.queueId as QueueId)
          : undefined,
      limit:
        typeof req.query.limit === 'string'
          ? parseInt(req.query.limit, 10)
          : undefined,
      offset:
        typeof req.query.offset === 'string'
          ? parseInt(req.query.offset, 10)
          : undefined,
    };
    const calls = await callService.getCalls(filters);
    res.json(calls);
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id/events', async (req: Request, res: Response) => {
  try {
    const events = await callService.getCallEvents(req.params.id);
    res.json(events);
  } catch (_error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
