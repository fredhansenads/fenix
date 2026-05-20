const STORE_KEY = "santus_erp_mvp";

const modules = [
  { id: "dashboard", label: "Dashboard", title: "Visao geral", roles: ["admin", "gestor", "financeiro", "comercial", "operacional"] },
  { id: "clients", label: "Clientes", title: "Clientes", roles: ["admin", "gestor", "comercial", "financeiro", "operacional"] },
  { id: "suppliers", label: "Fornecedores", title: "Fornecedores", roles: ["admin", "gestor", "financeiro"] },
  { id: "finance", label: "Financeiro", title: "Financeiro", roles: ["admin", "gestor", "financeiro"] },
  { id: "proposals", label: "Propostas", title: "Propostas comerciais", roles: ["admin", "gestor", "comercial"] },
  { id: "projects", label: "Projetos", title: "Projetos", roles: ["admin", "gestor", "operacional", "comercial"] },
  { id: "tasks", label: "Tarefas", title: "Tarefas", roles: ["admin", "gestor", "operacional", "colaborador"] },
  { id: "reports", label: "Relatorios", title: "Relatorios", roles: ["admin", "gestor", "financeiro", "comercial"] },
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

let state = loadState();
let activeModule = "dashboard";

const loginScreen = document.querySelector("#loginScreen");
const appShell = document.querySelector("#appShell");
const content = document.querySelector("#content");
const mainNav = document.querySelector("#mainNav");
const pageTitle = document.querySelector("#pageTitle");
const pageKicker = document.querySelector("#pageKicker");
const currentUser = document.querySelector("#currentUser");
const sidebar = document.querySelector(".sidebar");

document.querySelector("#loginForm").addEventListener("submit", handleLogin);
document.querySelector("#logoutButton").addEventListener("click", handleLogout);
document.querySelector("#menuButton").addEventListener("click", () => sidebar.classList.toggle("open"));

boot();

function boot() {
  hydrateReferences();
  if (state.session) {
    showApp();
  } else {
    showLogin();
  }
}

function loadState() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) {
    const seeded = structuredClone(initialData);
    localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  return JSON.parse(saved);
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
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
      sidebar.classList.remove("open");
      navigate(button.dataset.module);
    });
  });
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
    users: () => renderCrud("users"),
    settings: renderSettings
  };
  renderers[module.id]();
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function today() {
  return new Date().toISOString().slice(0, 10);
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

function renderDashboard() {
  const received = sum(state.receivables.filter((item) => item.status === "recebido"), "amount");
  const paid = sum(state.payables.filter((item) => item.status === "pago"), "amount");
  const pendingReceivable = sum(state.receivables.filter((item) => item.status === "pendente"), "amount");
  const pendingPayable = sum(state.payables.filter((item) => item.status === "pendente"), "amount");
  const overdueReceivable = state.receivables.filter((item) => item.status === "pendente" && item.dueDate < today()).length;
  const overduePayable = state.payables.filter((item) => item.status === "pendente" && item.dueDate < today()).length;
  const approvedProposals = state.proposals.filter((item) => item.status === "aprovada").length;
  const conversion = state.proposals.length ? Math.round((approvedProposals / state.proposals.length) * 100) : 0;

  content.innerHTML = `
    <section class="grid kpi-grid">
      ${kpi("Receita realizada", money(received))}
      ${kpi("Despesas pagas", money(paid))}
      ${kpi("Resultado", money(received - paid))}
      ${kpi("Saldo previsto", money(pendingReceivable - pendingPayable))}
      ${kpi("Contas vencidas", `${overdueReceivable + overduePayable}`)}
      ${kpi("Taxa de conversao", `${conversion}%`)}
      ${kpi("Clientes ativos", state.clients.filter((item) => item.status === "ativo").length)}
      ${kpi("Projetos em andamento", state.projects.filter((item) => item.status === "em_andamento").length)}
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
        <div class="panel-body table-wrap">${renderTable("tasks", state.tasks.slice(0, 5), false)}</div>
      </div>
    </section>
  `;
  bindGoToButtons();
}

function kpi(label, value) {
  return `<article class="card kpi-card"><span>${label}</span><strong>${value}</strong></article>`;
}

function bar(label, value, max) {
  const height = Math.max(8, Math.round((value / Math.max(max, 1)) * 170));
  return `<div class="bar"><span style="height:${height}px"></span>${label}<strong>${money(value)}</strong></div>`;
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

const schemas = {
  clients: {
    label: "cliente",
    collection: "clients",
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
  content.innerHTML = `
    <section class="toolbar">
      <div>
        <p class="eyebrow">Cadastro</p>
        <h3>${items.length} ${schema.label}${items.length === 1 ? "" : "s"}</h3>
      </div>
      <div class="toolbar-actions">
        <button type="button" data-new="${schemaId}">Novo ${schema.label}</button>
        <button type="button" class="secondary" data-export="${schema.collection}">Exportar CSV</button>
      </div>
    </section>
    <section class="grid two-columns">
      <div class="panel">
        <div class="panel-header"><h3>Lista</h3></div>
        <div class="panel-body table-wrap">${renderTable(schemaId, items, true)}</div>
      </div>
      <div id="formPanel" class="panel">
        <div class="panel-header"><h3>Novo ${schema.label}</h3></div>
        <div class="panel-body">${renderForm(schemaId)}</div>
      </div>
    </section>
  `;
  bindCrud(schemaId);
}

function renderTable(schemaId, items, actions = true) {
  const schema = schemas[schemaId];
  if (!items.length) return `<div class="empty-state">Nenhum registro encontrado.</div>`;
  const headings = schema.columns.map((column) => `<th>${columnLabel(column)}</th>`).join("");
  const rows = items.map((item) => {
    const cells = schema.columns.map((column) => `<td>${formatCell(column, item[column])}</td>`).join("");
    const actionCell = actions ? `<td><button class="secondary" type="button" data-edit="${schemaId}:${item.id}">Editar</button> <button class="danger" type="button" data-delete="${schemaId}:${item.id}">Excluir</button></td>` : "";
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

function renderForm(schemaId, item = {}) {
  const schema = schemas[schemaId];
  const fields = schema.fields.map(([name, label, type, options, className]) => {
    const value = item[name] || "";
    return `<label class="${className || ""}">${label}${renderInput(name, type, value, options)}</label>`;
  }).join("");
  return `
    <form class="form-grid" data-form="${schemaId}" data-id="${item.id || ""}">
      ${fields}
      <div class="full toolbar-actions">
        <button type="submit">${item.id ? "Salvar alteracoes" : "Cadastrar"}</button>
        ${item.id ? `<button type="button" class="secondary" data-cancel-edit="${schemaId}">Cancelar</button>` : ""}
      </div>
    </form>
  `;
}

function renderInput(name, type, value, options) {
  if (type === "textarea") return `<textarea name="${name}">${escapeHtml(value)}</textarea>`;
  if (type === "select") {
    return `<select name="${name}">${options.map((option) => `<option value="${option}" ${option === value ? "selected" : ""}>${labelize(roleLabels[option] || option)}</option>`).join("")}</select>`;
  }
  if (type === "relation") {
    const collection = state[options] || [];
    return `<select name="${name}">${collection.map((item) => `<option value="${item.id}" ${item.id === value ? "selected" : ""}>${item.name || item.title || item.email}</option>`).join("")}</select>`;
  }
  return `<input name="${name}" type="${type}" value="${escapeHtml(value)}" ${["text", "email", "number", "date"].includes(type) ? "required" : ""} />`;
}

function bindCrud(schemaId) {
  content.querySelector(`[data-form="${schemaId}"]`)?.addEventListener("submit", (event) => saveForm(event, schemaId));
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
    button.addEventListener("click", () => exportCsv(button.dataset.export));
  });
}

function saveForm(event, schemaId) {
  event.preventDefault();
  const schema = schemas[schemaId];
  const form = event.currentTarget;
  const formData = new FormData(form);
  const item = Object.fromEntries(formData.entries());

  schema.fields.forEach(([name, , type]) => {
    if (type === "number") item[name] = Number(item[name] || 0);
  });

  const collection = state[schema.collection];
  let savedItem;
  if (form.dataset.id) {
    const index = collection.findIndex((record) => record.id === form.dataset.id);
    collection[index] = { ...collection[index], ...item };
    savedItem = collection[index];
    toast("Registro atualizado.");
  } else {
    savedItem = { id: uid(), ...item };
    collection.push(savedItem);
    toast("Registro cadastrado.");
  }

  applyBusinessRules(schema.collection, savedItem);
  saveState();
  renderCrud(schemaId);
}

function applyBusinessRules(collection, item) {
  if (collection === "proposals" && item.status === "aprovada") {
    const exists = state.receivables.some((receivable) => receivable.proposalId === item.id);
    if (!exists && item.amount) {
      state.receivables.push({
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
      });
    }
  }
}

function editItem(payload) {
  const [schemaId, id] = payload.split(":");
  const schema = schemas[schemaId];
  const item = state[schema.collection].find((record) => record.id === id);
  const panel = document.querySelector("#formPanel");
  const formMarkup = `<div class="panel-header"><h3>Editar ${schema.label}</h3></div><div class="panel-body">${renderForm(schemaId, item)}</div>`;
  if (panel) {
    panel.innerHTML = formMarkup;
  } else {
    content.innerHTML = `<section class="panel">${formMarkup}</section>`;
  }
  bindCrud(schemaId);
}

function deleteItem(payload) {
  const [schemaId, id] = payload.split(":");
  const schema = schemas[schemaId];
  state[schema.collection] = state[schema.collection].filter((record) => record.id !== id);
  saveState();
  toast("Registro excluido.");
  renderCrud(schemaId);
}

function renderFinance() {
  const received = sum(state.receivables.filter((item) => item.status === "recebido"), "amount");
  const paid = sum(state.payables.filter((item) => item.status === "pago"), "amount");
  const pendingReceivable = sum(state.receivables.filter((item) => item.status === "pendente"), "amount");
  const pendingPayable = sum(state.payables.filter((item) => item.status === "pendente"), "amount");

  content.innerHTML = `
    <section class="grid kpi-grid">
      ${kpi("Entradas realizadas", money(received))}
      ${kpi("Saidas realizadas", money(paid))}
      ${kpi("Entradas previstas", money(pendingReceivable))}
      ${kpi("Saidas previstas", money(pendingPayable))}
    </section>
    <section class="grid two-columns">
      ${financePanel("payables", "Contas a pagar")}
      ${financePanel("receivables", "Contas a receber")}
    </section>
  `;
  bindFinance();
}

function financePanel(schemaId, title) {
  return `
    <div class="panel">
      <div class="panel-header">
        <h3>${title}</h3>
        <button type="button" data-new-finance="${schemaId}">Novo</button>
      </div>
      <div class="panel-body table-wrap">${renderTable(schemaId, state[schemas[schemaId].collection], true)}</div>
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
  content.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => editItem(button.dataset.edit)));
  content.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteItem(button.dataset.delete)));
}

function renderReports() {
  const reports = [
    ["Financeiro mensal", state.receivables.length + state.payables.length, money(sum(state.receivables, "amount") - sum(state.payables, "amount"))],
    ["Propostas por status", state.proposals.length, `${state.proposals.filter((item) => item.status === "aprovada").length} aprovadas`],
    ["Projetos e tarefas", state.projects.length, `${state.tasks.filter((item) => item.status !== "concluida").length} tarefas abertas`],
    ["Carteira de clientes", state.clients.length, `${state.clients.filter((item) => item.status === "ativo").length} ativos`]
  ];

  content.innerHTML = `
    <section class="toolbar">
      <div>
        <p class="eyebrow">Analise</p>
        <h3>Relatorios exportaveis</h3>
      </div>
      <div class="toolbar-actions">
        <button type="button" data-export="receivables">Exportar receitas</button>
        <button type="button" class="secondary" data-export="payables">Exportar despesas</button>
      </div>
    </section>
    <section class="grid three-columns">
      ${reports.map(([title, count, summary]) => `<article class="card kpi-card"><span>${title}</span><strong>${count}</strong><p>${summary}</p></article>`).join("")}
    </section>
    <section class="panel">
      <div class="panel-header"><h3>Indicadores comerciais, financeiros e operacionais</h3></div>
      <div class="panel-body table-wrap">
        <table class="data-table">
          <thead><tr><th>Indicador</th><th>Valor</th><th>Leitura</th></tr></thead>
          <tbody>
            <tr><td>Receita total cadastrada</td><td>${money(sum(state.receivables, "amount"))}</td><td>Base de entradas realizadas e previstas</td></tr>
            <tr><td>Despesa total cadastrada</td><td>${money(sum(state.payables, "amount"))}</td><td>Base de saidas realizadas e previstas</td></tr>
            <tr><td>Taxa de conversao</td><td>${state.proposals.length ? Math.round((state.proposals.filter((item) => item.status === "aprovada").length / state.proposals.length) * 100) : 0}%</td><td>Propostas aprovadas sobre total</td></tr>
            <tr><td>Produtividade</td><td>${state.tasks.filter((item) => item.status === "concluida").length}/${state.tasks.length}</td><td>Tarefas concluidas sobre total</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
  content.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", () => exportCsv(button.dataset.export)));
}

function renderSettings() {
  content.innerHTML = `
    <section class="grid two-columns">
      <article class="card">
        <p class="eyebrow">Seguranca</p>
        <h3>Politicas administrativas</h3>
        <p>O MVP ja controla acesso por perfil. As proximas camadas recomendadas sao senha criptografada no backend, auditoria, 2FA e sessoes seguras por cookie HTTP-only.</p>
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

function exportCsv(collection) {
  const rows = state[collection];
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
