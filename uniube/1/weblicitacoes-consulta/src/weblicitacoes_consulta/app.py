"""
Interface web — Web Licitações Uberlândia
Execute: streamlit run src/weblicitacoes_consulta/app.py
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st

from weblicitacoes_consulta.config import EMPRESAS, OUTPUT_DIR, PROJECT_ROOT
from weblicitacoes_consulta.db.repository import LicitacaoRepository
from weblicitacoes_consulta.scraper.collector import LicitacoesCollector
from weblicitacoes_consulta.services import import_csv, persist_records

st.set_page_config(
    page_title="Web Licitações — Uberlândia",
    page_icon="🏛️",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
<style>
    .main-header { font-size: 1.75rem; font-weight: 600; color: #1a365d; }
    .sub-header { color: #4a5568; margin-bottom: 1rem; }
    div[data-testid="stMetricValue"] { font-size: 1.35rem; }
</style>
""",
    unsafe_allow_html=True,
)


@st.cache_resource
def get_repo() -> LicitacaoRepository:
    return LicitacaoRepository()


def _licitacoes_to_df(rows: list) -> pd.DataFrame:
    with LicitacaoRepository() as repo:
        data = [repo.licitacao_to_dict(r) for r in rows]
    if not data:
        return pd.DataFrame()
    df = pd.DataFrame(data)
    display_cols = [
        "processo",
        "empresa_nome",
        "ano",
        "modalidade",
        "data_abertura",
        "situacao",
        "descricao_edital",
        "valor_licitacao",
        "fonte",
    ]
    return df[[c for c in display_cols if c in df.columns]]


def page_consulta() -> None:
    st.markdown('<p class="main-header">Consulta de Licitações</p>', unsafe_allow_html=True)
    st.markdown(
        '<p class="sub-header">Pesquise licitações persistidas no banco local.</p>',
        unsafe_allow_html=True,
    )

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        anos_disponiveis = [None] + list(range(2028, 2002, -1))
        ano = st.selectbox("Ano", anos_disponiveis, format_func=lambda x: "Todos" if x is None else str(x))
    with col2:
        empresas_opts = {"Todas": None, **{v: k for k, v in EMPRESAS.items()}}
        empresa_label = st.selectbox("Empresa / Órgão", list(empresas_opts.keys()))
        empresa = empresas_opts[empresa_label]
    with col3:
        situacao = st.text_input("Situação", placeholder="Ex.: Em andamento")
    with col4:
        modalidade = st.text_input("Modalidade", placeholder="Ex.: PE, Pregão")

    texto = st.text_input("Busca textual", placeholder="Objeto, processo, empresa…")
    limit = st.slider("Limite de resultados", 10, 500, 100)

    if st.button("Pesquisar", type="primary", use_container_width=False):
        repo = get_repo()
        rows, total = repo.buscar(
            ano=ano,
            empresa_codigo=empresa,
            situacao=situacao or None,
            modalidade=modalidade or None,
            texto=texto or None,
            limit=limit,
        )
        st.session_state["result_rows"] = rows
        st.session_state["result_total"] = total

    rows = st.session_state.get("result_rows", [])
    total = st.session_state.get("result_total", 0)

    if rows:
        st.metric("Registros encontrados", f"{len(rows)} de {total}")
        df = _licitacoes_to_df(rows)
        st.dataframe(df, use_container_width=True, hide_index=True)

        json_data = json.dumps(
            [get_repo().licitacao_to_dict(r) for r in rows],
            ensure_ascii=False,
            indent=2,
        )
        st.download_button(
            "Baixar JSON",
            json_data,
            file_name=f"licitacoes_{datetime.now():%Y%m%d_%H%M%S}.json",
            mime="application/json",
        )
        st.download_button(
            "Baixar CSV",
            df.to_csv(index=False).encode("utf-8-sig"),
            file_name=f"licitacoes_{datetime.now():%Y%m%d_%H%M%S}.csv",
            mime="text/csv",
        )


def page_coleta() -> None:
    st.markdown('<p class="main-header">Coleta de Dados</p>', unsafe_allow_html=True)
    st.info(
        "A coleta usa Playwright (navegador Chromium). "
        "O portal pode bloquear modo headless — mantenha **Navegador visível** ativado."
    )

    tab_web, tab_csv = st.tabs(["Portal Web Licitações", "Importar CSV"])

    with tab_web:
        anos = st.multiselect("Anos", list(range(2028, 2002, -1)), default=[2026])
        empresas_sel = st.multiselect(
            "Empresas",
            options=list(EMPRESAS.keys()),
            default=list(EMPRESAS.keys()),
            format_func=lambda k: f"{k} — {EMPRESAS[k][:40]}",
        )
        headless = st.checkbox("Modo headless (pode falhar por bloqueio WAF)", value=False)

        if st.button("Iniciar coleta", type="primary"):
            log_box = st.empty()
            logs: list[str] = []

            def on_progress(msg: str) -> None:
                logs.append(msg)
                log_box.code("\n".join(logs[-20:]))

            with st.spinner("Coletando licitações…"):
                collector = LicitacoesCollector(headless=headless, on_progress=on_progress)
                with LicitacaoRepository() as repo:
                    sync = repo.iniciar_sync({"anos": anos, "empresas": empresas_sel})
                    sync_id = sync.id
                try:
                    records = collector.collect(anos=anos, empresas=empresas_sel)
                    novos, atualizados = persist_records(records)
                    with LicitacaoRepository() as repo:
                        repo.finalizar_sync(
                            sync_id,
                            novos=novos,
                            atualizados=atualizados,
                            total=len(records),
                        )
                    st.success(
                        f"Coleta concluída: {len(records)} registros — "
                        f"{novos} novos, {atualizados} atualizados"
                    )
                except Exception as exc:
                    with LicitacaoRepository() as repo:
                        repo.finalizar_sync(sync_id, status="error", mensagem=str(exc))
                    st.error(f"Erro na coleta: {exc}")

    with tab_csv:
        st.markdown("Importe CSVs exportados do portal (separador `;`, encoding Latin-1).")
        uploaded = st.file_uploader("Arquivo CSV", type=["csv"])
        if uploaded and st.button("Importar CSV"):
            tmp = OUTPUT_DIR / f"_upload_{datetime.now():%Y%m%d_%H%M%S}.csv"
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            tmp.write_bytes(uploaded.read())
            novos, atualizados = import_csv(tmp)
            st.success(f"Importação: {novos} novos, {atualizados} atualizados")
            tmp.unlink(missing_ok=True)


def page_dashboard() -> None:
    st.markdown('<p class="main-header">Painel</p>', unsafe_allow_html=True)
    repo = get_repo()
    info = repo.estatisticas()

    c1, c2, c3 = st.columns(3)
    c1.metric("Total no banco", info["total"])
    c2.metric("Anos distintos", len(info["por_ano"]))
    c3.metric("Empresas", len(info["por_empresa"]))

    if info["por_ano"]:
        df_ano = pd.DataFrame(
            [{"Ano": k, "Quantidade": v} for k, v in info["por_ano"].items()]
        )
        st.subheader("Licitações por ano")
        st.bar_chart(df_ano.set_index("Ano"))

    if info["por_situacao"]:
        df_sit = pd.DataFrame(
            [{"Situação": k, "Quantidade": v} for k, v in info["por_situacao"].items()]
        )
        st.subheader("Por situação")
        st.dataframe(df_sit, hide_index=True, use_container_width=True)

    syncs = repo.ultimas_syncs(10)
    if syncs:
        st.subheader("Últimas sincronizações")
        sync_data = [
            {
                "ID": s.id,
                "Início": s.iniciado_em.strftime("%d/%m/%Y %H:%M"),
                "Status": s.status,
                "Novos": s.novos,
                "Atualizados": s.atualizados,
                "Total": s.total_coletados,
            }
            for s in syncs
        ]
        st.dataframe(pd.DataFrame(sync_data), hide_index=True, use_container_width=True)


def page_ajuda() -> None:
    st.markdown('<p class="main-header">Ajuda</p>', unsafe_allow_html=True)
    st.markdown(
        f"""
### Sobre

Sistema para **capturar**, **persistir** e **consultar** licitações do portal
[Web Licitações — Prefeitura de Uberlândia](https://weblicitacoes.uberlandia.mg.gov.br/).

Desenvolvido para apoiar o acompanhamento de licitações do
**Observatório Social do Brasil — Uberlândia**.

### Fonte de dados

| Campo | Origem |
|-------|--------|
| Processo, objeto, datas, situação | Portal Web Licitações |
| Empresa/órgão | Filtro do portal (PMU, DMAE, IPREMU, etc.) |

### Banco de dados

SQLite em `{PROJECT_ROOT / "data" / "weblicitacoes.db"}`.

### CLI

```bash
./scripts/run_cli.sh coletar --ano 2026
./scripts/run_cli.sh consultar --ano 2026 --situacao "Em andamento"
./scripts/run_cli.sh importar-csv ../arquivo_download/Licitacoes2026.csv
./scripts/run_cli.sh stats
```

### Empresas monitoradas

"""
    )
    for codigo, nome in EMPRESAS.items():
        st.markdown(f"- **{codigo}** — {nome}")


def main() -> None:
    st.sidebar.title("Web Licitações")
    st.sidebar.caption("Prefeitura de Uberlândia / MG")
    page = st.sidebar.radio(
        "Navegação",
        ["Consulta", "Coleta", "Painel", "Ajuda"],
        label_visibility="collapsed",
    )

    if page == "Consulta":
        page_consulta()
    elif page == "Coleta":
        page_coleta()
    elif page == "Painel":
        page_dashboard()
    else:
        page_ajuda()


if __name__ == "__main__":
    main()
