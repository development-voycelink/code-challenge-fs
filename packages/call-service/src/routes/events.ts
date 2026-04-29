import { Router, Request, Response } from 'express';
import { eventPayloadSchema } from '@voycelink/contracts';
import type { EventPayload } from '../domain/call';
import { callService } from '../services';
import { apiKeyAuth } from '../middleware/apiKey';

const router = Router();

router.post('/', apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const payload: EventPayload = eventPayloadSchema.parse(req.body);
    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
    const event = await callService.processEvent(payload, idempotencyKey);

    res.status(201).json(event);
  } catch (error: any) {
    if (error && error.name === 'ZodError') {
      res.status(400).json({
        message: 'Invalid event payload',
        issues: error.issues,
      });
      return;
    }

    console.error('Error processing event:', error);
    res.status(500).json({ message: 'Internal server error', error });
  }
});

export default router;
