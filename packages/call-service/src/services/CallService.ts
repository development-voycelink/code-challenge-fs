import {
  Call,
  CallEvent,
  CallFilters,
  CallServiceContract,
  EventPayload,
} from '../domain/call';
import { mapCallRow, mapCallEventRow } from '../db/mappers';
import { publishStatusUpdate } from '../bus/publisher';
import { v4 as uuidv4 } from 'uuid';
import type { CallInitiatedPayload, CallRoutedPayload, CallAnsweredPayload, CallHoldPayload, CallEndedPayload } from '@voycelink/contracts';
import { db } from '../db/client';

export class CallService implements CallServiceContract {
  async processEvent(payload: EventPayload): Promise<CallEvent> {
    switch (payload.event) {
      case 'call_initiated':
        return this.handleCallInitiated(payload);
      case 'call_routed':
        return this.handleCallRouted(payload);
      case 'call_answered':
        return this.handleCallAnswered(payload);
      case 'call_hold':
        return this.handleCallHold(payload);
      case 'call_ended':
        return this.handleCallEnded(payload);
      default:
        throw new Error(`Unsupported event type: ${payload.event}`);
    }
  }

  private async handleCallInitiated(payload: CallInitiatedPayload): Promise<CallEvent> {
    // Validate queueId exists (it's already typed as QueueId, but we can double-check)
    const validQueues = ['medical_spanish', 'medical_english', 'legal_spanish', 'legal_english'];
    if (!validQueues.includes(payload.queueId)) {
      throw new Error(`Invalid queueId: ${payload.queueId}`);
    }

    // Check if call already exists
    const existingCallResult = await db.query('SELECT id FROM calls WHERE id = $1', [payload.callId]);
    if (existingCallResult.rowCount > 0) {
      throw new Error(`Call with id ${payload.callId} already exists`);
    }

    // Create call record
    await db.query(
        'INSERT INTO calls (id, type, status, queue_id, start_time) VALUES ($1, $2, $3, $4, $5)',
        [payload.callId, payload.type, 'waiting', payload.queueId, new Date()]
    );

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
        eventId,
        payload.callId,
        'call_initiated',
        new Date(),
        {}
    );

    // Store event in database
    await db.query(
        'INSERT INTO call_events (id, call_id, type, timestamp, metadata) VALUES ($1, $2, $3, $4, $5)',
        [eventId, payload.callId, 'call_initiated', new Date(), JSON.stringify({})]
    );

    // Publish status update
    await publishStatusUpdate({
      callId: payload.callId,
      status: 'waiting',
      eventType: 'call_initiated',
      timestamp: new Date().toISOString(),
      metadata: {}
    });

    return event;
  }

  private async handleCallRouted(payload: CallRoutedPayload): Promise<CallEvent> {
    // Get the call to verify it exists and get current status
    const callResult = await db.query('SELECT id, status FROM calls WHERE id = $1', [payload.callId]);
    if (callResult.rowCount === 0) {
      throw new Error(`Call with id ${payload.callId} not found`);
    }

    const call = callResult.rows[0];

    // Update call status to active (routed means it's waiting for agent to answer)
    await db.query(
        'UPDATE calls SET status = $1 WHERE id = $2',
        ['active', payload.callId]
    );

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
        eventId,
        payload.callId,
        'call_routed',
        new Date(),
        { agentId: payload.agentId, routingTime: payload.routingTime }
    );

    // Store event in database
    await db.query(
        'INSERT INTO call_events (id, call_id, type, timestamp, metadata) VALUES ($1, $2, $3, $4, $5)',
        [eventId, payload.callId, 'call_routed', new Date(), JSON.stringify({ agentId: payload.agentId, routingTime: payload.routingTime })]
    );

    // Publish status update
    await publishStatusUpdate({
      callId: payload.callId,
      status: 'active',
      eventType: 'call_routed',
      timestamp: new Date().toISOString(),
      metadata: { agentId: payload.agentId, routingTime: payload.routingTime }
    });

    return event;
  }

  private async handleCallAnswered(payload: CallAnsweredPayload): Promise<CallEvent> {
    // Get the call to verify it exists and get current status
    const callResult = await db.query('SELECT id, status, startTime FROM calls WHERE id = $1', [payload.callId]);
    if (callResult.rowCount === 0) {
      throw new Error(`Call with id ${payload.callId} not found`);
    }

    const call = callResult.rows[0];

    // Update call status to active (answered means it's now connected)
    await db.query(
        'UPDATE calls SET status = $1 WHERE id = $2',
        ['active', payload.callId]
    );

    // Calculate wait time
    const waitTime = payload.waitTime; // This comes from the payload

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
        eventId,
        payload.callId,
        'call_answered',
        new Date(),
        { waitTime }
    );

    // Store event in database
    await db.query(
        'INSERT INTO call_events (id, call_id, type, timestamp, metadata) VALUES ($1, $2, $3, $4, $5)',
        [eventId, payload.callId, 'call_answered', new Date(), JSON.stringify({ waitTime })]
    );

    // Publish status update
    await publishStatusUpdate({
      callId: payload.callId,
      status: 'active',
      eventType: 'call_answered',
      timestamp: new Date().toISOString(),
      metadata: { waitTime }
    });

    // Check if wait time exceeds SLA (30 seconds) and flag if needed
    if (waitTime > 30) {
      // In a real system, we might send a notification or alert here
      console.warn(`SLA breach: Call ${payload.callId} waited ${waitTime} seconds before being answered`);
    }

    return event;
  }

  private async handleCallHold(payload: CallHoldPayload): Promise<CallEvent> {
    // Get the call to verify it exists and get current status
    const callResult = await db.query('SELECT id, status, holdStartTime FROM calls WHERE id = $1', [payload.callId]);
    if (callResult.rowCount === 0) {
      throw new Error(`Call with id ${payload.callId} not found`);
    }

    const call = callResult.rows[0];

    // Update call status to on_hold
    await db.query(
        'UPDATE calls SET status = $1, holdStartTime = $2 WHERE id = $3',
        ['on_hold', new Date(), payload.callId]
    );

    // Create call event
    const eventId = uuidv4();
    const event = new CallEvent(
        eventId,
        payload.callId,
        'call_hold',
        new Date(),
        { holdDuration: payload.holdDuration }
    );

    // Store event in database
    await db.query(
        'INSERT INTO call_events (id, call_id, type, timestamp, metadata) VALUES ($1, $2, $3, $4, $5)',
        [eventId, payload.callId, 'call_hold', new Date(), JSON.stringify({ holdDuration: payload.holdDuration })]
    );

    // Publish status update
    await publishStatusUpdate({
      callId: payload.callId,
      status: 'on_hold',
      eventType: 'call_hold',
      timestamp: new Date().toISOString(),
      metadata: { holdDuration: payload.holdDuration }
    });

    // Check if hold time exceeds max (60 seconds) and flag if needed
    if (payload.holdDuration > 60) {
      // In a real system, we might send a notification or alert here
      console.warn(`Hold time exceeded: Call ${payload.callId} has been on hold for ${payload.holdDuration} seconds`);
    }

    return event;
  }

  private async handleCallEnded(payload: CallEndedPayload): Promise<CallEvent>

  async getCalls(filters: CallFilters): Promise<Call[]> {
    let query = 'SELECT id, type, status, queue_id, start_time, end_time FROM calls';
    const params: any[] = [];
    const whereConditions: string[] = [];

    if (filters.status && filters.status !== 'all') {
      whereConditions.push(`status = $${params.length + 1}`);
      params.push(filters.status);
    }

    if (filters.queueId) {
      whereConditions.push(`queue_id = $${params.length + 1}`);
      params.push(filters.queueId);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' ORDER BY start_time DESC';

    const result = await db.query(query, params);
    return result.rows.map(mapCallRow);
  }

  async getCallEvents(callId: string): Promise<CallEvent[]> {
    // First verify the call exists
    const callResult = await db.query('SELECT id FROM calls WHERE id = $1', [callId]);
    if (callResult.rowCount === 0) {
      throw new Error(`Call with id ${callId} not found`);
    }

    const result = await db.query(
        'SELECT id, call_id, type, timestamp, metadata FROM call_events WHERE call_id = $1 ORDER BY timestamp ASC',
        [callId]
    );
    return result.rows.map(mapCallEventRow);
  }
}
