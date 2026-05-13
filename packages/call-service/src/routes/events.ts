import { Router, Request, Response } from 'express';
import { eventPayloadSchema } from '@voycelink/contracts';
import type { EventPayload } from '../domain/call';
import { NotFoundError, InvalidTransitionError } from '../domain/errors';
import { callService } from '../services';
import { apiKeyAuth } from '../middleware/apiKey';

const router = Router();

function isZodError(err: unknown): err is { issues: unknown[] } {
  return err instanceof Error && err.name === 'ZodError' && 'issues' in err;
}

router.post('/', apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const payload: EventPayload = eventPayloadSchema.parse(req.body);
    const event = await callService.processEvent(payload);
    res.status(201).json(event);
  } catch (error) {
    if (isZodError(error)) {
      res.status(400).json({ message: 'Invalid event payload', issues: error.issues });
      return;
    }
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error instanceof InvalidTransitionError) {
      res.status(422).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
