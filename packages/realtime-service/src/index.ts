import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { createSocketServer, broadcastStatusUpdate } from './socket/server';
import { subscribeToCallUpdates } from './bus/subscriber';

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT ?? 3002;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Attach Socket.io
createSocketServer(httpServer);

// Wire Redis → Socket.io
subscribeToCallUpdates((update) => {
  console.log('Broadcasting update:', update);
  broadcastStatusUpdate(update);
});

httpServer.listen(PORT, () => {
  console.log(`realtime-service  →  http://localhost:${PORT}`);
});
