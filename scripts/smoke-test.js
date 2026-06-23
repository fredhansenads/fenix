const { spawn } = require("child_process");

const port = Number(process.env.SMOKE_PORT || 4193);
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true
});

let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString("utf-8");
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString("utf-8");
});

main().catch((error) => {
  console.error(`Smoke test falhou: ${error.message}`);
  if (serverOutput.trim()) {
    console.error("\nSaida do servidor:");
    console.error(serverOutput.trim());
  }
  process.exitCode = 1;
}).finally(async () => {
  await stopServer();
});

async function main() {
  await waitForServer();

  const loginResponse = await rawRequest("/api/auth/login", {
    method: "POST",
    body: {
      email: "admin@santus.com",
      password: "santus123"
    }
  });
  const login = loginResponse.payload;
  const setCookieHeader = loginResponse.headers.get("set-cookie");
  const sessionCookie = extractCookie(setCookieHeader, "santuserp_session");
  assert(sessionCookie, "Login nao retornou cookie de sessao HttpOnly.");
  assert(/httponly/i.test(setCookieHeader), "Cookie de sessao nao possui HttpOnly.");
  assert(/samesite=lax/i.test(setCookieHeader), "Cookie de sessao nao possui SameSite=Lax.");
  assert(login.user?.email === "admin@santus.com", "Login retornou usuario inesperado.");

  const headers = { Cookie: sessionCookie };
  const health = await request("/api/health", { headers });
  assert(health.ok === true, "Health check nao retornou ok.");
  assert(health.databaseInitialized === true, "Banco nao esta inicializado.");

  const bootstrap = await request("/api/bootstrap", { headers });
  assert(Array.isArray(bootstrap.users) && bootstrap.users.length > 0, "Bootstrap nao retornou usuarios.");
  assert(Array.isArray(bootstrap.clients), "Bootstrap nao retornou clientes.");

  const created = await request("/api/clients", {
    method: "POST",
    headers,
    body: {
      type: "PJ",
      name: `Cliente Smoke ${Date.now()}`,
      document: "99.999.999/0001-99",
      email: `smoke-${Date.now()}@teste.com`,
      phone: "",
      status: "prospect",
      notes: "Registro temporario criado pelo smoke test."
    }
  });
  assert(created.id, "Cliente temporario nao foi criado.");

  const updated = await request(`/api/clients/${created.id}`, {
    method: "PUT",
    headers,
    body: {
      ...created,
      status: "ativo",
      notes: "Registro temporario atualizado pelo smoke test."
    }
  });
  assert(updated.status === "ativo", "Cliente temporario nao foi atualizado.");

  const deleted = await request(`/api/clients/${created.id}`, {
    method: "DELETE",
    headers
  });
  assert(deleted.ok === true, "Cliente temporario nao foi excluido.");

  const audit = await request("/api/activity-log?page=1&pageSize=10&collection=clients", { headers });
  assert(Array.isArray(audit.items), "Auditoria paginada nao retornou items.");
  assert(Number.isFinite(audit.total), "Auditoria paginada nao retornou total.");

  const reads = await request("/api/notification-reads", { headers });
  assert(Array.isArray(reads), "Notificacoes lidas nao retornaram lista.");

  console.log("Smoke test concluido com sucesso.");
  console.log(`API: ${baseUrl}`);
  console.log(`Persistencia: ${health.source}`);
  console.log(`Auditoria clients: ${audit.total}`);
}

async function request(path, options = {}) {
  const response = await rawRequest(path, options);
  return response.payload;
}

async function rawRequest(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} retornou ${response.status}: ${JSON.stringify(payload)}`);
  }
  return { payload, headers: response.headers };
}

function extractCookie(setCookieHeader, name) {
  if (!setCookieHeader) return "";
  const cookies = setCookieHeader.split(/,(?=\s*[^;=]+=[^;]+)/);
  const cookie = cookies.find((item) => item.trim().startsWith(`${name}=`));
  return cookie ? cookie.split(";")[0].trim() : "";
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    if (server.exitCode !== null) {
      throw new Error(`Servidor encerrou antes do teste. Codigo ${server.exitCode}.`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      await delay(250);
    }
  }
  throw new Error("Servidor nao respondeu dentro do tempo esperado.");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopServer() {
  return new Promise((resolve) => {
    if (server.exitCode !== null) {
      resolve();
      return;
    }
    server.once("exit", () => resolve());
    server.kill();
    setTimeout(resolve, 1500);
  });
}
