/** Vínculo manual de modalidades entre Portal, Compras.gov e Power BI — removível. */
const $m = (s) => document.querySelector(s);

let modMeta = {};
let modLista = [];
let modEditId = null;

async function modApi(path, opts = {}) {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!r.ok) {
    const msg = (await r.text()) || r.statusText;
    throw new Error(msg);
  }
  if (r.status === 204) return null;
  return r.json();
}

function modEsc(t) {
  const e = document.createElement("span");
  e.textContent = t ?? "-";
  return e.innerHTML;
}

function modFonteLabel(fonte) {
  return modMeta.fontes?.[fonte]?.label || fonte;
}

function modVinculosPorFonte(vinculos, fonte) {
  return (vinculos || []).filter((v) => v.fonte === fonte);
}

function renderModVinculoChip(v) {
  const rotulo = v.rotulo ? modEsc(v.rotulo) : modEsc(v.chave);
  return `<span class="org-vinculo-chip" title="${modEsc(v.chave)}">
    <code>${modEsc(v.chave)}</code> · ${rotulo}
    <button type="button" class="org-chip-del" data-vid="${v.id}" title="Remover vínculo">×</button>
  </span>`;
}

function renderModalidadesTabela() {
  const tb = $m("#modalidades-tabela");
  if (!modLista.length) {
    tb.innerHTML = '<tr><td colspan="6">Nenhuma modalidade consolidada. Crie uma abaixo ou vincule valores pendentes.</td></tr>';
    return;
  }
  tb.innerHTML = modLista.map((m) => {
    const portal = modVinculosPorFonte(m.vinculos, "portal");
    const compras = modVinculosPorFonte(m.vinculos, "compras_api");
    const pbi = modVinculosPorFonte(m.vinculos, "powerbi");
    const cell = (items) => items.length
      ? items.map(renderModVinculoChip).join("")
      : '<span class="muted-inline">—</span>';
    const pncp = m.codigo_pncp
      ? ` <span class="org-sigla" title="Código PNCP">PNCP ${modEsc(String(m.codigo_pncp))}</span>`
      : "";
    return `<tr data-mid="${m.id}" class="org-row">
      <td><strong>${modEsc(m.nome)}</strong>${pncp}</td>
      <td class="org-vinculos-cell">${cell(portal)}</td>
      <td class="org-vinculos-cell">${cell(compras)}</td>
      <td class="org-vinculos-cell">${cell(pbi)}</td>
      <td>${m.vinculos.length}</td>
      <td class="org-actions">
        <button type="button" class="btn ghost btn-sm mod-btn-edit" data-mid="${m.id}">Editar</button>
        <button type="button" class="btn ghost btn-sm mod-btn-del" data-mid="${m.id}">Excluir</button>
      </td>
    </tr>`;
  }).join("");

  tb.querySelectorAll(".org-chip-del").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Remover este vínculo? Os dados das bases não serão alterados.")) return;
      try {
        await modApi(`/api/modalidades-vinculos/${btn.dataset.vid}`, { method: "DELETE" });
        await carregarModalidadesPagina();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  tb.querySelectorAll(".mod-btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalModalidade(Number(btn.dataset.mid)));
  });
  tb.querySelectorAll(".mod-btn-del").forEach((btn) => {
    btn.addEventListener("click", () => excluirModalidade(Number(btn.dataset.mid)));
  });
}

async function carregarModalidadesStats() {
  const s = await modApi("/api/modalidades-consolidadas/stats");
  const el = $m("#modalidades-stats");
  if (!el) return;
  const pf = s.por_fonte || {};
  el.innerHTML = `
    <div class="org-stat"><span class="org-stat-n">${s.modalidades_ativas}</span><span class="org-stat-l">Modalidades ativas</span></div>
    <div class="org-stat"><span class="org-stat-n">${s.vinculos_total}</span><span class="org-stat-l">Vínculos</span></div>
    <div class="org-stat"><span class="org-stat-n">${pf.portal?.vinculados ?? 0}/${pf.portal?.total_valores ?? 0}</span><span class="org-stat-l">Portal</span></div>
    <div class="org-stat"><span class="org-stat-n">${pf.compras_api?.vinculados ?? 0}/${pf.compras_api?.total_valores ?? 0}</span><span class="org-stat-l">Compras.gov</span></div>
    <div class="org-stat"><span class="org-stat-n">${pf.powerbi?.vinculados ?? 0}/${pf.powerbi?.total_valores ?? 0}</span><span class="org-stat-l">Power BI</span></div>`;
}

async function carregarModPendentes() {
  const fonte = $m("#mod-pend-fonte")?.value || "";
  const qs = new URLSearchParams({ apenas_pendentes: "true" });
  if (fonte) qs.set("fonte", fonte);
  const rows = await modApi(`/api/modalidades-consolidadas/valores?${qs}`);
  const tb = $m("#modalidades-pendentes");
  if (!rows.length) {
    tb.innerHTML = `<tr><td colspan="4">Todos os valores desta fonte já estão vinculados.</td></tr>`;
    return;
  }
  const opts = modLista.map((m) => `<option value="${m.id}">${modEsc(m.nome)}</option>`).join("");
  tb.innerHTML = rows.map((r) => `
    <tr>
      <td>${modEsc(modFonteLabel(r.fonte))}</td>
      <td><code>${modEsc(r.chave)}</code></td>
      <td>${modEsc(r.rotulo)}${r.total_registros ? ` <span class="muted-inline">(${r.total_registros})</span>` : ""}</td>
      <td class="org-pend-acao">
        <select class="mod-pend-mod" data-fonte="${modEsc(r.fonte)}" data-chave="${modEsc(r.chave)}" data-rotulo="${modEsc(r.rotulo || "")}">
          <option value="">Selecione…</option>${opts}
        </select>
        <button type="button" class="btn primary btn-sm mod-pend-vincular">Vincular</button>
      </td>
    </tr>`).join("");

  tb.querySelectorAll(".mod-pend-vincular").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sel = btn.previousElementSibling;
      const mid = sel.value;
      if (!mid) { alert("Selecione uma modalidade consolidada."); return; }
      try {
        await modApi(`/api/modalidades-consolidadas/${mid}/vinculos`, {
          method: "POST",
          body: JSON.stringify({
            fonte: sel.dataset.fonte,
            chave: sel.dataset.chave,
            rotulo: sel.dataset.rotulo || null,
          }),
        });
        await carregarModalidadesPagina();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function preencherSelectPncp(sel, valorAtual) {
  if (!sel || !modMeta.catalogo_pncp) return;
  sel.innerHTML = '<option value="">Opcional</option>' + modMeta.catalogo_pncp.map(
    (c) => `<option value="${c.codigo}">${c.codigo} — ${modEsc(c.nome)}</option>`
  ).join("");
  if (valorAtual != null && valorAtual !== "") sel.value = String(valorAtual);
}

async function carregarModalidadesPagina() {
  const meta = await modApi("/api/modalidades-consolidadas/meta");
  modMeta = meta;
  modLista = await modApi("/api/modalidades-consolidadas?ativos=false");
  preencherSelectPncp($m("#mod-novo-pncp"));
  preencherSelectPncp($m("#mod-edit-pncp"), $m("#mod-edit-pncp")?.value);
  await carregarModalidadesStats();
  renderModalidadesTabela();
  await carregarModPendentes();
}

function abrirModalModalidade(mid) {
  modEditId = mid;
  const m = modLista.find((x) => x.id === mid);
  if (!m) return;
  $m("#modal-mod-titulo").textContent = `Editar · ${m.nome}`;
  $m("#mod-edit-nome").value = m.nome;
  preencherSelectPncp($m("#mod-edit-pncp"), m.codigo_pncp);
  $m("#mod-edit-obs").value = m.observacoes || "";
  $m("#mod-edit-ativo").checked = m.ativo;
  renderModModalVinculos(m);
  $m("#modal-mod").showModal();
}

function renderModModalVinculos(m) {
  const wrap = $m("#mod-modal-vinculos");
  const fontes = ["portal", "compras_api", "powerbi"];
  wrap.innerHTML = fontes.map((f) => {
    const items = modVinculosPorFonte(m.vinculos, f);
    return `<section class="org-modal-fonte">
      <h4>${modEsc(modFonteLabel(f))}</h4>
      <div class="org-vinculos-cell">${items.length ? items.map(renderModVinculoChip).join("") : '<span class="muted-inline">Nenhum vínculo</span>'}</div>
    </section>`;
  }).join("");
  wrap.querySelectorAll(".org-chip-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remover vínculo?")) return;
      await modApi(`/api/modalidades-vinculos/${btn.dataset.vid}`, { method: "DELETE" });
      modLista = await modApi("/api/modalidades-consolidadas?ativos=false");
      const atualizado = modLista.find((x) => x.id === modEditId);
      if (atualizado) renderModModalVinculos(atualizado);
      renderModalidadesTabela();
      await carregarModalidadesStats();
      await carregarModPendentes();
    });
  });
}

async function excluirModalidade(mid) {
  const m = modLista.find((x) => x.id === mid);
  if (!m) return;
  if (!confirm(`Excluir «${m.nome}» e todos os seus vínculos?\n\nOs dados coletados nas bases não serão alterados.`)) return;
  try {
    await modApi(`/api/modalidades-consolidadas/${mid}`, { method: "DELETE" });
    await carregarModalidadesPagina();
  } catch (err) {
    alert(err.message);
  }
}

$m("#form-mod-novo")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pncpVal = $m("#mod-novo-pncp").value;
  try {
    await modApi("/api/modalidades-consolidadas", {
      method: "POST",
      body: JSON.stringify({
        nome: $m("#mod-novo-nome").value,
        codigo_pncp: pncpVal ? Number(pncpVal) : null,
        observacoes: $m("#mod-novo-obs").value || null,
      }),
    });
    e.target.reset();
    await carregarModalidadesPagina();
  } catch (err) {
    alert(err.message);
  }
});

$m("#form-mod-edit")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!modEditId) return;
  const pncpVal = $m("#mod-edit-pncp").value;
  try {
    await modApi(`/api/modalidades-consolidadas/${modEditId}`, {
      method: "PATCH",
      body: JSON.stringify({
        nome: $m("#mod-edit-nome").value,
        codigo_pncp: pncpVal ? Number(pncpVal) : null,
        observacoes: $m("#mod-edit-obs").value || null,
        ativo: $m("#mod-edit-ativo").checked,
      }),
    });
    $m("#modal-mod").close();
    await carregarModalidadesPagina();
  } catch (err) {
    alert(err.message);
  }
});

$m("#modal-mod-fechar")?.addEventListener("click", () => $m("#modal-mod").close());
$m("#mod-pend-fonte")?.addEventListener("change", () => carregarModPendentes());
$m("#btn-modalidades-recarregar")?.addEventListener("click", () => carregarModalidadesPagina());

document.querySelector('.nav-btn[data-page="modalidades"]')?.addEventListener("click", () => {
  carregarModalidadesPagina();
});
