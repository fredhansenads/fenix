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
- Configuracoes administrativas

## Observacao tecnica

Esta primeira versao usa `localStorage` para persistencia local no navegador. A proxima etapa recomendada e migrar a base para uma arquitetura full-stack com backend, banco PostgreSQL, autenticacao segura e regras de permissao no servidor.
