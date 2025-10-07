# Algoritmo de Busca Gulosa - Mochila Fracionada

Este projeto implementa o algoritmo de busca gulosa para resolver o problema da mochila fracionada em Python, utilizando Docker para containerização.

## Descrição do Problema

O problema da mochila fracionada é um problema clássico de otimização onde:
- Temos N itens, cada um com um peso e um valor
- Temos uma mochila com capacidade W
- Podemos quebrar itens (mochila fracionada) para maximizar o valor total
- O objetivo é encontrar a combinação de itens que maximize o valor total sem exceder a capacidade

## Estratégia do Algoritmo Guloso

O algoritmo utiliza a seguinte estratégia:
1. **Ordenação**: Ordena os itens por densidade de valor (valor/peso) em ordem decrescente
2. **Seleção**: Sempre escolhe o item com maior densidade disponível
3. **Fração**: Se necessário, quebra o item para caber na capacidade restante

## Arquivos do Projeto

- `knapsack_greedy.py`: Implementação principal do algoritmo
- `Dockerfile`: Configuração para containerização
- `requirements.txt`: Dependências do projeto
- `README.md`: Documentação do projeto

## Como Executar

### Opção 1: Executar diretamente com Python
```bash
python3 knapsack_greedy.py
```

### Opção 2: Executar com Docker
```bash
# Construir a imagem
docker build -t mochila-gulosa .

# Executar o container
docker run mochila-gulosa
```

### Opção 3: Executar com Docker (modo interativo)
```bash
# Executar o container em modo interativo
docker run -it mochila-gulosa /bin/bash

# Dentro do container, executar:
python3 knapsack_greedy.py
```

## Exemplo de Saída

```
ALGORITMO DE BUSCA GULOSA - MOCHILA FRACIONADA
=======================================================

EXEMPLO BÁSICO - MOCHILA FRACIONADA
========================================

Itens disponíveis:
  Item(Item D, peso=5.0, valor=30.0, densidade=6.00)
  Item(Item A, peso=10.0, valor=60.0, densidade=6.00)
  Item(Item E, peso=15.0, valor=90.0, densidade=6.00)
  Item(Item B, peso=20.0, valor=100.0, densidade=5.00)
  Item(Item C, peso=30.0, valor=120.0, densidade=4.00)

Capacidade da mochila: 50.0

============================================================
SOLUÇÃO DA MOCHILA FRACIONADA (BUSCA GULOSA)
============================================================
Capacidade da mochila: 50.00
Valor total obtido: 280.00

Itens selecionados:
------------------------------------------------------------
Item             Peso     Valor    Fração   Peso Usado   Valor Obtido
------------------------------------------------------------
Item D           5.00     30.00    1.00     5.00         30.00
Item A           10.00    60.00    1.00     10.00        60.00
Item E           15.00    90.00    1.00     15.00        90.00
Item B           20.00    100.00   1.00     20.00        100.00
------------------------------------------------------------
TOTAL                           50.00        280.00
============================================================
```

## Complexidade do Algoritmo

- **Tempo**: O(n log n) - devido à ordenação dos itens
- **Espaço**: O(n) - para armazenar os itens ordenados

## Vantagens da Busca Gulosa

1. **Simplicidade**: Algoritmo fácil de implementar e entender
2. **Eficiência**: Complexidade temporal baixa
3. **Optimalidade**: Para a mochila fracionada, sempre encontra a solução ótima
4. **Intuição**: A estratégia é intuitiva (sempre escolher o melhor item disponível)

## Limitações

- Funciona apenas para a mochila fracionada (onde podemos quebrar itens)
- Para a mochila 0/1 (sem quebrar itens), a busca gulosa não garante a solução ótima
