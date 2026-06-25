const STORE_KEY = "santus_erp_mvp";
const API_STATE_URL = "/api/state";
const API_BOOTSTRAP_URL = "/api/bootstrap";
const API_HEALTH_URL = "/api/health";
const API_NOTIFICATION_READS_URL = "/api/notification-reads";
const API_LOGIN_URL = "/api/auth/login";
const API_LOGOUT_URL = "/api/auth/logout";
const API_COMPLIANCE_EXPORT_URL = "/api/compliance/export";
const API_COMPLIANCE_ANONYMIZE_CLIENT_URL = "/api/compliance/anonymize-client";
const API_COMPANY_PROFILE_URL = "/api/company-profile";
const API_COLLECTIONS = new Set(["tenants", "users", "clients", "suppliers", "categories", "payables", "receivables", "proposals", "contracts", "projects", "tasks"]);

const modules = [
  { id: "dashboard", label: "Dashboard", title: "Visao geral", roles: ["admin", "gestor", "financeiro", "comercial", "operacional"] },
  { id: "clients", label: "Clientes", title: "Clientes", roles: ["admin", "gestor", "comercial", "financeiro", "operacional"] },
  { id: "suppliers", label: "Fornecedores", title: "Fornecedores", roles: ["admin", "gestor", "financeiro"] },
  { id: "finance", label: "Financeiro", title: "Financeiro", roles: ["admin", "gestor", "financeiro"] },
  { id: "proposals", label: "Propostas", title: "Propostas comerciais", roles: ["admin", "gestor", "comercial"] },
  { id: "contracts", label: "Contratos", title: "Contratos", roles: ["admin", "gestor", "financeiro", "comercial"] },
  { id: "projects", label: "Projetos", title: "Projetos", roles: ["admin", "gestor", "operacional", "comercial"] },
  { id: "tasks", label: "Tarefas", title: "Tarefas", roles: ["admin", "gestor", "operacional", "colaborador"] },
  { id: "reports", label: "Relatorios", title: "Relatorios", roles: ["admin", "gestor", "financeiro", "comercial"] },
  { id: "notifications", label: "Notificacoes", title: "Notificacoes internas", roles: ["admin", "gestor", "financeiro", "comercial", "operacional"] },
  { id: "automations", label: "Automacoes", title: "Automacoes", roles: ["admin", "gestor", "financeiro", "comercial", "operacional"] },
  { id: "activity", label: "Historico", title: "Historico de atividades", roles: ["admin", "gestor"] },
  { id: "tenants", label: "Empresas", title: "Empresas atendidas", roles: ["admin"] },
  { id: "users", label: "Usuarios", title: "Usuarios e permissoes", roles: ["admin"] },
  { id: "settings", label: "Configuracoes", title: "Configuracoes administrativas", roles: ["admin"] }
];

const roleLabels = {
  admin: "Administrador",
  gestor: "Gestor",
  financeiro: "Financeiro",
  comercial: "Comercial",
  operacional: "Operacional",
  colaborador: "Colaborador",
  visualizador: "Visualizador"
};

const defaultTenantSettings = {
  onboardingCompleted: false,
  defaultPageSize: 10,
  compactTables: false,
  dashboardFocus: "executivo",
  notifications: {
    finance: true,
    commercial: true,
    operations: true,
    contracts: true,
    warningDays: 7
  },
  automations: {
    finance: true,
    commercial: true,
    contracts: true,
    proposalWarningDays: 7,
    contractWarningDays: 15
  }
};

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

const initialData = {
  session: null,
  auditLogs: [],
  notificationReads: [],
  tenants: [
    { id: "tenant_santus", name: "SANTUS", document: "00.000.000/0001-00", email: "admin@santus.com", phone: "", status: "ativo", notes: "Empresa padrao do SantusERP.", settings: { ...defaultTenantSettings } }
  ],
  users: [
    { id: uid(), tenantId: "tenant_santus", name: "Administrador SANTUS", email: "admin@santus.com", password: "santus123", role: "admin", status: "ativo" },
    { id: uid(), tenantId: "tenant_santus", name: "Gestor Comercial", email: "comercial@santus.com", password: "santus123", role: "comercial", status: "ativo" }
  ],
  clients: [
    { id: uid(), type: "PJ", name: "Nexus Digital", document: "12.345.678/0001-90", email: "contato@nexus.com", phone: "(11) 98888-1000", status: "ativo", notes: "Cliente recorrente de tecnologia." },
    { id: uid(), type: "PJ", name: "Orion Labs", document: "98.765.432/0001-10", email: "financeiro@orion.com", phone: "(21) 97777-2000", status: "prospect", notes: "Aguardando retorno da proposta." }
  ],
  suppliers: [
    { id: uid(), name: "Cloud Prime", document: "22.222.222/0001-22", email: "billing@cloudprime.com", phone: "(11) 3000-4000", category: "Infraestrutura", status: "ativo" }
  ],
  categories: [
    { id: uid(), name: "Receita de servicos", type: "receita" },
    { id: uid(), name: "Infraestrutura", type: "despesa" },
    { id: uid(), name: "Marketing", type: "despesa" },
    { id: uid(), name: "Operacional", type: "despesa" }
  ],
  payables: [
    { id: uid(), supplierId: null, category: "Infraestrutura", description: "Hospedagem e banco de dados", amount: 680, dueDate: isoOffset(5), paymentDate: "", status: "pendente", notes: "" },
    { id: uid(), supplierId: null, category: "Marketing", description: "Campanha de aquisicao", amount: 1250, dueDate: isoOffset(-3), paymentDate: "", status: "pendente", notes: "" }
  ],
  receivables: [
    { id: uid(), clientId: null, proposalId: null, category: "Receita de servicos", description: "Mensalidade Nexus Digital", amount: 4200, dueDate: isoOffset(2), receivedDate: "", status: "pendente", paymentMethod: "Pix" },
    { id: uid(), clientId: null, proposalId: null, category: "Receita de servicos", description: "Setup de automacao", amount: 7800, dueDate: isoOffset(-6), receivedDate: isoOffset(-2), status: "recebido", paymentMethod: "Transferencia" }
  ],
  proposals: [
    { id: uid(), clientId: null, title: "ERP interno fase 1", description: "Implantacao do MVP administrativo.", amount: 18000, validUntil: isoOffset(12), status: "enviada", responsibleId: null, sentAt: isoOffset(-4), approvedAt: "", notes: "" },
    { id: uid(), clientId: null, title: "Automacao comercial", description: "Fluxo de CRM e propostas.", amount: 9500, validUntil: isoOffset(20), status: "aprovada", responsibleId: null, sentAt: isoOffset(-10), approvedAt: isoOffset(-1), notes: "" }
  ],
  contracts: [
    { id: uid(), clientId: null, contractNumber: "SantusERP-2026-001", title: "Contrato de implantacao ERP", amount: 18000, startDate: isoOffset(-5), endDate: isoOffset(85), status: "ativo", responsibleId: null, signedAt: isoOffset(-5), notes: "Contrato demonstrativo do MVP." }
  ],
  projects: [
    { id: uid(), clientId: null, name: "Implantacao ERP SANTUS", description: "MVP administrativo e financeiro.", responsibleId: null, startDate: isoOffset(-2), dueDate: isoOffset(28), status: "em_andamento" }
  ],
  tasks: [
    { id: uid(), projectId: null, title: "Definir escopo do MVP", description: "Organizar modulos prioritarios.", responsibleId: null, priority: "alta", status: "concluida", dueDate: isoOffset(-1), completedAt: isoOffset(-1) },
    { id: uid(), projectId: null, title: "Implementar dashboard inicial", description: "Cards financeiros e operacionais.", responsibleId: null, priority: "alta", status: "em_andamento", dueDate: isoOffset(4), completedAt: "" }
  ]
};

let state = structuredClone(initialData);
let activeModule = "dashboard";
const listFilters = {};
const statusFilters = {};
const listPaging = {};
const activityFilters = { query: "", action: "", collection: "" };
const activityPaging = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
  summary: { total: 0, created: 0, updated: 0, deleted: 0, denied: 0 },
  collections: [],
  loadedFromApi: false
};
const notificationFilters = { status: "unread" };
const reportFilters = { from: "", to: "" };
let lastApiError = null;
let handlingUnauthorized = false;

const loginScreen = document.querySelector("#loginScreen");
const appShell = document.querySelector("#appShell");
const content = document.querySelector("#content");
const mainNav = document.querySelector("#mainNav");
const pageTitle = document.querySelector("#pageTitle");
const pageKicker = document.querySelector("#pageKicker");
const currentUser = document.querySelector("#currentUser");
const sidebar = document.querySelector(".sidebar");
const sidebarOverlay = document.querySelector("#sidebarOverlay");
const notificationButton = document.querySelector("#notificationButton");
const notificationCount = document.querySelector("#notificationCount");

document.querySelector("#loginForm").addEventListener("submit", handleLogin);
document.querySelector("#logoutButton").addEventListener("click", handleLogout);
document.querySelector("#menuButton").addEventListener("click", () => setSidebarOpen(!sidebar.classList.contains("open")));
sidebarOverlay.addEventListener("click", () => setSidebarOpen(false));
notificationButton.addEventListener("click", () => navigate("notifications"));

async function boot() {
  state = await loadState();
  hydrateReferences();
  if (state.session) {
    showApp();
  } else {
    showLogin();
  }
}

async function loadState() {
  const cachedSession = readCachedSession();
  const apiState = await loadStateFromApi(cachedSession?.apiToken || "");
  if (apiState) {
    const normalized = normalizeState(apiState);
    const cachedUserExists = cachedSession?.userId && normalized.users.some((user) => user.id === cachedSession.userId);
    const canRestoreCachedSession = cachedUserExists && (!normalized.session || cachedSession.userId === normalized.session.userId);
    if (canRestoreCachedSession) {
      normalized.session = {
        ...normalized.session,
        ...cachedSession,
        apiToken: "",
        apiTokenExpiresAt: cachedSession.apiTokenExpiresAt || ""
      };
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(getPersistableState(normalized)));
    return normalized;
  }

  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) {
    const seeded = structuredClone(initialData);
    localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  return normalizeState(JSON.parse(saved));
}

function normalizeState(savedState) {
  const normalized = { ...structuredClone(initialData), ...savedState };
  [
    "users",
    "tenants",
    "clients",
    "suppliers",
    "categories",
    "payables",
    "receivables",
    "proposals",
    "contracts",
    "projects",
    "tasks",
    "auditLogs",
    "notificationReads"
  ].forEach((collection) => {
    if (!Array.isArray(normalized[collection])) {
      normalized[collection] = [];
    }
  });
  if (!normalized.tenants.some((tenant) => tenant.id === "tenant_santus")) {
    normalized.tenants.unshift({ id: "tenant_santus", name: "SANTUS", document: "00.000.000/0001-00", email: "admin@santus.com", phone: "", status: "ativo", notes: "Empresa padrao do SantusERP.", settings: { ...defaultTenantSettings } });
  }
  normalized.tenants.forEach((tenant) => {
    tenant.settings = normalizeTenantSettings(tenant.settings);
  });
  ["users", "clients", "suppliers", "categories", "payables", "receivables", "proposals", "contracts", "projects", "tasks"].forEach((collection) => {
    normalized[collection].forEach((record) => {
      if (!record.tenantId) {
        record.tenantId = "tenant_santus";
      }
    });
  });
  normalized.notificationReads = normalizeNotificationReads(normalized.notificationReads);
  return normalized;
}

function normalizeTenantSettings(settings = {}) {
  const pageSize = Number(settings.defaultPageSize || defaultTenantSettings.defaultPageSize);
  const notifications = settings.notifications || {};
  const automations = settings.automations || {};
  return {
    onboardingCompleted: Boolean(settings.onboardingCompleted),
    defaultPageSize: [10, 20, 50].includes(pageSize) ? pageSize : defaultTenantSettings.defaultPageSize,
    compactTables: Boolean(settings.compactTables),
    dashboardFocus: ["executivo", "financeiro", "operacional"].includes(settings.dashboardFocus) ? settings.dashboardFocus : defaultTenantSettings.dashboardFocus,
    notifications: {
      finance: notifications.finance !== false,
      commercial: notifications.commercial !== false,
      operations: notifications.operations !== false,
      contracts: notifications.contracts !== false,
      warningDays: clamp(Number(notifications.warningDays || defaultTenantSettings.notifications.warningDays), 1, 30)
    },
    automations: {
      finance: automations.finance !== false,
      commercial: automations.commercial !== false,
      contracts: automations.contracts !== false,
      proposalWarningDays: clamp(Number(automations.proposalWarningDays || defaultTenantSettings.automations.proposalWarningDays), 1, 30),
      contractWarningDays: clamp(Number(automations.contractWarningDays || defaultTenantSettings.automations.contractWarningDays), 1, 60)
    }
  };
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function saveState(options = {}) {
  const { syncApi = true } = options;
  localStorage.setItem(STORE_KEY, JSON.stringify(getPersistableState(state)));
  if (syncApi) {
    saveStateToApi(state);
  }
}

function getPersistableState(nextState) {
  const persistable = structuredClone(nextState);
  if (persistable.session) {
    delete persistable.session.apiToken;
  }
  return persistable;
}

function readCachedSession() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}").session || null;
  } catch {
    return null;
  }
}

async function loadStateFromApi(token = "") {
  if (!location.protocol.startsWith("http")) {
    return null;
  }

  const modularState = await loadStateFromModules(token);
  if (modularState) {
    return modularState;
  }

  const bootstrapState = await loadStateFromBootstrap(token);
  if (bootstrapState) {
    return bootstrapState;
  }

  try {
    const response = await fetch(API_STATE_URL, {
      cache: "no-store",
      credentials: "same-origin",
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

async function loadStateFromModules(token) {
  try {
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};
    const notificationResponse = await fetch(API_NOTIFICATION_READS_URL, {
      cache: "no-store",
      credentials: "same-origin",
      headers
    });
    if (!notificationResponse.ok) {
      return null;
    }

    const collectionEntries = await Promise.all([...API_COLLECTIONS].map(async (collection) => {
      const response = await fetch(collectionApiPath(collection), {
        cache: "no-store",
        credentials: "same-origin",
        headers
      });
      if (!response.ok) {
        throw new Error(`Failed to load ${collection}`);
      }
      const records = await response.json();
      if (!Array.isArray(records)) {
        throw new Error(`Invalid payload for ${collection}`);
      }
      return [collection, records];
    }));

    const activityResponse = await fetch("/api/activity-log?page=1&pageSize=20", {
      cache: "no-store",
      credentials: "same-origin",
      headers
    });
    const activityPayload = activityResponse.ok ? await activityResponse.json() : null;

    const nextState = {
      ...structuredClone(initialData),
      session: null,
      notificationReads: normalizeNotificationReads(await notificationResponse.json()),
      auditLogs: Array.isArray(activityPayload?.items) ? activityPayload.items : []
    };

    collectionEntries.forEach(([collection, records]) => {
      nextState[collection] = records;
    });

    return nextState;
  } catch {
    return null;
  }
}

async function loadStateFromBootstrap(token) {
  try {
    const response = await fetch(API_BOOTSTRAP_URL, {
      cache: "no-store",
      credentials: "same-origin",
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

async function saveStateToApi(nextState) {
  if (!location.protocol.startsWith("http")) {
    return false;
  }

  const apiState = {
    ...nextState,
    session: nextState.session ? {
      userId: nextState.session.userId,
      loggedAt: nextState.session.loggedAt
    } : null
  };

  try {
    const response = await fetch(API_STATE_URL, {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(apiState)
    });
    return response.ok;
  } catch {
    // The localStorage fallback keeps the MVP usable without the local server.
    return false;
  }
}

function normalizeNotificationReads(reads) {
  return [...new Set((Array.isArray(reads) ? reads : []).map((read) => {
    if (typeof read === "string") return read;
    if (!read || typeof read !== "object") return "";
    return read.notificationId || read.notification_id || "";
  }).filter(Boolean))];
}

async function apiRequest(path, options = {}) {
  lastApiError = null;
  if (!location.protocol.startsWith("http")) {
    return null;
  }

  try {
    const user = getSessionUser();
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(user ? {
          "X-SantusERP-User-Id": user.id,
          "X-SantusERP-User-Name": user.name,
          "X-SantusERP-User-Role": user.role
        } : {}),
        ...(options.headers || {})
      }
    });
    const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) {
      lastApiError = {
        status: response.status,
        payload
      };
      if (response.status === 401) {
        expireSession();
      }
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function apiErrorMessage(fallback = "Nao foi possivel concluir a acao na API.") {
  if (!lastApiError) {
    return fallback;
  }

  if (lastApiError.status === 401) {
    return "Sessao expirada ou invalida. Entre novamente para continuar.";
  }

  if (lastApiError.status === 403) {
    return lastApiError.payload?.message || "Seu perfil nao possui permissao para esta acao.";
  }

  const fieldMessages = Object.values(lastApiError.payload?.fields || {}).filter(Boolean);
  if (fieldMessages.length) {
    return fieldMessages[0];
  }

  return lastApiError.payload?.message || lastApiError.payload?.error || fallback;
}

function expireSession() {
  if (handlingUnauthorized || !state.session) {
    return;
  }

  handlingUnauthorized = true;
  state.session = null;
  localStorage.setItem(STORE_KEY, JSON.stringify(getPersistableState(state)));
  showLogin();
  toast("Sessao expirada ou invalida. Entre novamente para continuar.");
  window.setTimeout(() => {
    handlingUnauthorized = false;
  }, 1000);
}

function collectionApiPath(collection, id = "") {
  return `/api/${collection}${id ? `/${id}` : ""}`;
}

async function loginToApi(email, password) {
  if (!location.protocol.startsWith("http")) {
    return null;
  }

  try {
    const response = await fetch(API_LOGIN_URL, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

async function logoutFromApi() {
  if (!location.protocol.startsWith("http")) {
    return;
  }

  try {
    await fetch(API_LOGOUT_URL, {
      method: "POST",
      credentials: "same-origin"
    });
  } catch {
    // Local logout must remain usable even if the server is offline.
  }
}

async function saveRecordToApi(collection, item, isEditing) {
  if (!API_COLLECTIONS.has(collection)) {
    return null;
  }

  const result = await apiRequest(collectionApiPath(collection, isEditing ? item.id : ""), {
    method: isEditing ? "PUT" : "POST",
    body: JSON.stringify(item)
  });
  addAuditLogFromApi(result?.auditLog);
  return result;
}

async function deleteRecordFromApi(collection, id) {
  if (!API_COLLECTIONS.has(collection)) {
    return null;
  }

  const result = await apiRequest(collectionApiPath(collection, id), { method: "DELETE" });
  addAuditLogFromApi(result?.auditLog);
  return result;
}

async function saveNotificationReadsToApi(notificationIds) {
  const ids = (Array.isArray(notificationIds) ? notificationIds : [notificationIds])
    .map((id) => String(id || "").trim())
    .filter(Boolean);
  if (!ids.length) {
    return true;
  }

  const result = await apiRequest(API_NOTIFICATION_READS_URL, {
    method: "POST",
    body: JSON.stringify({ notificationIds: ids })
  });
  if (result?.notificationReads) {
    state.notificationReads = normalizeNotificationReads(result.notificationReads);
  }
  return Boolean(result?.ok);
}

function addAuditLogFromApi(auditLog) {
  if (!auditLog) return;
  state.auditLogs = [auditLog, ...(Array.isArray(state.auditLogs) ? state.auditLogs : [])]
    .filter((item, index, logs) => logs.findIndex((log) => log.id === item.id) === index)
    .slice(0, 200);
}

function getCurrentTenant() {
  const tenantId = state.session?.tenantId || getSessionUser()?.tenantId || "tenant_santus";
  return state.tenants.find((tenant) => tenant.id === tenantId) || state.tenants[0];
}

function getTenantSettings() {
  return normalizeTenantSettings(getCurrentTenant()?.settings);
}

async function saveCompanyProfile(payload) {
  const tenant = getCurrentTenant();
  const nextCompany = {
    ...tenant,
    ...payload,
    settings: normalizeTenantSettings({ ...tenant?.settings, ...payload.settings })
  };

  if (!location.protocol.startsWith("http")) {
    updateTenantInState(nextCompany);
    saveState({ syncApi: false });
    return { ok: true, company: nextCompany };
  }

  const result = await apiRequest(API_COMPANY_PROFILE_URL, {
    method: "PUT",
    body: JSON.stringify(nextCompany)
  });
  if (result?.company) {
    updateTenantInState(result.company);
    addAuditLogFromApi(result.auditLog);
    saveState({ syncApi: false });
  }
  return result;
}

function updateTenantInState(tenant) {
  const index = state.tenants.findIndex((item) => item.id === tenant.id);
  const normalizedTenant = { ...tenant, settings: normalizeTenantSettings(tenant.settings) };
  if (index === -1) {
    state.tenants.push(normalizedTenant);
    return;
  }
  state.tenants[index] = { ...state.tenants[index], ...normalizedTenant };
  if (state.session?.tenantId === normalizedTenant.id) {
    state.session.tenantName = normalizedTenant.name;
  }
}

async function updateTenantSettings(partialSettings) {
  const tenant = getCurrentTenant();
  if (!tenant) return null;
  return saveCompanyProfile({
    ...tenant,
    settings: {
      ...getTenantSettings(),
      ...partialSettings
    }
  });
}

function hydrateReferences() {
  const firstClient = state.clients[0]?.id || null;
  const secondClient = state.clients[1]?.id || firstClient;
  const firstSupplier = state.suppliers[0]?.id || null;
  const admin = state.users.find((user) => user.role === "admin")?.id || null;
  const firstProject = state.projects[0]?.id || null;

  state.payables.forEach((item) => {
    if (!item.supplierId) item.supplierId = firstSupplier;
  });
  state.receivables.forEach((item, index) => {
    if (!item.clientId) item.clientId = index === 0 ? firstClient : secondClient;
  });
  state.proposals.forEach((item, index) => {
    if (!item.clientId) item.clientId = index === 0 ? secondClient : firstClient;
    if (!item.responsibleId) item.responsibleId = admin;
  });
  state.contracts.forEach((item) => {
    if (!item.clientId) item.clientId = firstClient;
    if (!item.responsibleId) item.responsibleId = admin;
  });
  state.projects.forEach((item) => {
    if (!item.clientId) item.clientId = firstClient;
    if (!item.responsibleId) item.responsibleId = admin;
  });
  state.tasks.forEach((item) => {
    if (!item.projectId) item.projectId = firstProject;
    if (!item.responsibleId) item.responsibleId = admin;
  });
  saveState();
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function isoOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.querySelector("#loginEmail").value.trim().toLowerCase();
  const password = document.querySelector("#loginPassword").value;
  const localUser = state.users.find((item) => item.email.toLowerCase() === email && item.status === "ativo");
  const message = document.querySelector("#loginMessage");

  let apiSession = await loginToApi(email, password);
  if (!apiSession && localUser?.password === password) {
    await saveStateToApi({ ...state, session: null });
    apiSession = await loginToApi(email, password);
  }

  if (apiSession?.user) {
    const apiState = await loadStateFromApi(apiSession.token || "");
    if (apiState) {
      state = normalizeState(apiState);
    }
  }

  const user = apiSession?.user
    ? state.users.find((item) => item.id === apiSession.user.id) || state.users.find((item) => item.email.toLowerCase() === email) || apiSession.user
    : localUser?.password === password ? localUser : null;

  if (!user) {
    message.textContent = "Credenciais invalidas ou usuario inativo.";
    return;
  }

  if (apiSession?.user && !state.users.some((item) => item.id === apiSession.user.id)) {
    state.users.push(apiSession.user);
  }

  state.session = {
    userId: user.id,
    tenantId: apiSession?.tenant?.id || user.tenantId || "tenant_santus",
    tenantName: apiSession?.tenant?.name || state.tenants.find((tenant) => tenant.id === user.tenantId)?.name || "SANTUS",
    isGlobalAdmin: Boolean(apiSession?.isGlobalAdmin),
    loggedAt: new Date().toISOString(),
    apiToken: "",
    apiTokenExpiresAt: apiSession?.expiresAt || ""
  };
  saveState();
  showApp();
}

async function handleLogout() {
  await logoutFromApi();
  state.session = null;
  localStorage.setItem(STORE_KEY, JSON.stringify(getPersistableState(state)));
  showLogin();
}

function showLogin() {
  appShell.classList.add("hidden");
  loginScreen.classList.remove("hidden");
}

function showApp() {
  loginScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  applyTenantPreferences();
  renderNavigation();
  navigate(activeModule);
}

function applyTenantPreferences() {
  document.body.classList.toggle("compact-tables", getTenantSettings().compactTables);
}

function getSessionUser() {
  return state.users.find((user) => user.id === state.session?.userId);
}

function canAccess(module) {
  const user = getSessionUser();
  return user && module.roles.includes(user.role);
}

function canCreate(schemaId) {
  if (schemaId === "tenants" && !state.session?.isGlobalAdmin) return false;
  return canPerform(schemaId, "create");
}

function canEdit(schemaId) {
  if (schemaId === "tenants" && !state.session?.isGlobalAdmin) return false;
  return canPerform(schemaId, "edit");
}

function canDelete(schemaId) {
  if (schemaId === "tenants" && !state.session?.isGlobalAdmin) return false;
  return canPerform(schemaId, "delete");
}

function canPerform(schemaId, action) {
  const user = getSessionUser();
  if (!user) return false;
  return actionPermissions[schemaId]?.[action]?.includes(user.role) || false;
}

function renderAccessDenied(message = "Seu perfil nao possui permissao para esta acao.") {
  content.innerHTML = `
    <section class="panel">
      <div class="panel-header"><h3>Acesso restrito</h3></div>
      <div class="panel-body">
        <div class="empty-state compact">
          <h3>Acao nao permitida</h3>
          <p>${message}</p>
        </div>
      </div>
    </section>
  `;
}

function renderNavigation() {
  const user = getSessionUser();
  const tenantName = state.session?.tenantName || state.tenants.find((tenant) => tenant.id === user.tenantId)?.name || "SANTUS";
  currentUser.textContent = `${user.name} - ${tenantName} - ${roleLabels[user.role]}`;
  mainNav.innerHTML = modules
    .filter(canAccess)
    .map((module) => `<button type="button" data-module="${module.id}">${module.label}</button>`)
    .join("");
  mainNav.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      setSidebarOpen(false);
      navigate(button.dataset.module);
    });
  });
  updateNotificationSummary();
}

function setSidebarOpen(open) {
  sidebar.classList.toggle("open", open);
  sidebarOverlay.classList.toggle("open", open);
}

function navigate(moduleId) {
  const module = modules.find((item) => item.id === moduleId) || modules[0];
  if (!canAccess(module)) {
    activeModule = "dashboard";
    return navigate("dashboard");
  }

  activeModule = module.id;
  pageTitle.textContent = module.title;
  pageKicker.textContent = module.label;
  mainNav.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.module === module.id));

  const renderers = {
    dashboard: renderDashboard,
    clients: () => renderCrud("clients"),
    suppliers: () => renderCrud("suppliers"),
    finance: renderFinance,
    proposals: () => renderCrud("proposals"),
    contracts: () => renderCrud("contracts"),
    projects: () => renderCrud("projects"),
    tasks: () => renderCrud("tasks"),
    reports: renderReports,
    notifications: renderNotifications,
    automations: renderAutomations,
    activity: renderActivity,
    tenants: () => renderCrud("tenants"),
    users: () => renderCrud("users"),
    settings: renderSettings
  };
  try {
    renderers[module.id]();
    updateNotificationSummary();
  } catch (error) {
    content.innerHTML = `
      <section class="card">
        <p class="eyebrow">Erro de renderizacao</p>
        <h3>Nao foi possivel carregar este modulo.</h3>
        <p>${escapeHtml(error.message)}</p>
      </section>
    `;
    console.error(error);
  }
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function statusClass(status) {
  if (["ativo", "aprovada", "recebido", "pago", "concluida", "concluido", "encerrado"].includes(status)) return "success";
  if (["pendente", "enviada", "em_andamento", "prospect", "rascunho", "suspenso"].includes(status)) return "warning";
  if (["vencido", "recusada", "cancelado", "inativo"].includes(status)) return "danger";
  return "neutral";
}

function labelize(value) {
  return String(value || "-").replaceAll("_", " ");
}

function updateNotificationSummary() {
  const notifications = buildNotifications();
  const unread = getUnreadNotifications(notifications);
  notificationCount.textContent = unread.length;
  notificationButton.classList.toggle("has-alerts", unread.length > 0);
  notificationButton.classList.toggle("has-critical", unread.some((item) => item.tone === "danger"));
}

function renderDashboard() {
  const received = sum(state.receivables.filter((item) => item.status === "recebido"), "amount");
  const paid = sum(state.payables.filter((item) => item.status === "pago"), "amount");
  const pendingReceivable = sum(state.receivables.filter((item) => item.status === "pendente"), "amount");
  const pendingPayable = sum(state.payables.filter((item) => item.status === "pendente"), "amount");
  const overdueReceivables = state.receivables.filter((item) => item.status === "pendente" && item.dueDate < today());
  const overduePayables = state.payables.filter((item) => item.status === "pendente" && item.dueDate < today());
  const overdueReceivable = overdueReceivables.length;
  const overduePayable = overduePayables.length;
  const approvedProposals = state.proposals.filter((item) => item.status === "aprovada").length;
  const conversion = state.proposals.length ? Math.round((approvedProposals / state.proposals.length) * 100) : 0;
  const result = received - paid;
  const projectedBalance = pendingReceivable - pendingPayable;
  const openTasks = state.tasks.filter((item) => !["concluida", "cancelada"].includes(item.status));
  const lateTasks = openTasks.filter((item) => item.dueDate && item.dueDate < today());
  const upcomingFinancials = getUpcomingFinancials();
  const alerts = buildDashboardAlerts({
    overdueReceivable,
    overduePayable,
    lateTasks: lateTasks.length,
    projectedBalance,
    pendingReceivable,
    pendingPayable
  });

  content.innerHTML = `
    ${renderOnboardingPanel()}
    <section class="grid kpi-grid">
      ${kpi("Resultado realizado", money(result), result >= 0 ? "success" : "danger")}
      ${kpi("Saldo previsto", money(projectedBalance), projectedBalance >= 0 ? "success" : "warning")}
      ${kpi("Contas vencidas", `${overdueReceivable + overduePayable}`, overdueReceivable + overduePayable ? "danger" : "success")}
      ${kpi("Conversao comercial", `${conversion}%`, conversion >= 50 ? "success" : "warning")}
      ${kpi("A receber", money(pendingReceivable), "neutral")}
      ${kpi("A pagar", money(pendingPayable), pendingPayable ? "warning" : "success")}
      ${kpi("Clientes ativos", state.clients.filter((item) => item.status === "ativo").length, "neutral")}
      ${kpi("Tarefas abertas", openTasks.length, lateTasks.length ? "danger" : "neutral")}
    </section>

    <section class="grid three-columns">
      <div class="panel">
        <div class="panel-header"><h3>Alertas executivos</h3><span class="status ${alerts.length ? "warning" : "success"}">${alerts.length || "ok"}</span></div>
        <div class="panel-body">${renderAlerts(alerts)}</div>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Proximos vencimentos</h3><button type="button" data-goto="finance" class="secondary">Financeiro</button></div>
        <div class="panel-body">${renderUpcomingFinancials(upcomingFinancials)}</div>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Atalhos</h3><span class="status neutral">acao rapida</span></div>
        <div class="panel-body quick-actions">
          ${getDashboardQuickActions().map((item) => `<button type="button" data-goto="${item.id}">${item.label}</button>`).join("")}
        </div>
      </div>
    </section>

    <section class="grid two-columns">
      <div class="panel">
        <div class="panel-header"><h3>Fluxo financeiro</h3><span class="status neutral">previsto x realizado</span></div>
        <div class="panel-body">
          <div class="chart-bars">
            ${bar("Recebido", received, Math.max(received, paid, pendingReceivable, pendingPayable))}
            ${bar("Pago", paid, Math.max(received, paid, pendingReceivable, pendingPayable))}
            ${bar("A receber", pendingReceivable, Math.max(received, paid, pendingReceivable, pendingPayable))}
            ${bar("A pagar", pendingPayable, Math.max(received, paid, pendingReceivable, pendingPayable))}
            ${bar("Propostas", sum(state.proposals, "amount"), Math.max(sum(state.proposals, "amount"), 1))}
            ${bar("Carteira", state.clients.length * 1000, Math.max(state.clients.length * 1000, 1))}
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Prioridades operacionais</h3><button type="button" data-goto="tasks" class="secondary">Ver tarefas</button></div>
        <div class="panel-body table-wrap">${renderTable("tasks", openTasks.slice(0, 5), false)}</div>
      </div>
    </section>
  `;
  bindGoToButtons();
  bindOnboardingActions();
}

function kpi(label, value, tone = "neutral") {
  return `<article class="card kpi-card kpi-${tone}"><span>${label}</span><strong>${value}</strong></article>`;
}

function getDashboardQuickActions() {
  const groups = {
    executivo: [
      { id: "clients", label: "Clientes" },
      { id: "proposals", label: "Propostas" },
      { id: "projects", label: "Projetos" },
      { id: "reports", label: "Relatorios" }
    ],
    financeiro: [
      { id: "finance", label: "Financeiro" },
      { id: "reports", label: "Relatorios" },
      { id: "clients", label: "Clientes" },
      { id: "notifications", label: "Notificacoes" }
    ],
    operacional: [
      { id: "tasks", label: "Tarefas" },
      { id: "projects", label: "Projetos" },
      { id: "automations", label: "Automacoes" },
      { id: "notifications", label: "Notificacoes" }
    ]
  };
  return groups[getTenantSettings().dashboardFocus] || groups.executivo;
}

function renderOnboardingPanel() {
  const settings = getTenantSettings();
  if (settings.onboardingCompleted) return "";

  const tenant = getCurrentTenant();
  const steps = getOnboardingSteps();
  const completed = steps.filter((step) => step.done).length;
  const completion = Math.round((completed / steps.length) * 100);
  return `
    <section class="panel onboarding-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Primeira configuracao</p>
          <h3>${escapeHtml(tenant?.name || "Empresa")} esta ${completion}% configurada</h3>
          <span class="panel-subtitle">Complete os cadastros basicos para deixar a operacao pronta para uso diario.</span>
        </div>
        <span class="status ${completion >= 80 ? "success" : "warning"}">${completed}/${steps.length}</span>
      </div>
      <div class="panel-body onboarding-grid">
        <div class="onboarding-steps">
          ${steps.map((step) => `
            <article class="onboarding-step ${step.done ? "is-done" : ""}">
              <span class="onboarding-check">${step.done ? "OK" : ""}</span>
              <div>
                <strong>${step.title}</strong>
                <p>${step.detail}</p>
              </div>
              ${step.target ? `<button type="button" class="secondary" data-goto="${step.target}">${step.action}</button>` : ""}
            </article>
          `).join("")}
        </div>
        <div class="onboarding-side">
          <strong>Proximo melhor passo</strong>
          <p>${escapeHtml(steps.find((step) => !step.done)?.detail || "A configuracao inicial ja esta em bom ponto para operacao.")}</p>
          <button type="button" data-goto="${steps.find((step) => !step.done)?.target || "settings"}">${steps.find((step) => !step.done)?.action || "Revisar configuracoes"}</button>
          <button type="button" class="secondary" data-complete-onboarding>Marcar como concluido</button>
        </div>
      </div>
    </section>
  `;
}

function getOnboardingSteps() {
  const tenant = getCurrentTenant();
  return [
    {
      title: "Perfil da empresa",
      detail: "Nome, documento, e-mail e telefone conferidos.",
      done: Boolean(tenant?.name && tenant?.document && tenant?.email),
      target: "settings",
      action: "Revisar perfil"
    },
    {
      title: "Clientes",
      detail: "Pelo menos um cliente ativo ou prospect cadastrado.",
      done: state.clients.length > 0,
      target: "clients",
      action: "Abrir clientes"
    },
    {
      title: "Financeiro",
      detail: "Contas a pagar ou receber registradas para acompanhamento.",
      done: state.payables.length > 0 || state.receivables.length > 0,
      target: "finance",
      action: "Abrir financeiro"
    },
    {
      title: "Projetos e tarefas",
      detail: "Projetos e tarefas iniciais criados para organizar a operacao.",
      done: state.projects.length > 0 && state.tasks.length > 0,
      target: state.projects.length ? "tasks" : "projects",
      action: state.projects.length ? "Abrir tarefas" : "Abrir projetos"
    },
    {
      title: "Usuarios",
      detail: "Equipe administrativa revisada com perfis corretos.",
      done: state.users.length > 1,
      target: "users",
      action: "Abrir usuarios"
    }
  ];
}

function bindOnboardingActions() {
  content.querySelector("[data-complete-onboarding]")?.addEventListener("click", async (event) => {
    await withBusyButton(event.currentTarget, "Concluindo...", async () => {
      const result = await updateTenantSettings({ onboardingCompleted: true });
      if (!result) {
        toast(apiErrorMessage("Nao foi possivel concluir o onboarding."));
        return;
      }
      toast("Onboarding concluido.");
      renderDashboard();
    });
  });
}

function bar(label, value, max) {
  const height = Math.max(8, Math.round((value / Math.max(max, 1)) * 170));
  return `<div class="bar"><span style="height:${height}px"></span>${label}<strong>${money(value)}</strong></div>`;
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function getUpcomingFinancials() {
  const payables = state.payables
    .filter((item) => item.status === "pendente")
    .map((item) => ({ ...item, type: "A pagar", direction: "saida", date: item.dueDate }));
  const receivables = state.receivables
    .filter((item) => item.status === "pendente")
    .map((item) => ({ ...item, type: "A receber", direction: "entrada", date: item.dueDate }));

  return [...payables, ...receivables]
    .filter((item) => item.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
}

function buildDashboardAlerts(metrics) {
  const alerts = [];

  if (metrics.overduePayable) {
    alerts.push({ tone: "danger", title: "Contas a pagar vencidas", detail: `${metrics.overduePayable} pendencia${metrics.overduePayable === 1 ? "" : "s"} exigem atencao.` });
  }
  if (metrics.overdueReceivable) {
    alerts.push({ tone: "warning", title: "Recebimentos vencidos", detail: `${metrics.overdueReceivable} entrada${metrics.overdueReceivable === 1 ? "" : "s"} ainda nao recebida${metrics.overdueReceivable === 1 ? "" : "s"}.` });
  }
  if (metrics.lateTasks) {
    alerts.push({ tone: "danger", title: "Tarefas atrasadas", detail: `${metrics.lateTasks} tarefa${metrics.lateTasks === 1 ? "" : "s"} fora do prazo.` });
  }
  if (metrics.projectedBalance < 0) {
    alerts.push({ tone: "danger", title: "Saldo previsto negativo", detail: `Previsao atual de ${money(metrics.projectedBalance)}.` });
  }
  if (!alerts.length) {
    alerts.push({ tone: "success", title: "Operacao sob controle", detail: "Nenhum alerta critico no momento." });
  }

  return alerts;
}

function renderAlerts(alerts) {
  return `
    <div class="info-list">
      ${alerts.map((alert) => `
        <article class="info-item">
          <span class="status ${alert.tone}">${alert.title}</span>
          <p>${alert.detail}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderUpcomingFinancials(items) {
  if (!items.length) {
    return `<div class="empty-state compact">Nenhum vencimento pendente.</div>`;
  }

  return `
    <div class="info-list">
      ${items.map((item) => `
        <article class="info-item split">
          <div>
            <strong>${item.description}</strong>
            <span>${item.type} · ${formatDate(item.date)}</span>
          </div>
          <strong class="${item.direction === "entrada" ? "positive" : "negative"}">${money(item.amount)}</strong>
        </article>
      `).join("")}
    </div>
  `;
}

function buildNotifications() {
  const todayValue = today();
  const settings = getTenantSettings().notifications;
  const warningLimit = addDays(settings.warningDays);
  const notifications = [];

  if (settings.finance) state.payables
    .filter((item) => item.status === "pendente" && item.dueDate)
    .forEach((item) => {
      if (item.dueDate < todayValue) {
        notifications.push({
          id: notificationId("payables", item.id, "overdue", item.dueDate),
          tone: "danger",
          area: "Financeiro",
          title: "Conta a pagar vencida",
          detail: `${item.description} venceu em ${formatDate(item.dueDate)} no valor de ${money(item.amount)}.`,
          date: item.dueDate,
          target: "finance"
        });
      } else if (item.dueDate <= warningLimit) {
        notifications.push({
          id: notificationId("payables", item.id, "upcoming", item.dueDate),
          tone: "warning",
          area: "Financeiro",
          title: "Conta a pagar proxima do vencimento",
          detail: `${item.description} vence em ${formatDate(item.dueDate)} no valor de ${money(item.amount)}.`,
          date: item.dueDate,
          target: "finance"
        });
      }
    });

  if (settings.finance) state.receivables
    .filter((item) => item.status === "pendente" && item.dueDate)
    .forEach((item) => {
      if (item.dueDate < todayValue) {
        notifications.push({
          id: notificationId("receivables", item.id, "overdue", item.dueDate),
          tone: "danger",
          area: "Financeiro",
          title: "Conta a receber vencida",
          detail: `${item.description} venceu em ${formatDate(item.dueDate)} no valor de ${money(item.amount)}.`,
          date: item.dueDate,
          target: "finance"
        });
      } else if (item.dueDate <= warningLimit) {
        notifications.push({
          id: notificationId("receivables", item.id, "upcoming", item.dueDate),
          tone: "warning",
          area: "Financeiro",
          title: "Recebimento proximo do vencimento",
          detail: `${item.description} vence em ${formatDate(item.dueDate)} no valor de ${money(item.amount)}.`,
          date: item.dueDate,
          target: "finance"
        });
      }
    });

  if (settings.operations) state.tasks
    .filter((item) => !["concluida", "cancelada"].includes(item.status) && item.dueDate)
    .forEach((item) => {
      if (item.dueDate < todayValue) {
        notifications.push({
          id: notificationId("tasks", item.id, "overdue", item.dueDate),
          tone: "danger",
          area: "Operacional",
          title: "Tarefa atrasada",
          detail: `${item.title} venceu em ${formatDate(item.dueDate)}.`,
          date: item.dueDate,
          target: "tasks"
        });
      } else if (item.dueDate <= warningLimit) {
        notifications.push({
          id: notificationId("tasks", item.id, "upcoming", item.dueDate),
          tone: "warning",
          area: "Operacional",
          title: "Tarefa proxima do prazo",
          detail: `${item.title} vence em ${formatDate(item.dueDate)}.`,
          date: item.dueDate,
          target: "tasks"
        });
      }
    });

  if (settings.commercial) state.proposals
    .filter((item) => ["rascunho", "enviada"].includes(item.status) && item.validUntil)
    .forEach((item) => {
      if (item.validUntil < todayValue) {
        notifications.push({
          id: notificationId("proposals", item.id, "expired", item.validUntil),
          tone: "danger",
          area: "Comercial",
          title: "Proposta vencida",
          detail: `${item.title} venceu em ${formatDate(item.validUntil)}.`,
          date: item.validUntil,
          target: "proposals"
        });
      } else if (item.validUntil <= warningLimit) {
        notifications.push({
          id: notificationId("proposals", item.id, "upcoming", item.validUntil),
          tone: "warning",
          area: "Comercial",
          title: "Proposta perto do vencimento",
          detail: `${item.title} vence em ${formatDate(item.validUntil)}.`,
          date: item.validUntil,
          target: "proposals"
        });
      }
    });

  if (settings.contracts) state.contracts
    .filter((item) => ["ativo", "suspenso"].includes(item.status) && item.endDate)
    .forEach((item) => {
      if (item.endDate < todayValue) {
        notifications.push({
          id: notificationId("contracts", item.id, "expired", item.endDate),
          tone: "danger",
          area: "Contratos",
          title: "Contrato vencido",
          detail: `${item.title} venceu em ${formatDate(item.endDate)}.`,
          date: item.endDate,
          target: "contracts"
        });
      } else if (item.endDate <= warningLimit) {
        notifications.push({
          id: notificationId("contracts", item.id, "upcoming", item.endDate),
          tone: "warning",
          area: "Contratos",
          title: "Contrato perto do vencimento",
          detail: `${item.title} vence em ${formatDate(item.endDate)}.`,
          date: item.endDate,
          target: "contracts"
        });
      }
    });

  return notifications.sort((a, b) => {
    const toneOrder = { danger: 0, warning: 1, neutral: 2 };
    return (toneOrder[a.tone] ?? 9) - (toneOrder[b.tone] ?? 9) || String(a.date).localeCompare(String(b.date));
  });
}

function notificationId(collection, id, type, date) {
  return [collection, id || "registro", type, date || "sem-data"].join(":");
}

function isNotificationRead(notification) {
  return state.notificationReads.includes(notification.id);
}

function getUnreadNotifications(notifications = buildNotifications()) {
  return notifications.filter((notification) => !isNotificationRead(notification));
}

function buildAutomationRules() {
  const todayValue = today();
  const settings = getTenantSettings().automations;
  const weekLimit = addDays(settings.proposalWarningDays);
  const contractLimit = addDays(settings.contractWarningDays);

  return [
    {
      id: "finance-overdue",
      enabled: settings.finance,
      area: "Financeiro",
      tone: "danger",
      title: "Gerar tarefas para contas vencidas",
      description: "Cria uma tarefa operacional para cada conta a pagar ou receber vencida que ainda nao possui acompanhamento automatizado.",
      items: [
        ...state.payables
          .filter((item) => item.status === "pendente" && item.dueDate && item.dueDate < todayValue)
          .map((item) => automationItem("payables", item, `Regularizar conta a pagar: ${item.description}`, `Conta a pagar vencida em ${formatDate(item.dueDate)} no valor de ${money(item.amount)}.`, "alta", todayValue)),
        ...state.receivables
          .filter((item) => item.status === "pendente" && item.dueDate && item.dueDate < todayValue)
          .map((item) => automationItem("receivables", item, `Cobrar conta a receber: ${item.description}`, `Conta a receber vencida em ${formatDate(item.dueDate)} no valor de ${money(item.amount)}.`, "alta", todayValue))
      ]
    },
    {
      id: "commercial-followup",
      enabled: settings.commercial,
      area: "Comercial",
      tone: "warning",
      title: "Gerar tarefas para propostas criticas",
      description: "Cria tarefas de follow-up para propostas em rascunho ou enviadas que venceram ou vencem nos proximos 7 dias.",
      items: state.proposals
        .filter((item) => ["rascunho", "enviada"].includes(item.status) && item.validUntil && item.validUntil <= weekLimit)
        .map((item) => automationItem("proposals", item, `Acompanhar proposta: ${item.title}`, `Proposta ${labelize(item.status)} com validade em ${formatDate(item.validUntil)} e valor de ${money(item.amount)}.`, "media", item.validUntil < todayValue ? todayValue : item.validUntil))
    },
    {
      id: "contract-review",
      enabled: settings.contracts,
      area: "Contratos",
      tone: "warning",
      title: "Gerar tarefas para revisao contratual",
      description: "Cria tarefas para contratos ativos ou suspensos que venceram ou vencem nos proximos 15 dias.",
      items: state.contracts
        .filter((item) => ["ativo", "suspenso"].includes(item.status) && item.endDate && item.endDate <= contractLimit)
        .map((item) => automationItem("contracts", item, `Revisar contrato: ${item.title}`, `Contrato ${item.contractNumber || item.title} com termino em ${formatDate(item.endDate)} e valor de ${money(item.amount)}.`, "media", item.endDate < todayValue ? todayValue : item.endDate))
    }
  ].map((rule) => {
    if (!rule.enabled) {
      return {
        ...rule,
        pendingItems: [],
        generatedCount: 0,
        disabledBySettings: true
      };
    }
    const pendingItems = rule.items.filter((item) => !automationTaskExists(item.key));
    return {
      ...rule,
      pendingItems,
      generatedCount: rule.items.length - pendingItems.length
    };
  });
}

function automationItem(collection, record, title, description, priority, dueDate) {
  const key = automationMarker(collection, record.id);
  return {
    key,
    collection,
    recordId: record.id,
    recordLabel: record.title || record.description || record.name || record.id,
    title,
    description,
    priority,
    dueDate
  };
}

function automationMarker(collection, id) {
  return `[AUTO:${collection}:${id || "registro"}]`;
}

function automationTaskExists(key) {
  return state.tasks.some((task) => String(task.description || "").includes(key));
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

const schemas = {
  tenants: {
    label: "empresa",
    collection: "tenants",
    required: ["name", "document", "status"],
    fields: [
      ["name", "Nome da empresa", "text"],
      ["document", "CNPJ/Documento", "text"],
      ["email", "E-mail", "email"],
      ["phone", "Telefone", "text"],
      ["status", "Status", "select", ["ativo", "suspenso", "inativo"]],
      ["notes", "Observacoes", "textarea", null, "full"]
    ],
    columns: ["name", "document", "email", "phone", "status"]
  },
  clients: {
    label: "cliente",
    collection: "clients",
    required: ["type", "name", "document", "email", "status"],
    fields: [
      ["type", "Tipo", "select", ["PJ", "PF"]],
      ["name", "Nome/Razao social", "text"],
      ["document", "CPF/CNPJ", "text"],
      ["email", "E-mail", "email"],
      ["phone", "Telefone", "text"],
      ["status", "Status", "select", ["ativo", "prospect", "inativo"]],
      ["notes", "Observacoes", "textarea", null, "full"]
    ],
    columns: ["name", "document", "email", "phone", "status"]
  },
  suppliers: {
    label: "fornecedor",
    collection: "suppliers",
    required: ["name", "document", "email", "category", "status"],
    fields: [
      ["name", "Nome/Razao social", "text"],
      ["document", "CPF/CNPJ", "text"],
      ["email", "E-mail", "email"],
      ["phone", "Telefone", "text"],
      ["category", "Categoria", "text"],
      ["status", "Status", "select", ["ativo", "inativo"]]
    ],
    columns: ["name", "document", "email", "category", "status"]
  },
  proposals: {
    label: "proposta",
    collection: "proposals",
    required: ["clientId", "title", "amount", "validUntil", "status", "responsibleId"],
    fields: [
      ["clientId", "Cliente", "relation", "clients"],
      ["title", "Titulo", "text"],
      ["amount", "Valor", "number"],
      ["validUntil", "Validade", "date"],
      ["status", "Status", "select", ["rascunho", "enviada", "aprovada", "recusada", "expirada", "cancelada"]],
      ["responsibleId", "Responsavel", "relation", "users"],
      ["description", "Descricao", "textarea", null, "full"],
      ["notes", "Observacoes", "textarea", null, "full"]
    ],
    columns: ["title", "clientId", "amount", "validUntil", "status"]
  },
  contracts: {
    label: "contrato",
    collection: "contracts",
    required: ["clientId", "contractNumber", "title", "amount", "startDate", "endDate", "status", "responsibleId"],
    fields: [
      ["clientId", "Cliente", "relation", "clients"],
      ["contractNumber", "Numero do contrato", "text"],
      ["title", "Titulo", "text"],
      ["amount", "Valor", "number"],
      ["startDate", "Inicio", "date"],
      ["endDate", "Fim", "date"],
      ["status", "Status", "select", ["rascunho", "ativo", "suspenso", "encerrado", "cancelado"]],
      ["responsibleId", "Responsavel", "relation", "users"],
      ["signedAt", "Assinatura", "date"],
      ["notes", "Observacoes", "textarea", null, "full"]
    ],
    columns: ["contractNumber", "title", "clientId", "amount", "endDate", "status"]
  },
  projects: {
    label: "projeto",
    collection: "projects",
    required: ["clientId", "name", "responsibleId", "startDate", "dueDate", "status"],
    fields: [
      ["clientId", "Cliente", "relation", "clients"],
      ["name", "Nome do projeto", "text"],
      ["responsibleId", "Responsavel", "relation", "users"],
      ["startDate", "Inicio", "date"],
      ["dueDate", "Prazo", "date"],
      ["status", "Status", "select", ["planejado", "em_andamento", "pausado", "concluido", "cancelado"]],
      ["description", "Descricao", "textarea", null, "full"]
    ],
    columns: ["name", "clientId", "responsibleId", "dueDate", "status"]
  },
  tasks: {
    label: "tarefa",
    collection: "tasks",
    required: ["projectId", "title", "responsibleId", "priority", "status", "dueDate"],
    fields: [
      ["projectId", "Projeto", "relation", "projects"],
      ["title", "Titulo", "text"],
      ["responsibleId", "Responsavel", "relation", "users"],
      ["priority", "Prioridade", "select", ["baixa", "media", "alta", "urgente"]],
      ["status", "Status", "select", ["pendente", "em_andamento", "concluida", "cancelada"]],
      ["dueDate", "Vencimento", "date"],
      ["description", "Descricao", "textarea", null, "full"]
    ],
    columns: ["title", "projectId", "responsibleId", "priority", "status"]
  },
  users: {
    label: "usuario",
    collection: "users",
    required: ["tenantId", "name", "email", "password", "role", "status"],
    fields: [
      ["tenantId", "Empresa", "relation", "tenants"],
      ["name", "Nome", "text"],
      ["email", "E-mail", "email"],
      ["password", "Senha", "password"],
      ["role", "Perfil", "select", Object.keys(roleLabels)],
      ["status", "Status", "select", ["ativo", "inativo"]]
    ],
    columns: ["name", "email", "tenantId", "role", "status"]
  },
  payables: {
    label: "conta a pagar",
    collection: "payables",
    required: ["supplierId", "category", "description", "amount", "dueDate", "status"],
    fields: [
      ["supplierId", "Fornecedor", "relation", "suppliers"],
      ["category", "Categoria", "text"],
      ["description", "Descricao", "text"],
      ["amount", "Valor", "number"],
      ["dueDate", "Vencimento", "date"],
      ["status", "Status", "select", ["pendente", "pago", "cancelado"]],
      ["paymentDate", "Data de pagamento", "date"],
      ["notes", "Observacoes", "textarea", null, "full"]
    ],
    columns: ["description", "supplierId", "amount", "dueDate", "status"]
  },
  receivables: {
    label: "conta a receber",
    collection: "receivables",
    required: ["clientId", "category", "description", "amount", "dueDate", "status"],
    fields: [
      ["clientId", "Cliente", "relation", "clients"],
      ["category", "Categoria", "text"],
      ["description", "Descricao", "text"],
      ["amount", "Valor", "number"],
      ["dueDate", "Vencimento", "date"],
      ["status", "Status", "select", ["pendente", "recebido", "cancelado"]],
      ["receivedDate", "Data de recebimento", "date"],
      ["paymentMethod", "Forma de pagamento", "text"]
    ],
    columns: ["description", "clientId", "amount", "dueDate", "status"]
  }
};

function renderCrud(schemaId) {
  const schema = schemas[schemaId];
  const items = state[schema.collection];
  const query = listFilters[schemaId] || "";
  const status = statusFilters[schemaId] || "";
  const filteredItems = filterItems(schemaId, items, query, status);
  const paging = getListPaging(schemaId, filteredItems.length);
  const visibleItems = filteredItems.slice((paging.page - 1) * paging.pageSize, paging.page * paging.pageSize);
  const totalLabel = filteredItems.length === items.length ? `${items.length}` : `${filteredItems.length} de ${items.length}`;
  const statusOptions = getStatusOptions(schemaId);
  content.innerHTML = `
    <section class="toolbar">
      <div>
        <p class="eyebrow">Cadastro</p>
        <h3 data-list-count="${schemaId}">${totalLabel} ${schema.label}${filteredItems.length === 1 ? "" : "s"}</h3>
      </div>
      <div class="toolbar-actions">
        <label class="search-field">
          Buscar
          <input type="search" data-search="${schemaId}" value="${escapeHtml(query)}" placeholder="Digite para filtrar" />
        </label>
        ${statusOptions.length ? `
          <label class="filter-field">
            Status
            <select data-status-filter="${schemaId}">
              <option value="">Todos</option>
              ${statusOptions.map((option) => `<option value="${option}" ${option === status ? "selected" : ""}>${labelize(option)}</option>`).join("")}
            </select>
          </label>
        ` : ""}
        ${canCreate(schemaId) ? `<button type="button" data-new="${schemaId}">Novo ${schema.label}</button>` : ""}
        <button type="button" class="secondary" data-export="${schema.collection}">Exportar CSV</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <h3>Lista</h3>
        <div class="panel-actions" data-list-actions="${schemaId}">${renderListActions(schemaId, totalLabel, query, status)}</div>
      </div>
      <div class="panel-body table-wrap" data-table-container="${schemaId}">${renderTable(schemaId, visibleItems, true, query, status)}</div>
      <div class="panel-footer" data-list-pagination="${schemaId}">${renderListPagination(schemaId, paging, filteredItems.length)}</div>
    </section>
  `;
  bindCrud(schemaId);
}

function renderListActions(schemaId, totalLabel, query, status) {
  return `
    ${(query || status) ? `<button type="button" class="secondary" data-clear-filters="${schemaId}">Limpar filtros</button>` : ""}
    <span class="status neutral">${totalLabel}</span>
  `;
}

function getListPaging(schemaId, totalItems) {
  const defaultPageSize = getTenantSettings().defaultPageSize;
  const current = listPaging[schemaId] || {};
  const pageSize = [10, 20, 50].includes(Number(current.pageSize)) ? Number(current.pageSize) : defaultPageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(Number(current.page || 1), 1), totalPages);
  listPaging[schemaId] = { page, pageSize, totalPages };
  return listPaging[schemaId];
}

function renderListPagination(schemaId, paging, totalItems) {
  if (!totalItems) {
    return `<div class="pagination"><span>Nenhum registro para paginar.</span></div>`;
  }
  const start = (paging.page - 1) * paging.pageSize + 1;
  const end = Math.min(totalItems, paging.page * paging.pageSize);
  return `
    <div class="pagination">
      <span>${start}-${end} de ${totalItems}</span>
      <label>
        Por pagina
        <select data-list-page-size="${schemaId}">
          ${[10, 20, 50].map((size) => `<option value="${size}" ${size === paging.pageSize ? "selected" : ""}>${size}</option>`).join("")}
        </select>
      </label>
      <button type="button" class="secondary" data-list-prev="${schemaId}" ${paging.page <= 1 ? "disabled" : ""}>Anterior</button>
      <button type="button" class="secondary" data-list-next="${schemaId}" ${paging.page >= paging.totalPages ? "disabled" : ""}>Proxima</button>
    </div>
  `;
}

function getStatusOptions(schemaId) {
  const statusField = schemas[schemaId].fields.find(([name]) => name === "status");
  return Array.isArray(statusField?.[3]) ? statusField[3] : [];
}

function filterItems(schemaId, items, query, status = "") {
  const normalizedQuery = normalizeText(query);

  const schema = schemas[schemaId];
  return items.filter((item) => {
    const matchesStatus = !status || item.status === status;
    const matchesQuery = !normalizedQuery || schema.columns.some((column) => normalizeText(formatCellText(column, item[column])).includes(normalizedQuery));
    return matchesStatus && matchesQuery;
  });
}

function renderCrudForm(schemaId, item = {}) {
  const schema = schemas[schemaId];
  const isEditing = Boolean(item.id);
  if ((isEditing && !canEdit(schemaId)) || (!isEditing && !canCreate(schemaId))) {
    renderAccessDenied();
    return;
  }
  content.innerHTML = `
    <section class="toolbar">
      <div>
        <p class="eyebrow">${isEditing ? "Edicao" : "Cadastro"}</p>
        <h3>${isEditing ? `Editar ${schema.label}` : `Novo ${schema.label}`}</h3>
      </div>
      <div class="toolbar-actions">
        <button type="button" class="secondary" data-cancel-edit="${schemaId}">Voltar para lista</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header"><h3>Dados do ${schema.label}</h3></div>
      <div class="panel-body">${renderForm(schemaId, item, true)}</div>
    </section>
  `;
  bindCrud(schemaId);
}

function renderTable(schemaId, items, actions = true, query = "", status = "") {
  const schema = schemas[schemaId];
  const showActions = actions && (canEdit(schemaId) || canDelete(schemaId));
  if (!items.length) {
    return renderEmptyState(schemaId, actions, query, status);
  }
  const headings = schema.columns.map((column) => `<th>${columnLabel(column)}</th>`).join("");
  const rows = items.map((item) => {
    const cells = schema.columns.map((column) => `<td data-label="${columnLabel(column)}">${formatCell(column, item[column])}</td>`).join("");
    const actionCell = showActions ? `<td class="is-actions" data-label="Acoes"><div class="table-actions">${renderRowActions(schemaId, item.id)}</div></td>` : "";
    return `<tr class="${rowToneClass(schemaId, item)}">${cells}${actionCell}</tr>`;
  }).join("");
  return `<table class="data-table responsive-table"><thead><tr>${headings}${showActions ? "<th>Acoes</th>" : ""}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderRowActions(schemaId, id) {
  return `
    ${canEdit(schemaId) ? `<button class="secondary" type="button" data-edit="${schemaId}:${id}">Editar</button>` : ""}
    ${canDelete(schemaId) ? `<button class="danger" type="button" data-delete="${schemaId}:${id}">Excluir</button>` : ""}
  `;
}

function renderEmptyState(schemaId, actions, query, status) {
  const schema = schemas[schemaId];
  const hasFilters = Boolean(query || status);
  const filterAction = hasFilters ? `<button type="button" class="secondary" data-clear-filters="${schemaId}">Limpar filtros</button>` : "";
  const createAction = canCreate(schemaId) ? `<button type="button" data-new="${schemaId}">Novo ${schema.label}</button>` : "";
  const actionsMarkup = [filterAction, createAction].filter(Boolean).join("");
  return `
    <div class="empty-state">
      <h3>${hasFilters ? "Nenhum resultado encontrado" : `Nenhum ${schema.label} cadastrado ainda`}</h3>
      <p>${hasFilters ? "Ajuste a busca ou limpe os filtros para ver todos os registros." : "Comece criando o primeiro registro deste modulo."}</p>
      ${actions && actionsMarkup ? `<div class="empty-actions">${actionsMarkup}</div>` : ""}
    </div>
  `;
}

function rowToneClass(schemaId, item) {
  const todayValue = today();
  const warningLimit = addDays(7);
  const date = item.dueDate || item.validUntil;

  if (["payables", "receivables"].includes(schemaId) && item.status === "pendente" && date) {
    if (date < todayValue) return "row-danger";
    if (date <= warningLimit) return "row-warning";
  }
  if (schemaId === "tasks" && !["concluida", "cancelada"].includes(item.status) && item.dueDate) {
    if (item.dueDate < todayValue) return "row-danger";
    if (item.dueDate <= warningLimit) return "row-warning";
  }
  if (schemaId === "proposals" && ["rascunho", "enviada"].includes(item.status) && item.validUntil) {
    if (item.validUntil < todayValue) return "row-danger";
    if (item.validUntil <= warningLimit) return "row-warning";
  }
  if (schemaId === "contracts" && ["ativo", "suspenso"].includes(item.status) && item.endDate) {
    if (item.endDate < todayValue) return "row-danger";
    if (item.endDate <= warningLimit) return "row-warning";
  }
  return "";
}

function columnLabel(column) {
  const labels = {
    name: "Nome",
    document: "Documento",
    email: "E-mail",
    phone: "Telefone",
    status: "Status",
    category: "Categoria",
    title: "Titulo",
    contractNumber: "Contrato",
    clientId: "Cliente",
    supplierId: "Fornecedor",
    projectId: "Projeto",
    responsibleId: "Responsavel",
    tenantId: "Empresa",
    amount: "Valor",
    validUntil: "Validade",
    startDate: "Inicio",
    endDate: "Fim",
    signedAt: "Assinatura",
    dueDate: "Prazo",
    priority: "Prioridade",
    role: "Perfil",
    description: "Descricao"
  };
  return labels[column] || column;
}

function formatCell(column, value) {
  if (["amount"].includes(column)) return money(value);
  if (["validUntil", "dueDate", "startDate", "endDate", "signedAt", "paymentDate", "receivedDate", "completedAt"].includes(column)) return formatDate(value);
  if (["status", "priority", "role"].includes(column)) return `<span class="status ${statusClass(value)}">${labelize(roleLabels[value] || value)}</span>`;
  if (column === "clientId") return state.clients.find((item) => item.id === value)?.name || "-";
  if (column === "supplierId") return state.suppliers.find((item) => item.id === value)?.name || "-";
  if (column === "projectId") return state.projects.find((item) => item.id === value)?.name || "-";
  if (column === "responsibleId") return state.users.find((item) => item.id === value)?.name || "-";
  if (column === "tenantId") return state.tenants.find((item) => item.id === value)?.name || "-";
  return value || "-";
}

function formatCellText(column, value) {
  if (["amount"].includes(column)) return money(value);
  if (["validUntil", "dueDate", "startDate", "endDate", "signedAt", "paymentDate", "receivedDate", "completedAt"].includes(column)) return formatDate(value);
  if (["status", "priority", "role"].includes(column)) return roleLabels[value] || labelize(value);
  if (column === "clientId") return state.clients.find((item) => item.id === value)?.name || "";
  if (column === "supplierId") return state.suppliers.find((item) => item.id === value)?.name || "";
  if (column === "projectId") return state.projects.find((item) => item.id === value)?.name || "";
  if (column === "responsibleId") return state.users.find((item) => item.id === value)?.name || "";
  if (column === "tenantId") return state.tenants.find((item) => item.id === value)?.name || "";
  return value || "";
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function renderForm(schemaId, item = {}, showCancel = false) {
  const schema = schemas[schemaId];
  const fields = schema.fields.map(([name, label, type, options, className]) => {
    const value = item[name] || "";
    const required = isRequiredField(schemaId, name, Boolean(item.id));
    return `
      <label class="${className || ""}">
        <span class="field-label">${label}${required ? '<small>Obrigatorio</small>' : ""}</span>
        ${renderInput(name, type, value, options, required)}
      </label>
    `;
  }).join("");
  return `
    <form class="form-grid" data-form="${schemaId}" data-id="${item.id || ""}" novalidate>
      <div class="form-alert full hidden" data-form-alert></div>
      ${fields}
      <div class="full toolbar-actions">
        <button type="submit">${item.id ? "Salvar alteracoes" : "Cadastrar"}</button>
        ${showCancel ? `<button type="button" class="secondary" data-cancel-edit="${schemaId}">Cancelar</button>` : ""}
      </div>
    </form>
  `;
}

function renderInput(name, type, value, options, required = false) {
  const requiredAttribute = required ? "required" : "";
  if (type === "textarea") return `<textarea name="${name}" ${requiredAttribute}>${escapeHtml(value)}</textarea>`;
  if (type === "select") {
    return `<select name="${name}" ${requiredAttribute}>${options.map((option) => `<option value="${option}" ${option === value ? "selected" : ""}>${labelize(roleLabels[option] || option)}</option>`).join("")}</select>`;
  }
  if (type === "relation") {
    const collection = state[options] || [];
    const emptyOption = collection.length ? `<option value="">Selecione...</option>` : `<option value="">Nenhum registro disponivel</option>`;
    return `<select name="${name}" ${requiredAttribute}>${emptyOption}${collection.map((item) => `<option value="${item.id}" ${item.id === value ? "selected" : ""}>${item.name || item.title || item.email}</option>`).join("")}</select>`;
  }
  return `<input name="${name}" type="${type}" value="${escapeHtml(value)}" ${requiredAttribute} />`;
}

function isRequiredField(schemaId, name, isEditing = false) {
  if (schemaId === "users" && name === "password" && isEditing) {
    return false;
  }
  return schemas[schemaId]?.required?.includes(name) || false;
}

function bindCrud(schemaId) {
  content.querySelector(`[data-form="${schemaId}"]`)?.addEventListener("submit", (event) => saveForm(event, schemaId));
  content.querySelectorAll("[data-search]").forEach((input) => {
    input.addEventListener("input", () => {
      listFilters[input.dataset.search] = input.value;
      listPaging[input.dataset.search] = { ...(listPaging[input.dataset.search] || {}), page: 1 };
      refreshCrudList(input.dataset.search);
    });
  });
  content.querySelectorAll("[data-status-filter]").forEach((select) => {
    select.addEventListener("change", () => {
      statusFilters[select.dataset.statusFilter] = select.value;
      listPaging[select.dataset.statusFilter] = { ...(listPaging[select.dataset.statusFilter] || {}), page: 1 };
      refreshCrudList(select.dataset.statusFilter);
    });
  });
  content.querySelectorAll("[data-clear-filters]").forEach((button) => {
    button.addEventListener("click", () => {
      listFilters[button.dataset.clearFilters] = "";
      statusFilters[button.dataset.clearFilters] = "";
      renderCrud(button.dataset.clearFilters);
    });
  });
  content.querySelectorAll("[data-new]").forEach((button) => {
    button.addEventListener("click", () => renderCrudForm(button.dataset.new));
  });
  content.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editItem(button.dataset.edit));
  });
  content.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteItem(button.dataset.delete));
  });
  content.querySelectorAll("[data-cancel-edit]").forEach((button) => {
    button.addEventListener("click", () => renderCrud(button.dataset.cancelEdit));
  });
  content.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => exportCsv(button.dataset.export, schemaId));
  });
  bindListPagination(schemaId);
}

function bindListPagination(schemaId) {
  content.querySelector(`[data-list-prev="${schemaId}"]`)?.addEventListener("click", () => {
    listPaging[schemaId] = { ...(listPaging[schemaId] || {}), page: Math.max(1, Number(listPaging[schemaId]?.page || 1) - 1) };
    refreshCrudList(schemaId);
  });
  content.querySelector(`[data-list-next="${schemaId}"]`)?.addEventListener("click", () => {
    listPaging[schemaId] = { ...(listPaging[schemaId] || {}), page: Number(listPaging[schemaId]?.page || 1) + 1 };
    refreshCrudList(schemaId);
  });
  content.querySelector(`[data-list-page-size="${schemaId}"]`)?.addEventListener("change", (event) => {
    listPaging[schemaId] = { page: 1, pageSize: Number(event.target.value) };
    refreshCrudList(schemaId);
  });
}

function refreshCrudList(schemaId) {
  const schema = schemas[schemaId];
  const items = state[schema.collection];
  const query = listFilters[schemaId] || "";
  const status = statusFilters[schemaId] || "";
  const filteredItems = filterItems(schemaId, items, query, status);
  const paging = getListPaging(schemaId, filteredItems.length);
  const visibleItems = filteredItems.slice((paging.page - 1) * paging.pageSize, paging.page * paging.pageSize);
  const totalLabel = filteredItems.length === items.length ? `${items.length}` : `${filteredItems.length} de ${items.length}`;
  const countElement = content.querySelector(`[data-list-count="${schemaId}"]`);
  const actionsElement = content.querySelector(`[data-list-actions="${schemaId}"]`);
  const tableContainer = content.querySelector(`[data-table-container="${schemaId}"]`);
  const paginationContainer = content.querySelector(`[data-list-pagination="${schemaId}"]`);

  if (countElement) {
    countElement.textContent = `${totalLabel} ${schema.label}${filteredItems.length === 1 ? "" : "s"}`;
  }
  if (actionsElement) {
    actionsElement.innerHTML = renderListActions(schemaId, totalLabel, query, status);
  }
  if (tableContainer) {
    tableContainer.innerHTML = renderTable(schemaId, visibleItems, true, query, status);
  }
  if (paginationContainer) {
    paginationContainer.innerHTML = renderListPagination(schemaId, paging, filteredItems.length);
  }

  content.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editItem(button.dataset.edit));
  });
  content.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteItem(button.dataset.delete));
  });
  content.querySelectorAll("[data-clear-filters]").forEach((button) => {
    button.addEventListener("click", () => {
      listFilters[button.dataset.clearFilters] = "";
      statusFilters[button.dataset.clearFilters] = "";
      renderCrud(button.dataset.clearFilters);
    });
  });
  bindListPagination(schemaId);
}

async function saveForm(event, schemaId) {
  event.preventDefault();
  const schema = schemas[schemaId];
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const isEditing = Boolean(form.dataset.id);
  if ((isEditing && !canEdit(schemaId)) || (!isEditing && !canCreate(schemaId))) {
    showFormError(form, "Seu perfil nao possui permissao para salvar este registro.");
    return;
  }
  const formData = new FormData(form);
  const item = Object.fromEntries(formData.entries());
  if (schemaId === "users" && isEditing && !String(item.password || "").trim()) {
    delete item.password;
  }

  const invalidField = findInvalidField(schemaId, item, isEditing);
  if (invalidField) {
    showFormError(form, `${columnLabel(invalidField)} e obrigatorio.`);
    form.querySelector(`[name="${invalidField}"]`)?.focus();
    return;
  }

  schema.fields.forEach(([name, , type]) => {
    if (type === "number") item[name] = Number(item[name] || 0);
  });

  await withBusyButton(submitButton, "Salvando...", async () => {
    const collection = state[schema.collection];
    const previousCollection = collection.map((record) => ({ ...record }));
    const previousReceivables = state.receivables.map((record) => ({ ...record }));
    let savedItem;
    if (isEditing) {
      const index = collection.findIndex((record) => record.id === form.dataset.id);
      collection[index] = { ...collection[index], ...item };
      savedItem = collection[index];
    } else {
      savedItem = { id: uid(), ...item };
      collection.push(savedItem);
    }

    const generatedRecords = applyBusinessRules(schema.collection, savedItem);
    await saveRecordToApi(schema.collection, savedItem, isEditing);
    if (lastApiError) {
      state[schema.collection] = previousCollection;
      state.receivables = previousReceivables;
      if (lastApiError.status === 401) return;
      showFormError(form, apiErrorMessage(`Nao foi possivel salvar ${schema.label}.`));
      return;
    }

    for (const generatedRecord of generatedRecords) {
      await saveRecordToApi("receivables", generatedRecord, false);
      if (lastApiError) {
        state[schema.collection] = previousCollection;
        state.receivables = previousReceivables;
        if (lastApiError.status === 401) return;
        showFormError(form, apiErrorMessage("Registro salvo, mas nao foi possivel gerar o recebimento automatico."));
        return;
      }
    }
    saveState();
    toast(`${capitalize(schema.label)} ${isEditing ? "atualizado" : "cadastrado"} com sucesso.`);
    renderCrud(schemaId);
  });
}

function findInvalidField(schemaId, item, isEditing = false) {
  const schema = schemas[schemaId];
  return (schema.required || []).find((field) => {
    if (schemaId === "users" && field === "password" && isEditing) {
      return false;
    }
    const value = item[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      return true;
    }
    const type = schema.fields.find(([name]) => name === field)?.[2];
    return type === "number" && Number(value) <= 0;
  });
}

function showFormError(form, message) {
  const alert = form.querySelector("[data-form-alert]");
  if (!alert) return;
  alert.textContent = message;
  alert.classList.remove("hidden");
}

function capitalize(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}

function applyBusinessRules(collection, item) {
  if (collection === "proposals" && item.status === "aprovada") {
    const exists = state.receivables.some((receivable) => receivable.proposalId === item.id);
    if (!exists && item.amount) {
      const receivable = {
        id: uid(),
        clientId: item.clientId,
        proposalId: item.id,
        category: "Receita de servicos",
        description: `Proposta aprovada: ${item.title}`,
        amount: Number(item.amount),
        dueDate: isoOffset(15),
        receivedDate: "",
        status: "pendente",
        paymentMethod: ""
      };
      state.receivables.push(receivable);
      return [receivable];
    }
  }
  return [];
}

function editItem(payload) {
  const [schemaId, id] = payload.split(":");
  if (!canEdit(schemaId)) {
    renderAccessDenied();
    return;
  }
  const schema = schemas[schemaId];
  const item = state[schema.collection].find((record) => record.id === id);
  if (!["payables", "receivables"].includes(schemaId)) {
    renderCrudForm(schemaId, item);
    return;
  }
  const panel = document.querySelector("#formPanel");
  const formMarkup = `<div class="panel-header"><h3>Editar ${schema.label}</h3></div><div class="panel-body">${renderForm(schemaId, item)}</div>`;
  if (panel) {
    panel.innerHTML = formMarkup;
  } else {
    content.innerHTML = `<section class="panel">${formMarkup}</section>`;
  }
  bindCrud(schemaId);
}

async function deleteItem(payload) {
  const [schemaId, id] = payload.split(":");
  if (!canDelete(schemaId)) {
    toast("Seu perfil nao possui permissao para excluir registros.");
    return;
  }
  const schema = schemas[schemaId];
  const item = state[schema.collection].find((record) => record.id === id);
  const label = item?.name || item?.title || item?.description || schema.label;
  const confirmed = window.confirm(`Excluir ${label}? Esta acao nao pode ser desfeita.`);
  if (!confirmed) return;

  const previousCollection = state[schema.collection].map((record) => ({ ...record }));
  state[schema.collection] = state[schema.collection].filter((record) => record.id !== id);
  await deleteRecordFromApi(schema.collection, id);
  if (lastApiError) {
    state[schema.collection] = previousCollection;
    if (lastApiError.status === 401) return;
    toast(apiErrorMessage("Nao foi possivel excluir o registro."));
    renderCrud(schemaId);
    return;
  }
  saveState();
  toast("Registro excluido.");
  renderCrud(schemaId);
}

function renderFinance() {
  const received = sum(state.receivables.filter((item) => item.status === "recebido"), "amount");
  const paid = sum(state.payables.filter((item) => item.status === "pago"), "amount");
  const pendingReceivable = sum(state.receivables.filter((item) => item.status === "pendente"), "amount");
  const pendingPayable = sum(state.payables.filter((item) => item.status === "pendente"), "amount");
  const overduePayable = state.payables.filter((item) => item.status === "pendente" && item.dueDate < today());
  const overdueReceivable = state.receivables.filter((item) => item.status === "pendente" && item.dueDate < today());

  content.innerHTML = `
    <section class="grid kpi-grid">
      ${kpi("Entradas realizadas", money(received), "success")}
      ${kpi("Saidas realizadas", money(paid), paid ? "warning" : "neutral")}
      ${kpi("Entradas previstas", money(pendingReceivable), "neutral")}
      ${kpi("Saidas previstas", money(pendingPayable), "warning")}
      ${kpi("A receber vencido", money(sum(overdueReceivable, "amount")), overdueReceivable.length ? "danger" : "success")}
      ${kpi("A pagar vencido", money(sum(overduePayable, "amount")), overduePayable.length ? "danger" : "success")}
      ${kpi("Saldo realizado", money(received - paid), received - paid >= 0 ? "success" : "danger")}
      ${kpi("Saldo previsto", money(pendingReceivable - pendingPayable), pendingReceivable - pendingPayable >= 0 ? "success" : "warning")}
    </section>
    <section class="grid two-columns">
      ${financePanel("payables", "Contas a pagar")}
      ${financePanel("receivables", "Contas a receber")}
    </section>
  `;
  bindFinance();
}

function financePanel(schemaId, title) {
  const schema = schemas[schemaId];
  const items = state[schema.collection];
  const query = listFilters[schemaId] || "";
  const status = statusFilters[schemaId] || "";
  const filteredItems = filterItems(schemaId, items, query, status);
  const statusOptions = getStatusOptions(schemaId);
  const total = sum(filteredItems, "amount");

  return `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>${title}</h3>
          <span class="panel-subtitle">${filteredItems.length} registro${filteredItems.length === 1 ? "" : "s"} · ${money(total)}</span>
        </div>
        ${canCreate(schemaId) ? `<button type="button" data-new-finance="${schemaId}">Novo</button>` : ""}
      </div>
      <div class="finance-filters">
        <label class="search-field">
          Buscar
          <input type="search" data-finance-search="${schemaId}" value="${escapeHtml(query)}" placeholder="Filtrar lancamentos" />
        </label>
        <label class="filter-field">
          Status
          <select data-finance-status="${schemaId}">
            <option value="">Todos</option>
            ${statusOptions.map((option) => `<option value="${option}" ${option === status ? "selected" : ""}>${labelize(option)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="panel-body table-wrap">${renderTable(schemaId, filteredItems, true, query, status)}</div>
    </div>
  `;
}

function bindFinance() {
  content.querySelectorAll("[data-new-finance]").forEach((button) => {
    button.addEventListener("click", () => {
      const schemaId = button.dataset.newFinance;
      content.innerHTML = `
        <section class="panel">
          <div class="panel-header"><h3>Novo ${schemas[schemaId].label}</h3></div>
          <div class="panel-body">${renderForm(schemaId)}</div>
        </section>
      `;
      bindCrud(schemaId);
    });
  });
  content.querySelectorAll("[data-finance-search]").forEach((input) => {
    input.addEventListener("input", () => {
      listFilters[input.dataset.financeSearch] = input.value;
      renderFinance();
    });
  });
  content.querySelectorAll("[data-finance-status]").forEach((select) => {
    select.addEventListener("change", () => {
      statusFilters[select.dataset.financeStatus] = select.value;
      renderFinance();
    });
  });
  content.querySelectorAll("[data-clear-filters]").forEach((button) => {
    button.addEventListener("click", () => {
      listFilters[button.dataset.clearFilters] = "";
      statusFilters[button.dataset.clearFilters] = "";
      renderFinance();
    });
  });
  content.querySelectorAll("[data-new]").forEach((button) => {
    button.addEventListener("click", () => {
      const schemaId = button.dataset.new;
      content.innerHTML = `
        <section class="panel">
          <div class="panel-header"><h3>Novo ${schemas[schemaId].label}</h3></div>
          <div class="panel-body">${renderForm(schemaId)}</div>
        </section>
      `;
      bindCrud(schemaId);
    });
  });
  content.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => editItem(button.dataset.edit)));
  content.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteItem(button.dataset.delete)));
}

function renderReports() {
  const period = getReportPeriod();
  const financial = buildFinancialReport(period);
  const commercial = buildCommercialReport(period);
  const operational = buildOperationalReport(period);
  const registry = buildRegistryReport(period);
  const reports = [financial, commercial, operational, registry];
  const periodLabel = getReportPeriodLabel(period);

  content.innerHTML = `
    <section class="toolbar">
      <div>
        <p class="eyebrow">Analise</p>
        <h3>Relatorios executivos</h3>
        <p>${periodLabel}</p>
      </div>
      <div class="toolbar-actions">
        <button type="button" data-report-export="summary">Resumo executivo</button>
        <button type="button" class="secondary" data-report-export="indicators">Indicadores</button>
        <button type="button" class="secondary" data-report-export="consolidated">Consolidado</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header"><h3>Periodo de analise</h3><button type="button" class="secondary" data-clear-report-period>Limpar periodo</button></div>
      <div class="panel-body">
        <form class="form-grid compact-form" data-report-period>
          <label>
            <span class="field-label">Inicio</span>
            <input type="date" name="from" value="${escapeHtml(reportFilters.from)}" />
          </label>
          <label>
            <span class="field-label">Fim</span>
            <input type="date" name="to" value="${escapeHtml(reportFilters.to)}" />
          </label>
          <div class="toolbar-actions">
            <button type="submit">Aplicar</button>
          </div>
        </form>
      </div>
    </section>
    <section class="grid four-columns">
      ${reports.map((report) => `<article class="card kpi-card ${report.tone}"><span>${report.title}</span><strong>${report.value}</strong><p>${report.summary}</p></article>`).join("")}
    </section>
    <section class="panel">
      <div class="panel-header"><h3>Indicadores comerciais, financeiros e operacionais</h3></div>
      <div class="panel-body table-wrap">
        <table class="data-table">
          <thead><tr><th>Area</th><th>Indicador</th><th>Valor</th><th>Leitura</th></tr></thead>
          <tbody>
            ${renderReportRows(financial.rows)}
            ${renderReportRows(commercial.rows)}
            ${renderReportRows(operational.rows)}
            ${renderReportRows(registry.rows)}
          </tbody>
        </table>
      </div>
    </section>
    <section class="grid two-columns">
      <div class="panel">
        <div class="panel-header"><h3>Leitura rapida</h3></div>
        <div class="panel-body">${renderReportInsights(reports)}</div>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Exportacoes disponiveis</h3></div>
        <div class="panel-body quick-actions">
          <button type="button" data-report-export="financial">Financeiro</button>
          <button type="button" data-report-export="commercial">Comercial</button>
          <button type="button" data-report-export="operational">Operacional</button>
          <button type="button" data-report-export="registry">Cadastros</button>
          <button type="button" data-export="clients">Clientes</button>
          <button type="button" data-export="contracts">Contratos</button>
          <button type="button" data-export="suppliers">Fornecedores</button>
          <button type="button" data-export="projects">Projetos</button>
          <button type="button" data-export="tasks">Tarefas</button>
        </div>
      </div>
    </section>
  `;
  content.querySelector("[data-report-period]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    reportFilters.from = String(formData.get("from") || "");
    reportFilters.to = String(formData.get("to") || "");
    renderReports();
  });
  content.querySelector("[data-clear-report-period]")?.addEventListener("click", () => {
    reportFilters.from = "";
    reportFilters.to = "";
    renderReports();
  });
  content.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", () => exportCsv(button.dataset.export)));
  content.querySelectorAll("[data-report-export]").forEach((button) => button.addEventListener("click", () => exportReportCsv(button.dataset.reportExport, reports, period)));
}

function buildFinancialReport(period) {
  const receivables = filterByPeriod(state.receivables, ["dueDate", "receivedDate"], period);
  const payables = filterByPeriod(state.payables, ["dueDate", "paymentDate"], period);
  const revenue = sum(receivables, "amount");
  const expenses = sum(payables, "amount");
  const received = sum(receivables.filter((item) => item.status === "recebido"), "amount");
  const paid = sum(payables.filter((item) => item.status === "pago"), "amount");
  const overdue = payables.filter((item) => item.status === "pendente" && item.dueDate < today()).length;

  return {
    title: "Financeiro",
    value: money(received - paid),
    summary: `${money(revenue)} em receitas no periodo`,
    tone: received - paid >= 0 ? "kpi-success" : "kpi-danger",
    rows: [
      ["Financeiro", "Receita total cadastrada", money(revenue), "Soma de contas a receber"],
      ["Financeiro", "Despesa total cadastrada", money(expenses), "Soma de contas a pagar"],
      ["Financeiro", "Resultado realizado", money(received - paid), "Recebido menos pago"],
      ["Financeiro", "Contas a pagar vencidas", overdue, "Pendencias financeiras em atraso"]
    ]
  };
}

function buildCommercialReport(period) {
  const proposals = filterByPeriod(state.proposals, ["sentAt", "approvedAt", "validUntil"], period);
  const approved = proposals.filter((item) => item.status === "aprovada").length;
  const sent = proposals.filter((item) => item.status === "enviada").length;
  const total = proposals.length;
  const conversion = total ? Math.round((approved / total) * 100) : 0;
  const ticket = approved ? sum(proposals.filter((item) => item.status === "aprovada"), "amount") / approved : 0;

  return {
    title: "Comercial",
    value: `${conversion}%`,
    summary: `${approved} aprovada${approved === 1 ? "" : "s"} e ${sent} enviada${sent === 1 ? "" : "s"}`,
    tone: conversion >= 50 ? "kpi-success" : "kpi-warning",
    rows: [
      ["Comercial", "Propostas cadastradas", total, "Volume total de propostas"],
      ["Comercial", "Propostas enviadas", sent, "Propostas em negociacao"],
      ["Comercial", "Propostas aprovadas", approved, "Propostas convertidas"],
      ["Comercial", "Ticket medio aprovado", money(ticket), "Valor medio das propostas aprovadas"]
    ]
  };
}

function buildOperationalReport(period) {
  const projects = filterByPeriod(state.projects, ["startDate", "dueDate"], period);
  const tasks = filterByPeriod(state.tasks, ["dueDate", "completedAt"], period);
  const openProjects = projects.filter((item) => item.status === "em_andamento").length;
  const openTasks = tasks.filter((item) => !["concluida", "cancelada"].includes(item.status)).length;
  const completedTasks = tasks.filter((item) => item.status === "concluida").length;
  const productivity = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return {
    title: "Operacional",
    value: `${productivity}%`,
    summary: `${openProjects} projeto${openProjects === 1 ? "" : "s"} em andamento`,
    tone: productivity >= 50 ? "kpi-success" : "kpi-warning",
    rows: [
      ["Operacional", "Projetos em andamento", openProjects, "Projetos ativos na operacao"],
      ["Operacional", "Tarefas abertas", openTasks, "Trabalho pendente ou em andamento"],
      ["Operacional", "Tarefas concluidas", completedTasks, "Entregas finalizadas"],
      ["Operacional", "Produtividade por tarefa", `${productivity}%`, "Tarefas concluidas sobre total"]
    ]
  };
}

function buildRegistryReport(period) {
  const activeClients = state.clients.filter((item) => item.status === "ativo").length;
  const prospects = state.clients.filter((item) => item.status === "prospect").length;
  const activeSuppliers = state.suppliers.filter((item) => item.status === "ativo").length;
  const activeUsers = state.users.filter((item) => item.status === "ativo").length;
  const contracts = filterByPeriod(state.contracts, ["startDate", "endDate", "signedAt"], period);
  const activeContracts = contracts.filter((item) => item.status === "ativo").length;

  return {
    title: "Cadastros",
    value: activeClients,
    summary: `${activeContracts} contrato${activeContracts === 1 ? "" : "s"} ativo${activeContracts === 1 ? "" : "s"}`,
    tone: "kpi-neutral",
    rows: [
      ["Cadastros", "Clientes ativos", activeClients, "Clientes prontos para propostas e projetos"],
      ["Cadastros", "Prospects", prospects, "Oportunidades em acompanhamento"],
      ["Cadastros", "Contratos ativos", activeContracts, "Contratos vigentes com clientes"],
      ["Cadastros", "Fornecedores ativos", activeSuppliers, "Base de fornecedores disponivel"],
      ["Cadastros", "Usuarios ativos", activeUsers, "Pessoas com acesso ao sistema"]
    ]
  };
}

function getReportPeriod() {
  if (reportFilters.from && reportFilters.to && reportFilters.from > reportFilters.to) {
    return {
      from: reportFilters.to,
      to: reportFilters.from
    };
  }
  return {
    from: reportFilters.from,
    to: reportFilters.to
  };
}

function getReportPeriodLabel(period = getReportPeriod()) {
  if (period.from && period.to) return `Periodo: ${formatDate(period.from)} a ${formatDate(period.to)}`;
  if (period.from) return `Periodo: a partir de ${formatDate(period.from)}`;
  if (period.to) return `Periodo: ate ${formatDate(period.to)}`;
  return "Periodo: todos os dados cadastrados";
}

function filterByPeriod(items, dateFields, period = getReportPeriod()) {
  if (!period.from && !period.to) return items;
  return items.filter((item) => dateFields.some((field) => isDateInPeriod(item[field], period)));
}

function isDateInPeriod(value, period = getReportPeriod()) {
  if (!value) return false;
  if (period.from && value < period.from) return false;
  if (period.to && value > period.to) return false;
  return true;
}

function exportReportCsv(type, reports = [], period = getReportPeriod()) {
  const rows = buildReportExportRows(type, reports, period);
  if (!rows.length) {
    toast("Nao ha dados para exportar.");
    return;
  }
  downloadCsv(`${buildExportBaseName(`relatorio-${type}`, period)}.csv`, rows);
  toast("Relatorio exportado.");
}

function buildReportExportRows(type, reports, period = getReportPeriod()) {
  const periodLabel = getReportPeriodLabel(period);
  if (type === "summary") {
    return reports.map((report) => ({
      secao: "Resumo executivo",
      empresa: getCurrentTenant()?.name || "SANTUS",
      area: report.title,
      indicador: report.title,
      valor: report.value,
      leitura: report.summary,
      periodo: periodLabel,
      data: today()
    }));
  }

  if (type === "indicators") {
    return reports.flatMap((report) => report.rows.map(([area, indicator, value, reading]) => ({
      secao: "Indicadores",
      empresa: getCurrentTenant()?.name || "SANTUS",
      area,
      indicador: indicator,
      valor: value,
      leitura: reading,
      periodo: periodLabel,
      data: today()
    })));
  }

  if (type === "consolidated") {
    return [
      ...buildReportExportRows("summary", reports, period),
      ...buildReportExportRows("indicators", reports, period),
      ...buildFinancialDueRows(period),
      ...buildNotificationExportRows(period)
    ];
  }

  const reportNames = {
    financial: "Financeiro",
    commercial: "Comercial",
    operational: "Operacional",
    registry: "Cadastros"
  };
  const report = reports.find((item) => item.title === reportNames[type]);
  if (!report) return [];

  return report.rows.map(([area, indicator, value, reading]) => ({
      secao: report.title,
      empresa: getCurrentTenant()?.name || "SANTUS",
      area,
    indicador: indicator,
    valor: value,
    leitura: reading,
    periodo: periodLabel,
    data: today()
  }));
}

function buildFinancialDueRows(period = getReportPeriod()) {
  const payables = state.payables
    .filter((item) => item.status === "pendente" && isDateInPeriod(item.dueDate, period))
    .map((item) => ({
      secao: "Vencimentos",
      empresa: getCurrentTenant()?.name || "SANTUS",
      area: "Financeiro",
      indicador: "Conta a pagar",
      valor: money(item.amount),
      leitura: item.description,
      periodo: getReportPeriodLabel(period),
      data: item.dueDate
    }));
  const receivables = state.receivables
    .filter((item) => item.status === "pendente" && isDateInPeriod(item.dueDate, period))
    .map((item) => ({
      secao: "Vencimentos",
      empresa: getCurrentTenant()?.name || "SANTUS",
      area: "Financeiro",
      indicador: "Conta a receber",
      valor: money(item.amount),
      leitura: item.description,
      periodo: getReportPeriodLabel(period),
      data: item.dueDate
    }));

  return [...payables, ...receivables].sort((a, b) => String(a.data).localeCompare(String(b.data)));
}

function buildNotificationExportRows(period = getReportPeriod()) {
  return buildNotifications()
    .filter((notification) => isDateInPeriod(notification.date, period))
    .map((notification) => ({
    secao: "Notificacoes",
    empresa: getCurrentTenant()?.name || "SANTUS",
    area: notification.area,
    indicador: notification.title,
    valor: notification.tone === "danger" ? "Critico" : "Atencao",
    leitura: notification.detail,
    periodo: getReportPeriodLabel(period),
    data: notification.date
  }));
}

function renderReportRows(rows) {
  return rows.map(([area, indicator, value, reading]) => `<tr><td>${area}</td><td>${indicator}</td><td>${value}</td><td>${reading}</td></tr>`).join("");
}

function renderReportInsights(reports) {
  return `
    <div class="info-list">
      ${reports.map((report) => `
        <article class="info-item">
          <span class="status neutral">${report.title}</span>
          <p>${report.summary}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderNotifications() {
  const notifications = buildNotifications();
  const unread = getUnreadNotifications(notifications);
  const visibleNotifications = notificationFilters.status === "all" ? notifications : unread;
  const readCount = notifications.length - unread.length;
  const critical = unread.filter((item) => item.tone === "danger").length;
  const warnings = unread.filter((item) => item.tone === "warning").length;

  content.innerHTML = `
    <section class="grid kpi-grid">
      ${kpi("Nao lidas", unread.length, unread.length ? "warning" : "success")}
      ${kpi("Criticos", critical, critical ? "danger" : "success")}
      ${kpi("Atencao", warnings, warnings ? "warning" : "success")}
      ${kpi("Lidas", readCount, readCount ? "neutral" : "success")}
    </section>
    <section class="toolbar">
      <div>
        <p class="eyebrow">Monitoramento</p>
        <h3>Alertas financeiros, comerciais e operacionais</h3>
      </div>
      <div class="toolbar-actions">
        <button type="button" class="${notificationFilters.status === "unread" ? "" : "secondary"}" data-notification-filter="unread">Nao lidas</button>
        <button type="button" class="${notificationFilters.status === "all" ? "" : "secondary"}" data-notification-filter="all">Todas</button>
        <button type="button" class="secondary" data-mark-all-notifications ${unread.length ? "" : "disabled"}>Marcar todas como lidas</button>
        <button type="button" class="secondary" data-goto="finance">Financeiro</button>
        <button type="button" class="secondary" data-goto="proposals">Propostas</button>
        <button type="button" class="secondary" data-goto="tasks">Tarefas</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <h3>Notificacoes internas</h3>
        <span class="status ${critical ? "danger" : unread.length ? "warning" : "success"}">${visibleNotifications.length || "ok"}</span>
      </div>
      <div class="panel-body">${renderNotificationList(visibleNotifications)}</div>
    </section>
  `;
  bindGoToButtons();
  bindNotificationActions();
}

function renderNotificationList(notifications) {
  if (!notifications.length) {
    return `<div class="empty-state compact">Nenhuma notificacao para exibir.</div>`;
  }

  return `
    <div class="notification-list">
      ${notifications.map((notification) => `
        <article class="notification-item notification-${notification.tone} ${isNotificationRead(notification) ? "is-read" : ""}">
          <div>
            <span class="status ${notification.tone}">${notification.area}</span>
            <h4>${notification.title}</h4>
            <p>${notification.detail}</p>
          </div>
          <div class="toolbar-actions">
            ${isNotificationRead(notification) ? '<span class="status neutral">lida</span>' : `<button type="button" class="secondary" data-mark-notification="${notification.id}">Marcar como lida</button>`}
            <button type="button" class="secondary" data-goto="${notification.target}">Abrir</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function bindNotificationActions() {
  content.querySelectorAll("[data-notification-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      notificationFilters.status = button.dataset.notificationFilter;
      renderNotifications();
    });
  });
  content.querySelectorAll("[data-mark-notification]").forEach((button) => {
    button.addEventListener("click", () => markNotificationRead(button.dataset.markNotification));
  });
  content.querySelector("[data-mark-all-notifications]")?.addEventListener("click", async () => {
    const ids = getUnreadNotifications().map((notification) => notification.id);
    ids.forEach((id) => markNotificationRead(id, false));
    saveState({ syncApi: false });
    await saveNotificationReadsToApi(ids);
    updateNotificationSummary();
    renderNotifications();
    toast("Notificacoes marcadas como lidas.");
  });
}

async function markNotificationRead(id, shouldRender = true) {
  if (!id || state.notificationReads.includes(id)) return;
  state.notificationReads.push(id);
  state.notificationReads = state.notificationReads.slice(-500);
  if (shouldRender) {
    saveState({ syncApi: false });
    await saveNotificationReadsToApi([id]);
    updateNotificationSummary();
    renderNotifications();
    toast("Notificacao marcada como lida.");
  }
}

function renderAutomations() {
  const rules = buildAutomationRules();
  const totalCandidates = rules.reduce((total, rule) => total + rule.items.length, 0);
  const totalPending = rules.reduce((total, rule) => total + rule.pendingItems.length, 0);
  const totalGenerated = rules.reduce((total, rule) => total + rule.generatedCount, 0);
  const automationContext = {
    canCreateTasks: canCreate("tasks"),
    hasProject: Boolean(getAutomationDefaultProjectId())
  };

  content.innerHTML = `
    <section class="grid three-columns">
      ${kpi("Oportunidades detectadas", totalCandidates, totalCandidates ? "warning" : "success")}
      ${kpi("Tarefas a gerar", totalPending, totalPending ? "danger" : "success")}
      ${kpi("Ja automatizadas", totalGenerated, "neutral")}
    </section>
    <section class="toolbar">
      <div>
        <p class="eyebrow">Fase 3</p>
        <h3>Central de automacoes</h3>
        <p>Analise vencimentos e gere tarefas de acompanhamento com rastreio automatico.</p>
      </div>
      <div class="toolbar-actions">
        <button type="button" class="secondary" data-goto="tasks">Ver tarefas</button>
        <button type="button" class="secondary" data-goto="notifications">Ver notificacoes</button>
      </div>
    </section>
    <section class="automation-grid">
      ${rules.map((rule) => renderAutomationRule(rule, automationContext)).join("")}
    </section>
  `;
  bindAutomations();
  bindGoToButtons();
}

function renderAutomationRule(rule, context) {
  const disabled = rule.disabledBySettings || !rule.pendingItems.length || !context.canCreateTasks || !context.hasProject;
  const reason = rule.disabledBySettings
    ? "Regra desativada nas configuracoes da empresa."
    : !context.canCreateTasks
    ? "Seu perfil pode visualizar esta automacao, mas nao pode criar tarefas."
    : !context.hasProject
      ? "Cadastre um projeto antes de gerar tarefas automaticas."
    : rule.pendingItems.length
      ? `${rule.pendingItems.length} tarefa${rule.pendingItems.length === 1 ? "" : "s"} pronta${rule.pendingItems.length === 1 ? "" : "s"} para geracao.`
      : "Nada pendente para gerar agora.";

  return `
    <article class="panel automation-card">
      <div class="panel-header">
        <div>
          <span class="status ${rule.tone}">${rule.area}</span>
          <h3>${rule.title}</h3>
          <span class="panel-subtitle">${reason}</span>
        </div>
        <button type="button" data-run-automation="${rule.id}" ${disabled ? "disabled" : ""}>Gerar tarefas</button>
      </div>
      <div class="panel-body">
        <p>${rule.description}</p>
        ${renderAutomationItems(rule)}
      </div>
    </article>
  `;
}

function renderAutomationItems(rule) {
  if (!rule.items.length) {
    return `<div class="empty-state compact">Nenhuma ocorrencia encontrada para esta regra.</div>`;
  }

  return `
    <div class="info-list automation-items">
      ${rule.items.slice(0, 6).map((item) => {
        const generated = automationTaskExists(item.key);
        return `
          <article class="info-item split">
            <div>
              <strong>${escapeHtml(item.recordLabel)}</strong>
              <span>${escapeHtml(item.title)} · prazo ${formatDate(item.dueDate)}</span>
            </div>
            <span class="status ${generated ? "success" : "warning"}">${generated ? "gerada" : "pendente"}</span>
          </article>
        `;
      }).join("")}
      ${rule.items.length > 6 ? `<p class="panel-subtitle">Mais ${rule.items.length - 6} ocorrencia${rule.items.length - 6 === 1 ? "" : "s"} nesta regra.</p>` : ""}
    </div>
  `;
}

function bindAutomations() {
  content.querySelectorAll("[data-run-automation]").forEach((button) => {
    button.addEventListener("click", () => runAutomation(button.dataset.runAutomation));
  });
}

async function runAutomation(ruleId) {
  if (!canCreate("tasks")) {
    toast("Seu perfil nao possui permissao para criar tarefas.");
    return;
  }

  const projectId = getAutomationDefaultProjectId();
  if (!projectId) {
    toast("Cadastre um projeto antes de gerar tarefas automaticas.");
    return;
  }

  const rule = buildAutomationRules().find((item) => item.id === ruleId);
  if (!rule || !rule.pendingItems.length) {
    toast("Nao ha tarefas pendentes para esta automacao.");
    renderAutomations();
    return;
  }

  const previousTasks = state.tasks.map((task) => ({ ...task }));
  let created = 0;

  for (const item of rule.pendingItems) {
    const task = {
      id: uid(),
      projectId,
      title: item.title,
      description: `${item.description}\n${item.key}`,
      responsibleId: state.session?.userId || state.users[0]?.id || "",
      priority: item.priority,
      status: "pendente",
      dueDate: item.dueDate,
      completedAt: ""
    };
    state.tasks.push(task);
    await saveRecordToApi("tasks", task, false);
    if (lastApiError) {
      state.tasks = previousTasks;
      if (lastApiError.status === 401) return;
      toast(apiErrorMessage("Nao foi possivel executar a automacao."));
      renderAutomations();
      return;
    }
    created += 1;
  }

  saveState();
  toast(`${created} tarefa${created === 1 ? "" : "s"} gerada${created === 1 ? "" : "s"} pela automacao.`);
  renderAutomations();
}

function getAutomationDefaultProjectId() {
  return state.projects.find((project) => !["concluido", "cancelado"].includes(project.status))?.id
    || state.projects[0]?.id
    || "";
}

function renderActivity() {
  const logs = Array.isArray(state.auditLogs) ? state.auditLogs : [];
  const visibleLogs = getVisibleActivityLogs(logs);
  const totalCount = getActivityTotalCount(logs);
  const summary = getActivitySummary(logs);
  const collections = activityPaging.loadedFromApi && activityPaging.collections.length ? activityPaging.collections : getActivityCollections(logs);
  content.innerHTML = `
    <section class="grid kpi-grid">
      ${activityKpi("Atividades", "total", summary.total || totalCount, totalCount ? "neutral" : "success")}
      ${activityKpi("Criacoes", "created", summary.created, "success")}
      ${activityKpi("Edicoes", "updated", summary.updated, "warning")}
      ${activityKpi("Exclusoes", "deleted", summary.deleted, summary.deleted ? "danger" : "success")}
      ${activityKpi("Negadas", "denied", summary.denied, summary.denied ? "danger" : "success")}
    </section>
    <section class="toolbar">
      <div>
        <p class="eyebrow">Auditoria</p>
        <h3 data-activity-title>${activityTitle(visibleLogs.length, totalCount)}</h3>
      </div>
      <div class="toolbar-actions">
        <button type="button" class="secondary" data-refresh-activity>Atualizar</button>
        <button type="button" class="secondary" data-export-activity>Exportar CSV</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header"><h3>Filtros</h3><button type="button" class="secondary" data-clear-activity-filters>Limpar filtros</button></div>
      <div class="finance-filters">
        <label class="search-field">
          Buscar
          <input type="search" data-activity-search value="${escapeHtml(activityFilters.query)}" placeholder="Registro, usuario ou campo alterado" />
        </label>
        <label class="filter-field">
          Acao
          <select data-activity-action>
            <option value="">Todas</option>
            ${["created", "updated", "deleted", "denied", "login", "logout", "login_failed", "password_reset_requested", "password_reset_completed", "data_exported", "data_anonymized"].map((action) => `<option value="${action}" ${activityFilters.action === action ? "selected" : ""}>${activityActionLabel(action)}</option>`).join("")}
          </select>
        </label>
        <label class="filter-field">
          Modulo
          <select data-activity-collection>
            <option value="">Todos</option>
            ${collections.map((collection) => `<option value="${collection}" ${activityFilters.collection === collection ? "selected" : ""}>${activityCollectionLabel(collection)}</option>`).join("")}
          </select>
        </label>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <h3>Eventos recentes</h3>
        <span class="status neutral" data-activity-counter>${activityCounterText(visibleLogs.length, totalCount)}</span>
      </div>
      <div class="panel-body table-wrap" data-activity-table>${renderActivityTable(visibleLogs)}</div>
      <div class="panel-footer" data-activity-pagination>${renderActivityPagination()}</div>
    </section>
  `;
  bindActivity();
  refreshActivityLog();
}

function activityKpi(label, key, value, tone = "neutral") {
  return `<article class="card kpi-card kpi-${tone}"><span>${label}</span><strong data-activity-summary="${key}">${value}</strong></article>`;
}

function bindActivity() {
  content.querySelector("[data-refresh-activity]")?.addEventListener("click", refreshActivityLog);
  content.querySelector("[data-export-activity]")?.addEventListener("click", exportActivityCsv);
  content.querySelector("[data-activity-search]")?.addEventListener("input", (event) => {
    activityFilters.query = event.target.value;
    activityPaging.page = 1;
    refreshActivityLog();
  });
  content.querySelector("[data-activity-action]")?.addEventListener("change", (event) => {
    activityFilters.action = event.target.value;
    activityPaging.page = 1;
    refreshActivityLog();
  });
  content.querySelector("[data-activity-collection]")?.addEventListener("change", (event) => {
    activityFilters.collection = event.target.value;
    activityPaging.page = 1;
    refreshActivityLog();
  });
  content.querySelector("[data-clear-activity-filters]")?.addEventListener("click", () => {
    activityFilters.query = "";
    activityFilters.action = "";
    activityFilters.collection = "";
    activityPaging.page = 1;
    renderActivity();
  });
  bindActivityPagination();
}

async function refreshActivityLog() {
  const result = await loadActivityLog();
  if (!result) {
    if (lastApiError) {
      if (lastApiError.status === 401) return;
      toast(apiErrorMessage("Nao foi possivel atualizar o historico."));
    }
    return;
  }
  if (Array.isArray(result)) {
    activityPaging.loadedFromApi = false;
    state.auditLogs = result;
  } else {
    activityPaging.loadedFromApi = true;
    activityPaging.page = result.page || 1;
    activityPaging.pageSize = result.pageSize || activityPaging.pageSize;
    activityPaging.total = result.total || 0;
    activityPaging.totalPages = result.totalPages || 1;
    activityPaging.summary = result.summary || { total: result.total || 0, created: 0, updated: 0, deleted: 0, denied: 0 };
    activityPaging.collections = Array.isArray(result.collections) ? result.collections : [];
    state.auditLogs = Array.isArray(result.items) ? result.items : [];
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(getPersistableState(state)));
  refreshActivityView();
}

function refreshActivityView() {
  const logs = Array.isArray(state.auditLogs) ? state.auditLogs : [];
  const visibleLogs = getVisibleActivityLogs(logs);
  const totalCount = getActivityTotalCount(logs);
  const summary = getActivitySummary(logs);
  const table = content.querySelector("[data-activity-table]");
  const title = content.querySelector("[data-activity-title]");
  const counter = content.querySelector("[data-activity-counter]");
  const pagination = content.querySelector("[data-activity-pagination]");
  if (table) table.innerHTML = renderActivityTable(visibleLogs);
  if (title) title.textContent = activityTitle(visibleLogs.length, totalCount);
  if (counter) counter.textContent = activityCounterText(visibleLogs.length, totalCount);
  if (pagination) pagination.innerHTML = renderActivityPagination();
  updateActivitySummary("total", summary.total || totalCount);
  updateActivitySummary("created", summary.created);
  updateActivitySummary("updated", summary.updated);
  updateActivitySummary("deleted", summary.deleted);
  updateActivitySummary("denied", summary.denied);
  bindActivityPagination();
}

function updateActivitySummary(key, value) {
  const element = content.querySelector(`[data-activity-summary="${key}"]`);
  if (element) element.textContent = value;
}

function getVisibleActivityLogs(logs) {
  return activityPaging.loadedFromApi ? logs : filterActivityLogs(logs);
}

function getActivityTotalCount(logs) {
  return activityPaging.loadedFromApi ? activityPaging.total : logs.length;
}

function getActivitySummary(logs) {
  return activityPaging.loadedFromApi ? activityPaging.summary : summarizeActivityLogs(logs);
}

function activityTitle(filteredCount, totalCount) {
  const label = totalCount === 1 ? "atividade registrada" : "atividades registradas";
  return filteredCount === totalCount ? `${totalCount} ${label}` : `${filteredCount} de ${totalCount} ${label}`;
}

function activityCounterText(visibleCount, totalCount) {
  if (!activityPaging.loadedFromApi) {
    return `${visibleCount} de ${totalCount}`;
  }
  return `Pagina ${activityPaging.page} de ${activityPaging.totalPages} · ${totalCount} evento${totalCount === 1 ? "" : "s"}`;
}

function renderActivityPagination() {
  if (!activityPaging.loadedFromApi) {
    return "";
  }

  return `
    <div class="pagination">
      <button type="button" class="secondary" data-activity-page="${activityPaging.page - 1}" ${activityPaging.page <= 1 ? "disabled" : ""}>Anterior</button>
      <span>Pagina ${activityPaging.page} de ${activityPaging.totalPages}</span>
      <label>
        Itens
        <select data-activity-page-size>
          ${[10, 20, 50, 100].map((size) => `<option value="${size}" ${activityPaging.pageSize === size ? "selected" : ""}>${size}</option>`).join("")}
        </select>
      </label>
      <button type="button" class="secondary" data-activity-page="${activityPaging.page + 1}" ${activityPaging.page >= activityPaging.totalPages ? "disabled" : ""}>Proxima</button>
    </div>
  `;
}

function bindActivityPagination() {
  content.querySelectorAll("[data-activity-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const page = Number(button.dataset.activityPage);
      if (!Number.isFinite(page) || page < 1 || page > activityPaging.totalPages) return;
      activityPaging.page = page;
      refreshActivityLog();
    });
  });
  content.querySelector("[data-activity-page-size]")?.addEventListener("change", (event) => {
    activityPaging.pageSize = Number(event.target.value) || 20;
    activityPaging.page = 1;
    refreshActivityLog();
  });
}

function summarizeActivityLogs(logs) {
  return logs.reduce((summary, log) => {
    summary[log.action] = (summary[log.action] || 0) + 1;
    summary.total += 1;
    return summary;
  }, { total: 0, created: 0, updated: 0, deleted: 0, denied: 0 });
}

function filterActivityLogs(logs) {
  const query = normalizeText(activityFilters.query);
  return logs.filter((log) => {
    const matchesAction = !activityFilters.action || log.action === activityFilters.action;
    const matchesCollection = !activityFilters.collection || log.collection === activityFilters.collection;
    const searchable = [
      log.recordLabel,
      log.recordId,
      log.actorName,
      log.actorRole,
      log.metadata?.ip,
      log.metadata?.userAgent,
      log.deniedReason,
      activityActionLabel(log.action),
      activityCollectionLabel(log.collection),
      formatChangedFields(log.changedFields)
    ].join(" ");
    const matchesQuery = !query || normalizeText(searchable).includes(query);
    return matchesAction && matchesCollection && matchesQuery;
  });
}

function getActivityCollections(logs) {
  return [...new Set(logs.map((log) => log.collection).filter(Boolean))]
    .sort((a, b) => activityCollectionLabel(a).localeCompare(activityCollectionLabel(b), "pt-BR"));
}

async function exportActivityCsv() {
  const apiLogs = await loadActivityLog({ exportAll: true });
  const logs = Array.isArray(apiLogs?.items)
    ? apiLogs.items
    : filterActivityLogs(Array.isArray(state.auditLogs) ? state.auditLogs : []);
  if (!logs.length) {
    toast("Nao ha dados para exportar.");
    return;
  }
  downloadCsv("santuserp-auditoria.csv", logs.map((log) => ({
    data: formatDateTime(log.createdAt),
    acao: activityActionLabel(log.action),
    modulo: activityCollectionLabel(log.collection),
    registro: log.recordLabel || log.recordId || "-",
    usuario: log.actorName || "Usuario local",
    perfil: roleLabels[log.actorRole] || log.actorRole || "-",
    campos: formatChangedFields(log.changedFields),
    ip: log.metadata?.ip || "",
    origem: log.metadata?.origin || "",
    agente: log.metadata?.userAgent || "",
    motivo_negacao: log.deniedReason || "",
    leitura: activityReading(log, false)
  })));
  toast("Auditoria exportada.");
}

async function loadActivityLog(options = {}) {
  if (!location.protocol.startsWith("http")) {
    return null;
  }

  const params = new URLSearchParams();
  if (activityFilters.query) params.set("query", activityFilters.query);
  if (activityFilters.action) params.set("action", activityFilters.action);
  if (activityFilters.collection) params.set("collection", activityFilters.collection);
  if (options.exportAll) {
    params.set("export", "all");
  } else {
    params.set("page", String(activityPaging.page));
    params.set("pageSize", String(activityPaging.pageSize));
  }

  return apiRequest(`/api/activity-log?${params.toString()}`, { method: "GET", cache: "no-store" });
}

function renderActivityTable(logs) {
  if (!logs.length) {
    return `
      <div class="empty-state">
        <h3>Nenhuma atividade encontrada</h3>
        <p>Atualize o historico ou ajuste os filtros para consultar outros eventos.</p>
      </div>
    `;
  }

  return `
    <table class="data-table responsive-table">
      <thead>
        <tr><th>Data</th><th>Acao</th><th>Modulo</th><th>Registro</th><th>Usuario</th><th>Campos</th><th>Leitura</th></tr>
      </thead>
      <tbody>
        ${logs.map((log) => `
          <tr>
            <td data-label="Data">${formatDateTime(log.createdAt)}</td>
            <td data-label="Acao"><span class="status ${activityTone(log.action)}">${activityActionLabel(log.action)}</span></td>
            <td data-label="Modulo">${activityCollectionLabel(log.collection)}</td>
            <td data-label="Registro">${escapeHtml(log.recordLabel || log.recordId || "-")}</td>
            <td data-label="Usuario">${escapeHtml(log.actorName || "Usuario local")}</td>
            <td data-label="Campos">${formatChangedFields(log.changedFields)}</td>
            <td data-label="Leitura">${activityReading(log)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function activityTone(action) {
  if (action === "created") return "success";
  if (action === "updated") return "warning";
  if (action === "deleted") return "danger";
  if (action === "denied") return "danger";
  if (action === "login") return "success";
  if (action === "logout") return "neutral";
  if (action === "login_failed") return "danger";
  if (action === "password_reset_requested") return "warning";
  if (action === "password_reset_completed") return "success";
  if (action === "data_exported") return "neutral";
  if (action === "data_anonymized") return "warning";
  return "neutral";
}

function activityActionLabel(action) {
  const labels = {
    created: "Criado",
    updated: "Atualizado",
    deleted: "Excluido",
    denied: "Negado",
    login: "Login",
    logout: "Logout",
    login_failed: "Falha de login",
    password_reset_requested: "Reset solicitado",
    password_reset_completed: "Senha redefinida",
    data_exported: "Dados exportados",
    data_anonymized: "Dados anonimizados"
  };
  return labels[action] || labelize(action);
}

function activityCollectionLabel(collection) {
  const labels = {
    users: "Usuarios",
    clients: "Clientes",
    suppliers: "Fornecedores",
    categories: "Categorias",
    payables: "Contas a pagar",
    receivables: "Contas a receber",
    proposals: "Propostas",
    contracts: "Contratos",
    projects: "Projetos",
    tasks: "Tarefas",
    auth: "Autenticacao",
    compliance: "Compliance"
  };
  return labels[collection] || labelize(collection);
}

function formatChangedFields(fields) {
  return Array.isArray(fields) && fields.length ? fields.map(columnLabel).join(", ") : "-";
}

function activityReading(log, escaped = true) {
  if (log.action === "denied") {
    const cleanDenied = escaped ? escapeHtml : (value) => String(value || "");
    const actorDenied = cleanDenied(log.actorName || "Usuario local");
    const collectionDenied = activityCollectionLabel(log.collection).toLowerCase();
    const reason = cleanDenied(log.deniedReason || "Acao bloqueada.");
    return `${actorDenied} teve uma acao negada em ${collectionDenied}. Motivo: ${reason}`;
  }
  const action = activityActionLabel(log.action).toLowerCase();
  const clean = escaped ? escapeHtml : (value) => String(value || "");
  const record = clean(log.recordLabel || log.recordId || "registro");
  const collection = activityCollectionLabel(log.collection).toLowerCase();
  const actor = clean(log.actorName || "Usuario local");
  const fields = Array.isArray(log.changedFields) && log.changedFields.length ? ` Campos: ${formatChangedFields(log.changedFields)}.` : "";
  return `${actor} ${action} ${record} em ${collection}.${fields}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Number(seconds || 0));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = Math.floor(totalSeconds % 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

function renderSettings() {
  const tenant = getCurrentTenant();
  const settings = getTenantSettings();
  const clientOptions = state.clients
    .slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"))
    .map((client) => `<option value="${client.id}">${escapeHtml(client.name)} - ${escapeHtml(client.document || "sem documento")}</option>`)
    .join("");
  content.innerHTML = `
    <section class="grid two-columns">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Perfil da empresa</h3>
            <span class="panel-subtitle">Dados usados na sessao, relatórios e operacao diaria</span>
          </div>
        </div>
        <div class="panel-body">
          <form class="form-grid" data-company-profile novalidate>
            <div class="form-alert full hidden" data-form-alert></div>
            <label>
              <span class="field-label">Nome da empresa<small>Obrigatorio</small></span>
              <input name="name" value="${escapeHtml(tenant?.name || "")}" required />
            </label>
            <label>
              <span class="field-label">CNPJ/Documento<small>Obrigatorio</small></span>
              <input name="document" value="${escapeHtml(tenant?.document || "")}" required />
            </label>
            <label>
              E-mail
              <input name="email" type="email" value="${escapeHtml(tenant?.email || "")}" />
            </label>
            <label>
              Telefone
              <input name="phone" value="${escapeHtml(tenant?.phone || "")}" />
            </label>
            <label class="full">
              Observacoes
              <textarea name="notes">${escapeHtml(tenant?.notes || "")}</textarea>
            </label>
            <div class="full toolbar-actions">
              <button type="submit">Salvar perfil</button>
            </div>
          </form>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Preferencias</h3>
            <span class="panel-subtitle">Ajustes visuais e de navegacao para esta empresa</span>
          </div>
        </div>
        <div class="panel-body">
          <form class="form-grid" data-company-preferences>
            <label>
              Registros por pagina
              <select name="defaultPageSize">
                ${[10, 20, 50].map((size) => `<option value="${size}" ${settings.defaultPageSize === size ? "selected" : ""}>${size}</option>`).join("")}
              </select>
            </label>
            <label>
              Foco do dashboard
              <select name="dashboardFocus">
                <option value="executivo" ${settings.dashboardFocus === "executivo" ? "selected" : ""}>Executivo</option>
                <option value="financeiro" ${settings.dashboardFocus === "financeiro" ? "selected" : ""}>Financeiro</option>
                <option value="operacional" ${settings.dashboardFocus === "operacional" ? "selected" : ""}>Operacional</option>
              </select>
            </label>
            <label class="preference-toggle full">
              <input type="checkbox" name="compactTables" ${settings.compactTables ? "checked" : ""} />
              <span>Tabelas compactas</span>
            </label>
            <label class="preference-toggle full">
              <input type="checkbox" name="onboardingCompleted" ${settings.onboardingCompleted ? "checked" : ""} />
              <span>Onboarding concluido</span>
            </label>
            <div class="full settings-divider">
              <strong>Notificacoes</strong>
            </div>
            <label class="preference-toggle">
              <input type="checkbox" name="notifyFinance" ${settings.notifications.finance ? "checked" : ""} />
              <span>Financeiro</span>
            </label>
            <label class="preference-toggle">
              <input type="checkbox" name="notifyCommercial" ${settings.notifications.commercial ? "checked" : ""} />
              <span>Comercial</span>
            </label>
            <label class="preference-toggle">
              <input type="checkbox" name="notifyOperations" ${settings.notifications.operations ? "checked" : ""} />
              <span>Operacional</span>
            </label>
            <label class="preference-toggle">
              <input type="checkbox" name="notifyContracts" ${settings.notifications.contracts ? "checked" : ""} />
              <span>Contratos</span>
            </label>
            <label>
              Antecedencia de alertas
              <input name="notificationWarningDays" type="number" min="1" max="30" value="${settings.notifications.warningDays}" />
            </label>
            <div class="full settings-divider">
              <strong>Automacoes</strong>
            </div>
            <label class="preference-toggle">
              <input type="checkbox" name="automationFinance" ${settings.automations.finance ? "checked" : ""} />
              <span>Financeiro</span>
            </label>
            <label class="preference-toggle">
              <input type="checkbox" name="automationCommercial" ${settings.automations.commercial ? "checked" : ""} />
              <span>Comercial</span>
            </label>
            <label class="preference-toggle">
              <input type="checkbox" name="automationContracts" ${settings.automations.contracts ? "checked" : ""} />
              <span>Contratos</span>
            </label>
            <label>
              Prazo propostas
              <input name="proposalWarningDays" type="number" min="1" max="30" value="${settings.automations.proposalWarningDays}" />
            </label>
            <label>
              Prazo contratos
              <input name="contractWarningDays" type="number" min="1" max="60" value="${settings.automations.contractWarningDays}" />
            </label>
            <div class="full toolbar-actions">
              <button type="submit">Salvar preferencias</button>
            </div>
          </form>
        </div>
      </section>
    </section>
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Guia rapido</h3>
          <span class="panel-subtitle">Ordem recomendada para preparar uma empresa real</span>
        </div>
      </div>
      <div class="panel-body guide-grid">
        ${getOnboardingSteps().map((step) => `
          <article class="guide-item ${step.done ? "is-done" : ""}">
            <span class="status ${step.done ? "success" : "warning"}">${step.done ? "OK" : "Pendente"}</span>
            <strong>${step.title}</strong>
            <p>${step.detail}</p>
            <button type="button" class="secondary" data-goto="${step.target}">${step.action}</button>
          </article>
        `).join("")}
      </div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Painel administrativo do cliente</h3>
          <span class="panel-subtitle">Resumo de conta, acesso e operacao</span>
        </div>
      </div>
      <div class="panel-body">${renderClientAdminPanel()}</div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Convite de usuario</h3>
          <span class="panel-subtitle">Cria acesso inicial com senha provisoria forte</span>
        </div>
      </div>
      <div class="panel-body">
        <form class="form-grid" data-user-invite novalidate>
          <div class="form-alert full hidden" data-form-alert></div>
          <label>
            Nome
            <input name="name" required />
          </label>
          <label>
            E-mail
            <input name="email" type="email" required />
          </label>
          <label>
            Perfil
            <select name="role">
              ${Object.entries(roleLabels).filter(([role]) => role !== "admin").map(([role, label]) => `<option value="${role}">${label}</option>`).join("")}
            </select>
          </label>
          <div class="full toolbar-actions">
            <button type="submit">Gerar convite</button>
          </div>
        </form>
        <div class="invite-result hidden" data-invite-result></div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Compliance e LGPD</h3>
          <span class="panel-subtitle">Exportacao de dados e anonimizacao controlada de cliente</span>
        </div>
      </div>
      <div class="panel-body form-grid">
        <div class="form-field full">
          <label>Exportacao da empresa</label>
          <button type="button" class="secondary" id="complianceExportButton">Exportar dados JSON</button>
        </div>
        <label class="form-field">
          Cliente
          <select id="complianceClientSelect">
            <option value="">Selecione</option>
            ${clientOptions}
          </select>
        </label>
        <label class="form-field">
          Confirmacao
          <input id="complianceConfirmInput" placeholder="Digite ANONYMIZE" />
        </label>
        <div class="form-field full">
          <button type="button" class="danger" id="complianceAnonymizeButton">Anonimizar cliente</button>
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Saude do sistema</h3>
          <span class="panel-subtitle">API local, persistencia e volume de registros</span>
        </div>
        <button type="button" class="secondary" id="healthRefreshButton">Atualizar</button>
      </div>
      <div class="panel-body" id="healthStatus">
        ${renderHealthStatus()}
      </div>
    </section>
    <section class="panel">
      <div class="panel-header"><h3>Manutencao local</h3></div>
      <div class="panel-body toolbar-actions">
        <button type="button" class="secondary" id="seedButton">Restaurar dados demonstrativos</button>
      </div>
    </section>
  `;
  content.querySelector("[data-company-profile]").addEventListener("submit", saveCompanyProfileForm);
  content.querySelector("[data-company-preferences]").addEventListener("submit", saveCompanyPreferencesForm);
  content.querySelector("[data-user-invite]").addEventListener("submit", createUserInvite);
  document.querySelector("#seedButton").addEventListener("click", () => {
    state = structuredClone(initialData);
    hydrateReferences();
    state.session = { userId: state.users[0].id, loggedAt: new Date().toISOString() };
    saveState();
    toast("Dados demonstrativos restaurados.");
    navigate("dashboard");
  });
  document.querySelector("#healthRefreshButton").addEventListener("click", loadHealthStatus);
  document.querySelector("#complianceExportButton").addEventListener("click", exportComplianceData);
  document.querySelector("#complianceAnonymizeButton").addEventListener("click", anonymizeComplianceClient);
  bindGoToButtons();
  loadHealthStatus();
}

function renderClientAdminPanel() {
  const activeUsers = state.users.filter((user) => user.status === "ativo").length;
  const activeClients = state.clients.filter((client) => client.status === "ativo").length;
  const openProjects = state.projects.filter((project) => ["planejado", "em_andamento", "pausado"].includes(project.status)).length;
  const unreadNotifications = getUnreadNotifications().length;
  const settings = getTenantSettings();
  return `
    <div class="health-grid">
      <div class="health-item"><span>Usuarios ativos</span><strong>${activeUsers}</strong></div>
      <div class="health-item"><span>Clientes ativos</span><strong>${activeClients}</strong></div>
      <div class="health-item"><span>Projetos abertos</span><strong>${openProjects}</strong></div>
      <div class="health-item"><span>Notificacoes</span><strong>${unreadNotifications}</strong></div>
      <div class="health-item"><span>Automacoes</span><strong>${[settings.automations.finance, settings.automations.commercial, settings.automations.contracts].filter(Boolean).length}/3</strong></div>
      <div class="health-item"><span>Alertas</span><strong>${[settings.notifications.finance, settings.notifications.commercial, settings.notifications.operations, settings.notifications.contracts].filter(Boolean).length}/4</strong></div>
    </div>
  `;
}

async function saveCompanyProfileForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  if (!String(payload.name || "").trim() || !String(payload.document || "").trim()) {
    showFormError(form, "Nome da empresa e documento sao obrigatorios.");
    return;
  }

  await withBusyButton(form.querySelector('button[type="submit"]'), "Salvando...", async () => {
    const result = await saveCompanyProfile({
      ...payload,
      status: getCurrentTenant()?.status || "ativo",
      settings: getTenantSettings()
    });
    if (!result) {
      showFormError(form, apiErrorMessage("Nao foi possivel salvar o perfil da empresa."));
      return;
    }
    applyTenantPreferences();
    renderNavigation();
    toast("Perfil da empresa atualizado.");
  });
}

async function saveCompanyPreferencesForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  await withBusyButton(form.querySelector('button[type="submit"]'), "Salvando...", async () => {
    const result = await updateTenantSettings({
      defaultPageSize: Number(formData.get("defaultPageSize") || 10),
      dashboardFocus: String(formData.get("dashboardFocus") || "executivo"),
      compactTables: formData.has("compactTables"),
      onboardingCompleted: formData.has("onboardingCompleted"),
      notifications: {
        finance: formData.has("notifyFinance"),
        commercial: formData.has("notifyCommercial"),
        operations: formData.has("notifyOperations"),
        contracts: formData.has("notifyContracts"),
        warningDays: Number(formData.get("notificationWarningDays") || 7)
      },
      automations: {
        finance: formData.has("automationFinance"),
        commercial: formData.has("automationCommercial"),
        contracts: formData.has("automationContracts"),
        proposalWarningDays: Number(formData.get("proposalWarningDays") || 7),
        contractWarningDays: Number(formData.get("contractWarningDays") || 15)
      }
    });
    if (!result) {
      toast(apiErrorMessage("Nao foi possivel salvar as preferencias."));
      return;
    }
    Object.keys(listPaging).forEach((key) => {
      listPaging[key] = { page: 1, pageSize: getTenantSettings().defaultPageSize };
    });
    applyTenantPreferences();
    toast("Preferencias salvas.");
    renderSettings();
  });
}

async function createUserInvite(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const resultBox = content.querySelector("[data-invite-result]");
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "colaborador");

  if (!name || !email) {
    showFormError(form, "Nome e e-mail sao obrigatorios para gerar convite.");
    return;
  }
  if (state.users.some((user) => String(user.email || "").toLowerCase() === email)) {
    showFormError(form, "Ja existe um usuario com este e-mail.");
    return;
  }

  const password = generateTemporaryPassword();
  const user = {
    tenantId: getCurrentTenant()?.id || state.session?.tenantId || "tenant_santus",
    name,
    email,
    password,
    role,
    status: "ativo"
  };

  await withBusyButton(form.querySelector('button[type="submit"]'), "Gerando...", async () => {
    const saved = await saveRecordToApi("users", user, false);
    if (!saved) {
      showFormError(form, apiErrorMessage("Nao foi possivel gerar o convite."));
      return;
    }
    state.users.push(saved);
    saveState({ syncApi: false });
    form.reset();
    resultBox.classList.remove("hidden");
    resultBox.innerHTML = `
      <strong>Convite pronto</strong>
      <p>Envie estes dados por um canal seguro e oriente a troca de senha no primeiro acesso.</p>
      <dl>
        <dt>URL</dt><dd>${escapeHtml(location.origin || "http://127.0.0.1:4173")}</dd>
        <dt>E-mail</dt><dd>${escapeHtml(email)}</dd>
        <dt>Senha provisoria</dt><dd>${escapeHtml(password)}</dd>
        <dt>Perfil</dt><dd>${escapeHtml(roleLabels[role] || role)}</dd>
      </dl>
    `;
    toast("Convite gerado.");
  });
}

function generateTemporaryPassword() {
  const chunk = Math.random().toString(36).slice(2, 8);
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `Acesso#${digits}${chunk}Z`;
}

async function exportComplianceData() {
  const payload = await apiRequest(API_COMPLIANCE_EXPORT_URL, { method: "GET", cache: "no-store" });
  if (!payload) {
    toast(apiErrorMessage("Nao foi possivel exportar os dados."));
    return;
  }
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`santuserp-lgpd-${date}.json`, payload);
  toast("Dados exportados em JSON.");
}

async function anonymizeComplianceClient() {
  const clientId = document.querySelector("#complianceClientSelect")?.value || "";
  const confirm = document.querySelector("#complianceConfirmInput")?.value || "";
  const result = await apiRequest(API_COMPLIANCE_ANONYMIZE_CLIENT_URL, {
    method: "POST",
    body: JSON.stringify({ clientId, confirm })
  });
  if (!result) {
    toast(apiErrorMessage("Nao foi possivel anonimizar o cliente."));
    return;
  }
  state = await loadState();
  hydrateReferences();
  toast("Cliente anonimizado com sucesso.");
  renderSettings();
}

function renderHealthStatus(health = null) {
  if (!health) {
    return `<p class="empty-state">Verificando conexao com a API local...</p>`;
  }

  if (!health.ok) {
    return `
      <div class="health-summary">
        <span class="status danger">Falha</span>
        <strong>${escapeHtml(health.message || "Nao foi possivel verificar o sistema.")}</strong>
        <p>${escapeHtml(health.detail || "Confira se o servidor local e o PostgreSQL estao ativos.")}</p>
      </div>
    `;
  }

  const counts = health.counts || {};
  const backup = health.backup || {};
  const memory = health.memory || {};
  const keyCounts = ["users", "clients", "suppliers", "proposals", "contracts", "projects", "tasks", "payables", "receivables"];
  return `
    <div class="health-summary">
      <span class="status ${backup.ok === false ? "warning" : "success"}">Operacional</span>
      <strong>Persistencia: ${health.source === "postgres" ? "PostgreSQL" : "JSON local"}</strong>
      <p>Ultima verificacao: ${formatDateTime(health.checkedAt)} - Uptime: ${formatDuration(health.uptimeSeconds || 0)}</p>
      <p>Backup: ${escapeHtml(backup.message || "Sem informacao de backup.")}${backup.latestAt ? ` - ${formatDateTime(backup.latestAt)}` : ""}</p>
      <p>Memoria: ${memory.heapUsedMb || 0} MB em uso de heap - RSS ${memory.rssMb || 0} MB</p>
    </div>
    <div class="health-grid">
      ${keyCounts.map((key) => `
        <div class="health-item">
          <span>${activityCollectionLabel(key)}</span>
          <strong>${counts[key] || 0}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

async function loadHealthStatus() {
  const container = document.querySelector("#healthStatus");
  if (!container) return;

  container.innerHTML = renderHealthStatus();
  const health = await apiRequest(API_HEALTH_URL);
  if (!container.isConnected) return;
  if (!health) {
    container.innerHTML = renderHealthStatus({
      ok: false,
      message: apiErrorMessage("Nao foi possivel consultar a saude do sistema."),
      detail: "Confirme se o servidor local esta rodando e se sua sessao continua ativa."
    });
    return;
  }
  container.innerHTML = renderHealthStatus(health);
}

function bindGoToButtons() {
  content.querySelectorAll("[data-goto]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.goto)));
}

function exportCsv(collection, schemaId = "") {
  const schema = Object.values(schemas).find((item) => item.collection === collection);
  const activeSchemaId = schemaId || Object.keys(schemas).find((key) => schemas[key].collection === collection);
  const rows = activeSchemaId
    ? filterItems(activeSchemaId, state[collection], listFilters[activeSchemaId] || "", statusFilters[activeSchemaId] || "")
    : state[collection];
  if (!rows?.length) {
    toast("Nao ha dados para exportar.");
    return;
  }
  downloadCsv(`${buildExportBaseName(collection)}.csv`, rows.map((row) => ({
    empresa: getCurrentTenant()?.name || "SANTUS",
    exportado_em: new Date().toISOString(),
    ...row
  })));
  toast("Arquivo CSV exportado.");
}

function buildExportBaseName(name, period = getReportPeriod()) {
  const tenant = sanitizeFilename(getCurrentTenant()?.name || "santus");
  const from = period?.from || "inicio";
  const to = period?.to || today();
  return `santuserp-${tenant}-${sanitizeFilename(name)}-${from}-${to}`;
}

function sanitizeFilename(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "arquivo";
}

function downloadCsv(filename, rows) {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const csv = [
    headers.join(";"),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(";"))
  ].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function withBusyButton(button, busyText, task) {
  if (!button) {
    await task();
    return;
  }
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = busyText;
  try {
    await task();
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function toast(message) {
  const toastElement = document.querySelector("#toast");
  toastElement.textContent = message;
  toastElement.classList.remove("hidden");
  setTimeout(() => toastElement.classList.add("hidden"), 2600);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

boot();
