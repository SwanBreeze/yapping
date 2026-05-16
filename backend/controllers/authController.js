/**
 * authController.js — Secure Authentication with Email + Password
 *
 * Uses:
 *  - bcrypt    : hash passwords (never store plain text)
 *  - jsonwebtoken : sign JWT tokens (stateless sessions)
 *  - better-sqlite3 : persist users to disk
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const SALT_ROUNDS = 12;       // bcrypt work factor — 12 is a safe default
const JWT_SECRET = process.env.JWT_SECRET || 'yapping-secret-change-in-production';
const JWT_EXPIRES = '30d';    // token stays valid for 30 days

/** Build a safe public user object (never expose password hash) */
function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
  };
}

/** Sign a JWT for the given user */
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// ─── REGISTER ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { username, email, password }
 * Returns: { user, token }
 */
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // ── Validation ───────────────────────────────────────────────────
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDb();

    // ── Check uniqueness ─────────────────────────────────────────────
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken — try another' });
    }

    // ── Hash password & save ─────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();
    const trimmedUsername = username.trim();
    const avatar = `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${encodeURIComponent(trimmedUsername)}&backgroundColor=0f172a`;

    db.prepare(`
      INSERT INTO users (id, username, email, password, avatar)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, trimmedUsername, email.trim().toLowerCase(), hashedPassword, avatar);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const token = signToken(user);

    console.log(`✅ New user registered: ${trimmedUsername} (${email})`);
    return res.status(201).json({ user: publicUser(user), token });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { user, token }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());

    if (!user) {
      // Generic message — don't reveal whether email exists
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    console.log(`🔑 User logged in: ${user.username}`);
    return res.json({ user: publicUser(user), token });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

// ─── VERIFY TOKEN ─────────────────────────────────────────────────────────

/**
 * POST /api/auth/verify
 * Body: { token }
 * Returns: { user }
 *
 * Called on app startup — if a token is stored in localStorage,
 * the frontend verifies it's still valid and auto-logs in.
 */
const verify = (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);

    if (!user) return res.status(401).json({ error: 'User no longer exists' });

    return res.json({ user: publicUser(user) });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { register, login, verify };