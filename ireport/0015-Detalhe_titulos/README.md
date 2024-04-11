# Objetivos
```markdown
"Atualizar a TABELA COM VIEW (AD_VGFSTATUSA2W)que retorna o STATUS dos pedidos
Essa tabela com view retorna o status dos pedidos integrados pela A2W, assim os vendedores podem saber no campo, atravez da mobilidade A2W em qual status o pedido se encontra

A VIEW  deve retornar os status:

A - APROVADO
R - REJEITADO
C - CANCELADO
PROGAMADO ENTREGA
FP - FATURADO PARCIAL
FT - FATURADO TOTAL

ADICIONAR O CAMPO ""COMENTARIO"", ELE DEVERÁ GRAVAR A DATA DE ENTREGA PREVISTA PARA OS STATUS DE PROGRAMADO ENTREGA E FATURADO TOTAL E PARCIAL"
```

### 1. Log's Execução

#### 1.1. 04/04/2024 15:00 as 19:00
```markdown

Satis - Atualizar a TABELA COM VIEW - A TABELA COM VIEW (AD_VGFSTATUSA2W) foi atualizada para refletir os respectivos status. O status "FATURADO TOTAL" é atribuído quando todos os itens estão marcados como "Pendente = N" em TGFITE. O status "FATURADO PARCIAL" é atribuído se pelo menos um item está marcado como "Pendente = N" e os demais como "Pendente = S". O status "PROGRAMADO ENTREGA" é concedido quando todos os itens estão marcados como "Pendente = S" e a data de entrega prevista (CAB.AD_DTENTREGAPREV) está informada. Para melhorar a visualização e compreensão, um campo "COMENTARIO" foi adicionado para indicar a data de entrega prevista para os status de "PROGRAMADO ENTREGA" e "FATURADO TOTAL E PARCIAL".

```

#### 1.1. 04/04/2024 08:00 as 11:30
```markdown
Satis - Atualizar a TABELA COM VIEW - Após a conclusão da atualização da tabela com a view (AD_VGFSTATUSA2W) para refletir os respectivos status, estamos agora aguardando o retorno do cliente. Além disso, planejamos acompanhar o follow-up com a empresa responsável pela integração para garantir que todas as mudanças implementadas estejam funcionando corretamente e atendendo às necessidades do cliente.

```
