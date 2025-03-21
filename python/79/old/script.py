import xml.etree.ElementTree as ET
import json
import os
from collections import defaultdict

def parse_ofx_header(ofx_content):
    """
    Parseia o cabeçalho do OFX (parte antes do <OFX>).
    """
    header = {}
    lines = ofx_content.splitlines()
    for line in lines:
        if line.strip() == "" or line.strip().startswith("<"):
            break
        if ":" in line:
            key, value = line.split(":", 1)
            header[key.strip()] = value.strip()
    return header

def parse_element(element):
    """
    Parseia um elemento XML recursivamente e retorna um dicionário.
    """
    data = {}
    for child in element:
        if len(child) > 0:
            # Se o elemento tem filhos, processa recursivamente
            if child.tag in data:
                # Se a tag já existe, transforma em uma lista
                if not isinstance(data[child.tag], list):
                    data[child.tag] = [data[child.tag]]
                data[child.tag].append(parse_element(child))
            else:
                data[child.tag] = parse_element(child)
        else:
            # Se o elemento não tem filhos, armazena o texto
            data[child.tag] = child.text
    return data

def ofx_to_json(ofx_file_path, json_file_path):
    """
    Converte um arquivo OFX para JSON.
    """
    # Lê o conteúdo do arquivo OFX
    with open(ofx_file_path, 'r', encoding='utf-8') as file:
        ofx_content = file.read()

    # Parseia o cabeçalho do OFX
    header = parse_ofx_header(ofx_content)

    # Remove o cabeçalho para processar o corpo do OFX
    ofx_body = ofx_content.split("<OFX>", 1)[-1]
    ofx_body = "<OFX>" + ofx_body

    # Parseia o corpo do OFX (XML)
    root = ET.fromstring(ofx_body)

    # Converte o corpo do OFX para um dicionário
    ofx_dict = parse_element(root)

    # Adiciona o cabeçalho ao dicionário final
    ofx_dict["OFXHEADER"] = header

    # Salva o JSON
    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json.dump(ofx_dict, json_file, indent=4, ensure_ascii=False)

if __name__ == "__main__":
    ofx_file = "/app/ofx/exemplo.ofx"
    json_file = "/app/json/output.json"
    ofx_to_json(ofx_file, json_file)
    print(f"JSON gerado com sucesso em {json_file}")