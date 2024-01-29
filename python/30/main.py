i = 0
while i<3:
    print('Mensagem impressa')
    i+=1
print('Estou fora do bloco\n')

cont = 1
while cont<=3:
    print(str(cont)+'a execução do laço')
    cont +=1
print('Estou fora do bloco\n')

conta = 5
while conta>=1:
    print('Imprimindo',(5-conta+1),'mensagem')
    conta-=1
print('Estou fora do bloco\n')

conti=1
while True:
    print(str(conti)+'a execução do while!')
    conti+=1
    if(conti>3):
        break
print('Execução do while acabou\n')

conto=1
while conto<10:
    conto+=1
    if(conto%2==1):
        continue
    print(conto)
print('Estou fora do bloco\n')

test = 1
soma = 0
print('Interação do while \tCondição Testada\ttest\tsoma')
while test<=10:
    soma += test
    status = test<=10
    print (str(test)+'a vez\t\t\t\t\t'+str(status)+'\t\t\t\t\t'+str(test)+'\t\t'+str(soma))
    test +=1
status = test<=10
print('Fim do while\t\t\t'+str(status)+'\t\t\t\t\t'+str(test)+'\t\t'+str(soma))
print('\n')

controle=1
while controle==1:
    nume = int(input('Digite quantos elementos você quer imprimir: '))
    a,b=0,1
    conte = 2
    print('Sequencia de Fibonacci')
    print(a,b, end=" ")
    while conte<nume:
        a,b=b,a+b
        print(b,end=" ")
        conte+=1
    print()
    controle = int(input('Digite 1 para continuar ou 0 para parar: '))
print('\n')

j,k = 0,1
while j<=14:
    if(j%2)==1:
        print(j)
    j,k=k,j+k
    
def xpto(n1,n2):
    while n1!= n2:
        if n1 < n2:
            n2 = n2 - n1
        else:
            n1 = n1 - n2
    return n1

res = xpto(50,5)
print(res)