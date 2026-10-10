import { io } from 'socket.io-client';

/**
 * One shared socket for the pharmacy chat pages.
 * If your app already creates a socket (for appointment chats), export and reuse that one instead.
 * Adapt getToken() to wherever you store the JWT.
 */
const getToken = () => localStorage.getItem('token');

let socket;
export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      auth: (cb) => cb({ token: getToken() }), // re-read on every reconnect
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function closeSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}