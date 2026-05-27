# FÊNIX ERP - Documentacao oficial

## 1. Visao geral

O FÊNIX e o ERP web da SANTUS. O objetivo do sistema e centralizar a gestao administrativa, financeira, comercial, operacional e estrategica da empresa em uma base unica, com processos organizados, rastreabilidade, indicadores e apoio a decisao.

O sistema esta em evolucao por fases. A versao atual cobre o MVP e parte relevante da Fase 2, incluindo autenticacao, permissoes, cadastros principais, financeiro, propostas, contratos, projetos, tarefas, relatorios, notificacoes, auditoria, PostgreSQL local e painel de saude do sistema.

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
cd "C:\Users\PC-01\Documents\FÊNIX"
node server.js
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
.env.example                       Exemplo de configuracao local
docs/postgres-schema.sql           Schema PostgreSQL
docs/postgres-migration-plan.md    Plano tecnico de migracao
scripts/migrate-json-to-postgres.js Migrador JSON para PostgreSQL
scripts/seed-postgres-demo.js      Seed demonstrativo PostgreSQL
scripts/backup-postgres.js         Backup SQL local do PostgreSQL
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
- Historico de atividades.
- Configuracoes administrativas.
- Saude do sistema.

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

### Notificacoes

- Contas a pagar vencidas ou proximas do vencimento.
- Contas a receber vencidas ou proximas do vencimento.
- Tarefas atrasadas ou proximas do prazo.
- Propostas vencidas ou proximas do vencimento.
- Contratos vencidos ou proximos do vencimento.
- Marcar como lida individualmente ou em lote.
- Contador superior apenas para notificacoes nao lidas.

### Historico de atividades

- Eventos de criacao, edicao, exclusao e negacao de acesso.
- Filtros por busca, acao e modulo.
- Leitura textual dos eventos.
- Exportacao CSV.
- Metadados de requisicao: IP, origem, user-agent e referencia parcial da sessao.

### Configuracoes

- Politicas administrativas.
- Roadmap modular.
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

O FÊNIX possui persistencia hibrida:

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

## 12. API local

### Autenticacao

- `POST /api/auth/login`
- `POST /api/auth/logout`

O login retorna token temporario em memoria. O frontend envia:

```text
Authorization: Bearer <token>
```

Quando PostgreSQL esta ativo, a sessao tambem e registrada na tabela `user_sessions` usando hash SHA-256 do token. Isso permite validar sessoes mesmo depois de reiniciar o servidor local, sem salvar o token puro no banco.

### Estado completo

- `GET /api/state`
- `PUT /api/state`

Rotas usadas para compatibilidade com o modelo inicial do MVP. Quando a base ja existe, exigem usuario `admin`.

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

### Saude

- `GET /api/health`

Restrita a `admin` e `gestor`.

## 13. Regras de negocio atuais

- Usuario precisa estar ativo para login.
- Senhas sao armazenadas com hash `scrypt` pela API.
- Tokens de sessao sao armazenados no PostgreSQL apenas como hash SHA-256.
- Respostas publicas nao retornam senha nem hash.
- Valores financeiros devem ser maiores que zero.
- Datas devem usar formato `AAAA-MM-DD`.
- E-mails de usuarios, clientes e fornecedores devem ter formato valido.
- Exclusoes sao mais restritas que criacoes e edicoes.
- Tentativas sem permissao nao alteram dados.
- O frontend encerra a sessao quando recebe `401 Unauthorized`.

## 14. Indicadores e relatorios

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

## 15. Status da Fase 1

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

## 16. Status da Fase 2

Fase 2 em andamento avancado:

- Contratos implementados.
- Relatorios avancados iniciados.
- Indicadores comerciais, financeiros, operacionais e cadastrais.
- Historico de atividades.
- Notificacoes internas.
- Exportacao de relatorios.
- Melhorias de UX/UI.
- Auditoria inicial.
- PostgreSQL local integrado.
- Sessoes persistentes no PostgreSQL.
- Seed demonstrativo.
- Backup local do PostgreSQL.
- Painel de saude do sistema.

## 17. Proximas etapas recomendadas

1. Evoluir sessao para armazenamento persistente em banco.
2. Criar tabela propria de sessoes ou tokens.
3. Modularizar carregamento inicial para depender menos de `/api/state`.
4. Evoluir auditoria para consultas paginadas.
5. Evoluir backup para restauracao assistida.
6. Adicionar testes automatizados basicos.
7. Preparar empacotamento de ambiente local.
8. Iniciar automacoes da Fase 3.

## 18. Criterios de sucesso

O projeto e considerado saudavel quando:

- O sistema abre localmente por `http://127.0.0.1:4173`.
- Login administrativo funciona.
- PostgreSQL responde e aparece como persistencia ativa no painel de saude.
- Cadastros principais podem ser criados e editados.
- Relatorios mostram dados coerentes.
- Notificacoes sao geradas conforme vencimentos e prazos.
- Auditoria registra acoes relevantes.
- Alteracoes sao salvas no Git e enviadas ao GitHub.
