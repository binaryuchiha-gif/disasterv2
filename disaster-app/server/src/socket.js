/**
 * Socket.IO gateway.
 * Routes import `emit` to broadcast domain events without holding a reference
 * to the server instance.
 */
import { Server } from 'socket.io';

let io = null;

export const EVENTS = {
  shelterUpdated: 'shelter:updated',
  shelterCreated: 'shelter:created',
  shelterDeleted: 'shelter:deleted',
  alertNew: 'alert:new',
  sosNew: 'sos:new',
  sosUpdated: 'sos:updated',
  reportNew: 'report:new',
  reportUpdated: 'report:updated',
  hazardUpdated: 'hazard:updated',
  disasterSimulate: 'disaster:simulate'
};

export function initSocket(httpServer, clientOrigin) {
  io = new Server(httpServer, {
    cors: {
      origin: clientOrigin,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    socket.emit('connection:ready', { id: socket.id, connectedAt: new Date().toISOString() });

    socket.on('disconnect', () => {
      // Connection counts are read on demand through getConnectionCount().
    });
  });

  return io;
}

export function getIo() {
  return io;
}

export function getConnectionCount() {
  if (!io) return 0;
  return io.engine?.clientsCount ?? 0;
}

/** Broadcasts an event to every connected client. Safe to call before init. */
export function emit(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}
