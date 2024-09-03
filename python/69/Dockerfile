# Use a imagem oficial do Python
FROM python:3.9-slim

# Defina o diretório de trabalho
WORKDIR /app

# Crie o diretório para saída
RUN mkdir -p /app/output

# Copie os arquivos para o contêiner
COPY requirements.txt requirements.txt
COPY ofx_reader.py ofx_reader.py
COPY data/ data/

# Instale as dependências
RUN pip install --no-cache-dir -r requirements.txt

# Comando padrão ao rodar o contêiner
CMD ["python", "ofx_reader.py"]
