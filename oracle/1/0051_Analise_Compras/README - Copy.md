# Objetivos
```markdown
Analise de Compras


* — Análise de quantidade de pedidos |
o Gráfico de pizza por comprador, com a quantidade de pedidos de compras negociados no período
Qual o total de pedidos;



* — Análise de quantidade de notas |
o Gráfico de pizza por comprador, com a quantidade de notas de compras negociados no período
o Considerar apenas as notas lançadas pelos usuários compradores


* — Análise de origem das compras |
o Gráfico de qtd. de pedidos por setor de origem |
o O setor de origem está associado ao cadastro do usuário que incluiu a requisição de compra
. Ao clicar sobre o setor, deve abrir um nível inferior que desmembre a quantidade de pedidos
por operação (requisição normal ou requisição de compra direta)


* — Análise por operação de compras
o Gráfico que apresente a qtd. de pedidos e percentual por operação
. As operações correspondem as TOPs de requisição, sendo requisição normal ou requisição de — || compra direta
o Ao clicar sobre a operação de requisição, deve apresentar a qtd. de requisição por setor.
. O setor de origem está associado ao cadastro do usuário que incluiu a requisição de compra.



* _ Análise de frete |
• Gráfico de evolução mensal com gastos de frete na compra
    o   Apresentar o % gasto com frete por MP e EMBALAGENS (emb. Indústria + emb. Despesa) dos C.R indústria 
    o   Ao clicar sobre o mês, deve abrir um nível inferior com os produtos dos pedidos que tinham frete e o custo do frete rateado por esses produtos

	Para esclarecer o tratamento do frete nas notas fiscais de compra:
	FOB (Free On Board): O valor da nota e seus respectivos produtos já incluem o custo do frete. O destaque do frete é meramente informativo, uma vez que a empresa já o incorporou ao custo do produto.
	CIF (Cost, Insurance and Freight): Além do valor dos produtos, o valor destacado do frete na nota também é somado para compor o total da nota. Esse valor não é incorporado ao custo do produto.

```

### 1. Log's Execução


#### 1.1. 13/06/2024 13:00 as 18:00
```markdown
SATIS - ANALISE DE COMPRAS - Inicialmente, estruturamos o fluxo de dados referente ao processo de análise de compras. A organização dos dados foi fundamental para assegurar a precisão e a integridade das informações coletadas. Esse processo incluiu a definição de parâmetros e métricas para avaliar cada etapa do fluxo, desde as requisições iniciais até a emissão das notas de compra. Foi crucial garantir que cada transação e operação dentro do sistema estivesse adequadamente registrada, facilitando assim uma análise coerente e detalhada.
```

#### 1.2. 14/06/2024 8:00 as 12:00
```markdown
SATIS - ANALISE DE COMPRAS - Na primeira consulta realizada, focamos especificamente nas requisições de compras feitas durante o período analisado. Identificamos o total de requisições e as categorizamos em duas principais: aquelas que não avançaram para cotação e as que foram encaminhadas para cotação. Em seguida, essas cotações foram subdivididas em cotações em aberto e cotações fechadas. Essa segmentação permitiu um entendimento mais claro do fluxo e do status de cada requisição, bem como a identificação de possíveis gargalos ou atrasos no processo de cotação.
```

#### 1.3. 14/06/2024 13:00 as 18:00
```markdown
SATIS - ANALISE DE COMPRAS - A partir das cotações fechadas, extraímos os dados dos pedidos de compra resultantes. Identificamos também uma segunda categoria de pedidos de compra que foram gerados sem passar pelo processo de cotação. A união desses dois grupos de dados nos proporcionou o total geral de pedidos de compra. Este total foi então correlacionado com as notas de compra emitidas, permitindo uma análise abrangente e detalhada de todo o ciclo de compras. Este processo assegurou que cada nota de compra estivesse corretamente vinculada ao respectivo pedido, garantindo a rastreabilidade e a transparência das operações de compra.
```


#### 1.4. 17/06/2024 8:00 as 12:00
```markdown
SATIS - ANALISE DE COMPRAS - Após a estruturação dos dados do grupo de notas, focamos em garantir a visibilidade tanto das notas que entraram diretamente no sistema quanto daquelas processadas via fluxo de pedidos. Essa organização foi essencial para o desenvolvimento subsequente do dashboard, permitindo uma visão clara e consolidada das operações. No nível principal do dashboard, mantivemos os quatro cards principais que apresentam os totais de requisições, cotações, pedidos e notas, facilitando o acesso rápido às informações chave.
```

#### 1.4. 17/06/2024 13:00 as 19:00
```markdown
SATIS - ANALISE DE COMPRAS -Para cada card, desenvolvemos um nível de detalhamento que proporciona insights mais profundos sobre os dados apresentados. No caso das requisições, destacamos a comparação entre as requisições processadas e não processadas. Nas cotações, detalhamos as cotações finalizadas, em aberto e canceladas. Para os pedidos, mostramos a origem de cada pedido, diferenciando aqueles oriundos de cotações e os gerados sem cotação. No card de notas, apresentamos o total de notas, diferenciando entre notas com e sem pedido. Além disso, para aprimorar a visualização dos dados, utilizamos gráficos de pizza acompanhados de tabelas detalhadas. Nos gráficos de cotações, pedidos e notas, agrupamos as fatias menos representativas em uma categoria "OUTROS", detalhando-as na tabela adjacente para garantir que todas as informações fossem apresentadas de forma clara e acessível.
```

#### 1.4. 18/06/2024 9:00 as 10:00
```markdown
SATIS - ANALISE DE COMPRAS - Apresentação Dash com Silvio - Nível de Requisições: Alterar a segmentação do gráfico de requisições para que a quebra seja feita por CR, ao invés de por Setor, como atualmente. Criar um gráfico ou tabela que demonstre a participação de cada tipo de requisição com base nas informações da tabela. Adicionar um campo que sinalize a data de entrada da requisição. Se a requisição tiver mais de 5 dias, destacar este campo. A tabela deve ser ordenada por este campo. | Nível de Cotações:  Verificar por que as cotações com situação finalizada ainda apresentam status de requisição não atendida. Por exemplo, quando o time do TH gera uma requisição, mesmo finalizada, ela continua aberta. | Nível de Pedidos: Priorizar os compradores no gráfico, categorizando os demais como "outros". | Nível de Notas: Priorizar os compradores no gráfico, categorizando os demais como "outros". Criar um nivel de Lead Time exibindo os dias médios para a conclusão das etapas de Requisições, Cotações, Pedidos e Notas Fiscais, com uma tela de detalhamento em nível inferior que fornece informações detalhadas.

```


#### 1.4. 18/06/2024 8:00 as 09:00
```markdown
SATIS - ANALISE DE COMPRAS - Realizamos uma revisão abrangente nos cards de dados, desenvolvendo níveis de detalhamento que fornecem insights aprofundados sobre as informações apresentadas. Para o card de requisições, enfatizamos a comparação entre requisições processadas e não processadas. No card de cotações, detalhamos as cotações finalizadas, em aberto e canceladas, oferecendo uma visão clara do estado de cada cotação. Para os pedidos, destacamos a origem de cada um, diferenciando entre aqueles gerados a partir de cotações e os gerados sem cotação. No card de notas, apresentamos o total de notas emitidas, distinguindo entre notas com e sem pedido.
```

#### 1.4. 18/06/2024 10:00 as 12:00
```markdown
SATIS - ANALISE DE COMPRAS - aprimoramos a visualização dos dados utilizando gráficos de pizza combinados com tabelas detalhadas. Nos gráficos de cotações, pedidos e notas, as fatias menos representativas foram agrupadas sob a categoria "OUTROS", garantindo que as informações principais fossem destacadas sem perder a clareza e acessibilidade dos detalhes. A tabela adjacente a cada gráfico fornece um detalhamento preciso dessas categorias menores, assegurando que todos os dados relevantes estejam disponíveis para análise. Essas melhorias visam facilitar a compreensão dos dados e suportar a tomada de decisões baseadas em uma visualização eficiente e completa das informações.```


#### 1.4. 18/06/2024 13:00 as 18:00
```markdown
SATIS - ANALISE DE COMPRAS - Inicialmente, modificamos o critério de segmentação do gráfico, passando a utilizar o código CR (Centro de Responsabilidade) em vez do setor, conforme praticado anteriormente. Com esta mudança, conseguimos um maior detalhamento e precisão na visualização dos dados. Além disso, criamos um novo gráfico ou tabela que demonstra a participação de cada tipo de requisição, baseando-se nas informações fornecidas pela tabela de requisições. Para aumentar a clareza e a usabilidade, adicionamos um campo específico que indica a data de entrada de cada requisição. Implementamos uma funcionalidade onde as requisições com mais de cinco dias são destacadas em vermelho, facilitando a identificação de pendências e a priorização das ações. A tabela foi ajustada para ser ordenada por este novo campo, garantindo que as requisições mais antigas sejam visualizadas primeiro, promovendo uma gestão mais eficiente dos pedidos.```





#### 1.4. 19/06/2024 8:00 as 12:00
```markdown
SATIS - ANALISE DE COMPRAS - continuamos as melhorias nos gráficos de pedidos e de notas. No gráfico de pedidos, atualizamos o seletor para priorizar a visualização dos dados referentes aos compradores. Esta mudança assegura que os compradores tenham maior visibilidade, enquanto as outras categorias são agrupadas sob a etiqueta "outros". Similarmente, realizamos ajustes no gráfico de notas, onde o seletor também foi modificado para dar prioridade aos dados dos compradores, categorizando os demais como "outros". Essas atualizações não apenas melhoram a organização e a clareza das informações, mas também permitem uma análise mais focada e detalhada do desempenho dos compradores, auxiliando na tomada de decisões estratégicas e no acompanhamento mais eficiente das atividades relacionadas às requisições e notas.
```

#### 1.4. 19/06/2024 13:00 as 19:00
```markdown
SATIS - ANALISE DE COMPRAS - iniciamos a organização dos dados com o objetivo de apresentar o lead time de compras, permitindo uma análise detalhada do tempo gasto em cada etapa do processo: requisitar, cotar, pedir e receber a nota. Para priorizar um cenário específico de pedidos com requisição, realizamos uma série de seleções de dados. Primeiramente, na etapa de requisição, utilizamos a diferença entre a data de início da cotação e a data de negociação da requisição. Em seguida, na etapa de cotação, calculamos a diferença entre a data de negociação do pedido e a data de início da cotação. Finalmente, na etapa de pedido, consideramos a diferença entre a data de entrada da nota e a data de negociação do pedido. Ao agrupar esses seleções, conseguimos determinar o tempo total gasto em cada etapa para o cenário analisado.

```


#### 1.4. 20/06/2024 8:00 as 12:00
```markdown
SATIS - ANALISE DE COMPRAS - avançamos na implementação de um visual sintético no nível principal, que demonstra de forma clara e resumida o fluxo do lead time de compras. Este visual foi projetado para oferecer uma visão geral eficiente e imediata do processo, facilitando a identificação de possíveis gargalos ou atrasos. Além disso, desenvolvemos um nível inferior de detalhamento, acessível através de um clique, que permite aos usuários explorar cada etapa do fluxo com mais profundidade. Este nível de detalhamento fornece informações granulares sobre o lead time, possibilitando uma análise mais precisa e a identificação de pontos específicos de melhoria no processo de compras. Com essas melhorias, proporcionamos uma ferramenta robusta para a gestão e otimização do tempo de aquisição, aumentando a eficiência operacional e apoiando decisões estratégicas baseadas em dados precisos.
```

#### 1.4. 20/06/2024 13:00 as 18:00
```markdown
SATIS - ANALISE DE COMPRAS - Desenvolvemos a estrutura principal da base de dados destinada à análise do frete. Utilizando a tabela TGFCAB, identificamos as compras que incluem frete e extraímos a participação do frete em cada compra. Relacionamos esta tabela com a tabela de movimentação de itens, assegurando que os valores totais das compras correspondessem exatamente. Em seguida, distribuímos o valor total do frete para cada item, determinando assim a contribuição de cada item no custo total do frete. Este processo permitiu uma análise detalhada e precisa do impacto do frete nos custos dos itens, fornecendo dados essenciais para uma gestão financeira mais eficiente e uma melhor compreensão da estrutura de custos envolvidos nas compras.```

#### 1.4. 21/06/2024 8:00 as 12:00
```markdown

SATIS - ANALISE DE COMPRAS - Foi realizada a criação de um card no nível principal para demonstrar o valor consolidado gasto com frete de acordo com o período selecionado e o valor percentual médio do frete sobre o valor da nota. Para otimizar a visualização, o card de frete foi adaptado para ficar ao lado do card do lead time. Além disso, foi ativada uma função que direciona o usuário, ao clicar no card de frete, para o nível do gráfico correspondente. Esta atualização visa proporcionar uma visão clara e imediata dos custos de frete em relação ao valor total das notas fiscais.


```


#### 1.4. 21/06/2024 13:00 as 18:00
```markdown

SATIS - ANALISE DE COMPRAS - Foi desenvolvido o nível inferior, onde se incorporou um gráfico que demonstra a evolução do percentual médio gasto com frete por nota e por período. Também foi criado um terceiro nível para detalhar esse percentual, oferecendo uma análise mais minuciosa. No nível do gráfico, adicionou-se uma ação interativa que, ao clicar no período em questão, direciona o usuário para o nível inferior de detalhamento do percentual. Esta funcionalidade aprimorada permite uma navegação mais intuitiva e uma análise detalhada e segmentada dos custos de frete.

```


SELECT
F_DESCROPC('TGFCAB','TIPMOV',TGFCAB.TIPMOV) AS DESC_TIPMOV
FROM TGFCAB
GROUP BY
F_DESCROPC('TGFCAB','TIPMOV',TGFCAB.TIPMOV)
SELECT
F_DESCROPC('TGFCOT','SITUACAO',COT.SITUACAO) AS SITUACAO
FROM TGFCOT COT
GROUP BY F_DESCROPC('TGFCOT','SITUACAO',COT.SITUACAO)
INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )



/*FOB*/
---/*% DO ITEM NA NOTA*/
--CASE WHEN CAB.CIF_FOB = 'F' THEN ITE.VLRTOT / CAB.VLRNOTA END AS PERC_DO_ITEM_NA_NOTA,
/*VALOR DO FRETE DO ITEM COM BASE % DO ITEM NA NOTA*/
--CASE WHEN CAB.CIF_FOB = 'F' THEN (ITE.VLRTOT / CAB.VLRNOTA)*CAB.VLRFRETE END AS VLRFRETE_POR_ITEM_FOB,
/*% DO ITEM COM FRETE NO VALOR DA NOTA - FOB*/
--CASE WHEN CAB.CIF_FOB = 'F' THEN ((ITE.VLRTOT / CAB.VLRNOTA)*CAB.VLRFRETE)/CAB.VLRNOTA END AS PERC_ITEM_COM_FRETE_NO_VLRNOTA_FOB,

/*CIF*/
--/*SOMA TOTAL DOS ITENS SEM O FRETE*/
--CASE WHEN CAB.CIF_FOB = 'C' THEN SUM(ITE.VLRTOT) OVER (PARTITION BY ITE.NUNOTA) END AS SOMA_TOTAL_DOS_ITENS_SEM_FRETE,
--/*% DO VALOR DO ITEM SOB A SOMA TOTAL DOS ITENS SEM O FRETE*/
--CASE WHEN CAB.CIF_FOB = 'C' THEN ITE.VLRTOT/SUM(ITE.VLRTOT) OVER (PARTITION BY ITE.NUNOTA) END AS PERC_ITENS_SOB_TOTAL_VLRTOT,
/*VALOR DO FRETE DO ITEM COM BASE % DO ITEM NA NOTA*/
--CASE WHEN CAB.CIF_FOB = 'C' THEN (ITE.VLRTOT/SUM(ITE.VLRTOT) OVER (PARTITION BY ITE.NUNOTA))*CAB.VLRFRETE END AS VLRFRETE_POR_ITEM_CIF,
/*% DO ITEM COM FRETE NO VALOR DA NOTA - CIF*/
--CASE WHEN CAB.CIF_FOB = 'C' THEN ((ITE.VLRTOT/SUM(ITE.VLRTOT) OVER (PARTITION BY ITE.NUNOTA))*CAB.VLRFRETE)/CAB.VLRNOTA END AS PERC_ITEM_COM_FRETE_NO_VLRNOTA_CIF,



CASE 
WHEN CAB.CIF_FOB = 'C' THEN ((ITE.VLRTOT-ITE.VLRDESC)/(SUM(ITE.VLRTOT) OVER (PARTITION BY ITE.NUNOTA)))*CAB.VLRFRETE 
WHEN CAB.CIF_FOB = 'F' THEN ((ITE.VLRTOT-ITE.VLRDESC) / CAB.VLRNOTA)*CAB.VLRFRETE
END AS VLRFRETE_POR_ITEM,


CASE 
WHEN CAB.CIF_FOB = 'F' THEN (((ITE.VLRTOT-ITE.VLRDESC) / CAB.VLRNOTA)*CAB.VLRFRETE)/CAB.VLRNOTA 
WHEN CAB.CIF_FOB = 'C' THEN (((ITE.VLRTOT-ITE.VLRDESC)/SUM(ITE.VLRTOT) OVER (PARTITION BY ITE.NUNOTA))*CAB.VLRFRETE)/CAB.VLRNOTA
END AS PERC_ITEM_COM_FRETE_NO_VLRNOTA,
(((ITE.VLRTOT-ITE.VLRDESC)/CAB.VLRNOTA)*CAB.VLRFRETE) / ITE.QTDNEG teste2


Prezados, bom dia!

Segue atualização de demandas entregues relacionados ao setor de compra referentes ao id 99,100,101,102 e 103:

Criamos o "Dash Analise de Compras", o mesmo sintetiza uma visão gerencial das requisições, cotações, pedidos e notas.
Estabelecemos um filtro de intervalo de datas responsivo a todo dashboard.
Na tela principal agrupamos cada macro-atividade em card's, no card de requisição é demonstrado o total de requisições (requisições confirmadas), e requisições aguardando e iniciadas.
na sequencia temos o card de cotações apresenta o total de cotações subdividindo os totais de requisições fechadas, em aberto e canceladas. Na sequencia temos o card de pedidos com seu respectivo total e pedidos que passaram por cotação e pedidos sem cotação. por ultimo o temos o card de notas de compra, com o total de notas e respectivamente notas sem pedido e notas com pedido.
Cada card ao clicar direciona o usuário a um nível com outro dash respectivo, na requisição são apresentados os centros de resultados que solicitaram as requisções em um grafico de pizza de modo que ao clicar em uma fatia da pizza é demonstrado ao lado o tipo de requisição em grafico de barras e logo abaixo uma tabela com o detalhamento das requisições.
Na sequencia, o card de cotações apresenta uma visão catoções realizadas por comprador com base na requisições e ao clicar em uma fatia da pizza é detalhado ao lado em uma tabela as cotações relacionadas.
No terceiro card ao clicar, temos uma visao semelhante a anterior, demosntrando um grafico de pizza dos pedidos por comprador, e ao clicar em uma fatia da pizza e demonstrado um detalhamento da mesma em uma tabela ao lado.
Por fim, o card de notas repetindo a visao do card de pedidos, aprsenta um grafico de pizza demonstrando os responsaveis pela entrada das notas de compra no sistema priorizando a visão de compras, estabelecendo o mesmo comportamento do grafico de pedidos, de modo que ao clicar na fatia é apresentado ao lado um detalhamento das nota em relação a fatia clicada.


em continuidade no dash principal temos no cabeçalho uma visão de lead-time que demonstra uma média dias que o setor de compras leva para requisita, comprar e cotar, tambem ao clicar neste card é apresentado um visão com o detalhamento deste calculo de lead time. 

por fim ao lado do lead time temos uma sintese do frete de compras para embalagens e materia prima, onde estabelecemos uma apresentação do valor de frete e percetual medio do frete sob a nota de compra. Este por sua vez ao clicar é direcionado para um grafico de desmonstra uma analise horizontal (grafico de linha) desta evolução percentual do frete sob a nota de compra separado por periodo e uma linha para matéria prima e outra para embalagem de modo que ao clicar em qualquer pondo o usuário é direcionado para um nivel com uma tabela que detalha aquele ponto de intersecção.