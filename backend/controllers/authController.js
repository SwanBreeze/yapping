const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbRun } = require('../db/database');

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'yapping-secret-change-in-production';
const JWT_EXPIRES = '30d';

function publicUser(user) {
  return { id: user.id, username: user.username, email: user.email, avatar: user.avatar };
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || username.trim().length < 2)
      return res.status(400).json({ error: 'Username must be at least 2 characters' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Please enter a valid email address' });
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existingEmail = await dbGet('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existingEmail) return res.status(409).json({ error: 'An account with this email already exists' });

    const existingUsername = await dbGet('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existingUsername) return res.status(409).json({ error: 'Username already taken — try another' });

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();
    const trimmedUsername = username.trim();
    const avatar = `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${encodeURIComponent(trimmedUsername)}&backgroundColor=0f172a`;

    await dbRun(
      'INSERT INTO users (id, username, email, password, avatar) VALUES (?, ?, ?, ?, ?)',
      [id, trimmedUsername, email.trim().toLowerCase(), hashedPassword, avatar]
    );

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    const token = signToken(user);

    console.log(`✅ New user registered: ${trimmedUsername}`);
    return res.status(201).json({ user: publicUser(user), token });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user);
    console.log(`🔑 User logged in: ${user.username}`);
    return res.json({ user: publicUser(user), token });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

const verify = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });

    return res.json({ user: publicUser(user) });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { register, login, verify };