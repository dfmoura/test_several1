/* dashboard — removível: apague este arquivo e referências em index.html */

const dashEl = () => document.getElementById("dashboard-root");

function dashEsc(t) {
  const e = document.createElement("span");
  e.textContent = t ?? "—";
  return e.innerHTML;
}

function fmtNum(n) {
  return (n ?? 0).toLocaleString("pt-BR");
}

function fmtData(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function barChart(anos, series, cls) {
  if (!anos.length) return '<p class="dash-empty">Sem dados por ano.</p>';
  const max = Math.max(...anos.map((a) => series[a] || 0), 1);
  return `<div class="dash-bar-chart">${anos
    .map((ano) => {
      const v = series[ano] || 0;
      const w = Math.max(2, Math.round((v / max) * 100));
      return `<div class="dash-bar-row">
        <span class="dash-bar-label">${dashEsc(String(ano))}</span>
        <div class="dash-bar-track"><div class="dash-bar-fill ${cls}" style="width:${w}%"></div></div>
        <span class="dash-bar-value">${fmtNum(v)}</span>
      </div>`;
    })
    .join("")}</div>`;
}

function distList(items, total, compras) {
  if (!items?.length) return '<p class="dash-empty">Sem registros.</p>';
  const max = items[0]?.total || 1;
  const cls = compras ? " compras" : "";
  return `<div class="dash-dist-list">${items
    .map((it) => {
      const w = Math.max(4, Math.round((it.total / max) * 100));
      return `<div class="dash-dist-item${cls}">
        <span class="label" title="${dashEsc(it.label)}">${dashEsc(it.label)}</span>
        <span class="count">${fmtNum(it.total)}</span>
        <div class="mini-track"><div class="mini-fill" style="width:${w}%"></div></div>
      </div>`;
    })
    .join("")}</div>`;
}

function orgList(items, keyCodigo) {
  if (!items?.length) return '<p class="dash-empty">Sem registros.</p>';
  const max = items[0]?.total || 1;
  return `<div class="dash-dist-list">${items
    .map((it) => {
      const w = Math.max(4, Math.round((it.total / max) * 100));
      const label = it.nome ? `${it[keyCodigo]} — ${it.nome}` : it[keyCodigo];
      return `<div class="dash-dist-item">
        <span class="label" title="${dashEsc(label)}">${dashEsc(label)}</span>
        <span class="count">${fmtNum(it.total)}</span>
        <div class="mini-track"><div class="mini-fill" style="width:${w}%"></div></div>
      </div>`;
    })
    .join("")}</div>`;
}

function renderDashboard(data) {
  const root = dashEl();
  if (!root) return;

  const m = data.municipal;
  const c = data.compras;
  const obs = data.observadores;
  const anos = data.anos || [];
  const ar = data.ano_referencia;
  const totalGeral = m.total + c.total;
  const cobertura = pct(obs.vinculos_total, totalGeral);

  const insights = [];
  if (m.sem_observador > 0 || c.sem_observador > 0) {
    insights.push({
      title: "Acompanhamento pendente",
      text: `${fmtNum(m.sem_observador)} municipal e ${fmtNum(c.sem_observador)} Compras.gov sem observador vinculado.`,
    });
  }
  if (m.ultima_coleta) {
    insights.push({
      title: "Última coleta municipal",
      text: fmtData(m.ultima_coleta),
    });
  }
  if (c.ultima_coleta) {
    insights.push({
      title: "Última coleta Compras.gov",
      text: fmtData(c.ultima_coleta),
    });
  }
  while (insights.length < 3) {
    insights.push({
      title: `Ano de referência: ${ar}`,
      text: `${fmtNum(m.ano_referencia)} licitações municipais e ${fmtNum(c.ano_referencia)} contratações PNCP em ${ar}.`,
    });
    break;
  }

  const cargaRows = obs.carga?.length
    ? obs.carga
        .map(
          (o) => `<tr>
        <td>${dashEsc(o.nome)}</td>
        <td class="num">${fmtNum(o.municipal)}</td>
        <td class="num">${fmtNum(o.compras)}</td>
        <td class="num">${fmtNum(o.total)}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="4" class="dash-empty">Nenhum vínculo ativo com observadores.</td></tr>`;

  root.innerHTML = `
    <div class="dash-toolbar">
      <div>
        <h2>Guia gerencial</h2>
        <p class="dash-toolbar-meta">Visão consolidada · atualizado em ${fmtData(data.gerado_em)}</p>
      </div>
      <div class="dash-toolbar-actions">
        <button type="button" class="btn ghost" id="dash-refresh">Atualizar</button>
      </div>
    </div>

    <div class="dash-kpi-grid">
      <div class="dash-kpi accent-navy">
        <div class="dash-kpi-label">Total municipal</div>
        <div class="dash-kpi-value">${fmtNum(m.total)}</div>
        <div class="dash-kpi-sub">${ar}: ${fmtNum(m.ano_referencia)}</div>
      </div>
      <div class="dash-kpi accent-teal">
        <div class="dash-kpi-label">Compras.gov</div>
        <div class="dash-kpi-value">${fmtNum(c.total)}</div>
        <div class="dash-kpi-sub">${ar}: ${fmtNum(c.ano_referencia)}</div>
      </div>
      <div class="dash-kpi accent-blue">
        <div class="dash-kpi-label">Base consolidada</div>
        <div class="dash-kpi-value">${fmtNum(totalGeral)}</div>
        <div class="dash-kpi-sub">Municipal + PNCP</div>
      </div>
      <div class="dash-kpi accent-violet">
        <div class="dash-kpi-label">Observadores</div>
        <div class="dash-kpi-value">${fmtNum(obs.total_ativos)}</div>
        <div class="dash-kpi-sub">${fmtNum(obs.vinculos_total)} vínculos</div>
      </div>
      <div class="dash-kpi accent-amber">
        <div class="dash-kpi-label">Cobertura</div>
        <div class="dash-kpi-value">${cobertura}%</div>
        <div class="dash-kpi-sub">com observador</div>
      </div>
      <div class="dash-kpi accent-slate">
        <div class="dash-kpi-label">Órgãos / unidades</div>
        <div class="dash-kpi-value">${fmtNum(m.por_empresa?.length || 0)} / ${fmtNum(c.por_unidade?.length || 0)}</div>
        <div class="dash-kpi-sub">com registros</div>
      </div>
    </div>

    <div class="dash-insight-row">
      ${insights
        .slice(0, 3)
        .map((i) => `<div class="dash-insight"><strong>${dashEsc(i.title)}</strong><span>${dashEsc(i.text)}</span></div>`)
        .join("")}
    </div>

    <div class="dash-grid-2">
      <section class="dash-panel">
        <div class="dash-panel-head">
          <h3>Volume por ano — Municipal</h3>
          <span class="dash-panel-badge">Portal PMU</span>
        </div>
        ${barChart(anos, m.por_ano, "municipal")}
      </section>
      <section class="dash-panel">
        <div class="dash-panel-head">
          <h3>Volume por ano — Compras.gov</h3>
          <span class="dash-panel-badge compras">PNCP</span>
        </div>
        ${barChart(anos, c.por_ano, "compras")}
      </section>
    </div>

    <div class="dash-grid-3">
      <section class="dash-panel">
        <div class="dash-panel-head"><h3>Órgãos municipais</h3></div>
        ${orgList(m.por_empresa, "codigo")}
      </section>
      <section class="dash-panel">
        <div class="dash-panel-head"><h3>Situação — Municipal</h3></div>
        ${distList(m.por_situacao, m.total, false)}
      </section>
      <section class="dash-panel">
        <div class="dash-panel-head"><h3>Modalidade — Municipal</h3></div>
        ${distList(m.por_modalidade, m.total, false)}
      </section>
    </div>

    <div class="dash-grid-3">
      <section class="dash-panel">
        <div class="dash-panel-head"><h3>Unidades compradoras</h3></div>
        ${orgList(c.por_unidade, "codigo")}
      </section>
      <section class="dash-panel">
        <div class="dash-panel-head"><h3>Situação — Compras.gov</h3></div>
        ${distList(c.por_situacao, c.total, true)}
      </section>
      <section class="dash-panel">
        <div class="dash-panel-head"><h3>Modalidade — Compras.gov</h3></div>
        ${distList(c.por_modalidade, c.total, true)}
      </section>
    </div>

    <div class="dash-grid-2">
      <section class="dash-panel">
        <div class="dash-panel-head"><h3>Carga por observador</h3></div>
        <table class="dash-obs-table">
          <thead><tr><th>Observador</th><th>Municipal</th><th>Compras</th><th>Total</th></tr></thead>
          <tbody>${cargaRows}</tbody>
        </table>
      </section>
      <section class="dash-panel">
        <div class="dash-panel-head"><h3>Acesso rápido</h3></div>
        <p class="muted" style="margin:0 0 .75rem">Navegue para coleta, consulta ou cadastro sem sair do hub.</p>
        <div class="dash-quick-links">
          <button type="button" class="btn ghost dash-goto" data-page="coletar">Coletar municipal</button>
          <button type="button" class="btn ghost dash-goto" data-page="consultar">Consultar municipal</button>
          <button type="button" class="btn ghost dash-goto" data-page="compras-coletar">Coletar Compras.gov</button>
          <button type="button" class="btn ghost dash-goto" data-page="compras-consultar">Consultar Compras.gov</button>
          <button type="button" class="btn primary dash-goto" data-page="observadores">Observadores</button>
        </div>
      </section>
    </div>
  `;

  document.getElementById("dash-refresh")?.addEventListener("click", carregarDashboard);
  root.querySelectorAll(".dash-goto").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      const nav = document.querySelector(`.nav-btn[data-page="${page}"]`);
      nav?.click();
    });
  });
}

async function carregarDashboard() {
  const root = dashEl();
  if (!root) return;
  root.innerHTML = '<div class="dash-loading">Carregando indicadores…</div>';
  try {
    const r = await fetch("/api/dashboard");
    if (!r.ok) throw new Error(await r.text() || r.statusText);
    renderDashboard(await r.json());
  } catch (err) {
    root.innerHTML = `<div class="dash-error">Não foi possível carregar o dashboard: ${dashEsc(err.message)}</div>`;
  }
}

document.querySelectorAll('.nav-btn[data-page="dashboard"]').forEach((btn) => {
  btn.addEventListener("click", () => {
    document.body.classList.toggle("dashboard-active", true);
    document.body.classList.remove("consult-active");
    carregarDashboard();
  });
});

document.querySelectorAll('.nav-btn:not([data-page="dashboard"])').forEach((btn) => {
  btn.addEventListener("click", () => {
    document.body.classList.remove("dashboard-active");
  });
});
