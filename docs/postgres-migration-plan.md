# Plano de migracao para PostgreSQL

Este documento descreve como migrar o FÊNIX do arquivo `data/fenix-db.json` para o schema PostgreSQL definido em `docs/postgres-schema.sql`.

## Status atual

Status em maio de 2026:

- Banco local `fenix` criado no PostgreSQL.
- Schema `docs/postgres-schema.sql` aplicado.
- Backend alterna automaticamente entre PostgreSQL e JSON conforme `.env`.
- `.env.example` documenta as variaveis esperadas.
- `scripts/migrate-json-to-postgres.js` existe para migracao assistida a partir de JSON.
- `scripts/seed-postgres-demo.js` existe para popular dados demonstrativos completos.
- Painel `Configuracoes > Saude do sistema` consulta `GET /api/health` e confirma a persistencia ativa.
- Tabela `user_sessions` registra sessoes persistentes com hash do token quando PostgreSQL esta ativo.

O JSON continua existindo como fallback tecnico, mas a persistencia local principal ja pode ser PostgreSQL quando o `.env` esta configurado.

## Objetivo

- Preservar os dados atuais do MVP.
- Substituir gradualmente a persistencia JSON por PostgreSQL.
- Manter as rotas da API estaveis durante a migracao.
- Reduzir risco de perda de dados em usuarios, financeiro, propostas, contratos, projetos, tarefas e auditoria.

## Ordem recomendada

1. Criar banco PostgreSQL e aplicar `docs/postgres-schema.sql`.
2. Fazer backup do arquivo `data/fenix-db.json`.
3. Rodar um script de leitura do JSON e carga nas tabelas PostgreSQL.
4. Validar contagens por tabela.
5. Validar login do usuario administrador.
6. Validar leitura das rotas modulares.
7. Alternar o repositorio do backend de JSON para PostgreSQL.
8. Manter o JSON congelado como backup temporario.
9. Remover a dependencia do endpoint `/api/state` apos a API modular cobrir todo o carregamento inicial.

## Ordem de carga dos dados

A carga deve respeitar dependencias entre tabelas:

1. `users`
2. `clients`
3. `suppliers`
4. `categories`
5. `proposals`
6. `contracts`
7. `projects`
8. `tasks`
9. `payables`
10. `receivables`
11. `audit_logs`
12. `notification_reads`
13. `user_sessions`

`receivables` deve entrar depois de `proposals`, porque pode referenciar `proposal_id`.

## Mapeamento JSON para PostgreSQL

| JSON | PostgreSQL | Observacao |
| --- | --- | --- |
| `users` | `users` | `passwordHash` vira `password_hash`; `password` legado deve virar hash antes da carga. |
| `clients` | `clients` | Campos sao praticamente diretos. |
| `suppliers` | `suppliers` | Campos sao praticamente diretos. |
| `categories` | `categories` | Usada para receitas e despesas. |
| `payables` | `payables` | `supplierId` vira `supplier_id`; `dueDate` vira `due_date`; `paymentDate` vira `payment_date`. |
| `receivables` | `receivables` | `clientId`, `proposalId`, `dueDate`, `receivedDate`, `paymentMethod` mudam para snake_case. |
| `proposals` | `proposals` | `clientId`, `validUntil`, `responsibleId`, `sentAt`, `approvedAt` mudam para snake_case. |
| `contracts` | `contracts` | `contractNumber`, `clientId`, `startDate`, `endDate`, `responsibleId`, `signedAt` mudam para snake_case. |
| `projects` | `projects` | `clientId`, `responsibleId`, `startDate`, `dueDate` mudam para snake_case. |
| `tasks` | `tasks` | `projectId`, `responsibleId`, `dueDate`, `completedAt` mudam para snake_case. |
| `auditLogs` | `audit_logs` | `changedFields` e `metadata` viram JSONB. |
| `notificationReads` | `notification_reads` | Hoje e lista simples; na migracao deve ser vinculada ao usuario quando houver sessao conhecida. |
| sessoes da API | `user_sessions` | Sessoes novas sao criadas pelo login; nao e necessario migrar sessoes antigas do JSON. |

## Cuidados por modulo

### Usuarios

- Nunca gravar `password` em texto puro no PostgreSQL.
- Se o JSON tiver `passwordHash`, mapear para `password_hash`.
- Se ainda existir `password`, gerar hash `scrypt` antes da insercao.
- Confirmar que existe ao menos um usuario `admin` ativo antes de ativar PostgreSQL.

### Financeiro

- Valores devem ser gravados como `NUMERIC(14, 2)`.
- Datas vazias devem virar `NULL`.
- `supplier_id`, `client_id` e `proposal_id` devem virar `NULL` quando a referencia nao existir.

### Propostas e contratos

- `amount` deve ser positivo.
- Datas obrigatorias devem existir antes da carga.
- `responsible_id` deve virar `NULL` quando o usuario nao existir mais.

### Projetos e tarefas

- `project_id` em tarefas deve virar `NULL` quando o projeto nao existir.
- Tarefas concluidas podem manter `completed_at`; tarefas abertas podem ficar com `completed_at` nulo.

### Auditoria

- `changedFields` deve ser convertido para JSONB.
- `metadata` deve ser convertido para JSONB.
- Eventos `denied` devem preservar `denied_action` e `denied_reason`.

### Notificacoes lidas

- A lista atual `notificationReads` nao possui usuario associado de forma forte.
- Para a primeira migracao, usar o usuario administrador ativo como dono inicial ou aguardar a evolucao do modelo por usuario.
- Em producao, o ideal e gravar leitura por usuario autenticado.

## Validacoes depois da carga

- Contar registros por tabela e comparar com o JSON original.
- Fazer login com `admin@santus.com`.
- Abrir dashboard, clientes, financeiro, propostas, contratos, projetos, tarefas, relatorios e auditoria.
- Criar, editar e excluir um registro de teste em modulo nao critico.
- Confirmar que a auditoria registra o teste.
- Confirmar que senhas nao aparecem em nenhuma resposta publica da API.

## Estrategia de rollback

1. Pausar o servidor.
2. Restaurar o reposititorio JSON no backend.
3. Restaurar `data/fenix-db.json` a partir do backup.
4. Reiniciar `node server.js`.
5. Validar login e dashboard.

## Proximo passo tecnico

Evoluir a persistencia PostgreSQL para reduzir a dependencia do endpoint `/api/state` e aproximar a API do modelo modular definitivo. O script `scripts/migrate-json-to-postgres.js` ja foi criado para:

- Leia `data/fenix-db.json`.
- Valide colecoes esperadas.
- Converta campos camelCase para snake_case.
- Gere hashes quando necessario.
- Insira dados respeitando a ordem de carga.
- Emita um resumo final com contagens e inconsistencias.

Status: script inicial criado. Seed demonstrativo PostgreSQL tambem disponivel em `scripts/seed-postgres-demo.js`.

## Como executar o script inicial

Validar o JSON sem aplicar no PostgreSQL:

```bash
node scripts/migrate-json-to-postgres.js --dry-run
```

Aplicar schema e dados usando `DATABASE_URL`:

```bash
set DATABASE_URL=postgres://usuario:senha@localhost:5432/fenix
node scripts/migrate-json-to-postgres.js --apply --schema
```

Aplicar somente dados, assumindo que o schema ja existe:

```bash
set DATABASE_URL=postgres://usuario:senha@localhost:5432/fenix
node scripts/migrate-json-to-postgres.js --apply
```

O script usa o cliente `psql`, portanto o executavel precisa estar disponivel no `PATH` do Windows.
Se o `psql` nao estiver no `PATH`, configure `PSQL_PATH`. Exemplo:

```bash
set PSQL_PATH=C:\Program Files\PostgreSQL\18\bin\psql.exe
```
