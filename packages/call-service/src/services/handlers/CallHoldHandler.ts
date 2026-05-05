import { CallEventHandler } from './CallEventHandler';
import {CallHoldPayload, EventPayload} from '@voycelink/contracts';
import { CallEvent } from '../../domain/call';
import { CallRepository } from '../../db/callRepository';
import { v4 as uuidv4 } from 'uuid';
import { publishStatusUpdate } from '../../bus/publisher';
import {
  CALL_STATUS_ON_HOLD,
  EVENT_CALL_HOLD,
  MAX_HOLD_TIME_THRESHOLD,
} from '../../constants';
import { CallNotFoundError } from '../../errors';

export class CallHoldHandler implements CallEventHandler {
  constructor(private callRepository: CallRepository) {}

  canHandle(eventType: string): boolean {
    return eventType === EVENT_CALL_HOLD;
  }

  async handle(payload: EventPayload): Promise<CallEvent> {
    const holdPayload = payload as CallHoldPayload;

    // Get the call to verify it exists and get current status
    const call = await this.callRepository.getCallById(holdPayload.callId);
    if (!call) {
      throw new CallNotFoundError(holdPayload.callId);
    }

    // Update call status to on_hold
    await this.callRepository.updateCallStatus(
      holdPayload.callId,
      CALL_STATUS_ON_HOLD,
      { holdStartTime: new Date() }
    );

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
      eventId,
      holdPayload.callId,
      EVENT_CALL_HOLD,
      new Date(),
      { holdDuration: holdPayload.holdDuration }
    );

    // Store event in database
    await this.callRepository.createCallEvent(
      eventId,
      holdPayload.callId,
      EVENT_CALL_HOLD,
      { holdDuration: holdPayload.holdDuration }
    );

    // Publish status update
    await publishStatusUpdate({
      callId: holdPayload.callId,
      status: CALL_STATUS_ON_HOLD,
      eventType: EVENT_CALL_HOLD,
      timestamp: new Date().toISOString(),
      metadata: { holdDuration: holdPayload.holdDuration }
    });

    // Check if hold time exceeds max (60 seconds) and flag if needed
    if (holdPayload.holdDuration > MAX_HOLD_TIME_THRESHOLD) {
      // In a real system, we might send a notification or alert here
      console.warn(`Hold time exceeded: Call ${holdPayload.callId} has been on hold for ${holdPayload.holdDuration} seconds`);
    }

    return event;
  }
}