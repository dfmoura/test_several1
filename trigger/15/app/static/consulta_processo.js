/** Consulta unificada por processo — Portal + API PNCP + Power BI */

const $cp = (s) => document.querySelector(s);

async function cpApi(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error((await r.text()) || r.statusText);
  return r.json();
}

function cpEsc(t) {
  const e = document.createElement("span");
  e.textContent = t ?? "-";
  return e.innerHTML;
}

function cpFmtMoeda(v) {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  if (Number.isNaN(n)) return cpEsc(v);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function cpPillSit(sit) {
  if (!sit) return '<span class="muted-inline">—</span>';
  const s = String(sit).toLowerCase();
  let cls = "pill-sit";
  if (s.includes("andamento")) cls += " andamento";
  else if (s.includes("conclu") || s.includes("homolog")) cls += " concluido";
  return `<span class="${cls}">${cpEsc(sit)}</span>`;
}

const CP_BASES = {
  portal: { label: "Portal Prefeitura", badge: "portal", desc: "Fonte oficial · weblicitacoes" },
  api: { label: "Compras.gov · PNCP", badge: "api", desc: "API Dados Abertos" },
  powerbi: { label: "Power BI · PMU", badge: "powerbi", desc: "Dados Abertos municipais" },
};

function renderCoberturaBadges(cobertura) {
  return Object.entries(CP_BASES).map(([id, cfg]) => {
    const ok = cobertura?.[id];
    return `<span class="cp-cobertura-chip ${ok ? "ok" : "ausente"}" title="${cfg.label}">
      <span class="dash-base-badge ${cfg.badge}">${id === "api" ? "API" : id === "powerbi" ? "PBI" : "Portal"}</span>
      ${ok ? "Presente" : "Ausente"}
    </span>`;
  }).join("");
}

function renderComparativo(comp) {
  if (!comp) return "";
  const rows = [
    { label: "Situação", key: "situacao", fmt: (v) => cpPillSit(v) },
    { label: "Modalidade", key: "modalidade", fmt: (v) => cpEsc(v) },
    {
      label: "Valor",
      key: "valores",
      fmt: (_, row) => {
        const v = row.valores || {};
        const parts = [];
        if (v.portal_estimado) parts.push(`Portal: ${cpEsc(v.portal_estimado)}`);
        if (v.api_estimado) parts.push(`API est.: ${cpEsc(v.api_estimado)}`);
        if (v.api_homologado) parts.push(`API hom.: ${cpEsc(v.api_homologado)}`);
        if (v.powerbi) parts.push(`PBI: ${cpEsc(v.powerbi)}`);
        return parts.length ? parts.join("<br>") : "—";
      },
    },
    {
      label: "Objeto",
      key: "objeto",
      fmt: (_, row) => {
        const o = row.objeto || {};
        const parts = [o.portal, o.api, o.powerbi].filter(Boolean);
        if (!parts.length) return "—";
        const uniq = [...new Set(parts.map((p) => String(p).slice(0, 120)))];
        return uniq.length === 1
          ? `<span class="cp-objeto-match" title="${cpEsc(parts[0])}">${cpEsc(String(parts[0]).slice(0, 100))}${parts[0].length > 100 ? "…" : ""}</span>`
          : `<span class="cp-objeto-diff" title="Objetos divergentes entre bases">Verificar divergência</span>`;
      },
    },
  ];

  const thead = `<thead><tr><th>Campo</th>
    <th><span class="dash-base-badge portal">Portal</span></th>
    <th><span class="dash-base-badge api">API</span></th>
    <th><span class="dash-base-badge powerbi">PBI</span></th></tr></thead>`;

  const tbody = `<tbody>${rows.map(({ label, key, fmt }) => {
    const block = comp[key];
    if (key === "valores" || key === "objeto") {
      return `<tr><td>${label}</td><td colspan="3">${fmt(null, comp)}</td></tr>`;
    }
    return `<tr>
      <td>${label}</td>
      <td>${fmt(block?.portal)}</td>
      <td>${fmt(block?.api)}</td>
      <td>${fmt(block?.powerbi)}</td>
    </tr>`;
  }).join("")}</tbody>`;

  return `<section class="cp-comparativo card">
    <h3>Visão comparativa</h3>
    <p class="muted small">Campos-chave lado a lado para verificação rápida entre as três fontes.</p>
    <div class="cp-comparativo-scroll">
      <table class="data-table cp-comparativo-table">${thead}${tbody}</table>
    </div>
  </section>`;
}

function renderPainelDetalhe(campos, registro, linkKey) {
  return campos
    .map(([k, label]) => {
      const v = registro[k];
      if (v == null || v === "") return "";
      if (k === linkKey && v) {
        return `<dt>${label}</dt><dd><a href="${v}" target="_blank" rel="noopener" class="link-pncp">Abrir</a></dd>`;
      }
      if (k === "situacao" || k === "situacao_lista") {
        return `<dt>${label}</dt><dd>${cpPillSit(v)}</dd>`;
      }
      return `<dt>${label}</dt><dd>${cpEsc(v)}</dd>`;
    })
    .filter(Boolean)
    .join("");
}

const CP_PORTAL_CAMPOS = [
  ["processo", "Processo"], ["modalidade", "Modalidade"], ["empresa_nome", "Órgão"],
  ["ano", "Ano"], ["situacao", "Situação"], ["data_abertura", "Abertura"],
  ["habilitacao", "Habilitação"], ["julgamento", "Julgamento"], ["homologacao", "Homologação"],
  ["local_abertura", "Local da abertura"], ["data_visita_tecnica", "Visita técnica"],
  ["responsavel_visita_tecnica", "Responsável visita"], ["valor_estimado", "Valor estimado"],
  ["observador_nome", "Observador"], ["detalhe_url", "Link portal"],
];

const CP_API_IDENT = [
  ["numero", "Nº compra"], ["processo", "Processo"], ["modalidade_descricao", "Modalidade"],
  ["ano", "Ano"], ["situacao_lista", "Situação"], ["unidade_nome", "Unidade"],
];
const CP_API_VALORES = [
  ["valor_total_estimado", "Valor estimado"], ["valor_total_homologado", "Valor homologado"],
  ["data_publicacao_pncp", "Publicação"], ["data_abertura_proposta_pncp", "Abertura propostas"],
  ["numero_controle_pncp", "Nº controle PNCP"], ["link_pncp", "Link PNCP"],
];

function renderItensApi(itens) {
  if (!itens?.length) {
    return '<p class="muted small cp-painel-vazio">Nenhum item coletado.</p>';
  }
  return `<div class="compras-itens-scroll">
    <table class="data-table compras-itens-table">
      <thead><tr>
        <th>Item</th><th>Descrição</th><th>Qtd.</th><th>V. total</th><th>Situação</th>
      </tr></thead>
      <tbody>${itens.map((it) => `
        <tr>
          <td>${cpEsc(it.numero_item_pncp ?? it.id)}</td>
          <td title="${cpEsc(it.descricao_detalhada || it.descricao_resumida)}">${cpEsc(it.descricao_resumida || it.descricao_detalhada)}</td>
          <td>${cpEsc(it.quantidade)} ${cpEsc(it.unidade_medida)}</td>
          <td>${cpEsc(it.valor_total || it.valor_total_resultado)}</td>
          <td>${cpPillSit(it.situacao_compra_item_nome)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>`;
}

function renderArvorePbi(arvore) {
  const lic = arvore.licitacao || {};
  let html = `<dl class="detail-grid detail-grid-panel cp-pbi-resumo">
    ${renderPainelDetalhe([
      ["processo", "Processo"], ["modalidade", "Modalidade"], ["orgao_nome", "Empresa"],
      ["ano_processo", "Ano"], ["situacao", "Situação"], ["solicitante", "Solicitante"],
      ["dt_abertura", "Abertura"], ["dt_habilitacao", "Habilitação"],
      ["dt_julgamento", "Julgamento"], ["dt_homologacao", "Homologação"],
      ["valor_licitacao", "Valor"], ["observador_nome", "Observador"],
    ], lic)}
  </dl>`;

  if (lic.objeto) {
    html += `<section class="detail-panel detail-panel-wide">
      <h4 class="detail-panel-title">Objeto</h4>
      <p class="compra-objeto-text">${cpEsc(lic.objeto)}</p>
    </section>`;
  }

  if (arvore.sem_contrato) {
    html += '<p class="pbi-sem-contrato muted small">Nenhum contrato vinculado a este processo.</p>';
    return html;
  }

  html += (arvore.contratos || []).map((g) => `
    <section class="pbi-contrato-bloco cp-contrato-bloco">
      <div class="cp-contrato-head">
        <strong>Contrato ${cpEsc(g.nr_contrato)}</strong>
        <span class="muted-inline">${cpEsc(g.ano_contrato)} · ${cpEsc(g.fornecedor_nome)}</span>
        ${g.valor_total ? `<span class="cp-valor-tag">${cpEsc(g.valor_total)}</span>` : ""}
      </div>
      ${g.ds_objeto_contrato ? `<p class="muted small">${cpEsc(String(g.ds_objeto_contrato).slice(0, 180))}${g.ds_objeto_contrato.length > 180 ? "…" : ""}</p>` : ""}
      ${g.qtd_eventos > 1 ? `<p class="pbi-subtitle">${g.qtd_eventos} eventos (aditivos/parcelas)</p>` : ""}
      ${(g.eventos || []).length ? `<table class="data-table pbi-subtable">
        <thead><tr><th>Aditivo</th><th>Parcela</th><th>Assinatura</th><th>Valor</th></tr></thead>
        <tbody>${g.eventos.map((ev) => `
          <tr>
            <td>${cpEsc(ev.nr_aditivo || "-")}</td>
            <td>${cpEsc(ev.nr_parcela || "-")}</td>
            <td>${cpEsc(ev.dt_assinatura)}</td>
            <td>${cpEsc(ev.vr_inicial)}</td>
          </tr>`).join("")}
        </tbody>
      </table>` : ""}
      ${(g.responsaveis || []).length ? `<p class="pbi-subtitle">Responsáveis</p>
        <table class="data-table pbi-subtable">
          <thead><tr><th>Pessoa</th><th>Papel</th><th>Órgão</th><th>Início</th><th>Fim</th></tr></thead>
          <tbody>${g.responsaveis.map((r) => `
            <tr>
              <td>${cpEsc(r.pessoa_nome)}</td>
              <td>${cpEsc(r.papel_descricao)}</td>
              <td>${cpEsc(r.orgao_nome)}</td>
              <td>${cpEsc(r.dt_inicio)}</td>
              <td>${cpEsc(r.dt_fim)}</td>
            </tr>`).join("")}
          </tbody>
        </table>` : ""}
    </section>`).join("");

  return html;
}

function renderPainelBase(baseId, data) {
  const cfg = CP_BASES[baseId];
  const presente = Array.isArray(data) ? data.length > 0 : !!data;

  let body = "";
  if (!presente) {
    body = `<p class="cp-painel-vazio">Processo não encontrado nesta base.</p>`;
  } else if (baseId === "portal") {
    body = data.map((r) => `
      <div class="cp-registro-bloco">
        <div class="cp-registro-head">
          <strong>${cpEsc(r.processo)}</strong>
          ${r.modalidade ? `<span class="pill-mod">${cpEsc(r.modalidade)}</span>` : ""}
          ${cpPillSit(r.situacao)}
        </div>
        <dl class="detail-grid detail-grid-panel">${renderPainelDetalhe(CP_PORTAL_CAMPOS, r, "detalhe_url")}</dl>
        ${r.descricao_edital ? `<section class="detail-panel detail-panel-wide">
          <h4 class="detail-panel-title">Descrição do edital</h4>
          <p class="compra-objeto-text">${cpEsc(r.descricao_edital)}</p>
        </section>` : ""}
      </div>`).join("");
  } else if (baseId === "api") {
    body = data.map((r) => `
      <div class="cp-registro-bloco">
        <div class="cp-registro-head">
          <strong>${cpEsc(r.numero || r.id_compra)}</strong>
          ${r.modalidade_descricao ? `<span class="pill-mod">${cpEsc(r.modalidade_descricao)}</span>` : ""}
          ${cpPillSit(r.situacao_lista || r.situacao_pncp)}
        </div>
        <div class="compra-detail-sections">
          <section class="detail-panel">
            <h4 class="detail-panel-title">Identificação</h4>
            <dl class="detail-grid detail-grid-panel">${renderPainelDetalhe(CP_API_IDENT, r)}</dl>
          </section>
          <section class="detail-panel">
            <h4 class="detail-panel-title">Valores e prazos</h4>
            <dl class="detail-grid detail-grid-panel">${renderPainelDetalhe(CP_API_VALORES, r, "link_pncp")}</dl>
          </section>
        </div>
        ${r.objeto ? `<section class="detail-panel detail-panel-wide">
          <h4 class="detail-panel-title">Objeto</h4>
          <p class="compra-objeto-text">${cpEsc(r.objeto)}</p>
        </section>` : ""}
        <section class="detail-panel detail-panel-wide">
          <h4 class="detail-panel-title">Itens (${(r.itens || []).length})</h4>
          ${renderItensApi(r.itens)}
        </section>
      </div>`).join("");
  } else {
    body = data.map((arv) => renderArvorePbi(arv)).join("");
  }

  return `<article class="cp-base-panel cp-base-${baseId}">
    <header class="cp-base-head">
      <span class="dash-base-badge ${cfg.badge}">${baseId === "api" ? "API PNCP" : baseId === "powerbi" ? "Power BI" : "Portal"}</span>
      <h3>${cfg.label}</h3>
      <p class="dash-base-desc">${cfg.desc}</p>
    </header>
    <div class="cp-base-body">${body}</div>
  </article>`;
}

function renderGruposPicker(grupos, mensagem) {
  return `<div class="cp-picker card">
    <h3>Múltiplos processos encontrados</h3>
    <p class="muted">${cpEsc(mensagem || "Selecione o processo desejado.")}</p>
    <div class="cp-picker-grid">${grupos.map((g, i) => {
      const ch = g.chave;
      const attrs = ch
        ? `data-chave-orgao="${ch.orgao_id}" data-chave-ano="${ch.ano}" data-chave-numero="${ch.numero}"`
        : `data-processo="${cpEsc(g.rotulo)}" data-idx="${i}"`;
      const bases = Object.entries(g.cobertura || {})
        .filter(([, v]) => v)
        .map(([k]) => CP_BASES[k]?.label.split(" ·")[0] || k)
        .join(" · ");
      return `<button type="button" class="cp-picker-card" ${attrs}>
        <span class="cp-picker-proc">${cpEsc(g.rotulo)}</span>
        <span class="cp-picker-meta">${cpEsc(g.orgao || "")}${g.ano ? ` · ${g.ano}` : ""}</span>
        <span class="cp-picker-bases">${renderCoberturaBadges(g.cobertura)}</span>
        <span class="muted-inline cp-picker-count">${bases || "Sem cruzamento"}</span>
      </button>`;
    }).join("")}
    </div>
  </div>`;
}

function renderDetalhe(data) {
  const chave = data.chave || {};
  const titulo = chave.rotulo || "Processo";
  const sub = [chave.orgao_nome, chave.ano ? `Ano ${chave.ano}` : null, chave.numero ? `Nº ${chave.numero}` : null]
    .filter(Boolean)
    .join(" · ");

  $cp("#cp-resultado").innerHTML = `
    <div class="cp-hero card">
      <div class="cp-hero-main">
        <h2>${cpEsc(titulo)}</h2>
        <p class="cp-hero-sub">${cpEsc(sub) || "Consulta unificada"}</p>
      </div>
      <div class="cp-hero-badges">
        ${renderCoberturaBadges(data.cobertura)}
        ${data.cobertura?.nas_tres ? '<span class="cp-badge-tres">Presente nas 3 bases</span>' : ""}
      </div>
    </div>
    ${renderComparativo(data.comparativo)}
    <div class="cp-bases-grid">
      ${renderPainelBase("portal", data.portal)}
      ${renderPainelBase("api", data.api)}
      ${renderPainelBase("powerbi", data.powerbi)}
    </div>`;

  $cp("#cp-resultado").classList.remove("hidden");
  $cp("#cp-picker").classList.add("hidden");
  $cp("#cp-picker").innerHTML = "";
}

async function carregarCpFiltros() {
  const selAno = $cp("#cp-filtro-ano");
  const selOrg = $cp("#cp-filtro-orgao");
  const meta = $cp("#cp-consulta-meta");
  if (!selAno && !selOrg) return;

  if (meta && !meta.dataset.buscaAtiva) {
    meta.textContent = "Carregando filtros…";
  }

  try {
    const data = await cpApi("/api/consulta-processo/filtros");
    if (selAno) {
      selAno.innerHTML = '<option value="">Todos</option>';
      (data.anos || []).forEach((a) => {
        const o = document.createElement("option");
        o.value = a;
        o.textContent = a;
        selAno.appendChild(o);
      });
    }
    if (selOrg) {
      selOrg.innerHTML = '<option value="">Todos (órgão consolidado)</option>';
      const orgaos = data.orgaos || [];
      if (!orgaos.length) {
        const o = document.createElement("option");
        o.value = "";
        o.disabled = true;
        o.textContent = "Nenhum órgão consolidado — cadastre em Órgãos · Vínculos";
        selOrg.appendChild(o);
      } else {
        orgaos.forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o.id;
          opt.textContent = o.sigla ? `${o.sigla} · ${o.nome}` : o.nome;
          selOrg.appendChild(opt);
        });
      }
    }
    if (meta && !meta.dataset.buscaAtiva) {
      const nAnos = (data.anos || []).length;
      const nOrgs = (data.orgaos || []).length;
      meta.textContent = `Filtros: ${nAnos} ano(s) · ${nOrgs} órgão(s) consolidado(s)`;
    }
  } catch (err) {
    console.error("Erro ao carregar filtros:", err);
    if (meta) {
      meta.innerHTML = `<span class="result err">Não foi possível carregar filtros: ${cpEsc(err.message)}</span>`;
    }
  }
}

function cpParamsBusca() {
  const params = new URLSearchParams();
  const proc = $cp("#cp-filtro-processo")?.value.trim();
  if (!proc) return null;
  params.set("processo", proc);
  const ano = $cp("#cp-filtro-ano")?.value;
  if (ano) params.set("ano", ano);
  const org = $cp("#cp-filtro-orgao")?.value;
  if (org) params.set("orgao_id", org);
  return params;
}

async function buscarProcessoUnificado() {
  const params = cpParamsBusca();
  if (!params) {
    alert("Informe o número ou texto do processo.");
    return;
  }

  const meta = $cp("#cp-consulta-meta");
  const btn = $cp("#btn-cp-buscar");
  const resultado = $cp("#cp-resultado");
  const picker = $cp("#cp-picker");

  btn.disabled = true;
  meta.dataset.buscaAtiva = "1";
  meta.textContent = "Buscando nas três bases…";
  resultado.classList.add("hidden");
  picker.classList.add("hidden");
  picker.innerHTML = "";

  try {
    const data = await cpApi(`/api/consulta-processo/detalhe?${params}`);
    if (data.multiplos) {
      meta.textContent = `${data.grupos?.length || 0} processo(s) distinto(s) encontrado(s)`;
      picker.innerHTML = renderGruposPicker(data.grupos, data.mensagem);
      picker.classList.remove("hidden");
      picker.querySelectorAll(".cp-picker-card").forEach((card) => {
        card.addEventListener("click", () => abrirProcessoPorChave(card));
      });
      return;
    }
    meta.textContent = `Processo encontrado · Portal: ${data.portal?.length || 0} · API: ${data.api?.length || 0} · PBI: ${data.powerbi?.length || 0}`;
    renderDetalhe(data);
  } catch (err) {
    meta.textContent = err.message;
    resultado.innerHTML = `<div class="card"><p class="result err">${cpEsc(err.message)}</p></div>`;
    resultado.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
}

async function abrirProcessoPorChave(card) {
  const params = new URLSearchParams();
  if (card.dataset.chaveOrgao) {
    params.set("chave_orgao_id", card.dataset.chaveOrgao);
    params.set("chave_ano", card.dataset.chaveAno);
    params.set("chave_numero", card.dataset.chaveNumero);
  } else {
    const p = cpParamsBusca();
    if (!p) return;
    p.forEach((v, k) => params.set(k, v));
  }

  const meta = $cp("#cp-consulta-meta");
  meta.textContent = "Carregando detalhes…";
  try {
    const data = await cpApi(`/api/consulta-processo/detalhe?${params}`);
    if (data.multiplos) {
      $cp("#cp-picker").innerHTML = renderGruposPicker(data.grupos, data.mensagem);
      $cp("#cp-picker").classList.remove("hidden");
      $cp("#cp-picker").querySelectorAll(".cp-picker-card").forEach((c) => {
        c.addEventListener("click", () => abrirProcessoPorChave(c));
      });
      return;
    }
    meta.textContent = `Detalhe · ${data.chave?.rotulo || "Processo"}`;
    renderDetalhe(data);
  } catch (err) {
    meta.textContent = err.message;
  }
}

function carregarConsultaProcessoPagina() {
  return carregarCpFiltros();
}

function initConsultaProcesso() {
  carregarCpFiltros().catch(console.error);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initConsultaProcesso);
} else {
  initConsultaProcesso();
}

$cp("#form-cp-filtros")?.addEventListener("submit", (e) => {
  e.preventDefault();
  buscarProcessoUnificado();
});

$cp("#btn-cp-limpar")?.addEventListener("click", () => {
  $cp("#form-cp-filtros")?.reset();
  const meta = $cp("#cp-consulta-meta");
  if (meta) delete meta.dataset.buscaAtiva;
  carregarCpFiltros().catch(console.error);
  $cp("#cp-resultado")?.classList.add("hidden");
  $cp("#cp-resultado").innerHTML = "";
  $cp("#cp-picker")?.classList.add("hidden");
  $cp("#cp-picker").innerHTML = "";
});
