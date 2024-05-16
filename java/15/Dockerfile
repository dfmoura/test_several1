FROM docker.io/library/openjdk:8-jdk-slim

# Define o diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# Copia o código-fonte do aplicativo Java
COPY src ./src

# Copia os arquivos JAR do diretório local para o diretório 'libs' no contêiner
COPY LibsTeste/*.jar ./libs/

# Compila o código Java
RUN javac -cp "./libs/*" -d ./bin ./src/*.java
