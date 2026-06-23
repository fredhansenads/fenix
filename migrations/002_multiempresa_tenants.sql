BEGIN;

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO tenants (id, name, document, email, phone, status, notes)
VALUES ('tenant_santus', 'SANTUS', '00.000.000/0001-00', 'admin@santus.com', '', 'ativo', 'Empresa padrao criada para migrar os dados existentes.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE payables ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS tenant_name TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_global_admin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users SET tenant_id = 'tenant_santus' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE clients SET tenant_id = 'tenant_santus' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE suppliers SET tenant_id = 'tenant_santus' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE categories SET tenant_id = 'tenant_santus' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE payables SET tenant_id = 'tenant_santus' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE receivables SET tenant_id = 'tenant_santus' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE proposals SET tenant_id = 'tenant_santus' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE contracts SET tenant_id = 'tenant_santus' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE projects SET tenant_id = 'tenant_santus' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE tasks SET tenant_id = 'tenant_santus' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE audit_logs SET tenant_id = 'tenant_santus' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE user_sessions SET user_email = users.email
FROM users
WHERE user_sessions.user_id = users.id
  AND (user_sessions.user_email IS NULL OR user_sessions.user_email = '');
UPDATE user_sessions SET tenant_id = 'tenant_santus' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE user_sessions SET tenant_name = 'SANTUS' WHERE tenant_name IS NULL OR tenant_name = '';

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_status ON clients(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_status ON suppliers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_type ON categories(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_payables_tenant_status_due_date ON payables(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_receivables_tenant_status_due_date ON receivables(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_proposals_tenant_status_valid_until ON proposals(tenant_id, status, valid_until);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_status_end_date ON contracts(tenant_id, status, end_date);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status_due_date ON projects(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status_due_date ON tasks(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_at ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant_id ON user_sessions(tenant_id);

COMMIT;
