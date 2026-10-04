/**
 * Application entry point: HTTP API plus Socket.IO realtime gateway.
 */
import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { initSocket, getConnectionCount } from './socket.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import shelterRoutes from './routes/shelters.js';
import hazardRoutes from './routes/hazards.js';
import sosRoutes from './routes/sos.js';
import reportRoutes from './routes/reports.js';
import checkinRoutes from './routes/checkins.js';
import alertRoutes from './routes/alerts.js';
import contactRoutes from './routes/contacts.js';
import liveRoutes from './routes/live.js';
import analyticsRoutes from './routes/analytics.js';

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// The database schema is applied when ./db.js is first imported, which the
// route modules below do transitively.

const app = express();

// Cross-origin resource policy is relaxed because the Vite dev server on a
// different port loads JSON from this API during development.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '256kb' }));
app.use(morgan('dev'));

// Rate limiters key on the client address, so trust the loopback proxy only.
app.set('trust proxy', 'loopback');

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    connectedClients: getConnectionCount(),
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/shelters', shelterRoutes);
app.use('/api/hazards', hazardRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use('/api', notFound);
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server, CLIENT_ORIGIN);

server.listen(PORT, () => {
  console.log(`[server] API listening on http://localhost:${PORT}`);
  console.log(`[server] accepting browser requests from ${CLIENT_ORIGIN}`);
});

function shutdown(signal) {
  console.log(`[server] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
