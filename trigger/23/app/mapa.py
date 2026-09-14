"""Configuração pública do basemap (Leaflet / CARTO).

A API key de tiles é intencionalmente exposta ao frontend: o CDN a exige
na URL de cada tile. Restrinja a key por domínio no painel CARTO.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.config import CARTO_BASEMAP_API_KEY

router = APIRouter(tags=["mapa"])


@router.get("/api/mapa/basemap")
def basemap_config():
    """Metadados do fundo de mapa — consumido por localidade.js."""
    key = CARTO_BASEMAP_API_KEY
    return {
        "provider": "carto",
        "style": "light_nolabels",
        "carto_api_key": key,
        "configured": bool(key),
    }
