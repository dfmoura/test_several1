
def candidatos(nomes):
    for i, nome in enumerate(nomes, start=0):
        print(f"{i} {nome:6}", end="  ")
    print()

    for _ in range(1):
        for nome in nomes:
            print(" .---. ", end="   ")
        print()

        for nome in nomes:
            print(f"| {nome[0]} {nome[-1]} |", end="   ")
        print()

        for nome in nomes:
            print(f"|  ^  |", end="   ")
        print()

        for nome in nomes:
            print(f"| (_) |", end="   ")
        print()

        for nome in nomes:
            print("'-----'", end="   ")
        print()

nomes = ["SAIR","JOSE", "BIA", "EDU", "TOME", "BRANCO","NULO"]


candidato1 = 0
candidato2 = 0
candidato3 = 0
candidato4 = 0
branco = 0
nulo = 0
contagem = 0

print("\n\n S I S T E M A     D E     V O T A C A O    E B U I N U")
print("***********************************************************\n\n")
candidatos(nomes)
print("\n\n")

while True:
  try:
    voto = input("Digite seu voto: ")
    voto = int(voto)
    if voto == 1:
      candidato1 += 1
      contagem+=1
    elif voto == 2:
      candidato2 += 1
      contagem+=1
    elif voto == 3:
      candidato3 += 1
      contagem+=1
    elif voto == 4:
      candidato4 += 1
      contagem+=1
    elif voto == 5:
      branco += 1
      contagem+=1
    elif voto == 6:
      nulo += 1
      contagem+=1
    elif voto == 0 and contagem > 0:
      break
    elif voto == 0 and contagem < 1:
      print("OBRIGATÓRIO ter registro de votação!")
    else:
      print("Tente novamente!")

  except EOFError:
    print("Erro de leitura de entrada. Verifique se está executando o script em um ambiente que suporta entrada interativa.")
    break

  except ValueError:
    print("Entrada inválida. Digite um número válido.")

calculo1 = (nulo/contagem)*100
calc_formatado = "{:.2f}".format(calculo1)

calculo2 = (branco/contagem)*100
calc_formatado1 = "{:.2f}".format(calculo2)

print("\n\n::::A P U R A C A O :::::\n")
print(f"O total de votos: {contagem}.")
print(f"O total de votos para 1 JOSE: {candidato1}.")
print(f"O total de votos para 2 BIA: {candidato2}.")
print(f"O total de votos para 3 EDU: {candidato3}.")
print(f"O total de votos para 4 TOME: {candidato4}.")
print(f"O total de votos 5 BRANCO: {branco}.")
print(f"O total de votos 6 NULO: {nulo}.")
print(f"A percentagem de votos nulos sobre o total de votos: %{calc_formatado}.")
print(f"A percentagem de votos em branco sobre o total de votos: % {calc_formatado1}.")


maior_votacao = max(candidato1, candidato2, candidato3, candidato4, branco, nulo)
vencedor = []

if candidato1 == maior_votacao:
    vencedor.append("Candidato 1 JOSE")
if candidato2 == maior_votacao:
    vencedor.append("Candidato 2 BIA")
if candidato3 == maior_votacao:
    vencedor.append("Candidato 3 EDU")
if candidato4 == maior_votacao:
    vencedor.append("Candidato 4 TOME")
if branco == maior_votacao:
    vencedor.append("BRANCO")
if nulo == maior_votacao:
    vencedor.append("NULO")


if len(vencedor) > 1 and ('BRANCO' not in vencedor or 'NULO' not in vencedor):
    vence = random.choice(vencedor)#criterio oculto de desempate
    print(f"O Candidato que venceu as eleições é {vence}")
elif 'BRANCO' in vencedor or 'NULO' in vencedor:
    print(f"\nFazer nova eleição: {', '.join(vencedor)}")
else:
    print(f"\nO Candidato que venceu as eleições é {vencedor[0]}")