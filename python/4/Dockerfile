# Use the official Python image as the base image
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the BMI calculator Python script into the container
COPY bmi_calculator.py /app

# Create a shortcut script to execute the BMI calculator
RUN echo "#!/bin/bash\npython /app/bmi_calculator.py" > /usr/local/bin/bmi-calculator
RUN chmod +x /usr/local/bin/bmi-calculator

# Command to run when the container starts
CMD ["/bin/bash"]


#  docker build -t bmi-calculator .
#  docker run -it --rm bmi-calculator


# echo "docker run -it --rm -v \$(pwd):/app bmi-calculator" > bmi-calculator-shortcut.sh
# chmod +x bmi-calculator-shortcut.sh
