# Objetivos
```markdown
* GRÁFICO DE COMPARAÇÃO

UTILIZAR A PLANILHA DE METAS QUE A SILVANA UTILIZADA COMO GUSTO

1) NIVEL
REGISTROS
	- RELAÇÃO DE VENDEDORES
COLUNAS
	- PREVISTO E REALIZADO POR MES (APRESENTAR QTD E VALOR)
COM DUPLO CLIQUE, APRESENTAR O GRÁFICO DE COMPARAÇÃO POR MARCA DO VENDEDOR SELECIONADO
BOTÃO PARA ABRIR O GRÁFICO LINHA COM A EVOLUÇÃO DO PLANEJAMENTO DO VENDEDOR SELECIONADO


* GRÁFICO DE COMPARAÇÃO (MARCA)
BOTÃO PARA ABRIR O CONSOLIDADO POR MARCA / TABELA IGUAL AO GRÁFICO POR VENDEDOR, PORÉM AGRUPANDO POR MARCA


GRAFICO DE LINHA PARA CADAS SITUAÇÃO QTDPREV, QTDREAL, VLRPREV, VLRREAL POR CLIENTE.


```
     
### 1. Log's Execução

#### 1.1. 22/01/2024 07:00 as 11:30
```markdown

Satis - Dash Comparação Comercial - Analise de select principal para estrutura de dash comparativo comercial.
```

#### 1.2. 22/01/2024 13:00 as 14:30
```markdown

Satis - Dash Comparação Comercial - Analise de select principal para estrutura de dash comparativo comercial.
```


#### 1.3. 24/01/2024 07:30 as 12:10
```markdown

Satis - Dash Comparação Comercial - Aprimoramento da estrutura de SELECT com a inclusão de períodos de meses predefinidos, otimizados para a seleção de dados durante a safra especificada.

```

#### 1.4. 24/01/2024 13:30 as 18:40
```markdown

Satis - Dash Comparação Comercial - Conclusão da configuração do comando SELECT para o dashboard. Desenvolvimento das estruturas do dashboard, incluindo a integração do comando SELECT recém-criado nos diversos componentes do dashboard.
```


#### 1.5. 25/01/2024 08:30 as 12:00
```markdown

Satis - Dash Comparação Comercial - mplementação de correção nos filtros do comando SELECT para garantir consistência com os valores registrados na auditoria, abordando discrepâncias previamente identificadas.
```

#### 1.5. 25/01/2024 13:30 as 12:00
```markdown

Satis - Dash Comparação Comercial - Efetuação de correção em enventos que fornecem acesso aos níveis inferiores e/ou atualização de argumentos que alimentam os filtros dos select, com execução de testes finais.

```


#### 1.7. 26/01/2024 13:00 as 17:30
```markdown

Satis - Dash Comparação Comercial - Atualizações pós reunião - (25-01 - 17:00) - 1) Criação de parâmentros de periodo para safra 1 e 2. 2) Duplicação de componente de tabela de modo que ambos componentes se estabeleçam em mesmo frame. 3) Ajuste em select do segundo componente de tabela para que o mesmo retorne as informações de acordo com o parametro criado de periodo de safra 2.4) Duplicação dos componentes de tabela nos niveis de marca com a estruração de eventos e do filtro de select para retornar os dados a partir do paramentro de periodo safra 2. 5)Ajuste no nivel de grafico evolução por vendedor incluindo os graficos de volume e valor relacionado ao parametro de periodo safra 2.

```




#### 1.8. 28/01/2024 10:00 as 12:30
```markdown

Satis - Dash Comparação Comercial - Grafico Linhas Safra atual e anterior - 1) Extraímos o comando SELECT relacionado ao período atual da safra da tabela principal.
2) Adicionamos configurações a este comando SELECT para incluir colunas nulas referentes ao período anterior, especificamente para as quantidades e valores planejados e realizados. 3) Replicamos o comando SELECT configurado, modificando as colunas nulas para o período atual e revertendo os dados para o período anterior. 4) Combinamos todos os comandos SELECT usando UNION ALL. 5) Finalizamos com a configuração dos parâmetros, argumentos e formatos necessários, além de criar um campo CASE para servir como índice de ordenação dos dados e outro para nomear a interseção das informações.
```

















