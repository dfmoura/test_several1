# Use a imagem oficial do Java 17
FROM adoptopenjdk:17-jdk-hotspot

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia o código fonte para o contêiner
COPY src/ /app/src/

# Compila o código
RUN javac src/Main.java

# Comando padrão a ser executado quando o contêiner for iniciado
CMD ["java", "-cp", "src", "Main"]
