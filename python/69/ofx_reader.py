import os
import pandas as pd
from ofxparse import OfxParser
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors

# Caminho para o arquivo .ofx na pasta atual
file_path = os.path.join('data', 'Extrato-30-07-2024-a-29-08-2024.ofx')

# Verificar se o arquivo existe
if not os.path.exists(file_path):
    print(f"Erro: Arquivo não encontrado no caminho {file_path}")
    exit(1)

# Abra e leia o arquivo .ofx
with open(file_path) as ofx_file:
    ofx = OfxParser.parse(ofx_file)

# Extrair informações do banco (ajustar de acordo com a estrutura do OFX)
try:
    bank_info = {
        'Banco': getattr(ofx.bank, 'org', 'N/A'),
        'Código do Banco': getattr(ofx.bank, 'fid', 'N/A'),
        'BANCO': getattr(ofx.bank, 'bankid', 'N/A'),
        'AGENCIA': getattr(ofx.bank, 'branchid', 'N/A'),
        'CONTA': getattr(ofx.account, 'account_id', 'N/A')
    }
except AttributeError:
    bank_info = {
        'Banco': 'N/A',
        'Código do Banco': 'N/A',
        'BANCO': 'N/A',
        'AGENCIA': 'N/A',
        'CONTA': 'N/A'
    }

# Extrair as transações da conta
transactions = []
for transaction in ofx.account.statement.transactions:
    transaction_data = {
        'Operacao': transaction.type if hasattr(transaction, 'type') else '',
        'Data': transaction.date.strftime('%Y-%m-%d') if hasattr(transaction, 'date') else '',
        'Valor': f"{transaction.amount:.2f}" if hasattr(transaction, 'amount') else '',
        'Id.Transacao': transaction.fitid if hasattr(transaction, 'fitid') else '',
        'Ref.': transaction.checknum if hasattr(transaction, 'checknum') else '',
        'Ref1.': transaction.refnum if hasattr(transaction, 'refnum') else '',
        'Observacao': transaction.memo if hasattr(transaction, 'memo') else ''
    }
    
    transactions.append(transaction_data)

# Criar o DataFrame
df = pd.DataFrame(transactions)

# Garantir que a coluna 'Valor' é numérica
df['Valor'] = pd.to_numeric(df['Valor'], errors='coerce')

# Totalizar valores por Observacao
total_by_payee = df.groupby('Observacao')['Valor'].sum().reset_index()

# Garantir que a coluna 'Valor' é numérica para totalizadores
total_by_payee['Valor'] = total_by_payee['Valor'].apply(lambda x: f"{x:.2f}")

# Caminho do PDF fora do contêiner
pdf_file_path = os.path.join('/app/output', 'relatorio_transacoes.pdf')
os.makedirs(os.path.dirname(pdf_file_path), exist_ok=True)

# Criar PDF
doc = SimpleDocTemplate(pdf_file_path, pagesize=letter)
styles = getSampleStyleSheet()

# Cabeçalho com informações do banco
header_data = [
    ['Banco', bank_info['Banco']],
    ['Código do Banco', bank_info['Código do Banco']],
    ['BANCO', bank_info['BANCO']],
    ['AGENCIA', bank_info['AGENCIA']],
    ['CONTA', bank_info['CONTA']]
]

header_table = Table(header_data, colWidths=[100, 400])
header_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
]))

# Adicionar título
title_style = styles['Title']
title = Paragraph("Relatório de Transações", title_style)

# Adicionar DataFrame como tabela transposta
data = []
data.append(['Campo', 'Valor'])
for column in df.columns:
    values = df[column].tolist()
    for value in values:
        data.append([column, value])

table = Table(data, colWidths=[100, 400])
table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))

# Adicionar totalizador
total_title = Paragraph("Totalizadores por Observação", styles['Heading2'])
total_data = [['Observacao', 'Total Valor']]
for index, row in total_by_payee.iterrows():
    total_data.append([
        row['Observacao'],
        row['Valor']
    ])

total_table = Table(total_data)
total_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))

# Construir o documento
elements = [header_table, title, table, total_title, total_table]
doc.build(elements)

print(f"PDF gerado com sucesso: {pdf_file_path}")
