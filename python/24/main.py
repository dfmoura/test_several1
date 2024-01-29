""" 
O plano diretor de desenvolvimento urbano de uma cidade determina qual
é o percentual de área máximo destinado para garagem em relação à área
total do terreno da casa, dependendo da localização desse terreno na cidade:

 Para a zona norte da cidade, o percentual máximo é de 25%.
 Para as zonas leste e oeste da cidade, o percentual máximo é de 30%.
 Para a zona sul, menos povoada, o percentual máximo é de 40%.

Uma empresa de arquitetura está com vários contratos e necessita calcular
rapidamente esse percentual, antes de iniciar os projetos. Faça um programa
que recebe as medidas do terreno e da garagem e a zona onde estará localizado
o imóvel, calcula o percentual de ocupação da área da garagem em relação
ao terreno e emite mensagem sobre o atendimento às regras de ocupação
conforme o plano diretor.

 """

largura_terreno = float(input("Digite a largura do terreno: "))
comprimento_terreno = float(input("Digite o comprimento do terreno: "))
largura_garagem = float(input("Digite a largura da garagem: "))
comprimento_garagem = float(input("Digite o comprimento da garagem: "))
zona = float(input("Conforme a zona de localização do terreno: \n(1) NORTE  \n(2) LESTE ou OESTE \n(3) SUL\nDigite a opção: "))

area_terreno = largura_terreno*comprimento_terreno
area_garagem = largura_garagem*comprimento_garagem
ocupacao_garagem_terreno = area_garagem/area_terreno
perc = ocupacao_garagem_terreno * 100

print(f"\n\nR E L A T O R I O\n")
print(f"Area do Terreno: {area_terreno}\n"
f"Area da Garagem: {area_garagem}\n"
f"Area de Ocupação da Garagem: {perc}%\n")

if zona == 1 and ocupacao_garagem_terreno <= 0.25:
    print(f"projeto atende norma de zoneamento do plano diretor\n")
elif zona == 2 and ocupacao_garagem_terreno <= 0.30:
    print("projeto atende norma de zoneamento do plano diretor")
elif zona == 3 and ocupacao_garagem_terreno <= 0.40:
    print("projeto atende norma de zoneamento do plano diretor")
else:
    print("REVISAR MEDIDAS. projeto NÃO atende norma de zoneamento do plano diretor")

