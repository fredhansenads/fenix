# SantusERP - Documentacao oficial

## 1. Visao geral

O SantusERP e o ERP web da SANTUS. O objetivo do sistema e centralizar a gestao administrativa, financeira, comercial, operacional e estrategica da empresa em uma base unica, com processos organizados, rastreabilidade, indicadores e apoio a decisao.

O sistema esta em evolucao por fases. A versao atual cobre o MVP e parte relevante da Fase 2, incluindo autenticacao, permissoes, cadastros principais, financeiro, propostas, contratos, projetos, tarefas, relatorios, notificacoes, auditoria, PostgreSQL local, painel de saude do sistema, base inicial de seguranca/compliance, melhorias de UX para cliente real e funcionalidades essenciais de produto.

A preparacao para clientes reais tambem ja inclui modelo multiempresa/multicliente, com cadastro de empresas, vinculo de usuarios por empresa, campo `tenant_id` nas entidades principais e isolamento por sessao nas rotas principais.

## 2. Objetivos do sistema

- Centralizar dados internos da SANTUS.
- Reduzir controles paralelos e erros manuais.
- Melhorar visibilidade financeira, comercial e operacional.
- Registrar historico de atividades relevantes.
- Permitir crescimento modular do ERP.
- Preparar o sistema para integracoes, automacoes, portal do cliente, IA e aplicativo/PWA.

## 3. Como executar localmente

Abra o PowerShell na pasta do projeto:

```powershell
cd "<pasta-do-projeto>"
node server.js
```

Ou use o inicializador local:

```powershell
.\scripts\start-santuserp.ps1 -Open
```

Acesse:

```text
http://127.0.0.1:4173
```

Acesso demonstrativo:

```text
E-mail: admin@santus.com
Senha: santus123
```

Observacao: mantenha o terminal aberto enquanto estiver usando o sistema.

## 4. Estrutura principal do projeto

```text
index.html                         Tela base do sistema
styles.css                         Estilos responsivos
app.js                             Frontend e regras de interface
server.js                          Servidor local, API e persistencia
package.json                       Atalhos npm para operacao local
.env.example                       Exemplo de configuracao local
docs/postgres-schema.sql           Schema PostgreSQL
docs/postgres-migration-plan.md    Plano tecnico de migracao
scripts/apply-postgres-migrations.js Migrations PostgreSQL
docs/santuserp-checklist-operacional.md Checklist operacional local
docs/santuserp-ambiente-local.md       Guia de ambiente local
docs/santuserp-roadmap-producao.md     Roadmap para clientes reais
docs/santuserp-deploy.md               Guia de deploy e ambientes
docs/santuserp-qa-release.md           Checklist de QA e release
scripts/start-santuserp.ps1            Inicializador local Windows
scripts/santuserp-service.ps1          Start, stop, restart e status em background
scripts/santuserp-service.js           Controlador de servico em background
scripts/migrate-json-to-postgres.js Migrador JSON para PostgreSQL
scripts/seed-postgres-demo.js      Seed demonstrativo PostgreSQL
scripts/backup-postgres.js         Backup SQL local do PostgreSQL
scripts/restore-postgres.js        Restauracao assistida do PostgreSQL
scripts/smoke-test.js              Validacao automatizada basica
scripts/permission-test.js         Teste de permissoes e multiempresa
scripts/load-test.js               Teste de carga basico
scripts/release-check.js           Validacao completa de release
scripts/ops-check.js               Checklist operacional automatizado
```

Arquivos sensiveis e dados locais nao devem ir para o Git:

```text
.env
data/*.json
backups/*.sql
backups/*.dump
```

## 5. Modulos implementados

- Login e autenticacao local via API.
- Usuarios e permissoes basicas.
- Dashboard executivo.
- Clientes.
- Fornecedores.
- Financeiro.
- Contas a pagar.
- Contas a receber.
- Fluxo de caixa basico.
- Propostas comerciais.
- Contratos.
- Projetos.
- Tarefas.
- Relatorios executivos.
- Notificacoes internas.
- Automacoes iniciais.
- Historico de atividades.
- Empresas e isolamento multiempresa.
- Configuracoes administrativas.
- Saude do sistema.
- Compliance e LGPD inicial.
- Onboarding inicial.
- Perfil e preferencias da empresa.
- Convite assistido de usuarios.
- Notificacoes e automacoes configuraveis.
- Painel administrativo do cliente.

## 6. Perfis de usuario

Perfis atuais:

- `admin`: acesso administrativo completo.
- `gestor`: acesso gerencial amplo, incluindo relatorios, auditoria e operacao.
- `financeiro`: foco em financeiro, fornecedores, contas a pagar e contas a receber.
- `comercial`: foco em clientes, propostas, contratos e projetos.
- `operacional`: foco em projetos, tarefas e acompanhamento operacional.
- `colaborador`: foco em tarefas.
- `visualizador`: perfil previsto para leitura e expansao futura.

As permissoes sao aplicadas no frontend e tambem na API. Tentativas nao autorizadas retornam `403 Forbidden` e podem gerar auditoria como evento negado.

## 7. Funcionalidades por modulo

### Dashboard

- Indicadores financeiros resumidos.
- Entradas e saidas realizadas.
- Entradas e saidas previstas.
- Saldo previsto.
- Clientes ativos.
- Contratos ativos.
- Projetos em andamento.
- Tarefas abertas.
- Alertas de vencimentos, atrasos e riscos operacionais.
- Checklist de primeira configuracao quando o onboarding ainda nao foi concluido.
- Atalhos ajustados pelo foco configurado para a empresa.

### Clientes

- Lista de clientes.
- Cadastro, edicao e exclusao conforme permissao.
- Tipos `PJ` e `PF`.
- Status `ativo`, `prospect` e `inativo`.
- Campos de documento, e-mail, telefone e observacoes.

### Fornecedores

- Lista de fornecedores.
- Cadastro, edicao e exclusao conforme permissao.
- Categoria do fornecedor.
- Status `ativo` e `inativo`.

### Financeiro

- Contas a pagar.
- Contas a receber.
- Valores realizados e previstos.
- Datas de vencimento, pagamento e recebimento.
- Status financeiros.
- Destaque visual para vencidos e proximos do vencimento.

### Propostas

- Cadastro e acompanhamento de propostas comerciais.
- Valor, validade, responsavel e status.
- Status: `rascunho`, `enviada`, `aprovada`, `recusada`, `expirada`, `cancelada`.
- Gatilhos para indicadores comerciais e relatorios.

### Contratos

- Cadastro de contratos vinculados a clientes.
- Numero unico de contrato.
- Valor, inicio, termino, assinatura, responsavel e status.
- Monitoramento de contratos vencidos ou proximos do vencimento.

### Projetos

- Cadastro de projetos vinculados a clientes.
- Responsavel, prazo e status.
- Status: `planejado`, `em_andamento`, `pausado`, `concluido`, `cancelado`.

### Tarefas

- Cadastro de tarefas vinculadas a projetos.
- Responsavel, prioridade, prazo e status.
- Prioridades: `baixa`, `media`, `alta`, `urgente`.
- Status: `pendente`, `em_andamento`, `concluida`, `cancelada`.

### Relatorios

- Resumo executivo.
- Indicadores financeiros.
- Indicadores comerciais.
- Indicadores operacionais.
- Indicadores cadastrais.
- Filtro por periodo.
- Exportacao CSV.
- Exportacoes com nome padronizado por empresa, relatorio e periodo.
- Metadados de empresa e data de geracao nos arquivos exportados.

### Notificacoes

- Contas a pagar vencidas ou proximas do vencimento.
- Contas a receber vencidas ou proximas do vencimento.
- Tarefas atrasadas ou proximas do prazo.
- Propostas vencidas ou proximas do vencimento.
- Contratos vencidos ou proximos do vencimento.
- Marcar como lida individualmente ou em lote.
- Contador superior apenas para notificacoes nao lidas.
- Categorias de notificacao configuraveis por empresa.
- Antecedencia configuravel para alertas preventivos.

### Automacoes

- Central de automacoes da Fase 3.
- Deteccao de contas vencidas, propostas criticas e contratos proximos do vencimento.
- Geracao automatica de tarefas de acompanhamento.
- Marcador interno de automacao para evitar tarefas duplicadas.
- Leitura de itens ja automatizados e itens ainda pendentes.
- Regras de automacao ativadas/desativadas por empresa.
- Prazos configuraveis para follow-up comercial e revisao contratual.

### Historico de atividades

- Eventos de criacao, edicao, exclusao, negacao de acesso, login, logout, falha de login, reset de senha, exportacao e anonimizacao.
- Filtros por busca, acao e modulo.
- Leitura textual dos eventos.
- Exportacao CSV.
- Metadados de requisicao: IP, origem, user-agent e referencia parcial da sessao.

### Configuracoes

- Politicas administrativas.
- Roadmap modular.
- Perfil da empresa.
- Preferencias de experiencia por empresa.
- Preferencias funcionais de notificacoes e automacoes.
- Convite assistido de usuarios com senha provisoria forte.
- Painel administrativo do cliente.
- Guia rapido de configuracao inicial.
- Exportacao JSON de dados da empresa para atendimento LGPD.
- Anonimizacao controlada de cliente mediante confirmacao explicita.
- Restauracao de dados demonstrativos.
- Painel de saude do sistema.

### Saude do sistema

O painel de saude consulta a rota `GET /api/health` e exibe:

- Status operacional da API.
- Tipo de persistencia ativa: PostgreSQL ou JSON local.
- Indicacao se a base esta inicializada.
- Contagens principais por modulo.
- Horario da ultima verificacao.

## 8. Persistencia de dados

O SantusERP possui persistencia hibrida:

- PostgreSQL quando `.env` define `DATABASE_URL` ou variaveis `PG*`.
- JSON local em `data/fenix-db.json` quando nao ha PostgreSQL configurado.
- `localStorage` como fallback quando o arquivo HTML e aberto sem servidor.

Na configuracao atual do projeto local, o PostgreSQL e a persistencia principal.

## 9. PostgreSQL

Banco local recomendado:

```text
fenix
```

Schema oficial:

```text
docs/postgres-schema.sql
```

Tabelas principais:

- `schema_migrations`
- `tenants`
- `users`
- `clients`
- `suppliers`
- `categories`
- `payables`
- `receivables`
- `proposals`
- `contracts`
- `projects`
- `tasks`
- `audit_logs`
- `notification_reads`
- `user_sessions`

O servidor aplica uma migracao idempotente para adicionar `tenants`, `tenant_id` e campos de sessao multiempresa em bancos locais antigos. Dados existentes sao vinculados automaticamente a empresa padrao SANTUS.

As migrations versionadas ficam em:

```text
migrations/
```

Elas sao registradas no banco pela tabela:

```text
schema_migrations
```

Comandos principais:

```powershell
node scripts\apply-postgres-migrations.js --list
node scripts\apply-postgres-migrations.js --dry-run
node scripts\apply-postgres-migrations.js --apply
```

O servidor tambem aplica migrations pendentes automaticamente antes de ler ou gravar no PostgreSQL.

O arquivo `.env` local deve seguir o modelo de `.env.example`. Credenciais reais nao devem ser commitadas.

## 10. Dados demonstrativos

Para popular o PostgreSQL com dados demonstrativos completos:

```powershell
node scripts\seed-postgres-demo.js
```

O seed recria dados de exemplo para:

- Usuarios.
- Clientes.
- Fornecedores.
- Categorias.
- Contas a pagar.
- Contas a receber.
- Propostas.
- Contratos.
- Projetos.
- Tarefas.

Esse script e util para analise visual, testes funcionais e apresentacoes.

## 11. Backup local

Para gerar um backup SQL local do PostgreSQL:

```powershell
node scripts\backup-postgres.js
```

O arquivo sera criado em:

```text
backups/<database>-backup-<data>.sql
```

Os backups ficam fora do Git por padrao. Recomenda-se gerar backup antes de migracoes, alteracoes estruturais no schema, limpeza de dados ou testes de carga.

## 12. Restauracao local

Para listar backups disponiveis:

```powershell
node scripts\restore-postgres.js --list
```

Para simular a restauracao mais recente, sem alterar o banco:

```powershell
node scripts\restore-postgres.js --latest
```

Para restaurar de verdade o backup mais recente:

```powershell
node scripts\restore-postgres.js --latest --apply --confirm=RESTORE
```

A restauracao gera um backup de seguranca antes de aplicar o arquivo escolhido. Em seguida, limpa o schema `public` e aplica o `.sql`. Esse fluxo e destrutivo para o banco atual e deve ser usado apenas quando a restauracao for realmente desejada.

## 13. Deploy e ambientes

O guia completo esta em:

```text
docs/santuserp-deploy.md
```

Modelos de ambiente:

```text
config/.env.development.example
config/.env.staging.example
config/.env.production.example
```

Comandos de servico:

```powershell
node scripts\santuserp-service.js status
node scripts\santuserp-service.js start --env .env.production
node scripts\santuserp-service.js restart --env .env.production
node scripts\santuserp-service.js stop
```

Em `NODE_ENV=production`, o SantusERP exige PostgreSQL e cookies seguros devem ser usados atras de HTTPS.

## 14. Testes basicos

Para executar uma validacao automatizada basica:

```powershell
node scripts\smoke-test.js
```

O teste sobe uma instancia temporaria da API em:

```text
http://127.0.0.1:4193
```

Fluxos validados:

- Login administrativo.
- Health check.
- Bootstrap autenticado.
- Criacao, edicao e exclusao de cliente temporario.
- Auditoria paginada.
- Notificacoes lidas.

Esse teste usa o banco configurado no `.env`, portanto deve ser executado em ambiente local/controlado.

## 15. Checklist operacional

Checklist manual:

```text
docs/santuserp-checklist-operacional.md
```

Checklist automatizado:

```powershell
node scripts\ops-check.js
```

Checklist completo de release:

```powershell
node scripts\release-check.js
```

Esse fluxo valida ambiente local, PostgreSQL, backups, scripts operacionais, smoke test, permissoes, isolamento multiempresa e carga basica.

## 16. Ambiente local empacotado

Inicializador Windows:

```powershell
.\scripts\start-santuserp.ps1 -Open
```

Inicializador com checklist:

```powershell
.\scripts\start-santuserp.ps1 -Check -Open
```

Atalhos `npm` disponiveis:

- `npm start`
- `npm run check`
- `npm run check:full`
- `npm run smoke`
- `npm run test:permissions`
- `npm run test:load`
- `npm run release:check`
- `npm run backup`
- `npm run restore:list`
- `npm run seed:demo`

No PowerShell do Windows, se `npm` for bloqueado pela politica de execucao, use `npm.cmd`, por exemplo:

```powershell
npm.cmd run check
```

Guia operacional:

```text
docs/santuserp-ambiente-local.md
```

## 17. API local

### Autenticacao

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/request-password-reset`
- `POST /api/auth/reset-password`

O login cria uma sessao temporaria e envia o cookie `santuserp_session` com `HttpOnly`, `SameSite=Lax` e expiracao alinhada ao tempo da sessao. O frontend autentica as chamadas pela sessao em cookie e nao grava o token puro no `localStorage`.

O cabecalho `Authorization: Bearer <token>` continua aceito como compatibilidade tecnica para scripts e transicao.

Quando PostgreSQL esta ativo, a sessao tambem e registrada na tabela `user_sessions` usando hash SHA-256 do token. Isso permite validar sessoes mesmo depois de reiniciar o servidor local, sem salvar o token puro no banco.

O login possui limite basico de tentativas por IP/e-mail para reduzir risco de forca bruta. O pedido de recuperacao de senha tambem possui limite por IP/e-mail.

As senhas salvas pela API sao convertidas para hash `scrypt` antes da gravacao. Novas senhas precisam cumprir politica minima forte: 8 caracteres, letra minuscula, letra maiuscula, numero, caractere especial e sem uso obvio de nome/e-mail.

O reset de senha usa token temporario com hash SHA-256 armazenado no backend. Em ambiente local/desenvolvimento, o token pode ser retornado na resposta para teste do fluxo; em producao, ele nao deve ser exposto diretamente e deve ser entregue por integracao de e-mail transacional.

### Estado completo

- `GET /api/state`
- `PUT /api/state`

Rotas usadas para compatibilidade com o modelo inicial do MVP. Quando a base ja existe, exigem usuario `admin`.

### Bootstrap autenticado

- `GET /api/bootstrap`

O frontend tenta carregar o estado inicial primeiro pelas rotas modulares individuais. Se alguma colecao principal falhar, usa `/api/bootstrap`; se necessario, preserva `/api/state` como compatibilidade e fallback.

O `/api/bootstrap` retorna os dados iniciais do ERP em uma unica chamada autenticada, reduzindo a dependencia direta de `/api/state`.

### Rotas modulares

Padrao:

```text
GET    /api/:collection
POST   /api/:collection
GET    /api/:collection/:id
PUT    /api/:collection/:id
DELETE /api/:collection/:id
```

Colecoes suportadas:

- `users`
- `clients`
- `suppliers`
- `categories`
- `payables`
- `receivables`
- `proposals`
- `contracts`
- `projects`
- `tasks`

### Auditoria

- `GET /api/activity-log`

Restrita a `admin` e `gestor`.

Parametros aceitos:

- `page`
- `pageSize`
- `query`
- `action`
- `collection`
- `export=all`

A tela de Historico usa paginacao server-side para consultar volumes menores de eventos por vez.

### Compliance e LGPD

- `GET /api/compliance/export`
- `POST /api/compliance/anonymize-client`

Restritas a `admin` e `gestor`.

A exportacao retorna JSON com os dados visiveis para a sessao atual. A anonimizacao exige `clientId` e confirmacao `ANONYMIZE`, preservando vinculos historicos e removendo dados pessoais diretos do cliente.

### Perfil e preferencias da empresa

- `GET /api/company-profile`
- `PUT /api/company-profile`

Restritas a `admin` e `gestor`.

Essas rotas permitem consultar e atualizar dados da empresa da sessao, incluindo nome, documento, contato, observacoes e preferencias de experiencia. As preferencias atuais cobrem onboarding concluido, registros por pagina, tabelas compactas, foco do dashboard, categorias de notificacao, antecedencia de alertas e regras de automacao.

### Notificacoes lidas

- `GET /api/notification-reads`
- `POST /api/notification-reads`

Rotas vinculadas ao usuario autenticado. O frontend usa essas rotas para marcar notificacoes como lidas sem gravar o estado completo do ERP.

### Saude

- `GET /api/health`

Restrita a `admin` e `gestor`.

## 18. Regras de negocio atuais

- Usuario precisa estar ativo para login.
- Senhas sao armazenadas com hash `scrypt` pela API.
- Tokens de sessao sao armazenados no PostgreSQL apenas como hash SHA-256.
- Sessoes autenticadas usam cookie `HttpOnly` e `SameSite=Lax`.
- O frontend nao persiste token puro no `localStorage`.
- Tentativas repetidas de login invalido sao limitadas por janela de tempo.
- Recuperacao de senha usa token temporario, hash no backend e expiracao.
- Novas senhas devem seguir politica minima forte.
- Login, logout, falha de login e reset de senha sao registrados na auditoria.
- Exportacao LGPD e anonimizacao de cliente exigem perfil `admin` ou `gestor`.
- Perfil e preferencias da empresa exigem perfil `admin` ou `gestor`.
- Convites assistidos criam usuarios vinculados a empresa da sessao e devem ser enviados por canal seguro.
- Respostas publicas nao retornam senha nem hash.
- Valores financeiros devem ser maiores que zero.
- Datas devem usar formato `AAAA-MM-DD`.
- E-mails de usuarios, clientes e fornecedores devem ter formato valido.
- Exclusoes sao mais restritas que criacoes e edicoes.
- Tentativas sem permissao nao alteram dados.
- O frontend encerra a sessao quando recebe `401 Unauthorized`.

## 19. Indicadores e relatorios

Indicadores acompanhados:

- Receita realizada.
- Despesa realizada.
- Entradas previstas.
- Saidas previstas.
- Saldo previsto.
- Contas vencidas.
- Propostas enviadas.
- Propostas aprovadas.
- Taxa de conversao comercial.
- Clientes ativos.
- Contratos ativos.
- Projetos em andamento.
- Tarefas abertas e concluidas.
- Produtividade operacional basica.

Relatorios podem ser filtrados por periodo e exportados em CSV.

## 20. Status da Fase 1

Fase 1 concluida no escopo do MVP:

- Login e autenticacao.
- Usuarios e permissoes basicas.
- Dashboard principal.
- Clientes.
- Fornecedores.
- Contas a pagar.
- Contas a receber.
- Fluxo de caixa basico.
- Propostas.
- Projetos.
- Tarefas.
- Relatorios basicos.

## 21. Status da Fase 2

Fase 2 concluida no escopo planejado:

- Contratos implementados.
- Relatorios avancados iniciados.
- Indicadores comerciais, financeiros, operacionais e cadastrais.
- Historico de atividades.
- Notificacoes internas.
- Exportacao de relatorios.
- Melhorias de UX/UI.
- Tabelas responsivas em formato de cartoes no mobile.
- Auditoria inicial.
- Auditoria paginada.
- PostgreSQL local integrado.
- Sessoes persistentes no PostgreSQL.
- Seed demonstrativo.
- Backup local do PostgreSQL.
- Restauracao assistida de backup.
- Painel de saude do sistema.
- Bootstrap autenticado e rota modular para notificacoes lidas.
- Carregamento inicial por rotas modulares individuais com fallback para bootstrap e estado completo.
- Revisao UX/UI final de listas, formularios e leitura em mobile.
- Empacotamento local inicial com `package.json`, atalhos `npm`, inicializador PowerShell e guia de ambiente.
- Smoke test automatizado.
- Checklist operacional manual e automatizado.
- Modelo multiempresa/multicliente com empresas, `tenant_id`, usuarios vinculados por empresa e isolamento nas rotas principais.
- Migrations PostgreSQL versionadas com tabela `schema_migrations`, comando manual e aplicacao automatica pelo servidor.
- Deploy e ambientes documentados com modelos de `.env`, script de servico, checklist de release e rollback.
- Seguranca/compliance inicial com senha forte, reset temporario, auditoria de autenticacao, rate limit e rotas LGPD.
- UX para cliente real com onboarding, perfil da empresa, preferencias, guia rapido, paginacao de listas e feedback de salvamento.
- Funcionalidades essenciais de produto com convites assistidos, painel administrativo do cliente, notificacoes/automacoes configuraveis e exportacoes profissionais.

## 22. Status da Fase 3

Fase 3 iniciada:

- Modulo de automacoes iniciais.
- Deteccao de pendencias financeiras vencidas.
- Deteccao de propostas criticas.
- Deteccao de contratos proximos do vencimento.
- Geracao automatica de tarefas de acompanhamento.
- Marcadores internos para evitar duplicidade de tarefas automatizadas.

## 23. Proximas etapas recomendadas

1. Implantar monitoramento e operacao.
2. Expandir automacoes com regras configuraveis avancadas.
3. Iniciar assistente de IA para analise executiva.

## 24. Criterios de sucesso

O projeto e considerado saudavel quando:

- O sistema abre localmente por `http://127.0.0.1:4173`.
- Login administrativo funciona.
- PostgreSQL responde e aparece como persistencia ativa no painel de saude.
- Cadastros principais podem ser criados e editados.
- Relatorios mostram dados coerentes.
- Notificacoes sao geradas conforme vencimentos e prazos.
- Auditoria registra acoes relevantes.
- Alteracoes sao salvas no Git e enviadas ao GitHub.
