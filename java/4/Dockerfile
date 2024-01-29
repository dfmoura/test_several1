FROM openjdk:11
WORKDIR /app
COPY vet_soma_impar.java .
RUN javac vet_soma_impar.java
CMD ["java", "vet_soma_impar"]

#docker build -t vet-soma-impar .
#docker run vet-soma-impar
