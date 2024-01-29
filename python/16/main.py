# main.py

## atribuicao valores

a = 1
print(id(a)) # ID: 140582523257280 - Valor 1 tem 1 referência (a)

b = 1
print(id(b)) # ID: 140582523257280 - Valor 1 tem 2 referências (a e b)

c = 2
print(id(c)) # ID 140582523257312 - Valor 2 tem 1 referência (c)

L = [1,1,1,1] # Valor 1 tem 7 referências (a b, c, L[0], L[1], L[2] e L[3])

print(id(L[0])) # ID: 140582523257280
print(id(L[1])) # ID: 140582523257280
print(id(L[2])) # ID: 140582523257280
print(id(L[3])) # ID: 140582523257280


print(" ")
### nomeacao variaveis....

numerodeformandos = 1500 # Todas minúsculas
NUMERODEFORMANDOS = 1500 # Todas maiúsculas
numeroDeFormandos = 1500 # Camel Case
NumeroDeFormandos = 1500 # Pascal Case
numero_de_formandos = 1500 # Snake Case
print(numerodeformandos,
NUMERODEFORMANDOS,
numeroDeFormandos,
NumeroDeFormandos,
numero_de_formandos)

#"help('keyword')"


