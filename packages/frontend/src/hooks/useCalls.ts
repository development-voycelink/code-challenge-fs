"use client";

import { useEffect, useRef, useState } from "react";
import { Call, CallFilters } from "../types";
import { fetchCalls } from "../lib/api";
import { getSocket } from "../lib/socket";

export function useCalls(filters: CallFilters) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchCalls(filters)
      .then((data) => {
        if (!cancelled && mounted.current) setCalls(data);
      })
      .finally(() => {
        if (!cancelled && mounted.current) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.status, filters.queueId]);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onUpdate = () => {
      fetchCalls(filters)
        .then(setCalls)
        .catch(() => {});
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("call_status_update", onUpdate);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("call_status_update", onUpdate);
    };
  }, [filters.status, filters.queueId]);

  return { calls, loading, connected, setCalls };
}
