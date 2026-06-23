# SantusERP - Checklist operacional

Este checklist orienta a rotina local de execucao, validacao, backup e restauracao do SantusERP.

## 1. Iniciar o sistema

```powershell
cd "<pasta-do-projeto>"
node server.js
```

Opcao assistida no Windows:

```powershell
.\scripts\start-santuserp.ps1 -Open
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

Atalho equivalente:

```powershell
npm run check
```

Se o PowerShell bloquear `npm`, use `npm.cmd run check`.

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

Atalho equivalente:

```powershell
npm run check:full
```

## 3. Rodar smoke test

```powershell
node scripts\smoke-test.js
```

Atalho equivalente:

```powershell
npm run smoke
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

Atalho equivalente:

```powershell
npm run backup
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

Atalho equivalente:

```powershell
npm run restore:list
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

No SantusERP:

```text
Configuracoes > Saude do sistema
```

Conferir:

- Status operacional.
- Persistencia PostgreSQL.
- Base inicializada.
- Contagens principais.

## 10. Rotina recomendada antes de apresentacoes

1. Rodar `npm run check`.
2. Rodar `npm run smoke`.
3. Gerar backup com `npm run backup`.
4. Iniciar `.\scripts\start-santuserp.ps1 -Open`.
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

## 12. Rotina recomendada antes de release

1. Conferir `.env` do ambiente.
2. Rodar `npm run check`.
3. Rodar `npm run smoke`.
4. Rodar `npm run migrate:dry`.
5. Gerar backup com `npm run backup`.
6. Aplicar migrations com `npm run migrate:apply`.
7. Reiniciar com `node scripts\santuserp-service.js restart --env .env.production`.
8. Conferir `node scripts\santuserp-service.js status`.
9. Conferir `logs/santuserp.err.log`.
10. Fazer login e abrir `Configuracoes > Saude do sistema`.
