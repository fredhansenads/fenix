const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const backupDir = path.join(root, "backups");
const runtimeDir = path.join(root, "runtime");
const logDir = path.join(root, "logs");
const args = new Set(process.argv.slice(2));

loadEnvFile(path.join(root, ".env"));

if (args.has("--help")) {
  printHelp();
  process.exit(0);
}

main();

function main() {
  fs.mkdirSync(runtimeDir, { recursive: true });
  const checks = [
    checkDatabase(),
    checkLatestBackup(),
    checkStructuredLog(),
    checkErrorLog()
  ];
  const status = checks.some((check) => check.status === "falha")
    ? "falha"
    : checks.some((check) => check.status === "aviso")
      ? "aviso"
      : "ok";
  const report = {
    checkedAt: new Date().toISOString(),
    status,
    checks
  };
  const reportFile = path.join(runtimeDir, "monitor-status.json");
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), "utf-8");

  if (args.has("--json")) {
    console.log(JSON.stringify(report));
  } else {
    printReport(report, reportFile);
  }

  if (args.has("--strict") && status !== "ok") {
    process.exit(1);
  }

  if (args.has("--fail-on-falha") && status === "falha") {
    process.exit(1);
  }
}

function checkDatabase() {
  const startedAt = Date.now();
  const result = runPsql("SELECT 1;");
  if (result.status !== 0) {
    return {
      name: "database",
      status: "falha",
      message: cleanOutput(result.stderr || result.stdout || "PostgreSQL nao respondeu."),
      durationMs: Date.now() - startedAt
    };
  }
  return {
    name: "database",
    status: "ok",
    message: "PostgreSQL respondeu.",
    durationMs: Date.now() - startedAt
  };
}

function checkLatestBackup() {
  const maxAgeHours = Number(process.env.SANTUSERP_BACKUP_MAX_AGE_HOURS || 72);
  const latest = getLatestBackup();
  if (!latest) {
    return {
      name: "backup",
      status: "falha",
      message: "Nenhum backup local encontrado.",
      maxAgeHours
    };
  }

  const ageHours = Math.round(((Date.now() - latest.modifiedAt.getTime()) / 36e5) * 10) / 10;
  return {
    name: "backup",
    status: ageHours <= maxAgeHours ? "ok" : "aviso",
    message: ageHours <= maxAgeHours ? "Backup recente encontrado." : "Backup local esta antigo.",
    latestFile: latest.name,
    latestAt: latest.modifiedAt.toISOString(),
    ageHours,
    maxAgeHours,
    sizeBytes: latest.size
  };
}

function checkStructuredLog() {
  const filePath = path.join(logDir, "santuserp-structured.log");
  if (!fs.existsSync(filePath)) {
    return {
      name: "structured-log",
      status: "aviso",
      message: "Log estruturado ainda nao foi criado."
    };
  }

  const stats = fs.statSync(filePath);
  return {
    name: "structured-log",
    status: stats.size > 0 ? "ok" : "aviso",
    message: stats.size > 0 ? "Log estruturado ativo." : "Log estruturado existe, mas esta vazio.",
    file: path.relative(root, filePath),
    sizeBytes: stats.size,
    modifiedAt: stats.mtime.toISOString()
  };
}

function checkErrorLog() {
  const filePath = path.join(logDir, "santuserp.err.log");
  if (!fs.existsSync(filePath)) {
    return {
      name: "error-log",
      status: "ok",
      message: "Arquivo de erro ainda nao existe."
    };
  }

  const stats = fs.statSync(filePath);
  const lastLines = tail(filePath, 10);
  const hasRecentStack = /Unhandled|Error:|FALHA|falhou|ECONN|EADDRINUSE/i.test(lastLines);
  return {
    name: "error-log",
    status: hasRecentStack ? "aviso" : "ok",
    message: hasRecentStack ? "Log de erro contem ocorrencias que merecem revisao." : "Sem ocorrencias criticas aparentes no final do log.",
    file: path.relative(root, filePath),
    sizeBytes: stats.size,
    modifiedAt: stats.mtime.toISOString()
  };
}

function getLatestBackup() {
  if (!fs.existsSync(backupDir)) return null;
  const backups = fs.readdirSync(backupDir)
    .filter((name) => name.endsWith(".sql") || name.endsWith(".dump"))
    .map((name) => {
      const filePath = path.join(backupDir, name);
      const stats = fs.statSync(filePath);
      return { name, filePath, size: stats.size, modifiedAt: stats.mtime };
    })
    .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  return backups[0] || null;
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

function tail(filePath, lineCount) {
  const content = fs.readFileSync(filePath, "utf-8");
  return content.split(/\r?\n/).slice(-lineCount).join("\n");
}

function printReport(report, reportFile) {
  const marker = report.status === "ok" ? "OK" : report.status === "aviso" ? "AVISO" : "FALHA";
  console.log(`Monitor operacional SantusERP: ${marker}`);
  report.checks.forEach((check) => {
    const checkMarker = check.status === "ok" ? "OK" : check.status === "aviso" ? "AVISO" : "FALHA";
    console.log(`[${checkMarker}] ${check.name}: ${check.message}`);
  });
  console.log(`Relatorio: ${reportFile}`);
}

function cleanOutput(output) {
  return String(output || "").trim().replace(/\s+/g, " ");
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

function printHelp() {
  console.log(`
Uso:
  node scripts/monitor-check.js
  node scripts/monitor-check.js --strict
  node scripts/monitor-check.js --fail-on-falha
  node scripts/monitor-check.js --json

Objetivo:
  Verificar sinais operacionais locais: PostgreSQL, backup recente e logs.

Saida:
  runtime/monitor-status.json
`);
}
