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

#### 1.1.Para o período de 19/07/24, das 8h às 12h, 
```markdown
GM - DASH RENTABILIDADE HTML5 - Começamos configurando os filtros para que todos os selects contemplassem os filtros padrões, além de Gerente, Vendedor e Rota. Foram realizadas diversas tentativas até acertar a sintaxe e lógica correta nos selects e scripts JS dos quatro componentes no nível de faturamento. Este processo envolveu ajustes minuciosos e testes contínuos para garantir que cada filtro funcionasse perfeitamente com os dados esperados. Além disso, trabalhamos na criação de um evento que, ao clicar em uma coluna da tabela, levasse o usuário a um próximo nível contendo um gráfico de supervisor de um lado e o detalhamento em tabela do outro. Este evento foi testado exaustivamente para garantir uma navegação suave e precisa entre os níveis.
```

#### Durante o período de 19/07/24, das 13h às 18h, 
```markdown
GM - DASH RENTABILIDADE HTML5 - Adicionamos um container no header do nível com botões indicados pelos gerentes apresentados no nível anterior no gráfico de colunas. Ao clicar nesses botões, o parâmetro :A_GERENTE era atualizado nos componentes gráfico de rosca e tabela com detalhamento. Implementar essa funcionalidade exigiu várias iterações e refinamentos para assegurar que o comportamento dinâmico estivesse correto e intuitivo para o usuário. Também inserimos um drop-down acima da tabela, permitindo filtrar os supervisores, o que envolveu ajustar as queries e a lógica de filtragem. Posteriormente, replicamos essa estrutura para criar outro nível de vendedores, acessado a partir de um clique no gráfico de rosca do nível de supervisores. Este novo nível manteve todas as funcionalidades da tela anterior, exigindo a atualização dos parâmetros e selects das consultas, com testes contínuos para garantir a consistência e funcionalidade da navegação.
```

#### Para o período de 22/07/24, das 8h às 12h, 
```markdown
GM - DASH RENTABILIDADE HTML5 - continuamos ajustando os filtros e parâmetros dos selects e scripts JS, focando em assegurar que as mudanças implementadas funcionassem corretamente em todas as situações possíveis. Testamos diversas combinações de filtros e cenários de dados para identificar e corrigir quaisquer inconsistências ou erros. Além disso, melhoramos a interação entre os gráficos de rosca e as tabelas, garantindo que as atualizações fossem refletidas em tempo real sem atrasos ou falhas.
```

#### Durante o período de 22/07/24, das 13h às 18h, 
```markdown
GM - DASH RENTABILIDADE HTML5 - prosseguimos com a implementação e teste das funcionalidades dinâmicas adicionadas anteriormente. Especificamente, trabalhamos para garantir que a atualização dos parâmetros :A_GERENTE e a filtragem por supervisores fossem intuitivas e sem problemas. Este trabalho envolveu revisões cuidadosas do código e testes de usabilidade para refinar a interface e a experiência do usuário. Também ajustamos a visualização dos gráficos e tabelas para melhorar a clareza e acessibilidade dos dados apresentados.
```

#### Para o período de 23/07/24, das 8h às 12h, 
```markdown
GM - DASH RENTABILIDADE HTML5 - finalizamos os ajustes nos eventos de clique e na navegação entre os níveis. Realizamos testes rigorosos para garantir que a transição entre diferentes níveis e a atualização dos dados fossem consistentes e precisas. Corrigimos quaisquer bugs encontrados durante o teste e otimizamos o desempenho dos scripts para uma experiência mais fluida.
```

#### Durante o período de 23/07/24, das 13h às 18h, 
```markdown
GM - DASH RENTABILIDADE HTML5 - concentramos nossos esforços em aprimorar a interface do usuário, garantindo que os novos botões, drop-downs e gráficos estivessem visualmente integrados e funcionalmente robustos. Fizemos refinamentos finais na aparência e comportamento dos componentes gráficos, assegurando que todas as funcionalidades fossem acessíveis e operacionais em diferentes dispositivos e navegadores.
```

#### Para o período de 24/07/24, das 8h às 12h, 
```markdown
GM - DASH RENTABILIDADE HTML5 - realizamos uma revisão final de todas as funcionalidades e a interface do dashboard. Executamos uma série de testes de regressão para assegurar que as novas funcionalidades não afetassem negativamente as existentes. Este processo envolveu verificar a integridade dos dados, a responsividade da interface e a precisão dos filtros e gráficos.
```

#### Durante o período de 24/07/24, das 13h às 18h, 
```markdown
GM - DASH RENTABILIDADE HTML5 - concluímos o projeto com a documentação detalhada de todas as atualizações e funcionalidades implementadas. Criamos guias de uso para os novos componentes e funcionalidades, facilitando a compreensão e utilização do dashboard pelos usuários finais. Também estabelecemos pontos de controle para futuras atualizações e melhorias, garantindo a continuidade do desenvolvimento e manutenção do sistema.
```

#### Para o período de 25/07/24, das 8h às 12h, 
```markdown
GM - DASH RENTABILIDADE HTML5 - desenvolvemos uma tela no nível analítico de produtos usando HTML, CSS e JavaScript, com responsividade garantida através do uso de Bootstrap. A tabela incluída apresenta uma interface visualmente atraente, com colunas detalhadas como "Nro. Único", "Dt. Negociação", "Cód. Top.", "Cód. Parc.", "Parceiro", "Preço Médio" e "Vlr. Fat.". Adicionamos efeitos interativos para melhorar a usabilidade, como realces ao passar o mouse e responsividade adaptativa para diferentes tamanhos de tela. O design foi minuciosamente ajustado para garantir que a tabela não apenas apresentasse os dados de forma clara e organizada, mas também se adaptasse adequadamente ao layout da página, mantendo uma estética consistente e funcional.
```

#### No período de 25/07/24, das 13h às 18h,
```markdown
GM - DASH RENTABILIDADE HTML5 - implementamos um evento na tela de faturamento que, ao clicar em uma linha da coluna da tabela de produtos sintética, direciona o usuário para o nível analítico correspondente ao produto selecionado. Neste novo nível, desenvolvemos um evento adicional que, ao clicar na linha da tabela, abre a central de vendas para o número único do produto, facilitando o acesso às informações detalhadas do produto. Também criamos um gráfico de linhas para visualizar as vendas por rota e por vendedor, integrando este gráfico ao dashboard com filtros padrão adicionados aos selects nos índices 60, 68, 69, 70 e 72, garantindo que as informações apresentadas fossem facilmente manipuláveis e atualizadas conforme as seleções do usuário.
```

#### Para o período de 26/07/24, das 8h às 12h, 
```markdown
GM - DASH RENTABILIDADE HTML5 - oncentramos esforços na criação e configuração do layout para a seção de devoluções. Desenvolvemos um design consistente e intuitivo que permite uma visualização clara dos dados de devolução, mantendo a harmonia com o estilo geral do dashboard. Este layout inclui tabelas e gráficos adaptados para refletir as informações de devolução de maneira eficaz e acessível, proporcionando uma experiência de usuário otimizada.
```

#### Durante o período de 26/07/24, das 13h às 18h,
```markdown
GM - DASH RENTABILIDADE HTML5 - finalizamos a elaboração do padrão de layout para os demais níveis do dashboard. Este trabalho envolveu definir e padronizar a estrutura e o estilo dos diferentes níveis, assegurando que todos seguissem uma estética uniforme e fossem funcionalmente coerentes. Implementamos os padrões definidos, ajustando os componentes gráficos e tabelas para garantir uma navegação fluida e uma apresentação visual consistente em todo o dashboard, permitindo uma integração harmoniosa entre todos os níveis e seções do sistema.

```

#### Dia 29/07/24, das 8h às 12h
```markdown
GM - DASH RENTABILIDADE HTML5 - Iniciamos a criação do layout para sete novas telas, que abrangem as seguintes áreas: Impostos, Custo de Mercadoria Vendida (CMV), Hectolitros (HL), Descontos, Margem Nominal, Despesas Operacionais e Resultado. Cada tela foi projetada para seguir uma estrutura de layout padronizada, garantindo consistência visual e funcional em todo o dashboard. Além disso, implementamos eventos de clique que direcionam os usuários para esses novos níveis detalhados, facilitando a navegação entre as seções de devolução, impostos, CMV, HL, desconto, margem, despesa operacional, investimento e resultado. Esse trabalho envolveu a definição clara dos componentes e o design visual de cada tela, respeitando as diretrizes de usabilidade e acessibilidade.
```



#### Dia 29/07/24, das 13h às 19h
```markdown
GM - DASH RENTABILIDADE HTML5 - Prosseguimos com a criação de dashboards específicos, começando com o dashboard de Devoluções por Motivo. Para isso, adaptamos o layout padrão para incluir gráficos e tabelas que apresentam dados de devoluções segmentados por motivo, garantindo que a informação seja exibida de maneira clara e compreensível. Também trabalhamos na adaptação do select da tela de devolução, ajustando os critérios de filtro para assegurar que as consultas sejam precisas e relevem os dados mais importantes para essa análise específica. Esta fase envolveu uma série de testes e ajustes para confirmar que os dados estavam sendo apresentados corretamente e que o layout atendia aos requisitos do usuário.
```

#### Dia 30/07/24, das 8h às 12h
```markdown
GM - DASH RENTABILIDADE HTML5 - Continuamos o processo de adaptação dos selects, desta vez focando na tela de CMV. Ajustamos as consultas SQL e os filtros de data para garantir que os dados exibidos fossem precisos e pertinentes. Além disso, organizamos os componentes da tela para que a informação fosse facilmente acessível e visualmente equilibrada. Foram realizados ajustes finos nos gráficos e tabelas, garantindo que a visualização dos dados fosse clara e eficiente. A configuração de layouts, incluindo a definição de cores e fontes, foi cuidadosamente revisada para assegurar uma experiência de usuário agradável e funcional.
```



#### Dia 30/07/24, das 13h às 19h30
```markdown
GM - DASH RENTABILIDADE HTML5 - Dando continuidade, adaptamos o select da tela de Impostos. Esse processo envolveu a revisão dos critérios de seleção de dados para incluir filtros adicionais e assegurar que as informações fossem representativas das realidades fiscais da empresa. Organizamos os componentes visuais dessa tela, assegurando que gráficos e tabelas fossem dispostos de maneira que facilitassem a análise dos dados de impostos. Implementamos também uma série de melhorias de layout e design, garantindo que a interface estivesse em linha com o padrão visual definido anteriormente.
```

#### Dia 31/07/24, das 8h às 12h
```markdown
GM - DASH RENTABILIDADE HTML5 - Na parte da manhã, focamos na adaptação do select da tela de HL (Hectolitros). Essa etapa foi crucial para garantir que os dados de produção e vendas fossem apresentados de forma clara e detalhada. Realizamos a organização dos quatro componentes principais da tela, ajustando gráficos e tabelas para fornecer uma visão abrangente e detalhada das informações de hectolitros. Além disso, garantimos que os filtros de data e outros critérios de seleção estivessem corretamente configurados para permitir uma análise precisa e eficaz.
```



#### Dia 31/07/24, das 13h às 19h30
```markdown
GM - DASH RENTABILIDADE HTML5 - Finalmente, abordamos a adaptação do select da tela de Despesas Operacionais (DO). Esta tela exigiu uma revisão cuidadosa dos dados para assegurar que todas as despesas relevantes fossem capturadas e exibidas de forma clara. Organizamos os componentes da tela, incluindo gráficos e tabelas, para facilitar a navegação e a análise dos dados de despesas operacionais. Além disso, fizemos ajustes finais nos layouts de todas as telas, garantindo uma apresentação visual coesa e profissional. Este esforço incluiu a revisão de todos os componentes visuais e a confirmação de que cada tela estava em conformidade com os padrões de design estabelecidos, oferecendo uma experiência de usuário uniforme e intuitiva.
```
#### Dia 01/08/24, das 8h às 12h
```markdown
GM - DASH RENTABILIDADE HTML5 - Durante a manhã, concentramos nossos esforços na redefinição do select da tela principal para alinhar com o select utilizado no dashboard de Faturamento Analítico. Essa decisão foi tomada para garantir consistência nos dados exibidos e facilitar a manutenção dos critérios de seleção. Revisamos minuciosamente todos os filtros aplicados, como data, empresa e natureza, para assegurar que o select capturasse todas as informações necessárias de forma precisa e sem redundâncias. Além disso, ajustamos os parâmetros para que fossem compatíveis com as diferentes consultas SQL, garantindo que os dados pudessem ser agregados e exibidos corretamente em ambos os dashboards.
```



#### Dia 01/08/24, das 13h às 19h
```markdown
GM - DASH RENTABILIDADE HTML5 - Na parte da tarde, após realizar várias verificações e testes, validamos o select da tela principal para garantir que ele estivesse de acordo com os requisitos estabelecidos. Esta etapa envolveu a execução de diversos cenários de testes para identificar possíveis discrepâncias ou erros nos dados apresentados. Além disso, implementamos ajustes finais no código SQL para otimizar o desempenho das consultas, assegurando que a recuperação de dados fosse eficiente e que a interface do usuário permanecesse responsiva. Por fim, realizamos uma revisão completa das configurações e funcionalidades, validando que todas as alterações estavam corretas e prontas para produção.
```



#### Dia 02/08/24, das 8h às 12h
```markdown
GM - DASH RENTABILIDADE HTML5 - Durante a manhã do dia 02/08/2024, iniciamos a adaptação do script para permitir o acesso a níveis inferiores a partir de interações do usuário, como cliques em fatias de gráficos ou colunas. Esta funcionalidade foi projetada para melhorar a navegação dentro do dashboard, permitindo uma análise mais detalhada e específica dos dados. Realizamos diversas tentativas para configurar corretamente os parâmetros de filtragem, garantindo que as informações exibidas no nível inferior fossem precisas e relevantes de acordo com o contexto do gráfico selecionado. Também ajustamos o comportamento dos eventos de clique para assegurar uma transição suave e coerente entre os níveis, evitando conflitos ou sobreposição de dados.
```


#### Dia 02/08/24, das 13h às 19h
```markdown
GM - DASH RENTABILIDADE HTML5 - Na tarde do mesmo dia, continuamos aprimorando a lógica de filtragem para garantir que as interações com os gráficos fossem intuitivas e eficazes. Ajustamos o script para que os parâmetros de filtro aplicados em um nível superior fossem corretamente transmitidos ao nível inferior, permitindo uma continuidade analítica sem a necessidade de redefinir filtros manualmente. Além disso, focamos na otimização do código, visando minimizar o tempo de carregamento das consultas e melhorar a performance geral do dashboard. Implementamos testes de usabilidade para verificar se os usuários poderiam navegar entre os níveis de forma fluida, sem perder o contexto das informações.
```

#### Dia 03/08/24, das 16h às 20h
```markdown
GM - DASH RENTABILIDADE HTML5 - No dia 03/08/2024, dedicamos o período da tarde para adaptar o código a fim de atualizar o nível atual do dashboard e permitir o acesso a níveis inferiores na tela de faturamento. Esse processo envolveu a revisão das consultas SQL e a integração dos parâmetros de filtragem nas camadas subsequentes do sistema. Testamos exaustivamente a integração entre os diferentes níveis para garantir que as informações fossem atualizadas de forma precisa ao longo da navegação. Também implementamos melhorias na interface do usuário, facilitando a interação com os gráficos e a interpretação dos dados, especialmente em cenários complexos onde múltiplos filtros são aplicados simultaneamente.
```

#### Dia 07/08/24, das 8h às 12h
```markdown
GM - DASH RENTABILIDADE HTML5 - Na manhã do dia 07/08/2024, focamos na adaptação de um novo código que possibilita a atualização do nível atual e o acesso a níveis inferiores na tela de faturamento. Esse código foi desenvolvido com o objetivo de oferecer uma transição mais eficiente entre os diferentes níveis do dashboard, melhorando a experiência do usuário. Realizamos diversas iterações para testar a funcionalidade em diferentes cenários, garantindo que a lógica de filtragem e a exibição dos dados fossem consistentes. Além disso, ajustamos a interface para que as mudanças entre os níveis fossem visivelmente claras e seguissem um fluxo natural de navegação.
```

#### Dia 07/08/24, das 13h às 19h
```markdown
GM - DASH RENTABILIDADE HTML5 - Durante a tarde do dia 07/08/2024, trabalhamos na atualização do gráfico do arquivo 60, incluindo a configuração do argumento :A_TPPROD nos selects do nível, de modo a transmitir esse parâmetro para o nível inferior. Essa atualização foi essencial para assegurar que o filtro aplicado ao tipo de produto fosse mantido ao explorar níveis mais detalhados do dashboard. Testamos a configuração em diferentes gráficos e garantimos que o parâmetro fosse corretamente interpretado e aplicado. Com isso, conseguimos melhorar a precisão da análise, permitindo uma visualização mais segmentada dos dados, de acordo com o tipo de produto selecionado.
```

#### Dia 08/08/24, das 8h às 12h
```markdown
GM - DASH RENTABILIDADE HTML5 - Na manhã do dia 08/08/2024, focamos na criação de uma tabela detalhada por supervisor, que servirá como um componente chave no nível analítico. Essa tabela foi projetada para exibir informações cruciais sobre as operações de cada supervisor, incluindo indicadores de desempenho e dados financeiros. Implementamos o layout da tabela utilizando Bootstrap, garantindo um design responsivo e visualmente atraente. Também incluímos filtros para que os usuários possam segmentar os dados de acordo com suas necessidades específicas. Durante o desenvolvimento, realizamos diversas validações para garantir que os dados exibidos estivessem corretos e fossem facilmente interpretáveis.
```

#### Dia 08/08/24, das 13h às 19h
```markdown
GM - DASH RENTABILIDADE HTML5 - Na tarde do dia 08/08/2024, configuramos no script uma ação que permite que os filtros aplicados no nível atual sejam levados automaticamente para o nível inferior. Essa funcionalidade foi desenvolvida para preservar o contexto da análise ao navegar entre diferentes níveis do dashboard. Trabalhamos minuciosamente para integrar essa lógica aos diferentes componentes da tela, garantindo que todos os filtros relevantes fossem corretamente aplicados. Além disso, realizamos testes para validar que os dados apresentados nos níveis inferiores refletiam exatamente os critérios de filtragem definidos no nível superior, sem necessidade de ajuste manual.
```

#### Dia 09/08/24, das 8h às 12h
```markdown
GM - DASH RENTABILIDADE HTML5 - Na manhã do dia 09/08/2024, concentramos nossos esforços na criação de um evento que, ao clicar em uma fatia do gráfico principal, atualiza automaticamente os demais componentes do dashboard. Esta funcionalidade foi projetada para proporcionar uma análise dinâmica e interativa, permitindo que os usuários explorem diferentes aspectos dos dados com facilidade. Durante o desenvolvimento, ajustamos o select e o código dos componentes para garantir que a atualização fosse realizada de forma rápida e precisa. Adicionalmente, para gráficos que exibem o top 10, adicionamos a categoria "Outros" para capturar dados que não se enquadram nas principais categorias, oferecendo uma visão mais completa.
```

#### Dia 09/08/24, das 13h às 19h
```markdown
GM - DASH RENTABILIDADE HTML5 - Na tarde do dia 09/08/2024, finalizamos as implementações ao adicionar e validar a nova categoria "Outros" nos gráficos top 10, atualizando os selects correspondentes. Este ajuste foi feito para garantir que nenhuma informação relevante fosse omitida, mesmo que os dados não se encaixem nas principais categorias. Testamos exaustivamente a interação entre os gráficos e outros componentes do dashboard para assegurar que a funcionalidade estivesse completamente integrada e operando como esperado. Por fim, realizamos uma revisão completa de todas as implementações realizadas até o momento, garantindo a consistência e a robustez das novas funcionalidades.
```

#### Dia 11/08/24, das 19h às 23h
```markdown
GM - DASH RENTABILIDADE HTML5 - No dia 12/08/2024, entre as 19h e 23h, realizamos a implementação final das funcionalidades planejadas para o dashboard, focando na criação de um evento que, ao clicar em uma fatia do gráfico principal, atualiza todos os demais componentes da tela em tempo real. Essa implementação foi crucial para garantir que o dashboard permanecesse interativo e responsivo às ações do usuário, permitindo uma análise rápida e eficiente dos dados. Além disso, ajustamos os selects para que os componentes que exibem as top 10 categorias adicionassem automaticamente a categoria "Outros", o que assegura uma visão abrangente dos dados, incluindo aqueles que não se enquadram nas principais categorias. Foram realizados testes extensivos para validar a precisão e a performance dessas novas funcionalidades, garantindo que o sistema atendesse plenamente às expectativas e necessidades dos usuários.
```

####
```markdown
```

####
```markdown
```

####
```markdown
```

####
```markdown
```

#### Dia 12/08/2024, das 13h às 18h
```markdown
GM - DASH RENTABILIDADE HTML5 - Na parte da tarde, continuamos aprimorando o detalhamento do nível de devolução. Foram realizados diversos testes para verificar o comportamento da ordenação por número único em diferentes cenários, incluindo grandes volumes de dados. Ajustes adicionais foram feitos na apresentação das informações na interface, visando melhorar a clareza visual e garantir que a ordenação permanecesse intacta mesmo com a aplicação de filtros adicionais. Finalizamos o dia validando a implementação com a equipe de controle de qualidade, garantindo que todos os requisitos fossem atendidos.
```

#### Dia 12/08/2024, das 8h às 12h
```markdown
GM - DASH RENTABILIDADE HTML5 -  Durante o período da manhã, focamos na atualização do nível de detalhamento da tela de devolução. O principal objetivo foi otimizar a exibição dos dados, aplicando uma nova lógica de ordenação com base no número único de cada transação. Para garantir que essa ordenação fosse precisa e eficiente, revisamos o select responsável pelo carregamento dos dados, garantindo que os registros fossem organizados de maneira coerente e consistente em todas as consultas. Além disso, foram realizadas validações para assegurar que o comportamento do filtro atendesse às especificações solicitadas, com o menor impacto possível na performance.
```



#### Dia 13/08/24, das 8h às 12h

```markdown 
GM - DASH RENTABILIDADE HTML5 - No dia 13/08/2024, iniciamos o desenvolvimento da tela de detalhamento do CIP (Custo Indireto de Produção). Essa tela foi criada em um layout responsivo e com estrutura organizada para exibir informações contábeis detalhadas. Em seguida, desenvolvemos o nível de detalhamento dos lançamentos contábeis do CIP, permitindo que os usuários pudessem acessar informações granulares sobre cada lançamento associado ao custo indireto. No nível de imposto, ajustamos o select para corrigir inconsistências nos dados, além de aplicar melhorias no layout dos componentes para manter um padrão estético e funcional. Também foi corrigido o cálculo da soma total na tabela analítica de detalhamento, garantindo que valores negativos fossem adequadamente considerados no resultado final.
```

#### Dia 13/08/24, das 13h às 19h
```markdown 
GM - DASH RENTABILIDADE HTML5 - Durante o turno da tarde, voltamos nossa atenção ao nível de faturamento no CIP. Retiramos a quebra de linhas na tabela de detalhamento, o que facilitou a visualização dos dados em uma única linha contínua. Também reorganizamos o código responsável pelo "replace" da string de total, otimizando o processo de cálculo e exibição desses valores. No nível de impostos, corrigimos o select dos componentes e ajustamos o layout para padronizar a interface. Além disso, criamos eventos nos três principais componentes (empresa, tipo de produto e produto) para que, ao serem clicados, direcionassem o usuário para uma tela de detalhamento compartilhada, ajustando apenas o "where" das queries conforme os filtros aplicados.
```

#### Dia 14/08/24, das 8h às 12h
```markdown 
GM - DASH RENTABILIDADE HTML5 - No dia 14, continuamos com os ajustes na tela de Hectolitro (HL). Ajustamos o select, garantindo que os dados fossem filtrados corretamente, além de aprimorar os itens no dashboard relacionados a esse indicador. Esse ajuste proporcionou uma melhor visualização do volume de produção por produto, refletindo com precisão os dados em tempo real.
```


#### Dia 14/08/24, das 13h às 19h
```markdown 
GM - DASH RENTABILIDADE HTML5 - Na parte da tarde, focamos na tela de descontos, onde realizamos ajustes no select para otimizar a exibição de descontos por produto e cliente. Também aprimoramos a tela de CMV (Custo da Mercadoria Vendida), ajustando o select dos componentes e criando um nível de detalhamento que permite análises mais aprofundadas. O layout foi adaptado para garantir que as informações fossem apresentadas de forma clara e acessível.
```

#### Dia 15/08/24, das 8h às 12h
```markdown 
GM - DASH RENTABILIDADE HTML5 - Dando continuidade ao processo de melhorias, no dia 15, voltamos ao nível de margem, onde configuramos o select dos componentes para garantir que os dados fossem filtrados e exibidos de acordo com as especificações. Implementamos o próximo nível de detalhamento, permitindo a visualização de margens em diferentes níveis hierárquicos, facilitando a análise por produto e categoria.
```

#### Dia 15/08/24, das 13h às 19h
```markdown 
GM - DASH RENTABILIDADE HTML5 - A parte da tarde foi dedicada à finalização do nível de investimentos. Atualizamos o card do dashboard existente, utilizando a coluna de realizado como base para o cálculo dos investimentos efetivamente executados. Também finalizamos a configuração dos componentes e selects relacionados à margem, despesa operacional e resultados, implementando o layout específico para apresentar os resultados de maneira clara e objetiva. Com isso, garantimos que os dashboards estivessem prontos para análise gerencial.
```


#### Dia 16/08/24, das 8h às 12h
```markdown 
GM - DASH RENTABILIDADE HTML5 - No dia 16, nossa prioridade foi garantir que todos os níveis de análise, incluindo faturamento, devolução, impostos, CMV, HL, desconto, margem, despesa operacional, investimento e resultado, estivessem adequadamente configurados e funcionando conforme o esperado. Realizamos testes detalhados para assegurar que todos os componentes reagissem corretamente aos filtros aplicados e que os dados fossem carregados de maneira consistente entre os diferentes níveis de análise.
```

#### Dia 16/08/24, das 13h às 19h
```markdown 
GM - DASH RENTABILIDADE HTML5 - Encerramos o dia realizando ajustes finais nos níveis analíticos de cada dashboard. Implementamos melhorias nas tabelas de detalhamento, garantindo que os usuários pudessem acessar informações completas e detalhadas de cada produto e categoria, incluindo a central de vendas, com a possibilidade de acessar telas específicas do sistema para uma análise ainda mais aprofundada.
```

#### Dia 17/08/24, das 19h às 23h
```markdown 
GM - DASH RENTABILIDADE HTML5 - Durante o turno da noite, realizamos as últimas implementações nos níveis de devoluções, impostos, CMV, HL, desconto, margem, despesa operacional, investimento e resultado. Todos esses níveis foram ajustados para garantir que as telas principais de cada indicador estivessem conectadas aos seus respectivos níveis de detalhamento, proporcionando uma navegação fluida e uma análise detalhada dos dados gerenciais da empresa.
```

#### Dia 18/08/24, das 19h às 23h
```markdown 
GM - DASH RENTABILIDADE HTML5 - Finalizamos o projeto consolidando todos os níveis hierárquicos de análise, garantindo que a tela principal permitisse o acesso direto aos detalhes analíticos de cada indicador. As colunas de desconto unitário e quantidade foram adicionadas ao nível de detalhamento de descontos, complementando a análise. Com todas as melhorias implementadas, o dashboard foi testado em diferentes cenários para assegurar sua performance e precisão.
```







#### Dia 19/08/2024, das 8h às 12h
```markdown 
GM - DASH RENTABILIDADE HTML5 - Na manhã do dia 19, realizamos uma apresentação detalhada do andamento do projeto para a equipe, destacando as tarefas já concluídas e o progresso em relação aos objetivos estabelecidos. Durante a apresentação, discutimos as funcionalidades implementadas e os próximos passos a serem seguidos. Em seguida, iniciamos a execução das tarefas do back-log, priorizando as demandas mais urgentes para garantir a continuidade das entregas sem comprometer o cronograma. Foram definidos os responsáveis por cada tarefa e alinhadas as expectativas para o período da tarde.
```

#### Dia 19/08/2024, das 13h às 19h
```markdown 
GM - DASH RENTABILIDADE HTML5 - Durante a tarde, continuamos o trabalho focado nas tarefas do back-log. Um dos principais focos foi a criação de uma view consolidada de notas fiscais, que serviria como base para atualização no nível principal do dashboard. Implementamos a view no sistema e validamos sua consistência e integração com os demais componentes. Além disso, foi iniciado o desenvolvimento de um consolidador, responsável por centralizar e processar os dados oriundos de diferentes fontes para serem apresentados de forma unificada no dashboard principal.
```

#### Dia 20/08/2024, das 8h às 12h
```markdown 
GM - DASH RENTABILIDADE HTML5 - Na manhã do dia 20, avançamos com a atualização do nível 60, incorporando a nova view consolidada ao select desse nível. Essa atualização teve como objetivo otimizar o carregamento de dados e melhorar a performance, garantindo que as informações fossem exibidas de maneira mais eficiente e precisa. Após implementar a nova lógica, realizamos testes para assegurar que o nível 60 estivesse funcionando corretamente, com dados atualizados e sem inconsistências.
```

#### Dia 20/08/2024, das 13h às 19h
```markdown 
GM - DASH RENTABILIDADE HTML5 - Durante a tarde, o foco foi a atualização dos níveis 68, 69, 70, 71, 72 e 73, onde também incorporamos a nova view consolidada nos selects desses níveis. Foram realizados ajustes finos nas consultas SQL para garantir que a view fosse utilizada de maneira otimizada e que o processamento dos dados fosse realizado sem comprometer o tempo de resposta do sistema. Em cada nível, foram realizados testes individuais para garantir a integridade dos dados apresentados e a correta integração entre os componentes gráficos e tabelas.
```

#### Dia 21/08/2024, das 8h às 12h
```markdown 
GM - DASH RENTABILIDADE HTML5 - Na manhã do dia 21, seguimos com a atualização dos níveis 80 e 88, aplicando a nova view consolidada nos selects desses níveis. No nível 80, reestruturamos a lógica de agrupamento dos motivos apresentados no gráfico de pizza, consolidando os "Demais Motivos" em uma única fatia. Para isso, implementamos uma solução utilizando a função DENSE_RANK(), que permitiu agrupar os motivos menos frequentes em uma categoria genérica. No nível 88, ajustamos o select para garantir que os componentes do nível 80 acessassem as informações do nível 88, alterando apenas o where das consultas.
```

#### Dia 21/08/2024, das 13h às 19h
```markdown 
GM - DASH RENTABILIDADE HTML5 - No período da tarde do dia 21, concentramos nossos esforços na atualização dos níveis 81, 93, 82, 96 e 97. Aplicamos a nova view consolidada aos selects desses níveis, garantindo que os dados apresentados fossem consistentes e refletissem corretamente as alterações feitas no sistema. Durante o processo, também realizamos ajustes nos componentes gráficos e nas tabelas para assegurar que a exibição de informações fosse clara e precisa. Além disso, foram executados testes de funcionalidade para verificar a integridade dos dados e o comportamento esperado dos componentes.
```


#### Dia 21/08/2024, das 20h às 23:30h
```markdown 
GM - DASH RENTABILIDADE HTML5 - Durante a noite do dia 21, o foco permaneceu na atualização dos níveis 83, 94 e 84. Implementamos as melhorias necessárias e consolidamos a nova view nos selects de cada nível, garantindo a uniformidade e consistência dos dados apresentados. A cada etapa, executamos testes rigorosos nos componentes e nas tabelas, verificando se o fluxo de navegação entre os diferentes níveis de detalhamento estava correto. Além disso, ajustamos as interações para assegurar que a transição entre os níveis continuasse fluida e sem interrupções.
```


#### Dia 22/08/2024, das 0h às 01:30h
```markdown 
GM - DASH RENTABILIDADE HTML5 - Nas primeiras horas do dia 22, continuamos o trabalho com foco nos níveis 95, 85 e 98. Reaplicamos a mesma abordagem adotada anteriormente, consolidando a nova view nos selects e garantindo a integridade das informações. Testes finais foram realizados em cada componente, com atenção especial às interações entre os níveis. Com isso, concluímos a integração da nova estrutura de dados nesses níveis, assegurando que todas as camadas do sistema estivessem estáveis e funcionando conforme o esperado.
```


finalização de configuração para acessar nivel inferior a partir de click em fatia ou coluna de grafico filtrando a informação no nivel inferior.


```
Curinga:
F_DESCROPC('TGFCOT','SITUACAO',COT.SITUACAO)
INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )

```




MELHORAR O PRIMIRO NIVEL DE FATURAMENTO DEIXANDO O GRAFICO NO PADRAO DOS DEMAIS,
ORGANIZAR O SELECT.
    - borda no card
    - sem legenda
    - apresentar o % ao passar o mouse
    - tabela mais moderna
    



Adaptar o select da tela de margem e correção do select principal.
Adaptar o select da tela de resultado.








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
Andamento:
Cofigurado os filtros para que todo select ja contemple os filtros padrões/ Gerente / Vendedor / Rota
Atualizado o select e script js dos quatro componentes no nivel de faturamento.
Criado o evento AO CLICAR NA COLUNA DA TABELA IR PARA UM PROXIMO NIVEL COM UM GRAFICO DE SUPERVISOR DE UM LADO E O DETALHAMENTO EM TABELA DO LADO, alem disso criamos no header do nivel um container com botões indicados pelos gerentes aprensentado no nivel anterior no grafico de colunas. Adicionamos tambem um evento que ao clicar nestes botões são atualizados o paramentro :A_GERENTE nos componentes grafico de rosca e tabela com detalhamento. Adicionamos tambem em cima da tabela um drop-down que possibilita filtrar os supervisores na tabela.Em sequencia, criamos outro nivel de vendedores, replicando esta estrutura do nivel atual do nivel de supervisores, acessado a partir de click em grafico de rosca do nivel de supervisores, permanecendo todos as função da tela anterior, atualizamos os paramentro e select das consutas.
criado uma tela , nivel analitico de produtos, em html, css, js, auto redmencionavel com uma tabela bonita utilizando bootstrap, efeitos,  com as colunas Nro. Único, Dt. Negociação, Cód. Top., Cód. Parc., Parceiro, Preço Médio, Vlr. Fat.,
criado evento em tela de faturamento1 que ao clicar em linha de colona de tabela de produtos sintetica o mesmo direciona o produto para um nivel analitico. Neste nivel analitico, criamo um evento que ao clicar na linha sera aberto a central de vendas para o respectivo número unico.
criamos um grafico de linhas que demonstra as vendas por rota por vendedor.
Adicionando os filtro padroes nos select's do index60,68,69,70,72. ok
criar o layout para devolução
elaboração de padrão de layout para os demais niveis.

em html, css, js e chart.js
gerar um tela com 4 seções 2 na parte superior lado esquerdo e lado direito, e 2 na parte inferior lado esquerdo e lado direito.

na primeira seção superior lado esquerdo, colocar um grafico de colunas verticais, colocar o titulo no html 'Impostos', utilizar dados aleatorios.Centralizar horizontalmente os componentes da seção e no top verticalmente.

na segunda seção superior lado direito, colocar um grafico de rosca, colocar o titulo no html 'Impostos por Empresa', utilizar dados aleatorios. Centralizar horizontalmente os componentes da seção e no top verticalmente.

na terceira seção inferior lado esquerdo, colocar um grafico de rosca, colocar o titulo no html 'Impostos por Grupo de Produtos', utilizar dados aleatorios. Centralizar horizontalmente os componentes da seção e no top verticalmente.

na quarta seção inferior lado direito, colocar uma tabela bem bonita com efeitos ao passar o mouse e a primeira linha da tabela de titulo das colunas ficar congelada ao movimentar o scroll, colocar o titulo no html 'Detalhamento Impostos por Produto', utilizar dados aleatorios. Centralizar horizontalmente os componentes da seção e no top verticalmente.





gerar uma tela devoluções em html css js e chart.js 
dividida em 2 seções uma do lado direito e outra do lado esquerdo
na seção do lado esquerdo superior fazer um grafico de rosca com um titulo no html 'Devolução por Motivo'
na seção do lado esquerdo inferior fazer um dropdown de cidades e a cada cidade selecionada mostrar
os bairros com quantidades de devolução em
um grafico de barras verticais com um titulo no html 'Devoluções Por Cidade e Bairros'

na seção do lado direito superior fazer um grafico de colunas com um titulo no html 'Top 10 por vendedor por motivo'
na seção do lado direito inferior fazer uma tabela de produtos por motivo, bem bonita, com efeitos, fixar o cabeçalho da tabela ao rolar a tabela....
para todas as seções dimencionar proporcionalmente seus repectivos componentes
organizar novamente o dimensionamento do espaço deixando cada seção com o mesmo tamanho:
lado superior esquerdo = com o grafico "Devolução por Motivo"
lado inferior esquerdo = com o grafico "Devoluções Por Cidade e Bairros"
lado superior direito = com o grafico "Top 10 por vendedor por motivo"
lado inferior direito = com a tabela "Produtos por Motivo"
usar Flexbox para criar uma estrutura de layout com duas colunas, onde cada coluna é dividida em duas seções
de modo que cada seção tenha o mesmo tamanho
e a estrutura interna nao ultrapasse o tamanho da seção





custo
gerar uma tela em html css js
com 2 seções com parte superior e parte inferior
na parte superior outras 2 seções sendo:
lado esquerdo com um card com borda fina discreta arredondada com um titulo em html '% Custo Médio por Grupo de Produto'  
e lado direito um card com borda fina discreta arredondada com um titulo em html 'Produtos por grupo de proudto'  
na parte inferior somente uma seção com um card com borda fina discreta arredondada com um titulo em html 'Detalhamento'  

criar o layout para 7 telas, sendo impostos,custo,hl,desconto, margem nominal, despesas operacionais e resultado.
criar niveis de arquivo padrao com o novo layout e evento de click para abrir estes novo niveis (devolução, impostos, cmv, hl, desconto, margem, despesa operacional, investimento e resultado)
criação de dash de devoluções por motivo.
Adaptado o select da tela de devolução.
Adaptado o select da tela de cmv.
Adaptado o select da tela de impostos.
Adaptado o select da tela de hl.
Adaptado o select da tela de do.
ESTA ADAPTAÇÃO SIGNIFICA ENTRAR EM CADA TELA E ORGANIZAR OS 4 COMPONENTES DE CADA TELA
REDEFINIDO PARA SELECT DA TELA PRINCIPAL SER O MESMO DO DASH FATURAMENTO ANALITICO.
APOS VERIFICACOES DEIXAMOS O SELECT DESTA TELA DE ACORDO E VALIDADO.