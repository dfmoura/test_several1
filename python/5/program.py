if (vendas :=int(input("Vendas do funcionário: "))) > 1000:
    bonus = 0.05 * vendas
else:
    bonus = 0
print("Bonus: ",bonus)