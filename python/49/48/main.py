varA = 3
varB = 0
for num in range(varA):
  varB += num ** 2
  print(varB,num)


lista=["abacaxi", "maça", "uva", "melão"]

for fruta in lista:
  qtdeLetras = 0
  for letras in fruta:
    qtdeLetras += 1
  print(fruta,qtdeLetras)


dados=[ [1, 2, 3], [4, 5, 6], [7, 8, 9] ]
for linha in dados:
  for coluna in linha:
    print(coluna)


tabela = []
contador = 1
for linha in range(3):
  for coluna in range(3):
    contador += 1
    tabela.append(contador)
  print(tabela)



# d)
tabela = []
contador = 0
for i in range(3):
  linha = []
  for j in range(3):
    contador += 1
    tabela.append(contador)
print(tabela)


for numerador in range(10):
  print("Tabuada do número", numerador+1)
  for multiplicador in range(10):
    print((numerador+1)*(multiplicador+1))
