# Objetivos
```markdown
Realizado criação de trigger
na tabela TGFCAB executada no BEFORE DELETE
IF o :OLD.CODTIPOPER IN (1001, 1009) AND :OLD.STATUSNOTA = 'L' THEN
Identificando  se o usuário logado é gestor de vendas (campo a ser criado na TSIUSU (Jeninho e Patida são gestores de venda)
Se NÃO for gestor, bloqueia e exibe mensagem:
Exclusão proibida! Apenas gestores de venda podem excluir pedidos de venda confirmados.

```

### 1. Log's Execução


#### 1.1. 29/04/2024 18:00 as 21:00
```markdown
GUI - Bloquido de Exclusão -  Foi realizada a implementação de um Trigger na tabela TGFCAB com a seguinte descrição técnica: Tipo de Trigger: BEFORE DELETE Tabela Afetada: TGFCAB Condições de Execução: A execução do Trigger é condicionada à verificação do valor dos campos :OLD.CODTIPOPER e :OLD.STATUSNOTA. Se :OLD.CODTIPOPER for igual a 1001 ou 1009 e :OLD.STATUSNOTA for igual a 'L', prossegue-se com a verificação do usuário logado para determinar se é um gestor de vendas. Para verificar se o usuário logado é um gestor de vendas, é realizada uma consulta ao campo de gestor de vendas na tabela TSIUSU para identificar o status de gestor de vendas do usuário logado. É importante ressaltar que os usuários "Jeninho" e "Patida" são considerados gestores de venda. Caso o usuário logado não seja um gestor de vendas, o registro é bloqueado para exclusão e uma mensagem de erro é exibida, informando que apenas gestores de venda têm permissão para excluir pedidos de venda confirmados. Essa tarefa tem como objetivo garantir que apenas gestores de venda possam excluir pedidos de venda confirmados na tabela TGFCAB.


```





```
