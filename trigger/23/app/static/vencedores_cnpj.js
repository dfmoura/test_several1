/* ============================================================
   vencedores_cnpj.js — fornecedores homologados consolidados
   ============================================================ */

let vencedoresItems = [];
let vencedoresSortKey = "status_cache";
let vencedoresSortDir = "asc";
let vencedoresCacheDias = 30;
let vencedoresAtualizando = new Set();
let vencedoresLotePolling = false;
let vencedoresResumoAtual = null;

let homologItems = [];
let homologSortKey = "data";
let homologSortDir = "desc";

function vencedoresEhAdmin() {
  return window.OSB?.usuario?.papel === "admin";
}

const STATUS_LABEL = {
  atualizado: "Atualizado",
  vencido: "Cache vencido",
  pendente: "Pendente",
  cpf: "CPF",
  invalido: "Inválido",
};

function fmtCnpjLocal(ni) {
  if (window.OSB?.fmtCnpjCpf) return window.OSB.fmtCnpjCpf(ni);
  const d = String(ni || "").replace(/\D/g, "");
  if (d.length === 14) {
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
  if (d.length === 11) {
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return ni || "—";
}

function fmtDataCurta(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 19);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDataHomolog(raw) {
  if (!raw) return "—";
  const s = String(raw).trim();
  if (!s) return "—";
  /* Preferir só a data (dd/mm/yyyy) — coluna compacta no modal. */
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return s.length > 10 ? s.slice(0, 10) : s;
}

function badgeCache(status) {
  const cls = {
    atualizado: "ok",
    vencido: "warn",
    pendente: "muted",
    cpf: "info",
    invalido: "danger",
  }[status] || "muted";
  return `<span class="badge ${cls}">${esc(STATUS_LABEL[status] || status)}</span>`;
}

function preencherPortesVencedores(portes) {
  preencherSelectPorte($("#vencedores-filtro-porte"), portes);
}

/** Monta query params compartilhados pela lista e pelo modal de homologações. */
function paramsFiltrosVencedores() {
  const params = new URLSearchParams();
  const q = $("#vencedores-filtro-q")?.value?.trim();
  const st = $("#vencedores-filtro-status")?.value;
  const porte = $("#vencedores-filtro-porte")?.value;
  const orgao = $("#vencedores-filtro-orgao")?.value;
  const uf = $("#vencedores-filtro-uf")?.value;
  if (q) params.set("q", q);
  if (st) params.set("status", st);
  if (porte) params.set("porte", porte);
  if (orgao) params.set("orgao_id", orgao);
  if (uf) params.set("uf", uf);
  appendQueryAll(params, "modalidade_id", multiSelectOf("#vencedores-filtro-modalidade")?.getValues());
  appendPeriodoParams(params, "vencedores");
  return params;
}

/** Params do recorte analítico (período/órgão/modalidade/UF — para o modal). */
function paramsRecorteAnaliticoVencedores() {
  const params = new URLSearchParams();
  const orgao = $("#vencedores-filtro-orgao")?.value;
  const uf = $("#vencedores-filtro-uf")?.value;
  if (orgao) params.set("orgao_id", orgao);
  if (uf) params.set("uf", uf);
  appendQueryAll(params, "modalidade_id", multiSelectOf("#vencedores-filtro-modalidade")?.getValues());
  appendPeriodoParams(params, "vencedores");
  return params;
}

function resumoFiltrosVencedores() {
  const el = $("#vencedores-filtros-resumo");
  if (!el) return;
  const periodo = resumoFiltroPeriodo("vencedores");
  const parts = [periodo ? `<strong>${esc(periodo)}</strong>` : "Período <strong>todos</strong>"];
  const selOrg = $("#vencedores-filtro-orgao");
  if (selOrg?.value) {
    const opt = selOrg.selectedOptions?.[0];
    parts.push(`Órgão <strong>${esc(opt?.textContent || selOrg.value)}</strong>`);
  }
  const modVals = multiSelectOf("#vencedores-filtro-modalidade")?.getValues() || [];
  if (modVals.length === 1) {
    const host = $("#vencedores-filtro-modalidade");
    const lab = host?.querySelector(`.ms-opt input[value="${CSS.escape(String(modVals[0]))}"]`)
      ?.closest("label")
      ?.querySelector("span")
      ?.textContent;
    parts.push(`Modalidade <strong>${esc(lab || modVals[0])}</strong>`);
  } else if (modVals.length > 1) {
    parts.push(`Modalidades <strong>${modVals.length}</strong>`);
  }
  const selUf = $("#vencedores-filtro-uf");
  if (selUf?.value) {
    parts.push(`UF <strong>${esc(selUf.value)}</strong>`);
  }
  el.innerHTML = parts.join(" · ");
}

async function carregarFiltrosVencedores() {
  try {
    const data = await api("/api/compras/vencedores-cnpj/filtros");
    const selAno = $("#vencedores-filtro-ano");
    const selOrg = $("#vencedores-filtro-orgao");
    const selUf = $("#vencedores-filtro-uf");
    const anoAtual = selAno?.value || "";
    const orgAtual = selOrg?.value || "";
    const ufAtual = selUf?.value || "";
    if (selAno) {
      selAno.innerHTML =
        '<option value="">Todos</option>' +
        (data.anos || []).map((a) => `<option value="${a}">${a}</option>`).join("");
      if (anoAtual) selAno.value = anoAtual;
    }
    if (selOrg) {
      selOrg.innerHTML =
        '<option value="">Todos</option>' +
        (data.orgaos || [])
          .map((o) => `<option value="${o.id}">${esc(o.sigla ? `${o.sigla} · ${o.nome}` : o.nome)}</option>`)
          .join("");
      if (orgAtual) selOrg.value = orgAtual;
    }
    multiSelectOf("#vencedores-filtro-modalidade")?.setOptions(
      (data.modalidades || []).map((m) => ({ value: m.id, label: m.nome })),
    );
    if (selUf) {
      selUf.innerHTML =
        '<option value="">Todas</option>' +
        (data.ufs || [])
          .map((u) => `<option value="${esc(u.sigla)}">${esc(u.sigla)} · ${esc(u.nome)}</option>`)
          .join("");
      if (ufAtual) selUf.value = ufAtual;
    }
  } catch (err) {
    console.error("Filtros CNPJs vencedores:", err);
  }
}

function atualizarBotoesLote(running) {
  const btn = $("#btn-vencedores-pendentes");
  const btnCancel = $("#btn-vencedores-pendentes-cancelar");
  const pendentes = Number(vencedoresResumoAtual?.pendente || 0);
  const admin = vencedoresEhAdmin();
  if (btn) {
    btn.hidden = !admin;
    btn.disabled = !admin || !!running || pendentes <= 0;
    btn.textContent = running ? "Atualizando pendentes…" : "Atualizar pendentes";
    btn.title = admin
      ? "Atualiza todos os CNPJs pendentes com intervalo seguro entre requisições"
      : "Somente administradores podem atualizar pendentes";
  }
  if (btnCancel) btnCancel.hidden = !admin || !running;
}

function renderVencedoresResumo(resumo, cacheDias) {
  const box = $("#vencedores-resumo");
  if (!box) return;
  vencedoresResumoAtual = resumo || {};
  const r = vencedoresResumoAtual;
  const chips = [
    ["atualizado", "Atualizados", r.atualizado],
    ["vencido", "Vencidos", r.vencido],
    ["pendente", "Pendentes", r.pendente],
    ["cpf", "CPF", r.cpf],
  ].filter(([, , n]) => n > 0);

  atualizarBotoesLote(vencedoresLotePolling);

  if (!chips.length) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }

  box.hidden = false;
  box.innerHTML = `
    <p class="vencedores-resumo-label">Cache CNPJ · validade ${esc(cacheDias)} dia(s)</p>
    <div class="vencedores-chips">
      ${chips.map(([k, label, n]) => `
        <button type="button" class="vencedores-chip" data-status="${esc(k)}" title="Filtrar: ${esc(label)}">
          <span class="vencedores-chip-n">${fmtNum(n)}</span>
          <span class="vencedores-chip-l">${esc(label)}</span>
        </button>`).join("")}
    </div>`;

  box.querySelectorAll(".vencedores-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sel = $("#vencedores-filtro-status");
      if (sel) sel.value = btn.dataset.status || "";
      carregarVencedores({ silencioso: true });
    });
  });
}

function renderLoteStatus(st) {
  const box = $("#vencedores-lote-status");
  if (!box) return;
  if (!st || (!st.running && !st.resultado && !(st.log || []).length)) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }

  const total = Number(st.total || 0);
  const proc = Number(st.processados || 0);
  const pct = total > 0 ? Math.min(100, Math.round((proc / total) * 100)) : (st.running ? 2 : 100);
  const atual = st.atual;
  const atualTxt = atual
    ? ` · atual: ${fmtCnpjLocal(atual.cod_fornecedor)}${atual.nome_fornecedor ? ` (${atual.nome_fornecedor})` : ""}`
    : "";
  const intervalo = st.intervalo_sec != null ? ` · ${st.intervalo_sec}s entre requisições` : "";
  let state = "busy";
  if (!st.running) {
    state = st.resultado?.ok === false && !st.resultado?.cancelado ? "error" : "done";
  }
  box.hidden = false;
  box.dataset.state = state;
  box.innerHTML = `
    <p class="vencedores-lote-title">Lote de pendentes</p>
    <p class="vencedores-lote-meta">
      ${fmtNum(proc)} / ${fmtNum(total)} processados ·
      ${fmtNum(st.ok || 0)} ok · ${fmtNum(st.erros || 0)} erro(s)${intervalo}${atualTxt}
    </p>
    <div class="vencedores-lote-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
    ${st.resultado?.mensagem ? `<p class="vencedores-lote-meta" style="margin-top:8px">${esc(st.resultado.mensagem)}</p>` : ""}
  `;
}

function renderVencedoresTabela() {
  const tb = $("#vencedores-tabela");
  const thead = $("#vencedores-tabela-head");
  if (!tb) return;

  let rows = vencedoresItems;
  const sortState = getTableSortState(thead);
  const key = sortState?.key || vencedoresSortKey;
  const dir = sortState?.dir || vencedoresSortDir;
  rows = sortItems(rows, key, dir);
  markSortableHeaders(thead, { key, dir });

  if (!rows.length) {
    tb.innerHTML = '<tr><td colspan="9">Nenhum fornecedor vencedor encontrado com os filtros atuais.</td></tr>';
    return;
  }

  const loteBusy = vencedoresLotePolling;
  const admin = vencedoresEhAdmin();
  tb.innerHTML = rows.map((r) => {
    const busy = vencedoresAtualizando.has(r.cod_fornecedor) || loteBusy;
    const pode = r.pode_atualizar;
    const nome = r.nome_fornecedor || "—";
    const mun = r.municipio
      ? `${r.municipio}${r.uf ? `/${r.uf}` : ""}`
      : "—";
    let acao = `<span class="muted-inline" title="API pública de CNPJ não se aplica a CPF">—</span>`;
    if (pode && admin) {
      acao = `<button type="button" class="btn ghost btn-sm btn-vencedor-atualizar"
              data-ni="${esc(r.cod_fornecedor)}" data-nome="${esc(nome)}"
              title="Atualizar CNPJ via API pública"
              ${busy ? "disabled" : ""}>${vencedoresAtualizando.has(r.cod_fornecedor) ? "…" : "Atualizar"}</button>`;
    } else if (pode) {
      acao = `<span class="muted-inline" title="Somente administradores podem atualizar">—</span>`;
    }
    return `<tr data-ni="${esc(r.cod_fornecedor)}">
      <td title="${esc(nome)}">
        <button type="button" class="link-vencedor btn-vencedor-detalhe"
          data-ni="${esc(r.cod_fornecedor)}" data-nome="${esc(nome)}"
          title="Ver cadastro e QSA">${esc(nome)}</button>
      </td>
      <td class="mono">${esc(fmtCnpjLocal(r.cod_fornecedor))}</td>
      <td class="col-num">
        <button type="button" class="link-vencedor link-vencedor-qtd btn-vencedor-homologacoes"
          data-ni="${esc(r.cod_fornecedor)}" data-nome="${esc(nome)}"
          title="Ver homologações deste fornecedor">${fmtNum(r.qtd_itens)}</button>
      </td>
      <td class="col-num">${fmtNum(r.qtd_compras)}</td>
      <td class="col-num col-money">${fmtMoeda(r.valor_total_homologado)}</td>
      <td title="${esc(mun)}">${esc(mun)}</td>
      <td>${badgeCache(r.status_cache)}</td>
      <td>${esc(fmtDataCurta(r.cnpj_enriquecido_em))}</td>
      <td class="col-acao">${acao}</td>
    </tr>`;
  }).join("");

  tb.querySelectorAll(".btn-vencedor-detalhe").forEach((btn) => {
    btn.addEventListener("click", () => {
      const fn = window.OSB?.abrirDetalheFornecedor;
      if (typeof fn === "function") fn(btn.dataset.ni, btn.dataset.nome);
    });
  });

  tb.querySelectorAll(".btn-vencedor-homologacoes").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirHomologacoesFornecedor(btn.dataset.ni, btn.dataset.nome);
    });
  });

  tb.querySelectorAll(".btn-vencedor-atualizar").forEach((btn) => {
    btn.addEventListener("click", () => atualizarVencedorIndividual(btn.dataset.ni, btn.dataset.nome));
  });
}

function renderHomologacoesTabela() {
  const tb = $("#modal-vencedor-homologacoes-tabela");
  const thead = $("#modal-vencedor-homologacoes-head");
  if (!tb) return;

  let rows = homologItems.slice();
  const sortState = getTableSortState(thead);
  const key = sortState?.key || homologSortKey;
  const dir = sortState?.dir || homologSortDir;
  rows = sortItems(rows, key, dir);
  markSortableHeaders(thead, { key, dir });

  if (!rows.length) {
    tb.innerHTML = '<tr><td colspan="6">Nenhuma homologação encontrada para este fornecedor.</td></tr>';
    return;
  }

  tb.innerHTML = rows.map((r) => {
    const cid = r.contratacao_id != null ? String(r.contratacao_id) : "";
    const compra = r.compra || r.id_compra || "—";
    const processo = r.processo || "—";
    const objeto = r.objeto || "—";
    const desc = r.descricao_item || "—";
    const dataFmt = fmtDataHomolog(r.data);
    const valorTxt = r.valor_homologado || fmtMoeda(r.valor_homologado_num) || "—";
    const tip = [
      r.compra ? `Compra: ${r.compra}` : "",
      r.processo ? `Processo: ${r.processo}` : "",
      r.numero_item != null ? `Item ${r.numero_item}` : "",
      cid ? "Clique para abrir a contratação" : "",
    ].filter(Boolean).join(" · ");
    return `<tr${cid ? ` class="clickable" data-contratacao-id="${esc(cid)}"` : ""} title="${esc(tip)}">
      <td class="col-data mono" title="${esc(dataFmt)}">${esc(dataFmt)}</td>
      <td class="col-id mono" title="${esc(compra)}">${esc(compra)}</td>
      <td class="col-id mono" title="${esc(processo)}">${esc(processo)}</td>
      <td class="col-wrap">${esc(objeto)}</td>
      <td class="col-wrap">${esc(desc)}</td>
      <td class="col-num col-money" title="${esc(valorTxt)}">${esc(valorTxt)}</td>
    </tr>`;
  }).join("");

  tb.querySelectorAll("tr[data-contratacao-id]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const id = tr.dataset.contratacaoId;
      if (!id) return;
      const fn = window.OSB?.abrirDetalheCompra
        || (typeof abrirDetalheCompra === "function" ? abrirDetalheCompra : null);
      if (typeof fn === "function") fn(id);
    });
  });
}

function fmtCnaeHomolog(emp) {
  if (!emp) return null;
  if (emp.cnae_codigo != null && emp.cnae) return `${emp.cnae_codigo} — ${emp.cnae}`;
  if (emp.cnae_codigo != null) return String(emp.cnae_codigo);
  return emp.cnae || null;
}

function pillOrigemHomolog(deUberlandia) {
  if (typeof window.OSB?.pillOrigemLocal === "function") {
    return window.OSB.pillOrigemLocal(deUberlandia);
  }
  if (deUberlandia === true) return '<span class="pill-local pill-local-udi">Uberlândia</span>';
  if (deUberlandia === false) return '<span class="pill-local pill-local-fora">Fora de Uberlândia</span>';
  return "";
}

function renderHomologacoesEmpresa(empresa, { tipo } = {}) {
  const wrap = $("#modal-vencedor-empresa-wrap");
  const dl = $("#modal-vencedor-empresa");
  const secWrap = $("#modal-vencedor-cnaes-sec-wrap");
  const secMeta = $("#modal-vencedor-cnaes-sec-meta");
  const secList = $("#modal-vencedor-cnaes-sec");
  if (!wrap || !dl) return;

  wrap.hidden = false;
  if (secWrap) secWrap.hidden = true;
  if (secList) secList.innerHTML = "";

  if (!empresa) {
    dl.innerHTML = `<dt>Cadastro</dt><dd class="muted-empty">${
      tipo === "cpf"
        ? "CPF sem enriquecimento cadastral de CNAE."
        : "Cadastro ainda não enriquecido. Clique no nome na tabela para consultar o CNPJ."
    }</dd>`;
    return;
  }

  const mun = empresa.municipio
    ? `${empresa.municipio}${empresa.uf ? `/${empresa.uf}` : ""}`
    : null;
  const endParts = [empresa.logradouro, empresa.numero, empresa.bairro, empresa.cep]
    .filter((v) => v != null && String(v).trim() !== "");
  const endereco = endParts.length ? endParts.join(", ") : null;
  const cnae = fmtCnaeHomolog(empresa);
  const hab = empresa.habilitado_licitar;
  const habTxt = hab === true ? "Sim" : hab === false ? "Não" : null;

  const campos = [
    ["Razão social", empresa.razao_social],
    ["Nome fantasia", empresa.nome_fantasia],
    ["Porte", empresa.porte],
    ["Natureza jurídica", empresa.natureza_juridica],
    ["Situação", empresa.situacao_cadastral],
    ["Município", mun || empresa.origem_local],
    ["Habilitado a licitar", habTxt],
    ["Endereço", endereco],
  ];

  let html = campos
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join("");

  if (cnae) {
    html += `<dt class="vencedor-cnae-label">CNAE principal</dt>`
      + `<dd class="vencedor-cnae-value">${esc(cnae)}</dd>`;
  } else {
    html += `<dt class="vencedor-cnae-label">CNAE principal</dt>`
      + `<dd class="vencedor-cnae-value muted-empty">Não informado no cache local</dd>`;
  }

  dl.innerHTML = html || "<dt>Info</dt><dd class='muted-empty'>Sem dados cadastrais</dd>";

  const secundarios = Array.isArray(empresa.cnaes_secundarios) ? empresa.cnaes_secundarios : [];
  if (secWrap && secMeta && secList && secundarios.length) {
    secWrap.hidden = false;
    secMeta.textContent = `${secundarios.length} CNAE(s) secundário(s)`;
    secList.innerHTML = secundarios.map((c) => {
      const cod = c.codigo != null ? String(c.codigo) : "";
      const desc = c.descricao || "";
      return `<li>${cod ? `<code>${esc(cod)}</code>` : ""}${esc(desc || "—")}</li>`;
    }).join("");
  }
}

async function abrirHomologacoesFornecedor(ni, nome) {
  const digits = String(ni || "").replace(/\D/g, "");
  if (!digits) return;

  const dlg = $("#modal-vencedor-homologacoes");
  const titulo = $("#modal-vencedor-homologacoes-titulo");
  const resumo = $("#modal-vencedor-homologacoes-resumo");
  const meta = $("#modal-vencedor-homologacoes-meta");
  const tb = $("#modal-vencedor-homologacoes-tabela");
  const empDl = $("#modal-vencedor-empresa");

  if (titulo) titulo.textContent = nome && nome !== "—" ? nome : "Homologações";
  if (resumo) {
    resumo.innerHTML = `
      <div class="compra-resumo-main">
        <span class="compra-resumo-num">${esc(nome && nome !== "—" ? nome : fmtCnpjLocal(digits))}</span>
      </div>
      <div class="compra-resumo-sub">${esc(fmtCnpjLocal(digits))} · carregando homologações…</div>`;
  }
  if (meta) meta.textContent = "Consultando…";
  if (tb) tb.innerHTML = '<tr><td colspan="6">Carregando…</td></tr>';
  if (empDl) empDl.innerHTML = "<dt>Cadastro</dt><dd class='muted-empty'>Carregando…</dd>";
  const secWrap = $("#modal-vencedor-cnaes-sec-wrap");
  if (secWrap) secWrap.hidden = true;
  homologItems = [];
  clearTableSortState($("#modal-vencedor-homologacoes-head"));
  homologSortKey = "data";
  homologSortDir = "desc";
  dlg?.showModal();

  try {
    const params = paramsRecorteAnaliticoVencedores();
    const qs = params.toString();
    const data = await api(
      `/api/compras/vencedores-cnpj/${encodeURIComponent(digits)}/homologacoes${qs ? `?${qs}` : ""}`,
    );
    homologItems = data.items || [];
    const nomeFinal = data.nome_fornecedor || nome || "Fornecedor";
    const emp = data.empresa || null;
    if (titulo) titulo.textContent = nomeFinal;
    if (resumo) {
      const pills = [
        pillOrigemHomolog(emp?.de_uberlandia),
        emp?.situacao_cadastral ? `<span class="pill-mod">${esc(emp.situacao_cadastral)}</span>` : "",
      ].filter(Boolean).join("");
      resumo.innerHTML = `
        <div class="compra-resumo-main">
          <span class="compra-resumo-num">${esc(nomeFinal)}</span>
          ${pills}
        </div>
        <div class="compra-resumo-sub">
          ${esc(fmtCnpjLocal(data.cod_fornecedor || digits))}
          ${data.tipo === "cpf" ? " · CPF" : " · CNPJ"}
          · ${fmtNum(data.qtd_itens)} item(ns)
          · ${fmtNum(data.qtd_compras)} compra(s)
          ${data.valor_total_homologado != null ? ` · total ${fmtMoeda(data.valor_total_homologado)}` : ""}
        </div>`;
    }
    renderHomologacoesEmpresa(emp, { tipo: data.tipo });
    if (meta) {
      meta.textContent = homologItems.length
        ? `${fmtNum(homologItems.length)} homologação(ões) · ordenável pelas colunas`
        : "Nenhuma homologação encontrada.";
    }
    renderHomologacoesTabela();
  } catch (err) {
    if (resumo) {
      resumo.innerHTML = `<p class="meta-line">${esc(err.message)}</p>`;
    }
    if (empDl) {
      empDl.innerHTML = `<dt>Cadastro</dt><dd class="muted-empty">${esc(err.message)}</dd>`;
    }
    if (meta) meta.textContent = "Falha ao carregar.";
    if (tb) tb.innerHTML = `<tr><td colspan="6">${esc(err.message)}</td></tr>`;
  }
}

async function atualizarVencedorIndividual(ni, nome) {
  if (!vencedoresEhAdmin()) return;
  const digits = String(ni || "").replace(/\D/g, "");
  if (!digits || digits.length !== 14) return;
  if (vencedoresAtualizando.has(digits) || vencedoresLotePolling) return;

  vencedoresAtualizando.add(digits);
  renderVencedoresTabela();
  setTopStatus(`Atualizando CNPJ ${fmtCnpjLocal(digits)}…`, "busy");

  try {
    const params = new URLSearchParams({ refresh: "true" });
    if (nome && nome !== "—") params.set("nome", nome);
    const data = await api(`/api/compras/fornecedores/${encodeURIComponent(digits)}?${params}`);

    const idx = vencedoresItems.findIndex((r) => r.cod_fornecedor === digits);
    if (idx >= 0) {
      const prev = vencedoresItems[idx];
      vencedoresItems[idx] = {
        ...prev,
        nome_fornecedor: data.razao_social || prev.nome_fornecedor,
        status_cache: data.cache_valido ? "atualizado" : "vencido",
        cache_valido: !!data.cache_valido,
        cnpj_enriquecido_em: data.cnpj_enriquecido_em,
        municipio: data.municipio || prev.municipio,
        uf: data.uf || prev.uf,
        situacao_cadastral: data.situacao_cadastral || prev.situacao_cadastral,
        de_uberlandia: data.de_uberlandia,
        pode_atualizar: true,
      };
    }
    setTopStatus("CNPJ atualizado", "idle");
    const fn = window.OSB?.abrirDetalheFornecedor;
    if (typeof fn === "function") fn(digits, nome || data.razao_social);
  } catch (err) {
    setTopStatus("Falha ao atualizar CNPJ", "error");
    alert(err.message || "Falha ao atualizar CNPJ");
  } finally {
    vencedoresAtualizando.delete(digits);
    await carregarVencedores({ silencioso: true });
  }
}

async function carregarVencedores({ silencioso = false } = {}) {
  const tb = $("#vencedores-tabela");
  const meta = $("#vencedores-meta");
  if (!silencioso && tb) tb.innerHTML = '<tr><td colspan="9">Carregando…</td></tr>';
  if (!silencioso && meta) meta.textContent = "Consultando fornecedores vencedores…";

  try {
    const params = paramsFiltrosVencedores();
    const data = await api(`/api/compras/vencedores-cnpj?${params}`);
    vencedoresItems = data.items || [];
    vencedoresCacheDias = data.cache_dias ?? 30;
    preencherPortesVencedores(data.portes);
    resumoFiltrosVencedores();
    if (meta) {
      meta.textContent = vencedoresEhAdmin()
        ? `${fmtNum(data.total)} fornecedor(es) consolidado(s) · nome: QSA · nº em Itens: homologações · lotes de pendentes usam ${3}s entre requisições`
        : `${fmtNum(data.total)} fornecedor(es) consolidado(s) · nome: QSA · nº em Itens: homologações · atualização de pendentes restrita ao administrador`;
    }
    renderVencedoresResumo(data.resumo, vencedoresCacheDias);
    renderVencedoresTabela();
  } catch (err) {
    if (meta) meta.textContent = "Erro ao carregar.";
    if (tb) tb.innerHTML = `<tr><td colspan="9">${esc(err.message)}</td></tr>`;
  }
}

async function acompanharLotePendentes() {
  if (vencedoresLotePolling) return;
  vencedoresLotePolling = true;
  atualizarBotoesLote(true);
  renderVencedoresTabela();

  try {
    await pollStatus("/api/compras/vencedores-cnpj/atualizar-pendentes/status", (st) => {
      renderLoteStatus(st);
      const proc = Number(st.processados || 0);
      const total = Number(st.total || 0);
      setTopStatus(
        st.running
          ? `Pendentes CNPJ ${proc}/${total}…`
          : (st.resultado?.mensagem || "Lote de pendentes finalizado"),
        st.running ? "busy" : "idle",
      );
    }, 1500);
  } catch (err) {
    setTopStatus("Falha no lote de pendentes", "error");
    const box = $("#vencedores-lote-status");
    if (box) {
      box.hidden = false;
      box.dataset.state = "error";
      box.innerHTML = `<p class="vencedores-lote-title">Lote de pendentes</p><p class="vencedores-lote-meta">${esc(err.message)}</p>`;
    }
  } finally {
    vencedoresLotePolling = false;
    atualizarBotoesLote(false);
    await carregarVencedores({ silencioso: true });
  }
}

async function iniciarLotePendentes() {
  if (!vencedoresEhAdmin()) {
    alert("Somente administradores podem atualizar pendentes.");
    return;
  }
  if (vencedoresLotePolling) return;
  const n = Number(vencedoresResumoAtual?.pendente || 0);
  if (n <= 0) {
    alert("Não há CNPJs pendentes para atualizar.");
    return;
  }
  const minutos = Math.ceil((n * 3) / 60);
  const ok = confirm(
    `Atualizar ${n} CNPJ(s) pendente(s)?\n\n`
    + `Cadência: 1 requisição a cada 3 segundos (com pausa extra se a API falhar).\n`
    + `Tempo estimado: ~${minutos} min.\n\n`
    + `O job roda no servidor — você pode acompanhar o progresso nesta tela.`,
  );
  if (!ok) return;

  try {
    await api("/api/compras/vencedores-cnpj/atualizar-pendentes", { method: "POST", body: "{}" });
    setTopStatus("Lote de pendentes iniciado", "busy");
    acompanharLotePendentes();
  } catch (err) {
    alert(err.message || "Não foi possível iniciar o lote");
  }
}

async function cancelarLotePendentes() {
  if (!vencedoresEhAdmin()) return;
  try {
    await api("/api/compras/vencedores-cnpj/atualizar-pendentes/cancelar", { method: "POST", body: "{}" });
  } catch (err) {
    alert(err.message || "Falha ao cancelar");
  }
}

async function restaurarLoteSeAtivo() {
  try {
    const st = await api("/api/compras/vencedores-cnpj/atualizar-pendentes/status");
    if (st?.running) {
      renderLoteStatus(st);
      acompanharLotePendentes();
    } else if (st?.resultado || (st?.log || []).length) {
      renderLoteStatus(st);
    }
  } catch { /* ignore */ }
}

$("#form-vencedores-filtros")?.addEventListener("submit", (e) => {
  e.preventDefault();
  carregarVencedores();
});
$("#btn-vencedores-limpar")?.addEventListener("click", async () => {
  $("#form-vencedores-filtros")?.reset();
  limparFiltroPeriodo("vencedores");
  multiSelectOf("#vencedores-filtro-modalidade")?.clear({ silent: true });
  clearTableSortState($("#vencedores-tabela-head"));
  await carregarFiltrosVencedores();
  const selPorte = $("#vencedores-filtro-porte");
  if (selPorte) selPorte.value = "";
  const selUf = $("#vencedores-filtro-uf");
  if (selUf) selUf.value = "";
  carregarVencedores();
});
$("#btn-vencedores-pendentes")?.addEventListener("click", () => iniciarLotePendentes());
$("#btn-vencedores-pendentes-cancelar")?.addEventListener("click", () => cancelarLotePendentes());
$("#modal-vencedor-homologacoes-fechar")?.addEventListener("click", () => {
  $("#modal-vencedor-homologacoes")?.close();
});
wireSortableHeaders($("#vencedores-tabela-head"), (key, dir) => {
  vencedoresSortKey = key;
  vencedoresSortDir = dir;
  renderVencedoresTabela();
});
wireSortableHeaders($("#modal-vencedor-homologacoes-head"), (key, dir) => {
  homologSortKey = key;
  homologSortDir = dir;
  renderHomologacoesTabela();
});

registrarPagina("vencedores", async () => {
  iniciarFiltroPeriodo("vencedores");
  atualizarBotoesLote(vencedoresLotePolling);
  await carregarFiltrosVencedores();
  await carregarVencedores();
  await restaurarLoteSeAtivo();
});
