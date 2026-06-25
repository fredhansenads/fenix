# SantusERP - Operacao e monitoramento

Este documento registra a entrega da Etapa 9 e define como acompanhar a saude operacional do SantusERP em ambiente local, homologacao ou producao.

## 1. Objetivo

Garantir que a operacao do SantusERP tenha sinais claros sobre:

- Disponibilidade da API.
- Conexao com PostgreSQL.
- Backups recentes.
- Logs de requisicao e erro.
- Uptime do servidor.
- Consumo basico de memoria.
- Contagens principais do ERP.

## 2. Health check

A rota tecnica principal e:

```text
GET /api/health
```

Ela exige sessao administrativa ou gerencial e retorna:

- `ok`: status geral da API.
- `source`: origem da persistencia, como `postgres` ou `json`.
- `initialized`: indica se a base esta inicializada.
- `checkedAt`: data da verificacao.
- `startedAt`: data de inicio do servidor.
- `uptimeSeconds`: tempo de execucao do servidor.
- `memory`: resumo de uso de memoria do Node.js.
- `backup`: resumo do backup local mais recente.
- `logs`: resumo do log estruturado mais recente.
- `counts`: contagens principais por modulo.

No frontend, esses dados aparecem em:

```text
Configuracoes > Saude do sistema
```

## 3. Logs estruturados

O servidor grava eventos operacionais em JSON Lines:

```text
logs/santuserp-structured.log
```

Eventos registrados:

- `server_started`: servidor iniciado.
- `http_request`: requisicao finalizada, com metodo, rota, status, duracao, IP e user-agent.
- `http_error`: erro inesperado em requisicao da API.

Cada linha possui `timestamp`, `event` e dados do evento. Esse formato facilita leitura por ferramentas externas no futuro.

## 4. Monitor operacional

Comando principal:

```powershell
npm run monitor
```

Comando direto:

```powershell
node scripts\monitor-check.js
```

O monitor verifica:

- PostgreSQL responde ao `SELECT 1`.
- Existe backup local recente.
- Existe log estruturado ativo.
- O final de `logs/santuserp.err.log` nao possui sinais criticos recentes.

O resultado e salvo em:

```text
runtime/monitor-status.json
```

Para uso automatizado, com falha quando houver aviso ou falha:

```powershell
node scripts\monitor-check.js --strict
```

Para release automatizado, falhando apenas quando houver `falha` real:

```powershell
node scripts\monitor-check.js --fail-on-falha
```

Para integracao com ferramentas externas:

```powershell
node scripts\monitor-check.js --json
```

## 5. Alertas operacionais

O monitor usa tres niveis:

- `ok`: sinal saudavel.
- `aviso`: requer revisao, mas nao impede operacao imediata.
- `falha`: exige acao antes de considerar a operacao saudavel.

Alertas atuais:

- Banco indisponivel: `falha`.
- Nenhum backup encontrado: `falha`.
- Backup mais antigo que o limite: `aviso`.
- Log estruturado ausente ou vazio: `aviso`.
- Log de erro com sinais criticos: `aviso`.

O limite de idade de backup pode ser configurado por ambiente:

```text
SANTUSERP_BACKUP_MAX_AGE_HOURS=72
```

## 6. Backup com retencao

Backup simples:

```powershell
npm run backup
```

Backup com retencao padrao de 14 dias:

```powershell
npm run backup:retention
```

Comando direto:

```powershell
node scripts\backup-postgres.js --retention-days=14
```

Tambem e possivel definir:

```text
SANTUSERP_BACKUP_RETENTION_DAYS=14
```

Os arquivos sao criados em:

```text
backups/
```

Backups locais nao devem ser enviados ao Git.

## 7. Agendamento de backup no Windows

O script abaixo registra uma tarefa diaria no Agendador de Tarefas do Windows:

```powershell
.\scripts\install-backup-task.ps1 -Time "02:00" -RetentionDays 14
```

Parametros uteis:

- `-TaskName`: nome da tarefa no Windows.
- `-Time`: horario diario do backup.
- `-ProjectPath`: caminho do projeto, se diferente da pasta atual.
- `-RetentionDays`: dias de retencao local.

Esse script deve ser executado manualmente por alguem com permissao suficiente no Windows.

## 8. Teste periodico de restauracao

Listar backups:

```powershell
npm run restore:list
```

Simular restauracao do backup mais recente:

```powershell
node scripts\restore-postgres.js --latest
```

Esse comando nao altera o banco. Ele serve como teste periodico de que existe backup selecionavel e roteiro de restauracao pronto.

Restauracao real:

```powershell
node scripts\restore-postgres.js --latest --apply --confirm=RESTORE
```

Use restauracao real apenas com decisao explicita, porque ela substitui o estado atual do banco.

## 9. Checklist recomendado

Rotina diaria:

1. Rodar `npm run monitor`.
2. Conferir `runtime/monitor-status.json` se houver aviso.
3. Conferir `Configuracoes > Saude do sistema`.

Rotina antes de release:

1. Rodar `npm run backup:retention`.
2. Rodar `npm run check:full`.
3. Conferir `logs/santuserp.err.log`.
4. Abrir `Configuracoes > Saude do sistema`.
5. Registrar resultado da release.

Rotina semanal:

1. Rodar `npm run restore:list`.
2. Simular restauracao com `node scripts\restore-postgres.js --latest`.
3. Conferir se a tarefa de backup do Windows executou no horario esperado.

## 10. Criterio de conclusao da Etapa 9

A Etapa 9 e considerada concluida quando:

- O sistema possui logs estruturados.
- A rota de saude informa uptime, memoria, backups, logs e contagens.
- Existe monitor operacional por linha de comando.
- Existe alerta simples de banco, backup e erro.
- Existe backup com retencao.
- Existe roteiro para agendamento de backup no Windows.
- Existe procedimento documentado de teste de restauracao.
- O painel tecnico administrativo exibe sinais operacionais para admin e gestor.
