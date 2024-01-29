
# Use the official MariaDB image as the base image
FROM mariadb:latest

# Set environment variables for MariaDB
ENV MYSQL_ROOT_PASSWORD=123456abc
ENV MYSQL_DATABASE=mydb
ENV MYSQL_USER=myuser
ENV MYSQL_PASSWORD=123456

# Expose the MySQL port
EXPOSE 3306

# Copy any SQL scripts you want to run on container startup
# For example, if you have a 'init.sql' file, you can copy it here
COPY init.sql /docker-entrypoint-initdb.d/
