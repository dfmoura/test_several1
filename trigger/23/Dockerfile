FROM python:3.12-slim

WORKDIR /app

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
