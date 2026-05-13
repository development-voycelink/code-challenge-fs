import type {
  Call,
  CallEvent,
  CallFilters,
  EventPayload,
  PaginatedResult,
} from "../types";

const BASE_URL =
  process.env.NEXT_PUBLIC_CALL_SERVICE_URL ?? "http://localhost:3001";

export async function fetchCalls(
  params?: CallFilters,
): Promise<PaginatedResult<Call>> {
  const queryParams = new URLSearchParams();
  if (params?.status && params.status !== "all") {
    queryParams.set("status", params.status);
  }
  if (params?.queueId) {
    queryParams.set("queueId", params.queueId);
  }
  if (params?.page) {
    queryParams.set("page", String(params.page));
  }
  if (params?.limit) {
    queryParams.set("limit", String(params.limit));
  }

  const query = queryParams.toString();
  const res = await fetch(`${BASE_URL}/api/calls${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch calls");
  return res.json();
}

/**
 * Fetch event history for a specific call.
 * TODO: call this from the `useCallEvents` hook.
 */
export async function fetchCallEvents(callId: string): Promise<CallEvent[]> {
  const res = await fetch(`${BASE_URL}/api/calls/${callId}/events`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch call events");
  return res.json();
}

/**
 * Post a lifecycle event to call-service.
 */
export async function postEvent(payload: EventPayload): Promise<CallEvent> {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to post event");
  return res.json();
}
