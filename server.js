const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { applyPostgresMigrations } = require("./scripts/postgres-migrations");

const root = __dirname;
loadEnvFile(path.join(root, ".env"));
const dataDir = path.join(root, "data");
const databaseFile = path.join(dataDir, "fenix-db.json");
validateRuntimeConfig();
const databaseRepository = process.env.DATABASE_URL || process.env.PGDATABASE
  ? createPostgresDatabaseRepository()
  : createJsonDatabaseRepository(databaseFile);
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const sessions = new Map();
const sessionTtlMs = 1000 * 60 * 60 * 8;
const sessionCookieName = "santuserp_session";
const loginAttempts = new Map();
const loginWindowMs = 1000 * 60 * 15;
const maxLoginAttempts = 5;
const passwordResetAttempts = new Map();
const passwordResetWindowMs = 1000 * 60 * 15;
const maxPasswordResetAttempts = 3;
const passwordResetTtlMs = 1000 * 60 * 30;
const exposeResetToken = process.env.SANTUSERP_EXPOSE_RESET_TOKEN === "true" || process.env.NODE_ENV !== "production";

const types = {
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".md": "text/plain;charset=utf-8"
};

const collections = new Set([
  "tenants",
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

const defaultTenantId = "tenant_santus";
const defaultTenantName = "SANTUS";
const tenantScopedCollections = new Set([
  "users",
  "clients",
  "suppliers",
  "categories",
  "payables",
  "receivables",
  "proposals",
  "contracts",
  "projects",
  "tasks",
  "auditLogs"
]);
const globalAdminEmails = (process.env.SANTUSERP_GLOBAL_ADMIN_EMAILS || "admin@santus.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const actionPermissions = {
  tenants: { create: ["admin"], edit: ["admin"], delete: ["admin"] },
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
  tenants: {
    required: ["name", "document", "status"],
    allowed: {
      status: ["ativo", "suspenso", "inativo"]
    }
  },
  users: {
    required: ["name", "email", "role", "status", "tenantId"],
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

function sendJson(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json;charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
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

  if (requestUrl.pathname === "/api/auth/request-password-reset") {
    await handleRequestPasswordResetApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/auth/reset-password") {
    await handleResetPasswordApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/bootstrap") {
    await handleBootstrapApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/state") {
    await handleStateApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/notification-reads") {
    await handleNotificationReadsApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/health") {
    await handleHealthApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/activity-log") {
    await handleActivityLogApi(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/api/compliance/export") {
    await handleComplianceExportApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/compliance/anonymize-client") {
    await handleComplianceAnonymizeClientApi(request, response);
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
  const attemptKey = getLoginAttemptKey(request, email);
  if (isLoginRateLimited(attemptKey)) {
    sendJson(response, 429, {
      error: "Too many attempts",
      message: "Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente."
    });
    return;
  }
  const database = await readDatabase();
  const data = ensureTenantModel(database.exists ? database.data : {});
  if (database.exists && data !== database.data) {
    await writeDatabase(data);
  }
  const users = database.exists && Array.isArray(data.users) ? data.users : [];
  const user = users.find((item) => String(item.email || "").toLowerCase() === email && verifyPassword(password, item) && item.status === "ativo");

  if (!user) {
    registerFailedLogin(attemptKey);
    const candidate = users.find((item) => String(item.email || "").toLowerCase() === email);
    addSystemActivityLog(data, request, "login_failed", "auth", candidate || {
      id: email || "login",
      email,
      name: email || "Login sem e-mail",
      tenantId: candidate?.tenantId || defaultTenantId
    }, {
      actorId: candidate?.id || "anonymous",
      actorName: candidate?.name || email || "Usuario nao identificado",
      actorRole: candidate?.role || "anonymous",
      tenantId: candidate?.tenantId || defaultTenantId,
      deniedReason: "Credenciais invalidas ou usuario inativo."
    });
    await writeDatabase(data);
    sendJson(response, 401, { error: "Invalid credentials" });
    return;
  }

  clearLoginAttempts(attemptKey);

  if (!user.passwordHash && user.password) {
    user.passwordHash = hashPassword(user.password);
    delete user.password;
    await writeDatabase(database.data);
  }

  addSystemActivityLog(data, request, "login", "auth", user, {
    tenantId: user.tenantId || defaultTenantId
  });
  await writeDatabase(data);

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionTtlMs).toISOString();
  const session = buildSession(user, data, expiresAt);
  sessions.set(token, session);
  if (databaseRepository.saveSession) {
    await databaseRepository.saveSession(token, session);
  }

  sendJson(response, 200, {
    token,
    expiresAt,
    authMode: "cookie",
    user: sanitizeUser(user),
    tenant: getTenantForUser(data, user),
    isGlobalAdmin: session.isGlobalAdmin
  }, {
    "Set-Cookie": buildSessionCookie(token, expiresAt)
  });
}

function buildSession(user, data, expiresAt) {
  const tenant = getTenantForUser(data, user);
  const email = String(user.email || "").toLowerCase();
  return {
    id: user.id,
    name: user.name,
    email,
    role: user.role,
    tenantId: tenant.id,
    tenantName: tenant.name,
    isGlobalAdmin: isGlobalAdminUser(user),
    expiresAt
  };
}

async function handleLogoutApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const session = await getSessionFromRequest(request);
  const token = getRequestToken(request);
  if (token) {
    sessions.delete(token);
    if (databaseRepository.deleteSession) {
      await databaseRepository.deleteSession(token);
    }
  }
  if (session) {
    const database = await readDatabase();
    if (database.exists) {
      const data = ensureTenantModel(database.data);
      addSystemActivityLog(data, request, "logout", "auth", {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        tenantId: session.tenantId
      }, {
        actorId: session.id,
        actorName: session.name,
        actorRole: session.role,
        tenantId: session.tenantId
      });
      await writeDatabase(data);
    }
  }
  sendJson(response, 200, { ok: true }, {
    "Set-Cookie": buildExpiredSessionCookie()
  });
}

async function handleRequestPasswordResetApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const payload = await parseJsonBody(request, response);
  if (!payload) return;

  const email = String(payload.email || "").trim().toLowerCase();
  const attemptKey = getPasswordResetAttemptKey(request, email);
  if (isPasswordResetRateLimited(attemptKey)) {
    sendJson(response, 429, {
      error: "Too many attempts",
      message: "Muitas solicitacoes de recuperacao. Aguarde alguns minutos antes de tentar novamente."
    });
    return;
  }
  registerPasswordResetAttempt(attemptKey);

  const genericMessage = "Se o e-mail existir e estiver ativo, um link temporario de redefinicao sera disponibilizado.";
  const database = await readDatabase();
  const data = ensureTenantModel(database.exists ? database.data : {});
  const users = database.exists && Array.isArray(data.users) ? data.users : [];
  const user = users.find((item) => String(item.email || "").toLowerCase() === email && item.status === "ativo");
  if (!user) {
    sendJson(response, 200, { ok: true, message: genericMessage });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const resetRecord = {
    id: createId(),
    userId: user.id,
    tenantId: user.tenantId || defaultTenantId,
    tokenHash: hashToken(token),
    requestedByIp: getRequestIp(request),
    requestedUserAgent: request.headers["user-agent"] || "",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + passwordResetTtlMs).toISOString(),
    usedAt: ""
  };

  addSystemActivityLog(data, request, "password_reset_requested", "auth", user, {
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    tenantId: user.tenantId || defaultTenantId
  });
  await writeDatabase(data);
  await savePasswordResetToken(data, resetRecord);

  sendJson(response, 200, {
    ok: true,
    message: genericMessage,
    expiresAt: resetRecord.expiresAt,
    ...(exposeResetToken ? { resetToken: token } : {})
  });
}

async function handleResetPasswordApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const payload = await parseJsonBody(request, response);
  if (!payload) return;

  const token = String(payload.token || "").trim();
  const password = String(payload.password || "");
  if (!token || !password) {
    sendJson(response, 400, {
      error: "Validation failed",
      fields: {
        token: token ? undefined : "Token obrigatorio.",
        password: password ? undefined : "Senha obrigatoria."
      }
    });
    return;
  }

  const resetToken = await findPasswordResetToken(token);
  if (!resetToken) {
    sendJson(response, 400, {
      error: "Invalid token",
      message: "Token invalido, expirado ou ja utilizado."
    });
    return;
  }

  const database = await readDatabase();
  const data = ensureTenantModel(database.exists ? database.data : {});
  const users = Array.isArray(data.users) ? data.users : [];
  const userIndex = users.findIndex((item) => item.id === resetToken.userId && item.status === "ativo");
  if (userIndex === -1) {
    sendJson(response, 400, {
      error: "Invalid token",
      message: "Usuario nao encontrado ou inativo."
    });
    return;
  }

  const user = users[userIndex];
  const passwordValidation = validatePasswordPolicy(password, user);
  if (!passwordValidation.valid) {
    sendJson(response, 400, passwordValidation);
    return;
  }

  users[userIndex] = prepareUserForStorage({ ...user, password }, user);
  addSystemActivityLog(data, request, "password_reset_completed", "auth", users[userIndex], {
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    tenantId: user.tenantId || defaultTenantId
  });
  await writeDatabase(data);
  await markPasswordResetTokenUsed(token);
  sendJson(response, 200, { ok: true, message: "Senha redefinida com sucesso." });
}

async function handleBootstrapApi(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    sendUnauthorized(response);
    return;
  }

  const database = await readDatabase();
  if (!database.exists) {
    sendJson(response, 404, { error: "Database not initialized" });
    return;
  }

  const state = sanitizeState(scopeDataForSession(ensureTenantModel(database.data), session));
  state.session = null;
  state.notificationReads = getNotificationReadIds(database.data, session.id);
  if (!["admin", "gestor"].includes(session.role)) {
    state.auditLogs = [];
  }
  sendJson(response, 200, state);
}

async function handleStateApi(request, response) {
  const database = await readDatabase();

  if (request.method === "GET") {
    const session = database.exists ? await getSessionFromRequest(request) : null;
    if (database.exists && !session) {
      sendUnauthorized(response);
      return;
    }
    sendJson(response, database.exists ? 200 : 404, database.exists ? sanitizeState(scopeDataForSession(ensureTenantModel(database.data), session)) : { error: "Database not initialized" });
    return;
  }

  if (request.method === "PUT") {
    const payload = await parseJsonBody(request, response);
    if (!payload) return;
    const session = database.exists ? await getSessionFromRequest(request) : null;
    if (database.exists && (!session || !session.isGlobalAdmin)) {
      sendJson(response, 403, {
        error: "Forbidden",
        message: "Apenas administrador global pode substituir o estado completo do sistema."
      });
      return;
    }
    const currentData = database.exists ? ensureTenantModel(database.data) : {};
    const currentLog = database.exists && Array.isArray(currentData.auditLogs) ? currentData.auditLogs : [];
    const payloadLog = Array.isArray(payload.auditLogs) ? payload.auditLogs : [];
    const nextPayload = prepareDatabasePayload({
      ...payload,
      auditLogs: currentLog.length >= payloadLog.length ? currentLog : payloadLog
    }, currentData);
    await writeDatabase(nextPayload);
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

async function handleNotificationReadsApi(request, response) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    sendUnauthorized(response);
    return;
  }

  const database = await readDatabase();
  const data = database.exists ? database.data : {};
  data.notificationReads = Array.isArray(data.notificationReads) ? data.notificationReads : [];

  if (request.method === "GET") {
    sendJson(response, 200, getNotificationReadIds(data, session.id));
    return;
  }

  if (request.method === "POST") {
    const payload = await parseJsonBody(request, response);
    if (!payload) return;
    const notificationIds = Array.isArray(payload.notificationIds)
      ? payload.notificationIds
      : [payload.notificationId];
    const cleanIds = [...new Set(notificationIds.map((id) => String(id || "").trim()).filter(Boolean))];

    cleanIds.forEach((notificationId) => {
      if (hasNotificationRead(data.notificationReads, session.id, notificationId)) return;
      data.notificationReads.push({
        id: createId(),
        userId: session.id,
        notificationId,
        readAt: new Date().toISOString()
      });
    });

    data.notificationReads = data.notificationReads.slice(-500);
    await writeDatabase(data);
    sendJson(response, 200, { ok: true, notificationReads: getNotificationReadIds(data, session.id) });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

async function handleHealthApi(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (!(await authorizeSessionRoles(request, response, ["admin", "gestor"]))) return;

  try {
    const database = await readDatabase();
    const session = await getSessionFromRequest(request);
    const data = database.exists ? scopeDataForSession(ensureTenantModel(database.data), session) : {};
    sendJson(response, 200, {
      ok: true,
      source: databaseRepository.source,
      databaseInitialized: database.exists,
      checkedAt: new Date().toISOString(),
      counts: summarizeCollections(data)
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      source: databaseRepository.source,
      checkedAt: new Date().toISOString(),
      message: "Falha ao verificar a persistencia do sistema.",
      detail: error.message
    });
  }
}

async function handleActivityLogApi(request, response, requestUrl) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (!(await authorizeSessionRoles(request, response, ["admin", "gestor"]))) return;

  const database = await readDatabase();
  const session = await getSessionFromRequest(request);
  const data = database.exists ? scopeDataForSession(ensureTenantModel(database.data), session) : {};
  const logs = Array.isArray(data.auditLogs) ? data.auditLogs : [];
  const params = requestUrl.searchParams;

  const filters = {
    query: params.get("query") || "",
    action: params.get("action") || "",
    collection: params.get("collection") || ""
  };
  const filteredLogs = filterActivityLogsForApi(logs, filters);
  const exportAll = params.get("export") === "all";
  const pageSize = exportAll ? filteredLogs.length || 1 : clampNumber(Number(params.get("pageSize") || 20), 5, 100);
  const total = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = exportAll ? 1 : clampNumber(Number(params.get("page") || 1), 1, totalPages);
  const start = (page - 1) * pageSize;
  const items = exportAll ? filteredLogs : filteredLogs.slice(start, start + pageSize);

  sendJson(response, 200, {
    items,
    total,
    page,
    pageSize,
    totalPages,
    summary: summarizeActivityLogsForApi(filteredLogs),
    collections: getActivityCollectionsForApi(logs)
  });
}

async function handleComplianceExportApi(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (!(await authorizeSessionRoles(request, response, ["admin", "gestor"]))) return;

  const session = await getSessionFromRequest(request);
  const database = await readDatabase();
  const data = database.exists ? ensureTenantModel(database.data) : {};
  const scopedData = sanitizeState(scopeDataForSession(data, session));
  const tenant = session?.isGlobalAdmin ? { id: "all", name: "Todas as empresas" } : getTenantForUser(data, { tenantId: session.tenantId });

  addSystemActivityLog(data, request, "data_exported", "compliance", tenant, {
    actorId: session.id,
    actorName: session.name,
    actorRole: session.role,
    tenantId: session.tenantId,
    changedFields: []
  });
  await writeDatabase(data);

  sendJson(response, 200, {
    exportedAt: new Date().toISOString(),
    tenant,
    data: scopedData
  });
}

async function handleComplianceAnonymizeClientApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (!(await authorizeSessionRoles(request, response, ["admin", "gestor"]))) return;

  const payload = await parseJsonBody(request, response);
  if (!payload) return;

  const clientId = String(payload.clientId || "").trim();
  const confirmation = String(payload.confirm || "").trim();
  if (!clientId || confirmation !== "ANONYMIZE") {
    sendJson(response, 400, {
      error: "Validation failed",
      fields: {
        clientId: clientId ? undefined : "Selecione um cliente.",
        confirm: confirmation === "ANONYMIZE" ? undefined : "Digite ANONYMIZE para confirmar."
      }
    });
    return;
  }

  const session = await getSessionFromRequest(request);
  const database = await readDatabase();
  const data = database.exists ? ensureTenantModel(database.data) : {};
  data.clients = Array.isArray(data.clients) ? data.clients : [];
  const index = data.clients.findIndex((client) => client.id === clientId && canAccessRecord(client, "clients", session));
  if (index === -1) {
    sendJson(response, 404, { error: "Record not found" });
    return;
  }

  const previousClient = data.clients[index];
  const anonymizedClient = {
    ...previousClient,
    name: `Cliente anonimizado ${previousClient.id.slice(0, 6)}`,
    document: "ANONIMIZADO",
    email: `anon-${previousClient.id}@santuserp.local`,
    phone: "",
    status: "inativo",
    notes: `Dados pessoais anonimizados em ${new Date().toISOString()}.`
  };
  data.clients[index] = anonymizedClient;
  const auditLog = await addActivityLog(data, request, "data_anonymized", "compliance", anonymizedClient, previousClient);
  await writeDatabase(data);
  sendJson(response, 200, {
    ok: true,
    client: sanitizeRecord("clients", anonymizedClient),
    auditLog
  });
}

async function handleCollectionApi(request, response, collection, id) {
  const database = await readDatabase();
  const session = await getSessionFromRequest(request);
  if (!session) {
    sendUnauthorized(response);
    return;
  }
  const data = database.exists ? ensureTenantModel(database.data) : {};
  data[collection] = Array.isArray(data[collection]) ? data[collection] : [];
  data.auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];
  const scopedRecords = getScopedRecords(data[collection], collection, session);

  if (request.method === "GET") {
    if (id) {
      const item = scopedRecords.find((record) => record.id === id);
      sendJson(response, item ? 200 : 404, item ? sanitizeRecord(collection, item) : { error: "Record not found" });
      return;
    }
    sendJson(response, 200, scopedRecords.map((record) => sanitizeRecord(collection, record)));
    return;
  }

  if (request.method === "POST") {
    if (!(await authorizeAction(request, response, collection, "create", data))) {
      await writeDatabase(data);
      return;
    }
    const payload = await parseJsonBody(request, response);
    if (!payload) return;
    const item = normalizeRecord(collection, applyTenantToRecord(collection, { ...payload, id: payload.id || createId() }, session, data));
    const validation = validateRecord(collection, item);
    if (!validation.valid) {
      sendJson(response, 400, validation);
      return;
    }
    data[collection].push(prepareRecordForStorage(collection, item));
    const auditLog = await addActivityLog(data, request, "created", collection, item);
    await writeDatabase(data);
    sendJson(response, 201, { ...sanitizeRecord(collection, item), auditLog });
    return;
  }

  if (request.method === "PUT" && id) {
    if (!(await authorizeAction(request, response, collection, "edit", data))) {
      await writeDatabase(data);
      return;
    }
    const payload = await parseJsonBody(request, response);
    if (!payload) return;
    const index = data[collection].findIndex((record) => record.id === id);
    if (index === -1 || !canAccessRecord(data[collection][index], collection, session)) {
      sendJson(response, 404, { error: "Record not found" });
      return;
    }
    const previousItem = data[collection][index];
    const item = normalizeRecord(collection, applyTenantToRecord(collection, { ...previousItem, ...payload, id }, session, data, previousItem));
    const validation = validateRecord(collection, item);
    if (!validation.valid) {
      sendJson(response, 400, validation);
      return;
    }
    data[collection][index] = prepareRecordForStorage(collection, item, previousItem);
    const auditLog = await addActivityLog(data, request, "updated", collection, item, previousItem);
    await writeDatabase(data);
    sendJson(response, 200, { ...sanitizeRecord(collection, data[collection][index]), auditLog });
    return;
  }

  if (request.method === "DELETE" && id) {
    if (!(await authorizeAction(request, response, collection, "delete", data))) {
      await writeDatabase(data);
      return;
    }
    const item = data[collection].find((record) => record.id === id);
    if (!item || !canAccessRecord(item, collection, session)) {
      sendJson(response, 404, { error: "Record not found" });
      return;
    }
    const before = data[collection].length;
    data[collection] = data[collection].filter((record) => record.id !== id);
    if (data[collection].length === before) {
      sendJson(response, 404, { error: "Record not found" });
      return;
    }
    const auditLog = await addActivityLog(data, request, "deleted", collection, item);
    await writeDatabase(data);
    sendJson(response, 200, { ok: true, auditLog });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

async function authorizeAction(request, response, collection, action, data = null) {
  const authentication = await authenticateActor(request);
  if (!authentication.valid) {
    await addDeniedActivityLog(data, request, collection, action, "Sessao invalida ou expirada.");
    sendUnauthorized(response);
    return false;
  }

  const actor = authentication.actor;
  if (collection === "tenants" && !actor.isGlobalAdmin) {
    await addDeniedActivityLog(data, request, collection, action, "Apenas administrador global pode administrar empresas.");
    sendJson(response, 403, {
      error: "Forbidden",
      message: "Apenas administrador global pode administrar empresas.",
      action,
      collection
    });
    return false;
  }

  const allowedRoles = actionPermissions[collection]?.[action];
  if (!allowedRoles || allowedRoles.includes(actor.role)) {
    return true;
  }
  await addDeniedActivityLog(data, request, collection, action, "Perfil sem permissao para executar esta acao.");
  sendJson(response, 403, {
    error: "Forbidden",
    message: "Perfil sem permissao para executar esta acao.",
    action,
    collection
  });
  return false;
}

async function addDeniedActivityLog(data, request, collection, action, reason) {
  if (!data) return null;
  return addActivityLog(data, request, "denied", collection, {
    id: `${collection}:${action}`,
    title: `Acao negada: ${action}`
  }, null, {
    deniedAction: action,
    deniedReason: reason
  });
}

async function authorizeRoles(request, response, allowedRoles) {
  const authentication = await authenticateActor(request);
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

async function authorizeSessionRoles(request, response, allowedRoles) {
  const session = await getSessionFromRequest(request);
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

async function addActivityLog(data, request, action, collection, item, previousItem = null, extra = {}) {
  const actor = await getActor(request);
  const auditLog = {
    id: createId(),
    action,
    collection,
    recordId: item?.id || "",
    recordLabel: getRecordLabel(item),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    tenantId: actor.tenantId || defaultTenantId,
    changedFields: previousItem ? getChangedFields(previousItem, item) : [],
    metadata: getRequestMetadata(request),
    ...extra,
    createdAt: new Date().toISOString()
  };

  data.auditLogs = [auditLog, ...(Array.isArray(data.auditLogs) ? data.auditLogs : [])].slice(0, 200);
  return auditLog;
}

function addSystemActivityLog(data, request, action, collection, item, extra = {}) {
  if (!data) return null;
  data.auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];
  const auditLog = {
    id: createId(),
    action,
    collection,
    recordId: item?.id || "",
    recordLabel: getRecordLabel(item),
    actorId: extra.actorId || item?.id || "system",
    actorName: extra.actorName || item?.name || "Sistema",
    actorRole: extra.actorRole || item?.role || "system",
    tenantId: extra.tenantId || item?.tenantId || defaultTenantId,
    changedFields: extra.changedFields || [],
    metadata: getRequestMetadata(request),
    deniedAction: extra.deniedAction,
    deniedReason: extra.deniedReason,
    createdAt: new Date().toISOString()
  };
  data.auditLogs = [auditLog, ...data.auditLogs].slice(0, 200);
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

async function getActor(request) {
  const authentication = await authenticateActor(request);
  if (authentication.valid) {
    return authentication.actor;
  }

  return getHeaderActor(request);
}

async function authenticateActor(request) {
  const session = await getSessionFromRequest(request);
  if (session) {
    return {
      valid: true,
      actor: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        tenantId: session.tenantId,
        tenantName: session.tenantName,
        isGlobalAdmin: Boolean(session.isGlobalAdmin)
      }
    };
  }

  return { valid: false, actor: null };
}

function getHeaderActor(request) {
  return {
    id: request.headers["x-santuserp-user-id"] || request.headers["x-fenix-user-id"] || "local",
    name: request.headers["x-santuserp-user-name"] || request.headers["x-fenix-user-name"] || "Usuario local",
    role: request.headers["x-santuserp-user-role"] || request.headers["x-fenix-user-role"] || "admin"
  };
}

async function getSessionFromRequest(request) {
  const token = getRequestToken(request);
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) {
    return databaseRepository.findSessionByToken ? databaseRepository.findSessionByToken(token) : null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    sessions.delete(token);
    if (databaseRepository.deleteSession) {
      databaseRepository.deleteSession(token).catch(() => {});
    }
    return null;
  }

  return session;
}

function getRequestToken(request) {
  const authorization = request.headers.authorization || "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  return getCookieValue(request, sessionCookieName)
    || request.headers["x-santuserp-session-token"]
    || request.headers["x-fenix-session-token"]
    || "";
}

function getCookieValue(request, name) {
  const cookieHeader = request.headers.cookie || "";
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .reduce((found, part) => {
      if (found) return found;
      const separator = part.indexOf("=");
      if (separator === -1) return "";
      const key = part.slice(0, separator);
      const value = part.slice(separator + 1);
      if (key !== name) return "";
      try {
        return decodeURIComponent(value);
      } catch {
        return "";
      }
    }, "");
}

function buildSessionCookie(token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  return buildCookie(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge,
    expires: expiresAt
  });
}

function buildExpiredSessionCookie() {
  return buildCookie(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0).toISOString()
  });
}

function buildCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${new Date(options.expires).toUTCString()}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (shouldUseSecureCookies()) parts.push("Secure");
  return parts.join("; ");
}

function shouldUseSecureCookies() {
  return process.env.SANTUSERP_SECURE_COOKIES === "true" || process.env.NODE_ENV === "production";
}

function validateRuntimeConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const hasPostgres = Boolean(process.env.DATABASE_URL || process.env.PGDATABASE);
  const allowJsonProduction = process.env.SANTUSERP_ALLOW_JSON_IN_PRODUCTION === "true";
  if (isProduction && !hasPostgres && !allowJsonProduction) {
    throw new Error("PostgreSQL e obrigatorio em NODE_ENV=production. Configure DATABASE_URL/PG* ou use SANTUSERP_ALLOW_JSON_IN_PRODUCTION=true apenas para diagnostico controlado.");
  }
}

function getLoginAttemptKey(request, email) {
  return `${getRequestIp(request)}:${email || "sem-email"}`;
}

function isLoginRateLimited(key) {
  const attempt = loginAttempts.get(key);
  if (!attempt) return false;
  if (Date.now() - attempt.firstAttemptAt > loginWindowMs) {
    loginAttempts.delete(key);
    return false;
  }
  return attempt.count >= maxLoginAttempts;
}

function registerFailedLogin(key) {
  const current = loginAttempts.get(key);
  if (!current || Date.now() - current.firstAttemptAt > loginWindowMs) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: Date.now() });
    return;
  }
  current.count += 1;
}

function clearLoginAttempts(key) {
  loginAttempts.delete(key);
}

function getPasswordResetAttemptKey(request, email) {
  return `${getRequestIp(request)}:${email || "sem-email"}:reset`;
}

function isPasswordResetRateLimited(key) {
  const attempt = passwordResetAttempts.get(key);
  if (!attempt) return false;
  if (Date.now() - attempt.firstAttemptAt > passwordResetWindowMs) {
    passwordResetAttempts.delete(key);
    return false;
  }
  return attempt.count >= maxPasswordResetAttempts;
}

function registerPasswordResetAttempt(key) {
  const current = passwordResetAttempts.get(key);
  if (!current || Date.now() - current.firstAttemptAt > passwordResetWindowMs) {
    passwordResetAttempts.set(key, { count: 1, firstAttemptAt: Date.now() });
    return;
  }
  current.count += 1;
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

function ensureTenantModel(data) {
  const next = data || {};
  let changed = false;
  if (!Array.isArray(next.tenants)) {
    next.tenants = [];
    changed = true;
  }
  if (!next.tenants.some((tenant) => tenant.id === defaultTenantId)) {
    next.tenants.unshift({
      id: defaultTenantId,
      name: defaultTenantName,
      document: "00.000.000/0001-00",
      email: "admin@santus.com",
      phone: "",
      status: "ativo",
      notes: "Empresa padrao criada para migrar os dados existentes."
    });
    changed = true;
  }

  tenantScopedCollections.forEach((collection) => {
    next[collection] = Array.isArray(next[collection]) ? next[collection] : [];
    next[collection].forEach((record) => {
      if (!record.tenantId && !record.tenant_id) {
        record.tenantId = defaultTenantId;
        changed = true;
      } else if (!record.tenantId && record.tenant_id) {
        record.tenantId = record.tenant_id;
        changed = true;
      }
    });
  });

  return changed ? next : data;
}

function scopeDataForSession(data, session) {
  const normalized = ensureTenantModel(structuredClone(data || {}));
  if (!session || session.isGlobalAdmin) {
    return normalized;
  }

  tenantScopedCollections.forEach((collection) => {
    normalized[collection] = getScopedRecords(normalized[collection], collection, session);
  });
  normalized.tenants = getScopedRecords(normalized.tenants, "tenants", session);
  return normalized;
}

function getScopedRecords(records, collection, session) {
  const list = Array.isArray(records) ? records : [];
  if (!session) return [];
  if (collection === "tenants") {
    return session.isGlobalAdmin ? list : list.filter((record) => record.id === session.tenantId);
  }
  if (!tenantScopedCollections.has(collection) || session.isGlobalAdmin) {
    return list;
  }
  return list.filter((record) => normalizeTenantId(record) === session.tenantId);
}

function canAccessRecord(record, collection, session) {
  if (!record || !session) return false;
  if (collection === "tenants") {
    return session.isGlobalAdmin || record.id === session.tenantId;
  }
  if (!tenantScopedCollections.has(collection) || session.isGlobalAdmin) {
    return true;
  }
  return normalizeTenantId(record) === session.tenantId;
}

function applyTenantToRecord(collection, record, session, data, previousRecord = null) {
  const next = { ...(record || {}) };
  if (collection === "tenants") {
    return next;
  }
  if (tenantScopedCollections.has(collection)) {
    const requestedTenantId = next.tenantId || next.tenant_id || previousRecord?.tenantId || previousRecord?.tenant_id;
    next.tenantId = session?.isGlobalAdmin && requestedTenantId
      ? requestedTenantId
      : session?.tenantId || defaultTenantId;
  }
  if (collection === "users" && !next.tenantId) {
    next.tenantId = defaultTenantId;
  }
  if (collection === "users" && session && !session.isGlobalAdmin) {
    next.tenantId = session.tenantId;
  }
  if (collection !== "users" && !tenantExists(data, next.tenantId)) {
    next.tenantId = session?.tenantId || defaultTenantId;
  }
  return next;
}

function normalizeTenantId(record) {
  return record?.tenantId || record?.tenant_id || defaultTenantId;
}

function tenantExists(data, tenantId) {
  if (!tenantId) return false;
  return (Array.isArray(data?.tenants) ? data.tenants : []).some((tenant) => tenant.id === tenantId);
}

function getTenantForUser(data, user) {
  const tenantId = normalizeTenantId(user);
  const tenants = Array.isArray(data?.tenants) ? data.tenants : [];
  return tenants.find((tenant) => tenant.id === tenantId) || {
    id: defaultTenantId,
    name: defaultTenantName,
    document: "",
    status: "ativo"
  };
}

function isGlobalAdminUser(user) {
  const email = String(user?.email || "").toLowerCase();
  return user?.role === "admin" && globalAdminEmails.includes(email);
}

function prepareDatabasePayload(payload, currentData = {}) {
  const nextPayload = ensureTenantModel({ ...(payload || {}) });
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

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
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

function summarizeCollections(data) {
  return [...collections, "auditLogs", "notificationReads"].reduce((summary, collection) => {
    summary[collection] = Array.isArray(data?.[collection]) ? data[collection].length : 0;
    return summary;
  }, {});
}

function getNotificationReadIds(data, userId) {
  const reads = Array.isArray(data?.notificationReads) ? data.notificationReads : [];
  return [...new Set(reads.map((read) => {
    if (typeof read === "string") return read;
    if (!read || typeof read !== "object") return "";
    const readUserId = read.userId || read.user_id || "";
    if (readUserId && readUserId !== userId) return "";
    return read.notificationId || read.notification_id || "";
  }).filter(Boolean))];
}

function hasNotificationRead(reads, userId, notificationId) {
  return (Array.isArray(reads) ? reads : []).some((read) => {
    if (typeof read === "string") return read === notificationId;
    if (!read || typeof read !== "object") return false;
    const readUserId = read.userId || read.user_id || "";
    const readNotificationId = read.notificationId || read.notification_id || "";
    return readNotificationId === notificationId && (!readUserId || readUserId === userId);
  });
}

function filterActivityLogsForApi(logs, filters) {
  const query = normalizeSearchText(filters.query);
  const action = filters.action;
  const collection = filters.collection;
  return logs
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .filter((log) => {
      const matchesAction = !action || log.action === action;
      const matchesCollection = !collection || log.collection === collection;
      const searchable = [
        log.recordLabel,
        log.recordId,
        log.actorName,
        log.actorRole,
        log.metadata?.ip,
        log.metadata?.userAgent,
        log.deniedReason,
        log.action,
        log.collection,
        Array.isArray(log.changedFields) ? log.changedFields.join(" ") : ""
      ].join(" ");
      const matchesQuery = !query || normalizeSearchText(searchable).includes(query);
      return matchesAction && matchesCollection && matchesQuery;
    });
}

function summarizeActivityLogsForApi(logs) {
  return logs.reduce((summary, log) => {
    summary[log.action] = (summary[log.action] || 0) + 1;
    summary.total += 1;
    return summary;
  }, {
    total: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    denied: 0,
    login: 0,
    logout: 0,
    login_failed: 0,
    password_reset_requested: 0,
    password_reset_completed: 0,
    data_exported: 0,
    data_anonymized: 0
  });
}

function getActivityCollectionsForApi(logs) {
  return [...new Set(logs.map((log) => log.collection).filter(Boolean))].sort();
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
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

  if (collection === "users" && !isBlank(record.password)) {
    const passwordValidation = validatePasswordPolicy(record.password, record);
    if (!passwordValidation.valid) {
      fields.password = passwordValidation.fields.password;
    }
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

function validatePasswordPolicy(password, context = {}) {
  const value = String(password || "");
  const fields = {};
  if (value.length < 8) {
    fields.password = "Use ao menos 8 caracteres.";
  } else if (!/[a-z]/.test(value)) {
    fields.password = "Inclua letra minuscula.";
  } else if (!/[A-Z]/.test(value)) {
    fields.password = "Inclua letra maiuscula.";
  } else if (!/\d/.test(value)) {
    fields.password = "Inclua numero.";
  } else if (!/[^A-Za-z0-9]/.test(value)) {
    fields.password = "Inclua caractere especial.";
  }

  const lowered = value.toLowerCase();
  const emailPrefix = String(context.email || "").split("@")[0].toLowerCase();
  if (!fields.password && emailPrefix && emailPrefix.length >= 4 && lowered.includes(emailPrefix)) {
    fields.password = "Nao use parte do e-mail na senha.";
  }

  const nameParts = String(context.name || "").split(/\s+/).filter((part) => part.length >= 4);
  if (!fields.password && nameParts.some((part) => lowered.includes(part.toLowerCase()))) {
    fields.password = "Nao use partes do nome na senha.";
  }

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

async function savePasswordResetToken(data, record) {
  if (databaseRepository.savePasswordResetToken) {
    await databaseRepository.savePasswordResetToken(record);
    return;
  }
  data.passwordResetTokens = getActivePasswordResetTokens(data);
  data.passwordResetTokens.unshift(record);
  data.passwordResetTokens = data.passwordResetTokens.slice(0, 100);
  await writeDatabase(data);
}

async function findPasswordResetToken(token) {
  const tokenHash = hashToken(token);
  if (databaseRepository.findPasswordResetToken) {
    return databaseRepository.findPasswordResetToken(tokenHash);
  }
  const database = await readDatabase();
  if (!database.exists) return null;
  const data = database.data || {};
  const record = getActivePasswordResetTokens(data).find((item) => item.tokenHash === tokenHash);
  if (!record) return null;
  const user = Array.isArray(data.users) ? data.users.find((item) => item.id === record.userId) : null;
  return user ? { ...record, user } : null;
}

async function markPasswordResetTokenUsed(token) {
  const tokenHash = hashToken(token);
  if (databaseRepository.markPasswordResetTokenUsed) {
    await databaseRepository.markPasswordResetTokenUsed(tokenHash);
    return;
  }
  const database = await readDatabase();
  if (!database.exists) return;
  const data = database.data || {};
  data.passwordResetTokens = getActivePasswordResetTokens(data)
    .map((item) => item.tokenHash === tokenHash ? { ...item, usedAt: new Date().toISOString() } : item)
    .filter((item) => !item.usedAt);
  await writeDatabase(data);
}

function getActivePasswordResetTokens(data) {
  const now = Date.now();
  return (Array.isArray(data?.passwordResetTokens) ? data.passwordResetTokens : [])
    .filter((item) => item && !item.usedAt && new Date(item.expiresAt).getTime() > now);
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
    source: "json",
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
    },
    async saveSession() {},
    async deleteSession() {},
    async findSessionByToken() {
      return null;
    }
  };
}

function createPostgresDatabaseRepository() {
  return {
    source: "postgres",
    _migrationsReady: false,
    async ensureMigrations() {
      if (this._migrationsReady) return;
      await applyPostgresMigrations({
        root,
        runSql: (sql) => runPsql(["-v", "ON_ERROR_STOP=1"], sql),
        logger: null
      });
      this._migrationsReady = true;
    },
    async read() {
      await this.ensureMigrations();
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
      await this.ensureMigrations();
      await runPsql(["-v", "ON_ERROR_STOP=1"], getPostgresWriteSql(payload));
    },
    async saveSession(token, session) {
      await this.ensureMigrations();
      await runPsql(["-v", "ON_ERROR_STOP=1"], `
INSERT INTO user_sessions (id, user_id, token_hash, user_name, user_email, user_role, tenant_id, tenant_name, is_global_admin, expires_at)
VALUES (${sqlLiteral(createId())}, ${sqlLiteral(session.id)}, ${sqlLiteral(hashToken(token))}, ${sqlLiteral(session.name)}, ${sqlLiteral(session.email)}, ${sqlLiteral(session.role)}, ${sqlLiteral(session.tenantId)}, ${sqlLiteral(session.tenantName)}, ${session.isGlobalAdmin ? "TRUE" : "FALSE"}, ${sqlLiteral(session.expiresAt)}::timestamptz)
ON CONFLICT (token_hash) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  user_name = EXCLUDED.user_name,
  user_email = EXCLUDED.user_email,
  user_role = EXCLUDED.user_role,
  tenant_id = EXCLUDED.tenant_id,
  tenant_name = EXCLUDED.tenant_name,
  is_global_admin = EXCLUDED.is_global_admin,
  expires_at = EXCLUDED.expires_at;
DELETE FROM user_sessions WHERE expires_at <= now();
`);
    },
    async deleteSession(token) {
      await this.ensureMigrations();
      await runPsql(["-v", "ON_ERROR_STOP=1"], `
DELETE FROM user_sessions WHERE token_hash = ${sqlLiteral(hashToken(token))} OR expires_at <= now();
`);
    },
    async findSessionByToken(token) {
      await this.ensureMigrations();
      const output = await runPsql([
        "-t",
        "-A",
        "-c",
        `
DELETE FROM user_sessions WHERE expires_at <= now();
SELECT COALESCE((
  SELECT jsonb_build_object(
    'id', user_id,
    'name', user_name,
    'email', user_email,
    'role', user_role,
    'tenantId', tenant_id,
    'tenantName', tenant_name,
    'isGlobalAdmin', is_global_admin,
    'expiresAt', expires_at
  )::text
  FROM user_sessions
  WHERE token_hash = ${sqlLiteral(hashToken(token))}
  LIMIT 1
), '');
`
      ]);
      const content = output.trim();
      if (!content) return null;
      const session = JSON.parse(content);
      sessions.set(token, session);
      return session;
    },
    async savePasswordResetToken(record) {
      await this.ensureMigrations();
      await runPsql(["-v", "ON_ERROR_STOP=1"], `
INSERT INTO password_reset_tokens (id, user_id, tenant_id, token_hash, requested_by_ip, requested_user_agent, created_at, expires_at, used_at)
VALUES (${sqlLiteral(record.id)}, ${sqlLiteral(record.userId)}, ${sqlLiteral(record.tenantId)}, ${sqlLiteral(record.tokenHash)}, ${sqlLiteral(record.requestedByIp)}, ${sqlLiteral(record.requestedUserAgent)}, ${sqlLiteral(record.createdAt)}::timestamptz, ${sqlLiteral(record.expiresAt)}::timestamptz, NULL)
ON CONFLICT (token_hash) DO NOTHING;
DELETE FROM password_reset_tokens WHERE expires_at <= now() OR used_at IS NOT NULL;
`);
    },
    async findPasswordResetToken(tokenHash) {
      await this.ensureMigrations();
      const output = await runPsql([
        "-t",
        "-A",
        "-c",
        `
DELETE FROM password_reset_tokens WHERE expires_at <= now() OR used_at IS NOT NULL;
SELECT COALESCE((
  SELECT jsonb_build_object(
    'id', password_reset_tokens.id,
    'userId', password_reset_tokens.user_id,
    'tenantId', password_reset_tokens.tenant_id,
    'tokenHash', password_reset_tokens.token_hash,
    'createdAt', password_reset_tokens.created_at,
    'expiresAt', password_reset_tokens.expires_at,
    'user', jsonb_build_object(
      'id', users.id,
      'name', users.name,
      'email', users.email,
      'passwordHash', users.password_hash,
      'role', users.role,
      'status', users.status,
      'tenantId', users.tenant_id
    )
  )::text
  FROM password_reset_tokens
  JOIN users ON users.id = password_reset_tokens.user_id
  WHERE password_reset_tokens.token_hash = ${sqlLiteral(tokenHash)}
    AND password_reset_tokens.used_at IS NULL
    AND password_reset_tokens.expires_at > now()
    AND users.status = 'ativo'
  LIMIT 1
), '');
`
      ]);
      const content = output.trim();
      return content ? JSON.parse(content) : null;
    },
    async markPasswordResetTokenUsed(tokenHash) {
      await this.ensureMigrations();
      await runPsql(["-v", "ON_ERROR_STOP=1"], `
UPDATE password_reset_tokens
SET used_at = now()
WHERE token_hash = ${sqlLiteral(tokenHash)}
  AND used_at IS NULL;
DELETE FROM password_reset_tokens WHERE expires_at <= now() OR used_at IS NOT NULL;
`);
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
  'tenants', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'document', document,
    'email', email,
    'phone', phone,
    'status', status,
    'notes', notes
  ) ORDER BY created_at) FROM tenants), '[]'::jsonb),
  'auditLogs', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'action', action,
    'collection', collection,
    'recordId', record_id,
    'recordLabel', record_label,
    'actorId', actor_id,
    'actorName', actor_name,
    'actorRole', actor_role,
    'tenantId', tenant_id,
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
    'status', status,
    'tenantId', tenant_id
  ) ORDER BY created_at) FROM users), '[]'::jsonb),
  'clients', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'tenantId', tenant_id,
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
    'tenantId', tenant_id,
    'name', name,
    'document', document,
    'email', email,
    'phone', phone,
    'category', category,
    'status', status
  ) ORDER BY created_at) FROM suppliers), '[]'::jsonb),
  'categories', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'tenantId', tenant_id,
    'name', name,
    'type', type
  ) ORDER BY created_at) FROM categories), '[]'::jsonb),
  'payables', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'tenantId', tenant_id,
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
    'tenantId', tenant_id,
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
    'tenantId', tenant_id,
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
    'tenantId', tenant_id,
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
    'tenantId', tenant_id,
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
    'tenantId', tenant_id,
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
  payload = ensureTenantModel(payload || {});
  const tag = `fenix_payload_${crypto.randomBytes(8).toString("hex")}`;
  return `
BEGIN;
CREATE TEMP TABLE santuserp_preserved_password_reset_tokens ON COMMIT DROP AS
SELECT *
FROM password_reset_tokens
WHERE expires_at > now()
  AND used_at IS NULL;
TRUNCATE password_reset_tokens, notification_reads, audit_logs, tasks, projects, contracts, receivables, proposals, payables, categories, suppliers, clients, users, tenants;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO tenants (id, name, document, email, phone, status, notes)
SELECT
  record->>'id',
  record->>'name',
  record->>'document',
  record->>'email',
  record->>'phone',
  record->>'status',
  record->>'notes'
FROM payload, jsonb_array_elements(COALESCE(data->'tenants', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO users (id, name, email, password_hash, role, status, tenant_id)
SELECT
  record->>'id',
  record->>'name',
  lower(record->>'email'),
  COALESCE(NULLIF(record->>'passwordHash', ''), '${hashPassword("santus123")}'),
  record->>'role',
  record->>'status',
  COALESCE(NULLIF(record->>'tenantId', ''), ${sqlLiteral(defaultTenantId)})
FROM payload, jsonb_array_elements(COALESCE(data->'users', '[]'::jsonb)) AS record;

INSERT INTO password_reset_tokens (id, user_id, tenant_id, token_hash, requested_by_ip, requested_user_agent, created_at, expires_at, used_at)
SELECT id, user_id, tenant_id, token_hash, requested_by_ip, requested_user_agent, created_at, expires_at, used_at
FROM santuserp_preserved_password_reset_tokens
WHERE user_id IN (SELECT id FROM users)
  AND (tenant_id IS NULL OR tenant_id IN (SELECT id FROM tenants));

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO clients (id, tenant_id, type, name, document, email, phone, status, notes)
SELECT record->>'id', COALESCE(NULLIF(record->>'tenantId', ''), ${sqlLiteral(defaultTenantId)}), record->>'type', record->>'name', record->>'document', record->>'email', record->>'phone', record->>'status', record->>'notes'
FROM payload, jsonb_array_elements(COALESCE(data->'clients', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO suppliers (id, tenant_id, name, document, email, phone, category, status)
SELECT record->>'id', COALESCE(NULLIF(record->>'tenantId', ''), ${sqlLiteral(defaultTenantId)}), record->>'name', record->>'document', record->>'email', record->>'phone', record->>'category', record->>'status'
FROM payload, jsonb_array_elements(COALESCE(data->'suppliers', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO categories (id, tenant_id, name, type)
SELECT record->>'id', COALESCE(NULLIF(record->>'tenantId', ''), ${sqlLiteral(defaultTenantId)}), record->>'name', record->>'type'
FROM payload, jsonb_array_elements(COALESCE(data->'categories', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO payables (id, tenant_id, supplier_id, category, description, amount, due_date, payment_date, status, notes)
SELECT record->>'id', COALESCE(NULLIF(record->>'tenantId', ''), ${sqlLiteral(defaultTenantId)}), NULLIF(record->>'supplierId', ''), record->>'category', record->>'description', (record->>'amount')::numeric, (record->>'dueDate')::date, NULLIF(record->>'paymentDate', '')::date, record->>'status', record->>'notes'
FROM payload, jsonb_array_elements(COALESCE(data->'payables', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO proposals (id, tenant_id, client_id, title, description, amount, valid_until, status, responsible_id, sent_at, approved_at, notes)
SELECT record->>'id', COALESCE(NULLIF(record->>'tenantId', ''), ${sqlLiteral(defaultTenantId)}), NULLIF(record->>'clientId', ''), record->>'title', record->>'description', (record->>'amount')::numeric, (record->>'validUntil')::date, record->>'status', NULLIF(record->>'responsibleId', ''), NULLIF(record->>'sentAt', '')::date, NULLIF(record->>'approvedAt', '')::date, record->>'notes'
FROM payload, jsonb_array_elements(COALESCE(data->'proposals', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO receivables (id, tenant_id, client_id, proposal_id, category, description, amount, due_date, received_date, status, payment_method)
SELECT record->>'id', COALESCE(NULLIF(record->>'tenantId', ''), ${sqlLiteral(defaultTenantId)}), NULLIF(record->>'clientId', ''), NULLIF(record->>'proposalId', ''), record->>'category', record->>'description', (record->>'amount')::numeric, (record->>'dueDate')::date, NULLIF(record->>'receivedDate', '')::date, record->>'status', record->>'paymentMethod'
FROM payload, jsonb_array_elements(COALESCE(data->'receivables', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO contracts (id, tenant_id, client_id, contract_number, title, amount, start_date, end_date, status, responsible_id, signed_at, notes)
SELECT record->>'id', COALESCE(NULLIF(record->>'tenantId', ''), ${sqlLiteral(defaultTenantId)}), NULLIF(record->>'clientId', ''), record->>'contractNumber', record->>'title', (record->>'amount')::numeric, (record->>'startDate')::date, (record->>'endDate')::date, record->>'status', NULLIF(record->>'responsibleId', ''), NULLIF(record->>'signedAt', '')::date, record->>'notes'
FROM payload, jsonb_array_elements(COALESCE(data->'contracts', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO projects (id, tenant_id, client_id, name, description, responsible_id, start_date, due_date, status)
SELECT record->>'id', COALESCE(NULLIF(record->>'tenantId', ''), ${sqlLiteral(defaultTenantId)}), NULLIF(record->>'clientId', ''), record->>'name', record->>'description', NULLIF(record->>'responsibleId', ''), (record->>'startDate')::date, (record->>'dueDate')::date, record->>'status'
FROM payload, jsonb_array_elements(COALESCE(data->'projects', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO tasks (id, tenant_id, project_id, title, description, responsible_id, priority, status, due_date, completed_at)
SELECT record->>'id', COALESCE(NULLIF(record->>'tenantId', ''), ${sqlLiteral(defaultTenantId)}), NULLIF(record->>'projectId', ''), record->>'title', record->>'description', NULLIF(record->>'responsibleId', ''), record->>'priority', record->>'status', (record->>'dueDate')::date, NULLIF(record->>'completedAt', '')::date
FROM payload, jsonb_array_elements(COALESCE(data->'tasks', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO audit_logs (id, action, collection, record_id, record_label, actor_id, actor_name, actor_role, tenant_id, changed_fields, denied_action, denied_reason, metadata, created_at)
SELECT record->>'id', record->>'action', record->>'collection', record->>'recordId', record->>'recordLabel', record->>'actorId', record->>'actorName', record->>'actorRole', COALESCE(NULLIF(record->>'tenantId', ''), ${sqlLiteral(defaultTenantId)}), COALESCE(record->'changedFields', '[]'::jsonb), record->>'deniedAction', record->>'deniedReason', COALESCE(record->'metadata', '{}'::jsonb), COALESCE(NULLIF(record->>'createdAt', '')::timestamptz, now())
FROM payload, jsonb_array_elements(COALESCE(data->'auditLogs', '[]'::jsonb)) AS record;

WITH payload AS (SELECT $${tag}$${JSON.stringify(payload || {})}$${tag}$::jsonb AS data)
INSERT INTO notification_reads (id, user_id, notification_id, read_at)
SELECT
  COALESCE(NULLIF(record->>'id', ''), md5(notification_id || COALESCE(record->>'userId', 'global'))),
  NULLIF(COALESCE(record->>'userId', record->>'user_id'), ''),
  notification_id,
  COALESCE(NULLIF(COALESCE(record->>'readAt', record->>'read_at'), '')::timestamptz, now())
FROM payload,
  jsonb_array_elements(COALESCE(data->'notificationReads', '[]'::jsonb)) AS record,
  LATERAL (
    SELECT CASE
      WHEN jsonb_typeof(record) = 'string' THEN trim(both '"' from record::text)
      ELSE COALESCE(record->>'notificationId', record->>'notification_id')
    END AS notification_id
  ) AS normalized_notification
WHERE notification_id IS NOT NULL AND notification_id <> '';

DELETE FROM user_sessions
WHERE expires_at <= now()
  OR user_id NOT IN (SELECT id FROM users);

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

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
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
  console.log(`SantusERP available at http://${host}:${port}`);
});
