/**
 * socketService.js — Socket.IO Client Singleton
 *
 * We export a single socket instance used across the entire app.
 * React Context (SocketContext) will distribute this to all components.
 */

import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Create the socket but don't connect yet — we connect after login
const socket = io(BACKEND_URL, {
  autoConnect: false,     // We'll call socket.connect() manually after auth
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling'], // WebSocket first, fallback to polling
});

export default socket;
