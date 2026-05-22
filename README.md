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
- Contratos
- Projetos
- Tarefas
- Relatorios executivos com exportacao CSV
- Notificacoes internas
- Historico de atividades
- Configuracoes administrativas

## Observacao tecnica

Esta versao usa uma persistencia hibrida:

- Com `node server.js`, os dados sao salvos pela API local em `data/fenix-db.json`.
- Sem o servidor local, o sistema continua funcionando com `localStorage` no navegador.

## API local

Autenticacao local:

- `POST /api/auth/login`
- `POST /api/auth/logout`

O login retorna um token de sessao temporario em memoria. Quando o servidor esta ativo, o frontend usa esse token no cabecalho `Authorization: Bearer <token>` para identificar o usuario nas acoes da API. No primeiro acesso, se o arquivo `data/fenix-db.json` ainda nao existir, o frontend inicializa a API com os dados locais antes de repetir o login.

As senhas salvas pela API local sao convertidas para hash `scrypt` antes da gravacao. As respostas publicas da API nao retornam senha nem hash de senha dos usuarios.

O servidor mantem compatibilidade com o estado completo em:

- `GET /api/state`
- `PUT /api/state`

Depois que o banco local existe, essas rotas exigem sessao autenticada de `admin`, pois leem e gravam o estado completo do ERP. A unica excecao e o primeiro bootstrap: quando `data/fenix-db.json` ainda nao existe, o frontend pode inicializar o arquivo local.

E tambem expoe rotas por modulo para preparar a migracao futura:

- `GET /api/clients`
- `POST /api/clients`
- `GET /api/clients/:id`
- `PUT /api/clients/:id`
- `DELETE /api/clients/:id`

O mesmo padrao vale para `users`, `suppliers`, `categories`, `payables`, `receivables`, `proposals`, `contracts`, `projects` e `tasks`.

O historico de atividades pode ser consultado em:

- `GET /api/activity-log`

Esse endpoint exige usuario autenticado com perfil `admin` ou `gestor`, acompanhando a restricao ja aplicada na navegacao do frontend.

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
- Contratos vencidos ou proximos do vencimento

Os relatorios executivos exportam:

- Resumo executivo
- Indicadores comerciais, financeiros, operacionais e cadastrais
- Relatorio consolidado com indicadores, vencimentos e notificacoes
- Visoes separadas por area e listas operacionais em CSV

As melhorias de UX/UI incluem estados vazios com acao rapida, limpeza de filtros, datas formatadas, destaque visual para atrasos e vencimentos proximos, foco acessivel em campos e botoes, e selecao explicita em campos relacionados.

A auditoria inicial possui filtros por busca, acao e modulo, resumo de criacoes, edicoes e exclusoes, leitura textual dos eventos registrados e exportacao CSV respeitando os filtros aplicados.

As permissoes por acao controlam quem pode criar, editar e excluir registros por modulo no frontend e na API local. Perfis operacionais e comerciais podem atuar nos seus modulos, enquanto exclusoes ficam restritas a administradores e gestores. A API prioriza o token de sessao gerado no login e mantem compatibilidade com os cabecalhos enviados pelo sistema:

- `x-fenix-user-id`
- `x-fenix-user-name`
- `x-fenix-user-role`

Quando um perfil tenta executar uma acao nao autorizada, a API retorna `403 Forbidden` e nao altera os dados. Quando um token invalido ou expirado e enviado, a API retorna `401 Unauthorized`.

A proxima etapa recomendada e substituir o arquivo JSON por banco PostgreSQL e evoluir a sessao local para autenticacao persistente propria de ambiente produtivo.
