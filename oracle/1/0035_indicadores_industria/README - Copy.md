# Objetivos
```markdown

"Estoque de embalagens (R$)
Estoque de materia prima (R$)
Estoque de devolvidos (R$)
Estoque de acabado (R$)

Último dia do mês, número travado, mostrar evolução nos meses. Retiro da tela ""Posição de estoque retroativa"". Olho apenas matriz

Exemplo: Figura 1 do email"
"Diferença produção (planejado x realizado)

Último dia do mês, número travado, mostrar evolução nos meses. % Quantidade realizada/ quantidade planejada. Retiro da tela ""Dash produção"".

Exemplo: Figura 2 do email"
"% Média frete (Entregas)

Último dia do mês, número travado, mostrar evolução nos meses. % valor de frete/valor de nota. Retiro da tela ""ordens de carga"". Apenas matriz, apenas fretes contratados (excluir Araxá)

Exemplo: Figura 5 do email"
"% Média frete (Compras MP)
% Média frete (Compras Embalagens)

Último dia do mês, número travado, mostrar evolução nos meses. % valor de frete/valor de nota. Retiro da tela ""portal de compras"".

Exemplo: Figura 6 do email"



"Controle de justificativas para o realizado do periodo

Criar tabela para registros das justificativas, contendo:
Dt. Referencia, C.R, Categoria, Usuário Inclusão e Justificativa

- Apresentar a justificativa/observação no dahs industriais ID 87, 88, 89, 90 e 91
- Viabilizar a inclusão da justificativa atravez do próprio dash
     - Com um clique sobre o gráfico do dash (nível principal), deve-se abrir uma tabela que apresente as justificativas do periodo
     - O dash deve apresentar apenas as justificativas com a categoria igual a categoria do dash, ou seja, a categoria corresponde a um dashboard, sendo assim a justificativa a ser informada corresponde a análise e contexto que o dash apresenta
     - Criar um botão de ação na tabela de justificativas para possibilitar incluir/alterar a justificativa
          - Incluir a justificativa acompanhada do C.R, Dt. Referência, Categoria e Usuário de Inclusão"

 


```

### 1. Log's Execução

#### 1.1. 15/04/2024 14:00 as 18:30
```markdown

Satis - Indicadores Industriais - Desenvolvimento dos principais parâmetros do painel de controle, onde o primeiro parâmetro é o 'Estoque Tipo', que engloba o valor e a quantidade do estoque, definido da seguinte forma: Matéria-Prima: Grupo de Produtos Matéria-Prima (3010000); Embalagem: Grupo de Produtos Embalagens (3020000); Produto Acabado: Todos os Grupos, exceto a LINHA BIO (1020000) e codloca (102,103); Produto Devolvido: Todos os Grupos, exceto a LINHA BIO (1020000) e codlocal (104).
O segundo parâmetro é o 'Frete Compras', que se refere à porcentagem encontrada de frete por nota fiscal para: Matéria-Prima de acordo com a natureza 2020101 e CR 402000000;
Embalagens de acordo com as naturezas (2020601,2020602) e CR = 402000000.

```


#### 1.1. 15/04/2024 20:00 as 23:40
```markdown
Satis - Indicadores Industriais - Iniciamos agora a elaboracao do primeiro comando de select, no qual, a partir dos parâmetros fornecidos de data inicial e final, é recuperada a última data de cada mês dentro desse intervalo de datas. 
```

#### 1.1. 16/04/2024 08:00 as 12:00
```markdown
Satis - Indicadores Industriais - A partir das últimas datas extraídas com base nos parâmetros do intervalo de datas, foi desenvolvido outro comando de select para iterar através de cada data e obter informações sobre o valor e a quantidade do estoque. Esses dados são então utilizados na apresentação gráfica, permitindo uma visualização dinâmica e detalhada da evolução do estoque ao longo do tempo. 
```

#### 1.1. 16/04/2024 13:00 as 18:30
```markdown
Satis - Indicadores Industriais - Após a conclusão do comando de select iniciado anteriormente, prosseguimos com a criação dos gráficos de valor e quantidade do estoque, conforme os respectivos resultados obtidos no select anterior, que identifica a posição da última data de cada mês dentro do intervalo especificado. Esses gráficos fornecem uma representação visual clara e detalhada da variação do estoque ao longo do tempo, permitindo uma análise abrangente das tendências e padrões de armazenamento. 
```
#### 1.1. 16/04/2024 21:00 as 23:30
```markdown
Satis - Indicadores Industriais - Na sequência, iniciamos a criação de um novo comando de seleção, desta vez com base na ordem de carga, com o propósito de recuperar informações sobre o frete em relação ao valor da nota referente às entregas realizadas pela empresa. Esse processo visa extrair dados relevantes sobre os custos de transporte associados a cada transação de carga, proporcionando uma análise detalhada da eficiência logística e dos gastos operacionais relacionados ao transporte de mercadorias. 
```

#### 1.1. 17/04/2024 08:00 as 11:30
```markdown
Satis - Indicadores Industriais - Continuando com o desenvolvimento da tarefa anterior, estamos atualmente em processo de elaboração do comando select com base na ordem de carga. Este estágio envolve a configuração detalhada do select para recuperar as informações relevantes sobre o frete em relação ao valor da nota referente às entregas da empresa. Neste momento, estamos refinando os parâmetros e otimizando o código para garantir uma recuperação precisa e eficiente dos dados necessários. Assim que concluído, este select será integrado ao fluxo de trabalho. 
```

#### 1.1. 17/04/2024 13:00 as 18:30
```markdown
Satis - Indicadores Industriais - Seguindo a continuidade da etapa anterior, estamos atualmente em meio ao processo de implementação do comando de seleção baseado na ordem de carga. Este estágio envolve uma análise minuciosa dos requisitos e parâmetros necessários para recuperar com precisão as informações relevantes sobre o frete em relação ao valor da nota referente às entregas realizadas pela empresa. Estamos dedicando recursos para otimizar o código e garantir sua eficiência operacional. 
```

#### 1.1. 17/04/2024 20:30 as 22:30
```markdown
Satis - Indicadores Industriais - Após uma revisão cuidadosa do comando de select, levando em consideração as especificações do select da tela de ordens de carga, finalizamos esta etapa com sucesso. O select foi refinado para recuperar com precisão as informações necessárias sobre o frete em relação ao valor da nota referente às entregas da empresa.  
```
#### 1.1. 18/04/2024 08:00 as 11:00
```markdown
Satis - Indicadores Industriais - Após a conclusão bem-sucedida da implementação do select no componente gráfico, avançamos para a próxima fase do projeto. Nesta etapa, iniciamos a criação de um novo comando de seleção voltado para os fretes de compras, com base nas categorias de matéria-prima e embalagens. Durante este processo, foram alinhados alguns aspectos com o usuário responsável para garantir a conformidade com os requisitos específicos. Com a finalização desta etapa, prosseguimos para a integração do novo select ao gráfico do dashboard.  
```
#### 1.1. 18/04/2024 13:00 as 16:00
```markdown
Satis - Indicadores Industriais - A seguir, desenvolvemos uma tabela que irá compor as 11 situações de meta estipuladas, contemplando diferentes aspectos do estoque e dos fretes. Esta tabela inclui métricas como o valor do estoque de matéria-prima, o valor do estoque de embalagens, o valor do estoque de produtos acabados, o valor do estoque devolvido, a quantidade de matéria-prima em estoque, a quantidade de embalagens em estoque, a quantidade de produtos acabados em estoque, a quantidade de produtos devolvidos em estoque, a média percentual do frete em relação às entregas, a média percentual do frete nas compras de matéria-prima e a média percentual do frete nas compras de embalagens.

Com base neste cenário de metas criado, associamos os selects dos gráficos com esta nova tabela de metas. Em cada gráfico, adicionamos uma linha representando a meta estipulada, permitindo assim a comparação visual entre o desempenho real e as metas definidas.

```

#### 1.1. 18/04/2024 16:00 as 18:30
```markdown
Satis - Indicadores Industriais - Foi implementada uma tabela filha adicional à estrutura da tabela de metas, com a finalidade de registrar informações complementares. Esta nova tabela conta com campos específicos para armazenar a justificativa associada a cada tipo de meta, bem como o usuário responsável pela inclusão e a data correspondente. A finalidade primordial desta extensão é possibilitar o registro detalhado das razões subjacentes às metas estabelecidas, em consonância com o período de referência pertinente.

```



#### 1.1. 19/04/2024 8:00 as 12:00
```markdown
Satis - Indicadores Industriais -Damos início ao processo de desenvolvimento com o objetivo de capacitar o usuário a realizar justificativas diante de desvios em relação às metas estabelecidas. Como parte desse esforço, incorporamos ao código a funcionalidade de permitir justificativas para as 11 situações de desvio de meta identificadas. Isso proporciona aos usuários uma abordagem sistemática para explicar e documentar as razões por trás de qualquer desvio, promovendo transparência e facilitando o processo de análise e tomada de decisão.

```

#### 1.1. 19/04/2024 13:00 as 18:00
```markdown
Satis - Indicadores Industriais - Configuramos o código para permitir que o usuário inclua apenas registros de justificativa, sem a capacidade de realizar edições posteriores. Essa configuração visa garantir a integridade dos dados, mantendo um histórico imutável das justificativas fornecidas. Além disso, dentro das configurações do código, estabelecemos que cada situação de meta corresponda a um argumento específico. Esse argumento atua como um índice de visualização, facilitando a identificação e diferenciação entre os diversos tipos de metas selecionadas pelo usuário.

```


#### 1.1. 22/04/2024 08:00 as 12:00
```markdown
Satis - Indicadores Industriais - Após a configuração do código para restringir o usuário a incluir apenas registros de justificativa, sem a capacidade de fazer edições posteriores, observamos uma melhoria significativa na integridade dos dados. Agora, cada entrada representa uma justificativa única e imutável, fornecendo um histórico claro e confiável das razões por trás das ações tomadas. Além disso, ao associar cada situação de meta a um argumento específico dentro das configurações do código, alcançamos uma organização mais refinada e uma melhor compreensão das diferentes metas selecionadas pelos usuários. Esses argumentos atuam como índices visuais distintos, facilitando a identificação e diferenciação entre as várias categorias de metas, tornando o processo de análise e acompanhamento mais eficiente e intuitivo.
```

#### 1.1. 22/04/2024 14:00 as 15:00
```markdown
Satis - Indicadores Industriais - Realizamos a reunião de apresentação e revisão dos indicadores industriais com Edson e Maicon. Decidimos revisar a apresentação dos gráficos, removendo os rótulos das colunas para uma visualização mais limpa e eficiente. Além disso, concordamos em aprimorar o filtro de dados no gráfico de Planejado x Realizado, adotando o mesmo modelo de seleção utilizado no painel de produção do dashboard como referência.
```


#### 1.1. 22/04/2024 16:00 as 18:30
```markdown
Satis - Indicadores Industriais - Efetuamos ajustes nos gráficos do painel, removendo os rótulos de valores das colunas para aprimorar a clareza visual e a usabilidade. Além disso, iniciamos o processo de substituição do filtro de dados atual no gráfico de Produção - Planejado x Realizado, adaptando-o para utilizar o mesmo mecanismo de select empregado no dash de produção. Este refinamento visa não apenas garantir consistência na interface, mas também facilitar a interação dos usuários com os dados apresentados.
```

#### 1.1. 23/04/2024 8:00 as 11:30
```markdown
Satis - Indicadores Industriais - Prosseguimos com o processo de adaptação do select do dash de produção para ser integrado ao gráfico de Produção - Planejado x Realizado do dash indicadores indutriais. Este trabalho visa garantir uma transição fluida e consistente entre os diferentes elementos do dashboard, proporcionando uma experiência de usuário mais intuitiva e eficiente. A implementação dessa integração está sendo realizada com cuidado para assegurar a precisão dos dados e a funcionalidade adequada do novo filtro de seleção.
```

#### 1.1. 23/04/2024 12:30 as 14:30
```markdown
Satis - Indicadores Industriais - Concluímos com sucesso a adaptação do filtro de seleção do painel de produção para o gráfico de Produção - Planejado x Realizado. Após meticulosa implementação e testes, garantimos a integridade dos dados e a funcionalidade perfeita do novo filtro. Este avanço fortalece a coerência e a eficácia do dashboard, proporcionando aos usuários uma experiência aprimorada na análise e no monitoramento dos indicadores industriais.
```
