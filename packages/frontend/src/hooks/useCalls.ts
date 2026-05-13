"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Call, CallFilters, CallStatusUpdate, PaginatedResult } from "../types";
import { fetchCalls } from "../lib/api";
import { getSocket, subscribeToCall, unsubscribeFromCall } from "../lib/socket";

export function useCalls(filters: CallFilters) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["calls", filters],
    queryFn: () => fetchCalls(filters),
  });

  useEffect(() => {
    const socket = getSocket();
    const calls = query.data?.data ?? [];

    // Re-subscribe on every connect. Covers both initial connect and
    // reconnects after the realtime-service restarts (room memberships
    // are server-side and lost when the socket drops).
    const handleConnect = () => calls.forEach((c) => subscribeToCall(c.id));

    const handleUpdate = (update: CallStatusUpdate) => {
      queryClient.setQueryData<PaginatedResult<Call>>(
        ["calls", filters],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((c) =>
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
          };
        },
      );
    };

    // new_call is a global broadcast. No room subscription needed.
    // Invalidating the query causes a refetch which picks up the new call
    // and triggers the effect to subscribe to its room.
    const handleNewCall = () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    };

    socket.on("connect", handleConnect);
    socket.on("call_status_update", handleUpdate);
    socket.on("new_call", handleNewCall);

    if (socket.connected) {
      // Already connected, subscribe immediately (no connect event will fire).
      calls.forEach((c) => subscribeToCall(c.id));
    } else {
      // Not yet connected, handleConnect will subscribe once the socket connects.
      socket.connect();
    }

    return () => {
      calls.forEach((c) => unsubscribeFromCall(c.id));
      socket.off("connect", handleConnect);
      socket.off("call_status_update", handleUpdate);
      socket.off("new_call", handleNewCall);
    };
  }, [filters, queryClient, query.data]);

  return {
    calls: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    loading: query.isLoading,
    error: query.error,
  };
}
