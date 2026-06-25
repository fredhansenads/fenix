const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const steps = [
  {
    name: "Sintaxe server.js",
    command: [process.execPath, ["--check", "server.js"]]
  },
  {
    name: "Sintaxe app.js",
    command: [process.execPath, ["--check", "app.js"]]
  },
  {
    name: "Sintaxe scripts principais",
    command: [process.execPath, ["--check", path.join("scripts", "smoke-test.js")]]
  },
  {
    name: "Migrations dry-run",
    command: [process.execPath, [path.join("scripts", "apply-postgres-migrations.js"), "--dry-run"]]
  },
  {
    name: "Checklist operacional",
    command: [process.execPath, [path.join("scripts", "ops-check.js")]]
  },
  {
    name: "Monitor operacional",
    command: [process.execPath, [path.join("scripts", "monitor-check.js"), "--fail-on-falha"]]
  },
  {
    name: "Prontidao para cliente",
    command: [process.execPath, [path.join("scripts", "client-readiness-check.js"), "--skip-monitor"]]
  },
  {
    name: "Smoke test",
    command: [process.execPath, [path.join("scripts", "smoke-test.js")]]
  },
  {
    name: "Permissoes e multiempresa",
    command: [process.execPath, [path.join("scripts", "permission-test.js")]]
  },
  {
    name: "Carga basica",
    command: [process.execPath, [path.join("scripts", "load-test.js")]]
  }
];

main();

function main() {
  console.log("Release check SantusERP");
  console.log(`Workspace: ${root}`);
  console.log("");

  const startedAt = Date.now();
  for (const step of steps) {
    runStep(step);
  }

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("");
  console.log(`Release check concluido com sucesso em ${seconds}s.`);
}

function runStep(step) {
  const [command, args] = step.command;
  process.stdout.write(`[RUN] ${step.name}... `);
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    encoding: "utf-8",
    windowsHide: true
  });

  if (result.status !== 0) {
    console.log("falha");
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    if (output) {
      console.error(output);
    }
    process.exit(result.status || 1);
  }

  console.log("ok");
}
