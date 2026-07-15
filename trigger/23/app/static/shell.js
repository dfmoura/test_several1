/* ============================================================
   shell.js — helpers compartilhados, roteamento SPA e status
   Observatório Social · Licitações Uberlândia
   ============================================================ */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

/** fetch defensivo — lança Error com .status; 404 vira mensagem clara */
async function api(path, opts = {}) {
  let r;
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const authGen = window.OSB?._authGen || 0;
  try {
    r = await fetch(path, {
      credentials: "same-origin",
      ...opts,
      headers,
    });
  } catch (netErr) {
    throw new Error(`Falha de rede ao acessar ${path}`);
  }
  if (!r.ok) {
    let detalhe = "";
    try {
      const raw = await r.text();
      try {
        const j = JSON.parse(raw);
        detalhe = typeof j.detail === "string" ? j.detail : (j.detail ? JSON.stringify(j.detail) : raw);
      } catch {
        detalhe = raw;
      }
    } catch { /* ignore */ }
    if (r.status === 404) detalhe = detalhe || `Endpoint não disponível: ${path}`;
    // Só força logout se a sessão estava ativa nesta "geração" de auth.
    // Ignora 401 atrasados de requisições feitas antes do login.
    const isAuthEndpoint = path.startsWith("/api/auth/");
    if (
      r.status === 401 &&
      !isAuthEndpoint &&
      window.OSB?.usuario &&
      authGen === (window.OSB._authGen || 0) &&
      typeof window.OSB?.onUnauthorized === "function"
    ) {
      window.OSB.onUnauthorized();
    }
    const err = new Error(detalhe || r.statusText || `Erro ${r.status}`);
    err.status = r.status;
    throw err;
  }
  if (r.status === 204) return null;
  return r.json();
}

function esc(t) {
  const e = document.createElement("span");
  e.textContent = t ?? "-";
  return e.innerHTML;
}

function fmtNum(n) {
  return new Intl.NumberFormat("pt-BR").format(n ?? 0);
}

/** Aceita number ou string BR ("1.234,56") ou US */
function fmtMoeda(v) {
  if (v == null || v === "") return "—";
  let n = v;
  if (typeof v === "string") {
    const limpo = v.replace(/[^\d,.-]/g, "");
    n = parseFloat(limpo.replace(/\./g, "").replace(",", "."));
  }
  if (!Number.isFinite(n)) return esc(v);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function pillSituacao(sit) {
  if (!sit) return '<span class="muted-inline">—</span>';
  const s = String(sit).toLowerCase();
  let cls = "pill-sit";
  if (s.includes("andamento")) cls += " andamento";
  else if (s.includes("conclu") || s.includes("homolog")) cls += " concluido";
  return `<span class="${cls}">${esc(sit)}</span>`;
}

function preencherSelect(sel, items, placeholder) {
  if (!sel) return;
  const atual = sel.value;
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  (items || []).forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    sel.appendChild(o);
  });
  if (atual && [...sel.options].some((o) => o.value === atual)) sel.value = atual;
}

/** Multilist (1+ opções) — dropdown com checkboxes, alinhado ao visual do sistema */
const _msRegistry = new WeakMap();
let _msDocCloseWired = false;

function _msWireDocClose() {
  if (_msDocCloseWired) return;
  _msDocCloseWired = true;
  document.addEventListener("click", (ev) => {
    $$(".ms.ms-open").forEach((host) => {
      if (host.contains(ev.target)) return;
      const api = _msRegistry.get(host);
      api?.close();
    });
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    $$(".ms.ms-open").forEach((host) => _msRegistry.get(host)?.close());
  });
}

function createMultiSelect(host, opts = {}) {
  if (!host) return null;
  const cached = _msRegistry.get(host);
  if (cached) return cached;

  const placeholder = opts.placeholder || host.dataset.placeholder || "Todas";
  host.classList.add("ms");
  host.innerHTML = `
    <button type="button" class="ms-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span class="ms-summary">${esc(placeholder)}</span>
      <span class="ms-caret" aria-hidden="true"></span>
    </button>
    <div class="ms-dropdown" hidden role="listbox" aria-multiselectable="true">
      <div class="ms-toolbar">
        <button type="button" class="ms-tool" data-ms-action="all">Marcar todas</button>
        <button type="button" class="ms-tool" data-ms-action="clear">Limpar</button>
      </div>
      <div class="ms-options"></div>
      <p class="ms-empty muted small" hidden>Nenhuma opção disponível</p>
    </div>`;

  const trigger = $(".ms-trigger", host);
  const summary = $(".ms-summary", host);
  const dropdown = $(".ms-dropdown", host);
  const optionsEl = $(".ms-options", host);
  const emptyEl = $(".ms-empty", host);
  let options = [];

  function selected() {
    return $$(".ms-opt input:checked", host).map((i) => i.value);
  }

  function updateSummary() {
    const vals = selected();
    const n = vals.length;
    trigger.classList.toggle("ms-active", n > 0);
    summary.classList.toggle("ms-has", n > 0);
    if (!n) {
      summary.textContent = placeholder;
      return;
    }
    const labels = vals.map(
      (v) => options.find((o) => String(o.value) === String(v))?.label || v,
    );
    if (n === 1) summary.textContent = labels[0];
    else if (n === 2) summary.textContent = labels.join(", ");
    else summary.textContent = `${n} selecionadas`;
  }

  function setOpen(next) {
    dropdown.hidden = !next;
    trigger.setAttribute("aria-expanded", next ? "true" : "false");
    host.classList.toggle("ms-open", next);
  }

  function emitChange() {
    updateSummary();
    host.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function renderOptions(keepSelection) {
    const prev = keepSelection ? new Set(selected()) : new Set();
    optionsEl.innerHTML = options.map((o) => {
      const checked = prev.has(String(o.value)) ? " checked" : "";
      return `<label class="ms-opt">
        <input type="checkbox" value="${esc(String(o.value))}"${checked} />
        <span>${esc(o.label)}</span>
      </label>`;
    }).join("");
    const vazio = options.length === 0;
    emptyEl.hidden = !vazio;
    optionsEl.hidden = vazio;
    updateSummary();
  }

  trigger.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const willOpen = dropdown.hidden;
    $$(".ms.ms-open").forEach((other) => {
      if (other !== host) _msRegistry.get(other)?.close();
    });
    setOpen(willOpen);
  });

  dropdown.addEventListener("click", (ev) => ev.stopPropagation());

  optionsEl.addEventListener("change", (ev) => {
    if (ev.target?.matches?.("input[type=checkbox]")) emitChange();
  });

  const api = {
    setOptions(items, { keepSelection = true } = {}) {
      options = (items || []).map((it) => (
        typeof it === "object" && it != null
          ? { value: String(it.value), label: String(it.label ?? it.value) }
          : { value: String(it), label: String(it) }
      ));
      renderOptions(keepSelection);
      return api;
    },
    getValues() {
      return selected();
    },
    setValues(vals) {
      const set = new Set((vals || []).map(String));
      $$(".ms-opt input", host).forEach((inp) => {
        inp.checked = set.has(inp.value);
      });
      emitChange();
      return api;
    },
    clear({ silent = false } = {}) {
      $$(".ms-opt input", host).forEach((inp) => { inp.checked = false; });
      if (silent) updateSummary();
      else emitChange();
      return api;
    },
    close() {
      setOpen(false);
    },
  };

  dropdown.querySelector('[data-ms-action="all"]')?.addEventListener("click", () => {
    $$(".ms-opt input", host).forEach((inp) => { inp.checked = true; });
    emitChange();
  });
  dropdown.querySelector('[data-ms-action="clear"]')?.addEventListener("click", () => {
    api.clear();
  });

  const form = host.closest("form");
  if (form && form.dataset.msResetWired !== "1") {
    form.dataset.msResetWired = "1";
    form.addEventListener("reset", () => {
      queueMicrotask(() => {
        form.querySelectorAll(".ms").forEach((el) => {
          _msRegistry.get(el)?.clear({ silent: true });
        });
      });
    });
  }

  _msRegistry.set(host, api);
  _msWireDocClose();
  updateSummary();
  return api;
}

/** Obtém (ou cria) o multilist ligado ao host. */
function multiSelectOf(sel) {
  const host = typeof sel === "string" ? $(sel) : sel;
  if (!host) return null;
  return _msRegistry.get(host) || createMultiSelect(host);
}

/** Acrescenta um ou mais valores como query params repetidos (FastAPI list). */
function appendQueryAll(params, key, values) {
  (values || []).forEach((v) => {
    if (v == null) return;
    const s = String(v).trim();
    if (s) params.append(key, s);
  });
}

function anosDeStats(porAno) {
  return Object.keys(porAno || {})
    .map((a) => parseInt(a, 10))
    .filter((a) => !Number.isNaN(a))
    .sort((a, b) => b - a)
    .map(String);
}

/** Célula de tabela com reticências + tooltip do valor completo */
function tdEllipsis(value, { html, title, cls } = {}) {
  const raw = value == null || value === "" ? "—" : String(value);
  const tip = title != null && title !== "" ? String(title) : raw;
  const classAttr = cls ? ` class="${cls}"` : "";
  return `<td${classAttr} title="${esc(tip)}">${html != null ? html : esc(raw)}</td>`;
}

function _parseSortNumber(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v ?? "").trim();
  if (!s || s === "—" || s === "-") return null;
  // BR money / number: 1.234,56
  if (/^-?[\d.]+,\d+$/.test(s.replace(/\s/g, "").replace(/R\$\s?/i, ""))) {
    const n = parseFloat(s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  // plain / ISO number
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function compareSortValues(a, b) {
  const empty = (v) => v == null || v === "" || v === "—" || v === "-";
  if (empty(a) && empty(b)) return 0;
  if (empty(a)) return 1;
  if (empty(b)) return -1;
  const na = _parseSortNumber(a);
  const nb = _parseSortNumber(b);
  if (na != null && nb != null) return na - nb;
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
}

function sortItems(items, key, dir = "asc") {
  const mul = dir === "desc" ? -1 : 1;
  const getter = typeof key === "function" ? key : (row) => row[key];
  return [...items].sort((a, b) => mul * compareSortValues(getter(a), getter(b)));
}

const _tableSortState = new WeakMap();

/** Ordenação por clique no cabeçalho (delegation no thead). */
function wireSortableHeaders(thead, onSort) {
  if (!thead || thead.dataset.sortWired === "1") return;
  thead.dataset.sortWired = "1";
  thead.addEventListener("click", (e) => {
    const th = e.target.closest("th[data-sort]");
    if (!th || !thead.contains(th)) return;
    const key = th.dataset.sort;
    let state = _tableSortState.get(thead) || { key: null, dir: "asc" };
    if (state.key === key) state = { key, dir: state.dir === "asc" ? "desc" : "asc" };
    else state = { key, dir: "asc" };
    _tableSortState.set(thead, state);
    thead.querySelectorAll("th[data-sort]").forEach((h) => {
      h.classList.add("sortable");
      h.classList.toggle("sorted-asc", h === th && state.dir === "asc");
      h.classList.toggle("sorted-desc", h === th && state.dir === "desc");
    });
    onSort(state.key, state.dir);
  });
}

function getTableSortState(thead) {
  return _tableSortState.get(thead) || null;
}

function clearTableSortState(thead) {
  if (thead) _tableSortState.delete(thead);
}

function markSortableHeaders(thead, state) {
  if (!thead) return;
  thead.querySelectorAll("th[data-sort]").forEach((h) => {
    h.classList.add("sortable");
    const active = state && h.dataset.sort === state.key;
    h.classList.toggle("sorted-asc", !!(active && state.dir === "asc"));
    h.classList.toggle("sorted-desc", !!(active && state.dir === "desc"));
  });
}

/** poll de status de coleta; resolve com o status final quando running=false */
function pollStatus(url, onTick, intervalMs = 1200) {
  return new Promise((resolve, reject) => {
    let ativo = true;
    const tick = async () => {
      if (!ativo) return;
      try {
        const st = await api(url);
        if (onTick) onTick(st);
        if (st && st.running === false) {
          ativo = false;
          resolve(st);
          return;
        }
      } catch (err) {
        ativo = false;
        reject(err);
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

/* ------------------------------------------------------------ Status topbar */
function setTopStatus(texto, estado = "idle") {
  const box = $("#topbar-status");
  const txt = $("#topbar-status-text");
  if (box) box.dataset.state = estado;
  if (txt) txt.textContent = texto;
}

/* ------------------------------------------------------------ Roteamento */
const PAGINAS = {
  dashboard: { titulo: "Painel", sub: "Visão consolidada das duas bases" },
  localidade: {
    titulo: "Mapa · Localidade",
    sub: "Sede dos vencedores · itens homologados (07.3) × contratações × valor",
  },
  coleta: { titulo: "Coleta", sub: "Ambiente único · Compras.gov + Power BI" },
  consulta: { titulo: "Consulta · Processo", sub: "Cruzamento do mesmo processo entre bases" },
  vencedores: { titulo: "CNPJs vencedores", sub: "Resultados 07.3 · enriquecimento Compras.gov + CNPJ público" },
  propostas: { titulo: "Propostas abertas", sub: "Itens com prazo PNCP vigente · análise de preços antes do encerramento" },
  compras: { titulo: "Compras.gov", sub: "Contratações · API Dados Abertos / PNCP" },
  powerbi: { titulo: "Power BI", sub: "Dados Abertos PMU · licitações, contratos, gestores" },
  vinculos: { titulo: "Vínculos", sub: "Órgãos e modalidades entre bases" },
  observadores: { titulo: "Observadores", sub: "Pessoas que acompanham licitações" },
  setup: { titulo: "Setup", sub: "Configuração, agendamento e limpeza da base" },
};

/** cada módulo de página registra seu carregador aqui */
window.OSB = window.OSB || { loaders: {} };
function registrarPagina(nome, loader) {
  window.OSB.loaders[nome] = loader;
}

let paginaAtual = null;

function irParaPagina(page) {
  if (!PAGINAS[page]) page = "dashboard";

  // Respeita papéis: se a página não for permitida, cai no painel.
  const me = window.OSB?.usuario;
  if (me?.permissoes?.paginas && me.permissoes.paginas[page] === false) {
    page = "dashboard";
  }

  paginaAtual = page;

  $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  $$(".page").forEach((p) => p.classList.remove("active"));
  const secao = $(`#page-${page}`);
  if (secao) secao.classList.add("active");

  const meta = PAGINAS[page];
  const tTitle = $("#topbar-title");
  const tSub = $("#topbar-sub");
  if (tTitle) tTitle.textContent = meta.titulo;
  if (tSub) tSub.textContent = meta.sub;

  window.scrollTo(0, 0);

  const loader = window.OSB.loaders[page];
  if (typeof loader === "function") {
    Promise.resolve()
      .then(() => loader())
      .catch((err) => console.error(`Erro ao carregar página ${page}:`, err));
  }
}

/** Chamado pelo auth.js após login bem-sucedido (ou sessão válida). */
function iniciarShell() {
  $$(".nav-btn").forEach((btn) => {
    if (btn.dataset.navWired === "1") return;
    btn.dataset.navWired = "1";
    btn.addEventListener("click", () => irParaPagina(btn.dataset.page));
  });

  const inicial = (location.hash || "").replace("#", "");
  irParaPagina(PAGINAS[inicial] ? inicial : "dashboard");
}

document.addEventListener("DOMContentLoaded", () => {
  // Roteamento só após autenticação (auth.js chama iniciarShell).
  window.OSB = window.OSB || { loaders: {} };
  window.OSB.iniciarShell = iniciarShell;
  window.OSB.irParaPagina = irParaPagina;
});
