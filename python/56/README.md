# Criar um programa em Python utilizando Docker

## Objetivo do programa:
Armazenar movimentação financeira pessoal, no qual o usuário irá entrar com valores de data, valor, categoria de despesa ou receita, tipo de categoria (orçado ou real) em uma tabela. O programa deve gerar uma visão consolidada da informação por dia, mês e ano, categoria e tipo.



## Comandos Docker:

```bash
docker build -t financial-transactions .
docker run -p 5001:5000 financial-transactions
```