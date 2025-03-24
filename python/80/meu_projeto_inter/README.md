# Integração com o Banco Inter

Este projeto faz a integração com a API do Banco Inter para consultar extratos bancários.

## Como executar

1. Construa a imagem Docker:
   ```bash
   docker build -t inter-integration .

   docker run --rm inter-integration



---

#### 6. **`src/config.py`**
Arquivo para centralizar as configurações do projeto.

```python
import os
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env
load_dotenv()

# Acessa as variáveis
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
CONTA_CORRENTE = os.getenv("CONTA_CORRENTE")
TOKEN_URL = os.getenv("TOKEN_URL")
EXTRATO_URL = os.getenv("EXTRATO_URL")
CERT_FILE = os.getenv("CERT_FILE", "certs/certificado.crt")  # Valor padrão se não estiver no .env
KEY_FILE = os.getenv("KEY_FILE", "certs/chave_privada.key")  # Valor padrão se não estiver no .env
DATA_INICIO = os.getenv("DATA_INICIO", "2024-04-01")  # Valor padrão se não estiver no .env
DATA_FIM = os.getenv("DATA_FIM", "2024-04-05")  # Valor padrão se não estiver no .env