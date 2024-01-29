numPrimos = []

for numero in range(20):
  div = 0
  for divisor in range(1, numero + 1):
    if(numero % divisor ) ==0:
      div += 1
  if div == 2:
    numPrimos.append(numero)

print(numPrimos)