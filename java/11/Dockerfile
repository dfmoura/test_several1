# Use a base image with Java JDK installed
#FROM openjdk:11-jdk-slim

# Copy the Java source code into the container
#COPY test.java /app/

# Set the working directory
#WORKDIR /app

# Compile the Java code
#RUN javac test.java

# Run the Java application
#CMD ["java", "test"]





FROM openjdk:11-jre-slim
WORKDIR /app
COPY main.jar /app/main.jar
COPY lib/jfreechart-1.5.3.jar /app/lib/jfreechart-1.5.3.jar
COPY lib/jsoup-1.14.3.jar /app/lib/jsoup-1.14.3.jar
ENV CLASSPATH /app/main.jar:/app/lib/*
CMD ["java", "-cp", "$CLASSPATH", "WebScrapingChart"]
