import bisect

numeros = [1, 3, 5, 9, 11, 20]
valor = 7

bisect.insort(numeros, valor)
print(numeros)


#[1, 3, 5, 7, 9, 11, 20]
