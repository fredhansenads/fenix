const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const runtimeDir = path.join(root, "runtime");
const args = new Set(process.argv.slice(2));
const results = [];

if (args.has("--help")) {
  printHelp();
  process.exit(0);
}

main();

function main() {
  fs.mkdirSync(runtimeDir, { recursive: true });
  checkCommercialDocs();
  checkPackageScripts();
  checkOperationalFiles();
  checkIgnoredRuntimeData();

  if (!args.has("--skip-monitor")) {
    checkMonitor();
  }

  const status = results.some((result) => result.status === "falha")
    ? "falha"
    : results.some((result) => result.status === "aviso")
      ? "aviso"
      : "ok";
  const report = {
    checkedAt: new Date().toISOString(),
    status,
    results
  };
  const reportFile = path.join(runtimeDir, "client-readiness.json");
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), "utf-8");

  if (args.has("--json")) {
    console.log(JSON.stringify(report));
  } else {
    printReport(report, reportFile);
  }

  process.exit(status === "falha" ? 1 : 0);
}

function checkCommercialDocs() {
  const requiredDocs = [
    "docs/santuserp-comercial-suporte.md",
    "docs/santuserp-implantacao-cliente.md",
    "docs/santuserp-guia-usuario-final.md",
    "docs/santuserp-operacao-monitoramento.md",
    "docs/santuserp-deploy.md",
    "docs/santuserp-qa-release.md",
    "docs/santuserp-documentacao-oficial.md"
  ];
  const missing = requiredDocs.filter((file) => !fs.existsSync(path.join(root, file)));
  addResult("Documentacao para cliente", missing.length ? "falha" : "ok", missing.length ? `Faltando: ${missing.join(", ")}` : "Guias comerciais, implantacao, usuario, operacao e release encontrados.");
}

function checkPackageScripts() {
  const packagePath = path.join(root, "package.json");
  if (!fs.existsSync(packagePath)) {
    addResult("Atalhos npm", "falha", "package.json nao encontrado.");
    return;
  }
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
  const scripts = packageJson.scripts || {};
  const requiredScripts = ["check", "check:full", "monitor", "backup:retention", "seed:demo", "client:ready"];
  const missing = requiredScripts.filter((script) => !scripts[script]);
  addResult("Atalhos npm", missing.length ? "falha" : "ok", missing.length ? `Faltando: ${missing.join(", ")}` : "Atalhos essenciais para cliente encontrados.");
}

function checkOperationalFiles() {
  const requiredFiles = [
    "scripts/seed-postgres-demo.js",
    "scripts/backup-postgres.js",
    "scripts/restore-postgres.js",
    "scripts/monitor-check.js",
    "scripts/release-check.js",
    "scripts/install-backup-task.ps1",
    "config/.env.production.example",
    ".env.example"
  ];
  const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
  addResult("Arquivos operacionais", missing.length ? "falha" : "ok", missing.length ? `Faltando: ${missing.join(", ")}` : "Scripts e modelos de ambiente encontrados.");
}

function checkIgnoredRuntimeData() {
  const gitignorePath = path.join(root, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    addResult("Protecao de dados locais", "falha", ".gitignore nao encontrado.");
    return;
  }
  const content = fs.readFileSync(gitignorePath, "utf-8");
  const requiredPatterns = ["data/*.json", ".env", "backups/*.sql", "backups/*.dump", "logs/", "runtime/"];
  const missing = requiredPatterns.filter((pattern) => !content.includes(pattern));
  addResult("Protecao de dados locais", missing.length ? "falha" : "ok", missing.length ? `Padroes ausentes no .gitignore: ${missing.join(", ")}` : "Dados locais, backups, logs e runtime ficam fora do Git.");
}

function checkMonitor() {
  const result = spawnSync(process.execPath, [path.join("scripts", "monitor-check.js"), "--fail-on-falha"], {
    cwd: root,
    env: process.env,
    encoding: "utf-8",
    windowsHide: true
  });
  if (result.status === 0) {
    addResult("Monitor operacional", "ok", cleanOutput(result.stdout || "Monitor executado."));
    return;
  }
  addResult("Monitor operacional", "falha", cleanOutput(result.stderr || result.stdout || "Monitor retornou falha."));
}

function addResult(name, status, message) {
  results.push({ name, status, message });
}

function printReport(report, reportFile) {
  const marker = report.status === "ok" ? "OK" : report.status === "aviso" ? "AVISO" : "FALHA";
  console.log(`Client readiness SantusERP: ${marker}`);
  report.results.forEach((result) => {
    const resultMarker = result.status === "ok" ? "OK" : result.status === "aviso" ? "AVISO" : "FALHA";
    console.log(`[${resultMarker}] ${result.name}: ${result.message}`);
  });
  console.log(`Relatorio: ${reportFile}`);
}

function cleanOutput(output) {
  return String(output || "").trim().replace(/\s+/g, " ");
}

function printHelp() {
  console.log(`
Uso:
  node scripts/client-readiness-check.js
  node scripts/client-readiness-check.js --skip-monitor
  node scripts/client-readiness-check.js --json

Objetivo:
  Verificar se o SantusERP possui pacote minimo para demonstracao, venda, implantacao e suporte de clientes reais.

Saida:
  runtime/client-readiness.json
`);
}
