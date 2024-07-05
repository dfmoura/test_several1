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





```
Curinga:

F_DESCROPC('TGFCOT','SITUACAO',COT.SITUACAO)
INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )


```

Backlog:

