FROM gcc:latest
COPY main.c /app/main.c
WORKDIR /app
RUN gcc -o main main.c -lncurses
CMD ["./main"]

