"""
Orientação de preenchimento dos parâmetros (manual API v2.0 + OpenAPI).
Usado na interface web para exemplos explícitos ao usuário.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from compras_consulta.api.catalog import Endpoint, Parameter


@dataclass(frozen=True)
class ParamGuidance:
    """Como o usuário deve preencher um parâmetro."""

    example: str
    placeholder: str
    hint: str

    def caption(self) -> str:
        parts = [f"**Exemplo:** `{self.example}`"]
        if self.hint:
            parts.append(self.hint)
        return " · ".join(parts)


# Padrões por nome de parâmetro (reutilizados em vários endpoints)
_BY_NAME: dict[str, ParamGuidance] = {
    "pagina": ParamGuidance(
        example="1",
        placeholder="1",
        hint="Página dos resultados. Use 1 na primeira consulta; aumente para ver mais registros.",
    ),
    "page": ParamGuidance(
        example="1",
        placeholder="1",
        hint="Página (módulo OCDS). Mesmo conceito de `pagina`.",
    ),
    "codigoGrupo": ParamGuidance(
        example="10",
        placeholder="10",
        hint="Código inteiro do grupo CATMAT (ex.: 10 = ARMAMENTO). Deixe vazio para listar todos.",
    ),
    "codigoClasse": ParamGuidance(
        example="1005",
        placeholder="1005",
        hint="Código da classe de material, vinculado ao grupo.",
    ),
    "codigoPdm": ParamGuidance(
        example="447",
        placeholder="447",
        hint="Código do Produto Descritivo Básico (PDM).",
    ),
    "codigoItem": ParamGuidance(
        example="254848",
        placeholder="254848",
        hint="Código do item de material no catálogo.",
    ),
    "statusGrupo": ParamGuidance(
        example="true",
        placeholder="true",
        hint="Ativo: `true` ou `1`. Inativo: `false` ou `0`. Vazio = sem filtro.",
    ),
    "statusClasse": ParamGuidance(
        example="true",
        placeholder="true",
        hint="Filtrar classe ativa (`true`) ou inativa (`false`).",
    ),
    "statusPdm": ParamGuidance(
        example="true",
        placeholder="true",
        hint="Status do PDM: true/false.",
    ),
    "statusItem": ParamGuidance(
        example="true",
        placeholder="true",
        hint="Status do item: true/false.",
    ),
    "codigoSecao": ParamGuidance(
        example="1",
        placeholder="1",
        hint="Código da seção do catálogo de serviços (CATSER).",
    ),
    "codigoDivisao": ParamGuidance(
        example="10",
        placeholder="10",
        hint="Código da divisão de serviço.",
    ),
    "codigoGrupoServico": ParamGuidance(
        example="100",
        placeholder="100",
        hint="Código do grupo de serviço.",
    ),
    "codigoClasseServico": ParamGuidance(
        example="1001",
        placeholder="1001",
        hint="Código da classe de serviço.",
    ),
    "codigoSubclasse": ParamGuidance(
        example="10010",
        placeholder="10010",
        hint="Código da subclasse de serviço.",
    ),
    "codigoItemServico": ParamGuidance(
        example="12345",
        placeholder="12345",
        hint="Código do item de serviço.",
    ),
    "codigoUasg": ParamGuidance(
        example="200005",
        placeholder="200005",
        hint="Código numérico da UASG (6 dígitos). Ex. do manual: 200005.",
    ),
    "statusUasg": ParamGuidance(
        example="true",
        placeholder="true",
        hint="UASG ativa: `true`. Inativa: `false`.",
    ),
    "cnpjCpfOrgao": ParamGuidance(
        example="00394460005800",
        placeholder="00394460005800",
        hint="CNPJ do órgão **sem pontuação** (apenas números).",
    ),
    "cnpjCpfFornecedor": ParamGuidance(
        example="00000000000191",
        placeholder="00000000000191",
        hint="CNPJ ou CPF do fornecedor **sem máscara**.",
    ),
    "niFornecedor": ParamGuidance(
        example="00000000000191",
        placeholder="00000000000191",
        hint="Número de identificação (CNPJ/CPF) do fornecedor, só dígitos.",
    ),
    "numeroAta": ParamGuidance(
        example="12345",
        placeholder="12345",
        hint="Número da ata de registro de preços (ARP).",
    ),
    "unidadeGerenciadora": ParamGuidance(
        example="123456",
        placeholder="123456",
        hint="Código da UASG gerenciadora da ARP.",
    ),
    "numeroItem": ParamGuidance(
        example="1",
        placeholder="1",
        hint="Número sequencial do item na ata ou contratação.",
    ),
    "codigoLicitacao": ParamGuidance(
        example="900012025",
        placeholder="900012025",
        hint="Código/identificador da licitação no sistema legado.",
    ),
    "numeroCompra": ParamGuidance(
        example="90001",
        placeholder="90001",
        hint="Número da compra/licitação.",
    ),
    "anoCompra": ParamGuidance(
        example="2025",
        placeholder="2025",
        hint="Ano da compra (4 dígitos).",
    ),
    "codigoUasgCompradora": ParamGuidance(
        example="200999",
        placeholder="200999",
        hint="UASG que realizou a compra.",
    ),
    "pertence14133": ParamGuidance(
        example="true",
        placeholder="true",
        hint="Filtrar processos da Lei 14.133: `true` ou `false`.",
    ),
    "orgaoEntidadeCnpj": ParamGuidance(
        example="00394460005800",
        placeholder="00394460005800",
        hint="CNPJ da entidade contratante (Lei 14.133), sem máscara.",
    ),
    "idContratacaoPNCP": ParamGuidance(
        example="12345678901234567890123456789012",
        placeholder="id da contratação no PNCP",
        hint="Identificador da contratação no Portal Nacional (quando aplicável).",
    ),
    "numeroContrato": ParamGuidance(
        example="2025/0001",
        placeholder="2025/0001",
        hint="Número do contrato conforme cadastro.",
    ),
    "codigoUasgContrato": ParamGuidance(
        example="200999",
        placeholder="200999",
        hint="UASG gestora do contrato.",
    ),
    "dataCompraInicio": ParamGuidance(
        example="2025-01-01",
        placeholder="AAAA-MM-DD",
        hint="Data inicial do período. Formato **AAAA-MM-DD**.",
    ),
    "dataCompraFim": ParamGuidance(
        example="2025-12-31",
        placeholder="AAAA-MM-DD",
        hint="Data final do período. Formato **AAAA-MM-DD**.",
    ),
    "dataVigenciaInicialMin": ParamGuidance(
        example="2025-01-01",
        placeholder="AAAA-MM-DD",
        hint="Vigência inicial mínima (intervalo). Formato **AAAA-MM-DD**.",
    ),
    "dataVigenciaInicialMax": ParamGuidance(
        example="2025-12-31",
        placeholder="AAAA-MM-DD",
        hint="Vigência inicial máxima (intervalo).",
    ),
    "dataVigenciaFinalMin": ParamGuidance(
        example="2025-01-01",
        placeholder="AAAA-MM-DD",
        hint="Vigência final mínima.",
    ),
    "dataVigenciaFinalMax": ParamGuidance(
        example="2025-12-31",
        placeholder="AAAA-MM-DD",
        hint="Vigência final máxima.",
    ),
    "siglaUf": ParamGuidance(
        example="MG",
        placeholder="MG",
        hint="Sigla do estado com 2 letras (ex.: MG, SP, DF).",
    ),
    "codigoMunicipioIbge": ParamGuidance(
        example="3106200",
        placeholder="3106200",
        hint="Código IBGE do município (7 dígitos).",
    ),
    "buyerID": ParamGuidance(
        example="BR-CNPJ-00394460005800",
        placeholder="BR-CNPJ-...",
        hint="Identificador OCDS do comprador (padrão BR-CNPJ-...).",
    ),
    "releaseStartDate": ParamGuidance(
        example="2025-01-01",
        placeholder="AAAA-MM-DD",
        hint="Data inicial de publicação OCDS.",
    ),
    "releaseEndDate": ParamGuidance(
        example="2025-12-31",
        placeholder="AAAA-MM-DD",
        hint="Data final de publicação OCDS.",
    ),
}

# Exemplos prontos por endpoint (consultas típicas do manual v2.0)
_ENDPOINT_SAMPLES: dict[str, dict[str, Any]] = {
    "/modulo-material/1_consultarGrupoMaterial": {
        "titulo": "Listar grupos de material (1ª página, ativos)",
        "params": {"pagina": "1", "statusGrupo": "true"},
    },
    "/modulo-material/2_consultarClasseMaterial": {
        "titulo": "Classes do grupo 10 (ARMAMENTO)",
        "params": {"pagina": "1", "codigoGrupo": "10"},
    },
    "/modulo-material/4_consultarItemMaterial": {
        "titulo": "Itens filtrados por grupo",
        "params": {"pagina": "1", "codigoGrupo": "10"},
    },
    "/modulo-servico/1_consultarSecaoServico": {
        "titulo": "Todas as seções do catálogo de serviços",
        "params": {"pagina": "1"},
    },
    "/modulo-uasg/1_consultarUasg": {
        "titulo": "UASG específica e ativa (exemplo do manual)",
        "params": {"pagina": "1", "codigoUasg": "200005", "statusUasg": "true"},
    },
    "/modulo-uasg/2_consultarOrgao": {
        "titulo": "Órgãos — primeira página",
        "params": {"pagina": "1"},
    },
    "/modulo-legado/1_consultarLicitacao": {
        "titulo": "Licitações — página 1 (adicione filtros de data se necessário)",
        "params": {"pagina": "1"},
    },
    "/modulo-fornecedor/1_consultarFornecedor": {
        "titulo": "Buscar fornecedor por CNPJ",
        "params": {"pagina": "1", "cnpjCpfFornecedor": "00000000000191"},
    },
    "/modulo-contratos/1_consultarContratos": {
        "titulo": "Contratos — página inicial",
        "params": {"pagina": "1"},
    },
    "/modulo-arp/1_consultarARP": {
        "titulo": "Atas de registro de preços — página 1",
        "params": {"pagina": "1"},
    },
    "/modulo-contratacoes/1_consultarContratacoes_PNCP_14133": {
        "titulo": "Contratações Lei 14.133",
        "params": {"pagina": "1"},
    },
    "/modulo-pesquisa-preco/1_consultarMaterial": {
        "titulo": "Pesquisa de preço — materiais",
        "params": {"pagina": "1"},
    },
    "/modulo-ocds/1_releases": {
        "titulo": "Releases OCDS — primeira página",
        "params": {"page": "1"},
    },
}


def guidance_for(param: Parameter) -> ParamGuidance:
    """Retorna orientação para um parâmetro (nome conhecido ou inferido pelo tipo)."""
    if param.name in _BY_NAME:
        g = _BY_NAME[param.name]
        if param.example and param.example != g.example:
            return ParamGuidance(
                example=param.example,
                placeholder=param.example,
                hint=g.hint,
            )
        return g

    if param.example:
        return ParamGuidance(
            example=param.example,
            placeholder=param.example,
            hint=(param.description or f"Tipo: {param.schema_type}")[:200],
        )

    desc = (param.description or "").strip()
    schema = param.schema_type.lower()

    if schema == "boolean" or "boolean" in desc.lower():
        return ParamGuidance(
            example="true",
            placeholder="true ou false",
            hint=desc or "Valores: true, false, 1 ou 0. Deixe vazio para não filtrar.",
        )
    if schema == "integer" or "inteiro" in desc.lower():
        return ParamGuidance(
            example="1",
            placeholder="número inteiro",
            hint=desc or "Somente números inteiros, sem aspas.",
        )
    if "YYYY-MM-DD" in desc or "data" in param.name.lower():
        return ParamGuidance(
            example="2025-01-01",
            placeholder="AAAA-MM-DD",
            hint=desc or "Formato de data: AAAA-MM-DD (ex.: 2025-01-01).",
        )
    if "cnpj" in param.name.lower() or "cpf" in param.name.lower():
        return ParamGuidance(
            example="00000000000191",
            placeholder="somente dígitos",
            hint=desc or "CNPJ/CPF sem pontos, barras ou traços.",
        )

    return ParamGuidance(
        example="",
        placeholder="opcional",
        hint=desc or f"Tipo: {param.schema_type}. Deixe vazio se não quiser filtrar.",
    )


def default_value(param: Parameter) -> str:
    """Valor inicial sugerido no campo."""
    g = guidance_for(param)
    if param.name in ("pagina", "page") and not param.example:
        return g.example
    return param.example or g.example or ""


def endpoint_sample(endpoint: Endpoint) -> dict[str, Any] | None:
    """Exemplo de consulta documentada para o endpoint."""
    if endpoint.path in _ENDPOINT_SAMPLES:
        return _ENDPOINT_SAMPLES[endpoint.path]

    params: dict[str, str] = {}
    for p in endpoint.parameters:
        if p.name == "pagina":
            params["pagina"] = "1"
        elif p.name == "page":
            params["page"] = "1"
    if params:
        return {
            "titulo": "Primeira página (mínimo necessário)",
            "params": params,
        }
    return None


def format_example_url(base_url: str, path: str, params: dict[str, str]) -> str:
    """Monta URL de exemplo para exibição."""
    from urllib.parse import urlencode

    q = {k: v for k, v in params.items() if v}
    url = base_url.rstrip("/") + path
    if q:
        url += "?" + urlencode(q)
    return url


def render_fill_instructions() -> str:
    """Texto geral de como preencher (markdown)."""
    return """
**Como preencher os parâmetros**

1. **Paginação** — Em quase todas as consultas, informe `pagina=1` na primeira busca.  
   Se a resposta trouxer `paginasRestantes` maior que zero, aumente para `2`, `3`, etc.

2. **Filtros opcionais** — Campos sem asterisco (*) podem ficar **vazios**; a API retorna mais registros.

3. **Valores booleanos** — Use `true` ou `false` (também aceito `1` / `0` em alguns casos).

4. **Datas** — Formato **AAAA-MM-DD** (ex.: `2025-06-01`), salvo indicação contrária na dica do campo.

5. **CNPJ/CPF** — Apenas **números**, sem máscara (ex.: `00394460005800`).

6. **Aplicar exemplo** — Use o botão abaixo para preencher automaticamente um caso típico deste endpoint.
    """
