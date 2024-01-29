def fibonacci(qtde):

  fib=[]
  fib.append(0)
  fib.append(1)

  for indice in range(2,qtde):
    fib.append(fib[indice-1]+fib[indice-2])

  print(fib)

  return fib


fibonacci (8)


vetor = [1,2,3,4,5]
print(f'Resultado: {vetor[::-1]}')

s=0
for x in range(1,20,3):
  s=s+x
print('Soma = ',s)

objetos = ['Abajur','Criado','Cadeira','Mesa','Tv']
for objeto in objetos:
  print(objeto)