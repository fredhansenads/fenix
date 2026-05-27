# FÊNIX MVP

Este repositorio contem o primeiro MVP web do FÊNIX, o ERP da SANTUS.

## Documentacao oficial

A documentacao consolidada do sistema esta em:

- `docs/fenix-documentacao-oficial.md`

Ela descreve visao geral, modulos, regras de negocio, API, PostgreSQL, rotinas locais, status das fases e proximas etapas recomendadas.

## Como abrir

Opcao simples: abra o arquivo `index.html` no navegador.

Opcao recomendada: rode o servidor local e acesse `http://127.0.0.1:4173`.

```bash
node server.js
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
- Historico de atividades
- Configuracoes administrativas

## Observacao tecnica

Esta versao usa uma persistencia hibrida:

- Com `node server.js` e `.env` apontando para PostgreSQL, os dados sao salvos no banco configurado em `DATABASE_URL` ou nas variaveis `PG*`.
- Com `node server.js` sem configuracao PostgreSQL, os dados sao salvos pela API local em `data/fenix-db.json`.
- Sem o servidor local, o sistema continua funcionando com `localStorage` no navegador.

O backend concentra leitura e escrita em uma camada simples de repositorio. Essa separacao permite alternar entre PostgreSQL e JSON sem alterar diretamente as rotas e regras de negocio.

O arquivo `docs/postgres-schema.sql` contem o schema PostgreSQL inicial, cobrindo os modulos atuais, relacionamentos, restricoes, auditoria e notificacoes lidas.

O arquivo `docs/postgres-migration-plan.md` descreve a ordem de carga, o mapeamento JSON para tabelas, validacoes e estrategia de rollback para a futura migracao.

O script `scripts/migrate-json-to-postgres.js` faz a migracao assistida do JSON para PostgreSQL usando o cliente `psql`.

No Windows, o migrador detecta caminhos comuns do PostgreSQL, incluindo `C:\Program Files\PostgreSQL\18\bin\psql.exe`. Tambem e possivel configurar manualmente com `PSQL_PATH`; veja `.env.example`.

Para popular o PostgreSQL com dados demonstrativos completos do ERP, use:

```bash
node scripts/seed-postgres-demo.js
```

Esse seed recria uma base de demonstracao com usuarios, clientes, fornecedores, categorias, contas a pagar, contas a receber, propostas, contratos, projetos e tarefas. Ele le o arquivo `.env` automaticamente.

Para gerar um backup SQL local do PostgreSQL, use:

```bash
node scripts/backup-postgres.js
```

Os arquivos sao criados em `backups/` e ficam fora do Git.

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

## API local

Autenticacao local:

- `POST /api/auth/login`
- `POST /api/auth/logout`

O login retorna um token de sessao temporario em memoria. Quando o servidor esta ativo, o frontend usa esse token no cabecalho `Authorization: Bearer <token>` para identificar o usuario nas acoes da API. No primeiro acesso, se o arquivo `data/fenix-db.json` ainda nao existir, o frontend inicializa a API com os dados locais antes de repetir o login.

Quando PostgreSQL esta ativo, a sessao tambem e persistida na tabela `user_sessions` usando hash do token. Isso permite validar sessoes mesmo apos reiniciar o servidor local.

As senhas salvas pela API local sao convertidas para hash `scrypt` antes da gravacao. As respostas publicas da API nao retornam senha nem hash de senha dos usuarios.

O servidor mantem compatibilidade com o estado completo em:

- `GET /api/state`
- `PUT /api/state`

Depois que o banco local existe, essas rotas exigem sessao autenticada de `admin`, pois leem e gravam o estado completo do ERP. A unica excecao e o primeiro bootstrap: quando `data/fenix-db.json` ainda nao existe, o frontend pode inicializar o arquivo local.

O carregamento principal autenticado usa:

- `GET /api/bootstrap`

Essa rota retorna os dados iniciais do ERP sem depender diretamente de `/api/state`, mantendo `/api/state` apenas como compatibilidade e fallback.

E tambem expoe rotas por modulo para preparar a migracao futura:

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

A verificacao de saude do sistema pode ser consultada em `GET /api/health`, tambem restrita a `admin` e `gestor`. Ela retorna o tipo de persistencia ativo, se a base esta inicializada e as contagens principais dos modulos.

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

As permissoes por acao controlam quem pode criar, editar e excluir registros por modulo no frontend e na API local. Perfis operacionais e comerciais podem atuar nos seus modulos, enquanto exclusoes ficam restritas a administradores e gestores. A API prioriza o token de sessao gerado no login e mantem compatibilidade com os cabecalhos enviados pelo sistema:

- `x-fenix-user-id`
- `x-fenix-user-name`
- `x-fenix-user-role`

Quando um perfil tenta executar uma acao nao autorizada, a API retorna `403 Forbidden` e nao altera os dados. Quando um token invalido ou expirado e enviado, a API retorna `401 Unauthorized`.

O frontend interpreta esses retornos nas acoes principais de cadastro, edicao, exclusao e auditoria, exibindo mensagens claras para sessao invalida, permissao negada e validacoes recusadas pela API. Em respostas `401`, a sessao local e encerrada e o usuario retorna para a tela de login.

A proxima etapa recomendada e evoluir a sessao local para autenticacao persistente propria de ambiente produtivo e reduzir gradualmente a dependencia do endpoint `/api/state`.
