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
npm run backup
npm run restore:list
npm run seed:demo
```

No PowerShell do Windows, se `npm` for bloqueado pela politica de execucao, use `npm.cmd` nos mesmos comandos:

```powershell
npm.cmd run check
```

Principais usos:

- `npm start`: inicia o servidor local.
- `npm run check`: valida Node.js, PostgreSQL, tabelas, backups e scripts.
- `npm run check:full`: executa checklist operacional com smoke test.
- `npm run smoke`: sobe API temporaria e valida login, PostgreSQL, bootstrap, cliente, auditoria e notificacoes.
- `npm run backup`: gera backup SQL local em `backups/`.
- `npm run restore:list`: lista backups disponiveis.
- `npm run seed:demo`: recria dados demonstrativos no PostgreSQL.

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
