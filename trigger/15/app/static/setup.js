/* Setup do sistema — ano inicial de coleta e limpeza segura da base */

let sistemaConfig = null;

function anosColetaTexto(anos) {
  if (!anos?.length) return "—";
  return anos.join(", ");
}

function aplicarConfigColeta(cfg) {
  if (!cfg) return;
  const anos = cfg.anos_coleta || [];
  const anoPadrao = anos.length ? anos[anos.length - 1] : cfg.ano_atual;

  const coletaAno = $("#coleta-ano");
  if (coletaAno && cfg.ano_inicial_coleta) {
    coletaAno.value = anoPadrao;
    coletaAno.min = cfg.ano_inicial_coleta;
  }

  const comprasAno = $("#compras-coleta-ano");
  if (comprasAno && cfg.ano_inicial_coleta) {
    comprasAno.value = anoPadrao;
    comprasAno.placeholder = `Ex.: ${anoPadrao}`;
    comprasAno.min = cfg.ano_inicial_coleta;
  }

  const pbiAnos = $("#pbi-coleta-anos");
  if (pbiAnos && anos.length) {
    pbiAnos.value = anos.join(", ");
  }

  const badge = $("#setup-badge-nav");
  if (badge && cfg.setup_concluido && cfg.ano_inicial_coleta) {
    badge.textContent = `Coleta ≥ ${cfg.ano_inicial_coleta}`;
    badge.classList.remove("hidden");
  }
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
  const totais = status.contagem.filter((c) => c.registros > 0);
  const coleta = status.contagem.filter(
    (c) => !status.tabelas_preservadas.includes(c.tabela) && c.registros > 0
  );

  el.innerHTML = `
    <div class="setup-stat">
      <span class="setup-stat-label">Banco de dados</span>
      <strong>${status.banco_mb} MB</strong>
    </div>
    <div class="setup-stat">
      <span class="setup-stat-label">Ano inicial configurado</span>
      <strong>${cfg.ano_inicial_coleta ?? "Não definido"}</strong>
    </div>
    <div class="setup-stat">
      <span class="setup-stat-label">Anos de coleta</span>
      <strong>${anosColetaTexto(cfg.anos_coleta)}</strong>
    </div>
    <div class="setup-stat">
      <span class="setup-stat-label">Registros coletados</span>
      <strong>${coleta.reduce((s, c) => s + c.registros, 0).toLocaleString("pt-BR")}</strong>
    </div>
    <div class="setup-stat setup-stat-wide">
      <span class="setup-stat-label">Tabelas com dados</span>
      <span class="setup-tabelas">${totais.length
        ? totais.map((c) => `${esc(c.tabela)} (${c.registros.toLocaleString("pt-BR")})`).join(" · ")
        : "Nenhum dado coletado"}</span>
    </div>`;
}

async function carregarSetupPagina() {
  try {
    const status = await api("/api/sistema/status");
    sistemaConfig = status.config;
    renderSetupStatus(status);

    const sel = $("#setup-ano-inicial");
    if (sel && !sel.options.length) {
      const atual = status.config.ano_atual;
      for (let y = atual; y >= 2000; y--) {
        const o = document.createElement("option");
        o.value = y;
        o.textContent = y;
        sel.appendChild(o);
      }
    }
    if (sel && status.config.ano_inicial_coleta) {
      sel.value = String(status.config.ano_inicial_coleta);
    }

    const preview = $("#setup-anos-preview");
    if (preview) {
      const anos = status.config.anos_coleta.length
        ? status.config.anos_coleta
        : anosColetaFromSelect();
      preview.textContent = anos.length
        ? `Coletas previstas: ${anos.join(", ")}`
        : "Selecione o ano inicial para ver o intervalo.";
    }
  } catch (err) {
    if ($("#setup-status-grid")) {
      $("#setup-status-grid").innerHTML = `<p class="result err">${esc(err.message)}</p>`;
    }
  }
}

function anosColetaFromSelect() {
  const sel = $("#setup-ano-inicial");
  if (!sel?.value) return [];
  const ini = parseInt(sel.value, 10);
  const fim = sistemaConfig?.ano_atual || new Date().getFullYear();
  if (ini > fim) return [ini];
  return Array.from({ length: fim - ini + 1 }, (_, i) => ini + i);
}

function atualizarPreviewAnos() {
  const preview = $("#setup-anos-preview");
  if (!preview) return;
  const anos = anosColetaFromSelect();
  preview.textContent = anos.length
    ? `Coletas previstas: ${anos.join(", ")} (de ${anos[0]} até ${anos[anos.length - 1]})`
    : "Selecione o ano inicial.";
}

async function salvarSetup(e) {
  e.preventDefault();
  const btn = $("#btn-setup-salvar");
  const msg = $("#setup-msg");
  const ano = parseInt($("#setup-ano-inicial").value, 10);
  if (!ano) return;

  btn.disabled = true;
  msg.textContent = "Salvando…";
  msg.className = "meta-bar";

  try {
    sistemaConfig = await api("/api/sistema/config", {
      method: "PUT",
      body: JSON.stringify({ ano_inicial_coleta: ano, setup_concluido: true }),
    });
    aplicarConfigColeta(sistemaConfig);
    msg.textContent = `Configuração salva. Coletas a partir de ${ano}.`;
    msg.className = "meta-bar ok";
    fecharSetupWizard();
    await carregarSetupPagina();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "meta-bar err";
  } finally {
    btn.disabled = false;
  }
}

async function limparBaseDados(e) {
  e.preventDefault();
  const confirmacao = $("#setup-limpar-confirm")?.value?.trim() || "";
  const btn = $("#btn-setup-limpar");
  const msg = $("#setup-limpar-msg");

  btn.disabled = true;
  msg.textContent = "Processando…";
  msg.className = "meta-bar";

  try {
    const res = await api("/api/sistema/limpar-dados", {
      method: "POST",
      body: JSON.stringify({ confirmacao }),
    });
    const total = res.removidos.reduce((s, r) => s + r.registros, 0);
    msg.textContent =
      `Base limpa: ${total.toLocaleString("pt-BR")} registros removidos. ` +
      `Banco: ${res.banco_mb_antes} MB → ${res.banco_mb_depois} MB. ` +
      "Preservados: observadores e vínculos manuais.";
    msg.className = "meta-bar ok";
    if ($("#setup-limpar-confirm")) $("#setup-limpar-confirm").value = "";
    await carregarSetupPagina();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "meta-bar err";
  } finally {
    btn.disabled = false;
  }
}

function fecharSetupWizard() {
  const dlg = $("#dialog-setup-wizard");
  if (dlg?.open) dlg.close();
}

async function verificarSetupInicial() {
  const cfg = await carregarSistemaConfig();
  if (cfg && !cfg.setup_concluido) {
    abrirSetupWizard(cfg);
  }
}

function abrirSetupWizard(cfg) {
  const dlg = $("#dialog-setup-wizard");
  const sel = $("#wizard-ano-inicial");
  if (!dlg || !sel) return;

  if (!sel.options.length) {
    const atual = cfg?.ano_atual || new Date().getFullYear();
    for (let y = atual; y >= 2000; y--) {
      const o = document.createElement("option");
      o.value = y;
      o.textContent = y;
      sel.appendChild(o);
    }
  }
  sel.value = String(cfg?.ano_inicial_coleta || cfg?.ano_atual || new Date().getFullYear());
  atualizarWizardPreview();
  dlg.showModal();
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

async function concluirSetupWizard(e) {
  e.preventDefault();
  const ano = parseInt($("#wizard-ano-inicial").value, 10);
  const btn = $("#btn-wizard-concluir");
  btn.disabled = true;
  try {
    sistemaConfig = await api("/api/sistema/config", {
      method: "PUT",
      body: JSON.stringify({ ano_inicial_coleta: ano, setup_concluido: true }),
    });
    aplicarConfigColeta(sistemaConfig);
    fecharSetupWizard();
    if ($("#setup-ano-inicial")) {
      $("#setup-ano-inicial").value = String(ano);
      carregarSetupPagina();
    }
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("#setup-ano-inicial")?.addEventListener("change", atualizarPreviewAnos);
  $("#wizard-ano-inicial")?.addEventListener("change", atualizarWizardPreview);
  $("#form-setup-config")?.addEventListener("submit", salvarSetup);
  $("#form-setup-limpar")?.addEventListener("submit", limparBaseDados);
  $("#form-setup-wizard")?.addEventListener("submit", concluirSetupWizard);

  $$(".nav-btn").forEach((btn) => {
    if (btn.dataset.page === "setup") {
      btn.addEventListener("click", () => carregarSetupPagina());
    }
  });

  verificarSetupInicial();
});
