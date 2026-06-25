const { spawn } = require("child_process");

const port = Number(process.env.LOAD_TEST_PORT || 4195);
const baseUrl = `http://127.0.0.1:${port}`;
const totalRequests = Number(process.env.LOAD_REQUESTS || 60);
const concurrency = Number(process.env.LOAD_CONCURRENCY || 8);
const maxP95Ms = Number(process.env.LOAD_MAX_P95_MS || 1500);
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
  console.error(`Teste de carga falhou: ${error.message}`);
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

  const login = await rawRequest("/api/auth/login", {
    method: "POST",
    body: {
      email: "admin@santus.com",
      password: "santus123"
    }
  });
  assert(login.ok, `Login retornou ${login.status}.`);
  const cookie = extractCookie(login.headers.get("set-cookie"), "santuserp_session");
  assert(cookie, "Login nao retornou cookie.");

  const endpoints = [
    "/api/health",
    "/api/bootstrap",
    "/api/clients",
    "/api/suppliers",
    "/api/proposals",
    "/api/projects",
    "/api/tasks",
    "/api/activity-log?page=1&pageSize=10",
    "/api/company-profile"
  ];

  const jobs = Array.from({ length: totalRequests }, (_, index) => endpoints[index % endpoints.length]);
  const results = [];
  let cursor = 0;

  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
    while (cursor < jobs.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await timedRequest(jobs[index], cookie);
    }
  }));

  const failures = results.filter((result) => !result.ok);
  const durations = results.map((result) => result.durationMs).sort((a, b) => a - b);
  const p95 = percentile(durations, 95);
  const average = Math.round(durations.reduce((total, value) => total + value, 0) / durations.length);

  if (failures.length) {
    throw new Error(`${failures.length} requisicao(oes) falharam. Primeira falha: ${JSON.stringify(failures[0])}`);
  }

  if (p95 > maxP95Ms) {
    throw new Error(`P95 ${p95}ms acima do limite ${maxP95Ms}ms.`);
  }

  console.log("Teste de carga concluido com sucesso.");
  console.log(`API: ${baseUrl}`);
  console.log(`Requisicoes: ${totalRequests}`);
  console.log(`Concorrencia: ${concurrency}`);
  console.log(`Media: ${average}ms`);
  console.log(`P95: ${p95}ms`);
}

async function timedRequest(path, cookie) {
  const startedAt = Date.now();
  const response = await rawRequest(path, {
    headers: { Cookie: cookie }
  });
  return {
    path,
    ok: response.ok,
    status: response.status,
    durationMs: Date.now() - startedAt,
    error: response.ok ? "" : JSON.stringify(response.payload)
  };
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
  return { ok: response.ok, status: response.status, payload, headers: response.headers };
}

function percentile(values, percentileValue) {
  if (!values.length) return 0;
  const index = Math.ceil((percentileValue / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(values.length - 1, index))];
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
