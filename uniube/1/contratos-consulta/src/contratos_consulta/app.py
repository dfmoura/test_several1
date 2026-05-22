"""
Interface web  Consulta pública API Contratos.gov.br
Execute: streamlit run src/contratos_consulta/app.py
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import streamlit as st

from contratos_consulta.api import ApiCatalog, ApiClient
from contratos_consulta.config import BASE_URL, OUTPUT_DIR, PROJECT_ROOT

st.set_page_config(
    page_title="Consulta API Contratos.gov.br",
    page_icon="??",
    layout="wide",
    initial_sidebar_state="expanded",
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
    st.session_state.history = st.session_state.history[:20]


def _render_endpoint_form(catalog: ApiCatalog, endpoint_id: str) -> dict[str, str] | None:
    ep = catalog.get_by_id(endpoint_id)
    if not ep:
        return None

    st.markdown(f"**{ep.summary}**")
    if ep.description:
        st.caption(ep.description)

    path_values: dict[str, str] = {}
    query_values: dict[str, str] = {}

    path_params = [p for p in ep.parameters if p.location == "path"]
    query_params = [p for p in ep.parameters if p.location == "query"]

    if path_params:
        st.subheader("Parâmetros do caminho")
        cols = st.columns(min(3, len(path_params)))
        for i, param in enumerate(path_params):
            with cols[i % len(cols)]:
                label = param.name + (" *" if param.required else "")
                hint = param.description or param.schema_type
                default = param.example or ""
                path_values[param.name] = st.text_input(
                    label,
                    value=default,
                    help=hint,
                    key=f"path_{ep.id}_{param.name}",
                )

    if query_params:
        st.subheader("Parâmetros de consulta (query)")
        for param in query_params:
            label = param.name + (" *" if param.required else "")
            query_values[param.name] = st.text_input(
                label,
                value=param.example or "",
                help=param.description or param.schema_type,
                key=f"query_{ep.id}_{param.name}",
            )

    if not path_params and not query_params:
        st.info("Este endpoint não exige parâmetros.")

    return {**{f"__path__:{k}": v for k, v in path_values.items()},
            **{f"__query__:{k}": v for k, v in query_values.items()}}


def page_consulta_publica(catalog: ApiCatalog, client: ApiClient) -> None:
    st.header("Consulta pública")
    st.markdown(
        "Endpoints **GET** que funcionam **sem login**, conforme a documentação OpenAPI. "
        f"Base: `{catalog.base_url}`"
    )

    public = catalog.public_get_endpoints
    by_tag: dict[str, list] = {}
    for ep in public:
        by_tag.setdefault(ep.tag_label, []).append(ep)

    tag = st.selectbox(
        "Categoria",
        options=sorted(by_tag.keys()),
        key="pub_tag",
    )
    endpoints = by_tag[tag]
    labels = {f"{ep.summary}  `{ep.path}`": ep.id for ep in endpoints}
    choice = st.selectbox("Endpoint", options=list(labels.keys()), key="pub_ep")
    endpoint_id = labels[choice]

    form_data = _render_endpoint_form(catalog, endpoint_id)
    col1, col2 = st.columns([1, 4])
    with col1:
        run = st.button("Executar consulta", type="primary", use_container_width=True)

    if run and form_data is not None:
        ep = catalog.get_by_id(endpoint_id)
        assert ep is not None
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

        with st.spinner("Consultando API"):
            response = client.get(url)

        _add_history({
            "when": datetime.now().isoformat(timespec="seconds"),
            "url": url,
            "status": response.status_code,
            "ok": response.ok,
        })

        st.code(f"GET {url}", language=None)
        if response.error:
            st.error(response.error)
            return

        if response.ok:
            st.success(f"HTTP {response.status_code}  {response.elapsed_ms:.0f} ms")
        else:
            st.error(f"HTTP {response.status_code}  {response.elapsed_ms:.0f} ms")

        if response.body_json is not None:
            st.json(response.body_json)
            fname = (
                OUTPUT_DIR
                / f"consulta_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            fname.write_text(
                json.dumps(response.body_json, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            st.download_button(
                "Baixar JSON",
                data=json.dumps(response.body_json, ensure_ascii=False, indent=2),
                file_name=fname.name,
                mime="application/json",
            )
        else:
            st.text(response.body_text[:50000])


def page_catalogo(catalog: ApiCatalog) -> None:
    st.header("Catálogo completo da API")
    st.markdown(
        "Referência de todos os endpoints documentados. "
        "Marcados em verde: consulta pública GET; em vermelho: exigem autenticação."
    )

    filtro = st.radio(
        "Filtrar",
        ["Todos", "Somente públicos (GET)", "Somente com login"],
        horizontal=True,
    )
    tag_filter = st.multiselect(
        "Tags",
        options=sorted({e.tag_label for e in catalog.all_endpoints}),
    )

    rows = catalog.all_endpoints
    if filtro == "Somente públicos (GET)":
        rows = catalog.public_get_endpoints
    elif filtro == "Somente com login":
        rows = [e for e in rows if e.requires_auth]
    if tag_filter:
        rows = [e for e in rows if e.tag_label in tag_filter]

    for ep in rows:
        badge = "?? Público" if ep.is_safe_read else (
            "?? Público (não GET)" if ep.is_public else "?? Requer login"
        )
        with st.expander(f"{badge}  **{ep.method}** `{ep.path}`"):
            st.write(ep.summary)
            if ep.parameters:
                st.markdown("**Parâmetros:**")
                for p in ep.parameters:
                    req = "obrigatório" if p.required else "opcional"
                    st.markdown(
                        f"- `{p.name}` ({p.location}, {req}): "
                        f"{p.description or p.schema_type}"
                    )
            if ep.requires_auth:
                st.warning(
                    "Requer token Bearer (POST /api/v1/auth/login). "
                    "Não disponível neste sistema."
                )


def page_explorador(catalog: ApiCatalog, client: ApiClient) -> None:
    st.header("Explorador de endpoint")
    st.warning(
        "Use apenas para testar rotas documentadas. Endpoints com login retornarão **401**."
    )

    ep_options = {
        f"[{'AUTH' if e.requires_auth else 'OK'}] {e.method} {e.path}": e.id
        for e in catalog.all_endpoints
        if e.method == "GET"
    }
    choice = st.selectbox("Endpoint GET", list(ep_options.keys()))
    endpoint_id = ep_options[choice]
    form_data = _render_endpoint_form(catalog, endpoint_id)

    if st.button("Enviar GET", type="primary"):
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
        response = client.get(url)
        st.code(url)
        if ep.requires_auth:
            st.info("Este endpoint está marcado como autenticado na documentação.")
        if response.is_auth_error:
            st.error("401  Autenticação necessária. Use a aba Consulta pública.")
        elif response.ok:
            st.json(response.body_json if response.body_json is not None else response.body_text)
        else:
            st.error(f"HTTP {response.status_code}")
            st.text(response.body_text[:8000])


def page_ajuda(catalog: ApiCatalog) -> None:
    st.header("Documentação e estrutura")
    st.markdown(
        f"""
### Sobre
Sistema de consulta à **{catalog.title}** v{catalog.version}, usando somente
recursos públicos (sem credenciais).

| Item | Valor |
|------|-------|
| Documentação | [contratos.comprasnet.gov.br/api/docs](https://contratos.comprasnet.gov.br/api/docs) |
| OpenAPI | `{catalog.base_url}/docs/api-docs.json` |
| Endpoints GET públicos | **{len(catalog.public_get_endpoints)}** |
| Total documentado | **{len(catalog.all_endpoints)}** operações |

### Estrutura do projeto
```
contratos-consulta/
??? data/api-docs.json      # Especificação OpenAPI local
??? output/                 # JSON exportados (opcional)
??? scripts/setup.sh        # Instalação Linux/macOS
??? scripts/setup.bat       # Instalação Windows
??? src/contratos_consulta/
?   ??? api/catalog.py      # Catálogo de endpoints
?   ??? api/client.py       # Cliente HTTP
?   ??? app.py              # Interface web (esta tela)
?   ??? cli.py              # Linha de comando
??? requirements.txt
```

### Endpoints públicos (sem login)
"""
    )
    for ep in catalog.public_get_endpoints:
        st.markdown(f"- `{ep.method} {ep.path}`  {ep.summary}")

    st.markdown(
        """
### Replicação em outro sistema operacional
1. Instale **Python 3.10+**
2. Na pasta do projeto: `pip install -r requirements.txt`
3. Web: `streamlit run src/contratos_consulta/app.py`
4. CLI: `python -m contratos_consulta.cli list --public-only`

### Limitações
- Rotas `/api/v1/...` com período (`dt_alteracao_min/max`) exigem **token JWT**
- Operações POST/PUT/DELETE de escrita não são oferecidas (exigem usuário gov.br)
- Respeite limites de uso da API; consultas são somente leitura
        """
    )


def main() -> None:
    _init_session()
    catalog = get_catalog()
    client = get_client()

    st.sidebar.title("Contratos.gov.br")
    st.sidebar.caption("Consulta pública · sem login")
    page = st.sidebar.radio(
        "Navegação",
        [
            "Consulta pública",
            "Catálogo completo",
            "Explorador GET",
            "Ajuda",
        ],
    )
    st.sidebar.divider()
    st.sidebar.metric("GET públicos", len(catalog.public_get_endpoints))
    st.sidebar.link_button(
        "Documentação oficial",
        "https://contratos.comprasnet.gov.br/api/docs",
    )

    if st.session_state.history:
        st.sidebar.subheader("Últimas consultas")
        for h in st.session_state.history[:5]:
            icon = "?" if h["ok"] else "?"
            st.sidebar.caption(f"{icon} {h['status']}  {h['url'][:50]}")

    st.title("Sistema de Consulta  API Contratos")
    st.caption(f"Projeto: {PROJECT_ROOT.name} · Base URL: {BASE_URL}")

    if page == "Consulta pública":
        page_consulta_publica(catalog, client)
    elif page == "Catálogo completo":
        page_catalogo(catalog)
    elif page == "Explorador GET":
        page_explorador(catalog, client)
    else:
        page_ajuda(catalog)


if __name__ == "__main__":
    main()
