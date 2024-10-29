# Usar uma imagem base do Python
FROM python:3.10-slim

# Definir o diretório de trabalho dentro do container
WORKDIR /app

# Copiar o arquivo de script e o arquivo de texto para dentro do container
COPY substituir.py 306_component.txt ./

# Executar o script Python
CMD ["python", "substituir.py"]
