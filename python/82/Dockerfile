# Dockerfile para o exemplo de busca gulosa - mochila fracionada
FROM python:3.11-slim

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos do projeto para o container
COPY . .

# Instala dependências (neste caso, apenas Python padrão é necessário)
# Mantém o cache limpo
RUN apt-get update && apt-get clean && rm -rf /var/lib/apt/lists/*

# Define as permissões de execução para o script Python
RUN chmod +x knapsack_greedy.py

# Define o comando padrão para executar o programa
CMD ["python3", "knapsack_greedy.py"]

# Metadados do container
LABEL maintainer="diogo"
LABEL description="Exemplo de implementação do algoritmo de busca gulosa para mochila fracionada"
LABEL version="1.0"
