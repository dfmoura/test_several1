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
    COMPRAS_PNCP_HTTP_TIMEOUT_SEC,
    COMPRAS_PNCP_ID_ENDPOINT,
    COMPRAS_PNCP_ITENS_ENDPOINT,
    COMPRAS_PNCP_ITENS_ID_ENDPOINT,
    COMPRAS_PNCP_ITENS_MAX_FALHAS_SEGUIDAS,
    COMPRAS_PNCP_ITENS_PAGE_SIZE,
    COMPRAS_PNCP_ITENS_PAGE_SIZE_MIN,
    COMPRAS_PNCP_ITENS_TENTATIVAS,
    COMPRAS_PNCP_MAX_DIAS_PERIODO,
    COMPRAS_PNCP_MAX_DIAS_PERIODO_ITENS,
    COMPRAS_PNCP_MAX_RETRIES,
    COMPRAS_PNCP_PAGE_SIZE,
    COMPRAS_PNCP_REQUEST_DELAY_SEC,
    DELAY_SEC,
    MODALIDADES_COMPRAS,
    nome_modalidade_compras,
    UNIDADES_COMPRADORAS,
    USER_AGENT,
)
from app.compras.client import espera_retry_http, espera_retry_timeout
from app.unidades_compradoras import obter_unidades_compradoras

_RETRYABLE_STATUS = frozenset({429, 502, 503, 504})

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
    # Nome da API; seed/config como fallback leve (Setup é a fonte da coleta).
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


def _httpx_timeout() -> httpx.Timeout:
    return httpx.Timeout(
        connect=30.0,
        read=COMPRAS_PNCP_HTTP_TIMEOUT_SEC,
        write=30.0,
        pool=30.0,
    )


def _get_json(
    client: httpx.Client,
    url: str,
    *,
    params: dict[str, Any],
    contexto: str,
    on_log: Callable[[str], None] | None = None,
    max_retries: int | None = None,
) -> dict[str, Any]:
    tentativas_max = max(
        1, int(COMPRAS_PNCP_MAX_RETRIES if max_retries is None else max_retries)
    )
    for tentativa in range(1, tentativas_max + 1):
        try:
            resp = client.get(url, params=params)
        except (
            httpx.ReadTimeout,
            httpx.ConnectTimeout,
            httpx.WriteTimeout,
            httpx.PoolTimeout,
            httpx.ConnectError,
            httpx.RemoteProtocolError,
        ) as exc:
            if tentativa >= tentativas_max:
                raise RuntimeError(
                    f"{contexto}: timeout após {tentativas_max} tentativa(s)"
                ) from exc
            espera = espera_retry_timeout(tentativa=tentativa)
            if on_log:
                on_log(
                    f"    ⚠ Timeout na API ({exc.__class__.__name__}); "
                    f"tentativa {tentativa}/{tentativas_max} — "
                    f"nova tentativa em {espera:.1f}s…"
                )
            time.sleep(espera)
            continue

        if resp.status_code in _RETRYABLE_STATUS:
            if tentativa >= tentativas_max:
                raise RuntimeError(
                    f"{contexto} HTTP {resp.status_code}: {resp.text[:300]}"
                )
            espera = espera_retry_http(resp, tentativa=tentativa)
            if on_log:
                on_log(
                    f"    ⚠ HTTP {resp.status_code} ({contexto}); "
                    f"tentativa {tentativa}/{tentativas_max} — "
                    f"aguardando {espera:.1f}s…"
                )
            time.sleep(espera)
            continue

        if resp.status_code >= 400:
            raise RuntimeError(f"{contexto} HTTP {resp.status_code}: {resp.text[:300]}")
        data = resp.json()
        if not isinstance(data, dict):
            raise RuntimeError(f"{contexto}: resposta inválida")
        return data

    raise RuntimeError(f"{contexto}: falha inesperada na requisição")


class PncpClient:
    def __init__(self, *, on_log: Callable[[str], None] | None = None) -> None:
        self._on_log = on_log
        self._http = httpx.Client(
            timeout=_httpx_timeout(),
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
        return _get_json(
            self._http,
            COMPRAS_PNCP_ENDPOINT,
            params=params,
            contexto="API PNCP contratações",
            on_log=self._on_log,
        )

    def consultar_por_id(self, *, codigo: str, tipo: str) -> list[dict[str, Any]]:
        params = {"codigo": codigo, "tipo": tipo}
        data = _get_json(
            self._http,
            COMPRAS_PNCP_ID_ENDPOINT,
            params=params,
            contexto="API PNCP contratações (id)",
            on_log=self._on_log,
        )
        registros = data.get("resultado")
        if isinstance(registros, list):
            return [r for r in registros if isinstance(r, dict)]
        if isinstance(registros, dict):
            return [registros]
        if isinstance(data, dict) and data.get("idCompra"):
            return [data]
        return []


def coletar_contratacao(
    *,
    numero_controle_pncp: str | None = None,
    id_compra: str | None = None,
    on_log: Callable[[str], None] | None = None,
) -> CompraContratacaoItem | None:
    """Busca uma contratação específica (endpoint 1.1 por id)."""
    log = on_log or (lambda _: None)
    tentativas: list[tuple[str, str]] = []
    if numero_controle_pncp:
        tentativas.append((numero_controle_pncp, "numeroControlePNCPCompra"))
    if id_compra:
        tentativas.append((id_compra, "idCompra"))
    if not tentativas:
        return None

    client = PncpClient(on_log=log)
    try:
        for codigo, tipo in tentativas:
            log(f"  Contratação PNCP — {tipo}={codigo}")
            for raw in client.consultar_por_id(codigo=codigo, tipo=tipo):
                item = item_da_api(raw)
                if item:
                    time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)
                    return item
            time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)
    finally:
        client.close()
    return None


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

    mapa_unidades = obter_unidades_compradoras()
    unidades_alvo = unidades or list(mapa_unidades.keys())
    modalidades_alvo = modalidades or list(MODALIDADES_COMPRAS.keys())
    periodos = _periodos(data_inicial, data_final, COMPRAS_PNCP_MAX_DIAS_PERIODO)

    vistos: set[str] = set()
    resultado: list[CompraContratacaoItem] = []
    client = PncpClient(on_log=log)

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
            nome_u = mapa_unidades.get(unidade, unidade)
            for cod_mod in modalidades_alvo:
                nome_mod = nome_modalidade_compras(cod_mod)
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


# --- Itens da contratação (módulo 2) ---

PNCP_ITEM_CAMPOS = (
    "idCompra",
    "idCompraItem",
    "idContratacaoPNCP",
    "unidadeOrgaoCodigoUnidade",
    "orgaoEntidadeCnpj",
    "numeroItemPncp",
    "numeroItemCompra",
    "numeroGrupo",
    "descricaoResumida",
    "materialOuServico",
    "materialOuServicoNome",
    "codigoClasse",
    "codigoGrupo",
    "codItemCatalogo",
    "descricaodetalhada",
    "unidadeMedida",
    "orcamentoSigiloso",
    "itemCategoriaIdPncp",
    "itemCategoriaNome",
    "criterioJulgamentoIdPncp",
    "criterioJulgamentoNome",
    "situacaoCompraItem",
    "situacaoCompraItemNome",
    "tipoBeneficio",
    "tipoBeneficioNome",
    "incentivoProdutivoBasico",
    "quantidade",
    "valorUnitarioEstimado",
    "valorTotal",
    "temResultado",
    "codFornecedor",
    "nomeFornecedor",
    "quantidadeResultado",
    "valorUnitarioResultado",
    "valorTotalResultado",
    "dataInclusaoPncp",
    "dataAtualizacaoPncp",
    "dataResultado",
    "margemPreferenciaNormal",
    "percentualMargemPreferenciaNormal",
    "margemPreferenciaAdicional",
    "percentualMargemPreferenciaAdicional",
    "codigoNCM",
    "descricaoNCM",
    "numeroControlePNCPCompra",
)

PNCP_ITEM_SNAKE = {c: _snake(c) for c in PNCP_ITEM_CAMPOS}


@dataclass
class CompraItemContratacao:
    id_compra_item: str
    id_compra: str
    numero_controle_pncp_compra: str | None = None
    numero_item_pncp: int | None = None
    numero_item_compra: int | None = None
    numero_grupo: int | None = None
    descricao_resumida: str | None = None
    descricao_detalhada: str | None = None
    material_ou_servico: str | None = None
    material_ou_servico_nome: str | None = None
    codigo_classe: int | None = None
    codigo_grupo: int | None = None
    cod_item_catalogo: int | None = None
    unidade_medida: str | None = None
    orcamento_sigiloso: bool | None = None
    item_categoria_nome: str | None = None
    criterio_julgamento_nome: str | None = None
    situacao_compra_item_nome: str | None = None
    tipo_beneficio_nome: str | None = None
    quantidade: str | None = None
    valor_unitario_estimado: str | None = None
    valor_total: str | None = None
    tem_resultado: bool | None = None
    cod_fornecedor: str | None = None
    nome_fornecedor: str | None = None
    quantidade_resultado: str | None = None
    valor_unitario_resultado: str | None = None
    valor_total_resultado: str | None = None
    data_resultado: str | None = None
    dados_pncp: dict[str, Any] = field(default_factory=dict)


def _fmt_num(val: Any) -> str | None:
    if val is None or val == "":
        return None
    if isinstance(val, (int, float)):
        txt = f"{val:,.4f}".rstrip("0").rstrip(".")
        return txt.replace(",", "X").replace(".", ",").replace("X", ".")
    return str(val)


def item_da_api_itens(raw: dict[str, Any]) -> CompraItemContratacao | None:
    id_item = str(raw.get("idCompraItem") or "").strip()
    id_compra = str(raw.get("idCompra") or "").strip()
    if not id_item or not id_compra:
        return None

    dados = {PNCP_ITEM_SNAKE[k]: raw.get(k) for k in PNCP_ITEM_CAMPOS}
    for k, v in dados.items():
        if isinstance(v, bool):
            dados[k] = v
        elif v is not None and not isinstance(v, (str, int, float)):
            dados[k] = str(v)

    def _int(val: Any) -> int | None:
        if val is None:
            return None
        try:
            return int(val)
        except (TypeError, ValueError):
            return None

    orc_sig = raw.get("orcamentoSigiloso")
    tem_res = raw.get("temResultado")

    return CompraItemContratacao(
        id_compra_item=id_item,
        id_compra=id_compra,
        numero_controle_pncp_compra=str(
            raw.get("numeroControlePNCPCompra") or raw.get("idContratacaoPNCP") or ""
        ) or None,
        numero_item_pncp=_int(raw.get("numeroItemPncp")),
        numero_item_compra=_int(raw.get("numeroItemCompra")),
        numero_grupo=_int(raw.get("numeroGrupo")),
        descricao_resumida=str(raw.get("descricaoResumida") or "") or None,
        descricao_detalhada=str(raw.get("descricaodetalhada") or "") or None,
        material_ou_servico=str(raw.get("materialOuServico") or "") or None,
        material_ou_servico_nome=str(raw.get("materialOuServicoNome") or "") or None,
        codigo_classe=_int(raw.get("codigoClasse")),
        codigo_grupo=_int(raw.get("codigoGrupo")),
        cod_item_catalogo=_int(raw.get("codItemCatalogo")),
        unidade_medida=str(raw.get("unidadeMedida") or "") or None,
        orcamento_sigiloso=orc_sig if isinstance(orc_sig, bool) else None,
        item_categoria_nome=str(raw.get("itemCategoriaNome") or "") or None,
        criterio_julgamento_nome=str(raw.get("criterioJulgamentoNome") or "") or None,
        situacao_compra_item_nome=str(raw.get("situacaoCompraItemNome") or "") or None,
        tipo_beneficio_nome=str(raw.get("tipoBeneficioNome") or "") or None,
        quantidade=_fmt_num(raw.get("quantidade")),
        valor_unitario_estimado=_fmt_valor(raw.get("valorUnitarioEstimado")),
        valor_total=_fmt_valor(raw.get("valorTotal")),
        tem_resultado=tem_res if isinstance(tem_res, bool) else None,
        cod_fornecedor=str(raw.get("codFornecedor") or "") or None,
        nome_fornecedor=str(raw.get("nomeFornecedor") or "") or None,
        quantidade_resultado=_fmt_num(raw.get("quantidadeResultado")),
        valor_unitario_resultado=_fmt_valor(raw.get("valorUnitarioResultado")),
        valor_total_resultado=_fmt_valor(raw.get("valorTotalResultado")),
        data_resultado=_fmt_data(raw.get("dataResultado")),
        dados_pncp=dados,
    )


def item_itens_para_db(item: CompraItemContratacao, *, contratacao_id: int | None = None) -> dict[str, Any]:
    return {
        "id_compra_item": item.id_compra_item,
        "id_compra": item.id_compra,
        "contratacao_id": contratacao_id,
        "numero_controle_pncp_compra": item.numero_controle_pncp_compra,
        "numero_item_pncp": item.numero_item_pncp,
        "numero_item_compra": item.numero_item_compra,
        "numero_grupo": item.numero_grupo,
        "descricao_resumida": item.descricao_resumida,
        "descricao_detalhada": item.descricao_detalhada,
        "material_ou_servico": item.material_ou_servico,
        "material_ou_servico_nome": item.material_ou_servico_nome,
        "codigo_classe": item.codigo_classe,
        "codigo_grupo": item.codigo_grupo,
        "cod_item_catalogo": item.cod_item_catalogo,
        "unidade_medida": item.unidade_medida,
        "orcamento_sigiloso": item.orcamento_sigiloso,
        "item_categoria_nome": item.item_categoria_nome,
        "criterio_julgamento_nome": item.criterio_julgamento_nome,
        "situacao_compra_item_nome": item.situacao_compra_item_nome,
        "tipo_beneficio_nome": item.tipo_beneficio_nome,
        "quantidade": item.quantidade,
        "valor_unitario_estimado": item.valor_unitario_estimado,
        "valor_total": item.valor_total,
        "tem_resultado": item.tem_resultado,
        "cod_fornecedor": item.cod_fornecedor,
        "nome_fornecedor": item.nome_fornecedor,
        "quantidade_resultado": item.quantidade_resultado,
        "valor_unitario_resultado": item.valor_unitario_resultado,
        "valor_total_resultado": item.valor_total_resultado,
        "data_resultado": item.data_resultado,
        "dados_pncp_json": json.dumps(item.dados_pncp, ensure_ascii=False),
    }


class PncpItensClient:
    def __init__(self, *, on_log: Callable[[str], None] | None = None) -> None:
        self._on_log = on_log
        self._http = httpx.Client(
            timeout=_httpx_timeout(),
            follow_redirects=True,
            headers={"Accept": "*/*", "User-Agent": USER_AGENT},
        )

    def close(self) -> None:
        self._http.close()

    def reabrir(self) -> None:
        """Nova conexão após timeout — descarta socket preso no pool."""
        self.close()
        self._http = httpx.Client(
            timeout=_httpx_timeout(),
            follow_redirects=True,
            headers={"Accept": "*/*", "User-Agent": USER_AGENT},
        )

    def consultar_pagina(
        self,
        *,
        pagina: int,
        tamanho_pagina: int,
        unidade: str,
        data_inicial: date,
        data_final: date,
    ) -> dict[str, Any]:
        params = {
            "pagina": pagina,
            "tamanhoPagina": tamanho_pagina,
            "unidadeOrgaoCodigoUnidade": unidade,
            "dataInclusaoPncpInicial": data_inicial.isoformat(),
            "dataInclusaoPncpFinal": data_final.isoformat(),
        }
        return _get_json(
            self._http,
            COMPRAS_PNCP_ITENS_ENDPOINT,
            params=params,
            contexto="API PNCP itens",
            on_log=self._on_log,
            max_retries=COMPRAS_PNCP_ITENS_TENTATIVAS,
        )

    def consultar_por_contratacao(
        self, *, codigo: str, tipo: str = "numeroControlePNCPCompra"
    ) -> list[dict[str, Any]]:
        params = {"codigo": codigo, "tipo": tipo}
        data = _get_json(
            self._http,
            COMPRAS_PNCP_ITENS_ID_ENDPOINT,
            params=params,
            contexto="API PNCP itens (id)",
            on_log=self._on_log,
        )
        registros = data.get("resultado") or []
        return registros if isinstance(registros, list) else []


@dataclass(frozen=True)
class CursorItens:
    """Posição recuperável na paginação de itens (unidade × janela × página)."""

    unidade: str
    periodo_ini: str
    periodo_fim: str
    pagina: int
    tamanho_pagina: int | None = None

    def as_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "unidade": self.unidade,
            "periodo_ini": self.periodo_ini,
            "periodo_fim": self.periodo_fim,
            "pagina": self.pagina,
        }
        if self.tamanho_pagina:
            data["tamanho_pagina"] = self.tamanho_pagina
        return data

    @classmethod
    def from_dict(cls, raw: dict[str, Any] | None) -> CursorItens | None:
        if not raw:
            return None
        try:
            tamanho = raw.get("tamanho_pagina")
            return cls(
                unidade=str(raw["unidade"]),
                periodo_ini=str(raw["periodo_ini"]),
                periodo_fim=str(raw["periodo_fim"]),
                pagina=max(1, int(raw["pagina"])),
                tamanho_pagina=int(tamanho) if tamanho else None,
            )
        except (KeyError, TypeError, ValueError):
            return None


def _erro_timeout(exc: BaseException) -> bool:
    return "timeout" in str(exc).lower()


def _partir_periodo(
    ini: date, fim: date
) -> tuple[tuple[date, date], tuple[date, date]] | None:
    """Parte a janela ao meio. None quando já é um único dia."""
    dias = (fim - ini).days + 1
    if dias < 2:
        return None
    metade = dias // 2
    meio = ini + timedelta(days=metade - 1)
    return (ini, meio), (meio + timedelta(days=1), fim)


def _posicionar_cursor(
    janelas: list[tuple[str, date, date]],
    cursor: CursorItens | None,
) -> tuple[list[tuple[str, date, date]], int, int, bool]:
    """Encaixa o checkpoint na grade de janelas.

    Retorna (janelas, índice inicial, página inicial, ignorado).
    Janela contida numa consulta maior (após subdivisão) substitui só aquele
    trecho e preserva o restante do período.
    """
    if cursor is None:
        return janelas, 0, 1, False
    try:
        c_ini = date.fromisoformat(cursor.periodo_ini)
        c_fim = date.fromisoformat(cursor.periodo_fim)
    except ValueError:
        return janelas, 0, 1, True
    if c_fim < c_ini:
        return janelas, 0, 1, True
    for i, (unidade, per_ini, per_fim) in enumerate(janelas):
        if unidade != cursor.unidade:
            continue
        if per_ini == c_ini and per_fim == c_fim:
            return janelas, i, cursor.pagina, False
        if per_ini <= c_ini and c_fim <= per_fim:
            novas = list(janelas)
            trechos = [(unidade, c_ini, c_fim)]
            if c_fim < per_fim:
                trechos.append((unidade, c_fim + timedelta(days=1), per_fim))
            novas[i : i + 1] = trechos
            return novas, i, cursor.pagina, False
    return janelas, 0, 1, True


def _piso_pagina_itens() -> int:
    return max(1, min(COMPRAS_PNCP_ITENS_PAGE_SIZE, COMPRAS_PNCP_ITENS_PAGE_SIZE_MIN))


def _adiantar_apos_timeout(
    janelas: list[tuple[str, date, date]],
    start_idx: int,
    cursor: CursorItens,
    falha_anterior: str | None,
) -> tuple[list[tuple[str, date, date]], int, int | None]:
    """Não repete a consulta que já esgotou timeout na execução anterior.

    Janela de vários dias é partida na hora. Janela de 1 dia recomeça na página 1
    com página menor, quando ainda houver folga. Retorna tamanho de página
    explícito ou None para manter o do cursor.
    """
    if not falha_anterior or "timeout" not in falha_anterior.lower():
        return janelas, start_idx, None
    if start_idx < 0 or start_idx >= len(janelas):
        return janelas, start_idx, None
    unidade, per_ini, per_fim = janelas[start_idx]
    partes = _partir_periodo(per_ini, per_fim)
    if partes is not None:
        (a_ini, a_fim), (b_ini, b_fim) = partes
        novas = list(janelas)
        novas[start_idx : start_idx + 1] = [
            (unidade, a_ini, a_fim),
            (unidade, b_ini, b_fim),
        ]
        return novas, start_idx, COMPRAS_PNCP_ITENS_PAGE_SIZE
    tamanho = cursor.tamanho_pagina or COMPRAS_PNCP_ITENS_PAGE_SIZE
    piso = _piso_pagina_itens()
    novo = max(piso, tamanho // 2)
    if novo < tamanho:
        return janelas, start_idx, novo
    return janelas, start_idx, tamanho


@dataclass
class PaginaItensInfo:
    unidade: str
    nome_unidade: str
    periodo_ini: date
    periodo_fim: date
    pagina: int
    total_paginas: int
    total_api: int | None
    itens: list[CompraItemContratacao]


class ColetaItensInterrompida(RuntimeError):
    """Falha transitória da API após progresso parcial — retomar do ``cursor``."""

    def __init__(self, message: str, *, cursor: CursorItens) -> None:
        super().__init__(message)
        self.cursor = cursor
        self.transiente = True


def coletar_itens(
    *,
    data_inicial: date,
    data_final: date,
    unidades: list[str] | None = None,
    on_log: Callable[[str], None] | None = None,
    on_fase: Callable[[str], None] | None = None,
    on_pagina: Callable[[PaginaItensInfo], None] | None = None,
    cursor_inicial: CursorItens | None = None,
    on_checkpoint: Callable[[CursorItens], None] | None = None,
    falha_anterior: str | None = None,
) -> list[CompraItemContratacao]:
    """Coleta itens PNCP com paginação.

    ``on_pagina`` — callback após cada página OK (persistência incremental).
    ``cursor_inicial`` — retoma em unidade/janela/página (idempotente via upsert).
    ``on_checkpoint`` — grava cursor da página atual *antes* da request (crash-safe).

    Timeout na listagem não repete a mesma consulta até esgotar a cadeia: a janela
    é partida ao meio (e, no piso de 1 dia, a página é reduzida). Itens já gravados
    permanecem. 429/5xx e o piso esgotado levantam ``ColetaItensInterrompida``.
    """
    log = on_log or (lambda _: None)
    fase = on_fase or (lambda _: None)

    mapa_unidades = obter_unidades_compradoras()
    unidades_alvo = unidades or list(mapa_unidades.keys())
    periodos = _periodos(data_inicial, data_final, COMPRAS_PNCP_MAX_DIAS_PERIODO_ITENS)

    janelas: list[tuple[str, date, date]] = [
        (unidade, per_ini, per_fim)
        for unidade in unidades_alvo
        for per_ini, per_fim in periodos
    ]

    janelas, start_idx, start_pagina, cursor_ignorado = _posicionar_cursor(
        janelas, cursor_inicial
    )
    tamanho_adiantado: int | None = None
    if cursor_inicial is not None and not cursor_ignorado:
        janelas, start_idx, tamanho_adiantado = _adiantar_apos_timeout(
            janelas, start_idx, cursor_inicial, falha_anterior
        )
        if tamanho_adiantado is not None:
            start_pagina = 1
    if cursor_inicial is not None and not cursor_ignorado:
        log(
            f"  Retomando itens do checkpoint: "
            f"{mapa_unidades.get(cursor_inicial.unidade, cursor_inicial.unidade)} | "
            f"{cursor_inicial.periodo_ini}–{cursor_inicial.periodo_fim} | "
            f"página {cursor_inicial.pagina}"
        )
        if tamanho_adiantado is not None and start_idx < len(janelas):
            seg_u, seg_ini, seg_fim = janelas[start_idx]
            log(
                "  Consulta que estourou tempo na execução anterior não será repetida. "
                f"Seguindo em {mapa_unidades.get(seg_u, seg_u)} | {seg_ini}–{seg_fim} | página 1."
            )
    elif cursor_inicial is not None:
        log(
            "  Checkpoint de itens ignorado (escopo/janela não encontrada) — "
            "reiniciando paginação."
        )

    vistos: set[str] = set()
    resultado: list[CompraItemContratacao] = []
    client = PncpItensClient(on_log=log)
    falhas_seguidas = 0
    limite_falhas = max(1, COMPRAS_PNCP_ITENS_MAX_FALHAS_SEGUIDAS)
    aplicar_retomada = cursor_inicial is not None and not cursor_ignorado
    tamanho_retomada = (
        tamanho_adiantado
        if tamanho_adiantado
        else (
            cursor_inicial.tamanho_pagina
            if cursor_inicial and cursor_inicial.tamanho_pagina
            else COMPRAS_PNCP_ITENS_PAGE_SIZE
        )
    )

    try:
        fase("coletando_itens")
        log(
            f"Itens da contratação — {len(unidades_alvo)} unidade(s), "
            f"{data_inicial.isoformat()} a {data_final.isoformat()}"
        )
        if len(periodos) > 1:
            log(
                f"  Período dividido em {len(periodos)} janela(s) "
                f"(máx. {COMPRAS_PNCP_MAX_DIAS_PERIODO_ITENS} dias por consulta de itens)."
            )

        j_idx = start_idx
        while j_idx < len(janelas):
            unidade, per_ini, per_fim = janelas[j_idx]
            nome_u = mapa_unidades.get(unidade, unidade)
            if aplicar_retomada and j_idx == start_idx:
                pagina = start_pagina
                tamanho = max(1, tamanho_retomada)
                aplicar_retomada = False
            else:
                pagina = 1
                tamanho = COMPRAS_PNCP_ITENS_PAGE_SIZE
            # Garante entrada no loop ao retomar página > 1; a API atualiza total_paginas.
            total_paginas = max(pagina, 1)
            avancar = True
            while pagina <= total_paginas:
                cursor_atual = CursorItens(
                    unidade=unidade,
                    periodo_ini=per_ini.isoformat(),
                    periodo_fim=per_fim.isoformat(),
                    pagina=pagina,
                    tamanho_pagina=tamanho,
                )
                if on_checkpoint:
                    on_checkpoint(cursor_atual)

                log(
                    f"  Itens | {nome_u} | {per_ini}–{per_fim} | "
                    f"página {pagina}/{total_paginas}"
                )
                try:
                    payload = client.consultar_pagina(
                        pagina=pagina,
                        tamanho_pagina=tamanho,
                        unidade=unidade,
                        data_inicial=per_ini,
                        data_final=per_fim,
                    )
                except RuntimeError as exc:
                    msg = str(exc)
                    if not _erro_timeout(exc):
                        transitório = (
                            "HTTP 429" in msg
                            or "HTTP 502" in msg
                            or "HTTP 503" in msg
                            or "HTTP 504" in msg
                        )
                        if transitório:
                            raise ColetaItensInterrompida(msg, cursor=cursor_atual) from exc
                        raise

                    falhas_seguidas += 1
                    dias = (per_fim - per_ini).days + 1
                    partes = _partir_periodo(per_ini, per_fim)
                    piso = _piso_pagina_itens()
                    novo_tam = max(piso, tamanho // 2)
                    if falhas_seguidas >= limite_falhas or (
                        partes is None and novo_tam >= tamanho
                    ):
                        raise ColetaItensInterrompida(msg, cursor=cursor_atual) from exc

                    client.reabrir()
                    if partes is not None:
                        (a_ini, a_fim), (b_ini, b_fim) = partes
                        log(
                            f"    ⚠ Timeout na janela {per_ini}–{per_fim} "
                            f"({dias} dias, página {pagina}). "
                            f"Dividindo em {a_ini}–{a_fim} e {b_ini}–{b_fim} "
                            f"— itens já gravados permanecem."
                        )
                        janelas[j_idx : j_idx + 1] = [
                            (unidade, a_ini, a_fim),
                            (unidade, b_ini, b_fim),
                        ]
                        avancar = False
                        break

                    log(
                        f"    ⚠ Timeout em {per_ini}–{per_fim}. "
                        f"Página reduzida de {tamanho} para {novo_tam} "
                        f"(reinício na página 1)."
                    )
                    tamanho = novo_tam
                    pagina = 1
                    total_paginas = 1
                    continue

                falhas_seguidas = 0
                total_paginas = int(payload.get("totalPaginas") or 1)
                registros = payload.get("resultado") or []
                if not isinstance(registros, list):
                    registros = []

                itens_pagina: list[CompraItemContratacao] = []
                novos = 0
                for raw in registros:
                    if not isinstance(raw, dict):
                        continue
                    item = item_da_api_itens(raw)
                    if not item or item.id_compra_item in vistos:
                        continue
                    vistos.add(item.id_compra_item)
                    resultado.append(item)
                    itens_pagina.append(item)
                    novos += 1

                total_api = payload.get("totalRegistros")
                total_api_int = int(total_api) if total_api is not None else None
                log(
                    f"    → {len(registros)} na página "
                    f"({novos} novos, {len(vistos)} acumulados"
                    f"{f', total API: {total_api}' if total_api is not None else ''})"
                )

                if on_pagina:
                    on_pagina(
                        PaginaItensInfo(
                            unidade=unidade,
                            nome_unidade=nome_u,
                            periodo_ini=per_ini,
                            periodo_fim=per_fim,
                            pagina=pagina,
                            total_paginas=total_paginas,
                            total_api=total_api_int,
                            itens=itens_pagina,
                        )
                    )

                if pagina >= total_paginas or not registros:
                    break
                pagina += 1
                time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)
            if avancar:
                j_idx += 1
                time.sleep(DELAY_SEC / 2)
    finally:
        client.close()
        fase("idle")

    log(f"Coleta de itens finalizada: {len(resultado)} item(ns).")
    return resultado


def coletar_itens_contratacao(
    *,
    numero_controle_pncp: str | None = None,
    id_compra: str | None = None,
    on_log: Callable[[str], None] | None = None,
) -> list[CompraItemContratacao]:
    """Busca itens de uma contratação específica (endpoint por id)."""
    log = on_log or (lambda _: None)
    tentativas: list[tuple[str, str]] = []
    if numero_controle_pncp:
        tentativas.append((numero_controle_pncp, "numeroControlePNCPCompra"))
    if id_compra:
        tentativas.append((id_compra, "idCompra"))
    if not tentativas:
        return []

    client = PncpItensClient(on_log=log)
    resultado: list[CompraItemContratacao] = []
    vistos: set[str] = set()
    try:
        for codigo, tipo in tentativas:
            log(f"  Itens PNCP — {tipo}={codigo}")
            for raw in client.consultar_por_contratacao(codigo=codigo, tipo=tipo):
                if not isinstance(raw, dict):
                    continue
                item = item_da_api_itens(raw)
                if not item or item.id_compra_item in vistos:
                    continue
                vistos.add(item.id_compra_item)
                resultado.append(item)
            time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)
            if resultado:
                break
    finally:
        client.close()
    return resultado


# Reexportações do módulo evoluído (compatibilidade)
from app.compras.coletor_resultados import (  # noqa: E402
    coletar_resultados,
    resultado_da_api as resultado_da_api_v2,
    resultado_para_db,
)
