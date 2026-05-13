'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function useSocketStatus(): 'connected' | 'disconnected' {
  const [status, setStatus] = useState<'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    const socket = getSocket();

    if (socket.connected) setStatus('connected');

    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return status;
}
