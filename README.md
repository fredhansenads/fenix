# FÊNIX MVP

Este repositorio contem o primeiro MVP web do FÊNIX, o ERP da SANTUS.

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
- Projetos
- Tarefas
- Relatorios com exportacao CSV
- Notificacoes internas
- Historico de atividades
- Configuracoes administrativas

## Observacao tecnica

Esta versao usa uma persistencia hibrida:

- Com `node server.js`, os dados sao salvos pela API local em `data/fenix-db.json`.
- Sem o servidor local, o sistema continua funcionando com `localStorage` no navegador.

## API local

O servidor mantem compatibilidade com o estado completo em:

- `GET /api/state`
- `PUT /api/state`

E tambem expoe rotas por modulo para preparar a migracao futura:

- `GET /api/clients`
- `POST /api/clients`
- `GET /api/clients/:id`
- `PUT /api/clients/:id`
- `DELETE /api/clients/:id`

O mesmo padrao vale para `users`, `suppliers`, `categories`, `payables`, `receivables`, `proposals`, `projects` e `tasks`.

O historico de atividades pode ser consultado em:

- `GET /api/activity-log`

As rotas modulares ja aplicam validacao basica no servidor:

- Campos obrigatorios por modulo
- Status permitidos por tipo de registro
- Valores financeiros maiores que zero
- Datas no formato `AAAA-MM-DD`
- E-mails em formato valido para clientes, fornecedores e usuarios

As acoes feitas pelas rotas modulares tambem geram auditoria inicial em `auditLogs`, com criacao, edicao, exclusao, usuario informado pelo frontend, modulo, registro e campos alterados.

O modulo de notificacoes internas monitora automaticamente:

- Contas a pagar vencidas ou proximas do vencimento
- Contas a receber vencidas ou proximas do vencimento
- Tarefas atrasadas ou proximas do prazo
- Propostas vencidas ou proximas do vencimento

A proxima etapa recomendada e substituir o arquivo JSON por banco PostgreSQL, autenticacao segura e regras de permissao no servidor.
