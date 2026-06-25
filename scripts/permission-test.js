const { spawn } = require("child_process");

const port = Number(process.env.PERMISSION_TEST_PORT || 4194);
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

const created = {
  tenantId: "",
  adminUserId: "",
  financeUserId: "",
  supplierId: ""
};

main().catch((error) => {
  console.error(`Teste de permissoes falhou: ${error.message}`);
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

  const adminLogin = await rawRequest("/api/auth/login", {
    method: "POST",
    body: {
      email: "admin@santus.com",
      password: "santus123"
    }
  });
  const adminHeaders = { Cookie: extractCookie(adminLogin.headers.get("set-cookie"), "santuserp_session") };
  assert(adminHeaders.Cookie, "Login admin nao retornou cookie.");

  try {
    const suffix = Date.now();
    const tenant = await request("/api/tenants", {
      method: "POST",
      headers: adminHeaders,
      body: {
        name: `Empresa Permissao ${suffix}`,
        document: `PERM-${suffix}`,
        email: `empresa-permissao-${suffix}@teste.com`,
        phone: "",
        status: "ativo",
        notes: "Empresa temporaria criada pelo teste de permissoes."
      }
    });
    created.tenantId = tenant.id;
    assert(tenant.id, "Tenant temporario nao foi criado.");

    const tenantAdmin = await request("/api/users", {
      method: "POST",
      headers: adminHeaders,
      body: {
        tenantId: tenant.id,
        name: `Admin Permissao ${suffix}`,
        email: `admin-permissao-${suffix}@teste.com`,
        password: "Acesso#7021Z",
        role: "admin",
        status: "ativo"
      }
    });
    created.adminUserId = tenantAdmin.id;

    const financeUser = await request("/api/users", {
      method: "POST",
      headers: adminHeaders,
      body: {
        tenantId: tenant.id,
        name: `Financeiro Permissao ${suffix}`,
        email: `financeiro-permissao-${suffix}@teste.com`,
        password: "Acesso#8032Z",
        role: "financeiro",
        status: "ativo"
      }
    });
    created.financeUserId = financeUser.id;

    const tenantAdminLogin = await rawRequest("/api/auth/login", {
      method: "POST",
      body: { email: tenantAdmin.email, password: "Acesso#7021Z" }
    });
    const tenantAdminHeaders = { Cookie: extractCookie(tenantAdminLogin.headers.get("set-cookie"), "santuserp_session") };
    const tenantBootstrap = await request("/api/bootstrap", { headers: tenantAdminHeaders });
    assert(tenantBootstrap.tenants.length === 1 && tenantBootstrap.tenants[0].id === tenant.id, "Admin do tenant enxergou empresa indevida.");
    assert(tenantBootstrap.clients.length === 0, "Admin do tenant enxergou clientes de outra empresa.");

    await expectStatus("/api/tenants", 403, {
      method: "POST",
      headers: tenantAdminHeaders,
      body: {
        name: `Empresa Bloqueada ${suffix}`,
        document: `BLOCK-${suffix}`,
        status: "ativo"
      }
    }, "Admin de tenant conseguiu criar outra empresa.");

    const financeLogin = await rawRequest("/api/auth/login", {
      method: "POST",
      body: { email: financeUser.email, password: "Acesso#8032Z" }
    });
    const financeHeaders = { Cookie: extractCookie(financeLogin.headers.get("set-cookie"), "santuserp_session") };

    await expectStatus("/api/clients", 403, {
      method: "POST",
      headers: financeHeaders,
      body: {
        type: "PJ",
        name: `Cliente Bloqueado ${suffix}`,
        document: `CLIENT-BLOCK-${suffix}`,
        email: `cliente-bloqueado-${suffix}@teste.com`,
        status: "prospect"
      }
    }, "Usuario financeiro conseguiu criar cliente.");

    await expectStatus("/api/activity-log?page=1&pageSize=5", 403, {
      method: "GET",
      headers: financeHeaders
    }, "Usuario financeiro conseguiu acessar auditoria.");

    const supplier = await request("/api/suppliers", {
      method: "POST",
      headers: financeHeaders,
      body: {
        name: `Fornecedor Permissao ${suffix}`,
        document: `SUP-${suffix}`,
        email: `fornecedor-permissao-${suffix}@teste.com`,
        phone: "",
        category: "Teste",
        status: "ativo"
      }
    });
    created.supplierId = supplier.id;
    assert(supplier.tenantId === tenant.id, "Fornecedor criado pelo financeiro nao ficou no tenant correto.");

    const payables = await request("/api/payables", { headers: financeHeaders });
    assert(Array.isArray(payables), "Financeiro nao conseguiu listar contas a pagar.");

    console.log("Teste de permissoes concluido com sucesso.");
    console.log(`API: ${baseUrl}`);
  } finally {
    await cleanup(adminHeaders);
  }
}

async function cleanup(headers) {
  if (created.supplierId) {
    await rawRequest(`/api/suppliers/${created.supplierId}`, { method: "DELETE", headers }).catch(() => null);
  }
  if (created.financeUserId) {
    await rawRequest(`/api/users/${created.financeUserId}`, { method: "DELETE", headers }).catch(() => null);
  }
  if (created.adminUserId) {
    await rawRequest(`/api/users/${created.adminUserId}`, { method: "DELETE", headers }).catch(() => null);
  }
  if (created.tenantId) {
    await rawRequest(`/api/tenants/${created.tenantId}`, { method: "DELETE", headers }).catch(() => null);
  }
}

async function request(path, options = {}) {
  const response = await rawRequest(path, options);
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} retornou ${response.status}: ${JSON.stringify(response.payload)}`);
  }
  return response.payload;
}

async function expectStatus(path, expectedStatus, options, message) {
  const response = await rawRequest(path, options);
  if (response.status !== expectedStatus) {
    throw new Error(`${message} Esperado ${expectedStatus}, recebido ${response.status}: ${JSON.stringify(response.payload)}`);
  }
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
