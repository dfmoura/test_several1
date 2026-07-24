/* ============================================================
   compras.js — consulta Compras.gov / PNCP (contratações + itens)
   ============================================================ */

let comprasUnidades = [];
let compraAtualId = null;
let fornecedorNiAtual = null;
let fornecedorNomeHint = null;
let comprasLastItems = [];
let comprasSortKey = null;
let comprasSortDir = "asc";

const COMPRAS_SORT_GETTERS = {
  numero: (r) => r.numero || r.id_compra || r.chave_compra || "",
  processo: (r) => r.processo || "",
  unidade_nome: (r) => r.unidade_nome || "",
  ano: (r) => r.ano,
  situacao_lista: (r) => r.situacao_lista || r.situacao_pncp || "",
  valor_total_estimado: (r) => r.valor_total_estimado,
  valor_total_homologado: (r) => r.valor_total_homologado,
  numero_controle_pncp: (r) => r.numero_controle_pncp || r.id_contratacao_pncp || "",
  tipos_item: (r) => comprasTipoLabel(r.tipos_item),
  objeto: (r) => r.objeto || "",
};

const COMPRAS_CAMPOS_IDENT = [
  ["numero", "Nº compra"], ["modalidade_descricao", "Modalidade"], ["processo", "Processo"],
  ["ano", "Ano"], ["situacao_lista", "Situação"], ["id_compra", "Id compra"],
];
const COMPRAS_CAMPOS_PRAZOS = [
  ["data_publicacao_pncp", "Publicação PNCP"], ["data_abertura_proposta_pncp", "Abertura propostas"],
  ["data_encerramento_proposta_pncp", "Encerramento propostas"],
  ["valor_total_estimado", "Valor estimado"], ["valor_total_homologado", "Valor homologado"],
];
const COMPRAS_CAMPOS_ORGAO = [
  ["unidade_nome", "Unidade compradora"], ["orgao_entidade_razao_social", "Órgão entidade"],
];
const COMPRAS_CAMPOS_REFS = [
  ["numero_controle_pncp", "Nº controle PNCP"], ["link_pncp", "Link PNCP"],
];
const COMPRAS_PNCP_EXTRA_LABELS = {
  sequencial_compra_pncp: "Sequencial PNCP", orgao_entidade_cnpj: "CNPJ órgão", codigo_orgao: "Código órgão",
  unidade_orgao_municipio_nome: "Município", unidade_orgao_uf_sigla: "UF", amparo_legal_nome: "Amparo legal",
  modo_disputa_nome_pncp: "Modo disputa", srp: "SRP", contratacao_excluida: "Excluída",
};
const COMPRAS_EXTRA_IGNORAR = new Set([
  ...COMPRAS_CAMPOS_IDENT.map(([k]) => k), ...COMPRAS_CAMPOS_PRAZOS.map(([k]) => k),
  ...COMPRAS_CAMPOS_ORGAO.map(([k]) => k), ...COMPRAS_CAMPOS_REFS.map(([k]) => k),
  "objeto", "informacao_complementar", "chave_compra", "unidade_compradora", "modalidade_codigo",
  "observador_id", "coletado_em", "dados_pncp", "data_divulgacao_pncp", "situacao_pncp",
  "id_contratacao_pncp", "inicio_recebimento_propostas", "fim_recebimento_propostas", "url_acompanhamento",
]);

function comprasPainel(campos, registro) {
  return campos.map(([k, label]) => {
    const v = registro[k];
    if (v == null || v === "") return "";
    if (k === "link_pncp") return `<dt>${label}</dt><dd><a href="${v}" target="_blank" rel="noopener" class="link-pncp">Abrir no PNCP</a></dd>`;
    if (k === "situacao_lista") return `<dt>${label}</dt><dd>${pillSituacao(v)}</dd>`;
    return `<dt>${label}</dt><dd>${esc(v)}</dd>`;
  }).filter(Boolean).join("");
}

function pillOrigemLocal(deUberlandia) {
  if (deUberlandia === true) return '<span class="pill-local pill-local-udi">Uberlândia</span>';
  if (deUberlandia === false) return '<span class="pill-local pill-local-fora">Fora de Uberlândia</span>';
  return "";
}

function comprasTipoLabel(tipos) {
  const codigos = new Set((tipos || []).map((tipo) => String(tipo).trim().toUpperCase()));
  if (codigos.has("M") && codigos.has("S")) return "Material e Serviço";
  if (codigos.has("M")) return "Material";
  if (codigos.has("S")) return "Serviço";
  return "Não informado";
}

function fmtCnpjCpf(ni) {
  const d = String(ni || "").replace(/\D/g, "");
  if (d.length === 14) {
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
  if (d.length === 11) {
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return ni || "";
}

async function carregarComprasUnidades() {
  if (comprasUnidades.length) return;
  comprasUnidades = await api("/api/compras/unidades").catch(() => []);
  const el = $("#compras-filtro-unidade");
  if (el) {
    el.innerHTML = '<option value="">Todas</option>' +
      comprasUnidades.map((u) => `<option value="${esc(u.codigo)}">${esc(u.codigo)} · ${esc(u.nome)}</option>`).join("");
  }
}

async function carregarComprasFiltros() {
  await carregarComprasUnidades();
  const [sits, mods, stats] = await Promise.all([
    api("/api/compras/situacoes").catch(() => []),
    api("/api/compras/modalidades").catch(() => []),
    api("/api/compras/stats").catch(() => ({ por_ano: {} })),
  ]);
  preencherSelect(
    $("#compras-filtro-ano"),
    (stats.anos_periodo || anosDeStats(stats.por_ano)).map(String),
    "Todos",
  );
  preencherSelect($("#compras-filtro-situacao"), sits, "Todas");
  multiSelectOf("#compras-filtro-modalidade")?.setOptions(
    (mods || []).map((m) => ({
      value: String(m.codigo),
      label: `${m.codigo} · ${m.nome}`,
    })),
  );
}

async function buscarCompras() {
  const params = new URLSearchParams();
  const g = (id) => $(id)?.value?.trim();
  if ($("#compras-filtro-unidade")?.value) params.set("unidade_codigo", $("#compras-filtro-unidade").value);
  if ($("#compras-filtro-situacao")?.value) params.set("situacao", $("#compras-filtro-situacao").value);
  appendQueryAll(params, "modalidade_codigo", multiSelectOf("#compras-filtro-modalidade")?.getValues());
  if (g("#compras-filtro-processo")) params.set("processo", g("#compras-filtro-processo"));
  if (g("#compras-filtro-numero")) params.set("numero", g("#compras-filtro-numero"));
  if ($("#compras-filtro-tipo")?.value) params.set("material_ou_servico", $("#compras-filtro-tipo").value);
  if (g("#compras-filtro-texto")) params.set("texto", g("#compras-filtro-texto"));
  params.set("limit", "500");

  const tb = $("#compras-tabela");
  tb.innerHTML = '<tr><td colspan="10">Carregando…</td></tr>';
  try {
    appendPeriodoParams(params, "compras");
    const data = await api(`/api/compras/contratacoes?${params}`);
    const periodo = resumoFiltroPeriodo("compras");
    $("#compras-consulta-meta").textContent = `${fmtNum(data.total)} registro(s) · Compras.gov / PNCP${periodo ? ` · ${periodo}` : ""}`;
    comprasLastItems = data.items || [];
    renderComprasTabela();
  } catch (err) {
    comprasLastItems = [];
    tb.innerHTML = `<tr><td colspan="10">${esc(err.message)}</td></tr>`;
  }
}

function renderComprasTabela() {
  const tb = $("#compras-tabela");
  const head = $("#compras-tabela-head");
  if (!tb) return;
  if (!comprasLastItems.length) {
    tb.innerHTML = '<tr><td colspan="10">Nenhum registro encontrado.</td></tr>';
    return;
  }
  let items = comprasLastItems;
  if (comprasSortKey && COMPRAS_SORT_GETTERS[comprasSortKey]) {
    items = sortItems(comprasLastItems, COMPRAS_SORT_GETTERS[comprasSortKey], comprasSortDir);
  }
  markSortableHeaders(head, comprasSortKey ? { key: comprasSortKey, dir: comprasSortDir } : null);
  tb.innerHTML = items.map((r) => {
    const num = r.numero || r.id_compra || r.chave_compra || "—";
    const mod = r.modalidade_descricao || "";
    const numTitle = mod ? `${num} · ${mod}` : String(num);
    const sit = r.situacao_lista || r.situacao_pncp || "";
    const pncp = r.numero_controle_pncp || r.id_contratacao_pncp || "";
    return `<tr data-id="${r.id}" title="Ver detalhes">
      ${tdEllipsis(numTitle, {
        cls: "col-mod",
        html: `<strong>${esc(num)}</strong>${mod ? ` <span class="pill-mod">${esc(mod)}</span>` : ""}`,
        title: numTitle,
      })}
      ${tdEllipsis(r.processo, { html: `<strong>${esc(r.processo || "—")}</strong>` })}
      ${tdEllipsis(r.unidade_nome)}
      ${tdEllipsis(r.ano, { cls: "col-num" })}
      ${tdEllipsis(sit, { html: pillSituacao(sit), title: sit || "—" })}
      ${tdEllipsis(r.valor_total_estimado, { cls: "col-num col-money" })}
      ${tdEllipsis(r.valor_total_homologado, { cls: "col-num col-money" })}
      ${tdEllipsis(pncp)}
      ${tdEllipsis(comprasTipoLabel(r.tipos_item))}
      ${tdEllipsis(r.objeto, { cls: "col-desc" })}
    </tr>`;
  }).join("");
  tb.querySelectorAll("tr[data-id]").forEach((tr) => {
    tr.addEventListener("click", () => abrirDetalheCompra(tr.dataset.id));
  });
}

async function carregarComprasObservadores() {
  const obs = await api("/api/observadores?ativos=true").catch(() => []);
  const sel = $("#edit-compra-observador");
  if (!sel) return;
  sel.innerHTML = '<option value="">Nenhum</option>' + obs.map((o) => `<option value="${o.id}">${esc(o.nome)}</option>`).join("");
}

async function abrirDetalheCompra(id) {
  compraAtualId = id;
  await carregarComprasObservadores();
  const r = await api(`/api/compras/contratacoes/${id}`);
  const tituloNum = r.numero || r.id_compra || r.chave_compra;
  $("#modal-compras-titulo").textContent = tituloNum;
  const sit = r.situacao_lista || r.situacao_pncp;
  $("#modal-compras-resumo").innerHTML = `
    <div class="compra-resumo-main">
      <span class="compra-resumo-num">${esc(tituloNum)}</span>
      ${r.modalidade_descricao ? `<span class="pill-mod">${esc(r.modalidade_descricao)}</span>` : ""}
      ${sit ? pillSituacao(sit) : ""}
    </div>
    <div class="compra-resumo-sub">${esc(r.unidade_nome)}${r.ano ? ` · ${r.ano}` : ""}</div>`;

  $("#modal-compras-ident").innerHTML = comprasPainel(COMPRAS_CAMPOS_IDENT, r);
  $("#modal-compras-prazos").innerHTML = comprasPainel(COMPRAS_CAMPOS_PRAZOS, r);
  $("#modal-compras-orgao").innerHTML = comprasPainel(COMPRAS_CAMPOS_ORGAO, r);
  $("#modal-compras-refs").innerHTML = comprasPainel(COMPRAS_CAMPOS_REFS, r);

  const objEl = $("#modal-compras-objeto");
  objEl.textContent = r.objeto || "-";
  objEl.classList.toggle("muted-empty", !r.objeto);

  const infoWrap = $("#modal-compras-info-wrap");
  if (r.informacao_complementar) { infoWrap.hidden = false; $("#modal-compras-info").textContent = r.informacao_complementar; }
  else { infoWrap.hidden = true; $("#modal-compras-info").textContent = ""; }

  const extraWrap = $("#modal-compras-extra-wrap");
  let extraHtml = "";
  if (r.dados_pncp) {
    extraHtml = Object.entries(r.dados_pncp)
      .filter(([k, v]) => v != null && v !== "" && !COMPRAS_EXTRA_IGNORAR.has(k))
      .map(([k, v]) => `<dt>${esc(COMPRAS_PNCP_EXTRA_LABELS[k] || k.replace(/_/g, " "))}</dt><dd>${esc(v)}</dd>`)
      .join("");
  }
  extraWrap.hidden = !extraHtml;
  $("#modal-compras-extra").innerHTML = extraHtml;

  await carregarItensCompra(id);
  $("#edit-compra-observador").value = r.observador_id || "";
  const metaApi = $("#compra-atualizar-api-meta");
  if (metaApi) {
    metaApi.hidden = true;
    metaApi.textContent = "";
  }
  const btnApi = $("#btn-compra-atualizar-api");
  if (btnApi) btnApi.disabled = false;
  $("#modal-compras").showModal();
}

function comprasVencedores(it) {
  const res = it.resultados || [];
  if (res.length) {
    return res.map((r) => {
      const nome = r.nome_razao_social_fornecedor || r.nome_fornecedor || "-";
      const val = r.valor_total_homologado || "";
      const srp = r.ordem_classificacao_srp ? ` · ${r.ordem_classificacao_srp}º SRP` : "";
      const local = pillOrigemLocal(r.de_uberlandia);
      const ni = (r.ni_fornecedor || "").replace(/\D/g, "");
      if (!ni) {
        return `<div class="vencedor-linha">${esc(nome)}${val ? ` · <strong>${esc(val)}</strong>` : ""}${srp}${local}</div>`;
      }
      return `<div class="vencedor-linha">
        <button type="button" class="link-vencedor" data-ni="${esc(ni)}" data-nome="${esc(nome)}" title="Ver CNPJ / QSA">
          ${esc(nome)}
        </button>${val ? ` · <strong>${esc(val)}</strong>` : ""}${srp}${local}
      </div>`;
    }).join("");
  }
  if (it.nome_fornecedor) {
    const ni = (it.cod_fornecedor || "").replace(/\D/g, "");
    if (ni) {
      return `<button type="button" class="link-vencedor" data-ni="${esc(ni)}" data-nome="${esc(it.nome_fornecedor)}" title="Ver CNPJ / QSA">${esc(it.nome_fornecedor)}</button>${it.valor_total_resultado ? ` · ${esc(it.valor_total_resultado)}` : ""}`;
    }
    return `${esc(it.nome_fornecedor)}${it.valor_total_resultado ? ` · ${esc(it.valor_total_resultado)}` : ""}`;
  }
  if (it.tem_resultado === false || (!it.valor_total_homologado && it.valor_total)) return '<span class="badge-estimado">Só estimado</span>';
  return '<span class="muted-empty">Sem homologação</span>';
}

function comprasDeltaPct(estimado, homologado) {
  const parse = (s) => {
    if (!s) return null;
    const n = parseFloat(String(s).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const e = parse(estimado); const h = parse(homologado);
  if (e == null || h == null || e === 0) return "";
  const pct = ((h - e) / e) * 100;
  return `<span class="item-resultado-sub">${pct > 0 ? "+" : ""}${pct.toFixed(1)}%</span>`;
}

function bindVencedorClicks(root) {
  root.querySelectorAll(".link-vencedor").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      abrirDetalheFornecedor(btn.dataset.ni, btn.dataset.nome || "");
    });
  });
}

async function carregarItensCompra(cid) {
  const meta = $("#modal-compras-itens-meta");
  const tb = $("#modal-compras-itens-tabela");
  meta.textContent = "Carregando itens…";
  tb.innerHTML = "";
  try {
    const data = await api(`/api/compras/contratacoes/${cid}/itens?limit=500`);
    if (!data.items.length) {
      meta.textContent = "Nenhum item cadastrado para esta contratação.";
      tb.innerHTML = '<tr><td colspan="7">-</td></tr>';
      return;
    }
    meta.textContent = `${data.total} item(ns) · clique no vencedor para ver CNPJ / QSA`;
    tb.innerHTML = data.items.map((it) => {
      const desc = it.descricao_detalhada || it.descricao_resumida || "-";
      const cat = it.cod_item_catalogo ? `${it.material_ou_servico_nome || ""} ${it.cod_item_catalogo}`.trim() : (it.material_ou_servico_nome || "-");
      const hom = it.resultados?.[0]?.valor_total_homologado || it.valor_total_resultado || "-";
      return `<tr>
        <td>${esc(it.numero_item_pncp ?? it.numero_item_compra ?? "")}</td>
        <td class="col-desc" title="${esc(desc)}">${esc(it.descricao_resumida || desc)}</td>
        <td>${esc(cat)}</td>
        <td>${esc(it.quantidade)} ${esc(it.unidade_medida || "")}</td>
        <td>${esc(it.valor_total)}${comprasDeltaPct(it.valor_total, hom)}</td>
        <td>${esc(hom)}</td>
        <td>${comprasVencedores(it)}</td>
      </tr>`;
    }).join("");
    bindVencedorClicks(tb);
  } catch (err) {
    meta.textContent = "Erro ao carregar itens.";
    tb.innerHTML = `<tr><td colspan="7">${esc(err.message)}</td></tr>`;
  }
}

function renderFornecedorDetalhe(data) {
  const titulo = data.razao_social || data.ni_fornecedor || "Fornecedor";
  $("#modal-fornecedor-titulo").textContent = titulo;
  $("#modal-fornecedor-resumo").innerHTML = `
    <div class="compra-resumo-main">
      <span class="compra-resumo-num">${esc(titulo)}</span>
      ${pillOrigemLocal(data.de_uberlandia)}
      ${data.situacao_cadastral ? `<span class="pill-mod">${esc(data.situacao_cadastral)}</span>` : ""}
    </div>
    <div class="compra-resumo-sub">${esc(fmtCnpjCpf(data.ni_fornecedor))}${data.tipo === "cpf" ? " · CPF" : " · CNPJ"}${data.origem_local ? ` · ${esc(data.origem_local)}` : ""}</div>`;

  const cadastro = [
    ["Razão social", data.razao_social],
    ["Nome fantasia", data.nome_fantasia],
    ["CNPJ/CPF", fmtCnpjCpf(data.ni_fornecedor)],
    ["Porte", data.porte],
    ["Natureza jurídica", data.natureza_juridica],
    ["CNAE principal", data.cnae_codigo ? `${data.cnae_codigo} — ${data.cnae || ""}` : data.cnae],
    ["Situação cadastral", data.situacao_cadastral],
    ["Município", data.municipio ? `${data.municipio}${data.uf ? `/${data.uf}` : ""}` : null],
    ["IBGE", data.codigo_municipio_ibge],
    ["Origem", data.origem_local],
    ["Cache CNPJ", data.cnpj_enriquecido_em ? `${data.cnpj_enriquecido_em}${data.cache_valido ? " (válido)" : ""}` : "Ainda não enriquecido"],
  ];
  $("#modal-fornecedor-cadastro").innerHTML = cadastro
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join("") || "<dt>Info</dt><dd class='muted-empty'>Sem dados cadastrais</dd>";

  const end = [
    ["Logradouro", data.logradouro],
    ["Número", data.numero],
    ["Bairro", data.bairro],
    ["CEP", data.cep],
  ];
  const endHtml = end
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join("");
  $("#modal-fornecedor-end-wrap").hidden = !endHtml;
  $("#modal-fornecedor-endereco").innerHTML = endHtml;

  const cnaesSec = data.cnaes_secundarios || [];
  const cnaesMeta = $("#modal-fornecedor-cnaes-meta");
  const cnaesTb = $("#modal-fornecedor-cnaes");
  if (data.aviso) {
    cnaesMeta.textContent = data.aviso;
    cnaesTb.innerHTML = '<tr><td colspan="2">-</td></tr>';
  } else if (!cnaesSec.length) {
    cnaesMeta.textContent = data.tipo === "cnpj"
      ? "Nenhum CNAE secundário informado pela API pública para este CNPJ."
      : "Sem CNAEs secundários.";
    cnaesTb.innerHTML = '<tr><td colspan="2">-</td></tr>';
  } else {
    cnaesMeta.textContent = `${cnaesSec.length} atividade(s) secundária(s)`;
    cnaesTb.innerHTML = cnaesSec.map((c) => `<tr>
      <td>${esc(c.codigo != null ? c.codigo : "-")}</td>
      <td>${esc(c.descricao || "-")}</td>
    </tr>`).join("");
  }

  const qsa = data.qsa || [];
  const qsaMeta = $("#modal-fornecedor-qsa-meta");
  const qsaTb = $("#modal-fornecedor-qsa");
  if (data.aviso) {
    qsaMeta.textContent = data.aviso;
    qsaTb.innerHTML = '<tr><td colspan="4">-</td></tr>';
  } else if (!qsa.length) {
    qsaMeta.textContent = data.tipo === "cnpj"
      ? "QSA não informado pela API pública para este CNPJ."
      : "Sem QSA.";
    qsaTb.innerHTML = '<tr><td colspan="4">-</td></tr>';
  } else {
    qsaMeta.textContent = `${qsa.length} sócio(s) / administrador(es)`;
    qsaTb.innerHTML = qsa.map((s) => `<tr>
      <td>${esc(s.nome_socio)}</td>
      <td>${esc(fmtCnpjCpf(s.cnpj_cpf_socio) || s.cnpj_cpf_socio)}</td>
      <td>${esc(s.qualificacao)}</td>
      <td>${esc(s.data_entrada)}</td>
    </tr>`).join("");
  }

  const btnRefresh = $("#btn-fornecedor-refresh");
  if (btnRefresh) btnRefresh.disabled = data.tipo !== "cnpj";
}

async function abrirDetalheFornecedor(ni, nome, { refresh = false } = {}) {
  const digits = String(ni || "").replace(/\D/g, "");
  if (!digits) return;
  fornecedorNiAtual = digits;
  fornecedorNomeHint = nome || null;
  const dlg = $("#modal-fornecedor-cnpj");
  $("#modal-fornecedor-titulo").textContent = "Carregando…";
  $("#modal-fornecedor-resumo").innerHTML = `<p class="meta-line">Consultando cadastro${refresh ? " (atualizando)" : ""}…</p>`;
  $("#modal-fornecedor-cadastro").innerHTML = "";
  $("#modal-fornecedor-cnaes").innerHTML = '<tr><td colspan="2">Carregando…</td></tr>';
  $("#modal-fornecedor-cnaes-meta").textContent = "-";
  $("#modal-fornecedor-qsa").innerHTML = '<tr><td colspan="4">Carregando…</td></tr>';
  $("#modal-fornecedor-qsa-meta").textContent = "-";
  dlg.showModal();
  try {
    const params = new URLSearchParams();
    if (refresh) params.set("refresh", "true");
    if (nome) params.set("nome", nome);
    const qs = params.toString() ? `?${params}` : "";
    const data = await api(`/api/compras/fornecedores/${encodeURIComponent(digits)}${qs}`);
    renderFornecedorDetalhe(data);
  } catch (err) {
    $("#modal-fornecedor-resumo").innerHTML = `<p class="meta-line">${esc(err.message)}</p>`;
    $("#modal-fornecedor-cadastro").innerHTML = "";
    $("#modal-fornecedor-cnaes-meta").textContent = "Falha ao carregar.";
    $("#modal-fornecedor-cnaes").innerHTML = `<tr><td colspan="2">${esc(err.message)}</td></tr>`;
    $("#modal-fornecedor-qsa-meta").textContent = "Falha ao carregar.";
    $("#modal-fornecedor-qsa").innerHTML = `<tr><td colspan="4">${esc(err.message)}</td></tr>`;
  }
}

$("#form-compras-filtros")?.addEventListener("submit", (e) => { e.preventDefault(); buscarCompras(); });
$("#btn-compras-limpar")?.addEventListener("click", () => {
  $("#form-compras-filtros")?.reset();
  limparFiltroPeriodo("compras");
  multiSelectOf("#compras-filtro-modalidade")?.clear({ silent: true });
  buscarCompras();
});
wireSortableHeaders($("#compras-tabela-head"), (key, dir) => {
  comprasSortKey = key;
  comprasSortDir = dir;
  renderComprasTabela();
});
$("#modal-compras-fechar")?.addEventListener("click", () => $("#modal-compras").close());
$("#modal-fornecedor-fechar")?.addEventListener("click", () => $("#modal-fornecedor-cnpj")?.close());
$("#btn-fornecedor-refresh")?.addEventListener("click", () => {
  if (fornecedorNiAtual) abrirDetalheFornecedor(fornecedorNiAtual, fornecedorNomeHint, { refresh: true });
});

$("#form-compra")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!compraAtualId) return;
  try {
    const obsVal = $("#edit-compra-observador").value;
    await api(`/api/compras/contratacoes/${compraAtualId}`, {
      method: "PATCH",
      body: JSON.stringify({ observador_id: obsVal ? parseInt(obsVal, 10) : 0 }),
    });
    $("#modal-compras").close();
    buscarCompras();
  } catch (err) { alert(err.message); }
});

async function atualizarCompraDaApi() {
  if (!compraAtualId) return;
  const btn = $("#btn-compra-atualizar-api");
  const meta = $("#compra-atualizar-api-meta");
  if (btn) btn.disabled = true;
  if (meta) {
    meta.hidden = false;
    meta.textContent = "Consultando API Compras.gov / PNCP…";
  }
  try {
    const out = await api(`/api/compras/contratacoes/${compraAtualId}/atualizar-api`, {
      method: "POST",
      body: "{}",
    });
    const c = out.contadores || {};
    const partes = [];
    if (c.itens_total != null) partes.push(`${c.itens_total} item(ns)`);
    if (c.resultados_total != null) partes.push(`${c.resultados_total} resultado(s)`);
    const msg = partes.length
      ? `Atualizado da API · ${partes.join(" · ")}`
      : "Atualizado da API.";
    await abrirDetalheCompra(compraAtualId);
    if (meta) {
      meta.hidden = false;
      meta.textContent = msg;
    }
    buscarCompras();
  } catch (err) {
    let msg = err.message || "Falha ao atualizar.";
    try {
      const j = JSON.parse(msg);
      if (j && j.detail) msg = typeof j.detail === "string" ? j.detail : msg;
    } catch { /* texto puro */ }
    if (meta) {
      meta.hidden = false;
      meta.textContent = msg;
    } else {
      alert(msg);
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

$("#btn-compra-atualizar-api")?.addEventListener("click", (e) => {
  e.preventDefault();
  atualizarCompraDaApi();
});

let comprasIniciado = false;
async function carregarComprasPagina() {
  iniciarFiltroPeriodo("compras");
  await carregarComprasFiltros();
  if (!comprasIniciado) { comprasIniciado = true; buscarCompras(); }
}

registrarPagina("compras", carregarComprasPagina);

/* Exposto para a tela consolidada de CNPJs vencedores */
window.OSB = window.OSB || { loaders: {} };
window.OSB.abrirDetalheFornecedor = abrirDetalheFornecedor;
window.OSB.abrirDetalheCompra = abrirDetalheCompra;
window.OSB.fmtCnpjCpf = fmtCnpjCpf;
