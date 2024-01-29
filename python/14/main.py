# main.py

#   0   1   2   3   4   5   6   7   8   9   10  11
L=['U','N','I','V','E','R','S','I','D','A','D','E']
#  -12 -11 -10 -9  -8  -7  -6  -5  -4  -3  -2  -1

print(L[:]) #lista completa
print(L[3:12]) # entre 3 e 12
print(L[3:6]) #entre 3 e 6
print(L[-3:11]) # entre o -3 e 11
print(L[:-3]) # do indice -3 até o inicio
print(L[::-1]) # inverter totalmente a lista
print(L[-2::-1]) #passa a operar como se fosse um indice positivo
print(L[-2:1:-1]) # o valor positivo,que trabalha no centro (antiga direita) da notação de fatiamento, passa a operar como se fosse um ínice negativo
print(L[1: :3])#espaco no meio significa o enésimos elementos da lista