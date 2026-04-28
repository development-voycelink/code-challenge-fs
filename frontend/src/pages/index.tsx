import React from 'react';
import socket from '../../lib/socket';
import { call_status, event_names } from '@/utils/enums';

const statuses = ['all', 'waiting', 'active', 'on_hold', 'ended'];
const queues = ['all', 'medical_spanish', 'general_english', 'test_queue'];

type EventData = {
  id: string;
  call_id: string;
  event_name: event_names;
}

type CallData = {
  id: string;
  queue_id: string;
  status: call_status;
  start_time: string;
  end_time?: string;
}

export default function Home() {
  const [selectedCallId, setSelectedCallId] = React.useState<string | null>(null);
  const [selectedCallEvents, setSelectedCallEvents] = React.useState<EventData[]>([]);
  const [calls, setCalls] = React.useState<CallData[]>([]);
  const [selectedStatus, setSelectedStatus] = React.useState('all');
  const [selectedQueue, setSelectedQueue] = React.useState('all');

  const fetchCalls = () => {
    setSelectedCallEvents([]);
    const query = new URLSearchParams();

    if (selectedStatus !== 'all') query.append('status', selectedStatus);
    else query.append('status', 'waiting,active,on_hold,ended');

    if (selectedQueue !== 'all') query.append('queue_id', selectedQueue);

    fetch(`http://localhost:3000/api/calls?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Calls:', data);
        setCalls(data);
        if (data.length > 0) {
          setSelectedCallId(data[0].id);
        }
      })
      .catch((err) => console.error('Error while fetching calls:', err));
  };

  const fetchCallEvents = () => {
    fetch(`http://localhost:3000/api/calls/${selectedCallId}/events`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Events:', data);
        setSelectedCallEvents(data.events || []);
      })
      .catch((err) => console.error('Error fetching events:', err));
  };

  React.useEffect(() => {
    fetchCalls();
  }, [selectedStatus, selectedQueue]);

  React.useEffect(() => {
    fetchCallEvents();
  }, [selectedCallId]);

  React.useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected');
    });

    socket.on('new_event', (data: EventData) => {
      console.log('New event received:', data);
      setSelectedCallEvents((prev) => [data, ...prev]);

      const affectingTypes = [
        event_names.call_initiated,
        event_names.call_routed,
        event_names.call_answered,
        event_names.call_hold,
        event_names.call_ended
      ];

      if (affectingTypes.includes(data.event_name)) {
        fetchCalls();
      }
    });

    return () => {
      socket.off('connect');
      socket.off('new_event');
    };
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Llamadas</h1>

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium">Estado</label>
          <select
            className="border px-2 py-1 rounded"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'Todos' : s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Cola</label>
          <select
            className="border px-2 py-1 rounded"
            value={selectedQueue}
            onChange={(e) => setSelectedQueue(e.target.value)}
          >
            {queues.map((q) => (
              <option key={q} value={q}>
                {q === 'all' ? 'Todas' : q}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de llamadas */}
      <table className="w-full text-sm border mt-2 mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Call ID</th>
            <th className="p-2 text-left">Estado</th>
            <th className="p-2 text-left">Cola</th>
            <th className="p-2 text-left">Inicio</th>
            <th className="p-2 text-left">Fin</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call, i) => (
            <tr
              key={i}
              className={`border-t cursor-pointer hover:bg-gray-50 ${selectedCallId === call.id ? 'bg-blue-100' : ''}`}
              onClick={() => setSelectedCallId(call.id)}>
              <td className="p-2">{call.id}</td>
              <td className="p-2">{call.status}</td>
              <td className="p-2">{call.queue_id}</td>
              <td className="p-2">{new Date(call.start_time).toLocaleTimeString()}</td>
             <td className="p-2">{call.end_time ? new Date(call.end_time).toLocaleTimeString() : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h1 className="text-2xl font-bold mb-4">Historial de Eventos</h1>
      <table className="w-full text-sm border mt-2">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Call ID</th>
            <th className="p-2 text-left">Tipo</th>
          </tr>
        </thead>
        <tbody>
          {selectedCallEvents.map((event, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">{event.call_id}</td>
              <td className="p-2">{event.event_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
