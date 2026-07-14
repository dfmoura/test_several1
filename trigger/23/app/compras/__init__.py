"""Módulo Compras.gov — coleta, normalização, persistência e API REST."""

from app.compras.api import router
from app.compras.orquestrador import executar_pipeline

__all__ = ["executar_pipeline", "router"]

