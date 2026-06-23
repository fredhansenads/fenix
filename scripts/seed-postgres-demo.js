const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const crypto = require("crypto");
const { applyPostgresMigrations } = require("./postgres-migrations");

const root = path.resolve(__dirname, "..");

loadEnvFile(path.join(root, ".env"));

if (process.argv.includes("--help")) {
  printHelp();
  process.exit(0);
}

main().catch((error) => {
  console.error(`Erro ao aplicar seed demonstrativo: ${error.message}`);
  process.exit(1);
});

async function main() {
  await applyPostgresMigrations({ root, runSql });
  const data = buildDemoData();
  const sql = buildSeedSql(data);
  const result = spawnSync(resolvePsqlCommand(), buildPsqlArgs(), {
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
    shell: false,
    env: process.env
  });

  if (result.status !== 0) {
    console.error("Erro ao aplicar seed demonstrativo no PostgreSQL.");
    process.exit(result.status || 1);
  }

  console.log("Seed demonstrativo aplicado com sucesso no PostgreSQL.");
  console.log(`Empresas: ${data.tenants.length}`);
  console.log(`Usuarios: ${data.users.length}`);
  console.log(`Clientes: ${data.clients.length}`);
  console.log(`Fornecedores: ${data.suppliers.length}`);
  console.log(`Propostas: ${data.proposals.length}`);
  console.log(`Contratos: ${data.contracts.length}`);
  console.log(`Projetos: ${data.projects.length}`);
  console.log(`Tarefas: ${data.tasks.length}`);
}

function runSql(sql) {
  const result = spawnSync(resolvePsqlCommand(), buildPsqlArgs(), {
    input: sql,
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
    env: process.env,
    encoding: "utf-8"
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql falhou.");
  }
  return result.stdout || "";
}

function printHelp() {
  console.log(`
Uso:
  node scripts/seed-postgres-demo.js

Objetivo:
  Popular o banco PostgreSQL do SantusERP com dados demonstrativos consistentes.

Configuracao:
  O script le .env automaticamente e usa DATABASE_URL ou variaveis PG*.
`);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function buildDemoData() {
  const tenants = [
    { id: "tenant_santus", name: "SANTUS", document: "00.000.000/0001-00", email: "admin@santus.com", phone: "", status: "ativo", notes: "Empresa padrao do SantusERP." }
  ];
  const tenantId = tenants[0].id;
  const users = [
    { id: "usr_admin", tenantId, name: "Administrador SANTUS", email: "admin@santus.com", password: "santus123", role: "admin", status: "ativo" },
    { id: "usr_comercial", tenantId, name: "Gestor Comercial", email: "comercial@santus.com", password: "santus123", role: "comercial", status: "ativo" },
    { id: "usr_financeiro", tenantId, name: "Analista Financeiro", email: "financeiro@santus.com", password: "santus123", role: "financeiro", status: "ativo" },
    { id: "usr_operacional", tenantId, name: "Coordenador Operacional", email: "operacional@santus.com", password: "santus123", role: "operacional", status: "ativo" }
  ];

  const clients = [
    { id: "cli_nexus", tenantId, type: "PJ", name: "Nexus Digital", document: "12.345.678/0001-90", email: "contato@nexus.com", phone: "(11) 98888-1000", status: "ativo", notes: "Cliente recorrente de tecnologia." },
    { id: "cli_orion", tenantId, type: "PJ", name: "Orion Labs", document: "98.765.432/0001-10", email: "financeiro@orion.com", phone: "(21) 97777-2000", status: "prospect", notes: "Aguardando retorno da proposta." },
    { id: "cli_atlas", tenantId, type: "PJ", name: "Atlas Health", document: "45.222.888/0001-31", email: "ti@atlashealth.com", phone: "(31) 96666-3000", status: "ativo", notes: "Projeto de automacao operacional." }
  ];

  const suppliers = [
    { id: "sup_cloud", tenantId, name: "Cloud Prime", document: "22.222.222/0001-22", email: "billing@cloudprime.com", phone: "(11) 3000-4000", category: "Infraestrutura", status: "ativo" },
    { id: "sup_media", tenantId, name: "Media Flow", document: "33.333.333/0001-33", email: "financeiro@mediaflow.com", phone: "(11) 3555-1212", category: "Marketing", status: "ativo" }
  ];

  const categories = [
    { id: "cat_servicos", tenantId, name: "Receita de servicos", type: "receita" },
    { id: "cat_infra", tenantId, name: "Infraestrutura", type: "despesa" },
    { id: "cat_marketing", tenantId, name: "Marketing", type: "despesa" },
    { id: "cat_operacional", tenantId, name: "Operacional", type: "despesa" }
  ];

  const proposals = [
    { id: "pro_santuserp_mvp", tenantId, clientId: "cli_nexus", title: "ERP interno fase 1", description: "Implantacao do MVP administrativo.", amount: 18000, validUntil: isoOffset(12), status: "enviada", responsibleId: "usr_comercial", sentAt: isoOffset(-4), approvedAt: "", notes: "" },
    { id: "pro_automacao", tenantId, clientId: "cli_orion", title: "Automacao comercial", description: "Fluxo de CRM e propostas.", amount: 9500, validUntil: isoOffset(20), status: "aprovada", responsibleId: "usr_comercial", sentAt: isoOffset(-10), approvedAt: isoOffset(-1), notes: "" },
    { id: "pro_bi", tenantId, clientId: "cli_atlas", title: "Dashboard executivo BI", description: "Indicadores integrados de operacao.", amount: 12500, validUntil: isoOffset(5), status: "rascunho", responsibleId: "usr_comercial", sentAt: "", approvedAt: "", notes: "Revisar escopo com area tecnica." }
  ];

  const contracts = [
    { id: "ctr_santuserp_001", tenantId, clientId: "cli_nexus", contractNumber: "SantusERP-2026-001", title: "Contrato de implantacao ERP", amount: 18000, startDate: isoOffset(-5), endDate: isoOffset(85), status: "ativo", responsibleId: "usr_admin", signedAt: isoOffset(-5), notes: "Contrato demonstrativo do MVP." },
    { id: "ctr_auto_002", tenantId, clientId: "cli_orion", contractNumber: "SantusERP-2026-002", title: "Contrato de automacao comercial", amount: 9500, startDate: isoOffset(-1), endDate: isoOffset(59), status: "rascunho", responsibleId: "usr_comercial", signedAt: "", notes: "Aguardando assinatura final." }
  ];

  const projects = [
    { id: "prj_implantacao", tenantId, clientId: "cli_nexus", name: "Implantacao ERP SANTUS", description: "MVP administrativo e financeiro.", responsibleId: "usr_operacional", startDate: isoOffset(-2), dueDate: isoOffset(28), status: "em_andamento" },
    { id: "prj_automacao", tenantId, clientId: "cli_orion", name: "Automacao comercial Orion", description: "Fluxos de proposta e follow-up.", responsibleId: "usr_operacional", startDate: isoOffset(1), dueDate: isoOffset(35), status: "planejado" }
  ];

  const tasks = [
    { id: "tsk_escopo", tenantId, projectId: "prj_implantacao", title: "Definir escopo do MVP", description: "Organizar modulos prioritarios.", responsibleId: "usr_admin", priority: "alta", status: "concluida", dueDate: isoOffset(-1), completedAt: isoOffset(-1) },
    { id: "tsk_dashboard", tenantId, projectId: "prj_implantacao", title: "Implementar dashboard inicial", description: "Cards financeiros e operacionais.", responsibleId: "usr_operacional", priority: "alta", status: "em_andamento", dueDate: isoOffset(4), completedAt: "" },
    { id: "tsk_validacao", tenantId, projectId: "prj_implantacao", title: "Validar fluxo financeiro", description: "Conferir contas a pagar e receber.", responsibleId: "usr_financeiro", priority: "media", status: "pendente", dueDate: isoOffset(7), completedAt: "" },
    { id: "tsk_kickoff", tenantId, projectId: "prj_automacao", title: "Preparar kickoff com cliente", description: "Agenda inicial e pontos de integracao.", responsibleId: "usr_comercial", priority: "media", status: "pendente", dueDate: isoOffset(10), completedAt: "" }
  ];

  const payables = [
    { id: "pay_cloud", tenantId, supplierId: "sup_cloud", category: "Infraestrutura", description: "Hospedagem e banco de dados", amount: 680, dueDate: isoOffset(5), paymentDate: "", status: "pendente", notes: "" },
    { id: "pay_media", tenantId, supplierId: "sup_media", category: "Marketing", description: "Campanha de aquisicao", amount: 1250, dueDate: isoOffset(-3), paymentDate: "", status: "pendente", notes: "" },
    { id: "pay_tools", tenantId, supplierId: "sup_cloud", category: "Operacional", description: "Ferramentas SaaS", amount: 390, dueDate: isoOffset(15), paymentDate: "", status: "pendente", notes: "" }
  ];

  const receivables = [
    { id: "rec_nexus_mensal", tenantId, clientId: "cli_nexus", proposalId: "pro_santuserp_mvp", category: "Receita de servicos", description: "Mensalidade Nexus Digital", amount: 4200, dueDate: isoOffset(2), receivedDate: "", status: "pendente", paymentMethod: "Pix" },
    { id: "rec_orion_setup", tenantId, clientId: "cli_orion", proposalId: "pro_automacao", category: "Receita de servicos", description: "Setup de automacao", amount: 7800, dueDate: isoOffset(-6), receivedDate: isoOffset(-2), status: "recebido", paymentMethod: "Transferencia" },
    { id: "rec_atlas_bi", tenantId, clientId: "cli_atlas", proposalId: "pro_bi", category: "Receita de servicos", description: "Entrada projeto BI", amount: 5000, dueDate: isoOffset(9), receivedDate: "", status: "pendente", paymentMethod: "Boleto" }
  ];

  return {
    tenants,
    users,
    clients,
    suppliers,
    categories,
    proposals,
    contracts,
    projects,
    tasks,
    payables,
    receivables,
    auditLogs: [],
    notificationReads: []
  };
}

function buildSeedSql(data) {
  const statements = [
    "BEGIN;",
    "TRUNCATE password_reset_tokens, user_sessions, notification_reads, audit_logs, tasks, projects, contracts, receivables, proposals, payables, categories, suppliers, clients, users, tenants;"
  ];

  pushRows(statements, "tenants", data.tenants, mapTenant);
  pushRows(statements, "users", data.users, mapUser);
  pushRows(statements, "clients", data.clients, mapClient);
  pushRows(statements, "suppliers", data.suppliers, mapSupplier);
  pushRows(statements, "categories", data.categories, mapCategory);
  pushRows(statements, "proposals", data.proposals, mapProposal);
  pushRows(statements, "contracts", data.contracts, mapContract);
  pushRows(statements, "projects", data.projects, mapProject);
  pushRows(statements, "tasks", data.tasks, mapTask);
  pushRows(statements, "payables", data.payables, mapPayable);
  pushRows(statements, "receivables", data.receivables, mapReceivable);

  statements.push("COMMIT;");
  return `${statements.join("\n")}\n`;
}

function pushRows(statements, table, rows, mapper) {
  rows.forEach((row) => {
    const mapped = mapper(row);
    const columns = Object.keys(mapped);
    const values = columns.map((column) => sqlValue(mapped[column]));
    statements.push(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")});`);
  });
}

function mapTenant(tenant) {
  return {
    ...pick(tenant, ["id", "name", "document", "email", "phone", "status", "notes"]),
    settings: jsonValue(tenant.settings || {
      onboardingCompleted: false,
      defaultPageSize: 10,
      compactTables: false,
      dashboardFocus: "executivo"
    })
  };
}

function mapUser(user) {
  return {
    id: user.id,
    tenant_id: user.tenantId,
    name: user.name,
    email: user.email,
    password_hash: hashPassword(user.password),
    role: user.role,
    status: user.status
  };
}

function mapClient(client) {
  return {
    id: client.id,
    tenant_id: client.tenantId,
    type: client.type,
    name: client.name,
    document: client.document,
    email: client.email,
    phone: nullable(client.phone),
    status: client.status,
    notes: nullable(client.notes)
  };
}

function mapSupplier(supplier) {
  return {
    id: supplier.id,
    tenant_id: supplier.tenantId,
    name: supplier.name,
    document: supplier.document,
    email: supplier.email,
    phone: nullable(supplier.phone),
    category: supplier.category,
    status: supplier.status
  };
}

function mapCategory(category) {
  return {
    id: category.id,
    tenant_id: category.tenantId,
    name: category.name,
    type: category.type
  };
}

function mapProposal(proposal) {
  return {
    id: proposal.id,
    tenant_id: proposal.tenantId,
    client_id: nullable(proposal.clientId),
    title: proposal.title,
    description: nullable(proposal.description),
    amount: Number(proposal.amount || 0),
    valid_until: nullable(proposal.validUntil),
    status: proposal.status,
    responsible_id: nullable(proposal.responsibleId),
    sent_at: nullable(proposal.sentAt),
    approved_at: nullable(proposal.approvedAt),
    notes: nullable(proposal.notes)
  };
}

function mapContract(contract) {
  return {
    id: contract.id,
    tenant_id: contract.tenantId,
    client_id: nullable(contract.clientId),
    contract_number: contract.contractNumber,
    title: contract.title,
    amount: Number(contract.amount || 0),
    start_date: nullable(contract.startDate),
    end_date: nullable(contract.endDate),
    status: contract.status,
    responsible_id: nullable(contract.responsibleId),
    signed_at: nullable(contract.signedAt),
    notes: nullable(contract.notes)
  };
}

function mapProject(project) {
  return {
    id: project.id,
    tenant_id: project.tenantId,
    client_id: nullable(project.clientId),
    name: project.name,
    description: nullable(project.description),
    responsible_id: nullable(project.responsibleId),
    start_date: nullable(project.startDate),
    due_date: nullable(project.dueDate),
    status: project.status
  };
}

function mapTask(task) {
  return {
    id: task.id,
    tenant_id: task.tenantId,
    project_id: nullable(task.projectId),
    title: task.title,
    description: nullable(task.description),
    responsible_id: nullable(task.responsibleId),
    priority: task.priority,
    status: task.status,
    due_date: nullable(task.dueDate),
    completed_at: nullable(task.completedAt)
  };
}

function mapPayable(payable) {
  return {
    id: payable.id,
    tenant_id: payable.tenantId,
    supplier_id: nullable(payable.supplierId),
    category: payable.category,
    description: payable.description,
    amount: Number(payable.amount || 0),
    due_date: nullable(payable.dueDate),
    payment_date: nullable(payable.paymentDate),
    status: payable.status,
    notes: nullable(payable.notes)
  };
}

function mapReceivable(receivable) {
  return {
    id: receivable.id,
    tenant_id: receivable.tenantId,
    client_id: nullable(receivable.clientId),
    proposal_id: nullable(receivable.proposalId),
    category: receivable.category,
    description: receivable.description,
    amount: Number(receivable.amount || 0),
    due_date: nullable(receivable.dueDate),
    received_date: nullable(receivable.receivedDate),
    status: receivable.status,
    payment_method: nullable(receivable.paymentMethod)
  };
}

function pick(source, keys) {
  return keys.reduce((result, key) => {
    result[key] = nullable(source[key]);
    return result;
  }, {});
}

function nullable(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

function jsonValue(value) {
  return { __json: JSON.stringify(value || {}) };
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (value && typeof value === "object" && value.__json !== undefined) return `${quote(value.__json)}::jsonb`;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return quote(value);
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function isoOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildPsqlArgs() {
  const args = ["-X", "-q", "-v", "ON_ERROR_STOP=1"];
  if (process.env.DATABASE_URL) {
    return [...args, process.env.DATABASE_URL];
  }
  return [
    ...args,
    "-h", process.env.PGHOST || "localhost",
    "-p", process.env.PGPORT || "5432",
    "-U", process.env.PGUSER || "postgres",
    "-d", process.env.PGDATABASE || "fenix"
  ];
}

function resolvePsqlCommand() {
  if (process.env.PSQL_PATH) {
    return process.env.PSQL_PATH;
  }

  const windowsCandidates = [
    "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe"
  ];
  const candidate = windowsCandidates.find((item) => fs.existsSync(item));
  return candidate || "psql";
}
