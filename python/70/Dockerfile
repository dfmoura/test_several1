# Use uma imagem base com Python
FROM python:3.11-slim

# Crie um diretório para a aplicação
WORKDIR /app

# Copie os arquivos de requisitos e instale as dependências
COPY app/requirements.txt requirements.txt
RUN pip install -r requirements.txt

# Copie o código da aplicação
COPY app/ .

# Copie os arquivos de dados para o container
COPY data/ data/

# Crie o diretório de saída
RUN mkdir -p /app/output

# Defina o comando padrão para rodar o script
CMD ["python", "main.py"]
