const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Database } = require('bun:sqlite');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const API_BUILD = '2026-04-03-auth-credentials-v2';

const AUTH_COOKIE_NAME = 'parceladao_admin_session';
const SESSION_TTL_SECONDS = Number(process.env.ADMIN_SESSION_TTL_SECONDS || 60 * 60 * 12);
const configuredAdminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const configuredAdminPassword = String(process.env.ADMIN_PASSWORD || '');
const AUTH_SECRET = String(process.env.AUTH_SECRET || '');

let adminEmail = '';
let adminPasswordHash = '';
let adminPasswordSalt = '';
let adminCredentialsVersion = '';

if (!AUTH_SECRET) {
  throw new Error('AUTH_SECRET é obrigatório.');
}

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(projectRoot, 'uploads'));
const dataDir = path.resolve(process.env.DATA_DIR || path.join(projectRoot, 'data'));
const dbPath = path.join(dataDir, 'parceladao.db');
const staticRoot = fs.existsSync(path.join(distDir, 'index.html')) ? distDir : projectRoot;

const explicitCorsOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const defaultCorsOrigins = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];
const allowedCorsOrigins = new Set(explicitCorsOrigins.length > 0 ? explicitCorsOrigins : defaultCorsOrigins);

const LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS || 15 * 60 * 1000);
const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS || 8);
const loginAttempts = new Map();

if (String(process.env.TRUST_PROXY || '').toLowerCase() === 'true') {
  app.set('trust proxy', 1);
}

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath, { create: true });
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    createdAt TEXT NOT NULL,
    fullName TEXT NOT NULL,
    phone TEXT NOT NULL,
    savedAmount REAL NOT NULL,
    depositDate TEXT NOT NULL,
    receiptName TEXT,
    receiptType TEXT,
    receiptSize INTEGER,
    receiptPath TEXT,
    source TEXT DEFAULT 'form'
  );
`);

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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `receipt-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ]);
    const isPdfByName = /\.pdf$/i.test(file.originalname || '');
    if (allowed.has(file.mimetype) || isPdfByName) {
      cb(null, true);
      return;
    }
    cb(new Error('Tipo de comprovante inválido.'));
  },
});

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const toBase64Url = (value) => Buffer.from(value).toString('base64url');

const hashLegacyPassword = (password) => crypto
  .createHash('sha256')
  .update(String(password || ''))
  .digest('hex');

const createPasswordSalt = () => crypto.randomBytes(16).toString('hex');

const hashPassword = (password, salt) => crypto
  .scryptSync(String(password || ''), String(salt || ''), 64)
  .toString('hex');

const verifyPassword = (password, storedHash, storedSalt) => {
  const normalizedHash = String(storedHash || '');
  const normalizedSalt = String(storedSalt || '');
  if (!normalizedHash) {
    return false;
  }

  if (normalizedSalt) {
    const computedHash = hashPassword(password, normalizedSalt);
    return safeEqual(computedHash, normalizedHash);
  }

  const legacyHash = hashLegacyPassword(password);
  return safeEqual(legacyHash, normalizedHash);
};

const readAdminCredentials = db.query('SELECT email, passwordHash, passwordSalt, updatedAt FROM admin_credentials WHERE id = 1');
const upsertAdminCredentials = db.query(`
  INSERT INTO admin_credentials (id, email, passwordHash, passwordSalt, updatedAt)
  VALUES (1, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    email = excluded.email,
    passwordHash = excluded.passwordHash,
    passwordSalt = excluded.passwordSalt,
    updatedAt = excluded.updatedAt
`);

const persistAdminCredentials = (email, password, updatedAt = new Date().toISOString()) => {
  const salt = createPasswordSalt();
  const passwordHash = hashPassword(password, salt);
  upsertAdminCredentials.run(email, passwordHash, salt, updatedAt);
  adminEmail = String(email || '').trim().toLowerCase();
  adminPasswordHash = passwordHash;
  adminPasswordSalt = salt;
  adminCredentialsVersion = updatedAt;
};

const bootstrapAdminCredentials = () => {
  const row = readAdminCredentials.get();
  if (!row) {
    if (!configuredAdminEmail || !configuredAdminPassword) {
      throw new Error('ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórios para inicializar o administrador.');
    }
    persistAdminCredentials(configuredAdminEmail, configuredAdminPassword);
    return;
  }

  const rowEmail = String(row.email || '').trim().toLowerCase();
  const rowHash = String(row.passwordHash || '');
  const rowSalt = String(row.passwordSalt || '');
  const rowUpdatedAt = String(row.updatedAt || '') || new Date().toISOString();

  if (!rowEmail || !rowHash) {
    throw new Error('Credenciais administrativas persistidas são inválidas.');
  }

  adminEmail = rowEmail;
  adminPasswordHash = rowHash;
  adminPasswordSalt = rowSalt;
  adminCredentialsVersion = rowUpdatedAt;
};

bootstrapAdminCredentials();

const signSessionPayload = (payload) => {
  const payloadRaw = JSON.stringify(payload);
  const payloadEncoded = toBase64Url(payloadRaw);
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payloadEncoded)
    .digest('base64url');
  return `${payloadEncoded}.${signature}`;
};

const verifySessionToken = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const [payloadEncoded, signature] = token.split('.');
  if (!payloadEncoded || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payloadEncoded)
    .digest('base64url');
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8'));
  } catch (_error) {
    return null;
  }

  const expiresAt = Number(payload && payload.exp);
  if (!expiresAt || Date.now() >= expiresAt) {
    return null;
  }

  return payload;
};

const parseCookieHeader = (cookieHeader) => {
  return String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex < 0) {
        return acc;
      }
      const key = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
};

const readBasicCredentials = (authHeader) => {
  const [scheme, rawToken] = String(authHeader || '').split(' ');
  if (String(scheme || '').toLowerCase() !== 'basic' || !rawToken) {
    return null;
  }

  let decoded;
  try {
    decoded = Buffer.from(rawToken, 'base64').toString('utf8');
  } catch (_error) {
    return null;
  }

  const separator = decoded.indexOf(':');
  if (separator < 0) {
    return null;
  }

  const email = decoded.slice(0, separator).trim().toLowerCase();
  const password = decoded.slice(separator + 1);
  return { email, password };
};

const readAuthenticatedAdmin = (req) => {
  const cookies = parseCookieHeader(req.headers.cookie);
  const sessionToken = cookies[AUTH_COOKIE_NAME];
  const sessionFromCookie = verifySessionToken(sessionToken);
  if (
    sessionFromCookie
    && safeEqual(sessionFromCookie.email, adminEmail)
    && safeEqual(String(sessionFromCookie.ver || ''), adminCredentialsVersion)
  ) {
    return { email: adminEmail, mode: 'cookie' };
  }

  const basic = readBasicCredentials(req.headers.authorization);
  if (!basic) {
    return null;
  }
  if (!safeEqual(basic.email, adminEmail) || !verifyPassword(basic.password, adminPasswordHash, adminPasswordSalt)) {
    return null;
  }
  return { email: adminEmail, mode: 'basic' };
};

const requireAdminAuth = (req, res, next) => {
  const admin = readAuthenticatedAdmin(req);
  if (!admin) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }
  req.adminUser = admin;
  next();
};

const buildSessionCookie = (token) => {
  const securePart = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${securePart}`;
};

const clearSessionCookie = () => {
  const securePart = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${AUTH_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${securePart}`;
};

const removeReceiptFile = (receiptPath) => {
  const fileName = path.basename(String(receiptPath || ''));
  if (!fileName) {
    return;
  }

  const absolutePath = path.join(uploadsDir, fileName);
  fs.unlink(absolutePath, () => undefined);
};

const assertProductionEnv = () => {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (explicitCorsOrigins.length === 0) {
    throw new Error('Defina CORS_ORIGINS em producao.');
  }
};

const readIpAddress = (req) => String(req.ip || req.headers['x-forwarded-for'] || 'unknown');

const readLoginAttemptState = (ip) => {
  const now = Date.now();
  const state = loginAttempts.get(ip);
  if (!state) {
    return { count: 0, firstAt: now };
  }
  if (now - state.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { count: 0, firstAt: now };
  }
  return state;
};

const registerLoginFailure = (ip) => {
  const state = readLoginAttemptState(ip);
  const next = { count: state.count + 1, firstAt: state.firstAt };
  loginAttempts.set(ip, next);
  return next;
};

const clearLoginFailures = (ip) => {
  loginAttempts.delete(ip);
};

const isLoginRateLimited = (ip) => {
  const state = readLoginAttemptState(ip);
  return state.count >= MAX_LOGIN_ATTEMPTS;
};

assertProductionEnv();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedCorsOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origem não permitida pelo CORS.'));
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(staticRoot));

const serializeSubmission = (row) => ({
  id: String(row.id),
  createdAt: row.createdAt,
  fullName: row.fullName,
  phone: row.phone,
  savedAmount: Number(row.savedAmount),
  depositDate: row.depositDate,
  receipt: row.receiptName
    ? {
        name: row.receiptName,
        type: row.receiptType || '',
        size: Number(row.receiptSize || 0),
        path: row.receiptPath || '',
      }
    : {},
  source: row.source || 'form',
});

const insertSubmission = db.query(`
  INSERT INTO submissions (
    createdAt,
    fullName,
    phone,
    savedAmount,
    depositDate,
    receiptName,
    receiptType,
    receiptSize,
    receiptPath,
    source
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const listSubmissions = db.query('SELECT * FROM submissions ORDER BY id DESC');
const removeOneSubmission = db.query('DELETE FROM submissions WHERE id = ?');
const removeAllSubmissions = db.query('DELETE FROM submissions');
const getByIdSubmission = db.query('SELECT * FROM submissions WHERE id = ?');

const validateFields = (payload) => {
  const toScalar = (value) => {
    if (Array.isArray(value)) {
      return value[0];
    }
    if (value && typeof value === 'object' && 'value' in value) {
      return value.value;
    }
    return value;
  };

  const normalized = Object.entries(payload || {}).reduce((acc, [key, value]) => {
    acc[String(key).toLowerCase()] = value;
    return acc;
  }, {});

  const pick = (...keys) => {
    for (const key of keys) {
      if (key in normalized) {
        return toScalar(normalized[key]);
      }
    }
    return undefined;
  };

  const fullName = String(pick('fullname', 'nomecompleto', 'nome') || '').trim();
  const phone = String(pick('phone', 'telefone', 'numero') || '').trim();
  const savedAmountInput = pick('savedamount', 'saved_amount', 'valorpoupancado', 'valor');
  const savedAmountRaw = String(savedAmountInput ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/^R\$/i, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const savedAmountMatch = savedAmountRaw.match(/-?\d+(?:\.\d+)?/);
  const savedAmount = Number(savedAmountMatch ? savedAmountMatch[0] : Number.NaN);
  const depositDate = String(pick('depositdate', 'datadodeposito', 'data') || '').trim();

  if (!fullName || fullName.split(/\s+/).length < 2) {
    return { ok: false, message: 'Nome completo inválido.' };
  }
  if (phone.replace(/\D/g, '').length < 10) {
    return { ok: false, message: 'Telefone inválido.' };
  }
  if (Number.isNaN(savedAmount) || savedAmount <= 0) {
    return { ok: false, message: 'Valor poupado inválido.' };
  }
  if (!depositDate) {
    return { ok: false, message: 'Data de depósito inválida.' };
  }

  return { ok: true, fullName, phone, savedAmount, depositDate };
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, build: API_BUILD });
});

app.get('/api/auth/session', requireAdminAuth, (req, res) => {
  res.json({ ok: true, email: req.adminUser.email });
});

app.post('/api/auth/login', (req, res) => {
  const ip = readIpAddress(req);
  if (isLoginRateLimited(ip)) {
    res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
    return;
  }

  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');
  if (!safeEqual(email, adminEmail) || !verifyPassword(password, adminPasswordHash, adminPasswordSalt)) {
    registerLoginFailure(ip);
    res.status(401).json({ error: 'Email ou senha inválidos.' });
    return;
  }

  clearLoginFailures(ip);

  if (!adminPasswordSalt) {
    persistAdminCredentials(adminEmail, password);
  }

  const now = Date.now();
  const token = signSessionPayload({
    email: adminEmail,
    ver: adminCredentialsVersion,
    iat: now,
    exp: now + (SESSION_TTL_SECONDS * 1000),
  });
  res.setHeader('Set-Cookie', buildSessionCookie(token));
  res.json({ ok: true, email: adminEmail });
});

app.post('/api/auth/change-credentials', requireAdminAuth, (req, res) => {
  const currentPassword = String((req.body && req.body.currentPassword) || '');
  const nextEmail = String((req.body && req.body.email) || '').trim().toLowerCase();
  const nextPassword = String((req.body && req.body.password) || '');

  if (!nextEmail || !nextEmail.includes('@')) {
    res.status(400).json({ error: 'Email inválido.' });
    return;
  }
  if (nextPassword.length < 6) {
    res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' });
    return;
  }

  if (!verifyPassword(currentPassword, adminPasswordHash, adminPasswordSalt)) {
    res.status(401).json({ error: 'Senha atual inválida.' });
    return;
  }

  const updatedAt = new Date().toISOString();
  persistAdminCredentials(nextEmail, nextPassword, updatedAt);

  const now = Date.now();
  const token = signSessionPayload({
    email: adminEmail,
    ver: adminCredentialsVersion,
    iat: now,
    exp: now + (SESSION_TTL_SECONDS * 1000),
  });
  res.setHeader('Set-Cookie', buildSessionCookie(token));
  res.json({ ok: true, email: adminEmail });
});

app.post('/api/auth/logout', (_req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.status(204).send();
});

app.get('/api/submissions', requireAdminAuth, (_req, res) => {
  const rows = listSubmissions.all();
  res.json(rows.map(serializeSubmission));
});

app.post('/api/submissions', upload.single('receipt'), (req, res) => {
  const validated = validateFields(req.body);
  if (!validated.ok) {
    if (req.file) {
      fs.unlink(req.file.path, () => undefined);
    }
    res.status(400).json({ error: validated.message });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'Comprovante obrigatorio.' });
    return;
  }

  const createdAt = new Date().toISOString();
  const source = String(req.body.source || 'form');

  if (source === 'admin' && !readAuthenticatedAdmin(req)) {
    fs.unlink(req.file.path, () => undefined);
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  insertSubmission.run(
    createdAt,
    validated.fullName,
    validated.phone,
    validated.savedAmount,
    validated.depositDate,
    req.file.originalname,
    req.file.mimetype,
    req.file.size,
    `/uploads/${req.file.filename}`,
    source
  );

  const row = getByIdSubmission.get(db.query('SELECT last_insert_rowid() AS id').get().id);
  res.status(201).json(serializeSubmission(row));
});

app.delete('/api/submissions/:id', requireAdminAuth, (req, res) => {
  const row = getByIdSubmission.get(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Registro não encontrado.' });
    return;
  }

  removeOneSubmission.run(req.params.id);
  removeReceiptFile(row.receiptPath);

  res.status(204).send();
});

app.delete('/api/submissions', requireAdminAuth, (_req, res) => {
  const rows = listSubmissions.all();
  removeAllSubmissions.run();
  rows.forEach((row) => removeReceiptFile(row.receiptPath));
  res.status(204).send();
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(staticRoot, 'index.html'));
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(staticRoot, 'admin.html'));
});

app.get('/admin.html', (_req, res) => {
  res.sendFile(path.join(staticRoot, 'admin.html'));
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota de API não encontrada.' });
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next();
    return;
  }

  res.status(404).sendFile(path.join(projectRoot, '404.html'));
});

app.use((err, _req, res, _next) => {
  if (err && err.message) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
