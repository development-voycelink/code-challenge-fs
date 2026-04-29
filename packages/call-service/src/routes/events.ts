import { Router, Request, Response } from "express";
import { eventPayloadSchema } from "@voycelink/contracts";
import { ZodError } from "zod";
import { CallNotFoundError, type EventPayload } from "../domain/call";
import { callService } from "../services";
import { apiKeyAuth } from "../middleware/apiKey";

const router = Router();

function isValidationError(error: unknown): error is ZodError {
  return (
    error instanceof ZodError ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "ZodError" &&
      "issues" in error)
  );
}

function isCallNotFoundError(error: unknown): error is CallNotFoundError {
  return (
    error instanceof CallNotFoundError ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "CallNotFoundError")
  );
}

router.post("/", apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const payload: EventPayload = eventPayloadSchema.parse(req.body);
    const event = await callService.processEvent(payload);
    res.status(201).json(event);
  } catch (error) {
    if (isValidationError(error)) {
      res.status(400).json({
        message: "Invalid event payload",
        issues: error.issues,
      });
      return;
    }
    if (isCallNotFoundError(error)) {
      res.status(404).json({
        message: "Call not found",
      });
      return;
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
