import pandas as pd
from pyofx import OfxParser

def parse_ofx(file_path):
    """Lê um arquivo OFX e organiza os dados em um DataFrame."""
    with open(file_path, 'r') as file:
        ofx_file = file.read()
    ofx = OfxParser.parse(ofx_file)
    
    # Extrair dados do arquivo OFX
    bank_info = ofx.bank_account
    stmttrns = ofx.statement.transactions
    
    bank_data = {
        "BANKID": bank_info.bank_id,
        "BRANCHID": bank_info.branch_id,
        "ACCTID": bank_info.account_id,
        "ACCTTYPE": bank_info.account_type
    }

    transactions = []
    for tr in stmttrns:
        transactions.append({
            "TRNTYPE": tr.trntype,
            "DTPOSTED": tr.dtposted,
            "TRNAMT": tr.trnamt,
            "FITID": tr.fitid,
            "CHECKNUM": tr.checknum,
            "REFNUM": tr.refnum,
            "MEMO": tr.memo
        })
    
    df = pd.DataFrame(transactions)
    for key, value in bank_data.items():
        df[key] = value
    
    return df, bank_data
