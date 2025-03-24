#!/usr/bin/env python3

import requests
import logging
from config import CLIENT_ID, CLIENT_SECRET, CONTA_CORRENTE, TOKEN_URL, EXTRATO_URL, CERT_FILE, KEY_FILE, DATA_INICIO, DATA_FIM

# Configuração básica de logging
logging.basicConfig(level=logging.DEBUG)

# Log das variáveis de ambiente (para debug)
logging.debug(f"Client ID: {CLIENT_ID}")
logging.debug(f"Client Secret: {CLIENT_SECRET}")
logging.debug(f"Conta Corrente: {CONTA_CORRENTE}")
logging.debug(f"Certificado: {CERT_FILE}")
logging.debug(f"Chave Privada: {KEY_FILE}")

# Corpo da requisição para obter o token de acesso
request_body = {
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "scope": "extrato.read",
    "grant_type": "client_credentials"
}

try:
    # Requisição para obter o token de acesso
    logging.debug("Solicitando token de acesso...")
    response = requests.post(
        TOKEN_URL,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        cert=(CERT_FILE, KEY_FILE),
        data=request_body
    )

    # Verifica se a requisição foi bem-sucedida
    response.raise_for_status()

    # Extrai o token de acesso da resposta
    token = response.json().get("access_token")
    if not token:
        raise ValueError("Token de acesso não encontrado na resposta.")

    logging.debug(f"Token de acesso obtido: {token}")

    # Parâmetros para a consulta do extrato
    opFiltros = {"dataInicio": DATA_INICIO, "dataFim": DATA_FIM}
    cabecalhos = {
        "Authorization": f"Bearer {token}",
        "x-conta-corrente": CONTA_CORRENTE,
        "Content-Type": "Application/json"
    }

    # Requisição para obter o extrato
    logging.debug("Solicitando extrato...")
    response = requests.get(
        EXTRATO_URL,
        params=opFiltros,
        headers=cabecalhos,
        cert=(CERT_FILE, KEY_FILE)
    )

    # Verifica se a requisição foi bem-sucedida
    response.raise_for_status()

    # Exibe o extrato
    extrato = response.json()
    logging.debug("Extrato obtido com sucesso!")
    print("Extrato = ", extrato)

except requests.exceptions.HTTPError as http_err:
    logging.error(f"Erro HTTP: {http_err}")
    logging.error(f"Resposta: {response.text}")
except requests.exceptions.SSLError as ssl_err:
    logging.error(f"Erro SSL: {ssl_err}")
except requests.exceptions.RequestException as req_err:
    logging.error(f"Erro na requisição: {req_err}")
except ValueError as val_err:
    logging.error(f"Erro de valor: {val_err}")
except Exception as ex:
    logging.error(f"Erro inesperado: {ex}")