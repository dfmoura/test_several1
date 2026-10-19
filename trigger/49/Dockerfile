FROM python:3.12-slim

WORKDIR /app

# ZoneInfo (America/Sao_Paulo) exige tzdata no slim.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
COPY tests ./tests
COPY docker-compose.yml .
COPY pytest.ini .
COPY entrypoint.sh .

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV TZ=America/Sao_Paulo
ENV APP_PORT=8097

EXPOSE 8097

ENTRYPOINT ["sh", "/app/entrypoint.sh"]
