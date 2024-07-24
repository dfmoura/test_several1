# Objetivos
```markdown


```


### 1. Log's Execução


#### 1.1. 25/06/2024 8:00 as 12:00
```markdown

GM - DASH RENTABILIDADE HTML5 - iniciamos a elaboração do formato inicial do dashboard a partir do dash principal, estruturando-o em 4 cards principais divididos em faturamento, despesas operacionais, investimento e resultado. Cada card foi configurado com informações consolidadas, acompanhadas de um detalhamento no rodapé que exibe valores do período anterior. Introduzimos ícones representativos para cada card e implementamos efeitos visuais ao passar o mouse sobre eles. Além disso, configuramos um select de intervalo de datas no dashboard para filtrar todos os componentes responsivamente, resultando em uma versão inicial do painel principal.

```


#### 1.1. 25/06/2024 13:00 as 19:00
```markdown

GM - DASH RENTABILIDADE HTML5 - realizamos um ponto de controle com o cliente, que destacou pontos essenciais para o projeto e esta primeira etapa do dash principal. Posteriormente, atualizamos o dashboard para incluir um total de 8 cards: 4 na parte superior, 2 na parte intermediária e 2 na parte inferior. Refinamos os efeitos visuais ao passar o mouse sobre os cards, ajustando transições de cores, e atualizamos os ícones para o formato SVG, melhorando significativamente sua aparência. Além disso, desenvolvemos um select de data para iniciar a integração de dados reais no primeiro card, avançando assim na implementação e funcionalidade do dashboard.

```


#### 1.1. 26/06/2024 8:00 as 12:00
```markdown

GM - DASH RENTABILIDADE HTML5 - concluímos a primeira versão do layout dos cards e dedicamos esforços à estruturação do select principal para o dashboard na seção principal. Identificamos e definimos os valores essenciais para faturamento, devolução, hectolitro e descontos, agrupando-os no select para totalização dos respectivos dados. Iniciamos a integração de dados nos cards correspondentes e produzimos um vídeo para o ponto de controle com o cliente, onde discutimos ajustes solicitados e outras definições de escopo necessárias. 

```


#### 1.1. 26/06/2024 13:00 as 19:00
```markdown

GM - DASH RENTABILIDADE HTML5 - Procedemos com a redefinição da parte inferior do dashboard, reduzindo de 2 cards para 1, o que nos permitiu integrar a logo da empresa na parte inferior esquerda, ajustando seu tamanho para melhor se adequar ao espaço disponível. Reorganizamos os ícones que representam os valores consolidados e refinamos o select principal ao adicionar informações do período anterior e a variação percentual em relação ao período atual. Adicionalmente, implementamos uma seta indicativa ao lado do valor consolidado que altera sua cor para verde ou vermelho, representando variações positivas ou negativas, respectivamente, quando a variação é maior ou menor que 1, em uma função dinamica em java script. Essas adaptações contribuíram para melhorar a estrutura e a usabilidade do dashboard, enriquecendo a experiência de visualização e interpretação dos dados financeiros apresentados.

```
#### 1.1. 26/06/2024 8:00 as 12:00
```markdown
GM - DASH RENTABILIDADE HTML5 - Realizamos uma organização detalhada e redefinimos o filtro de intervalo de dados, ajustando-o para incluir o período anterior. Especificamente, implementamos um método para calcular o mês anterior à data inicial e determinar a data final com base na diferença de dias entre a data final e inicial, adicionando isso à data inicial do período anterior. Também reestruturamos o seletor para exibir informações de despesas operacionais, investimentos e resultado, integrando essa estrutura ao HTML conforme o padrão dos cards já desenvolvidos.

```
#### 1.1. 26/06/2024 13:00 as 19:00
```markdown
GM - DASH RENTABILIDADE HTML5 - Conduzimos um ponto de controle para apresentar as atualizações realizadas. Definimos uma série de tarefas que incluíam a atualização da apresentação das variações nos cards para percentuais (%), o refinamento do cálculo do resultado considerando Faturamento Bruto, Impostos, Despesas Operacionais e Investimentos. Introduzimos dois novos cards na parte superior do dashboard para Impostos e Custo de Mercadoria Vendida (CMV), além de uma nova linha abaixo, com os cards para Margem de Contribuição Nominal e Margem de Contribuição Percentual. Continuamos com as melhorias na seção inferior do dashboard, especialmente após clicar no card de faturamento, mantendo o estilo visual neutro do gráfico e adicionando colunas específicas na tabela ao lado para código do produto, produto, preço unitário médio, CMV e margem. Ajustamos também o filtro de despesas operacionais para excluir naturezas que começam com 9, representando adiantamentos. Retomamos o trabalho iniciando pela configuração do layout mais adequado para os novos cards inseridos na parte superior e na nova seção subsequente, testando várias opções até encontrar um estilo visual mais agradável e alinhado com a formatação geral do dashboard. Além disso, redefinimos o posicionamento da logo no dashboard para melhorar a estética e a organização visual do painel.

```

#### 1.1. 28/06/2024 8:00 as 12:00
```markdown
GM - DASH RENTABILIDADE HTML5 - Implementamos diversas melhorias visuais e funcionais no dashboard. Iniciamos alterando a cor da fonte do título para branco e aplicando bordas arredondadas ao cabeçalho dos cards, o que contribuiu para uma estética mais moderna e coesa. Atualizamos a apresentação das variações nos cards para exibir percentuais (%) de maneira clara e informativa, proporcionando uma análise mais precisa das mudanças nos dados. Refinamos também o cálculo do resultado, agora baseado em Faturamento Bruto menos Impostos, Despesas Operacionais e Investimentos, garantindo maior precisão nos indicadores financeiros.
```


#### 1.1. 28/06/2024 13:00 as 19:30
```markdown
GM - DASH RENTABILIDADE HTML5 - Procedemos com a adição de dois novos cards na parte superior do dashboard principal, dedicados a Impostos e Custo de Mercadoria Vendida (CMV), ampliando assim a visão detalhada sobre os custos e impostos associados às operações. Introduzimos uma nova linha abaixo da seção superior do dashboard, incluindo cards para Margem de Contribuição Nominal e Margem de Contribuição Percentual, que são indicadores cruciais para a análise de rentabilidade. Aumentamos o tamanho das setas indicativas para melhorar a visibilidade das variações positivas e negativas nos dados. No filtro de despesas operacionais, refinamos a query para excluir naturezas que começam com 9, representando adiantamentos e simplificando a análise dos gastos efetivos. Continuamos aprimorando a seção inferior do dashboard, mantendo o estilo neutro do gráfico após clicar no card de faturamento e adicionando colunas essenciais na tabela ao lado, como Código do Produto, Produto, Preço Unitário Médio, CMV e Margem, para uma análise detalhada e precisa dos produtos comercializados. Essas atualizações refletem nosso compromisso contínuo com a melhoria da usabilidade e da apresentação dos dados no dashboard.

```

#### 1.1. 30/06/2024 20:00 as 23:00
```markdown
GM - DASH RENTABILIDADE HTML5 - Prosseguimos com a atualização detalhada dos cards do dashboard, focando na análise e ajuste das margens de contribuição, investimentos e resultado. Implementamos refinamentos específicos para garantir que os indicadores financeiros estejam precisos e alinhados com as últimas atualizações de dados, assegurando assim que o dashboard continue a fornecer informações relevantes e atualizadas para a tomada de decisões estratégicas.
```


#### 1.1. 01/07/2024 8:00 as 12:00
```markdown
GM - DASH RENTABILIDADE HTML5 - iniciamos o desenvolvimento do esboço inicial do primeiro nível inferior ao card de faturamento, optando por substituir o gráfico de pizza pelo gráfico de donut. Configuramos o donut com cores suaves e aplicamos uma transparência de rgba 0.2, proporcionando uma estética agradável e clara. Integramos um conteúdo informativo dentro do donut para apresentar uma visão consolidada dos dados. Neste esboço inicial, planejamos inicialmente incluir um segundo gráfico abaixo e uma tabela ao lado; entretanto, decidimos simplificar este nível para conter apenas dois componentes gráficos: o donut à esquerda e o maptree à direita. Implementamos a interatividade necessária para que ao clicar em uma fatia do donut, as informações correspondentes fossem filtradas e exibidas no maptree.
```

#### 1.1. 01/07/2024 13:00 as 18:00
```markdown
GM - DASH RENTABILIDADE HTML5 - Continuamos com a implementação e configuração do maptree, garantindo que estivesse configurado corretamente para exibição e interação. Ajustamos os detalhes visuais e funcionais para assegurar que o maptree respondesse adequadamente aos filtros aplicados pelo donut, proporcionando uma experiência de usuário fluida e informativa. Essas atualizações foram essenciais para enriquecer a análise de dados no dashboard, permitindo uma visualização detalhada e interativa das informações relacionadas ao desempenho de vendas e distribuição da empresa.
```

#### 1.1. 17/07/2024 08:00 as 12:00
```markdown
GM - DASH RENTABILIDADE HTML5 - Concentramos nossos esforços na geração de uma tabela detalhada, congelando seu cabeçalho para facilitar a visualização dos dados ao rolar a página. Implementamos um efeito visual ao passar o mouse sobre as linhas da tabela, proporcionando uma experiência de usuário mais interativa e intuitiva. Adicionamos uma linha de soma ao final da tabela, calculando os totais das colunas numéricas, e formatamos os valores numéricos para exibir milhares com duas casas decimais após a vírgula. Além disso, ajustamos a dimensão da tabela para ocupar todo o espaço disponível na seção da direita, garantindo uma visualização completa e otimizada dos dados.
```

#### 1.1. 17/07/2024 13:00 as 18:00
```markdown
GM - DASH RENTABILIDADE HTML5 - Integramos o total do faturamento no centro do gráfico de donut, melhorando a clareza das informações apresentadas. No dashboard de faturamento analítico, ajustamos a query SQL incluindo o relacionamento 'SEQUENCIA = ITE.SEQUENCIA' para o valor do Cofins, corrigindo a exibição dos valores por produto no nível analítico. Adicionamos novas colunas na tabela de faturamento, incluindo Margem Nominal, Margem Percentual, Média de Impostos e Média de Custo de Mercadoria Vendida (CMV). Essas inclusões proporcionaram uma visão mais detalhada e completa dos dados financeiros, permitindo uma análise mais precisa e abrangente do desempenho dos produtos e suas margens.
```


#### 1.1. 18/07/2024 8:00 as 12:00
```markdown
GM - DASH RENTABILIDADE HTML5 - Realizamos atualizações na formatação do HTML e CSS para dividir a tela em quatro partes distintas, otimizando a disposição dos componentes na tela do nível de faturamento. A parte superior esquerda foi destinada ao gráfico de donut, enquanto a parte inferior esquerda recebeu outro gráfico de donut. Na parte superior direita, posicionamos a tabela detalhada, e na parte inferior direita, incluímos um gráfico de colunas. Esta organização permite uma visualização clara e estruturada dos diferentes componentes analíticos, facilitando a análise integrada de dados.
```

#### 1.1. 18/07/2024 13:00 as 18:00
```markdown
GM - DASH RENTABILIDADE HTML5 - Configuramos os filtros de maneira que todos os selects já contemplassem os filtros padrão: Período, Empresa, Natureza e Centro de Resultado, assegurando que as consultas fossem consistentes e abrangentes. Além disso, adicionamos a logo da empresa na interface, melhorando a identidade visual e profissionalismo da aplicação. Estas melhorias contribuíram significativamente para a usabilidade e funcionalidade do dashboard, proporcionando uma ferramenta mais eficiente e intuitiva para análise de faturamento.
```




```
Curinga:
F_DESCROPC('TGFCOT','SITUACAO',COT.SITUACAO)
INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )

```




Andamento:
Cofigurado os filtros para que todo select ja contemple os filtros padrões/ Gerente / Vendedor / Rota
Atualizar o select e script js dos quatro componentes no nivel de faturamento.
AO CLICAR NA COLUNA DA TABELA IR PARA UM PROXIMO NIVEL COM UM GRAFICO DE SUPERVISOR DE UM LADO E O DETALHAMENTO EM TABELA DO LADO.



Backlog:
7) Substituir no select da despesa operacional e investimento de vlrbaixa para vlrliq
11) Adicionar o FEM no calculo dos impostos (antigo gasto variavel cinza)
12) Colocar o periodo anterior de analise dinamico, hoje esta somente com 1.




Realizados:

9) Alterar fonte do titulo para branco e cabaçalho com borda arredondada.
1) Atualizar a apresentação da variação nos cards para percentuais (%).
2) Atualizar o cálculo de resultado com base em Faturamento Bruto - Impostos - Despesas Operacionais (DO) - Investimentos.
3) Incluir dois novos cards na parte superior do dashboard principal, sendo Impostos e Custo de Mercadoria Vendida (CMV).
4) Adicionar uma nova linha abaixo da parte superior do dashboard, incluindo mais dois cards para Margem de Contribuição Nominal e Margem de Contribuição Percentual.
8) Aumentar o tamanho da seta
6) Na despesa operacional colocar no where do select para nao contemplar as naturezas de adiantamento, ou seja, toda natureza que começa com 9.
5) Seguir com as atualizações conforme apresentado, referente ao nível inferior após clicar no card de faturamento, mantendo o estilo neutro do gráfico. Na tabela ao lado, incluir as colunas: Código do Produto, Produto, Preço Unitário Médio, CMV e Margem.
10) Seguir com atualização de card, margens, inv e resultado.
1) gerar tabela.
2) congelar cabeçalho.
3) colocar efeito ao passar o mouse.
4) colocar uma soma ao final da tabela.
5) formatar o valor numerico em milhar e 2 casas depois da virgula.
6) dimensionar a tabela para ocupar todo espaço da seção da direita.
7) colocar o total do faturamento no centro do donut.
8) no dash de faturamento analitico incluimos um relacionamento no select 'SEQUENCIA = ITE.SEQUENCIA' para o valor do cofins, assim corrigimos a apresentação do valor por produto no nivel analistico.
10) incluimos a coluna de margem nominal na tabela do nivel de faturamento.
11) incluimos a coluna de margem % na tabela do nivel de faturamento.
12) incluimos a coluna de media impostos na tabela do nivel de faturamento.
13) incluimos a coluna de media cmv na tabela do nivel de faturamento.
1) Atualizamos a formatação do html e css para dividir a tela em quatro partes para receber os componentes no lado esquerdo parte superior grafico donut e parte inferior dunot, lado direito parte superior tabela e parte inferior grafico de colunas na tela do nivel de faturamento.
2) Cofigurado os filtros para que todo select ja contemple os filtros padrões (Período / Empresa  / Natureza / Centro de Resultado)
3) Adicionado logo.
