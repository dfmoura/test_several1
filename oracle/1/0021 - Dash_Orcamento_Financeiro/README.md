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

#### 1.1. 12/02/2024 08:00 as 10:30
```markdown

Satis - Controle de Acesso - Foram implantadas medidas de controle de acesso para as seguintes ferramentas comerciais: - Dash Comparativo Metas Comerciais - Relatório Orçado x Realizado (Metas) - Dash Análise de Metas Comerciais O mecanismo de controle de acesso segue uma hierarquia definida da seguinte forma: 1) Acesso Completo: Os usuários marcados como 'Gestor de Meta' = 'S' (ativado) na guia geral do cadastro de usuários possuem acesso completo às funcionalidades das ferramentas.   
2) Acesso de Gerente: Os usuários gerentes têm permissão para visualizar a movimentação com base nos vendedores que estão sob sua gestão. 3) Acesso de Vendedor: Os usuários vendedores têm acesso restrito e podem visualizar apenas sua própria movimentação. É importante ressaltar que é necessário que tanto os vendedores quanto os gerentes estejam devidamente vinculados ao cadastro de usuários para garantir o correto funcionamento dessas medidas de controle de acesso.

```
