import { Router, Request, Response } from "express";
import type { QueueId } from "@voycelink/contracts";
import type { CallFilters, CallStatus } from "../domain/call";
import { NotFoundError } from "../domain/errors";
import { callService } from "../services";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters: CallFilters = {
      status:
        typeof req.query.status === "string"
          ? (req.query.status as CallStatus)
          : undefined,
      queueId:
        typeof req.query.queueId === "string"
          ? (req.query.queueId as QueueId)
          : undefined,
      page,
      limit,
    };

    const { data, total } = await callService.getCalls(filters);
    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (_error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id/events", async (req: Request, res: Response) => {
  try {
    const events = await callService.getCallEvents(req.params.id);
    res.json(events);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
