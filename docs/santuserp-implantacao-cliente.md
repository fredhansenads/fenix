# SantusERP - Roteiro de implantacao de cliente

Este roteiro orienta a implantacao do SantusERP em um novo cliente, do kickoff ao acompanhamento pos-go-live.

## 1. Objetivo

Implantar o SantusERP com seguranca, clareza de responsabilidades, dados consistentes e usuarios treinados para operar os modulos contratados.

## 2. Papeis

- Responsavel SANTUS: conduz implantacao, configuracao, treinamento e suporte inicial.
- Responsavel do cliente: valida escopo, fornece dados e aprova entregas.
- Usuarios-chave: validam processos por area.
- Administrador do cliente: gerencia usuarios, permissoes e configuracoes.

## 3. Checklist de pre-implantacao

- Contrato assinado.
- Plano contratado definido.
- SLA definido.
- Canais de suporte definidos.
- Responsavel do cliente indicado.
- Modulos contratados definidos.
- Ambiente escolhido: local, homologacao ou producao.
- Politica de backup acordada.
- Dados iniciais definidos.

## 4. Kickoff

Agenda recomendada:

1. Apresentar objetivos do projeto.
2. Confirmar escopo contratado.
3. Confirmar usuarios-chave.
4. Confirmar cronograma.
5. Confirmar canais de comunicacao.
6. Explicar responsabilidades.
7. Registrar riscos iniciais.

Saida esperada:

- Ata simples do kickoff.
- Cronograma validado.
- Lista de dados necessarios.

## 5. Levantamento de dados

Dados minimos:

- Empresa: nome, documento, e-mail, telefone e responsavel.
- Usuarios: nome, e-mail, perfil e area.
- Clientes.
- Fornecedores.
- Contas a pagar abertas.
- Contas a receber abertas.
- Propostas em andamento.
- Contratos ativos.
- Projetos em andamento.
- Tarefas abertas.

Regras:

- Nao importar dados desnecessarios.
- Remover duplicidades antes da carga.
- Evitar dados pessoais sensiveis quando nao forem necessarios ao uso do ERP.
- Guardar arquivos de importacao em local controlado.

## 6. Preparacao do ambiente

Comandos de validacao:

```powershell
npm run check
npm run monitor
npm run migrate:dry
```

Antes de iniciar carga real:

```powershell
npm run backup:retention
```

Validar:

- `.env` correto.
- PostgreSQL ativo.
- Migrations aplicadas.
- Backup recente.
- Painel de saude operacional.
- Usuario administrador criado.

## 7. Configuracao inicial

No SantusERP:

1. Acessar como administrador.
2. Abrir `Configuracoes`.
3. Preencher perfil da empresa.
4. Definir preferencias.
5. Criar usuarios iniciais.
6. Revisar permissoes.
7. Validar notificacoes e automacoes.
8. Abrir `Configuracoes > Saude do sistema`.

## 8. Carga de dados

Procedimento recomendado:

1. Gerar backup antes da carga.
2. Carregar ou cadastrar dados por modulo.
3. Validar contagens.
4. Validar amostras com o cliente.
5. Registrar ajustes.
6. Gerar novo backup apos aceite da carga.

Ordem sugerida:

1. Usuarios.
2. Clientes.
3. Fornecedores.
4. Financeiro.
5. Propostas.
6. Contratos.
7. Projetos.
8. Tarefas.

## 9. Treinamento

Treinamentos sugeridos:

- Administrador: usuarios, permissoes, configuracoes, saude e auditoria.
- Financeiro: contas a pagar, contas a receber e fluxo de caixa.
- Comercial: clientes, propostas e contratos.
- Operacional: projetos e tarefas.
- Gestao: dashboard, relatorios, indicadores e exportacoes.

Cada treinamento deve terminar com uma atividade pratica.

## 10. Homologacao

Checklist:

- Login dos usuarios-chave.
- Cadastro e edicao por modulo.
- Permissoes testadas.
- Relatorios conferidos.
- Exportacoes validadas.
- Notificacoes conferidas.
- Backup recente.
- Monitor operacional OK ou sem falhas.

## 11. Go-live

Antes do go-live:

```powershell
npm run backup:retention
npm run check:full
npm run client:ready
```

Confirmar:

- Cliente aprovou homologacao.
- Usuarios foram comunicados.
- Canal de suporte esta ativo.
- Janela de entrada em operacao definida.
- Plano de rollback definido.

## 12. Suporte assistido

Periodo sugerido:

- 7 a 15 dias apos go-live.

Rotina:

- Check-in diario nos primeiros dias.
- Registro de chamados.
- Correcoes rapidas quando forem bug.
- Melhorias entram no processo de priorizacao.

## 13. Encerramento

Entregaveis finais:

- Ambiente operacional.
- Usuarios ativos.
- Guia de usuario final entregue.
- SLA e canais confirmados.
- Backup recente.
- Registro de aceite.
- Lista de melhorias futuras.

## 14. Modelo de aceite

```text
Aceite de Implantacao - SantusERP

Cliente:
Responsavel:
Data:
Ambiente:
Plano:

Itens validados:
- Login e usuarios
- Clientes e fornecedores
- Financeiro
- Propostas e contratos
- Projetos e tarefas
- Relatorios
- Suporte e SLA

Pendencias conhecidas:

Declaracao:
O cliente confirma que o SantusERP foi implantado conforme escopo contratado e esta apto para uso operacional, respeitadas as pendencias listadas.

Assinatura SANTUS:
Assinatura Cliente:
```
