# Objetivos
```markdown
Objetivo: Criar dash resultado financeiro por C.R

Grafico de resultado financeiro por C.R
- Para desenvolvimento, pode-se basear no dash Gestão por Centro de Resultado
- Consolidar o resultado de receita e despesa por nível de hierarquia
- Deve viabilizar a apresentação do resultado sintetizado por natureza
- Apresentar gráfico de evolução por C.R
- A despesas, são as baixas (VLRBAIXA) no periodo, com exceção para as comissões, que seriam as provisionadas e não as baixadas. 
- As receitas, são obtidas pela data de negociação (utilizar select do realizado dos indiradores comerciais, como metas e rel. de vendas), utilizar (VLRDESDOB)
- EXEMPLO CONSULTA COMISSÕES: ( SELECT * FROM TGFFIN WHERE CODNAT = 2020202 AND PROVISAO = 'S' AND DTNEG BETWEEN '01/11/2023' AND '30/11/2023' )
- Permitir comparar periodos diferentes (talvez seja necessário criar um dash com essa finalidade)

```

### 1. Log's Execução

#### 1.1. 29/01/2024 09:30 as 12:00
```markdown
Satis - Resultado financeiro por C.R - 1)Desenvolvimento de um dashboard com um componente inicial fundamentado na funcionalidade "Dash Gestão por CR", preservando os campos de código CR, descrição CR e valor de baixa durante a atualização efetuada na SELECT desse componente.
```

#### 1.2. 29/01/2024 13:00 as 18:00
```markdown
Satis - Resultado financeiro por C.R - 2)Desenvolvemos um novo componente de tabela localizado na parte inferior, modelado a partir do componente de detalhamento do "Dash Gestão por CR". Este novo componente utiliza uma estrutura de seleção para agrupar as naturezas contábeis e apresentar os campos correspondentes, incluindo código da natureza, descrição e valor de baixa. 3)Além disso, implementamos um gráfico que ilustra a evolução do comportamento do CR ao longo dos últimos 12 meses. Para isso, elaboramos a estrutura de seleção com base no componente de tabela inferior do "Dash Gestão por CR". O filtro aplicado considera a data final do período selecionado e os 12 meses anteriores a essa data. 4)Por fim, realizamos ajustes no componente principal do dashboard para garantir que, ao ser clicado, ele atualize automaticamente os demais componentes, proporcionando uma experiência de usuário mais dinâmica e eficiente.
```

#### 1.3. 30/01/2024 07:00 as 12:00
```markdown
Satis - Resultado financeiro por C.R - 5) Realizada a criação do primeiro subnível, mantendo a mesma estrutura padrão do nível principal anterior. 6) Adaptado o comando SELECT para cada componente do nível. 7) Configurado o argumento do comando SELECT para filtrar a sequência do grau 2 de CR (Controle de Recursos), recebendo o código como argumento após o duplo clique no nível anterior. 8) Estabelecidos argumentos nos eventos para atualizar o componente de tabela que apresenta a natureza sintética e o gráfico que exibe a evolução dos últimos 12 meses.

```
#### 1.4. 30/01/2024 13:00 as 18:10
```markdown
Satis - Resultado financeiro por C.R - 9) Procedeu-se à replicação das atividades de criação do nível anterior para mais três subníveis, com devida atualização nos comandos SELECT correspondentes aos GRAUs: 3, 4 e 5, assegurando coerência e consistência na estrutura hierárquica. Este processo visa garantir uma extensão adequada da lógica implementada anteriormente, mantendo a integridade e a sincronização entre os diferentes níveis de detalhamento.

```

#### 1.5. 31/01/2024 07:00 as 12:00
```markdown

Satis - Resultado financeiro por C.R - 10)Desenvolvimento de um critério de seleção para adicionar uma cláusula ao comando SELECT, visando incluir despesas registradas como baixadas durante um período específico, excluindo aquelas relacionadas a comissões provisionadas e não baixadas.(Em andamento).


```


#### 1.6. 31/01/2024 13:30 as 18:30
```markdown

Satis - Resultado financeiro por C.R - 11) Continuação da atividade da manhão de desenvolvimento de um critério de seleção para adicionar uma cláusula ao comando SELECT, visando incluir despesas registradas como baixadas durante um período específico, excluindo aquelas relacionadas a comissões provisionadas e não baixadas. 12) Concomitante, realização de vericação em select para obter as receitas utilizando a data de negociação e o valor de desdobramento baseado nos indicadores comerciais (Em andamento). 13) Criação de gráfico comparativo por periodo 1 e 2, adicionado como obrigatorio o periodo 1 e tambem a quantidade de periodos de 1 dever ser igual a quantidade de periodos em 2, estrutura do grafico pronta, falta adicionar o filtro da receita e despesa.


```

