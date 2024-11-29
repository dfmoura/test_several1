# Objetivos
O objetivo principal é desenvolver um dashboard dedicado à análise de vendas.

## História do Processo
O processo de desenvolvimento do dashboard para análise de vendas é delineado da seguinte maneira:

## Solução Proposta
A proposta consiste em criar um dashboard que integre diversas análises de vendas, com os seguintes componentes:

### 1. Filtros
1.1. Diversos filtros serão implementados conforme a necessidade do cliente, inicialmente incluindo:
   - Período de Negociação
   - Cliente
   - TOP de Venda (seleção múltipla)

### 2. Nível Principal do Dashboard
#### 2.1. Painel Superior
   - Gráfico de colunas por período (mês)
     - Para cada mês, serão geradas 3 colunas, representando:
       - Qtd. Notas Aprovadas
       - Qtd. Notas Recebidas (baixadas)
       - Qtd. Notas Em Aberto
     - Clicar nas colunas atualizará o painel inferior do dashboard.

#### 2.2. Painel Inferior
   - Gráfico de pizza com as formas de pagamento:
     - O resultado varia conforme a coluna e mês que o usuário clicou, apresentando as formas de pagamento das colunas de "Notas Aprovadas", "Notas Recebidas" e "Notas Aberto."
   - Gráfico de pizza de recebimento por quantidade:
     - O resultado varia conforme o mês da coluna selecionada, mostrando a quantidade de notas baixadas durante o período.
   - Gráfico de pizza de recebimento por valor:
     - O resultado varia conforme o mês da coluna selecionada, exibindo o valor total recebido (baixado) durante o período.
   - Clicar nas fatias dos gráficos de pizza levará o usuário ao segundo nível de auditoria, que apresenta todas as notas e todos os financeiros associados ao valor exibido pela fatia.

### 3. Segundo Nível do Dashboard
#### 3.1. Painel Superior
   - Tabela de notas
     - Apresenta as notas em detalhe
     - Duplo clique abre a nota na tela "Central de Vendas"

#### 3.2. Painel Inferior
   - Tabela de financeiros
     - Apresenta os financeiros em detalhe
     - Duplo clique abre o financeiro na tela "Movimentação Financeira"
     
### 4. Log's Execução
#### 4.1. 08/12/2023 07:00 as 11:00
```markdown
UT - Analise de Vendas - Organização de select principal para gerar agrupamento de total de notas canceladas, total de notas devolvidas e total de notas aprovadas. Dentro de aprovadas mostrar o total de notas recebida e notas em aberto. (Nao Concluido).
```
#### 4.2. 08/12/2023 12:00 as 17:10
```markdown
UT - Analise de Vendas - UT - Analise de Vendas - Organização de select principal para gerar agrupamento de total de notas canceladas, total de notas devolvidas e total de notas aprovadas. Dentro de aprovadas mostrar o total de notas recebida e notas em aberto.
```
#### 4.3. 09/12/2023 17:00 as 18:50
```markdown
Refatoramos a consulta SQL para obter de forma mais eficiente e precisa as informações desejadas. Primeiramente, implementamos uma reestruturação no comando SELECT, visando extrair o total de notas de devolução, notas canceladas e notas aprovadas. Para garantir a precisão dos resultados, incorporamos filtros fixos, especificamente para notas aprovadas (status 'A') e movimentação do tipo vendas ('V').

Além disso, conduzimos uma segunda consulta a partir das notas aprovadas, identificando o número de notas recebidas e as que permanecem em aberto. A união destes dois conjuntos de resultados foi então realizada para criar uma única sequência de dados abrangente.

Este conjunto de dados foi posteriormente empregado em um SELECT final, que foi otimizado para ser integrado à estrutura de componentes gráficos de barra do dashboard. Assim, finalizamos essa etapa com um processo mais refinado e eficiente de obtenção e apresentação das informações desejadas no contexto do painel visual.

É relevante ressaltar que no comando SELECT elaborado, o status recebido indica a conclusão integral do recebimento da nota fiscal. Em situações contrárias, a nota permanecerá pendente e não integralizada.
```
#### 4.4. 09/12/2023 22:00 as 00:33
```markdown
Nesta etapa, avançamos para a representação visual por meio de gráficos de pizza na seção inferior do painel principal. Desenvolvemos os gráficos intitulados 'STATUS FINANCEIRO NOTAS (QTD)' e 'STATUS FINANCEIRO NOTAS (R$)'. Para isso, ajustamos o seletor anteriormente criado para os valores 'RECEBIDOS' e 'ABERTO', transformando as colunas em linhas através do comando 'union all'. Concluímos a construção dos gráficos incorporando os selects em cada componente correspondente.

Em seguida, elaboramos um novo select que apresenta, a partir das notas aprovadas, os tipos correspondentes de títulos financeiros. Adaptamos esse select, estabelecendo uma conexão com a tabela que descreve os títulos. A finalização do gráfico 'TIPO DE TÍTULOS' ocorreu com a integração dos selects no componente apropriado.

Por fim, introduzimos parâmetros de multilista para o tipo de operação e uma lista simples para os clientes. Além disso, vinculamos eventos que, ao clicar no gráfico de barras principal, desencadearão uma atualização de informações nos gráficos de pizza.

novo componente 28_component.xml
```
#### 4.5. 10/12/2023 16:30 as 18:10
```markdown
Etapa final. Introduzimos um novo nível que incorpora dois componentes de tabela. O primeiro componente consiste no cabeçalho da nota. Implementamos uma função que permite ao usuário, ao clicar no gráfico de pizza representativo do status no nível principal, ser redirecionado para este novo estágio. Aqui, serão exibidas as informações do cabeçalho das notas aprovadas, respeitando os mesmos parâmetros dos SELECTs anteriores.

O segundo componente de tabela exibe o detalhamento financeiro para cada nota selecionada no cabeçalho. Utilizamos o mesmo SELECT relacionado às notas em aberto e recebidas, acrescentando informações financeiras adicionais para uma visão mais abrangente.

```


