"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Call, CallFilters, CallStatusUpdate } from "../types";
import { fetchCalls } from "../lib/api";
import { getSocket, subscribeToCall, unsubscribeFromCall } from "../lib/socket";

export function useCalls(filters: CallFilters) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["calls", filters],
    queryFn: () => fetchCalls(filters),
  });

  // Subscribe to each visible call and patch the cache on status updates.
  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const calls = queryClient.getQueryData<Call[]>(["calls", filters]) ?? [];
    calls.forEach((c) => subscribeToCall(c.id));

    const handleUpdate = (update: CallStatusUpdate) => {
      queryClient.setQueryData<Call[]>(["calls", filters], (old = []) =>
        old.map((c) =>
          c.id === update.callId
            ? {
                ...c,
                status: update.status,
                ...(update.status === "ended"
                  ? { endTime: update.timestamp }
                  : {}),
              }
            : c,
        ),
      );
    };

    socket.on("call_status_update", handleUpdate);

    return () => {
      calls.forEach((c) => unsubscribeFromCall(c.id));
      socket.off("call_status_update", handleUpdate);
    };
  }, [filters, queryClient]);

  return {
    calls: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
  };
}
