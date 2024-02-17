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

