### **Objetivo**  
Criação de Dash com nível analítico do Custo Indireto de Produção.

---

Nível analítico de **CIP** (custos indiretos da produção), que detalha os movimentos que compuseram o valor do CIP.

```sql
CTACTB LIKE '%3.01.03.01%'
CTACTB LIKE '%3.01.03.02%'
```

---


```
Em 13/09/2024, das 8h às 12h, foi desenvolvido um dashboard com dois níveis de visualização: uma tabela consolidada e uma tabela detalhada. A tabela consolidada, à esquerda, apresenta os campos 'Mês/Ano', 'Referência', 'CIP Total' e '% Var. CIP'. Já a tabela detalhada, à direita, inclui 'Mês/Ano', 'Referência', 'Cód. CTA. CTB.', 'Conta Contábil', 'Descrição' e 'Valor CIP'. Implementamos uma funcionalidade interativa que, ao clicar na coluna 'Referência' da tabela consolidada, atualiza automaticamente os dados da tabela detalhada correspondente. Além disso, ao clicar na coluna 'Mês/Ano' na tabela consolidada, o usuário é levado para um nível mais detalhado por período. Na tabela detalhada, ao clicar na coluna 'Cód. CTA. CTB.', o dashboard filtra os resultados e direciona o usuário para um nível específico com base nesse código contábil.
```
