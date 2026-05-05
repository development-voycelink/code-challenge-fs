import { CallEventHandler } from './CallEventHandler';
import {CallInitiatedPayload, EventPayload} from '@voycelink/contracts';
import { CallEvent } from '../../../domain/call';
import { CallRepository } from '../../../db/callRepository';
import { v4 as uuidv4 } from 'uuid';
import { publishStatusUpdate } from '../../../bus/publisher';
import {
  CALL_STATUS_WAITING,
  EVENT_CALL_INITIATED,
  VALID_QUEUES,
} from '../../../constants';
import {
  CallAlreadyExistsError,
  InvalidQueueIdError,
} from '../../../errors';

export class CallInitiatedHandler implements CallEventHandler {
  constructor(private callRepository: CallRepository) {}

  canHandle(eventType: string): boolean {
    return eventType === EVENT_CALL_INITIATED;
  }

  async handle(payload: EventPayload): Promise<CallEvent> {
    const initiatedPayload = payload as CallInitiatedPayload;

    // Validate queueId exists
    if (!VALID_QUEUES.includes(initiatedPayload.queueId as any)) {
      throw new InvalidQueueIdError(initiatedPayload.queueId);
    }

    // Check if call already exists
    const existingCall = await this.callRepository.getCallById(initiatedPayload.callId);
    if (existingCall) {
      throw new CallAlreadyExistsError(initiatedPayload.callId);
    }

    // Create call record
    await this.callRepository.createCall(
      initiatedPayload.callId,
      initiatedPayload.type,
      initiatedPayload.queueId
    );

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
      eventId,
      initiatedPayload.callId,
      EVENT_CALL_INITIATED,
      new Date(),
      {}
    );

    // Store event in database
    await this.callRepository.createCallEvent(
      eventId,
      initiatedPayload.callId,
      EVENT_CALL_INITIATED,
      {}
    );

    // Publish status update
    await publishStatusUpdate({
      callId: initiatedPayload.callId,
      status: CALL_STATUS_WAITING,
      eventType: EVENT_CALL_INITIATED,
      timestamp: new Date().toISOString(),
      metadata: {}
    });

    return event;
  }
}