const $ = (id) => document.getElementById(id);

function setInputValue(id, value) {
  const el = $(id);
  if (el) el.value = value ?? "";
}

function setCheckboxValue(id, checked) {
  const el = $(id);
  if (el) el.checked = Boolean(checked);
}

function readInputValue(id) {
  const el = $(id);
  return el ? String(el.value).trim() : "";
}

function normalizeAppRecord(app) {
  if (typeof app === "string") {
    const appId = app.trim().toLowerCase();
    return appId
      ? { app_id: appId, valor_implantacao: 500, valor_mensalidade: 99 }
      : null;
  }
  if (!app || typeof app !== "object") return null;
  const appId = String(app.app_id ?? app.id ?? "").trim().toLowerCase();
  if (!appId) return null;
  return {
    app_id: appId,
    valor_implantacao: Number(app.valor_implantacao ?? 500),
    valor_mensalidade: Number(app.valor_mensalidade ?? 99),
  };
}

function normalizeAppsList(apps) {
  if (!Array.isArray(apps)) return [];
  return apps.map(normalizeAppRecord).filter(Boolean);
}

function appIdList() {
  return state.apps.map((app) => app.app_id);
}

const state = {
  table: "",
  schema: null,
  rows: [],
  total: 0,
  limit: 50,
  offset: 0,
  editingId: null,
  apps: [],
};

function setStatus(el, msg, ok = true) {
  el.textContent = msg;
  el.className = `status ${ok ? "ok" : "err"}`;
}

function formatDetail(detail) {
  if (Array.isArray(detail)) return detail.join("\n");
  if (typeof detail === "string") return detail;
  return JSON.stringify(detail, null, 2);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { detail: text };
  }
  if (!res.ok) {
    throw new Error(formatDetail(body?.detail || res.statusText));
  }
  return body;
}

function getConfigPayload() {
  return {
    url: $("supabase-url").value.trim(),
    service_role_key: $("service-role").value.trim(),
  };
}

function getTable() {
  const manual = $("table-name").value.trim();
  const selected = $("table-select").value.trim();
  const table = manual || selected;
  if (!table) throw new Error("Selecione ou informe uma tabela.");
  return table;
}

function displayValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "sim" : "não";
  const text = String(value);
  return text.length > 48 ? `${text.slice(0, 45)}…` : text;
}

function toDatetimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 16);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowAtivadaEm() {
  const d = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}+00:00`;
}

function tableHasAppId() {
  return Boolean(state.schema?.columns?.some((col) => col.name === "app_id"));
}

function populateAppSelects(selected = "") {
  const selects = [$("default-app-select")];
  $("form-fields")
    ?.querySelectorAll("select[data-column='app_id']")
    .forEach((el) => selects.push(el));

  const appIds = appIdList();
  selects.forEach((select) => {
    if (!select) return;
    const current = selected || select.value;
    select.innerHTML = '<option value="">Selecione o app…</option>';
    appIds.forEach((appId) => {
      const opt = document.createElement("option");
      opt.value = appId;
      opt.textContent = appId;
      select.appendChild(opt);
    });
    if (current && appIds.includes(current)) {
      select.value = current;
    }
  });
}

function updateAppToolbar() {
  const field = $("toolbar-app-field");
  const hasAppId = tableHasAppId();
  field.hidden = !hasAppId;
  if (hasAppId) {
    populateAppSelects($("default-app-select").value);
  }
}

async function loadApps() {
  const data = await api("/api/apps");
  state.apps = normalizeAppsList(data.apps);
  renderAppsList();
  populateAppSelects();
  updateAppToolbar();
}

function renderAppsList() {
  const list = $("apps-list");
  list.innerHTML = "";
  if (!state.apps.length) {
    const li = document.createElement("li");
    li.textContent = "Nenhum app cadastrado.";
    list.appendChild(li);
    return;
  }
  state.apps.forEach((app) => {
    const appId = app.app_id;
    const valorImpl = app.valor_implantacao ?? 500;
    const valorMensal = app.valor_mensalidade ?? 99;

    const li = document.createElement("li");

    const head = document.createElement("div");
    head.className = "app-row-head";
    const name = document.createElement("code");
    name.textContent = appId;
    const del = document.createElement("button");
    del.type = "button";
    del.className = "ghost";
    del.textContent = "Remover";
    del.addEventListener("click", () => removeApp(appId));
    head.appendChild(name);
    head.appendChild(del);

    const pricing = document.createElement("div");
    pricing.className = "app-row-pricing";

    const implLabel = document.createElement("label");
    implLabel.textContent = "Implantação (R$)";
    const implInput = document.createElement("input");
    implInput.type = "number";
    implInput.step = "0.01";
    implInput.min = "0";
    implInput.value = String(valorImpl);
    implLabel.appendChild(implInput);

    const mensLabel = document.createElement("label");
    mensLabel.textContent = "Mensalidade (R$)";
    const mensInput = document.createElement("input");
    mensInput.type = "number";
    mensInput.step = "0.01";
    mensInput.min = "0";
    mensInput.value = String(valorMensal);
    mensLabel.appendChild(mensInput);

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "primary";
    saveBtn.textContent = "Salvar";
    saveBtn.addEventListener("click", async () => {
      try {
        await saveAppPricing(appId, implInput.value, mensInput.value);
      } catch (err) {
        setStatus($("apps-status"), err.message, false);
      }
    });

    pricing.appendChild(implLabel);
    pricing.appendChild(mensLabel);
    pricing.appendChild(saveBtn);

    li.appendChild(head);
    li.appendChild(pricing);
    list.appendChild(li);
  });
}

async function saveAppPricing(appId, valorImpl, valorMensal) {
  const body = {
    valor_implantacao: parseFloat(valorImpl) || 0,
    valor_mensalidade: parseFloat(valorMensal) || 0,
  };
  await api(`/api/apps/${encodeURIComponent(appId)}`, { method: "PATCH", body: JSON.stringify(body) });
  setStatus($("apps-status"), `Valores de "${appId}" salvos (R$ ${body.valor_implantacao} + R$ ${body.valor_mensalidade}/mês).`);
  await loadApps();
}

async function addApp() {
  const appId = $("new-app-id").value.trim();
  if (!appId) {
    setStatus($("apps-status"), "Informe o nome do app.", false);
    return;
  }
  const body = {
    app_id: appId,
    valor_implantacao: parseFloat($("new-app-valor-impl").value) || 0,
    valor_mensalidade: parseFloat($("new-app-valor-mensal").value) || 0,
  };
  await api("/api/apps", { method: "POST", body: JSON.stringify(body) });
  $("new-app-id").value = "";
  setStatus($("apps-status"), `App "${appId.toLowerCase()}" cadastrado.`);
  await loadApps();
}

async function removeApp(appId) {
  if (!confirm(`Remover app "${appId}"?`)) return;
  await api(`/api/apps/${encodeURIComponent(appId)}`, { method: "DELETE" });
  setStatus($("apps-status"), `App "${appId}" removido.`);
  await loadApps();
}

const LICENSE_CREATE_ORDER = [
  "cnpj",
  "condominio_nome",
  "pagador_nome",
  "pagador_endereco",
  "pagador_cidade",
  "pagador_uf",
  "pagador_cep",
  "app_id",
  "notas",
];

const LICENSE_HIDDEN_ON_CREATE = new Set([
  "id",
  "license_key",
  "implantacao_paga",
  "ativa",
  "valido_ate",
  "plano",
  "ativada_em",
  "device_id",
  "created_at",
  "updated_at",
]);

const LICENSE_FIELD_LABELS = {
  license_key: "Chave de licença",
  condominio_nome: "Nome do condomínio / cliente",
  cnpj: "CNPJ",
  pagador_nome: "Nome do pagador (razão social)",
  pagador_endereco: "Endereço do pagador",
  pagador_cidade: "Cidade",
  pagador_uf: "UF",
  pagador_cep: "CEP",
  app_id: "App",
  implantacao_paga: "Implantação paga",
  ativa: "Licença habilitada",
  valido_ate: "Válido até",
  plano: "Plano",
  notas: "Notas internas",
  device_id: "Aparelho vinculado",
  ativada_em: "Ativada no app em",
};

const LICENSE_FIELD_HINTS = {
  license_key: "Gerada automaticamente (ex.: TRIG-2026-0001). O cliente usará no app.",
  cnpj: "14 dígitos. Ao buscar, preenche nome e endereço via Receita Federal (BrasilAPI).",
  pagador_nome: "Preenchido pela consulta CNPJ. Usado no boleto/Pix do Inter.",
  pagador_endereco: "Logradouro do pagador na cobrança.",
  pagador_cidade: "Cidade do pagador.",
  pagador_uf: "UF com 2 letras.",
  pagador_cep: "Somente números (8 dígitos).",
  device_id: "Preenchido quando o cliente ativa o app no celular.",
  ativada_em: "Preenchido quando o cliente ativa o app no celular.",
};

function normalizeCnpjDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

async function lookupCnpjAndFill(rawCnpj) {
  const digits = normalizeCnpjDigits(rawCnpj);
  if (digits.length !== 14) {
    setStatus($("form-status"), "Informe um CNPJ com 14 dígitos.", false);
    return;
  }
  setStatus($("form-status"), "Consultando CNPJ na Receita…");
  const data = await api(`/api/cnpj/${digits}`);
  const map = {
    cnpj: data.cnpj,
    condominio_nome: data.razao_social || data.pagador_nome,
    pagador_nome: data.pagador_nome,
    pagador_endereco: data.pagador_endereco,
    pagador_cidade: data.pagador_cidade,
    pagador_uf: data.pagador_uf,
    pagador_cep: data.pagador_cep,
  };
  $("form-fields").querySelectorAll("[data-column]").forEach((input) => {
    const col = input.dataset.column;
    if (!map[col] || input.disabled) return;
    if (input.dataset.inputType === "boolean") return;
    input.value = map[col];
  });
  setStatus($("form-status"), `CNPJ OK: ${data.razao_social || data.pagador_nome}`);
}

function editableColumns(mode) {
  if (!state.schema) return [];
  return state.schema.columns.filter((col) => {
    if (mode === "create") {
      return !col.read_only || !["created_at", "updated_at", "deleted_at"].includes(col.name);
    }
    return !col.read_only || !["id", "created_at"].includes(col.name);
  });
}

function schemaHasPagadorColumns() {
  const names = new Set((state.schema?.columns || []).map((c) => c.name));
  return ["pagador_nome", "pagador_endereco", "pagador_cep"].every((n) => names.has(n));
}

function formColumns(mode) {
  let cols = editableColumns(mode);
  if (!isLicensesTable()) return cols;
  if (mode === "create") {
    cols = cols.filter((col) => !LICENSE_HIDDEN_ON_CREATE.has(col.name));
  }
  if (!schemaHasPagadorColumns()) {
    cols = cols.filter((col) => !col.name.startsWith("pagador_"));
  }
  const orderIndex = (name) => {
    const i = LICENSE_CREATE_ORDER.indexOf(name);
    return i === -1 ? 999 : i;
  };
  return [...cols].sort((a, b) => orderIndex(a.name) - orderIndex(b.name));
}

function licenseFieldLabel(col) {
  if (!isLicensesTable()) return col.name;
  return LICENSE_FIELD_LABELS[col.name] || col.name;
}

function licenseFieldHint(col) {
  if (!isLicensesTable()) return col.description;
  return LICENSE_FIELD_HINTS[col.name] || col.description;
}

function buildField(col, value) {
  const wrap = document.createElement("label");
  wrap.className = "field";
  const title = document.createElement("span");
  title.className = "field-label";
  const label = licenseFieldLabel(col);
  title.textContent = `${label}${col.required ? " *" : ""}`;
  wrap.appendChild(title);

  const hintText = licenseFieldHint(col);
  if (hintText) {
    const hint = document.createElement("small");
    hint.className = "field-hint";
    hint.textContent = hintText;
    wrap.appendChild(hint);
  }

  let input;
  const type = col.input_type;
  const licenseKeyLocked = isLicensesTable() && col.name === "license_key" && Boolean(state.editingId);
  const disabled =
    licenseKeyLocked ||
    (col.read_only && (state.editingId ? ["id", "created_at"].includes(col.name) : col.name === "id"));

  if (type === "boolean") {
    input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(value);
  } else if (type === "json") {
    input = document.createElement("textarea");
    input.rows = 4;
    input.value = value == null ? "" : JSON.stringify(value, null, 2);
  } else if (type === "integer" || type === "number") {
    input = document.createElement("input");
    input.type = "number";
    input.step = type === "integer" ? "1" : "any";
    input.value = value ?? "";
  } else if (type === "date") {
    input = document.createElement("input");
    input.type = "date";
    input.value = value ? String(value).slice(0, 10) : "";
  } else if (type === "datetime") {
    input = document.createElement("input");
    input.type = "datetime-local";
    input.value = toDatetimeLocal(value);
  } else if (type === "datetime_offset") {
    const row = document.createElement("div");
    row.className = "datetime-offset-row";
    input = document.createElement("input");
    input.type = "text";
    input.placeholder = "2026-06-09T01:04:52.836+00:00";
    input.value = value ? String(value) : nowAtivadaEm();
    input.dataset.column = col.name;
    input.dataset.inputType = type;
    input.required = col.required && !disabled;
    input.disabled = disabled;
    const nowBtn = document.createElement("button");
    nowBtn.type = "button";
    nowBtn.textContent = "Agora (UTC)";
    nowBtn.disabled = disabled;
    nowBtn.addEventListener("click", () => {
      input.value = nowAtivadaEm();
    });
    row.appendChild(input);
    row.appendChild(nowBtn);
    wrap.appendChild(row);
    return wrap;
  } else if (isLicensesTable() && col.name === "cnpj") {
    const row = document.createElement("div");
    row.className = "datetime-offset-row";
    input = document.createElement("input");
    input.type = "text";
    input.placeholder = "00000000000000";
    input.value = value ?? "";
    input.dataset.column = col.name;
    input.dataset.inputType = "text";
    input.required = col.required && !disabled;
    input.disabled = disabled;
    const lookupBtn = document.createElement("button");
    lookupBtn.type = "button";
    lookupBtn.textContent = "Buscar CNPJ";
    lookupBtn.disabled = disabled;
    lookupBtn.addEventListener("click", async () => {
      try {
        await lookupCnpjAndFill(input.value);
      } catch (err) {
        setStatus($("form-status"), err.message, false);
      }
    });
    input.addEventListener("blur", () => {
      if (normalizeCnpjDigits(input.value).length === 14) {
        lookupCnpjAndFill(input.value).catch((err) => {
          setStatus($("form-status"), err.message, false);
        });
      }
    });
    row.appendChild(input);
    row.appendChild(lookupBtn);
    wrap.appendChild(row);
    return wrap;
  } else if (col.name === "app_id") {
    input = document.createElement("select");
    input.dataset.column = col.name;
    input.dataset.inputType = "app_id";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Selecione o app…";
    input.appendChild(empty);
    const appIds = appIdList();
    appIds.forEach((appId) => {
      const opt = document.createElement("option");
      opt.value = appId;
      opt.textContent = appId;
      if (value === appId) opt.selected = true;
      input.appendChild(opt);
    });
    input.required = col.required && !disabled;
    input.disabled = disabled;
    wrap.appendChild(input);
    return wrap;
  } else {
    input = document.createElement("input");
    input.type = "text";
    input.value = value ?? "";
  }

  input.dataset.column = col.name;
  input.dataset.inputType = type;
  input.required = col.required && !disabled;
  input.disabled = disabled;
  wrap.appendChild(input);
  return wrap;
}

function readFormData(mode) {
  const data = {};
  $("form-fields").querySelectorAll("[data-column]").forEach((input) => {
    const col = input.dataset.column;
    const type = input.dataset.inputType;
    if (input.disabled) return;

    if (type === "boolean") {
      data[col] = input.checked;
      return;
    }

    if (type === "app_id") {
      const raw = input.value.trim();
      if (raw) data[col] = raw;
      else if (input.required) data[col] = "";
      return;
    }

    if (type === "datetime_offset") {
      const raw = input.value.trim();
      if (raw) data[col] = raw;
      else if (input.required) data[col] = nowAtivadaEm();
      return;
    }

    const raw = input.value.trim();
    if (!raw) {
      if (input.required) data[col] = "";
      return;
    }

    if (type === "json") {
      data[col] = raw;
      return;
    }
    if (type === "integer" || type === "number") {
      data[col] = raw;
      return;
    }
    data[col] = raw;
  });
  return data;
}

function updateSidebarVisibility() {
  const appsOpen = !$("apps-section").hidden;
  const configOpen = !$("config-section").hidden;
  const interOpen = !$("inter-section").hidden;
  $("app-body").classList.toggle("sidebar-hidden", !appsOpen && !configOpen && !interOpen);
}

function openSidebarPanel(panel) {
  setInterPanelVisible(panel === "inter");
  setAppsPanelVisible(panel === "apps");
  setConfigPanelVisible(panel === "config");
  if (panel) {
    $("sidebar").scrollTop = 0;
  }
}

function toggleSidebarPanel(panel) {
  const sectionIds = {
    inter: "inter-section",
    apps: "apps-section",
    config: "config-section",
  };
  const sectionId = sectionIds[panel];
  if (!sectionId) return false;
  const section = $(sectionId);
  if (!section) return false;
  if (!section.hidden) {
    openSidebarPanel(null);
    return false;
  }
  openSidebarPanel(panel);
  return true;
}

function setInterPanelVisible(visible) {
  $("inter-section").hidden = !visible;
  const btn = $("btn-toggle-inter");
  btn.setAttribute("aria-expanded", String(visible));
  btn.textContent = visible ? "Ocultar Inter" : "Inter";
  updateSidebarVisibility();
}

function setAppsPanelVisible(visible) {
  $("apps-section").hidden = !visible;
  const btn = $("btn-toggle-apps");
  btn.setAttribute("aria-expanded", String(visible));
  btn.textContent = visible ? "Ocultar apps" : "Apps";
  updateSidebarVisibility();
}

function setConfigPanelVisible(visible) {
  $("config-section").hidden = !visible;
  const btn = $("btn-toggle-config");
  btn.setAttribute("aria-expanded", String(visible));
  btn.textContent = visible ? "Ocultar credenciais" : "Credenciais";
  updateSidebarVisibility();
}

function setEmptyState(message) {
  const empty = $("empty-state");
  empty.querySelector("p").innerHTML = message;
  empty.hidden = false;
  $("table-wrap").hidden = true;
}

function renderTable() {
  const wrap = $("table-wrap");
  const table = $("data-table");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!state.rows.length) {
    setEmptyState(`Nenhum registro em <strong>${state.table}</strong>. Clique em <strong>Novo</strong> para criar.`);
    return;
  }

  $("empty-state").hidden = true;

  const columns = state.schema?.columns?.map((c) => c.name) || Object.keys(state.rows[0]);
  const pk = state.schema?.primary_key || "id";

  const headRow = document.createElement("tr");
  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headRow.appendChild(th);
  });
  const actionTh = document.createElement("th");
  actionTh.textContent = "Ações";
  headRow.appendChild(actionTh);
  thead.appendChild(headRow);

  state.rows.forEach((row) => {
    const tr = document.createElement("tr");
    columns.forEach((col) => {
      const td = document.createElement("td");
      td.textContent = displayValue(row[col]);
      td.title = displayValue(row[col]);
      tr.appendChild(td);
    });
    const actions = document.createElement("td");
    actions.className = "row-actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", () => openModal("edit", row[pk], row));
    actions.appendChild(editBtn);
    if (isLicensesTable() && row.license_key) {
      const billBtn = document.createElement("button");
      billBtn.type = "button";
      billBtn.textContent = "Cobrar";
      billBtn.addEventListener("click", () => {
        $("billing-license-key").value = row.license_key;
        loadBillingCharges();
      });
      actions.appendChild(billBtn);
    }
    tr.appendChild(actions);
    tbody.appendChild(tr);
  });

  wrap.hidden = false;
}

function renderPagination() {
  const pagination = $("pagination");
  if (!state.total) {
    pagination.hidden = true;
    return;
  }
  const page = Math.floor(state.offset / state.limit) + 1;
  const pages = Math.max(1, Math.ceil(state.total / state.limit));
  $("page-info").textContent = `Página ${page} de ${pages} (${state.total} registros)`;
  $("btn-prev").disabled = state.offset <= 0;
  $("btn-next").disabled = state.offset + state.limit >= state.total;
  pagination.hidden = false;
}

async function openModal(mode, id = null, row = {}) {
  state.editingId = mode === "edit" ? id : null;
  if (mode === "edit") {
    $("modal-title").textContent = `Editar #${id}`;
  } else if (isLicensesTable()) {
    $("modal-title").textContent = "Nova licença (pré-cadastro)";
  } else {
    $("modal-title").textContent = "Novo registro";
  }
  $("btn-delete-modal").hidden = mode !== "edit";
  $("form-status").textContent = "";

  const draft = { ...row };
  if (mode === "create" && tableHasAppId() && !draft.app_id) {
    const defaultApp = $("default-app-select").value;
    if (defaultApp) draft.app_id = defaultApp;
  }
  if (mode === "create" && !isLicensesTable() && !draft.ativada_em) {
    draft.ativada_em = nowAtivadaEm();
  }
  if (mode === "create" && !draft.plano) {
    draft.plano = "mensal";
  }

  const fields = $("form-fields");
  fields.innerHTML = "";
  if (mode === "create" && isLicensesTable()) {
    const intro = document.createElement("p");
    intro.className = "form-intro";
    intro.id = "license-create-intro";
    const pagadorHint = schemaHasPagadorColumns()
      ? "Busque o CNPJ para preencher o endereço do pagador."
      : "Informe o CNPJ (endereço do pagador é buscado automaticamente na cobrança).";
    intro.textContent = `Pré-cadastro: ${pagadorHint} A chave é gerada ao salvar.`;
    fields.appendChild(intro);
    try {
      const { license_key: nextKey } = await api("/api/licenses/next-key");
      intro.textContent = `Pré-cadastro (${nextKey}). ${pagadorHint} App bloqueado até o pagamento.`;
    } catch {
      // Preview opcional; o backend gera ao salvar.
    }
  }
  formColumns(mode).forEach((col) => {
    fields.appendChild(buildField(col, draft[col.name]));
  });

  $("record-modal").showModal();
}

async function loadTables() {
  try {
    const { tables } = await api("/api/tables");
    const select = $("table-select");
    const current = select.value;
    select.innerHTML = '<option value="">Selecione uma tabela</option>';
    tables.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    if (current) select.value = current;
  } catch {
    // credenciais ainda não configuradas
  }
}

async function loadData() {
  state.table = getTable();
  $("table-name").value = state.table;
  $("table-select").value = state.table;

  const data = await api(
    `/api/tables/${encodeURIComponent(state.table)}?limit=${state.limit}&offset=${state.offset}`
  );
  state.schema = data.schema;
  state.rows = data.rows;
  state.total = data.total;
  renderTable();
  renderPagination();
  updateAppToolbar();
  updateBillingPanel();
  setStatus($("crud-status"), `${data.rows.length} de ${data.total} registro(s) em "${state.table}".`);
}

async function saveRecord() {
  const mode = state.editingId ? "update" : "create";
  const payload = { data: readFormData(mode === "create" ? "create" : "update") };

  if (mode === "create") {
    const result = await api(`/api/tables/${encodeURIComponent(state.table)}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const created = result.rows?.[0];
    if (isLicensesTable() && created?.license_key) {
      $("billing-license-key").value = created.license_key;
      setStatus($("crud-status"), `Licença criada: ${created.license_key}. Emita a cobrança inicial.`);
    } else {
      setStatus($("crud-status"), "Registro criado.");
    }
    setStatus($("form-status"), "Registro criado.");
  } else {
    await api(
      `/api/tables/${encodeURIComponent(state.table)}/${encodeURIComponent(state.editingId)}`,
      { method: "PATCH", body: JSON.stringify(payload) }
    );
    setStatus($("form-status"), "Registro atualizado.");
  }

  $("record-modal").close();
  await loadData();
}

async function deleteRecord() {
  if (!state.editingId) return;
  if (!confirm(`Excluir registro ${state.editingId}?`)) return;
  await api(
    `/api/tables/${encodeURIComponent(state.table)}/${encodeURIComponent(state.editingId)}`,
    { method: "DELETE" }
  );
  $("record-modal").close();
  setStatus($("crud-status"), "Registro excluído.");
  await loadData();
}

async function loadConfig() {
  try {
    await loadApps();
    const config = await api("/api/config");
    if (config.configured) {
      $("supabase-url").value = config.url;
      setStatus($("config-status"), "Credenciais salvas. Carregue uma tabela para começar.");
      setConfigPanelVisible(false);
      await loadTables();
    }
  } catch (err) {
    setStatus($("config-status"), err.message, false);
  }
}

$("btn-toggle-apps").addEventListener("click", async () => {
  const opened = toggleSidebarPanel("apps");
  if (!opened) return;
  try {
    await loadApps();
  } catch (err) {
    setStatus($("apps-status"), err.message, false);
  }
});

$("btn-toggle-config").addEventListener("click", () => {
  toggleSidebarPanel("config");
});

$("btn-test").addEventListener("click", async () => {
  try {
    await api("/api/config/test", { method: "POST", body: JSON.stringify(getConfigPayload()) });
    setStatus($("config-status"), "Conexão OK!");
  } catch (err) {
    setStatus($("config-status"), err.message, false);
  }
});

$("btn-save-config").addEventListener("click", async () => {
  try {
    await api("/api/config", { method: "POST", body: JSON.stringify(getConfigPayload()) });
    setStatus($("config-status"), "Credenciais salvas.");
    await loadTables();
  } catch (err) {
    setStatus($("config-status"), err.message, false);
  }
});

$("btn-load").addEventListener("click", async () => {
  try {
    state.offset = 0;
    await loadData();
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
});

$("btn-new").addEventListener("click", async () => {
  try {
    await loadApps();
    if (!state.schema || state.table !== getTable()) {
      state.table = getTable();
      const schema = await api(`/api/tables/${encodeURIComponent(state.table)}/schema`);
      state.schema = schema;
      updateAppToolbar();
    }
    if (tableHasAppId() && !$("default-app-select").value) {
      setStatus($("crud-status"), "Selecione o app antes de criar o registro.", false);
      $("toolbar-app-field").hidden = false;
      $("default-app-select").focus();
      return;
    }
    openModal("create");
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
});

$("btn-add-app").addEventListener("click", async () => {
  try {
    await addApp();
  } catch (err) {
    setStatus($("apps-status"), err.message, false);
  }
});

$("new-app-id").addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  try {
    await addApp();
  } catch (err) {
    setStatus($("apps-status"), err.message, false);
  }
});

$("btn-prev").addEventListener("click", async () => {
  state.offset = Math.max(0, state.offset - state.limit);
  try {
    await loadData();
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
});

$("btn-next").addEventListener("click", async () => {
  if (state.offset + state.limit >= state.total) return;
  state.offset += state.limit;
  try {
    await loadData();
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
});

$("record-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await saveRecord();
  } catch (err) {
    setStatus($("form-status"), err.message, false);
  }
});

$("btn-delete-modal").addEventListener("click", async () => {
  try {
    await deleteRecord();
  } catch (err) {
    setStatus($("form-status"), err.message, false);
  }
});

$("btn-close-modal").addEventListener("click", () => $("record-modal").close());

$("table-select").addEventListener("change", () => {
  $("table-name").value = $("table-select").value;
});

function isLicensesTable() {
  return state.table?.toLowerCase() === "licenses";
}

function updateBillingPanel() {
  const show = isLicensesTable();
  $("billing-toolbar").hidden = !show;
  $("billing-panel").hidden = !show;
  $("billing-schedule-panel").hidden = !show;
  if (show) {
    loadBillingSchedule();
    loadBillingCharges();
  }
}

const SCHEDULE_URGENCY_LABELS = {
  expired: "Expirada",
  critical: "Urgente",
  due_soon: "Emitir em breve",
  waiting: "Aguardando pagamento",
  needs_initial: "Sem implantação",
  ok: "Em dia",
};

function formatScheduleDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function scheduleQueryString() {
  const includeOk = $("schedule-show-ok")?.checked;
  const params = new URLSearchParams();
  if (includeOk) params.set("include_ok", "true");
  else params.set("include_ok", "false");
  params.set("emit_ahead_days", "21");
  return params.toString() ? `?${params.toString()}` : "";
}

async function loadBillingSchedule() {
  if (!isLicensesTable()) return;
  try {
    const data = await api(`/api/billing/schedule${scheduleQueryString()}`);
    renderScheduleSummary(data.summary || {});
    renderScheduleTable(data.items || []);
  } catch (err) {
    renderScheduleSummary({});
    renderScheduleTable([]);
    setStatus($("crud-status"), err.message, false);
  }
}

function renderScheduleSummary(summary) {
  const el = $("schedule-summary");
  if (!el) return;
  el.innerHTML = "";
  const chips = [
    ["expired", "Expiradas", summary.expired],
    ["critical", "Urgentes", summary.critical],
    ["due_soon", "Emitir em breve", summary.due_soon],
    ["waiting", "Aguardando", summary.waiting],
    ["needs_initial", "Inicial pendente", summary.needs_initial],
    ["ok", "Em dia", summary.ok],
  ];
  let hasAny = false;
  chips.forEach(([kind, label, count]) => {
    if (!count) return;
    hasAny = true;
    const span = document.createElement("span");
    span.className = `schedule-chip ${kind}`;
    span.innerHTML = `${label}: <strong>${count}</strong>`;
    el.appendChild(span);
  });
  if (summary.should_emit_now) {
    const span = document.createElement("span");
    span.className = "schedule-chip critical";
    span.innerHTML = `Emitir agora: <strong>${summary.should_emit_now}</strong>`;
    el.appendChild(span);
    hasAny = true;
  }
  if (!hasAny) {
    el.textContent = "Nenhuma licença na agenda (ajuste o filtro ou cadastre licenças).";
  }
}

function createScheduleActionButton(label, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ghost";
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

function focusLicenseBilling(licenseKey) {
  $("billing-license-key").value = licenseKey;
  loadBillingCharges();
  $("billing-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function emitBillingForKey(licenseKey, type) {
  const path = type === "initial" ? "/api/billing/charges/initial" : "/api/billing/charges/monthly";
  await api(path, { method: "POST", body: JSON.stringify({ license_key: licenseKey }) });
  setStatus(
    $("crud-status"),
    `Cobrança ${type === "initial" ? "inicial" : "mensal"} emitida para ${licenseKey}.`,
  );
  await loadBillingSchedule();
  await loadBillingCharges();
  await loadData();
}

function renderScheduleTable(items) {
  const tbody = $("schedule-table")?.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!items.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 9;
    td.textContent = "Nenhuma licença pendente na agenda.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  items.forEach((item) => {
    const tr = document.createElement("tr");
    const urgency = item.urgency || "ok";

    const priorityTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `urgency-badge ${urgency}`;
    badge.textContent = SCHEDULE_URGENCY_LABELS[urgency] || urgency;
    priorityTd.appendChild(badge);
    tr.appendChild(priorityTd);

    const keyTd = document.createElement("td");
    const keyBtn = createScheduleActionButton(item.license_key, () => focusLicenseBilling(item.license_key));
    keyBtn.className = "ghost linkish";
    keyTd.appendChild(keyBtn);
    tr.appendChild(keyTd);

    [
      item.condominio_nome || "—",
      formatScheduleDate(item.valido_ate),
      formatScheduleDate(item.emit_recommended_by),
      item.action_label || "—",
      item.estimated_value != null ? `R$ ${Number(item.estimated_value).toFixed(2)}` : "—",
    ].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      td.title = text;
      tr.appendChild(td);
    });

    const actionsTd = document.createElement("td");
    actionsTd.className = "schedule-actions";

    if (item.open_charge?.id) {
      actionsTd.appendChild(
        createScheduleActionButton("Ver cobrança", () => focusLicenseBilling(item.license_key)),
      );
      actionsTd.appendChild(
        createScheduleActionButton("Sync", async () => {
          try {
            await api(`/api/billing/charges/${encodeURIComponent(item.open_charge.id)}/sync`, {
              method: "POST",
            });
            await loadBillingSchedule();
            await loadBillingCharges();
            await loadData();
            setStatus($("crud-status"), `Sync concluído para ${item.license_key}.`);
          } catch (err) {
            setStatus($("crud-status"), err.message, false);
          }
        }),
      );
    } else if (item.action === "emit_initial") {
      actionsTd.appendChild(
        createScheduleActionButton("Emitir inicial", async () => {
          try {
            await emitBillingForKey(item.license_key, "initial");
          } catch (err) {
            setStatus($("crud-status"), err.message, false);
          }
        }),
      );
    } else if (item.action === "emit_monthly") {
      actionsTd.appendChild(
        createScheduleActionButton("Emitir mensalidade", async () => {
          try {
            await emitBillingForKey(item.license_key, "monthly");
          } catch (err) {
            setStatus($("crud-status"), err.message, false);
          }
        }),
      );
    } else if (item.action === "ok") {
      actionsTd.appendChild(
        createScheduleActionButton("Ver licença", () => focusLicenseBilling(item.license_key)),
      );
    }

    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  });
}

function getBillingLicenseKey() {
  const manual = $("billing-license-key").value.trim();
  if (manual) return manual.toUpperCase();
  const pk = state.schema?.primary_key || "id";
  const rowWithKey = state.rows.find((r) => r.license_key);
  return rowWithKey?.license_key || "";
}

function applyInterConfigFields(cfg) {
  setInputValue("inter-client-id", cfg.client_id || "");
  setInputValue("inter-conta", cfg.conta_corrente || "");
  setCheckboxValue("inter-sandbox", cfg.sandbox);
  setInputValue("inter-scopes", cfg.scopes || "boleto-cobranca.read boleto-cobranca.write");
  setInputValue("inter-webhook-url", cfg.webhook_public_url || "");
  setInputValue("inter-dias-venc", cfg.dias_vencimento ?? 7);
  setInputValue("inter-endereco", cfg.pagador_endereco || "A informar");
  setInputValue("inter-cidade", cfg.pagador_cidade || "Belo Horizonte");
  setInputValue("inter-uf", cfg.pagador_uf || "MG");
  setInputValue("inter-cep", cfg.pagador_cep || "30130000");
}

async function loadInterConfig() {
  try {
    const cfg = await api("/api/inter/config");
    applyInterConfigFields(cfg);
    if (cfg.webhook_token_set) {
      try {
        const info = await api("/api/inter/webhook/info");
        const tokenMatch = info.callback_url?.match(/token=([^&]+)/);
        if (tokenMatch) setInputValue("inter-webhook-token", decodeURIComponent(tokenMatch[1]));
      } catch {
        // Webhook ainda não configurado no Inter
      }
    }
  } catch (err) {
    setStatus($("inter-status"), err.message, false);
  }
}

function interConfigPayload() {
  return {
    client_id: readInputValue("inter-client-id"),
    client_secret: readInputValue("inter-client-secret"),
    conta_corrente: readInputValue("inter-conta"),
    sandbox: Boolean($("inter-sandbox")?.checked),
    scopes: readInputValue("inter-scopes"),
    webhook_public_url: readInputValue("inter-webhook-url"),
    webhook_token: readInputValue("inter-webhook-token"),
    dias_vencimento: parseInt(readInputValue("inter-dias-venc"), 10) || 7,
    pagador_endereco: readInputValue("inter-endereco"),
    pagador_cidade: readInputValue("inter-cidade"),
    pagador_uf: readInputValue("inter-uf"),
    pagador_cep: readInputValue("inter-cep"),
  };
}

async function uploadInterCertsIfAny() {
  const certFile = $("inter-cert-file").files[0];
  const keyFile = $("inter-key-file").files[0];
  if (!certFile && !keyFile) return;
  if (!certFile || !keyFile) {
    throw new Error("Selecione certificado (.crt) e chave (.key) juntos.");
  }
  const form = new FormData();
  form.append("cert", certFile);
  form.append("key", keyFile);
  const res = await fetch("/api/inter/config/upload-cert", { method: "POST", body: form });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { detail: text };
  }
  if (!res.ok) throw new Error(formatDetail(body?.detail || res.statusText));
}

async function loadBillingCharges() {
  const key = getBillingLicenseKey();
  const qs = key ? `?license_key=${encodeURIComponent(key)}` : "";
  try {
    const data = await api(`/api/billing/charges${qs}`);
    renderBillingTable(data.charges || []);
  } catch (err) {
    renderBillingTable([]);
    if (isLicensesTable()) {
      setStatus($("crud-status"), err.message, false);
    }
  }
}

function renderBillingTable(charges) {
  const tbody = $("billing-table").querySelector("tbody");
  tbody.innerHTML = "";
  if (!charges.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "Nenhuma cobrança emitida.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  charges.forEach((c) => {
    const tr = document.createElement("tr");
    const cols = [
      c.charge_type,
      `R$ ${Number(c.valor_nominal).toFixed(2)}`,
      c.data_vencimento,
      c.status,
      c.inter_situacao || "—",
    ];
    cols.forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    const actions = document.createElement("td");
    const syncBtn = document.createElement("button");
    syncBtn.type = "button";
    syncBtn.className = "ghost";
    syncBtn.textContent = "Sync";
    syncBtn.addEventListener("click", async () => {
      try {
        await api(`/api/billing/charges/${encodeURIComponent(c.id)}/sync`, { method: "POST" });
        await loadBillingSchedule();
        await loadBillingCharges();
        await loadData();
      } catch (err) {
        setStatus($("crud-status"), err.message, false);
      }
    });
    actions.appendChild(syncBtn);
    if (c.status === "EMITIDA" && c.codigo_solicitacao) {
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "ghost danger";
      cancelBtn.textContent = "Cancelar";
      cancelBtn.addEventListener("click", async () => {
        if (!confirm("Cancelar esta cobrança no Inter?")) return;
        try {
          const result = await api(`/api/billing/charges/${encodeURIComponent(c.id)}/cancel`, {
            method: "POST",
          });
          const updated = result.charge || {};
          await loadBillingSchedule();
          await loadBillingCharges();
          await loadData();
          const sit = updated.inter_situacao || updated.status || "CANCELADA";
          setStatus($("crud-status"), `Cobrança cancelada no Inter (${sit}).`);
        } catch (err) {
          setStatus($("crud-status"), err.message, false);
        }
      });
      actions.appendChild(cancelBtn);
    }
    if (c.codigo_solicitacao) {
      const pdfBtn = document.createElement("button");
      pdfBtn.type = "button";
      pdfBtn.className = "ghost";
      pdfBtn.textContent = "PDF";
      pdfBtn.addEventListener("click", async () => {
        try {
          const data = await api(`/api/billing/charges/${encodeURIComponent(c.id)}/pdf`);
          const bin = atob(data.pdf_base64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
          const blob = new Blob([bytes], { type: "application/pdf" });
          window.open(URL.createObjectURL(blob), "_blank");
        } catch (err) {
          setStatus($("crud-status"), err.message, false);
        }
      });
      actions.appendChild(pdfBtn);
    }
    if (c.pix_copia_cola) {
      const pixBtn = document.createElement("button");
      pixBtn.type = "button";
      pixBtn.className = "ghost";
      pixBtn.textContent = "Pix";
      pixBtn.title = c.pix_copia_cola;
      pixBtn.addEventListener("click", async () => {
        await navigator.clipboard.writeText(c.pix_copia_cola);
        setStatus($("crud-status"), "Pix copia e cola copiado.");
      });
      actions.appendChild(pixBtn);
    }
    tr.appendChild(actions);
    tbody.appendChild(tr);
  });
}

async function emitBilling(type) {
  const licenseKey = getBillingLicenseKey();
  if (!licenseKey) {
    setStatus($("crud-status"), "Informe license_key para emitir cobrança.", false);
    return;
  }
  try {
    await emitBillingForKey(licenseKey, type);
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
}

$("btn-toggle-inter").addEventListener("click", async () => {
  const opened = toggleSidebarPanel("inter");
  if (!opened) return;
  await loadInterConfig();
});

$("btn-inter-save").addEventListener("click", async () => {
  try {
    await api("/api/inter/config", { method: "POST", body: JSON.stringify(interConfigPayload()) });
    await uploadInterCertsIfAny();
    setStatus($("inter-status"), "Configuração Inter salva.");
    await loadInterConfig();
  } catch (err) {
    setStatus($("inter-status"), err.message, false);
  }
});

$("btn-inter-test").addEventListener("click", async () => {
  try {
    await api("/api/inter/config", { method: "POST", body: JSON.stringify(interConfigPayload()) });
    await uploadInterCertsIfAny();
    const result = await api("/api/inter/config/test", { method: "POST" });
    const conta = result.conta_corrente ? ` — conta ${result.conta_corrente}` : "";
    const warn = result.warning ? ` ${result.warning}` : "";
    setStatus($("inter-status"), `Conexão OK (${result.base_url}${conta}).${warn}`);
  } catch (err) {
    setStatus($("inter-status"), err.message, false);
  }
});

$("btn-inter-webhook-info").addEventListener("click", async () => {
  try {
    const info = await api("/api/inter/webhook/info");
    $("inter-webhook-info").hidden = false;
    $("inter-webhook-info").textContent = JSON.stringify(info, null, 2);
    if (info.callback_url) {
      const tokenMatch = info.callback_url.match(/token=([^&]+)/);
      if (tokenMatch) setInputValue("inter-webhook-token", decodeURIComponent(tokenMatch[1]));
    }
    setStatus($("inter-status"), "Webhook info carregada.");
  } catch (err) {
    setStatus($("inter-status"), err.message, false);
  }
});

$("btn-inter-webhook-register").addEventListener("click", async () => {
  try {
    const result = await api("/api/inter/webhook/register", { method: "POST" });
    setStatus($("inter-status"), `Webhook registrado: ${result.callback_url}`);
  } catch (err) {
    setStatus($("inter-status"), err.message, false);
  }
});

$("btn-billing-initial").addEventListener("click", async () => {
  try {
    await emitBilling("initial");
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
});

$("btn-billing-monthly").addEventListener("click", async () => {
  try {
    await emitBilling("monthly");
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
});

$("btn-billing-refresh").addEventListener("click", async () => {
  try {
    await loadBillingSchedule();
    await loadBillingCharges();
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
});

$("btn-schedule-refresh").addEventListener("click", async () => {
  try {
    await loadBillingSchedule();
    setStatus($("crud-status"), "Agenda de cobranças atualizada.");
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
});

$("schedule-show-ok").addEventListener("change", async () => {
  try {
    await loadBillingSchedule();
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
});

loadConfig();
loadInterConfig();
