import { CallEventHandler } from './CallEventHandler';
import {CallRoutedPayload, EventPayload} from '@voycelink/contracts';
import { CallEvent } from '../../domain/call';
import { CallRepository } from '../../db/callRepository';
import { v4 as uuidv4 } from 'uuid';
import { publishStatusUpdate } from '../../bus/publisher';
import {
  CALL_STATUS_ACTIVE,
  EVENT_CALL_ROUTED,
} from '../../constants';
import { CallNotFoundError } from '../../errors';

export class CallRoutedHandler implements CallEventHandler {
  constructor(private callRepository: CallRepository) {}

  canHandle(eventType: string): boolean {
    return eventType === EVENT_CALL_ROUTED;
  }

  async handle(payload: EventPayload): Promise<CallEvent> {
    const routedPayload = payload as CallRoutedPayload;

    // Get the call to verify it exists and get current status
    const call = await this.callRepository.getCallById(routedPayload.callId);
    if (!call) {
      throw new CallNotFoundError(routedPayload.callId);
    }

    // Update call status to active (routed means it's waiting for agent to answer)
    await this.callRepository.updateCallStatus(routedPayload.callId, CALL_STATUS_ACTIVE);

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
      eventId,
      routedPayload.callId,
      EVENT_CALL_ROUTED,
      new Date(),
      { agentId: routedPayload.agentId, routingTime: routedPayload.routingTime }
    );

    // Store event in database
    await this.callRepository.createCallEvent(
      eventId,
      routedPayload.callId,
      EVENT_CALL_ROUTED,
      { agentId: routedPayload.agentId, routingTime: routedPayload.routingTime }
    );

    // Publish status update
    await publishStatusUpdate({
      callId: routedPayload.callId,
      status: CALL_STATUS_ACTIVE,
      eventType: EVENT_CALL_ROUTED,
      timestamp: new Date().toISOString(),
      metadata: { agentId: routedPayload.agentId, routingTime: routedPayload.routingTime }
    });

    return event;
  }
}