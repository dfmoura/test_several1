import fitz

def pdf_to_txt(input_pdf, output_txt):
    doc = fitz.open(input_pdf)
    text = ''
    for page_num in range(doc.page_count):
        page = doc.load_page(page_num)
        text += page.get_text()
    with open(output_txt, 'w') as txt_file:
        txt_file.write(text)

if __name__ == '__main__':
    pdf_to_txt('input.pdf', 'output.txt')
