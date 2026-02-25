# -*- coding: utf-8 -*-
"""Autenticação OAuth2 (Client Credentials) para APIs B3."""
import time
import requests
from config import (
    TOKEN_URL,
    B3_CLIENT_ID,
    B3_CLIENT_SECRET,
    B3_SCOPE,
)


class B3Auth:
    """Obtém e reutiliza access_token da B3 (Azure AD)."""

    def __init__(self):
        self._access_token = None
        self._expires_at = 0

    def get_token(self, force_refresh=False):
        """Retorna um access_token válido, renovando se necessário."""
        if not force_refresh and self._access_token and time.time() < self._expires_at - 60:
            return self._access_token

        if not B3_CLIENT_ID or not B3_CLIENT_SECRET:
            raise ValueError(
                "Configure B3_CLIENT_ID e B3_CLIENT_SECRET no .env (veja .env.example)"
            )

        data = {
            "grant_type": "client_credentials",
            "client_id": B3_CLIENT_ID,
            "client_secret": B3_CLIENT_SECRET,
            "scope": B3_SCOPE,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        resp = requests.post(TOKEN_URL, data=data, headers=headers, timeout=30)
        resp.raise_for_status()
        body = resp.json()
        self._access_token = body["access_token"]
        self._expires_at = time.time() + int(body.get("expires_in", 3600))
        return self._access_token


# Singleton para uso no cliente da API
_auth = B3Auth()


def get_bearer_token():
    return _auth.get_token()
