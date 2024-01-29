# Use the official Microsoft .NET SDK image
FROM mcr.microsoft.com/dotnet/sdk:5.0 AS build

WORKDIR /app

# Copy the C# source code into the container
COPY test.cs .

# Compile the C# program
RUN csc test.cs

# Run the compiled C# program
CMD [ "mono", "test.exe" ]
