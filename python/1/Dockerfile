FROM python:3.8-slim

RUN pip install PyPDF2

WORKDIR /app
COPY encrypt_pdf.py /app

ENTRYPOINT ["python", "encrypt_pdf.py"]
