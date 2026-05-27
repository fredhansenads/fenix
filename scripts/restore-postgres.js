const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const backupDir = path.join(root, "backups");
const args = parseArgs(process.argv.slice(2));

loadEnvFile(path.join(root, ".env"));

if (args.help) {
  printHelp();
  process.exit(0);
}

try {
  main();
} catch (error) {
  console.error(`Erro na restauracao: ${error.message}`);
  process.exit(1);
}

function main() {
  const backups = listBackups();

  if (args.list) {
    printBackups(backups);
    return;
  }

  const backupFile = resolveBackupFile(backups);
  if (!backupFile) {
    console.error("Nenhum backup encontrado. Gere um backup com: node scripts/backup-postgres.js");
    process.exit(1);
  }

  printRestorePlan(backupFile);

  if (!args.apply) {
    console.log("\nDry-run concluido. Para restaurar de verdade, rode com --apply --confirm=RESTORE.");
    return;
  }

  if (args.confirm !== "RESTORE") {
    console.error("Restauracao bloqueada. Confirme usando --confirm=RESTORE.");
    process.exit(1);
  }

  createSafetyBackup();
  resetPublicSchema();
  restoreBackup(backupFile);
  console.log(`Restauracao concluida com sucesso: ${backupFile}`);
}

function printHelp() {
  console.log(`
Uso:
  node scripts/restore-postgres.js --list
  node scripts/restore-postgres.js --latest
  node scripts/restore-postgres.js --file backups/fenix-backup.sql
  node scripts/restore-postgres.js --latest --apply --confirm=RESTORE
  node scripts/restore-postgres.js --file backups/fenix-backup.sql --apply --confirm=RESTORE

Seguranca:
  Sem --apply, o script apenas mostra o plano de restauracao.
  Com --apply, o script gera um backup de seguranca antes de restaurar.
  A restauracao limpa o schema public antes de aplicar o arquivo SQL.
`);
}

function parseArgs(rawArgs) {
  return rawArgs.reduce((parsed, arg) => {
    if (arg === "--help") parsed.help = true;
    else if (arg === "--list") parsed.list = true;
    else if (arg === "--latest") parsed.latest = true;
    else if (arg === "--apply") parsed.apply = true;
    else if (arg.startsWith("--file=")) parsed.file = arg.slice("--file=".length);
    else if (arg.startsWith("--confirm=")) parsed.confirm = arg.slice("--confirm=".length);
    return parsed;
  }, {});
}

function listBackups() {
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir)
    .filter((name) => name.endsWith(".sql") || name.endsWith(".dump"))
    .map((name) => {
      const filePath = path.join(backupDir, name);
      const stats = fs.statSync(filePath);
      return { name, filePath, size: stats.size, modifiedAt: stats.mtime };
    })
    .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

function printBackups(backups) {
  if (!backups.length) {
    console.log("Nenhum backup encontrado em backups/.");
    return;
  }

  console.log("Backups encontrados:");
  backups.forEach((backup) => {
    console.log(`- ${backup.name} | ${backup.size} bytes | ${backup.modifiedAt.toLocaleString("pt-BR")}`);
  });
}

function resolveBackupFile(backups) {
  if (args.file) {
    const filePath = path.resolve(root, args.file);
    if (!filePath.startsWith(root)) {
      throw new Error("O arquivo de backup precisa estar dentro da pasta do projeto.");
    }
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo nao encontrado: ${filePath}`);
    }
    return filePath;
  }

  if (args.latest || backups.length) {
    return backups[0]?.filePath || "";
  }

  return "";
}

function printRestorePlan(backupFile) {
  const stats = fs.statSync(backupFile);
  console.log("Plano de restauracao:");
  console.log(`- Banco: ${process.env.PGDATABASE || parseDatabaseFromUrl(process.env.DATABASE_URL) || "fenix"}`);
  console.log(`- Arquivo: ${backupFile}`);
  console.log(`- Tamanho: ${stats.size} bytes`);
  console.log(`- Modificado em: ${stats.mtime.toLocaleString("pt-BR")}`);
}

function createSafetyBackup() {
  console.log("\nGerando backup de seguranca antes da restauracao...");
  const result = spawnSync(process.execPath, [path.join("scripts", "backup-postgres.js")], {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: process.env
  });
  if (result.status !== 0) {
    throw new Error("Backup de seguranca falhou. Restauracao cancelada.");
  }
}

function resetPublicSchema() {
  console.log("\nLimpando schema public...");
  const sql = "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;";
  const result = spawnSync(resolvePsqlCommand(), [...buildPsqlArgs(), "-c", sql], {
    stdio: "inherit",
    shell: false,
    env: process.env
  });
  if (result.status !== 0) {
    throw new Error("Falha ao limpar schema public.");
  }
}

function restoreBackup(backupFile) {
  console.log("\nAplicando backup...");
  const result = spawnSync(resolvePsqlCommand(), [...buildPsqlArgs(), "-f", backupFile], {
    stdio: "inherit",
    shell: false,
    env: process.env
  });
  if (result.status !== 0) {
    throw new Error("Falha ao aplicar backup.");
  }
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

function buildPsqlArgs() {
  const args = ["-v", "ON_ERROR_STOP=1"];
  if (process.env.DATABASE_URL) {
    return [...args, "-d", process.env.DATABASE_URL];
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

function parseDatabaseFromUrl(databaseUrl) {
  if (!databaseUrl) return "";

  try {
    const parsed = new URL(databaseUrl);
    return parsed.pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}
