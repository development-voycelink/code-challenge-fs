import { config } from './config';
import express from 'express';
import cors from 'cors';
import eventsRouter from './routes/events';
import callsRouter from './routes/calls';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/events', eventsRouter);
app.use('/api/calls', callsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(config.port, () => {
  console.log(`call-service  →  http://localhost:${config.port}`);
});
