
# Online Python - IDE, Editor, Compiler, Interpreter

teste = "Aula top   !!!"
print(len(teste))
print(teste.capitalize())
print(teste.count('!')+teste.count('!')+teste.count('!')**2)
print(teste.startswith("Japao"))
print(teste.endswith("Rinoceronte"))
print(teste.isalnum())
print(teste.isalpha())
print(teste.islower())
print(teste.isupper())
print(teste.lower())
print(teste.title())
print(teste.upper())

print(teste.swapcase())
print(teste.split())
print(teste.replace("Jogar","Fubetol!"))
print(teste.find("o"))
print(teste.ljust(10))
print(teste.rjust(10))
print(teste.center(50))
print(teste.lstrip())
print(teste.rstrip())
print('ok')
print(teste.strip())
test="the professor is a 1000 grade gem!"
test1 = test.replace(" ", "")
print(test1)

print("\n")
print("\nP R A T I Q U E\n")
nome = 'Diogo Moura'
print(f"Alo mundo! Me chamo {nome}.")


numero = input("Digite um numero:")
print (f"O número que você digitou foi: {numero}.")


num1 = float(input("Digite o primeiro número: "))
num2 = float(input("Digite o segundo número: "))
resultado = num1 + num2
print (f"A soma de {num1} + {num2} = {resultado}")

def soma_num(a, b):
    resposta = a + b
    return resposta
resp = soma_num(num1,num2)
print (f"A funcao soma de {num1} + {num2} = {resp}")

# digitacao de notas
num1 = float(input("Digite a nota1: "))
num2 = float(input("Digite a nota2: "))
num3 = float(input("Digite a nota3: "))
num4 = float(input("Digite a nota4: "))
# calculo media
media = (num1 + num2 + num3 + num4) / 4
# resultado
print("A média das notas bimestrais é:", media)

#metros para cm
metro = float(input("Digite quanto(s) metros deseja converter para centímetro: "))
cm = metro * 100
print(f"A converção de {metro} metro(s) equivale a {cm} centimetro(s)")

#caluculo de raio
diametro = float(input("Digite o diametro da cículo: "))
raio = diametro/2
print(f"O raio de um círculo com diametro de {diametro} é {raio}")

def calc_raio(d):
    raio = d/2
    print(f"O raio de um círculo com diametro de {diametro} é {raio}")
    return raio
calc_raio(diametro)

#caluculo de area do quadrado
area = float(input("Digite a altura de um lado do quadrado: "))
area_quadrado = area*area
dobro_area_quadrado = area_quadrado*2
print(f"A altura de um lado do quadrado é {area},\n"
      f"logo área do quadrado é {area_quadrado} e \n"
      f"seu dobro equivale a {dobro_area_quadrado}.")