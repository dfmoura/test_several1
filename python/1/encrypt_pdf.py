import PyPDF2
import sys

input_pdf = sys.argv[1]
output_pdf = sys.argv[2]
password = sys.argv[3]

pdf_writer = PyPDF2.PdfWriter()

with open(input_pdf, 'rb') as pdf_file:
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    for page_num in range(len(pdf_reader.pages)):
        pdf_writer.add_page(pdf_reader.pages[page_num])

    pdf_writer.encrypt(password)

with open(output_pdf, 'wb') as output_file:
    pdf_writer.write(output_file)

print(f"PDF encrypted and saved as {output_pdf}")
