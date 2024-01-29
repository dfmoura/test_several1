# Use a base image with the Kotlin compiler and Java runtime
FROM openjdk:11-jdk

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Compile the Kotlin code
RUN kotlinc . -include-runtime -d app.jar

# Specify the default command to run the application
CMD ["java", "-jar", "app.jar"]
