# Use the official MySQL image as the base image
FROM mysql:latest

# Set the root password for MySQL (change to your desired password)
ENV MYSQL_ROOT_PASSWORD=123456

# Create a new database and a user
ENV MYSQL_DATABASE=mydatabase
ENV MYSQL_USER=myuser
ENV MYSQL_PASSWORD=123456

# Expose the MySQL port
EXPOSE 3306

# Copy SQL scripts to initialize the database
COPY init.sql /docker-entrypoint-initdb.d/
