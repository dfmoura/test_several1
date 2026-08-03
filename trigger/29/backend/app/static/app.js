const $ = (id) => document.getElementById(id);

let catalog = null;
let facas = [];
let facasMeta = {};
let selectedFaca = null;
let buscaTimer = null;
let lastData = null;
let lastBody = null;

async function loadCatalog() {
  const res = await fetch("/api/catalog");
  catalog = await res.json();
  fillSelect($("cores"), catalog.cores);
  fillSelect($("papel"), Object.keys(catalog.papel));
  fillSelect(
    $("acabamento"),
    Object.keys(catalog.acabamentos).filter((k) => k !== "REBOBINAÇÃO")
  );
  fillSelect($("maquina"), catalog.maquinas);
  fillSelect($("maquina_roda_servico"), catalog.maquinas_roda_servico || []);
  fillSelect($("tipo_troca_produto"), Object.keys(catalog.hora_parada));
  $("cores").value = "5";
  $("papel").value = "BOPP PRATA BXT";
  $("acabamento").value = "VERNIZ";
  $("maquina").value = "MODULAR";
  $("maquina_roda_servico").value = "MODULAR";
  $("tipo_troca_produto").value = "PRETO INTEIRO";
  $("ov_papel").placeholder = String(catalog.papel["BOPP PRATA BXT"] ?? "");
  $("ov_tinta").placeholder = String(catalog.tinta_acima_m2);
  renderMaquinaLegenda();
  const maqSel = $("faca_filtro_maq");
  if (maqSel) {
    maqSel.innerHTML =
      '<option value="">Todas</option>' +
      catalog.maquinas.map((m) => `<option value="${m}">${maquinaLabel(m)}</option>`).join("");
  }
}

async function loadFacas() {
  const q = ($("faca_busca")?.value || "").trim();
  const maq = $("faca_filtro_maq")?.value || "";
  const fmt = $("faca_filtro_fmt")?.value || "";
  const so = $("faca_so_completas")?.checked ? "true" : "false";
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (maq) params.set("maquina", maq);
  if (fmt) params.set("formato", fmt);
  params.set("so_completas", so);
  const res = await fetch(`/api/facas?${params}`);
  const data = await res.json();
  facas = data.items || [];
  facasMeta = data.meta || {};

  // Preenche filtros de formato (uma vez / quando lista muda)
  const fmtSel = $("faca_filtro_fmt");
  if (fmtSel && data.formatos) {
    const cur = fmtSel.value;
    const opts = ['<option value="">Todos</option>'].concat(
      data.formatos.map((f) => `<option value="${esc(f)}">${esc(f)}</option>`)
    );
    fmtSel.innerHTML = opts.join("");
    if (cur) fmtSel.value = cur;
  }
  const maqSel = $("faca_filtro_maq");
  if (maqSel && catalog?.maquinas && maqSel.options.length <= 1) {
    maqSel.innerHTML =
      '<option value="">Todas</option>' +
      catalog.maquinas.map((m) => `<option value="${m}">${maquinaLabel(m)}</option>`).join("");
  }

  renderFacaTable();
  const nInc = facas.filter((f) => !f.completa).length;
  $("faca-hint").textContent =
    `${data.total} faca(s)` +
    (q || maq || fmt ? " com filtro" : "") +
    (nInc ? ` · ${nInc} incompleta(s) — puxada/Z manuais` : "") +
    " · clique na linha para selecionar";
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function fmtNum(v, d = 4) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("pt-BR", { maximumFractionDigits: d });
}

function renderFacaTable() {
  const tb = $("faca_tbody");
  if (!tb) return;
  if (!facas.length) {
    tb.innerHTML = `<tr><td colspan="7" class="faca-empty">Nenhuma faca neste filtro.</td></tr>`;
    return;
  }
  tb.innerHTML = facas
    .map((f) => {
      const sel = selectedFaca && selectedFaca.id === f.id ? " selected" : "";
      const inc = f.completa ? "" : " incompleta";
      const med = f.tamanho_tipo === "diametro"
        ? `<span class="badge-diam">${esc(f.medida)}</span>`
        : esc(f.medida || "—");
      const pux = f.puxada != null ? fmtNum(f.puxada) : '<em class="warn-txt">manual</em>';
      const nota = f.cliente_nota || f.fornecedor || "";
      return `<tr class="faca-row${sel}${inc}" data-id="${f.id}" title="${esc(f.label)}">
        <td class="medida">${med}</td>
        <td>${esc(f.formato || f.faca || "—")}</td>
        <td>${esc(f.maquina_catalogo || "")}</td>
        <td class="num">${f.z != null ? fmtNum(f.z, 0) : "—"}</td>
        <td class="num">${f.repeticao != null ? fmtNum(f.repeticao, 4) : "—"}</td>
        <td class="num">${pux}</td>
        <td class="nota">${esc(nota)}</td>
      </tr>`;
    })
    .join("");

  tb.querySelectorAll("tr.faca-row").forEach((tr) => {
    tr.onclick = () => {
      const id = Number(tr.dataset.id);
      const f = facas.find((x) => x.id === id);
      applyFaca(f);
      renderFacaTable();
      closeFacaModal();
    };
  });
}

function maquinaLabel(codigo) {
  const nomes = {
    BETA: "BETA (Betaflex)",
    160: "160 (Reflexo 160)",
    250: "250 (Reflexo 250)",
    ETIRAMA: "ETIRAMA",
    BATIDA: "BATIDA",
    MODULAR: "MODULAR (Modular SPX)",
  };
  return nomes[codigo] || codigo;
}

function renderMaquinaLegenda() {
  const el = $("maq-legenda");
  if (!el || !catalog) return;
  el.textContent =
    "Códigos: BETA←Betaflex · 160←Reflexo 160 · 250←Reflexo 250 · ETIRAMA · BATIDA · MODULAR←Modular SPX. " +
    "No Excel, BETA/160/250/ETIRAMA compartilham a mesma tabela de R$/h; no sistema cada máquina é escolhida à parte.";
}

function setPuxadaEditable(editavel) {
  const el = $("puxada_cm");
  const z = $("z");
  const note = $("puxada-note");
  if (editavel) {
    el.readOnly = false;
    z.readOnly = false;
    el.classList.add("manual");
    z.classList.add("manual");
    if (note) note.textContent = "Dado incompleto no mapa — preencha puxada (e Z se preciso) manualmente";
  } else {
    el.readOnly = true;
    z.readOnly = true;
    el.classList.remove("manual");
    z.classList.remove("manual");
    if (note) note.textContent = "Automático do mapa (PUXADA) · só leitura";
  }
}

function renderFacaSummary(f) {
  const title = $("faca_summary_title");
  const meta = $("faca_summary_meta");
  const chips = $("faca_chips");
  const btn = $("btn_abrir_mapa");
  if (!title) return;

  if (!f) {
    title.textContent = "Nenhuma faca selecionada";
    meta.textContent = "Abra o mapa para escolher medida, formato e máquina.";
    chips.hidden = true;
    chips.innerHTML = "";
    if (btn) btn.textContent = "Buscar faca no mapa";
    return;
  }

  const medHtml =
    f.tamanho_tipo === "diametro"
      ? `<span class="badge-diam">${esc(f.medida)}</span>`
      : esc(f.medida || "—");
  title.innerHTML = medHtml;

  const parts = [];
  if (f.formato) parts.push(f.formato);
  if (f.maquina_catalogo) parts.push(maquinaLabel(f.maquina_catalogo));
  if (f.cliente_nota) parts.push(f.cliente_nota);
  if (f.tamanho_tipo === "diametro") parts.push("diâmetro (Ø)");
  parts.push(f.completa ? "dados completos" : "puxada/Z manuais na planilha");
  meta.textContent = parts.join(" · ");

  const chip = (label, value, warn = false) =>
    `<div class="faca-chip${warn ? " warn" : ""}"><span>${esc(label)}</span>${value}</div>`;

  chips.hidden = false;
  chips.innerHTML = [
    chip("Z", f.z != null ? fmtNum(f.z, 0) : "—"),
    chip("REP", f.repeticao != null ? fmtNum(f.repeticao, 4) : "—"),
    chip(
      "Puxada",
      f.puxada != null ? `${fmtNum(f.puxada)} cm` : "manual",
      f.puxada == null
    ),
    chip("Máq.", esc(f.maquina_catalogo || "—")),
  ].join("");

  if (btn) btn.textContent = "Trocar faca";
}

function openFacaModal() {
  const modal = $("faca_modal");
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("faca-modal-open");
  loadFacas().then(() => {
    const busca = $("faca_busca");
    if (busca) {
      busca.focus();
      busca.select?.();
    }
  });
}

function closeFacaModal() {
  const modal = $("faca_modal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("faca-modal-open");
}

function applyFaca(f) {
  if (!f) return;
  selectedFaca = f;
  $("medida").value = f.medida || "";
  $("puxada_cm").value = f.puxada ?? "";
  $("z").value = f.z ?? "";
  $("faca").value = f.formato || f.faca || "";
  $("repeticao").value = f.repeticao ?? "";
  const maq = f.maquina_catalogo || "";
  const origem = f.maquina_origem ? ` (mapa: ${f.maquina_origem})` : "";
  $("maquina_catalogo").value = maq ? `${maq}${origem}` : "";

  setPuxadaEditable(!f.completa || f.puxada == null);
  renderFacaSummary(f);

  if (maq && catalog?.maquinas_roda_servico?.includes(maq)) {
    $("maquina_roda_servico").value = maq;
  }
  if (maq && catalog?.maquinas?.includes(maq)) {
    $("maquina").value = maq;
  }
}

function fillSelect(el, items) {
  el.innerHTML = items.map((v) => `<option value="${v}">${v}</option>`).join("");
}


function addFaixa(q = "", com = 0) {
  const wrap = $("faixas");
  const row = document.createElement("div");
  row.className = "faixa";
  row.innerHTML = `
    <label>Quantidade <input class="q" type="number" value="${q}" /></label>
    <label>% Comissão <input class="c" type="number" step="0.1" value="${com}" /></label>
    <button type="button" class="danger">remover</button>
  `;
  row.querySelector("button").onclick = () => row.remove();
  wrap.appendChild(row);
}

function readFaixas() {
  return [...document.querySelectorAll("#faixas .faixa")]
    .map((row) => ({
      quantidade: Number(row.querySelector(".q").value),
      comissao_pct: Number(row.querySelector(".c").value || 0),
    }))
    .filter((f) => f.quantidade > 0);
}

function payload() {
  if (!$("medida").value) {
    throw new Error("Selecione uma faca/medida no mapa de facas.");
  }
  if (!$("puxada_cm").value) {
    throw new Error(
      "Puxada máquina vazia. No mapa oficial este dado às vezes é manual — preencha a puxada (cm)."
    );
  }
  const papel = $("papel").value;
  const overrides = {};
  if ($("ov_papel").value !== "") {
    overrides.papel = { [papel]: Number($("ov_papel").value) };
  }
  if ($("ov_tinta").value !== "") {
    overrides.tinta_acima_m2 = Number($("ov_tinta").value);
  }
  let cores = $("cores").value;
  if (cores !== "4V") cores = Number(cores);

  const repRaw = $("repeticao").value;
  return {
    cliente: $("cliente").value,
    medida: $("medida").value,
    largura_cm: Number($("largura_cm").value),
    puxada_cm: Number($("puxada_cm").value),
    cores,
    papel,
    acabamento: $("acabamento").value,
    modelos: Number($("modelos").value),
    colunas: Number($("colunas").value),
    etiq_por_rolo: Number($("etiq_por_rolo").value),
    tubete: $("tubete").value,
    z: Number($("z").value),
    faca: $("faca").value,
    repeticao: repRaw === "" || repRaw == null ? null : Number(repRaw),
    maquina: $("maquina").value,
    maquina_roda_servico: $("maquina_roda_servico").value,
    imposto_pct: Number($("imposto_pct").value),
    matriz: $("matriz").value,
    coluna_rebobinacao: Number($("coluna_rebobinacao").value),
    tipo_troca_produto: $("tipo_troca_produto").value,
    rpm: Number($("rpm").value),
    faixas: readFaixas(),
    overrides: Object.keys(overrides).length ? overrides : null,
    matriz_ja_cobrada: $("matriz_ja_cobrada").checked,
    prazo_entrega: $("prazo_entrega").value,
    validade_proposta: $("validade_proposta").value,
    tolerancia_qtd_pct: Number($("tolerancia_qtd_pct").value),
  };
}

function money(n) {
  return Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function num(n, d = 4) {
  if (n === null || n === undefined || n === "") return "—";
  const x = Number(n);
  if (Number.isInteger(x)) return x.toLocaleString("pt-BR");
  return x.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
}

function hora(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function renderResult(data, body) {
  const box = $("resultado");
  box.hidden = false;
  lastData = data;
  lastBody = body;

  const st = $("matriz-status");
  if (data.cobra_matriz) {
    st.className = "status ok";
    st.textContent = `Matriz SIM — cobrada neste pedido: ${money(data.valor_matriz)} · chave ${data.chave_matriz.slice(0, 8)}…`;
  } else {
    st.className = "status warn";
    st.textContent = "Matriz não cobrada (já utilizada ou desligada)";
  }

  const troca = body.tipo_troca_produto || "—";

  $("tbl-calc").querySelector("tbody").innerHTML = data.faixas
    .map(
      (f) => `<tr>
      <td class="num">${num(f.quantidade, 0)}</td>
      <td>${troca}</td>
      <td class="num">${hora(f.hora_maq)}</td>
      <td class="num">${hora(f.hora_troca_prod)}</td>
      <td class="num">${f.hora_troca_bobina ? hora(f.hora_troca_bobina) : "—"}</td>
      <td class="num ${f.metragem < 1000 ? "muted-cell" : ""}">${num(f.metragem, 4)}</td>
      <td class="num">${num(f.m2, 1)}</td>
      <td class="num">${num(f.perda_acerto, 2)}</td>
      <td class="num">${num(f.perda_acabamento, 2)}</td>
      <td class="num">${num(f.perda_papel_troca_produto, 2)}</td>
      <td class="num">${num(f.perda_bobina_m2, 4)}</td>
      <td class="num">${num(f.rolos, 2)}</td>
      <td class="num">${num(f.qtde_caixas, 0)}</td>
      <td class="num muted-cell">${esc(f.caixa_medida || "—")}<br><small>${num(f.rolos_por_caixa, 0)} rolos/cx</small></td>
      <td class="num">${data.cobra_matriz ? money(data.valor_matriz) : "—"}</td>
    </tr>`
    )
    .join("");

  $("tbl-custos").querySelector("tbody").innerHTML = data.faixas
    .map(
      (f) => `<tr>
      <td class="num">${num(f.quantidade, 0)}</td>
      <td class="num">${money(f.valor_papel)}</td>
      <td class="num">${money(f.valor_maquina)}</td>
      <td class="num">${money(f.valor_troca_produto)}</td>
      <td class="num">${money(f.valor_troca_bobina)}</td>
      <td class="num">${money(f.valor_papel_troca_produto)}</td>
      <td class="num">${money(f.valor_tinta)}</td>
      <td class="num">${money(f.valor_acabamento)}</td>
      <td class="num">${money(f.valor_rebobinacao)}</td>
      <td class="num">${money(f.valor_tubete)}</td>
      <td class="num">${money(f.valor_caixa)}</td>
      <td class="num strong">${money(f.valor_servico)}</td>
    </tr>`
    )
    .join("");

  $("tbl-totais").querySelector("tbody").innerHTML = data.faixas
    .map((f, i) => {
      const pct = body.faixas[i]?.comissao_pct ?? 0;
      return `<tr>
      <td class="num">${num(pct, 2)}</td>
      <td class="num">${money(f.comissao)}</td>
      <td class="num">${money(f.imposto)}</td>
      <td class="num">${money(f.base)}</td>
      <td class="num">${num(f.quantidade, 0)}</td>
      <td class="num strong">${money(f.valor_etiqueta)}</td>
      <td class="num">${money(f.valor_matriz)}</td>
      <td class="num total">${money(f.valor_total)}</td>
    </tr>`;
    })
    .join("");

  const etiqRolo = body.etiq_por_rolo;
  $("tbl-proposta").querySelector("tbody").innerHTML = data.faixas
    .map((f) => {
      const total = f.valor_etiqueta;
      const unit = f.quantidade ? total / f.quantidade : 0;
      const rolos = f.rolos;
      const valorRolo = rolos ? total / rolos : 0;
      return `<tr>
        <td>${body.papel}</td>
        <td>${body.acabamento}</td>
        <td class="num">${num(etiqRolo, 0)}</td>
        <td class="num">${num(rolos, 2)}</td>
        <td class="num">${num(f.quantidade, 0)}</td>
        <td class="num strong">${money(total)}</td>
        <td class="num">${money(unit)}</td>
        <td class="num">${money(valorRolo)}</td>
      </tr>`;
    })
    .join("");

  renderInsumos(data, body);

  $("proposta-box").innerHTML = `
    <div class="prop-grid">
      <div><span>Cliente</span><strong>${body.cliente}</strong></div>
      <div><span>Medida (mapa)</span><strong>${body.medida}</strong></div>
      <div><span>Puxada / Z / REP</span><strong>${body.puxada_cm} · Z ${body.z} · REP ${body.repeticao}</strong></div>
      <div><span>Faca</span><strong>${body.faca || "—"}</strong></div>
      <div><span>Cores</span><strong>${body.cores}</strong></div>
      <div><span>Máq. roda serviço (F10)</span><strong>${body.maquina_roda_servico || "—"}</strong></div>
      <div><span>Máq. custo (G10)</span><strong>${body.maquina}</strong></div>
      <div><span>Valor da matriz</span><strong>${money(data.valor_matriz)}</strong>
        <em class="note">${data.cobra_matriz ? "incluída em todas as faixas · cobrada neste pedido" : "não cobrada neste pedido"}</em></div>
      <div><span>Prazo de entrega</span><strong>${body.prazo_entrega}</strong></div>
      <div><span>Validade da proposta</span><strong>${body.validade_proposta}</strong></div>
      <div class="full"><span>Tolerância</span>
        <strong>As quantidades poderão variar ±${body.tolerancia_qtd_pct}% e serão faturadas ao cliente.</strong>
      </div>
    </div>
  `;

  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ——— Página 2 do relatório: insumos e quantidades ———
   Mesmos números do motor (R1–R20): consumo de impressão, perdas,
   tinta, acabamento, tubetes, caixas e matriz — por faixa de qtde. */

function renderInsumos(data, body) {
  const box = $("insumos");
  if (!box) return;
  box.hidden = false;

  const faixas = data.faixas || [];
  const f0 = faixas[0] || {};
  const cores = esc(String(body.cores));

  $("tbl-insumos").querySelector("thead").innerHTML = `<tr>
    <th class="ins-col-nome">Insumo</th>
    <th>Especificação</th>
    <th>Unid.</th>
    ${faixas
      .map((f) => `<th class="num">Qtde ${num(f.quantidade, 0)}</th>`)
      .join("")}
  </tr>`;

  const papelTotal = (f) =>
    Number(f.m2) +
    Number(f.perda_acerto) +
    Number(f.perda_papel_troca_produto) +
    Number(f.perda_bobina_m2);

  const linhas = [
    {
      nome: `Papel ${esc(body.papel)}`,
      spec: "Consumo de impressão (líquido)",
      un: "m²",
      val: (f) => num(f.m2, 2),
    },
    {
      nome: "Equivalente linear do consumo",
      spec: `${num(body.colunas, 0)} coluna(s) de impressão`,
      un: "m",
      val: (f) => num(f.metragem, 2),
      sub: true,
    },
    {
      nome: "Perda de acerto (setup de cores)",
      spec: `${cores} cor(es)`,
      un: "m²",
      val: (f) => num(f.perda_acerto, 2),
      sub: true,
    },
    {
      nome: "Perda de troca de produto",
      spec: `${num(body.modelos, 0)} modelo(s)`,
      un: "m²",
      val: (f) => num(f.perda_papel_troca_produto, 2),
      sub: true,
    },
    {
      nome: "Perda de troca de bobina",
      spec: "só se metragem ≥ 1000 m",
      un: "m²",
      val: (f) => num(f.perda_bobina_m2, 2),
      sub: true,
    },
    {
      nome: `Papel ${esc(body.papel)} — total a utilizar`,
      spec: "Consumo + perdas",
      un: "m²",
      val: (f) => num(papelTotal(f), 2),
      total: true,
    },
    {
      nome: "Tinta flexográfica",
      spec: `${cores} cor(es) · área de cobertura`,
      un: "m²",
      val: (f) => num(Number(f.m2) + Number(f.perda_acerto), 2),
    },
    {
      nome: `Acabamento ${esc(body.acabamento)}`,
      spec: "Área aplicada (consumo + perdas)",
      un: "m²",
      val: (f) =>
        num(
          Number(f.m2) + Number(f.perda_acerto) + Number(f.perda_acabamento),
          2
        ),
    },
    {
      nome: `Tubete ${esc(body.tubete)}`,
      spec: `1 por rolo · ${num(body.etiq_por_rolo, 0)} etiq/rolo`,
      un: "un",
      val: (f) => num(f.rolos, 2),
    },
    {
      nome: "Caixa de embalagem",
      spec: `${esc(f0.caixa_medida || "—")} · ${num(f0.rolos_por_caixa, 0)} rolos/cx`,
      un: "un",
      val: (f) => num(f.qtde_caixas, 0),
    },
    {
      nome: "Matriz (clichê)",
      spec: data.cobra_matriz
        ? `${cores} cor(es) · cobrada neste pedido`
        : "não cobrada neste pedido",
      un: "jogo",
      val: () => (data.cobra_matriz ? "1" : "—"),
    },
  ];

  $("tbl-insumos").querySelector("tbody").innerHTML = linhas
    .map(
      (l) => `<tr${l.total ? ' class="ins-total"' : ""}>
      <td class="${l.sub ? "ins-sub" : "ins-nome"}">${l.nome}</td>
      <td class="ins-spec">${l.spec}</td>
      <td>${l.un}</td>
      ${faixas
        .map((f) => `<td class="num${l.total ? " strong" : ""}">${l.val(f)}</td>`)
        .join("")}
    </tr>`
    )
    .join("");
}

/* ——— Relatório da tela (PDF em paisagem, 1 página) ——— */

// Área útil de uma A4 paisagem (297×210 mm) com margens de 8 mm, em px CSS (96 dpi)
const PRINT_PAGE_W = ((297 - 16) / 25.4) * 96; // ≈ 1062 px
const PRINT_PAGE_H = ((210 - 16) / 25.4) * 96; // ≈ 733 px
const PRINT_HEADER_H = 78; // cabeçalho do relatório (só existe na impressão)

function buildPrintMeta() {
  const now = new Date();
  const dataHora =
    now.toLocaleDateString("pt-BR") +
    " " +
    now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const item = (label, value) =>
    `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  const metaHtml = [
    item("Cliente", lastBody.cliente || "—"),
    item("Medida", lastBody.medida || "—"),
    item("Papel", lastBody.papel || "—"),
    item("Cores", lastBody.cores),
    item("Acabamento", lastBody.acabamento || "—"),
    item("Máq. custo", lastBody.maquina || "—"),
    item("Emissão", dataHora),
  ].join("");
  $("print-meta").innerHTML = metaHtml;
  const metaInsumos = $("print-meta-insumos");
  if (metaInsumos) metaInsumos.innerHTML = metaHtml;
}

// Cada página do relatório tem escala própria: medir só a seção evita que
// a página 2 (insumos) interfira no ajuste da página 1 e vice-versa.
function fitSectionToOnePage(el, scaleVar) {
  if (!el || el.hidden) return;
  el.style.removeProperty(scaleVar);

  // Largura necessária: a tabela mais larga (na tela elas rolam; no papel não podem)
  const widest = Math.max(
    el.scrollWidth,
    ...[...el.querySelectorAll(".sheet-table")].map((t) => t.scrollWidth)
  );
  const needed_h = el.scrollHeight + PRINT_HEADER_H;

  const scale = Math.min(PRINT_PAGE_W / widest, PRINT_PAGE_H / needed_h, 1);
  // Piso de segurança para nunca gerar texto ilegível por erro de medição
  el.style.setProperty(scaleVar, String(Math.max(scale, 0.3).toFixed(4)));
}

function fitReportToOnePage() {
  fitSectionToOnePage($("resultado"), "--print-scale");
  fitSectionToOnePage($("insumos"), "--print-scale-insumos");
}

$("btn-print").onclick = () => {
  if (!lastData || !lastBody) {
    return alert("Calcule um orçamento antes de gerar o relatório.");
  }
  buildPrintMeta();
  fitReportToOnePage();

  const oldTitle = document.title;
  const cliente = (lastBody.cliente || "cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w-]+/g, "_");
  const stamp = new Date().toISOString().slice(0, 10);
  document.title = `Relatorio_Orcamento_${cliente}_${stamp}`;
  window.print();
  document.title = oldTitle;
};

function reloadFacasSoon() {
  clearTimeout(buscaTimer);
  buscaTimer = setTimeout(() => loadFacas(), 200);
}

$("faca_busca")?.addEventListener("input", reloadFacasSoon);
$("faca_filtro_maq")?.addEventListener("change", () => loadFacas());
$("faca_filtro_fmt")?.addEventListener("change", () => loadFacas());
$("faca_so_completas")?.addEventListener("change", () => loadFacas());

$("btn_abrir_mapa")?.addEventListener("click", openFacaModal);
$("btn_fechar_mapa")?.addEventListener("click", closeFacaModal);
$("faca_modal_backdrop")?.addEventListener("click", closeFacaModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("faca_modal") && !$("faca_modal").hidden) {
    closeFacaModal();
  }
});

$("btn_tog_legenda")?.addEventListener("click", () => {
  const el = $("maq-legenda");
  if (!el) return;
  el.hidden = !el.hidden;
  $("btn_tog_legenda").textContent = el.hidden
    ? "Sobre códigos de máquina"
    : "Ocultar códigos de máquina";
});

$("add-faixa").onclick = () => addFaixa();

$("btn-calc").onclick = async () => {
  let body;
  try {
    body = payload();
  } catch (e) {
    return alert(e.message);
  }
  if (!body.faixas.length) return alert("Informe ao menos uma quantidade");
  const res = await fetch("/api/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return alert(typeof err.detail === "string" ? err.detail : "Erro ao calcular");
  }
  renderResult(await res.json(), body);
};

$("btn-save").onclick = async () => {
  let body;
  try {
    body = payload();
  } catch (e) {
    return alert(e.message);
  }
  if (!body.faixas.length) return alert("Informe ao menos uma quantidade");
  const res = await fetch("/api/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return alert(typeof err.detail === "string" ? err.detail : "Erro ao salvar");
  }
  const data = await res.json();
  renderResult(data.result, body);
  alert(`Orçamento #${data.id} salvo`);
};

addFaixa(7000, 0);
addFaixa(10000, 0);
addFaixa(14000, 0);

// Catálogo + mapa; seleciona BRAHVA como exemplo padrão (lista fica no modal)
Promise.all([loadCatalog(), loadFacas()])
  .then(() => {
    const brahva =
      facas.find(
        (f) =>
          f.medida === "8,0X12,4" &&
          (f.cliente_nota || "").toUpperCase() === "BRAHVA"
      ) || facas.find((f) => f.medida === "8,0X12,4");
    if (brahva) applyFaca(brahva);
    else if (facas.length) applyFaca(facas[0]);
    else renderFacaSummary(null);
  })
  .catch((e) => alert("Falha ao carregar: " + e.message));
