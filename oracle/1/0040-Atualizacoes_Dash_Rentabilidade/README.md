# Objetivos
```markdown

Nível de composição do custo -> Painel de custo indireto da produção
	Adicionar o percentual de variação da CIP (mês a mês)
Botão para acessar o custo indireto análitico
	Será uma tabela com todos os custos indiretos do período
	Adicionar o campo C.R no custo indireto análitico
Existe faturamento sem tipo de produto, identificar o produto e classificá-lo em um tipo
No gráfico de rentabilidade do tipo de produto, ao cliente sobre o componente de gasto variável, o nível inferior não apresenta resultados
	A tratativa do item acima pode resolver este item

Implementar um mecanismo automatizado para gerar um alerta em tempo real sempre que um produto de faturamento é registrado sem uma associação correspondente com um tipo de produto. Este alerta será enviado diretamente ao usuário responsável pelo cadastro do produto, garantindo uma ação imediata para corrigir a falta de associação. Este processo otimiza a integridade dos dados e assegura que todos os produtos de faturamento estejam devidamente classificados, facilitando uma gestão eficiente e precisa do inventário.
	
```


### 1. Log's Execução


#### 1.1. 14/05/2024 08:30 as 12:00
```
GM - Dash Gestão de Custos e Rentabilidade - No nível de composição de custos, acessado a partir do painel principal no gráfico de rentabilidade CMV/CPV, foi aprimorada a visualização através da adição de uma coluna que demonstra a variação mês a mês dos últimos 12 meses, no componente de tabela que agrupa o CIP por mês/ano. Esta coluna adicional é calculada dinamicamente, utilizando um campo no SELECT que emprega uma fórmula para recuperar o valor da linha anterior (FUNÇÃO LAG). Assim, a variação entre a linha atual e a anterior é calculada para fornecer uma análise mais detalhada e precisa da evolução dos custos ao longo do tempo.
```


#### 1.1. 14/05/2024 13:00 as 18:00
```
GM - Dash Gestão de Custos e Rentabilidade - Continuando no nível de composição de custos, acessado a partir do painel principal no gráfico de rentabilidade CMV/CPV, implementamos uma funcionalidade adicional para uma experiência mais detalhada. Agora, ao realizar um duplo clique em qualquer um dos componentes de tabela - seja a tabela agrupada por mês/ano ou por mês/ano e conta contábil - os usuários são direcionados para um nível mais profundo, apresentando uma tabela analítica detalhada dos lançamentos de custos. Além disso, realizamos uma análise mais aprofundada dos produtos de faturamento para identificar quais não possuíam o tipo de produto associado. Após identificar os produtos 3055, 2019 e 113, procedemos com a associação adequada, garantindo uma integração precisa e completa dos dados. Ao acessar o painel principal e explorar o gasto variável no gráfico de rentabilidade, notamos uma otimização necessária. No nível inferior, que exibe as informações em dois componentes de tabela, ao selecionar o custo variável no componente de tabela superior, observamos que, devido à complexidade da consulta envolvendo múltiplas recuperações de dados, pode haver uma pequena demora na resposta. No entanto, é importante destacar que os dados são apresentados corretamente, garantindo a precisão das informações. Por fim, replicamos todas essas atualizações e aprimoramentos realizados na visão contábil para a visão financeira do dashboard de rentabilidade, assegurando consistência e abrangência em toda a análise de custos e lucratividade.

```

#### 1.1. 15/05/2024 08:30 as 12:30
```
GM - Dash Gestão de Custos e Rentabilidade - Foi desenvolvido um mecanismo automatizado para gerar alertas automaticamente sempre que um produto faturado não estiver associado a um tipo de produto correspondente. A implementação foi realizada com sucesso na base de testes e aguardamos a liberação de acesso à tela 'Ações Agendadas' para replicar essa funcionalidade na base de produção.

```
