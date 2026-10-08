import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
let socket = null;

/** One shared connection per token. Call closeSocket() on logout. */
export function getSocket(token) {
  if (socket && socket.auth?.token === token) return socket;
  socket?.disconnect();
  socket = io(URL, { auth: { token }, transports: ['websocket', 'polling'] });
  return socket;
}
export const closeSocket = () => { socket?.disconnect(); socket = null; };
