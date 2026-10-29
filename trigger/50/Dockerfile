FROM python:3.12-slim

WORKDIR /app

# ZoneInfo (America/Sao_Paulo) exige tzdata no slim.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV APP_PORT=8096

VOLUME ["/app/data"]
EXPOSE 8096

ENTRYPOINT ["./entrypoint.sh"]
