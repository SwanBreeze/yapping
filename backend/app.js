/**
 * app.js — Express Application Configuration
 *
 * Separating the Express app from server.js lets us test routes
 * without binding to a port, and keeps concerns clean.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const uploadRoutes = require('./routes/uploadRoutes');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────
// Allow the React dev server (port 5173) to call our API
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// ─── BODY PARSING ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── STATIC FILES ──────────────────────────────────────────────────────────
// Serve uploaded files (images, audio, documents) as static assets
// e.g., GET /uploads/images/abc123.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API ROUTES ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

// Health-check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
