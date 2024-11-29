# Objetivos
```markdown
Objetivo: Demonstrar agrupamento de nova classificação por categorias no gasto fixo.
```

### 1. Log's Execução

#### 1.1. 25/01/2024 20:40 as 23:40

GM - Categoria GF - 1) Preparação de acessa a nova tela a partir de botão criado chamado 'Analise por Categoria', neste local ficava somente um link 'Evolução por Natureza', adaptamos o espaço e substituimos por dois botões, o 'Evolução por Natureza' permanece com sua função já existente, o 'Analise por Categoria GF' será direcionado para o novo nivel. 2) Neste novo nivel criamos um componente de tabela agrupa as datas de lançamentos contábeis existentes por mês/ano. *Este será um ponto de opção que o usuario poderá filtrar o periodo por este componente ou pelo paramentro de periodo que ja exite no dash.* 3) Logo abaixo criamos um gráfico de pizza que demonstra o agrupamento das categorias criadas no plano de contas, para as contas que são custo fixo: - Operacional - Não Operacional - Variavel - Não Classificado (quando o plano de contas não tiver classificação). 4) E por fim, criamos um componente que demonstra a partir do click na pizza o detlhamento dos lançamentos contábeis inerentes a categoria clicada na pizza.

#### 1.2. 26/01/2024 07:00 as 11:30

GM - Categoria GF - 5) Iniciamos os teste configurando os argumentos no select para cada componente associado ao componente principal de periodo, (de modo cada evento seja predecessor a um evento subsequente). 6)Configuramos o click no componente de periodo, que salva um arumento de 'mes/ano' e atualiza o componente de pizza. 7)Configuramos esse componente de pizza para receber este argumento de 'mes-ano' e refletir com atualização e configuramos tambem a pizza que ao clicar repassa um argumento de periodo e tipo de categoria para ser atualizada no componente de tabala na sequencia com o detalhamento dos lançamentos contábeis. 8)Por fim configuramos este componente de tabela para receber este argumentos da pizza e atualizar a informação recebida *Instruimos o usuario para o preechimento dos campos Representa Custo Fixo? / Tipo de Custo Fixo: no plano de contas.

#### 1.3. 29/01/2024 08:30 as 09:00

GM - Categoria GF - Foi removido um componente que anteriormente consolidava os períodos e, em seu lugar, foi efetuada configuração do filtro de período do nível, nos paramentros de período do dash.

#### 1.4. 02/01/2024 08:30 as 12:30
```markdown
GM - Categoria GF - 1) Foi realizado um aprimoramento no nível principal do Dash, especificamente na coluna de "GASTO FIXO", mediante a atualização do seletor do gasto fixo. Esta atualização reproduz a estrutura utilizada no "DRE Gerencial", incorporando ainda o filtro adicional PLA.AD_REPCUSFIXO = 'S'. 2) Além disso, efetuou-se a replicação desta atualização no seletor em nível Level1_GF, abrangendo todos os componentes pertencentes a este nível.

```

#### 1.4. 02/01/2024 13:30 as 18:30
```markdown
GM - Categoria GF - 3) Prosseguindo com a atualização, foi realizada a replicação das modificações no seletor para os demais níveis hierárquicos inferiores, abrangendo os respectivos componentes. Essa replicação engloba os níveis Level1_GF1, Level2_GF e Level3_GF, garantindo assim a uniformidade e consistência das alterações em toda a estrutura do Dash.

```