FROM python:3.9-slim

WORKDIR /app

# Copia o requirements.txt da pasta backend para o contêiner
COPY backend/requirements.txt .

RUN pip install -r requirements.txt

# Copia todo o conteúdo da pasta backend para o contêiner
COPY backend .

CMD ["python", "app.py"]