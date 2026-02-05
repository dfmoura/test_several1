FROM debian:12

RUN apt-get update && \
    apt-get install -y gnucobol && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY hello.cob .

RUN cobc -x hello.cob -o hello

CMD ["./hello"]
