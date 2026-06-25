# SantusERP - Guia de deploy e ambientes

Este documento define o roteiro operacional para executar o SantusERP em desenvolvimento, homologacao e producao.

## 1. Ambientes

Ambientes recomendados:

- Desenvolvimento: uso local, testes rapidos e implementacao.
- Homologacao: validacao antes de entregar mudancas para uso real.
- Producao: ambiente usado por clientes reais.

Modelos de configuracao:

```text
config/.env.development.example
config/.env.staging.example
config/.env.production.example
```

O arquivo real usado no servidor deve ser copiado para `.env` ou informado ao script de servico por `-EnvFile`. Arquivos reais de ambiente nao devem ser commitados.

## 2. Variaveis essenciais

Obrigatorias em producao:

- `NODE_ENV=production`
- `HOST=127.0.0.1` quando houver proxy reverso na mesma maquina.
- `PORT=4173` ou porta definida pela infraestrutura.
- `DATABASE_URL` ou variaveis `PG*`.
- `SANTUSERP_SECURE_COOKIES=true`
- `SANTUSERP_GLOBAL_ADMIN_EMAILS=admin@santus.com`

Em `NODE_ENV=production`, o servidor exige PostgreSQL. O fallback JSON fica bloqueado para evitar perda de dados operacional.

## 3. HTTPS e dominio

O servidor Node atual entrega HTTP. Em producao, usar um proxy reverso com HTTPS na frente do Node, por exemplo Nginx, Caddy, IIS ARR ou outro balanceador.

Fluxo recomendado:

```text
https://erp.santus.com.br -> proxy HTTPS -> http://127.0.0.1:4173
```

Com `SANTUSERP_SECURE_COOKIES=true`, o navegador so envia o cookie de sessao em HTTPS. Portanto, producao deve ser acessada pelo dominio HTTPS, nao por HTTP direto.

## 4. Migrations

Antes de subir uma nova versao:

```powershell
npm run migrate:dry
npm run migrate:apply
npm run migrate:list
```

O servidor tambem aplica migrations pendentes automaticamente ao iniciar. Ainda assim, em release controlada, aplique manualmente antes do restart para enxergar erros com antecedencia.

## 5. Backup antes de release

Antes de qualquer deploy:

```powershell
npm run backup:retention
```

Confirme se o arquivo foi criado em:

```text
backups/
```

## 6. Servico local

Status:

```powershell
node scripts\santuserp-service.js status
```

Iniciar com `.env` padrao:

```powershell
node scripts\santuserp-service.js start
```

Iniciar com arquivo especifico:

```powershell
node scripts\santuserp-service.js start --env .env.production
```

Reiniciar:

```powershell
node scripts\santuserp-service.js restart --env .env.production
```

Parar:

```powershell
node scripts\santuserp-service.js stop
```

Logs:

```text
logs/santuserp.out.log
logs/santuserp.err.log
logs/santuserp-structured.log
```

PID:

```text
runtime/santuserp.pid
```

Atalhos npm:

```powershell
npm run service:status
npm run service:start
npm run service:restart
npm run service:stop
```

No Windows, tambem existe wrapper PowerShell:

```powershell
.\scripts\santuserp-service.ps1 status
.\scripts\santuserp-service.ps1 start -EnvFile ".env.production"
.\scripts\santuserp-service.ps1 restart -EnvFile ".env.production"
.\scripts\santuserp-service.ps1 stop
```

## 7. Checklist de release

Antes do deploy:

1. Confirmar Git limpo.
2. Confirmar branch e commit que sera publicado.
3. Rodar `npm run check`.
4. Rodar `npm run monitor`.
5. Rodar `npm run client:ready`.
6. Rodar `npm run smoke`.
7. Rodar `npm run migrate:dry`.
8. Gerar backup com `npm run backup:retention`.
9. Conferir `.env` do ambiente.

Durante o deploy:

1. Parar ou reiniciar pelo script de servico.
2. Aplicar migrations com `npm run migrate:apply`.
3. Iniciar/reiniciar o servico com `npm run service:restart`.
4. Conferir status do processo.
5. Conferir logs.
6. Rodar `npm run monitor`.

Depois do deploy:

1. Rodar `npm run check`.
2. Rodar `npm run monitor`.
3. Rodar `npm run client:ready`.
4. Acessar o dominio HTTPS.
5. Fazer login administrativo.
6. Abrir `Configuracoes > Saude do sistema`.
7. Validar Dashboard, Clientes, Financeiro, Projetos e Relatorios.
8. Registrar commit, data, responsavel e observacoes da release.

## 8. Rollback

Rollback recomendado:

1. Parar o servico.
2. Restaurar o backup validado.
3. Voltar o codigo para o commit anterior.
4. Iniciar o servico.
5. Rodar `npm run check`.
6. Validar login e painel de saude.

Use restauracao de banco somente com confirmacao explicita, porque ela substitui o estado atual do PostgreSQL.

## 9. Criterio de conclusao da Etapa 4

A Etapa 4 e considerada concluida quando:

- Existem modelos de ambiente para desenvolvimento, homologacao e producao.
- Producao exige PostgreSQL.
- Cookies seguros estao previstos para producao.
- Migrations possuem comando operacional.
- Existe processo documentado de start, stop, restart e status.
- Existe checklist de release e rollback.

## 10. Monitoramento operacional

O guia completo de operacao fica em:

```text
docs/santuserp-operacao-monitoramento.md
```

Comando principal:

```powershell
npm run monitor
```

O monitor grava o resultado em:

```text
runtime/monitor-status.json
```

Em producao, recomenda-se validar diariamente:

- PostgreSQL respondendo.
- Backup dentro da janela definida por `SANTUSERP_BACKUP_MAX_AGE_HOURS`.
- `logs/santuserp-structured.log` sendo atualizado.
- `logs/santuserp.err.log` sem ocorrencias criticas recentes.
