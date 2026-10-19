from __future__ import annotations

from app.regras import decidir_faixa_cd

HOSTS_BLOQUEADOS = (
    "brasilapi.com.br",
    "viacep.com.br",
    "minhareceita.org",
    "open.cnpja.com",
    "publica.cnpj.ws",
)


class FaixaDesligada(Exception):
    pass


def tentar_faixa_c(*, habilitada: bool, anterior_ok: bool, cliente) -> str:
    if not decidir_faixa_cd(habilitada=habilitada, anterior_ok=anterior_ok):
        return "nao_disparada"
    cliente.consultar_cnpj("00000000000191")
    return "disparada"


def tentar_faixa_d(*, habilitada: bool, anterior_ok: bool, cliente) -> str:
    if not decidir_faixa_cd(habilitada=habilitada, anterior_ok=anterior_ok):
        return "nao_disparada"
    cliente.consultar_cep("38400000")
    return "disparada"
