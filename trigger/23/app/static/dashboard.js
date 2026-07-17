/* ============================================================
   dashboard.js — Painel consolidado (Compras.gov | Power BI)
   ============================================================ */

function dashBarList(items, maxItems = 7) {
  if (!items?.length) return '<p class="dash-empty">Sem dados para os filtros selecionados.</p>';
  const slice = items.slice(0, maxItems);
  const max = Math.max(...slice.map((i) => i.total), 1);
  return `<ul class="dash-bar-list">
    ${slice.map((i) => {
      const pct = Math.round((i.total / max) * 100);
      const cls = i.vinculado === false ? " dash-bar-unlinked" : "";
      return `<li class="${cls.trim() || "dash-bar-item"}">
        <div class="dash-bar-meta">
          <span class="dash-bar-label" title="${esc(i.nome)}">${esc(i.nome)}</span>
          <span class="dash-bar-val">${fmtNum(i.total)}</span>
        </div>
        <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${pct}%"></div></div>
      </li>`;
    }).join("")}
    ${items.length > maxItems ? `<li class="dash-bar-more muted-inline">+ ${items.length - maxItems} outros</li>` : ""}
  </ul>`;
}

/* Cruzamento entre as duas bases */
const DASH_CRUZ_PARES = {
  api: [{ key: "em_powerbi", label: "Também no Power BI" }],
  powerbi: [{ key: "em_api", label: "Também no Compras.gov" }],
};

function dashCruzamento(id, cruz) {
  if (!cruz) return "";
  const pares = DASH_CRUZ_PARES[id] || [];
  const base = cruz.com_chave_valida || 0;
  const cards = pares.map(({ key, label }) => {
    const n = cruz[key] ?? 0;
    const pct = base ? Math.round((n / base) * 100) : 0;
    return `<div class="dash-cruz-kpi">
      <span class="dash-cruz-n">${fmtNum(n)}</span>
      <span class="dash-cruz-pct">${pct}%</span>
      <span class="dash-cruz-l">${esc(label)}</span>
    </div>`;
  }).join("");
  const extras = [];
  if (cruz.somente_esta_base) {
    extras.push(`<span>Somente aqui: <strong>${fmtNum(cruz.somente_esta_base)}</strong></span>`);
  }
  return `<section class="dash-cruzamento">
    <h4>Presença na outra base
      <span class="dash-hint" title="Cruzamento por órgão consolidado + ano + nº do processo">ⓘ</span>
    </h4>
    <div class="dash-cruz-kpis">${cards}</div>
    ${extras.length ? `<div class="dash-cruz-meta">${extras.join(" · ")}</div>` : ""}
  </section>`;
}

function dashBasePanel(id, titulo, badge, descricao, data, extras) {
  const el = $(`#dash-panel-${id}`);
  if (!el) return;
  const total = data?.total_processos ?? 0;
  let kpis = `<div class="dash-kpi dash-kpi-main">
    <span class="dash-kpi-n">${fmtNum(total)}</span>
    <span class="dash-kpi-l">Total de processos</span>
  </div>`;
  if (extras?.valor_estimado != null || extras?.valor_homologado != null) {
    kpis += `<div class="dash-kpi">
      <span class="dash-kpi-n dash-kpi-money">${fmtMoeda(extras.valor_estimado)}</span>
      <span class="dash-kpi-l">Valor estimado</span>
    </div>
    <div class="dash-kpi">
      <span class="dash-kpi-n dash-kpi-money">${fmtMoeda(extras.valor_homologado)}</span>
      <span class="dash-kpi-l">Valor homologado</span>
    </div>`;
  }
  if (extras?.valor_solicitacao != null) {
    kpis += `<div class="dash-kpi">
      <span class="dash-kpi-n dash-kpi-money">${fmtMoeda(extras.valor_solicitacao)}</span>
      <span class="dash-kpi-l">Valor solicitação</span>
    </div>`;
  }

  el.innerHTML = `
    <div class="dash-base-head">
      <span class="dash-base-badge ${id}">${esc(badge)}</span>
      <h3>${esc(titulo)}</h3>
      <p class="dash-base-desc">${esc(descricao)}</p>
    </div>
    <div class="dash-kpis">${kpis}</div>
    ${dashCruzamento(id, data?.cruzamento)}
    <div class="dash-breakdowns">
      <div class="dash-breakdown"><h4>Por órgão</h4>${dashBarList(data?.por_orgao)}</div>
      <div class="dash-breakdown"><h4>Por modalidade</h4>${dashBarList(data?.por_modalidade)}</div>
      <div class="dash-breakdown"><h4>Por situação</h4>${dashBarList((data?.por_situacao || []).map((s) => ({ ...s, vinculado: true })))}</div>
    </div>`;
}

function dashResumoFiltros(f) {
  const el = $("#dash-filtros-resumo");
  if (!el) return;
  const periodo = resumoFiltroPeriodo("dash");
  const parts = [periodo ? `<strong>${esc(periodo)}</strong>` : "Período <strong>todos</strong>"];
  if (f.orgao_nome) parts.push(`Órgão <strong>${esc(f.orgao_nome)}</strong>`);
  if (f.modalidade_nome) parts.push(`Modalidade <strong>${esc(f.modalidade_nome)}</strong>`);
  el.innerHTML = parts.join(" · ");
}

async function carregarDashFiltros() {
  try {
    const data = await api("/api/dashboard-gerencial/filtros");
    const selAno = $("#dash-filtro-ano");
    const selOrg = $("#dash-filtro-orgao");
    if (selAno) {
      selAno.innerHTML = '<option value="">Todos</option>' +
        (data.anos || []).map((a) => `<option value="${a}">${a}</option>`).join("");
    }
    if (selOrg) {
      selOrg.innerHTML = '<option value="">Todos</option>' +
        (data.orgaos || []).map((o) => `<option value="${o.id}">${esc(o.sigla ? `${o.sigla} · ${o.nome}` : o.nome)}</option>`).join("");
    }
    multiSelectOf("#dash-filtro-modalidade")?.setOptions(
      (data.modalidades || []).map((m) => ({ value: m.id, label: m.nome })),
    );
  } catch (err) {
    console.error("Filtros do painel:", err);
  }
}

async function carregarDashStats() {
  const params = new URLSearchParams();
  const orgao = $("#dash-filtro-orgao")?.value;
  if (orgao) params.set("orgao_id", orgao);
  appendQueryAll(params, "modalidade_id", multiSelectOf("#dash-filtro-modalidade")?.getValues());

  const btn = $("#btn-dash-atualizar");
  if (btn) btn.disabled = true;
  try {
    appendPeriodoParams(params, "dash");
    const data = await api(`/api/dashboard-gerencial/stats?${params}`);
    dashResumoFiltros(data.filtros || {});
    dashBasePanel(
      "api", "Compras.gov · PNCP", "PNCP",
      "Contratações da API Dados Abertos federal (Lei 14.133).",
      data.api,
      {
        valor_estimado: data.api?.valor_estimado_total,
        valor_homologado: data.api?.valor_homologado_total,
      },
    );
    dashBasePanel(
      "powerbi", "Power BI · PMU", "Dados Abertos",
      "Consolidado municipal de licitações, contratos e responsáveis.",
      data.powerbi,
      { valor_solicitacao: data.powerbi?.valor_solicitacao_total },
    );
  } catch (err) {
    ["api", "powerbi"].forEach((id) => {
      const el = $(`#dash-panel-${id}`);
      if (el) el.innerHTML = `<p class="result err">${esc(err.message)}</p>`;
    });
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function carregarDashboard() {
  iniciarFiltroPeriodo("dash");
  await carregarDashFiltros();
  await carregarDashStats();
}

$("#form-dash-filtros")?.addEventListener("submit", (e) => { e.preventDefault(); carregarDashStats(); });
$("#btn-dash-limpar")?.addEventListener("click", () => {
  $("#form-dash-filtros")?.reset();
  limparFiltroPeriodo("dash");
  multiSelectOf("#dash-filtro-modalidade")?.clear({ silent: true });
  carregarDashStats();
});

registrarPagina("dashboard", carregarDashboard);
