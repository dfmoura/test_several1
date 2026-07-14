/* ============================================================
   vencedores_cnpj.js — fornecedores homologados consolidados
   ============================================================ */

let vencedoresItems = [];
let vencedoresSortKey = "status_cache";
let vencedoresSortDir = "asc";
let vencedoresCacheDias = 30;
let vencedoresAtualizando = new Set();
let vencedoresLotePolling = false;
let vencedoresResumoAtual = null;

const STATUS_LABEL = {
  atualizado: "Atualizado",
  vencido: "Cache vencido",
  pendente: "Pendente",
  cpf: "CPF",
  invalido: "Inválido",
};

function fmtCnpjLocal(ni) {
  if (window.OSB?.fmtCnpjCpf) return window.OSB.fmtCnpjCpf(ni);
  const d = String(ni || "").replace(/\D/g, "");
  if (d.length === 14) {
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
  if (d.length === 11) {
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return ni || "—";
}

function fmtDataCurta(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 19);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function badgeCache(status) {
  const cls = {
    atualizado: "ok",
    vencido: "warn",
    pendente: "muted",
    cpf: "info",
    invalido: "danger",
  }[status] || "muted";
  return `<span class="badge ${cls}">${esc(STATUS_LABEL[status] || status)}</span>`;
}

function atualizarBotoesLote(running) {
  const btn = $("#btn-vencedores-pendentes");
  const btnCancel = $("#btn-vencedores-pendentes-cancelar");
  const pendentes = Number(vencedoresResumoAtual?.pendente || 0);
  if (btn) {
    btn.disabled = !!running || pendentes <= 0;
    btn.textContent = running ? "Atualizando pendentes…" : "Atualizar pendentes";
  }
  if (btnCancel) btnCancel.hidden = !running;
}

function renderVencedoresResumo(resumo, cacheDias) {
  const box = $("#vencedores-resumo");
  if (!box) return;
  vencedoresResumoAtual = resumo || {};
  const r = vencedoresResumoAtual;
  const chips = [
    ["atualizado", "Atualizados", r.atualizado],
    ["vencido", "Vencidos", r.vencido],
    ["pendente", "Pendentes", r.pendente],
    ["cpf", "CPF", r.cpf],
  ].filter(([, , n]) => n > 0);

  atualizarBotoesLote(vencedoresLotePolling);

  if (!chips.length) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }

  box.hidden = false;
  box.innerHTML = `
    <p class="vencedores-resumo-label">Cache CNPJ · validade ${esc(cacheDias)} dia(s)</p>
    <div class="vencedores-chips">
      ${chips.map(([k, label, n]) => `
        <button type="button" class="vencedores-chip" data-status="${esc(k)}" title="Filtrar: ${esc(label)}">
          <span class="vencedores-chip-n">${fmtNum(n)}</span>
          <span class="vencedores-chip-l">${esc(label)}</span>
        </button>`).join("")}
    </div>`;

  box.querySelectorAll(".vencedores-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sel = $("#vencedores-filtro-status");
      if (sel) sel.value = btn.dataset.status || "";
      carregarVencedores({ silencioso: true });
    });
  });
}

function renderLoteStatus(st) {
  const box = $("#vencedores-lote-status");
  if (!box) return;
  if (!st || (!st.running && !st.resultado && !(st.log || []).length)) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }

  const total = Number(st.total || 0);
  const proc = Number(st.processados || 0);
  const pct = total > 0 ? Math.min(100, Math.round((proc / total) * 100)) : (st.running ? 2 : 100);
  const atual = st.atual;
  const atualTxt = atual
    ? ` · atual: ${fmtCnpjLocal(atual.cod_fornecedor)}${atual.nome_fornecedor ? ` (${atual.nome_fornecedor})` : ""}`
    : "";
  const intervalo = st.intervalo_sec != null ? ` · ${st.intervalo_sec}s entre requisições` : "";
  let state = "busy";
  if (!st.running) {
    state = st.resultado?.ok === false && !st.resultado?.cancelado ? "error" : "done";
  }
  box.hidden = false;
  box.dataset.state = state;
  box.innerHTML = `
    <p class="vencedores-lote-title">Lote de pendentes</p>
    <p class="vencedores-lote-meta">
      ${fmtNum(proc)} / ${fmtNum(total)} processados ·
      ${fmtNum(st.ok || 0)} ok · ${fmtNum(st.erros || 0)} erro(s)${intervalo}${atualTxt}
    </p>
    <div class="vencedores-lote-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
    ${st.resultado?.mensagem ? `<p class="vencedores-lote-meta" style="margin-top:8px">${esc(st.resultado.mensagem)}</p>` : ""}
  `;
}

function renderVencedoresTabela() {
  const tb = $("#vencedores-tabela");
  const thead = $("#vencedores-tabela-head");
  if (!tb) return;

  let rows = vencedoresItems;
  const sortState = getTableSortState(thead);
  const key = sortState?.key || vencedoresSortKey;
  const dir = sortState?.dir || vencedoresSortDir;
  rows = sortItems(rows, key, dir);
  markSortableHeaders(thead, { key, dir });

  if (!rows.length) {
    tb.innerHTML = '<tr><td colspan="8">Nenhum fornecedor vencedor encontrado com os filtros atuais.</td></tr>';
    return;
  }

  const loteBusy = vencedoresLotePolling;
  tb.innerHTML = rows.map((r) => {
    const busy = vencedoresAtualizando.has(r.cod_fornecedor) || loteBusy;
    const pode = r.pode_atualizar;
    const nome = r.nome_fornecedor || "—";
    const mun = r.municipio
      ? `${r.municipio}${r.uf ? `/${r.uf}` : ""}`
      : "—";
    return `<tr data-ni="${esc(r.cod_fornecedor)}">
      <td title="${esc(nome)}">
        <button type="button" class="link-vencedor btn-vencedor-detalhe"
          data-ni="${esc(r.cod_fornecedor)}" data-nome="${esc(nome)}">${esc(nome)}</button>
      </td>
      <td class="mono">${esc(fmtCnpjLocal(r.cod_fornecedor))}</td>
      <td>${fmtNum(r.qtd_itens)}</td>
      <td>${fmtNum(r.qtd_compras)}</td>
      <td title="${esc(mun)}">${esc(mun)}</td>
      <td>${badgeCache(r.status_cache)}</td>
      <td>${esc(fmtDataCurta(r.cnpj_enriquecido_em))}</td>
      <td class="col-acao">
        ${pode
          ? `<button type="button" class="btn ghost btn-sm btn-vencedor-atualizar"
              data-ni="${esc(r.cod_fornecedor)}" data-nome="${esc(nome)}"
              ${busy ? "disabled" : ""}>${vencedoresAtualizando.has(r.cod_fornecedor) ? "Atualizando…" : "Atualizar CNPJ"}</button>`
          : `<span class="muted-inline" title="API pública de CNPJ não se aplica a CPF">—</span>`}
      </td>
    </tr>`;
  }).join("");

  tb.querySelectorAll(".btn-vencedor-detalhe").forEach((btn) => {
    btn.addEventListener("click", () => {
      const fn = window.OSB?.abrirDetalheFornecedor;
      if (typeof fn === "function") fn(btn.dataset.ni, btn.dataset.nome);
    });
  });

  tb.querySelectorAll(".btn-vencedor-atualizar").forEach((btn) => {
    btn.addEventListener("click", () => atualizarVencedorIndividual(btn.dataset.ni, btn.dataset.nome));
  });
}

async function atualizarVencedorIndividual(ni, nome) {
  const digits = String(ni || "").replace(/\D/g, "");
  if (!digits || digits.length !== 14) return;
  if (vencedoresAtualizando.has(digits) || vencedoresLotePolling) return;

  vencedoresAtualizando.add(digits);
  renderVencedoresTabela();
  setTopStatus(`Atualizando CNPJ ${fmtCnpjLocal(digits)}…`, "busy");

  try {
    const params = new URLSearchParams({ refresh: "true" });
    if (nome && nome !== "—") params.set("nome", nome);
    const data = await api(`/api/compras/fornecedores/${encodeURIComponent(digits)}?${params}`);

    const idx = vencedoresItems.findIndex((r) => r.cod_fornecedor === digits);
    if (idx >= 0) {
      const prev = vencedoresItems[idx];
      vencedoresItems[idx] = {
        ...prev,
        nome_fornecedor: data.razao_social || prev.nome_fornecedor,
        status_cache: data.cache_valido ? "atualizado" : "vencido",
        cache_valido: !!data.cache_valido,
        cnpj_enriquecido_em: data.cnpj_enriquecido_em,
        municipio: data.municipio || prev.municipio,
        uf: data.uf || prev.uf,
        situacao_cadastral: data.situacao_cadastral || prev.situacao_cadastral,
        de_uberlandia: data.de_uberlandia,
        pode_atualizar: true,
      };
    }
    setTopStatus("CNPJ atualizado", "idle");
    const fn = window.OSB?.abrirDetalheFornecedor;
    if (typeof fn === "function") fn(digits, nome || data.razao_social);
  } catch (err) {
    setTopStatus("Falha ao atualizar CNPJ", "error");
    alert(err.message || "Falha ao atualizar CNPJ");
  } finally {
    vencedoresAtualizando.delete(digits);
    await carregarVencedores({ silencioso: true });
  }
}

async function carregarVencedores({ silencioso = false } = {}) {
  const tb = $("#vencedores-tabela");
  const meta = $("#vencedores-meta");
  if (!silencioso && tb) tb.innerHTML = '<tr><td colspan="8">Carregando…</td></tr>';
  if (!silencioso && meta) meta.textContent = "Consultando fornecedores vencedores…";

  try {
    const params = new URLSearchParams();
    const q = $("#vencedores-filtro-q")?.value?.trim();
    const st = $("#vencedores-filtro-status")?.value;
    if (q) params.set("q", q);
    if (st) params.set("status", st);
    const data = await api(`/api/compras/vencedores-cnpj?${params}`);
    vencedoresItems = data.items || [];
    vencedoresCacheDias = data.cache_dias ?? 30;
    if (meta) {
      meta.textContent = `${fmtNum(data.total)} fornecedor(es) consolidado(s) · clique no nome para ver QSA · lotes de pendentes usam ${3}s entre requisições`;
    }
    renderVencedoresResumo(data.resumo, vencedoresCacheDias);
    renderVencedoresTabela();
  } catch (err) {
    if (meta) meta.textContent = "Erro ao carregar.";
    if (tb) tb.innerHTML = `<tr><td colspan="8">${esc(err.message)}</td></tr>`;
  }
}

async function acompanharLotePendentes() {
  if (vencedoresLotePolling) return;
  vencedoresLotePolling = true;
  atualizarBotoesLote(true);
  renderVencedoresTabela();

  try {
    await pollStatus("/api/compras/vencedores-cnpj/atualizar-pendentes/status", (st) => {
      renderLoteStatus(st);
      const proc = Number(st.processados || 0);
      const total = Number(st.total || 0);
      setTopStatus(
        st.running
          ? `Pendentes CNPJ ${proc}/${total}…`
          : (st.resultado?.mensagem || "Lote de pendentes finalizado"),
        st.running ? "busy" : "idle",
      );
    }, 1500);
  } catch (err) {
    setTopStatus("Falha no lote de pendentes", "error");
    const box = $("#vencedores-lote-status");
    if (box) {
      box.hidden = false;
      box.dataset.state = "error";
      box.innerHTML = `<p class="vencedores-lote-title">Lote de pendentes</p><p class="vencedores-lote-meta">${esc(err.message)}</p>`;
    }
  } finally {
    vencedoresLotePolling = false;
    atualizarBotoesLote(false);
    await carregarVencedores({ silencioso: true });
  }
}

async function iniciarLotePendentes() {
  if (vencedoresLotePolling) return;
  const n = Number(vencedoresResumoAtual?.pendente || 0);
  if (n <= 0) {
    alert("Não há CNPJs pendentes para atualizar.");
    return;
  }
  const minutos = Math.ceil((n * 3) / 60);
  const ok = confirm(
    `Atualizar ${n} CNPJ(s) pendente(s)?\n\n`
    + `Cadência: 1 requisição a cada 3 segundos (com pausa extra se a API falhar).\n`
    + `Tempo estimado: ~${minutos} min.\n\n`
    + `O job roda no servidor — você pode acompanhar o progresso nesta tela.`,
  );
  if (!ok) return;

  try {
    await api("/api/compras/vencedores-cnpj/atualizar-pendentes", { method: "POST", body: "{}" });
    setTopStatus("Lote de pendentes iniciado", "busy");
    acompanharLotePendentes();
  } catch (err) {
    alert(err.message || "Não foi possível iniciar o lote");
  }
}

async function cancelarLotePendentes() {
  try {
    await api("/api/compras/vencedores-cnpj/atualizar-pendentes/cancelar", { method: "POST", body: "{}" });
  } catch (err) {
    alert(err.message || "Falha ao cancelar");
  }
}

async function restaurarLoteSeAtivo() {
  try {
    const st = await api("/api/compras/vencedores-cnpj/atualizar-pendentes/status");
    if (st?.running) {
      renderLoteStatus(st);
      acompanharLotePendentes();
    } else if (st?.resultado || (st?.log || []).length) {
      renderLoteStatus(st);
    }
  } catch { /* ignore */ }
}

$("#form-vencedores-filtros")?.addEventListener("submit", (e) => {
  e.preventDefault();
  carregarVencedores();
});
$("#btn-vencedores-limpar")?.addEventListener("click", () => {
  $("#form-vencedores-filtros")?.reset();
  clearTableSortState($("#vencedores-tabela-head"));
  carregarVencedores();
});
$("#btn-vencedores-pendentes")?.addEventListener("click", () => iniciarLotePendentes());
$("#btn-vencedores-pendentes-cancelar")?.addEventListener("click", () => cancelarLotePendentes());
wireSortableHeaders($("#vencedores-tabela-head"), (key, dir) => {
  vencedoresSortKey = key;
  vencedoresSortDir = dir;
  renderVencedoresTabela();
});

registrarPagina("vencedores", async () => {
  await carregarVencedores();
  await restaurarLoteSeAtivo();
});
