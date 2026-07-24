/* ============================================================
   modalidades.js — vínculo de modalidades entre Compras.gov e Power BI
   ============================================================ */

const MOD_FONTES = ["compras_api", "powerbi"];
let modMeta = {};
let modLista = [];
let modEditId = null;

function modFonteLabel(fonte) { return modMeta.fontes?.[fonte]?.label || fonte; }
function modVinculosPorFonte(vinculos, fonte) { return (vinculos || []).filter((v) => v.fonte === fonte); }

function modVinculoChip(v) {
  const rotulo = v.rotulo ? esc(v.rotulo) : esc(v.chave);
  return `<span class="org-vinculo-chip" title="${esc(v.chave)}">
    <code>${esc(v.chave)}</code> · ${rotulo}
    <button type="button" class="org-chip-del" data-vid="${v.id}" title="Remover vínculo">×</button>
  </span>`;
}

function renderModalidadesTabela() {
  const tb = $("#modalidades-tabela");
  if (!modLista.length) {
    tb.innerHTML = '<tr><td colspan="5">Nenhuma modalidade consolidada. Crie uma acima ou vincule valores pendentes.</td></tr>';
    return;
  }
  const cell = (items) => items.length ? items.map(modVinculoChip).join("") : '<span class="muted-inline">—</span>';
  tb.innerHTML = modLista.map((m) => {
    const pncp = m.codigo_pncp ? `<span class="org-sigla" title="Código PNCP">PNCP ${esc(String(m.codigo_pncp))}</span>` : "";
    return `<tr data-mid="${m.id}">
      <td><strong>${esc(m.nome)}</strong>${pncp}</td>
      <td class="org-vinculos-cell">${cell(modVinculosPorFonte(m.vinculos, "compras_api"))}</td>
      <td class="org-vinculos-cell">${cell(modVinculosPorFonte(m.vinculos, "powerbi"))}</td>
      <td>${(m.vinculos || []).length}</td>
      <td class="org-actions">
        <button type="button" class="btn ghost tiny mod-btn-edit" data-mid="${m.id}">Editar</button>
        <button type="button" class="btn ghost tiny mod-btn-del" data-mid="${m.id}">Excluir</button>
      </td>
    </tr>`;
  }).join("");

  tb.querySelectorAll(".org-chip-del").forEach((btn) => btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm("Remover este vínculo? Os dados das bases não serão alterados.")) return;
    try { await api(`/api/modalidades-vinculos/${btn.dataset.vid}`, { method: "DELETE" }); await carregarModalidades(); }
    catch (err) { alert(err.message); }
  }));
  tb.querySelectorAll(".mod-btn-edit").forEach((btn) => btn.addEventListener("click", () => abrirModalModalidade(Number(btn.dataset.mid))));
  tb.querySelectorAll(".mod-btn-del").forEach((btn) => btn.addEventListener("click", () => excluirModalidade(Number(btn.dataset.mid))));
}

function modStatCard({ n, label, hint, main = false, title = "" }) {
  const cls = main ? "org-stat org-stat-main" : "org-stat";
  const tit = title ? ` title="${esc(title)}"` : "";
  return `<div class="${cls}"${tit}>
    <span class="org-stat-n">${esc(String(n))}</span>
    <span class="org-stat-l">${esc(label)}</span>
    ${hint ? `<span class="org-stat-h">${esc(hint)}</span>` : ""}
  </div>`;
}

async function carregarModalidadesStats() {
  const s = await api("/api/modalidades-consolidadas/stats");
  const el = $("#modalidades-stats");
  if (!el) return;
  const pf = s.por_fonte || {};
  const cg = pf.compras_api || {};
  const pbi = pf.powerbi || {};
  const cgV = cg.vinculados ?? 0;
  const cgT = cg.total_valores ?? 0;
  const pbiV = pbi.vinculados ?? 0;
  const pbiT = pbi.total_valores ?? 0;
  el.innerHTML = [
    modStatCard({
      n: s.modalidades_ativas,
      label: "Modalidades ativas",
      hint: "entidades canônicas",
      main: true,
      title: "Modalidades consolidadas ativas no cadastro",
    }),
    modStatCard({
      n: s.vinculos_total,
      label: "Vínculos",
      hint: "mapeamentos feitos",
      title: "Total de vínculos entre modalidades e valores das fontes",
    }),
    modStatCard({
      n: `${cgV}/${cgT}`,
      label: "Compras.gov · código",
      hint: "vinculados / total encontrados",
      title: `${cgV} de ${cgT} códigos já vinculados`,
    }),
    modStatCard({
      n: `${pbiV}/${pbiT}`,
      label: "Power BI · MODALIDADE",
      hint: "vinculados / total encontrados",
      title: `${pbiV} de ${pbiT} modalidades já vinculadas`,
    }),
  ].join("");
}

async function carregarModPendentes() {
  const fonte = $("#mod-pend-fonte")?.value || "";
  const qs = new URLSearchParams({ apenas_pendentes: "true" });
  if (fonte) qs.set("fonte", fonte);
  const rows = (await api(`/api/modalidades-consolidadas/valores?${qs}`)).filter((r) => MOD_FONTES.includes(r.fonte));
  const tb = $("#modalidades-pendentes");
  if (!rows.length) { tb.innerHTML = '<tr><td colspan="4">Todos os valores desta fonte já estão vinculados.</td></tr>'; return; }
  const opts = modLista.map((m) => `<option value="${m.id}">${esc(m.nome)}</option>`).join("");
  tb.innerHTML = rows.map((r) => `
    <tr>
      <td>${esc(modFonteLabel(r.fonte))}</td>
      <td><code>${esc(r.chave)}</code></td>
      <td>${esc(r.rotulo)}${r.total_registros ? ` <span class="muted-inline">(${r.total_registros})</span>` : ""}</td>
      <td class="org-pend-acao">
        <select class="mod-pend-mod" data-fonte="${esc(r.fonte)}" data-chave="${esc(r.chave)}" data-rotulo="${esc(r.rotulo || "")}">
          <option value="">Selecione…</option>${opts}
        </select>
        <button type="button" class="btn primary tiny mod-pend-vincular">Vincular</button>
      </td>
    </tr>`).join("");
  tb.querySelectorAll(".mod-pend-vincular").forEach((btn) => btn.addEventListener("click", async () => {
    const sel = btn.previousElementSibling;
    if (!sel.value) { alert("Selecione uma modalidade consolidada."); return; }
    try {
      await api(`/api/modalidades-consolidadas/${sel.value}/vinculos`, {
        method: "POST",
        body: JSON.stringify({ fonte: sel.dataset.fonte, chave: sel.dataset.chave, rotulo: sel.dataset.rotulo || null }),
      });
      await carregarModalidades();
    } catch (err) { alert(err.message); }
  }));
}

function preencherSelectPncp(sel, valorAtual) {
  if (!sel || !modMeta.catalogo_pncp) return;
  sel.innerHTML = '<option value="">Opcional</option>' +
    modMeta.catalogo_pncp.map((c) => `<option value="${c.codigo}">${c.codigo} — ${esc(c.nome)}</option>`).join("");
  if (valorAtual != null && valorAtual !== "") sel.value = String(valorAtual);
}

async function carregarModalidades() {
  const tb = $("#modalidades-tabela");
  if (tb) tb.innerHTML = '<tr><td colspan="5">Carregando…</td></tr>';
  try {
    modMeta = await api("/api/modalidades-consolidadas/meta");
    modLista = await api("/api/modalidades-consolidadas?ativos=false");
    preencherSelectPncp($("#mod-novo-pncp"));
    await carregarModalidadesStats();
    renderModalidadesTabela();
    await carregarModPendentes();
    modalidadesCarregado = true;
  } catch (err) {
    if (tb) tb.innerHTML = `<tr><td colspan="5">Erro ao carregar: ${esc(err.message)}</td></tr>`;
  }
}

function abrirModalModalidade(mid) {
  modEditId = mid;
  const m = modLista.find((x) => x.id === mid);
  if (!m) return;
  $("#modal-mod-titulo").textContent = `Editar · ${m.nome}`;
  $("#mod-edit-nome").value = m.nome;
  preencherSelectPncp($("#mod-edit-pncp"), m.codigo_pncp);
  $("#mod-edit-obs").value = m.observacoes || "";
  $("#mod-edit-ativo").checked = m.ativo;
  renderModModalVinculos(m);
  $("#modal-mod").showModal();
}

function renderModModalVinculos(m) {
  const wrap = $("#mod-modal-vinculos");
  wrap.innerHTML = MOD_FONTES.map((f) => {
    const items = modVinculosPorFonte(m.vinculos, f);
    return `<section class="org-modal-fonte"><h4>${esc(modFonteLabel(f))}</h4>
      <div class="org-vinculos-cell">${items.length ? items.map(modVinculoChip).join("") : '<span class="muted-inline">Nenhum vínculo</span>'}</div></section>`;
  }).join("");
  wrap.querySelectorAll(".org-chip-del").forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Remover vínculo?")) return;
    await api(`/api/modalidades-vinculos/${btn.dataset.vid}`, { method: "DELETE" });
    modLista = await api("/api/modalidades-consolidadas?ativos=false");
    const atualizado = modLista.find((x) => x.id === modEditId);
    if (atualizado) renderModModalVinculos(atualizado);
    renderModalidadesTabela();
    await carregarModalidadesStats();
    await carregarModPendentes();
  }));
}

async function excluirModalidade(mid) {
  const m = modLista.find((x) => x.id === mid);
  if (!m) return;
  if (!confirm(`Excluir «${m.nome}» e todos os seus vínculos?\nOs dados coletados não serão alterados.`)) return;
  try { await api(`/api/modalidades-consolidadas/${mid}`, { method: "DELETE" }); await carregarModalidades(); }
  catch (err) { alert(err.message); }
}

$("#form-mod-novo")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pncpVal = $("#mod-novo-pncp").value;
  try {
    await api("/api/modalidades-consolidadas", { method: "POST", body: JSON.stringify({
      nome: $("#mod-novo-nome").value, codigo_pncp: pncpVal ? Number(pncpVal) : null, observacoes: $("#mod-novo-obs").value || null,
    }) });
    e.target.reset();
    await carregarModalidades();
  } catch (err) { alert(err.message); }
});

$("#form-mod-edit")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!modEditId) return;
  const pncpVal = $("#mod-edit-pncp").value;
  try {
    await api(`/api/modalidades-consolidadas/${modEditId}`, { method: "PATCH", body: JSON.stringify({
      nome: $("#mod-edit-nome").value, codigo_pncp: pncpVal ? Number(pncpVal) : null,
      observacoes: $("#mod-edit-obs").value || null, ativo: $("#mod-edit-ativo").checked,
    }) });
    $("#modal-mod").close();
    await carregarModalidades();
  } catch (err) { alert(err.message); }
});

$("#modal-mod-fechar")?.addEventListener("click", () => $("#modal-mod").close());
$("#mod-pend-fonte")?.addEventListener("change", () => carregarModPendentes());
$("#btn-modalidades-recarregar")?.addEventListener("click", () => carregarModalidades());
