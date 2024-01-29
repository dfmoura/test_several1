# Use the base image with Java 11 (includes JDK)
FROM openjdk:8-jdk

# Create the /app directory
RUN mkdir /app

# Set the working directory
WORKDIR /app

# Copy the Java code into the container
COPY test.java /app/

# Compile the Java code
RUN javac test.java

# Run the Java application
CMD ["java", "test"]
