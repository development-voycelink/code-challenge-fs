"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CallStatusUpdate } from "../types";
import { fetchCallEvents } from "../lib/api";
import { getSocket } from "../lib/socket";

export function useCallEvents(callId: string | null) {
  const queryClient = useQueryClient();

  // Invalidate the events list whenever this call gets a status update.
  useEffect(() => {
    if (!callId) return;
    const socket = getSocket();

    const handleUpdate = (update: CallStatusUpdate) => {
      if (update.callId === callId) {
        queryClient.invalidateQueries({ queryKey: ["callEvents", callId] });
      }
    };

    socket.on("call_status_update", handleUpdate);
    return () => {
      socket.off("call_status_update", handleUpdate);
    };
  }, [callId, queryClient]);

  const query = useQuery({
    queryKey: ["callEvents", callId],
    queryFn: () => fetchCallEvents(callId!),
    enabled: !!callId,
  });

  return {
    events: query.data ?? [],
    loading: query.isLoading,
  };
}
