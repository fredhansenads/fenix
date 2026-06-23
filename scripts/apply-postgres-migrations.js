const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { applyPostgresMigrations, listMigrationStatus } = require("./postgres-migrations");

const root = path.resolve(__dirname, "..");
const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");
const shouldList = args.has("--list");
const shouldDryRun = args.has("--dry-run") || (!shouldApply && !shouldList);
const target = getArgValue("--target") || "";

loadEnvFile(path.join(root, ".env"));

if (args.has("--help")) {
  printHelp();
  process.exit(0);
}

main().catch((error) => {
  console.error(`Erro nas migrations: ${error.message}`);
  process.exit(1);
});

async function main() {
  if (shouldList) {
    const status = await listMigrationStatus({ root, runSql });
    status.forEach((migration) => {
      console.log(`${migration.status.padEnd(9)} ${migration.version} ${migration.name}`);
    });
    return;
  }

  const result = await applyPostgresMigrations({
    root,
    runSql,
    dryRun: shouldDryRun,
    target
  });

  console.log("");
  console.log(`Migrations aplicadas: ${result.applied.length}`);
  console.log(`Migrations ja existentes: ${result.skipped.length}`);
  if (shouldDryRun) {
    console.log("Dry-run concluido. Use --apply para executar.");
  }
}

function printHelp() {
  console.log(`
Uso:
  node scripts/apply-postgres-migrations.js --list
  node scripts/apply-postgres-migrations.js --dry-run
  node scripts/apply-postgres-migrations.js --apply
  node scripts/apply-postgres-migrations.js --apply --target=001_initial_schema

Objetivo:
  Aplicar migrations PostgreSQL versionadas do SantusERP.

Configuracao:
  O script le .env automaticamente e usa DATABASE_URL ou variaveis PG*.
`);
}

function runSql(sql) {
  const result = spawnSync(resolvePsqlCommand(), buildPsqlArgs(), {
    input: sql,
    cwd: root,
    env: process.env,
    encoding: "utf-8",
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql falhou.");
  }
  return result.stdout || "";
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

function getArgValue(prefix) {
  const match = process.argv.slice(2).find((arg) => arg.startsWith(`${prefix}=`));
  return match ? match.slice(prefix.length + 1).trim() : "";
}
