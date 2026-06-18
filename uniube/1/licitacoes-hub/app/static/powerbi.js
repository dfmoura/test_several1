/* Power BI / Dados Abertos PMU — removível */

let pbiDataset = "licitacoes";
let pbiAtualId = null;
let pbiPollTimer = null;

const PBI_DATASETS = {
  licitacoes: {
    label: "Licitações",
    cols: ["processo", "modalidade", "empresa", "ano_processo", "situacao", "valor_licitacao", "observador_nome", "objeto"],
    headers: ["Processo", "Modalidade", "Empresa", "Ano", "Situação", "Valor", "Observador", "Objeto"],
  },
  contratos: {
    label: "Contratos",
    cols: ["nr_contrato", "processo", "empresa", "ano_contrato", "nm_pessoa", "vr_inicial", "observador_nome", "ds_objeto_contrato"],
    headers: ["Nº contrato", "Processo", "Empresa", "Ano", "Fornecedor", "Valor", "Observador", "Objeto"],
  },
  gestores: {
    label: "Gestores e fiscais",
    cols: ["nr_contrato", "ds_papeis", "nm_pessoa_papel", "ds_orgao", "ano_contrato", "fornecedor", "observador_nome", "objeto_contrato"],
    headers: ["Nº contrato", "Papel", "Pessoa", "Órgão", "Ano", "Fornecedor", "Observador", "Objeto"],
  },
};

function pbiEsc(t) {
  const e = document.createElement("span");
  e.textContent = t ?? "—";
  return e.innerHTML;
}

function pbiFmtVal(row, col) {
  const v = row[col];
  if (v == null || v === "") return "—";
  if (col === "objeto" || col === "ds_objeto_contrato" || col === "objeto_contrato") {
    const s = String(v);
    return s.length > 90 ? `${s.slice(0, 90)}…` : s;
  }
  return v;
}

async function carregarPbiObservadores() {
  const obs = await api("/api/observadores?ativos=true");
  const sel = $("#edit-pbi-observador");
  if (!sel) return;
  sel.innerHTML = '<option value="">— Nenhum —</option>';
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
  buscarPbi();
}

async function carregarPbiFiltros() {
  const [empLic, sitLic, modLic, empCon, orgGest, papGest] = await Promise.all([
    api("/api/powerbi/licitacoes/empresas").catch(() => []),
    api("/api/powerbi/licitacoes/situacoes").catch(() => []),
    api("/api/powerbi/licitacoes/modalidades").catch(() => []),
    api("/api/powerbi/contratos/empresas").catch(() => []),
    api("/api/powerbi/gestores/orgaos").catch(() => []),
    api("/api/powerbi/gestores/papeis").catch(() => []),
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
  fill($("#pbi-filtro-lic-empresa"), empLic, "Todas");
  fill($("#pbi-filtro-lic-situacao"), sitLic, "Todas");
  fill($("#pbi-filtro-lic-modalidade"), modLic, "Todas");
  fill($("#pbi-filtro-con-empresa"), empCon, "Todas");
  fill($("#pbi-filtro-gest-orgao"), orgGest, "Todos");
  fill($("#pbi-filtro-gest-papel"), papGest, "Todos");
}

function pbiQueryParams() {
  const p = new URLSearchParams();
  p.set("limit", "200");
  if (pbiDataset === "licitacoes") {
    const ano = $("#pbi-filtro-lic-ano")?.value;
    const empresa = $("#pbi-filtro-lic-empresa")?.value;
    const situacao = $("#pbi-filtro-lic-situacao")?.value;
    const modalidade = $("#pbi-filtro-lic-modalidade")?.value;
    const processo = $("#pbi-filtro-lic-processo")?.value;
    const texto = $("#pbi-filtro-lic-texto")?.value;
    if (ano) p.set("ano_processo", ano);
    if (empresa) p.set("empresa", empresa);
    if (situacao) p.set("situacao", situacao);
    if (modalidade) p.set("modalidade", modalidade);
    if (processo) p.set("processo", processo);
    if (texto) p.set("texto", texto);
  } else if (pbiDataset === "contratos") {
    const ano = $("#pbi-filtro-con-ano")?.value;
    const empresa = $("#pbi-filtro-con-empresa")?.value;
    const processo = $("#pbi-filtro-con-processo")?.value;
    const nr = $("#pbi-filtro-con-numero")?.value;
    const texto = $("#pbi-filtro-con-texto")?.value;
    if (ano) p.set("ano_contrato", ano);
    if (empresa) p.set("empresa", empresa);
    if (processo) p.set("processo", processo);
    if (nr) p.set("nr_contrato", nr);
    if (texto) p.set("texto", texto);
  } else {
    const ano = $("#pbi-filtro-gest-ano")?.value;
    const orgao = $("#pbi-filtro-gest-orgao")?.value;
    const papel = $("#pbi-filtro-gest-papel")?.value;
    const nr = $("#pbi-filtro-gest-numero")?.value;
    const texto = $("#pbi-filtro-gest-texto")?.value;
    if (ano) p.set("ano_contrato", ano);
    if (orgao) p.set("ds_orgao", orgao);
    if (papel) p.set("ds_papeis", papel);
    if (nr) p.set("nr_contrato", nr);
    if (texto) p.set("texto", texto);
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
    const data = await api(`/api/powerbi/${pbiDataset}?${pbiQueryParams()}`);
    meta.textContent = `${data.total.toLocaleString("pt-BR")} registro(s) — ${cfg.label}`;
    if (!data.items.length) {
      tbody.innerHTML = `<tr><td colspan="${cfg.headers.length}">Nenhum registro.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.items.map((row) => `
      <tr data-id="${row.id}" class="clickable">
        ${cfg.cols.map((c) => `<td>${pbiEsc(pbiFmtVal(row, c))}</td>`).join("")}
      </tr>`).join("");
    tbody.querySelectorAll("tr.clickable").forEach((tr) => {
      tr.addEventListener("click", () => abrirPbiModal(parseInt(tr.dataset.id, 10)));
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="${cfg.headers.length}">${pbiEsc(err.message)}</td></tr>`;
  }
}

async function abrirPbiModal(id) {
  pbiAtualId = id;
  const row = await api(`/api/powerbi/${pbiDataset}/${id}`);
  $("#modal-pbi-titulo").textContent = `${PBI_DATASETS[pbiDataset].label} #${id}`;
  const grid = $("#modal-pbi-info");
  const skip = new Set(["id", "observador_id", "observador_nome", "coletado_em", "dados_csv_json"]);
  const labels = {
    ano_processo: "ANOPROCESSO", chave: "CHAVE", ds_habilitacao: "DSHABILITACAO",
    dt_abertura: "DTABERTURA", dt_habilitacao: "DTHABILITACAO", dt_homologacao: "DTHOMOLOGACAO",
    dt_julgamento: "DTJULGAMENTO", valor_licitacao: "VALORLICITACAO", fonte_ano_coleta: "Ano coleta",
    ano_contrato: "ANOCONTRATO", ds_objeto_contrato: "DSOBJETOCONTRATO", dt_assinatura: "DTASSINATURA",
    nm_pessoa: "NMPESSOA", nr_aditivo: "NRADITIVO", nr_contrato: "NRCONTRATO", nr_parcela: "NRPARCELA",
    vr_inicial: "VRINICIAL", ds_orgao: "DSORGAO", ds_papeis: "DSPAPEIS", dt_fim: "DTFIM",
    dt_inicio: "DTINICIO", fornecedor: "FORNECEDOR", nm_pessoa_papel: "NMPESSOAPAPEL",
    objeto_contrato: "OBJETOCONTRATO", processo: "PROCESSO", modalidade: "MODALIDADE",
    objeto: "OBJETO", solicitante: "SOLICITANTE", empresa: "EMPRESA", situacao: "SITUACAO",
  };
  grid.innerHTML = Object.entries(row)
    .filter(([k, v]) => !skip.has(k) && v != null && v !== "")
    .map(([k, v]) => `<dt>${pbiEsc(labels[k] || k)}</dt><dd>${pbiEsc(String(v))}</dd>`)
    .join("");
  const obj = row.objeto || row.ds_objeto_contrato || row.objeto_contrato;
  const objEl = $("#modal-pbi-objeto");
  if (objEl) {
    objEl.textContent = obj || "—";
    objEl.closest(".detail-panel")?.toggleAttribute("hidden", !obj);
  }
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
  if (!pbiAtualId) return;
  const obs = $("#edit-pbi-observador").value;
  try {
    await api(`/api/powerbi/${pbiDataset}/${pbiAtualId}`, {
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
