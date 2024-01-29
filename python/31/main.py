import requests

def converter_brl_para_btc(total):
    url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl'
    resposta = requests.get(url)
    data = resposta.json()
    btc_preco = data['bitcoin']['brl']
    btc_total = total / btc_preco
    print(f'{brl_total} BRL é aproximadamente {btc_total:.6f} BTC\n')
    return btc_total

def converter_btc_para_brl(total):
    url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl'
    resposta = requests.get(url)
    data = resposta.json()
    btc_preco = data['bitcoin']['brl']
    brl_total = total * btc_preco
    print(f'{btc_total} BTC é aproximadamente {brl_total:.2f} BRL\n')
    return brl_total

print("C O V E R S O R   de   M O E D A S\n")
while True:
  
  opcao = int(input("Escolha uma opção: \n1 - BTC para Reais.\n2 - Reais para BTC.\n3 - Sair.\n\n"))# 1000
  if opcao == 1:
    btc_total = float(input("Digite os btc que deseja converter: ")) # 1000
    brl_total = converter_btc_para_brl(btc_total)
  elif opcao == 2:
    brl_total = float(input("Digite os reais que deseja converter: "))# 1000
    btc_total = converter_brl_para_btc(brl_total)
  elif opcao == 3:
    print("Sistema Finalizado!\n")
    break
  else:
    print("Opção inválida, tente novamente!\n")