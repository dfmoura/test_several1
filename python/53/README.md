# Análise Estatística com NumPy

Este é um pequeno script em Python que realiza uma análise estatística básica em uma lista de listas usando a biblioteca NumPy. O código calcula a média e o desvio padrão ao longo do eixo 1 da matriz bidimensional.

## Requisitos

Certifique-se de ter a biblioteca NumPy instalada no seu ambiente Python. Caso não tenha, você pode instalá-la utilizando o seguinte comando:

```bash
pip install numpy
```

## Código

```python
import numpy as np

# Lista de dados bidimensional
lista_completa = [[20, 19.5], [20, 19.7],[20,20.2],[20,20.1],[21,19.9],[21,20.7],[21,21.2],[21,21.5],[25,25.5],[25,24.7],[25,25.2],[25,24.1]]

# Calcula a média e o desvio padrão ao longo do eixo 1
media = np.mean(lista_completa, axis=1)
desv_padr = np.std(lista_completa, axis=1)

# Exibe os resultados
for i, (avg, std) in enumerate(zip(media, desv_padr), 1):
    print(f"Lista {i}: Valor Médio = {avg:.2f}, Desvio Padrão = {std:.2f}")
```

## Explicação

1. **Importação da Biblioteca NumPy:**
   ```python
   import numpy as np
   ```
   Importa a biblioteca NumPy e a renomeia como `np` para facilitar o uso.

2. **Definição da Lista de Dados:**
   ```python
   lista_completa = [[20, 19.5], [20, 19.7],[20,20.2],[20,20.1],[21,19.9],[21,20.7],[21,21.2],[21,21.5],[25,25.5],[25,24.7],[25,25.2],[25,24.1]]
   ```
   Define uma lista bidimensional `lista_completa` contendo pares de valores.

3. **Cálculo da Média e Desvio Padrão:**
   ```python
   media = np.mean(lista_completa, axis=1)
   desv_padr = np.std(lista_completa, axis=1)
   ```
   Calcula a média e o desvio padrão ao longo do eixo 1 da matriz bidimensional.

4. **Exibição dos Resultados:**
   ```python
   for i, (avg, std) in enumerate(zip(media, desv_padr), 1):
       print(f"Lista {i}: Valor Médio = {avg:.2f}, Desvio Padrão = {std:.2f}")
   ```
   Itera sobre os resultados e exibe o valor médio e o desvio padrão para cada lista dentro da matriz bidimensional.

Este código é útil para realizar uma rápida análise estatística em conjuntos de dados bidimensionais, fornecendo informações resumidas sobre tendência central e dispersão.