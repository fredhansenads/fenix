const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const root = __dirname;
const dataDir = path.join(root, "data");
const databaseFile = path.join(dataDir, "fenix-db.json");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

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

const validationRules = {
  users: {
    required: ["name", "email", "password", "role", "status"],
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

async function handleStateApi(request, response) {
  if (request.method === "GET") {
    const database = await readDatabase();
    sendJson(response, database.exists ? 200 : 404, database.exists ? database.data : { error: "Database not initialized" });
    return;
  }

  if (request.method === "PUT") {
    const payload = await parseJsonBody(request, response);
    if (!payload) return;
    const database = await readDatabase();
    const currentLog = database.exists && Array.isArray(database.data.auditLogs) ? database.data.auditLogs : [];
    const payloadLog = Array.isArray(payload.auditLogs) ? payload.auditLogs : [];
    const nextPayload = {
      ...payload,
      auditLogs: currentLog.length >= payloadLog.length ? currentLog : payloadLog
    };
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
    const payload = await parseJsonBody(request, response);
    if (!payload) return;
    const item = normalizeRecord(collection, { ...payload, id: payload.id || createId() });
    const validation = validateRecord(collection, item);
    if (!validation.valid) {
      sendJson(response, 400, validation);
      return;
    }
    data[collection].push(item);
    const auditLog = addActivityLog(data, request, "created", collection, item);
    await writeDatabase(data);
    sendJson(response, 201, { ...item, auditLog });
    return;
  }

  if (request.method === "PUT" && id) {
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
    data[collection][index] = item;
    const auditLog = addActivityLog(data, request, "updated", collection, item, previousItem);
    await writeDatabase(data);
    sendJson(response, 200, { ...data[collection][index], auditLog });
    return;
  }

  if (request.method === "DELETE" && id) {
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

function addActivityLog(data, request, action, collection, item, previousItem = null) {
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
    createdAt: new Date().toISOString()
  };

  data.auditLogs = [auditLog, ...(Array.isArray(data.auditLogs) ? data.auditLogs : [])].slice(0, 200);
  return auditLog;
}

function getActor(request) {
  return {
    id: request.headers["x-fenix-user-id"] || "local",
    name: request.headers["x-fenix-user-name"] || "Usuario local",
    role: request.headers["x-fenix-user-role"] || "sistema"
  };
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
  try {
    const content = (await fsp.readFile(databaseFile, "utf-8")).replace(/^\uFEFF/, "");
    return { exists: true, data: JSON.parse(content) };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { exists: false, data: {} };
    }
    throw error;
  }
}

async function writeDatabase(payload) {
  await fsp.mkdir(dataDir, { recursive: true });
  await fsp.writeFile(databaseFile, JSON.stringify(payload, null, 2), "utf-8");
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
