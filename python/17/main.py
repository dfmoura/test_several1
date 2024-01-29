# main.py

condicao = False
if condicao: # Equivalente a: if condicao == True
    print("Continual programa!")
else:
    print("O programa será encerrado!")

a = True + 0   # Resultado: 1
b = False + 0  # Resultado: 0

print(type(a))
print(type(b))


x = 2**2
print(x)


d = """a vida no campo é muito interessante,
la a gente pode plantar, cuidar e colher.
tem sempre o caso de alguma coisa para gente ouvir
e todo mundo fica na santa paz!!!"""

print(d)
print(d.isnumeric())


aspas_simples = 'Esse tipo de string permite aspas "dulas" incorporadas.'
aspas_duplas = "Esse tipo de string permite aspas 'simples' incorporadas."
tripla_de_aspas_simples = '''Esse tipo de string permite aspas 'simples',
"duplas" e ""triplas duplas""" incorporadas.'''
tripla_de_aspas_duplas = """Esse tipo de string permite aspas 'simples',
"duplas" e '''tripla simples''' incorporadas."""
print(type(aspas_simples)) # <class 'str'>
print(aspas_simples[0:5]) # Cinco primeiros caracteres
print(aspas_simples[1:5]) # Substring de 2 até 5
print(aspas_simples[-6:-1]) # Cinco caracteres antes do último
print(aspas_simples[-2:]) # Dois últimos caracteres
print(aspas_simples[:2]) # Dois primeiros caracteres