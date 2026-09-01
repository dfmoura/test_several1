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
  selectedLicenseKey: "",
  selectedLicenseName: "",
  modalOpener: null,
  scheduleItems: [],
  billingCatalogValor: null,
  billingValorLocked: false,
};

const LICENSE_LIST_COLUMNS = [
  "license_key",
  "condominio_nome",
  "app_id",
  "valido_ate",
  "implantacao_paga",
  "ativa",
];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function smoothScrollIntoView(el) {
  if (!el) return;
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "nearest",
  });
}

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

function isLikelyTableName(name) {
  // Identificadores SQL/Postgres: sem hífen (evita confundir com TRIG-2026-0001).
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(String(name || "").trim());
}

function getTable() {
  const advanced = $("advanced-tables");
  if (!advanced?.open) {
    return state.table || "licenses";
  }

  const selected = ($("table-select")?.value || "").trim();
  const manual = ($("table-name")?.value || "").trim();

  // Preferir o select. Só usar "nome manual" se for um identificador de tabela válido.
  if (manual && isLikelyTableName(manual)) {
    return manual;
  }
  if (manual && !isLikelyTableName(manual)) {
    if (selected) {
      $("table-name").value = selected;
      return selected;
    }
    throw new Error(
      `"${manual}" não é nome de tabela. Escolha na lista ou digite ex.: billing_charges. Para uma licença, use Cobrar na lista/agenda.`,
    );
  }
  return selected || state.table || "licenses";
}

const TABLE_LABELS = {
  licenses: "Licenças",
  billing_charges: "Cobranças (histórico)",
};

const CHARGE_TYPE_LABELS = {
  INITIAL: "Inicial",
  MONTHLY: "Mensalidade",
};

const CHARGE_STATUS_LABELS = {
  EMITIDA: "Emitida",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
  EXPIRADA: "Expirada",
  ATRASADA: "Atrasada",
};

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
  const selects = [];
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
  // App fica só no modal de criação/edição.
  populateAppSelects();
}

async function loadApps() {
  const data = await api("/api/apps");
  state.apps = normalizeAppsList(data.apps);
  renderAppsList();
  populateAppSelects();
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

/** Liberação só após pagamento (Sync/webhook) — não editar à mão no formulário. */
const LICENSE_PAYMENT_LOCKED_ON_EDIT = new Set(["implantacao_paga", "valido_ate"]);

const LICENSE_FIELD_LABELS = {
  id: "ID",
  license_key: "Chave de licença",
  condominio_nome: "Nome do condomínio / cliente",
  cnpj: "CPF / CNPJ",
  pagador_nome: "Nome do pagador",
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
  created_at: "Criado em",
  updated_at: "Atualizado em",
};

const LICENSE_FIELD_HINTS = {
  license_key: "Gerada automaticamente (ex.: TRIG-2026-0001). O cliente usará no app.",
  cnpj: "CPF (11) ou CNPJ (14). PJ: Buscar CNPJ preenche endereço. PF: preencha nome e endereço manualmente.",
  pagador_nome: "Razão social (PJ) ou nome completo (PF). Usado no boleto/Pix do Inter.",
  pagador_endereco: "Logradouro do pagador na cobrança.",
  pagador_cidade: "Cidade do pagador.",
  pagador_uf: "UF com 2 letras.",
  pagador_cep: "Somente números (8 dígitos).",
  implantacao_paga:
    "Só muda após pagamento (Sync/webhook) ou Cortesia. App bloqueado enquanto for falso.",
  valido_ate:
    "Prepaid: +32 dias por pagamento, ou dias de Cortesia. Não alterar manualmente.",
  ativa: "Desligue para suspender o cliente. Não libera o app se a implantação ainda não foi paga.",
  device_id: "Preenchido quando o cliente ativa o app no celular.",
  ativada_em: "Preenchido quando o cliente ativa o app no celular.",
};

function normalizeDocDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

/** @deprecated use normalizeDocDigits */
function normalizeCnpjDigits(value) {
  return normalizeDocDigits(value);
}

function detectTipoPessoa(raw) {
  const digits = normalizeDocDigits(raw);
  if (digits.length === 11) return "FISICA";
  if (digits.length === 14) return "JURIDICA";
  return null;
}

function getFormTipoPessoa() {
  const checked = $("form-fields")?.querySelector('input[name="tipo_pessoa"]:checked');
  return checked?.value === "FISICA" ? "FISICA" : "JURIDICA";
}

function setFormTipoPessoa(tipo) {
  const value = tipo === "FISICA" ? "FISICA" : "JURIDICA";
  const radio = $("form-fields")?.querySelector(`input[name="tipo_pessoa"][value="${value}"]`);
  if (radio) radio.checked = true;
  syncTipoPessoaUi();
}

function syncTipoPessoaUi() {
  const tipo = getFormTipoPessoa();
  const isPf = tipo === "FISICA";
  const lookupBtn = $("form-fields")?.querySelector("[data-cnpj-lookup]");
  if (lookupBtn) {
    lookupBtn.hidden = isPf;
    lookupBtn.disabled = isPf;
  }
  const docInput = $("form-fields")?.querySelector('[data-column="cnpj"]');
  if (docInput) {
    docInput.placeholder = isPf ? "00000000000" : "00000000000000";
    docInput.maxLength = isPf ? 14 : 18;
  }
  const hint = $("form-fields")?.querySelector("[data-tipo-pessoa-hint]");
  if (hint) {
    hint.textContent = isPf
      ? "Pessoa física: preencha nome completo e endereço do pagador (não há consulta automática de CPF)."
      : "Pessoa jurídica: use Buscar CNPJ para preencher razão social e endereço pela Receita.";
  }
  const nomeLabel = $("form-fields")?.querySelector('[data-column="pagador_nome"]')
    ?.closest(".field")
    ?.querySelector(".field-label");
  if (nomeLabel) {
    nomeLabel.textContent = isPf ? "Nome do pagador (completo) *" : "Nome do pagador (razão social)";
  }
}

function buildTipoPessoaField(initialTipo) {
  const wrap = document.createElement("div");
  wrap.className = "field tipo-pessoa-field";
  const title = document.createElement("span");
  title.className = "field-label";
  title.textContent = "Tipo de pagador";
  wrap.appendChild(title);

  const row = document.createElement("div");
  row.className = "tipo-pessoa-row";
  [
    { value: "JURIDICA", label: "Pessoa jurídica (CNPJ)" },
    { value: "FISICA", label: "Pessoa física (CPF)" },
  ].forEach(({ value, label }) => {
    const lab = document.createElement("label");
    lab.className = "tipo-pessoa-option";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "tipo_pessoa";
    radio.value = value;
    radio.checked = value === initialTipo;
    radio.addEventListener("change", () => {
      syncTipoPessoaUi();
      const doc = $("form-fields")?.querySelector('[data-column="cnpj"]');
      if (doc && !doc.disabled) {
        const digits = normalizeDocDigits(doc.value);
        if (value === "FISICA" && digits.length === 14) doc.value = "";
        if (value === "JURIDICA" && digits.length === 11) doc.value = "";
      }
    });
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    row.appendChild(lab);
  });
  wrap.appendChild(row);

  const hint = document.createElement("small");
  hint.className = "field-hint";
  hint.dataset.tipoPessoaHint = "1";
  wrap.appendChild(hint);
  return wrap;
}

async function lookupCnpjAndFill(rawCnpj) {
  const digits = normalizeDocDigits(rawCnpj);
  if (digits.length !== 14) {
    setStatus($("form-status"), "Informe um CNPJ com 14 dígitos para buscar na Receita.", false);
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
  setFormTipoPessoa("JURIDICA");
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
  const paymentLocked =
    isLicensesTable() && Boolean(state.editingId) && LICENSE_PAYMENT_LOCKED_ON_EDIT.has(col.name);
  const disabled =
    licenseKeyLocked ||
    paymentLocked ||
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
    lookupBtn.dataset.cnpjLookup = "1";
    lookupBtn.disabled = disabled;
    lookupBtn.addEventListener("click", async () => {
      try {
        await lookupCnpjAndFill(input.value);
      } catch (err) {
        setStatus($("form-status"), err.message, false);
      }
    });
    input.addEventListener("input", () => {
      const tipo = detectTipoPessoa(input.value);
      if (tipo) setFormTipoPessoa(tipo);
    });
    input.addEventListener("blur", () => {
      const digits = normalizeDocDigits(input.value);
      if (digits.length === 14 && getFormTipoPessoa() === "JURIDICA") {
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
  updateSidebarVisibility();
}

function setAppsPanelVisible(visible) {
  $("apps-section").hidden = !visible;
  const btn = $("btn-toggle-apps");
  btn.setAttribute("aria-expanded", String(visible));
  updateSidebarVisibility();
}

function setConfigPanelVisible(visible) {
  $("config-section").hidden = !visible;
  const btn = $("btn-toggle-config");
  btn.setAttribute("aria-expanded", String(visible));
  updateSidebarVisibility();
}

function columnLabel(colName) {
  if (isLicensesTable() && LICENSE_FIELD_LABELS[colName]) {
    return LICENSE_FIELD_LABELS[colName];
  }
  return colName;
}

function updateWorkChrome() {
  const licenses = isLicensesTable();
  const btnNew = $("btn-new");
  const dataTitle = $("data-panel-title");
  const dataKicker = $("data-panel-kicker");
  const dataHint = $("data-panel-hint");
  const caption = $("data-table-caption");
  const workIntro = document.querySelector(".work-intro");

  if (btnNew) btnNew.textContent = licenses ? "Nova licença" : "Novo";
  if (dataTitle) {
    dataTitle.textContent = licenses
      ? "Licenças"
      : TABLE_LABELS[state.table] || state.table || "Dados";
  }
  if (dataKicker) {
    dataKicker.textContent = licenses ? "Cadastrar" : "Consulta avançada";
  }
  if (dataHint) {
    dataHint.innerHTML = licenses
      ? "Cadastro e status de cada cliente. Use <strong>Cobrar</strong> na linha para selecionar e emitir."
      : "Visualização direta da tabela no Supabase. Para cobrança de licenças, volte à tabela Licenças.";
  }
  if (caption) {
    caption.textContent = licenses
      ? "Lista de licenças"
      : `Registros da tabela ${state.table || ""}`;
  }
  if (workIntro) workIntro.hidden = !licenses;
}

function formatDisplayDate(value) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return String(value);
  return `${d}/${m}/${y}`;
}

function listColumns() {
  const all = state.schema?.columns?.map((c) => c.name) || Object.keys(state.rows[0] || {});
  if (!isLicensesTable()) return all;
  const present = new Set(all);
  return LICENSE_LIST_COLUMNS.filter((name) => present.has(name));
}

function updateLicenseSelectionUI() {
  const label = $("billing-selected-label");
  const title = $("billing-panel-title");
  const key = state.selectedLicenseKey;
  const name = state.selectedLicenseName;

  if (label) {
    if (!key) {
      label.textContent = "Nenhuma — use Cobrar na lista ou na agenda";
    } else if (name) {
      label.textContent = `${key} — ${name}`;
    } else {
      label.textContent = key;
    }
  }
  if (title) {
    if (!key) {
      title.textContent = "Cobranças da licença selecionada";
    } else if (name) {
      title.textContent = `Cobranças de ${key} — ${name}`;
    } else {
      title.textContent = `Cobranças de ${key}`;
    }
  }

  document.querySelectorAll("#data-table tbody tr[aria-selected]").forEach((tr) => {
    const selected = tr.dataset.licenseKey === key;
    tr.setAttribute("aria-selected", selected ? "true" : "false");
    tr.classList.toggle("row-selected", selected);
  });
}

function selectLicense(licenseKey, licenseName = "", { scroll = true } = {}) {
  const key = String(licenseKey || "").trim().toUpperCase();
  state.selectedLicenseKey = key;
  state.selectedLicenseName = String(licenseName || "").trim();
  if (key) {
    $("billing-license-key").value = key;
    if (!state.selectedLicenseName) {
      const row = state.rows.find((r) => String(r.license_key || "").toUpperCase() === key);
      if (row?.condominio_nome) state.selectedLicenseName = row.condominio_nome;
    }
  }
  updateLicenseSelectionUI();
  syncBillingValorField({ force: true });
  loadBillingCharges();
  if (scroll && key) {
    smoothScrollIntoView($("billing-panel"));
  }
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
  updateWorkChrome();

  if (!state.rows.length) {
    const emptyMsg = isLicensesTable()
      ? "Nenhuma licença cadastrada. Clique em <strong>Nova licença</strong> para o primeiro cliente."
      : `Nenhum registro em <strong>${state.table}</strong>. Clique em <strong>Novo</strong> para criar.`;
    setEmptyState(emptyMsg);
    return;
  }

  $("empty-state").hidden = true;

  const columns = listColumns();
  const pk = state.schema?.primary_key || "id";

  const headRow = document.createElement("tr");
  columns.forEach((col) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = columnLabel(col);
    th.title = col;
    headRow.appendChild(th);
  });
  const actionTh = document.createElement("th");
  actionTh.scope = "col";
  actionTh.textContent = "Ações";
  headRow.appendChild(actionTh);
  thead.appendChild(headRow);

  state.rows.forEach((row) => {
    const tr = document.createElement("tr");
    const licenseKey = row.license_key ? String(row.license_key) : "";
    if (isLicensesTable() && licenseKey) {
      tr.dataset.licenseKey = licenseKey.toUpperCase();
      tr.setAttribute("aria-selected", "false");
      tr.tabIndex = 0;
      tr.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        selectLicense(licenseKey, row.condominio_nome || "");
      });
      tr.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        selectLicense(licenseKey, row.condominio_nome || "");
      });
    }

    columns.forEach((col) => {
      const td = document.createElement("td");
      let text = displayValue(row[col]);
      if (col === "valido_ate" && row[col]) text = formatDisplayDate(row[col]);
      td.textContent = text;
      td.title = text;
      tr.appendChild(td);
    });
    const actions = document.createElement("td");
    actions.className = "row-actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Editar";
    if (licenseKey) editBtn.setAttribute("aria-label", `Editar ${licenseKey}`);
    editBtn.addEventListener("click", () => openModal("edit", row[pk], row));
    actions.appendChild(editBtn);
    if (isLicensesTable() && licenseKey) {
      const billBtn = document.createElement("button");
      billBtn.type = "button";
      billBtn.textContent = "Cobrar";
      billBtn.setAttribute("aria-label", `Cobrar ${licenseKey}`);
      billBtn.title = `Selecionar ${licenseKey} para cobrança`;
      billBtn.addEventListener("click", () => {
        selectLicense(licenseKey, row.condominio_nome || "");
        setStatus($("crud-status"), `Licença ${licenseKey} selecionada para cobrança.`);
      });
      actions.appendChild(billBtn);
    }
    tr.appendChild(actions);
    tbody.appendChild(tr);
  });

  wrap.hidden = false;
  updateLicenseSelectionUI();
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
  state.modalOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (mode === "edit" && isLicensesTable()) {
    $("modal-title").textContent = row.license_key
      ? `Editar licença ${row.license_key}`
      : `Editar licença #${id}`;
  } else if (mode === "edit") {
    $("modal-title").textContent = `Editar #${id}`;
  } else if (isLicensesTable()) {
    $("modal-title").textContent = "Nova licença (pré-cadastro)";
  } else {
    $("modal-title").textContent = "Novo registro";
  }
  $("btn-delete-modal").hidden = mode !== "edit";
  $("form-status").textContent = "";

  const draft = { ...row };
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
      ? "Escolha PF ou PJ. CNPJ busca endereço na Receita; CPF exige nome e endereço manuais."
      : "Informe CPF ou CNPJ do pagador. Endereço incompleto é resolvido na cobrança (PJ) ou deve estar na licença (PF).";
    intro.textContent = `Pré-cadastro: ${pagadorHint} A chave é gerada ao salvar.`;
    fields.appendChild(intro);
    try {
      const { license_key: nextKey } = await api("/api/licenses/next-key");
      intro.textContent = `Pré-cadastro (${nextKey}). ${pagadorHint} App bloqueado até o pagamento.`;
    } catch {
      // Preview opcional; o backend gera ao salvar.
    }
  }
  if (isLicensesTable()) {
    const detected = detectTipoPessoa(draft.cnpj) || "JURIDICA";
    fields.appendChild(buildTipoPessoaField(detected));
  }
  formColumns(mode).forEach((col) => {
    fields.appendChild(buildField(col, draft[col.name]));
  });
  if (isLicensesTable()) {
    syncTipoPessoaUi();
  }

  $("record-modal").showModal();
}

function restoreModalFocus() {
  const opener = state.modalOpener;
  state.modalOpener = null;
  if (opener && document.contains(opener) && typeof opener.focus === "function") {
    opener.focus();
  }
}

async function loadTables() {
  try {
    const { tables } = await api("/api/tables");
    const select = $("table-select");
    const current = select.value || "licenses";
    select.innerHTML = "";
    const preferred = ["licenses", "billing_charges"];
    const ordered = [
      ...preferred.filter((name) => tables.includes(name)),
      ...tables.filter((name) => !preferred.includes(name)),
    ];
    ordered.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = TABLE_LABELS[name] || name;
      select.appendChild(opt);
    });
    if (current && [...select.options].some((o) => o.value === current)) {
      select.value = current;
    } else if ([...select.options].some((o) => o.value === "licenses")) {
      select.value = "licenses";
    }
    if (!$("table-name").value.trim()) {
      $("table-name").value = select.value;
    }
  } catch {
    // credenciais ainda não configuradas
  }
}

async function tryOpenLicensesWorkspace() {
  const select = $("table-select");
  const hasLicenses = [...select.options].some((o) => o.value === "licenses");
  if (!hasLicenses) {
    setStatus(
      $("crud-status"),
      "Supabase conectado, mas a tabela licenses não foi encontrada. Verifique as migrations.",
      false,
    );
    return;
  }
  select.value = "licenses";
  $("table-name").value = "licenses";
  state.offset = 0;
  await loadData();
}

async function loadData() {
  const table = getTable();
  if (!isLikelyTableName(table)) {
    throw new Error(
      `"${table}" não é nome de tabela. Escolha Licenças ou billing_charges. Para uma licença, use Cobrar.`,
    );
  }

  const data = await api(
    `/api/tables/${encodeURIComponent(table)}?limit=${state.limit}&offset=${state.offset}`
  );
  state.table = table;
  $("table-name").value = table;
  if ([...$("table-select").options].some((o) => o.value === table)) {
    $("table-select").value = table;
  }
  state.schema = data.schema;
  state.rows = data.rows;
  state.total = data.total;
  renderTable();
  renderPagination();
  updateAppToolbar();
  updateBillingPanel();
  updateWorkChrome();
  const label = TABLE_LABELS[state.table] || state.table;
  setStatus($("crud-status"), `${data.rows.length} de ${data.total} registro(s) · ${label}.`);
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
      selectLicense(created.license_key, created.condominio_nome || "", { scroll: false });
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
      setStatus($("config-status"), "Supabase conectado. Carregando licenças…");
      setConfigPanelVisible(false);
      await loadTables();
      try {
        await tryOpenLicensesWorkspace();
      } catch (err) {
        setStatus($("crud-status"), err.message, false);
        setConfigPanelVisible(true);
        setStatus(
          $("config-status"),
          "Não foi possível carregar os dados. Confira a Service Role Key e clique em Salvar.",
          false,
        );
      }
    } else {
      if (config.url) $("supabase-url").value = config.url;
      setStatus(
        $("config-status"),
        "Informe a Service Role Key e clique em Salvar para continuar.",
        false,
      );
      setConfigPanelVisible(true);
    }
  } catch (err) {
    setStatus($("config-status"), err.message, false);
    setConfigPanelVisible(true);
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
    try {
      await tryOpenLicensesWorkspace();
      setConfigPanelVisible(false);
    } catch (err) {
      setStatus($("crud-status"), err.message, false);
    }
  } catch (err) {
    setStatus($("config-status"), err.message, false);
  }
});

$("btn-load").addEventListener("click", async () => {
  try {
    const advanced = $("advanced-tables");
    if (advanced && !advanced.open) advanced.open = true;
    const selected = ($("table-select")?.value || "").trim();
    const manual = ($("table-name")?.value || "").trim();
    if (manual && !isLikelyTableName(manual) && selected) {
      $("table-name").value = selected;
    }
    state.offset = 0;
    await loadData();
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
});

$("btn-refresh").addEventListener("click", async () => {
  try {
    state.offset = 0;
    if (!state.table || !isLikelyTableName(state.table)) {
      state.table = "licenses";
      $("table-select").value = "licenses";
      $("table-name").value = "licenses";
    }
    await loadData();
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
});

$("btn-new").addEventListener("click", async () => {
  try {
    await loadApps();
    const table = state.table || "licenses";
    if (!state.schema || state.table !== table) {
      state.table = table;
      const schema = await api(`/api/tables/${encodeURIComponent(state.table)}/schema`);
      state.schema = schema;
    }
    if (tableHasAppId() && !appIdList().length) {
      setStatus($("crud-status"), "Cadastre um app em Apps e preços antes de criar a licença.", false);
      openSidebarPanel("apps");
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

$("record-modal").addEventListener("close", () => {
  restoreModalFocus();
});

$("table-select").addEventListener("change", () => {
  $("table-name").value = $("table-select").value;
});

$("billing-license-key").addEventListener("change", () => {
  const key = $("billing-license-key").value.trim();
  if (!key) {
    state.selectedLicenseKey = "";
    state.selectedLicenseName = "";
    updateLicenseSelectionUI();
    syncBillingValorField({ force: true });
    return;
  }
  selectLicense(key, "", { scroll: false });
});

function isLicensesTable() {
  return state.table?.toLowerCase() === "licenses";
}

function findAppPricing(appId) {
  const id = String(appId || "").trim().toLowerCase();
  if (!id) return null;
  return state.apps.find((app) => app.app_id === id) || null;
}

function findScheduleItem(licenseKey) {
  const key = String(licenseKey || "").trim().toUpperCase();
  if (!key) return null;
  return (state.scheduleItems || []).find(
    (item) => String(item.license_key || "").toUpperCase() === key,
  ) || null;
}

function catalogValorForLicense(licenseKey) {
  const key = String(licenseKey || "").trim().toUpperCase();
  if (!key) return null;
  const schedule = findScheduleItem(key);
  if (schedule?.estimated_value != null && !schedule.open_charge) {
    return Number(schedule.estimated_value);
  }
  const row = state.rows.find((r) => String(r.license_key || "").toUpperCase() === key);
  if (!row) return schedule?.estimated_value != null ? Number(schedule.estimated_value) : null;
  const pricing = findAppPricing(row.app_id);
  if (!pricing) return schedule?.estimated_value != null ? Number(schedule.estimated_value) : null;
  if (!row.implantacao_paga) {
    return Math.round((Number(pricing.valor_implantacao) + Number(pricing.valor_mensalidade)) * 100) / 100;
  }
  return Math.round(Number(pricing.valor_mensalidade) * 100) / 100;
}

function formatMoneyInput(value) {
  if (value == null || Number.isNaN(Number(value))) return "";
  return Number(value).toFixed(2);
}

function syncBillingValorField({ force = false } = {}) {
  const input = $("billing-valor");
  const hint = $("billing-valor-hint");
  const resetBtn = $("btn-billing-valor-reset");
  if (!input) return;

  const key = getBillingLicenseKey();
  const schedule = findScheduleItem(key);
  const openCharge = schedule?.open_charge;
  const previousCatalog = state.billingCatalogValor;
  const catalog = catalogValorForLicense(key);
  const currentRaw = String(input.value || "").trim();
  const matchesPreviousCatalog =
    previousCatalog != null && currentRaw === formatMoneyInput(previousCatalog);
  state.billingCatalogValor = catalog;

  if (openCharge?.valor_nominal != null) {
    state.billingValorLocked = true;
    input.value = formatMoneyInput(openCharge.valor_nominal);
    input.readOnly = true;
    input.title = "Título já emitido no Inter — valor fixo. Cancele e reemita para alterar.";
    if (resetBtn) resetBtn.disabled = true;
    if (hint) {
      hint.hidden = false;
      hint.textContent =
        "Há cobrança EMITIDA em aberto: valor bloqueado. Use Sync/Cancelar na lista de cobranças.";
    }
    return;
  }

  state.billingValorLocked = false;
  input.readOnly = false;
  input.title = "Valor desta emissão. Editável enquanto o título ainda não foi emitido.";
  if (resetBtn) resetBtn.disabled = !key || catalog == null;
  // Preserva edição manual no refresh; force ao trocar de licença.
  if (catalog != null && (force || !currentRaw || matchesPreviousCatalog)) {
    input.value = formatMoneyInput(catalog);
  } else if (!key) {
    input.value = "";
  }
  if (hint) {
    if (!key) {
      hint.hidden = true;
      hint.textContent = "";
    } else if (catalog != null) {
      hint.hidden = false;
      hint.textContent = `Sugestão do app: R$ ${formatMoneyInput(catalog)}. Altere se esta emissão for diferente.`;
    } else {
      hint.hidden = false;
      hint.textContent = "Sem preço do app — informe o valor ou cadastre o app em Apps e preços.";
    }
  }
}

function readBillingValorForEmit() {
  if (state.billingValorLocked) {
    throw new Error(
      "Já existe título emitido em aberto. Cancele no Inter (ou aguarde o pagamento) antes de emitir outro.",
    );
  }
  const raw = String($("billing-valor")?.value || "").trim().replace(",", ".");
  if (!raw) return null;
  const valor = Number(raw);
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error("Informe um valor válido maior que zero.");
  }
  return Math.round(valor * 100) / 100;
}

function resetBillingValorToCatalog() {
  if (state.billingValorLocked) return;
  const catalog = state.billingCatalogValor ?? catalogValorForLicense(getBillingLicenseKey());
  const input = $("billing-valor");
  if (!input) return;
  if (catalog == null) {
    setStatus($("crud-status"), "Não há valor padrão do app para esta licença.", false);
    return;
  }
  input.value = formatMoneyInput(catalog);
  setStatus($("crud-status"), `Valor restaurado para o padrão do app (R$ ${formatMoneyInput(catalog)}).`);
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
    state.scheduleItems = data.items || [];
    renderScheduleSummary(data.summary || {});
    renderScheduleTable(state.scheduleItems);
    syncBillingValorField();
  } catch (err) {
    state.scheduleItems = [];
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

function createScheduleActionButton(label, onClick, ariaLabel = "") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ghost";
  btn.textContent = label;
  if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
  btn.addEventListener("click", onClick);
  return btn;
}

function focusLicenseBilling(licenseKey) {
  const row = state.rows.find((r) => String(r.license_key || "").toUpperCase() === String(licenseKey).toUpperCase());
  selectLicense(licenseKey, row?.condominio_nome || "");
}

async function emitBillingForKey(licenseKey, type, { useToolbarValor = false } = {}) {
  const path = type === "initial" ? "/api/billing/charges/initial" : "/api/billing/charges/monthly";
  const body = { license_key: licenseKey };
  if (useToolbarValor) {
    const valor = readBillingValorForEmit();
    if (valor != null) body.valor_nominal = valor;
  }
  await api(path, { method: "POST", body: JSON.stringify(body) });
  const valorMsg = body.valor_nominal != null ? ` (R$ ${Number(body.valor_nominal).toFixed(2)})` : "";
  setStatus(
    $("crud-status"),
    `Cobrança ${type === "initial" ? "inicial" : "mensal"} emitida para ${licenseKey}${valorMsg}.`,
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
    const keyBtn = createScheduleActionButton(
      item.license_key,
      () => focusLicenseBilling(item.license_key),
      `Selecionar licença ${item.license_key}`,
    );
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
  if (state.selectedLicenseKey) return state.selectedLicenseKey;
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
    td.textContent = "Nenhuma cobrança emitida para esta licença.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  charges.forEach((c) => {
    const tr = document.createElement("tr");
    const typeKey = String(c.charge_type || "").toUpperCase();
    const statusKey = String(c.status || "").toUpperCase();
    const cols = [
      CHARGE_TYPE_LABELS[typeKey] || c.charge_type,
      `R$ ${Number(c.valor_nominal).toFixed(2)}`,
      formatDisplayDate(c.data_vencimento),
      CHARGE_STATUS_LABELS[statusKey] || c.status,
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
    syncBtn.title = "Consultar pagamento no Inter e atualizar a licença";
    syncBtn.addEventListener("click", async () => {
      try {
        await api(`/api/billing/charges/${encodeURIComponent(c.id)}/sync`, { method: "POST" });
        await loadBillingSchedule();
        await loadBillingCharges();
        await loadData();
        setStatus($("crud-status"), "Sync concluído.");
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
      pdfBtn.title = "Abrir boleto em PDF";
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
      pixBtn.title = "Copiar Pix copia e cola";
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
    setStatus(
      $("crud-status"),
      "Selecione uma licença na agenda/lista ou digite a chave antes de emitir.",
      false,
    );
    return;
  }
  try {
    await emitBillingForKey(licenseKey, type, { useToolbarValor: true });
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
}

function readCourtesyDays() {
  const raw = String($("billing-courtesy-days")?.value || "").trim();
  const days = Number.parseInt(raw, 10);
  if (!Number.isFinite(days) || days < 1 || days > 90) {
    throw new Error("Informe entre 1 e 90 dias de cortesia.");
  }
  return days;
}

function formatDateBrFromIso(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
}

async function grantCourtesy() {
  const licenseKey = getBillingLicenseKey();
  if (!licenseKey) {
    setStatus(
      $("crud-status"),
      "Selecione uma licença na agenda/lista ou digite a chave antes da cortesia.",
      false,
    );
    return;
  }
  const days = readCourtesyDays();
  const motivo = String($("billing-courtesy-motivo")?.value || "").trim();
  const row = state.rows.find((r) => String(r.license_key || "").toUpperCase() === licenseKey);
  const implantacaoJa = Boolean(row?.implantacao_paga);
  const avisoImplantacao = implantacaoJa
    ? ""
    : "\n\nA implantação será liberada (implantacao_paga=true). Depois, renovação comercial = Mensalidade.";
  const ok = window.confirm(
    `Gerar cortesia de ${days} dia(s) para ${licenseKey}?` +
      `\n\nO app será liberado sem cobrança Inter. A validade empilha se ainda estiver vigente.` +
      avisoImplantacao +
      (motivo ? `\n\nMotivo: ${motivo}` : ""),
  );
  if (!ok) return;

  const body = { license_key: licenseKey, days };
  if (motivo) body.motivo = motivo;
  const result = await api("/api/billing/licenses/courtesy", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const ate = formatDateBrFromIso(result.valido_ate);
  setStatus(
    $("crud-status"),
    `Cortesia de ${result.days} dia(s) aplicada em ${licenseKey} → válido até ${ate}.`,
  );
  if ($("billing-courtesy-motivo")) $("billing-courtesy-motivo").value = "";
  await loadBillingSchedule();
  await loadBillingCharges();
  await loadData();
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
    const urlDisplay = $("inter-webhook-url-display");
    const debug = $("inter-webhook-debug");
    const jsonEl = $("inter-webhook-info");
    if (info.callback_url) {
      urlDisplay.hidden = false;
      urlDisplay.textContent = `URL de callback: ${info.callback_url}`;
      const tokenMatch = info.callback_url.match(/token=([^&]+)/);
      if (tokenMatch) setInputValue("inter-webhook-token", decodeURIComponent(tokenMatch[1]));
    } else {
      urlDisplay.hidden = false;
      urlDisplay.textContent = "Webhook ainda sem URL de callback configurada.";
    }
    debug.hidden = false;
    jsonEl.textContent = JSON.stringify(info, null, 2);
    setStatus($("inter-status"), "Webhook carregado.");
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

$("btn-billing-courtesy")?.addEventListener("click", async () => {
  try {
    await grantCourtesy();
  } catch (err) {
    setStatus($("crud-status"), err.message, false);
  }
});

$("btn-billing-valor-reset")?.addEventListener("click", () => {
  resetBillingValorToCatalog();
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
