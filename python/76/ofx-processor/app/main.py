import os
import json
import xml.etree.ElementTree as ET
from datetime import datetime
from ofxtools.Parser import OFXTree

def convert_ofx_to_xml(file_path):
    # Usa ofxtools para converter o arquivo OFX (SGML) para XML
    parser = OFXTree()
    with open(file_path, 'rb') as f:
        parser.parse(f)
    ofx = parser.convert()
    return ofx.to_etree()

def parse_ofx(file_path):
    # Converte o OFX para XML e processa
    root = convert_ofx_to_xml(file_path)

    # Namespace do OFX (pode variar dependendo do arquivo)
    namespaces = {
        'ofx': 'http://ofx.net/types/2003/04'
    }

    transactions = []

    # Extrai as transações
    for stmttrn in root.findall(".//ofx:STMTTRN", namespaces):
        dtposted = stmttrn.find("ofx:DTPOSTED", namespaces).text
        trntype = stmttrn.find("ofx:TRNTYPE", namespaces).text
        fitid = stmttrn.find("ofx:FITID", namespaces).text
        acctid = stmttrn.find("ofx:ACCTID", namespaces).text  # Assuming you need to extract acctid

        # Validate and truncate acctid if necessary
        if len(acctid) > 22:
            acctid = acctid[:22]  # Truncate to max length of 22 characters
            print(f"Warning: acctid truncated to {acctid}")

        # Truncate fitid to max length of 22 characters
        fitid = fitid[:22]  # Ensure fitid does not exceed 22 characters

        # Formata a data para DD/MM/YYYY
        dtposted = datetime.strptime(dtposted[:8], "%Y%m%d").strftime("%d/%m/%Y")

        transaction = {
            "DTPOSTED": dtposted,
            "TRNTYPE": trntype,
            "FITID": fitid,
            "ACCTID": acctid,  # Include the acctid in the transaction
        }
        transactions.append(transaction)

    return transactions

def process_ofx_files(input_folder):
    output_data = {}
    for filename in os.listdir(input_folder):
        if filename.endswith(".ofx"):
            file_path = os.path.join(input_folder, filename)
            transactions = parse_ofx(file_path)
            output_data[filename] = transactions

    return output_data

def save_to_json(data, output_folder):
    output_path = os.path.join(output_folder, "transactions.json")
    with open(output_path, 'w') as json_file:
        json.dump(data, json_file, indent=4)

if __name__ == "__main__":
    input_folder = "/app/data"
    output_folder = "/app/data"

    data = process_ofx_files(input_folder)
    save_to_json(data, output_folder)
    print("Processamento concluído. JSON gerado com sucesso.")