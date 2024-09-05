# Objetivos
```markdown

Botão de ação para permitir alterar os centavos do valor de desdobramento de financeiros originados a partir de notas (NUNOTA IS NOT NULL)
*acrescentamos a regra para atualizar somente valores em aberto.
```


### 1. Log's Execução


#### 1.1. 04/09/2024 13:30 as 17:30
```markdown
SATIS - ID 84 - Em ambiente de testes, no dia 04/09/2024 das 13h às 17h, realizamos a criacao da procedure STP_ATUALIZA_VLR_DEC_SATIS para a tela de 'Movimentação Financeira'. O objetivo dessa procedure é permitir a atualização do valor decimal do campo 'Valor Desdobramento' de forma dinâmica, conforme a digitação realizada pelo usuário. A regra de negócio foi aplicada rigorosamente, permitindo alterações apenas em títulos que estão em aberto e que possuem o Número Único do Portal (nunota). Adicionalmente, foi incorporada uma lógica de validação com mensagens claras para informar o usuário sobre o cumprimento ou não das condições de alteração. Durante os testes, três cenários foram simulados para garantir o comportamento esperado do sistema: 1) Tentativa de alterar o valor decimal de um título já baixado (Nufin: 140797), onde o sistema bloqueou a ação; 2) Tentativa de alterar o valor de um título sem Número Único do Portal (Nufin: 231251), também bloqueada pelo sistema; 3) Tentativa de alteração de um título em aberto com Número Único do Portal (Nufin: 239906), onde a atualização foi bem-sucedida, conforme esperado.
```

