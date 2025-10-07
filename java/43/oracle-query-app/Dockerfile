## Build stage: compila o app com Maven usando JDK 17
FROM maven:3.9.8-eclipse-temurin-17 AS build

WORKDIR /workspace

# Copia os arquivos de definição primeiro para otimizar cache
COPY pom.xml ./
RUN mvn -q -e -DskipTests dependency:go-offline

# Copia o restante do código
COPY src ./src

# Build do jar executável
RUN mvn -q -DskipTests package

## Runtime stage: imagem leve com JRE 17
FROM eclipse-temurin:17-jre

ENV TZ=Etc/UTC \
    JAVA_OPTS=""

WORKDIR /app

# Copia o jar gerado do estágio de build
COPY --from=build /workspace/target/oracle-query-app-0.0.1-SNAPSHOT.jar /app/app.jar

# Porta configurada em application.yml
EXPOSE 8081

# Cria diretório de dados (H2 file) e usa como volume
VOLUME ["/app/data"]

# Define diretório de trabalho para o H2 path relativo funcionar
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]


