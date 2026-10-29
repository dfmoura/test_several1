"""Worker: uma faixa por vez, dentro da madrugada. Não chama CNPJ nem CEP."""

from __future__ import annotations

import logging
import signal
import time

from app.agenda import ciclo
from app.cliente_real import ClienteFaixaA, ClienteFaixaB
from app.db import SessionLocal

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("worker")

_parar = False


def _pedir_parada(signum, _frame) -> None:
    global _parar
    _parar = True
    log.info("Sinal %s recebido; o worker encerra.", signum)


class _SemRede:
    def consultar_cnpj(self, _cnpj: str) -> None:
        raise RuntimeError("faixa C não é chamada com a flag desligada")

    def consultar_cep(self, _cep: str) -> None:
        raise RuntimeError("faixa D não é chamada com a flag desligada")

    def uasgs(self, **_kwargs):
        return []

    def contratacoes(self, **_kwargs):
        return {"resultado": [], "totalPaginas": 1}

    def por_numero(self, _numero):
        return None

    def itens(self, **_kwargs):
        return {"resultado": [], "totalPaginas": 1}

    def resultados(self, **_kwargs):
        return {"resultado": [], "totalPaginas": 1}

    def catalogo(self, _codigo, _tipo):
        return None

    def contratos(self, **_kwargs):
        return {"data": [], "totalPaginas": 1}

    def atas(self, **_kwargs):
        return {"data": [], "totalPaginas": 1}


def main() -> None:
    signal.signal(signal.SIGTERM, _pedir_parada)
    signal.signal(signal.SIGINT, _pedir_parada)
    log.info("Worker no ar. Faixas C e D permanecem desligadas.")
    faixa_a = ClienteFaixaA()
    faixa_b = ClienteFaixaB()
    cd = _SemRede()
    while not _parar:
        db = SessionLocal()
        try:
            ciclo(db, faixa_a, faixa_b, cd)
        except Exception:
            log.exception("Ciclo de coleta não concluído")
        finally:
            db.close()
        for _ in range(20):
            if _parar:
                break
            time.sleep(1)


if __name__ == "__main__":
    main()
