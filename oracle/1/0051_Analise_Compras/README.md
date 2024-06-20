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
SATIS - ANALISE DE COMPRAS - Apresentação Dash com Silvio - Nível de Requisições: Alterar a segmentação do gráfico de requisições para que a quebra seja feita por CR, ao invés de por Setor, como atualmente. Criar um gráfico ou tabela que demonstre a participação de cada tipo de requisição com base nas informações da tabela. Adicionar um campo que sinalize a data de entrada da requisição. Se a requisição tiver mais de 5 dias, destacar este campo. A tabela deve ser ordenada por este campo. | Nível de Cotações:  Verificar por que as cotações com situação finalizada ainda apresentam status de requisição não atendida. Por exemplo, quando o time do TH gera uma requisição, mesmo finalizada, ela continua aberta. | Nível de Pedidos: Priorizar os compradores no gráfico, categorizando os demais como "outros". | Nível de Notas: Priorizar os compradores no gráfico, categorizando os demais como "outros".


No nivel de requisições no grafico fazer a quebra por CR ao inves do que esta utilizando hoje por Setor. Criar um grafico ou tabela de demostre a partir da tabela qual a participação de cada top de requisição a partir das informações da tabela.Criar campo que sinaliza data que a requisição entrou se está mais 5 criar desque neste campo e deixar que a tabela fique ordenada por este campo.
No nivel de cotações verificar porque as cotacoes com situação finalizada o status da requisição ainda nao esta atendida. Por exemplo quando o time do TH gera uma requisição a mesma mesmo finalizada ainda continua em aberto.
No nível de pedidos priorizar os compadores no grafico e os demais categorizar como 'outros'.
No nível de notas priorizar os compadores no grafico e os demais categorizar como 'outros'.

```


Nível de Requisições:

    Alterar a segmentação do gráfico de requisições para que a quebra seja feita por CR, ao invés de por Setor, como atualmente.
    Criar um gráfico ou tabela que demonstre a participação de cada tipo de requisição com base nas informações da tabela.
    Adicionar um campo que sinalize a data de entrada da requisição. Se a requisição tiver mais de 5 dias, destacar este campo. A tabela deve ser ordenada por este campo.

Nível de Cotações:

    Verificar por que as cotações com situação finalizada ainda apresentam status de requisição não atendida. Por exemplo, quando o time do TH gera uma requisição, mesmo finalizada, ela continua aberta.

Nível de Pedidos:

    Priorizar os compradores no gráfico, categorizando os demais como "outros".

Nível de Notas:

    Priorizar os compradores no gráfico, categorizando os demais como "outros".



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