const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let empresas = [];
let observadores = [];
let pollTimer = null;
let licitacaoAtualId = null;

async function api(path, opts = {}) {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!r.ok) throw new Error((await r.text()) || r.statusText);
  return r.json();
}

function esc(t) {
  const e = document.createElement("span");
  e.textContent = t ?? "—";
  return e.innerHTML;
}

function setPagina(page) {
  document.body.classList.toggle(
    "consult-active",
    page === "consultar" || page === "compras-consultar" || page === "powerbi-consultar",
  );
  $$(".nav-btn").forEach((b) => b.classList.remove("active"));
  $$(".page").forEach((p) => p.classList.remove("active"));
  $(`.nav-btn[data-page="${page}"]`)?.classList.add("active");
  $(`#page-${page}`)?.classList.add("active");
}

$$(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    setPagina(btn.dataset.page);
    if (btn.dataset.page === "consultar") { carregarFiltros(); buscar(); }
    if (btn.dataset.page === "observadores") carregarObservadores();
  });
});

async function carregarEmpresas() {
  empresas = await api("/api/empresas");
  for (const sel of ["#coleta-empresa", "#filtro-empresa"]) {
    const el = $(sel);
    if (sel.includes("filtro")) el.innerHTML = '<option value="">Todos</option>';
    empresas.forEach((e) => {
      const o = document.createElement("option");
      o.value = e.codigo;
      o.textContent = `${e.codigo} — ${e.nome}`;
      el.appendChild(o);
    });
  }
}

async function carregarObservadoresLista() {
  observadores = await api("/api/observadores?ativos=true");
  const sel = $("#edit-observador");
  sel.innerHTML = '<option value="">— Nenhum —</option>';
  observadores.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = o.nome;
    sel.appendChild(opt);
  });
}

async function carregarObservadores() {
  await carregarObservadoresLista();
  const todos = await api("/api/observadores?ativos=false");
  const tb = $("#tabela-observadores");
  const ativos = todos.filter((o) => o.ativo);
  if (!ativos.length) {
    tb.innerHTML = '<tr><td colspan="4">Nenhum observador cadastrado.</td></tr>';
    return;
  }
  tb.innerHTML = ativos.map((o) => `
    <tr>
      <td>${esc(o.nome)}</td>
      <td>${esc(o.email)}</td>
      <td>${esc(o.telefone)}</td>
      <td><span class="badge ok">Ativo</span></td>
    </tr>`).join("");
}

$("#form-observador").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/api/observadores", {
      method: "POST",
      body: JSON.stringify({
        nome: $("#obs-nome").value,
        email: $("#obs-email").value || null,
        telefone: $("#obs-telefone").value || null,
      }),
    });
    e.target.reset();
    carregarObservadores();
  } catch (err) {
    alert(err.message);
  }
});

$("#form-coletar").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#btn-coletar");
  const logEl = $("#coleta-log");
  const resEl = $("#coleta-result");
  btn.disabled = true;
  logEl.classList.remove("hidden");
  resEl.classList.add("hidden");
  logEl.textContent = "Iniciando…";
  try {
    await api("/api/coletar", {
      method: "POST",
      body: JSON.stringify({
        empresa_codigo: $("#coleta-empresa").value,
        ano: parseInt($("#coleta-ano").value, 10),
      }),
    });
    pollTimer = setInterval(pollColeta, 1500);
  } catch (err) {
    logEl.textContent = err.message;
    btn.disabled = false;
  }
});

async function pollColeta() {
  const st = await api("/api/coletar/status");
  $("#coleta-log").textContent = (st.log || []).join("\n") || "Aguardando…";
  if (!st.running && st.resultado) {
    clearInterval(pollTimer);
    $("#btn-coletar").disabled = false;
    const resEl = $("#coleta-result");
    resEl.classList.remove("hidden");
    if (st.resultado.ok) {
      resEl.className = "result ok";
      resEl.textContent = `Concluído: ${st.resultado.total} registros (${st.resultado.novos} novos, ${st.resultado.atualizados} atualizados). Valor estimado e observador foram preservados nos existentes.`;
    } else {
      resEl.className = "result err";
      resEl.textContent = st.resultado.erro || "Erro na coleta";
    }
  }
}

function preencherSelect(sel, items, placeholder) {
  const atual = sel.value;
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    sel.appendChild(o);
  });
  if (atual && [...sel.options].some((o) => o.value === atual)) sel.value = atual;
}

async function carregarFiltros() {
  const [mods, sits] = await Promise.all([
    api("/api/modalidades"),
    api("/api/situacoes"),
  ]);
  preencherSelect($("#filtro-modalidade"), mods, "Todas");
  preencherSelect($("#filtro-situacao"), sits, "Todas");
}

function pillSituacao(sit) {
  if (!sit) return "—";
  const s = sit.toLowerCase();
  let cls = "pill-sit";
  if (s.includes("andamento")) cls += " andamento";
  else if (s.includes("conclu")) cls += " concluido";
  return `<span class="${cls}">${esc(sit)}</span>`;
}

$("#form-filtros").addEventListener("submit", (e) => { e.preventDefault(); buscar(); });
$("#btn-limpar").addEventListener("click", () => {
  $("#form-filtros").reset();
  buscar();
});

async function buscar() {
  const params = new URLSearchParams();
  if ($("#filtro-ano").value) params.set("ano", $("#filtro-ano").value);
  if ($("#filtro-empresa").value) params.set("empresa_codigo", $("#filtro-empresa").value);
  if ($("#filtro-modalidade").value) params.set("modalidade", $("#filtro-modalidade").value);
  if ($("#filtro-situacao").value) params.set("situacao", $("#filtro-situacao").value);
  if ($("#filtro-processo").value.trim()) params.set("processo", $("#filtro-processo").value.trim());
  if ($("#filtro-texto").value.trim()) params.set("texto", $("#filtro-texto").value.trim());
  params.set("limit", "500");

  const data = await api(`/api/licitacoes?${params}`);
  const filtros = [];
  if ($("#filtro-modalidade").value) filtros.push(`modalidade: ${$("#filtro-modalidade").value}`);
  if ($("#filtro-situacao").value) filtros.push(`situação: ${$("#filtro-situacao").value}`);
  if ($("#filtro-processo").value.trim()) filtros.push(`processo: ${$("#filtro-processo").value.trim()}`);
  $("#consulta-meta").textContent =
    `${data.total} registro(s)${filtros.length ? " · " + filtros.join(" · ") : ""}`;

  const tb = $("#tabela");
  if (!data.items.length) {
    tb.innerHTML = '<tr><td colspan="9">Nenhum registro encontrado.</td></tr>';
    return;
  }
  tb.innerHTML = data.items.map((r) => `
    <tr data-id="${r.id}" title="Clique para detalhes">
      <td class="col-proc"><strong>${esc(r.processo)}</strong></td>
      <td class="col-mod">${r.modalidade ? `<span class="pill-mod">${esc(r.modalidade)}</span>` : "—"}</td>
      <td class="col-org" title="${esc(r.empresa_nome)}">${esc(r.empresa_nome)}</td>
      <td class="col-ano">${r.ano}</td>
      <td class="col-dt">${esc(r.data_abertura)}</td>
      <td class="col-sit">${pillSituacao(r.situacao)}</td>
      <td class="col-val">${esc(r.valor_estimado)}</td>
      <td class="col-obs">${esc(r.observador_nome)}</td>
      <td class="col-desc" title="${esc(r.descricao_edital)}">${esc(r.descricao_edital)}</td>
    </tr>`).join("");

  tb.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => abrirDetalhe(tr.dataset.id));
  });
}

const CAMPOS = [
  ["processo", "Processo"], ["modalidade", "Modalidade"], ["empresa_nome", "Órgão"],
  ["ano", "Ano"], ["situacao", "Situação"], ["data_abertura", "Abertura"],
  ["habilitacao", "Habilitação"], ["julgamento", "Julgamento"], ["homologacao", "Homologação"],
  ["descricao_edital", "Descrição"], ["detalhe_url", "Link detalhe"],
];

async function abrirDetalhe(id) {
  licitacaoAtualId = id;
  await carregarObservadoresLista();
  const r = await api(`/api/licitacoes/${id}`);
  $("#modal-titulo").textContent = r.processo;
  $("#modal-info").innerHTML = CAMPOS.map(([k, label]) => {
    const v = r[k];
    if (k === "detalhe_url" && v) return `<dt>${label}</dt><dd><a href="${v}" target="_blank">${esc(v)}</a></dd>`;
    return `<dt>${label}</dt><dd>${esc(v)}</dd>`;
  }).join("");
  $("#edit-valor").value = r.valor_estimado || "";
  $("#edit-observador").value = r.observador_id || "";
  $("#modal").showModal();
}

$("#form-licitacao").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!licitacaoAtualId) return;
  try {
    const obsVal = $("#edit-observador").value;
    await api(`/api/licitacoes/${licitacaoAtualId}`, {
      method: "PATCH",
      body: JSON.stringify({
        valor_estimado: $("#edit-valor").value || null,
        observador_id: obsVal ? parseInt(obsVal, 10) : 0,
      }),
    });
    $("#modal").close();
    buscar();
  } catch (err) {
    alert(err.message);
  }
});

$("#modal-fechar").addEventListener("click", () => $("#modal").close());

carregarEmpresas().catch(console.error);
