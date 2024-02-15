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

#### 1.7. 01/02/2024 7:00 as 12:00
```markdown

Satis - Resultado financeiro por C.R - 12) Realizou-se um ajuste no painel principal do dashboard, especificamente no componente de tabela utilizado para consolidar dados por centro de resultado (CR), visando agregar a soma dos dois primeiros dígitos do CR. 13) Implementou-se a replicação de lógica em um componente de tabela destinado à consolidação por natureza de despesa, com o objetivo de agregar a soma dos valores consolidados pelos dois primeiros dígitos do CR. Adicionalmente, foi incorporada a funcionalidade de atualização dinâmica da tabela ao clicar em cada código de resultado, exibindo as informações específicas do CR selecionado.14) Efetuou-se um ajuste no gráfico, onde foi estabelecido que o filtro de período 1 é obrigatório, enquanto o período 2 é opcional. Ambos os períodos devem corresponder à mesma quantidade de meses para permitir comparações adequadas.


```




#### 1.8. 01/02/2024 13:20 as 17:50
```markdown
Satis - Resultado financeiro por C.R - 15) No mesmo contexto do ajuste anterior, foram adicionados quatro níveis adicionais ao dashboard, cada um correspondendo a um grau de detalhamento da numeração do centro de resultado. Por exemplo: Grau 2 = 0000, Grau 3 = 000000, Grau 4 = 00000000 e Grau 5 = 0000000000. 16) Desenvolveram-se argumentos que permitem a passagem de nível em nível, proporcionando uma atomização progressiva do detalhamento. Essa abordagem possibilita uma análise mais granular dos dados, permitindo uma compreensão mais precisa e aprofundada das informações apresentadas. 17) Para os demais componentes relacionados aos diferentes níveis de detalhamento, como a tabela consolidada por natureza e o gráfico comparativo por período, foi replicada a funcionalidade de atualização dinâmica com base no cr selecionado no componente principal. Isso garante uma consistência na visualização dos dados em todos os níveis de detalhamento, facilitando a análise e tomada de decisões.

```



#### 1.9. 09/02/2024 08:30 as 16:20
```markdown
Satis - Resultado financeiro por C.R - 18) Reestruturação do recurso "select" em todos os 05 níveis do painel de controle, com a introdução de uma coluna consolidada para receita, despesa e valor líquido. As Receitas serão filtradas com base nas "Receitas de vendas" negociadas durante o período e "Outras Receitas", que correspondem às receitas baixadas no mesmo período. As Despesas serão filtradas pelas "Comissões" e "Devoluções de Venda" negociadas no período, enquanto "Outras Despesas" representarão as despesas baixadas durante o mesmo período. Ajustes na lógica serão implementados para garantir a correta apresentação do nível acessado após o duplo clique na tabela de cada nível, considerando os registros de  CR's.

```