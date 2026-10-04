/**
 * Socket.IO client. Connects to the same origin, which the Vite dev server
 * proxies to the backend with websocket upgrade enabled.
 */
import { io } from 'socket.io-client';

export const SOCKET_EVENTS = {
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

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
