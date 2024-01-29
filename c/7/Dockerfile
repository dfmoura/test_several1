FROM gcc:latest
COPY sum.c /app/sum.c
WORKDIR /app
RUN gcc -o sum sum.c
CMD ["./sum"]

