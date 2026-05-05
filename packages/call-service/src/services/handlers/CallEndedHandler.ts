import { CallEventHandler } from './CallEventHandler';
import {CallEndedPayload, EventPayload} from '@voycelink/contracts';
import { CallEvent } from '../../../domain/call';
import { CallRepository } from '../../../db/callRepository';
import { v4 as uuidv4 } from 'uuid';
import { publishStatusUpdate } from '../../../bus/publisher';
import {
  EVENT_CALL_ENDED,
  SHORT_CALL_THRESHOLD,
} from '../../../constants';
import { CallNotFoundError } from '../../../errors';

export class CallEndedHandler implements CallEventHandler {
  constructor(private callRepository: CallRepository) {}

  canHandle(eventType: string): boolean {
    return eventType === EVENT_CALL_ENDED;
  }

  async handle(payload: EventPayload): Promise<CallEvent> {
    const endedPayload = payload as CallEndedPayload;

    // Get the call to verify it exists and get current status
    const call = await this.callRepository.getCallById(endedPayload.callId);
    if (!call) {
      throw new CallNotFoundError(endedPayload.callId);
    }

    // Update call status to ended
    await this.callRepository.updateCallStatus(
      endedPayload.callId,
      'ended',
      { endTime: new Date() }
    );

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
      eventId,
      endedPayload.callId,
      EVENT_CALL_ENDED,
      new Date(),
      { endReason: endedPayload.endReason, duration: endedPayload.duration }
    );

    // Store event in database
    await this.callRepository.createCallEvent(
      eventId,
      endedPayload.callId,
      EVENT_CALL_ENDED,
      { endReason: endedPayload.endReason, duration: endedPayload.duration }
    );

    // Publish status update
    await publishStatusUpdate({
      callId: endedPayload.callId,
      status: 'ended',
      eventType: EVENT_CALL_ENDED,
      timestamp: new Date().toISOString(),
      metadata: { endReason: endedPayload.endReason, duration: endedPayload.duration }
    });

    // Check if call duration is under 10 seconds and flag if needed
    if (endedPayload.duration < SHORT_CALL_THRESHOLD) {
      // In a real system, we might send a notification or alert here
      console.warn(`Short call: Call ${endedPayload.callId} ended after only ${endedPayload.duration} seconds`);
    }

    return event;
  }
}