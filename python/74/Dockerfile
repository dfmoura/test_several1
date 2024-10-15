# Use uma imagem oficial do Python
FROM python:3.9

# Instala dependências do Oracle (Client)
RUN pip install --upgrade pip
RUN pip install oracledb openai

# Copie o script Python para o contêiner
COPY app.py /app/app.py
COPY requirements.txt /app/requirements.txt

# Defina o diretório de trabalho
WORKDIR /app

# Instale as dependências do projeto
RUN pip install -r requirements.txt

# Execute o script
CMD ["python", "app.py"]


#docker run -it --network=host python-oracle-app
#docker build -t python-oracle-app .