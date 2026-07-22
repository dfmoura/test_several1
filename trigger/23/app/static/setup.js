/* ============================================================
   setup.js — ano inicial, UASGs, agendamento, IA, usuários e limpeza
   Fontes: Compras.gov + Power BI
   ============================================================ */

let sistemaConfig = null;
let agendamentoPollTimer = null;

function anosColetaTexto(anos) { return anos?.length ? anos.join(", ") : "—"; }

function aplicarConfigColeta(cfg) {
  if (!cfg) return;
  const anos = cfg.anos_coleta || [];
  const anoPadrao = anos.length ? anos[anos.length - 1] : cfg.ano_atual;

  const coletaAno = $("#coleta-ano");
  if (coletaAno && cfg.ano_inicial_coleta) { coletaAno.value = anoPadrao; coletaAno.min = cfg.ano_inicial_coleta; }
  const pbiAnos = $("#coleta-pbi-anos");
  if (pbiAnos && anos.length) pbiAnos.value = anos.join(", ");
}

async function carregarSistemaConfig() {
  try {
    sistemaConfig = await api("/api/sistema/config");
    aplicarConfigColeta(sistemaConfig);
    return sistemaConfig;
  } catch (err) {
    console.error("Config do sistema:", err);
    return null;
  }
}

function renderSetupStatus(status) {
  const el = $("#setup-status-grid");
  if (!el || !status) return;
  const cfg = status.config;
  const comDados = status.contagem.filter((c) => c.registros > 0);
  const coleta = status.contagem.filter((c) => !status.tabelas_preservadas.includes(c.tabela) && c.registros > 0);
  const uasgs = status.contagem.find((c) => c.tabela === "sistema_unidades_compradoras");
  const raiz = status.contagem.find((c) => c.tabela === "sistema_raiz");
  el.innerHTML = `
    <div class="setup-stat"><span class="setup-stat-label">Banco de dados</span><strong>${status.banco_mb} MB</strong></div>
    <div class="setup-stat"><span class="setup-stat-label">Ano inicial configurado</span><strong>${cfg.ano_inicial_coleta ?? "Não definido"}</strong></div>
    <div class="setup-stat"><span class="setup-stat-label">Anos de coleta</span><strong>${anosColetaTexto(cfg.anos_coleta)}</strong></div>
    <div class="setup-stat"><span class="setup-stat-label">Raiz cadastrada</span><strong>${raiz && raiz.registros > 0 ? "Sim" : "Não"}</strong></div>
    <div class="setup-stat"><span class="setup-stat-label">UASGs cadastradas</span><strong>${uasgs ? fmtNum(uasgs.registros) : "—"}</strong></div>
    <div class="setup-stat"><span class="setup-stat-label">Registros coletados</span><strong>${fmtNum(coleta.reduce((s, c) => s + c.registros, 0))}</strong></div>
    <div class="setup-stat setup-stat-wide"><span class="setup-stat-label">Tabelas com dados</span>
      <span class="setup-tabelas">${comDados.length ? comDados.map((c) => `${esc(c.tabela)} (${fmtNum(c.registros)})`).join(" · ") : "Nenhum dado coletado"}</span></div>`;
}

function anosColetaFromSelect() {
  const sel = $("#setup-ano-inicial");
  if (!sel?.value) return [];
  const ini = parseInt(sel.value, 10);
  const fim = sistemaConfig?.ano_atual || new Date().getFullYear();
  return ini > fim ? [ini] : Array.from({ length: fim - ini + 1 }, (_, i) => ini + i);
}

function atualizarPreviewAnos() {
  const preview = $("#setup-anos-preview");
  if (!preview) return;
  const anos = anosColetaFromSelect();
  preview.textContent = anos.length ? `Coletas previstas: ${anos.join(", ")}` : "Selecione o ano inicial.";
}

/* ---------------------------- UASGs / unidades compradoras ---------------------------- */

function formatarCnpjExibicao(cnpj) {
  const d = String(cnpj || "").replace(/\D/g, "");
  if (d.length !== 14) return cnpj || "—";
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function setupRaizMsg(texto, ok) {
  const msg = $("#setup-raiz-msg");
  if (!msg) return;
  msg.textContent = texto || "";
  msg.className = texto ? `meta-line ${ok ? "ok" : "err"}` : "meta-line";
}

function setupUasgCatMsg(texto, ok) {
  const msg = $("#setup-uasg-cat-msg");
  if (!msg) return;
  msg.textContent = texto || "";
  msg.className = texto ? `meta-line ${ok ? "ok" : "err"}` : "meta-line";
}

function renderSetupRaiz(data) {
  const box = $("#setup-raiz-dados");
  const btnSalvar = $("#btn-setup-raiz-salvar");
  const btnAtualizar = $("#btn-setup-raiz-atualizar");
  const btnSync = $("#btn-setup-uasg-sync");
  const input = $("#setup-raiz-cnpj");
  if (!box) return;

  const raiz = data?.raiz;
  const env = data?.defaults_env || {};
  const cadastrada = Boolean(data?.cadastrada && raiz);

  if (btnSalvar) btnSalvar.hidden = cadastrada;
  if (btnAtualizar) btnAtualizar.hidden = !cadastrada;
  if (btnSync) btnSync.disabled = !(cadastrada && raiz?.codigo_municipio_ibge);
  if (input) {
    input.readOnly = cadastrada;
    if (cadastrada) input.value = formatarCnpjExibicao(raiz.cnpj);
    else if (!input.value && env.cnpj) input.placeholder = `Ex.: ${formatarCnpjExibicao(env.cnpj)}`;
  }

  if (!cadastrada) {
    box.innerHTML = `
      <p class="muted small">
        Nenhuma raiz cadastrada. Informe o CNPJ do órgão no topo da ramificação
        e use <strong>Consultar</strong> / <strong>Cadastrar raiz</strong>.
        Contingência atual (env): IBGE <code>${esc(String(env.codigo_municipio_ibge ?? "—"))}</code>
        · UF <code>${esc(env.uf || "—")}</code>
        ${env.cnpj ? `· CNPJ sugerido <code>${esc(formatarCnpjExibicao(env.cnpj))}</code>` : ""}.
      </p>`;
    return;
  }

  const end = [raiz.logradouro, raiz.numero, raiz.bairro, raiz.cep].filter(Boolean).join(", ");
  box.innerHTML = `
    <dl class="setup-raiz-grid">
      <div><dt>CNPJ</dt><dd><code>${esc(formatarCnpjExibicao(raiz.cnpj))}</code></dd></div>
      <div><dt>Razão social</dt><dd>${esc(raiz.razao_social || "—")}</dd></div>
      <div><dt>Nome fantasia</dt><dd>${esc(raiz.nome_fantasia || "—")}</dd></div>
      <div><dt>Situação</dt><dd>${esc(raiz.situacao_cadastral || "—")}</dd></div>
      <div><dt>Município (origem)</dt><dd>${esc(raiz.nome_municipio || "—")} / ${esc(raiz.uf || "—")}</dd></div>
      <div><dt>Código IBGE</dt><dd><code>${esc(String(raiz.codigo_municipio_ibge ?? "—"))}</code></dd></div>
      <div><dt>Endereço</dt><dd>${esc(end || "—")}</dd></div>
      <div><dt>Fonte CNPJ</dt><dd>${esc(raiz.fonte_cnpj || "—")}</dd></div>
    </dl>`;
}

async function carregarSetupRaiz() {
  const box = $("#setup-raiz-dados");
  if (!box) return null;
  try {
    const data = await api("/api/sistema/raiz");
    renderSetupRaiz(data);
    return data;
  } catch (err) {
    box.innerHTML = `<p class="err">${esc(err.message)}</p>`;
    return null;
  }
}

async function consultarSetupRaiz() {
  const cnpj = $("#setup-raiz-cnpj")?.value?.trim() || "";
  const btn = $("#btn-setup-raiz-consultar");
  if (!cnpj) return;
  btn.disabled = true;
  setupRaizMsg("Consultando APIs públicas…", true);
  try {
    const res = await api("/api/sistema/raiz/consultar", {
      method: "POST",
      body: JSON.stringify({ cnpj }),
    });
    const p = res.preview || {};
    const box = $("#setup-raiz-dados");
    if (box) {
      box.innerHTML = `
        <p class="muted small">Pré-visualização (ainda não salva):</p>
        <dl class="setup-raiz-grid">
          <div><dt>CNPJ</dt><dd><code>${esc(formatarCnpjExibicao(p.cnpj))}</code></dd></div>
          <div><dt>Razão social</dt><dd>${esc(p.razao_social || "—")}</dd></div>
          <div><dt>Município</dt><dd>${esc(p.nome_municipio || "—")} / ${esc(p.uf || "—")}</dd></div>
          <div><dt>Código IBGE</dt><dd><code>${esc(String(p.codigo_municipio_ibge ?? "—"))}</code></dd></div>
          <div><dt>Situação</dt><dd>${esc(p.situacao_cadastral || "—")}</dd></div>
          <div><dt>Fonte</dt><dd>${esc(p.fonte_cnpj || "—")}</dd></div>
        </dl>`;
    }
    setupRaizMsg("Consulta OK. Confirme com “Cadastrar raiz”.", true);
  } catch (err) {
    setupRaizMsg(err.message, false);
  } finally {
    btn.disabled = false;
  }
}

async function cadastrarSetupRaiz(e) {
  e.preventDefault();
  const cnpj = $("#setup-raiz-cnpj")?.value?.trim() || "";
  const btn = $("#btn-setup-raiz-salvar");
  if (!cnpj) return;
  btn.disabled = true;
  setupRaizMsg("Cadastrando raiz…", true);
  try {
    const data = await api("/api/sistema/raiz", {
      method: "POST",
      body: JSON.stringify({ cnpj }),
    });
    renderSetupRaiz(data);
    setupRaizMsg("Raiz cadastrada com sucesso.", true);
    await carregarSetupUasgCatalogo();
    await carregarSetup();
  } catch (err) {
    setupRaizMsg(err.message, false);
  } finally {
    btn.disabled = false;
  }
}

async function atualizarSetupRaiz() {
  const btn = $("#btn-setup-raiz-atualizar");
  btn.disabled = true;
  setupRaizMsg("Atualizando dados via API pública…", true);
  try {
    const data = await api("/api/sistema/raiz/atualizar", { method: "POST", body: "{}" });
    renderSetupRaiz(data);
    setupRaizMsg("Dados da raiz atualizados.", true);
  } catch (err) {
    setupRaizMsg(err.message, false);
  } finally {
    btn.disabled = false;
  }
}

async function carregarSetupUasgCatalogo() {
  const tb = $("#tabela-setup-uasg-catalogo");
  const btnAderir = $("#btn-setup-uasg-aderir");
  if (!tb) return;
  tb.innerHTML = '<tr><td colspan="5">Carregando…</td></tr>';
  try {
    const res = await api("/api/sistema/uasgs-municipio");
    const items = res.items || [];
    if (btnAderir) btnAderir.disabled = !items.some((i) => !i.no_setup || !i.ativo_setup);
    if (!items.length) {
      tb.innerHTML = '<tr><td colspan="5" class="muted">Nenhuma UASG no catálogo. Use “Sincronizar UASGs do município”.</td></tr>';
      return;
    }
    tb.innerHTML = items.map((u) => {
      const noSetupAtiva = u.no_setup && u.ativo_setup;
      const status = noSetupAtiva
        ? '<span class="badge ok">Ativa no Setup</span>'
        : u.no_setup
          ? '<span class="badge">Inativa no Setup</span>'
          : '<span class="badge">Disponível</span>';
      const disabled = noSetupAtiva ? "disabled" : "";
      return `
        <tr data-codigo="${esc(u.codigo_uasg)}">
          <td><input type="checkbox" class="setup-uasg-cat-check" value="${esc(u.codigo_uasg)}" ${disabled} aria-label="Selecionar UASG ${esc(u.codigo_uasg)}" /></td>
          <td><code>${esc(u.codigo_uasg)}</code></td>
          <td>${esc(u.nome_uasg || "—")}</td>
          <td>${status}</td>
          <td class="setup-uasg-acoes">
            ${noSetupAtiva ? "—" : `<button type="button" class="btn btn-sm" data-acao-cat="aderir" data-codigo="${esc(u.codigo_uasg)}">Incluir</button>`}
          </td>
        </tr>`;
    }).join("");
  } catch (err) {
    tb.innerHTML = `<tr><td colspan="5" class="err">${esc(err.message)}</td></tr>`;
    if (btnAderir) btnAderir.disabled = true;
  }
}

async function sincronizarSetupUasgCatalogo() {
  const btn = $("#btn-setup-uasg-sync");
  btn.disabled = true;
  setupUasgCatMsg("Sincronizando com Compras.gov…", true);
  try {
    const res = await api("/api/sistema/uasgs-municipio/sincronizar", {
      method: "POST",
      body: "{}",
    });
    setupUasgCatMsg(
      `Catálogo atualizado: ${fmtNum(res.total_catalogo)} UASG(s) · IBGE ${esc(String(res.codigo_municipio_ibge))} / ${esc(res.uf)}.`,
      true,
    );
    await carregarSetupUasgCatalogo();
  } catch (err) {
    setupUasgCatMsg(err.message, false);
  } finally {
    const raiz = await carregarSetupRaiz();
    btn.disabled = !(raiz?.cadastrada && raiz?.raiz?.codigo_municipio_ibge);
  }
}

async function aderirSetupUasgs(codigos) {
  if (!codigos?.length) return;
  setupUasgCatMsg("Incluindo no Setup…", true);
  try {
    const res = await api("/api/sistema/uasgs-municipio/aderir", {
      method: "POST",
      body: JSON.stringify({ codigos }),
    });
    const partes = [];
    if (res.adicionados) partes.push(`${res.adicionados} adicionada(s)`);
    if (res.reativados) partes.push(`${res.reativados} reativada(s)`);
    if (res.ignorados) partes.push(`${res.ignorados} já ativa(s)`);
    if (res.desconhecidos?.length) partes.push(`${res.desconhecidos.length} fora do catálogo`);
    setupUasgCatMsg(partes.length ? partes.join(" · ") + `.` : "Nada a incluir.", true);
    await carregarSetupUasgCatalogo();
    await carregarSetupUnidades();
    await carregarSetup();
  } catch (err) {
    setupUasgCatMsg(err.message, false);
  }
}

async function onSetupUasgCatalogoAcao(e) {
  const btn = e.target.closest("button[data-acao-cat]");
  if (!btn) return;
  const codigo = btn.dataset.codigo;
  if (btn.dataset.acaoCat === "aderir" && codigo) {
    await aderirSetupUasgs([codigo]);
  }
}

async function aderirSetupUasgsSelecionadas() {
  const checks = [...document.querySelectorAll(".setup-uasg-cat-check:checked:not(:disabled)")];
  const codigos = checks.map((c) => c.value).filter(Boolean);
  if (!codigos.length) {
    setupUasgCatMsg("Selecione ao menos uma UASG disponível.", false);
    return;
  }
  await aderirSetupUasgs(codigos);
}

async function carregarSetupUnidades() {
  const tb = $("#tabela-setup-unidades");
  if (!tb) return;
  tb.innerHTML = '<tr><td colspan="4">Carregando…</td></tr>';
  try {
    const rows = await api("/api/sistema/unidades-compradoras");
    if (!rows.length) {
      tb.innerHTML = '<tr><td colspan="4">Nenhuma UASG cadastrada. Use “Restaurar padrões” ou adicione manualmente.</td></tr>';
      return;
    }
    tb.innerHTML = rows.map((u) => `
      <tr data-uid="${u.id}">
        <td><code>${esc(u.codigo)}</code></td>
        <td>
          <input type="text" class="setup-uasg-nome-input" value="${esc(u.nome)}" maxlength="200" data-uid="${u.id}" aria-label="Nome da UASG ${esc(u.codigo)}" />
        </td>
        <td>${u.ativo ? '<span class="badge ok">Ativa</span>' : '<span class="badge">Inativa</span>'}</td>
        <td class="setup-uasg-acoes">
          <button type="button" class="btn btn-sm" data-acao="salvar" data-uid="${u.id}">Salvar</button>
          <button type="button" class="btn btn-sm" data-acao="toggle" data-uid="${u.id}" data-ativo="${u.ativo ? "1" : "0"}">${u.ativo ? "Desativar" : "Ativar"}</button>
          <button type="button" class="btn btn-sm danger" data-acao="excluir" data-uid="${u.id}" data-codigo="${esc(u.codigo)}">Excluir</button>
        </td>
      </tr>`).join("");
  } catch (err) {
    tb.innerHTML = `<tr><td colspan="4" class="err">${esc(err.message)}</td></tr>`;
  }
}

function setupUnidadeMsg(texto, ok) {
  const msg = $("#setup-unidade-msg");
  if (!msg) return;
  msg.textContent = texto || "";
  msg.className = texto ? `meta-line ${ok ? "ok" : "err"}` : "meta-line";
}

async function adicionarSetupUnidade(e) {
  e.preventDefault();
  const codigo = $("#setup-uasg-codigo")?.value?.trim() || "";
  const nome = $("#setup-uasg-nome")?.value?.trim() || "";
  const btn = $("#btn-setup-unidade-add");
  if (!codigo || !nome) return;
  btn.disabled = true;
  setupUnidadeMsg("Salvando…", true);
  try {
    await api("/api/sistema/unidades-compradoras", {
      method: "POST",
      body: JSON.stringify({ codigo, nome, ativo: true }),
    });
    e.target.reset();
    setupUnidadeMsg(`UASG ${codigo} adicionada.`, true);
    await carregarSetupUnidades();
    await carregarSetup();
  } catch (err) {
    setupUnidadeMsg(err.message, false);
  } finally {
    btn.disabled = false;
  }
}

async function restaurarSetupUnidadesPadrao() {
  const btn = $("#btn-setup-unidade-padroes");
  btn.disabled = true;
  setupUnidadeMsg("Restaurando padrões…", true);
  try {
    const res = await api("/api/sistema/unidades-compradoras/restaurar-padroes", {
      method: "POST",
      body: "{}",
    });
    setupUnidadeMsg(
      res.adicionados
        ? `${res.adicionados} UASG(s) padrão incluída(s). Total: ${res.total}.`
        : `Nenhuma UASG faltando. Total: ${res.total}.`,
      true,
    );
    await carregarSetupUnidades();
    await carregarSetup();
  } catch (err) {
    setupUnidadeMsg(err.message, false);
  } finally {
    btn.disabled = false;
  }
}

async function onSetupUnidadeAcao(e) {
  const btn = e.target.closest("button[data-acao]");
  if (!btn) return;
  const uid = parseInt(btn.dataset.uid, 10);
  const acao = btn.dataset.acao;
  if (!uid || !acao) return;

  try {
    if (acao === "salvar") {
      const input = $(`.setup-uasg-nome-input[data-uid="${uid}"]`);
      const nome = input?.value?.trim() || "";
      if (nome.length < 2) throw new Error("Nome deve ter ao menos 2 caracteres");
      await api(`/api/sistema/unidades-compradoras/${uid}`, {
        method: "PATCH",
        body: JSON.stringify({ nome }),
      });
      setupUnidadeMsg("Nome atualizado.", true);
    } else if (acao === "toggle") {
      const ativo = btn.dataset.ativo === "1";
      await api(`/api/sistema/unidades-compradoras/${uid}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !ativo }),
      });
      setupUnidadeMsg(ativo ? "UASG desativada." : "UASG ativada.", true);
    } else if (acao === "excluir") {
      const codigo = btn.dataset.codigo || "";
      if (!confirm(`Excluir a UASG ${codigo}? Ela deixará de ser alvo da coleta.`)) return;
      await api(`/api/sistema/unidades-compradoras/${uid}`, { method: "DELETE" });
      setupUnidadeMsg(`UASG ${codigo} excluída.`, true);
    }
    await carregarSetupUnidades();
    await carregarSetup();
  } catch (err) {
    setupUnidadeMsg(err.message, false);
  }
}

async function salvarSetup(e) {
  e.preventDefault();
  const btn = $("#btn-setup-salvar");
  const msg = $("#setup-msg");
  const ano = parseInt($("#setup-ano-inicial").value, 10);
  if (!ano) return;
  btn.disabled = true;
  msg.textContent = "Salvando…"; msg.className = "meta-line";
  try {
    sistemaConfig = await api("/api/sistema/config", { method: "PUT", body: JSON.stringify({ ano_inicial_coleta: ano, setup_concluido: true }) });
    aplicarConfigColeta(sistemaConfig);
    msg.textContent = `Configuração salva. Coletas a partir de ${ano}.`; msg.className = "meta-line ok";
    fecharSetupWizard();
    await carregarSetup();
  } catch (err) { msg.textContent = err.message; msg.className = "meta-line err"; }
  finally { btn.disabled = false; }
}

async function limparBaseDados(e) {
  e.preventDefault();
  const confirmacao = $("#setup-limpar-confirm")?.value?.trim() || "";
  const btn = $("#btn-setup-limpar");
  const msg = $("#setup-limpar-msg");
  btn.disabled = true;
  msg.textContent = "Processando…"; msg.className = "meta-line";
  try {
    const res = await api("/api/sistema/limpar-dados", { method: "POST", body: JSON.stringify({ confirmacao }) });
    const total = res.removidos.reduce((s, r) => s + r.registros, 0);
    msg.textContent = `Base limpa: ${fmtNum(total)} registros removidos. Banco: ${res.banco_mb_antes} MB → ${res.banco_mb_depois} MB. Preservados: observadores, vínculos e UASGs.`;
    msg.className = "meta-line ok";
    if ($("#setup-limpar-confirm")) $("#setup-limpar-confirm").value = "";
    await carregarSetup();
  } catch (err) { msg.textContent = err.message; msg.className = "meta-line err"; }
  finally { btn.disabled = false; }
}

/* ---------------------------- Wizard inicial ---------------------------- */
function fecharSetupWizard() {
  const dlg = $("#dialog-setup-wizard");
  if (dlg?.open) dlg.close();
}

function atualizarWizardPreview() {
  const sel = $("#wizard-ano-inicial");
  const preview = $("#wizard-anos-preview");
  if (!sel || !preview) return;
  const ini = parseInt(sel.value, 10);
  const fim = sistemaConfig?.ano_atual || new Date().getFullYear();
  const anos = ini > fim ? [ini] : Array.from({ length: fim - ini + 1 }, (_, i) => ini + i);
  preview.textContent = `Serão coletados os anos: ${anos.join(", ")}`;
}

function abrirSetupWizard(cfg) {
  const dlg = $("#dialog-setup-wizard");
  const sel = $("#wizard-ano-inicial");
  if (!dlg || !sel) return;
  if (!sel.options.length) {
    const atual = cfg?.ano_atual || new Date().getFullYear();
    for (let y = atual; y >= 2000; y--) { const o = document.createElement("option"); o.value = y; o.textContent = y; sel.appendChild(o); }
  }
  sel.value = String(cfg?.ano_inicial_coleta || cfg?.ano_atual || new Date().getFullYear());
  atualizarWizardPreview();
  dlg.showModal();
}

async function concluirSetupWizard(e) {
  e.preventDefault();
  const ano = parseInt($("#wizard-ano-inicial").value, 10);
  const btn = $("#btn-wizard-concluir");
  btn.disabled = true;
  try {
    sistemaConfig = await api("/api/sistema/config", { method: "PUT", body: JSON.stringify({ ano_inicial_coleta: ano, setup_concluido: true }) });
    aplicarConfigColeta(sistemaConfig);
    fecharSetupWizard();
    if ($("#setup-ano-inicial")) { $("#setup-ano-inicial").value = String(ano); carregarSetup(); }
  } catch (err) { alert(err.message); }
  finally { btn.disabled = false; }
}

async function verificarSetupInicial() {
  const cfg = await carregarSistemaConfig();
  if (cfg && !cfg.setup_concluido) abrirSetupWizard(cfg);
}

window.verificarSetupInicial = verificarSetupInicial;

/* ---------------------------- Agendamento (coleta → CNPJs) ---------------------------- */

function setupAgMsg(texto, ok) {
  const msg = $("#setup-ag-msg");
  if (!msg) return;
  msg.textContent = texto || "";
  msg.className = texto ? `meta-line ${ok ? "ok" : "err"}` : "meta-line";
}

function fmtAgData(iso) {
  if (!iso) return "—";
  try {
    const s = String(iso).trim();
    // Backend grava UTC; sem Z/+00:00 o JS trata como local e em BRT fica +3h.
    const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(s);
    const normalized = hasTz ? s : `${s}Z`;
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function badgeAgOk(ok) {
  if (ok === true) return '<span class="badge ok">OK</span>';
  if (ok === false) return '<span class="badge" style="background:#f8e8e4;color:#a33;border-color:#e4c7bf">Erro</span>';
  return '<span class="badge">—</span>';
}

function renderAgendamento(cfg) {
  if (!cfg) return;
  const ativo = $("#setup-ag-ativo");
  const horario = $("#setup-ag-horario");
  const fuso = $("#setup-ag-fuso");
  const coleta = $("#setup-ag-coleta");
  const cnpjs = $("#setup-ag-cnpjs");
  if (ativo) ativo.checked = !!cfg.ativo;
  if (horario) horario.value = cfg.horario || "02:00";
  if (fuso) fuso.value = cfg.fuso || "America/Sao_Paulo";
  if (coleta) coleta.checked = cfg.incluir_coleta !== false;
  if (cnpjs) cnpjs.checked = cfg.incluir_cnpjs !== false;

  const box = $("#setup-ag-status");
  const logEl = $("#setup-ag-log");
  if (!box) return;

  const vivo = cfg.status_vivo || {};
  const ultima = cfg.ultima_execucao;
  const params = cfg.params_coleta || {};
  const rodando = !!cfg.em_andamento || !!vivo.running;

  const linhas = [];
  linhas.push(`<div class="ag-row"><span class="ag-label">Estado</span><span class="ag-value">${
    rodando
      ? `Em andamento · fase ${esc(vivo.fase || "…")}`
      : (cfg.ativo ? `Agendado diariamente às ${esc(cfg.horario)} (${esc(cfg.fuso)})` : "Desligado")
  }</span></div>`);
  linhas.push(`<div class="ag-row"><span class="ag-label">Hora local (servidor)</span><span class="ag-value">${esc(cfg.agora_local || "—")}</span></div>`);
  linhas.push(`<div class="ag-row"><span class="ag-label">Cadeia</span><span class="ag-value">${
    [
      cfg.incluir_coleta ? "coleta" : null,
      cfg.incluir_cnpjs ? "CNPJs pendentes" : null,
    ].filter(Boolean).join(" → ") || "nenhuma etapa"
  }</span></div>`);
  if (params.ano || (params.anos || []).length) {
    linhas.push(`<div class="ag-row"><span class="ag-label">Params coleta</span><span class="ag-value">${
      esc(`ano ${params.ano ?? "—"} · Power BI ${(params.anos || []).join(", ") || "—"} · fases ${(params.fases || []).join(",")}`)
    }</span></div>`);
  }

  if (ultima) {
    linhas.push(`<div class="ag-row"><span class="ag-label">Última execução</span><span class="ag-value">${
      badgeAgOk(ultima.ok)
    } · ${esc(ultima.origem || "—")} · início ${esc(fmtAgData(ultima.iniciado_em))} · fim ${esc(fmtAgData(ultima.finalizado_em))}</span></div>`);
    if (ultima.resumo) {
      linhas.push(`<div class="ag-row"><span class="ag-label">Resumo</span><span class="ag-value">${esc(ultima.resumo)}</span></div>`);
    }
  } else {
    linhas.push(`<div class="ag-row"><span class="ag-label">Última execução</span><span class="ag-value">Nenhuma ainda</span></div>`);
  }

  box.innerHTML = linhas.join("");

  const logLinhas = (vivo.running && (vivo.log || []).length)
    ? vivo.log
    : (ultima?.log || []);
  if (logEl) {
    if (logLinhas.length) {
      logEl.hidden = false;
      logEl.textContent = logLinhas.join("\n");
      logEl.scrollTop = logEl.scrollHeight;
    } else {
      logEl.hidden = true;
      logEl.textContent = "";
    }
  }

  const btnRodar = $("#btn-setup-ag-rodar");
  if (btnRodar) btnRodar.disabled = rodando;
}

function pararPollAgendamento() {
  if (agendamentoPollTimer) {
    clearInterval(agendamentoPollTimer);
    agendamentoPollTimer = null;
  }
}

function iniciarPollAgendamento() {
  pararPollAgendamento();
  agendamentoPollTimer = setInterval(() => {
    carregarAgendamento({ silencioso: true }).catch(() => {});
  }, 2500);
}

async function carregarAgendamento({ silencioso } = {}) {
  try {
    const cfg = await api("/api/sistema/agendamento");
    renderAgendamento(cfg);
    if (cfg.em_andamento) iniciarPollAgendamento();
    else pararPollAgendamento();
    return cfg;
  } catch (err) {
    if (!silencioso) {
      const box = $("#setup-ag-status");
      if (box) box.innerHTML = `<p class="result err">${esc(err.message)}</p>`;
    }
    throw err;
  }
}

async function salvarAgendamento(e) {
  e.preventDefault();
  const btn = $("#btn-setup-ag-salvar");
  const horario = $("#setup-ag-horario")?.value || "02:00";
  const [hStr, mStr] = horario.split(":");
  const hora = parseInt(hStr, 10);
  const minuto = parseInt(mStr, 10);
  btn.disabled = true;
  setupAgMsg("Salvando…", true);
  try {
    const cfg = await api("/api/sistema/agendamento", {
      method: "PUT",
      body: JSON.stringify({
        ativo: !!$("#setup-ag-ativo")?.checked,
        hora,
        minuto,
        fuso: $("#setup-ag-fuso")?.value || "America/Sao_Paulo",
        incluir_coleta: !!$("#setup-ag-coleta")?.checked,
        incluir_cnpjs: !!$("#setup-ag-cnpjs")?.checked,
      }),
    });
    renderAgendamento(cfg);
    setupAgMsg(
      cfg.ativo
        ? `Agendamento ligado · diário às ${cfg.horario} (${cfg.fuso}).`
        : "Agendamento desligado.",
      true,
    );
  } catch (err) {
    setupAgMsg(err.message, false);
  } finally {
    btn.disabled = false;
  }
}

async function rodarCadeiaAgora() {
  if (!confirm("Rodar agora a cadeia configurada (coleta → CNPJs, conforme opções)?")) return;
  const btn = $("#btn-setup-ag-rodar");
  btn.disabled = true;
  setupAgMsg("Iniciando cadeia…", true);
  try {
    await api("/api/sistema/agendamento/rodar", { method: "POST", body: "{}" });
    setupAgMsg("Cadeia iniciada. Acompanhe o status abaixo.", true);
    iniciarPollAgendamento();
    await carregarAgendamento({ silencioso: true });
  } catch (err) {
    setupAgMsg(err.message, false);
    btn.disabled = false;
  }
}

/* ---------------------------- Usuários / acesso ---------------------------- */

function setupUsuarioMsg(texto, ok) {
  const msg = $("#setup-usuario-msg");
  if (!msg) return;
  msg.textContent = texto || "";
  msg.className = texto ? `meta-line ${ok ? "ok" : "err"}` : "meta-line";
}

function renderLimitesUsuarios(limites) {
  const el = $("#setup-usuarios-limites");
  if (!el || !limites) return;
  el.textContent =
    `Ativos: ${limites.admin}/${limites.max_admin} admin · ` +
    `${limites.consulta}/${limites.max_consulta} consulta · ` +
    `total ${limites.total}/${limites.max_total}` +
    (limites.vagas_consulta || limites.vagas_admin
      ? ` · vagas: ${limites.vagas_admin} admin, ${limites.vagas_consulta} consulta`
      : " · sem vagas");
}

async function carregarSetupUsuarios() {
  const tb = $("#tabela-setup-usuarios");
  if (!tb) return;
  tb.innerHTML = '<tr><td colspan="4">Carregando…</td></tr>';
  try {
    const [rows, lim] = await Promise.all([
      api("/api/auth/usuarios"),
      api("/api/auth/limites"),
    ]);
    renderLimitesUsuarios(lim.limites);
    if (!rows.length) {
      tb.innerHTML = '<tr><td colspan="4">Nenhum usuário cadastrado.</td></tr>';
      return;
    }
    const papelLabel = { admin: "Administrador", consulta: "Consulta" };
    tb.innerHTML = rows.map((u) => `
      <tr data-uid="${u.id}">
        <td><code>${esc(u.username)}</code></td>
        <td>${esc(papelLabel[u.papel] || u.papel)}</td>
        <td>${u.ativo ? '<span class="badge ok">Ativo</span>' : '<span class="badge">Inativo</span>'}</td>
        <td class="setup-uasg-acoes">
          <button type="button" class="btn btn-sm" data-acao="toggle" data-uid="${u.id}" data-ativo="${u.ativo ? "1" : "0"}">${u.ativo ? "Desativar" : "Ativar"}</button>
          <button type="button" class="btn btn-sm" data-acao="liberar" data-uid="${u.id}" data-user="${esc(u.username)}" title="Encerra sessão ativa para permitir novo login">Liberar sessão</button>
          <button type="button" class="btn btn-sm" data-acao="senha" data-uid="${u.id}" data-user="${esc(u.username)}">Resetar senha</button>
        </td>
      </tr>`).join("");
  } catch (err) {
    tb.innerHTML = `<tr><td colspan="4" class="err">${esc(err.message)}</td></tr>`;
  }
}

async function adicionarSetupUsuario(e) {
  e.preventDefault();
  const username = $("#setup-user-nome")?.value?.trim() || "";
  const password = $("#setup-user-senha")?.value || "";
  const papel = $("#setup-user-papel")?.value || "consulta";
  const btn = $("#btn-setup-usuario-add");
  if (!username || !password) return;
  btn.disabled = true;
  setupUsuarioMsg("Criando…", true);
  try {
    await api("/api/auth/usuarios", {
      method: "POST",
      body: JSON.stringify({ username, password, papel }),
    });
    e.target.reset();
    setupUsuarioMsg(`Usuário ${username} criado.`, true);
    await carregarSetupUsuarios();
  } catch (err) {
    setupUsuarioMsg(err.message, false);
  } finally {
    btn.disabled = false;
  }
}

async function onSetupUsuarioAcao(e) {
  const btn = e.target.closest("button[data-acao]");
  if (!btn) return;
  const uid = parseInt(btn.dataset.uid, 10);
  const acao = btn.dataset.acao;
  if (!uid || !acao) return;

  try {
    if (acao === "toggle") {
      const ativo = btn.dataset.ativo === "1";
      await api(`/api/auth/usuarios/${uid}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !ativo }),
      });
      setupUsuarioMsg(ativo ? "Usuário desativado." : "Usuário reativado.", true);
    } else if (acao === "liberar") {
      const user = btn.dataset.user || "";
      if (!confirm(`Liberar sessão de ${user}? Quem estiver logado será desconectado.`)) return;
      const out = await api(`/api/auth/usuarios/${uid}/liberar-sessao`, {
        method: "POST",
        body: "{}",
      });
      const n = out?.sessoes_encerradas ?? 0;
      setupUsuarioMsg(
        n
          ? `Sessão de ${user} liberada (${n}). Já é possível entrar de novo.`
          : `Nenhuma sessão ativa para ${user}.`,
        true,
      );
    } else if (acao === "senha") {
      const user = btn.dataset.user || "";
      const nova = prompt(`Nova senha para ${user} (mín. 6 caracteres):`);
      if (nova == null) return;
      if (nova.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres.");
      await api(`/api/auth/usuarios/${uid}`, {
        method: "PATCH",
        body: JSON.stringify({ password: nova }),
      });
      setupUsuarioMsg("Senha redefinida. Sessões anteriores encerradas.", true);
    }
    await carregarSetupUsuarios();
  } catch (err) {
    setupUsuarioMsg(err.message, false);
  }
}

/* ---------------------------- Provedores de IA ---------------------------- */

const IA_PROVEDOR_LABEL = {
  openai: "OpenAI",
  deepseek: "DeepSeek",
  gemini: "Gemini",
  anthropic: "Anthropic",
  groq: "Groq",
  mistral: "Mistral",
  xai: "xAI (Grok)",
  openrouter: "OpenRouter",
  together: "Together AI",
  perplexity: "Perplexity",
  openai_compatible: "OpenAI-compatible",
};

/** Placeholder de modelo padrão ao trocar o provedor (só se o campo estiver vazio ou no default anterior). */
const IA_MODELO_SUGESTAO = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  gemini: "gemini-2.0-flash",
  anthropic: "claude-3-5-haiku-latest",
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-small-latest",
  xai: "grok-2-latest",
  openrouter: "openai/gpt-4o-mini",
  together: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
  perplexity: "sonar",
  openai_compatible: "",
};

function setupIaMsg(texto, ok) {
  const msg = $("#setup-ia-msg");
  if (!msg) return;
  msg.textContent = texto || "";
  msg.className = texto ? `meta-line ${ok ? "ok" : "err"}` : "meta-line";
}

function resetFormSetupIa() {
  const form = $("#form-setup-ia");
  if (!form) return;
  form.reset();
  $("#setup-ia-id").value = "";
  $("#setup-ia-ativo").checked = true;
  $("#setup-ia-prioridade").value = "100";
  const key = $("#setup-ia-api-key");
  if (key) { key.required = true; key.placeholder = "Cole a chave do provedor"; }
  const keyLabel = $("#setup-ia-key-label");
  if (keyLabel) keyLabel.innerHTML = "API key / token *";
  const btn = $("#btn-setup-ia-salvar");
  if (btn) btn.textContent = "Adicionar provedor";
  const cancel = $("#btn-setup-ia-cancelar");
  if (cancel) cancel.hidden = true;
}

function fmtIaTesteQuando(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function fmtIaTeste(row) {
  if (!row.ultimo_teste_em) {
    return '<span class="setup-ia-teste muted">—</span>';
  }
  const whenCompact = fmtIaTesteQuando(row.ultimo_teste_em);
  const whenFull = fmtAgData(row.ultimo_teste_em);
  const badge = row.ultimo_teste_ok === true
    ? '<span class="badge ok">OK</span>'
    : row.ultimo_teste_ok === false
      ? '<span class="badge danger">Falha</span>'
      : '<span class="badge">—</span>';
  const tipParts = [whenFull];
  if (row.ultimo_teste_msg) tipParts.push(row.ultimo_teste_msg);
  const title = esc(tipParts.join(" — "));
  return `<span class="setup-ia-teste" title="${title}">${badge}<span class="setup-ia-teste-when">${esc(whenCompact)}</span></span>`;
}

async function carregarSetupIa() {
  const tb = $("#tabela-setup-ia");
  if (!tb) return;
  tb.innerHTML = '<tr><td colspan="8">Carregando…</td></tr>';
  try {
    const data = await api("/api/sistema/ia-provedores");
    const aviso = $("#setup-ia-aviso-custo");
    if (aviso && data.aviso_custo) aviso.textContent = data.aviso_custo;
    const rows = data.items || [];
    if (!rows.length) {
      tb.innerHTML = '<tr><td colspan="8">Nenhum provedor cadastrado. Adicione ao menos um token para features de IA.</td></tr>';
      return;
    }
    tb.innerHTML = rows.map((p) => {
      const nome = p.nome || "";
      const modelo = p.modelo || "";
      const provedorLabel = IA_PROVEDOR_LABEL[p.provedor] || p.provedor || "";
      const keyMask = p.api_key_mascara || "••••";
      return `
      <tr data-pid="${p.id}">
        <td class="setup-ia-col-prio"><code>${esc(String(p.prioridade))}</code></td>
        <td class="setup-ia-col-nome" title="${esc(nome)}"><span class="setup-ia-cell">${esc(nome)}</span></td>
        <td class="setup-ia-col-prov" title="${esc(provedorLabel)}"><span class="setup-ia-cell">${esc(provedorLabel)}</span></td>
        <td class="setup-ia-col-modelo" title="${esc(modelo || "—")}"><span class="setup-ia-cell mono">${esc(modelo || "—")}</span></td>
        <td class="setup-ia-col-key" title="${esc(keyMask)}"><code class="setup-ia-cell">${esc(keyMask)}</code></td>
        <td class="setup-ia-col-status">${p.ativo ? '<span class="badge ok">Ativo</span>' : '<span class="badge">Inativo</span>'}</td>
        <td class="setup-ia-col-teste">${fmtIaTeste(p)}</td>
        <td class="setup-ia-col-acoes">
          <div class="setup-ia-acoes">
            <button type="button" class="btn btn-sm" data-acao="testar" data-pid="${p.id}">Testar</button>
            <button type="button" class="btn btn-sm" data-acao="editar" data-pid="${p.id}">Editar</button>
            <button type="button" class="btn btn-sm" data-acao="toggle" data-pid="${p.id}" data-ativo="${p.ativo ? "1" : "0"}">${p.ativo ? "Desativar" : "Ativar"}</button>
            <button type="button" class="btn btn-sm danger" data-acao="excluir" data-pid="${p.id}" data-nome="${esc(nome)}">Remover</button>
          </div>
        </td>
      </tr>`;
    }).join("");
  } catch (err) {
    tb.innerHTML = `<tr><td colspan="8" class="err">${esc(err.message)}</td></tr>`;
  }
}

function preencherFormEdicaoIa(row) {
  $("#setup-ia-id").value = String(row.id);
  $("#setup-ia-nome").value = row.nome || "";
  $("#setup-ia-provedor").value = row.provedor || "openai";
  $("#setup-ia-modelo").value = row.modelo || "";
  $("#setup-ia-prioridade").value = String(row.prioridade ?? 100);
  $("#setup-ia-base-url").value = row.base_url || "";
  $("#setup-ia-ativo").checked = !!row.ativo;
  const key = $("#setup-ia-api-key");
  if (key) {
    key.value = "";
    key.required = false;
    key.placeholder = `Mantém atual (${row.api_key_mascara || "••••"}) — preencha só para trocar`;
  }
  const keyLabel = $("#setup-ia-key-label");
  if (keyLabel) keyLabel.innerHTML = "API key / token <span class=\"muted\">(deixe em branco para manter)</span>";
  const btn = $("#btn-setup-ia-salvar");
  if (btn) btn.textContent = "Salvar alterações";
  const cancel = $("#btn-setup-ia-cancelar");
  if (cancel) cancel.hidden = false;
  $("#setup-ia-nome")?.focus();
}

async function salvarSetupIa(e) {
  e.preventDefault();
  const btn = $("#btn-setup-ia-salvar");
  const id = ($("#setup-ia-id")?.value || "").trim();
  const nome = $("#setup-ia-nome")?.value?.trim() || "";
  const provedor = $("#setup-ia-provedor")?.value || "openai";
  const modelo = $("#setup-ia-modelo")?.value?.trim() || null;
  const baseUrl = $("#setup-ia-base-url")?.value?.trim() || null;
  const prioridade = parseInt($("#setup-ia-prioridade")?.value || "100", 10);
  const ativo = !!$("#setup-ia-ativo")?.checked;
  const apiKey = $("#setup-ia-api-key")?.value || "";

  if (!nome) return;
  if (!id && apiKey.trim().length < 8) {
    setupIaMsg("Informe a API key (mín. 8 caracteres).", false);
    return;
  }

  btn.disabled = true;
  setupIaMsg(id ? "Salvando…" : "Cadastrando…", true);
  try {
    if (id) {
      const body = {
        nome,
        provedor,
        modelo,
        base_url: baseUrl,
        prioridade,
        ativo,
      };
      if (apiKey.trim()) body.api_key = apiKey.trim();
      await api(`/api/sistema/ia-provedores/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setupIaMsg("Provedor atualizado.", true);
    } else {
      await api("/api/sistema/ia-provedores", {
        method: "POST",
        body: JSON.stringify({
          nome,
          provedor,
          modelo,
          base_url: baseUrl,
          prioridade,
          ativo,
          api_key: apiKey.trim(),
        }),
      });
      setupIaMsg(`Provedor “${nome}” cadastrado.`, true);
    }
    resetFormSetupIa();
    await carregarSetupIa();
  } catch (err) {
    setupIaMsg(err.message, false);
  } finally {
    btn.disabled = false;
  }
}

async function onSetupIaAcao(e) {
  const btn = e.target.closest("button[data-acao]");
  if (!btn) return;
  const pid = parseInt(btn.dataset.pid, 10);
  const acao = btn.dataset.acao;
  if (!pid || !acao) return;

  try {
    if (acao === "editar") {
      const row = await api(`/api/sistema/ia-provedores/${pid}`);
      preencherFormEdicaoIa(row);
      setupIaMsg("Editando provedor — salve ou cancele.", true);
      return;
    }
    if (acao === "toggle") {
      const ativo = btn.dataset.ativo === "1";
      await api(`/api/sistema/ia-provedores/${pid}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !ativo }),
      });
      setupIaMsg(ativo ? "Provedor desativado." : "Provedor ativado.", true);
    } else if (acao === "excluir") {
      const nome = btn.dataset.nome || "";
      if (!confirm(`Remover o provedor “${nome}”? Esta ação não pode ser desfeita.`)) return;
      await api(`/api/sistema/ia-provedores/${pid}`, { method: "DELETE" });
      setupIaMsg("Provedor removido.", true);
      if ($("#setup-ia-id")?.value === String(pid)) resetFormSetupIa();
    } else if (acao === "testar") {
      btn.disabled = true;
      setupIaMsg("Testando conexão…", true);
      const r = await api(`/api/sistema/ia-provedores/${pid}/testar`, {
        method: "POST",
        body: "{}",
      });
      setupIaMsg(r.mensagem || (r.ok ? "Conexão OK." : "Falha no teste."), !!r.ok);
    }
    await carregarSetupIa();
  } catch (err) {
    setupIaMsg(err.message, false);
  } finally {
    btn.disabled = false;
  }
}

async function carregarSetup() {
  try {
    const status = await api("/api/sistema/status");
    sistemaConfig = status.config;
    renderSetupStatus(status);
    const sel = $("#setup-ano-inicial");
    if (sel && !sel.options.length) {
      for (let y = status.config.ano_atual; y >= 2000; y--) {
        const o = document.createElement("option"); o.value = y; o.textContent = y; sel.appendChild(o);
      }
    }
    if (sel && status.config.ano_inicial_coleta) sel.value = String(status.config.ano_inicial_coleta);
    atualizarPreviewAnos();
  } catch (err) {
    if ($("#setup-status-grid")) $("#setup-status-grid").innerHTML = `<p class="result err">${esc(err.message)}</p>`;
  }
  await carregarSetupRaiz();
  await carregarSetupUasgCatalogo();
  await carregarSetupUnidades();
  await carregarAgendamento().catch(() => {});
  await carregarSetupIa().catch(() => {});
  await carregarSetupUsuarios();
}

document.addEventListener("DOMContentLoaded", () => {
  $("#setup-ano-inicial")?.addEventListener("change", atualizarPreviewAnos);
  $("#wizard-ano-inicial")?.addEventListener("change", atualizarWizardPreview);
  $("#form-setup-config")?.addEventListener("submit", salvarSetup);
  $("#form-setup-limpar")?.addEventListener("submit", limparBaseDados);
  $("#form-setup-wizard")?.addEventListener("submit", concluirSetupWizard);
  $("#form-setup-raiz")?.addEventListener("submit", cadastrarSetupRaiz);
  $("#btn-setup-raiz-consultar")?.addEventListener("click", consultarSetupRaiz);
  $("#btn-setup-raiz-atualizar")?.addEventListener("click", atualizarSetupRaiz);
  $("#btn-setup-uasg-sync")?.addEventListener("click", sincronizarSetupUasgCatalogo);
  $("#btn-setup-uasg-aderir")?.addEventListener("click", aderirSetupUasgsSelecionadas);
  $("#tabela-setup-uasg-catalogo")?.addEventListener("click", onSetupUasgCatalogoAcao);
  $("#form-setup-unidade")?.addEventListener("submit", adicionarSetupUnidade);
  $("#btn-setup-unidade-padroes")?.addEventListener("click", restaurarSetupUnidadesPadrao);
  $("#tabela-setup-unidades")?.addEventListener("click", onSetupUnidadeAcao);
  $("#form-setup-agendamento")?.addEventListener("submit", salvarAgendamento);
  $("#btn-setup-ag-rodar")?.addEventListener("click", rodarCadeiaAgora);
  $("#form-setup-ia")?.addEventListener("submit", salvarSetupIa);
  $("#btn-setup-ia-cancelar")?.addEventListener("click", () => {
    resetFormSetupIa();
    setupIaMsg("", true);
  });
  $("#setup-ia-provedor")?.addEventListener("change", () => {
    const modelo = $("#setup-ia-modelo");
    if (!modelo) return;
    const sug = IA_MODELO_SUGESTAO[$("#setup-ia-provedor")?.value] ?? "";
    const atuais = new Set(Object.values(IA_MODELO_SUGESTAO).filter(Boolean));
    if (!modelo.value.trim() || atuais.has(modelo.value.trim())) {
      modelo.value = sug;
      modelo.placeholder = sug ? `Ex.: ${sug}` : "Ex.: modelo do provedor";
    }
  });
  $("#tabela-setup-ia")?.addEventListener("click", onSetupIaAcao);
  $("#form-setup-usuario")?.addEventListener("submit", adicionarSetupUsuario);
  $("#tabela-setup-usuarios")?.addEventListener("click", onSetupUsuarioAcao);
  // verificarSetupInicial é chamado pelo auth.js após login (admin).
});

registrarPagina("setup", carregarSetup);
