FROM eclipse-temurin:17-jre
WORKDIR /app
COPY target/nfsesvc-0.0.1-SNAPSHOT.jar app.jar
ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75"
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
