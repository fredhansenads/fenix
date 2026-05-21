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
  "projects",
  "tasks"
]);

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
    await writeDatabase(payload);
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

async function handleCollectionApi(request, response, collection, id) {
  const database = await readDatabase();
  const data = database.exists ? database.data : {};
  data[collection] = Array.isArray(data[collection]) ? data[collection] : [];

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
    const item = { id: payload.id || createId(), ...payload };
    data[collection].push(item);
    await writeDatabase(data);
    sendJson(response, 201, item);
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
    data[collection][index] = { ...data[collection][index], ...payload, id };
    await writeDatabase(data);
    sendJson(response, 200, data[collection][index]);
    return;
  }

  if (request.method === "DELETE" && id) {
    const before = data[collection].length;
    data[collection] = data[collection].filter((record) => record.id !== id);
    if (data[collection].length === before) {
      sendJson(response, 404, { error: "Record not found" });
      return;
    }
    await writeDatabase(data);
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

async function readDatabase() {
  try {
    const content = await fsp.readFile(databaseFile, "utf-8");
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
