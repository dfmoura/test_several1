# main.py

lista = [True, 1, 1.1, 1 + 2j, 'Teste', b'bytes', [1,2,3],(1,2),{1:'a'}]
for elemento in lista:
    print(type(elemento))

tupla = ('01','02','03')
(janeiro, fevereiro, marco) = tupla
print(janeiro)
print(fevereiro)
print(marco)