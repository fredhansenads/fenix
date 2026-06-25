# SantusERP - Checklist de QA e release

Este documento define o fluxo minimo para aprovar uma entrega do SantusERP antes de uso por cliente.

## 1. Preparacao

- Confirmar branch correta.
- Confirmar `git status` limpo antes de iniciar a rodada.
- Confirmar `.env` apontando para o banco esperado.
- Gerar backup antes de migrations, limpeza de dados ou release.

Comandos:

```powershell
git status --short
node scripts\backup-postgres.js
node scripts\apply-postgres-migrations.js --dry-run
```

## 2. Validacao automatizada completa

Comando recomendado:

```powershell
npm run check:full
```

Equivalente direto:

```powershell
node scripts\release-check.js
```

Esse fluxo executa:

- Checagem sintatica de `server.js`.
- Checagem sintatica de `app.js`.
- Checagem sintatica do smoke test.
- Dry-run de migrations.
- Checklist operacional.
- Smoke test funcional.
- Teste de permissoes e isolamento multiempresa.
- Teste de carga basico.

## 3. Smoke funcional

O smoke test valida:

- Login administrativo.
- Cookie de sessao.
- Health check.
- Bootstrap.
- Perfil e preferencias da empresa.
- CRUD de clientes.
- Auditoria.
- Notificacoes lidas.
- Compliance e LGPD inicial.
- Reset de senha.
- Isolamento multiempresa.

Comando isolado:

```powershell
npm run smoke
```

## 4. Permissoes e multiempresa

O teste de permissoes valida:

- Admin global cria tenant temporario.
- Admin de tenant enxerga apenas sua empresa.
- Admin de tenant nao cria outras empresas.
- Usuario financeiro nao cria clientes.
- Usuario financeiro nao acessa auditoria.
- Usuario financeiro cria fornecedor dentro do proprio tenant.

Comando isolado:

```powershell
npm run test:permissions
```

## 5. Carga basica

O teste de carga executa requisicoes concorrentes autenticadas contra rotas principais e reprova se houver falha HTTP ou P95 acima do limite configurado.

Comando isolado:

```powershell
npm run test:load
```

Variaveis opcionais:

```powershell
$env:LOAD_REQUESTS=120
$env:LOAD_CONCURRENCY=12
$env:LOAD_MAX_P95_MS=2000
npm run test:load
```

## 6. QA manual minimo

Antes de liberar para cliente, conferir no navegador:

- Login e logout.
- Dashboard com onboarding fechado e aberto.
- Clientes, fornecedores, propostas, projetos, tarefas e usuarios.
- Financeiro com filtros e rolagem.
- Relatorios com exportacao CSV.
- Notificacoes marcadas como lidas.
- Automacoes gerando tarefas.
- Configuracoes: perfil, preferencias, convite, compliance e saude.
- Layout em notebook e celular.

## 7. Criterio de aprovacao

Uma release esta aprovada quando:

- `npm run check:full` passa.
- Nao ha migrations pendentes inesperadas.
- Backup recente existe.
- QA manual minimo foi executado.
- `git status --short` mostra apenas mudancas esperadas antes do commit.

