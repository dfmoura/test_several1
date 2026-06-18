/** Dashboard gerencial — visão consolidada Portal, API PNCP e Power BI — removível. */
const $d = (s) => document.querySelector(s);

async function dashApi(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error((await r.text()) || r.statusText);
  return r.json();
}

function dashEsc(t) {
  const e = document.createElement("span");
  e.textContent = t ?? "-";
  return e.innerHTML;
}

function fmtMoeda(v) {
  if (v == null || v === "") return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtNum(n) {
  return new Intl.NumberFormat("pt-BR").format(n ?? 0);
}

function renderBarList(items, maxItems = 8) {
  if (!items?.length) {
    return '<p class="dash-empty">Nenhum registro para os filtros selecionados.</p>';
  }
  const slice = items.slice(0, maxItems);
  const max = Math.max(...slice.map((i) => i.total), 1);
  return `<ul class="dash-bar-list">
    ${slice.map((i) => {
      const pct = Math.round((i.total / max) * 100);
      const cls = i.vinculado === false ? " dash-bar-unlinked" : "";
      return `<li class="dash-bar-item${cls}">
        <div class="dash-bar-meta">
          <span class="dash-bar-label" title="${dashEsc(i.nome)}">${dashEsc(i.nome)}</span>
          <span class="dash-bar-val">${fmtNum(i.total)}</span>
        </div>
        <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${pct}%"></div></div>
      </li>`;
    }).join("")}
    ${items.length > maxItems ? `<li class="dash-bar-more muted-inline">+ ${items.length - maxItems} outros</li>` : ""}
  </ul>`;
}

const CRUZAMENTO_PARES = {
  portal: [
    { key: "em_api", label: "Também na API" },
    { key: "em_powerbi", label: "Também no Power BI" },
  ],
  api: [
    { key: "em_portal", label: "Também no Portal" },
    { key: "em_powerbi", label: "Também no Power BI" },
  ],
  powerbi: [
    { key: "em_portal", label: "Também no Portal" },
    { key: "em_api", label: "Também na API" },
  ],
};

function renderSemChaveLista(baseId, cruz) {
  const itens = cruz?.sem_chave_registros || [];
  const total = cruz?.sem_chave_registros_total ?? cruz?.sem_chave ?? 0;
  if (!total) return "";

  const cols = baseId === "api"
    ? ["ano", "processo", "orgao", "numero", "motivo"]
    : ["ano", "processo", "orgao", "modalidade", "motivo"];
  const labels = {
    ano: "Ano",
    processo: "Processo",
    orgao: "Órgão",
    numero: "Nº compra",
    modalidade: "Modalidade",
    motivo: "Motivo",
  };

  const trunc = total > itens.length
    ? `<p class="dash-sem-chave-hint muted-inline">Exibindo ${fmtNum(itens.length)} de ${fmtNum(total)} registros.</p>`
    : "";

  const thead = cols.map((c) => `<th>${labels[c]}</th>`).join("");
  const tbody = itens.map((r) =>
    `<tr>${cols.map((c) => `<td>${dashEsc(r[c])}</td>`).join("")}</tr>`,
  ).join("");

  return `<details class="dash-sem-chave">
    <summary>Sem chave de cruzamento: <strong>${fmtNum(total)}</strong></summary>
    ${trunc}
    <div class="dash-sem-chave-scroll">
      <table class="data-table dash-sem-chave-table">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody || `<tr><td colspan="${cols.length}">Nenhum registro.</td></tr>`}</tbody>
      </table>
    </div>
  </details>`;
}

function renderCruzamento(id, cruz) {
  if (!cruz) return "";
  const pares = CRUZAMENTO_PARES[id] || [];
  const base = cruz.com_chave_valida || 0;
  const cards = pares.map(({ key, label }) => {
    const n = cruz[key] ?? 0;
    const pct = base ? Math.round((n / base) * 100) : 0;
    return `<div class="dash-cruz-kpi">
      <span class="dash-cruz-n">${fmtNum(n)}</span>
      <span class="dash-cruz-pct">${pct}%</span>
      <span class="dash-cruz-l">${dashEsc(label)}</span>
    </div>`;
  }).join("");
  const extras = [];
  if (cruz.em_ambas) {
    extras.push(`<span class="dash-cruz-extra">Nas três bases: <strong>${fmtNum(cruz.em_ambas)}</strong></span>`);
  }
  if (cruz.somente_esta_base) {
    extras.push(`<span class="dash-cruz-extra">Somente aqui: <strong>${fmtNum(cruz.somente_esta_base)}</strong></span>`);
  }
  return `<section class="dash-cruzamento">
    <h4>Presença em outras bases
      <span class="dash-hint" title="Cruzamento por órgão consolidado + ano + nº do processo (Portal/API extraem o número; Power BI usa o campo PROCESSO)">ⓘ</span>
    </h4>
    <div class="dash-cruz-kpis">${cards}</div>
    ${extras.length ? `<div class="dash-cruz-meta">${extras.join(" · ")}</div>` : ""}
    ${renderSemChaveLista(id, cruz)}
  </section>`;
}

function renderBasePanel(id, titulo, badge, descricao, data, extras) {
  const el = $d(`#dash-panel-${id}`);
  if (!el) return;
  const total = data?.total_processos ?? 0;
  let kpiHtml = `<div class="dash-kpi dash-kpi-main">
    <span class="dash-kpi-n">${fmtNum(total)}</span>
    <span class="dash-kpi-l">Total de processos</span>
  </div>`;
  if (extras?.valor_estimado != null || extras?.valor_homologado != null) {
    kpiHtml += `<div class="dash-kpi">
      <span class="dash-kpi-n dash-kpi-money">${fmtMoeda(extras.valor_estimado)}</span>
      <span class="dash-kpi-l">Valor estimado</span>
    </div>
    <div class="dash-kpi">
      <span class="dash-kpi-n dash-kpi-money">${fmtMoeda(extras.valor_homologado)}</span>
      <span class="dash-kpi-l">Valor homologado</span>
    </div>`;
  }
  if (extras?.valor_solicitacao != null) {
    kpiHtml += `<div class="dash-kpi">
      <span class="dash-kpi-n dash-kpi-money">${fmtMoeda(extras.valor_solicitacao)}</span>
      <span class="dash-kpi-l">Valor solicitação</span>
    </div>`;
  }

  const sitTitulo = extras?.situacao_hint
    ? `Situação <span class="dash-hint" title="${dashEsc(extras.situacao_hint)}">ⓘ</span>`
    : "Situação";

  el.innerHTML = `
    <div class="dash-base-head">
      <div>
        <span class="dash-base-badge ${id}">${dashEsc(badge)}</span>
        <h3>${dashEsc(titulo)}</h3>
        <p class="muted dash-base-desc">${dashEsc(descricao)}</p>
      </div>
    </div>
    <div class="dash-kpis">${kpiHtml}</div>
    ${renderCruzamento(id, data?.cruzamento)}
    <div class="dash-breakdowns">
      <div class="dash-breakdown">
        <h4>Por órgão</h4>
        ${renderBarList(data?.por_orgao)}
      </div>
      <div class="dash-breakdown">
        <h4>Por modalidade</h4>
        ${renderBarList(data?.por_modalidade)}
      </div>
      <div class="dash-breakdown">
        <h4>${sitTitulo}</h4>
        ${renderBarList(data?.por_situacao?.map((s) => ({ ...s, vinculado: true })))}
      </div>
    </div>`;
}

function renderFiltrosResumo(f) {
  const el = $d("#dash-filtros-resumo");
  if (!el) return;
  const parts = [];
  if (f.ano) parts.push(`Ano <strong>${f.ano}</strong>`);
  else parts.push("Ano <strong>todos</strong>");
  if (f.orgao_nome) parts.push(`Órgão <strong>${dashEsc(f.orgao_nome)}</strong>`);
  if (f.modalidade_nome) parts.push(`Modalidade <strong>${dashEsc(f.modalidade_nome)}</strong>`);
  el.innerHTML = parts.join(" · ");
}

async function carregarDashboardFiltros() {
  const data = await dashApi("/api/dashboard-gerencial/filtros");
  const selAno = $d("#dash-filtro-ano");
  const selOrg = $d("#dash-filtro-orgao");
  const selMod = $d("#dash-filtro-modalidade");
  if (selAno) {
    selAno.innerHTML = '<option value="">Todos</option>';
    (data.anos || []).forEach((a) => {
      const o = document.createElement("option");
      o.value = a;
      o.textContent = a;
      selAno.appendChild(o);
    });
  }
  if (selOrg) {
    selOrg.innerHTML = '<option value="">Todos</option>';
    (data.orgaos || []).forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.id;
      opt.textContent = o.sigla ? `${o.sigla} · ${o.nome}` : o.nome;
      selOrg.appendChild(opt);
    });
  }
  if (selMod) {
    selMod.innerHTML = '<option value="">Todas</option>';
    (data.modalidades || []).forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.nome;
      selMod.appendChild(opt);
    });
  }
}

async function carregarDashboardStats() {
  const params = new URLSearchParams();
  const ano = $d("#dash-filtro-ano")?.value;
  const orgao = $d("#dash-filtro-orgao")?.value;
  const mod = $d("#dash-filtro-modalidade")?.value;
  if (ano) params.set("ano", ano);
  if (orgao) params.set("orgao_id", orgao);
  if (mod) params.set("modalidade_id", mod);

  const btn = $d("#btn-dash-atualizar");
  if (btn) btn.disabled = true;
  try {
    const data = await dashApi(`/api/dashboard-gerencial/stats?${params}`);
    renderFiltrosResumo(data.filtros || {});
    renderBasePanel(
      "portal",
      "Portal da Prefeitura",
      "Oficial",
      "Base completa e oficial — licitações coletadas diretamente do portal municipal.",
      data.portal,
      null,
    );
    renderBasePanel(
      "api",
      "API · Compras.gov / PNCP",
      "PNCP",
      "Licitações vinculadas ao PNCP — Dados Abertos Compras Públicas.",
      data.api,
      {
        valor_estimado: data.api?.valor_estimado_total,
        valor_homologado: data.api?.valor_homologado_total,
        situacao_hint: "Consolidada a partir dos itens da contratação (1 processo = 1 situação)",
      },
    );
    renderBasePanel(
      "powerbi",
      "Power BI · Dados Abertos PMU",
      "Complemento",
      "Consolidado municipal com possível defasagem — complementa o Portal.",
      data.powerbi,
      { valor_solicitacao: data.powerbi?.valor_solicitacao_total },
    );
  } catch (err) {
    alert(err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function carregarDashboardPagina() {
  await carregarDashboardFiltros();
  await carregarDashboardStats();
}

$d("#form-dash-filtros")?.addEventListener("submit", (e) => {
  e.preventDefault();
  carregarDashboardStats();
});

$d("#btn-dash-limpar")?.addEventListener("click", () => {
  const form = $d("#form-dash-filtros");
  if (form) form.reset();
  carregarDashboardStats();
});
