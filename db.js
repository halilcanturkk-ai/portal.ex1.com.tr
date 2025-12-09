const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');

const db = new sqlite3.Database(DB_PATH);

// Helpers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function (err, row) {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Check & add column dynamically
async function ensureColumn(table, col, definition) {
  const cols = await all(`PRAGMA table_info(${table})`);
  const exists = cols.some(c => c.name === col);
  if (!exists) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

// Initialize database
async function initDb() {
  await run(`PRAGMA foreign_keys = ON`);

  // USERS TABLE
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      company_name TEXT,
      full_name TEXT,
      phone TEXT UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      price_per_request REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  // REQUESTS TABLE
  await run(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exit_office TEXT NOT NULL,
      eori_number TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // DOCUMENTS TABLE
  await run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      display_name TEXT,
      stored_name TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER,
      created_at TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'customer',
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
    );
  `);

  return db;
}

// Seed admin user
async function seedAdmin() {
  const phone = process.env.ADMIN_PHONE;
  const pass = process.env.ADMIN_PASSWORD;
  const email = process.env.ADMIN_EMAIL;

  if (!phone || !pass) {
    console.log("Admin credentials missing in .env");
    return;
  }

  const exists = await get(`SELECT id FROM users WHERE phone=?`, [phone]);
  if (!exists) {
    const id = uuid();
    const passHash = await bcrypt.hash(pass, 10);

    await run(
      `INSERT INTO users(id, company_name, full_name, phone, email, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        'Zirve Trans',
