/**
 * database.js — SQLite setup using better-sqlite3
 *
 * Why SQLite?
 *  - Zero config: no separate database server to install or run
 *  - Data is stored in a single file (yapping.db) next to the backend
 *  - Perfect for a self-hosted chat app
 *  - better-sqlite3 is synchronous which keeps the code simple
 *
 * The file is created automatically on first run.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'yapping.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);

    // WAL mode = much better concurrent read performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    createTables();
    console.log(`🗄️  SQLite database ready: ${DB_PATH}`);
  }
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      username    TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password    TEXT NOT NULL,
      avatar      TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);
}

module.exports = { getDb };