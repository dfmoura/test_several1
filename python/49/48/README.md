Vamos analisar o código passo a passo:

1. **Primeiro bloco de código:**
   ```python
   varA = 3
   varB = 0
   for num in range(varA):
     varB += num ** 2
     print(varB, num)
   ```
   Neste trecho, um loop for é usado para iterar de 0 a 2 (já que `range(varA)` cria uma sequência até `varA-1`). Dentro do loop, a variável `varB` é atualizada com o quadrado do valor atual de `num`. Em cada iteração, o valor de `varB` e `num` é impresso.

2. **Segundo bloco de código:**
   ```python
   lista=["abacaxi", "maça", "uva", "melão"]
   for fruta in lista:
     qtdeLetras = 0
     for letras in fruta:
       qtdeLetras += 1
     print(fruta, qtdeLetras)
   ```
   Aqui, um loop for itera sobre uma lista de frutas. Para cada fruta, outro loop é usado para contar o número de letras na fruta. O nome da fruta e a quantidade de letras são então impressos.

3. **Terceiro bloco de código:**
   ```python
   dados = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
   for linha in dados:
     for coluna in linha:
       print(coluna)
   ```
   Este trecho percorre uma lista de listas (matriz). Para cada linha, itera sobre os elementos da linha (colunas) e imprime cada valor.

4. **Quarto bloco de código:**
   ```python
   tabela = []
   contador = 1
   for linha in range(3):
     for coluna in range(3):
       contador += 1
       tabela.append(contador)
     print(tabela)
   ```
   Aqui, um loop duplo é utilizado para criar uma tabela (uma lista de listas). O contador é incrementado a cada iteração do loop interno, e o valor é adicionado à lista `tabela`. A lista completa é impressa após cada linha.

5. **Quinto bloco de código:**
   ```python
   tabela = []
   contador = 0
   for i in range(3):
     linha = []
     for j in range(3):
       contador += 1
       linha.append(contador)
   print(tabela)
   ```
   Semelhante ao bloco anterior, este cria uma tabela, mas desta vez cada linha é uma lista separada. No final, a lista completa é impressa fora do loop interno, resultando em uma lista contendo três sub-listas.

6. **Sexto bloco de código:**
   ```python
   for numerador in range(10):
     print("Tabuada do número", numerador+1)
     for multiplicador in range(10):
       print((numerador+1)*(multiplicador+1))
   ```
   Este trecho gera a tabuada dos números de 1 a 10. Um loop externo itera sobre os numeradores, e um loop interno itera sobre os multiplicadores, imprimindo o resultado da multiplicação.

Caso tenha mais perguntas ou precise de mais esclarecimentos, sinta-se à vontade para perguntar!