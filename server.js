const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const root = __dirname;
loadEnvFile(path.join(root, ".env"));
const dataDir = path.join(root, "data");
const databaseFile = path.join(dataDir, "fenix-db.json");
const databaseRepository = process.env.DATABASE_URL || process.env.PGDATABASE
  ? createPostgresDatabaseRepository()
  : createJsonDatabaseRepository(databaseFile);
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const sessions = new Map();
const sessionTtlMs = 1000 * 60 * 60 * 8;

const types = {
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".md": "text/plain;charset=utf-8"
};

const collections = new Set([
  "users",
  "clients",
  "suppliers",
  "categories",
  "payables",
  "receivables",
  "proposals",
  "contracts",
  "projects",
  "tasks"
]);

const actionPermissions = {
  clients: { create: ["admin", "gestor", "comercial"], edit: ["admin", "gestor", "comercial"], delete: ["admin", "gestor"] },
  suppliers: { create: ["admin", "gestor", "financeiro"], edit: ["admin", "gestor", "financeiro"], delete: ["admin", "gestor"] },
  payables: { create: ["admin", "gestor", "financeiro"], edit: ["admin", "gestor", "financeiro"], delete: ["admin", "gestor"] },
  receivables: { create: ["admin", "gestor", "financeiro"], edit: ["admin", "gestor", "financeiro"], delete: ["admin", "gestor"] },
  proposals: { create: ["admin", "gestor", "comercial"], edit: ["admin", "gestor", "comercial"], delete: ["admin", "gestor"] },
  contracts: { create: ["admin", "gestor", "financeiro", "comercial"], edit: ["admin", "gestor", "financeiro", "comercial"], delete: ["admin", "gestor"] },
  projects: { create: ["admin", "gestor", "operacional", "comercial"], edit: ["admin", "gestor", "operacional", "comercial"], delete: ["admin", "gestor"] },
  tasks: { create: ["admin", "gestor", "operacional", "colaborador"], edit: ["admin", "gestor", "operacional", "colaborador"], delete: ["admin", "gestor"] },
  users: { create: ["admin"], edit: ["admin"], delete: ["admin"] }
};

const validationRules = {
  users: {
    required: ["name", "email", "role", "status"],
    allowed: {
      role: ["admin", "gestor", "financeiro", "comercial", "operacional", "colaborador", "visualizador"],
      status: ["ativo", "inativo"]
    },
    email: ["email"]
  },
  clients: {
    required: ["type", "name", "document", "email", "status"],
    allowed: {
      type: ["PJ", "PF"],
      status: ["ativo", "prospect", "inativo"]
    },
    email: ["email"]
  },
  suppliers: {
    required: ["name", "document", "email", "category", "status"],
    allowed: {
      status: ["ativo", "inativo"]
    },
    email: ["email"]
  },
  categories: {
    required: ["name", "type"],
    allowed: {
      type: ["receita", "despesa"]
    }
  },
  payables: {
    required: ["supplierId", "category", "description", "amount", "dueDate", "status"],
    allowed: {
      status: ["pendente", "pago", "cancelado"]
    },
    positiveNumbers: ["amount"],
    dates: ["dueDate", "paymentDate"]
  },
  receivables: {
    required: ["clientId", "category", "description", "amount", "dueDate", "status"],
    allowed: {
      status: ["pendente", "recebido", "cancelado"]
    },
    positiveNumbers: ["amount"],
    dates: ["dueDate", "receivedDate"]
  },
  proposals: {
    required: ["clientId", "title", "amount", "validUntil", "status", "responsibleId"],
    allowed: {
      status: ["rascunho", "enviada", "aprovada", "recusada", "expirada", "cancelada"]
    },
    positiveNumbers: ["amount"],
    dates: ["validUntil", "sentAt", "approvedAt"]
  },
  contracts: {
    required: ["clientId", "contractNumber", "title", "amount", "startDate", "endDate", "status", "responsibleId"],
    allowed: {
      status: ["rascunho", "ativo", "suspenso", "encerrado", "cancelado"]
    },
    positiveNumbers: ["amount"],
    dates: ["startDate", "endDate", "signedAt"]
  },
  projects: {
    required: ["clientId", "name", "responsibleId", "startDate", "dueDate", "status"],
    allowed: {
      status: ["planejado", "em_andamento", "pausado", "concluido", "cancelado"]
    },
    dates: ["startDate", "dueDate"]
  },
  tasks: {
    required: ["projectId", "title", "responsibleId", "priority", "status", "dueDate"],
    allowed: {
      priority: ["baixa", "media", "alta", "urgente"],
      status: ["pendente", "em_andamento", "concluida", "cancelada"]
    },
    dates: ["dueDate", "completedAt"]
  }
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json;charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function handleApi(request, response, requestUrl) {
  if (requestUrl.pathname === "/api/auth/login") {
    await handleLoginApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/auth/logout") {
    await handleLogoutApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/state") {
    await handleStateApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/activity-log") {
    await handleActivityLogApi(request, response);
    return;
  }

  const match = requestUrl.pathname.match(/^\/api\/([a-z]+)(?:\/([^/]+))?$/);
  if (match && collections.has(match[1])) {
    await handleCollectionApi(request, response, match[1], match[2]);
    return;
  }

  sendJson(response, 404, { error: "Endpoint not found" });
}

async function handleLoginApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const payload = await parseJsonBody(request, response);
  if (!payload) return;

  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const database = await readDatabase();
  const users = database.exists && Array.isArray(database.data.users) ? database.data.users : [];
  const user = users.find((item) => String(item.email || "").toLowerCase() === email && verifyPassword(password, item) && item.status === "ativo");

  if (!user) {
    sendJson(response, 401, { error: "Invalid credentials" });
    return;
  }

  if (!user.passwordHash && user.password) {
    user.passwordHash = hashPassword(user.password);
    delete user.password;
    await writeDatabase(database.data);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionTtlMs).toISOString();
  sessions.set(token, {
    id: user.id,
    name: user.name,
    role: user.role,
    expiresAt
  });

  sendJson(response, 200, {
    token,
    expiresAt,
    user: sanitizeUser(user)
  });
}

async function handleLogoutApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const token = getRequestToken(request);
  if (token) {
    sessions.delete(token);
  }
  sendJson(response, 200, { ok: true });
}

async function handleStateApi(request, response) {
  const database = await readDatabase();

  if (request.method === "GET") {
    if (database.exists && !authorizeSessionRoles(request, response, ["admin"])) return;
    sendJson(response, database.exists ? 200 : 404, database.exists ? sanitizeState(database.data) : { error: "Database not initialized" });
    return;
  }

  if (request.method === "PUT") {
    const payload = await parseJsonBody(request, response);
    if (!payload) return;
    if (database.exists && !authorizeSessionRoles(request, response, ["admin"])) return;
    const currentLog = database.exists && Array.isArray(database.data.auditLogs) ? database.data.auditLogs : [];
    const payloadLog = Array.isArray(payload.auditLogs) ? payload.auditLogs : [];
    const nextPayload = prepareDatabasePayload({
      ...payload,
      auditLogs: currentLog.length >= payloadLog.length ? currentLog : payloadLog
    }, database.exists ? database.data : {});
    await writeDatabase(nextPayload);
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

async function handleActivityLogApi(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (!authorizeSessionRoles(request, response, ["admin", "gestor"])) return;

  const database = await readDatabase();
  const data = database.exists ? database.data : {};
  sendJson(response, 200, Array.isArray(data.auditLogs) ? data.auditLogs : []);
}

async function handleCollectionApi(request, response, collection, id) {
  const database = await readDatabase();
  const data = database.exists ? database.data : {};
  data[collection] = Array.isArray(data[collection]) ? data[collection] : [];
  data.auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];

  if (request.method === "GET") {
    if (id) {
      const item = data[collection].find((record) => record.id === id);
      sendJson(response, item ? 200 : 404, item || { error: "Record not found" });
      return;
    }
    sendJson(response, 200, data[collection]);
    return;
  }

  if (request.method === "POST") {
    if (!authorizeAction(request, response, collection, "create", data)) {
      await writeDatabase(data);
      return;
    }
    const payload = await parseJsonBody(request, response);
    if (!payload) return;
    const item = normalizeRecord(collection, { ...payload, id: payload.id || createId() });
    const validation = validateRecord(collection, item);
    if (!validation.valid) {
      sendJson(response, 400, validation);
      return;
    }
    data[collection].push(prepareRecordForStorage(collection, item));
    const auditLog = addActivityLog(data, request, "created", collection, item);
    await writeDatabase(data);
    sendJson(response, 201, { ...sanitizeRecord(collection, item), auditLog });
    return;
  }

  if (request.method === "PUT" && id) {
    if (!authorizeAction(request, response, collection, "edit", data)) {
      await writeDatabase(data);
      return;
    }
    const payload = await parseJsonBody(request, response);
    if (!payload) return;
    const index = data[collection].findIndex((record) => record.id === id);
    if (index === -1) {
      sendJson(response, 404, { error: "Record not found" });
      return;
    }
    const previousItem = data[collection][index];
    const item = normalizeRecord(collection, { ...previousItem, ...payload, id });
    const validation = validateRecord(collection, item);
    if (!validation.valid) {
      sendJson(response, 400, validation);
      return;
    }
    data[collection][index] = prepareRecordForStorage(collection, item, previousItem);
    const auditLog = addActivityLog(data, request, "updated", collection, item, previousItem);
    await writeDatabase(data);
    sendJson(response, 200, { ...sanitizeRecord(collection, data[collection][index]), auditLog });
    return;
  }

  if (request.method === "DELETE" && id) {
    if (!authorizeAction(request, response, collection, "delete", data)) {
      await writeDatabase(data);
      return;
    }
    const item = data[collection].find((record) => record.id === id);
    const before = data[collection].length;
    data[collection] = data[collection].filter((record) => record.id !== id);
    if (data[collection].length === before) {
      sendJson(response, 404, { error: "Record not found" });
      return;
    }
    const auditLog = addActivityLog(data, request, "deleted", collection, item);
    await writeDatabase(data);
    sendJson(response, 200, { ok: true, auditLog });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

function authorizeAction(request, response, collection, action, data = null) {
  const authentication = authenticateActor(request);
  if (!authentication.valid) {
    addDeniedActivityLog(data, request, collection, action, "Sessao invalida ou expirada.");
    sendUnauthorized(response);
    return false;
  }

  const actor = authentication.actor;
  const allowedRoles = actionPermissions[collection]?.[action];
  if (!allowedRoles || allowedRoles.includes(actor.role)) {
    return true;
  }
  addDeniedActivityLog(data, request, collection, action, "Perfil sem permissao para executar esta acao.");
  sendJson(response, 403, {
    error: "Forbidden",
    message: "Perfil sem permissao para executar esta acao.",
    action,
    collection
  });
  return false;
}

function addDeniedActivityLog(data, request, collection, action, reason) {
  if (!data) return null;
  return addActivityLog(data, request, "denied", collection, {
    id: `${collection}:${action}`,
    title: `Acao negada: ${action}`
  }, null, {
    deniedAction: action,
    deniedReason: reason
  });
}

function authorizeRoles(request, response, allowedRoles) {
  const authentication = authenticateActor(request);
  if (!authentication.valid) {
    sendUnauthorized(response);
    return false;
  }

  if (allowedRoles.includes(authentication.actor.role)) {
    return true;
  }

  sendJson(response, 403, {
    error: "Forbidden",
    message: "Perfil sem permissao para acessar este recurso."
  });
  return false;
}

function authorizeSessionRoles(request, response, allowedRoles) {
  const session = getSessionFromRequest(request);
  if (!session) {
    sendUnauthorized(response);
    return false;
  }

  if (allowedRoles.includes(session.role)) {
    return true;
  }

  sendJson(response, 403, {
    error: "Forbidden",
    message: "Perfil sem permissao para acessar este recurso."
  });
  return false;
}

function sendUnauthorized(response) {
  sendJson(response, 401, {
    error: "Unauthorized",
    message: "Sessao invalida ou expirada."
  });
}

function addActivityLog(data, request, action, collection, item, previousItem = null, extra = {}) {
  const actor = getActor(request);
  const auditLog = {
    id: createId(),
    action,
    collection,
    recordId: item?.id || "",
    recordLabel: getRecordLabel(item),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    changedFields: previousItem ? getChangedFields(previousItem, item) : [],
    metadata: getRequestMetadata(request),
    ...extra,
    createdAt: new Date().toISOString()
  };

  data.auditLogs = [auditLog, ...(Array.isArray(data.auditLogs) ? data.auditLogs : [])].slice(0, 200);
  return auditLog;
}

function getRequestMetadata(request) {
  const token = getRequestToken(request);
  return {
    ip: getRequestIp(request),
    userAgent: request.headers["user-agent"] || "",
    origin: request.headers.origin || request.headers.referer || request.headers.host || "",
    sessionRef: token ? token.slice(0, 12) : ""
  };
}

function getRequestIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (forwardedFor) {
    return String(forwardedFor).split(",")[0].trim();
  }
  return request.socket?.remoteAddress || "";
}

function getActor(request) {
  const authentication = authenticateActor(request);
  if (authentication.valid) {
    return authentication.actor;
  }

  return getHeaderActor(request);
}

function authenticateActor(request) {
  const session = getSessionFromRequest(request);
  if (session) {
    return {
      valid: true,
      actor: {
        id: session.id,
        name: session.name,
        role: session.role
      }
    };
  }

  if (getRequestToken(request)) {
    return { valid: false, actor: null };
  }

  return { valid: true, actor: getHeaderActor(request) };
}

function getHeaderActor(request) {
  return {
    id: request.headers["x-fenix-user-id"] || "local",
    name: request.headers["x-fenix-user-name"] || "Usuario local",
    role: request.headers["x-fenix-user-role"] || "admin"
  };
}

function getSessionFromRequest(request) {
  const token = getRequestToken(request);
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return session;
}

function getRequestToken(request) {
  const authorization = request.headers.authorization || "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  return request.headers["x-fenix-session-token"] || "";
}

function sanitizeUser(user) {
  const { password, passwordHash, ...safeUser } = user;
  return safeUser;
}

function sanitizeState(data) {
  const sanitized = { ...(data || {}) };
  sanitized.users = Array.isArray(sanitized.users) ? sanitized.users.map(sanitizeUser) : [];
  return sanitized;
}

function sanitizeRecord(collection, record) {
  return collection === "users" ? sanitizeUser(record) : record;
}

function prepareDatabasePayload(payload, currentData = {}) {
  const nextPayload = { ...(payload || {}) };
  nextPayload.users = Array.isArray(nextPayload.users)
    ? nextPayload.users.map((user) => {
      const currentUser = findCurrentUser(currentData.users, user);
      return prepareUserForStorage(user, currentUser);
    })
    : [];
  return nextPayload;
}

function prepareRecordForStorage(collection, record, previousRecord = null) {
  if (collection === "users") {
    return prepareUserForStorage(record, previousRecord);
  }
  return record;
}

function prepareUserForStorage(user, currentUser = null) {
  const prepared = { ...(user || {}) };
  if (!isBlank(prepared.password)) {
    prepared.passwordHash = hashPassword(prepared.password);
  } else if (currentUser?.passwordHash) {
    prepared.passwordHash = currentUser.passwordHash;
  } else if (currentUser?.password) {
    prepared.passwordHash = hashPassword(currentUser.password);
  }
  delete prepared.password;
  return prepared;
}

function findCurrentUser(users, user) {
  const currentUsers = Array.isArray(users) ? users : [];
  return currentUsers.find((item) => item.id === user?.id)
    || currentUsers.find((item) => String(item.email || "").toLowerCase() === String(user?.email || "").toLowerCase())
    || null;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, user) {
  if (!user || isBlank(password)) return false;
  if (user.passwordHash) {
    const [, salt, storedHash] = String(user.passwordHash).split("$");
    if (!salt || !storedHash) return false;
    const hash = crypto.scryptSync(String(password), salt, 64);
    const stored = Buffer.from(storedHash, "hex");
    return stored.length === hash.length && crypto.timingSafeEqual(stored, hash);
  }
  return user.password === password;
}

function getRecordLabel(item) {
  return item?.name || item?.title || item?.description || item?.email || item?.id || "registro";
}

function getChangedFields(previousItem, item) {
  const fields = new Set([...Object.keys(previousItem || {}), ...Object.keys(item || {})]);
  return [...fields].filter((field) => JSON.stringify(previousItem[field]) !== JSON.stringify(item[field]));
}

function normalizeRecord(collection, record) {
  const rules = validationRules[collection] || {};
  const normalized = {};
  Object.entries(record || {}).forEach(([key, value]) => {
    normalized[key] = typeof value === "string" ? value.trim() : value;
  });
  (rules.positiveNumbers || []).forEach((field) => {
    if (!isBlank(normalized[field])) {
      normalized[field] = Number(normalized[field]);
    }
  });
  return normalized;
}

function validateRecord(collection, record) {
  const fields = {};
  const rules = validationRules[collection];

  if (!rules) {
    return { valid: true };
  }

  if (!record || Array.isArray(record) || typeof record !== "object") {
    return { valid: false, error: "Invalid record", fields: { record: "Registro invalido." } };
  }

  (rules.required || []).forEach((field) => {
    if (isBlank(record[field])) {
      fields[field] = "Campo obrigatorio.";
    }
  });

  if (collection === "users" && isBlank(record.password) && isBlank(record.passwordHash)) {
    fields.password = "Campo obrigatorio.";
  }

  Object.entries(rules.allowed || {}).forEach(([field, options]) => {
    if (!isBlank(record[field]) && !options.includes(record[field])) {
      fields[field] = "Valor nao permitido.";
    }
  });

  (rules.positiveNumbers || []).forEach((field) => {
    if (!isBlank(record[field]) && (!Number.isFinite(Number(record[field])) || Number(record[field]) <= 0)) {
      fields[field] = "Informe um valor maior que zero.";
    }
  });

  (rules.email || []).forEach((field) => {
    if (!isBlank(record[field]) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record[field])) {
      fields[field] = "Informe um e-mail valido.";
    }
  });

  (rules.dates || []).forEach((field) => {
    if (!isBlank(record[field]) && !isIsoDate(record[field])) {
      fields[field] = "Informe uma data valida no formato AAAA-MM-DD.";
    }
  });

  return Object.keys(fields).length
    ? { valid: false, error: "Validation failed", fields }
    : { valid: true };
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function readDatabase() {
  return databaseRepository.read();
}

async function writeDatabase(payload) {
  await databaseRepository.write(payload);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function createJsonDatabaseRepository(filePath) {
  const directory = path.dirname(filePath);
  return {
    async read() {
      try {
        const content = (await fsp.readFile(filePath, "utf-8")).replace(/^\uFEFF/, "");
        return { exists: true, data: JSON.parse(content) };
      } catch (error) {
        if (error.code === "ENOENT") {
          return { exists: false, data: {} };
        }
        throw error;
      }
    },
    async write(payload) {
      await fsp.mkdir(directory, { recursive: true });
      await fsp.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
    }
  };
}

function createPostgresDatabaseRepository() {
  return {
    async read() {
      const payload = await runPsql([
        "-t",
        "-A",
        "-c",
        getPostgresReadSql()
      ]);
      const data = payload.trim() ? JSON.parse(payload.trim()) : {};
      return {
        exists: Array.isArray(data.users) && data.users.length > 0,
        data
      };
    },
    async write(payload) {
      await runPsql(["-v", "ON_ERROR_STOP=1"], getPostgresWriteSql(payload));
    }
  };
}

function runPsql(extraArgs, input = "") {
  return new Promise((resolve, reject) => {
    const psqlPath = process.env.PSQL_PATH || "psql";
    const connectionArgs = process.env.DATABASE_URL
      ? [process.env.DATABASE_URL]
      : [
        "-h", process.env.PGHOST || "localhost",
        "-p", process.env.PGPORT || "5432",
        "-U", process.env.PGUSER || "postgres",
        "-d", process.env.PGDATABASE || "fenix"
      ];
    const child = spawn(psqlPath, ["-X", "-q", ...connectionArgs, ...extraArgs], {
      env: process.env,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(stderr || `psql exited with code ${code}`));
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

function getPostgresReadSql() {
  return `
SELECT jsonb_build_object(
  'session', NULL,
  'auditLogs', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'action', action,
    'collection', collection,
    'recordId', record_id,
    'recordLabel', record_label,
    'actorId', actor_id,
    'actorName', actor_name,
    'actorRole', actor_role,
    'changedFields', changed_fields,
    'deniedAction', denied_action,
    'deniedReason', denied_reason,
    'metadata', metadata,
    'createdAt', created_at
  ) ORDER BY created_at DESC) FROM audit_logs), '[]'::jsonb),
  'notificationReads', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'userId', user_id,
    'notificationId', notification_id,
    'readAt', read_at
  ) ORDER BY read_at DESC) FROM notification_reads), '[]'::jsonb),
  'users', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'email', email,
    'passwordHash', password_hash,
    'role', role,
    'status', status
  ) ORDER BY created_at) FROM users), '[]'::jsonb),
  'clients', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'type', type,
    'name', name,
    'document', document,
    'email', email,
    'phone', phone,
    'status', status,
    'notes', notes
  ) ORDER BY created_at) FROM clients), '[]'::jsonb),
  'suppliers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'document', document,
    'email', email,
    'phone', phone,
    'category', category,
    'status', status
  ) ORDER BY created_at) FROM suppliers), '[]'::jsonb),
  'categories', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'type', type
  ) ORDER BY created_at) FROM categories), '[]'::jsonb),
  'payables', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'supplierId', supplier_id,
    'category', category,
    'description', description,
    'amount', amount,
    'dueDate', due_date,
    'paymentDate', payment_date,
    'status', status,
    'notes', notes
  ) ORDER BY created_at) FROM payables), '[]'::jsonb),
  'receivables', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'clientId', client_id,
    'proposalId', proposal_id,
    'category', category,
    'description', description,
    'amount', amount,
    'dueDate', due_date,
    'receivedDate', received_date,
    'status', status,
    'paymentMethod', payment_method
  ) ORDER BY created_at) FROM receivables), '[]'::jsonb),
  'proposals', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'clientId', client_id,
    'title', title,
    'description', description,
    'amount', amount,
    'validUntil', valid_until,
    'status', status,
    'responsibleId', responsible_id,
    'sentAt', sent_at,
    'approvedAt', approved_at,
    'notes', notes
  ) ORDER BY created_at) FROM proposals), '[]'::jsonb),
  'contracts', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'clientId', client_id,
    'contractNumber', contract_number,
    'title', title,
    'amount', amount,
    'startDate', start_date,
    'endDate', end_date,
    'status', status,
    'responsibleId', responsible_id,
    'signedAt', signed_at,
    'notes', notes
  ) ORDER BY created_at) FROM contracts), '[]'::jsonb),
  'projects', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'clientId', client_id,
    'name', name,
    'description', description,
    'responsibleId', responsible_id,
    'startDate', start_date,
    'dueDate', due_date,
    'status', status
  ) ORDER BY created_at) FROM projects), '[]'::jsonb),
  'tasks', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'projectId', project_id,
    'title', title,
    'description', description,
    'responsibleId', responsible_id,
    'priority', priority,
    'status', status,
    'dueDate', due_date,
    'completedAt', completed_at
  ) ORDER BY created_at) FROM tasks), '[]'::jsonb)
)::text;
`;
}

function getPostgresWriteSql(payload) {
  const tag = `fenix_payload_${crypto.randomBytes(8).toString("hex")}`;
  return `
BEGIN;
TRUNCATE notification_reads, audit_logs, tasks, projects, contracts, receivables, proposals, payables, categories, suppliers, clients, users;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO users (id, name, email, password_hash, role, status)
SELECT
  record->>'id',
  record->>'name',
  lower(record->>'email'),
  COALESCE(NULLIF(record->>'passwordHash', ''), '${hashPassword("santus123")}'),
  record->>'role',
  record->>'status'
FROM payload, jsonb_array_elements(COALESCE(data->'users', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO clients (id, type, name, document, email, phone, status, notes)
SELECT record->>'id', record->>'type', record->>'name', record->>'document', record->>'email', record->>'phone', record->>'status', record->>'notes'
FROM payload, jsonb_array_elements(COALESCE(data->'clients', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO suppliers (id, name, document, email, phone, category, status)
SELECT record->>'id', record->>'name', record->>'document', record->>'email', record->>'phone', record->>'category', record->>'status'
FROM payload, jsonb_array_elements(COALESCE(data->'suppliers', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO categories (id, name, type)
SELECT record->>'id', record->>'name', record->>'type'
FROM payload, jsonb_array_elements(COALESCE(data->'categories', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO payables (id, supplier_id, category, description, amount, due_date, payment_date, status, notes)
SELECT record->>'id', NULLIF(record->>'supplierId', ''), record->>'category', record->>'description', (record->>'amount')::numeric, (record->>'dueDate')::date, NULLIF(record->>'paymentDate', '')::date, record->>'status', record->>'notes'
FROM payload, jsonb_array_elements(COALESCE(data->'payables', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO proposals (id, client_id, title, description, amount, valid_until, status, responsible_id, sent_at, approved_at, notes)
SELECT record->>'id', NULLIF(record->>'clientId', ''), record->>'title', record->>'description', (record->>'amount')::numeric, (record->>'validUntil')::date, record->>'status', NULLIF(record->>'responsibleId', ''), NULLIF(record->>'sentAt', '')::date, NULLIF(record->>'approvedAt', '')::date, record->>'notes'
FROM payload, jsonb_array_elements(COALESCE(data->'proposals', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO receivables (id, client_id, proposal_id, category, description, amount, due_date, received_date, status, payment_method)
SELECT record->>'id', NULLIF(record->>'clientId', ''), NULLIF(record->>'proposalId', ''), record->>'category', record->>'description', (record->>'amount')::numeric, (record->>'dueDate')::date, NULLIF(record->>'receivedDate', '')::date, record->>'status', record->>'paymentMethod'
FROM payload, jsonb_array_elements(COALESCE(data->'receivables', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO contracts (id, client_id, contract_number, title, amount, start_date, end_date, status, responsible_id, signed_at, notes)
SELECT record->>'id', NULLIF(record->>'clientId', ''), record->>'contractNumber', record->>'title', (record->>'amount')::numeric, (record->>'startDate')::date, (record->>'endDate')::date, record->>'status', NULLIF(record->>'responsibleId', ''), NULLIF(record->>'signedAt', '')::date, record->>'notes'
FROM payload, jsonb_array_elements(COALESCE(data->'contracts', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO projects (id, client_id, name, description, responsible_id, start_date, due_date, status)
SELECT record->>'id', NULLIF(record->>'clientId', ''), record->>'name', record->>'description', NULLIF(record->>'responsibleId', ''), (record->>'startDate')::date, (record->>'dueDate')::date, record->>'status'
FROM payload, jsonb_array_elements(COALESCE(data->'projects', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO tasks (id, project_id, title, description, responsible_id, priority, status, due_date, completed_at)
SELECT record->>'id', NULLIF(record->>'projectId', ''), record->>'title', record->>'description', NULLIF(record->>'responsibleId', ''), record->>'priority', record->>'status', (record->>'dueDate')::date, NULLIF(record->>'completedAt', '')::date
FROM payload, jsonb_array_elements(COALESCE(data->'tasks', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO audit_logs (id, action, collection, record_id, record_label, actor_id, actor_name, actor_role, changed_fields, denied_action, denied_reason, metadata, created_at)
SELECT record->>'id', record->>'action', record->>'collection', record->>'recordId', record->>'recordLabel', record->>'actorId', record->>'actorName', record->>'actorRole', COALESCE(record->'changedFields', '[]'::jsonb), record->>'deniedAction', record->>'deniedReason', COALESCE(record->'metadata', '{}'::jsonb), COALESCE(NULLIF(record->>'createdAt', '')::timestamptz, now())
FROM payload, jsonb_array_elements(COALESCE(data->'auditLogs', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO notification_reads (id, user_id, notification_id, read_at)
SELECT record->>'id', NULLIF(record->>'userId', ''), record->>'notificationId', COALESCE(NULLIF(record->>'readAt', '')::timestamptz, now())
FROM payload, jsonb_array_elements(COALESCE(data->'notificationReads', '[]'::jsonb)) AS record;

COMMIT;
`;
}

async function parseJsonBody(request, response) {
  try {
    return JSON.parse(await readBody(request));
  } catch {
    sendJson(response, 400, { error: "Invalid payload" });
    return null;
  }
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${host}:${port}`);

  if (requestUrl.pathname.startsWith("/api/")) {
    handleApi(request, response, requestUrl);
    return;
  }

  const requestPath = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
  const filePath = path.resolve(root, requestPath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`FENIX available at http://${host}:${port}`);
});
