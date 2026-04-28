import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { validQueues } from './data/queues';
import { connectToMongoDB } from './db';
import { upsertCall } from './services/callService';
import { saveEvent } from './services/saveEvent';

import cors from 'cors';
import callsRouter from './routes/calls';
import eventsRouter from './routes/events';

import dotenv from 'dotenv';
import { call_status, event_names } from './utils/enums';
dotenv.config();

connectToMongoDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: 'http://localhost:3001' }));
app.use(express.json());
app.use('/', callsRouter);
app.use('/', eventsRouter);

app.get('/', (req, res) => {
  res.send('Call Lifecycle Service is running');
});


io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on(event_names.call_initiated, (data) => {
    const { call_id, type, queue_id } = data;

    if (!validQueues.includes(queue_id)) {
      console.log(`Invalid queue: ${queue_id}`);
      socket.emit('error_event', { error: 'Invalid queue_id' });
      return;
    }

    console.log(`Call started (call_id: ${call_id}, type: ${type}, queue: ${queue_id})`);
    saveEvent(call_id, event_names.call_initiated, data);
    upsertCall(call_id, queue_id, call_status.waiting);

    setTimeout(() => {
      console.log(`Timeout: ${call_id}`);
      socket.emit('sla_timeout', { call_id });
    }, 30_000);
  });

  socket.on(event_names.call_routed, (data) => {
    const { call_id, agent_id, routing_time } = data;

    console.log(`Call ${call_id} assigned to ${agent_id}. Routing: ${routing_time}s`);

    const timeout = setTimeout(() => {
      console.log(`Agent ${agent_id} did not respond. Emit call_retransfer.`);
      socket.emit('call_retransfer', { call_id, agent_id });
    }, 15_000);

    socket.data[`timeout_${call_id}`] = timeout;
  });

  socket.on(event_names.call_answered, (data) => {
    const { call_id, agent_id, wait_time } = data;

    console.log(`Agent ${agent_id} responded the call ${call_id}. Wait: ${wait_time}s`);

    const timeoutKey = `timeout_${call_id}`;
    const existingTimeout = socket.data[timeoutKey];

    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete socket.data[timeoutKey];
      console.log(`Cleaned for ${call_id}`);
    }

    if (wait_time > 30) {
      socket.emit('supervisor_alert', {
        call_id,
        agent_id,
        reason: 'Wait time exceeded 30s'
      });
    }
  });

  socket.on(event_names.call_hold, (data) => {
    const { call_id, hold_duration } = data;

    console.log(`Call ${call_id} is on hold now: ${hold_duration}s`);

    if (hold_duration > 60) {
      socket.emit('supervisor_alert', {
        call_id,
        reason: 'Hold time exceeded 60s'
      });
    }
  });

  socket.on(event_names.call_ended, (data) => {
    const { call_id, reason } = data;

    console.log(`Call ${call_id} ended: ${reason}`);

    const timeoutKey = `timeout_${call_id}`;
    const existingTimeout = socket.data[timeoutKey];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete socket.data[timeoutKey];
      console.log(`Cleaned for ${call_id}`);
    }

    socket.emit('call_summary', {
      call_id,
      status: 'ended',
      reason
    });
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
  });
});

export { app, httpServer, io };

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
