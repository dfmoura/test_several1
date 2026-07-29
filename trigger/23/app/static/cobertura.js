/* ============================================================
   cobertura.js — Cobertura entre Compras.gov e Power BI
   Lista o que está em uma base e não na outra (mesma chave do painel).
   ============================================================ */

const COB_VISTAS = {
  em_ambas: {
    titulo: "Compras.gov também no Power BI",
    desc: "Registros do Compras.gov · PNCP cuja chave também existe no Power BI · PMU (presentes nas duas bases).",
    badge: "api",
    tag: "Nas duas",
  },
  somente_compras: {
    titulo: "Só no Compras.gov",
    desc: "Registros com chave válida no Compras.gov · PNCP que não aparecem no Power BI · PMU.",
    badge: "api",
    tag: "PNCP",
  },
  somente_powerbi: {
    titulo: "Só no Power BI",
    desc: "Registros com chave válida no Power BI · PMU que não aparecem no Compras.gov · PNCP.",
    badge: "powerbi",
    tag: "Power BI",
  },
  sem_chave_compras: {
    titulo: "Sem chave · Compras.gov",
    desc: "Não entram no cruzamento: órgão sem vínculo consolidado ou processo não interpretável.",
    badge: "api",
    tag: "Diagnóstico",
  },
  sem_chave_powerbi: {
    titulo: "Sem chave · Power BI",
    desc: "Não entram no cruzamento: órgão sem vínculo consolidado ou processo não numérico.",
    badge: "powerbi",
    tag: "Diagnóstico",
  },
};

const COB_PAGE = 100;
let cobVista = "em_ambas";
let cobOffset = 0;
let cobUltimoResumo = null;

function cobKpiCard(n, label, cls = "", vista = null) {
  const clickable = vista ? ` role="button" tabindex="0" data-vista="${vista}" title="Ver lista"` : "";
  const clsBtn = vista ? `${cls} cob-kpi-click`.trim() : cls;
  return `<div class="cob-kpi ${clsBtn}"${clickable}>
    <span class="cob-kpi-n">${fmtNum(n)}</span>
    <span class="cob-kpi-l">${esc(label)}</span>
  </div>`;
}

function cobRenderKpis(resumo) {
  const el = $("#cob-kpis");
  if (!el || !resumo) return;
  const c = resumo.compras || {};
  const p = resumo.powerbi || {};
  el.innerHTML = `
    <div class="cob-kpi cob-kpi-ambas cob-kpi-click" role="button" tabindex="0" data-vista="em_ambas" title="Ver lista">
      <span class="cob-kpi-n">${fmtNum(c.em_ambas ?? 0)}</span>
      <span class="cob-kpi-l">Compras.gov também no Power BI</span>
      <span class="cob-kpi-sub">${fmtNum(c.chaves_unicas_em_ambas ?? 0)} chave(s) única(s)</span>
    </div>
    ${cobKpiCard(c.somente_esta_base ?? 0, "Só no Compras.gov", "cob-kpi-so-compras", "somente_compras")}
    ${cobKpiCard(p.somente_esta_base ?? 0, "Só no Power BI", "cob-kpi-so-powerbi", "somente_powerbi")}
    ${cobKpiCard((c.sem_chave ?? 0) + (p.sem_chave ?? 0), "Sem chave (diagnóstico)", "cob-kpi-diag", "sem_chave_compras")}
  `;
  el.querySelectorAll("[data-vista]").forEach((card) => {
    const go = () => cobSelecionarVista(card.dataset.vista);
    card.addEventListener("click", go);
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        go();
      }
    });
  });
}

function cobResumoFiltros(f) {
  const el = $("#cob-filtros-resumo");
  if (!el) return;
  const periodo = resumoFiltroPeriodo("cob");
  const parts = [periodo ? `<strong>${esc(periodo)}</strong>` : "Período <strong>todos</strong>"];
  if (f?.orgao_nome) parts.push(`Órgão <strong>${esc(f.orgao_nome)}</strong>`);
  if (f?.modalidade_nome) parts.push(`Modalidade <strong>${esc(f.modalidade_nome)}</strong>`);
  el.innerHTML = parts.join(" · ");
}

function cobAbrirConsulta(chave) {
  if (!chave?.orgao_id || chave.ano == null || chave.numero == null) return;
  window.OSB = window.OSB || {};
  window.OSB._cpChavePendente = {
    orgaoId: chave.orgao_id,
    ano: chave.ano,
    numero: chave.numero,
  };
  if (typeof window.OSB.irParaPagina === "function") {
    window.OSB.irParaPagina("consulta");
  }
}

function cobLinhaDivergencia(item, vista) {
  const semChave = vista.startsWith("sem_chave");
  const chave = item.chave;
  const orgao = item.orgao_consolidado || item.orgao || "—";
  const proc = item.processo || "—";
  const acao = !semChave && chave
    ? `<button type="button" class="btn ghost tiny cob-abrir-consulta"
         data-orgao="${chave.orgao_id}" data-ano="${chave.ano}" data-numero="${chave.numero}">
         Abrir consulta
       </button>`
    : (item.motivo ? `<span class="cob-motivo" title="${esc(item.motivo)}">${esc(item.motivo)}</span>` : "—");

  return `<tr>
    <td class="col-ano">${esc(item.ano ?? "—")}</td>
    <td class="col-proc mono" title="${esc(proc)}">${esc(proc)}</td>
    <td class="col-text" title="${esc(orgao)}">${esc(orgao)}</td>
    <td class="col-text" title="${esc(item.modalidade || "")}">${esc(item.modalidade || "—")}</td>
    <td class="col-sit">${item.situacao ? pillSituacao(item.situacao) : '<span class="muted-inline">—</span>'}</td>
    <td class="col-num">${item.valor ? esc(item.valor) : "—"}</td>
    <td class="col-acao">${acao}</td>
  </tr>`;
}

function cobRenderLista(data) {
  const el = $("#cob-lista");
  const desc = $("#cob-vista-desc");
  const pag = $("#cob-paginacao");
  const cfg = COB_VISTAS[data.vista] || COB_VISTAS.em_ambas;
  const lista = data.lista || {};
  const items = lista.items || [];

  if (desc) desc.textContent = cfg.desc;

  if (!items.length) {
    el.innerHTML = `<p class="cob-empty">Nenhum registro nesta vista para os filtros selecionados.</p>`;
    if (pag) pag.hidden = true;
    return;
  }

  const semChave = data.vista.startsWith("sem_chave");
  el.innerHTML = `
    <div class="cob-lista-head">
      <span class="dash-base-badge ${cfg.badge}">${esc(cfg.tag)}</span>
      <strong>${esc(cfg.titulo)}</strong>
      <span class="muted-inline">${fmtNum(lista.total)} registro(s)</span>
    </div>
    <div class="table-scroll">
      <table class="data-table cob-table">
        <thead>
          <tr>
            <th>Ano</th>
            <th>Processo</th>
            <th>Órgão</th>
            <th>Modalidade</th>
            <th>Situação</th>
            <th>Valor</th>
            <th>${semChave ? "Motivo" : "Ação"}</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it) => cobLinhaDivergencia(it, data.vista)).join("")}
        </tbody>
      </table>
    </div>`;

  el.querySelectorAll(".cob-abrir-consulta").forEach((btn) => {
    btn.addEventListener("click", () => {
      cobAbrirConsulta({
        orgao_id: Number(btn.dataset.orgao),
        ano: Number(btn.dataset.ano),
        numero: Number(btn.dataset.numero),
      });
    });
  });

  const total = lista.total || 0;
  const offset = lista.offset || 0;
  const limit = lista.limit || COB_PAGE;
  if (pag) {
    if (total <= limit) {
      pag.hidden = true;
    } else {
      pag.hidden = false;
      const de = offset + 1;
      const ate = Math.min(offset + items.length, total);
      pag.innerHTML = `
        <button type="button" class="btn ghost btn-sm" id="btn-cob-prev" ${offset <= 0 ? "disabled" : ""}>Anterior</button>
        <span class="muted-inline">${fmtNum(de)}–${fmtNum(ate)} de ${fmtNum(total)}</span>
        <button type="button" class="btn ghost btn-sm" id="btn-cob-next" ${offset + limit >= total ? "disabled" : ""}>Próxima</button>
      `;
      $("#btn-cob-prev")?.addEventListener("click", () => {
        cobOffset = Math.max(0, offset - limit);
        carregarCobertura();
      });
      $("#btn-cob-next")?.addEventListener("click", () => {
        cobOffset = offset + limit;
        carregarCobertura();
      });
    }
  }
}

function cobParams(vista, offset) {
  const params = new URLSearchParams();
  params.set("vista", vista);
  params.set("limit", String(COB_PAGE));
  params.set("offset", String(offset || 0));
  appendPeriodoParams(params, "cob");
  const orgao = $("#cob-filtro-orgao")?.value;
  if (orgao) params.set("orgao_id", orgao);
  appendQueryAll(params, "modalidade_id", multiSelectOf("#cob-filtro-modalidade")?.getValues());
  const fallback = $("#cob-filtro-fallback-homologacao");
  if (fallback) params.set("fallback_homologacao", fallback.checked ? "true" : "false");
  return params;
}

async function carregarCobFiltros() {
  try {
    const data = await api("/api/dashboard-gerencial/filtros");
    const selAno = $("#cob-filtro-ano");
    const selOrg = $("#cob-filtro-orgao");
    if (selAno) {
      selAno.innerHTML = '<option value="">Todos</option>' +
        (data.anos || []).map((a) => `<option value="${a}">${a}</option>`).join("");
    }
    if (selOrg) {
      selOrg.innerHTML = '<option value="">Todos</option>' +
        (data.orgaos || []).map((o) =>
          `<option value="${o.id}">${esc(o.sigla ? `${o.sigla} · ${o.nome}` : o.nome)}</option>`
        ).join("");
    }
    multiSelectOf("#cob-filtro-modalidade")?.setOptions(
      (data.modalidades || []).map((m) => ({ value: m.id, label: m.nome })),
    );
  } catch (err) {
    console.error("Filtros cobertura:", err);
  }
}

async function carregarCobertura() {
  const btn = $("#btn-cob-atualizar");
  if (btn) btn.disabled = true;
  try {
    const params = cobParams(cobVista, cobOffset);
    const data = await api(`/api/cobertura-bases?${params}`);
    cobUltimoResumo = data.resumo;
    cobResumoFiltros(data.filtros || {});
    cobRenderKpis(data.resumo);
    cobRenderLista(data);
  } catch (err) {
    const el = $("#cob-lista");
    if (el) el.innerHTML = `<p class="result err">${esc(err.message)}</p>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function cobSelecionarVista(vista) {
  if (!COB_VISTAS[vista]) return;
  cobVista = vista;
  cobOffset = 0;
  $$(".cob-vista-btn").forEach((b) => {
    const on = b.dataset.vista === vista;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  carregarCobertura();
}

async function carregarPaginaCobertura() {
  iniciarFiltroPeriodo("cob");
  const pendente = window.OSB?._cobVistaPendente;
  if (pendente && COB_VISTAS[pendente]) {
    window.OSB._cobVistaPendente = null;
    cobVista = pendente;
    $$(".cob-vista-btn").forEach((b) => {
      const on = b.dataset.vista === cobVista;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
  }
  await carregarCobFiltros();
  await carregarCobertura();
}

$("#form-cob-filtros")?.addEventListener("submit", (e) => {
  e.preventDefault();
  cobOffset = 0;
  carregarCobertura();
});

$("#btn-cob-limpar")?.addEventListener("click", () => {
  $("#form-cob-filtros")?.reset();
  limparFiltroPeriodo("cob");
  const fallback = $("#cob-filtro-fallback-homologacao");
  if (fallback) fallback.checked = true;
  multiSelectOf("#cob-filtro-modalidade")?.clear({ silent: true });
  cobOffset = 0;
  carregarCobertura();
});

$$(".cob-vista-btn").forEach((btn) => {
  btn.addEventListener("click", () => cobSelecionarVista(btn.dataset.vista));
});

registrarPagina("cobertura", carregarPaginaCobertura);
