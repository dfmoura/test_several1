/* Power BI / Dados Abertos PMU · Licitação → Contrato → Evento → Responsável */

let pbiDataset = "licitacoes";
let pbiAtualId = null;
let pbiPollTimer = null;
let pbiLastItems = [];

const PBI_DATASETS = {
  licitacoes: {
    label: "Licitações (processos)",
    endpoint: "licitacoes",
    cols: [
      "processo", "ano_processo", "situacao", "modalidade", "objeto",
      "solicitante", "dt_abertura", "dt_habilitacao", "dt_julgamento",
      "dt_homologacao", "valor_licitacao", "orgao_nome", "contratos_info",
    ],
    headers: [
      "PROCESSO", "ANOPROCESSO", "SITUACAO", "MODALIDADE", "OBJETO",
      "SOLICITANTE", "DTABERTURA", "DTHABILITACAO", "DTJULGAMENTO",
      "DTHOMOLOGACAO", "VALORLICITACAO", "EMPRESA", "CONTRATOS",
    ],
    colClass: {
      objeto: "col-desc",
      solicitante: "col-solic",
      orgao_nome: "col-empresa",
    },
    arvore: true,
  },
  contratos: {
    label: "Contratos (agrupados)",
    endpoint: "contratos-agrupados",
    cols: [
      "nr_contrato", "ano_contrato", "processo", "ano_processo",
      "fornecedor_nome", "orgao_nome", "ds_objeto_contrato",
      "qtd_eventos", "valor_total",
    ],
    headers: [
      "NRCONTRATO", "ANOCONTRATO", "PROCESSO", "ANOPROCESSO",
      "NMPESSOA", "EMPRESA", "DSOBJETOCONTRATO", "EVENTOS", "VR TOTAL",
    ],
    colClass: { ds_objeto_contrato: "col-desc" },
    grupo: true,
  },
  eventos: {
    label: "Eventos do contrato",
    endpoint: "contratos",
    cols: [
      "processo", "fornecedor_nome", "nr_contrato", "nr_aditivo", "nr_parcela",
      "dt_assinatura", "ds_objeto_contrato", "vr_inicial",
      "ano_contrato", "ano_processo", "orgao_nome",
    ],
    headers: [
      "PROCESSO", "NMPESSOA", "NRCONTRATO", "NRADITIVO", "NRPARCELA",
      "DTASSINATURA", "DSOBJETOCONTRATO", "VRINICIAL",
      "ANOCONTRATO", "ANOPROCESSO", "EMPRESA",
    ],
    colClass: { ds_objeto_contrato: "col-desc" },
  },
  gestores: {
    label: "Responsáveis (gestores e fiscais)",
    endpoint: "gestores",
    cols: [
      "nr_contrato", "ano_contrato", "fornecedor_nome", "pessoa_nome",
      "papel_descricao", "orgao_nome", "dt_inicio", "dt_fim",
      "dt_assinatura", "objeto_contrato",
    ],
    headers: [
      "NRCONTRATO", "ANOCONTRATO", "FORNECEDOR", "NMPESSOAPAPEL",
      "DSPAPEIS", "DSORGAO", "DTINICIO", "DTFIM", "DTASSINATURA", "OBJETOCONTRATO",
    ],
    colClass: { objeto_contrato: "col-desc", pessoa_nome: "col-pessoa" },
  },
};

function pbiEsc(t) {
  const e = document.createElement("span");
  e.textContent = t ?? "-";
  return e.innerHTML;
}

function pbiFmtData(v) {
  if (!v) return "-";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

function pbiFmtVal(row, col) {
  if (col === "contratos_info") {
    if (row.tem_contrato === false) return "Sem contrato";
    if (row.qtd_contratos > 0) {
      const ev = row.qtd_eventos > row.qtd_contratos ? ` (${row.qtd_eventos} evt.)` : "";
      return `${row.qtd_contratos}${ev}`;
    }
    return "-";
  }
  const v = row[col];
  if (v == null || v === "") return "-";
  if (col.startsWith("dt_")) return pbiFmtData(v);
  if (col === "objeto" || col === "ds_objeto_contrato" || col === "objeto_contrato" || col === "ds_habilitacao") {
    const s = String(v);
    return s.length > 55 ? `${s.slice(0, 55)}…` : s;
  }
  return v;
}

async function carregarPbiObservadores() {
  const obs = await api("/api/observadores?ativos=true");
  const sel = $("#edit-pbi-observador");
  if (!sel) return;
  sel.innerHTML = '<option value="">Nenhum</option>';
  obs.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = o.nome;
    sel.appendChild(opt);
  });
}

function pbiDatasetsSelecionados() {
  return [...document.querySelectorAll('#pbi-coleta-datasets input[name="dataset"]:checked')]
    .map((el) => el.value);
}

function pbiAnosSelecionados() {
  const raw = $("#pbi-coleta-anos")?.value || "";
  return raw.split(/[,;\s]+/).map((a) => parseInt(a.trim(), 10)).filter((a) => a >= 2000 && a <= 2100);
}

$("#form-pbi-coletar")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const datasets = pbiDatasetsSelecionados();
  const anos = pbiAnosSelecionados();
  if (!datasets.length) return alert("Selecione ao menos uma base.");
  if (datasets.some((d) => d !== "gestores") && !anos.length) {
    return alert("Informe ao menos um ano para licitações e/ou contratos.");
  }
  const btn = $("#btn-pbi-coletar");
  const logEl = $("#pbi-coleta-log");
  const resEl = $("#pbi-coleta-result");
  btn.disabled = true;
  logEl.classList.remove("hidden");
  resEl.classList.add("hidden");
  logEl.textContent = "Iniciando coleta…";
  try {
    await api("/api/powerbi/coletar", {
      method: "POST",
      body: JSON.stringify({ anos: anos.length ? anos : [new Date().getFullYear()], datasets }),
    });
    if (pbiPollTimer) clearInterval(pbiPollTimer);
    pbiPollTimer = setInterval(pollPbiColeta, 1200);
    pollPbiColeta();
  } catch (err) {
    logEl.textContent = err.message;
    btn.disabled = false;
  }
});

async function pollPbiColeta() {
  const st = await api("/api/powerbi/coletar/status");
  const logEl = $("#pbi-coleta-log");
  const resEl = $("#pbi-coleta-result");
  const btn = $("#btn-pbi-coletar");
  logEl.textContent = (st.log || []).join("\n") || "Aguardando…";
  logEl.scrollTop = logEl.scrollHeight;
  if (!st.running) {
    clearInterval(pbiPollTimer);
    pbiPollTimer = null;
    btn.disabled = false;
    if (st.resultado?.ok) {
      resEl.className = "result ok";
      resEl.textContent = "Coleta concluída com sucesso.";
      resEl.classList.remove("hidden");
      carregarPbiFiltros();
    } else if (st.resultado) {
      resEl.className = "result err";
      resEl.textContent = st.resultado.erro || "Coleta finalizada com erros.";
      resEl.classList.remove("hidden");
    }
  }
}

function setPbiDataset(ds) {
  pbiDataset = ds;
  document.querySelectorAll(".pbi-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.dataset === ds);
  });
  document.querySelectorAll(".pbi-filtros-dataset").forEach((el) => {
    el.hidden = el.dataset.dataset !== ds;
  });
  const cfg = PBI_DATASETS[ds];
  const obsForm = $("#form-pbi-obs");
  if (obsForm) obsForm.hidden = true;
  atualizarPbiTabelaHead();
  buscarPbi();
}

async function carregarPbiFiltros() {
  const [empLic, sitLic, modLic, empCon, orgGest, papGest, anosLic, anosCon] = await Promise.all([
    api("/api/powerbi/licitacoes/empresas").catch(() => []),
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
    sel.innerHTML = `<option value="">${allLabel}</option>`;
    items.forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
  };
  fill($("#pbi-filtro-lic-ano"), anosLic.map(String), "Todos");
  fill($("#pbi-filtro-lic-empresa"), empLic, "Todas");
  fill($("#pbi-filtro-lic-situacao"), sitLic, "Todas");
  fill($("#pbi-filtro-lic-modalidade"), modLic, "Todas");
  fill($("#pbi-filtro-con-ano"), anosCon.map(String), "Todos");
  fill($("#pbi-filtro-con-empresa"), empCon, "Todas");
  fill($("#pbi-filtro-ev-ano"), anosCon.map(String), "Todos");
  fill($("#pbi-filtro-ev-empresa"), empCon, "Todas");
  fill($("#pbi-filtro-gest-ano"), anosCon.map(String), "Todos");
  fill($("#pbi-filtro-gest-orgao"), orgGest, "Todos");
  fill($("#pbi-filtro-gest-papel"), papGest, "Todos");
}

function pbiQueryParams() {
  const p = new URLSearchParams();
  p.set("limit", "200");
  if (pbiDataset === "licitacoes") {
    const ano = $("#pbi-filtro-lic-ano")?.value;
    if (ano) p.set("ano_processo", ano);
    if ($("#pbi-filtro-lic-empresa")?.value) p.set("empresa", $("#pbi-filtro-lic-empresa").value);
    if ($("#pbi-filtro-lic-situacao")?.value) p.set("situacao", $("#pbi-filtro-lic-situacao").value);
    if ($("#pbi-filtro-lic-modalidade")?.value) p.set("modalidade", $("#pbi-filtro-lic-modalidade").value);
    if ($("#pbi-filtro-lic-processo")?.value) p.set("processo", $("#pbi-filtro-lic-processo").value);
    if ($("#pbi-filtro-lic-texto")?.value) p.set("texto", $("#pbi-filtro-lic-texto").value);
  } else if (pbiDataset === "contratos") {
    if ($("#pbi-filtro-con-ano")?.value) p.set("ano_contrato", $("#pbi-filtro-con-ano").value);
    if ($("#pbi-filtro-con-empresa")?.value) p.set("empresa", $("#pbi-filtro-con-empresa").value);
    if ($("#pbi-filtro-con-processo")?.value) p.set("processo", $("#pbi-filtro-con-processo").value);
    if ($("#pbi-filtro-con-numero")?.value) p.set("nr_contrato", $("#pbi-filtro-con-numero").value);
    if ($("#pbi-filtro-con-texto")?.value) p.set("texto", $("#pbi-filtro-con-texto").value);
  } else if (pbiDataset === "eventos") {
    if ($("#pbi-filtro-ev-ano")?.value) p.set("ano_contrato", $("#pbi-filtro-ev-ano").value);
    if ($("#pbi-filtro-ev-empresa")?.value) p.set("empresa", $("#pbi-filtro-ev-empresa").value);
    if ($("#pbi-filtro-ev-processo")?.value) p.set("processo", $("#pbi-filtro-ev-processo").value);
    if ($("#pbi-filtro-ev-numero")?.value) p.set("nr_contrato", $("#pbi-filtro-ev-numero").value);
    if ($("#pbi-filtro-ev-texto")?.value) p.set("texto", $("#pbi-filtro-ev-texto").value);
  } else {
    if ($("#pbi-filtro-gest-ano")?.value) p.set("ano_contrato", $("#pbi-filtro-gest-ano").value);
    if ($("#pbi-filtro-gest-orgao")?.value) p.set("ds_orgao", $("#pbi-filtro-gest-orgao").value);
    if ($("#pbi-filtro-gest-papel")?.value) p.set("ds_papeis", $("#pbi-filtro-gest-papel").value);
    if ($("#pbi-filtro-gest-numero")?.value) p.set("nr_contrato", $("#pbi-filtro-gest-numero").value);
    if ($("#pbi-filtro-gest-texto")?.value) p.set("texto", $("#pbi-filtro-gest-texto").value);
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
    pbiLastItems = data.items;
    meta.textContent = `${data.total.toLocaleString("pt-BR")} registro(s) · ${cfg.label}`;
    if (!data.items.length) {
      tbody.innerHTML = `<tr><td colspan="${cfg.headers.length}">Nenhum registro.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.items.map((row, idx) => {
      const cls = cfg.colClass || {};
      const cells = cfg.cols.map((c) => {
        const tdCls = cls[c] ? ` class="${cls[c]}"` : "";
        const title = row[c] && String(row[c]).length > 55 ? ` title="${pbiEsc(String(row[c]))}"` : "";
        return `<td${tdCls}${title}>${pbiEsc(pbiFmtVal(row, c))}</td>`;
      }).join("");
      const click = cfg.arvore || cfg.grupo ? `data-id="${row.id}" class="clickable"` : `data-idx="${idx}" class="clickable"`;
      return `<tr ${click}>${cells}</tr>`;
    }).join("");

    tbody.querySelectorAll("tr.clickable").forEach((tr) => {
      tr.addEventListener("click", () => {
        if (cfg.arvore) abrirPbiArvore(parseInt(tr.dataset.id, 10));
        else if (cfg.grupo) abrirPbiGrupo(pbiLastItems[parseInt(tr.dataset.idx, 10)]);
        else abrirPbiModal(parseInt(tr.dataset.id, 10));
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="${cfg.headers.length}">${pbiEsc(err.message)}</td></tr>`;
  }
}

const PBI_LIC_IDENT = [
  ["processo", "Nº processo"],
  ["ano_processo", "Ano"],
  ["modalidade", "Modalidade"],
  ["situacao", "Situação"],
  ["solicitante", "SOLICITANTE", { always: true }],
  ["orgao_nome", "Empresa"],
];

const PBI_LIC_CRONO = [
  ["dt_abertura", "Abertura"],
  ["dt_habilitacao", "Habilitação"],
  ["dt_julgamento", "Julgamento"],
  ["dt_homologacao", "Homologação"],
];

const PBI_LIC_VALORES = [
  ["valor_licitacao", "Valor licitação"],
];

const PBI_LIC_REFS = [
  ["chave", "Chave"],
  ["ds_habilitacao", "Doc. habilitação"],
];

const PBI_CTR_IDENT = [
  ["fornecedor_nome", "Fornecedor"],
  ["processo", "Processo", {
    always: true,
    fmt: (o) => (o.processo ? `${o.processo}-${o.ano_processo || ""}` : "-"),
  }],
  ["orgao_nome", "Empresa"],
  ["qtd_eventos", "Eventos", { always: true }],
  ["valor_total", "Valor total", { always: true }],
];

function pbiFmtCampo(k, v) {
  if (k.startsWith("dt_")) return pbiFmtData(v);
  return v;
}

function renderPbiPainel(campos, obj, fmtFn = pbiFmtCampo) {
  return campos
    .map((entry) => {
      const [k, label, opts = {}] = entry;
      const raw = obj[k];
      if (!opts.always && (raw == null || raw === "")) return "";
      let val;
      if (opts.fmt) val = opts.fmt(obj);
      else if (raw == null || raw === "") val = "-";
      else val = fmtFn(k, raw);
      return `<dt>${pbiEsc(label)}</dt><dd>${pbiEsc(val)}</dd>`;
    })
    .filter(Boolean)
    .join("");
}

function renderPbiPainelSection(title, campos, obj) {
  const rows = renderPbiPainel(campos, obj);
  if (!rows) return "";
  return `
    <section class="detail-panel">
      <h4 class="detail-panel-title">${pbiEsc(title)}</h4>
      <dl class="detail-grid detail-grid-panel">${rows}</dl>
    </section>`;
}

function renderPbiLicSections(lic) {
  const refs = renderPbiPainelSection("Referências", PBI_LIC_REFS, lic);
  return `
    <div class="compra-detail-sections">
      ${renderPbiPainelSection("Identificação", PBI_LIC_IDENT, lic)}
      ${renderPbiPainelSection("Cronograma", PBI_LIC_CRONO, lic)}
      ${renderPbiPainelSection("Valores", PBI_LIC_VALORES, lic)}
      ${refs}
    </div>`;
}

function renderPbiLicResumo(lic) {
  const sub = [lic.solicitante, lic.orgao_nome].filter(Boolean).join(" · ");
  return `
    <div class="compra-resumo pbi-lic-resumo">
      <div class="compra-resumo-main">
        <span class="compra-resumo-num">Processo ${pbiEsc(lic.processo)}/${lic.ano_processo}</span>
        ${lic.modalidade ? `<span class="pill-mod">${pbiEsc(lic.modalidade)}</span>` : ""}
        ${lic.situacao ? `<span class="badge ok">${pbiEsc(lic.situacao)}</span>` : ""}
      </div>
      ${sub ? `<div class="compra-resumo-sub">${pbiEsc(sub)}</div>` : ""}
    </div>`;
}

function renderDl(campos, obj, fmtFn = pbiFmtCampo) {
  return renderPbiPainel(campos.map(([k, label]) => [k, label]), obj, fmtFn);
}

function renderTabelaEventos(eventos) {
  if (!eventos?.length) return '<p class="muted">Nenhum evento registrado.</p>';
  const head = ["Aditivo", "Renovação", "Assinatura", "Valor", "Objeto"];
  const rows = eventos.map((ev) => `
    <tr>
      <td>${pbiEsc(ev.nr_aditivo)}</td>
      <td>${pbiEsc(ev.nr_parcela)}</td>
      <td>${pbiEsc(pbiFmtData(ev.dt_assinatura))}</td>
      <td>${pbiEsc(ev.vr_inicial)}</td>
      <td class="col-desc">${pbiEsc(ev.ds_objeto_contrato)}</td>
    </tr>`).join("");
  return `<table class="data-table pbi-subtable"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderTabelaResponsaveis(resps) {
  if (!resps?.length) return '<p class="muted">Nenhum responsável vinculado neste contrato.</p>';
  const head = ["Pessoa", "Papel", "Órgão", "Início", "Fim"];
  const rows = resps.map((r) => `
    <tr>
      <td>${pbiEsc(r.pessoa_nome)}</td>
      <td>${pbiEsc(r.papel_descricao)}</td>
      <td>${pbiEsc(r.orgao_nome)}</td>
      <td>${pbiEsc(pbiFmtData(r.dt_inicio))}</td>
      <td>${pbiEsc(pbiFmtData(r.dt_fim))}</td>
    </tr>`).join("");
  return `<table class="data-table pbi-subtable"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderArvore(arvore) {
  const lic = arvore.licitacao;
  let html = `
    <section class="pbi-arvore-sec">
      ${renderPbiLicResumo(lic)}
      ${renderPbiLicSections(lic)}
      <section class="detail-panel detail-panel-wide">
        <h4 class="detail-panel-title">Objeto</h4>
        <p class="compra-objeto-text${lic.objeto ? "" : " muted-empty"}">${pbiEsc(lic.objeto || "-")}</p>
      </section>
    </section>`;

  if (arvore.sem_contrato) {
    html += `<section class="pbi-arvore-sec pbi-sem-contrato"><p class="muted">Esta licitação ainda não possui contrato vinculado nos dados do Power BI.</p></section>`;
    return html;
  }

  arvore.contratos.forEach((ctr, i) => {
    const ident = renderPbiPainel(PBI_CTR_IDENT, ctr);
    html += `
      <section class="pbi-arvore-sec pbi-contrato-bloco">
        <h4 class="detail-panel-title">Contrato ${i + 1} · Nº ${pbiEsc(ctr.nr_contrato)}/${ctr.ano_contrato}</h4>
        <section class="detail-panel">
          <h4 class="detail-panel-title">Identificação</h4>
          <dl class="detail-grid detail-grid-panel">${ident}</dl>
        </section>
        <section class="detail-panel detail-panel-wide">
          <h4 class="detail-panel-title">Objeto do contrato</h4>
          <p class="compra-objeto-text${ctr.ds_objeto_contrato ? "" : " muted-empty"}">${pbiEsc(ctr.ds_objeto_contrato || "-")}</p>
        </section>
        <h5 class="pbi-subtitle">Eventos do contrato (aditivos / renovações)</h5>
        ${renderTabelaEventos(ctr.eventos)}
        <h5 class="pbi-subtitle">Responsáveis (gestores e fiscais)</h5>
        ${renderTabelaResponsaveis(ctr.responsaveis)}
      </section>`;
  });
  return html;
}

async function abrirPbiArvore(id) {
  pbiAtualId = id;
  const arvore = await api(`/api/powerbi/licitacoes/${id}/arvore`);
  $("#modal-pbi-titulo").textContent = `Processo ${arvore.licitacao.processo}/${arvore.licitacao.ano_processo} · ${arvore.licitacao.orgao_nome || ""}`;
  $("#modal-pbi-info").innerHTML = renderArvore(arvore);
  $("#modal-pbi-objeto-wrap")?.setAttribute("hidden", "");
  $("#form-pbi-obs")?.removeAttribute("hidden");
  await carregarPbiObservadores();
  $("#edit-pbi-observador").value = arvore.licitacao.observador_id || "";
  $("#modal-pbi").showModal();
}

function abrirPbiGrupo(grupo) {
  $("#modal-pbi-titulo").textContent = `Contrato ${grupo.nr_contrato}/${grupo.ano_contrato} · ${grupo.fornecedor_nome || ""}`;
  const ident = renderPbiPainel(PBI_CTR_IDENT, grupo);
  $("#modal-pbi-info").innerHTML = `
    <section class="detail-panel">
      <h4 class="detail-panel-title">Identificação</h4>
      <dl class="detail-grid detail-grid-panel">${ident}</dl>
    </section>
    <section class="detail-panel detail-panel-wide">
      <h4 class="detail-panel-title">Objeto do contrato</h4>
      <p class="compra-objeto-text${grupo.ds_objeto_contrato ? "" : " muted-empty"}">${pbiEsc(grupo.ds_objeto_contrato || "-")}</p>
    </section>
    <h5 class="pbi-subtitle">Eventos do contrato</h5>
    ${renderTabelaEventos(grupo.eventos)}
    <h5 class="pbi-subtitle">Responsáveis</h5>
    ${renderTabelaResponsaveis(grupo.responsaveis)}`;
  $("#modal-pbi-objeto-wrap")?.setAttribute("hidden", "");
  $("#form-pbi-obs")?.setAttribute("hidden", "");
  $("#modal-pbi").showModal();
}

async function abrirPbiModal(id) {
  pbiAtualId = id;
  const cfg = PBI_DATASETS[pbiDataset];
  const row = await api(`/api/powerbi/${cfg.endpoint}/${id}`);
  $("#modal-pbi-titulo").textContent = `${cfg.label} #${id}`;
  const campos = cfg.endpoint === "gestores"
    ? [
        ["nr_contrato", "NRCONTRATO"], ["ano_contrato", "ANOCONTRATO"],
        ["fornecedor_nome", "FORNECEDOR"], ["pessoa_nome", "NMPESSOAPAPEL"],
        ["papel_descricao", "DSPAPEIS"], ["orgao_nome", "DSORGAO"],
        ["dt_inicio", "DTINICIO"], ["dt_fim", "DTFIM"], ["dt_assinatura", "DTASSINATURA"],
      ]
    : [
        ["processo", "PROCESSO"], ["fornecedor_nome", "NMPESSOA"],
        ["nr_contrato", "NRCONTRATO"], ["nr_aditivo", "NRADITIVO"], ["nr_parcela", "NRPARCELA"],
        ["dt_assinatura", "DTASSINATURA"], ["vr_inicial", "VRINICIAL"],
        ["ano_contrato", "ANOCONTRATO"], ["ano_processo", "ANOPROCESSO"], ["orgao_nome", "EMPRESA"],
      ];
  const painel = renderPbiPainel(campos, row);
  $("#modal-pbi-info").innerHTML = painel
    ? `<section class="detail-panel"><dl class="detail-grid detail-grid-panel">${painel}</dl></section>`
    : '<p class="muted">Sem dados para exibir.</p>';
  const objEl = $("#modal-pbi-objeto");
  const objWrap = $("#modal-pbi-objeto-wrap");
  const obj = row.ds_objeto_contrato || row.objeto_contrato;
  if (objEl && objWrap) {
    objEl.textContent = obj || "-";
    objWrap.toggleAttribute("hidden", !obj);
  }
  $("#form-pbi-obs")?.removeAttribute("hidden");
  await carregarPbiObservadores();
  $("#edit-pbi-observador").value = row.observador_id || "";
  $("#modal-pbi").showModal();
}

$("#form-pbi-filtros")?.addEventListener("submit", (e) => {
  e.preventDefault();
  buscarPbi();
});

$("#btn-pbi-limpar")?.addEventListener("click", () => {
  document.querySelectorAll(".pbi-filtros-dataset:not([hidden]) input, .pbi-filtros-dataset:not([hidden]) select")
    .forEach((el) => { if (el.tagName === "SELECT") el.selectedIndex = 0; else el.value = ""; });
  buscarPbi();
});

$("#form-pbi-obs")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!pbiAtualId || pbiDataset !== "licitacoes") return;
  const obs = $("#edit-pbi-observador").value;
  try {
    await api(`/api/powerbi/licitacoes/${pbiAtualId}`, {
      method: "PATCH",
      body: JSON.stringify({ observador_id: obs ? parseInt(obs, 10) : 0 }),
    });
    $("#modal-pbi").close();
    buscarPbi();
  } catch (err) {
    alert(err.message);
  }
});

$("#modal-pbi-fechar")?.addEventListener("click", () => $("#modal-pbi").close());

document.querySelectorAll(".pbi-tab").forEach((btn) => {
  btn.addEventListener("click", () => setPbiDataset(btn.dataset.dataset));
});

function atualizarPbiTabelaHead() {
  const cfg = PBI_DATASETS[pbiDataset];
  const head = $("#pbi-tabela-head");
  if (!head) return;
  head.innerHTML = `<tr>${cfg.headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
}

$$(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.page === "powerbi-consultar") {
      atualizarPbiTabelaHead();
      carregarPbiFiltros();
      buscarPbi();
    }
  });
});

atualizarPbiTabelaHead();
