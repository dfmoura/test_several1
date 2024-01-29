# Use a base image with Java JDK installed
FROM openjdk:11-jdk-slim

# Copy the Java source code into the container
COPY main.java /app/

# Set the working directory
WORKDIR /app

# Compile the Java code
RUN javac main.java

# Run the Java application
CMD ["java", "main"]
