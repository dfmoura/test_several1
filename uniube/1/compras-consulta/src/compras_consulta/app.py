"""
Interface web — API Dados Abertos Compras.gov.br v2.0
Execute: streamlit run src/compras_consulta/app.py
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import pandas as pd
import streamlit as st

from compras_consulta.api import ApiCatalog, ApiClient
from compras_consulta.api import param_hints
from compras_consulta.api.catalog import Parameter
from compras_consulta.config import BASE_URL, OUTPUT_DIR, PROJECT_ROOT

st.set_page_config(
    page_title="Compras.gov.br — Consulta de Dados Abertos",
    page_icon="🏛️",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
<style>
    .main-header { font-size: 1.75rem; font-weight: 600; color: #1a365d; }
    .sub-header { color: #4a5568; margin-bottom: 1rem; }
    div[data-testid="stMetricValue"] { font-size: 1.4rem; }
</style>
""",
    unsafe_allow_html=True,
)


@st.cache_resource
def get_catalog() -> ApiCatalog:
    return ApiCatalog()


@st.cache_resource
def get_client() -> ApiClient:
    return ApiClient()


def _init_session() -> None:
    if "history" not in st.session_state:
        st.session_state.history = []


def _add_history(entry: dict[str, Any]) -> None:
    st.session_state.history.insert(0, entry)
    st.session_state.history = st.session_state.history[:15]


def _prefill_key(ep_id: str, param_name: str) -> str:
    return f"prefill_{ep_id}_{param_name}"


def _apply_endpoint_example(
    ep_id: str,
    sample_params: dict[str, str],
    path_param_names: set[str],
) -> None:
    for name, value in sample_params.items():
        st.session_state[_prefill_key(ep_id, name)] = value
        prefix = "path" if name in path_param_names else "query"
        st.session_state[f"{prefix}_{ep_id}_{name}"] = value


def _render_param_field(
    ep_id: str,
    param: Parameter,
    *,
    key_prefix: str,
) -> str:
    """Campo de entrada com placeholder, dica e exemplo explícitos."""
    g = param_hints.guidance_for(param)
    sk = _prefill_key(ep_id, param.name)
    if sk in st.session_state:
        default = st.session_state[sk]
    else:
        default = param_hints.default_value(param)

    req = " *" if param.required else " (opcional)"
    tipo = param.schema_type or "texto"
    label = f"{param.name}{req}"

    value = st.text_input(
        label,
        value=default,
        placeholder=g.placeholder,
        help=(param.description or g.hint)[:400],
        key=f"{key_prefix}_{ep_id}_{param.name}",
    )
    st.caption(g.caption())
    return value


def _render_endpoint_form(catalog: ApiCatalog, endpoint_id: str) -> dict[str, str] | None:
    ep = catalog.get_by_id(endpoint_id)
    if not ep:
        return None

    st.markdown(f"**{ep.summary or ep.path}**")
    if ep.description:
        st.caption(ep.description[:500])

    with st.expander("Como preencher os parâmetros", expanded=True):
        st.markdown(param_hints.render_fill_instructions())

    sample = param_hints.endpoint_sample(ep)
    if sample:
        example_params = sample.get("params") or {}
        example_url = param_hints.format_example_url(
            catalog.base_url, ep.path, example_params
        )
        st.info(f"**Exemplo — {sample.get('titulo', 'consulta típica')}**")
        st.code(example_url, language=None)
        if example_params:
            ex_cols = st.columns(min(4, len(example_params)))
            for i, (k, v) in enumerate(example_params.items()):
                with ex_cols[i % len(ex_cols)]:
                    st.markdown(f"`{k}` = `{v}`")
    path_params = [p for p in ep.parameters if p.location == "path"]
    query_params = [p for p in ep.parameters if p.location == "query"]
    path_names = {p.name for p in path_params}

    if sample and example_params and st.button(
        "Preencher com este exemplo",
        key=f"apply_ex_{ep.id}",
        use_container_width=True,
    ):
        _apply_endpoint_example(ep.id, example_params, path_names)
        st.rerun()

    path_values: dict[str, str] = {}
    query_values: dict[str, str] = {}

    if path_params:
        st.subheader("Parâmetros do caminho")
        st.caption("Valores que fazem parte da URL. Campos com * são obrigatórios.")
        cols = st.columns(min(3, len(path_params)))
        for i, param in enumerate(path_params):
            with cols[i % len(cols)]:
                path_values[param.name] = _render_param_field(
                    ep.id, param, key_prefix="path"
                )

    if query_params:
        st.subheader("Filtros (parâmetros de consulta)")
        st.caption(
            "Parâmetros após `?` na URL. Deixe em branco os filtros que não deseja usar."
        )
        with st.expander("Ver todos os filtros", expanded=len(query_params) <= 8):
            cols = st.columns(2)
            for i, param in enumerate(query_params):
                with cols[i % len(cols)]:
                    query_values[param.name] = _render_param_field(
                        ep.id, param, key_prefix="query"
                    )
    elif not path_params:
        st.info(
            "Este endpoint não exige filtros na URL. Use **Executar consulta** "
            "ou o botão de exemplo acima (se disponível)."
        )

    return {
        **{f"__path__:{k}": v for k, v in path_values.items()},
        **{f"__query__:{k}": v for k, v in query_values.items()},
    }


def _show_response(response: Any, url: str) -> None:
    st.code(f"GET {url}", language=None)
    if response.error:
        st.error(response.error)
        return
    if response.ok:
        st.success(f"HTTP {response.status_code} — {response.elapsed_ms:.0f} ms")
    else:
        st.error(f"HTTP {response.status_code} — {response.elapsed_ms:.0f} ms")
        if response.status_code == 404:
            st.warning(
                "Recurso não encontrado no servidor. Alguns módulos podem estar "
                "indisponíveis temporariamente; consulte o catálogo ou tente outro endpoint."
            )

    data = response.body_json
    if data is None:
        st.text(response.body_text[:80000])
        return

    tab_json, tab_tabela, tab_raw = st.tabs(["Resumo", "Tabela", "JSON completo"])

    with tab_json:
        if isinstance(data, dict):
            total = data.get("totalRegistros") or data.get("total")
            paginas = data.get("totalPaginas") or data.get("paginas")
            if total is not None:
                c1, c2, c3 = st.columns(3)
                c1.metric("Registros", total)
                if paginas is not None:
                    c2.metric("Páginas", paginas)
                c3.metric("Tempo (ms)", f"{response.elapsed_ms:.0f}")

    with tab_tabela:
        rows = None
        if isinstance(data, dict) and "resultado" in data:
            rows = data["resultado"]
        elif isinstance(data, list):
            rows = data
        if rows and isinstance(rows, list) and rows and isinstance(rows[0], dict):
            st.dataframe(pd.DataFrame(rows), use_container_width=True, height=420)
        else:
            st.info("Sem lista tabular nesta resposta. Use a aba JSON.")

    with tab_raw:
        st.json(data)

    fname = OUTPUT_DIR / f"consulta_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    blob = json.dumps(data, ensure_ascii=False, indent=2)
    fname.write_text(blob, encoding="utf-8")
    st.download_button(
        "Baixar JSON",
        data=blob,
        file_name=fname.name,
        mime="application/json",
    )


def page_consulta(catalog: ApiCatalog, client: ApiClient) -> None:
    st.header("Consulta por módulo")
    st.markdown(
        "Selecione o **módulo** e o **endpoint** documentados na API v2.0 (dados abertos, sem login). "
        f"Base: `{catalog.base_url}`"
    )

    public = catalog.public_get_endpoints
    by_tag: dict[str, list] = {}
    for ep in public:
        by_tag.setdefault(ep.tag_label, []).append(ep)

    col_a, col_b = st.columns([1, 2])
    with col_a:
        tag = st.selectbox("Módulo", options=sorted(by_tag.keys()), key="mod_tag")
    endpoints = by_tag[tag]
    labels = {
        f"{ep.summary or ep.path.split('/')[-1]}": ep.id for ep in endpoints
    }
    with col_b:
        choice = st.selectbox("Consulta", options=list(labels.keys()), key="mod_ep")
    endpoint_id = labels[choice]

    form_data = _render_endpoint_form(catalog, endpoint_id)
    if st.button("Executar consulta", type="primary", use_container_width=True):
        ep = catalog.get_by_id(endpoint_id)
        assert ep and form_data is not None
        path_values = {
            k.replace("__path__:", ""): v
            for k, v in form_data.items()
            if k.startswith("__path__:")
        }
        query_values = {
            k.replace("__query__:", ""): v
            for k, v in form_data.items()
            if k.startswith("__query__:")
        }
        try:
            url = catalog.build_url(ep, path_values, query_values)
        except ValueError as exc:
            st.error(str(exc))
            return
        with st.spinner("Consultando API federal…"):
            response = client.get(url)
        _add_history({
            "when": datetime.now().isoformat(timespec="seconds"),
            "url": url,
            "status": response.status_code,
            "ok": response.ok,
        })
        _show_response(response, url)


def page_explorador(catalog: ApiCatalog, client: ApiClient) -> None:
    st.header("Explorador de endpoints")
    st.caption("Lista completa de consultas GET públicas da especificação OpenAPI.")

    filtro = st.text_input("Buscar por nome ou caminho", "")
    eps = catalog.public_get_endpoints
    if filtro:
        f = filtro.lower()
        eps = [
            e
            for e in eps
            if f in e.path.lower() or f in (e.summary or "").lower()
        ]

    ep_options = {f"{e.module_label} — {e.path}": e.id for e in eps}
    if not ep_options:
        st.warning("Nenhum endpoint encontrado.")
        return

    choice = st.selectbox("Endpoint", list(ep_options.keys()))
    endpoint_id = ep_options[choice]
    form_data = _render_endpoint_form(catalog, endpoint_id)
    if st.button("Enviar GET", type="primary"):
        ep = catalog.get_by_id(endpoint_id)
        assert ep and form_data
        path_values = {
            k.replace("__path__:", ""): v
            for k, v in form_data.items()
            if k.startswith("__path__:")
        }
        query_values = {
            k.replace("__query__:", ""): v
            for k, v in form_data.items()
            if k.startswith("__query__:")
        }
        try:
            url = catalog.build_url(ep, path_values, query_values)
        except ValueError as exc:
            st.error(str(exc))
            return
        response = client.get(url)
        _show_response(response, url)


def page_catalogo(catalog: ApiCatalog) -> None:
    st.header("Catálogo da API v2.0")
    filtro = st.radio(
        "Exibir",
        ["Dados abertos (GET)", "Todos", "Somente com login"],
        horizontal=True,
    )
    rows = catalog.public_get_endpoints
    if filtro == "Todos":
        rows = catalog.all_endpoints
    elif filtro == "Somente com login":
        rows = [e for e in catalog.all_endpoints if e.requires_auth]

    busca = st.text_input("Filtrar catálogo")
    if busca:
        b = busca.lower()
        rows = [
            e
            for e in rows
            if b in e.path.lower() or b in e.tag_label.lower()
        ]

    st.markdown(f"**{len(rows)}** endpoints listados")
    for ep in rows:
        badge = "🟢 Público" if ep.is_safe_read else "🔒 Login"
        with st.expander(f"{badge} — `{ep.method}` {ep.path}"):
            st.write(ep.summary)
            if ep.parameters:
                for p in ep.parameters:
                    req = "obrigatório" if p.required else "opcional"
                    st.markdown(f"- `{p.name}` ({p.location}, {req}): {p.description[:200]}")


def page_ajuda(catalog: ApiCatalog) -> None:
    st.header("Documentação e apresentação")
    st.markdown(
        f"""
### Sobre este sistema

Ferramenta de **consulta e análise** à [API de Dados Abertos do Compras.gov.br](https://dadosabertos.compras.gov.br),
baseada no manual **v2.0 (Fev/2026)**. Utiliza **somente recursos públicos** — sem credenciais, sem login.

| Item | Valor |
|------|-------|
| API | {catalog.title} v{catalog.version} |
| Base URL | `{catalog.base_url}` |
| OpenAPI local | `data/api-docs.json` |
| Endpoints GET públicos | **{len(catalog.public_get_endpoints)}** |
| Swagger oficial | [dadosabertos.compras.gov.br](https://dadosabertos.compras.gov.br/swagger-ui/index.html) |

### Módulos disponíveis (manual v2.0)

| Módulo | Conteúdo |
|--------|----------|
| Material | Catálogo CATMAT (grupos, classes, PDM, itens…) |
| Serviço | Catálogo CATSER |
| Pesquisa de Preço | Preços praticados (material e serviço) |
| PGC | Planejamento e gerenciamento de contratações |
| UASG | Unidades e órgãos |
| Legado | Licitações, pregões, compras sem licitação, RDC |
| Contratações | PNCP Lei 14.133 |
| ARP | Atas de registro de preços |
| Contratos | Contratos e itens |
| Fornecedor | Cadastro de fornecedores |
| OCDS | Padrão internacional de contratação aberta |

### Estrutura do projeto

```
compras-consulta/
├── README.md
├── requirements.txt
├── data/api-docs.json
├── output/
├── scripts/setup.sh | setup.bat
├── scripts/run_web.sh | run_web.bat
└── src/compras_consulta/
    ├── api/catalog.py
    ├── api/client.py
    ├── app.py
    └── cli.py
```

### Replicação em outro computador

1. Copie a pasta inteira.
2. Instale **Python 3.10+**.
3. Execute `./scripts/setup.sh` (Linux/macOS) ou `scripts\\setup.bat` (Windows).
4. Inicie `./scripts/run_web.sh` ou use a CLI.

### Boas práticas

- Use **paginação** (`pagina=1`, `pagina=2`…) em consultas grandes.
- Exporte resultados em JSON para análise offline.
- Respeite a API federal; evite requisições em loop muito rápido.
        """
    )


def main() -> None:
    _init_session()
    catalog = get_catalog()
    client = get_client()

    st.sidebar.title("Compras.gov.br")
    st.sidebar.caption("Dados Abertos · v2.0 · sem login")
    page = st.sidebar.radio(
        "Navegação",
        ["Consulta por módulo", "Explorador", "Catálogo", "Ajuda"],
    )
    st.sidebar.divider()
    st.sidebar.metric("Consultas GET públicas", len(catalog.public_get_endpoints))
    st.sidebar.link_button(
        "Swagger oficial",
        "https://dadosabertos.compras.gov.br/swagger-ui/index.html",
    )
    st.sidebar.link_button(
        "Catálogo web (CNBS)",
        "https://catalogo.compras.gov.br/cnbs-web/busca",
    )

    if st.session_state.history:
        st.sidebar.subheader("Histórico")
        for h in st.session_state.history[:6]:
            icon = "✓" if h["ok"] else "✗"
            st.sidebar.caption(f"{icon} {h['status']} — …{h['url'][-45:]}")

    st.markdown('<p class="main-header">Consulta API Compras.gov.br</p>', unsafe_allow_html=True)
    st.markdown(
        '<p class="sub-header">Dados abertos federais — transparência em compras públicas</p>',
        unsafe_allow_html=True,
    )
    st.caption(f"Projeto: {PROJECT_ROOT.name} · {BASE_URL}")

    if page == "Consulta por módulo":
        page_consulta(catalog, client)
    elif page == "Explorador":
        page_explorador(catalog, client)
    elif page == "Catálogo":
        page_catalogo(catalog)
    else:
        page_ajuda(catalog)


if __name__ == "__main__":
    main()
