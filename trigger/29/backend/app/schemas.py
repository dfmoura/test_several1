from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class FaixaIn(BaseModel):
    quantidade: int = Field(gt=0)
    comissao_pct: float = 0.0


class CalcularIn(BaseModel):
    cliente: str
    medida: str
    largura_cm: float
    puxada_cm: float
    cores: Any
    papel: str
    acabamento: str
    modelos: int = 0
    colunas: int = Field(gt=0)
    etiq_por_rolo: int = Field(gt=0)
    tubete: str
    z: float | None = None
    maquina: str
    maquina_roda_servico: str | None = None
    imposto_pct: float = 16.0
    matriz: str = "SIM"
    coluna_rebobinacao: int = 1
    tipo_troca_produto: str = "SEM PARADA"
    rpm: float = 1000.0
    faixas: list[FaixaIn]
    overrides: dict[str, Any] | None = None
    matriz_ja_cobrada: bool = False
    prazo_entrega: str = "12 DIAS ÚTEIS"
    validade_proposta: str = "7 dias"
    tolerancia_qtd_pct: float = 20.0


class QuoteCreate(CalcularIn):
    pass
