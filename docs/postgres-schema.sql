-- SantusERP - schema PostgreSQL inicial
-- Objetivo: mapear o modelo atual do MVP para uma futura migracao do JSON local.

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('ativo', 'suspenso', 'inativo')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gestor', 'financeiro', 'comercial', 'operacional', 'colaborador', 'visualizador')),
  status TEXT NOT NULL CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('PJ', 'PF')),
  name TEXT NOT NULL,
  document TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('ativo', 'prospect', 'inativo')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  document TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payables (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'pago', 'cancelado')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE receivables (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  proposal_id TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  received_date DATE,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'recebido', 'cancelado')),
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE proposals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  valid_until DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('rascunho', 'enviada', 'aprovada', 'recusada', 'expirada', 'cancelada')),
  responsible_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  sent_at DATE,
  approved_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE receivables
  ADD CONSTRAINT receivables_proposal_id_fkey
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL;

CREATE TABLE contracts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  contract_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('rascunho', 'ativo', 'suspenso', 'encerrado', 'cancelado')),
  responsible_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  signed_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  responsible_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planejado', 'em_andamento', 'pausado', 'concluido', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  responsible_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  priority TEXT NOT NULL CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  status TEXT NOT NULL CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  due_date DATE NOT NULL,
  completed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'denied')),
  collection TEXT NOT NULL,
  record_id TEXT,
  record_label TEXT,
  actor_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  changed_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  denied_action TEXT,
  denied_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_reads (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  notification_id TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_id)
);

CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_role TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  tenant_name TEXT NOT NULL,
  is_global_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_tenant_status ON clients(tenant_id, status);
CREATE INDEX idx_payables_status_due_date ON payables(status, due_date);
CREATE INDEX idx_payables_tenant_status_due_date ON payables(tenant_id, status, due_date);
CREATE INDEX idx_receivables_status_due_date ON receivables(status, due_date);
CREATE INDEX idx_receivables_tenant_status_due_date ON receivables(tenant_id, status, due_date);
CREATE INDEX idx_proposals_status_valid_until ON proposals(status, valid_until);
CREATE INDEX idx_proposals_tenant_status_valid_until ON proposals(tenant_id, status, valid_until);
CREATE INDEX idx_contracts_status_end_date ON contracts(status, end_date);
CREATE INDEX idx_contracts_tenant_status_end_date ON contracts(tenant_id, status, end_date);
CREATE INDEX idx_projects_status_due_date ON projects(status, due_date);
CREATE INDEX idx_projects_tenant_status_due_date ON projects(tenant_id, status, due_date);
CREATE INDEX idx_tasks_status_due_date ON tasks(status, due_date);
CREATE INDEX idx_tasks_tenant_status_due_date ON tasks(tenant_id, status, due_date);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_collection_action ON audit_logs(collection, action);
CREATE INDEX idx_audit_logs_tenant_created_at ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_tenant_id ON user_sessions(tenant_id);
