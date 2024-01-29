#Na prática, comando condicional if em python
#Programa de auxilio a decisão sobre preço de mercado

# PA e PercA, preço do 1° colocado e percentual de participação no mercado
# PA e PercB, preço do 2° colocado e percentual de participação no mercado
# PA e PercC, preço do 3° colocado e percentual de participação no mercado
# PS, preço sugerido
# DIF, diferença de preços (margem)

PA=float(input("Preço de mercado concorrente A => "))
PercA=float(input("Participação de mercado concorrente A % => "))
PB=float(input("Preço de mercado concorrente B => "))
PercB=float(input("Participação de mercado concorrente B % => "))
PC=float(input("Preço de mercado concorrente C => "))
PercC=float(input("Participação de mercado concorrente C % => "))
PS=float(input("Preço Sugestão => "))

#Cálculo do valor médio de mercado
VMM = PA * (PercA/100) + PB*(PercB/100) + PC*(PercC/100)
print(f"Valor de mercado: R$ {VMM}")

if PS>VMM:
  DIF = PS-VMM
  print("Seu preço de venda está excessivo em relação ao mercado")
  print(f"Margem ultrapassa, em reais: {DIF}")
  print("Entre com nova sugestão de preço")
else:
  DIF = VMM-PS
  print("PARABÉNS. Seu preço de venda esta COMPETITIVO em relação ao mercado")
  print(f"Margem DISPONÍVEL em reais: {DIF}")