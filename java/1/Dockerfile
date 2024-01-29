FROM ubuntu:latest

RUN apt-get update && \
    apt-get install -y openjdk-8-jdk-headless && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY itextpdf-5.5.13.3.jar /app/itextpdf-5.5.13.3.jar
COPY pdfgenerate.java /app/pdfgenerate.java
COPY test.txt /app/test.txt

WORKDIR /app
RUN javac -cp itextpdf-5.5.13.3.jar pdfgenerate.java

CMD ["java", "-cp", "/app:.:/app/itextpdf-5.5.13.3.jar", "pdfgenerate"]
