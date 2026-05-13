import { v4 as uuid } from "uuid";
import type { EventPayload } from "../domain/call";
import { Call, CallEvent } from "../domain/call";
import type { CallFilters } from "../domain/call";
import { NotFoundError } from "../domain/errors";
import { resolveNextStatus } from "../domain/stateMachine";
import {
  checkWaitSLA,
  checkHoldLimit,
  checkShortCall,
  checkReroute,
} from "../domain/rules";
import type { RuleFlag } from "../domain/rules";
import { CallRepository } from "../repositories/CallRepository";
import { CallEventRepository } from "../repositories/CallEventRepository";
import { publishStatusUpdate } from "../bus/publisher";
import type { CallServiceContract } from "../domain/call";
import type {
  CallInitiatedPayload,
  CallRoutedPayload,
  CallAnsweredPayload,
  CallHoldPayload,
  CallEndedPayload,
} from "@voycelink/contracts";

export class CallService implements CallServiceContract {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly eventRepo: CallEventRepository,
  ) {}

  async processEvent(payload: EventPayload): Promise<CallEvent> {
    switch (payload.event) {
      case "call_initiated":
        return this.handleCallInitiated(payload);
      case "call_routed":
        return this.handleCallRouted(payload);
      case "call_answered":
        return this.handleCallAnswered(payload);
      case "call_hold":
        return this.handleCallHold(payload);
      case "call_ended":
        return this.handleCallEnded(payload);
    }
  }

  async getCalls(
    filters: CallFilters,
  ): Promise<{ data: Call[]; total: number }> {
    return this.callRepo.listCalls(filters);
  }

  async getCallEvents(callId: string): Promise<CallEvent[]> {
    return this.eventRepo.listEventsForCall(callId);
  }

  private async handleCallInitiated(
    payload: CallInitiatedPayload,
  ): Promise<CallEvent> {
    const existing = await this.eventRepo.findEventByTypeForCall(
      payload.callId,
      payload.event,
    );
    if (existing) return existing;

    const call = new Call(
      payload.callId,
      payload.type,
      "waiting",
      payload.queueId,
      new Date(),
    );
    await this.callRepo.createCall(call);

    const event = new CallEvent(
      uuid(),
      payload.callId,
      payload.event,
      new Date(),
    );
    await this.eventRepo.recordEvent(event);

    await publishStatusUpdate({
      callId: payload.callId,
      status: "waiting",
      eventType: payload.event,
      timestamp: event.timestamp.toISOString(),
    });

    return event;
  }

  private async handleCallRouted(
    payload: CallRoutedPayload,
  ): Promise<CallEvent> {
    const existing = await this.eventRepo.findEventByTypeForCall(
      payload.callId,
      payload.event,
    );
    if (existing) return existing;

    const call = await this.callRepo.findCallById(payload.callId);
    if (!call) throw new NotFoundError(`Call ${payload.callId} not found`);

    const flags: RuleFlag[] = [];
    const rerouteFlag = checkReroute(payload.routingTime);
    if (rerouteFlag) flags.push(rerouteFlag);

    const metadata: Record<string, unknown> = {
      agentId: payload.agentId,
      routingTime: payload.routingTime,
    };
    if (flags.length) metadata.flags = flags;

    const event = new CallEvent(
      uuid(),
      payload.callId,
      payload.event,
      new Date(),
      metadata,
    );
    await this.eventRepo.recordEvent(event);

    await publishStatusUpdate({
      callId: payload.callId,
      status: call.status,
      eventType: payload.event,
      timestamp: event.timestamp.toISOString(),
      metadata,
    });

    return event;
  }

  private async handleCallAnswered(
    payload: CallAnsweredPayload,
  ): Promise<CallEvent> {
    const existing = await this.eventRepo.findEventByTypeForCall(
      payload.callId,
      payload.event,
    );
    if (existing) return existing;

    const call = await this.callRepo.findCallById(payload.callId);
    if (!call) throw new NotFoundError(`Call ${payload.callId} not found`);

    const nextStatus = resolveNextStatus(call.status, payload.event);
    await this.callRepo.updateCallStatus(payload.callId, nextStatus);

    const flags: RuleFlag[] = [];
    const slaFlag = checkWaitSLA(payload.waitTime);
    if (slaFlag) flags.push(slaFlag);

    const metadata: Record<string, unknown> = { waitTime: payload.waitTime };
    if (flags.length) metadata.flags = flags;

    const event = new CallEvent(
      uuid(),
      payload.callId,
      payload.event,
      new Date(),
      metadata,
    );
    await this.eventRepo.recordEvent(event);

    await publishStatusUpdate({
      callId: payload.callId,
      status: nextStatus,
      eventType: payload.event,
      timestamp: event.timestamp.toISOString(),
      metadata,
    });

    return event;
  }

  private async handleCallHold(payload: CallHoldPayload): Promise<CallEvent> {
    const existing = await this.eventRepo.findEventByTypeForCall(
      payload.callId,
      payload.event,
    );
    if (existing) return existing;

    const call = await this.callRepo.findCallById(payload.callId);
    if (!call) throw new NotFoundError(`Call ${payload.callId} not found`);

    const nextStatus = resolveNextStatus(call.status, payload.event);
    await this.callRepo.updateCallStatus(payload.callId, nextStatus);

    const flags: RuleFlag[] = [];
    const holdFlag = checkHoldLimit(payload.holdDuration);
    if (holdFlag) flags.push(holdFlag);

    const metadata: Record<string, unknown> = {
      holdDuration: payload.holdDuration,
    };
    if (flags.length) metadata.flags = flags;

    const event = new CallEvent(
      uuid(),
      payload.callId,
      payload.event,
      new Date(),
      metadata,
    );
    await this.eventRepo.recordEvent(event);

    await publishStatusUpdate({
      callId: payload.callId,
      status: nextStatus,
      eventType: payload.event,
      timestamp: event.timestamp.toISOString(),
      metadata,
    });

    return event;
  }

  private async handleCallEnded(payload: CallEndedPayload): Promise<CallEvent> {
    const existing = await this.eventRepo.findEventByTypeForCall(
      payload.callId,
      payload.event,
    );
    if (existing) return existing;

    const call = await this.callRepo.findCallById(payload.callId);
    if (!call) throw new NotFoundError(`Call ${payload.callId} not found`);

    const nextStatus = resolveNextStatus(call.status, payload.event);
    const endTime = new Date();
    await this.callRepo.updateCallStatus(payload.callId, nextStatus, endTime);

    const flags: RuleFlag[] = [];
    const shortFlag = checkShortCall(payload.duration);
    if (shortFlag) flags.push(shortFlag);

    const metadata: Record<string, unknown> = {
      endReason: payload.endReason,
      duration: payload.duration,
    };
    if (flags.length) metadata.flags = flags;

    const event = new CallEvent(
      uuid(),
      payload.callId,
      payload.event,
      new Date(),
      metadata,
    );
    await this.eventRepo.recordEvent(event);

    await publishStatusUpdate({
      callId: payload.callId,
      status: nextStatus,
      eventType: payload.event,
      timestamp: event.timestamp.toISOString(),
      metadata,
    });

    return event;
  }
}
