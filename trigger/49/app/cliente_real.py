from __future__ import annotations

from datetime import date

from app.config import (
    PAGINA_CONTRATACAO,
    URL_ATAS_PNCP,
    URL_CONTRATACAO,
    URL_CONTRATOS_PNCP,
    URL_ITENS,
    URL_RESULTADOS,
    URL_UASG,
)
from app.http_oficial import ClienteHttp
from app.regras import parametro_codigo_modalidade


class ClienteFaixaA:
    def __init__(self, http: ClienteHttp | None = None) -> None:
        self.http = http or ClienteHttp()

    def uasgs(self, *, ibge: int, uf: str) -> list[dict]:
        dados = self.http.get_json(
            URL_UASG,
            {
                "pagina": 1,
                "tamanhoPagina": PAGINA_CONTRATACAO,
                "siglaUf": uf,
                "codigoMunicipioIbge": ibge,
                "statusUasg": "true",
            },
        )
        return [item for item in dados.get("resultado") or [] if isinstance(item, dict)]

    def contratacoes(
        self,
        *,
        uasg: str,
        inicio: date,
        fim: date,
        codigo_modalidade: int,
        pagina: int,
        tamanho: int,
    ) -> dict:
        params = {
            "pagina": pagina,
            "tamanhoPagina": tamanho,
            "unidadeOrgaoCodigoUnidade": uasg,
            "dataPublicacaoPncpInicial": inicio.isoformat(),
            "dataPublicacaoPncpFinal": fim.isoformat(),
            **parametro_codigo_modalidade(codigo_modalidade),
        }
        return self.http.get_json(URL_CONTRATACAO, params)

    def por_numero(self, numero: str) -> dict | None:
        dados = self.http.get_json(
            URL_CONTRATACAO.replace("1_consultar", "1.1_consultar"),
            {"codigo": numero, "tipo": "numeroControlePNCPCompra"},
        )
        registros = dados.get("resultado") or []
        if isinstance(registros, list) and registros:
            return registros[0]
        return None

    def itens(self, *, uasg: str, inicio: date, fim: date, pagina: int, tamanho: int) -> dict:
        return self.http.get_json(
            URL_ITENS,
            {
                "pagina": pagina,
                "tamanhoPagina": tamanho,
                "unidadeOrgaoCodigoUnidade": uasg,
                "dataInclusaoPncpInicial": inicio.isoformat(),
                "dataInclusaoPncpFinal": fim.isoformat(),
            },
        )

    def resultados(
        self, *, uasg: str, inicio: date, fim: date, pagina: int, tamanho: int
    ) -> dict:
        # Mesmo padrão do sistema 23: janela por UASG, não consulta por número isolado.
        return self.http.get_json(
            URL_RESULTADOS,
            {
                "pagina": pagina,
                "tamanhoPagina": tamanho,
                "unidadeOrgaoCodigoUnidade": uasg,
                "dataResultadoPncpInicial": inicio.isoformat(),
                "dataResultadoPncpFinal": fim.isoformat(),
            },
        )

    def catalogo(self, codigo: str, tipo: str) -> dict | None:
        return None


class ClienteFaixaB:
    def __init__(self, http: ClienteHttp | None = None) -> None:
        self.http = http or ClienteHttp()

    def contratos(self, *, cnpj_orgao: str, data_inicial: str, data_final: str, pagina: int) -> dict:
        return self.http.get_json(
            URL_CONTRATOS_PNCP,
            {
                "dataInicial": data_inicial,
                "dataFinal": data_final,
                "cnpjOrgao": cnpj_orgao,
                "pagina": pagina,
                "tamanhoPagina": 50,
            },
        )

    def atas(self, *, cnpj_orgao: str, data_inicial: str, data_final: str, pagina: int) -> dict:
        return self.http.get_json(
            URL_ATAS_PNCP,
            {
                "dataInicial": data_inicial,
                "dataFinal": data_final,
                "cnpjOrgao": cnpj_orgao,
                "pagina": pagina,
                "tamanhoPagina": 50,
            },
        )
