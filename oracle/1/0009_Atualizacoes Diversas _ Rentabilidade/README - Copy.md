# Objetivos
```markdown

1.1) Adicionar o valor vendido no nivel inferior do gasto variavel.
1.2) Adicionar uf origem e uf destino em componente de tabela do nivel inferior do gasto variavel.


1.3) Adicionar o ST e IPI dos itens ao valor faturado em todos componentes. Vi aqui que o ST e IPI somam ao total da nota, então precisamos somar ao valor faturado também.
1.4) Apresentar o mês e ano na legenda do gráfico de evolução de gasto FIXO
1.5) Mês 11 - Nat de outros adiantamentos, apresenta valor de 98,00 porém com duplo clique se abre a tabela analítica que apresenta 30947,75. Apurar a divergência e corrigir
1.6) Esse é o gráfico de evolução do investimento (componente lucro do grafico). Adicionar evento para abrir a tabela analítica que mostra as despesas
1.7) Aqui no gráfico também, criar evento para abrir a tabela analítica
```
     
### 1. Log's Execução
#### 1.1. 04/01/2024 20:00 as 22:10
```markdown
GM - Custo x Rentabilidade - Incluímos o montante vendido na cláusula SELECT do nível mais baixo dos gastos variáveis, proporcionando uma visão mais abrangente dos dados. Além disso, acrescentamos as unidades federativas de origem e destino em um componente de tabela no mesmo nível dos gastos variáveis.

```

#### 1.2. 05/01/2024 07:00 as 11:30
```markdown
1.3) No comando SELECT, é importante destacar que o campo de valor de faturamento já abrange tanto os valores de Substituição Tributária (ST) quanto Imposto sobre Produtos Industrializados (IPI).

1.4) Aprimoramos a apresentação no gráfico de evolução do gasto fixo, corrigindo a exibição do campo 'Mês/Ano' para formato de texto. Essa modificação permite uma visualização mais clara e precisa das informações temporais.

1.5) Introduzimos a cláusula 'is null' no bloco WHERE do nível inferior. Com essa implementação, ao realizar um duplo clique no nível superior, será possível visualizar detalhadamente o respectivo valor, aprimorando a usabilidade e a compreensão dos dados.

1.6) Efetuamos a duplicação do nível 'Resultado3' com os ajustes necessários no comando SELECT, incluindo argumentos no WHERE. Além disso, implementamos um evento no gráfico para facilitar o acesso a esse componente, proporcionando uma navegação mais eficiente e intuitiva.

1.7) Acrescentamos um evento em pizza, possibilitando o acesso direto à tabela analítica. Essa adição visa otimizar a interação do usuário, permitindo uma transição fluida entre diferentes visualizações de dados.




```

