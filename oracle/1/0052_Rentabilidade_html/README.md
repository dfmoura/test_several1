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


efetuamos organização redefinição no filtro de intervalo de dados na questão do periodo anterior, pegar o mes anterior da data inicial e como data final utilizar a quantidade de dias oriundos da data final pela data inicial somados a data inicial do periodo anterior.
Redefinimos o select para trazer a informação de DE GASTO OPERACIONAL, INVESTIMENTOS E RESULTADO, implementamos a estrutura no html seguindo o padrão dos card's realizandos anteriormente.


Realizamos um ponto de controle para apresentar as atualizações. Além disso, readequamos algumas tarefas:
    Atualizar a apresentação da variação nos cards para percentuais (%).
    Atualizar o cálculo de resultado com base em Faturamento Bruto - Impostos - Despesas Operacionais (DO) - Investimentos.
    Incluir dois novos cards na parte superior do dashboard principal, sendo Impostos e Custo de Mercadoria Vendida (CMV).
    Adicionar uma nova linha abaixo da parte superior do dashboard, incluindo mais dois cards para Margem de Contribuição Nominal e Margem de Contribuição Percentual.
    Seguir com as atualizações conforme apresentado, referente ao nível inferior após clicar no card de faturamento, mantendo o estilo neutro do gráfico. Na tabela ao lado, incluir as colunas: Código do Produto, Produto, Preço Unitário Médio, CMV e Margem.
    Na despesa operacional colocar no where do select para nao contemplar as naturezas de adiantamento, ou seja, toda natureza que começa com 9.

retomamos o trabalho iniciando pela cofiguração do melhor layout para a readequação dos novos card's inseridos na parte superior, e na nova seção após a parte superior, testamos diversos layouts até encontrar um com um estilo mais agradavel e condizente com a formatação.

```
Curinga:

F_DESCROPC('TGFCOT','SITUACAO',COT.SITUACAO)
INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )

```