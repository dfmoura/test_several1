# Use uma imagem base do Python
FROM python:3.9-slim

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia o arquivo .env
COPY .env /app/.env

# Copia os arquivos de certificado e chave privada
COPY certs/certificado.crt /app/certs/certificado.crt
COPY certs/chave_privada.key /app/certs/chave_privada.key

# Copia o código-fonte e instala as dependências
COPY src/ /app/src/
COPY requirements.txt /app/requirements.txt

# Instala as dependências
RUN pip install --no-cache-dir -r requirements.txt

# Comando para executar o script Python
CMD ["python", "src/inter_integration.py"]