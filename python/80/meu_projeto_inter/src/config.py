import os
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env
load_dotenv()

# Acessa as variáveis de ambiente
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
CONTA_CORRENTE = os.getenv("CONTA_CORRENTE")
TOKEN_URL = os.getenv("TOKEN_URL", "https://cdpj.partners.bancointer.com.br/oauth/v2/token")
EXTRATO_URL = os.getenv("EXTRATO_URL", "https://cdpj.partners.bancointer.com.br/banking/v2/extrato")
CERT_FILE = os.getenv("CERT_FILE", "certs/certificado.crt")  # Valor padrão se não estiver no .env
KEY_FILE = os.getenv("KEY_FILE", "certs/chave_privada.key")  # Valor padrão se não estiver no .env
DATA_INICIO = os.getenv("DATA_INICIO", "2024-04-01")  # Valor padrão se não estiver no .env
DATA_FIM = os.getenv("DATA_FIM", "2024-04-05")  # Valor padrão se não estiver no .env

# Verifica se as variáveis obrigatórias foram carregadas
if not CLIENT_ID or not CLIENT_SECRET or not CONTA_CORRENTE:
    raise ValueError("Variáveis de ambiente obrigatórias não configuradas corretamente.")