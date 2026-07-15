/* ============================================================
   consulta_processo.js — consulta unificada por processo
   Duas bases: Compras.gov · PNCP (api) + Power BI · PMU (powerbi)
   ============================================================ */

const CP_BASES = {
  api: { label: "Compras.gov · PNCP", badge: "api", tag: "PNCP", desc: "API Dados Abertos federal" },
  powerbi: { label: "Power BI · PMU", badge: "powerbi", tag: "Power BI", desc: "Dados Abertos municipais" },
};

function cpCoberturaBadges(cobertura) {
  return Object.entries(CP_BASES).map(([id, cfg]) => {
    const ok = cobertura?.[id];
    return `<span class="cp-cobertura-chip ${ok ? "ok" : "ausente"}" title="${cfg.label}">
      <span class="dash-base-badge ${cfg.badge}">${cfg.tag}</span>
      ${ok ? "Presente" : "Ausente"}
    </span>`;
  }).join("");
}

function cpPainelDetalhe(campos, registro, linkKey) {
  return campos.map(([k, label]) => {
    const v = registro[k];
    if (v == null || v === "") return "";
    if (k === linkKey && v) {
      return `<dt>${label}</dt><dd><a href="${v}" target="_blank" rel="noopener" class="link-pncp">Abrir</a></dd>`;
    }
    if (k === "situacao" || k === "situacao_lista") return `<dt>${label}</dt><dd>${pillSituacao(v)}</dd>`;
    return `<dt>${label}</dt><dd>${esc(v)}</dd>`;
  }).filter(Boolean).join("");
}

const CP_API_IDENT = [
  ["numero", "Nº compra"], ["processo", "Processo"], ["modalidade_descricao", "Modalidade"],
  ["ano", "Ano"], ["situacao_lista", "Situação"], ["unidade_nome", "Unidade"],
];
const CP_API_VALORES = [
  ["valor_total_estimado", "Valor estimado"], ["valor_total_homologado", "Valor homologado"],
  ["data_publicacao_pncp", "Publicação"], ["data_abertura_proposta_pncp", "Abertura propostas"],
  ["numero_controle_pncp", "Nº controle PNCP"], ["link_pncp", "Link PNCP"],
];

function cpItensApi(itens) {
  if (!itens?.length) return '<p class="muted small">Nenhum item coletado.</p>';
  return `<div class="table-scroll cp-itens-scroll">
    <table class="data-table cp-itens-table">
      <thead><tr>
        <th class="col-id">Item</th>
        <th class="col-text">Descrição</th>
        <th class="col-qtd">Qtd.</th>
        <th class="col-num">V. total</th>
        <th class="col-sit">Situação</th>
      </tr></thead>
      <tbody>${itens.map((it) => {
        const desc = it.descricao_resumida || it.descricao_detalhada || "";
        const title = it.descricao_detalhada || it.descricao_resumida || "";
        return `<tr>
          <td class="col-id">${esc(it.numero_item_pncp ?? it.id)}</td>
          <td class="col-wrap" title="${esc(title)}">${esc(desc)}</td>
          <td class="col-qtd">${esc(it.quantidade)} ${esc(it.unidade_medida)}</td>
          <td class="col-num">${esc(it.valor_total || it.valor_total_resultado)}</td>
          <td class="col-sit">${pillSituacao(it.situacao_compra_item_nome)}</td>
        </tr>`;
      }).join("")}
      </tbody>
    </table>
  </div>`;
}

function cpArvorePbi(arvore) {
  const lic = arvore.licitacao || {};
  let html = `<dl class="detail-grid">${cpPainelDetalhe([
    ["processo", "Processo"], ["modalidade", "Modalidade"], ["orgao_nome", "Empresa"],
    ["ano_processo", "Ano"], ["situacao", "Situação"], ["solicitante", "Solicitante"],
    ["dt_abertura", "Abertura"], ["dt_homologacao", "Homologação"],
    ["valor_licitacao", "Valor"], ["observador_nome", "Observador"],
  ], lic)}</dl>`;

  if (lic.objeto) {
    html += `<section class="detail-panel detail-panel-wide"><h4 class="detail-panel-title">Objeto</h4><p class="objeto-text">${esc(lic.objeto)}</p></section>`;
  }
  if (arvore.sem_contrato) {
    html += '<p class="muted small">Nenhum contrato vinculado a este processo.</p>';
    return html;
  }
  html += (arvore.contratos || []).map((g) => `
    <section class="cp-contrato-bloco">
      <div class="cp-contrato-head">
        <strong>Contrato ${esc(g.nr_contrato)}</strong>
        <span class="muted-inline">${esc(g.ano_contrato)} · ${esc(g.fornecedor_nome)}</span>
        ${g.valor_total ? `<span class="cp-valor-tag">${esc(g.valor_total)}</span>` : ""}
      </div>
      ${g.ds_objeto_contrato ? `<p class="muted small">${esc(String(g.ds_objeto_contrato).slice(0, 180))}${g.ds_objeto_contrato.length > 180 ? "…" : ""}</p>` : ""}
      ${(g.responsaveis || []).length ? `<p class="pbi-subtitle">Responsáveis</p>
        <table class="data-table pbi-subtable">
          <thead><tr><th>Pessoa</th><th>Papel</th><th>Órgão</th></tr></thead>
          <tbody>${g.responsaveis.map((r) => `<tr><td>${esc(r.pessoa_nome)}</td><td>${esc(r.papel_descricao)}</td><td>${esc(r.orgao_nome)}</td></tr>`).join("")}</tbody>
        </table>` : ""}
    </section>`).join("");
  return html;
}

function cpPainelBase(baseId, data) {
  const cfg = CP_BASES[baseId];
  const presente = Array.isArray(data) ? data.length > 0 : !!data;
  let body = "";
  if (!presente) {
    body = `<p class="cp-painel-vazio">Processo não encontrado nesta base.</p>`;
  } else if (baseId === "api") {
    body = data.map((r) => `
      <div class="cp-registro-bloco">
        <div class="cp-registro-head">
          <strong>${esc(r.numero || r.id_compra)}</strong>
          ${r.modalidade_descricao ? `<span class="pill-mod">${esc(r.modalidade_descricao)}</span>` : ""}
          ${pillSituacao(r.situacao_lista || r.situacao_pncp)}
        </div>
        <div class="detail-sections">
          <section class="detail-panel"><h4 class="detail-panel-title">Identificação</h4><dl class="detail-grid">${cpPainelDetalhe(CP_API_IDENT, r)}</dl></section>
          <section class="detail-panel"><h4 class="detail-panel-title">Valores e prazos</h4><dl class="detail-grid">${cpPainelDetalhe(CP_API_VALORES, r, "link_pncp")}</dl></section>
        </div>
        ${r.objeto ? `<section class="detail-panel detail-panel-wide"><h4 class="detail-panel-title">Objeto</h4><p class="objeto-text">${esc(r.objeto)}</p></section>` : ""}
        <section class="detail-panel detail-panel-wide"><h4 class="detail-panel-title">Itens (${(r.itens || []).length})</h4>${cpItensApi(r.itens)}</section>
      </div>`).join("");
  } else {
    body = data.map((arv) => cpArvorePbi(arv)).join("");
  }
  return `<article class="cp-base-panel">
    <header class="cp-base-head">
      <span class="dash-base-badge ${cfg.badge}">${cfg.tag}</span>
      <h3>${cfg.label}</h3>
      <p class="dash-base-desc">${cfg.desc}</p>
    </header>
    <div class="cp-base-body">${body}</div>
  </article>`;
}

function cpPickerGrid(grupos, mensagem) {
  return `<div class="panel">
    <h3 class="panel-title">Múltiplos processos encontrados</h3>
    <p class="muted">${esc(mensagem || "Selecione o processo desejado.")}</p>
    <div class="cp-picker-grid">${grupos.map((g, i) => {
      const ch = g.chave;
      const attrs = ch
        ? `data-chave-orgao="${ch.orgao_id}" data-chave-ano="${ch.ano}" data-chave-numero="${ch.numero}"`
        : `data-processo="${esc(g.rotulo)}" data-idx="${i}"`;
      return `<button type="button" class="cp-picker-card" ${attrs}>
        <span class="cp-picker-proc">${esc(g.rotulo)}</span>
        <span class="cp-picker-meta">${esc(g.orgao || "")}${g.ano ? ` · ${g.ano}` : ""}</span>
        <span class="cp-picker-bases">${cpCoberturaBadges(g.cobertura)}</span>
      </button>`;
    }).join("")}</div>
  </div>`;
}

function cpRenderDetalhe(data) {
  const chave = data.chave || {};
  const titulo = chave.rotulo || "Processo";
  const sub = [chave.orgao_nome, chave.ano ? `Ano ${chave.ano}` : null, chave.numero ? `Nº ${chave.numero}` : null]
    .filter(Boolean).join(" · ");
  const cobertura = data.cobertura || {};
  const nasDuas = cobertura.api && cobertura.powerbi;

  $("#cp-resultado").innerHTML = `
    <div class="cp-hero panel">
      <div>
        <h2>${esc(titulo)}</h2>
        <p class="cp-hero-sub">${esc(sub) || "Consulta unificada"}</p>
      </div>
      <div class="cp-hero-badges">
        ${cpCoberturaBadges(cobertura)}
        ${nasDuas ? '<span class="cp-badge-tres">Presente nas 2 bases</span>' : ""}
      </div>
    </div>
    <div class="cp-bases-grid">
      ${cpPainelBase("api", data.api)}
      ${cpPainelBase("powerbi", data.powerbi)}
    </div>`;
  $("#cp-resultado").classList.remove("hidden");
  $("#cp-picker").classList.add("hidden");
  $("#cp-picker").innerHTML = "";
}

async function carregarCpFiltros() {
  const selAno = $("#cp-filtro-ano");
  const selOrg = $("#cp-filtro-orgao");
  try {
    const data = await api("/api/consulta-processo/filtros");
    if (selAno) {
      selAno.innerHTML = '<option value="">Todos</option>' +
        (data.anos || []).map((a) => `<option value="${a}">${a}</option>`).join("");
    }
    if (selOrg) {
      const orgaos = data.orgaos || [];
      selOrg.innerHTML = '<option value="">Todos (órgão consolidado)</option>' +
        (orgaos.length
          ? orgaos.map((o) => `<option value="${o.id}">${esc(o.sigla ? `${o.sigla} · ${o.nome}` : o.nome)}</option>`).join("")
          : '<option value="" disabled>Cadastre em Vínculos · Órgãos</option>');
    }
    const mods = data.modalidades || [];
    multiSelectOf("#cp-filtro-modalidade")?.setOptions(
      mods.map((m) => ({ value: m.id, label: m.nome })),
    );
  } catch (err) {
    const meta = $("#cp-consulta-meta");
    if (meta) meta.innerHTML = `<span class="err">Não foi possível carregar filtros: ${esc(err.message)}</span>`;
  }
}

function cpParamsBusca() {
  const proc = $("#cp-filtro-processo")?.value.trim();
  if (!proc) return null;
  const params = new URLSearchParams();
  params.set("processo", proc);
  const ano = $("#cp-filtro-ano")?.value;
  if (ano) params.set("ano", ano);
  const org = $("#cp-filtro-orgao")?.value;
  if (org) params.set("orgao_id", org);
  appendQueryAll(params, "modalidade_id", multiSelectOf("#cp-filtro-modalidade")?.getValues());
  return params;
}

async function buscarProcessoUnificado() {
  const params = cpParamsBusca();
  if (!params) { alert("Informe o número ou texto do processo."); return; }
  const meta = $("#cp-consulta-meta");
  const btn = $("#btn-cp-buscar");
  const resultado = $("#cp-resultado");
  const picker = $("#cp-picker");

  btn.disabled = true;
  meta.textContent = "Buscando nas duas bases…";
  resultado.classList.add("hidden");
  picker.classList.add("hidden");
  picker.innerHTML = "";

  try {
    const data = await api(`/api/consulta-processo/detalhe?${params}`);
    if (data.multiplos) {
      meta.textContent = `${data.grupos?.length || 0} processo(s) distinto(s) encontrado(s)`;
      picker.innerHTML = cpPickerGrid(data.grupos, data.mensagem);
      picker.classList.remove("hidden");
      picker.querySelectorAll(".cp-picker-card").forEach((c) => c.addEventListener("click", () => abrirCpPorChave(c)));
      return;
    }
    meta.textContent = `Processo encontrado · Compras.gov: ${data.api?.length || 0} · Power BI: ${data.powerbi?.length || 0}`;
    cpRenderDetalhe(data);
  } catch (err) {
    meta.textContent = err.message;
    resultado.innerHTML = `<div class="panel"><p class="result err">${esc(err.message)}</p></div>`;
    resultado.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
}

async function abrirCpPorChave(card) {
  const params = new URLSearchParams();
  if (card.dataset.chaveOrgao) {
    params.set("chave_orgao_id", card.dataset.chaveOrgao);
    params.set("chave_ano", card.dataset.chaveAno);
    params.set("chave_numero", card.dataset.chaveNumero);
    const modVals = multiSelectOf("#cp-filtro-modalidade")?.getValues() || [];
    appendQueryAll(params, "modalidade_id", modVals);
  } else {
    const p = cpParamsBusca();
    if (!p) return;
    p.forEach((v, k) => params.set(k, v));
  }
  const meta = $("#cp-consulta-meta");
  meta.textContent = "Carregando detalhes…";
  try {
    const data = await api(`/api/consulta-processo/detalhe?${params}`);
    if (data.multiplos) {
      $("#cp-picker").innerHTML = cpPickerGrid(data.grupos, data.mensagem);
      $("#cp-picker").classList.remove("hidden");
      $("#cp-picker").querySelectorAll(".cp-picker-card").forEach((c) => c.addEventListener("click", () => abrirCpPorChave(c)));
      return;
    }
    meta.textContent = `Detalhe · ${data.chave?.rotulo || "Processo"}`;
    cpRenderDetalhe(data);
  } catch (err) {
    meta.textContent = err.message;
  }
}

$("#form-cp-filtros")?.addEventListener("submit", (e) => { e.preventDefault(); buscarProcessoUnificado(); });
$("#btn-cp-limpar")?.addEventListener("click", () => {
  $("#form-cp-filtros")?.reset();
  carregarCpFiltros();
  $("#cp-resultado")?.classList.add("hidden");
  $("#cp-resultado").innerHTML = "";
  $("#cp-picker")?.classList.add("hidden");
  $("#cp-picker").innerHTML = "";
});

registrarPagina("consulta", carregarCpFiltros);
