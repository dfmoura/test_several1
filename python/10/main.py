

# normal

"""
vendedor = "Diogo"
vendas = 400
meta = 500
if vendas >= meta:
    print("Bateu a meta")
else:
    print("Não bateu a meta")
"""



# com orientação a objeto

class Vendedor():
    def __init__(self,nome):
        self.nome = nome
        self.vendas = 0

    def vendeu(self,vendas):
        self.vendas = vendas

    def bateu_meta(self,meta):
        if self.vendas > meta:
            print(self.nome,"Bateu a meta")
        else:
            print(self.nome,"Não bateu a meta")

vendedor1 = Vendedor("Neil")
vendedor1.vendeu(1000)
vendedor1.bateu_meta(600)

#print(vendedor1.vendas)

vendedor2 = Vendedor("Diogo")
vendedor2.vendeu(300)
vendedor2.bateu_meta(600)