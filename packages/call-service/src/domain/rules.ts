export interface RuleFlag {
  rule: string;
  message: string;
}

export function checkWaitSLA(waitTime: number): RuleFlag | null {
  return waitTime > 30
    ? { rule: 'wait_sla_exceeded', message: `Wait time ${waitTime}s exceeds 30s SLA` }
    : null;
}

export function checkHoldLimit(holdDuration: number): RuleFlag | null {
  return holdDuration > 60
    ? { rule: 'hold_limit_exceeded', message: `Hold duration ${holdDuration}s exceeds 60s max` }
    : null;
}

export function checkShortCall(duration: number): RuleFlag | null {
  return duration < 10
    ? { rule: 'short_call', message: `Call duration ${duration}s is under 10s` }
    : null;
}

export function checkReroute(routingTime: number): RuleFlag | null {
  return routingTime > 15
    ? { rule: 'rerouted', message: `Call rerouted after ${routingTime}s without answer` }
    : null;
}
