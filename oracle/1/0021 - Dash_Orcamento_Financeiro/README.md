# Objetivos
```markdown

Dash Orçamento Financeiro


    Painel principal
        Responsável por apresentar indicadores rápidos do orçamento e possibilitar acessar as demais visões
        Gráfico de linha que demonstre a evolução com o % de realizado do orçamento no ano fiscal filtrado
        Gráfico de velocímetro que apresenta o percentual de atendimento do orçamento
        Gráfico de colunas que apresente as naturezas cujo valor realizado ultrapassou o previsto
            Agrupar as colunas de previsto e realizado por natureza
        Gráfico de colunas que apresente as naturezas cujo valor realizado esteja há pelo menos 30% de atingir o previsto e que não tenham ultrapassado o previsto
            Agrupar as colunas de previsto e realizado por natureza
    Botões de acesso aos demais níveis do dash
        Botão Análise do Orçamento
            Deve direcionar o usuário para uma tabela que apresente o orçamento por natureza, conforme a planilha de orçamento atual
                Apresentar os campos:
                    Cód. Natureza
                    Descrição Natureza
                    Agrupamento por Mês
                        Valor Previsto
                        Valor Realizado
                        % da despesa sobre o faturamento
                A planilha contém alguns registros totalizadores, que não existem na estrutura de naturezas, para tanto, podemos prever esses registros diretamente no código da consulta.
            Essa visão irá apresentar os dados consolidando o gráu 3 da hierarquia de naturezas, porém o gráu 4 poderá ser demonstrado a partir de um duplo clique
            O duplo clique, também deverá exibir os C.R e Projetos que participaram do realizado da natureza selecionada
            Botão Gráfico de Evolução por Natureza
                Apresenta um gráfico de linha de evolução da natureza selecionada para o ano fiscal filtrado
            Botão Gráfico de Evolução do Orçamento
                Apresenta um gráfico de linha de evolução do orçamento filtrado selecionada para o ano fiscal filtrado
        Botão Comparação do Orçamento
            Apresenta o orçamento em tabela, da mesma forma que foi explicado no tópico anterior, porém agora teremos duas tabelas, uma na parte superior da tela e outra na parte inferior
            A tabela superior apresenta o orçamento do período 1
            A tabela inferior apresenta o orçamento do período 2

```

### 1. Log's Execução

#### 1.1. 14/02/2024 13:00 as 18:00
```markdown

Satis - Dash Orçamento Financeiro - 1) No âmbito do aprimoramento da funcionalidade do construtor de telas, foram implementadas tabelas destinadas a proporcionar uma nova estrutura que visa otimizar a elaboração do dashboard de orçamento financeiro. A primeira tabela foi concebida para a definição de elementos essenciais, tais como grau, código e descrição. Adicionalmente, em integração com a primeira tabela, foi criada uma segunda tabela que oferece uma análise mais aprofundada, delineando as naturezas associadas a cada código específico. Esse refinamento proporciona uma abordagem mais robusta e detalhada no processo de construção e interpretação do orçamento financeiro.


```
#### 1.2. 15/02/2024 08:00 as 11:30
```markdown

Satis - Dash Orçamento Financeiro - 2) Implementou-se a entrada de dados dentro da nova estrutura de tabelas criadas, destinadas a servir como um ponto de referência crucial durante o processo de crição do select que consolidar de maneira eficaz as informações pertinentes ao orçamento financeiro. 3) Desenvolveu-se no select uma estrutra que possibilita uma visualização de informações similar à de uma planilha adjacente ao orçamento financeiro (planilha da consultoria).

```

#### 1.3. 15/02/2024 13:00 as 18:00
```markdown

Satis - Dash Orçamento Financeiro - 4) Em continuidade no desenvolvimento do mecanismo de select, foram implementados recursos adicionais para aprimorar a análise dos dados. Acrescentaram-se funcionalidades de agrupamento e totalização, proporcionando uma visão mais abrangente e detalhada para cada grau dentro da estrutura pré-estabelecida. Essas melhorias permitem uma análise mais refinada dos dados do orçamento financeiro.

```

#### 1.4. 16/02/2024 08:00 as 11:30
```markdown

Satis - Dash Orçamento Financeiro - 5) No prosseguimento do aprimoramento do mecanismo de seleção, foi implementado um recurso adicional para a categorização dos resultados com base nos códigos das contas do orçamento financeiro. Essa inovação permite a agregação e totalização dos valores correspondentes a cada nível ou grau, alinhando-se integralmente com a estrutura da planilha de orçamento modelo. Essa funcionalidade não apenas intensifica a capacidade de análise e relatório, mas também promove uma maior fidedignidade na representação dos dados orçamentários, otimizando assim o processo de gestão financeira.

```


#### 1.5. 16/02/2024 13:00 as 18:30
```markdown

Satis - Dash Orçamento Financeiro - 6) Prosseguindo com o aprimoramento, foi desenvolvido um dashboard. 7) No nível principal desse dashboard, incorporou-se um gráfico que ilustra a evolução da posição real em comparação com o previsto. 8) Introduziu-se um velocímetro que exibe o percentual de cumprimento do orçamento. 9) Acrescentou-se um gráfico de colunas que destaca as naturezas cujo valor realizado ultrapassou as projeções previstas. 10) Implementou-se um botão de "Análise do Orçamento". 11) Para proporcionar uma análise mais aprofundada, criou-se um nível inferior acessado pelo botão "Análise de Orçamento", o qual apresenta, por meio de um componente de tabela, o detalhamento do "Orçamento Financeiro". Essa abordagem visa fornecer uma visão mais granular e elucidativa do desempenho orçamentário, contribuindo para uma tomada de decisão mais informada.
```



#### 1.6. 19/02/2024 08:30 as 11:30
```markdown

Satis - Dash Orçamento Financeiro - 12) Implementou-se uma correção no comando SELECT para evitar a recuperação inadvertida de chaves inválidas (VALORES COM '00'). 13) Foi adicionado um filtro ao comando SELECT, permitindo a exclusão do "Grupo de Produtos Bio" das operações de faturamento, quando apropriado. Este filtro oferece a flexibilidade de incluir ou excluir o referido grupo conforme necessário para análise. Caso não seja especificado, o sistema considerará todos os grupos de produtos no processo de faturamento.14) Introduziu-se uma nova coluna no comando SELECT para calcular o percentual do valor real em relação ao Faturamento Bruto. Essa adição proporciona uma análise mais abrangente dos dados, permitindo uma compreensão mais profunda da distribuição dos valores no contexto do faturamento geral.

```


#### 1.7. 19/02/2024 14:00 as 18:30
```markdown

Satis - Dash Orçamento Financeiro - 15) Desenvolveu-se uma adaptação no comando SELECT para apresentar, de forma consolidada, os dados referentes aos meses de janeiro a dezembro, exibindo as colunas correspondentes aos valores previstos, reais e a porcentagem de ICM (%). Essa implementação envolveu a aplicação de uma estrutura condicional "CASE WHEN", na qual, ao identificar o mês correspondente, é realizada uma quebra lógica para transição para o próximo mês. Essa abordagem proporciona uma visualização clara e organizada dos dados ao longo do ano, facilitando a análise comparativa entre as previsões, resultados reais e a contribuição percentual do ICM para cada mês.

```

#### 1.8. 20/02/2024 08:00 as 11:30
```markdown

Satis - Dash Orçamento Financeiro - 16) Foi realizada uma atualização na configuração de ordenação para o gráfico de velocímetro, invertendo a sequência de apresentação. 17) Foi implementada uma estrutura para filtrar por ano em todos os componentes, conforme o parâmetro Periodo.18) Realizou-se ajustes no gráfico de evolução previsto versus realizado para demonstrar o consolidado sintético.
```

#### 1.9. 20/02/2024 13:00 as 18:30
```markdown

Satis - Dash Orçamento Financeiro - 19) Foi estabelecido um nível para fornecer detalhes por natureza/cr/projeto conta na apresentação do planejamento financeiro. 20) Adicionalmente, foi implementada a criação de outro nível, acessível por meio de um duplo clique no nível anterior, apresentando informações detalhadas na visualização financeira correspondente à linha selecionada.
```

#### 1.10. 21/02/2024 08:00 as 11:30
```markdown

Satis - Dash Orçamento Financeiro - 21) Foi desenvolvido um botão para acessar o Gráfico de Evolução por Natureza a partir do nível que oferece detalhamento específico sobre a natureza em questão. 22) Em seguida, foi implementado um gráfico de linha de evolução da natureza selecionada em um nível hierárquico inferior, permitindo uma análise mais detalhada para o ano fiscal filtrado. 23) Adicionalmente, foi integrado ao painel principal um botão para visualização do Gráfico de Evolução geral do Orçamento. 24) Prosseguindo, foi criado um gráfico de linha de evolução geral do orçamento, também em um nível inferior, possibilitando uma análise detalhada para o ano fiscal filtrado.

```

#### 1.11. 21/02/2024 13:00 as 18:30
```markdown
Satis - Dash Orçamento Financeiro - 25) Foi implementado um botão para a Comparação do Orçamento no painel principal do sistema, oferecendo uma funcionalidade adicional de análise financeira. 26) Ao acessar o nível inferior através do botão de Comparação do Orçamento no painel principal, uma nova tela é apresentada, composta por dois componentes de tabela. Estes componentes foram projetados para exibir a demonstração do orçamento financeiro, adaptando-se dinamicamente às seleções de período realizadas no painel. O primeiro componente de tabela é atualizado de acordo com o primeiro período selecionado, enquanto o segundo componente reflete as informações do segundo período escolhido. Dessa forma, são apresentadas duas tabelas lado a lado: uma na parte superior da tela, exibindo o orçamento do primeiro período, e outra na parte inferior, mostrando o orçamento do segundo período. 27) No âmbito da estrutura do orçamento financeiro, foi introduzida uma atualização que adiciona a opção de aplicação ao faturamento para a quebra por grupo de produto. Essa modificação permitiu uma visualização diferenciada dos produtos da linha bio em comparação com os produtos de fabricação própria. Essa distinção é configurada por meio da seguinte condição: 'AND (ORC.GRUPOPROD = PRO.CODGRUPOPROD OR ORC.GRUPOPROD IS NULL) AND (ORC.GRUPOPRODDIF = PRO.CODGRUPOPROD OR ORC.GRUPOPRODDIF IS NULL)', onde a igualdade ou diferença do código da estrutura determina a apresentação ou não dos dados.


```


#### 1.12. 22/02/2024 15:00 as 16:00
```markdown
Satis - Dash Orçamento Financeiro - Reunião de apresentação de estrutura de orçamento financeiro e dash de orçamento financeiro.

```


#### 1.12. 22/02/2024 16:30 as 18:40
```markdown
Satis - Dash Orçamento Financeiro - 1) Foram realizados ajustes nos títulos dos componentes das tabelas comparativas de orçamento, no título do gráfico de natureza no painel principal e no título do gráfico de evolução geral do orçamento. Além disso, foi feito um ajuste no select do valor previsto e real para o gráfico no painel principal "Naturezas cujo valor real ultrapassou o valor previsto" e as barras do gráfico foram ordenadas em ordem decrescente de acordo com o valor real.

```

#### 1.12. 23/02/2024 08:00 as 11:30
```markdown
Satis - Dash Orçamento Financeiro - 2) Realizou-se uma otimização no comando SELECT do componente de tabela do módulo de orçamento financeiro, acessado por meio do botão "Análise do Orçamento" na interface principal do Dash. Identificou-se que determinados campos de valores previstos estavam retornando valores nulos, apesar de haver informações disponíveis, enquanto alguns valores reais não estavam refletindo com precisão os dados originais. Após efetuar as devidas correções, procedeu-se com a replicação do comando SELECT para o nível de comparação em ambos os componentes de tabela, assegurando consistência e integridade nos resultados apresentados.

```

#### 1.12. 23/02/2024 14:00 as 18:30
```markdown
Satis - Dash Orçamento Financeiro - 3)Realizou-se um ajuste no comando SELECT do componente de acompanhamento do atingimento da meta no painel principal do Dash. Este componente reflete a consolidação do gráfico que compara os valores previstos versus realizados. Durante a análise, foram identificados alguns valores incorretos que estavam sendo retornados pelo comando SELECT. Além disso, foi padronizado o formato do comando SELECT deste componente, alinhando-o aos demais componentes presentes no painel. Essas melhorias visam garantir a consistência e a precisão dos dados apresentados, proporcionando uma experiência mais confiável aos usuários do sistema.

```


#### 1.12. 13/02/2024 13:00 as 18:30
```markdown
Satis - Dash Orçamento Financeiro -6) Implementou-se uma otimização no comando SELECT para permitir a especificação de parâmetros de data por intervalo. Isso proporciona uma flexibilidade maior na consulta de dados temporais. 7) Resolvido um problema de divisão por zero que ocorria nos níveis do demonstrativo, assegurando a integridade dos cálculos e a precisão dos resultados.8) Corrigiu-se o filtro de período para o nível comparativo, garantindo que os dados correspondam corretamente ao Período 2. Isso elimina discrepâncias e garante a consistência dos dados em todas as análises comparativas. 9) Realizou-se uma refatoração do SELECT para otimizar o código e aprimorar o desempenho das consultas. Essa medida visa a eficiência operacional, reduzindo o tempo de resposta e melhorando a experiência do usuário durante a pesquisa de dados.

```