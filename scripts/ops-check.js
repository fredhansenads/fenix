const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const args = new Set(process.argv.slice(2));
const results = [];

loadEnvFile(path.join(root, ".env"));

if (args.has("--help")) {
  printHelp();
  process.exit(0);
}

main();

function main() {
  checkNode();
  checkEnv();
  checkCommand("psql", resolvePsqlCommand(), ["--version"]);
  checkCommand("pg_dump", resolvePgDumpCommand(), ["--version"]);
  checkDatabase();
  checkBackups();
  checkScripts();

  if (args.has("--with-smoke")) {
    checkSmokeTest();
  }

  printResults();
  const failed = results.some((result) => result.status === "falha");
  process.exit(failed ? 1 : 0);
}

function printHelp() {
  console.log(`
Uso:
  node scripts/ops-check.js
  node scripts/ops-check.js --with-smoke

Objetivo:
  Conferir rapidamente ambiente local, PostgreSQL, backups e scripts operacionais do SantusERP.

Observacao:
  --with-smoke executa tambem scripts/smoke-test.js.
`);
}

function checkNode() {
  addResult("Node.js", "ok", process.version);
}

function checkEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) {
    addResult(".env", "aviso", "Arquivo .env nao encontrado. O sistema pode cair para JSON/localStorage.");
    return;
  }

  const hasDatabase = Boolean(process.env.DATABASE_URL || process.env.PGDATABASE);
  addResult(".env", hasDatabase ? "ok" : "aviso", hasDatabase ? "Configuracao de banco encontrada." : "Sem DATABASE_URL ou PGDATABASE.");
}

function checkCommand(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    encoding: "utf-8",
    shell: false
  });
  if (result.status === 0) {
    addResult(label, "ok", cleanOutput(result.stdout || result.stderr));
    return;
  }
  addResult(label, "falha", cleanOutput(result.stderr || result.stdout || `${command} nao respondeu.`));
}

function checkDatabase() {
  const expectedTables = [
    "tenants",
    "users",
    "clients",
    "suppliers",
    "categories",
    "payables",
    "receivables",
    "proposals",
    "contracts",
    "projects",
    "tasks",
    "audit_logs",
    "notification_reads",
    "user_sessions"
  ];
  const result = runPsql(`
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
`);
  if (result.status !== 0) {
    addResult("PostgreSQL", "falha", cleanOutput(result.stderr || result.stdout));
    return;
  }

  const tables = String(result.stdout || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const missing = expectedTables.filter((table) => !tables.includes(table));
  if (missing.length) {
    addResult("Tabelas PostgreSQL", "falha", `Faltando: ${missing.join(", ")}`);
    return;
  }
  addResult("Tabelas PostgreSQL", "ok", `${tables.length} tabela(s) encontradas.`);

  const counts = runPsql(`
SELECT 'users=' || count(*) FROM users
UNION ALL SELECT 'tenants=' || count(*) FROM tenants
UNION ALL SELECT 'clients=' || count(*) FROM clients
UNION ALL SELECT 'audit_logs=' || count(*) FROM audit_logs;
`);
  if (counts.status === 0) {
    addResult("Contagens principais", "ok", cleanOutput(counts.stdout).replace(/\r?\n/g, ", "));
  } else {
    addResult("Contagens principais", "aviso", cleanOutput(counts.stderr || counts.stdout));
  }
}

function checkBackups() {
  const backupDir = path.join(root, "backups");
  if (!fs.existsSync(backupDir)) {
    addResult("Backups", "aviso", "Pasta backups/ ainda nao existe.");
    return;
  }

  const backups = fs.readdirSync(backupDir)
    .filter((name) => name.endsWith(".sql") || name.endsWith(".dump"))
    .map((name) => {
      const filePath = path.join(backupDir, name);
      return { name, stats: fs.statSync(filePath) };
    })
    .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

  if (!backups.length) {
    addResult("Backups", "aviso", "Nenhum backup encontrado em backups/.");
    return;
  }
  addResult("Backups", "ok", `Mais recente: ${backups[0].name} (${backups[0].stats.size} bytes).`);
}

function checkScripts() {
  const requiredScripts = [
    "backup-postgres.js",
    "restore-postgres.js",
    "seed-postgres-demo.js",
    "smoke-test.js"
  ];
  const missing = requiredScripts.filter((script) => !fs.existsSync(path.join(root, "scripts", script)));
  addResult("Scripts operacionais", missing.length ? "falha" : "ok", missing.length ? `Faltando: ${missing.join(", ")}` : "Scripts principais encontrados.");
}

function checkSmokeTest() {
  const result = spawnSync(process.execPath, [path.join("scripts", "smoke-test.js")], {
    cwd: root,
    env: process.env,
    encoding: "utf-8",
    shell: false
  });
  if (result.status === 0) {
    addResult("Smoke test", "ok", cleanOutput(result.stdout));
    return;
  }
  addResult("Smoke test", "falha", cleanOutput(result.stderr || result.stdout));
}

function runPsql(sql) {
  return spawnSync(resolvePsqlCommand(), [...buildPsqlArgs(), "-tAc", sql], {
    cwd: root,
    env: process.env,
    encoding: "utf-8",
    shell: false
  });
}

function buildPsqlArgs() {
  if (process.env.DATABASE_URL) {
    return ["-d", process.env.DATABASE_URL];
  }
  return [
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
  return windowsCandidates.find((candidate) => fs.existsSync(candidate)) || "psql";
}

function resolvePgDumpCommand() {
  if (process.env.PGDUMP_PATH) {
    return process.env.PGDUMP_PATH;
  }
  if (process.env.PSQL_PATH) {
    const candidate = path.join(path.dirname(process.env.PSQL_PATH), "pg_dump.exe");
    if (fs.existsSync(candidate)) return candidate;
  }

  const windowsCandidates = [
    "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe"
  ];
  return windowsCandidates.find((candidate) => fs.existsSync(candidate)) || "pg_dump";
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

function addResult(name, status, detail) {
  results.push({ name, status, detail });
}

function printResults() {
  console.log("Checklist operacional SantusERP");
  results.forEach((result) => {
    const marker = result.status === "ok" ? "OK" : result.status === "aviso" ? "AVISO" : "FALHA";
    console.log(`[${marker}] ${result.name}: ${result.detail}`);
  });
}

function cleanOutput(output) {
  return String(output || "").trim().replace(/\s+/g, " ");
}
