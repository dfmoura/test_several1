let comprasUnidades = [];
let comprasModalidades = [];
let compraAtualId = null;
let compraItemSelecionado = null;
let comprasPollTimer = null;

const COMPRAS_CAMPOS_IDENT = [
  ["numero", "Nº compra"],
  ["modalidade_descricao", "Modalidade"],
  ["processo", "Processo"],
  ["ano", "Ano"],
  ["situacao_lista", "Situação"],
  ["id_compra", "Id compra"],
];

const COMPRAS_CAMPOS_PRAZOS = [
  ["data_publicacao_pncp", "Publicação PNCP"],
  ["data_abertura_proposta_pncp", "Abertura propostas"],
  ["data_encerramento_proposta_pncp", "Encerramento propostas"],
  ["valor_total_estimado", "Valor estimado"],
  ["valor_total_homologado", "Valor homologado"],
];

const COMPRAS_CAMPOS_ORGAO = [
  ["unidade_nome", "Unidade compradora"],
  ["orgao_entidade_razao_social", "Órgão entidade"],
];

const COMPRAS_CAMPOS_REFS = [
  ["numero_controle_pncp", "Nº controle PNCP"],
  ["link_pncp", "Link PNCP"],
];

const COMPRAS_PNCP_EXTRA_LABELS = {
  sequencial_compra_pncp: "Sequencial PNCP",
  orgao_entidade_cnpj: "CNPJ órgão",
  codigo_orgao: "Código órgão",
  unidade_orgao_municipio_nome: "Município",
  unidade_orgao_uf_sigla: "UF",
  amparo_legal_nome: "Amparo legal",
  modo_disputa_nome_pncp: "Modo disputa",
  srp: "SRP",
  contratacao_excluida: "Excluída",
};

async function carregarComprasUnidades() {
  comprasUnidades = await api("/api/compras/unidades");
  const el = $("#compras-filtro-unidade");
  const box = $("#compras-coleta-unidades");
  if (el) {
    el.innerHTML = '<option value="">Todas</option>';
    comprasUnidades.forEach((u) => {
      const o = document.createElement("option");
      o.value = u.codigo;
      o.textContent = `${u.codigo} · ${u.nome}`;
      el.appendChild(o);
    });
  }
  if (box) {
    box.innerHTML = comprasUnidades.map((u) => `
      <label class="chk-label inline-chk">
        <input type="checkbox" name="unidade" value="${esc(u.codigo)}" checked />
        ${esc(u.nome)}
      </label>`).join("");
  }
}

async function carregarComprasModalidades() {
  comprasModalidades = await api("/api/compras/modalidades");
  const box = $("#compras-coleta-modalidades");
  if (!box) return;
  box.innerHTML = comprasModalidades.map((m) => `
    <label class="chk-label inline-chk" title="${esc(m.nome)}">
      <input type="checkbox" name="modalidade" value="${m.codigo}" checked />
      ${m.codigo} · ${esc(m.nome)}
    </label>`).join("");
}

async function carregarComprasObservadores() {
  const obs = await api("/api/observadores?ativos=true");
  const sel = $("#edit-compra-observador");
  sel.innerHTML = '<option value="">Nenhum</option>';
  obs.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = o.nome;
    sel.appendChild(opt);
  });
}

function unidadesSelecionadas() {
  return [...document.querySelectorAll('#compras-coleta-unidades input[name="unidade"]:checked')]
    .map((el) => el.value);
}

function modalidadesSelecionadas() {
  return [...document.querySelectorAll('#compras-coleta-modalidades input[name="modalidade"]:checked')]
    .map((el) => parseInt(el.value, 10));
}

$("#form-compras-coletar")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await iniciarColetaCompras("/api/compras/coletar");
});

$("#btn-compras-coletar-completo")?.addEventListener("click", async () => {
  await iniciarColetaCompras("/api/compras/coletar-completo");
});

async function iniciarColetaCompras(endpoint) {
  const btn = $("#btn-compras-coletar");
  const btnFull = $("#btn-compras-coletar-completo");
  const logEl = $("#compras-coleta-log");
  const resEl = $("#compras-coleta-result");
  btn.disabled = true;
  if (btnFull) btnFull.disabled = true;
  logEl.classList.remove("hidden");
  resEl.classList.add("hidden");
  logEl.textContent = "Consultando API Dados Abertos (PNCP)…";
  try {
    const anoVal = $("#compras-coleta-ano").value.trim();
    const payload = {
      unidades: unidadesSelecionadas(),
      modalidades: modalidadesSelecionadas(),
    };
    if (anoVal) payload.ano = parseInt(anoVal, 10);
    const di = $("#compras-coleta-data-inicial").value;
    const df = $("#compras-coleta-data-final").value;
    if (di && df) {
      payload.data_inicial = di;
      payload.data_final = df;
    }
    if (endpoint.includes("completo")) {
      payload.fases = ["07", "07-resultados", "05", "10", "01", "02"];
    }
    await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
    comprasPollTimer = setInterval(pollComprasColeta, 1200);
  } catch (err) {
    logEl.textContent = err.message;
    btn.disabled = false;
    if (btnFull) btnFull.disabled = false;
  }
}

async function pollComprasColeta() {
  const st = await api("/api/compras/coletar/status");
  const fase = st.fase && st.fase !== "idle" ? ` [${st.fase}]` : "";
  $("#compras-coleta-log").textContent = (st.log || []).join("\n") + fase || "Aguardando…";
  if (!st.running && st.resultado) {
    clearInterval(comprasPollTimer);
    $("#btn-compras-coletar").disabled = false;
    const btnFull = $("#btn-compras-coletar-completo");
    if (btnFull) btnFull.disabled = false;
    const resEl = $("#compras-coleta-result");
    resEl.classList.remove("hidden");
    if (st.resultado.ok) {
      resEl.className = "result ok";
      let msg =
        `Concluído: ${st.resultado.total ?? "-"} contratação(ões)`;
      if (st.resultado.novos != null) {
        msg += ` (${st.resultado.novos} novas, ${st.resultado.atualizados} atualizadas).`;
      }
      if (st.resultado.itens_total != null) {
        msg +=
          ` Itens: ${st.resultado.itens_total} (${st.resultado.itens_novos} novos, ${st.resultado.itens_atualizados} atualizados).`;
      }
      if (st.resultado.resultados_novos != null) {
        msg +=
          ` Resultados: ${st.resultado.resultados_novos} novos, ${st.resultado.resultados_atualizados} atualizados.`;
      }
      resEl.textContent = msg;
    } else {
      resEl.className = "result err";
      resEl.textContent = st.resultado.erro || "Erro na coleta";
    }
  }
}

async function carregarComprasFiltros() {
  const [sits, stats] = await Promise.all([
    api("/api/compras/situacoes"),
    api("/api/compras/stats"),
  ]);
  preencherSelect($("#compras-filtro-ano"), anosDeStats(stats.por_ano), "Todos");
  preencherSelect($("#compras-filtro-situacao"), sits, "Todas");
}

$("#form-compras-filtros")?.addEventListener("submit", (e) => {
  e.preventDefault();
  buscarCompras();
});

$("#btn-compras-limpar")?.addEventListener("click", () => {
  $("#form-compras-filtros").reset();
  buscarCompras();
});

async function buscarCompras() {
  const params = new URLSearchParams();
  if ($("#compras-filtro-ano").value) params.set("ano", $("#compras-filtro-ano").value);
  if ($("#compras-filtro-unidade").value) params.set("unidade_codigo", $("#compras-filtro-unidade").value);
  if ($("#compras-filtro-situacao").value) params.set("situacao", $("#compras-filtro-situacao").value);
  if ($("#compras-filtro-processo").value.trim()) params.set("processo", $("#compras-filtro-processo").value.trim());
  if ($("#compras-filtro-numero").value.trim()) params.set("numero", $("#compras-filtro-numero").value.trim());
  if ($("#compras-filtro-texto").value.trim()) params.set("texto", $("#compras-filtro-texto").value.trim());
  params.set("limit", "500");

  const data = await api(`/api/compras/contratacoes?${params}`);
  const filtros = [];
  if ($("#compras-filtro-processo").value.trim()) filtros.push(`processo: ${$("#compras-filtro-processo").value.trim()}`);
  if ($("#compras-filtro-numero").value.trim()) filtros.push(`nº: ${$("#compras-filtro-numero").value.trim()}`);
  if ($("#compras-filtro-situacao").value) filtros.push(`situação: ${$("#compras-filtro-situacao").value}`);
  $("#compras-consulta-meta").textContent =
    `${data.total} registro(s) · PNCP${filtros.length ? " · " + filtros.join(" · ") : ""}`;

  const tb = $("#compras-tabela");
  if (!data.items.length) {
    tb.innerHTML = '<tr><td colspan="10">Nenhum registro encontrado.</td></tr>';
    return;
  }

  tb.innerHTML = data.items.map((r) => `
    <tr data-id="${r.id}" title="Clique para detalhes">
      <td class="col-num"><strong>${esc(r.numero || r.id_compra || r.chave_compra)}</strong>
        ${r.modalidade_descricao ? `<br><span class="pill-mod">${esc(r.modalidade_descricao)}</span>` : ""}</td>
      <td class="col-proc"><strong>${esc(r.processo)}</strong></td>
      <td class="col-org" title="${esc(r.unidade_nome)}">${esc(r.unidade_nome)}</td>
      <td class="col-ano">${r.ano}</td>
      <td class="col-sit">${pillSituacao(r.situacao_lista || r.situacao_pncp)}</td>
      <td class="col-val">${esc(r.valor_total_estimado)}</td>
      <td class="col-val">${esc(r.valor_total_homologado)}</td>
      <td class="col-pncp">${esc(r.numero_controle_pncp || r.id_contratacao_pncp)}</td>
      <td class="col-obs">${esc(r.observador_nome)}</td>
      <td class="col-desc" title="${esc(r.objeto)}">${esc(r.objeto)}</td>
    </tr>`).join("");

  tb.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => abrirDetalheCompra(tr.dataset.id));
  });
}

function renderPainel(campos, registro) {
  return campos
    .map(([k, label]) => {
      const v = registro[k];
      if (v == null || v === "") return "";
      if (k === "link_pncp") {
        return `<dt>${label}</dt><dd><a href="${v}" target="_blank" rel="noopener" class="link-pncp">Abrir no PNCP</a></dd>`;
      }
      if (k === "situacao_lista") {
        return `<dt>${label}</dt><dd>${pillSituacao(v)}</dd>`;
      }
      return `<dt>${label}</dt><dd>${esc(v)}</dd>`;
    })
    .filter(Boolean)
    .join("");
}

const COMPRAS_EXTRA_IGNORAR = new Set([
  ...COMPRAS_CAMPOS_IDENT.map(([k]) => k),
  ...COMPRAS_CAMPOS_PRAZOS.map(([k]) => k),
  ...COMPRAS_CAMPOS_ORGAO.map(([k]) => k),
  ...COMPRAS_CAMPOS_REFS.map(([k]) => k),
  "objeto", "informacao_complementar", "chave_compra", "unidade_compradora",
  "modalidade_codigo", "observador_id", "coletado_em", "dados_pncp",
  "data_divulgacao_pncp", "situacao_pncp", "id_contratacao_pncp",
  "inicio_recebimento_propostas", "fim_recebimento_propostas", "url_acompanhamento",
]);

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

  $("#modal-compras-ident").innerHTML = renderPainel(COMPRAS_CAMPOS_IDENT, r);
  $("#modal-compras-prazos").innerHTML = renderPainel(COMPRAS_CAMPOS_PRAZOS, r);
  $("#modal-compras-orgao").innerHTML = renderPainel(COMPRAS_CAMPOS_ORGAO, r);
  $("#modal-compras-refs").innerHTML = renderPainel(COMPRAS_CAMPOS_REFS, r);

  const objEl = $("#modal-compras-objeto");
  if (r.objeto) {
    objEl.textContent = r.objeto;
    objEl.classList.remove("muted-empty");
  } else {
    objEl.textContent = "-";
    objEl.classList.add("muted-empty");
  }

  const infoWrap = $("#modal-compras-info-wrap");
  const infoEl = $("#modal-compras-info");
  if (r.informacao_complementar) {
    infoWrap.hidden = false;
    infoEl.textContent = r.informacao_complementar;
  } else {
    infoWrap.hidden = true;
    infoEl.textContent = "";
  }

  const extraWrap = $("#modal-compras-extra-wrap");
  const extraEl = $("#modal-compras-extra");
  let extraHtml = "";
  if (r.dados_pncp) {
    extraHtml = Object.entries(r.dados_pncp)
      .filter(([k, v]) => v != null && v !== "" && !COMPRAS_EXTRA_IGNORAR.has(k))
      .map(([k, v]) => {
        const label = COMPRAS_PNCP_EXTRA_LABELS[k] || k.replace(/_/g, " ");
        return `<dt>${esc(label)}</dt><dd>${esc(v)}</dd>`;
      })
      .join("");
  }
  if (extraHtml) {
    extraWrap.hidden = false;
    extraEl.innerHTML = extraHtml;
  } else {
    extraWrap.hidden = true;
    extraEl.innerHTML = "";
  }

  await carregarItensCompra(id);
  await carregarPgcCompra(r);
  ativarComprasTab("execucao");

  $("#edit-compra-observador").value = r.observador_id || "";
  $("#modal-compras").showModal();
}

function ativarComprasTab(tab) {
  document.querySelectorAll(".compras-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.querySelectorAll(".compras-tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `compras-tab-${tab}`);
  });
}

document.querySelectorAll(".compras-tab")?.forEach((btn) => {
  btn.addEventListener("click", () => ativarComprasTab(btn.dataset.tab));
});

function renderVencedores(it) {
  const res = it.resultados || [];
  if (res.length) {
    return res.map((r) => {
      const nome = r.nome_razao_social_fornecedor || r.nome_fornecedor || "-";
      const val = r.valor_total_homologado || "";
      const srp = r.ordem_classificacao_srp ? ` · ${r.ordem_classificacao_srp}º SRP` : "";
      return `<div>${esc(nome)}${val ? ` · <strong>${esc(val)}</strong>` : ""}${srp}</div>`;
    }).join("");
  }
  if (it.nome_fornecedor) {
    return `${esc(it.nome_fornecedor)}${it.valor_total_resultado ? ` · ${esc(it.valor_total_resultado)}` : ""}`;
  }
  if (it.tem_resultado === false || (!it.valor_total_homologado && it.valor_total)) {
    return '<span class="badge-estimado">Só estimado</span>';
  }
  return '<span class="muted-empty">Sem homologação</span>';
}

function deltaPct(estimado, homologado) {
  const parse = (s) => {
    if (!s) return null;
    const n = parseFloat(String(s).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const e = parse(estimado);
  const h = parse(homologado);
  if (e == null || h == null || e === 0) return "";
  const pct = ((h - e) / e) * 100;
  const sign = pct > 0 ? "+" : "";
  return `<span class="item-resultado-sub">${sign}${pct.toFixed(1)}%</span>`;
}

async function carregarItensCompra(cid) {
  const wrap = $("#modal-compras-itens-wrap");
  const meta = $("#modal-compras-itens-meta");
  const tb = $("#modal-compras-itens-tabela");
  if (!wrap || !tb) return;

  wrap.hidden = false;
  meta.textContent = "Carregando itens…";
  tb.innerHTML = "";

  try {
    const data = await api(`/api/compras/contratacoes/${cid}/itens?limit=500`);
    if (!data.items.length) {
      meta.textContent = "Nenhum item cadastrado para esta contratação.";
      tb.innerHTML = '<tr><td colspan="7">-</td></tr>';
      return;
    }
    meta.textContent = `${data.total} item(ns) · clique em um item para ver preços de mercado`;
    tb.innerHTML = data.items.map((it) => {
      const desc = it.descricao_detalhada || it.descricao_resumida || "-";
      const cat = it.cod_item_catalogo
        ? `${it.material_ou_servico_nome || ""} ${it.cod_item_catalogo}`.trim()
        : (it.material_ou_servico_nome || "-");
      const hom = it.resultados?.[0]?.valor_total_homologado || it.valor_total_resultado || "-";
      return `<tr class="compra-item-row" data-item-id="${esc(it.id_compra_item)}" title="Ver preços de mercado">
        <td class="col-num">${esc(it.numero_item_pncp ?? it.numero_item_compra ?? "")}</td>
        <td class="col-desc" title="${esc(desc)}">${esc(it.descricao_resumida || desc)}</td>
        <td>${esc(cat)}</td>
        <td class="col-qtd">${esc(it.quantidade)} ${esc(it.unidade_medida || "")}</td>
        <td class="col-val">${esc(it.valor_total)}${deltaPct(it.valor_total, hom)}</td>
        <td class="col-val">${esc(hom)}</td>
        <td>${renderVencedores(it)}</td>
      </tr>`;
    }).join("");
    tb.querySelectorAll(".compra-item-row").forEach((tr) => {
      tr.addEventListener("click", () => {
        compraItemSelecionado = tr.dataset.itemId;
        carregarPrecosItem(compraItemSelecionado);
        ativarComprasTab("precos");
      });
    });
  } catch (err) {
    meta.textContent = "Erro ao carregar itens.";
    tb.innerHTML = `<tr><td colspan="7">${esc(err.message)}</td></tr>`;
  }
}

async function carregarPgcCompra(contratacao) {
  const meta = $("#modal-compras-pgc-meta");
  const tb = $("#modal-compras-pgc-tabela");
  if (!meta || !tb) return;
  meta.textContent = "Carregando planejamento…";
  try {
    const cnpj = contratacao.dados_pncp?.orgao_entidade_cnpj || "";
    const params = new URLSearchParams({ ano: String(contratacao.ano) });
    if (cnpj) params.set("orgao", cnpj);
    if (contratacao.unidade_compradora) params.set("uasg", contratacao.unidade_compradora);
    const data = await api(`/api/compras/pgc?${params}`);
    if (!data.items.length) {
      meta.textContent = "Nenhum item PGC vinculado (colete fase 04).";
      tb.innerHTML = '<tr><td colspan="4">-</td></tr>';
      return;
    }
    meta.textContent = `${data.total} item(ns) planejados`;
    tb.innerHTML = data.items.map((p) => `<tr>
      <td>${esc(p.codigo_item_catalogo)}</td>
      <td>${esc(p.descricao)}</td>
      <td>${esc(p.valor_total_item)}</td>
      <td>${esc(p.status)}</td>
    </tr>`).join("");
  } catch (err) {
    meta.textContent = err.message;
    tb.innerHTML = '<tr><td colspan="4">-</td></tr>';
  }
}

async function carregarPrecosItem(idCompraItem) {
  const meta = $("#modal-compras-precos-meta");
  const tb = $("#modal-compras-precos-tabela");
  if (!meta || !tb || !idCompraItem) return;
  meta.textContent = "Carregando preços…";
  try {
    const data = await api(`/api/compras/itens/${encodeURIComponent(idCompraItem)}/precos`);
    if (!data.items.length) {
      meta.textContent = "Sem preços no cache local (colete fase 03 ou use coleta completa).";
      tb.innerHTML = '<tr><td colspan="5">-</td></tr>';
      return;
    }
    meta.textContent = `${data.total} preço(s) praticado(s)`;
    tb.innerHTML = data.items.map((p) => `<tr>
      <td>${esc(p.preco_unitario)}</td>
      <td>${esc(p.quantidade)}</td>
      <td>${esc(p.data_compra)}</td>
      <td>${esc(p.nome_fornecedor)}</td>
      <td>${esc(p.municipio)}${p.estado ? `/${esc(p.estado)}` : ""}</td>
    </tr>`).join("");
  } catch (err) {
    meta.textContent = err.message;
    tb.innerHTML = '<tr><td colspan="5">-</td></tr>';
  }
}

$("#form-compra")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!compraAtualId) return;
  try {
    const obsVal = $("#edit-compra-observador").value;
    await api(`/api/compras/contratacoes/${compraAtualId}`, {
      method: "PATCH",
      body: JSON.stringify({
        observador_id: obsVal ? parseInt(obsVal, 10) : 0,
      }),
    });
    $("#modal-compras").close();
    buscarCompras();
  } catch (err) {
    alert(err.message);
  }
});

$("#modal-compras-fechar")?.addEventListener("click", () => $("#modal-compras").close());

$$(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.page === "compras-consultar") {
      carregarComprasFiltros();
      buscarCompras();
    }
  });
});

Promise.all([carregarComprasUnidades(), carregarComprasModalidades()]).catch(console.error);
