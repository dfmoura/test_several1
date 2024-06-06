# Objetivos
```markdown

"DASH COMPARATIVO DE METAS
        - Criar visão agrupada
                - Agrupa o resultado dos periodos 1 e 2 em uma única tabela
                - Ordernar por vendedor e safra
        -  Criar dois novos botões no nível principal para acessar essa tabela agrupada
                - Um botão para apresentar a tabela agrupada por vendedor
                - Outro botão para apresentar a tabela agrupada por marca

        - Criar parâmetro que quando marcado deverá agrupar o resultado por coordenador, nesse caso será gerado apenas 1 registro para o coordenador (campo gerente do cadastro do vendedor), assim agrupando seus vendedores
                - Esse agrupamento deve impactar os níveis que apresentem resultado por vendedor"

 


```

### 1. Log's Execução

#### 1.1. 31/05/2024 13:00 as 18:00
```markdown
SATIS - ATUALIZAÇÃO - DASH COMPARATIVO DE METAS - Estamos em andamento com a atualização do "DASH COMPARATIVO DE METAS". Nesta etapa, estamos focados na criação de uma visão agrupada que combina os resultados dos períodos 1 e 2 em uma única tabela, ordenada por vendedor e safra. Além disso, estamos implementando dois novos botões no nível principal para facilitar o acesso a esta tabela agrupada: um botão apresentará a tabela por vendedor e outro por marca. Também estamos desenvolvendo um parâmetro adicional que, quando ativado, agrupará os resultados por coordenador, consolidando os dados em um único registro por coordenador (campo gerente no cadastro do vendedor), e refletindo esse agrupamento em todos os níveis que exibem resultados por vendedor.
```

#### 1.2. 03/06/2024 08:00 as 12:00
```markdown
SATIS - ATUALIZAÇÃO - DASH COMPARATIVO DE METAS - Ajustamos a instrução SELECT, mantendo a estrutura original como base do FROM. A partir dessa base, implementamos verificações condicionais utilizando a cláusula CASE com base no parâmetro, para garantir a consistência das informações com outros dashboards. Se o valor do parâmetro for 'S', a agregação será realizada pelo campo VEND.CODGER, consolidando os dados por coordenador. Caso o valor do parâmetro seja 'N', a agregação ocorrerá pelo campo X.CODVEND, agrupando os dados por vendedor. Essa abordagem assegura que os dados sejam agrupados corretamente conforme o parâmetro especificado, permitindo flexibilidade e precisão na visualização das informações.

```

#### 1.3. 03/06/2024 13:00 as 18:00
```markdown
SATIS - ATUALIZAÇÃO - DASH COMPARATIVO DE METAS - Dando continuidade à atividade anterior, replicamos esta nova estrutura do SELECT para os demais níveis do dashboard. Esta replicação assegura que a lógica de agrupamento e consolidação de dados, condicionada pelo parâmetro , seja aplicada uniformemente em todas as visualizações. Consequentemente, tanto as tabelas detalhadas quanto os resumos seguirão o mesmo padrão de agrupamento, seja por coordenador ou por vendedor. Esta uniformidade garante a coerência e integridade dos dados apresentados, facilitando a análise comparativa e o acompanhamento das metas em todos os níveis hierárquicos do dashboard.

```

#### 1.4. 04/06/2024 08:00 as 13:00
```markdown
SATIS - ATUALIZAÇÃO - DASH COMPARATIVO DE METAS - Dando continuidade à atividade anterior, ao aplicar esta nova estrutura padrão do SELECT no nível de gráfico, foi necessário realizar adaptações específicas para contemplar as comparações de safra em relação aos períodos 1 e 2 selecionados. Essas adaptações permitiram o retorno adequado dos valores e volumes tanto para os dados previstos quanto para os realizados. Assim, garantimos que as visualizações gráficas refletem com precisão a comparação entre os períodos, apresentando de forma clara e detalhada as métricas de desempenho previstas e alcançadas.

```