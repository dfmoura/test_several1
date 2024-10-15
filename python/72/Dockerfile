FROM python:3.9-slim
# Instalar dependências
RUN apt-get update && apt-get install -y libaio1
# Copiar arquivos necessários para dentro do container
WORKDIR /app
COPY . .
# Instalar as dependências do Python
RUN pip install -r requirements.txt
# Comando para rodar o programa
CMD ["python", "app.py"]
