/* ============================================================
   observadores.js — cadastro e listagem de observadores
   ============================================================ */

async function carregarObservadores() {
  const tb = $("#tabela-observadores");
  if (tb) tb.innerHTML = '<tr><td colspan="4">Carregando…</td></tr>';
  try {
    const todos = await api("/api/observadores?ativos=false");
    const ativos = todos.filter((o) => o.ativo);
    if (!ativos.length) {
      tb.innerHTML = '<tr><td colspan="4">Nenhum observador cadastrado.</td></tr>';
      return;
    }
    tb.innerHTML = ativos.map((o) => `
      <tr>
        <td>${esc(o.nome)}</td>
        <td>${esc(o.email)}</td>
        <td>${esc(o.telefone)}</td>
        <td><span class="badge ok">Ativo</span></td>
      </tr>`).join("");
  } catch (err) {
    if (tb) tb.innerHTML = `<tr><td colspan="4">${esc(err.message)}</td></tr>`;
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
    carregarObservadores();
  } catch (err) { alert(err.message); }
});

registrarPagina("observadores", carregarObservadores);
