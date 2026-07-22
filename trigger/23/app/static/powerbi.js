/* ============================================================
   powerbi.js — consulta Power BI / Dados Abertos PMU
   Licitação → Contrato → Evento → Responsável
   ============================================================ */

let pbiDataset = "licitacoes";
let pbiAtualId = null;
let pbiLastItems = [];
let pbiFiltrosCarregados = false;
let pbiSortKey = null;
let pbiSortDir = "asc";

const PBI_DATASETS = {
  licitacoes: {
    label: "Licitações (processos)", endpoint: "licitacoes",
    cols: ["processo", "ano_processo", "situacao", "modalidade", "objeto", "solicitante",
      "dt_abertura", "dt_homologacao", "valor_licitacao", "orgao_nome", "contratos_info"],
    headers: ["PROCESSO", "ANO", "SITUAÇÃO", "MODALIDADE", "OBJETO", "SOLICITANTE",
      "ABERTURA", "HOMOLOG.", "VALOR", "EMPRESA", "CONTRATOS"],
    colClass: { objeto: "col-desc", ano_processo: "col-num", valor_licitacao: "col-num" },
    arvore: true,
  },
  contratos: {
    label: "Contratos (agrupados)", endpoint: "contratos-agrupados",
    cols: ["nr_contrato", "ano_contrato", "processo", "ano_processo", "fornecedor_nome",
      "orgao_nome", "ds_objeto_contrato", "qtd_eventos", "valor_total"],
    headers: ["Nº CONTRATO", "ANO", "PROCESSO", "ANO PROC.", "FORNECEDOR", "EMPRESA", "OBJETO", "EVENTOS", "VALOR"],
    colClass: {
      ds_objeto_contrato: "col-desc", ano_contrato: "col-num", ano_processo: "col-num",
      qtd_eventos: "col-num", valor_total: "col-num",
    },
    grupo: true,
  },
  eventos: {
    label: "Eventos do contrato", endpoint: "contratos",
    cols: ["processo", "fornecedor_nome", "nr_contrato", "nr_aditivo", "nr_parcela",
      "dt_assinatura", "ds_objeto_contrato", "vr_inicial", "ano_contrato", "orgao_nome"],
    headers: ["PROCESSO", "FORNECEDOR", "Nº CONTRATO", "ADITIVO", "PARCELA", "ASSINATURA", "OBJETO", "VALOR", "ANO", "EMPRESA"],
    colClass: { ds_objeto_contrato: "col-desc", vr_inicial: "col-num", ano_contrato: "col-num" },
  },
  gestores: {
    label: "Responsáveis (gestores e fiscais)", endpoint: "gestores",
    cols: ["nr_contrato", "ano_contrato", "fornecedor_nome", "pessoa_nome", "papel_descricao",
      "orgao_nome", "dt_inicio", "dt_fim", "objeto_contrato"],
    headers: ["Nº CONTRATO", "ANO", "FORNECEDOR", "PESSOA", "PAPEL", "ÓRGÃO", "INÍCIO", "FIM", "OBJETO"],
    colClass: { objeto_contrato: "col-desc", ano_contrato: "col-num" },
  },
};

function pbiFmtData(v) {
  if (!v) return "—";
  const m = String(v).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v);
}

function pbiFmtVal(row, col) {
  if (col === "contratos_info") {
    if (row.tem_contrato === false) return "Sem contrato";
    if (row.qtd_contratos > 0) {
      const ev = row.qtd_eventos > row.qtd_contratos ? ` (${row.qtd_eventos} evt.)` : "";
      return `${row.qtd_contratos}${ev}`;
    }
    return "—";
  }
  const v = row[col];
  if (v == null || v === "") return "—";
  if (col.startsWith("dt_")) return pbiFmtData(v);
  return v;
}

function pbiSortValue(row, col) {
  if (col === "contratos_info") {
    if (row.tem_contrato === false) return 0;
    return row.qtd_contratos || 0;
  }
  if (col.startsWith("dt_")) return row[col] || "";
  return row[col];
}

function pbiSetTabelaHead() {
  const cfg = PBI_DATASETS[pbiDataset];
  const head = $("#pbi-tabela-head");
  if (!head) return;
  head.innerHTML = `<tr>${cfg.cols.map((c, i) =>
    `<th class="sortable" data-sort="${c}">${cfg.headers[i]}</th>`
  ).join("")}</tr>`;
  markSortableHeaders(head, pbiSortKey ? { key: pbiSortKey, dir: pbiSortDir } : null);
}

function setPbiDataset(ds) {
  pbiDataset = ds;
  pbiSortKey = null;
  pbiSortDir = "asc";
  clearTableSortState($("#pbi-tabela-head"));
  $$("#pbi-tabs .tab").forEach((b) => b.classList.toggle("active", b.dataset.dataset === ds));
  $$(".pbi-filtros-dataset").forEach((el) => { el.hidden = el.dataset.dataset !== ds; });
  pbiSetTabelaHead();
  buscarPbi();
}

async function carregarPbiFiltros() {
  const [empLic, solLic, sitLic, modLic, empCon, orgGest, papGest, anosLic, anosCon] = await Promise.all([
    api("/api/powerbi/licitacoes/empresas").catch(() => []),
    api("/api/powerbi/licitacoes/solicitantes").catch(() => []),
    api("/api/powerbi/licitacoes/situacoes").catch(() => []),
    api("/api/powerbi/licitacoes/modalidades").catch(() => []),
    api("/api/powerbi/contratos/empresas").catch(() => []),
    api("/api/powerbi/gestores/orgaos").catch(() => []),
    api("/api/powerbi/gestores/papeis").catch(() => []),
    api("/api/powerbi/licitacoes/anos").catch(() => []),
    api("/api/powerbi/contratos/anos").catch(() => []),
  ]);
  const fill = (sel, items, allLabel) => {
    if (!sel) return;
    sel.innerHTML = `<option value="">${allLabel}</option>` +
      items.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  };
  fill($("#pbi-lic-filtro-ano"), anosLic.map(String), "Todos");
  fill($("#pbi-filtro-lic-empresa"), empLic, "Todas");
  fill($("#pbi-filtro-lic-solicitante"), solLic, "Todos");
  fill($("#pbi-filtro-lic-situacao"), sitLic, "Todas");
  multiSelectOf("#pbi-filtro-lic-modalidade")?.setOptions(
    (modLic || []).map((v) => ({ value: v, label: v })),
  );
  fill($("#pbi-filtro-con-ano"), anosCon.map(String), "Todos");
  fill($("#pbi-filtro-con-empresa"), empCon, "Todas");
  fill($("#pbi-filtro-ev-ano"), anosCon.map(String), "Todos");
  fill($("#pbi-filtro-ev-empresa"), empCon, "Todas");
  fill($("#pbi-filtro-gest-ano"), anosCon.map(String), "Todos");
  fill($("#pbi-filtro-gest-orgao"), orgGest, "Todos");
  fill($("#pbi-filtro-gest-papel"), papGest, "Todos");
  pbiFiltrosCarregados = true;
}

function pbiQueryParams() {
  const p = new URLSearchParams();
  p.set("limit", "200");
  const g = (id) => $(id)?.value;
  if (pbiDataset === "licitacoes") {
    appendPeriodoParams(p, "pbi-lic");
    const fallback = $("#pbi-lic-filtro-fallback-homologacao");
    if (fallback) p.set("fallback_homologacao", fallback.checked ? "true" : "false");
    if (g("#pbi-filtro-lic-empresa")) p.set("empresa", g("#pbi-filtro-lic-empresa"));
    if (g("#pbi-filtro-lic-solicitante")) p.set("solicitante", g("#pbi-filtro-lic-solicitante"));
    if (g("#pbi-filtro-lic-situacao")) p.set("situacao", g("#pbi-filtro-lic-situacao"));
    appendQueryAll(p, "modalidade", multiSelectOf("#pbi-filtro-lic-modalidade")?.getValues());
    if (g("#pbi-filtro-lic-processo")) p.set("processo", g("#pbi-filtro-lic-processo"));
    if (g("#pbi-filtro-lic-texto")) p.set("texto", g("#pbi-filtro-lic-texto"));
  } else if (pbiDataset === "contratos") {
    if (g("#pbi-filtro-con-ano")) p.set("ano_contrato", g("#pbi-filtro-con-ano"));
    if (g("#pbi-filtro-con-empresa")) p.set("empresa", g("#pbi-filtro-con-empresa"));
    if (g("#pbi-filtro-con-processo")) p.set("processo", g("#pbi-filtro-con-processo"));
    if (g("#pbi-filtro-con-numero")) p.set("nr_contrato", g("#pbi-filtro-con-numero"));
    if (g("#pbi-filtro-con-texto")) p.set("texto", g("#pbi-filtro-con-texto"));
  } else if (pbiDataset === "eventos") {
    if (g("#pbi-filtro-ev-ano")) p.set("ano_contrato", g("#pbi-filtro-ev-ano"));
    if (g("#pbi-filtro-ev-empresa")) p.set("empresa", g("#pbi-filtro-ev-empresa"));
    if (g("#pbi-filtro-ev-processo")) p.set("processo", g("#pbi-filtro-ev-processo"));
    if (g("#pbi-filtro-ev-numero")) p.set("nr_contrato", g("#pbi-filtro-ev-numero"));
    if (g("#pbi-filtro-ev-texto")) p.set("texto", g("#pbi-filtro-ev-texto"));
  } else {
    if (g("#pbi-filtro-gest-ano")) p.set("ano_contrato", g("#pbi-filtro-gest-ano"));
    if (g("#pbi-filtro-gest-orgao")) p.set("ds_orgao", g("#pbi-filtro-gest-orgao"));
    if (g("#pbi-filtro-gest-papel")) p.set("ds_papeis", g("#pbi-filtro-gest-papel"));
    if (g("#pbi-filtro-gest-numero")) p.set("nr_contrato", g("#pbi-filtro-gest-numero"));
    if (g("#pbi-filtro-gest-texto")) p.set("texto", g("#pbi-filtro-gest-texto"));
  }
  return p;
}

async function buscarPbi() {
  const cfg = PBI_DATASETS[pbiDataset];
  const meta = $("#pbi-consulta-meta");
  const tbody = $("#pbi-tabela");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="${cfg.headers.length}">Carregando…</td></tr>`;
  try {
    const data = await api(`/api/powerbi/${cfg.endpoint}?${pbiQueryParams()}`);
    pbiLastItems = data.items || [];
    const periodo = pbiDataset === "licitacoes" ? resumoFiltroPeriodo("pbi-lic") : "";
    const fallback = pbiDataset === "licitacoes" && $("#pbi-lic-filtro-fallback-homologacao")?.checked
      ? " · fallback homologação"
      : "";
    meta.textContent = `${fmtNum(data.total)} registro(s) · ${cfg.label}${periodo ? ` · ${periodo}` : ""}${fallback}`;
    renderPbiTabela();
  } catch (err) {
    pbiLastItems = [];
    tbody.innerHTML = `<tr><td colspan="${cfg.headers.length}">${esc(err.message)}</td></tr>`;
  }
}

function renderPbiTabela() {
  const cfg = PBI_DATASETS[pbiDataset];
  const tbody = $("#pbi-tabela");
  const head = $("#pbi-tabela-head");
  if (!tbody) return;
  if (!pbiLastItems.length) {
    tbody.innerHTML = `<tr><td colspan="${cfg.headers.length}">Nenhum registro.</td></tr>`;
    return;
  }
  let items = pbiLastItems;
  if (pbiSortKey) {
    items = sortItems(pbiLastItems, (row) => pbiSortValue(row, pbiSortKey), pbiSortDir);
  }
  markSortableHeaders(head, pbiSortKey ? { key: pbiSortKey, dir: pbiSortDir } : null);
  const cls = cfg.colClass || {};
  tbody.innerHTML = items.map((row, idx) => {
    const cells = cfg.cols.map((c) => {
      const display = pbiFmtVal(row, c);
      const raw = c === "contratos_info" ? display : (row[c] != null && row[c] !== "" ? row[c] : display);
      const tip = c.startsWith("dt_") ? display : String(raw);
      return tdEllipsis(display, { cls: cls[c], title: tip });
    }).join("");
    if (cfg.arvore) return `<tr class="clickable" data-id="${row.id}">${cells}</tr>`;
    if (cfg.grupo) return `<tr class="clickable" data-idx="${idx}">${cells}</tr>`;
    return `<tr class="clickable" data-idx="${idx}">${cells}</tr>`;
  }).join("");
  tbody.querySelectorAll("tr.clickable").forEach((tr) => {
    tr.addEventListener("click", () => {
      if (cfg.arvore) abrirPbiArvore(parseInt(tr.dataset.id, 10));
      else if (cfg.grupo) abrirPbiGrupo(items[parseInt(tr.dataset.idx, 10)]);
      else abrirPbiModalFromRow(items[parseInt(tr.dataset.idx, 10)]);
    });
  });
}

function abrirPbiModalFromRow(row) {
  if (!row) return;
  const idx = pbiLastItems.indexOf(row);
  if (idx >= 0) abrirPbiModal(idx);
  else {
    const prev = pbiLastItems;
    pbiLastItems = [row];
    abrirPbiModal(0);
    pbiLastItems = prev;
  }
}

const PBI_LIC_IDENT = [
  ["processo", "Nº processo"], ["ano_processo", "Ano"], ["modalidade", "Modalidade"],
  ["situacao", "Situação"], ["solicitante", "Solicitante"], ["orgao_nome", "Empresa"],
];
const PBI_LIC_CRONO = [["dt_abertura", "Abertura"], ["dt_habilitacao", "Habilitação"], ["dt_julgamento", "Julgamento"], ["dt_homologacao", "Homologação"]];
const PBI_CTR_IDENT = [
  ["fornecedor_nome", "Fornecedor"], ["orgao_nome", "Empresa"],
  ["qtd_eventos", "Eventos"], ["valor_total", "Valor total"],
];

function pbiPainel(campos, obj) {
  return campos.map(([k, label]) => {
    let raw = obj[k];
    if (raw == null || raw === "") return "";
    if (k.startsWith("dt_")) raw = pbiFmtData(raw);
    return `<dt>${esc(label)}</dt><dd>${esc(raw)}</dd>`;
  }).filter(Boolean).join("");
}

function pbiPainelSection(title, campos, obj) {
  const rows = pbiPainel(campos, obj);
  if (!rows) return "";
  return `<section class="detail-panel"><h4 class="detail-panel-title">${esc(title)}</h4><dl class="detail-grid">${rows}</dl></section>`;
}

function pbiTabelaEventos(eventos) {
  if (!eventos?.length) return '<p class="muted small">Nenhum evento registrado.</p>';
  return `<table class="data-table pbi-subtable"><thead><tr><th>Aditivo</th><th>Parcela</th><th>Assinatura</th><th>Valor</th><th>Objeto</th></tr></thead>
    <tbody>${eventos.map((ev) => `<tr>
      <td>${esc(ev.nr_aditivo)}</td><td>${esc(ev.nr_parcela)}</td><td>${esc(pbiFmtData(ev.dt_assinatura))}</td>
      <td>${esc(ev.vr_inicial)}</td><td class="col-desc">${esc(ev.ds_objeto_contrato)}</td></tr>`).join("")}</tbody></table>`;
}

function pbiTabelaResponsaveis(resps) {
  if (!resps?.length) return '<p class="muted small">Nenhum responsável vinculado.</p>';
  return `<table class="data-table pbi-subtable"><thead><tr><th>Pessoa</th><th>Papel</th><th>Órgão</th><th>Início</th><th>Fim</th></tr></thead>
    <tbody>${resps.map((r) => `<tr>
      <td>${esc(r.pessoa_nome)}</td><td>${esc(r.papel_descricao)}</td><td>${esc(r.orgao_nome)}</td>
      <td>${esc(pbiFmtData(r.dt_inicio))}</td><td>${esc(pbiFmtData(r.dt_fim))}</td></tr>`).join("")}</tbody></table>`;
}

function pbiRenderArvore(arvore) {
  const lic = arvore.licitacao;
  const sub = [lic.solicitante, lic.orgao_nome].filter(Boolean).join(" · ");
  let html = `<section class="pbi-arvore-sec">
    <div class="compra-resumo">
      <div class="compra-resumo-main">
        <span class="compra-resumo-num">Processo ${esc(lic.processo)}/${lic.ano_processo}</span>
        ${lic.modalidade ? `<span class="pill-mod">${esc(lic.modalidade)}</span>` : ""}
        ${lic.situacao ? `<span class="badge ok">${esc(lic.situacao)}</span>` : ""}
      </div>
      ${sub ? `<div class="compra-resumo-sub">${esc(sub)}</div>` : ""}
    </div>
    <div class="detail-sections">${pbiPainelSection("Identificação", PBI_LIC_IDENT, lic)}${pbiPainelSection("Cronograma", PBI_LIC_CRONO, lic)}</div>
    <section class="detail-panel detail-panel-wide"><h4 class="detail-panel-title">Objeto</h4><p class="objeto-text${lic.objeto ? "" : " muted-empty"}">${esc(lic.objeto || "-")}</p></section>
  </section>`;

  if (arvore.sem_contrato) {
    html += '<p class="muted small">Esta licitação ainda não possui contrato vinculado nos dados do Power BI.</p>';
    return html;
  }
  arvore.contratos.forEach((ctr, i) => {
    html += `<section class="pbi-contrato-bloco">
      <h4 class="detail-panel-title">Contrato ${i + 1} · Nº ${esc(ctr.nr_contrato)}/${ctr.ano_contrato}</h4>
      <section class="detail-panel"><h4 class="detail-panel-title">Identificação</h4><dl class="detail-grid">${pbiPainel(PBI_CTR_IDENT, ctr)}</dl></section>
      <section class="detail-panel detail-panel-wide"><h4 class="detail-panel-title">Objeto do contrato</h4><p class="objeto-text${ctr.ds_objeto_contrato ? "" : " muted-empty"}">${esc(ctr.ds_objeto_contrato || "-")}</p></section>
      <p class="pbi-subtitle">Eventos (aditivos / renovações)</p>${pbiTabelaEventos(ctr.eventos)}
      <p class="pbi-subtitle">Responsáveis (gestores e fiscais)</p>${pbiTabelaResponsaveis(ctr.responsaveis)}
    </section>`;
  });
  return html;
}

async function carregarPbiObservadores() {
  const obs = await api("/api/observadores?ativos=true").catch(() => []);
  const sel = $("#edit-pbi-observador");
  if (sel) sel.innerHTML = '<option value="">Nenhum</option>' + obs.map((o) => `<option value="${o.id}">${esc(o.nome)}</option>`).join("");
}

async function abrirPbiArvore(id) {
  pbiAtualId = id;
  const arvore = await api(`/api/powerbi/licitacoes/${id}/arvore`);
  $("#modal-pbi-titulo").textContent = `Processo ${arvore.licitacao.processo}/${arvore.licitacao.ano_processo} · ${arvore.licitacao.orgao_nome || ""}`;
  $("#modal-pbi-info").innerHTML = pbiRenderArvore(arvore);
  $("#modal-pbi-objeto-wrap").hidden = true;
  $("#form-pbi-obs").hidden = false;
  await carregarPbiObservadores();
  $("#edit-pbi-observador").value = arvore.licitacao.observador_id || "";
  $("#modal-pbi").showModal();
}

function abrirPbiGrupo(grupo) {
  $("#modal-pbi-titulo").textContent = `Contrato ${grupo.nr_contrato}/${grupo.ano_contrato} · ${grupo.fornecedor_nome || ""}`;
  $("#modal-pbi-info").innerHTML = `
    <section class="detail-panel"><h4 class="detail-panel-title">Identificação</h4><dl class="detail-grid">${pbiPainel(PBI_CTR_IDENT, grupo)}</dl></section>
    <section class="detail-panel detail-panel-wide"><h4 class="detail-panel-title">Objeto do contrato</h4><p class="objeto-text${grupo.ds_objeto_contrato ? "" : " muted-empty"}">${esc(grupo.ds_objeto_contrato || "-")}</p></section>
    <p class="pbi-subtitle">Eventos</p>${pbiTabelaEventos(grupo.eventos)}
    <p class="pbi-subtitle">Responsáveis</p>${pbiTabelaResponsaveis(grupo.responsaveis)}`;
  $("#modal-pbi-objeto-wrap").hidden = true;
  $("#form-pbi-obs").hidden = true;
  $("#modal-pbi").showModal();
}

function abrirPbiModalFromRow(row) {
  if (!row) return;
  const cfg = PBI_DATASETS[pbiDataset];
  $("#modal-pbi-titulo").textContent = `${cfg.label}`;
  const campos = cfg.endpoint === "gestores"
    ? [["nr_contrato", "Nº contrato"], ["ano_contrato", "Ano"], ["fornecedor_nome", "Fornecedor"],
       ["pessoa_nome", "Pessoa"], ["papel_descricao", "Papel"], ["orgao_nome", "Órgão"],
       ["dt_inicio", "Início"], ["dt_fim", "Fim"], ["dt_assinatura", "Assinatura"]]
    : [["processo", "Processo"], ["fornecedor_nome", "Fornecedor"], ["nr_contrato", "Nº contrato"],
       ["nr_aditivo", "Aditivo"], ["nr_parcela", "Parcela"], ["dt_assinatura", "Assinatura"],
       ["vr_inicial", "Valor"], ["ano_contrato", "Ano contrato"], ["orgao_nome", "Empresa"]];
  const painel = pbiPainel(campos, row);
  $("#modal-pbi-info").innerHTML = painel
    ? `<section class="detail-panel"><dl class="detail-grid">${painel}</dl></section>`
    : '<p class="muted small">Sem dados para exibir.</p>';
  const obj = row.ds_objeto_contrato || row.objeto_contrato;
  $("#modal-pbi-objeto").textContent = obj || "-";
  $("#modal-pbi-objeto").classList.toggle("muted-empty", !obj);
  $("#modal-pbi-objeto-wrap").hidden = !obj;
  $("#form-pbi-obs").hidden = true;
  $("#modal-pbi").showModal();
}

function abrirPbiModal(idx) {
  abrirPbiModalFromRow(pbiLastItems[idx]);
}

$$("#pbi-tabs .tab").forEach((b) => b.addEventListener("click", () => setPbiDataset(b.dataset.dataset)));
$("#form-pbi-filtros")?.addEventListener("submit", (e) => { e.preventDefault(); buscarPbi(); });
$("#btn-pbi-limpar")?.addEventListener("click", () => {
  $$(".pbi-filtros-dataset:not([hidden]) input, .pbi-filtros-dataset:not([hidden]) select")
    .forEach((el) => {
      if (el.type === "checkbox") {
        el.checked = el.id === "pbi-lic-filtro-fallback-homologacao";
        return;
      }
      if (el.tagName === "SELECT") el.selectedIndex = 0;
      else el.value = "";
    });
  $$(".pbi-filtros-dataset:not([hidden]) .ms").forEach((el) => {
    multiSelectOf(el)?.clear({ silent: true });
  });
  if (pbiDataset === "licitacoes") limparFiltroPeriodo("pbi-lic");
  buscarPbi();
});
wireSortableHeaders($("#pbi-tabela-head"), (key, dir) => {
  pbiSortKey = key;
  pbiSortDir = dir;
  renderPbiTabela();
});
$("#modal-pbi-fechar")?.addEventListener("click", () => $("#modal-pbi").close());
$("#form-pbi-obs")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!pbiAtualId || pbiDataset !== "licitacoes") return;
  const obs = $("#edit-pbi-observador").value;
  try {
    await api(`/api/powerbi/licitacoes/${pbiAtualId}`, { method: "PATCH", body: JSON.stringify({ observador_id: obs ? parseInt(obs, 10) : 0 }) });
    $("#modal-pbi").close();
    buscarPbi();
  } catch (err) { alert(err.message); }
});

let pbiIniciado = false;
async function carregarPowerBiPagina() {
  iniciarFiltroPeriodo("pbi-lic");
  pbiSetTabelaHead();
  if (!pbiFiltrosCarregados) await carregarPbiFiltros();
  if (!pbiIniciado) { pbiIniciado = true; buscarPbi(); }
}

registrarPagina("powerbi", carregarPowerBiPagina);
