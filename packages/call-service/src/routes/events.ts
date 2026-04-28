import { Router, Request, Response } from 'express';
import { eventPayloadSchema } from '@voycelink/contracts';
import { ZodError } from 'zod';
import type { EventPayload } from '../domain/call';
import { callService } from '../services';
import { apiKeyAuth } from '../middleware/apiKey';

const router = Router();

router.post('/', apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const payload: EventPayload = eventPayloadSchema.parse(req.body);
    const event = await callService.processEvent(payload);
    res.status(201).json(event);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Invalid event payload',
        issues: error.issues,
      });
      return;
    }

    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
