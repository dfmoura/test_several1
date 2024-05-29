# Objetivos
```markdown

Diogo bom dia, beleza ?
bom dia!!
joia
Cara tava analisando o dash de análise de crédito
Quando o cliente não tem movimento no financeiro ele não aparece, e pra Fabiene é importante mesmo que ele não tenha movimento
Certo irei verificar
Pensando nisso teria que inverter a consulta né buscar parceiro primeiro e depois o financeiro né ?
Hoje busca dados do financeiro e depois parceiro
	
```


### 1. Log's Execução


#### 1.1. 27/05/2024 09:00 as 12:00
```
SATIS - Dash Analise de credito - Para atender à demanda de apresentar também os parceiros que não possuem movimentação financeira, mantivemos a consulta original e adicionamos um UNION ALL com outra consulta. Esta segunda consulta obtém a posição dos parceiros clientes matriz, excluindo aqueles já presentes na consulta original.
```

#### 1.2. 27/05/2024 13:00 as 18:00
```
SATIS - Dash Analise de credito - Foi atualizada a consulta do cartão de pontualidade (que apresenta a média de dias de atraso) para calcular a quantidade de dias de atraso médio a partir da soma total dos dias de atraso dividida pelo total de registros. A função agregadora de média estava causando divergências nos valores, enquanto o cálculo normal forneceu o valor correto, que pode ser visualizado no próximo nível de detalhamento após clicar no cartão.

```


#### 1.3. 27/05/2024 08:00 as 10:00
```
SATIS - Dash Analise de credito - Realizamos uma adequação no select do cartão de pontualidade e seu respectivo nível de detalhamento, atualizando a segunda parte do UNION ALL para não apresentar registros caso a primeira parte tenha registros. Para isso, utilizamos uma cláusula CASE com uma subconsulta para verificar a existência de registros na primeira parte, e adicionamos uma cláusula WHERE NOT EXISTS na segunda parte do UNION ALL. A subconsulta dentro do NOT EXISTS é a mesma que a primeira parte do UNION ALL, verificando se há registros que atendam aos critérios. Assim, a segunda parte do UNION ALL só será executada e incluirá registros se não houver nenhum registro na primeira parte.

```