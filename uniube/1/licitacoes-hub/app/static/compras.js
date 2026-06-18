let comprasUnidades = [];
let comprasModalidades = [];
let compraAtualId = null;
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
      o.textContent = `${u.codigo} — ${u.nome}`;
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
      ${m.codigo} — ${esc(m.nome)}
    </label>`).join("");
}

async function carregarComprasObservadores() {
  const obs = await api("/api/observadores?ativos=true");
  const sel = $("#edit-compra-observador");
  sel.innerHTML = '<option value="">— Nenhum —</option>';
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
  const btn = $("#btn-compras-coletar");
  const logEl = $("#compras-coleta-log");
  const resEl = $("#compras-coleta-result");
  btn.disabled = true;
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
    await api("/api/compras/coletar", { method: "POST", body: JSON.stringify(payload) });
    comprasPollTimer = setInterval(pollComprasColeta, 1200);
  } catch (err) {
    logEl.textContent = err.message;
    btn.disabled = false;
  }
});

async function pollComprasColeta() {
  const st = await api("/api/compras/coletar/status");
  $("#compras-coleta-log").textContent = (st.log || []).join("\n") || "Aguardando…";
  if (!st.running && st.resultado) {
    clearInterval(comprasPollTimer);
    $("#btn-compras-coletar").disabled = false;
    const resEl = $("#compras-coleta-result");
    resEl.classList.remove("hidden");
    if (st.resultado.ok) {
      resEl.className = "result ok";
      resEl.textContent =
        `Concluído: ${st.resultado.total} registros (${st.resultado.novos} novos, ${st.resultado.atualizados} atualizados).`;
    } else {
      resEl.className = "result err";
      resEl.textContent = st.resultado.erro || "Erro na coleta";
    }
  }
}

async function carregarComprasFiltros() {
  const sits = await api("/api/compras/situacoes");
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
  if ($("#compras-filtro-numero").value.trim()) params.set("numero", $("#compras-filtro-numero").value.trim());
  if ($("#compras-filtro-texto").value.trim()) params.set("texto", $("#compras-filtro-texto").value.trim());
  params.set("limit", "500");

  const data = await api(`/api/compras/contratacoes?${params}`);
  const filtros = [];
  if ($("#compras-filtro-numero").value.trim()) filtros.push(`nº: ${$("#compras-filtro-numero").value.trim()}`);
  if ($("#compras-filtro-situacao").value) filtros.push(`situação: ${$("#compras-filtro-situacao").value}`);
  $("#compras-consulta-meta").textContent =
    `${data.total} registro(s) — PNCP${filtros.length ? " · " + filtros.join(" · ") : ""}`;

  const tb = $("#compras-tabela");
  if (!data.items.length) {
    tb.innerHTML = '<tr><td colspan="9">Nenhum registro encontrado.</td></tr>';
    return;
  }

  tb.innerHTML = data.items.map((r) => `
    <tr data-id="${r.id}" title="Clique para detalhes">
      <td class="col-num"><strong>${esc(r.numero || r.id_compra || r.chave_compra)}</strong>
        ${r.modalidade_descricao ? `<br><span class="pill-mod">${esc(r.modalidade_descricao)}</span>` : ""}</td>
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
    objEl.textContent = "—";
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

  $("#edit-compra-observador").value = r.observador_id || "";
  $("#modal-compras").showModal();
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
