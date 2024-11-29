# Objetivos
```markdown


```


### 1. Log's Execução


#### 1.1. 02/07/2024 8:00 as 12:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - No período da manhã, começamos a elaboração da base de dados para a análise de compra com foco na organização de critérios que possibilitam identificar oportunidades de saving. Esse processo envolveu a coleta e consolidação de informações essenciais, como preços históricos, volumes de compra, e condições de fornecimento. Foi crucial garantir a integridade e precisão dos dados para permitir análises confiáveis e detalhadas. Também desenvolvemos um esquema de classificação e categorização dos produtos e fornecedores, facilitando a visualização e o desdobramento das informações no dashboard.
```


#### 1.1. 02/07/2024 13:00 as 19:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - Durante a tarde, prosseguimos com a montagem da base de dados, integrando os dados coletados com sistemas de gestão existentes para assegurar uma atualização contínua e automatizada das informações. Implementamos regras de validação e limpeza de dados para evitar inconsistências e duplicidades. Também configuramos filtros e parâmetros que permitem a personalização das análises, de acordo com as necessidades específicas de diferentes departamentos da empresa. A documentação do processo foi iniciada, garantindo que todas as etapas e critérios utilizados fossem devidamente registrados para referência futura.
```


#### 1.1. 03/07/2024 8:00 as 12:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - Na manhã, dedicamo-nos à elaboração de uma base de dados específica para demonstrar a evolução dos preços ao longo do tempo. Isso envolveu a criação de um histórico detalhado dos preços de aquisição, segmentado por período, fornecedor e categoria de produto. Aplicamos um modelo analítico que incorpora ganhos de negociação, assumindo uma redução de 1% nos preços a cada 30 dias decorridos. Este modelo foi parametrizado para permitir ajustes conforme novas condições de mercado e estratégias de negociação.

```


#### 1.1. 03/07/2024 13:00 as 19:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - À tarde, refinamos os cálculos e validações do modelo de evolução de preços, garantindo que os ganhos de negociação fossem aplicados de forma precisa e consistente. Adicionamos funcionalidades de visualização de dados ao dashboard, permitindo aos usuários identificar rapidamente as tendências de preço e os impactos das negociações ao longo do tempo. Desenvolvemos gráficos interativos que mostram a evolução dos preços por produto e fornecedor, facilitando a análise comparativa e a tomada de decisões informadas.

```


#### 1.1. 04/07/2024 8:00 as 12:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - Na manhã do dia 4, concentramos nossos esforços na elaboração de relatórios analíticos de saving por pedido e produto. Utilizamos a base de dados consolidada e os modelos de evolução de preço para gerar relatórios detalhados que destacam as economias obtidas em cada negociação. Esses relatórios incluíram métricas como percentual de saving, valor monetário economizado, e comparações com períodos anteriores. A formatação dos relatórios foi padronizada para garantir clareza e facilidade de compreensão, com uso de gráficos e tabelas.

```


#### 1.1. 04/07/2024 13:00 as 19:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - Durante a tarde, finalizamos a formatação e disponibilização dos relatórios. Implementamos um sistema de distribuição automatizada que envia os relatórios para os stakeholders relevantes em intervalos regulares. Também criamos um portal de acesso no dashboard, onde os usuários podem consultar e baixar os relatórios sempre que necessário. Realizamos testes de usabilidade e coletamos feedback dos usuários para identificar possíveis melhorias. A documentação do processo de elaboração e distribuição dos relatórios foi concluída, assegurando que todas as etapas fossem claras e replicáveis.

```


#### 1.1. 05/07/2024 8:00 as 12:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - Nos concentramos na criação de cartões (cards) no dashboard principal que consolidam as informações de saving e os ganhos de negociação. Estes cards foram projetados para oferecer uma visão geral rápida e clara dos resultados financeiros obtidos. Cada card foi configurado para exibir os totais consolidados de saving e ganhos de negociação, proporcionando uma visualização imediata do desempenho geral. Além disso, implementamos níveis de detalhamento para cada número consolidado. Ao clicar em um card, os usuários podem acessar informações mais detalhadas, incluindo gráficos de evolução do saving por período e gráficos de evolução do saving por ganho de negociação. Esses gráficos foram desenvolvidos para mostrar as tendências ao longo do tempo, permitindo uma análise aprofundada dos dados e a identificação de padrões e oportunidades de melhoria.

```


#### 1.1. 05/07/2024 13:00 as 19:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - continuamos a aprimorar o dashboard, focando na criação de um nível inferior de detalhamento acessado a partir do botão 'Prod. e Parc.'. Este nível inferior foi desenvolvido para demonstrar os 10 produtos com maior saving e os 10 fornecedores com maior saving. Cada uma dessas listas foi elaborada com base em critérios rigorosos de análise de dados, garantindo que as informações apresentadas fossem precisas e relevantes. Implementamos tabelas e gráficos interativos que permitem aos usuários explorar esses dados de maneira dinâmica, facilitando a identificação de produtos e fornecedores que estão contribuindo significativamente para as economias da empresa. Além disso, configuramos filtros e opções de segmentação que permitem personalizar a visualização dos dados de acordo com diferentes parâmetros, como períodos específicos ou categorias de produtos. Essa funcionalidade adicional fornece uma camada extra de insight e suporte à tomada de decisões estratégicas.

```
#### 1.1. 08/07/2024 8:00 as 12:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - re-desenhamos completamente a estrutura do layout principal do dashboard. Esta revisão foi realizada para melhorar a usabilidade e a acessibilidade das informações apresentadas, garantindo uma visualização mais clara e intuitiva dos dados. 
```
#### 1.1. 08/07/2024 13:00 as 19:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - continuamos esse trabalho, refinando os elementos visuais e funcionais do dashboard para otimizar a experiência do usuário. Implementamos dois selects principais: um dedicado ao acompanhamento do saving e evolução de preço, e outro focado no ganho por condição de pagamento. Esses selects foram projetados para permitir uma análise detalhada e comparativa, facilitando a identificação de padrões e tendências ao longo do tempo.
```


#### 1.1. 09/07/2024 8:00 as 12:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - desenvolvemos a lógica necessária para calcular a média do preço anterior de um produto com base na data do pedido e do produto. Esta funcionalidade foi implementada para fornecer uma referência histórica útil na análise de variações de preço ao longo do tempo. Além disso, começamos a integrar selects derivados dos principais em cada componente do dashboard, permitindo uma navegação mais fluida entre diferentes níveis de detalhamento e análise.
```

#### 1.1. 09/07/2024 13:00 as 19:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - criamos funções adicionais para acessar níveis inferiores a partir dos botões disponíveis no dashboard, aumentando a interatividade e a profundidade das análises disponíveis aos usuários. Adicionalmente, na tela principal, introduzimos um card consolidado para demonstrar o ganho por condição de pagamento, acompanhado por gráficos que ilustram a evolução deste ganho ao longo do tempo. Desenvolvemos gráficos de barra horizontal para detalhar o ganho por condição de pagamento por centro de resultado e parceiro, oferecendo uma análise segmentada e detalhada dos resultados financeiros. Complementamos a análise com um gráfico de pizza que visualiza o ganho por condição de pagamento agrupado por comprador, proporcionando uma visão individualizada do desempenho financeiro de cada comprador.

```

#### 1.1. 10/07/2024 8:00 as 12:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - dedicamo-nos à criação de funcionalidades específicas para melhorar a precisão e a eficiência das análises realizadas no dashboard. Desenvolvemos uma função para calcular a quantidade alternativa quando um produto apresenta um volume 'MI', garantindo que as recomendações de compra se ajustem às condições específicas de cada produto. Também implementamos gráficos na tela principal para demonstrar a evolução do saving e evolução de preço ao longo do tempo, proporcionando uma visão panorâmica das tendências gerais.
```

#### 1.1. 10/07/2024 13:00 as 19:00
```markdown
SATIS - SAVING E EVOLUÇÃO COMPRAS - Durante a tarde, continuamos a aprimorar a visualização dos dados com a criação de gráficos de barra horizontal para destacar o saving por produto e parceiro, além de gráficos de pizza para ilustrar a evolução de preço e saving por comprador. Esses gráficos foram desenvolvidos com o objetivo de oferecer insights visuais claros e acessíveis, facilitando a interpretação rápida e precisa dos dados. Finalizamos também a implementação de gráficos de barra horizontal para detalhar a evolução de preço por produto e parceiro, além de consolidar o saving e evolução de preço por centro de resultado. criamos uma tela adicional dedicada ao cálculo de juros e à verificação do valor médio anterior de produtos em relação a uma data atual. Isso foi projetado para apoiar decisões financeiras estratégicas, oferecendo ferramentas analíticas robustas diretamente integradas ao dashboard principal. Por fim, implementamos um gráfico de barras para destacar a posição do valor total de compras por comprador, permitindo uma avaliação clara da contribuição de cada comprador para os resultados gerais da empresa.
```


ATUALIZAR QTDNEG. COM FUNÇÃO. PARA UTILIZAR UNIDADE ALTERNATIVA.



O INDEX 2 É A ESTRUTURA HTML
O INDEX 3 É A ESTRUTURA JSP


CREATE OR REPLACE FUNCTION GET_QTDNEG_SATIS(
    P_NUNOTA IN NUMBER,
    P_CODPROD IN VARCHAR2
) RETURN NUMBER
IS
    V_QTDNEG NUMBER;
BEGIN
    SELECT
        CASE WHEN VOA.DIVIDEMULTIPLICA = 'M' THEN ITE.QTDNEG / VOA.QUANTIDADE
             ELSE ITE.QTDNEG * VOA.QUANTIDADE END AS QTDNEG
    INTO V_QTDNEG
    FROM TGFITE ITE
    INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
    LEFT JOIN TGFVOA VOA ON VOA.CODPROD = PRO.CODPROD AND ITE.CODVOL = VOA.CODVOL
    WHERE ITE.NUNOTA = P_NUNOTA AND ITE.CODPROD = P_CODPROD;

    RETURN V_QTDNEG;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN NULL; -- or handle exception as needed
END;
/


SELECT GET_QTDNEG_SATIS(:P_NUNOTA, :P_CODPROD) AS QTDNEG_SATIS FROM DUAL;


```
Curinga:

F_DESCROPC('TGFCOT','SITUACAO',COT.SITUACAO)
INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )


```

Backlog:

