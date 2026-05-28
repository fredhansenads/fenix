# FÊNIX ERP - Checklist operacional

Este checklist orienta a rotina local de execucao, validacao, backup e restauracao do FÊNIX.

## 1. Iniciar o sistema

```powershell
cd "C:\Users\PC-01\Documents\FÊNIX"
node server.js
```

Acesse:

```text
http://127.0.0.1:4173
```

Credenciais demonstrativas:

```text
E-mail: admin@santus.com
Senha: santus123
```

## 2. Validar ambiente rapidamente

```powershell
node scripts\ops-check.js
```

Esse comando verifica:

- Node.js.
- Arquivo `.env`.
- `psql`.
- `pg_dump`.
- Conexao PostgreSQL.
- Tabelas esperadas.
- Contagens principais.
- Backups existentes.
- Scripts operacionais.

Para incluir o smoke test:

```powershell
node scripts\ops-check.js --with-smoke
```

## 3. Rodar smoke test

```powershell
node scripts\smoke-test.js
```

O smoke test valida:

- Login administrativo.
- Health check.
- Bootstrap autenticado.
- Criacao, edicao e exclusao de cliente temporario.
- Auditoria paginada.
- Notificacoes lidas.

## 4. Gerar backup

```powershell
node scripts\backup-postgres.js
```

Os arquivos sao criados em:

```text
backups/
```

Backups ficam fora do Git por padrao.

## 5. Listar backups

```powershell
node scripts\restore-postgres.js --list
```

## 6. Simular restauracao

```powershell
node scripts\restore-postgres.js --latest
```

Esse comando apenas mostra o plano de restauracao. Ele nao altera o banco.

## 7. Restaurar backup

```powershell
node scripts\restore-postgres.js --latest --apply --confirm=RESTORE
```

Atencao: a restauracao limpa o schema `public` antes de aplicar o backup escolhido. Use somente quando quiser substituir o banco atual.

## 8. Popular dados demonstrativos

```powershell
node scripts\seed-postgres-demo.js
```

Esse comando recria dados de demonstracao e limpa sessoes anteriores.

## 9. Verificar saude pelo sistema

No FÊNIX:

```text
Configuracoes > Saude do sistema
```

Conferir:

- Status operacional.
- Persistencia PostgreSQL.
- Base inicializada.
- Contagens principais.

## 10. Rotina recomendada antes de apresentacoes

1. Rodar `node scripts\ops-check.js`.
2. Rodar `node scripts\smoke-test.js`.
3. Gerar backup com `node scripts\backup-postgres.js`.
4. Iniciar `node server.js`.
5. Entrar no sistema e abrir `Configuracoes > Saude do sistema`.
6. Navegar por Dashboard, Clientes, Financeiro, Propostas, Projetos, Tarefas, Relatorios e Historico.

## 11. Rotina recomendada antes de mudancas tecnicas

1. Gerar backup.
2. Conferir Git limpo ou entender alteracoes pendentes.
3. Aplicar mudanca.
4. Rodar smoke test.
5. Conferir painel de saude.
6. Salvar no Git.
7. Enviar ao GitHub.

