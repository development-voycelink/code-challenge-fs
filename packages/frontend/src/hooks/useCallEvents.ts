"use client";

import { useEffect, useState } from "react";
import { CallEvent } from "../types";
import { fetchCallEvents } from "../lib/api";
import { getSocket, subscribeToCall, unsubscribeFromCall } from "../lib/socket";

export function useCallEvents(callId: string | null) {
  const [events, setEvents] = useState<CallEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!callId) {
      setEvents([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchCallEvents(callId)
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [callId]);

  useEffect(() => {
    if (!callId) return;

    const socket = getSocket();
    const onUpdate = (update: { callId: string }) => {
      if (update.callId !== callId) return;
      fetchCallEvents(callId)
        .then(setEvents)
        .catch(() => {});
    };

    if (!socket.connected) socket.connect();
    subscribeToCall(callId);
    socket.on("call_status_update", onUpdate);

    return () => {
      socket.off("call_status_update", onUpdate);
      unsubscribeFromCall(callId);
    };
  }, [callId]);

  return { events, loading };
}
