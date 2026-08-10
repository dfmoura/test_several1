/* ============================================================
   observadores.js — cadastro, edição e ativação de observadores
   ============================================================ */

let observadoresLista = [];
let observadorEditId = null;

async function carregarObservadores() {
  const tb = $("#tabela-observadores");
  if (tb) tb.innerHTML = '<tr><td colspan="5">Carregando…</td></tr>';
  try {
    observadoresLista = await api("/api/observadores?ativos=false");
    if (!observadoresLista.length) {
      tb.innerHTML = '<tr><td colspan="5">Nenhum observador cadastrado.</td></tr>';
      return;
    }
    tb.innerHTML = observadoresLista.map((o) => `
      <tr data-oid="${o.id}">
        <td><strong>${esc(o.nome)}</strong></td>
        <td>${esc(o.email)}</td>
        <td>${esc(o.telefone)}</td>
        <td>${o.ativo ? '<span class="badge ok">Ativo</span>' : '<span class="badge">Inativo</span>'}</td>
        <td class="org-actions">
          <button type="button" class="btn ghost tiny obs-btn-edit" data-oid="${o.id}">Editar</button>
          <button type="button" class="btn ghost tiny obs-btn-toggle" data-oid="${o.id}" data-ativo="${o.ativo ? "1" : "0"}">${o.ativo ? "Desativar" : "Ativar"}</button>
        </td>
      </tr>`).join("");

    tb.querySelectorAll(".obs-btn-edit").forEach((btn) => {
      btn.addEventListener("click", () => abrirModalObservador(Number(btn.dataset.oid)));
    });
    tb.querySelectorAll(".obs-btn-toggle").forEach((btn) => {
      btn.addEventListener("click", () => alternarObservador(Number(btn.dataset.oid), btn.dataset.ativo === "1"));
    });
  } catch (err) {
    if (tb) tb.innerHTML = `<tr><td colspan="5">${esc(err.message)}</td></tr>`;
  }
}

function abrirModalObservador(oid) {
  observadorEditId = oid;
  const o = observadoresLista.find((x) => x.id === oid);
  if (!o) return;
  $("#modal-observador-titulo").textContent = `Editar · ${o.nome}`;
  $("#obs-edit-nome").value = o.nome || "";
  $("#obs-edit-email").value = o.email || "";
  $("#obs-edit-telefone").value = o.telefone || "";
  $("#modal-observador").showModal();
}

async function alternarObservador(oid, ativoAtual) {
  try {
    await api(`/api/observadores/${oid}`, {
      method: "PATCH",
      body: JSON.stringify({ ativo: !ativoAtual }),
    });
    await carregarObservadores();
  } catch (err) {
    alert(err.message);
  }
}

$("#form-observador")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/api/observadores", {
      method: "POST",
      body: JSON.stringify({
        nome: $("#obs-nome").value,
        email: $("#obs-email").value || null,
        telefone: $("#obs-telefone").value || null,
      }),
    });
    e.target.reset();
    await carregarObservadores();
  } catch (err) { alert(err.message); }
});

$("#form-observador-edit")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!observadorEditId) return;
  try {
    await api(`/api/observadores/${observadorEditId}`, {
      method: "PATCH",
      body: JSON.stringify({
        nome: $("#obs-edit-nome").value,
        email: $("#obs-edit-email").value.trim(),
        telefone: $("#obs-edit-telefone").value.trim(),
      }),
    });
    $("#modal-observador").close();
    observadorEditId = null;
    await carregarObservadores();
  } catch (err) { alert(err.message); }
});

$("#modal-observador-fechar")?.addEventListener("click", () => {
  $("#modal-observador").close();
  observadorEditId = null;
});

registrarPagina("observadores", carregarObservadores);
