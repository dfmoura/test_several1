/** Vínculo manual de órgãos entre Portal, Compras.gov e Power BI — removível. */
const $o = (s) => document.querySelector(s);

let orgaosMeta = {};
let orgaosLista = [];
let orgaoEditId = null;

async function orgApi(path, opts = {}) {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!r.ok) {
    const msg = (await r.text()) || r.statusText;
    throw new Error(msg);
  }
  if (r.status === 204) return null;
  return r.json();
}

function orgEsc(t) {
  const e = document.createElement("span");
  e.textContent = t ?? "-";
  return e.innerHTML;
}

function fonteLabel(fonte) {
  return orgaosMeta.fontes?.[fonte]?.label || fonte;
}

function vinculosPorFonte(vinculos, fonte) {
  return (vinculos || []).filter((v) => v.fonte === fonte);
}

function renderVinculoChip(v) {
  const rotulo = v.rotulo ? orgEsc(v.rotulo) : orgEsc(v.chave);
  return `<span class="org-vinculo-chip" title="${orgEsc(v.chave)}">
    <code>${orgEsc(v.chave)}</code> · ${rotulo}
    <button type="button" class="org-chip-del" data-vid="${v.id}" title="Remover vínculo">×</button>
  </span>`;
}

function renderOrgaosTabela() {
  const tb = $o("#orgaos-tabela");
  if (!orgaosLista.length) {
    tb.innerHTML = '<tr><td colspan="6">Nenhum órgão consolidado. Crie um abaixo ou vincule valores pendentes.</td></tr>';
    return;
  }
  tb.innerHTML = orgaosLista.map((o) => {
    const portal = vinculosPorFonte(o.vinculos, "portal");
    const compras = vinculosPorFonte(o.vinculos, "compras_api");
    const pbi = vinculosPorFonte(o.vinculos, "powerbi");
    const cell = (items) => items.length
      ? items.map(renderVinculoChip).join("")
      : '<span class="muted-inline">—</span>';
    return `<tr data-oid="${o.id}" class="org-row">
      <td><strong>${orgEsc(o.nome)}</strong>${o.sigla ? ` <span class="org-sigla">${orgEsc(o.sigla)}</span>` : ""}</td>
      <td class="org-vinculos-cell">${cell(portal)}</td>
      <td class="org-vinculos-cell">${cell(compras)}</td>
      <td class="org-vinculos-cell">${cell(pbi)}</td>
      <td>${(o.vinculos || []).length}</td>
      <td class="org-actions">
        <button type="button" class="btn ghost btn-sm org-btn-edit" data-oid="${o.id}">Editar</button>
        <button type="button" class="btn ghost btn-sm org-btn-del" data-oid="${o.id}">Excluir</button>
      </td>
    </tr>`;
  }).join("");

  tb.querySelectorAll(".org-chip-del").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Remover este vínculo? Os dados das bases não serão alterados.")) return;
      try {
        await orgApi(`/api/orgaos-vinculos/${btn.dataset.vid}`, { method: "DELETE" });
        await carregarOrgaosPagina();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  tb.querySelectorAll(".org-btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalOrgao(Number(btn.dataset.oid)));
  });
  tb.querySelectorAll(".org-btn-del").forEach((btn) => {
    btn.addEventListener("click", () => excluirOrgao(Number(btn.dataset.oid)));
  });
}

async function carregarOrgaosStats() {
  const s = await orgApi("/api/orgaos-consolidados/stats");
  const el = $o("#orgaos-stats");
  if (!el) return;
  const pf = s.por_fonte || {};
  el.innerHTML = `
    <div class="org-stat"><span class="org-stat-n">${s.orgaos_ativos}</span><span class="org-stat-l">Órgãos ativos</span></div>
    <div class="org-stat"><span class="org-stat-n">${s.vinculos_total}</span><span class="org-stat-l">Vínculos</span></div>
    <div class="org-stat"><span class="org-stat-n">${pf.portal?.vinculados ?? 0}/${pf.portal?.total_valores ?? 0}</span><span class="org-stat-l">Portal</span></div>
    <div class="org-stat"><span class="org-stat-n">${pf.compras_api?.vinculados ?? 0}/${pf.compras_api?.total_valores ?? 0}</span><span class="org-stat-l">Compras.gov</span></div>
    <div class="org-stat"><span class="org-stat-n">${pf.powerbi?.vinculados ?? 0}/${pf.powerbi?.total_valores ?? 0}</span><span class="org-stat-l">Power BI</span></div>`;
}

async function carregarPendentes() {
  const fonte = $o("#org-pend-fonte")?.value || "";
  const qs = new URLSearchParams({ apenas_pendentes: "true" });
  if (fonte) qs.set("fonte", fonte);
  const rows = await orgApi(`/api/orgaos-consolidados/valores?${qs}`);
  const tb = $o("#orgaos-pendentes");
  if (!rows.length) {
    tb.innerHTML = `<tr><td colspan="4">Todos os valores desta fonte já estão vinculados.</td></tr>`;
    return;
  }
  const opts = orgaosLista.map((o) => `<option value="${o.id}">${orgEsc(o.nome)}</option>`).join("");
  tb.innerHTML = rows.map((r) => `
    <tr>
      <td>${orgEsc(fonteLabel(r.fonte))}</td>
      <td><code>${orgEsc(r.chave)}</code></td>
      <td>${orgEsc(r.rotulo)}${r.total_registros ? ` <span class="muted-inline">(${r.total_registros})</span>` : ""}</td>
      <td class="org-pend-acao">
        <select class="org-pend-orgao" data-fonte="${orgEsc(r.fonte)}" data-chave="${orgEsc(r.chave)}" data-rotulo="${orgEsc(r.rotulo || "")}">
          <option value="">Selecione…</option>${opts}
        </select>
        <button type="button" class="btn primary btn-sm org-pend-vincular">Vincular</button>
      </td>
    </tr>`).join("");

  tb.querySelectorAll(".org-pend-vincular").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sel = btn.previousElementSibling;
      const oid = sel.value;
      if (!oid) { alert("Selecione um órgão consolidado."); return; }
      try {
        await orgApi(`/api/orgaos-consolidados/${oid}/vinculos`, {
          method: "POST",
          body: JSON.stringify({
            fonte: sel.dataset.fonte,
            chave: sel.dataset.chave,
            rotulo: sel.dataset.rotulo || null,
          }),
        });
        await carregarOrgaosPagina();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

async function carregarOrgaosPagina() {
  const tb = $o("#orgaos-tabela");
  const pend = $o("#orgaos-pendentes");
  if (tb) tb.innerHTML = '<tr><td colspan="6">Carregando…</td></tr>';
  if (pend) pend.innerHTML = '<tr><td colspan="4">Carregando…</td></tr>';
  try {
    const meta = await orgApi("/api/orgaos-consolidados/meta");
    orgaosMeta = meta;
    orgaosLista = await orgApi("/api/orgaos-consolidados?ativos=false");
    await carregarOrgaosStats();
    renderOrgaosTabela();
    await carregarPendentes();
  } catch (err) {
    if (tb) tb.innerHTML = `<tr><td colspan="6">Erro ao carregar: ${orgEsc(err.message)}</td></tr>`;
    if (pend) pend.innerHTML = `<tr><td colspan="4">Erro ao carregar.</td></tr>`;
    console.error(err);
  }
}

function abrirModalOrgao(oid) {
  orgaoEditId = oid;
  const o = orgaosLista.find((x) => x.id === oid);
  if (!o) return;
  $o("#modal-orgao-titulo").textContent = `Editar · ${o.nome}`;
  $o("#org-edit-nome").value = o.nome;
  $o("#org-edit-sigla").value = o.sigla || "";
  $o("#org-edit-obs").value = o.observacoes || "";
  $o("#org-edit-ativo").checked = o.ativo;
  renderModalVinculos(o);
  $o("#modal-orgao").showModal();
}

function renderModalVinculos(o) {
  const wrap = $o("#org-modal-vinculos");
  const fontes = ["portal", "compras_api", "powerbi"];
  wrap.innerHTML = fontes.map((f) => {
    const items = vinculosPorFonte(o.vinculos, f);
    return `<section class="org-modal-fonte">
      <h4>${orgEsc(fonteLabel(f))}</h4>
      <div class="org-vinculos-cell">${items.length ? items.map(renderVinculoChip).join("") : '<span class="muted-inline">Nenhum vínculo</span>'}</div>
    </section>`;
  }).join("");
  wrap.querySelectorAll(".org-chip-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remover vínculo?")) return;
      await orgApi(`/api/orgaos-vinculos/${btn.dataset.vid}`, { method: "DELETE" });
      orgaosLista = await orgApi("/api/orgaos-consolidados?ativos=false");
      const atualizado = orgaosLista.find((x) => x.id === orgaoEditId);
      if (atualizado) renderModalVinculos(atualizado);
      renderOrgaosTabela();
      await carregarOrgaosStats();
      await carregarPendentes();
    });
  });
}

async function excluirOrgao(oid) {
  const o = orgaosLista.find((x) => x.id === oid);
  if (!o) return;
  if (!confirm(`Excluir «${o.nome}» e todos os seus vínculos?\n\nOs dados coletados nas bases não serão alterados.`)) return;
  try {
    await orgApi(`/api/orgaos-consolidados/${oid}`, { method: "DELETE" });
    await carregarOrgaosPagina();
  } catch (err) {
    alert(err.message);
  }
}

$o("#form-orgao-novo")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await orgApi("/api/orgaos-consolidados", {
      method: "POST",
      body: JSON.stringify({
        nome: $o("#org-novo-nome").value,
        sigla: $o("#org-novo-sigla").value || null,
        observacoes: $o("#org-novo-obs").value || null,
      }),
    });
    e.target.reset();
    await carregarOrgaosPagina();
  } catch (err) {
    alert(err.message);
  }
});

$o("#form-orgao-edit")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!orgaoEditId) return;
  try {
    await orgApi(`/api/orgaos-consolidados/${orgaoEditId}`, {
      method: "PATCH",
      body: JSON.stringify({
        nome: $o("#org-edit-nome").value,
        sigla: $o("#org-edit-sigla").value || null,
        observacoes: $o("#org-edit-obs").value || null,
        ativo: $o("#org-edit-ativo").checked,
      }),
    });
    $o("#modal-orgao").close();
    await carregarOrgaosPagina();
  } catch (err) {
    alert(err.message);
  }
});

$o("#modal-orgao-fechar")?.addEventListener("click", () => $o("#modal-orgao").close());
$o("#org-pend-fonte")?.addEventListener("change", () => carregarPendentes());
$o("#btn-orgaos-recarregar")?.addEventListener("click", () => carregarOrgaosPagina());

document.querySelector('.nav-btn[data-page="orgaos"]')?.addEventListener("click", () => {
  carregarOrgaosPagina();
});
