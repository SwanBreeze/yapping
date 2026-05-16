/**
 * socketService.js — Socket.IO Client Singleton
 */

import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3001';

const socket = io(BACKEND_URL, {
  autoConnect: false,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling'],
});

export default socket;
