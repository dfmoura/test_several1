# Objetivos
```markdown

DESBLOQUEIO PARCEIRO
"Régua de Cobrança
- Comando ""Bloquear quando inadiplente"", deve bloquear apenas novas vendas; Hoje bloqueia para baixar receitas
- Reabilitar o cliente após o mesmo deixar de estar inadiplente"


"Possibilitar marcar um cliente como bloqueado
- Não permite vender e solicita liberação
- Não apresentar esse cliente na carteira de vendedores da mobilidade"

```

### 1. Log's Execução

#### 1.1. 28/02/2024 13:00 as 18:00
```markdown

Satis - Desbloqueio Parceiro Adimplente -1) Foi desenvolvida uma procedure customizada para gerenciar eventos específicos, permitindo o desbloqueio automático de parceiros no sistema, mediante a verificação de sua ausência de títulos vencidos. Essa funcionalidade visa otimizar o fluxo operacional, garantindo que os parceiros sejam automaticamente desbloqueados quando não apresentarem pendências financeiras vencidas.2) Implementou-se o agendamento automatizado da execução do referido evento por meio do agendador de tarefas do sistema. Isso assegura que a procedure desenvolvida seja regularmente ativada conforme cronograma predefinido, aumentando a eficiência do processo de desbloqueio de parceiros e reduzindo a necessidade de intervenção manual.

```

### 1. Log's Execução

#### 1.1. 29/02/2024 08:00 as 12:00
```markdown
Satis - Parceiros Bloqueado para Negociação - 1) Foi implementado um campo adicional na tabela de parceiros, consistindo em um check-box destinado a sinalizar o estado de bloqueio do parceiro em relação às negociações. 2) Desenvolveu-se uma procedure específica, a qual, com base no status de bloqueio do parceiro, aciona medidas de restrição, impedindo assim a continuidade de processos no sistema.3) Introduziu-se uma regra de negócio associada à procedure mencionada, a qual proíbe qualquer transação proveniente dos portais de vendas quando o parceiro se encontra bloqueado, garantindo a integridade das operações no sistema (tops relaciondas 1000/1001/1002/1003/1005/1006/1009). 4)Posteriormente à identificação do parceiro como bloqueado, foi implementada uma restrição que impede sua visualização na carteira comercial do sistema. Essa medida visa assegurar que parceiros bloqueados não sejam apresentados na interface de usuário, evitando assim interações indesejadas e mantendo a integridade das informações exibidas na carteira comercial.

```