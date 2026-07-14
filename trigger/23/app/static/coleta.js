/* ============================================================
   coleta.js — ambiente de coleta ÚNICO (Compras.gov + Power BI)
   Tenta POST /api/coleta (unificado). Se indisponível, orquestra
   sequencialmente /api/compras/coletar* + /api/powerbi/coletar.
   ============================================================ */

let coletaCarregada = false;
let coletaEmAndamento = false;
const coletaLogLinhas = [];

function setLiberarVisivel(visivel) {
  const btn = $("#btn-coleta-liberar");
  if (btn) btn.hidden = !visivel;
}

function atualizarFaseMeta(st) {
  const el = $("#coleta-fase-meta");
  if (!el) return;
  if (!st || (!st.running && !st.stale && !(st.log || []).length)) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  const partes = [];
  if (st.running) {
    partes.push(st.stale ? "Sem progresso recente (possível trava)" : "Em andamento");
  } else {
    partes.push("Inativa");
  }
  if (st.fase && st.fase !== "idle") partes.push(`fase: ${st.fase}`);
  if (st.atualizado_em) {
    try {
      const d = new Date(st.atualizado_em);
      partes.push(`atualizado ${d.toLocaleString("pt-BR")}`);
    } catch { /* ignore */ }
  }
  el.textContent = partes.join(" · ");
  el.hidden = false;
}

function uiColetaOcupada(ocupada, rotulo) {
  coletaEmAndamento = ocupada;
  const btn = $("#btn-coleta-iniciar");
  if (btn) {
    btn.disabled = ocupada;
    btn.textContent = ocupada ? (rotulo || "Coletando…") : "Iniciar coleta";
  }
}

async function acompanharColetaEmAndamento(stInicial) {
  uiColetaOcupada(true, "Acompanhar…");
  setLiberarVisivel(true);
  const fontes = stInicial.fontes || [];
  setSrcState("compras", fontes.includes("compras") ? "running" : "skip");
  setSrcState("powerbi", fontes.includes("powerbi") ? "running" : "skip");
  renderLogUnificado(stInicial);
  atualizarFaseMeta(stInicial);
  setTopStatus(
    stInicial.stale
      ? "Coleta sem progresso — use Liberar trava se necessário"
      : `Coletando · ${stInicial.fase || "…"}`,
    "busy",
  );

  const st = await pollStatus("/api/coleta/status", (s) => {
    renderLogUnificado(s);
    atualizarFaseMeta(s);
    setLiberarVisivel(true);
    if (s.fase && s.fase !== "idle") {
      setTopStatus(
        s.stale ? "Coleta sem progresso recente" : `Coletando · ${s.fase}`,
        "busy",
      );
    }
  });

  const ok = !st.resultado || st.resultado.ok !== false;
  const rf = (st.resultado && st.resultado.fontes) || {};
  const fontesFin = st.fontes || fontes;
  if (fontesFin.includes("compras")) {
    setSrcState("compras", rf.compras?.ok === false ? "error" : (ok ? "done" : "error"));
  }
  if (fontesFin.includes("powerbi")) {
    setSrcState("powerbi", rf.powerbi?.ok === false ? "error" : (ok ? "done" : "error"));
  }
  setLiberarVisivel(false);
  atualizarFaseMeta(st);
  finalizarColeta(ok, st.resultado);
}

async function sincronizarStatusColeta() {
  try {
    const st = await api("/api/coleta/status");
    atualizarFaseMeta(st);
    if (st.running) {
      if (!coletaEmAndamento) {
        pushLog("", "» Coleta em andamento detectada — retomando acompanhamento.");
        acompanharColetaEmAndamento(st).catch((err) => {
          pushLog("", `✗ ${err.message}`);
          uiColetaOcupada(false);
          setLiberarVisivel(true);
        });
      }
      return;
    }
    setLiberarVisivel(false);
    if ((st.log || []).length && !coletaEmAndamento) {
      renderLogUnificado(st);
    }
  } catch {
    /* status indisponível — ignora */
  }
}

async function liberarTravaColeta() {
  if (!confirm("Liberar a trava da coleta? Use se o status ficou preso após F5 ou falha.")) {
    return;
  }
  try {
    const r = await api("/api/coleta/liberar", { method: "POST", body: "{}" });
    const st = r.status || r;
    renderLogUnificado(st);
    atualizarFaseMeta(st);
    uiColetaOcupada(false);
    setLiberarVisivel(false);
    setSrcState("compras", "idle");
    setSrcState("powerbi", "idle");
    setTopStatus("Trava liberada", "idle");
    const resEl = $("#coleta-result");
    if (resEl) {
      resEl.classList.remove("hidden");
      resEl.className = "result ok";
      resEl.textContent = "Trava liberada. Você já pode iniciar uma nova coleta.";
    }
  } catch (err) {
    pushLog("", `✗ Não foi possível liberar: ${err.message}`);
  }
}

async function carregarColetaOpcoes() {
  if (!coletaCarregada) {
    const boxUni = $("#coleta-compras-unidades");
    const boxMod = $("#coleta-compras-modalidades");
    try {
      const [unidades, modalidades] = await Promise.all([
        api("/api/compras/unidades").catch(() => []),
        api("/api/compras/modalidades").catch(() => []),
      ]);
      if (boxUni) {
        boxUni.innerHTML = unidades.length
          ? unidades.map((u) => `
              <label class="chk-label" title="${esc(u.nome)}">
                <input type="checkbox" name="coleta-unidade" value="${esc(u.codigo)}" checked />
                ${esc(u.nome)}
              </label>`).join("")
          : '<p class="muted small">Nenhuma unidade configurada.</p>';
      }
      if (boxMod) {
        boxMod.innerHTML = modalidades.length
          ? modalidades.map((m) => `
              <label class="chk-label" title="${esc(m.nome)}">
                <input type="checkbox" name="coleta-modalidade" value="${m.codigo}" checked />
                ${m.codigo} · ${esc(m.nome)}
              </label>`).join("")
          : '<p class="muted small">Nenhuma modalidade.</p>';
      }
      coletaCarregada = true;
    } catch (err) {
      if (boxUni) boxUni.innerHTML = `<p class="result err">${esc(err.message)}</p>`;
    }
  }
  await sincronizarStatusColeta();
}

function coletaUnidadesSelecionadas() {
  return $$('#coleta-compras-unidades input[name="coleta-unidade"]:checked').map((el) => el.value);
}
function coletaModalidadesSelecionadas() {
  return $$('#coleta-compras-modalidades input[name="coleta-modalidade"]:checked')
    .map((el) => parseInt(el.value, 10));
}
function coletaDatasetsSelecionados() {
  return $$('#coleta-pbi-datasets input[name="coleta-dataset"]:checked').map((el) => el.value);
}
function coletaAnosPbi() {
  const raw = $("#coleta-pbi-anos")?.value || "";
  return raw.split(/[,;\s]+/).map((a) => parseInt(a.trim(), 10)).filter((a) => a >= 2000 && a <= 2100);
}

function setSrcState(qual, estado) {
  const el = $(`#coleta-src-${qual}`);
  if (el) el.dataset.state = estado;
}

function limparLog() {
  coletaLogLinhas.length = 0;
  renderLog();
}
function pushLog(prefixo, linhas) {
  const arr = Array.isArray(linhas) ? linhas : [linhas];
  arr.forEach((l) => { if (l != null && l !== "") coletaLogLinhas.push(`${prefixo}${l}`); });
  renderLog();
}
/** Substitui o bloco de log de uma fonte (evita duplicar durante polling) */
function setLogFonte(prefixo, header, linhas) {
  const outros = coletaLogLinhas.filter((l) => !l.startsWith(prefixo));
  const novo = [`${prefixo}${header}`, ...(linhas || []).map((l) => `${prefixo}  ${l}`)];
  coletaLogLinhas.length = 0;
  coletaLogLinhas.push(...outros, ...novo);
  renderLog();
}
function renderLog() {
  const el = $("#coleta-log");
  if (!el) return;
  el.textContent = coletaLogLinhas.length ? coletaLogLinhas.join("\n") : "Aguardando início da coleta…";
  el.scrollTop = el.scrollHeight;
}

function coletaConfig() {
  const anoVal = $("#coleta-ano")?.value.trim();
  const di = $("#coleta-data-inicial")?.value;
  const df = $("#coleta-data-final")?.value;
  return {
    ano: anoVal ? parseInt(anoVal, 10) : null,
    data_inicial: di || null,
    data_final: df || null,
    compras: {
      ativo: $("#coleta-compras-ativo")?.checked,
      unidades: coletaUnidadesSelecionadas(),
      modalidades: coletaModalidadesSelecionadas(),
      modo: ($$('input[name="coleta-compras-modo"]:checked')[0]?.value) || "padrao",
    },
    powerbi: {
      ativo: $("#coleta-pbi-ativo")?.checked,
      anos: coletaAnosPbi(),
      datasets: coletaDatasetsSelecionados(),
    },
  };
}

/* ------------------------------------------------------------ Tentativa unificada */
/** Converte a config do formulário no payload plano de POST /api/coleta. */
function coletaPayloadUnificado(cfg) {
  const fontes = [];
  if (cfg.compras.ativo) fontes.push("compras");
  if (cfg.powerbi.ativo) fontes.push("powerbi");

  const payload = { fontes };
  if (cfg.ano) payload.ano = cfg.ano;
  if (cfg.data_inicial && cfg.data_final) {
    payload.data_inicial = cfg.data_inicial;
    payload.data_final = cfg.data_final;
  }
  if (cfg.compras.ativo) {
    if (cfg.compras.unidades.length) payload.unidades = cfg.compras.unidades;
    if (cfg.compras.modalidades.length) payload.modalidades = cfg.compras.modalidades;
    if (cfg.compras.modo === "completo") {
      payload.fases = ["07", "07-resultados", "05", "10", "01", "02", "04", "03"];
      if (cfg.ano) payload.ano_pgc = cfg.ano;
    }
  }
  if (cfg.powerbi.ativo) {
    if (cfg.powerbi.datasets.length) payload.datasets = cfg.powerbi.datasets;
    if (cfg.powerbi.anos.length) payload.anos = cfg.powerbi.anos;
  }
  return payload;
}

/** Renderiza diretamente o log compartilhado retornado pelo hub unificado. */
function renderLogUnificado(status) {
  const linhas = status.log || [];
  coletaLogLinhas.length = 0;
  coletaLogLinhas.push(...linhas);
  renderLog();
}

async function tentarColetaUnificada(cfg) {
  // Sonda o endpoint de status; se não existir (404), cai no fallback sequencial.
  try {
    const probe = await fetch("/api/coleta/status");
    if (probe.status === 404) return false;
    if (!probe.ok) return false;
  } catch { return false; }

  let resp;
  try {
    resp = await fetch("/api/coleta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coletaPayloadUnificado(cfg)),
    });
  } catch { return false; }

  if (resp.status === 404) return false; // endpoint ausente → fallback
  if (resp.status === 409) {
    // Já há job: retoma acompanhamento em vez de só mostrar erro.
    pushLog("", "» Já existe coleta em andamento — retomando o status atual.");
    const stAtual = await api("/api/coleta/status").catch(() => null);
    if (stAtual?.running) {
      await acompanharColetaEmAndamento(stAtual);
      return true;
    }
    setLiberarVisivel(true);
    let detalhe = "Já existe uma coleta unificada em andamento";
    try {
      const body = await resp.json();
      detalhe = body.detail || detalhe;
    } catch { /* ignore */ }
    pushLog("", `✗ ${detalhe}`);
    finalizarColeta(false, { erro: detalhe });
    return true;
  }
  if (!resp.ok) {
    // 400/422: endpoint existe mas recusou — reporta sem cair no fallback.
    let detalhe = `HTTP ${resp.status}`;
    try {
      const body = await resp.json();
      detalhe = body.detail || detalhe;
    } catch { /* corpo não-JSON */ }
    if (cfg.compras.ativo) setSrcState("compras", "error");
    if (cfg.powerbi.ativo) setSrcState("powerbi", "error");
    pushLog("", `✗ Coleta unificada recusada: ${detalhe}`);
    finalizarColeta(false, { erro: detalhe });
    return true;
  }

  if (cfg.compras.ativo) setSrcState("compras", "running");
  if (cfg.powerbi.ativo) setSrcState("powerbi", "running");
  setLiberarVisivel(true);
  pushLog("", "» Coleta unificada iniciada (/api/coleta).");

  const st = await pollStatus("/api/coleta/status", (s) => {
    renderLogUnificado(s);
    atualizarFaseMeta(s);
    if (s.fase && s.fase !== "idle") {
      setTopStatus(
        s.stale ? "Coleta sem progresso recente" : `Coletando · ${s.fase}`,
        "busy",
      );
    }
  });

  const ok = !st.resultado || st.resultado.ok !== false;
  const rf = (st.resultado && st.resultado.fontes) || {};
  if (cfg.compras.ativo) setSrcState("compras", rf.compras?.ok === false ? "error" : (ok ? "done" : "error"));
  if (cfg.powerbi.ativo) setSrcState("powerbi", rf.powerbi?.ok === false ? "error" : (ok ? "done" : "error"));
  setLiberarVisivel(false);
  atualizarFaseMeta(st);
  finalizarColeta(ok, st.resultado);
  return true;
}

/* ------------------------------------------------------------ Fallback sequencial */
async function coletarCompras(cfg) {
  setSrcState("compras", "running");
  pushLog("[compras] ", "» Iniciando coleta Compras.gov / PNCP…");
  const modo = cfg.compras.modo === "completo" ? "coletar-completo" : "coletar";
  const payload = {
    unidades: cfg.compras.unidades,
    modalidades: cfg.compras.modalidades,
  };
  if (cfg.ano) payload.ano = cfg.ano;
  if (cfg.data_inicial && cfg.data_final) {
    payload.data_inicial = cfg.data_inicial;
    payload.data_final = cfg.data_final;
  }
  if (modo === "coletar-completo") payload.fases = ["07", "07-resultados", "05", "10", "01", "02"];

  await api(`/api/compras/${modo}`, { method: "POST", body: JSON.stringify(payload) });
  const st = await pollStatus("/api/compras/coletar/status", (s) => {
    const fase = s.fase && s.fase !== "idle" ? ` [fase: ${s.fase}]` : "";
    setLogFonte("[compras] ", `Compras.gov${fase}`, s.log || []);
  });
  const r = st.resultado || {};
  if (r.ok) {
    setSrcState("compras", "done");
    let msg = `✓ Compras.gov: ${r.total ?? "-"} contratação(ões)`;
    if (r.novos != null) msg += ` (${r.novos} novas, ${r.atualizados} atual.)`;
    if (r.itens_total != null) msg += `; ${r.itens_total} itens`;
    if (r.resultados_novos != null) msg += `; ${r.resultados_novos} resultados novos`;
    pushLog("[compras] ", msg + ".");
    return true;
  }
  setSrcState("compras", "error");
  pushLog("[compras] ", `✗ Erro: ${r.erro || "falha na coleta"}`);
  return false;
}

async function coletarPowerBi(cfg) {
  setSrcState("powerbi", "running");
  pushLog("[powerbi] ", "» Iniciando coleta Power BI / Dados Abertos PMU…");
  const anos = cfg.powerbi.anos.length ? cfg.powerbi.anos : (cfg.ano ? [cfg.ano] : [new Date().getFullYear()]);
  await api("/api/powerbi/coletar", {
    method: "POST",
    body: JSON.stringify({ anos, datasets: cfg.powerbi.datasets }),
  });
  const st = await pollStatus("/api/powerbi/coletar/status", (s) => {
    setLogFonte("[powerbi] ", "Power BI", s.log || []);
  });
  const r = st.resultado || {};
  if (r.ok) {
    setSrcState("powerbi", "done");
    pushLog("[powerbi] ", "✓ Power BI: coleta concluída.");
    return true;
  }
  setSrcState("powerbi", "error");
  pushLog("[powerbi] ", `✗ Erro: ${r.erro || "falha na coleta"}`);
  return false;
}

async function orquestrarSequencial(cfg) {
  let ok = true;
  if (cfg.compras.ativo) {
    try { ok = (await coletarCompras(cfg)) && ok; }
    catch (err) { ok = false; setSrcState("compras", "error"); pushLog("[compras] ", `✗ ${err.message}`); }
  }
  if (cfg.powerbi.ativo) {
    try { ok = (await coletarPowerBi(cfg)) && ok; }
    catch (err) { ok = false; setSrcState("powerbi", "error"); pushLog("[powerbi] ", `✗ ${err.message}`); }
  }
  finalizarColeta(ok);
}

function finalizarColeta(ok, resultado) {
  uiColetaOcupada(false);
  setLiberarVisivel(false);
  const resEl = $("#coleta-result");
  if (resEl) {
    resEl.classList.remove("hidden");
    resEl.className = ok ? "result ok" : "result err";
    resEl.textContent = ok
      ? "Coleta concluída. Consulte os dados nas telas de Compras.gov, Power BI e no Painel."
      : (resultado?.erro || "A coleta terminou com erros. Verifique o log acima.");
  }
  setTopStatus(ok ? "Coleta concluída" : "Coleta com erros", ok ? "idle" : "error");
}

/* ------------------------------------------------------------ Submit */
async function iniciarColeta(e) {
  e.preventDefault();
  if (coletaEmAndamento) return;
  const cfg = coletaConfig();

  if (!cfg.compras.ativo && !cfg.powerbi.ativo) {
    alert("Selecione ao menos uma fonte (Compras.gov ou Power BI).");
    return;
  }
  if (cfg.compras.ativo && !cfg.compras.unidades.length) {
    alert("Selecione ao menos uma unidade compradora para o Compras.gov.");
    return;
  }
  if (cfg.compras.ativo && !cfg.compras.modalidades.length) {
    alert("Selecione ao menos uma modalidade para o Compras.gov.");
    return;
  }
  if (cfg.powerbi.ativo && !cfg.powerbi.datasets.length) {
    alert("Selecione ao menos uma base (dataset) para o Power BI.");
    return;
  }

  uiColetaOcupada(true);
  $("#coleta-result")?.classList.add("hidden");
  limparLog();
  setSrcState("compras", cfg.compras.ativo ? "running" : "skip");
  setSrcState("powerbi", cfg.powerbi.ativo ? "running" : "skip");
  setTopStatus("Coletando dados…", "busy");
  setLiberarVisivel(true);

  try {
    const unificada = await tentarColetaUnificada(cfg);
    if (!unificada) {
      pushLog("", "» Coleta unificada indisponível — orquestrando fontes em sequência.");
      await orquestrarSequencial(cfg);
    }
  } catch (err) {
    pushLog("", `✗ Erro inesperado: ${err.message}`);
    finalizarColeta(false, { erro: err.message });
  }
}

$("#form-coleta")?.addEventListener("submit", iniciarColeta);
$("#btn-coleta-liberar")?.addEventListener("click", liberarTravaColeta);
$("#coleta-compras-todos")?.addEventListener("click", () => {
  $$('#coleta-compras-unidades input[name="coleta-unidade"]').forEach((el) => { el.checked = true; });
});
$("#coleta-compras-nenhum")?.addEventListener("click", () => {
  $$('#coleta-compras-unidades input[name="coleta-unidade"]').forEach((el) => { el.checked = false; });
});

registrarPagina("coleta", carregarColetaOpcoes);
