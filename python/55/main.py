import matplotlib.pyplot as plt

horas_estudo = [2, 3, 1, 4, 2.5]
pontuacao_exame = [60, 65, 50, 80, 70]

plt.scatter(horas_estudo, pontuacao_exame)
plt.title('Gráfico de Dispersão - Horas de Estudo vs. Pontuação no Exame')
plt.xlabel('Horas de Estudo')
plt.ylabel('Pontuação no Exame')
plt.show()