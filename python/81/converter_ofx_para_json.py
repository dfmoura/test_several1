import ofxtools
import json
import os
import tempfile

def remove_ofx_header(ofx_content):
    # Remover o cabeçalho OFX (todas as linhas antes da tag <OFX>)
    ofx_start = ofx_content.find("<OFX>")
    if ofx_start == -1:
        raise ValueError("Cabeçalho OFX inválido: tag <OFX> não encontrada.")
    return ofx_content[ofx_start:]

def ofx_to_json(ofx_file_path, json_file_path):
    # Ler o arquivo OFX
    with open(ofx_file_path, 'r', encoding='utf-8') as ofx_file:
        ofx_content = ofx_file.read()

    # Remover o cabeçalho OFX
    ofx_content = remove_ofx_header(ofx_content)

    # Salvar o conteúdo OFX (sem cabeçalho) em um arquivo temporário
    with tempfile.NamedTemporaryFile(mode='w', delete=False, encoding='utf-8') as temp_file:
        temp_file.write(ofx_content)
        temp_file_path = temp_file.name

    # Criar um objeto OFXTree para analisar o arquivo OFX
    parser = ofxtools.OFXTree()

    # Analisar o arquivo temporário
    parser.parse(temp_file_path)
    ofx_obj = parser.convert()

    # Converter o objeto Python para JSON
    json_content = json.dumps(ofx_obj, default=str, indent=4)

    # Salvar o JSON em um arquivo
    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json_file.write(json_content)

    # Remover o arquivo temporário
    os.remove(temp_file_path)

    print(f"Arquivo JSON salvo em: {json_file_path}")

def find_ofx_file(input_dir):
    # Procurar por arquivos .ofx no diretório de entrada
    for file_name in os.listdir(input_dir):
        if file_name.endswith(".ofx"):
            return os.path.join(input_dir, file_name)
    return None

if __name__ == "__main__":
    # Caminho para o diretório de entrada
    input_dir = "/app/input"

    # Caminho para o arquivo JSON de saída
    output_dir = "/app/output"
    json_file_path = os.path.join(output_dir, "saida.json")

    # Encontrar o arquivo .ofx no diretório de entrada
    ofx_file_path = find_ofx_file(input_dir)

    if ofx_file_path is None:
        print("Nenhum arquivo .ofx encontrado no diretório de entrada.")
    else:
        # Criar diretório de saída se não existir
        os.makedirs(output_dir, exist_ok=True)

        # Converter OFX para JSON
        ofx_to_json(ofx_file_path, json_file_path)