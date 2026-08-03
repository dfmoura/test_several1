"""Ponto de integração futuro com a Focus NFe (https://doc.focusnfe.com.br/reference/nfe).

Quando o certificado digital A1 da empresa estiver cadastrado na Focus NFe,
este serviço permitirá buscar automaticamente os XMLs das notas emitidas
contra o CNPJ da empresa (manifestação do destinatário), eliminando o
upload manual.

Fluxo previsto:
  1. Configurar FOCUS_NFE_TOKEN no .env / docker-compose.
  2. Job periódico chama GET /v2/nfes_recebidas?cnpj=<cnpj da empresa>.
  3. Para cada nota nova, baixar o XML e reaproveitar o mesmo pipeline do
     upload manual (parse_nfe_xml -> NfeImport PENDENTE -> aceite na tela).

Por enquanto a importação é manual (arrastar o XML na tela de NF-e).
"""

import os

import httpx

FOCUS_BASE_URL = "https://api.focusnfe.com.br"


def is_configured() -> bool:
    return bool(os.environ.get("FOCUS_NFE_TOKEN"))


async def fetch_received_nfes(cnpj: str) -> list[dict]:
    """Busca notas recebidas na Focus NFe. Requer FOCUS_NFE_TOKEN configurado."""
    token = os.environ.get("FOCUS_NFE_TOKEN")
    if not token:
        raise RuntimeError("FOCUS_NFE_TOKEN não configurado.")
    async with httpx.AsyncClient(timeout=30.0, auth=(token, "")) as client:
        resp = await client.get(f"{FOCUS_BASE_URL}/v2/nfes_recebidas", params={"cnpj": cnpj})
        resp.raise_for_status()
        return resp.json()
