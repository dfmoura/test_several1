/* ============================================================
   orgaos.js — vínculo de órgãos entre Compras.gov e Power BI
   Também controla as abas da página Vínculos.
   ============================================================ */

const ORG_FONTES = ["compras_api", "powerbi"];
let orgaosMeta = {};
let orgaosLista = [];
let orgaoEditId = null;
let orgaosCarregado = false;
let modalidadesCarregado = false;

function orgFonteLabel(fonte) { return orgaosMeta.fontes?.[fonte]?.label || fonte; }
function orgVinculosPorFonte(vinculos, fonte) { return (vinculos || []).filter((v) => v.fonte === fonte); }

function orgVinculoChip(v) {
  const rotulo = v.rotulo ? esc(v.rotulo) : esc(v.chave);
  return `<span class="org-vinculo-chip" title="${esc(v.chave)}">
    <code>${esc(v.chave)}</code> · ${rotulo}
    <button type="button" class="org-chip-del" data-vid="${v.id}" title="Remover vínculo">×</button>
  </span>`;
}

function renderOrgaosTabela() {
  const tb = $("#orgaos-tabela");
  if (!orgaosLista.length) {
    tb.innerHTML = '<tr><td colspan="5">Nenhum órgão consolidado. Crie um acima ou vincule valores pendentes.</td></tr>';
    return;
  }
  const cell = (items) => items.length ? items.map(orgVinculoChip).join("") : '<span class="muted-inline">—</span>';
  tb.innerHTML = orgaosLista.map((o) => `
    <tr data-oid="${o.id}">
      <td><strong>${esc(o.nome)}</strong>${o.sigla ? `<span class="org-sigla">${esc(o.sigla)}</span>` : ""}</td>
      <td class="org-vinculos-cell">${cell(orgVinculosPorFonte(o.vinculos, "compras_api"))}</td>
      <td class="org-vinculos-cell">${cell(orgVinculosPorFonte(o.vinculos, "powerbi"))}</td>
      <td>${(o.vinculos || []).length}</td>
      <td class="org-actions">
        <button type="button" class="btn ghost tiny org-btn-edit" data-oid="${o.id}">Editar</button>
        <button type="button" class="btn ghost tiny org-btn-del" data-oid="${o.id}">Excluir</button>
      </td>
    </tr>`).join("");

  tb.querySelectorAll(".org-chip-del").forEach((btn) => btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm("Remover este vínculo? Os dados das bases não serão alterados.")) return;
    try { await api(`/api/orgaos-vinculos/${btn.dataset.vid}`, { method: "DELETE" }); await carregarOrgaos(); }
    catch (err) { alert(err.message); }
  }));
  tb.querySelectorAll(".org-btn-edit").forEach((btn) => btn.addEventListener("click", () => abrirModalOrgao(Number(btn.dataset.oid))));
  tb.querySelectorAll(".org-btn-del").forEach((btn) => btn.addEventListener("click", () => excluirOrgao(Number(btn.dataset.oid))));
}

async function carregarOrgaosStats() {
  const s = await api("/api/orgaos-consolidados/stats");
  const el = $("#orgaos-stats");
  if (!el) return;
  const pf = s.por_fonte || {};
  el.innerHTML = `
    <div class="org-stat"><span class="org-stat-n">${s.orgaos_ativos}</span><span class="org-stat-l">Órgãos ativos</span></div>
    <div class="org-stat"><span class="org-stat-n">${s.vinculos_total}</span><span class="org-stat-l">Vínculos</span></div>
    <div class="org-stat"><span class="org-stat-n">${pf.compras_api?.vinculados ?? 0}/${pf.compras_api?.total_valores ?? 0}</span><span class="org-stat-l">Compras.gov</span></div>
    <div class="org-stat"><span class="org-stat-n">${pf.powerbi?.vinculados ?? 0}/${pf.powerbi?.total_valores ?? 0}</span><span class="org-stat-l">Power BI</span></div>`;
}

async function carregarOrgPendentes() {
  const fonte = $("#org-pend-fonte")?.value || "";
  const qs = new URLSearchParams({ apenas_pendentes: "true" });
  if (fonte) qs.set("fonte", fonte);
  const rows = (await api(`/api/orgaos-consolidados/valores?${qs}`)).filter((r) => ORG_FONTES.includes(r.fonte));
  const tb = $("#orgaos-pendentes");
  if (!rows.length) { tb.innerHTML = '<tr><td colspan="4">Todos os valores desta fonte já estão vinculados.</td></tr>'; return; }
  const opts = orgaosLista.map((o) => `<option value="${o.id}">${esc(o.nome)}</option>`).join("");
  tb.innerHTML = rows.map((r) => `
    <tr>
      <td>${esc(orgFonteLabel(r.fonte))}</td>
      <td><code>${esc(r.chave)}</code></td>
      <td>${esc(r.rotulo)}${r.total_registros ? ` <span class="muted-inline">(${r.total_registros})</span>` : ""}</td>
      <td class="org-pend-acao">
        <select class="org-pend-orgao" data-fonte="${esc(r.fonte)}" data-chave="${esc(r.chave)}" data-rotulo="${esc(r.rotulo || "")}">
          <option value="">Selecione…</option>${opts}
        </select>
        <button type="button" class="btn primary tiny org-pend-vincular">Vincular</button>
      </td>
    </tr>`).join("");
  tb.querySelectorAll(".org-pend-vincular").forEach((btn) => btn.addEventListener("click", async () => {
    const sel = btn.previousElementSibling;
    if (!sel.value) { alert("Selecione um órgão consolidado."); return; }
    try {
      await api(`/api/orgaos-consolidados/${sel.value}/vinculos`, {
        method: "POST",
        body: JSON.stringify({ fonte: sel.dataset.fonte, chave: sel.dataset.chave, rotulo: sel.dataset.rotulo || null }),
      });
      await carregarOrgaos();
    } catch (err) { alert(err.message); }
  }));
}

async function carregarOrgaos() {
  const tb = $("#orgaos-tabela");
  if (tb) tb.innerHTML = '<tr><td colspan="5">Carregando…</td></tr>';
  try {
    orgaosMeta = await api("/api/orgaos-consolidados/meta");
    orgaosLista = await api("/api/orgaos-consolidados?ativos=false");
    await carregarOrgaosStats();
    renderOrgaosTabela();
    await carregarOrgPendentes();
    orgaosCarregado = true;
  } catch (err) {
    if (tb) tb.innerHTML = `<tr><td colspan="5">Erro ao carregar: ${esc(err.message)}</td></tr>`;
  }
}

function abrirModalOrgao(oid) {
  orgaoEditId = oid;
  const o = orgaosLista.find((x) => x.id === oid);
  if (!o) return;
  $("#modal-orgao-titulo").textContent = `Editar · ${o.nome}`;
  $("#org-edit-nome").value = o.nome;
  $("#org-edit-sigla").value = o.sigla || "";
  $("#org-edit-obs").value = o.observacoes || "";
  $("#org-edit-ativo").checked = o.ativo;
  renderOrgModalVinculos(o);
  $("#modal-orgao").showModal();
}

function renderOrgModalVinculos(o) {
  const wrap = $("#org-modal-vinculos");
  wrap.innerHTML = ORG_FONTES.map((f) => {
    const items = orgVinculosPorFonte(o.vinculos, f);
    return `<section class="org-modal-fonte"><h4>${esc(orgFonteLabel(f))}</h4>
      <div class="org-vinculos-cell">${items.length ? items.map(orgVinculoChip).join("") : '<span class="muted-inline">Nenhum vínculo</span>'}</div></section>`;
  }).join("");
  wrap.querySelectorAll(".org-chip-del").forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Remover vínculo?")) return;
    await api(`/api/orgaos-vinculos/${btn.dataset.vid}`, { method: "DELETE" });
    orgaosLista = await api("/api/orgaos-consolidados?ativos=false");
    const atualizado = orgaosLista.find((x) => x.id === orgaoEditId);
    if (atualizado) renderOrgModalVinculos(atualizado);
    renderOrgaosTabela();
    await carregarOrgaosStats();
    await carregarOrgPendentes();
  }));
}

async function excluirOrgao(oid) {
  const o = orgaosLista.find((x) => x.id === oid);
  if (!o) return;
  if (!confirm(`Excluir «${o.nome}» e todos os seus vínculos?\nOs dados coletados não serão alterados.`)) return;
  try { await api(`/api/orgaos-consolidados/${oid}`, { method: "DELETE" }); await carregarOrgaos(); }
  catch (err) { alert(err.message); }
}

$("#form-orgao-novo")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/api/orgaos-consolidados", { method: "POST", body: JSON.stringify({
      nome: $("#org-novo-nome").value, sigla: $("#org-novo-sigla").value || null, observacoes: $("#org-novo-obs").value || null,
    }) });
    e.target.reset();
    await carregarOrgaos();
  } catch (err) { alert(err.message); }
});

$("#form-orgao-edit")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!orgaoEditId) return;
  try {
    await api(`/api/orgaos-consolidados/${orgaoEditId}`, { method: "PATCH", body: JSON.stringify({
      nome: $("#org-edit-nome").value, sigla: $("#org-edit-sigla").value || null,
      observacoes: $("#org-edit-obs").value || null, ativo: $("#org-edit-ativo").checked,
    }) });
    $("#modal-orgao").close();
    await carregarOrgaos();
  } catch (err) { alert(err.message); }
});

$("#modal-orgao-fechar")?.addEventListener("click", () => $("#modal-orgao").close());
$("#org-pend-fonte")?.addEventListener("change", () => carregarOrgPendentes());
$("#btn-orgaos-recarregar")?.addEventListener("click", () => carregarOrgaos());

/* ---------------------------- Abas da página Vínculos ---------------------------- */
function ativarVincTab(qual) {
  $$("#vinculos-tabs .tab").forEach((b) => b.classList.toggle("active", b.dataset.vinc === qual));
  $$(".vinc-pane").forEach((p) => p.classList.toggle("hidden", p.dataset.vinc !== qual));
  if (qual === "orgaos" && !orgaosCarregado) carregarOrgaos();
  if (qual === "modalidades" && !modalidadesCarregado && typeof carregarModalidades === "function") carregarModalidades();
}
$$("#vinculos-tabs .tab").forEach((b) => b.addEventListener("click", () => ativarVincTab(b.dataset.vinc)));

function carregarVinculosPagina() {
  const ativa = $("#vinculos-tabs .tab.active")?.dataset.vinc || "orgaos";
  ativarVincTab(ativa);
}

registrarPagina("vinculos", carregarVinculosPagina);
