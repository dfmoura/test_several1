# Usar uma imagem base do Python
FROM python:3.9-slim

# Definir o diretório de trabalho dentro do contêiner
WORKDIR /app

# Instalar as dependências
RUN pip install ofxtools

# Copiar o script Python para o contêiner
COPY converter_ofx_para_json.py .

# Definir o comando padrão para executar o script
CMD ["python", "converter_ofx_para_json.py"]