# Use a base image with Java JDK installed
FROM openjdk:11-jdk-slim

# Copy the Java source code into the container
COPY test.java /app/

# Set the working directory
WORKDIR /app

# Compile the Java code
RUN javac test.java

# Run the Java application
CMD ["java", "test"]
