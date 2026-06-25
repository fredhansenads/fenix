# SantusERP MVP

Este repositorio contem o primeiro MVP web do SantusERP, o ERP da SANTUS.

## Documentacao oficial

A documentacao consolidada do sistema esta em:

- `docs/santuserp-documentacao-oficial.md`
- `docs/santuserp-checklist-operacional.md`
- `docs/santuserp-ambiente-local.md`
- `docs/santuserp-roadmap-producao.md`
- `docs/santuserp-deploy.md`
- `docs/santuserp-qa-release.md`
- `docs/santuserp-operacao-monitoramento.md`

Ela descreve visao geral, modulos, regras de negocio, API, PostgreSQL, rotinas locais, checklist operacional, monitoramento, status das fases, roadmap de producao e proximas etapas recomendadas.

## Como abrir

Opcao simples: abra o arquivo `index.html` no navegador.

Opcao recomendada: rode o servidor local e acesse `http://127.0.0.1:4173`.

```bash
node server.js
```

No Windows, tambem e possivel usar o inicializador local:

```powershell
.\scripts\start-santuserp.ps1 -Open
```

## Acesso inicial

- E-mail: `admin@santus.com`
- Senha: `santus123`

## Modulos implementados

- Login local
- Usuarios e permissoes basicas
- Dashboard executivo
- Clientes
- Fornecedores
- Financeiro
- Contas a pagar
- Contas a receber
- Fluxo financeiro basico
- Propostas
- Contratos
- Projetos
- Tarefas
- Relatorios executivos com exportacao CSV
- Notificacoes internas
- Automacoes iniciais para gerar tarefas de acompanhamento
- Historico de atividades
- Empresas e isolamento multiempresa
- Seguranca/compliance inicial: senha forte, reset de senha, auditoria de autenticacao e LGPD inicial
- UX para cliente real: onboarding, perfil da empresa, preferencias, listas paginadas e guia rapido
- Produto essencial: convites assistidos, painel administrativo, notificacoes/automacoes configuraveis e exportacoes profissionais
- Configuracoes administrativas
- Saude do sistema com uptime, backup, logs e contagens principais
- Listas responsivas com leitura otimizada no mobile

## Observacao tecnica

Esta versao usa uma persistencia hibrida:

- Com `node server.js` e `.env` apontando para PostgreSQL, os dados sao salvos no banco configurado em `DATABASE_URL` ou nas variaveis `PG*`.
- Com `node server.js` sem configuracao PostgreSQL, os dados sao salvos pela API local em `data/fenix-db.json`.
- Sem o servidor local, o sistema continua funcionando com `localStorage` no navegador.

O backend concentra leitura e escrita em uma camada simples de repositorio. Essa separacao permite alternar entre PostgreSQL e JSON sem alterar diretamente as rotas e regras de negocio.

O arquivo `docs/postgres-schema.sql` contem o schema PostgreSQL inicial, cobrindo os modulos atuais, empresas/tenants, relacionamentos, restricoes, auditoria e notificacoes lidas.

As migrations versionadas ficam em `migrations/` e sao registradas na tabela `schema_migrations`. O servidor aplica migrations pendentes automaticamente ao iniciar com PostgreSQL, e o comando manual tambem esta disponivel:

```bash
node scripts/apply-postgres-migrations.js --list
node scripts/apply-postgres-migrations.js --dry-run
node scripts/apply-postgres-migrations.js --apply
```

O arquivo `docs/postgres-migration-plan.md` descreve a ordem de carga, o mapeamento JSON para tabelas, validacoes e estrategia de rollback.

O script `scripts/migrate-json-to-postgres.js` faz a migracao assistida do JSON para PostgreSQL usando o cliente `psql`.

No Windows, o migrador detecta caminhos comuns do PostgreSQL, incluindo `C:\Program Files\PostgreSQL\18\bin\psql.exe`. Tambem e possivel configurar manualmente com `PSQL_PATH`; veja `.env.example`.

Para popular o PostgreSQL com dados demonstrativos completos do ERP, use:

```bash
node scripts/seed-postgres-demo.js
```

Esse seed recria uma base de demonstracao com empresa padrao, usuarios, clientes, fornecedores, categorias, contas a pagar, contas a receber, propostas, contratos, projetos e tarefas. Ele le o arquivo `.env` automaticamente.

Para gerar um backup SQL local do PostgreSQL, use:

```bash
node scripts/backup-postgres.js
```

Os arquivos sao criados em `backups/` e ficam fora do Git.

Para gerar backup com retencao local de 14 dias:

```bash
npm run backup:retention
```

Para listar backups disponiveis:

```bash
node scripts/restore-postgres.js --list
```

Para simular uma restauracao sem alterar o banco:

```bash
node scripts/restore-postgres.js --latest
```

Para restaurar de verdade o backup mais recente:

```bash
node scripts/restore-postgres.js --latest --apply --confirm=RESTORE
```

Para rodar uma validacao automatizada basica do sistema:

```bash
node scripts/smoke-test.js
```

O teste sobe uma API temporaria na porta `4193`, faz login, valida PostgreSQL, bootstrap, perfil/preferencias da empresa, criacao/edicao/exclusao de cliente, auditoria paginada, notificacoes lidas, reset de senha, rotas iniciais de compliance e configuracoes funcionais.

Para conferir ambiente, banco, backups e scripts operacionais:

```bash
node scripts/ops-check.js
```

Para executar o monitor operacional de banco, backup e logs:

```bash
npm run monitor
```

Para executar a validacao completa de release:

```bash
node scripts/release-check.js
```

Atalhos equivalentes tambem estao disponiveis via `npm`:

```bash
npm start
npm run check
npm run check:full
npm run release:check
npm run test:permissions
npm run test:load
npm run migrate:list
npm run migrate:dry
npm run migrate:apply
npm run backup
npm run backup:retention
npm run monitor
npm run service:status
npm run service:start
```

No PowerShell do Windows, se `npm` for bloqueado pela politica de execucao, use `npm.cmd` nos mesmos comandos, por exemplo `npm.cmd run check`.

O guia completo de ambiente local esta em `docs/santuserp-ambiente-local.md`.

O guia de deploy, ambientes, release e rollback esta em `docs/santuserp-deploy.md`.

O guia de operacao e monitoramento esta em `docs/santuserp-operacao-monitoramento.md`.

## API local

Autenticacao local:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/request-password-reset`
- `POST /api/auth/reset-password`

O login cria uma sessao temporaria e envia o cookie `santuserp_session` com `HttpOnly`, `SameSite=Lax` e expiracao alinhada a sessao. Quando o servidor esta ativo, o frontend autentica as acoes pela sessao em cookie, sem gravar o token puro no `localStorage`. O cabecalho `Authorization: Bearer <token>` continua aceito apenas como compatibilidade tecnica para scripts e transicao.

Quando PostgreSQL esta ativo, a sessao tambem e persistida na tabela `user_sessions` usando hash SHA-256 do token. Isso permite validar sessoes mesmo apos reiniciar o servidor local, sem salvar o token puro no banco.

O login possui limite basico de tentativas por IP/e-mail para reduzir risco de forca bruta. A recuperacao de senha tambem possui limite por IP/e-mail.

As senhas salvas pela API local sao convertidas para hash `scrypt` antes da gravacao. Novas senhas passam por politica forte minima e as respostas publicas da API nao retornam senha nem hash de senha dos usuarios.

Rotas iniciais de compliance:

- `GET /api/compliance/export`
- `POST /api/compliance/anonymize-client`

Essas rotas exigem perfil `admin` ou `gestor` e permitem exportar dados visiveis da empresa e anonimizar dados pessoais diretos de um cliente mediante confirmacao explicita.

Perfil e preferencias da empresa:

- `GET /api/company-profile`
- `PUT /api/company-profile`

Essas rotas exigem perfil `admin` ou `gestor` e permitem manter dados da empresa, onboarding, paginacao padrao, tabelas compactas, foco do dashboard, notificacoes e automacoes.

O servidor mantem compatibilidade com o estado completo em:

- `GET /api/state`
- `PUT /api/state`

Depois que o banco local existe, essas rotas exigem sessao autenticada de `admin`, pois leem e gravam o estado completo do ERP. A unica excecao e o primeiro bootstrap: quando `data/fenix-db.json` ainda nao existe, o frontend pode inicializar o arquivo local.

O carregamento principal autenticado usa:

- `GET /api/bootstrap`

O frontend tenta carregar as colecoes principais primeiro pelas rotas modulares individuais. Se alguma carga modular falhar, ele usa `/api/bootstrap`; se necessario, preserva `/api/state` como compatibilidade e fallback.

O `/api/bootstrap` retorna os dados iniciais do ERP sem depender diretamente de `/api/state`, mantendo `/api/state` apenas como rota de seguranca para compatibilidade.

O servidor tambem expoe rotas por modulo:

- `GET /api/clients`
- `POST /api/clients`
- `GET /api/clients/:id`
- `PUT /api/clients/:id`
- `DELETE /api/clients/:id`

O mesmo padrao vale para `users`, `suppliers`, `categories`, `payables`, `receivables`, `proposals`, `contracts`, `projects` e `tasks`.

As notificacoes lidas possuem rotas proprias por usuario autenticado:

- `GET /api/notification-reads`
- `POST /api/notification-reads`

O historico de atividades pode ser consultado em:

- `GET /api/activity-log`

Esse endpoint exige usuario autenticado com perfil `admin` ou `gestor`, acompanhando a restricao ja aplicada na navegacao do frontend.
Ele aceita paginacao e filtros por `page`, `pageSize`, `query`, `action` e `collection`.

A verificacao de saude do sistema pode ser consultada em `GET /api/health`, tambem restrita a `admin` e `gestor`. Ela retorna o tipo de persistencia ativo, se a base esta inicializada, uptime, memoria, resumo de backup, resumo de logs estruturados e as contagens principais dos modulos.

As rotas modulares ja aplicam validacao basica no servidor:

- Campos obrigatorios por modulo
- Status permitidos por tipo de registro
- Valores financeiros maiores que zero
- Datas no formato `AAAA-MM-DD`
- E-mails em formato valido para clientes, fornecedores e usuarios

As acoes feitas pelas rotas modulares tambem geram auditoria em `auditLogs`, com criacao, edicao, exclusao, tentativas negadas, usuario informado pelo frontend, modulo, registro, campos alterados e metadados da requisicao como IP, origem, agente do navegador e referencia parcial da sessao.

O modulo de notificacoes internas monitora automaticamente:

- Contas a pagar vencidas ou proximas do vencimento
- Contas a receber vencidas ou proximas do vencimento
- Tarefas atrasadas ou proximas do prazo
- Propostas vencidas ou proximas do vencimento
- Contratos vencidos ou proximos do vencimento

As notificacoes podem ser filtradas entre nao lidas e todas, marcadas individualmente como lidas ou marcadas em lote. O contador do topo considera apenas notificacoes ainda nao lidas.

Os relatorios executivos exportam:

- Resumo executivo
- Indicadores comerciais, financeiros, operacionais e cadastrais
- Relatorio consolidado com indicadores, vencimentos e notificacoes
- Visoes separadas por area e listas operacionais em CSV

Os relatorios tambem permitem filtro por periodo, usando datas de vencimento, recebimento, pagamento, validade, aprovacao e prazos operacionais conforme o tipo de dado analisado. As exportacoes CSV incluem o periodo aplicado.

As melhorias de UX/UI incluem estados vazios com acao rapida, limpeza de filtros, datas formatadas, destaque visual para atrasos e vencimentos proximos, foco acessivel em campos e botoes, e selecao explicita em campos relacionados.

A auditoria inicial possui filtros por busca, acao e modulo, resumo de criacoes, edicoes e exclusoes, leitura textual dos eventos registrados e exportacao CSV respeitando os filtros aplicados.

As permissoes por acao controlam quem pode criar, editar e excluir registros por modulo no frontend e na API local. Perfis operacionais e comerciais podem atuar nos seus modulos, enquanto exclusoes ficam restritas a administradores e gestores. A API prioriza a sessao segura em cookie e mantem compatibilidade com os cabecalhos de ator enviados pelo sistema:

- `x-santuserp-user-id`
- `x-santuserp-user-name`
- `x-santuserp-user-role`

Quando um perfil tenta executar uma acao nao autorizada, a API retorna `403 Forbidden` e nao altera os dados. Quando um token invalido ou expirado e enviado, a API retorna `401 Unauthorized`.

O frontend interpreta esses retornos nas acoes principais de cadastro, edicao, exclusao e auditoria, exibindo mensagens claras para sessao invalida, permissao negada e validacoes recusadas pela API. Em respostas `401`, a sessao local e encerrada e o usuario retorna para a tela de login.

A proxima etapa recomendada e preparar comercializacao, suporte e escala: modelo comercial, SLA, termos, politica de privacidade, processo de implantacao, ambiente demo e documentacao para usuario final.
