const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(DB_PATH);

function run(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err){
      if(err) reject(err); else resolve(this);
    });
  });
}
function get(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function(err, row){
      if(err) reject(err); else resolve(row);
    });
  });
}
function all(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function(err, rows){
      if(err) reject(err); else resolve(rows);
    });
  });
}

async function ensureColumn(table, colName, colSql){
  const cols = await all(`PRAGMA table_info(${table})`);
  const has = cols.some(c => c.name === colName);
  if(!has){
    await run(`ALTER TABLE ${table} ADD COLUMN ${colSql}`);
  }
}

async function initDb() {
  await run(`PRAGMA foreign_keys = ON`);
  await run(`
    CREATE TABLE IF NOT EXISTS users(
      id TEXT PRIMARY KEY,
      company_name TEXT,
      full_name TEXT,
      phone TEXT UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT NOT NULL
    );
  `);

  await ensureColumn('users', 'price_per_request', 'price_per_request REAL NOT NULL DEFAULT 0');
  await ensureColumn('users', 'currency', "currency TEXT NOT NULL DEFAULT 'EUR'");
  await ensureColumn('users', 'is_active', 'is_active INTEGER NOT NULL DEFAULT 1');

  await run(`
    CREATE TABLE IF NOT EXISTS requests(
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exit_office TEXT NOT NULL,
      eori_number TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS documents(
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      display_name TEXT,
      stored_name TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER,
      created_at TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'customer',
      FOREIGN KEY(request_id) REFERENCES requests(id) ON DELETE CASCADE
    );
  `);

  await ensureColumn('documents', 'source', "source TEXT NOT NULL DEFAULT 'customer'");
  await ensureColumn('documents', 'display_name', 'display_name TEXT');

  return db;
}

async function seedAdmin() {
  const adminPhone = process.env.ADMIN_PHONE || '900000000000';
  const adminPass = process.env.ADMIN_PASSWORD || 'Admin123!';
  const existing = await get(`SELECT id FROM users WHERE phone=?`, [adminPhone]);
  if (!existing) {
    const id = require('uuid').v4();
    const passHash = await bcrypt.hash(adminPass, 10);
    await run(
      `INSERT INTO users(id, company_name, full_name, phone, email, password_hash, role, created_at)
       VALUES(?,?,?,?,?,?,?,?)`,
      [id, 'Zirve Trans', 'Admin', adminPhone, process.env.ADMIN_EMAIL || '', passHash, 'admin', new Date().toISOString()]
    );
    console.log('Seeded admin user. Phone:', adminPhone, 'Password:', adminPass);
  }
}

module.exports = { db, run, get, all, initDb, seedAdmin };
