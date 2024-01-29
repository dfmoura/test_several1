FROM python:3.8-slim
WORKDIR /app
COPY main.py .
RUN pip install matplotlib
RUN pip install pandas
RUN pip install seaborn
RUN pip install openpyxl
CMD ["python", "main.py"]



# docker build -t bisect-docker .


# docker run bisect-docker
