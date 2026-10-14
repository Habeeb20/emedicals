import { io } from 'socket.io-client';

const getToken = () => localStorage.getItem('token'); // must match the key your login uses

// Socket.IO wants the origin only: no /api suffix
const SOCKET_URL = new URL(
  import.meta.env.VITE_API_URL || 'http://localhost:8000', // <-- your backend port
  window.location.origin
).origin;

let socket;
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: (cb) => cb({ token: getToken() }),
      transports: ['websocket', 'polling'],
    });
    if (import.meta.env.DEV) {
      socket.on('connect', () => console.log('[socket] connected', SOCKET_URL));
      socket.on('connect_error', (e) => console.error('[socket] failed:', SOCKET_URL, e.message));
    }
  }
  return socket;
}

export function closeSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}