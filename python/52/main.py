import numpy as np

lista_completa = [[20, 19.5], [20, 19.7],[20,20.2],[20,20.1],[21,19.9],[21,20.7],[21,21.2],[21,21.5],[25,25.5],[25,24.7],[25,25.2],[25,24.1]]

media = np.mean(lista_completa, axis=1)
desv_padr = np.std(lista_completa, axis=1)

for i, (avg, std) in enumerate(zip(media, desv_padr), 1):
    print(f"Lista {i}: Valor Médio = {avg:.2f}, Desvio Padrão = {std:.2f}")