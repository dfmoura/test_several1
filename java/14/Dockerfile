# Use the official OpenJDK image as a base
FROM openjdk:17-jdk-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the source code into the container
COPY src ./src

# Compile the Java code
RUN javac -d ./bin ./src/*.java

# Set the classpath
ENV CLASSPATH=/usr/src/app/bin

# Command to run the Java program
CMD ["java", "Main"]
