# -*- coding: utf-8 -*-
"""
Cliente da API B3 - Eventos Provisionados (proventos por investidor).
Ref: document.txt e B3 Investidor - Eventos Provisionados.json
"""
import requests
from config import B3_BASE_URL, BASE_PATH
from b3_auth import get_bearer_token


def _headers():
    return {
        "Authorization": f"Bearer {get_bearer_token()}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def get_provisioned_events(document_number, reference_date, page=1):
    """
    GET /investors/{documentNumber}
    document_number: CPF ou CNPJ (apenas dígitos ou formatado).
    reference_date: str 'YYYY-MM-DD'.
    page: número da página (1-based).
    Retorna: dict com 'data' (provisionedEvents) e 'Links' (paginação).
    """
    url = f"{B3_BASE_URL.rstrip('/')}{BASE_PATH}/investors/{document_number}"
    params = {"referenceDate": reference_date, "page": page}
    r = requests.get(
        url,
        params=params,
        headers=_headers(),
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def fetch_all_provisioned_events(document_number, reference_date):
    """
    Percorre todas as páginas e retorna lista única de provisionedEvents.
    """
    events = []
    page = 1
    while True:
        resp = get_provisioned_events(document_number, reference_date, page=page)
        data = resp.get("data") or {}
        batch = (data.get("provisionedEvents") or [])
        events.extend(batch)
        links = resp.get("Links") or {}
        if not links.get("next") or not batch:
            break
        page += 1
    return events


def filter_by_company(events, ticker=None, corporation_name=None):
    """
    Filtra eventos por ticker (ex: PETR4) e/or nome da empresa.
    ticker: código do ativo (case-insensitive).
    corporation_name: trecho do nome da empresa (case-insensitive).
    """
    out = events
    if ticker:
        t = (ticker or "").strip().upper()
        out = [e for e in out if (e.get("tickerSymbol") or "").upper() == t]
    if corporation_name:
        sub = (corporation_name or "").strip().lower()
        out = [
            e for e in out
            if sub in (e.get("corporationName") or "").lower()
        ]
    return out
