const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const runtimeDir = path.join(root, "runtime");
const logDir = path.join(root, "logs");
const pidFile = path.join(runtimeDir, "santuserp.pid");
const outLog = path.join(logDir, "santuserp.out.log");
const errLog = path.join(logDir, "santuserp.err.log");

const args = process.argv.slice(2);
const action = args[0] || "status";

main();

function main() {
  if (!["start", "stop", "restart", "status"].includes(action)) {
    printHelp();
    process.exit(1);
  }

  if (action === "status") {
    printStatus();
    return;
  }

  if (action === "stop") {
    stopService();
    return;
  }

  if (action === "restart") {
    stopService({ quiet: true });
    startService();
    return;
  }

  startService();
}

function startService() {
  ensureDirs();
  const current = getServiceProcess();
  if (current.running) {
    console.log(`SantusERP ja esta em execucao. PID: ${current.pid}`);
    return;
  }

  const envFile = getArgValue("--env") || ".env";
  const env = {
    ...process.env,
    ...loadEnvFile(path.join(root, envFile))
  };
  const port = getArgValue("--port");
  const host = getArgValue("--host");
  if (port) env.PORT = port;
  if (host) env.HOST = host;

  const stdout = fs.openSync(outLog, "a");
  const stderr = fs.openSync(errLog, "a");
  const child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env,
    detached: true,
    stdio: ["ignore", stdout, stderr],
    windowsHide: true
  });

  child.unref();
  fs.writeFileSync(pidFile, String(child.pid), "utf-8");

  const urlHost = env.HOST && env.HOST !== "0.0.0.0" ? env.HOST : "127.0.0.1";
  const urlPort = env.PORT || "4173";
  console.log(`SantusERP iniciado. PID: ${child.pid}`);
  console.log(`URL: http://${urlHost}:${urlPort}`);
}

function stopService(options = {}) {
  const current = getServiceProcess();
  if (!current.running) {
    if (!options.quiet) console.log("SantusERP ja esta parado.");
    return;
  }

  try {
    process.kill(current.pid);
  } catch {
    try {
      process.kill(current.pid, "SIGKILL");
    } catch {}
  }
  removePidFile();
  if (!options.quiet) console.log("SantusERP parado.");
}

function printStatus() {
  const current = getServiceProcess();
  if (current.running) {
    console.log(`SantusERP em execucao. PID: ${current.pid}`);
    console.log(`Logs: ${outLog}`);
    console.log(`Erros: ${errLog}`);
    return;
  }
  console.log("SantusERP parado.");
}

function getServiceProcess() {
  if (!fs.existsSync(pidFile)) return { running: false, pid: 0 };
  const pid = Number(fs.readFileSync(pidFile, "utf-8").trim());
  if (!Number.isInteger(pid) || pid <= 0) {
    removePidFile();
    return { running: false, pid: 0 };
  }
  try {
    process.kill(pid, 0);
    return { running: true, pid };
  } catch {
    removePidFile();
    return { running: false, pid: 0 };
  }
}

function ensureDirs() {
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });
}

function removePidFile() {
  fs.rmSync(pidFile, { force: true });
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo de ambiente nao encontrado: ${filePath}`);
  }

  const env = {};
  const content = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key) env[key] = value;
  });
  return env;
}

function getArgValue(name) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1).trim();
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || "" : "";
}

function printHelp() {
  console.log(`
Uso:
  node scripts/santuserp-service.js status
  node scripts/santuserp-service.js start --env .env --port 4173
  node scripts/santuserp-service.js restart --env .env.production
  node scripts/santuserp-service.js stop
`);
}
