# Dockerfile
FROM openjdk:8-jdk-alpine

# Copy the Java source code into the container
COPY Main.java /app/

# Set the working directory
WORKDIR /app

# Compile the Java code and create a JAR file
RUN javac Main.java
RUN jar cvfe Main.jar Main Main.class

# Run the Java application
CMD ["java", "-jar", "Main.jar"]
