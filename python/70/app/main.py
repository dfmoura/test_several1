from utils import parse_ofx
from fpdf import FPDF

def generate_pdf(df, bank_data, output_path):
    """Gera um PDF a partir dos dados do DataFrame e informações bancárias."""
    class PDF(FPDF):
        def header(self):
            self.set_font('Arial', 'B', 12)
            self.cell(0, 10, 'Extrato Bancario', 0, 1, 'C')
        
        def footer(self):
            self.set_y(-15)
            self.set_font('Arial', 'I', 8)
            self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')
    
    pdf = PDF()
    pdf.add_page()
    
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, f'Bank ID: {bank_data["BANKID"]}', 0, 1)
    pdf.cell(0, 10, f'Branch ID: {bank_data["BRANCHID"]}', 0, 1)
    pdf.cell(0, 10, f'Account ID: {bank_data["ACCTID"]}', 0, 1)
    pdf.ln(10)
    
    pdf.set_font('Arial', 'B', 10)
    pdf.cell(30, 10, 'TRNTYPE', 1)
    pdf.cell(30, 10, 'DTPOSTED', 1)
    pdf.cell(30, 10, 'TRNAMT', 1)
    pdf.cell(30, 10, 'FITID', 1)
    pdf.cell(30, 10, 'CHECKNUM', 1)
    pdf.cell(30, 10, 'REFNUM', 1)
    pdf.cell(60, 10, 'MEMO', 1)
    pdf.ln()
    
    pdf.set_font('Arial', '', 10)
    total_amount = 0
    for index, row in df.iterrows():
        pdf.cell(30, 10, str(row['TRNTYPE']), 1)
        pdf.cell(30, 10, str(row['DTPOSTED']), 1)
        pdf.cell(30, 10, f"{row['TRNAMT']:.2f}", 1)
        pdf.cell(30, 10, str(row['FITID']), 1)
        pdf.cell(30, 10, str(row['CHECKNUM']), 1)
        pdf.cell(30, 10, str(row['REFNUM']), 1)
        pdf.cell(60, 10, str(row['MEMO']), 1)
        pdf.ln()
        total_amount += row['TRNAMT']
    
    pdf.cell(180, 10, f'Total: {total_amount:.2f}', 1, 0, 'R')
    pdf.output(output_path)

if __name__ == "__main__":
    input_file = 'data/Extrato-30-07-2024-a-29-08-2024.ofx'
    output_file = 'output/extrato.pdf'
    
    df, bank_data = parse_ofx(input_file)
    generate_pdf(df, bank_data, output_file)
