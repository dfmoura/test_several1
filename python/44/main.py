noVerificados = 0
noMultiplos = 0

for numero in range(20):
  noVerificados += 1
  if (numero % 3 ) == 0:
    noMultiplos += 1

print(noVerificados)
print(noMultiplos)