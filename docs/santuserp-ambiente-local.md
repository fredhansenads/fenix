# SantusERP - Guia de ambiente local

Este guia resume como iniciar, validar e manter o ERP SantusERP rodando localmente na maquina da SANTUS.

## 1. Pre-requisitos

- Node.js instalado e disponivel no terminal.
- PostgreSQL instalado quando a persistencia principal for o banco local.
- Arquivo `.env` configurado com `DATABASE_URL` ou variaveis `PG*`.
- Schema PostgreSQL aplicado no banco `fenix`.

## 2. Inicializacao rapida

No PowerShell:

```powershell
cd "<pasta-do-projeto>"
.\scripts\start-santuserp.ps1 -Open
```

O script inicia o servidor em:

```text
http://127.0.0.1:4173
```

Credenciais demonstrativas:

```text
admin@santus.com
santus123
```

## 3. Inicializacao com checklist

Para validar ambiente e iniciar o sistema em seguida:

```powershell
.\scripts\start-santuserp.ps1 -Check -Open
```

Para executar apenas o checklist, sem iniciar o servidor:

```powershell
.\scripts\start-santuserp.ps1 -CheckOnly
```

## 4. Comandos npm

Tambem e possivel usar atalhos pelo `npm`:

```powershell
npm start
npm run check
npm run check:full
npm run smoke
npm run test:permissions
npm run test:load
npm run release:check
npm run migrate:list
npm run migrate:dry
npm run migrate:apply
npm run backup
npm run backup:retention
npm run monitor
npm run restore:list
npm run seed:demo
npm run service:status
npm run service:start
npm run service:restart
npm run service:stop
```

No PowerShell do Windows, se `npm` for bloqueado pela politica de execucao, use `npm.cmd` nos mesmos comandos:

```powershell
npm.cmd run check
```

Principais usos:

- `npm start`: inicia o servidor local.
- `npm run check`: valida Node.js, PostgreSQL, tabelas, backups e scripts.
- `npm run check:full`: executa validacao completa de release.
- `npm run smoke`: sobe API temporaria e valida login, PostgreSQL, bootstrap, cliente, auditoria e notificacoes.
- `npm run test:permissions`: valida permissoes, bloqueios e isolamento multiempresa.
- `npm run test:load`: executa carga basica autenticada.
- `npm run release:check`: executa a mesma rotina completa de `check:full`.
- `npm run migrate:list`: lista migrations aplicadas e pendentes.
- `npm run migrate:dry`: simula aplicacao de migrations.
- `npm run migrate:apply`: aplica migrations pendentes.
- `npm run backup`: gera backup SQL local em `backups/`.
- `npm run backup:retention`: gera backup e remove backups locais acima da retencao configurada.
- `npm run monitor`: verifica PostgreSQL, backup recente e logs operacionais.
- `npm run restore:list`: lista backups disponiveis.
- `npm run seed:demo`: recria dados demonstrativos no PostgreSQL.
- `npm run service:*`: controla o processo em background por PowerShell.

## 5. Rotina recomendada

Antes de iniciar uma sessao de uso ou testes:

```powershell
npm run check
npm start
```

Antes de salvar uma etapa importante:

```powershell
npm run check:full
git status --short
```

Antes de uma alteracao de banco:

```powershell
npm run backup
```

Rotina operacional diaria:

```powershell
npm run monitor
```

## 6. Portas

A porta padrao e `4173`.

Para iniciar em outra porta:

```powershell
.\scripts\start-santuserp.ps1 -Port 4180 -Open
```

Ou:

```powershell
$env:PORT="4180"
npm start
```

## 7. Persistencia

Ordem de persistencia:

1. PostgreSQL, quando `.env` aponta para banco valido.
2. JSON local em `data/fenix-db.json`, quando PostgreSQL nao esta configurado.
3. `localStorage`, quando o sistema e aberto sem servidor local.

Para operacao real, usar PostgreSQL local.

## 8. Diagnostico rapido

Se o site nao abrir:

```powershell
npm run check
```

Se a porta estiver ocupada:

```powershell
netstat -ano | findstr :4173
```

Depois, finalize o processo pelo PID, se tiver certeza de que e uma instancia antiga do SantusERP:

```powershell
Stop-Process -Id <PID> -Force
```

Se o login falhar:

- Confirme que o servidor foi iniciado com o `.env` correto.
- Execute `npm run check`.
- Confirme se o banco possui usuarios pelo checklist.
- Reaplique o seed demo somente se puder recriar a base de demonstracao.

## 9. Entrega operacional da Fase 2

Com este guia, o SantusERP passa a ter:

- Comandos padronizados por `npm`.
- Script PowerShell de inicializacao local.
- Checklist operacional de ambiente.
- Smoke test automatizado.
- Rotina documentada de backup e diagnostico.
- Monitor operacional de banco, backup e logs.

## 10. Operacao em background

Para deixar o SantusERP rodando sem manter o terminal aberto:

```powershell
node scripts\santuserp-service.js start
node scripts\santuserp-service.js status
node scripts\santuserp-service.js restart
node scripts\santuserp-service.js stop
```

Para usar um arquivo especifico de ambiente:

```powershell
node scripts\santuserp-service.js start --env .env.production
```

Logs:

```text
logs/santuserp.out.log
logs/santuserp.err.log
logs/santuserp-structured.log
```

## 11. Backup agendado

Para registrar backup diario no Agendador de Tarefas do Windows:

```powershell
.\scripts\install-backup-task.ps1 -Time "02:00" -RetentionDays 14
```

Antes de confiar no agendamento, rode manualmente:

```powershell
npm run backup:retention
npm run monitor
```
