"""Coleta de contratações PNCP (Lei 14.133) via API Dados Abertos — Compras.gov.br."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any, Callable

import httpx

from app.config import (
    COMPRAS_PNCP_ENDPOINT,
    COMPRAS_PNCP_MAX_DIAS_PERIODO,
    COMPRAS_PNCP_PAGE_SIZE,
    COMPRAS_PNCP_REQUEST_DELAY_SEC,
    DELAY_SEC,
    MODALIDADES_PNCP,
    UNIDADES_COMPRADORAS,
    USER_AGENT,
)

PNCP_CAMPOS = (
    "idCompra",
    "numeroControlePNCP",
    "anoCompraPncp",
    "sequencialCompraPncp",
    "orgaoEntidadeCnpj",
    "orgaoSubrogadoCnpj",
    "codigoOrgao",
    "orgaoEntidadeRazaoSocial",
    "orgaoSubrogadoRazaoSocial",
    "orgaoEntidadeEsferaId",
    "orgaoSubrogadoEsferaId",
    "orgaoEntidadePoderId",
    "orgaoSubrogadoPoderId",
    "unidadeOrgaoCodigoUnidade",
    "unidadeSubrogadaCodigoUnidade",
    "unidadeOrgaoNomeUnidade",
    "unidadeSubrogadaNomeUnidade",
    "unidadeOrgaoUfSigla",
    "unidadeSubrogadaUfSigla",
    "unidadeOrgaoMunicipioNome",
    "unidadeSubrogadaMunicipioNome",
    "unidadeOrgaoCodigoIbge",
    "unidadeSubrogadaCodigoIbge",
    "numeroCompra",
    "modalidadeIdPncp",
    "codigoModalidade",
    "modalidadeNome",
    "srp",
    "modoDisputaIdPncp",
    "codigoModoDisputa",
    "amparoLegalCodigoPncp",
    "amparoLegalNome",
    "amparoLegalDescricao",
    "informacaoComplementar",
    "processo",
    "objetoCompra",
    "existeResultado",
    "orcamentoSigilosoCodigo",
    "orcamentoSigilosoDescricao",
    "situacaoCompraIdPncp",
    "situacaoCompraNomePncp",
    "tipoInstrumentoConvocatorioCodigoPncp",
    "tipoInstrumentoConvocatorioNome",
    "modoDisputaNomePncp",
    "valorTotalEstimado",
    "valorTotalHomologado",
    "dataInclusaoPncp",
    "dataAtualizacaoPncp",
    "dataPublicacaoPncp",
    "dataAberturaPropostaPncp",
    "dataEncerramentoPropostaPncp",
    "contratacaoExcluida",
)


def _snake(camel: str) -> str:
    out: list[str] = []
    for i, ch in enumerate(camel):
        if ch.isupper() and i > 0:
            out.append("_")
        out.append(ch.lower())
    return "".join(out)


PNCP_SNAKE = {c: _snake(c) for c in PNCP_CAMPOS}


@dataclass
class CompraContratacaoItem:
    id_compra: str
    unidade_compradora: str
    unidade_nome: str
    ano: int
    numero: str | None = None
    modalidade_codigo: str | None = None
    modalidade_descricao: str | None = None
    objeto: str | None = None
    situacao_lista: str | None = None
    numero_controle_pncp: str | None = None
    processo: str | None = None
    informacao_complementar: str | None = None
    valor_total_estimado: str | None = None
    valor_total_homologado: str | None = None
    data_publicacao_pncp: str | None = None
    data_abertura_proposta_pncp: str | None = None
    data_encerramento_proposta_pncp: str | None = None
    link_pncp: str | None = None
    dados_pncp: dict[str, Any] = field(default_factory=dict)

    # Compatibilidade com rotas/UI legadas
    @property
    def chave_compra(self) -> str:
        return self.id_compra

    @property
    def data_divulgacao_pncp(self) -> str | None:
        return self.data_publicacao_pncp

    @property
    def situacao_pncp(self) -> str | None:
        return self.situacao_lista

    @property
    def id_contratacao_pncp(self) -> str | None:
        return self.numero_controle_pncp

    @property
    def inicio_recebimento_propostas(self) -> str | None:
        return self.data_abertura_proposta_pncp

    @property
    def fim_recebimento_propostas(self) -> str | None:
        return self.data_encerramento_proposta_pncp

    @property
    def url_acompanhamento(self) -> str | None:
        return self.link_pncp


def _fmt_valor(val: Any) -> str | None:
    if val is None or val == "":
        return None
    if isinstance(val, (int, float)):
        return f"R$ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return str(val)


def _fmt_data(val: Any) -> str | None:
    if val is None or val == "":
        return None
    texto = str(val).strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(texto[:19], fmt).strftime("%d/%m/%Y %H:%M")
        except ValueError:
            continue
    return texto


def _fmt_bool(val: Any) -> str | None:
    if val is None:
        return None
    if isinstance(val, bool):
        return "sim" if val else "não"
    return str(val)


def _link_pncp(raw: dict[str, Any]) -> str | None:
    cnpj = raw.get("orgaoEntidadeCnpj")
    ano = raw.get("anoCompraPncp")
    seq = raw.get("sequencialCompraPncp")
    if cnpj and ano and seq is not None:
        return f"https://pncp.gov.br/app/editais/{cnpj}/{ano}/{seq}"
    return None


def item_da_api(raw: dict[str, Any], *, ano_filtro: int | None = None) -> CompraContratacaoItem | None:
    id_compra = str(raw.get("idCompra") or "").strip()
    if not id_compra:
        return None

    ano = raw.get("anoCompraPncp")
    try:
        ano_int = int(ano) if ano is not None else 0
    except (TypeError, ValueError):
        return None
    if ano_filtro is not None and ano_int != ano_filtro:
        return None

    unidade = str(raw.get("unidadeOrgaoCodigoUnidade") or "").strip()
    unidade_nome = (
        str(raw.get("unidadeOrgaoNomeUnidade") or "").strip()
        or UNIDADES_COMPRADORAS.get(unidade, unidade)
    )

    dados = {PNCP_SNAKE[k]: raw.get(k) for k in PNCP_CAMPOS}
    for k, v in dados.items():
        if isinstance(v, bool):
            dados[k] = v
        elif v is not None and not isinstance(v, (str, int, float)):
            dados[k] = str(v)

    return CompraContratacaoItem(
        id_compra=id_compra,
        unidade_compradora=unidade or "000000",
        unidade_nome=unidade_nome,
        ano=ano_int,
        numero=str(raw.get("numeroCompra") or "") or None,
        modalidade_codigo=str(raw.get("codigoModalidade") or "") or None,
        modalidade_descricao=str(raw.get("modalidadeNome") or "") or None,
        objeto=str(raw.get("objetoCompra") or "") or None,
        situacao_lista=str(raw.get("situacaoCompraNomePncp") or "") or None,
        numero_controle_pncp=str(raw.get("numeroControlePNCP") or "") or None,
        processo=str(raw.get("processo") or "") or None,
        informacao_complementar=str(raw.get("informacaoComplementar") or "") or None,
        valor_total_estimado=_fmt_valor(raw.get("valorTotalEstimado")),
        valor_total_homologado=_fmt_valor(raw.get("valorTotalHomologado")),
        data_publicacao_pncp=_fmt_data(raw.get("dataPublicacaoPncp")),
        data_abertura_proposta_pncp=_fmt_data(raw.get("dataAberturaPropostaPncp")),
        data_encerramento_proposta_pncp=_fmt_data(raw.get("dataEncerramentoPropostaPncp")),
        link_pncp=_link_pncp(raw),
        dados_pncp=dados,
    )


_BOOL_COLS = frozenset({"srp", "existe_resultado", "contratacao_excluida"})


def item_para_db(item: CompraContratacaoItem) -> dict[str, Any]:
    """Campos para persistência SQLAlchemy."""
    d = item.dados_pncp
    base: dict[str, Any] = {
        "id_compra": item.id_compra,
        "chave_compra": item.id_compra,
        "unidade_compradora": item.unidade_compradora,
        "unidade_nome": item.unidade_nome,
        "ano": item.ano,
        "ano_compra_pncp": d.get("ano_compra_pncp") or item.ano,
        "numero": item.numero,
        "modalidade_codigo": item.modalidade_codigo,
        "modalidade_descricao": item.modalidade_descricao,
        "objeto": item.objeto,
        "situacao_lista": item.situacao_lista,
        "situacao_compra_nome_pncp": item.situacao_lista,
        "numero_controle_pncp": item.numero_controle_pncp,
        "sequencial_compra_pncp": d.get("sequencial_compra_pncp"),
        "processo": item.processo,
        "informacao_complementar": item.informacao_complementar,
        "valor_total_estimado": item.valor_total_estimado,
        "valor_total_homologado": item.valor_total_homologado,
        "data_publicacao_pncp": item.data_publicacao_pncp,
        "data_abertura_proposta_pncp": item.data_abertura_proposta_pncp,
        "data_encerramento_proposta_pncp": item.data_encerramento_proposta_pncp,
        "data_inclusao_pncp": _fmt_data(d.get("data_inclusao_pncp")),
        "data_atualizacao_pncp": _fmt_data(d.get("data_atualizacao_pncp")),
        "link_pncp": item.link_pncp,
        "dados_pncp_json": json.dumps(item.dados_pncp, ensure_ascii=False),
        "data_divulgacao_pncp": item.data_publicacao_pncp,
        "situacao_pncp": item.situacao_lista,
        "id_contratacao_pncp": item.numero_controle_pncp,
        "inicio_recebimento_propostas": item.data_abertura_proposta_pncp,
        "fim_recebimento_propostas": item.data_encerramento_proposta_pncp,
        "url_acompanhamento": item.link_pncp,
        "orgao_entidade_cnpj": d.get("orgao_entidade_cnpj"),
        "orgao_subrogado_cnpj": d.get("orgao_subrogado_cnpj"),
        "codigo_orgao": d.get("codigo_orgao"),
        "orgao_entidade_razao_social": d.get("orgao_entidade_razao_social"),
        "orgao_subrogado_razao_social": d.get("orgao_subrogado_razao_social"),
        "orgao_entidade_esfera_id": d.get("orgao_entidade_esfera_id"),
        "orgao_subrogado_esfera_id": d.get("orgao_subrogado_esfera_id"),
        "orgao_entidade_poder_id": d.get("orgao_entidade_poder_id"),
        "orgao_subrogado_poder_id": d.get("orgao_subrogado_poder_id"),
        "unidade_subrogada_codigo_unidade": d.get("unidade_subrogada_codigo_unidade"),
        "unidade_orgao_nome_unidade": d.get("unidade_orgao_nome_unidade"),
        "unidade_subrogada_nome_unidade": d.get("unidade_subrogada_nome_unidade"),
        "unidade_orgao_uf_sigla": d.get("unidade_orgao_uf_sigla"),
        "unidade_subrogada_uf_sigla": d.get("unidade_subrogada_uf_sigla"),
        "unidade_orgao_municipio_nome": d.get("unidade_orgao_municipio_nome"),
        "unidade_subrogada_municipio_nome": d.get("unidade_subrogada_municipio_nome"),
        "unidade_orgao_codigo_ibge": d.get("unidade_orgao_codigo_ibge"),
        "unidade_subrogada_codigo_ibge": d.get("unidade_subrogada_codigo_ibge"),
        "modalidade_id_pncp": d.get("modalidade_id_pncp"),
        "modo_disputa_id_pncp": d.get("modo_disputa_id_pncp"),
        "codigo_modo_disputa": d.get("codigo_modo_disputa"),
        "modo_disputa_nome_pncp": d.get("modo_disputa_nome_pncp"),
        "amparo_legal_codigo_pncp": d.get("amparo_legal_codigo_pncp"),
        "amparo_legal_nome": d.get("amparo_legal_nome"),
        "amparo_legal_descricao": d.get("amparo_legal_descricao"),
        "orcamento_sigiloso_codigo": d.get("orcamento_sigiloso_codigo"),
        "orcamento_sigiloso_descricao": d.get("orcamento_sigiloso_descricao"),
        "situacao_compra_id_pncp": d.get("situacao_compra_id_pncp"),
        "tipo_instrumento_convocatorio_codigo_pncp": d.get("tipo_instrumento_convocatorio_codigo_pncp"),
        "tipo_instrumento_convocatorio_nome": d.get("tipo_instrumento_convocatorio_nome"),
    }
    for col in _BOOL_COLS:
        val = d.get(col)
        if isinstance(val, bool):
            base[col] = val
        elif val is not None:
            base[col] = str(val).lower() in ("true", "1", "sim", "yes")
    if d.get("existe_resultado") is not None:
        val = d.get("existe_resultado")
        base["existe_resultado"] = val if isinstance(val, bool) else str(val).lower() == "true"
    return base


def _periodos(data_inicial: date, data_final: date, max_dias: int) -> list[tuple[date, date]]:
    if data_final < data_inicial:
        raise ValueError("data_final deve ser >= data_inicial")
    periodos: list[tuple[date, date]] = []
    inicio = data_inicial
    while inicio <= data_final:
        fim = min(inicio + timedelta(days=max_dias - 1), data_final)
        periodos.append((inicio, fim))
        inicio = fim + timedelta(days=1)
    return periodos


class PncpClient:
    def __init__(self) -> None:
        self._http = httpx.Client(
            timeout=90.0,
            follow_redirects=True,
            headers={"Accept": "*/*", "User-Agent": USER_AGENT},
        )

    def close(self) -> None:
        self._http.close()

    def consultar(
        self,
        *,
        pagina: int,
        tamanho_pagina: int,
        unidade: str,
        data_inicial: date,
        data_final: date,
        codigo_modalidade: int,
    ) -> dict[str, Any]:
        params = {
            "pagina": pagina,
            "tamanhoPagina": tamanho_pagina,
            "unidadeOrgaoCodigoUnidade": unidade,
            "dataPublicacaoPncpInicial": data_inicial.isoformat(),
            "dataPublicacaoPncpFinal": data_final.isoformat(),
            "codigoModalidade": codigo_modalidade,
        }
        resp = self._http.get(COMPRAS_PNCP_ENDPOINT, params=params)
        if resp.status_code >= 400:
            raise RuntimeError(
                f"API PNCP HTTP {resp.status_code}: {resp.text[:300]}"
            )
        data = resp.json()
        if not isinstance(data, dict):
            raise RuntimeError("Resposta PNCP inválida")
        return data


def coletar(
    *,
    data_inicial: date,
    data_final: date,
    unidades: list[str] | None = None,
    modalidades: list[int] | None = None,
    ano: int | None = None,
    on_log: Callable[[str], None] | None = None,
    on_fase: Callable[[str], None] | None = None,
) -> list[CompraContratacaoItem]:
    log = on_log or (lambda _: None)
    fase = on_fase or (lambda _: None)

    unidades_alvo = unidades or list(UNIDADES_COMPRADORAS.keys())
    modalidades_alvo = modalidades or list(MODALIDADES_PNCP.keys())
    periodos = _periodos(data_inicial, data_final, COMPRAS_PNCP_MAX_DIAS_PERIODO)

    vistos: set[str] = set()
    resultado: list[CompraContratacaoItem] = []
    client = PncpClient()

    try:
        fase("coletando")
        log(
            f"API Dados Abertos — {len(unidades_alvo)} unidade(s), "
            f"{len(modalidades_alvo)} modalidade(s), "
            f"{data_inicial.isoformat()} a {data_final.isoformat()}"
        )
        if len(periodos) > 1:
            log(f"  Período dividido em {len(periodos)} janela(s) (máx. {COMPRAS_PNCP_MAX_DIAS_PERIODO} dias).")

        for unidade in unidades_alvo:
            nome_u = UNIDADES_COMPRADORAS.get(unidade, unidade)
            for cod_mod in modalidades_alvo:
                nome_mod = MODALIDADES_PNCP.get(cod_mod, str(cod_mod))
                for per_ini, per_fim in periodos:
                    pagina = 1
                    total_paginas = 1
                    while pagina <= total_paginas:
                        log(
                            f"  {nome_u} | mod. {cod_mod} ({nome_mod}) | "
                            f"{per_ini}–{per_fim} | página {pagina}/{total_paginas}"
                        )
                        payload = client.consultar(
                            pagina=pagina,
                            tamanho_pagina=COMPRAS_PNCP_PAGE_SIZE,
                            unidade=unidade,
                            data_inicial=per_ini,
                            data_final=per_fim,
                            codigo_modalidade=cod_mod,
                        )
                        total_paginas = int(payload.get("totalPaginas") or 1)
                        registros = payload.get("resultado") or []
                        if not isinstance(registros, list):
                            registros = []

                        novos = 0
                        for raw in registros:
                            if not isinstance(raw, dict):
                                continue
                            item = item_da_api(raw, ano_filtro=ano)
                            if not item or item.id_compra in vistos:
                                continue
                            vistos.add(item.id_compra)
                            resultado.append(item)
                            novos += 1

                        total_api = payload.get("totalRegistros")
                        log(
                            f"    → {len(registros)} na página "
                            f"({novos} novos, {len(vistos)} acumulados"
                            f"{f', total API: {total_api}' if total_api is not None else ''})"
                        )

                        if pagina >= total_paginas or not registros:
                            break
                        pagina += 1
                        time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)
                    time.sleep(DELAY_SEC / 2)
    finally:
        client.close()
        fase("idle")

    log(f"Coleta finalizada: {len(resultado)} contratação(ões).")
    return resultado
