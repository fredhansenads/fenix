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
  if (requestUrl.pathname !== "/api/state") {
    sendJson(response, 404, { error: "Endpoint not found" });
    return;
  }

  if (request.method === "GET") {
    try {
      const content = await fsp.readFile(databaseFile, "utf-8");
      sendJson(response, 200, JSON.parse(content));
    } catch (error) {
      if (error.code === "ENOENT") {
        sendJson(response, 404, { error: "Database not initialized" });
        return;
      }
      sendJson(response, 500, { error: "Unable to read database" });
    }
    return;
  }

  if (request.method === "PUT") {
    try {
      const body = await readBody(request);
      const payload = JSON.parse(body);
      await fsp.mkdir(dataDir, { recursive: true });
      await fsp.writeFile(databaseFile, JSON.stringify(payload, null, 2), "utf-8");
      sendJson(response, 200, { ok: true });
    } catch {
      sendJson(response, 400, { error: "Invalid payload" });
    }
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
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
