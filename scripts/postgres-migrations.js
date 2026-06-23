const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const migrationsTable = "schema_migrations";

async function applyPostgresMigrations(options) {
  const {
    root,
    runSql,
    logger = console,
    dryRun = false,
    target = "",
    direction = "up"
  } = options;
  const migrations = listMigrations(root, direction);
  const selected = target ? migrations.filter((migration) => migration.version <= target) : migrations;
  if (!selected.length) {
    logger?.log?.("Nenhuma migration encontrada.");
    return { applied: [], skipped: [] };
  }

  await runSql(ensureMigrationsTableSql());
  const applied = await readAppliedMigrations(runSql);
  const appliedVersions = new Map(applied.map((migration) => [migration.version, migration]));
  const result = { applied: [], skipped: [] };

  for (const migration of selected) {
    const current = appliedVersions.get(migration.version);
    if (current) {
      if (current.checksum !== migration.checksum) {
        throw new Error(`Checksum divergente para migration ${migration.version}.`);
      }
      result.skipped.push(migration);
      logger?.log?.(`OK ${migration.version} ja aplicada.`);
      continue;
    }

    if (dryRun) {
      result.applied.push(migration);
      logger?.log?.(`DRY ${migration.version} seria aplicada.`);
      continue;
    }

    logger?.log?.(`Aplicando ${migration.version} - ${migration.name}`);
    await runSql(migration.sql);
    await runSql(recordMigrationSql(migration));
    result.applied.push(migration);
  }

  return result;
}

async function listMigrationStatus(options) {
  const { root, runSql } = options;
  const migrations = listMigrations(root, "up");
  await runSql(ensureMigrationsTableSql());
  const applied = await readAppliedMigrations(runSql);
  const appliedVersions = new Map(applied.map((migration) => [migration.version, migration]));
  return migrations.map((migration) => {
    const current = appliedVersions.get(migration.version);
    return {
      ...migration,
      status: current ? "aplicada" : "pendente",
      appliedAt: current?.appliedAt || ""
    };
  });
}

function listMigrations(root, direction = "up") {
  const migrationsDir = path.join(root, "migrations");
  if (!fs.existsSync(migrationsDir)) return [];
  return fs.readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .filter((fileName) => direction === "down" ? fileName.endsWith(".down.sql") : !fileName.endsWith(".down.sql"))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => {
      const filePath = path.join(migrationsDir, fileName);
      const sql = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
      const version = fileName.replace(/\.down\.sql$|\.sql$/g, "");
      const name = version.replace(/^\d+_?/, "").replaceAll("_", " ") || version;
      return {
        version,
        name,
        fileName,
        filePath,
        checksum: checksum(sql),
        sql
      };
    });
}

async function readAppliedMigrations(runSql) {
  const output = await runSql(`
\\pset tuples_only on
\\pset format unaligned
SELECT version || '|' || checksum || '|' || COALESCE(applied_at::text, '')
FROM ${migrationsTable}
ORDER BY version;
`);
  return String(output || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [version, checksumValue, appliedAt] = line.split("|");
      return { version, checksum: checksumValue, appliedAt };
    });
}

function ensureMigrationsTableSql() {
  return `
CREATE TABLE IF NOT EXISTS ${migrationsTable} (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;
}

function recordMigrationSql(migration) {
  return `
INSERT INTO ${migrationsTable} (version, name, checksum)
VALUES (${sqlLiteral(migration.version)}, ${sqlLiteral(migration.name)}, ${sqlLiteral(migration.checksum)})
ON CONFLICT (version) DO UPDATE SET
  name = EXCLUDED.name,
  checksum = EXCLUDED.checksum;
`;
}

function checksum(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

module.exports = {
  applyPostgresMigrations,
  listMigrationStatus,
  listMigrations
};
