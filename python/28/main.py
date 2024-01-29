

""" 
F O R N O   DE   P A O

1) Massa de pão é sensível a dois fatores ligado diretamente ao clima:
- a temperatura ambiente
- a umindade do ar

- no inverno:
    a temperatura fica em torno de 20°C ou abaixo
    a umidade do ar é maior igual a 40%

com o acionamento do forno, o mesmo passa pele seguinte processo:
1) Medir a umidade do ar interna do forno
2) Medir a temperatura externa do forno
3) Caso o clima for o inverno, iniciar a desumidificação e após concluído, proceder para cocção
4) Se estiver em outro clima, proceder com a cocção


O forno inicia previamente vazio, sem as bandejas com a massa de pão preparada em baguetes para assar.
O forno avisará o momento em que o operador deverá inserir as bandejas; esse mesmo operador concluirá a ação
ao fechar o forno e pressionar o botão pronto.


P R O C E D I M E N T O   de DESUMIDIFICAÇÃO pode ser visto a seguir:
1) Emitir mensagem início desumidificação.
2) Medir a umidade do ar interna do forno.
3) Medir a temperatura interna do forno.
4) Se a temperatura interna for maior que 15°C, e a umidade maior ou igual a 40%,
acionar somente o exaustor.
5) Se a temperatura interna for menor do que 15°C, e a umidade maior ou igual a 40%, 
acionar aquecimento do forno e exautor de ar.
6) Manter o aquecimento do forno até no máximo 100°C
7) Quando a umidade do ar interna alcançar menos do que 5%, desativar o exaustor e o aquecimento do forno, caso esteja ligado.
8) Emitir mensagem desumidificação concluída.



P R O C E D I M E N T O   de COCÇÃO pode ser visto a seguir:
1) Emitir mensagem iniciando cocção.
2) Medir a umidade do ar interna do forno.
3) Se a umidade do ar interna for maior do que 15%, acionar exaustor.
4) Medir a temperatura interna do forno.
5) Se a temperatura interna for menor do que 200°C, acionar aquecimento
para a temperatura de 380°C.
6) Quando a umidade atingir valor menor ou igual a 5%, desligar exaustor.
7) Quando a umidade for menor ou igual a 5%, e a temperatur interna do forno estiver em 380°C, emitir mensagem inserir
conteúdo para cocção - quando concluir pressionar botão pronto.
8) Quando botão pronto for acionado, manter aquecimento a 380°C por três horas.
9) Após três horas, emitir mensagem cocção concluída e desligar o aquecimento.


O B S E R V A Ç Õ E S
- As mensagens são emitidas utilizando comando print do Python.
- Todas as funções de leitura (temperatura, umidade, etc) devem ser feitas utilizando a função input do Python.


variavelArmazenaLeitura = LEITURASENSOR(sensor)

sensor é definido como:
TEMP_INT: temperatura interna em graus centígrados
TEMP_EXP: temperatura externa em graus centígrados
UMIDADE: sensor de umidade do ar




def calc_media(num1, num2, num3):
    total = num1 + num2 + num3
    media = total / 3
    return media


num1 = 8
num2 = 8
num3 = 8

resultado = calc_media(num1, num2, num3)
print(f"A media de {num1}, {num2}, e {num3} é: {resultado}")


 """

from datetime import datetime
import time

def estacao(date):
    if date >= datetime(date.year, 3, 21) and date < datetime(date.year, 6, 21):
        return "Outono"
    elif date >= datetime(date.year, 6, 21) and date < datetime(date.year, 9, 23):
        return "Inverno"
    elif date >= datetime(date.year, 9, 23) and date < datetime(date.year, 12, 21):
        return "Primavera"
    else:
        return "Verão"


def contador_regressivo(segundos):
   for i in range(segundos, 0, -1):
        print(f"Tempo restante: {i} segundos")
        time.sleep(1)
   print("pronto!")


# data atual
atual_date = datetime.now()

# estação atual
atual_estacao = estacao(atual_date)

# ver
print(f"Olá!\nHoje é {atual_date.strftime('%d/%m/%Y')}. \nEstamos no {atual_estacao}.")

TEMP_INT = float(input("Verificação de temperatura interna do forno: "))
TEMP_EXP = float(input("Verificação de temperatura externa do forno: "))

if atual_estacao == 'Primavera':
  print('iniciar desumidificação')
  UMIDADE = float(input("Verificação de umidade do ar interna: "))
  TEMP_INT = float(input("Verificação de temperatura interna do forno: "))

  while True:
    print('desumidificação em andamento...')
    if UMIDADE > 5:
      UMIDADE = float(input("Verificação de umidade do ar interna: "))
      TEMP_INT = float(input("Verificação de temperatura interna do forno: "))
    elif TEMP_INT > 100:
      TEMP_INT = float(input("Verificação de temperatura interna do forno: "))
    else:
      print('desumidificação concluída!')
      break
  print('pronto para cocção!')

else:
  print('pronto para cocção!')
  
print('iniciando cocção!')
tempo_regressivo = 3
contador_regressivo(tempo_regressivo)

UMIDADE = float(input("Verificação de umidade do ar interna: "))

if UMIDADE >15:
  print("acionar exaustor!")

TEMP_INT = float(input("Verificação de temperatura interna do forno: "))

if TEMP_INT <200:
  print("acionar aquecimento para a temperatura de 380")

while True:
  if UMIDADE > 5:
    UMIDADE = float(input("Verificação de umidade do ar interna: "))
  elif TEMP_INT < 380:
    TEMP_INT = float(input("Verificação de temperatura interna do forno: "))
  else:
    print("desligar exaustor!")
    print("inserir conteúdo para cocção - \nquando concluir pressionar o botao pronto!")
    break
BOTAO = (input("Pressione o botão 'PRONTO' para iniciar: "))
if BOTAO == 'PRONTO':
  print("botão pronto acionado!")
  print("cocção em andamento a 380°C por 3 horas!")
  time.sleep(3)
  print("cocção próxima do fim!")
  tempo_regressivo = 3
  contador_regressivo(tempo_regressivo)
else:
  print("botão pronto não acionado!")


