FROM python:3.9-slim

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    libaio1

# Instalar cx_Oracle
RUN pip install cx_Oracle

# Baixar e instalar Oracle Instant Client
RUN mkdir -p /opt/oracle \
    && cd /opt/oracle \
    && curl -o instantclient-basic-linux.x64-21.8.0.0.0dbru.zip https://download.oracle.com/otn_software/linux/instantclient/218000/instantclient-basic-linux.x64-21.8.0.0.0dbru.zip \
    && curl -o instantclient-sdk-linux.x64-21.8.0.0.0dbru.zip https://download.oracle.com/otn_software/linux/instantclient/218000/instantclient-sdk-linux.x64-21.8.0.0.0dbru.zip \
    && unzip instantclient-basic-linux.x64-21.8.0.0.0dbru.zip \
    && unzip instantclient-sdk-linux.x64-21.8.0.0.0dbru.zip \
    && rm instantclient-basic-linux.x64-21.8.0.0.0dbru.zip \
    && rm instantclient-sdk-linux.x64-21.8.0.0.0dbru.zip \
    && ln -s /opt/oracle/instantclient_21_8 /opt/oracle/instantclient

# Definir variáveis de ambiente
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient
ENV PATH=$PATH:/opt/oracle/instantclient

# Copiar o script para o container
COPY script.py /app/script.py

# Definir o diretório de trabalho
WORKDIR /app

# Comando para executar o script
CMD ["python", "script.py"]
