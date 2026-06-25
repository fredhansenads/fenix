const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const backupDir = path.join(root, "backups");
const args = process.argv.slice(2);

loadEnvFile(path.join(root, ".env"));

if (args.includes("--help")) {
  printHelp();
  process.exit(0);
}

main();

function main() {
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const database = process.env.PGDATABASE || parseDatabaseFromUrl(process.env.DATABASE_URL) || "fenix";
  const outputFile = path.join(backupDir, `${database}-backup-${timestamp}.sql`);
  const result = spawnSync(resolvePgDumpCommand(), buildPgDumpArgs(outputFile), {
    stdio: "inherit",
    shell: false,
    env: process.env
  });

  if (result.status !== 0) {
    console.error("Erro ao gerar backup do PostgreSQL.");
    process.exit(result.status || 1);
  }

  const retentionDays = Number(getArgValue("--retention-days") || process.env.SANTUSERP_BACKUP_RETENTION_DAYS || 0);
  const removed = retentionDays > 0 ? cleanupOldBackups(retentionDays) : [];
  const payload = {
    ok: true,
    file: outputFile,
    retentionDays,
    removed
  };

  if (args.includes("--json")) {
    console.log(JSON.stringify(payload));
    return;
  }
  console.log(`Backup gerado com sucesso: ${outputFile}`);
  if (removed.length) {
    console.log(`Backups antigos removidos: ${removed.length}`);
  }
}

function printHelp() {
  console.log(`
Uso:
  node scripts/backup-postgres.js
  node scripts/backup-postgres.js --retention-days=14
  node scripts/backup-postgres.js --json

Objetivo:
  Gerar um backup SQL local do banco PostgreSQL configurado no .env.

Saida:
  backups/<database>-backup-<data>.sql

Retencao:
  --retention-days=N remove backups locais mais antigos que N dias apos gerar novo backup.

Configuracao:
  DATABASE_URL=postgres://usuario:senha@localhost:5432/fenix

Alternativa:
  PGHOST=localhost
  PGPORT=5432
  PGDATABASE=fenix
  PGUSER=postgres
  PGPASSWORD=sua_senha
  PGDUMP_PATH=C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe
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

function buildPgDumpArgs(outputFile) {
  const args = ["--format=plain", "--clean", "--if-exists", "--no-owner", "--no-privileges", "--file", outputFile];
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
  const candidate = windowsCandidates.find((item) => fs.existsSync(item));
  return candidate || "pg_dump";
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

function cleanupOldBackups(retentionDays) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return fs.readdirSync(backupDir)
    .filter((name) => name.endsWith(".sql") || name.endsWith(".dump"))
    .map((name) => {
      const filePath = path.join(backupDir, name);
      return { name, filePath, stats: fs.statSync(filePath) };
    })
    .filter((backup) => backup.stats.mtime.getTime() < cutoff)
    .map((backup) => {
      fs.rmSync(backup.filePath, { force: true });
      return backup.name;
    });
}

function getArgValue(name) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1).trim();
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || "" : "";
}
