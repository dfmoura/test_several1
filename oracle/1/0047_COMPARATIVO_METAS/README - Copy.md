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


#### 1.5. 06/06/2024 08:00 as 12:00
```markdown
SATIS - ATUALIZAÇÃO - DASH COMPARATIVO DE METAS - Realizamos otimizações na estrutura das instruções SELECT visando aumentar a agilidade das consultas e melhorar a organização lógica do código. Inicialmente, revisamos a base de dados utilizada no FROM, identificando oportunidades para simplificar e otimizar as junções e condições existentes. Implementamos melhorias na utilização de índices e revisamos a lógica de filtragem com a cláusula WHERE para assegurar uma seleção mais eficiente dos registros relevantes. Adicionalmente, refinamos a utilização de funções agregadoras e subconsultas, visando reduzir a carga computacional e melhorar o tempo de resposta das consultas. Por fim, organizamos a lógica das instruções SQL de forma mais clara e modular, permitindo uma manutenção mais fácil e um melhor entendimento do fluxo de dados, garantindo que as consultas sejam executadas de maneira mais eficiente e os resultados sejam retornados de forma ágil e precisa.
```


#### 1.6. 06/06/2024 13:00 as 18:00
```markdown
SATIS - ATUALIZAÇÃO - DASH COMPARATIVO DE METAS - melhoramos o comportamento do filtro responsável por suprimir linhas com valores completamente zerados (Parâmetro 'Ignorar Ref. Sem Meta Prev./Real'), assegurando que sua aplicação na estrutura principal de filtros do dashboard refletisse de maneira consistente em todas as visualizações do dashboard. Para tal, adicionamos este filtro na última camada de filtros na estrutura do SELECT, garantindo que a aplicação desse critério não interferisse nos demais filtros nem comprometesse os valores retornados. Essa abordagem otimizada preserva a integridade dos dados filtrados e assegura que o dashboard exiba apenas as informações relevantes, sem linhas irrelevantes, mantendo a precisão e a eficiência das consultas realizadas.
```



#### 1.7. 07/06/2024 08:00 as 12:00
```markdown
SATIS - ATUALIZAÇÃO - DASH COMPARATIVO DE METAS - foi implementada uma funcionalidade adicional no dashboard, focada nos níveis de agrupamento por vendedor e por marca. Foi desenvolvido e incorporado um sistema que alterna a cor das linhas entre o período 1 e o período 2. Essa implementação foi projetada para melhorar a legibilidade e facilitar a distinção visual entre diferentes períodos de dados, contribuindo para uma análise mais intuitiva e precisa. O código foi cuidadosamente testado para assegurar a correta alternância de cores, garantindo que a interface seja clara e de fácil navegação para os usuários.
```


#### 1.8. 07/06/2024 13:00 as 19:00
```markdown
SATIS - ATUALIZAÇÃO - DASH COMPARATIVO DE METAS - foram realizadas implementações no dashboard para garantir que, para períodos fora do intervalo de datas especificadas, a coluna correspondente seja apresentada como nula. Essa alteração foi efetuada em todos os níveis do dashboard, assegurando que a visualização de dados seja coerente e evite a exibição de informações incorretas ou desatualizadas para períodos fora do escopo definido. Foram revisadas todas as camadas de dados e visualização, integrando validações que automaticamente ocultam ou destacam colunas nulas quando aplicável.
```

#### 1.9. 10/06/2024 13:00 as 18:00
```markdown
SATIS - ATUALIZAÇÃO - DASH COMPARATIVO DE METAS - Foram realizadas duas implementações importantes no dashboard. Primeiramente, foi adicionado um novo botão funcional nos níveis de agrupamento por vendedor e por marca. Este botão redireciona os usuários para um nível de tabela dinâmica, proporcionando opções avançadas de customização conforme a preferência do usuário. A implementação deste botão incluiu a configuração de parâmetros dinâmicos que permitem aos usuários personalizar a visualização dos dados de maneira flexível e interativa. Além disso, foi efetuada uma adequação no SELECT para garantir que estivesse de acordo com a tabela dinâmica. Essa adequação assegura que todas as seleções de dados realizadas pelos usuários sejam refletidas corretamente na tabela dinâmica, permitindo uma experiência de usuário integrada e eficiente. Ambas as funcionalidades foram rigorosamente testadas para garantir o pleno funcionamento e a satisfação das necessidades dos usuários finais.

```


#### 1.9. 11/06/2024 08:00 as 12:00
```markdown
SATIS - ATUALIZAÇÃO - DASH COMPARATIVO DE METAS - Foi realizada uma adequação significativa no SELECT da tabela dinâmica. Esta modificação visou reorganizar a apresentação dos cruzamentos de datas e valores/quantidades, de modo que fossem exibidos de maneira horizontal, independentemente do tipo de visualização selecionada na tabela dinâmica. A melhoria foi projetada para otimizar a legibilidade e a usabilidade dos dados, facilitando a comparação e análise horizontal de diferentes métricas ao longo do tempo. A adequação envolveu ajustes no layout da tabela e na lógica de renderização dos dados, assegurando que todas as possíveis visualizações mantenham uma apresentação consistente e intuitiva. O resultado é uma interface mais coesa, que oferece uma visualização clara e eficiente dos dados para os usuários.

```


