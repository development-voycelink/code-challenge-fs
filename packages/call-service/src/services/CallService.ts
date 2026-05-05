import {
  Call,
  CallEvent,
  CallFilters,
  CallServiceContract,
  EventPayload,
} from '../domain/call';
import { publishStatusUpdate } from '../bus/publisher';
import { v4 as uuidv4 } from 'uuid';
import type {
  CallInitiatedPayload,
  CallRoutedPayload,
  CallAnsweredPayload,
  CallHoldPayload,
  CallEndedPayload,
} from '@voycelink/contracts';
import {
  VALID_QUEUES,
  CALL_STATUS_WAITING,
  CALL_STATUS_ACTIVE,
  CALL_STATUS_ON_HOLD,
  SLA_WAIT_TIME_THRESHOLD,
  MAX_HOLD_TIME_THRESHOLD,
  SHORT_CALL_THRESHOLD,
  EVENT_CALL_INITIATED,
  EVENT_CALL_ROUTED,
  EVENT_CALL_ANSWERED,
  EVENT_CALL_HOLD,
  EVENT_CALL_ENDED,
} from '../constants';
import {
  CallAlreadyExistsError,
  CallNotFoundError,
  InvalidQueueIdError,
  UnsupportedEventTypeError,
} from '../errors';
import { CallRepository } from '../db/callRepository';

export class CallService implements CallServiceContract {
  private callRepository: CallRepository;

  constructor(callRepository: CallRepository = new CallRepository()) {
    this.callRepository = callRepository;
  }

  async processEvent(payload: EventPayload): Promise<CallEvent> {
    switch (payload.event) {
      case EVENT_CALL_INITIATED:
        return this.handleCallInitiated(payload);
      case EVENT_CALL_ROUTED:
        return this.handleCallRouted(payload);
      case EVENT_CALL_ANSWERED:
        return this.handleCallAnswered(payload);
      case EVENT_CALL_HOLD:
        return this.handleCallHold(payload);
      case EVENT_CALL_ENDED:
        return this.handleCallEnded(payload);
      default:
        throw new UnsupportedEventTypeError(payload.event);
    }
  }

  private async handleCallInitiated(payload: CallInitiatedPayload): Promise<CallEvent> {
    // Validate queueId exists
    if (!VALID_QUEUES.includes(payload.queueId as any)) {
      throw new InvalidQueueIdError(payload.queueId);
    }

    // Check if call already exists
    const existingCall = await this.callRepository.getCallById(payload.callId);
    if (existingCall) {
      throw new CallAlreadyExistsError(payload.callId);
    }

    // Create call record
    await this.callRepository.createCall(payload.callId, payload.type, payload.queueId);

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
      eventId,
      payload.callId,
      EVENT_CALL_INITIATED,
      new Date(),
      {}
    );

    // Store event in database
    await this.callRepository.createCallEvent(eventId, payload.callId, EVENT_CALL_INITIATED, {});

    // Publish status update
    await publishStatusUpdate({
      callId: payload.callId,
      status: CALL_STATUS_WAITING,
      eventType: EVENT_CALL_INITIATED,
      timestamp: new Date().toISOString(),
      metadata: {}
    });

    return event;
  }

  private async handleCallRouted(payload: CallRoutedPayload): Promise<CallEvent> {
    // Get the call to verify it exists and get current status
    const call = await this.callRepository.getCallById(payload.callId);
    if (!call) {
      throw new CallNotFoundError(payload.callId);
    }

    // Update call status to active (routed means it's waiting for agent to answer)
    await this.callRepository.updateCallStatus(payload.callId, CALL_STATUS_ACTIVE);

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
      eventId,
      payload.callId,
      EVENT_CALL_ROUTED,
      new Date(),
      { agentId: payload.agentId, routingTime: payload.routingTime }
    );

    // Store event in database
    await this.callRepository.createCallEvent(eventId, payload.callId, EVENT_CALL_ROUTED, { agentId: payload.agentId, routingTime: payload.routingTime });

    // Publish status update
    await publishStatusUpdate({
      callId: payload.callId,
      status: CALL_STATUS_ACTIVE,
      eventType: EVENT_CALL_ROUTED,
      timestamp: new Date().toISOString(),
      metadata: { agentId: payload.agentId, routingTime: payload.routingTime }
    });

    return event;
  }

  private async handleCallAnswered(payload: CallAnsweredPayload): Promise<CallEvent> {
    // Get the call to verify it exists and get current status
    const call = await this.callRepository.getCallById(payload.callId);
    if (!call) {
      throw new CallNotFoundError(payload.callId);
    }

    // Update call status to active (answered means it's now connected)
    await this.callRepository.updateCallStatus(payload.callId, CALL_STATUS_ACTIVE);

    // Calculate wait time
    const waitTime = payload.waitTime; // This comes from the payload

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
      eventId,
      payload.callId,
      EVENT_CALL_ANSWERED,
      new Date(),
      { waitTime }
    );

    // Store event in database
    await this.callRepository.createCallEvent(eventId, payload.callId, EVENT_CALL_ANSWERED, { waitTime });

    // Publish status update
    await publishStatusUpdate({
      callId: payload.callId,
      status: CALL_STATUS_ACTIVE,
      eventType: EVENT_CALL_ANSWERED,
      timestamp: new Date().toISOString(),
      metadata: { waitTime }
    });

    // Check if wait time exceeds SLA (30 seconds) and flag if needed
    if (waitTime > SLA_WAIT_TIME_THRESHOLD) {
      // In a real system, we might send a notification or alert here
      console.warn(`SLA breach: Call ${payload.callId} waited ${waitTime} seconds before being answered`);
    }

    return event;
  }

  private async handleCallHold(payload: CallHoldPayload): Promise<CallEvent> {
    // Get the call to verify it exists and get current status
    const call = await this.callRepository.getCallById(payload.callId);
    if (!call) {
      throw new CallNotFoundError(payload.callId);
    }

    // Update call status to on_hold
    await this.callRepository.updateCallStatus(payload.callId, CALL_STATUS_ON_HOLD, { holdStartTime: new Date() });

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
      eventId,
      payload.callId,
      EVENT_CALL_HOLD,
      new Date(),
      { holdDuration: payload.holdDuration }
    );

    // Store event in database
    await this.callRepository.createCallEvent(eventId, payload.callId, EVENT_CALL_HOLD, { holdDuration: payload.holdDuration });

    // Publish status update
    await publishStatusUpdate({
      callId: payload.callId,
      status: CALL_STATUS_ON_HOLD,
      eventType: EVENT_CALL_HOLD,
      timestamp: new Date().toISOString(),
      metadata: { holdDuration: payload.holdDuration }
    });

    // Check if hold time exceeds max (60 seconds) and flag if needed
    if (payload.holdDuration > MAX_HOLD_TIME_THRESHOLD) {
      // In a real system, we might send a notification or alert here
      console.warn(`Hold time exceeded: Call ${payload.callId} has been on hold for ${payload.holdDuration} seconds`);
    }

    return event;
  }

  private async handleCallEnded(payload: CallEndedPayload): Promise<CallEvent> {
    // Get the call to verify it exists and get current status
    const call = await this.callRepository.getCallById(payload.callId);
    if (!call) {
      throw new CallNotFoundError(payload.callId);
    }

    // Update call status to ended
    await this.callRepository.updateCallStatus(payload.callId, 'ended', { endTime: new Date() });

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
      eventId,
      payload.callId,
      EVENT_CALL_ENDED,
      new Date(),
      { endReason: payload.endReason, duration: payload.duration }
    );

    // Store event in database
    await this.callRepository.createCallEvent(eventId, payload.callId, EVENT_CALL_ENDED, { endReason: payload.endReason, duration: payload.duration });

    // Publish status update
    await publishStatusUpdate({
      callId: payload.callId,
      status: 'ended',
      eventType: EVENT_CALL_ENDED,
      timestamp: new Date().toISOString(),
      metadata: { endReason: payload.endReason, duration: payload.duration }
    });

    // Check if call duration is under 10 seconds and flag if needed
    if (payload.duration < SHORT_CALL_THRESHOLD) {
      // In a real system, we might send a notification or alert here
      console.warn(`Short call: Call ${payload.callId} ended after only ${payload.duration} seconds`);
    }

    return event;
  }

  async getCalls(filters: CallFilters): Promise<Call[]> {
    return this.callRepository.getCalls(filters);
  }

  async getCallEvents(callId: string): Promise<CallEvent[]> {
    return this.callRepository.getCallEvents(callId);
  }
}
