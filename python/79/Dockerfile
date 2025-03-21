# Dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY . .

RUN mkdir -p /app/ofx /app/json

CMD ["python", "script.py"]