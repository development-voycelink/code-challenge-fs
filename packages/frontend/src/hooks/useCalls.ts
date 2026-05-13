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
    socket.connect();

    const cached = queryClient.getQueryData<PaginatedResult<Call>>([
      "calls",
      filters,
    ]);
    const calls = cached?.data ?? [];
    calls.forEach((c) => subscribeToCall(c.id));

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

    socket.on("call_status_update", handleUpdate);

    return () => {
      calls.forEach((c) => unsubscribeFromCall(c.id));
      socket.off("call_status_update", handleUpdate);
    };
  }, [filters, queryClient]);

  return {
    calls: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    loading: query.isLoading,
    error: query.error,
  };
}
