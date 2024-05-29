import pandas as pd

# Caminho para o arquivo de origem e destino
caminho_origem = 'parceiros.csv'  # Caminho relativo ao diretório do contêiner
caminho_destino = 'parceiros_novo.csv'

# Abrir o arquivo CSV e processá-lo linha por linha
linhas_validas = []
with open(caminho_origem, 'r', encoding='utf-8') as arquivo:
    for num_linha, linha in enumerate(arquivo, start=1):
        try:
            # Tente dividir a linha em colunas
            colunas = linha.strip().split(';')
            # Verifique se há 15 colunas
            if len(colunas) == 15:
                linhas_validas.append(colunas)
            else:
                print(f"Linha {num_linha} tem número incorreto de colunas e será pulada.")
        except Exception as e:
            print(f"Erro ao processar linha {num_linha}: {e}")

# Criar DataFrame com as linhas válidas
df = pd.DataFrame(linhas_validas)

# Selecionar a 15ª coluna e manter o formato em texto
coluna_15 = df.iloc[:, 14].astype(str)

# Salvar a nova coluna em um novo DataFrame
novo_df = pd.DataFrame({'Coluna_15_Nova': coluna_15})

# Salvar o novo DataFrame como um novo arquivo CSV
novo_df.to_csv(caminho_destino, index=False)
