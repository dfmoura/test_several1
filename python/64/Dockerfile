# Use the official Python image as a base
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Install pandas
RUN pip install pandas

# Copy the Python script into the container
COPY process_csv.py .

# Run the Python script when the container launches
CMD ["python", "process_csv.py"]
