/**
 * Yapping - Main Server Entry Point
 *
 * This file bootstraps the Express app, attaches Socket.IO,
 * registers all routes, and starts listening.
 *
 * Architecture:
 *  server.js          → bootstrap & listen
 *  routes/            → HTTP route definitions
 *  controllers/       → HTTP request handlers
 *  services/          → business logic (shared by HTTP & WS)
 *  middleware/        → express middleware (upload, auth, errors)
 */

require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./services/socketService');

const PORT = process.env.PORT || 3001;

// Create raw HTTP server so Socket.IO can attach to it
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
initSocket(server);

server.listen(PORT, () => {
  console.log(`\n🚀 Yapping backend running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for connections\n`);
});