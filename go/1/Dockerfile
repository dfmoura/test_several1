# Dockerfile
FROM golang:1.17-alpine

WORKDIR /app
COPY . .

RUN go build -o main main.go

CMD ["./main"]
