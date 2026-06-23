const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const databaseFile = path.join(root, "data", "fenix-db.json");
const schemaFile = path.join(root, "docs", "postgres-schema.sql");

const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");
const shouldApplySchema = args.has("--schema");
const shouldDryRun = args.has("--dry-run") || !shouldApply;
const defaultTenantId = "tenant_santus";
const defaultTenant = {
  id: defaultTenantId,
  name: "SANTUS",
  document: "00.000.000/0001-00",
  email: "admin@santus.com",
  phone: "",
  status: "ativo",
  notes: "Empresa padrao criada para migrar dados existentes."
};

if (args.has("--help")) {
  printHelp();
  process.exit(0);
}

main().catch((error) => {
  console.error(`Erro na migracao: ${error.message}`);
  process.exit(1);
});

async function main() {
  const data = ensureTenantModel(await readJsonDatabase());
  const summary = summarizeDatabase(data);
  printSummary(summary);

  const warnings = validateDatabase(data);
  if (warnings.length) {
    console.warn("\nAvisos:");
    warnings.forEach((warning) => console.warn(`- ${warning}`));
  }

  if (shouldDryRun) {
    console.log("\nDry-run concluido. Use --apply para executar no PostgreSQL.");
    return;
  }

  const sql = buildMigrationSql(data);
  const migrationFile = path.join(os.tmpdir(), `fenix-migration-${Date.now()}.sql`);
  await fsp.writeFile(migrationFile, sql, "utf-8");

  try {
    if (shouldApplySchema) {
      runPsqlFile(schemaFile);
    }
    runPsqlFile(migrationFile);
    console.log("\nMigracao aplicada com sucesso.");
  } finally {
    await fsp.rm(migrationFile, { force: true });
  }
}

function printHelp() {
  console.log(`
Uso:
  node scripts/migrate-json-to-postgres.js --dry-run
  node scripts/migrate-json-to-postgres.js --apply
  node scripts/migrate-json-to-postgres.js --apply --schema

Configuracao:
  DATABASE_URL=postgres://usuario:senha@localhost:5432/fenix

Alternativa:
  PGHOST=localhost
  PGPORT=5432
  PGDATABASE=fenix
  PGUSER=postgres
  PGPASSWORD=sua_senha

Windows:
  PSQL_PATH=C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe
`);
}

async function readJsonDatabase() {
  if (!fs.existsSync(databaseFile)) {
    throw new Error(`Arquivo nao encontrado: ${databaseFile}`);
  }
  const content = (await fsp.readFile(databaseFile, "utf-8")).replace(/^\uFEFF/, "");
  return JSON.parse(content);
}

function summarizeDatabase(data) {
  return {
    tenants: count(data.tenants),
    users: count(data.users),
    clients: count(data.clients),
    suppliers: count(data.suppliers),
    categories: count(data.categories),
    proposals: count(data.proposals),
    contracts: count(data.contracts),
    projects: count(data.projects),
    tasks: count(data.tasks),
    payables: count(data.payables),
    receivables: count(data.receivables),
    auditLogs: count(data.auditLogs),
    notificationReads: count(data.notificationReads)
  };
}

function printSummary(summary) {
  console.log("Resumo da base JSON:");
  Object.entries(summary).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });
}

function validateDatabase(data) {
  const warnings = [];
  if (!Array.isArray(data.users) || !data.users.some((user) => user.role === "admin" && user.status === "ativo")) {
    warnings.push("Nao foi encontrado usuario admin ativo.");
  }
  if (Array.isArray(data.users) && data.users.some((user) => user.password && !user.passwordHash)) {
    warnings.push("Existem usuarios com senha legada; o script vai gerar password_hash durante a carga.");
  }
  return warnings;
}

function buildMigrationSql(data) {
  const statements = [];
  statements.push("BEGIN;");
  statements.push("SET CONSTRAINTS ALL DEFERRED;");

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
  pushRows(statements, "audit_logs", data.auditLogs, mapAuditLog);
  pushNotificationReads(statements, data);

  statements.push("COMMIT;");
  return `${statements.join("\n")}\n`;
}

function pushRows(statements, table, rows, mapper) {
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const mapped = mapper(row);
    const columns = Object.keys(mapped);
    const values = columns.map((column) => sqlValue(mapped[column]));
    statements.push(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT (id) DO NOTHING;`);
  });
}

function pushNotificationReads(statements, data) {
  const reads = Array.isArray(data.notificationReads) ? data.notificationReads : [];
  const admin = Array.isArray(data.users) ? data.users.find((user) => user.role === "admin" && user.status === "ativo") : null;
  if (!admin) return;
  reads.forEach((notificationId) => {
    const id = hashId(`${admin.id}:${notificationId}`);
    statements.push(`INSERT INTO notification_reads (id, user_id, notification_id) VALUES (${sqlValue(id)}, ${sqlValue(admin.id)}, ${sqlValue(notificationId)}) ON CONFLICT (user_id, notification_id) DO NOTHING;`);
  });
}

function ensureTenantModel(data) {
  const next = data || {};
  if (!Array.isArray(next.tenants)) {
    next.tenants = [];
  }
  if (!next.tenants.some((tenant) => tenant.id === defaultTenantId)) {
    next.tenants.unshift(defaultTenant);
  }
  ["users", "clients", "suppliers", "categories", "payables", "receivables", "proposals", "contracts", "projects", "tasks", "auditLogs"].forEach((collection) => {
    if (!Array.isArray(next[collection])) {
      next[collection] = [];
    }
    next[collection].forEach((record) => {
      if (!record.tenantId && !record.tenant_id) {
        record.tenantId = defaultTenantId;
      }
    });
  });
  return next;
}

function mapTenant(tenant) {
  return pick(tenant, ["id", "name", "document", "email", "phone", "status", "notes"]);
}

function mapUser(user) {
  return {
    id: user.id,
    tenant_id: tenantId(user),
    name: user.name,
    email: user.email,
    password_hash: user.passwordHash || hashPassword(user.password || ""),
    role: user.role,
    status: user.status
  };
}

function mapClient(client) {
  return {
    id: client.id,
    tenant_id: tenantId(client),
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
    tenant_id: tenantId(supplier),
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
    tenant_id: tenantId(category),
    name: category.name,
    type: category.type
  };
}

function mapPayable(payable) {
  return {
    id: payable.id,
    tenant_id: tenantId(payable),
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
    tenant_id: tenantId(receivable),
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

function mapProposal(proposal) {
  return {
    id: proposal.id,
    tenant_id: tenantId(proposal),
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
    tenant_id: tenantId(contract),
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
    tenant_id: tenantId(project),
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
    tenant_id: tenantId(task),
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

function mapAuditLog(log) {
  return {
    id: log.id,
    tenant_id: tenantId(log),
    action: log.action,
    collection: log.collection,
    record_id: nullable(log.recordId),
    record_label: nullable(log.recordLabel),
    actor_id: nullable(log.actorId),
    actor_name: nullable(log.actorName),
    actor_role: nullable(log.actorRole),
    changed_fields: jsonValue(log.changedFields || []),
    denied_action: nullable(log.deniedAction),
    denied_reason: nullable(log.deniedReason),
    metadata: jsonValue(log.metadata || {}),
    created_at: nullable(log.createdAt)
  };
}

function tenantId(record) {
  return record?.tenantId || record?.tenant_id || defaultTenantId;
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
  return { __json: JSON.stringify(value) };
}

function sqlValue(value) {
  if (value && typeof value === "object" && Object.hasOwn(value, "__json")) {
    return `${quote(value.__json)}::jsonb`;
  }
  if (value === null || value === undefined) return "NULL";
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

function hashId(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex");
}

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

function runPsqlFile(filePath) {
  const args = ["-v", "ON_ERROR_STOP=1", "-f", filePath];
  if (process.env.DATABASE_URL) {
    args.push(process.env.DATABASE_URL);
  }
  const result = spawnSync(resolvePsqlCommand(), args, {
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(`psql falhou ao executar ${filePath}`);
  }
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
