import { CallEventHandler } from './CallEventHandler';
import {CallAnsweredPayload, EventPayload} from '@voycelink/contracts';
import { CallEvent } from '../../domain/call';
import { CallRepository } from '../../db/callRepository';
import { v4 as uuidv4 } from 'uuid';
import { publishStatusUpdate } from '../../bus/publisher';
import {
  CALL_STATUS_ACTIVE,
  EVENT_CALL_ANSWERED,
  SLA_WAIT_TIME_THRESHOLD,
} from '../../constants';
import { CallNotFoundError } from '../../errors';

export class CallAnsweredHandler implements CallEventHandler {
  constructor(private callRepository: CallRepository) {}

  canHandle(eventType: string): boolean {
    return eventType === EVENT_CALL_ANSWERED;
  }

  async handle(payload: EventPayload): Promise<CallEvent> {
    const answeredPayload = payload as CallAnsweredPayload;

    // Get the call to verify it exists and get current status
    const call = await this.callRepository.getCallById(answeredPayload.callId);
    if (!call) {
      throw new CallNotFoundError(answeredPayload.callId);
    }

    // Update call status to active (answered means it's now connected)
    await this.callRepository.updateCallStatus(answeredPayload.callId, CALL_STATUS_ACTIVE);

    // Calculate wait time
    const waitTime = answeredPayload.waitTime; // This comes from the payload

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
      eventId,
      answeredPayload.callId,
      EVENT_CALL_ANSWERED,
      new Date(),
      { waitTime }
    );

    // Store event in database
    await this.callRepository.createCallEvent(
      eventId,
      answeredPayload.callId,
      EVENT_CALL_ANSWERED,
      { waitTime }
    );

    // Publish status update
    await publishStatusUpdate({
      callId: answeredPayload.callId,
      status: CALL_STATUS_ACTIVE,
      eventType: EVENT_CALL_ANSWERED,
      timestamp: new Date().toISOString(),
      metadata: { waitTime }
    });

    // Check if wait time exceeds SLA (30 seconds) and flag if needed
    if (waitTime > SLA_WAIT_TIME_THRESHOLD) {
      // In a real system, we might send a notification or alert here
      console.warn(`SLA breach: Call ${answeredPayload.callId} waited ${waitTime} seconds before being answered`);
    }

    return event;
  }
}