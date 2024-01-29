# Use the jetbrains/kotlin image
FROM jetbrains/kotlin

# Set the working directory
WORKDIR /app

# Copy your Kotlin source code to the container
COPY HelloWorld.kt .

# Compile the Kotlin code
RUN kotlinc HelloWorld.kt -include-runtime -d HelloWorld.jar

# Define the command to run your application
CMD ["java", "-jar", "HelloWorld.jar"]
