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
  assert(login.tenant?.id, "Login nao retornou empresa da sessao.");

  const headers = { Cookie: sessionCookie };
  const health = await request("/api/health", { headers });
  assert(health.ok === true, "Health check nao retornou ok.");
  assert(health.databaseInitialized === true, "Banco nao esta inicializado.");

  const bootstrap = await request("/api/bootstrap", { headers });
  assert(Array.isArray(bootstrap.tenants) && bootstrap.tenants.length > 0, "Bootstrap nao retornou empresas.");
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

  const complianceExport = await request("/api/compliance/export", { headers });
  assert(complianceExport.data?.clients && Array.isArray(complianceExport.data.clients), "Exportacao LGPD nao retornou clientes.");

  const complianceClient = await request("/api/clients", {
    method: "POST",
    headers,
    body: {
      type: "PJ",
      name: `Cliente LGPD Smoke ${Date.now()}`,
      document: "88.888.888/0001-88",
      email: `lgpd-smoke-${Date.now()}@teste.com`,
      phone: "(11) 90000-0000",
      status: "ativo",
      notes: "Registro temporario para teste de anonimizacao."
    }
  });
  const anonymized = await request("/api/compliance/anonymize-client", {
    method: "POST",
    headers,
    body: {
      clientId: complianceClient.id,
      confirm: "ANONYMIZE"
    }
  });
  assert(anonymized.client?.document === "ANONIMIZADO", "Cliente LGPD nao foi anonimizado.");
  await request(`/api/clients/${complianceClient.id}`, {
    method: "DELETE",
    headers
  });

  const reads = await request("/api/notification-reads", { headers });
  assert(Array.isArray(reads), "Notificacoes lidas nao retornaram lista.");

  const tenantSuffix = Date.now();
  const temporaryTenant = await request("/api/tenants", {
    method: "POST",
    headers,
    body: {
      name: `Empresa Smoke ${tenantSuffix}`,
      document: `SMOKE-${tenantSuffix}`,
      email: `empresa-smoke-${tenantSuffix}@teste.com`,
      phone: "",
      status: "ativo",
      notes: "Empresa temporaria criada pelo smoke test."
    }
  });
  assert(temporaryTenant.id, "Empresa temporaria nao foi criada.");

  const tenantAdminPassword = "Azul#9012";
  const temporaryUser = await request("/api/users", {
    method: "POST",
    headers,
    body: {
      tenantId: temporaryTenant.id,
      name: `Admin Smoke ${tenantSuffix}`,
      email: `admin-smoke-${tenantSuffix}@teste.com`,
      password: tenantAdminPassword,
      role: "admin",
      status: "ativo"
    }
  });
  assert(temporaryUser.id, "Usuario temporario multiempresa nao foi criado.");

  const tenantLoginResponse = await rawRequest("/api/auth/login", {
    method: "POST",
    body: {
      email: temporaryUser.email,
      password: tenantAdminPassword
    }
  });
  const tenantCookie = extractCookie(tenantLoginResponse.headers.get("set-cookie"), "santuserp_session");
  let tenantHeaders = { Cookie: tenantCookie };
  const tenantBootstrap = await request("/api/bootstrap", { headers: tenantHeaders });
  assert(tenantBootstrap.tenants.length === 1 && tenantBootstrap.tenants[0].id === temporaryTenant.id, "Tenant admin enxergou empresa indevida.");
  assert(tenantBootstrap.clients.length === 0, "Tenant admin enxergou clientes de outra empresa.");

  const resetRequest = await request("/api/auth/request-password-reset", {
    method: "POST",
    body: { email: temporaryUser.email }
  });
  assert(resetRequest.resetToken, "Reset de senha nao retornou token em ambiente local.");
  const resetPassword = "Verde#9012";
  const resetCompleted = await request("/api/auth/reset-password", {
    method: "POST",
    body: {
      token: resetRequest.resetToken,
      password: resetPassword
    }
  });
  assert(resetCompleted.ok === true, "Reset de senha nao foi concluido.");
  const tenantLoginAfterReset = await rawRequest("/api/auth/login", {
    method: "POST",
    body: {
      email: temporaryUser.email,
      password: resetPassword
    }
  });
  tenantHeaders = { Cookie: extractCookie(tenantLoginAfterReset.headers.get("set-cookie"), "santuserp_session") };

  const tenantClient = await request("/api/clients", {
    method: "POST",
    headers: tenantHeaders,
    body: {
      type: "PJ",
      name: `Cliente Tenant Smoke ${tenantSuffix}`,
      document: `TENANT-${tenantSuffix}`,
      email: `cliente-tenant-smoke-${tenantSuffix}@teste.com`,
      phone: "",
      status: "prospect",
      notes: "Cliente temporario criado em tenant isolado."
    }
  });
  assert(tenantClient.tenantId === temporaryTenant.id, "Cliente temporario nao recebeu tenant correto.");
  const isolatedClients = await request("/api/clients", { headers: tenantHeaders });
  assert(isolatedClients.length === 1 && isolatedClients[0].id === tenantClient.id, "Lista do tenant nao ficou isolada.");

  await request(`/api/clients/${tenantClient.id}`, { method: "DELETE", headers });
  await request(`/api/users/${temporaryUser.id}`, { method: "DELETE", headers });
  await request(`/api/tenants/${temporaryTenant.id}`, { method: "DELETE", headers });

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
