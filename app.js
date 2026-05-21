const STORE_KEY = "santus_erp_mvp";
const API_STATE_URL = "/api/state";
const API_COLLECTIONS = new Set(["users", "clients", "suppliers", "payables", "receivables", "proposals", "projects", "tasks"]);

const modules = [
  { id: "dashboard", label: "Dashboard", title: "Visao geral", roles: ["admin", "gestor", "financeiro", "comercial", "operacional"] },
  { id: "clients", label: "Clientes", title: "Clientes", roles: ["admin", "gestor", "comercial", "financeiro", "operacional"] },
  { id: "suppliers", label: "Fornecedores", title: "Fornecedores", roles: ["admin", "gestor", "financeiro"] },
  { id: "finance", label: "Financeiro", title: "Financeiro", roles: ["admin", "gestor", "financeiro"] },
  { id: "proposals", label: "Propostas", title: "Propostas comerciais", roles: ["admin", "gestor", "comercial"] },
  { id: "projects", label: "Projetos", title: "Projetos", roles: ["admin", "gestor", "operacional", "comercial"] },
  { id: "tasks", label: "Tarefas", title: "Tarefas", roles: ["admin", "gestor", "operacional", "colaborador"] },
  { id: "reports", label: "Relatorios", title: "Relatorios", roles: ["admin", "gestor", "financeiro", "comercial"] },
  { id: "notifications", label: "Notificacoes", title: "Notificacoes internas", roles: ["admin", "gestor", "financeiro", "comercial", "operacional"] },
  { id: "activity", label: "Historico", title: "Historico de atividades", roles: ["admin", "gestor"] },
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

const initialData = {
  session: null,
  auditLogs: [],
  users: [
    { id: uid(), name: "Administrador SANTUS", email: "admin@santus.com", password: "santus123", role: "admin", status: "ativo" },
    { id: uid(), name: "Gestor Comercial", email: "comercial@santus.com", password: "santus123", role: "comercial", status: "ativo" }
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
  const apiState = await loadStateFromApi();
  if (apiState) {
    localStorage.setItem(STORE_KEY, JSON.stringify(apiState));
    return normalizeState(apiState);
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
    "clients",
    "suppliers",
    "categories",
    "payables",
    "receivables",
    "proposals",
    "projects",
    "tasks",
    "auditLogs"
  ].forEach((collection) => {
    if (!Array.isArray(normalized[collection])) {
      normalized[collection] = [];
    }
  });
  return normalized;
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  saveStateToApi(state);
}

async function loadStateFromApi() {
  if (!location.protocol.startsWith("http")) {
    return null;
  }

  try {
    const response = await fetch(API_STATE_URL, { cache: "no-store" });
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
    return;
  }

  try {
    await fetch(API_STATE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextState)
    });
  } catch {
    // The localStorage fallback keeps the MVP usable without the local server.
  }
}

async function apiRequest(path, options = {}) {
  if (!location.protocol.startsWith("http")) {
    return null;
  }

  try {
    const user = getSessionUser();
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(user ? {
          "X-Fenix-User-Id": user.id,
          "X-Fenix-User-Name": user.name,
          "X-Fenix-User-Role": user.role
        } : {}),
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      return null;
    }
    return response.status === 204 ? {} : response.json();
  } catch {
    return null;
  }
}

function collectionApiPath(collection, id = "") {
  return `/api/${collection}${id ? `/${id}` : ""}`;
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

function addAuditLogFromApi(auditLog) {
  if (!auditLog) return;
  state.auditLogs = [auditLog, ...(Array.isArray(state.auditLogs) ? state.auditLogs : [])]
    .filter((item, index, logs) => logs.findIndex((log) => log.id === item.id) === index)
    .slice(0, 200);
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

function handleLogin(event) {
  event.preventDefault();
  const email = document.querySelector("#loginEmail").value.trim().toLowerCase();
  const password = document.querySelector("#loginPassword").value;
  const user = state.users.find((item) => item.email.toLowerCase() === email && item.password === password && item.status === "ativo");
  const message = document.querySelector("#loginMessage");

  if (!user) {
    message.textContent = "Credenciais invalidas ou usuario inativo.";
    return;
  }

  state.session = { userId: user.id, loggedAt: new Date().toISOString() };
  saveState();
  showApp();
}

function handleLogout() {
  state.session = null;
  saveState();
  showLogin();
}

function showLogin() {
  appShell.classList.add("hidden");
  loginScreen.classList.remove("hidden");
}

function showApp() {
  loginScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  renderNavigation();
  navigate(activeModule);
}

function getSessionUser() {
  return state.users.find((user) => user.id === state.session?.userId);
}

function canAccess(module) {
  const user = getSessionUser();
  return user && module.roles.includes(user.role);
}

function renderNavigation() {
  const user = getSessionUser();
  currentUser.textContent = `${user.name} · ${roleLabels[user.role]}`;
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
    projects: () => renderCrud("projects"),
    tasks: () => renderCrud("tasks"),
    reports: renderReports,
    notifications: renderNotifications,
    activity: renderActivity,
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
  if (["ativo", "aprovada", "recebido", "pago", "concluida", "concluido"].includes(status)) return "success";
  if (["pendente", "enviada", "em_andamento", "prospect", "rascunho"].includes(status)) return "warning";
  if (["vencido", "recusada", "cancelado", "inativo"].includes(status)) return "danger";
  return "neutral";
}

function labelize(value) {
  return String(value || "-").replaceAll("_", " ");
}

function updateNotificationSummary() {
  const notifications = buildNotifications();
  const critical = notifications.filter((item) => item.tone === "danger").length;
  notificationCount.textContent = notifications.length;
  notificationButton.classList.toggle("has-alerts", notifications.length > 0);
  notificationButton.classList.toggle("has-critical", critical > 0);
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
          <button type="button" data-goto="clients">Clientes</button>
          <button type="button" data-goto="proposals">Propostas</button>
          <button type="button" data-goto="projects">Projetos</button>
          <button type="button" data-goto="tasks">Tarefas</button>
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
}

function kpi(label, value, tone = "neutral") {
  return `<article class="card kpi-card kpi-${tone}"><span>${label}</span><strong>${value}</strong></article>`;
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
  const warningLimit = addDays(7);
  const notifications = [];

  state.payables
    .filter((item) => item.status === "pendente" && item.dueDate)
    .forEach((item) => {
      if (item.dueDate < todayValue) {
        notifications.push({
          tone: "danger",
          area: "Financeiro",
          title: "Conta a pagar vencida",
          detail: `${item.description} venceu em ${formatDate(item.dueDate)} no valor de ${money(item.amount)}.`,
          date: item.dueDate,
          target: "finance"
        });
      } else if (item.dueDate <= warningLimit) {
        notifications.push({
          tone: "warning",
          area: "Financeiro",
          title: "Conta a pagar proxima do vencimento",
          detail: `${item.description} vence em ${formatDate(item.dueDate)} no valor de ${money(item.amount)}.`,
          date: item.dueDate,
          target: "finance"
        });
      }
    });

  state.receivables
    .filter((item) => item.status === "pendente" && item.dueDate)
    .forEach((item) => {
      if (item.dueDate < todayValue) {
        notifications.push({
          tone: "danger",
          area: "Financeiro",
          title: "Conta a receber vencida",
          detail: `${item.description} venceu em ${formatDate(item.dueDate)} no valor de ${money(item.amount)}.`,
          date: item.dueDate,
          target: "finance"
        });
      } else if (item.dueDate <= warningLimit) {
        notifications.push({
          tone: "warning",
          area: "Financeiro",
          title: "Recebimento proximo do vencimento",
          detail: `${item.description} vence em ${formatDate(item.dueDate)} no valor de ${money(item.amount)}.`,
          date: item.dueDate,
          target: "finance"
        });
      }
    });

  state.tasks
    .filter((item) => !["concluida", "cancelada"].includes(item.status) && item.dueDate)
    .forEach((item) => {
      if (item.dueDate < todayValue) {
        notifications.push({
          tone: "danger",
          area: "Operacional",
          title: "Tarefa atrasada",
          detail: `${item.title} venceu em ${formatDate(item.dueDate)}.`,
          date: item.dueDate,
          target: "tasks"
        });
      } else if (item.dueDate <= warningLimit) {
        notifications.push({
          tone: "warning",
          area: "Operacional",
          title: "Tarefa proxima do prazo",
          detail: `${item.title} vence em ${formatDate(item.dueDate)}.`,
          date: item.dueDate,
          target: "tasks"
        });
      }
    });

  state.proposals
    .filter((item) => ["rascunho", "enviada"].includes(item.status) && item.validUntil)
    .forEach((item) => {
      if (item.validUntil < todayValue) {
        notifications.push({
          tone: "danger",
          area: "Comercial",
          title: "Proposta vencida",
          detail: `${item.title} venceu em ${formatDate(item.validUntil)}.`,
          date: item.validUntil,
          target: "proposals"
        });
      } else if (item.validUntil <= warningLimit) {
        notifications.push({
          tone: "warning",
          area: "Comercial",
          title: "Proposta perto do vencimento",
          detail: `${item.title} vence em ${formatDate(item.validUntil)}.`,
          date: item.validUntil,
          target: "proposals"
        });
      }
    });

  return notifications.sort((a, b) => {
    const toneOrder = { danger: 0, warning: 1, neutral: 2 };
    return (toneOrder[a.tone] ?? 9) - (toneOrder[b.tone] ?? 9) || String(a.date).localeCompare(String(b.date));
  });
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

const schemas = {
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
    required: ["name", "email", "password", "role", "status"],
    fields: [
      ["name", "Nome", "text"],
      ["email", "E-mail", "email"],
      ["password", "Senha", "text"],
      ["role", "Perfil", "select", Object.keys(roleLabels)],
      ["status", "Status", "select", ["ativo", "inativo"]]
    ],
    columns: ["name", "email", "role", "status"]
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
        <button type="button" data-new="${schemaId}">Novo ${schema.label}</button>
        <button type="button" class="secondary" data-export="${schema.collection}">Exportar CSV</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header"><h3>Lista</h3></div>
      <div class="panel-body table-wrap" data-table-container="${schemaId}">${renderTable(schemaId, filteredItems, true, query, status)}</div>
    </section>
  `;
  bindCrud(schemaId);
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
  if (!items.length) {
    const message = query || status ? "Nenhum registro encontrado para os filtros atuais." : `Nenhum ${schema.label} cadastrado ainda.`;
    return `<div class="empty-state">${message}</div>`;
  }
  const headings = schema.columns.map((column) => `<th>${columnLabel(column)}</th>`).join("");
  const rows = items.map((item) => {
    const cells = schema.columns.map((column) => `<td>${formatCell(column, item[column])}</td>`).join("");
    const actionCell = actions ? `<td><div class="table-actions"><button class="secondary" type="button" data-edit="${schemaId}:${item.id}">Editar</button><button class="danger" type="button" data-delete="${schemaId}:${item.id}">Excluir</button></div></td>` : "";
    return `<tr>${cells}${actionCell}</tr>`;
  }).join("");
  return `<table class="data-table"><thead><tr>${headings}${actions ? "<th>Acoes</th>" : ""}</tr></thead><tbody>${rows}</tbody></table>`;
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
    clientId: "Cliente",
    supplierId: "Fornecedor",
    projectId: "Projeto",
    responsibleId: "Responsavel",
    amount: "Valor",
    validUntil: "Validade",
    dueDate: "Prazo",
    priority: "Prioridade",
    role: "Perfil",
    description: "Descricao"
  };
  return labels[column] || column;
}

function formatCell(column, value) {
  if (["amount"].includes(column)) return money(value);
  if (["status", "priority", "role"].includes(column)) return `<span class="status ${statusClass(value)}">${labelize(roleLabels[value] || value)}</span>`;
  if (column === "clientId") return state.clients.find((item) => item.id === value)?.name || "-";
  if (column === "supplierId") return state.suppliers.find((item) => item.id === value)?.name || "-";
  if (column === "projectId") return state.projects.find((item) => item.id === value)?.name || "-";
  if (column === "responsibleId") return state.users.find((item) => item.id === value)?.name || "-";
  return value || "-";
}

function formatCellText(column, value) {
  if (["amount"].includes(column)) return money(value);
  if (["status", "priority", "role"].includes(column)) return roleLabels[value] || labelize(value);
  if (column === "clientId") return state.clients.find((item) => item.id === value)?.name || "";
  if (column === "supplierId") return state.suppliers.find((item) => item.id === value)?.name || "";
  if (column === "projectId") return state.projects.find((item) => item.id === value)?.name || "";
  if (column === "responsibleId") return state.users.find((item) => item.id === value)?.name || "";
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
    const required = isRequiredField(schemaId, name);
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
    const emptyOption = collection.length ? "" : `<option value="">Nenhum registro disponivel</option>`;
    return `<select name="${name}" ${requiredAttribute}>${emptyOption}${collection.map((item) => `<option value="${item.id}" ${item.id === value ? "selected" : ""}>${item.name || item.title || item.email}</option>`).join("")}</select>`;
  }
  return `<input name="${name}" type="${type}" value="${escapeHtml(value)}" ${requiredAttribute} />`;
}

function isRequiredField(schemaId, name) {
  return schemas[schemaId]?.required?.includes(name) || false;
}

function bindCrud(schemaId) {
  content.querySelector(`[data-form="${schemaId}"]`)?.addEventListener("submit", (event) => saveForm(event, schemaId));
  content.querySelectorAll("[data-search]").forEach((input) => {
    input.addEventListener("input", () => {
      listFilters[input.dataset.search] = input.value;
      refreshCrudList(input.dataset.search);
    });
  });
  content.querySelectorAll("[data-status-filter]").forEach((select) => {
    select.addEventListener("change", () => {
      statusFilters[select.dataset.statusFilter] = select.value;
      refreshCrudList(select.dataset.statusFilter);
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
}

function refreshCrudList(schemaId) {
  const schema = schemas[schemaId];
  const items = state[schema.collection];
  const query = listFilters[schemaId] || "";
  const status = statusFilters[schemaId] || "";
  const filteredItems = filterItems(schemaId, items, query, status);
  const totalLabel = filteredItems.length === items.length ? `${items.length}` : `${filteredItems.length} de ${items.length}`;
  const countElement = content.querySelector(`[data-list-count="${schemaId}"]`);
  const tableContainer = content.querySelector(`[data-table-container="${schemaId}"]`);

  if (countElement) {
    countElement.textContent = `${totalLabel} ${schema.label}${filteredItems.length === 1 ? "" : "s"}`;
  }
  if (tableContainer) {
    tableContainer.innerHTML = renderTable(schemaId, filteredItems, true, query, status);
  }

  content.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editItem(button.dataset.edit));
  });
  content.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteItem(button.dataset.delete));
  });
}

async function saveForm(event, schemaId) {
  event.preventDefault();
  const schema = schemas[schemaId];
  const form = event.currentTarget;
  const formData = new FormData(form);
  const item = Object.fromEntries(formData.entries());

  const invalidField = findInvalidField(schemaId, item);
  if (invalidField) {
    showFormError(form, `${columnLabel(invalidField)} e obrigatorio.`);
    form.querySelector(`[name="${invalidField}"]`)?.focus();
    return;
  }

  schema.fields.forEach(([name, , type]) => {
    if (type === "number") item[name] = Number(item[name] || 0);
  });

  const collection = state[schema.collection];
  const isEditing = Boolean(form.dataset.id);
  let savedItem;
  if (isEditing) {
    const index = collection.findIndex((record) => record.id === form.dataset.id);
    collection[index] = { ...collection[index], ...item };
    savedItem = collection[index];
    toast(`${capitalize(schema.label)} atualizado com sucesso.`);
  } else {
    savedItem = { id: uid(), ...item };
    collection.push(savedItem);
    toast(`${capitalize(schema.label)} cadastrado com sucesso.`);
  }

  const generatedRecords = applyBusinessRules(schema.collection, savedItem);
  await saveRecordToApi(schema.collection, savedItem, isEditing);
  for (const generatedRecord of generatedRecords) {
    await saveRecordToApi("receivables", generatedRecord, false);
  }
  saveState();
  renderCrud(schemaId);
}

function findInvalidField(schemaId, item) {
  const schema = schemas[schemaId];
  return (schema.required || []).find((field) => {
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
  const schema = schemas[schemaId];
  const item = state[schema.collection].find((record) => record.id === id);
  const label = item?.name || item?.title || item?.description || schema.label;
  const confirmed = window.confirm(`Excluir ${label}? Esta acao nao pode ser desfeita.`);
  if (!confirmed) return;

  state[schema.collection] = state[schema.collection].filter((record) => record.id !== id);
  await deleteRecordFromApi(schema.collection, id);
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
        <button type="button" data-new-finance="${schemaId}">Novo</button>
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
  content.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => editItem(button.dataset.edit)));
  content.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteItem(button.dataset.delete)));
}

function renderReports() {
  const financial = buildFinancialReport();
  const commercial = buildCommercialReport();
  const operational = buildOperationalReport();
  const registry = buildRegistryReport();
  const reports = [financial, commercial, operational, registry];

  content.innerHTML = `
    <section class="toolbar">
      <div>
        <p class="eyebrow">Analise</p>
        <h3>Relatorios executivos</h3>
      </div>
      <div class="toolbar-actions">
        <button type="button" data-export="receivables">Exportar receitas</button>
        <button type="button" class="secondary" data-export="payables">Exportar despesas</button>
        <button type="button" class="secondary" data-export="proposals">Exportar propostas</button>
        <button type="button" class="secondary" data-export="tasks">Exportar tarefas</button>
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
          <button type="button" data-export="clients">Clientes</button>
          <button type="button" data-export="suppliers">Fornecedores</button>
          <button type="button" data-export="projects">Projetos</button>
          <button type="button" data-export="tasks">Tarefas</button>
        </div>
      </div>
    </section>
  `;
  content.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", () => exportCsv(button.dataset.export)));
}

function buildFinancialReport() {
  const revenue = sum(state.receivables, "amount");
  const expenses = sum(state.payables, "amount");
  const received = sum(state.receivables.filter((item) => item.status === "recebido"), "amount");
  const paid = sum(state.payables.filter((item) => item.status === "pago"), "amount");
  const overdue = state.payables.filter((item) => item.status === "pendente" && item.dueDate < today()).length;

  return {
    title: "Financeiro",
    value: money(received - paid),
    summary: `${money(revenue)} em receitas cadastradas`,
    tone: received - paid >= 0 ? "kpi-success" : "kpi-danger",
    rows: [
      ["Financeiro", "Receita total cadastrada", money(revenue), "Soma de contas a receber"],
      ["Financeiro", "Despesa total cadastrada", money(expenses), "Soma de contas a pagar"],
      ["Financeiro", "Resultado realizado", money(received - paid), "Recebido menos pago"],
      ["Financeiro", "Contas a pagar vencidas", overdue, "Pendencias financeiras em atraso"]
    ]
  };
}

function buildCommercialReport() {
  const approved = state.proposals.filter((item) => item.status === "aprovada").length;
  const sent = state.proposals.filter((item) => item.status === "enviada").length;
  const total = state.proposals.length;
  const conversion = total ? Math.round((approved / total) * 100) : 0;
  const ticket = approved ? sum(state.proposals.filter((item) => item.status === "aprovada"), "amount") / approved : 0;

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

function buildOperationalReport() {
  const openProjects = state.projects.filter((item) => item.status === "em_andamento").length;
  const openTasks = state.tasks.filter((item) => !["concluida", "cancelada"].includes(item.status)).length;
  const completedTasks = state.tasks.filter((item) => item.status === "concluida").length;
  const productivity = state.tasks.length ? Math.round((completedTasks / state.tasks.length) * 100) : 0;

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

function buildRegistryReport() {
  const activeClients = state.clients.filter((item) => item.status === "ativo").length;
  const prospects = state.clients.filter((item) => item.status === "prospect").length;
  const activeSuppliers = state.suppliers.filter((item) => item.status === "ativo").length;
  const activeUsers = state.users.filter((item) => item.status === "ativo").length;

  return {
    title: "Cadastros",
    value: activeClients,
    summary: `${prospects} prospect${prospects === 1 ? "" : "s"} em carteira`,
    tone: "kpi-neutral",
    rows: [
      ["Cadastros", "Clientes ativos", activeClients, "Clientes prontos para propostas e projetos"],
      ["Cadastros", "Prospects", prospects, "Oportunidades em acompanhamento"],
      ["Cadastros", "Fornecedores ativos", activeSuppliers, "Base de fornecedores disponivel"],
      ["Cadastros", "Usuarios ativos", activeUsers, "Pessoas com acesso ao sistema"]
    ]
  };
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
  const critical = notifications.filter((item) => item.tone === "danger").length;
  const warnings = notifications.filter((item) => item.tone === "warning").length;

  content.innerHTML = `
    <section class="grid kpi-grid">
      ${kpi("Alertas ativos", notifications.length, notifications.length ? "warning" : "success")}
      ${kpi("Criticos", critical, critical ? "danger" : "success")}
      ${kpi("Atencao", warnings, warnings ? "warning" : "success")}
      ${kpi("Janela monitorada", "7 dias", "neutral")}
    </section>
    <section class="toolbar">
      <div>
        <p class="eyebrow">Monitoramento</p>
        <h3>Alertas financeiros, comerciais e operacionais</h3>
      </div>
      <div class="toolbar-actions">
        <button type="button" class="secondary" data-goto="finance">Financeiro</button>
        <button type="button" class="secondary" data-goto="proposals">Propostas</button>
        <button type="button" class="secondary" data-goto="tasks">Tarefas</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <h3>Notificacoes internas</h3>
        <span class="status ${critical ? "danger" : notifications.length ? "warning" : "success"}">${notifications.length || "ok"}</span>
      </div>
      <div class="panel-body">${renderNotificationList(notifications)}</div>
    </section>
  `;
  bindGoToButtons();
}

function renderNotificationList(notifications) {
  if (!notifications.length) {
    return `<div class="empty-state compact">Nenhum alerta interno no momento.</div>`;
  }

  return `
    <div class="notification-list">
      ${notifications.map((notification) => `
        <article class="notification-item notification-${notification.tone}">
          <div>
            <span class="status ${notification.tone}">${notification.area}</span>
            <h4>${notification.title}</h4>
            <p>${notification.detail}</p>
          </div>
          <button type="button" class="secondary" data-goto="${notification.target}">Abrir</button>
        </article>
      `).join("")}
    </div>
  `;
}

function renderActivity() {
  const logs = Array.isArray(state.auditLogs) ? state.auditLogs : [];
  content.innerHTML = `
    <section class="toolbar">
      <div>
        <p class="eyebrow">Auditoria</p>
        <h3>${logs.length} atividade${logs.length === 1 ? "" : "s"} registrada${logs.length === 1 ? "" : "s"}</h3>
      </div>
      <div class="toolbar-actions">
        <button type="button" class="secondary" data-refresh-activity>Atualizar</button>
        <button type="button" class="secondary" data-export="auditLogs">Exportar CSV</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header"><h3>Eventos recentes</h3><span class="status neutral">ultimos 200 registros</span></div>
      <div class="panel-body table-wrap" data-activity-table>${renderActivityTable(logs)}</div>
    </section>
  `;
  bindActivity();
  refreshActivityLog();
}

function bindActivity() {
  content.querySelector("[data-refresh-activity]")?.addEventListener("click", refreshActivityLog);
  content.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", () => exportCsv(button.dataset.export)));
}

async function refreshActivityLog() {
  const logs = await loadActivityLog();
  if (!logs) return;
  state.auditLogs = logs;
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  const table = content.querySelector("[data-activity-table]");
  const title = content.querySelector(".toolbar h3");
  if (table) table.innerHTML = renderActivityTable(logs);
  if (title) title.textContent = `${logs.length} atividade${logs.length === 1 ? "" : "s"} registrada${logs.length === 1 ? "" : "s"}`;
}

async function loadActivityLog() {
  if (!location.protocol.startsWith("http")) {
    return null;
  }

  try {
    const response = await fetch("/api/activity-log", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

function renderActivityTable(logs) {
  if (!logs.length) {
    return `<div class="empty-state">Nenhuma atividade registrada ainda.</div>`;
  }

  return `
    <table class="data-table">
      <thead>
        <tr><th>Data</th><th>Acao</th><th>Modulo</th><th>Registro</th><th>Usuario</th><th>Campos</th></tr>
      </thead>
      <tbody>
        ${logs.map((log) => `
          <tr>
            <td>${formatDateTime(log.createdAt)}</td>
            <td><span class="status ${activityTone(log.action)}">${activityActionLabel(log.action)}</span></td>
            <td>${activityCollectionLabel(log.collection)}</td>
            <td>${escapeHtml(log.recordLabel || log.recordId || "-")}</td>
            <td>${escapeHtml(log.actorName || "Usuario local")}</td>
            <td>${formatChangedFields(log.changedFields)}</td>
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
  return "neutral";
}

function activityActionLabel(action) {
  const labels = {
    created: "Criado",
    updated: "Atualizado",
    deleted: "Excluido"
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
    projects: "Projetos",
    tasks: "Tarefas"
  };
  return labels[collection] || labelize(collection);
}

function formatChangedFields(fields) {
  return Array.isArray(fields) && fields.length ? fields.map(columnLabel).join(", ") : "-";
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

function renderSettings() {
  content.innerHTML = `
    <section class="grid two-columns">
      <article class="card">
        <p class="eyebrow">Seguranca</p>
        <h3>Politicas administrativas</h3>
        <p>O MVP ja controla acesso por perfil e registra historico basico de atividades. As proximas camadas recomendadas sao senha criptografada no backend, 2FA e sessoes seguras por cookie HTTP-only.</p>
      </article>
      <article class="card">
        <p class="eyebrow">Roadmap</p>
        <h3>Expansao modular</h3>
        <p>Contratos avancados, portal do cliente, automacoes, IA, integracoes fiscais, API e PWA estao previstos para as proximas fases.</p>
      </article>
    </section>
    <section class="panel">
      <div class="panel-header"><h3>Manutencao local</h3></div>
      <div class="panel-body toolbar-actions">
        <button type="button" class="secondary" id="seedButton">Restaurar dados demonstrativos</button>
      </div>
    </section>
  `;
  document.querySelector("#seedButton").addEventListener("click", () => {
    state = structuredClone(initialData);
    hydrateReferences();
    state.session = { userId: state.users[0].id, loggedAt: new Date().toISOString() };
    saveState();
    toast("Dados demonstrativos restaurados.");
    navigate("dashboard");
  });
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
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(";"), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(";"))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `santus-${collection}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
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
