#Contador Regressivo em Python

Este é um simples script em Python que cria uma contagem regressiva no console, exibindo o tempo restante em minutos e segundos no formato MM:SS. O contador começa a partir de um número especificado de segundos e é atualizado a cada segundo.

##Pré-requisitos

Certifique-se de ter o Python instalado em seu sistema. O script foi testado nas versões do Python 3.

##Como usar

    Baixe o script contador.py para o seu sistema.

    Abra um terminal ou prompt de comando.

    Navegue até o diretório em que o script está localizado.

    Execute o script usando o comando:

    bash

    python contador.py

    Certifique-se de substituir python pelo comando correto se estiver usando uma versão específica do Python (por exemplo, python3).

O script começará uma contagem regressiva de 10 segundos por padrão, mas você pode ajustar o valor passando um argumento para a função contador. Por exemplo:

python

contador(30)  # Inicia uma contagem regressiva de 30 segundos

##Funcionamento do Script

    Importação de Módulos: O script utiliza os módulos time e sys para funcionalidades relacionadas ao tempo e manipulação da saída padrão, respectivamente.

    Definição da Função contador: A função contador aceita um parâmetro segundos e inicia um loop que itera de 0 até segundos - 1.

    Cálculo de Minutos e Segundos: Dentro do loop, os minutos e segundos restantes são calculados usando a função divmod e formatados em uma string no formato MM:SS.

    Exibição no Console: A string formatada é impressa no console substituindo a linha anterior (end="\r"), e o buffer de saída é limpo para garantir uma exibição imediata.

    Atraso de 1 Segundo: O script pausa a execução por 1 segundo usando time.sleep(1) antes de continuar para a próxima iteração do loop.

    Chamada da Função com Valor Padrão: Finalmente, a função contador é chamada com um valor padrão de 10 segundos. Você pode ajustar esse valor conforme necessário.

Esperamos que este simples script seja útil para criar contagens regressivas em situações diversas!


# Detalhamento do Código

Este código Python implementa um contador regressivo simples no console, exibindo o tempo restante em minutos e segundos no formato MM:SS. Aqui está uma explicação do código:

## Importação de Módulos:

```python
import time
import sys
```

- **time:** Módulo que fornece funcionalidades relacionadas ao tempo.
- **sys:** Módulo que fornece acesso a algumas variáveis usadas ou mantidas pelo interpretador Python, e a funcionalidades relacionadas ao sistema.

## Definição da Função `contador`:

```python
def contador(segundos):
```

- Uma função é definida chamada `contador` que aceita um argumento `segundos`.

## Loop For para Contagem Regressiva:

```python
for i in range(segundos):
```

- Inicia um loop for que itera de 0 até `segundos - 1`. Representa o tempo total de contagem regressiva.

## Cálculo de Minutos e Segundos:

```python
min, seg = divmod(segundos - i, 60)
```

- Usa a função `divmod` para calcular os minutos e segundos restantes. `divmod(x, y)` retorna uma tupla contendo o quociente e o resto da divisão de x por y. Aqui, `min` representa os minutos e `seg` representa os segundos.

## Formatando a String de Texto:

```python
texto = f"{min:02d}:{seg:02d}"
```

- Cria uma string formatada usando uma f-string, garantindo que os valores de minutos (`min`) e segundos (`seg`) tenham pelo menos dois dígitos, preenchendo com zero à esquerda, se necessário.

## Exibição no Console:

```python
print(texto, end="\r")
```

- Imprime a string `texto` na mesma linha, substituindo a linha anterior no console. O argumento `end="\r"` move o cursor de volta para o início da linha.

## Limpeza do Buffer de Saída:

```python
sys.stdout.flush()
```

- Limpa o buffer de saída, garantindo que a mensagem seja exibida imediatamente no console.

## Pausa de 1 Segundo:

```python
time.sleep(1)
```

- Pausa a execução do programa por 1 segundo antes de continuar para a próxima iteração do loop.

## Chamada da Função com Valor Padrão:

```python
contador(10)
```

- Chama a função `contador` com um valor padrão de 10 segundos. Você pode ajustar esse valor conforme necessário.

Este script cria uma experiência visual de contagem regressiva em tempo real no console, atualizando a cada segundo até atingir zero.
