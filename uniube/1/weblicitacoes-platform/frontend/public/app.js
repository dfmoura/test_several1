const API = "/api/v1";
const PAGE_SIZE = 20;

let offset = 0;
let total = 0;
let currentFilters = {};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("pt-BR");
}

function esc(text) {
  const el = document.createElement("span");
  el.textContent = text ?? "—";
  return el.innerHTML;
}

function setupTabs() {
  $$(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".tab").forEach((b) => b.classList.remove("active"));
      $$(".panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      $(`#tab-${btn.dataset.tab}`).classList.add("active");
      if (btn.dataset.tab === "painel") loadStats();
      if (btn.dataset.tab === "sync") loadSyncJobs();
    });
  });
}

async function loadEmpresas() {
  const empresas = await api("/empresas");
  const select = $("#empresa-select");
  empresas.forEach((e) => {
    const opt = document.createElement("option");
    opt.value = e.codigo;
    opt.textContent = `${e.codigo} — ${e.nome}`;
    select.appendChild(opt);
  });
}

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, v);
  });
  return qs.toString();
}

async function searchLicitacoes() {
  const form = new FormData($("#filtros"));
  currentFilters = {
    ano: form.get("ano") || undefined,
    empresa_codigo: form.get("empresa_codigo") || undefined,
    situacao: form.get("situacao") || undefined,
    modalidade: form.get("modalidade") || undefined,
    texto: form.get("texto") || undefined,
    com_detalhe: form.get("com_detalhe") || undefined,
    limit: PAGE_SIZE,
    offset,
  };
  const data = await api(`/licitacoes?${buildQuery(currentFilters)}`);
  total = data.total;
  renderResults(data.items);
  updatePagination();
}

function renderResults(items) {
  const meta = $("#resultado-meta");
  meta.textContent = `${total} licitação(ões) encontrada(s)`;
  const container = $("#resultados");
  if (!items.length) {
    container.innerHTML = `<div class="card">Nenhum resultado. Execute uma sincronização primeiro.</div>`;
    return;
  }
  container.innerHTML = items
    .map(
      (item) => `
      <article class="result-card" data-id="${item.id}">
        <div class="badges">
          <span class="badge">${esc(item.processo)}</span>
          <span class="badge">${esc(item.empresa_nome)}</span>
          <span class="badge ${item.detalhe_coletado ? "ok" : "warn"}">
            ${item.detalhe_coletado ? "Com detalhe" : "Sem detalhe"}
          </span>
        </div>
        <h3>${esc(item.descricao_edital || item.objeto || "Sem descrição")}</h3>
        <p><strong>Situação:</strong> ${esc(item.situacao)} · <strong>Abertura:</strong> ${fmtDate(item.data_abertura)}</p>
      </article>`
    )
    .join("");

  $$(".result-card").forEach((card) => {
    card.addEventListener("click", () => openDetalhe(card.dataset.id));
  });
}

function updatePagination() {
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  $("#page-info").textContent = `Página ${page} de ${pages}`;
  $("#prev-page").disabled = offset <= 0;
  $("#next-page").disabled = offset + PAGE_SIZE >= total;
}

const ALL_FIELDS = [
  ["empresa_codigo", "Código órgão"],
  ["empresa_nome", "Órgão"],
  ["ano", "Ano"],
  ["processo", "Processo"],
  ["processo_numero", "Processo (detalhe)"],
  ["modalidade", "Modalidade"],
  ["descricao_edital", "Descrição do edital"],
  ["objeto", "Objeto"],
  ["data_abertura", "Data abertura"],
  ["data_habilitacao", "Data habilitação"],
  ["data_julgamento", "Data julgamento"],
  ["data_homologacao", "Data homologação"],
  ["situacao", "Situação"],
  ["chave", "Chave"],
  ["descricao_habilitacao", "Descrição habilitação"],
  ["solicitante", "Solicitante"],
  ["valor_licitacao", "Valor licitação"],
  ["valor_licitacao_numerico", "Valor (numérico)"],
  ["local_abertura", "Local abertura"],
  ["data_visita_tecnica", "Data visita técnica"],
  ["responsavel_visita_tecnica", "Responsável visita técnica"],
  ["local_saida_visita_tecnica", "Local saída visita técnica"],
  ["observacoes", "Observações"],
  ["link_pncp", "Link PNCP"],
  ["link_compras_gov", "Link Compras.gov"],
  ["detalhe_url", "URL detalhe"],
  ["detalhe_coletado", "Detalhe coletado"],
  ["fonte", "Fonte"],
  ["capturado_em", "Capturado em"],
  ["atualizado_em", "Atualizado em"],
];

async function openDetalhe(id) {
  const item = await api(`/licitacoes/${id}`);
  $("#detalhe-titulo").textContent = item.processo || "Licitação";
  const fields = ALL_FIELDS.map(([key, label]) => {
    let value = item[key];
    if (key.includes("data_") || key.endsWith("_em")) value = fmtDate(value);
    if (typeof value === "boolean") value = value ? "Sim" : "Não";
    if (key.startsWith("link_") && value) {
      return `<dt>${esc(label)}</dt><dd><a href="${esc(value)}" target="_blank" rel="noopener">${esc(value)}</a></dd>`;
    }
    return `<dt>${esc(label)}</dt><dd>${esc(value == null ? null : String(value))}</dd>`;
  }).join("");

  const arquivos =
    item.arquivos?.length
      ? `<div class="arquivos"><strong>Arquivos (${item.arquivos.length})</strong><ul>${item.arquivos
          .map((a) => {
            const nome = esc(a.nome_arquivo);
            return a.url_download
              ? `<li><a href="${esc(a.url_download)}" target="_blank" rel="noopener">${nome}</a></li>`
              : `<li>${nome}</li>`;
          })
          .join("")}</ul></div>`
      : `<div class="arquivos"><strong>Arquivos</strong><p>—</p></div>`;

  $("#detalhe-conteudo").innerHTML = `<dl class="field-grid">${fields}</dl>${arquivos}`;
  $("#detalhe-modal").showModal();
}

async function loadStats() {
  const stats = await api("/stats");
  $("#stats").innerHTML = `
    <div class="stat-card"><span>Total</span><strong>${stats.total}</strong></div>
    <div class="stat-card"><span>Com detalhe</span><strong>${stats.com_detalhe}</strong></div>
    <div class="stat-card"><span>Sem detalhe</span><strong>${stats.sem_detalhe}</strong></div>
    <div class="stat-card"><span>Anos</span><strong>${Object.keys(stats.por_ano).join(", ") || "—"}</strong></div>
  `;
}

async function loadSyncJobs() {
  const jobs = await api("/sync?limit=15");
  const el = $("#sync-jobs");
  if (!jobs.length) {
    el.innerHTML = "<p>Nenhum job ainda.</p>";
    return;
  }
  el.innerHTML = jobs
    .map(
      (j) => `
      <div class="job-row">
        <div><span class="status ${j.status}">${j.status}</span> · Job #${j.id}</div>
        <div>Anos: ${esc(j.anos)} · Órgãos: ${esc(j.empresas || "todos")}</div>
        <div>Coletados: ${j.total_coletados} (novos ${j.novos}, atualizados ${j.atualizados}, detalhes ${j.detalhes_coletados})</div>
        <div>${esc(j.mensagem || "")}</div>
      </div>`
    )
    .join("");
}

function setupForms() {
  $("#filtros").addEventListener("submit", (e) => {
    e.preventDefault();
    offset = 0;
    searchLicitacoes().catch(alertError);
  });

  $("#limpar-filtros").addEventListener("click", () => {
    $("#filtros").reset();
    offset = 0;
    searchLicitacoes().catch(alertError);
  });

  $("#prev-page").addEventListener("click", () => {
    offset = Math.max(0, offset - PAGE_SIZE);
    searchLicitacoes().catch(alertError);
  });

  $("#next-page").addEventListener("click", () => {
    offset += PAGE_SIZE;
    searchLicitacoes().catch(alertError);
  });

  $("#sync-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const anos = form
      .get("anos")
      .split(",")
      .map((a) => parseInt(a.trim(), 10))
      .filter(Boolean);
    const empresasRaw = (form.get("empresas") || "").trim();
    const empresas = empresasRaw
      ? empresasRaw.split(",").map((c) => c.trim()).filter(Boolean)
      : null;
    await api("/sync", {
      method: "POST",
      body: JSON.stringify({
        anos,
        empresas,
        coletar_detalhes: form.get("coletar_detalhes") === "on",
      }),
    });
    alert("Sincronização enfileirada. O worker processará em breve.");
    loadSyncJobs();
  });

  $("#fechar-modal").addEventListener("click", () => $("#detalhe-modal").close());
}

function alertError(err) {
  alert(`Erro: ${err.message}`);
}

async function init() {
  setupTabs();
  setupForms();
  await loadEmpresas();
  await searchLicitacoes();
  setInterval(() => {
    if ($("#tab-sync").classList.contains("active")) loadSyncJobs();
  }, 8000);
}

init().catch(alertError);
