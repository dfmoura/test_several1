# -*- coding: utf-8 -*-
"""Configuração da aplicação B3 - Eventos Provisionados."""
import os
from dotenv import load_dotenv

load_dotenv()

B3_ENV = os.getenv("B3_ENV", "cert").lower()

# Hosts da API (document.txt)
B3_HOSTS = {
    "cert": "https://apib3i-cert.b3.com.br:2443",
    "prod": "https://investidor.b3.com.br:2443",
}
B3_BASE_URL = os.getenv("B3_BASE_URL") or B3_HOSTS.get(B3_ENV, B3_HOSTS["cert"])

# OAuth2 - Azure AD (B3 usa Microsoft para token)
# Tenant IDs: certificação vs produção
AZURE_TENANT_IDS = {
    "cert": "4bee639f-5388-44c7-bbac-cb92a93911e6",
    "prod": "aa5ac705-873b-4afc-a29d-f0adb89ccf5c",
}
AZURE_TENANT_ID = os.getenv("B3_AZURE_TENANT_ID") or AZURE_TENANT_IDS.get(
    B3_ENV, AZURE_TENANT_IDS["cert"]
)
TOKEN_URL = (
    f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token"
)

B3_CLIENT_ID = os.getenv("B3_CLIENT_ID", "")
B3_CLIENT_SECRET = os.getenv("B3_CLIENT_SECRET", "")
# Scope: pode ser .default ou o scope específico da API (conforme pacote B3)
B3_SCOPE = os.getenv(
    "B3_SCOPE",
    "https://apib3i-cert.b3.com.br/.default" if B3_ENV == "cert" else "https://investidor.b3.com.br/.default",
)

BASE_PATH = "/api/provisioned-events/v2"
