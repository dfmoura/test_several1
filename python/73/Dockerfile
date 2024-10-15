# Dockerfile
FROM python:3.9-slim

# Instalar dependências
RUN apt-get update && \
    apt-get install -y \
    libaio1 \
    && apt-get clean

# Instalar o cx_Oracle
RUN pip install cx_Oracle

# Copiar seu script Python
COPY app.py /app.py

# Configurar o diretório de trabalho
WORKDIR /

# Comando para executar o script
CMD ["python", "app.py"]
