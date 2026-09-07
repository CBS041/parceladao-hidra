const path = require('path');
const crypto = require('crypto');
const { Database } = require('bun:sqlite');

const projectRoot = path.resolve(__dirname, '..', '..');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(projectRoot, 'data'));
const dbPath = path.join(dataDir, 'parceladao.db');

const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');

if (!email || !password) {
  throw new Error('ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórios.');
}

const createPasswordSalt = () => crypto.randomBytes(16).toString('hex');
const hashPassword = (value, salt) => crypto
  .scryptSync(String(value || ''), String(salt || ''), 64)
  .toString('hex');

const db = new Database(dbPath, { create: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_credentials (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    email TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    passwordSalt TEXT DEFAULT '',
    updatedAt TEXT NOT NULL
  );
`);

const adminCredentialColumns = db.query('PRAGMA table_info(admin_credentials)').all();
if (!adminCredentialColumns.some((column) => String(column && column.name) === 'passwordSalt')) {
  db.exec("ALTER TABLE admin_credentials ADD COLUMN passwordSalt TEXT DEFAULT '';");
}

const salt = createPasswordSalt();
const passwordHash = hashPassword(password, salt);
const updatedAt = new Date().toISOString();

db.query(`
  INSERT INTO admin_credentials (id, email, passwordHash, passwordSalt, updatedAt)
  VALUES (1, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    email = excluded.email,
    passwordHash = excluded.passwordHash,
    passwordSalt = excluded.passwordSalt,
    updatedAt = excluded.updatedAt
`).run(email, passwordHash, salt, updatedAt);

console.log(`Credenciais redefinidas para ${email} (${updatedAt}).`);

