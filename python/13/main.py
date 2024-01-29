# main.py

op_validos = ['+','-','*','/']

while True:
    e = input('Digite o valor a esquerda do operador: ')
    op = input(f'Digite o operador. Opções: {op_validos}  :=')
    d = input('Digite o valor a direita do operador: ')
    if op in op_validos:
        if op == '/' and d == '0':
            print('Divisão por zero! Tente novamente.')
            continue
        expressao = e + ' ' + op + ' ' + d
        print(e,op,d,"=",eval(expressao))
        break
    print("Valores ou operador incorreto!")
