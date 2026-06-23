# SantusERP - Roadmap para entrada em producao

Este documento registra as etapas restantes para deixar o SantusERP pronto para operar no mundo real com clientes. Ele deve servir como memoria oficial do projeto e base para as proximas implementacoes.

Status geral atual:

- MVP funcional concluido.
- Fase 2 concluida no escopo planejado.
- Fase 3 iniciada com automacoes iniciais.
- Etapa 1 deste roadmap ja iniciada/concluida: sessoes fortalecidas com cookie `HttpOnly`, `SameSite=Lax`, limite basico de login e remocao do token puro do `localStorage`.
- Etapa 2 deste roadmap concluida: modelo multiempresa/multicliente com empresas, `tenant_id`, vinculo de usuarios e isolamento por sessao nas rotas principais.
- Etapa 3 deste roadmap concluida: migrations PostgreSQL versionadas, tabela `schema_migrations`, comandos de aplicacao/listagem/dry-run e aplicacao automatica pelo servidor.

## 1. Preparar autenticacao e sessoes para producao

Objetivo:

Tornar o login e a sessao seguros o suficiente para ambiente produtivo.

Entregas principais:

- Sessao por cookie `HttpOnly`.
- `SameSite=Lax`.
- Cookie `Secure` em producao.
- Token puro fora do `localStorage`.
- Logout limpando sessao no servidor.
- Sessao persistida no PostgreSQL por hash.
- Limite basico de tentativas de login.
- Compatibilidade temporaria com Bearer token apenas para scripts/transicao.

Status:

- Implementado parcialmente/concluido como primeira entrega tecnica.

Proximos refinamentos:

- Recuperacao de senha.
- Politica de senha forte.
- 2FA para administradores.
- Registro de login, logout e falhas de login na auditoria.
- Revisao de CSRF antes de expor fora do ambiente local.

Criterio de conclusao:

- Usuario autentica sem expor token no navegador.
- Sessao expira corretamente.
- Logout invalida sessao.
- Tentativas abusivas de login sao limitadas.
- Fluxo validado por smoke test.

## 2. Criar modelo multiempresa/multicliente

Objetivo:

Permitir que o SantusERP atenda clientes reais com isolamento de dados.

Entregas principais:

- Tabela de empresas/tenants. Concluido.
- Campo `tenant_id` nas entidades principais. Concluido.
- Vinculo entre usuarios e empresa. Concluido.
- Isolamento de consultas por empresa. Concluido nas rotas principais.
- Isolamento de criacao, edicao e exclusao por empresa. Concluido nas rotas principais.
- Perfil de administrador global e administrador da empresa. Concluido por sessao e e-mail de admin global configuravel.
- Tela administrativa para empresas/clientes do sistema. Concluida como modulo Empresas.

Riscos:

- Vazamento de dados entre clientes.
- Regras antigas sem filtro por empresa.
- Relatorios misturando dados de tenants diferentes.

Criterio de conclusao:

- Um usuario de uma empresa nao enxerga dados de outra. Implementado por filtro de sessao.
- Todas as rotas principais respeitam `tenant_id`. Implementado.
- Smoke test cobre login, bootstrap com tenant, CRUD, auditoria e isolamento entre dois tenants.

## 3. Profissionalizar banco de dados e migrations

Objetivo:

Transformar o schema atual em estrutura evolutiva e segura para producao.

Entregas principais:

- Sistema formal de migrations. Concluido.
- Versionamento do schema. Concluido com tabela `schema_migrations`.
- Script para aplicar migrations. Concluido.
- Script para rollback quando viavel. Definido como restauracao via backup para migrations destrutivas ou nao reversiveis.
- Seeds separados entre demo, desenvolvimento e producao. Demo mantido e integrado as migrations; seeds de homologacao/producao devem ficar vazios/controlados.
- Remocao de recriacao destrutiva em rotinas produtivas. Migrations nao truncam dados; seed demo continua sendo rotina explicita de demonstracao.
- Indices para campos mais usados em filtros e relatorios. Concluido nas migrations iniciais.

Criterio de conclusao:

- Toda alteracao estrutural do banco passa por migration. Implementado como padrao.
- Ambiente novo pode ser montado do zero. Implementado via `001_initial_schema`.
- Ambiente existente pode ser atualizado sem perda de dados. Implementado por migrations idempotentes.

## 4. Preparar deploy e ambientes

Objetivo:

Separar desenvolvimento, homologacao e producao.

Entregas principais:

- Variaveis de ambiente por ambiente.
- `NODE_ENV=production`.
- Cookies seguros em producao.
- Servidor com HTTPS.
- Dominio/subdominio definido.
- Processo de start/stop/restart documentado.
- Opcional: Dockerfile e docker-compose.
- Checklist de release.

Criterio de conclusao:

- Sistema sobe em ambiente limpo sem passos manuais confusos.
- Configuracao sensivel fica fora do Git.
- Producao pode ser reiniciada com procedimento documentado.

## 5. Fortalecer seguranca e compliance

Objetivo:

Reduzir riscos tecnicos, juridicos e operacionais antes de atender clientes.

Entregas principais:

- Politica de senha forte.
- Recuperacao de senha com token temporario.
- 2FA para administradores.
- Rate limit em rotas sensiveis.
- Protecao CSRF se necessario.
- Auditoria de login/logout/falhas.
- Revisao de permissoes no backend.
- Preparacao LGPD.
- Exportacao de dados por cliente.
- Anonimizacao/exclusao controlada de dados.

Criterio de conclusao:

- Rotas sensiveis protegidas.
- Eventos criticos auditados.
- Dados pessoais possuem fluxo de exportacao e remocao controlada.

## 6. Melhorar UX para cliente real

Objetivo:

Tornar o sistema confortavel para uso por clientes externos, nao apenas uso interno.

Entregas principais:

- Onboarding inicial.
- Tela de perfil da empresa.
- Preferencias do sistema.
- Textos e mensagens revisados.
- Estados vazios mais orientados.
- Feedback visual para loading/salvamento.
- Melhorias em filtros e buscas.
- Paginacao em listas maiores.
- Revisao mobile/tablet/desktop.
- Guia rapido de uso.

Criterio de conclusao:

- Usuario novo consegue iniciar sem treinamento extenso.
- Fluxos principais sao claros.
- Sistema funciona bem em telas comuns de notebook e celular.

## 7. Completar funcionalidades essenciais de produto

Objetivo:

Fechar lacunas funcionais esperadas por clientes pagantes.

Entregas principais:

- Recuperacao de senha.
- Perfil da empresa.
- Configuracoes do cliente.
- Usuarios por empresa.
- Convite de usuarios.
- Logs de acesso.
- Relatorios profissionais.
- Exportacao com filtros e nomes padronizados.
- Automacoes configuraveis.
- Notificacoes configuraveis.
- Painel administrativo do cliente.

Criterio de conclusao:

- Cliente consegue administrar sua propria conta.
- Gestores conseguem extrair informacoes sem depender do desenvolvedor.
- Automacoes podem ser ajustadas sem editar codigo.

## 8. Criar testes e qualidade de release

Objetivo:

Reduzir regressoes antes de entregar para clientes.

Entregas principais:

- Testes automatizados por modulo.
- Testes de autenticacao.
- Testes de permissao.
- Testes de multiempresa.
- Testes de financeiro.
- Testes de relatorios.
- Testes end-to-end dos fluxos principais.
- Checklist de QA.
- Teste de carga basico.

Criterio de conclusao:

- `npm run check:full` cobre fluxos criticos.
- Release so acontece com checklist aprovado.
- Bugs regressivos ficam mais dificeis de passar.

## 9. Implantar monitoramento e operacao

Objetivo:

Garantir visibilidade e capacidade de resposta em producao.

Entregas principais:

- Logs estruturados.
- Monitoramento de uptime.
- Monitoramento de erros.
- Health check de producao.
- Alertas de falha no banco.
- Alertas de backup.
- Rotina automatizada de backup.
- Teste periodico de restauracao.
- Painel tecnico administrativo.

Criterio de conclusao:

- Falhas sao detectadas rapidamente.
- Backups existem e sao restauraveis.
- Operacao nao depende apenas de observacao manual.

## 10. Preparar comercializacao, suporte e escala

Objetivo:

Transformar o SantusERP em produto entregavel e sustentavel.

Entregas principais:

- Modelo comercial.
- Planos ou pacotes.
- SLA.
- Termos de uso.
- Politica de privacidade.
- Contrato de prestacao.
- Processo de implantacao de novo cliente.
- Ambiente de demonstracao.
- Base demo segura.
- Documentacao para usuario final.
- Processo de suporte.
- Processo de priorizacao de melhorias.

Criterio de conclusao:

- Novo cliente pode ser implantado com roteiro claro.
- Suporte sabe como agir diante de problemas.
- Existe material minimo para venda, demonstracao e operacao.

## Ordem recomendada de implementacao

1. Finalizar refinamentos da autenticacao.
2. Implementar multiempresa/multicliente. Concluido.
3. Criar migrations formais. Concluido.
4. Preparar deploy/homologacao/producao.
5. Reforcar compliance e auditoria.
6. Melhorar UX/onboarding.
7. Completar funcionalidades essenciais de produto.
8. Ampliar testes e QA.
9. Implantar monitoramento.
10. Preparar comercializacao e suporte.

## Proxima etapa tecnica recomendada

A proxima etapa mais importante e a **Etapa 4 - deploy e ambientes**, porque o banco ja possui caminho formal de evolucao e agora o sistema precisa separar desenvolvimento, homologacao e producao.

Primeira entrega sugerida da Etapa 4:

- Definir variaveis de ambiente por ambiente.
- Preparar `NODE_ENV=production` e cookies seguros.
- Documentar start, stop, restart e release.
- Planejar HTTPS, dominio e backup antes do deploy.

