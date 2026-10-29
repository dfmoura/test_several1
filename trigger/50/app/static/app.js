(() => {
  const $ = (id) => document.getElementById(id);

  const state = {
    me: null,
    orgId: null,
    unidades: [],
    usuarios: [],
    /** @type {{ unidade_id: number, usuario_id: number, username?: string, unidade_nome?: string } | null} */
    vinculoEdit: null,
    /** @type {{ id: number, username: string, papel: string, ativo: boolean } | null} */
    usuarioEdit: null,
  };

  const PAPEIS_UNIDADE_LABEL = {
    admin_matriz: "Admin matriz",
    gestor_matriz: "Gestor matriz",
    gestor_filial: "Gestor filial",
    analista_filial: "Analista filial",
    auditor: "Auditor",
  };

  /** Papéis válidos por tipo de unidade (espelha validação do servidor). */
  const PAPEIS_POR_TIPO_UNIDADE = {
    matriz: ["admin_matriz", "gestor_matriz", "auditor"],
    filial: ["gestor_filial", "analista_filial", "auditor"],
  };

  /** Telas de Análise que só existem em visão de filial (escopo ≠ papel). */
  const NAV_SOMENTE_FILIAL = new Set(["compras", "propostas", "vencedores"]);

  /** Páginas admin-only se /me vier sem mapa completo (fallback seguro). */
  const NAV_ADMIN_FALLBACK = new Set([
    "alertas",
    "coleta",
    "enriquecimento",
    "operacao",
    "organizacao",
    "territorio",
    "configuracao",
    "usuarios",
    "backlog",
  ]);

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts,
    });
    let body = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) body = await res.json();
    return { res, body };
  }

  function setAuthMsg(text, kind = "error") {
    const el = $("auth-msg");
    if (!text) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.className = `alert alert-${kind === "warning" ? "warning" : "error"}`;
    el.textContent = typeof text === "string" ? text : text.detail || "Erro";
  }

  function formatDetail(detail) {
    if (detail == null || detail === "") return null;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => (typeof d === "string" ? d : d.msg || JSON.stringify(d)))
        .join(" · ");
    }
    if (typeof detail === "object" && detail.msg) return detail.msg;
    try {
      return JSON.stringify(detail);
    } catch {
      return "Erro inesperado.";
    }
  }

  function flashUnidade(msg) {
    const text = formatDetail(msg) || String(msg || "");
    const el = $("unidade-flash");
    el.textContent = text;
    el.hidden = false;
    const local = $("unidade-form-msg");
    if (local) {
      local.textContent = text;
      local.hidden = !text;
    }
    window.clearTimeout(flashUnidade._t);
    flashUnidade._t = window.setTimeout(() => {
      el.hidden = true;
    }, 5200);
  }

  function syncMatrizField() {
    const isFilial = $("uni-tipo").value === "filial";
    const wrap = $("wrap-matriz-id");
    const sel = $("uni-matriz-id");
    wrap.hidden = !isFilial;
    sel.required = isFilial;
    if (isFilial && sel.options.length && (sel.selectedIndex < 0 || !sel.value)) {
      sel.selectedIndex = 0;
    }
  }

  function fillMatrizSelect(unidades) {
    const matrizes = (unidades || []).filter((u) => u.tipo === "matriz" && u.ativo);
    const sel = $("uni-matriz-id");
    if (!matrizes.length) {
      sel.innerHTML = `<option value="">Nenhuma matriz cadastrada</option>`;
    } else {
      sel.innerHTML = matrizes
        .map((m) => `<option value="${m.id}">${escapeHtml(m.nome)}${m.codigo ? ` (${escapeHtml(m.codigo)})` : ""}</option>`)
        .join("");
      sel.selectedIndex = 0;
    }
    syncMatrizField();
  }

  async function refreshAcessoRestritoBanner(forcePublic = false) {
    const banner = $("ops-acesso-banner");
    const loginHint = $("auth-acesso-restrito");
    // Consulta não usa a tela Operação — status público basta para o banner.
    const path =
      forcePublic || !state.me || !state.me.permissoes?.admin
        ? "/api/ops/acesso-publico"
        : "/api/ops/acesso";
    const { res, body } = await api(path);
    if (!res.ok) {
      if (banner) banner.hidden = true;
      if (loginHint) loginHint.hidden = true;
      return null;
    }
    if (loginHint) {
      if (body.restrito) {
        loginHint.hidden = false;
        loginHint.textContent = body.mensagem || "Acesso temporariamente restrito.";
      } else {
        loginHint.hidden = true;
        loginHint.textContent = "";
      }
    }
    if (banner) {
      if (body.restrito && state.me?.permissoes?.admin) {
        banner.hidden = false;
        banner.textContent =
          `Acesso restrito ativo — só administradores. ${body.mensagem || ""}`.trim();
      } else {
        banner.hidden = true;
        banner.textContent = "";
      }
    }
    return body;
  }

  function showLogin({ bootstrap }) {
    $("app-shell").hidden = true;
    $("login-page").hidden = false;
    $("auth-login-panel").hidden = bootstrap;
    $("auth-bootstrap-panel").hidden = !bootstrap;
    $("auth-takeover").hidden = true;
    refreshAcessoRestritoBanner(true);
  }

  async function showApp(me) {
    me = (await garantirVisaoMatrizPadrao(me)) || me;
    state.me = me;
    $("login-page").hidden = true;
    $("app-shell").hidden = false;
    $("whoami").textContent = me.username;
    $("whoami-papel").textContent = me.papel === "admin" ? "Administrador geral" : "Consulta";
    $("card-nova-org").hidden = !me.permissoes?.admin;
    $("form-unidade").hidden = !me.permissoes?.admin;
    $("card-vinculos").hidden = !me.permissoes?.admin;
    $("card-novo-usuario").hidden = !me.permissoes?.admin;
    const cardAcesso = $("card-ops-acesso");
    if (cardAcesso) cardAcesso.hidden = !me.permissoes?.admin;
    renderEscopoHeader(me);
    renderResumo(me);
    syncNavMenus(me);
    popularSeletorTerritorio(me);
    popularSeletorConfig(me);
    await refreshAcessoRestritoBanner();
    navigate(resolveViewName(location.hash));
  }

  /** Compras.gov / Propostas abertas / CNPJs vencedores: só visão de filial. */
  function isVisaoFilial(me = state.me) {
    return me?.escopo?.modo === "filial";
  }

  /**
   * Fonte: me.permissoes.paginas (backend). Escopo filial aplica-se depois.
   * Consulta → Análise sem Alertas; admin → menu completo.
   */
  function paginaPermitida(name, me = state.me) {
    if (!me) return false;
    const paginas = me.permissoes?.paginas;
    if (paginas && Object.prototype.hasOwnProperty.call(paginas, name)) {
      return !!paginas[name];
    }
    if (NAV_ADMIN_FALLBACK.has(name)) return !!me.permissoes?.admin;
    return true;
  }

  function syncNavMenus(me = state.me) {
    const filial = isVisaoFilial(me);
    document.querySelectorAll("[data-nav]").forEach((a) => {
      const name = a.dataset.nav;
      let show = paginaPermitida(name, me);
      if (show && NAV_SOMENTE_FILIAL.has(name)) show = filial;
      a.hidden = !show;
    });
    document.querySelectorAll("[data-nav-group]").forEach((g) => {
      const any = [...g.querySelectorAll("[data-nav]")].some((a) => !a.hidden);
      g.hidden = !any;
    });
  }

  /** Compat — preferir syncNavMenus. */
  function syncNavAnaliseFilial(me = state.me) {
    syncNavMenus(me);
  }

  /** Compat — preferir syncNavMenus. */
  function syncNavCompras(me = state.me) {
    syncNavMenus(me);
  }

  /** Matriz preferida no ACL (padrão do filtro de visão — sem «plataforma/visão geral»). */
  function matrizPadraoDoMe(me) {
    const unidades = me?.unidades || [];
    return unidades.find((u) => u.tipo === "matriz") || null;
  }

  /**
   * Sem filtro ativo → aplica a matriz do ACL (consolidado).
   * Remove a necessidade de opção «Plataforma / visão geral / escopo completo».
   */
  let _garantindoVisaoMatriz = false;
  async function garantirVisaoMatrizPadrao(me) {
    if (!me || _garantindoVisaoMatriz) return me;
    const unidades = me.unidades || [];
    if (unidades.length <= 1) return me;
    if (me.filtro_visao?.id || me.unidade_ativa?.id) return me;
    const matriz = matrizPadraoDoMe(me);
    if (!matriz) return me;
    _garantindoVisaoMatriz = true;
    try {
      const { res, body } = await api("/api/auth/filtro-visao", {
        method: "POST",
        body: JSON.stringify({ unidade_id: matriz.id }),
      });
      if (res.ok && body) return body;
    } finally {
      _garantindoVisaoMatriz = false;
    }
    return me;
  }

  function renderEscopoHeader(me) {
    const wrap = $("escopo-header");
    const rotulo = $("escopo-rotulo");
    const filtroWrap = $("filtro-visao-wrap");
    const sel = $("filtro-visao-select");
    if (!wrap || !rotulo) return;

    const escopo = me.escopo;
    const unidades = me.unidades || [];
    wrap.hidden = false;
    rotulo.textContent = escopo?.rotulo
      ? `Escopo: ${escopo.rotulo}`
      : "Escopo: definido pelo login";

    // Filtro: só unidades reais (matriz + filiais). Sem opção vazia / visão geral.
    const precisaFiltro = unidades.length > 1;
    if (!filtroWrap || !sel) return;
    if (!precisaFiltro) {
      filtroWrap.hidden = true;
      sel.innerHTML = "";
      return;
    }
    filtroWrap.hidden = false;
    const matriz = matrizPadraoDoMe(me);
    const filtroId =
      me.filtro_visao?.id || me.unidade_ativa?.id || matriz?.id || unidades[0]?.id || "";
    const opts = unidades.map((u) => {
      const label = `${u.codigo ? u.codigo + " · " : ""}${u.nome} (${u.tipo})`;
      const selected = Number(filtroId) === Number(u.id) ? "selected" : "";
      return `<option value="${u.id}" ${selected}>${escapeHtml(label)}</option>`;
    });
    sel.innerHTML = opts.join("");
  }

  function renderResumo(me) {
    const el = $("resumo-unidade");
    if (!el) return;
    if (me.escopo?.rotulo) {
      el.textContent = me.escopo.rotulo;
      return;
    }
    if (me.filtro_visao || me.unidade_ativa) {
      const u = me.filtro_visao || me.unidade_ativa;
      el.textContent = `${u.organizacao_nome || "Org"} · ${u.tipo} · ${u.nome}`;
      return;
    }
    el.textContent = "Definido pelos vínculos do login.";
  }

  function filiaisDoMe(me) {
    return (me?.unidades || []).filter((u) => u.tipo === "filial");
  }

  function popularSeletorTerritorio(me) {
    const sel = $("territorio-filial-select");
    if (!sel) return;
    const filiais = filiaisDoMe(me);
    const prev = sel.value;
    sel.innerHTML = filiais
      .map((u) => {
        const label = `${u.codigo ? u.codigo + " · " : ""}${u.nome}`;
        return `<option value="${u.id}">${escapeHtml(label)}</option>`;
      })
      .join("");
    if (prev && [...sel.options].some((o) => o.value === prev)) {
      sel.value = prev;
    } else if (filiais.length === 1) {
      sel.value = String(filiais[0].id);
    }
  }

  function popularSeletorConfig(me) {
    const sel = $("config-unidade-select");
    if (!sel) return;
    const unidades = me?.unidades || [];
    const prev = sel.value;
    const opts = [`<option value="">Plataforma (global)</option>`].concat(
      unidades.map((u) => {
        const label = `${u.codigo ? u.codigo + " · " : ""}${u.nome} (${u.tipo})`;
        return `<option value="${u.id}">${escapeHtml(label)}</option>`;
      }),
    );
    sel.innerHTML = opts.join("");
    if (prev && [...sel.options].some((o) => o.value === prev)) {
      sel.value = prev;
    }
  }

  function unidadeConfigSelecionada() {
    const sel = $("config-unidade-select");
    const id = Number(sel?.value || 0);
    if (!id) return null;
    return (state.me?.unidades || []).find((u) => u.id === id) || null;
  }

  /** Hash canônico da home analítica. `#indicadores` é alias legado. */
  function resolveViewName(raw) {
    let name = String(raw || "inicio").replace(/^#/, "").trim() || "inicio";
    if (name === "indicadores") {
      if (location.hash !== "#inicio") {
        history.replaceState(null, "", "#inicio");
      }
      name = "inicio";
    }
    return name;
  }

  function navigate(name) {
    name = resolveViewName(name);
    const papelOk = paginaPermitida(name);
    const filialOk = !NAV_SOMENTE_FILIAL.has(name) || isVisaoFilial();
    if (!papelOk || !filialOk) {
      if (!papelOk) {
        flashUnidade("Esta tela está disponível apenas para administradores.");
      } else {
        flashUnidade(
          name === "vencedores"
            ? "CNPJs vencedores está disponível apenas na visão de filial."
            : name === "propostas"
              ? "Propostas abertas está disponível apenas na visão de filial."
              : "Compras.gov está disponível apenas na visão de filial.",
        );
      }
      name = "inicio";
      if (location.hash !== "#inicio") {
        history.replaceState(null, "", "#inicio");
      }
    }
    document.querySelectorAll(".view").forEach((v) => {
      v.hidden = true;
    });
    document.querySelectorAll("[data-nav]").forEach((a) => {
      a.classList.toggle("active", a.dataset.nav === name);
    });
    const view = $(`view-${name}`);
    if (view) view.hidden = false;
    if (name === "inicio") loadIndicadores();
    if (name === "alertas") loadAlertas();
    if (name === "compras") loadCompras();
    if (name === "propostas") loadPropostas();
    if (name === "vencedores") loadVencedores();
    if (name === "coleta") loadColeta();
    if (name === "enriquecimento") loadEnriquecimento();
    if (name === "operacao") loadOperacao();
    if (name === "organizacao") loadOrganizacao();
    if (name === "territorio") loadTerritorio();
    if (name === "configuracao") loadConfiguracao();
    if (name === "usuarios") loadUsuarios();
    if (name === "backlog") loadBacklog();
  }

  async function refreshMe() {
    const st = await api("/api/auth/bootstrap-status");
    if (!st.res.ok) {
      setAuthMsg("Não foi possível verificar autenticação.");
      showLogin({ bootstrap: false });
      return;
    }
    if (st.body.precisa_bootstrap) {
      showLogin({ bootstrap: true });
      return;
    }
    const me = await api("/api/auth/me");
    if (me.res.ok) {
      await showApp(me.body);
      return;
    }
    showLogin({ bootstrap: false });
  }

  async function doLogin({ takeover }) {
    setAuthMsg("");
    $("auth-takeover").hidden = true;
    const username = $("auth-login-user").value.trim();
    const password = $("auth-login-pass").value;
    const { res, body } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        encerrar_sessao_anterior: !!takeover,
      }),
    });
    if (res.status === 409) {
      setAuthMsg(body?.detail || "Sessão já ativa.", "warning");
      $("auth-takeover").hidden = false;
      return;
    }
    if (!res.ok) {
      setAuthMsg(body?.detail || "Falha no login.");
      return;
    }
    await showApp(body);
  }

  $("form-auth-login").addEventListener("submit", (ev) => {
    ev.preventDefault();
    doLogin({ takeover: false });
  });
  $("btn-auth-takeover").addEventListener("click", () => doLogin({ takeover: true }));

  $("form-auth-bootstrap").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    setAuthMsg("");
    const username = $("auth-boot-user").value.trim();
    const password = $("auth-boot-pass").value;
    if (password !== $("auth-boot-pass2").value) {
      setAuthMsg("As senhas não coincidem.");
      return;
    }
    const { res, body } = await api("/api/auth/bootstrap", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      setAuthMsg(body?.detail || "Falha no bootstrap.");
      return;
    }
    await showApp(body);
  });

  $("btn-logout").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    setAuthMsg("");
    showLogin({ bootstrap: false });
  });

  async function aplicarFiltroVisaoPorId(unidadeId) {
    const unidade_id = Number(unidadeId);
    if (!Number.isFinite(unidade_id)) return false;
    const sel = $("filtro-visao-select");
    if (sel) sel.value = String(unidade_id);
    const { res, body } = await api("/api/auth/filtro-visao", {
      method: "POST",
      body: JSON.stringify({ unidade_id }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Não foi possível aplicar o filtro de visão.");
      return false;
    }
    state.me = body;
    renderEscopoHeader(body);
    renderResumo(body);
    syncNavAnaliseFilial(body);
    // Facetas UASG/modalidade são da filial filtrada — invalida cache ao trocar a visão.
    comprasFiltrosCarregados = false;
    vencedoresFiltrosCarregados = false;
    propFiltrosCarregados = false;
    propFiltrosFilialId = null;
    flashUnidade(
      body.escopo?.rotulo
        ? `Visão: ${body.escopo.rotulo}`
        : "Filtro de visão atualizado",
    );
    let view = resolveViewName(location.hash);
    if (
      (view === "compras" || view === "propostas" || view === "vencedores") &&
      !isVisaoFilial(body)
    ) {
      navigate("inicio");
      return true;
    }
    if (view === "territorio") await loadTerritorio();
    if (view === "configuracao") await loadConfiguracao();
    if (view === "inicio") await loadIndicadores();
    if (view === "compras") await loadCompras();
    if (view === "propostas") await loadPropostas();
    if (view === "vencedores") await loadVencedores();
    if (view === "alertas") await loadAlertas();
    return true;
  }

  $("filtro-visao-select")?.addEventListener("change", async (ev) => {
    const raw = ev.target.value;
    if (!raw) {
      // Sem opção vazia: volta para a matriz padrão (nunca «visão geral»).
      const matriz = matrizPadraoDoMe(state.me);
      if (!matriz) return;
      ev.target.value = String(matriz.id);
    }
    await aplicarFiltroVisaoPorId(ev.target.value);
  });

  $("territorio-filial-select")?.addEventListener("change", () => loadTerritorio());
  $("config-unidade-select")?.addEventListener("change", () => loadConfiguracao());

  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      const name = resolveViewName(a.dataset.nav);
      location.hash = name;
      navigate(name);
    });
  });

  window.addEventListener("hashchange", () => {
    navigate(resolveViewName(location.hash));
  });

  // —— Organização ——
  async function loadOrganizacao() {
    const { res, body } = await api("/api/org/organizacoes");
    if (!res.ok) return;
    const tbody = $("tbody-orgs");
    const canEdit = !!state.me?.permissoes?.admin;
    tbody.innerHTML = body
      .map(
        (o) => `<tr>
        <td>${escapeHtml(o.nome)}</td>
        <td>${escapeHtml(o.codigo || "—")}</td>
        <td>${o.ativo ? "Ativa" : "Inativa"}</td>
        <td class="td-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-open-org="${o.id}">Abrir</button>
          ${
            canEdit
              ? `<button type="button" class="btn btn-secondary btn-sm" data-edit-org-nome="${o.id}" data-nome-atual="${escapeHtml(o.nome)}">Alterar nome</button>
                 <button type="button" class="btn btn-secondary btn-sm" data-edit-org-codigo="${o.id}" data-codigo-atual="${escapeHtml(o.codigo || "")}">Alterar código</button>
                 <button type="button" class="btn btn-danger btn-sm" data-excluir-org="${o.id}" data-org-nome="${escapeHtml(o.nome)}" data-org-codigo="${escapeHtml(o.codigo || "")}">Excluir</button>`
              : ""
          }
        </td>
      </tr>`,
      )
      .join("") || `<tr><td colspan="4" class="muted">Nenhuma organização ainda.</td></tr>`;

    tbody.querySelectorAll("[data-open-org]").forEach((btn) => {
      btn.addEventListener("click", () => openOrg(Number(btn.dataset.openOrg)));
    });
    tbody.querySelectorAll("[data-edit-org-nome]").forEach((btn) => {
      btn.addEventListener("click", () => editarNomeOrganizacao(btn));
    });
    tbody.querySelectorAll("[data-edit-org-codigo]").forEach((btn) => {
      btn.addEventListener("click", () => editarCodigoOrganizacao(btn));
    });
    tbody.querySelectorAll("[data-excluir-org]").forEach((btn) => {
      btn.addEventListener("click", () => excluirOrganizacao(btn));
    });

    if (state.orgId) openOrg(state.orgId);
    else if (body.length === 1) openOrg(body[0].id);
  }

  async function openOrg(orgId) {
    state.orgId = orgId;
    $("card-unidades").hidden = false;
    const org = (await api(`/api/org/organizacoes/${orgId}`)).body;
    $("titulo-unidades").textContent = `Unidades · ${org?.nome || orgId}`;
    $("desc-unidades").textContent = "Matriz e filiais desta organização.";

    const { res, body } = await api(`/api/org/organizacoes/${orgId}/unidades`);
    if (!res.ok) return;
    state.unidades = body;
    const canEdit = !!state.me?.permissoes?.admin;
    $("tbody-unidades").innerHTML =
      body
        .map(
          (u) => `<tr>
          <td><span class="badge badge-${u.tipo}">${u.tipo}</span></td>
          <td>${escapeHtml(u.nome)}</td>
          <td>${escapeHtml(u.codigo || "—")}</td>
          <td>${escapeHtml(formatCnpjDisplay(u.cnpj) || "—")}</td>
          <td>${u.ativo ? "Ativa" : "Inativa"}</td>
          <td class="td-actions">${
            canEdit
              ? `<button type="button" class="btn btn-secondary btn-sm" data-edit-uni-nome="${u.id}" data-nome-atual="${escapeHtml(u.nome)}">Alterar nome</button>
                 <button type="button" class="btn btn-secondary btn-sm" data-edit-uni-codigo="${u.id}" data-codigo-atual="${escapeHtml(u.codigo || "")}">Alterar código</button>
                 <button type="button" class="btn btn-secondary btn-sm" data-edit-cnpj="${u.id}" data-cnpj-atual="${escapeHtml(u.cnpj || "")}">${u.cnpj ? "Alterar CNPJ" : "Informar CNPJ"}</button>
                 <button type="button" class="btn btn-danger btn-sm" data-excluir-uni="${u.id}" data-uni-nome="${escapeHtml(u.nome)}" data-uni-codigo="${escapeHtml(u.codigo || "")}" data-uni-tipo="${escapeHtml(u.tipo)}">Excluir</button>`
              : ""
          }</td>
        </tr>`,
        )
        .join("") || `<tr><td colspan="6" class="muted">Nenhuma unidade.</td></tr>`;

    $("tbody-unidades").querySelectorAll("[data-edit-uni-nome]").forEach((btn) => {
      btn.addEventListener("click", () => editarNomeUnidade(btn));
    });
    $("tbody-unidades").querySelectorAll("[data-edit-uni-codigo]").forEach((btn) => {
      btn.addEventListener("click", () => editarCodigoUnidade(btn));
    });
    $("tbody-unidades").querySelectorAll("[data-edit-cnpj]").forEach((btn) => {
      btn.addEventListener("click", () => editarCnpjUnidade(btn));
    });
    $("tbody-unidades").querySelectorAll("[data-excluir-uni]").forEach((btn) => {
      btn.addEventListener("click", () => excluirUnidade(btn));
    });

    fillMatrizSelect(body);

    if (state.me?.permissoes?.admin) {
      $("card-vinculos").hidden = false;
      await loadVinculosUi();
    }
  }

  $("uni-tipo").addEventListener("change", syncMatrizField);

  $("form-org").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const { res, body } = await api("/api/org/organizacoes", {
      method: "POST",
      body: JSON.stringify({
        nome: $("org-nome").value.trim(),
        codigo: $("org-codigo").value.trim() || null,
      }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao criar organização.");
      return;
    }
    $("form-org").reset();
    await loadOrganizacao();
    openOrg(body.id);
  });

  $("form-unidade").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!state.orgId) {
      flashUnidade("Abra uma organização na lista antes de adicionar unidades.");
      return;
    }
    const tipo = $("uni-tipo").value;
    const matrizRaw = $("uni-matriz-id").value;
    const matrizId = matrizRaw ? Number(matrizRaw) : null;
    if (tipo === "filial" && (matrizId == null || Number.isNaN(matrizId))) {
      const temMatriz = (state.unidades || []).some((u) => u.tipo === "matriz" && u.ativo);
      flashUnidade(
        temMatriz
          ? "Selecione a matriz da filial."
          : "Cadastre a matriz desta organização antes de criar uma filial.",
      );
      syncMatrizField();
      return;
    }
    const cnpjDigits = onlyDigits($("uni-cnpj").value);
    if (cnpjDigits && cnpjDigits.length !== 14) {
      flashUnidade("CNPJ deve ter 14 dígitos.");
      $("uni-cnpj").focus();
      return;
    }
    const payload = {
      tipo,
      nome: $("uni-nome").value.trim(),
      codigo: $("uni-codigo").value.trim() || null,
      cnpj: cnpjDigits || null,
      matriz_id: tipo === "filial" ? matrizId : null,
    };
    const { res, body } = await api(`/api/org/organizacoes/${state.orgId}/unidades`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao criar unidade.");
      return;
    }
    $("form-unidade").reset();
    fillMatrizSelect(state.unidades);
    syncMatrizField();
    const local = $("unidade-form-msg");
    if (local) {
      local.hidden = true;
      local.textContent = "";
    }
    await syncMeEscopoUi();
    flashUnidade(`Unidade «${payload.nome}» criada.`);
    await openOrg(state.orgId);
  });

  function labelPapelUnidade(papel) {
    return PAPEIS_UNIDADE_LABEL[papel] || papel;
  }

  function tipoUnidadePorId(unidadeId) {
    const u = (state.unidades || []).find((x) => x.id === Number(unidadeId));
    return u?.tipo || null;
  }

  function papeisParaTipo(tipo) {
    if (tipo === "matriz" || tipo === "filial") return PAPEIS_POR_TIPO_UNIDADE[tipo];
    return Object.keys(PAPEIS_UNIDADE_LABEL);
  }

  /** Atualiza o select de papéis conforme a unidade (matriz ≠ filial). */
  function syncPapeisVinculo(preferido) {
    const sel = $("vinc-papel");
    if (!sel) return;
    const tipo = tipoUnidadePorId($("vinc-unidade")?.value);
    const papeis = papeisParaTipo(tipo);
    const atual = preferido || sel.value;
    sel.innerHTML = papeis
      .map(
        (p) =>
          `<option value="${p}">${escapeHtml(PAPEIS_UNIDADE_LABEL[p] || p)}</option>`,
      )
      .join("");
    if (atual && papeis.includes(atual)) sel.value = atual;
    else if (papeis.length) {
      sel.value = tipo === "matriz" ? "gestor_matriz" : "analista_filial";
      if (!papeis.includes(sel.value)) sel.value = papeis[0];
    }
  }

  function resetVinculoForm() {
    state.vinculoEdit = null;
    $("titulo-vinculo").textContent = "Vincular usuário à unidade";
    $("desc-vinculo").textContent =
      "Define o acesso operacional do usuário na unidade (papel no escopo).";
    $("btn-vinculo-submit").textContent = "Vincular";
    $("btn-vinculo-cancelar").hidden = true;
    $("vinc-unidade").disabled = false;
    $("vinc-usuario").disabled = false;
    syncPapeisVinculo();
  }

  function entrarEdicaoVinculo(v) {
    state.vinculoEdit = {
      unidade_id: v.unidade_id,
      usuario_id: v.usuario_id,
      username: v.username || String(v.usuario_id),
      unidade_nome: v.unidade_nome || String(v.unidade_id),
    };
    $("titulo-vinculo").textContent = "Editar vínculo";
    $("desc-vinculo").textContent =
      "Altere o papel do usuário nesta unidade. Unidade e usuário não mudam — para outro escopo, exclua e vincule de novo.";
    $("vinc-unidade").value = String(v.unidade_id);
    $("vinc-usuario").value = String(v.usuario_id);
    syncPapeisVinculo(v.papel);
    $("vinc-unidade").disabled = true;
    $("vinc-usuario").disabled = true;
    $("btn-vinculo-submit").textContent = "Salvar alterações";
    $("btn-vinculo-cancelar").hidden = false;
    $("form-vinculo").scrollIntoView({ behavior: "smooth", block: "nearest" });
    $("vinc-papel").focus();
  }

  /** Recarrega /me, garante matriz padrão e atualiza header/resumo/nav. */
  async function syncMeEscopoUi() {
    const me = await api("/api/auth/me");
    if (!me.res.ok) return null;
    const body = (await garantirVisaoMatrizPadrao(me.body)) || me.body;
    state.me = body;
    renderEscopoHeader(body);
    renderResumo(body);
    syncNavCompras(body);
    popularSeletorTerritorio(body);
    popularSeletorConfig(body);
    return body;
  }

  async function refreshEscopoAposVinculo() {
    await syncMeEscopoUi();
  }

  async function loadVinculosUi() {
    const editSnapshot = state.vinculoEdit;
    const unidades = state.unidades || [];
    $("vinc-unidade").innerHTML = unidades
      .map((u) => `<option value="${u.id}">${escapeHtml(u.nome)} (${u.tipo})</option>`)
      .join("");

    const users = await api("/api/auth/usuarios");
    if (users.res.ok) {
      state.usuarios = users.body;
      // Novo vínculo: só contas ativas. Em edição, inclui o usuário atual mesmo se inativo.
      const editUid = editSnapshot?.usuario_id;
      const paraSelect = users.body.filter((u) => u.ativo || u.id === editUid);
      $("vinc-usuario").innerHTML = paraSelect
        .map((u) => {
          const st = u.ativo ? "" : " · inativo";
          return `<option value="${u.id}">${escapeHtml(u.username)} · ${u.papel}${st}</option>`;
        })
        .join("");
    }
    if (!editSnapshot) syncPapeisVinculo();

    const rows = [];
    for (const u of unidades) {
      const r = await api(`/api/org/unidades/${u.id}/usuarios`);
      if (r.res.ok) {
        for (const v of r.body) {
          rows.push({ ...v, unidade_nome: u.nome });
        }
      }
    }
    $("tbody-vinculos").innerHTML =
      rows
        .map(
          (v) => `<tr>
          <td>${escapeHtml(v.unidade_nome)}</td>
          <td>${escapeHtml(v.username || String(v.usuario_id))}</td>
          <td>${escapeHtml(labelPapelUnidade(v.papel))}</td>
          <td>${v.ativo ? "Sim" : "Não"}</td>
          <td class="td-actions">
            <button type="button" class="btn btn-secondary btn-sm" data-edit-vinculo="${v.unidade_id}" data-usuario-id="${v.usuario_id}" data-papel="${escapeHtml(v.papel)}" data-username="${escapeHtml(v.username || "")}" data-unidade-nome="${escapeHtml(v.unidade_nome)}">Editar</button>
            ${
              v.ativo
                ? ""
                : `<button type="button" class="btn btn-secondary btn-sm" data-reativar-vinculo="${v.unidade_id}" data-usuario-id="${v.usuario_id}">Reativar</button>`
            }
            <button type="button" class="btn btn-danger btn-sm" data-excluir-vinculo="${v.unidade_id}" data-usuario-id="${v.usuario_id}" data-username="${escapeHtml(v.username || String(v.usuario_id))}" data-unidade-nome="${escapeHtml(v.unidade_nome)}">Excluir</button>
          </td>
        </tr>`,
        )
        .join("") || `<tr><td colspan="5" class="muted">Nenhum vínculo.</td></tr>`;

    $("tbody-vinculos").querySelectorAll("[data-edit-vinculo]").forEach((btn) => {
      btn.addEventListener("click", () => {
        entrarEdicaoVinculo({
          unidade_id: Number(btn.dataset.editVinculo),
          usuario_id: Number(btn.dataset.usuarioId),
          papel: btn.dataset.papel,
          username: btn.dataset.username,
          unidade_nome: btn.dataset.unidadeNome,
        });
      });
    });
    $("tbody-vinculos").querySelectorAll("[data-reativar-vinculo]").forEach((btn) => {
      btn.addEventListener("click", () => reativarVinculo(btn));
    });
    $("tbody-vinculos").querySelectorAll("[data-excluir-vinculo]").forEach((btn) => {
      btn.addEventListener("click", () => excluirVinculo(btn));
    });

    if (editSnapshot) {
      const aindaExiste = rows.some(
        (v) =>
          v.unidade_id === editSnapshot.unidade_id &&
          v.usuario_id === editSnapshot.usuario_id,
      );
      if (aindaExiste) {
        const atual = rows.find(
          (v) =>
            v.unidade_id === editSnapshot.unidade_id &&
            v.usuario_id === editSnapshot.usuario_id,
        );
        entrarEdicaoVinculo(atual);
      } else {
        resetVinculoForm();
      }
    }
  }

  async function reativarVinculo(btn) {
    const unidade_id = Number(btn.dataset.reativarVinculo);
    const usuario_id = Number(btn.dataset.usuarioId);
    const { res, body } = await api(`/api/org/unidades/${unidade_id}/usuarios/${usuario_id}`, {
      method: "PATCH",
      body: JSON.stringify({ ativo: true }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao reativar vínculo.");
      return;
    }
    flashUnidade("Vínculo reativado.");
    await refreshEscopoAposVinculo();
    await loadVinculosUi();
  }

  async function excluirVinculo(btn) {
    const unidade_id = Number(btn.dataset.excluirVinculo);
    const usuario_id = Number(btn.dataset.usuarioId);
    const username = btn.dataset.username || String(usuario_id);
    const unidadeNome = btn.dataset.unidadeNome || String(unidade_id);
    const ok = window.confirm(
      [
        `Excluir o vínculo de «${username}» com «${unidadeNome}»?`,
        "",
        "O usuário perde o acesso a esta unidade.",
        "É possível vincular novamente depois.",
      ].join("\n"),
    );
    if (!ok) return;

    const { res, body } = await api(
      `/api/org/unidades/${unidade_id}/usuarios/${usuario_id}?permanente=true`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao excluir vínculo.");
      return;
    }
    if (
      state.vinculoEdit &&
      state.vinculoEdit.unidade_id === unidade_id &&
      state.vinculoEdit.usuario_id === usuario_id
    ) {
      resetVinculoForm();
    }
    flashUnidade(`Vínculo de «${username}» removido.`);
    await refreshEscopoAposVinculo();
    await loadVinculosUi();
  }

  $("btn-vinculo-cancelar").addEventListener("click", () => {
    resetVinculoForm();
  });

  $("vinc-unidade").addEventListener("change", () => {
    if (state.vinculoEdit) return; // unidade travada na edição
    syncPapeisVinculo();
  });

  $("form-vinculo").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const edit = state.vinculoEdit;
    const papel = $("vinc-papel").value;

    if (edit) {
      const { res, body } = await api(
        `/api/org/unidades/${edit.unidade_id}/usuarios/${edit.usuario_id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ papel, ativo: true }),
        },
      );
      if (!res.ok) {
        flashUnidade(body?.detail || "Falha ao atualizar vínculo.");
        return;
      }
      flashUnidade(
        `Vínculo de «${edit.username || edit.usuario_id}» atualizado (${labelPapelUnidade(papel)}).`,
      );
      resetVinculoForm();
      await refreshEscopoAposVinculo();
      await loadVinculosUi();
      return;
    }

    const unidade_id = Number($("vinc-unidade").value);
    const { res, body } = await api(`/api/org/unidades/${unidade_id}/usuarios`, {
      method: "POST",
      body: JSON.stringify({
        usuario_id: Number($("vinc-usuario").value),
        papel,
      }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao vincular.");
      return;
    }
    flashUnidade("Usuário vinculado à unidade.");
    await refreshEscopoAposVinculo();
    await loadVinculosUi();
  });

  function labelPapelPlataforma(papel) {
    if (papel === "admin") return "Admin geral";
    if (papel === "consulta") return "Consulta";
    return papel;
  }

  function resetUsuarioForm() {
    state.usuarioEdit = null;
    $("titulo-usuario").textContent = "Novo usuário";
    $("desc-usuario").textContent =
      "Conta de login. O acesso operacional às unidades é definido em Organização → vínculos.";
    $("btn-usuario-submit").textContent = "Criar";
    $("btn-usuario-cancelar").hidden = true;
    $("usr-username").disabled = false;
    $("usr-username").readOnly = false;
    $("usr-password").required = true;
    $("usr-password").value = "";
    $("usr-password").placeholder = "";
    $("label-usr-password").textContent = "Senha";
    $("form-usuario").reset();
    $("usr-papel").value = "consulta";
  }

  function entrarEdicaoUsuario(u) {
    state.usuarioEdit = {
      id: u.id,
      username: u.username,
      papel: u.papel,
      ativo: !!u.ativo,
    };
    $("titulo-usuario").textContent = "Editar usuário";
    $("desc-usuario").textContent =
      "Altere papel ou senha. O nome de usuário não muda. Desativar a conta encerra a sessão ativa.";
    $("usr-username").value = u.username;
    $("usr-username").disabled = true;
    $("usr-papel").value = u.papel === "admin" ? "admin" : "consulta";
    $("usr-password").required = false;
    $("usr-password").value = "";
    $("usr-password").placeholder = "Deixe em branco para manter";
    $("label-usr-password").textContent = "Nova senha (opcional)";
    $("btn-usuario-submit").textContent = "Salvar alterações";
    $("btn-usuario-cancelar").hidden = false;
    $("form-usuario").scrollIntoView({ behavior: "smooth", block: "nearest" });
    $("usr-papel").focus();
  }

  async function loadUsuarios() {
    if (!state.me?.permissoes?.admin) return;
    const editSnapshot = state.usuarioEdit;
    const { res, body } = await api("/api/auth/usuarios");
    if (!res.ok) return;
    const meId = state.me?.id;
    $("tbody-usuarios").innerHTML =
      body
        .map((u) => {
          const isSelf = meId != null && u.id === meId;
          const acoes = [
            `<button type="button" class="btn btn-secondary btn-sm" data-edit-usr="${u.id}" data-username="${escapeHtml(u.username)}" data-papel="${escapeHtml(u.papel)}" data-ativo="${u.ativo ? "1" : "0"}">Editar</button>`,
            u.ativo
              ? `<button type="button" class="btn btn-danger btn-sm" data-desativar-usr="${u.id}" data-username="${escapeHtml(u.username)}"${isSelf ? " disabled title=\"Não desative a própria sessão por aqui\"" : ""}>Desativar</button>`
              : `<button type="button" class="btn btn-secondary btn-sm" data-ativar-usr="${u.id}" data-username="${escapeHtml(u.username)}">Ativar</button>`,
          ];
          if (u.sessao_ativa) {
            acoes.push(
              `<button type="button" class="btn btn-secondary btn-sm" data-liberar-sessao="${u.id}" data-username="${escapeHtml(u.username)}">Liberar sessão</button>`,
            );
          }
          return `<tr>
        <td>${escapeHtml(u.username)}${isSelf ? ' <span class="muted small">(você)</span>' : ""}</td>
        <td>${escapeHtml(labelPapelPlataforma(u.papel))}</td>
        <td>${u.ativo ? "Sim" : "Não"}</td>
        <td>${u.sessao_ativa ? "Ativa" : "—"}</td>
        <td class="td-actions">${acoes.join("")}</td>
      </tr>`;
        })
        .join("") || `<tr><td colspan="5" class="muted">Nenhum usuário.</td></tr>`;

    $("tbody-usuarios").querySelectorAll("[data-edit-usr]").forEach((btn) => {
      btn.addEventListener("click", () => {
        entrarEdicaoUsuario({
          id: Number(btn.dataset.editUsr),
          username: btn.dataset.username,
          papel: btn.dataset.papel,
          ativo: btn.dataset.ativo === "1",
        });
      });
    });
    $("tbody-usuarios").querySelectorAll("[data-desativar-usr]").forEach((btn) => {
      btn.addEventListener("click", () => desativarUsuario(btn));
    });
    $("tbody-usuarios").querySelectorAll("[data-ativar-usr]").forEach((btn) => {
      btn.addEventListener("click", () => ativarUsuario(btn));
    });
    $("tbody-usuarios").querySelectorAll("[data-liberar-sessao]").forEach((btn) => {
      btn.addEventListener("click", () => liberarSessaoUsuario(btn));
    });

    if (editSnapshot) {
      const ainda = body.find((u) => u.id === editSnapshot.id);
      if (ainda) entrarEdicaoUsuario(ainda);
      else resetUsuarioForm();
    }
  }

  async function desativarUsuario(btn) {
    const id = Number(btn.dataset.desativarUsr);
    const username = btn.dataset.username || String(id);
    if (state.me?.id === id) {
      flashUnidade("Não é possível desativar a própria conta enquanto estiver logado.");
      return;
    }
    const ok = window.confirm(
      [
        `Desativar a conta «${username}»?`,
        "",
        "O usuário não poderá entrar. Sessões ativas serão encerradas.",
        "É possível reativar depois. Vínculos com unidades são preservados.",
      ].join("\n"),
    );
    if (!ok) return;
    const { res, body } = await api(`/api/auth/usuarios/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ ativo: false }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao desativar usuário.");
      return;
    }
    if (state.usuarioEdit?.id === id) resetUsuarioForm();
    flashUnidade(`Conta «${username}» desativada.`);
    await loadUsuarios();
  }

  async function ativarUsuario(btn) {
    const id = Number(btn.dataset.ativarUsr);
    const username = btn.dataset.username || String(id);
    const { res, body } = await api(`/api/auth/usuarios/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ ativo: true }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao ativar usuário.");
      return;
    }
    flashUnidade(`Conta «${username}» ativada.`);
    await loadUsuarios();
  }

  async function liberarSessaoUsuario(btn) {
    const id = Number(btn.dataset.liberarSessao);
    const username = btn.dataset.username || String(id);
    const ok = window.confirm(
      `Encerrar a sessão ativa de «${username}»? O usuário precisará entrar de novo.`,
    );
    if (!ok) return;
    const { res, body } = await api(`/api/auth/usuarios/${id}/liberar-sessao`, {
      method: "POST",
      body: "{}",
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao liberar sessão.");
      return;
    }
    const n = body?.sessoes_encerradas ?? 0;
    flashUnidade(
      n
        ? `Sessão de «${username}» encerrada (${n}).`
        : `Nenhuma sessão ativa para «${username}».`,
    );
    if (state.me?.id === id) {
      location.reload();
      return;
    }
    await loadUsuarios();
  }

  $("btn-usuario-cancelar").addEventListener("click", () => {
    resetUsuarioForm();
  });

  $("form-usuario").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const edit = state.usuarioEdit;
    const papel = $("usr-papel").value;
    const password = $("usr-password").value;

    if (edit) {
      const payload = { papel };
      if (password) payload.password = password;
      const { res, body } = await api(`/api/auth/usuarios/${edit.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        flashUnidade(body?.detail || "Falha ao atualizar usuário.");
        return;
      }
      flashUnidade(
        `Usuário «${edit.username}» atualizado (${labelPapelPlataforma(papel)}${
          password ? " · senha redefinida" : ""
        }).`,
      );
      resetUsuarioForm();
      await loadUsuarios();
      return;
    }

    const { res, body } = await api("/api/auth/usuarios", {
      method: "POST",
      body: JSON.stringify({
        username: $("usr-username").value.trim(),
        password,
        papel,
      }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao criar usuário.");
      return;
    }
    flashUnidade(`Usuário «${body.username || $("usr-username").value.trim()}» criado.`);
    resetUsuarioForm();
    await loadUsuarios();
  });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function onlyDigits(s) {
    return String(s || "").replace(/\D/g, "");
  }

  function formatCnpjDisplay(cnpj) {
    const d = onlyDigits(cnpj);
    if (d.length !== 14) return d || "";
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }

  function formatCnpjInput(el) {
    const d = onlyDigits(el.value).slice(0, 14);
    if (d.length <= 2) el.value = d;
    else if (d.length <= 5) el.value = `${d.slice(0, 2)}.${d.slice(2)}`;
    else if (d.length <= 8) el.value = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    else if (d.length <= 12)
      el.value = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    else
      el.value = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }

  $("uni-cnpj")?.addEventListener("input", () => formatCnpjInput($("uni-cnpj")));

  function normalizarCodigoDigitado(raw) {
    return String(raw || "")
      .trim()
      .toUpperCase();
  }

  async function editarNomeOrganizacao(btn) {
    const id = Number(btn.dataset.editOrgNome);
    const atual = btn.dataset.nomeAtual || "";
    const digitado = window.prompt("Nome da organização:", atual);
    if (digitado == null) return;
    const nome = digitado.trim();
    if (nome.length < 2) {
      flashUnidade("Nome deve ter pelo menos 2 caracteres.");
      return;
    }
    const { res, body } = await api(`/api/org/organizacoes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ nome }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao atualizar nome da organização.");
      return;
    }
    flashUnidade(`Organização renomeada: «${nome}».`);
    await loadOrganizacao();
  }

  async function editarCodigoOrganizacao(btn) {
    const id = Number(btn.dataset.editOrgCodigo);
    const atual = btn.dataset.codigoAtual || "";
    const digitado = window.prompt(
      "Código da organização (mnemônico, ex.: OSB; vazio remove):",
      atual,
    );
    if (digitado == null) return;
    const codigo = normalizarCodigoDigitado(digitado);
    if (codigo && /^\d+$/.test(codigo)) {
      flashUnidade("Código deve ser mnemônico (ex.: OSB), não apenas dígitos.");
      return;
    }
    const { res, body } = await api(`/api/org/organizacoes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ codigo: codigo || "" }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao atualizar código da organização.");
      return;
    }
    flashUnidade(codigo ? `Código da organização: ${codigo}` : "Código da organização removido.");
    await loadOrganizacao();
  }

  async function excluirOrganizacao(btn) {
    const id = Number(btn.dataset.excluirOrg);
    const nome = btn.dataset.orgNome || "";
    const { res, body } = await api(`/api/org/organizacoes/${id}/impacto-exclusao`);
    if (!res.ok) {
      flashUnidade(body?.detail || "Não foi possível avaliar o impacto da exclusão.");
      return;
    }
    const t = body.totais || {};
    const token = body.confirmacao_requerida || btn.dataset.orgCodigo || nome;
    const resumo = [
      `Excluir definitivamente «${nome}»?`,
      "",
      `Serão removidos: ${t.unidades || 0} unidade(s)`,
      `(${t.matrizes || 0} matriz · ${t.filiais || 0} filial),`,
      `${t.vinculos_usuario || 0} vínculo(s),`,
      `${t.filial_municipio || 0} município(s) de monitoramento,`,
      `${t.filial_uasg || 0} UASG(s) de monitoramento,`,
      `${t.configuracoes_coleta || 0} configuração(ões) de coleta.`,
      "",
      body.preserva || "",
      "",
      "Esta ação não pode ser desfeita pelo sistema.",
    ].join("\n");
    if (!window.confirm(resumo)) return;
    const digitado = window.prompt(
      `Para confirmar, digite exatamente o código da organização:\n${token}`,
      "",
    );
    if (digitado == null) return;
    const { res: r2, body: b2 } = await api(`/api/org/organizacoes/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ confirmacao: digitado.trim() }),
    });
    if (!r2.ok) {
      flashUnidade(b2?.detail || "Falha ao excluir organização.");
      return;
    }
    if (state.orgId === id) {
      state.orgId = null;
      $("card-unidades").hidden = true;
      $("card-vinculos").hidden = true;
    }
    await syncMeEscopoUi();
    flashUnidade(`Organização «${b2?.excluida?.nome || nome}» excluída.`);
    await loadOrganizacao();
  }

  async function excluirUnidade(btn) {
    const id = Number(btn.dataset.excluirUni);
    const nome = btn.dataset.uniNome || "";
    const tipo = btn.dataset.uniTipo || "unidade";
    const { res, body } = await api(`/api/org/unidades/${id}/impacto-exclusao`);
    if (!res.ok) {
      flashUnidade(body?.detail || "Não foi possível avaliar o impacto da exclusão.");
      return;
    }
    if (body.pode_excluir === false) {
      flashUnidade(body.bloqueio || "Esta unidade não pode ser excluída agora.");
      return;
    }
    const t = body.totais || {};
    const token = body.confirmacao_requerida || btn.dataset.uniCodigo || nome;
    const resumo = [
      `Excluir definitivamente a ${tipo} «${nome}»?`,
      "",
      `Serão removidos: ${t.vinculos_usuario || 0} vínculo(s),`,
      `${t.filial_municipio || 0} município(s) de monitoramento,`,
      `${t.filial_uasg || 0} UASG(s) de monitoramento,`,
      `${t.configuracoes_coleta || 0} configuração(ões) de coleta.`,
      "",
      body.preserva || "",
      "",
      "Esta ação não pode ser desfeita pelo sistema.",
    ].join("\n");
    if (!window.confirm(resumo)) return;
    const digitado = window.prompt(
      `Para confirmar, digite exatamente o código da unidade:\n${token}`,
      "",
    );
    if (digitado == null) return;
    const { res: r2, body: b2 } = await api(`/api/org/unidades/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ confirmacao: digitado.trim() }),
    });
    if (!r2.ok) {
      flashUnidade(b2?.detail || "Falha ao excluir unidade.");
      return;
    }
    await syncMeEscopoUi();
    flashUnidade(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} «${b2?.excluida?.nome || nome}» excluída.`);
    if (state.orgId) await openOrg(state.orgId);
    else await loadOrganizacao();
  }

  async function editarNomeUnidade(btn) {
    const id = Number(btn.dataset.editUniNome);
    const atual = btn.dataset.nomeAtual || "";
    const digitado = window.prompt("Nome da unidade:", atual);
    if (digitado == null) return;
    const nome = digitado.trim();
    if (nome.length < 2) {
      flashUnidade("Nome deve ter pelo menos 2 caracteres.");
      return;
    }
    const { res, body } = await api(`/api/org/unidades/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ nome }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao atualizar nome da unidade.");
      return;
    }
    flashUnidade(`Unidade renomeada: «${nome}».`);
    await syncMeEscopoUi();
    if (state.orgId) await openOrg(state.orgId);
  }

  async function editarCodigoUnidade(btn) {
    const id = Number(btn.dataset.editUniCodigo);
    const atual = btn.dataset.codigoAtual || "";
    const digitado = window.prompt(
      "Código da unidade (mnemônico, único na org; ex.: OSB, OSBUDI; vazio remove):",
      atual,
    );
    if (digitado == null) return;
    const codigo = normalizarCodigoDigitado(digitado);
    if (codigo && /^\d+$/.test(codigo)) {
      flashUnidade("Código deve ser mnemônico (ex.: OSB), não apenas dígitos.");
      return;
    }
    const { res, body } = await api(`/api/org/unidades/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ codigo: codigo || "" }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao atualizar código.");
      return;
    }
    flashUnidade(codigo ? `Código atualizado: ${codigo}` : "Código removido.");
    await syncMeEscopoUi();
    if (state.orgId) await openOrg(state.orgId);
  }

  async function editarCnpjUnidade(btn) {
    const id = Number(btn.dataset.editCnpj);
    const atual = formatCnpjDisplay(btn.dataset.cnpjAtual || "") || "";
    const digitado = window.prompt("CNPJ da unidade (14 dígitos; deixe vazio para limpar):", atual);
    if (digitado == null) return;
    const digits = onlyDigits(digitado);
    if (digits && digits.length !== 14) {
      flashUnidade("CNPJ deve ter 14 dígitos.");
      return;
    }
    const { res, body } = await api(`/api/org/unidades/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ cnpj: digits || "" }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao atualizar CNPJ.");
      return;
    }
    flashUnidade(digits ? `CNPJ atualizado: ${formatCnpjDisplay(digits)}` : "CNPJ removido.");
    if (state.orgId) await openOrg(state.orgId);
  }

  // —— Território (Fase 2) ——
  function filialAtivaId() {
    const sel = $("territorio-filial-select");
    const id = Number(sel?.value || 0);
    if (id) return id;
    const filiais = filiaisDoMe(state.me);
    return filiais.length === 1 ? filiais[0].id : null;
  }

  const territorioState = {
    municipiosAtivos: 0,
    catalogoCount: 0,
    uasgsAtivas: 0,
    preferMun: null,
  };

  function atualizarPassosTerritorio() {
    const hasMun = territorioState.municipiosAtivos > 0;
    const hasCat = territorioState.catalogoCount > 0;
    const hasMon = territorioState.uasgsAtivas > 0;
    let current = 1;
    if (hasMun && !hasCat) current = 2;
    else if (hasMun && hasCat && !hasMon) current = 3;
    else if (hasMun && hasCat && hasMon) current = 4;

    document.querySelectorAll(".territorio-step").forEach((el) => {
      const n = Number(el.dataset.step);
      el.classList.toggle("is-done", n < current || (n === 4 && hasMon));
      el.classList.toggle("is-current", n === current);
      if (n === 4 && hasMon) {
        el.classList.add("is-done");
        el.classList.remove("is-current");
      }
    });

    const hints = {
      1: "Passo 1: digite o código IBGE (7 dígitos). Nome e UF preenchem sozinhos.",
      2: "Passo 2: escolha o município e clique em «Sincronizar catálogo» (Compras.gov).",
      3: "Passo 3: em cada UASG do catálogo, clique em «Monitorar».",
      4: "Passo 4: abra Coleta → plano → Executar agora.",
    };
    const hint = $("territorio-passo-hint");
    if (hint) hint.textContent = hints[current] || "";

    const btnSync = $("btn-sync-uasg");
    if (btnSync) btnSync.disabled = !hasMun || !$("sel-mun-catalogo")?.value;

    const ctx = $("territorio-filial-ctx");
    if (ctx) {
      const fid = filialAtivaId();
      const u = (state.me?.unidades || []).find((x) => x.id === fid);
      ctx.textContent = u
        ? `Filial: ${u.nome}${u.codigo ? ` (${u.codigo})` : ""} · escopo do login`
        : "—";
    }
  }

  async function loadTerritorio() {
    popularSeletorTerritorio(state.me);
    const fid = filialAtivaId();
    const sem = $("territorio-sem-filial");
    const painel = $("territorio-painel");
    const seletorCard = $("territorio-seletor-card");
    if (!fid) {
      if (sem) sem.hidden = false;
      if (painel) painel.hidden = true;
      if (seletorCard) seletorCard.hidden = filiaisDoMe(state.me).length === 0;
      return;
    }
    if (seletorCard) seletorCard.hidden = false;
    sem.hidden = true;
    painel.hidden = false;
    await loadMunicipiosFilial(fid);
    await loadUasgsFilial(fid);
    const sel = $("sel-mun-catalogo");
    if (territorioState.preferMun && sel) {
      const opt = [...sel.options].find((o) => o.value === String(territorioState.preferMun));
      if (opt) sel.value = String(territorioState.preferMun);
      territorioState.preferMun = null;
    }
    if (sel?.value) await loadCatalogoUasg(fid, Number(sel.value));
    else {
      territorioState.catalogoCount = 0;
      $("tbody-catalogo-uasg").innerHTML =
        `<tr><td colspan="4" class="muted">Associe um município (passo 1) para sincronizar o catálogo.</td></tr>`;
    }
    atualizarPassosTerritorio();
  }

  async function loadMunicipiosFilial(fid) {
    const { res, body } = await api(
      `/api/territorial/filiais/${fid}/municipios`,
    );
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao listar municípios.");
      return;
    }
    const ativos = body.filter((m) => m.ativo);
    territorioState.municipiosAtivos = ativos.length;
    const prev = $("sel-mun-catalogo").value;
    $("sel-mun-catalogo").innerHTML = ativos
      .map(
        (m) =>
          `<option value="${m.codigo_municipio_ibge}">${escapeHtml(m.nome)}/${escapeHtml(m.uf || "")} (${m.codigo_municipio_ibge})</option>`,
      )
      .join("");
    if (prev && [...$("sel-mun-catalogo").options].some((o) => o.value === prev)) {
      $("sel-mun-catalogo").value = prev;
    }

    $("tbody-municipios").innerHTML =
      body
        .map((m) => {
          const acoes = m.ativo
            ? `<button type="button" class="btn btn-secondary btn-sm" data-desativar-mun="${m.codigo_municipio_ibge}">Desativar</button>`
            : `<span class="muted">histórico</span>`;
          return `<tr>
            <td>${m.codigo_municipio_ibge}</td>
            <td>${escapeHtml(m.nome || "—")}</td>
            <td>${escapeHtml(m.uf || "—")}</td>
            <td>${m.ativo ? "Ativo" : "Inativo"}</td>
            <td>${acoes}</td>
          </tr>`;
        })
        .join("") || `<tr><td colspan="5" class="muted">Nenhum município associado — use o passo 1.</td></tr>`;

    $("tbody-municipios").querySelectorAll("[data-desativar-mun]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const codigo = Number(btn.dataset.desativarMun);
        const r = await api(
          `/api/territorial/filiais/${fid}/municipios/${codigo}`,
          { method: "DELETE" },
        );
        if (!r.res.ok) {
          flashUnidade(r.body?.detail || "Falha ao desativar.");
          return;
        }
        await loadTerritorio();
      });
    });
  }

  async function loadCatalogoUasg(fid, codigoIbge) {
    const { res, body } = await api(
      `/api/territorial/filiais/${fid}/municipios/${codigoIbge}/uasgs`,
    );
    if (!res.ok) {
      $("tbody-catalogo-uasg").innerHTML =
        `<tr><td colspan="4" class="muted">${escapeHtml(body?.detail || "Sem catálogo.")}</td></tr>`;
      return;
    }
    territorioState.catalogoCount = Array.isArray(body) ? body.length : 0;
    $("tbody-catalogo-uasg").innerHTML =
      body
        .map((u) => {
          let acao;
          if (u.monitoramento_ativo) {
            acao = `<button type="button" class="btn btn-secondary btn-sm" data-off-uasg="${u.id}">Desativar</button>`;
          } else {
            acao = `<button type="button" class="btn btn-primary btn-sm" data-on-uasg="${u.id}">Monitorar</button>`;
          }
          const status = u.monitoramento_ativo
            ? "Ativo"
            : u.monitorando
              ? "Histórico"
              : "—";
          return `<tr>
            <td>${escapeHtml(u.codigo_uasg)}</td>
            <td>${escapeHtml(u.nome_uasg || "—")}</td>
            <td>${status}</td>
            <td>${acao}</td>
          </tr>`;
        })
        .join("") ||
      `<tr><td colspan="4" class="muted">Nenhuma UASG no catálogo — clique em «Sincronizar catálogo».</td></tr>`;

    $("tbody-catalogo-uasg").querySelectorAll("[data-on-uasg]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const r = await api(`/api/territorial/filiais/${fid}/uasgs`, {
          method: "POST",
          body: JSON.stringify({ uasg_id: Number(btn.dataset.onUasg) }),
        });
        if (!r.res.ok) {
          flashUnidade(r.body?.detail || "Falha ao ativar monitoramento.");
          return;
        }
        flashUnidade("UASG em monitoramento.");
        await loadTerritorio();
      });
    });
    $("tbody-catalogo-uasg").querySelectorAll("[data-off-uasg]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const r = await api(
          `/api/territorial/filiais/${fid}/uasgs/${btn.dataset.offUasg}`,
          { method: "DELETE" },
        );
        if (!r.res.ok) {
          flashUnidade(r.body?.detail || "Falha ao desativar.");
          return;
        }
        await loadTerritorio();
      });
    });
    atualizarPassosTerritorio();
  }

  async function loadUasgsFilial(fid) {
    const { res, body } = await api(`/api/territorial/filiais/${fid}/uasgs`);
    if (!res.ok) return;
    const ativas = (body || []).filter((u) => u.ativo);
    territorioState.uasgsAtivas = ativas.length;
    $("tbody-uasgs-filial").innerHTML =
      body
        .map(
          (u) => `<tr>
          <td>${escapeHtml(u.codigo_uasg || "—")}</td>
          <td>${escapeHtml(u.nome_uasg || "—")}</td>
          <td>${u.ativo ? "Sim" : "Não"}</td>
          <td>${u.desativado_em ? escapeHtml(String(u.desativado_em)) : "—"}</td>
        </tr>`,
        )
        .join("") || `<tr><td colspan="4" class="muted">Nenhuma UASG monitorada — use «Monitorar» no catálogo.</td></tr>`;
  }

  let munIbgeTimer = null;
  let munIbgeUltimo = "";

  function setMunIbgeStatus(text, kind) {
    const el = $("mun-ibge-status");
    if (!el) return;
    el.textContent = text || "";
    el.style.color =
      kind === "ok" ? "var(--ok)" : kind === "err" ? "var(--danger)" : "var(--text-soft)";
  }

  function limparMunResolvido() {
    $("mun-nome").value = "";
    $("mun-uf").value = "";
    const btn = $("btn-associar-mun");
    if (btn) btn.disabled = true;
  }

  async function resolverMunicipioIbge() {
    const raw = onlyDigits($("mun-ibge").value);
    $("mun-ibge").value = raw;
    if (raw.length !== 7) {
      limparMunResolvido();
      setMunIbgeStatus(
        raw.length ? "Código IBGE tem 7 dígitos (ex.: 3170206 — Uberlândia)." : "",
      );
      munIbgeUltimo = "";
      return;
    }
    if (raw === munIbgeUltimo && $("mun-nome").value) return;
    munIbgeUltimo = raw;
    setMunIbgeStatus("Consultando IBGE…");
    const btn = $("btn-associar-mun");
    if (btn) btn.disabled = true;
    const { res, body } = await api(`/api/territorial/ibge/municipios/${raw}`);
    if (!res.ok) {
      limparMunResolvido();
      setMunIbgeStatus(formatDetail(body?.detail) || "Município não encontrado no IBGE.", "err");
      return;
    }
    $("mun-nome").value = body.nome || "";
    $("mun-uf").value = body.uf || "";
    if (btn) btn.disabled = false;
    const fonte = body.fonte === "cache_local" ? "cache local" : "IBGE Localidades";
    setMunIbgeStatus(`${body.nome}/${body.uf} · ${fonte}`, "ok");
  }

  $("mun-ibge")?.addEventListener("input", () => {
    const raw = onlyDigits($("mun-ibge").value).slice(0, 7);
    $("mun-ibge").value = raw;
    if (raw !== munIbgeUltimo) {
      limparMunResolvido();
      setMunIbgeStatus(raw.length === 7 ? "Consultando…" : "");
    }
    window.clearTimeout(munIbgeTimer);
    if (raw.length === 7) {
      munIbgeTimer = window.setTimeout(() => resolverMunicipioIbge(), 280);
    }
  });
  $("mun-ibge")?.addEventListener("blur", () => resolverMunicipioIbge());

  $("form-municipio").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fid = filialAtivaId();
    if (!fid) {
      flashUnidade("Selecione uma filial no cabeçalho.");
      return;
    }
    const codigo = onlyDigits($("mun-ibge").value);
    if (codigo.length !== 7) {
      flashUnidade("Informe o código IBGE com 7 dígitos.");
      return;
    }
    if (!$("mun-nome").value.trim() || !$("mun-uf").value.trim()) {
      await resolverMunicipioIbge();
      if (!$("mun-nome").value.trim()) {
        flashUnidade("Aguarde a resolução do município pelo IBGE.");
        return;
      }
    }
    const { res, body } = await api(`/api/territorial/filiais/${fid}/municipios`, {
      method: "POST",
      body: JSON.stringify({
        codigo_ibge: Number(codigo),
        nome: $("mun-nome").value.trim() || null,
        uf: $("mun-uf").value.trim().toUpperCase() || null,
      }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao associar município.");
      return;
    }
    $("form-municipio").reset();
    limparMunResolvido();
    munIbgeUltimo = "";
    setMunIbgeStatus("");
    territorioState.preferMun = body.codigo_municipio_ibge;
    flashUnidade(`Município ${body.nome}/${body.uf} associado. Sincronize o catálogo UASG.`);
    await loadTerritorio();
    $("territorio-card-catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("sel-mun-catalogo")?.addEventListener("change", async () => {
    const fid = filialAtivaId();
    const codigo = Number($("sel-mun-catalogo").value);
    if (fid && codigo) await loadCatalogoUasg(fid, codigo);
    atualizarPassosTerritorio();
  });

  $("btn-sync-uasg").addEventListener("click", async () => {
    const fid = filialAtivaId();
    const codigo = Number($("sel-mun-catalogo").value);
    if (!fid || !codigo) {
      flashUnidade("Associe e selecione um município ativo antes de sincronizar.");
      return;
    }
    $("btn-sync-uasg").disabled = true;
    setMunIbgeStatus("");
    flashUnidade("Sincronizando catálogo Compras.gov…");
    const { res, body } = await api(
      `/api/territorial/filiais/${fid}/municipios/${codigo}/sync`,
      { method: "POST" },
    );
    $("btn-sync-uasg").disabled = false;
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha na sincronização Compras.gov.");
      atualizarPassosTerritorio();
      return;
    }
    flashUnidade(`Catálogo atualizado: ${body.total_catalogo} UASG(s). Ative o monitoramento.`);
    await loadTerritorio();
    $("territorio-card-catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("sel-mun-catalogo").addEventListener("change", async () => {
    const fid = filialAtivaId();
    const codigo = Number($("sel-mun-catalogo").value);
    if (fid && codigo) await loadCatalogoUasg(fid, codigo);
  });

  // —— Configuração (Fase 3) ——
  async function loadConfiguracao() {
    popularSeletorConfig(state.me);
    const u = unidadeConfigSelecionada();
    const qs = u ? `?unidade_id=${u.id}` : "";
    const ctx = $("config-contexto");
    if (!u) {
      ctx.textContent =
        "Contexto: plataforma (global) — selecione matriz/filial acima para ver herança.";
    } else {
      ctx.textContent = `Contexto: ${u.tipo} · ${u.nome}${u.codigo ? " (" + u.codigo + ")" : ""}`;
    }

    const authBox = $("config-auth-filial");
    if (u && u.tipo === "filial" && state.me?.permissoes?.admin) {
      authBox.hidden = false;
      const btn = $("btn-auth-excecao");
      btn.textContent = "Autorizar / gerenciar exceções da filial";
    } else {
      authBox.hidden = true;
    }

    const params = await api("/api/config/parametros");
    if (params.res.ok) {
      $("cfg-chave").innerHTML = params.body
        .map((p) => `<option value="${escapeHtml(p.chave)}">${escapeHtml(p.chave)} — ${escapeHtml(p.nome)}</option>`)
        .join("");
    }

    const { res, body } = await api(`/api/config/efetiva${qs}`);
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao resolver configuração.");
      return;
    }

    const filialAutorizada = body.some((r) => r.excecoes_filial_autorizadas === true);
    if (u && u.tipo === "filial") {
      $("btn-auth-excecao").textContent = filialAutorizada
        ? "Revogar autorização de exceções"
        : "Autorizar exceções nesta filial";
      $("btn-auth-excecao").dataset.autorizar = filialAutorizada ? "0" : "1";
    }

    $("tbody-config-efetiva").innerHTML = body
      .map((r) => {
        const badge =
          r.origem === "filial"
            ? "filial"
            : r.origem === "matriz"
              ? "matriz"
              : r.origem === "global"
                ? "matriz"
                : "";
        let acao = "";
        if (r.origem === "filial" && u && u.tipo === "filial") {
          acao = `<button type="button" class="btn btn-secondary btn-sm" data-limpar-excecao="${escapeHtml(r.chave)}">Herdar de novo</button>`;
        }
        return `<tr>
          <td><strong>${escapeHtml(r.chave)}</strong><div class="muted" style="font-size:0.78rem">${escapeHtml(r.nome)}</div></td>
          <td><code>${escapeHtml(r.valor ?? "—")}</code></td>
          <td>${badge ? `<span class="badge badge-${badge}">${escapeHtml(r.origem)}</span>` : escapeHtml(r.origem)}</td>
          <td>${r.permite_excecao_filial ? "Sim" : "Não"}</td>
          <td>${acao}</td>
        </tr>`;
      })
      .join("");

    $("tbody-config-efetiva").querySelectorAll("[data-limpar-excecao]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!u) return;
        const r = await api(
          `/api/config/filiais/${u.id}/excecoes/${encodeURIComponent(btn.dataset.limparExcecao)}`,
          { method: "DELETE" },
        );
        if (!r.res.ok) {
          flashUnidade(r.body?.detail || "Falha ao restaurar herança.");
          return;
        }
        flashUnidade("Exceção removida — valor herdado novamente.");
        await loadConfiguracao();
      });
    });
  }

  $("btn-config-refresh").addEventListener("click", () => loadConfiguracao());

  $("btn-auth-excecao").addEventListener("click", async () => {
    const u = unidadeConfigSelecionada();
    if (!u || u.tipo !== "filial") return;
    const autorizar = $("btn-auth-excecao").dataset.autorizar !== "0";
    const r = await api(`/api/config/filiais/${u.id}/autorizar-excecoes`, {
      method: "POST",
      body: JSON.stringify({ autorizar }),
    });
    if (!r.res.ok) {
      flashUnidade(r.body?.detail || "Falha ao alterar autorização.");
      return;
    }
    flashUnidade(
      r.body.excecoes_config_autorizadas
        ? "Filial autorizada a definir exceções."
        : "Autorização de exceções revogada.",
    );
    await loadConfiguracao();
  });

  $("form-config-valor").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const escopo = $("cfg-escopo").value;
    const u = unidadeConfigSelecionada();
    let unidade_id = null;
    if (escopo === "matriz" || escopo === "filial") {
      if (!u) {
        flashUnidade("Selecione a unidade de contexto (matriz ou filial) acima.");
        return;
      }
      if (escopo === "matriz" && u.tipo !== "matriz") {
        flashUnidade("Para escopo matriz, selecione a unidade matriz no contexto.");
        return;
      }
      if (escopo === "filial" && u.tipo !== "filial") {
        flashUnidade("Para escopo filial, selecione a filial no contexto.");
        return;
      }
      unidade_id = u.id;
    }
    const { res, body } = await api("/api/config/valores", {
      method: "PUT",
      body: JSON.stringify({
        escopo,
        chave: $("cfg-chave").value,
        valor: $("cfg-valor").value,
        unidade_id,
      }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao salvar.");
      return;
    }
    flashUnidade(`Salvo · ${body.chave} = ${body.valor} (v${body.versao})`);
    $("cfg-valor").value = "";
    await loadConfiguracao();
  });

  function escHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtMoedaBr(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "R$ 0,00";
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v);
    } catch {
      return `R$ ${v.toFixed(2).replace(".", ",")}`;
    }
  }

  const IND_METRICA_KEY = "osb50_ind_metrica";
  const IND_PERIODO_KEY = "osb50_ind_periodo";
  const IND_PERIODO_INI_KEY = "osb50_ind_periodo_ini";
  const IND_PERIODO_FIM_KEY = "osb50_ind_periodo_fim";
  const IND_QUAD_ANO_KEY = "osb50_ind_quad_ano";
  const IND_QUAD_Q_KEY = "osb50_ind_quad_q";
  const IND_QUAD_LABELS = {
    1: "Q1 (jan–abr)",
    2: "Q2 (mai–ago)",
    3: "Q3 (set–dez)",
  };
  const IND_PERIODOS_OK = new Set([
    "ano_atual",
    "ano_anterior",
    "quadrimestre",
    "intervalo",
    "tudo",
  ]);

  function indQuadCorrente(d = new Date()) {
    return Math.floor(d.getMonth() / 4) + 1;
  }

  let indMetrica =
    sessionStorage.getItem(IND_METRICA_KEY) === "valor" ? "valor" : "quantidade";
  let indPeriodo = (() => {
    let raw = sessionStorage.getItem(IND_PERIODO_KEY) || "ano_atual";
    // Migração: preset antigo → novo modo com slider
    if (raw === "quadrimestre_atual") raw = "quadrimestre";
    return IND_PERIODOS_OK.has(raw) ? raw : "ano_atual";
  })();
  let indQuadAno = (() => {
    const n = Number(sessionStorage.getItem(IND_QUAD_ANO_KEY));
    return Number.isFinite(n) && n >= 2000 && n <= 2100
      ? n
      : new Date().getFullYear();
  })();
  let indQuadQ = (() => {
    const n = Number(sessionStorage.getItem(IND_QUAD_Q_KEY));
    return n === 1 || n === 2 || n === 3 ? n : indQuadCorrente();
  })();
  let indCompCache = null;
  const IND_ANALISE_KEY = "osb50_ind_analise";
  let indAnalise =
    sessionStorage.getItem(IND_ANALISE_KEY) === "geo" ? "geo" : "comparativos";
  let indLenteUnidade = false;

  const IND_GEO = {
    map: null,
    geoLayer: null,
    heatLayer: null,
    bubbleLayer: null,
    geojson: null,
    centroids: null,
    data: null,
    mode: "estados",
    ufFocus: null,
    leafletReady: false,
    loading: false,
    periodoKey: "",
  };
  /** Mapa da rede (matriz) — estado isolado do mapa de vencedores (filial). */
  const IND_REDE = {
    map: null,
    geoLayer: null,
    bubbleLayer: null,
    ufCentroids: null,
    filiais: [],
    ufFocus: null,
    filialFocus: null,
    markersById: {},
    ready: false,
    loading: false,
  };
  const IND_GEO_PALETTE = [
    "#f2f5e8",
    "#d4e8b5",
    "#b4d574",
    "#91c649",
    "#6e9e28",
    "#3d5f14",
  ];

  function syncIndMetricaToggle() {
    document.querySelectorAll("#ind-metrica-toggle .ind-metrica-btn").forEach((btn) => {
      const on = btn.dataset.metrica === indMetrica;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function syncIndAnaliseToggle() {
    const toggle = $("ind-analise-toggle");
    if (toggle) toggle.hidden = !indLenteUnidade;
    const pane = indLenteUnidade ? indAnalise : "comparativos";
    document.querySelectorAll("#ind-analise-toggle .ind-analise-btn").forEach((btn) => {
      const on = btn.dataset.analise === pane;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    const paneComp = $("ind-pane-comparativos");
    const paneGeo = $("ind-pane-geo");
    if (paneComp) paneComp.hidden = pane !== "comparativos";
    if (paneGeo) paneGeo.hidden = pane !== "geo";
    if (pane === "geo") {
      setTimeout(() => IND_GEO.map?.invalidateSize(), 80);
    }
  }

  function setIndAnalise(next) {
    const ok = next === "geo" ? "geo" : "comparativos";
    if (!indLenteUnidade) {
      indAnalise = "comparativos";
      sessionStorage.setItem(IND_ANALISE_KEY, indAnalise);
      syncIndAnaliseToggle();
      return;
    }
    if (ok === indAnalise) {
      syncIndAnaliseToggle();
      if (ok === "geo") ensureIndGeoLoaded();
      return;
    }
    indAnalise = ok;
    sessionStorage.setItem(IND_ANALISE_KEY, indAnalise);
    syncIndAnaliseToggle();
    if (indAnalise === "geo") ensureIndGeoLoaded();
  }

  function indGeoFmtNum(n) {
    return Number(n || 0).toLocaleString("pt-BR");
  }

  function indGeoValorDe(item) {
    if (indMetrica === "valor") return Number(item?.valor) || 0;
    // Quantidade nos mapas = contratações (não itens 07.3).
    return Number(item?.contratacoes) || 0;
  }

  function indGeoFmtMetrica(v) {
    return indMetrica === "valor" ? fmtMoedaCompact(v) : indGeoFmtNum(v);
  }

  /** Dual compacto numa linha (evita balão alto). */
  function indMapLinhaContratacoes(total, homologadas) {
    return `Contr. <b>${indGeoFmtNum(total)}</b> · Hom. <b>${indGeoFmtNum(homologadas)}</b>`;
  }

  function indMapLinhaValores(estimado, homologado) {
    const e = Number(estimado) || 0;
    const h = Number(homologado) || 0;
    return `Est. <b>${escHtml(fmtMoedaCompact(e))}</b> · Hom. <b>${escHtml(fmtMoedaCompact(h))}</b>`;
  }

  /**
   * Dica filial (estado/calor): só homologados (mapa = vencedores 07.3).
   * 2 linhas compactas — Hom. (qtd) · valor homologado.
   */
  function indGeoTooltipFilial(tituloHtml, row) {
    const nHom = Number(row?.contratacoes) || 0;
    const vHom = Number(row?.valor) || 0;
    return (
      `${tituloHtml}<br>` +
      `Hom. <b>${indGeoFmtNum(nHom)}</b> · <b>${escHtml(fmtMoedaCompact(vHom))}</b>`
    );
  }

  function indMapTipOpts(extra) {
    return {
      sticky: true,
      className: "ind-geo-tooltip",
      opacity: 1,
      direction: "top",
      offset: [0, -6],
      ...(extra || {}),
    };
  }

  function indGeoCorEscala(t) {
    const x = Math.max(0, Math.min(1, t));
    const idx =
      x <= 0
        ? 0
        : Math.min(IND_GEO_PALETTE.length - 1, Math.ceil(x * (IND_GEO_PALETTE.length - 1)));
    return IND_GEO_PALETTE[idx];
  }

  function indGeoNorm(v, max) {
    if (!max || max <= 0 || !v) return 0;
    return Math.sqrt(v / max);
  }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "1") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(src)), {
          once: true,
        });
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => {
        s.dataset.loaded = "1";
        resolve();
      };
      s.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
      document.head.appendChild(s);
    });
  }

  function loadCssOnce(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  async function ensureLeaflet() {
    if (IND_GEO.leafletReady && window.L) return;
    loadCssOnce("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    await loadScriptOnce("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
    await loadScriptOnce(
      "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"
    );
    IND_GEO.leafletReady = true;
  }

  async function indGeoEnsureAssets() {
    if (IND_GEO.geojson && IND_GEO.centroids) return;
    const [geo, cents] = await Promise.all([
      fetch("/static/geo/brasil-ufs.geojson").then((r) => r.json()),
      fetch("/static/geo/municipio-centroids.json").then((r) => r.json()),
    ]);
    IND_GEO.geojson = geo;
    IND_GEO.centroids = cents;
  }

  async function indGeoInitMap() {
    const el = $("ind-geo-map");
    if (!el || IND_GEO.map || !window.L) return;
    IND_GEO.map = L.map(el, {
      zoomControl: true,
      attributionControl: false,
      minZoom: 3,
      maxZoom: 12,
      worldCopyJump: false,
    }).setView([-14.2, -52.5], 4);

    let cartoKey = "";
    try {
      const { res, body } = await api("/api/mapa/basemap");
      if (res.ok) cartoKey = (body?.carto_api_key || "").trim();
    } catch {
      /* basemap opcional */
    }
    const tileUrl = cartoKey
      ? `https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`
      : "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";
    L.tileLayer(tileUrl, {
      subdomains: "abcd",
      maxZoom: 18,
      opacity: 0.55,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(IND_GEO.map);
    L.control
      .attribution({ position: "bottomright", prefix: false })
      .addAttribution(
        'Malha UF · Observatório · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>'
      )
      .addTo(IND_GEO.map);
    setTimeout(() => IND_GEO.map?.invalidateSize(), 80);
  }

  function indGeoClearLayers() {
    if (!IND_GEO.map) return;
    if (IND_GEO.geoLayer) {
      IND_GEO.map.removeLayer(IND_GEO.geoLayer);
      IND_GEO.geoLayer = null;
    }
    if (IND_GEO.heatLayer) {
      IND_GEO.map.removeLayer(IND_GEO.heatLayer);
      IND_GEO.heatLayer = null;
    }
    if (IND_GEO.bubbleLayer) {
      IND_GEO.map.removeLayer(IND_GEO.bubbleLayer);
      IND_GEO.bubbleLayer = null;
    }
  }

  function indGeoByUfMap() {
    const map = {};
    (IND_GEO.data?.por_uf || []).forEach((u) => {
      map[u.uf] = u;
    });
    return map;
  }

  function indGeoRenderLegend(max) {
    const el = $("ind-geo-legend");
    if (!el) return;
    const label =
      indMetrica === "valor" ? "Valor homologado" : "Contr. homologadas";
    const stops = IND_GEO_PALETTE.map(
      (c) => `<span class="ind-geo-legend-swatch" style="background:${c}"></span>`
    ).join("");
    el.innerHTML = `<div class="ind-geo-legend-inner">
      <span class="ind-geo-legend-label">${escHtml(label)}</span>
      <div class="ind-geo-legend-ramp">${stops}</div>
      <div class="ind-geo-legend-ends">
        <span>Baixo</span>
        <span>Máx. ${escHtml(indGeoFmtMetrica(max))}</span>
      </div>
    </div>`;
  }

  function indGeoFitBounds() {
    if (!IND_GEO.map) return;
    if (IND_GEO.ufFocus && IND_GEO.geoLayer) {
      const layers = [];
      IND_GEO.geoLayer.eachLayer((ly) => {
        if (ly.feature?.properties?.sigla === IND_GEO.ufFocus) layers.push(ly);
      });
      if (layers.length) {
        IND_GEO.map.fitBounds(layers[0].getBounds(), {
          padding: [28, 28],
          maxZoom: 7,
        });
        return;
      }
    }
    if (IND_GEO.geoLayer) {
      try {
        IND_GEO.map.fitBounds(IND_GEO.geoLayer.getBounds(), { padding: [16, 16] });
      } catch {
        IND_GEO.map.setView([-14.2, -52.5], 4);
      }
    }
  }

  function indGeoFocarUf(sigla) {
    IND_GEO.ufFocus = sigla || null;
    const btn = $("btn-ind-geo-brasil");
    if (btn) btn.hidden = !IND_GEO.ufFocus;
    indGeoRedraw();
  }

  function indGeoPaintEstados() {
    const byUf = indGeoByUfMap();
    const max = Math.max(...Object.values(byUf).map(indGeoValorDe), 1);
    IND_GEO.geoLayer = L.geoJSON(IND_GEO.geojson, {
      style(feat) {
        const sigla = feat.properties.sigla;
        const row = byUf[sigla];
        const v = row ? indGeoValorDe(row) : 0;
        const focused = !IND_GEO.ufFocus || IND_GEO.ufFocus === sigla;
        return {
          fillColor: v ? indGeoCorEscala(indGeoNorm(v, max)) : "#f3f0e6",
          weight: IND_GEO.ufFocus === sigla ? 2.4 : 1,
          color: IND_GEO.ufFocus === sigla ? "#0d1f2a" : "#c8bfaa",
          fillOpacity: focused ? (v ? 0.88 : 0.35) : 0.12,
          opacity: focused ? 1 : 0.35,
        };
      },
      onEachFeature(feat, layer) {
        const sigla = feat.properties.sigla;
        const nome = feat.properties.nome;
        const row = byUf[sigla];
        const tip = row
          ? indGeoTooltipFilial(
              `<strong>${escHtml(sigla)} · ${escHtml(nome)}</strong>`,
              row
            )
          : `<strong>${escHtml(sigla)} · ${escHtml(nome)}</strong><br>Hom. <b>0</b> · sem sede`;
        layer.bindTooltip(tip, indMapTipOpts());
        layer.on({
          mouseover(e) {
            e.target.setStyle({ weight: 2.2, color: "#0d1f2a" });
            e.target.bringToFront();
          },
          mouseout(e) {
            IND_GEO.geoLayer.resetStyle(e.target);
          },
          click() {
            indGeoFocarUf(sigla);
          },
        });
      },
    }).addTo(IND_GEO.map);
    indGeoRenderLegend(max);
    indGeoFitBounds();
  }

  function indGeoPaintCalor() {
    const munis = (IND_GEO.data?.por_municipio || []).filter((m) => {
      if (IND_GEO.ufFocus && m.uf !== IND_GEO.ufFocus) return false;
      return true;
    });
    const max = Math.max(...munis.map(indGeoValorDe), 1);
    const heatPts = [];
    const bubbles = [];
    munis.forEach((m) => {
      const c = m.ibge ? IND_GEO.centroids[String(m.ibge)] : null;
      if (!c) return;
      const v = indGeoValorDe(m);
      if (!v) return;
      const intensity = Math.max(0.15, indGeoNorm(v, max));
      heatPts.push([c[0], c[1], intensity]);
      bubbles.push({ m, c, v, intensity });
    });

    // Fundo UF primeiro e NÃO interativo — senão cobre as bolhas e a dica some.
    const byUf = indGeoByUfMap();
    IND_GEO.geoLayer = L.geoJSON(IND_GEO.geojson, {
      interactive: false,
      style(feat) {
        const sigla = feat.properties.sigla;
        const focused = !IND_GEO.ufFocus || IND_GEO.ufFocus === sigla;
        const has = !!byUf[sigla];
        return {
          fillColor: "#f3f0e6",
          weight: IND_GEO.ufFocus === sigla ? 2 : 0.8,
          color: IND_GEO.ufFocus === sigla ? "#0d1f2a" : "#d5cdb8",
          fillOpacity: focused ? (has ? 0.25 : 0.12) : 0.05,
          opacity: focused ? 1 : 0.25,
        };
      },
    }).addTo(IND_GEO.map);

    if (typeof L.heatLayer === "function" && heatPts.length) {
      IND_GEO.heatLayer = L.heatLayer(heatPts, {
        radius: 28,
        blur: 22,
        maxZoom: 8,
        minOpacity: 0.35,
        gradient: {
          0.15: "#f2f5e8",
          0.35: "#d4e8b5",
          0.55: "#b4d574",
          0.75: "#91c649",
          0.9: "#6e9e28",
          1.0: "#3d5f14",
        },
      }).addTo(IND_GEO.map);
      // Canvas do heat não deve roubar o mouse das bolhas.
      const heatEl = IND_GEO.heatLayer._canvas || IND_GEO.heatLayer.getContainer?.();
      if (heatEl) heatEl.style.pointerEvents = "none";
    }

    IND_GEO.bubbleLayer = L.layerGroup().addTo(IND_GEO.map);
    bubbles.forEach(({ m, c, intensity }) => {
      const rad = Math.max(8, 5 + intensity * 16);
      const circle = L.circleMarker(c, {
        radius: rad,
        color: "#6e9e28",
        weight: 1.2,
        fillColor: indGeoCorEscala(intensity),
        fillOpacity: 0.65,
        opacity: 0.95,
        bubblingMouseEvents: false,
      });
      circle.bindTooltip(
        indGeoTooltipFilial(
          `<strong>${escHtml(m.municipio)}/${escHtml(m.uf)}</strong>`,
          m
        ),
        indMapTipOpts()
      );
      circle.on("click", () => {
        if (m.uf) indGeoFocarUf(m.uf);
      });
      IND_GEO.bubbleLayer.addLayer(circle);
    });
    IND_GEO.bubbleLayer.bringToFront();
    indGeoRenderLegend(max);
    indGeoFitBounds();
  }

  function indGeoRenderRanking() {
    const el = $("ind-geo-ranking");
    if (!el) return;
    const rows = (IND_GEO.data?.por_uf || []).slice(0, 8);
    if (!rows.length) {
      el.innerHTML = `<p class="muted" style="margin:0;font-size:0.78rem">Sem vencedores com UF no período — enriqueça CNPJs ou amplie o recorte.</p>`;
      return;
    }
    el.innerHTML = rows
      .map((r) => {
        const shown = indGeoFmtMetrica(indGeoValorDe(r));
        const tip =
          indMetrica === "valor"
            ? `Hom. ${fmtMoedaBr(r.valor || 0)}`
            : `Hom. ${indGeoFmtNum(r.contratacoes || 0)}`;
        return `<button type="button" class="ind-geo-rank-item" data-uf="${escHtml(r.uf)}" title="${escHtml(tip)}">
          <strong>${escHtml(r.uf)}</strong>
          <span>${escHtml(shown)}</span>
        </button>`;
      })
      .join("");
    el.querySelectorAll("[data-uf]").forEach((btn) => {
      btn.addEventListener("click", () => indGeoFocarUf(btn.dataset.uf));
    });
  }

  function indGeoRedraw() {
    if (!IND_GEO.map || !IND_GEO.data || !IND_GEO.geojson) return;
    indGeoClearLayers();
    if (IND_GEO.mode === "calor") indGeoPaintCalor();
    else indGeoPaintEstados();
    const foot = $("ind-geo-footer");
    if (foot) {
      const resumo = IND_GEO.data.resumo || {};
      const modo = IND_GEO.mode === "calor" ? "Calor" : "UF";
      const foco = IND_GEO.ufFocus ? ` · ${IND_GEO.ufFocus}` : "";
      const sem = resumo.sem_localidade
        ? ` · ${resumo.sem_localidade} sem UF`
        : "";
      foot.textContent =
        `Hom. ${indGeoFmtNum(resumo.contratacoes)} · ${fmtMoedaCompact(resumo.valor)}` +
        ` · ${modo}${foco} · ${indGeoFmtNum(resumo.ufs)} UF${sem}`;
      foot.title =
        `Vencedores homologados com sede: ${indGeoFmtNum(resumo.contratacoes)} contr. · ` +
        `${fmtMoedaBr(resumo.valor)}. KPIs do escopo permanecem no topo.`;
    }
    indGeoRenderRanking();
  }

  async function ensureIndGeoLoaded(force = false) {
    if (!indLenteUnidade) return;
    if (indAnalise !== "geo" && !force) return;
    const periodoQs = indPeriodoParams();
    if (
      indPeriodo === "intervalo" &&
      (!periodoQs.get("data_inicio") || !periodoQs.get("data_fim"))
    ) {
      return;
    }
    const key = periodoQs.toString();
    if (!force && IND_GEO.data && IND_GEO.periodoKey === key && IND_GEO.map) {
      indGeoRedraw();
      setTimeout(() => IND_GEO.map?.invalidateSize(), 80);
      return;
    }
    if (IND_GEO.loading) return;
    IND_GEO.loading = true;
    const foot = $("ind-geo-footer");
    if (foot) foot.textContent = "Carregando distribuição…";
    try {
      await ensureLeaflet();
      await indGeoEnsureAssets();
      await indGeoInitMap();
      const { res, body } = await api(
        `/api/consultas/distribuicao-geografica?${periodoQs}&metrica=${encodeURIComponent(indMetrica)}`
      );
      if (!res.ok) {
        if (foot) {
          foot.textContent =
            typeof body?.detail === "string"
              ? body.detail
              : "Falha ao carregar distribuição geográfica.";
        }
        return;
      }
      IND_GEO.data = body;
      IND_GEO.periodoKey = key;
      indGeoRedraw();
      setTimeout(() => IND_GEO.map?.invalidateSize(), 80);
    } catch (err) {
      if (foot) {
        foot.textContent =
          err?.message || "Não foi possível montar o mapa.";
      }
    } finally {
      IND_GEO.loading = false;
    }
  }

  /* ========== Rede geográfica (Início · matriz) ========== */

  function indRedeMetricaDe(row) {
    if (indMetrica === "valor") return Number(row?.valor) || 0;
    return Number(row?.total) || 0;
  }

  function indRedeFmtMetrica(v) {
    return indMetrica === "valor" ? fmtMoedaCompact(v) : indGeoFmtNum(v);
  }

  function indRedeFmtMetricaFull(v) {
    return indMetrica === "valor" ? fmtMoedaBr(v) : indGeoFmtNum(v);
  }

  function indRedeUfDe(row) {
    return String(row?.uf || "")
      .trim()
      .toUpperCase() || null;
  }

  function indRedeAggPorUf(filiais) {
    const map = {};
    (filiais || []).forEach((f) => {
      const uf = indRedeUfDe(f);
      if (!uf) return;
      if (!map[uf]) {
        map[uf] = {
          uf,
          total: 0,
          homologadas: 0,
          valor: 0,
          valor_homologado: 0,
          filiais: 0,
          metrica: 0,
        };
      }
      map[uf].total += Number(f.total) || 0;
      map[uf].homologadas += Number(f.homologadas) || 0;
      map[uf].valor += Number(f.valor) || 0;
      map[uf].valor_homologado += Number(f.valor_homologado) || 0;
      map[uf].filiais += 1;
      map[uf].metrica += indRedeMetricaDe(f);
    });
    return map;
  }

  function indRedeClearLayers() {
    if (!IND_REDE.map) return;
    if (IND_REDE.geoLayer) {
      IND_REDE.map.removeLayer(IND_REDE.geoLayer);
      IND_REDE.geoLayer = null;
    }
    if (IND_REDE.bubbleLayer) {
      IND_REDE.map.removeLayer(IND_REDE.bubbleLayer);
      IND_REDE.bubbleLayer = null;
    }
    IND_REDE.markersById = {};
  }

  function indRedeFitBounds() {
    if (!IND_REDE.map) return;
    if (IND_REDE.ufFocus && IND_REDE.geoLayer) {
      const layers = [];
      IND_REDE.geoLayer.eachLayer((ly) => {
        if (ly.feature?.properties?.sigla === IND_REDE.ufFocus) layers.push(ly);
      });
      if (layers.length) {
        IND_REDE.map.fitBounds(layers[0].getBounds(), {
          padding: [28, 28],
          maxZoom: 7,
        });
        return;
      }
    }
    if (IND_REDE.bubbleLayer && IND_REDE.bubbleLayer.getLayers().length) {
      try {
        IND_REDE.map.fitBounds(IND_REDE.bubbleLayer.getBounds(), {
          padding: [36, 36],
          maxZoom: 7,
        });
        return;
      } catch {
        /* bounds vazios */
      }
    }
    if (IND_REDE.geoLayer) {
      try {
        IND_REDE.map.fitBounds(IND_REDE.geoLayer.getBounds(), { padding: [16, 16] });
        return;
      } catch {
        /* ignore */
      }
    }
    IND_REDE.map.setView([-14.2, -52.5], 4);
  }

  function indRedeFocarUf(sigla) {
    IND_REDE.ufFocus = sigla || null;
    if (!sigla) IND_REDE.filialFocus = null;
    const btn = $("btn-ind-rede-brasil");
    if (btn) btn.hidden = !IND_REDE.ufFocus;
    indRedeRedraw();
  }

  function indRedeLatLng(row) {
    const ibge = row?.ibge != null ? String(row.ibge) : "";
    const cents = IND_GEO.centroids || {};
    if (ibge && cents[ibge]) {
      const [lat, lng] = cents[ibge];
      return [lat, lng];
    }
    const uf = indRedeUfDe(row);
    const ufC = IND_REDE.ufCentroids || {};
    if (uf && ufC[uf]) {
      const [lat, lng] = ufC[uf];
      // Offset leve para não empilhar filiais sem IBGE no mesmo ponto.
      const h = (Number(row.filial_id) || 0) % 7;
      return [lat + (h - 3) * 0.18, lng + ((h % 3) - 1) * 0.22];
    }
    return null;
  }

  function indRedeRenderLegend(max) {
    const el = $("ind-rede-legend");
    if (!el) return;
    const label =
      indMetrica === "valor" ? "Valor estimado (UF)" : "Contratações totais (UF)";
    const stops = IND_GEO_PALETTE.map(
      (c) => `<span class="ind-geo-legend-swatch" style="background:${c}"></span>`
    ).join("");
    el.innerHTML = `<div class="ind-geo-legend-inner">
      <span class="ind-geo-legend-label">${escHtml(label)}</span>
      <div class="ind-geo-legend-ramp">${stops}</div>
      <div class="ind-geo-legend-ends">
        <span>0</span>
        <span>Máx. ${escHtml(indRedeFmtMetrica(max))}</span>
      </div>
    </div>`;
  }

  function indRedeRenderRanking() {
    const el = $("ind-rede-ranking");
    const titulo = $("ind-rede-rank-titulo");
    if (!el) return;
    let rows = IND_REDE.filiais.slice();
    if (IND_REDE.ufFocus) {
      rows = rows.filter((r) => indRedeUfDe(r) === IND_REDE.ufFocus);
    }
    rows.sort(
      (a, b) =>
        indRedeMetricaDe(b) - indRedeMetricaDe(a) ||
        String(a.filial_nome || "").localeCompare(String(b.filial_nome || ""), "pt-BR")
    );
    if (titulo) {
      titulo.textContent = IND_REDE.ufFocus
        ? `Filiais · ${IND_REDE.ufFocus}`
        : "Filiais";
    }
    if (!rows.length) {
      el.innerHTML = `<p class="muted" style="margin:0;font-size:0.8rem">Nenhuma filial${
        IND_REDE.ufFocus ? ` em ${escHtml(IND_REDE.ufFocus)}` : " no escopo"
      }.</p>`;
      return;
    }
    el.innerHTML = rows
      .map((r) => {
        const met = indRedeMetricaDe(r);
        const uf = indRedeUfDe(r) || "—";
        const sede = r.municipio_sede
          ? `${escHtml(r.municipio_sede)}/${escHtml(uf)}`
          : escHtml(uf);
        const active =
          IND_REDE.filialFocus === r.filial_id ? " is-active" : "";
        const metaDual =
          indMetrica === "valor"
            ? `${sede} · Est. ${escHtml(fmtMoedaCompact(r.valor || 0))} · Hom. ${escHtml(fmtMoedaCompact(r.valor_homologado || 0))}`
            : `${sede} · Contr. ${indGeoFmtNum(r.total || 0)} · Hom. ${indGeoFmtNum(r.homologadas || 0)}`;
        const metricTitle =
          indMetrica === "valor"
            ? `Estimado ${fmtMoedaBr(r.valor || 0)} · Homologado ${fmtMoedaBr(r.valor_homologado || 0)}`
            : `Contr. ${indGeoFmtNum(r.total || 0)} · Hom. ${indGeoFmtNum(r.homologadas || 0)}`;
        return `<div class="ind-rede-rank-item${active}" data-filial-id="${r.filial_id}" data-uf="${escHtml(uf)}">
          <div class="ind-rede-rank-main">
            <span class="ind-rede-rank-name" title="${escHtml(r.filial_nome || "")}">${escHtml(r.filial_nome || "—")}</span>
            <span class="ind-rede-rank-meta">${metaDual}</span>
          </div>
          <span class="ind-rede-rank-metric" title="${escHtml(metricTitle)}">${escHtml(indRedeFmtMetrica(met))}</span>
          <div class="ind-rede-rank-actions">
            <button type="button" class="btn btn-secondary btn-sm" data-abrir-filial="${r.filial_id}">Abrir visão</button>
          </div>
        </div>`;
      })
      .join("");
    el.querySelectorAll(".ind-rede-rank-item").forEach((item) => {
      item.addEventListener("click", (ev) => {
        if (ev.target.closest("[data-abrir-filial]")) return;
        const id = Number(item.dataset.filialId);
        const uf = item.dataset.uf && item.dataset.uf !== "—" ? item.dataset.uf : null;
        IND_REDE.filialFocus = id;
        if (uf && IND_REDE.ufFocus !== uf) {
          IND_REDE.ufFocus = uf;
          const btn = $("btn-ind-rede-brasil");
          if (btn) btn.hidden = false;
        }
        indRedeRedraw({ skipFit: true });
        const mk = IND_REDE.markersById[id];
        if (mk && IND_REDE.map) {
          IND_REDE.map.panTo(mk.getLatLng());
          mk.openPopup();
        }
      });
    });
    el.querySelectorAll("[data-abrir-filial]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const id = Number(btn.dataset.abrirFilial);
        if (Number.isFinite(id)) aplicarFiltroVisaoPorId(id);
      });
    });
  }

  function indRedePaint() {
    if (!IND_REDE.map || !IND_GEO.geojson) return;
    const porUf = indRedeAggPorUf(IND_REDE.filiais);
    const vals = Object.values(porUf).map((u) => u.metrica);
    const maxUf = Math.max(0, ...vals, 0);
    indRedeRenderLegend(maxUf);

    IND_REDE.geoLayer = L.geoJSON(IND_GEO.geojson, {
      style(feat) {
        const sigla = feat.properties?.sigla;
        const row = porUf[sigla];
        const focused = !IND_REDE.ufFocus || IND_REDE.ufFocus === sigla;
        const has = !!row;
        const t = maxUf > 0 && row ? indGeoNorm(row.metrica, maxUf) : 0;
        return {
          fillColor: has ? indGeoCorEscala(t) : "#efeadd",
          weight: IND_REDE.ufFocus === sigla ? 2.4 : 1,
          color: IND_REDE.ufFocus === sigla ? "#0d1f2a" : "#c8bfaa",
          fillOpacity: focused ? (has ? 0.78 : 0.35) : 0.12,
          opacity: focused ? 1 : 0.35,
        };
      },
      onEachFeature(feat, layer) {
        const sigla = feat.properties?.sigla;
        const row = porUf[sigla];
        const nome = feat.properties?.nome || sigla;
        const tip = row
          ? `<strong>${escHtml(nome)} (${escHtml(sigla)})</strong> · ${indGeoFmtNum(row.filiais)} fil.<br>${indMapLinhaContratacoes(row.total, row.homologadas)} · ${indMapLinhaValores(row.valor, row.valor_homologado)}`
          : `<strong>${escHtml(nome)} (${escHtml(sigla)})</strong><br>Sem filiais no escopo`;
        layer.bindTooltip(tip, indMapTipOpts());
        layer.on({
          mouseover(e) {
            if (!IND_REDE.ufFocus || IND_REDE.ufFocus === sigla) {
              e.target.setStyle({ weight: 2.2, color: "#0d1f2a" });
            }
          },
          mouseout(e) {
            IND_REDE.geoLayer?.resetStyle(e.target);
          },
          click() {
            if (row) indRedeFocarUf(sigla);
          },
        });
      },
    }).addTo(IND_REDE.map);

    const filiaisVis = IND_REDE.filiais.filter((f) => {
      const uf = indRedeUfDe(f);
      if (IND_REDE.ufFocus && uf !== IND_REDE.ufFocus) return false;
      return !!indRedeLatLng(f);
    });
    const maxF = Math.max(0, ...filiaisVis.map(indRedeMetricaDe), 0);
    IND_REDE.bubbleLayer = L.layerGroup().addTo(IND_REDE.map);
    filiaisVis.forEach((f) => {
      const ll = indRedeLatLng(f);
      if (!ll) return;
      const met = indRedeMetricaDe(f);
      const t = maxF > 0 ? Math.sqrt(indGeoNorm(met, maxF)) : 0;
      const radius = 8 + t * 18;
      const active = IND_REDE.filialFocus === f.filial_id;
      const icon = L.divIcon({
        className: "ind-rede-bubble-icon",
        html: `<div class="ind-rede-bubble${active ? " is-active" : ""}" style="width:${radius}px;height:${radius}px"></div>`,
        iconSize: [radius, radius],
        iconAnchor: [radius / 2, radius / 2],
      });
      const marker = L.marker(ll, { icon, riseOnHover: true });
      const sede = f.municipio_sede
        ? `${escHtml(f.municipio_sede)}/${escHtml(indRedeUfDe(f) || "—")}`
        : escHtml(indRedeUfDe(f) || "sem UF");
      marker.bindPopup(
        `<strong>${escHtml(f.filial_nome || "Filial")}</strong> · ${sede}<br>` +
          `${indMapLinhaContratacoes(f.total, f.homologadas)} · ${indMapLinhaValores(f.valor, f.valor_homologado)}<br>` +
          `<button type="button" class="btn btn-primary btn-sm" data-popup-abrir-filial="${f.filial_id}" style="margin-top:0.35rem">Abrir visão</button>`,
        { className: "ind-geo-tooltip", maxWidth: 320 }
      );
      marker.on("click", () => {
        IND_REDE.filialFocus = f.filial_id;
        indRedeRenderRanking();
        Object.entries(IND_REDE.markersById).forEach(([id, mk]) => {
          const bubble = mk.getElement()?.querySelector(".ind-rede-bubble");
          bubble?.classList.toggle("is-active", Number(id) === f.filial_id);
        });
      });
      marker.on("popupopen", () => {
        const btn = document.querySelector(
          `[data-popup-abrir-filial="${f.filial_id}"]`
        );
        btn?.addEventListener(
          "click",
          (ev) => {
            ev.preventDefault();
            aplicarFiltroVisaoPorId(f.filial_id);
          },
          { once: true }
        );
      });
      marker.addTo(IND_REDE.bubbleLayer);
      IND_REDE.markersById[f.filial_id] = marker;
    });
  }

  function indRedeRedraw(opts = {}) {
    if (!IND_REDE.map || !IND_GEO.geojson) return;
    indRedeClearLayers();
    indRedePaint();
    indRedeRenderRanking();
    const foot = $("ind-rede-footer");
    if (foot) {
      const comUf = IND_REDE.filiais.filter((f) => indRedeUfDe(f)).length;
      const ufs = new Set(
        IND_REDE.filiais.map(indRedeUfDe).filter(Boolean)
      ).size;
      const foco = IND_REDE.ufFocus ? ` · foco ${IND_REDE.ufFocus}` : "";
      const sem = IND_REDE.filiais.length - comUf;
      const semTxt = sem > 0 ? ` · ${sem} sem UF` : "";
      foot.textContent = `${indGeoFmtNum(IND_REDE.filiais.length)} filiais · ${indGeoFmtNum(ufs)} UF${foco}${semTxt} · bolha = filial · cor = total da UF`;
    }
    if (!opts.skipFit) indRedeFitBounds();
    setTimeout(() => IND_REDE.map?.invalidateSize(), 80);
  }

  async function indRedeEnsureUfCentroids() {
    if (IND_REDE.ufCentroids) return;
    IND_REDE.ufCentroids = await fetch("/static/geo/uf-centroids.json").then(
      (r) => r.json()
    );
  }

  async function indRedeInitMap() {
    const el = $("ind-rede-map");
    if (!el || IND_REDE.map || !window.L) return;
    IND_REDE.map = L.map(el, {
      zoomControl: true,
      attributionControl: false,
      minZoom: 3,
      maxZoom: 12,
      worldCopyJump: false,
    }).setView([-14.2, -52.5], 4);

    let cartoKey = "";
    try {
      const { res, body } = await api("/api/mapa/basemap");
      if (res.ok) cartoKey = (body?.carto_api_key || "").trim();
    } catch {
      /* basemap opcional */
    }
    const tileUrl = cartoKey
      ? `https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`
      : "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";
    L.tileLayer(tileUrl, {
      subdomains: "abcd",
      maxZoom: 18,
      opacity: 0.55,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(IND_REDE.map);
    L.control
      .attribution({ position: "bottomright", prefix: false })
      .addAttribution(
        'Rede de filiais · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>'
      )
      .addTo(IND_REDE.map);
    setTimeout(() => IND_REDE.map?.invalidateSize(), 80);
  }

  async function ensureIndRedeLoaded(filiais) {
    const painel = $("ind-painel-rede");
    if (!painel || painel.hidden) return;
    IND_REDE.filiais = Array.isArray(filiais) ? filiais.slice() : [];
    if (IND_REDE.loading) return;
    IND_REDE.loading = true;
    const foot = $("ind-rede-footer");
    if (foot && !IND_REDE.map) foot.textContent = "Carregando mapa da rede…";
    try {
      await ensureLeaflet();
      await indGeoEnsureAssets();
      await indRedeEnsureUfCentroids();
      await indRedeInitMap();
      IND_REDE.ready = true;
      indRedeRedraw();
    } catch (err) {
      if (foot) {
        foot.textContent =
          err?.message || "Não foi possível montar o mapa da rede.";
      }
    } finally {
      IND_REDE.loading = false;
    }
  }

  function persistIndQuad() {
    sessionStorage.setItem(IND_QUAD_ANO_KEY, String(indQuadAno));
    sessionStorage.setItem(IND_QUAD_Q_KEY, String(indQuadQ));
  }

  function syncIndPeriodoUi() {
    document.querySelectorAll("#ind-periodo-toggle .ind-periodo-btn").forEach((btn) => {
      const on = btn.dataset.periodo === indPeriodo;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });

    const rotulo = $("ind-periodo-rotulo");
    const formInt = $("form-ind-periodo-intervalo");
    const quadWrap = $("ind-periodo-quad-wrap");
    const isInt = indPeriodo === "intervalo";
    const isQuad = indPeriodo === "quadrimestre";

    if (rotulo) rotulo.hidden = isInt || isQuad;
    if (formInt) formInt.hidden = !isInt;
    if (quadWrap) quadWrap.hidden = !isQuad;

    if (isInt) {
      const ini = $("ind-data-inicio");
      const fim = $("ind-data-fim");
      if (ini && !ini.value) {
        ini.value = sessionStorage.getItem(IND_PERIODO_INI_KEY) || "";
      }
      if (fim && !fim.value) {
        fim.value = sessionStorage.getItem(IND_PERIODO_FIM_KEY) || "";
      }
    }

    if (isQuad) {
      const anoEl = $("ind-quad-ano");
      const range = $("ind-quad-range");
      const qRotulo = $("ind-quad-rotulo");
      if (anoEl) anoEl.textContent = String(indQuadAno);
      if (range) {
        range.value = String(indQuadQ);
        range.setAttribute("aria-valuenow", String(indQuadQ));
      }
      if (qRotulo) {
        qRotulo.textContent = `${indQuadAno} · ${IND_QUAD_LABELS[indQuadQ] || `Q${indQuadQ}`}`;
      }
    }
  }

  function indPeriodoParams() {
    const params = new URLSearchParams();
    params.set("periodo", indPeriodo);
    if (indPeriodo === "intervalo") {
      const ini =
        $("ind-data-inicio")?.value ||
        sessionStorage.getItem(IND_PERIODO_INI_KEY) ||
        "";
      const fim =
        $("ind-data-fim")?.value ||
        sessionStorage.getItem(IND_PERIODO_FIM_KEY) ||
        "";
      if (ini) params.set("data_inicio", ini);
      if (fim) params.set("data_fim", fim);
    } else if (indPeriodo === "quadrimestre") {
      params.set("ano", String(indQuadAno));
      params.set("quadrimestre", String(indQuadQ));
    }
    return params;
  }

  function aplicarPeriodoRotulo(periodoAplicado) {
    const el = $("ind-periodo-rotulo");
    const qRotulo = $("ind-quad-rotulo");
    if (indPeriodo === "quadrimestre") {
      if (qRotulo) {
        qRotulo.textContent = periodoAplicado?.rotulo
          ? periodoAplicado.rotulo
          : `${indQuadAno} · ${IND_QUAD_LABELS[indQuadQ] || `Q${indQuadQ}`}`;
      }
      return;
    }
    if (indPeriodo === "intervalo") {
      // Slot ocupado pelos campos De/Até — sem texto instrucional.
      return;
    }
    if (!el) return;
    if (periodoAplicado?.rotulo) {
      el.textContent = `Período: ${periodoAplicado.rotulo}`;
      return;
    }
    const labels = {
      ano_atual: "Ano atual",
      ano_anterior: "Ano anterior",
      tudo: "Todo o histórico",
    };
    el.textContent = `Período: ${labels[indPeriodo] || indPeriodo}`;
  }

  /** Moeda completa (tooltip/KPI). */
  function fmtIndMetricaFull(n, metrica) {
    const v = Number(n) || 0;
    return metrica === "valor" ? fmtMoedaBr(v) : String(v);
  }

  /** Moeda compacta no gráfico — evita corte; completo fica no title. */
  function fmtMoedaCompact(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "R$ 0";
    const abs = Math.abs(v);
    const sinal = v < 0 ? "-" : "";
    const num = (x, dig) =>
      x.toLocaleString("pt-BR", {
        minimumFractionDigits: dig,
        maximumFractionDigits: dig,
      });
    if (abs >= 1_000_000_000) return `${sinal}R$ ${num(abs / 1e9, 1)} bi`;
    if (abs >= 1_000_000) return `${sinal}R$ ${num(abs / 1e6, 1)} mi`;
    if (abs >= 10_000) return `${sinal}R$ ${num(abs / 1e3, abs >= 100_000 ? 0 : 1)} mil`;
    return fmtMoedaBr(v);
  }

  function fmtIndMetricaChart(n, metrica) {
    const v = Number(n) || 0;
    return metrica === "valor" ? fmtMoedaCompact(v) : String(v);
  }

  function indBarSeriesRow(seriesLabel, fillClass, pct, shown, full) {
    return `<div class="ind-bar-track-row">
      <span class="ind-bar-series-label">${escHtml(seriesLabel)}</span>
      <div class="ind-bar-track"><div class="ind-bar-fill ${fillClass}" style="width:${pct}%"></div></div>
      <span class="ind-bar-series-val" title="${escHtml(full)}">${escHtml(shown)}</span>
    </div>`;
  }

  /**
   * Barras Contratado × Homologado (ou série única para porte).
   * Valor por faixa (não concatenado) — evita ellipsis no modo Valor.
   * opts.limit: teto de itens (default 8; null = todos).
   * opts.secondaryKey: campo opcional (ex. nome_uasg) — nome muted + código.
   * opts.secondaryBefore: se true, descrição na frente do código (Por UASG).
   * Andamento por filial: só tabela (sem barras).
   */
  function renderIndBars(el, items, labelKey, opts = {}) {
    if (!el) return;
    const metrica = opts.metrica || indMetrica;
    const dual = opts.dual !== false;
    const limit = "limit" in opts ? opts.limit : 8;
    const secondaryKey = opts.secondaryKey || null;
    const secondaryBefore = !!opts.secondaryBefore;
    const rowClass = "ind-bar-row";

    if (!items?.length) {
      el.innerHTML = '<p class="ind-bars-empty">Sem dados para o escopo.</p>';
      return;
    }
    const list = limit == null ? items : items.slice(0, limit);
    let max = 1;
    for (const i of list) {
      if (dual) {
        if (metrica === "valor") {
          max = Math.max(
            max,
            Number(i.valor) || 0,
            Number(i.valor_homologado) || 0
          );
        } else {
          max = Math.max(
            max,
            Number(i.total) || 0,
            Number(i.homologadas) || 0
          );
        }
      } else {
        max = Math.max(
          max,
          metrica === "valor" ? Number(i.valor) || 0 : Number(i.total) || 0
        );
      }
    }

    function indBarLabelMarkup(label, secondary, title) {
      const primary = `<span class="ind-bar-label-primary">${escHtml(String(label))}</span>`;
      const desc = `<span class="ind-bar-label-desc muted">${escHtml(secondary)}</span>`;
      const sep = `<span class="ind-bar-label-sep muted" aria-hidden="true"> · </span>`;
      const inner = secondary
        ? secondaryBefore
          ? desc + sep + primary
          : primary + sep + desc
        : escHtml(String(label));
      const cls = secondary
        ? "ind-bar-label ind-bar-label--with-desc" +
          (secondaryBefore ? " ind-bar-label--desc-first" : "")
        : "ind-bar-label";
      return `<span class="${cls}" title="${escHtml(title)}">${inner}</span>`;
    }

    el.innerHTML = list
      .map((i) => {
        const label = i[labelKey] ?? i.nome ?? "—";
        const secondary = secondaryKey
          ? String(i[secondaryKey] || "").trim()
          : "";
        const titleBase = secondary
          ? secondaryBefore
            ? `${secondary} · ${label}`
            : `${label} · ${secondary}`
          : String(label);
        if (!dual) {
          const n = metrica === "valor" ? Number(i.valor) || 0 : Number(i.total) || 0;
          const pct = Math.round((n / max) * 100);
          const shown = fmtIndMetricaChart(n, metrica);
          const full = fmtIndMetricaFull(n, metrica);
          return `<div class="${rowClass}">
            ${indBarLabelMarkup(label, secondary, titleBase)}
            <div class="ind-bar-tracks">
              ${indBarSeriesRow("Homolog.", "ind-bar-fill--homologado", pct, shown, full)}
            </div>
          </div>`;
        }
        const c =
          metrica === "valor" ? Number(i.valor) || 0 : Number(i.total) || 0;
        const h =
          metrica === "valor"
            ? Number(i.valor_homologado) || 0
            : Number(i.homologadas) || 0;
        const pctC = Math.round((c / max) * 100);
        const pctH = Math.round((h / max) * 100);
        const shownC = fmtIndMetricaChart(c, metrica);
        const shownH = fmtIndMetricaChart(h, metrica);
        const fullC = fmtIndMetricaFull(c, metrica);
        const fullH = fmtIndMetricaFull(h, metrica);
        const title = `${titleBase} · Contratado ${fullC} · Homologado ${fullH}`;
        return `<div class="${rowClass}">
          ${indBarLabelMarkup(label, secondary, title)}
          <div class="ind-bar-tracks">
            ${indBarSeriesRow("Contrat.", "ind-bar-fill--contratado", pctC, shownC, fullC)}
            ${indBarSeriesRow("Homolog.", "ind-bar-fill--homologado", pctH, shownH, fullH)}
          </div>
        </div>`;
      })
      .join("");
  }

  function renderIndComparativosCharts(c) {
    if (!c) return;
    const metrica = indMetrica;
    renderIndBars($("ind-bars-uasg"), c.por_uasg, "codigo_uasg", {
      metrica,
      dual: true,
      secondaryKey: "nome_uasg",
      secondaryBefore: true,
    });
    renderIndBars($("ind-bars-mod"), c.por_modalidade, "modalidade", {
      metrica,
      dual: true,
    });
    renderIndBars($("ind-bars-sit"), c.por_situacao, "situacao", {
      metrica,
      dual: true,
    });
    renderIndBars($("ind-bars-porte"), c.por_porte, "porte", {
      metrica,
      dual: false,
    });
  }

  function aplicarLenteIndicadores(lente, modo) {
    const isRede = lente === "rede" || modo === "consolidado";
    const isUnidade = lente === "unidade" || modo === "filial";
    const showRede = isRede || lente === "plataforma";
    const painelRede = $("ind-painel-rede");
    const kpiFiliais = $("ind-kpi-filiais");
    const kpiCobertura = $("ind-kpi-cobertura-acompanhamento");
    const kpiUasgs = $("ind-kpi-uasgs");
    const kpiAcomp = $("ind-kpi-acompanhamentos");
    const blocoUasg = $("ind-bloco-uasg");

    indLenteUnidade = !!isUnidade;
    // Título/badge/Atualizar removidos (padrão denso Compras.gov). Lente = filtro de visão.
    if ($("ind-comp-titulo")) {
      $("ind-comp-titulo").textContent = isUnidade
        ? "Análise da filial"
        : "Comparativos da rede";
    }
    if ($("ind-comp-desc")) {
      $("ind-comp-desc").textContent = isUnidade
        ? "Comparativos e distribuição geográfica dos vencedores — mesmo período e métrica do Início."
        : isRede
          ? "Comparativos da rede — Contratado × Homologado por modalidade e situação; porte = 1 predominante por contratação."
          : "Agregações nativas no escopo — Compras.gov / PNCP.";
    }
    if (painelRede) painelRede.hidden = !showRede;
    if (kpiFiliais) kpiFiliais.hidden = !showRede;
    // Cobertura (com × sem responsável): rede e filial — sinal operacional primário.
    if (kpiCobertura) {
      kpiCobertura.hidden = !(showRede || isUnidade);
      // Atalho para Compras.gov só na visão filial.
      kpiCobertura.classList.toggle("ind-kpi--acao", !!isUnidade);
      if (isUnidade) {
        kpiCobertura.setAttribute("role", "button");
        kpiCobertura.tabIndex = 0;
        kpiCobertura.setAttribute(
          "aria-label",
          "Responsável — ver com responsável em Compras.gov",
        );
        kpiCobertura.title =
          "Contratações com ≥1 responsável nesta filial (preferência operacional — não ACL). Clique para abrir em Compras.gov.";
      } else {
        kpiCobertura.removeAttribute("role");
        kpiCobertura.removeAttribute("tabindex");
        kpiCobertura.removeAttribute("aria-label");
        kpiCobertura.title =
          "Contratações com ≥1 responsável na filial (preferência operacional — não ACL) e sem responsável.";
      }
    }
    // Matriz/rede: UASG é detalhe da filial — não poluir KPI nem comparativos.
    if (kpiUasgs) kpiUasgs.hidden = !!isRede;
    // Contagem pessoal fica na API; UI prioriza cobertura (filtros em Compras/Propostas).
    if (kpiAcomp) kpiAcomp.hidden = true;
    if (blocoUasg) blocoUasg.hidden = !!isRede;
    if (!isUnidade && indAnalise === "geo") {
      indAnalise = "comparativos";
      sessionStorage.setItem(IND_ANALISE_KEY, indAnalise);
    }
    syncIndAnaliseToggle();
  }

  /** KPI Responsável (filial) → Compras.gov com cobertura «Com responsável». */
  function abrirComprasComResponsavel() {
    if (!isVisaoFilial()) return;
    const sel = $("compras-filtro-acompanhamento");
    if (sel) sel.value = "com";
    if (location.hash !== "#compras") location.hash = "compras";
    navigate("compras");
  }

  $("ind-kpi-cobertura-acompanhamento")?.addEventListener("click", (ev) => {
    if (!indLenteUnidade) return;
    ev.preventDefault();
    abrirComprasComResponsavel();
  });
  $("ind-kpi-cobertura-acompanhamento")?.addEventListener("keydown", (ev) => {
    if (!indLenteUnidade) return;
    if (ev.key !== "Enter" && ev.key !== " ") return;
    ev.preventDefault();
    abrirComprasComResponsavel();
  });

  /** Taxa discreta sob KPI dual (homologado / universo). Oculta se base = 0. */
  function setIndKpiTaxa(elId, numerador, denominador, rotulo) {
    const el = $(elId);
    if (!el) return;
    const den = Number(denominador) || 0;
    if (den <= 0) {
      el.hidden = true;
      el.textContent = "";
      el.removeAttribute("title");
      return;
    }
    const num = Number(numerador) || 0;
    const pct = Math.round((num / den) * 1000) / 10; // 1 casa
    const shown = Number.isInteger(pct)
      ? String(pct)
      : pct.toFixed(1).replace(".", ",");
    el.textContent = `${shown}% ${rotulo}`;
    el.title = `${shown}% do universo — ${rotulo}`;
    el.hidden = false;
  }

  async function loadIndicadores() {
    syncIndPeriodoUi();
    const periodoQs = indPeriodoParams();

    // Intervalo sem datas: slot já mostra De/Até — não chama API ainda.
    if (
      indPeriodo === "intervalo" &&
      (!periodoQs.get("data_inicio") || !periodoQs.get("data_fim"))
    ) {
      return;
    }

    const ind = await api(`/api/consultas/indicadores?${periodoQs}`);
    let lente = "plataforma";
    let modo = null;
    if (ind.res.ok) {
      const b = ind.body;
      lente = b.lente || "plataforma";
      modo = b.escopo_modo || null;
      aplicarLenteIndicadores(lente, modo);
      aplicarPeriodoRotulo(b.periodo_aplicado);
      $("ind-contexto").textContent = b.escopo_rotulo
        ? `Escopo: ${b.escopo_rotulo}`
        : b.unidade_nome
          ? `Escopo: ${b.unidade_nome} (${b.unidade_tipo})`
          : "Escopo: plataforma (admin — visão geral).";
      const nCtr = Number(b.contratacoes) || 0;
      const nHom = Number(b.contratacoes_homologadas) || 0;
      const vCtr = Number(b.valor_contratacoes) || 0;
      const vHom = Number(b.valor_contratacoes_homologadas) || 0;
      const fmtQtd = (n) => n.toLocaleString("pt-BR");
      $("ind-contratacoes").textContent = fmtQtd(nCtr);
      $("ind-contratacoes").title = fmtQtd(nCtr);
      if ($("ind-contratacoes-homologadas")) {
        $("ind-contratacoes-homologadas").textContent = fmtQtd(nHom);
        $("ind-contratacoes-homologadas").title = fmtQtd(nHom);
      }
      // Compacto na face (mi/bi); completo no title — evita ellipsis no dual.
      if ($("ind-valor-contratacoes")) {
        $("ind-valor-contratacoes").textContent = fmtMoedaCompact(vCtr);
        $("ind-valor-contratacoes").title = fmtMoedaBr(vCtr);
      }
      if ($("ind-valor-homologadas")) {
        $("ind-valor-homologadas").textContent = fmtMoedaCompact(vHom);
        $("ind-valor-homologadas").title = fmtMoedaBr(vHom);
      }
      setIndKpiTaxa("ind-contratacoes-taxa", nHom, nCtr, "homologadas");
      setIndKpiTaxa("ind-valor-taxa", vHom, vCtr, "homologado");
      const nCom = Number(b.contratacoes_com_acompanhamento) || 0;
      const nSem =
        b.contratacoes_sem_acompanhamento != null
          ? Number(b.contratacoes_sem_acompanhamento) || 0
          : Math.max(0, nCtr - nCom);
      if ($("ind-acompanhamento-com")) {
        $("ind-acompanhamento-com").textContent = fmtQtd(nCom);
        $("ind-acompanhamento-com").title = fmtQtd(nCom);
      }
      if ($("ind-acompanhamento-sem")) {
        $("ind-acompanhamento-sem").textContent = fmtQtd(nSem);
        $("ind-acompanhamento-sem").title = fmtQtd(nSem);
      }
      setIndKpiTaxa("ind-acompanhamento-taxa", nCom, nCtr, "com responsável");
      $("ind-uasgs").textContent =
        b.uasgs_monitoradas != null ? String(b.uasgs_monitoradas) : "—";
      $("ind-municipios").textContent =
        b.municipios_ativos != null ? String(b.municipios_ativos) : "—";
      if ($("ind-filiais")) {
        $("ind-filiais").textContent =
          b.filiais_no_escopo != null ? String(b.filiais_no_escopo) : "—";
      }
      if ($("ind-acompanhamentos-meus")) {
        $("ind-acompanhamentos-meus").textContent = String(
          b.acompanhamentos_meus ?? 0
        );
      }
    } else {
      aplicarPeriodoRotulo(null);
      const detail = ind.body?.detail;
      if ($("ind-contexto") && detail) {
        $("ind-contexto").textContent =
          typeof detail === "string" ? detail : "Falha ao carregar indicadores.";
      }
    }

    const comp = await api(`/api/consultas/comparativos?${periodoQs}`);
    if (comp.res.ok) {
      const c = comp.body;
      indCompCache = c;
      if (c.lente) lente = c.lente;
      if (c.escopo_modo) modo = c.escopo_modo;
      aplicarLenteIndicadores(lente, modo);
      if (c.periodo_aplicado) aplicarPeriodoRotulo(c.periodo_aplicado);
      syncIndMetricaToggle();
      renderIndComparativosCharts(c);

      const tf = $("tbody-comp-filial");
      if (tf) {
        tf.innerHTML = (c.por_filial || []).length
          ? c.por_filial
              .map((r) => {
                const v = fmtMoedaBr(r.valor ?? 0);
                const vh = fmtMoedaBr(r.valor_homologado ?? 0);
                const com = r.com_acompanhamento ?? 0;
                const sem =
                  r.sem_acompanhamento != null
                    ? r.sem_acompanhamento
                    : Math.max(0, (r.total ?? 0) - com);
                const uf = (r.uf || "").trim().toUpperCase() || "—";
                return `<tr>
                  <td>${escHtml(r.filial_nome)}</td>
                  <td>${escHtml(uf)}</td>
                  <td>${escHtml(r.filial_codigo || "—")}</td>
                  <td>${r.uasgs ?? 0}</td>
                  <td>${r.total ?? 0}</td>
                  <td>${r.homologadas ?? 0}</td>
                  <td title="Com responsável (usuário da filial)">${com}</td>
                  <td title="Sem responsável">${sem}</td>
                  <td class="td-money" title="${escHtml(v)}">${escHtml(v)}</td>
                  <td class="td-money" title="${escHtml(vh)}">${escHtml(vh)}</td>
                  <td>${r.municipios ?? 0}</td>
                </tr>`;
              })
              .join("")
          : '<tr><td colspan="11" class="muted">Nenhuma filial no escopo.</td></tr>';
      }
      // Mapa da rede (matriz): mesmos dados de por_filial — isolado do mapa de vencedores.
      if (!indLenteUnidade && (c.por_filial || []).length >= 0) {
        IND_REDE.ufFocus = null;
        IND_REDE.filialFocus = null;
        const btnBr = $("btn-ind-rede-brasil");
        if (btnBr) btnBr.hidden = true;
        ensureIndRedeLoaded(c.por_filial || []);
      }
    }
    // Listagem analítica: exclusiva de Compras.gov (não no Início).
    if (indLenteUnidade && indAnalise === "geo") {
      ensureIndGeoLoaded(true);
    }
  }

  $("ind-analise-toggle")?.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".ind-analise-btn");
    if (!btn?.dataset.analise) return;
    setIndAnalise(btn.dataset.analise);
  });

  $("ind-geo-mode-toggle")?.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".ind-geo-mode-btn");
    if (!btn?.dataset.mode) return;
    const next = btn.dataset.mode === "calor" ? "calor" : "estados";
    if (next === IND_GEO.mode) return;
    IND_GEO.mode = next;
    document.querySelectorAll("#ind-geo-mode-toggle .ind-geo-mode-btn").forEach((b) => {
      const on = b.dataset.mode === next;
      b.classList.toggle("active", on);
    });
    indGeoRedraw();
  });

  $("btn-ind-geo-brasil")?.addEventListener("click", () => indGeoFocarUf(null));

  $("btn-ind-geo-fs")?.addEventListener("click", async () => {
    const shell = $("ind-geo-shell");
    const btn = $("btn-ind-geo-fs");
    if (!shell || !btn) return;
    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      } else if (shell.requestFullscreen) {
        await shell.requestFullscreen();
      }
    } catch {
      /* fullscreen pode falhar sem gesto / política */
    }
    const on = document.fullscreenElement === shell;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      on ? "Sair da tela cheia" : "Abrir mapa em tela cheia"
    );
    setTimeout(() => IND_GEO.map?.invalidateSize(), 120);
  });

  document.addEventListener("fullscreenchange", () => {
    const shellGeo = $("ind-geo-shell");
    const btnGeo = $("btn-ind-geo-fs");
    if (btnGeo) {
      const onGeo = document.fullscreenElement === shellGeo;
      btnGeo.setAttribute("aria-pressed", onGeo ? "true" : "false");
      btnGeo.setAttribute(
        "aria-label",
        onGeo ? "Sair da tela cheia" : "Abrir mapa em tela cheia"
      );
    }
    const shellRede = $("ind-rede-shell");
    const btnRede = $("btn-ind-rede-fs");
    if (btnRede) {
      const onRede = document.fullscreenElement === shellRede;
      btnRede.setAttribute("aria-pressed", onRede ? "true" : "false");
      btnRede.setAttribute(
        "aria-label",
        onRede ? "Sair da tela cheia" : "Abrir mapa da rede em tela cheia"
      );
    }
    setTimeout(() => {
      IND_GEO.map?.invalidateSize();
      IND_REDE.map?.invalidateSize();
    }, 120);
  });

  $("ind-metrica-toggle")?.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".ind-metrica-btn");
    if (!btn?.dataset.metrica) return;
    const next = btn.dataset.metrica;
    if (next !== "quantidade" && next !== "valor") return;
    if (next === indMetrica) return;
    indMetrica = next;
    sessionStorage.setItem(IND_METRICA_KEY, indMetrica);
    syncIndMetricaToggle();
    renderIndComparativosCharts(indCompCache);
    if (indLenteUnidade && indAnalise === "geo" && IND_GEO.data) {
      indGeoRedraw();
    }
    if (!indLenteUnidade && IND_REDE.ready) {
      indRedeRedraw({ skipFit: true });
    }
  });

  $("btn-ind-rede-brasil")?.addEventListener("click", () => indRedeFocarUf(null));

  $("btn-ind-rede-fs")?.addEventListener("click", async () => {
    const shell = $("ind-rede-shell");
    const btn = $("btn-ind-rede-fs");
    if (!shell) return;
    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      } else {
        await shell.requestFullscreen();
      }
    } catch {
      /* fullscreen pode falhar em iframe */
    }
    const on = document.fullscreenElement === shell;
    if (btn) {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        on ? "Sair da tela cheia" : "Abrir mapa da rede em tela cheia"
      );
    }
    setTimeout(() => IND_REDE.map?.invalidateSize(), 120);
  });
  $("ind-periodo-toggle")?.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".ind-periodo-btn");
    if (!btn?.dataset.periodo) return;
    const next = btn.dataset.periodo;
    if (!IND_PERIODOS_OK.has(next)) return;
    if (next === indPeriodo && next !== "intervalo") return;
    indPeriodo = next;
    sessionStorage.setItem(IND_PERIODO_KEY, indPeriodo);
    if (indPeriodo === "quadrimestre") {
      // Ao entrar: ano/Q correntes se ainda não houver escolha persistida
      if (!sessionStorage.getItem(IND_QUAD_ANO_KEY)) {
        indQuadAno = new Date().getFullYear();
      }
      if (!sessionStorage.getItem(IND_QUAD_Q_KEY)) {
        indQuadQ = indQuadCorrente();
      }
      persistIndQuad();
    }
    syncIndPeriodoUi();
    if (indPeriodo === "intervalo") {
      const ini = $("ind-data-inicio")?.value;
      const fim = $("ind-data-fim")?.value;
      if (!ini || !fim) return;
    }
    loadIndicadores();
  });
  $("form-ind-periodo-intervalo")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const ini = $("ind-data-inicio")?.value;
    const fim = $("ind-data-fim")?.value;
    if (!ini || !fim) return;
    if (ini > fim) {
      const fimEl = $("ind-data-fim");
      if (fimEl) fimEl.setCustomValidity("Até deve ser ≥ De");
      fimEl?.reportValidity();
      fimEl?.setCustomValidity("");
      return;
    }
    indPeriodo = "intervalo";
    sessionStorage.setItem(IND_PERIODO_KEY, indPeriodo);
    sessionStorage.setItem(IND_PERIODO_INI_KEY, ini);
    sessionStorage.setItem(IND_PERIODO_FIM_KEY, fim);
    syncIndPeriodoUi();
    loadIndicadores();
  });

  function aplicarIndQuadERecarregar() {
    indPeriodo = "quadrimestre";
    sessionStorage.setItem(IND_PERIODO_KEY, indPeriodo);
    persistIndQuad();
    syncIndPeriodoUi();
    loadIndicadores();
  }

  $("ind-quad-ano-prev")?.addEventListener("click", () => {
    indQuadAno = Math.max(2000, indQuadAno - 1);
    aplicarIndQuadERecarregar();
  });
  $("ind-quad-ano-next")?.addEventListener("click", () => {
    indQuadAno = Math.min(2100, indQuadAno + 1);
    aplicarIndQuadERecarregar();
  });
  $("ind-quad-range")?.addEventListener("input", (ev) => {
    const v = Number(ev.target.value);
    if (v !== 1 && v !== 2 && v !== 3) return;
    indQuadQ = v;
    const qRotulo = $("ind-quad-rotulo");
    if (qRotulo) {
      qRotulo.textContent = `${indQuadAno} · ${IND_QUAD_LABELS[indQuadQ]}`;
    }
    ev.target.setAttribute("aria-valuenow", String(indQuadQ));
  });
  $("ind-quad-range")?.addEventListener("change", (ev) => {
    const v = Number(ev.target.value);
    if (v !== 1 && v !== 2 && v !== 3) return;
    indQuadQ = v;
    aplicarIndQuadERecarregar();
  });

  syncIndMetricaToggle();
  syncIndPeriodoUi();

  /* ========== Compras.gov — consulta analítica ========== */
  const COMPRAS_PERIODO_KEY = "osb50_compras_periodo";
  const COMPRAS_PERIODO_INI_KEY = "osb50_compras_periodo_ini";
  const COMPRAS_PERIODO_FIM_KEY = "osb50_compras_periodo_fim";
  const COMPRAS_QUAD_ANO_KEY = "osb50_compras_quad_ano";
  const COMPRAS_QUAD_Q_KEY = "osb50_compras_quad_q";
  const COMPRAS_PERIODOS_OK = new Set([
    "ano_atual",
    "ano_anterior",
    "quadrimestre",
    "intervalo",
    "tudo",
  ]);

  let comprasPeriodo = (() => {
    let raw = sessionStorage.getItem(COMPRAS_PERIODO_KEY) || "ano_atual";
    if (raw === "quadrimestre_atual") raw = "quadrimestre";
    return COMPRAS_PERIODOS_OK.has(raw) ? raw : "ano_atual";
  })();
  let comprasQuadAno = (() => {
    const n = Number(sessionStorage.getItem(COMPRAS_QUAD_ANO_KEY));
    return Number.isFinite(n) && n >= 2000 && n <= 2100
      ? n
      : new Date().getFullYear();
  })();
  let comprasQuadQ = (() => {
    const n = Number(sessionStorage.getItem(COMPRAS_QUAD_Q_KEY));
    return n === 1 || n === 2 || n === 3 ? n : indQuadCorrente();
  })();

  let comprasLastItems = [];
  let comprasSortKey = null;
  let comprasSortDir = "asc";
  let comprasFiltrosCarregados = false;
  const COMPRAS_PAGE_SIZE = 50;
  let comprasPage = 1;
  let comprasTotal = 0;
  let comprasPageSize = COMPRAS_PAGE_SIZE;
  const _msRegistry = new WeakMap();
  let _msDocWired = false;

  function _msWireDocClose() {
    if (_msDocWired) return;
    _msDocWired = true;
    document.addEventListener("click", (ev) => {
      document.querySelectorAll(".ms.ms-open").forEach((host) => {
        if (host.contains(ev.target)) return;
        _msRegistry.get(host)?.close();
      });
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;
      document.querySelectorAll(".ms.ms-open").forEach((host) => {
        _msRegistry.get(host)?.close();
      });
    });
  }

  function createMultiSelect(host, opts = {}) {
    if (!host) return null;
    const cached = _msRegistry.get(host);
    if (cached) return cached;
    const placeholder = opts.placeholder || host.dataset.placeholder || "Todas";
    host.classList.add("ms");
    host.innerHTML = `
      <button type="button" class="ms-trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="ms-summary">${escHtml(placeholder)}</span>
        <span class="ms-caret" aria-hidden="true"></span>
      </button>
      <div class="ms-dropdown" hidden role="listbox" aria-multiselectable="true">
        <div class="ms-toolbar">
          <button type="button" class="ms-tool" data-ms-action="all">Marcar todas</button>
          <button type="button" class="ms-tool" data-ms-action="clear">Limpar</button>
        </div>
        <div class="ms-options"></div>
        <p class="ms-empty muted" hidden>Nenhuma opção disponível</p>
      </div>`;
    const trigger = host.querySelector(".ms-trigger");
    const summary = host.querySelector(".ms-summary");
    const dropdown = host.querySelector(".ms-dropdown");
    const optionsEl = host.querySelector(".ms-options");
    const emptyEl = host.querySelector(".ms-empty");
    let options = [];

    function selected() {
      return Array.from(host.querySelectorAll(".ms-opt input:checked")).map(
        (i) => i.value,
      );
    }
    function updateSummary() {
      const vals = selected();
      const n = vals.length;
      trigger.classList.toggle("ms-active", n > 0);
      summary.classList.toggle("ms-has", n > 0);
      if (!n) {
        summary.textContent = placeholder;
        return;
      }
      const labels = vals.map(
        (v) => options.find((o) => String(o.value) === String(v))?.label || v,
      );
      if (n === 1) summary.textContent = labels[0];
      else if (n === 2) summary.textContent = labels.join(", ");
      else summary.textContent = `${n} selecionadas`;
    }
    function setOpen(next) {
      dropdown.hidden = !next;
      trigger.setAttribute("aria-expanded", next ? "true" : "false");
      host.classList.toggle("ms-open", next);
    }
    function emitChange() {
      updateSummary();
      host.dispatchEvent(new Event("change", { bubbles: true }));
    }
    function renderOptions(keepSelection) {
      const prev = keepSelection ? new Set(selected()) : new Set();
      optionsEl.innerHTML = options
        .map((o) => {
          const checked = prev.has(String(o.value)) ? " checked" : "";
          return `<label class="ms-opt">
            <input type="checkbox" value="${escHtml(String(o.value))}"${checked} />
            <span>${escHtml(o.label)}</span>
          </label>`;
        })
        .join("");
      emptyEl.hidden = options.length > 0;
      updateSummary();
    }

    trigger.addEventListener("click", (ev) => {
      ev.preventDefault();
      const willOpen = dropdown.hidden;
      document.querySelectorAll(".ms.ms-open").forEach((other) => {
        if (other !== host) _msRegistry.get(other)?.close();
      });
      setOpen(willOpen);
    });
    dropdown.addEventListener("click", (ev) => ev.stopPropagation());
    optionsEl.addEventListener("change", (ev) => {
      if (ev.target?.matches?.("input[type=checkbox]")) emitChange();
    });

    const apiMs = {
      setOptions(items, { keepSelection = true } = {}) {
        options = (items || []).map((it) =>
          typeof it === "object" && it != null
            ? { value: String(it.value), label: String(it.label ?? it.value) }
            : { value: String(it), label: String(it) },
        );
        renderOptions(keepSelection);
        return apiMs;
      },
      getValues() {
        return selected();
      },
      clear({ silent = false } = {}) {
        host.querySelectorAll(".ms-opt input").forEach((inp) => {
          inp.checked = false;
        });
        if (silent) updateSummary();
        else emitChange();
        return apiMs;
      },
      close() {
        setOpen(false);
      },
    };
    dropdown
      .querySelector('[data-ms-action="all"]')
      ?.addEventListener("click", () => {
        host.querySelectorAll(".ms-opt input").forEach((inp) => {
          inp.checked = true;
        });
        emitChange();
      });
    dropdown
      .querySelector('[data-ms-action="clear"]')
      ?.addEventListener("click", () => {
        apiMs.clear();
      });
    _msRegistry.set(host, apiMs);
    _msWireDocClose();
    updateSummary();
    return apiMs;
  }

  function multiSelectOf(sel) {
    const host = typeof sel === "string" ? $(sel.replace(/^#/, "")) || document.querySelector(sel) : sel;
    if (!host) return null;
    return _msRegistry.get(host) || createMultiSelect(host);
  }

  function comprasTipoLabel(tipos) {
    const codigos = new Set(
      (tipos || []).map((t) => String(t).trim().toUpperCase()),
    );
    if (codigos.has("M") && codigos.has("S")) return "Material e Serviço";
    if (codigos.has("M")) return "Material";
    if (codigos.has("S")) return "Serviço";
    return "—";
  }

  function persistComprasQuad() {
    sessionStorage.setItem(COMPRAS_QUAD_ANO_KEY, String(comprasQuadAno));
    sessionStorage.setItem(COMPRAS_QUAD_Q_KEY, String(comprasQuadQ));
  }

  function syncComprasPeriodoUi() {
    document
      .querySelectorAll("#compras-periodo-toggle .ind-periodo-btn")
      .forEach((btn) => {
        const on = btn.dataset.periodo === comprasPeriodo;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
      });
    const rotulo = $("compras-periodo-rotulo");
    const formInt = $("form-compras-periodo-intervalo");
    const quadWrap = $("compras-periodo-quad-wrap");
    const isInt = comprasPeriodo === "intervalo";
    const isQuad = comprasPeriodo === "quadrimestre";
    if (rotulo) rotulo.hidden = isInt || isQuad;
    if (formInt) formInt.hidden = !isInt;
    if (quadWrap) quadWrap.hidden = !isQuad;
    if (isInt) {
      const ini = $("compras-data-inicio");
      const fim = $("compras-data-fim");
      if (ini && !ini.value) {
        ini.value = sessionStorage.getItem(COMPRAS_PERIODO_INI_KEY) || "";
      }
      if (fim && !fim.value) {
        fim.value = sessionStorage.getItem(COMPRAS_PERIODO_FIM_KEY) || "";
      }
    }
    if (isQuad) {
      const anoEl = $("compras-quad-ano");
      const range = $("compras-quad-range");
      const qRotulo = $("compras-quad-rotulo");
      if (anoEl) anoEl.textContent = String(comprasQuadAno);
      if (range) {
        range.value = String(comprasQuadQ);
        range.setAttribute("aria-valuenow", String(comprasQuadQ));
      }
      if (qRotulo) {
        qRotulo.textContent = `${comprasQuadAno} · ${
          IND_QUAD_LABELS[comprasQuadQ] || `Q${comprasQuadQ}`
        }`;
      }
    }
    if (!isInt && !isQuad && rotulo) {
      const labels = {
        ano_atual: "Ano atual",
        ano_anterior: "Ano anterior",
        tudo: "Todo o histórico",
      };
      rotulo.textContent = `Período: ${labels[comprasPeriodo] || comprasPeriodo}`;
    }
  }

  function comprasPeriodoParams() {
    const params = new URLSearchParams();
    params.set("periodo", comprasPeriodo);
    if (comprasPeriodo === "intervalo") {
      const ini =
        $("compras-data-inicio")?.value ||
        sessionStorage.getItem(COMPRAS_PERIODO_INI_KEY) ||
        "";
      const fim =
        $("compras-data-fim")?.value ||
        sessionStorage.getItem(COMPRAS_PERIODO_FIM_KEY) ||
        "";
      if (ini) params.set("data_inicio", ini);
      if (fim) params.set("data_fim", fim);
    } else if (comprasPeriodo === "quadrimestre") {
      params.set("ano", String(comprasQuadAno));
      params.set("quadrimestre", String(comprasQuadQ));
    }
    return params;
  }

  function aplicarComprasPeriodoRotulo(periodoAplicado) {
    const rotulo = $("compras-periodo-rotulo");
    const qRotulo = $("compras-quad-rotulo");
    if (comprasPeriodo === "quadrimestre") {
      if (qRotulo) {
        qRotulo.textContent = periodoAplicado?.rotulo
          ? periodoAplicado.rotulo
          : `${comprasQuadAno} · ${IND_QUAD_LABELS[comprasQuadQ] || `Q${comprasQuadQ}`}`;
      }
      return;
    }
    if (comprasPeriodo === "intervalo") return;
    if (!rotulo) return;
    if (periodoAplicado?.rotulo) {
      rotulo.textContent = `Período: ${periodoAplicado.rotulo}`;
      return;
    }
    syncComprasPeriodoUi();
  }

  function fillSelect(el, values, emptyLabel) {
    if (!el) return;
    const cur = el.value;
    el.innerHTML =
      `<option value="">${escHtml(emptyLabel)}</option>` +
      (values || [])
        .map((v) => {
          if (typeof v === "object" && v) {
            const val = String(v.value ?? v.codigo ?? "");
            const lab = String(v.label ?? v.nome ?? val);
            return `<option value="${escHtml(val)}">${escHtml(
              v.nome ? `${val} · ${lab}` : lab,
            )}</option>`;
          }
          return `<option value="${escHtml(v)}">${escHtml(v)}</option>`;
        })
        .join("");
    if (cur && Array.from(el.options).some((o) => o.value === cur)) {
      el.value = cur;
    }
  }

  async function carregarComprasFiltros() {
    const { res, body } = await api("/api/compras/filtros");
    if (!res.ok) return;
    const uasgs = (body.uasgs || []).map((u) => ({
      value: u.codigo,
      label: u.nome ? `${u.codigo} · ${u.nome}` : u.codigo,
      nome: u.nome,
      codigo: u.codigo,
    }));
    const uasgEl = $("compras-filtro-uasg");
    if (uasgEl) {
      const cur = uasgEl.value;
      uasgEl.innerHTML =
        '<option value="">Todas do escopo</option>' +
        uasgs
          .map(
            (u) =>
              `<option value="${escHtml(u.value)}">${escHtml(u.label)}</option>`,
          )
          .join("");
      if (cur) uasgEl.value = cur;
    }
    fillSelect($("compras-filtro-situacao"), body.situacoes || [], "Todas");
    multiSelectOf("#compras-filtro-modalidade")?.setOptions(
      (body.modalidades || []).map((m) => ({
        value: String(m.codigo),
        label: `${m.codigo} · ${m.nome}`,
      })),
    );
    comprasFiltrosCarregados = true;
  }

  function comprasFiltroParams() {
    const params = comprasPeriodoParams();
    const uasg = $("compras-filtro-uasg")?.value?.trim();
    const situacao = $("compras-filtro-situacao")?.value?.trim();
    const tipo = $("compras-filtro-tipo")?.value?.trim();
    const processo = $("compras-filtro-processo")?.value?.trim();
    const numero = $("compras-filtro-numero")?.value?.trim();
    const q = $("compras-filtro-q")?.value?.trim();
    const acompanhamento = $("compras-filtro-acompanhamento")?.value?.trim();
    if (uasg) params.set("codigo_uasg", uasg);
    if (situacao) params.set("situacao", situacao);
    if (tipo) params.set("material_ou_servico", tipo);
    if (processo) params.set("processo", processo);
    if (numero) params.set("numero", numero);
    if (q) params.set("q", q);
    if (
      acompanhamento === "minhas" ||
      acompanhamento === "sem" ||
      acompanhamento === "com" ||
      acompanhamento === "sem_resp"
    ) {
      params.set("acompanhamento", acompanhamento);
    }
    (multiSelectOf("#compras-filtro-modalidade")?.getValues() || []).forEach(
      (cod) => {
        if (cod) params.append("modalidade_codigo", cod);
      },
    );
    params.set("page", String(Math.max(1, comprasPage || 1)));
    params.set("page_size", String(COMPRAS_PAGE_SIZE));
    if (comprasSortKey) {
      params.set("sort", comprasSortKey);
      params.set("sort_dir", comprasSortDir === "desc" ? "desc" : "asc");
    }
    return params;
  }

  function limparComprasFiltros() {
    const form = $("form-compras-busca");
    if (form) form.reset();
    multiSelectOf("#compras-filtro-modalidade")?.clear({ silent: true });
    comprasSortKey = null;
    comprasSortDir = "asc";
    comprasPage = 1;
  }

  function comprasMaxPage() {
    const size = Math.max(1, comprasPageSize || COMPRAS_PAGE_SIZE);
    return Math.max(1, Math.ceil((comprasTotal || 0) / size));
  }

  function syncComprasPager() {
    const pager = $("compras-pager");
    const label = $("compras-pager-label");
    const prev = $("compras-page-prev");
    const next = $("compras-page-next");
    if (!pager) return;
    const total = comprasTotal || 0;
    const size = Math.max(1, comprasPageSize || COMPRAS_PAGE_SIZE);
    const maxP = comprasMaxPage();
    if (comprasPage > maxP) comprasPage = maxP;
    const show = total > size;
    pager.hidden = !show;
    if (!show) return;
    const from = total === 0 ? 0 : (comprasPage - 1) * size + 1;
    const to = Math.min(total, comprasPage * size);
    if (label) {
      label.textContent = `${from}–${to} de ${total} · pág. ${comprasPage}/${maxP}`;
    }
    if (prev) prev.disabled = comprasPage <= 1;
    if (next) next.disabled = comprasPage >= maxP;
  }

  const COMPRAS_COLS = 9;
  let comprasModalId = null;
  let comprasModalAcompanhada = false;

  function markComprasSortHeaders() {
    document.querySelectorAll("#compras-tabela-head th.sortable").forEach((th) => {
      th.classList.toggle("sort-asc", th.dataset.sort === comprasSortKey && comprasSortDir === "asc");
      th.classList.toggle("sort-desc", th.dataset.sort === comprasSortKey && comprasSortDir === "desc");
    });
  }

  /** Pill do responsável: «Eu» ou username. */
  function pillResponsavel(obj) {
    const r = obj?.responsavel;
    if (!r || (!r.username && r.id == null)) return "";
    const minha = !!obj.acompanhada_por_mim;
    const label = minha ? "Eu" : String(r.username || r.id);
    const title = minha
      ? "Você é o responsável"
      : `Responsável: ${r.username || r.id}`;
    return ` <span class="pill-acomp" title="${escHtml(title)}">${escHtml(
      label,
    )}</span>`;
  }

  function metaResponsavel(obj) {
    const r = obj?.responsavel;
    if (!r) return "";
    if (obj.acompanhada_por_mim) return " · Você é o responsável";
    return ` · Responsável: ${r.username || r.id}`;
  }

  let comprasModalResponsavel = null;

  function syncBtnComprasAcompanhar() {
    const btn = $("btn-compras-acompanhar");
    if (!btn) return;
    if (!comprasModalId || !isVisaoFilial()) {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    btn.disabled = false;
    if (comprasModalAcompanhada) {
      btn.textContent = "Deixar de acompanhar";
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-secondary");
      btn.title = "Deixa de ser o responsável desta contratação";
    } else {
      const outro = comprasModalResponsavel?.username;
      btn.textContent = "Assumir";
      btn.classList.add("btn-primary");
      btn.classList.remove("btn-secondary");
      btn.title = outro
        ? `Assume no lugar de ${outro} (1 responsável por contratação)`
        : "Assume o acompanhamento nesta filial (1 responsável — não altera permissões)";
    }
  }

  function renderComprasTabela() {
    const tbody = $("tbody-contratacoes");
    if (!tbody) return;
    markComprasSortHeaders();
    if (!comprasLastItems.length) {
      tbody.innerHTML =
        `<tr><td colspan="${COMPRAS_COLS}" class="muted">Nenhuma contratação neste filtro. ` +
        "Ajuste o período/filtros ou sincronize via Coleta / Território.</td></tr>";
      return;
    }
    // Ordem vem do servidor (sort global antes da paginação).
    const items = comprasLastItems;
    tbody.innerHTML = items
      .map((c) => {
        const num = c.numero || c.id_compra || "—";
        const mod = c.modalidade_descricao || "";
        const numTitle = mod ? `${num} · ${mod}` : String(num);
        const uasgLabel = c.unidade_nome
          ? `${c.unidade_compradora} · ${c.unidade_nome}`
          : c.unidade_compradora || "—";
        const temResp = !!c.responsavel;
        const mark = pillResponsavel(c);
        // Objeto: filtro (q) + modal — fora da grade para liberar colunas operacionais.
        return `<tr data-id="${c.id}" class="${temResp ? "compras-row--acomp" : ""}" title="Ver detalhes — objeto no modal">
          <td class="col-num-compra" title="${escHtml(numTitle)}"><strong>${escHtml(num)}</strong>${
            mod ? ` <span class="pill-mod">${escHtml(mod)}</span>` : ""
          }${mark}</td>
          <td class="col-processo">${escHtml(c.processo || "—")}</td>
          <td class="col-uasg" title="${escHtml(uasgLabel)}">${escHtml(c.unidade_compradora || "—")}</td>
          <td class="col-num col-ano">${escHtml(c.ano || "—")}</td>
          <td class="col-situacao">${
            c.situacao
              ? `<span class="pill-sit">${escHtml(c.situacao)}</span>`
              : "—"
          }</td>
          <td class="col-num col-money">${escHtml(c.valor_total_estimado || "—")}</td>
          <td class="col-num col-money">${escHtml(c.valor_total_homologado || "—")}</td>
          <td class="col-pncp" title="${escHtml(c.numero_controle_pncp || "")}">${escHtml(
            c.numero_controle_pncp || "—",
          )}</td>
          <td class="col-tipo">${escHtml(comprasTipoLabel(c.tipos_item))}</td>
        </tr>`;
      })
      .join("");
    tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => abrirDetalheCompra(tr.dataset.id));
    });
  }

  function dlPairs(el, pairs) {
    if (!el) return;
    el.innerHTML = pairs
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(
        ([k, v]) =>
          `<dt>${escHtml(k)}</dt><dd>${
            k === "Link PNCP"
              ? `<a href="${escHtml(v)}" target="_blank" rel="noopener">Abrir no PNCP</a>`
              : escHtml(v)
          }</dd>`,
      )
      .join("");
  }

  async function abrirDetalheCompra(id) {
    const { res, body } = await api(`/api/compras/contratacoes/${id}`);
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao carregar detalhe.");
      return;
    }
    const dlg = $("modal-compras");
    comprasModalId = body.id || Number(id);
    comprasModalAcompanhada = !!body.acompanhada_por_mim;
    comprasModalResponsavel = body.responsavel || null;
    syncBtnComprasAcompanhar();
    $("modal-compras-titulo").textContent =
      body.numero_controle_pncp || body.numero || body.id_compra || "Detalhe";
    $("modal-compras-meta").textContent =
      `UASG ${body.unidade_compradora} · ${body.modalidade_descricao || "—"} · ${
        body.situacao || "—"
      }${metaResponsavel(body)}`;
    dlPairs($("modal-compras-ident"), [
      ["Nº compra", body.numero],
      ["Modalidade", body.modalidade_descricao],
      ["Processo", body.processo],
      ["Ano", body.ano],
      ["Situação", body.situacao],
      ["Id compra", body.id_compra],
      [
        "Responsável",
        body.acompanhada_por_mim
          ? "Você"
          : body.responsavel?.username || "—",
      ],
    ]);
    dlPairs($("modal-compras-prazos"), [
      ["Publicação PNCP", body.data_publicacao_pncp],
      ["Abertura propostas", body.data_abertura_proposta_pncp],
      ["Encerramento", body.data_encerramento_proposta_pncp],
      ["Valor estimado", body.valor_total_estimado],
      ["Valor homologado", body.valor_total_homologado],
    ]);
    dlPairs($("modal-compras-orgao"), [
      ["UASG", body.unidade_compradora],
      ["Unidade", body.unidade_nome],
    ]);
    dlPairs($("modal-compras-refs"), [
      ["Nº controle PNCP", body.numero_controle_pncp],
      ["Link PNCP", body.link_pncp],
      ["Tipo itens", comprasTipoLabel(body.tipos_item)],
    ]);
    $("modal-compras-objeto").textContent = body.objeto || "Sem objeto.";
    const nItens = body.itens?.length || 0;
    $("modal-compras-itens-meta").textContent = `${nItens} item(ns) sincronizado(s)`;
    const tbody = $("modal-compras-itens");
    if (!nItens) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="muted">Sem itens sincronizados.</td></tr>';
    } else {
      tbody.innerHTML = body.itens
        .map((it) => {
          const resumo =
            (it.resultados || [])
              .map(
                (r) =>
                  `${r.nome_razao_social_fornecedor || r.ni_fornecedor || "—"}: ${
                    r.valor_total_homologado || "—"
                  }`,
              )
              .join("; ") || "—";
          const tipo =
            it.material_ou_servico_nome ||
            (it.material_ou_servico === "M"
              ? "Material"
              : it.material_ou_servico === "S"
                ? "Serviço"
                : "—");
          return `<tr>
            <td>${escHtml(it.numero_item_pncp ?? "—")}</td>
            <td title="${escHtml(it.descricao_resumida || "")}">${escHtml(
              (it.descricao_resumida || "—").slice(0, 120),
            )}</td>
            <td>${escHtml(tipo)}</td>
            <td>${escHtml(it.quantidade || "—")}</td>
            <td>${escHtml(it.valor_total || it.valor_unitario_estimado || "—")}</td>
            <td>${escHtml(resumo)}</td>
          </tr>`;
        })
        .join("");
    }
    if (dlg && typeof dlg.showModal === "function") dlg.showModal();
    else if (dlg) dlg.setAttribute("open", "");
  }

  function fecharModalCompras() {
    const dlg = $("modal-compras");
    comprasModalId = null;
    comprasModalAcompanhada = false;
    comprasModalResponsavel = null;
    syncBtnComprasAcompanhar();
    if (!dlg) return;
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }

  async function toggleAcompanhamentoCompra() {
    if (!comprasModalId || !isVisaoFilial()) return;
    const btn = $("btn-compras-acompanhar");
    if (!comprasModalAcompanhada && comprasModalResponsavel?.username) {
      const nome = comprasModalResponsavel.username;
      if (
        !window.confirm(
          `«${nome}» deixa de ser responsável e você assume esta contratação?`,
        )
      ) {
        return;
      }
    }
    if (btn) btn.disabled = true;
    const method = comprasModalAcompanhada ? "DELETE" : "POST";
    const { res, body } = await api(
      `/api/acompanhamento/contratacoes/${comprasModalId}`,
      { method },
    );
    if (!res.ok) {
      if (btn) btn.disabled = false;
      flashUnidade(
        formatDetail(body?.detail) || "Falha ao atualizar acompanhamento.",
      );
      return;
    }
    comprasModalAcompanhada = !!body.ativo;
    comprasModalResponsavel = body.ativo
      ? body.responsavel || {
          id: state.me?.id,
          username: state.me?.username || "você",
        }
      : null;
    syncBtnComprasAcompanhar();
    const item = comprasLastItems.find((c) => c.id === comprasModalId);
    if (item) {
      item.acompanhada_por_mim = comprasModalAcompanhada;
      item.responsavel = comprasModalResponsavel;
    }
    renderComprasTabela();
    const meta = $("modal-compras-meta");
    if (meta && meta.textContent) {
      meta.textContent = meta.textContent
        .replace(/\s·\s(Associada a você|Você acompanha|Você é o responsável|Responsável:.*)$/, "")
        .concat(
          comprasModalAcompanhada
            ? " · Você é o responsável"
            : "",
        );
    }
    const ident = $("modal-compras-ident");
    if (ident) {
      // Atualiza linha Responsável no dl sem reabrir o modal.
      const dts = [...ident.querySelectorAll("dt")];
      const dtResp = dts.find((el) => el.textContent === "Responsável");
      if (dtResp && dtResp.nextElementSibling) {
        dtResp.nextElementSibling.textContent = comprasModalAcompanhada
          ? "Você"
          : "—";
      }
    }
    const de = body.transferido_de?.username;
    flashUnidade(
      comprasModalAcompanhada
        ? de
          ? `Você assumiu no lugar de «${de}».`
          : "Você é o responsável desta contratação."
        : "Você deixou de ser o responsável.",
    );
  }

  function comprasEscopoRotulo() {
    return (
      state.me?.escopo?.rotulo ||
      (state.me?.papel === "admin" ? "plataforma" : "")
    );
  }

  async function loadCompras() {
    if (!comprasFiltrosCarregados) {
      await carregarComprasFiltros();
    }
    syncComprasPeriodoUi();

    const params = comprasFiltroParams();
    const tbody = $("tbody-contratacoes");
    const meta = $("compras-consulta-meta");
    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="${COMPRAS_COLS}" class="muted">Carregando…</td></tr>`;
    }
    const { res, body } = await api(`/api/compras/contratacoes?${params}`);
    if (!res.ok) {
      comprasLastItems = [];
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="${COMPRAS_COLS}" class="muted">${escHtml(
          formatDetail(body?.detail) || "Falha ao listar.",
        )}</td></tr>`;
      }
      if (meta) meta.textContent = "Consulta indisponível.";
      return;
    }
    comprasLastItems = body.items || [];
    comprasTotal = Number(body.total) || 0;
    comprasPageSize = Number(body.page_size || body.limit) || COMPRAS_PAGE_SIZE;
    comprasPage = Number(body.page) || comprasPage || 1;
    aplicarComprasPeriodoRotulo(body.periodo);
    const rotuloPeriodo = body.periodo?.rotulo
      ? ` · ${body.periodo.rotulo}`
      : "";
    const escopo = comprasEscopoRotulo();
    const rotuloEscopo = escopo ? ` · ${escopo}` : "";
    if (meta) {
      const size = Math.max(1, comprasPageSize);
      const from = comprasTotal === 0 ? 0 : (comprasPage - 1) * size + 1;
      const to = Math.min(comprasTotal, comprasPage * size);
      const faixa =
        comprasTotal === 0
          ? "0 registro(s)"
          : comprasTotal > size
            ? `Mostrando ${from}–${to} de ${comprasTotal}`
            : `${comprasTotal} registro(s)`;
      meta.textContent = `${faixa} · Compras.gov / PNCP${rotuloPeriodo}${rotuloEscopo}`;
    }
    syncComprasPager();
    renderComprasTabela();
  }

  function comprasIrPagina(nextPage) {
    const maxP = comprasMaxPage();
    const p = Math.max(1, Math.min(maxP, Number(nextPage) || 1));
    if (p === comprasPage && comprasLastItems.length) {
      /* ainda assim recarrega se veio de filtro com page reset */
    }
    comprasPage = p;
    loadCompras();
  }

  $("form-compras-busca")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    comprasPage = 1;
    loadCompras();
  });
  $("btn-compras-limpar")?.addEventListener("click", () => {
    limparComprasFiltros();
    loadCompras();
  });
  $("compras-page-prev")?.addEventListener("click", () => {
    if (comprasPage <= 1) return;
    comprasIrPagina(comprasPage - 1);
  });
  $("compras-page-next")?.addEventListener("click", () => {
    if (comprasPage >= comprasMaxPage()) return;
    comprasIrPagina(comprasPage + 1);
  });
  $("modal-compras-fechar")?.addEventListener("click", () => fecharModalCompras());
  $("btn-compras-acompanhar")?.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    toggleAcompanhamentoCompra();
  });
  $("modal-compras")?.addEventListener("click", (ev) => {
    if (ev.target === $("modal-compras")) fecharModalCompras();
  });

  $("compras-periodo-toggle")?.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".ind-periodo-btn");
    if (!btn) return;
    const next = btn.dataset.periodo;
    if (!COMPRAS_PERIODOS_OK.has(next)) return;
    if (next === comprasPeriodo && next !== "intervalo") return;
    comprasPeriodo = next;
    sessionStorage.setItem(COMPRAS_PERIODO_KEY, comprasPeriodo);
    if (comprasPeriodo === "quadrimestre") persistComprasQuad();
    syncComprasPeriodoUi();
    if (comprasPeriodo === "intervalo") return;
    comprasPage = 1;
    loadCompras();
  });
  $("form-compras-periodo-intervalo")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const ini = $("compras-data-inicio")?.value;
    const fim = $("compras-data-fim")?.value;
    if (!ini || !fim) {
      flashUnidade("Informe data inicial e final.");
      return;
    }
    if (ini > fim) {
      flashUnidade("A data inicial não pode ser posterior à final.");
      return;
    }
    sessionStorage.setItem(COMPRAS_PERIODO_INI_KEY, ini);
    sessionStorage.setItem(COMPRAS_PERIODO_FIM_KEY, fim);
    comprasPeriodo = "intervalo";
    sessionStorage.setItem(COMPRAS_PERIODO_KEY, comprasPeriodo);
    syncComprasPeriodoUi();
    comprasPage = 1;
    loadCompras();
  });
  function aplicarComprasQuadERecarregar() {
    comprasPeriodo = "quadrimestre";
    sessionStorage.setItem(COMPRAS_PERIODO_KEY, comprasPeriodo);
    persistComprasQuad();
    syncComprasPeriodoUi();
    comprasPage = 1;
    loadCompras();
  }
  $("compras-quad-ano-prev")?.addEventListener("click", () => {
    comprasQuadAno -= 1;
    aplicarComprasQuadERecarregar();
  });
  $("compras-quad-ano-next")?.addEventListener("click", () => {
    comprasQuadAno += 1;
    aplicarComprasQuadERecarregar();
  });
  $("compras-quad-range")?.addEventListener("input", (ev) => {
    const v = Number(ev.target.value);
    if (v !== 1 && v !== 2 && v !== 3) return;
    comprasQuadQ = v;
    persistComprasQuad();
    syncComprasPeriodoUi();
  });
  $("compras-quad-range")?.addEventListener("change", (ev) => {
    const v = Number(ev.target.value);
    if (v !== 1 && v !== 2 && v !== 3) return;
    comprasQuadQ = v;
    aplicarComprasQuadERecarregar();
  });
  $("compras-tabela-head")?.addEventListener("click", (ev) => {
    const th = ev.target.closest("th.sortable");
    if (!th?.dataset.sort) return;
    const key = th.dataset.sort;
    if (comprasSortKey === key) {
      comprasSortDir = comprasSortDir === "asc" ? "desc" : "asc";
    } else {
      comprasSortKey = key;
      comprasSortDir = "asc";
    }
    comprasPage = 1;
    markComprasSortHeaders();
    loadCompras();
  });

  syncComprasPeriodoUi();

  let stateExecId = null;

  function rotuloStatusAgendamento(body) {
    const st = body?.status_operacional || "";
    const map = {
      inativo: "Agendamento desligado",
      ativo_sem_disparador:
        "Ativo, mas disparador off (defina COLETA_SCHEDULER=1 e reinicie)",
      aguardando_hora: "Aguardando horário de hoje",
      disparado_hoje: "Já disparou hoje",
      pendente_catchup: "Horário passou — próximo poll fará catch-up",
    };
    return map[st] || st || "—";
  }

  async function executarColetaUasg(codigoUasg, btn) {
    const codigo = String(codigoUasg || "").trim();
    if (!codigo) return;
    if (btn?.disabled) return;
    if (btn) btn.disabled = true;
    flashUnidade(`Coletando UASG ${codigo}…`);
    // periodo_dias omitido → servidor usa o Agendamento salvo
    const { res, body } = await api("/api/coleta/executar", {
      method: "POST",
      body: JSON.stringify({ codigo_uasg: codigo }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || `Falha na coleta da UASG ${codigo}.`);
      if (btn) btn.disabled = false;
      return;
    }
    flashUnidade(
      `Coleta #${body.id} · UASG ${codigo}: ${body.situacao} · ` +
        `${body.sequencias_http} HTTP · ${body.tarefas_ok} ok / ${body.tarefas_falha} falha`,
    );
    await loadColeta();
    if (body.id) await abrirExecucao(body.id);
  }

  async function loadColetaPlano() {
    // Sem query → período do Agendamento (fonte de verdade)
    const { res, body } = await api("/api/coleta/plano");
    const tbody = $("tbody-plano-uasg");
    if (!res.ok) {
      $("coleta-plano-resumo").textContent = body?.detail || "Falha ao planejar.";
      tbody.innerHTML = "";
      return;
    }
    $("coleta-plano-resumo").textContent =
      `${body.total_uasgs_unicas} UASG(s) única(s) · ` +
      `${body.total_vinculos_filial} vínculo(s) filial · ` +
      `economia dedupe: ${body.dedupe_economia} · ` +
      `${body.data_inicial} → ${body.data_final}`;
    if (!body.necessidades?.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="muted">Nenhuma UASG monitorada. Ative no Território.</td></tr>';
      return;
    }
    tbody.innerHTML = body.necessidades
      .map((n) => {
        const filiais = (n.filiais_nomes || []).join(", ") || "—";
        const eco = n.filiais_count > 1 ? `${n.filiais_count - 1} evitada(s)` : "—";
        const codigo = escapeHtml(String(n.codigo_uasg || ""));
        return `<tr>
          <td>${codigo}</td>
          <td>${escapeHtml(n.nome_uasg || "—")}</td>
          <td>${escapeHtml(filiais)}</td>
          <td>${eco}</td>
          <td class="td-actions">
            <button type="button" class="btn btn-secondary btn-icon" data-coleta-uasg="${codigo}" title="Coletar esta UASG" aria-label="Coletar UASG ${codigo}">
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M8 1.5a6.5 6.5 0 0 0-5.7 3.4V3.25a.75.75 0 0 0-1.5 0v3.5c0 .41.34.75.75.75h3.5a.75.75 0 0 0 0-1.5H3.48A5 5 0 1 1 3 8a.75.75 0 0 0-1.5 0A6.5 6.5 0 1 0 8 1.5z"/>
              </svg>
            </button>
          </td>
        </tr>`;
      })
      .join("");
    tbody.querySelectorAll("[data-coleta-uasg]").forEach((btn) => {
      btn.addEventListener("click", () =>
        executarColetaUasg(btn.dataset.coletaUasg, btn),
      );
    });
  }

  async function loadColetaAgendamento() {
    const { res, body } = await api("/api/coleta/agendamento");
    if (!res.ok) return;
    $("ag-ativo").value = body.ativo ? "1" : "0";
    $("ag-hora").value = body.hora_local || "02:00";
    $("ag-dias").value = String(body.periodo_dias || 365);
    const disp = body.disparador || {};
    const modo =
      disp.modo === "scheduler"
        ? `scheduler on${disp.thread_viva ? "" : " (thread ainda não viva)"}`
        : "scheduler off";
    const ultimo = body.ultimo_disparo_chave
      ? `Último: ${body.ultimo_disparo_chave} (#${body.ultimo_execucao_id || "—"})`
      : "Último: nunca";
    const prox = body.proximo_alvo_local
      ? `Próximo alvo: ${String(body.proximo_alvo_local).replace("T", " ").slice(0, 16)}`
      : "Próximo alvo: —";
    const pc = body.pos_coleta || {};
    const orc = pc.orcamento || {};
    const ultPc = pc.ultimo || {};
    const orcTxt = orc.habilitado
      ? `pós-coleta lotes de ${orc.limit || 0} até ${orc.ate_hora || "06:00"} BRT` +
        ` (descanso ${Math.round(orc.descanso_sec || 0)}s)`
      : "pós-coleta off";
    let ultPcTxt = "fase 2: nunca";
    if (ultPc.terminado_em) {
      const quando = String(ultPc.terminado_em).replace("T", " ").slice(0, 19);
      ultPcTxt =
        `fase 2: ${ultPc.ok_count || 0} ok / ${ultPc.erros || 0} erro(s)` +
        ` · ${ultPc.motivo_parada || "—"} · ${quando}` +
        (ultPc.pendentes_restantes != null
          ? ` · restam ${ultPc.pendentes_restantes}`
          : "");
    }
    $("ag-meta").textContent =
      `${rotuloStatusAgendamento(body)} · Disparador: ${modo} · ` +
      `${ultimo} · ${prox} · fuso ${body.timezone || "America/Sao_Paulo"} · ` +
      `${orcTxt} · ${ultPcTxt}`;
  }

  async function loadColetaExecucoes() {
    const { res, body } = await api("/api/coleta/execucoes");
    const tbody = $("tbody-execucoes");
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted">${
        body?.detail || "Falha."
      }</td></tr>`;
      return;
    }
    if (!body.length) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="muted">Nenhuma execução ainda.</td></tr>';
      return;
    }
    tbody.innerHTML = body
      .map(
        (e) => `<tr>
        <td>#${e.id}</td>
        <td>${e.origem}</td>
        <td>${e.situacao}</td>
        <td>${e.total_tarefas}</td>
        <td>${e.sequencias_http}</td>
        <td>${e.tarefas_ok} / ${e.tarefas_falha}</td>
        <td><button type="button" class="btn btn-secondary btn-sm" data-exec="${e.id}">Ver</button></td>
      </tr>`,
      )
      .join("");
    tbody.querySelectorAll("[data-exec]").forEach((btn) => {
      btn.addEventListener("click", () => abrirExecucao(btn.dataset.exec));
    });
  }

  async function loadColeta() {
    $("card-exec-detalhe").hidden = true;
    // Agendamento primeiro (fonte de verdade do período); depois plano/execuções.
    await loadColetaAgendamento();
    await Promise.all([loadColetaPlano(), loadColetaExecucoes()]);
  }

  async function abrirExecucao(id) {
    stateExecId = id;
    const { res, body } = await api(`/api/coleta/execucoes/${id}`);
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao abrir execução.");
      return;
    }
    $("card-exec-detalhe").hidden = false;
    $("exec-detalhe-titulo").textContent = `Execução #${body.id}`;
    $("exec-detalhe-meta").textContent =
      `${body.situacao} · ${body.data_inicial} → ${body.data_final} · ` +
      `${body.sequencias_http} sequência(s) HTTP`;
    $("btn-reprocessar").hidden = !(body.tarefas_falha > 0);
    const tbody = $("tbody-tarefas");
    tbody.innerHTML = (body.tarefas || [])
      .map((t) => {
        const filiais = (t.filiais?.nomes || []).join(", ") || "—";
        return `<tr>
          <td>${t.codigo_uasg}</td>
          <td>${filiais}</td>
          <td>${t.situacao}</td>
          <td>${t.tentativas}</td>
          <td>${t.erro ? String(t.erro).slice(0, 120) : "—"}</td>
        </tr>`;
      })
      .join("");
  }

  $("btn-coleta-refresh")?.addEventListener("click", () => loadColeta());
  $("btn-coleta-plano")?.addEventListener("click", () => loadColetaPlano());
  $("btn-fecha-exec")?.addEventListener("click", () => {
    $("card-exec-detalhe").hidden = true;
  });
  $("btn-coleta-executar")?.addEventListener("click", async () => {
    flashUnidade("Iniciando coleta…");
    // Sem periodo_dias → servidor aplica o Agendamento salvo
    const { res, body } = await api("/api/coleta/executar", {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha na coleta.");
      return;
    }
    flashUnidade(
      `Coleta #${body.id}: ${body.situacao} · ${body.sequencias_http} HTTP · ` +
        `${body.tarefas_ok} ok / ${body.tarefas_falha} falha`,
    );
    await loadColeta();
    if (body.id) await abrirExecucao(body.id);
  });
  $("btn-reprocessar")?.addEventListener("click", async () => {
    if (!stateExecId) return;
    const { res, body } = await api(
      `/api/coleta/execucoes/${stateExecId}/reprocessar`,
      { method: "POST" },
    );
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao reprocessar.");
      return;
    }
    flashUnidade(`Reprocesso: ${body.situacao}`);
    await loadColetaExecucoes();
    await abrirExecucao(body.id);
  });
  $("form-agendamento")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const { res, body } = await api("/api/coleta/agendamento", {
      method: "PUT",
      body: JSON.stringify({
        ativo: $("ag-ativo").value === "1",
        hora_local: $("ag-hora").value,
        periodo_dias: Number($("ag-dias").value),
      }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao salvar agendamento.");
      return;
    }
    flashUnidade("Agendamento salvo.");
    await loadColetaAgendamento();
    await loadColetaPlano();
  });

  function renderEnriqJobStatus(job) {
    const el = $("enriq-job-status");
    if (!el) return;
    if (!job) {
      el.textContent = "Job manual: —";
      return;
    }
    if (job.running) {
      el.textContent =
        `Job manual em andamento · ${job.processados || 0}/${job.total || "?"} · ` +
        `atual ${job.atual || "…"}`;
      return;
    }
    const r = job.resultado;
    if (r && typeof r.total === "number") {
      el.textContent =
        `Último job manual · ${r.ok_count || 0} ok / ${r.erros || 0} erro(s) de ${r.total}` +
        (job.iniciado_em ? ` · ${String(job.iniciado_em).slice(0, 19)}` : "");
      return;
    }
    el.textContent =
      job.fase && job.fase !== "idle" ? `Job manual: ${job.fase}` : "Job manual: ocioso";
  }

  function renderEnriqPosColeta(orcamento, ultimo) {
    const el = $("enriq-pos-coleta-status");
    if (!el) return;
    const orc = orcamento || {};
    const u = ultimo || {};
    const orcTxt = orc.habilitado
      ? `Orçamento automático: lotes de ${orc.limit || 0} CNPJ após a coleta, ` +
        `com descanso de ${Math.round(orc.descanso_sec || 0)}s, até ${orc.ate_hora || "06:00"} BRT` +
        ` (${Math.round(orc.max_sec || 0)}s máx./lote)`
      : "Orçamento automático: desligado (CNPJ_PUBLICO_POS_COLETA_LIMIT=0)";
    if (!u.terminado_em) {
      el.textContent = `${orcTxt} · Última fase 2: nunca`;
      return;
    }
    const quando = String(u.terminado_em).replace("T", " ").slice(0, 19);
    const rest =
      u.pendentes_restantes != null ? ` · restam ${u.pendentes_restantes}` : "";
    const exe =
      u.execucao_coleta_id != null ? ` · coleta #${u.execucao_coleta_id}` : "";
    el.textContent =
      `${orcTxt} · Última fase 2: ${u.ok_count || 0} ok / ${u.erros || 0} erro(s)` +
      ` · ${u.motivo_parada || "—"} · ${quando}${exe}${rest}`;
  }

  async function loadEnriquecimento() {
    const resumo = await api("/api/enriquecimento/resumo");
    if (resumo.res.ok) {
      $("kpi-cnpj-pendentes").textContent = String(resumo.body.cnpj_pendentes);
      $("kpi-cnpj-ok").textContent = String(resumo.body.cnpj_enriquecidos);
      $("kpi-ceps").textContent = String(resumo.body.ceps_cache);
      renderEnriqJobStatus(resumo.body.job);
      renderEnriqPosColeta(
        resumo.body.orcamento_pos_coleta,
        resumo.body.ultimo_pos_coleta,
      );
    }
    const pend = await api("/api/enriquecimento/pendentes?limit=50");
    const tbody = $("tbody-pendentes-cnpj");
    if (!pend.res.ok) {
      tbody.innerHTML = `<tr><td colspan="4" class="muted">${
        pend.body?.detail || "Falha."
      }</td></tr>`;
      return;
    }
    if (!pend.body.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="muted">Nenhum CNPJ pendente.</td></tr>';
      return;
    }
    tbody.innerHTML = pend.body
      .map((p) => {
        const ni = String(p.ni || "");
        const erro = p.cnpj_ultimo_erro
          ? escapeHtml(String(p.cnpj_ultimo_erro).slice(0, 80))
          : "—";
        return `<tr>
        <td>${escapeHtml(ni)}</td>
        <td>${escapeHtml(p.razao_social || "—")}</td>
        <td>${erro}</td>
        <td class="td-actions">
          <button type="button" class="btn btn-secondary btn-icon" data-enriq-ni="${escapeHtml(ni)}" title="Enriquecer" aria-label="Enriquecer ${escapeHtml(ni)}">
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M8 1.5a6.5 6.5 0 0 0-5.7 3.4V3.25a.75.75 0 0 0-1.5 0v3.5c0 .41.34.75.75.75h3.5a.75.75 0 0 0 0-1.5H3.48A5 5 0 1 1 3 8a.75.75 0 0 0-1.5 0A6.5 6.5 0 1 0 8 1.5z"/>
            </svg>
          </button>
        </td>
      </tr>`;
      })
      .join("");

    tbody.querySelectorAll("[data-enriq-ni]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ni = btn.dataset.enriqNi;
        if (!ni || btn.disabled) return;
        btn.disabled = true;
        flashUnidade(`Enriquecendo ${ni}…`);
        const { res, body } = await api("/api/enriquecimento/cnpj", {
          method: "POST",
          body: JSON.stringify({ cnpj: ni, forcar: true }),
        });
        if (!res.ok) {
          flashUnidade(body?.detail || `Falha ao enriquecer ${ni}.`);
          btn.disabled = false;
          return;
        }
        flashUnidade(
          body.cache
            ? `Cache · ${ni} · fonte ${body.fonte_cnpj || "—"}`
            : `OK · ${ni} · ${body.razao_social || body.fonte_cnpj || ""}`,
        );
        await loadEnriquecimento();
      });
    });
  }

  $("btn-enriq-refresh")?.addEventListener("click", () => loadEnriquecimento());
  $("btn-enriq-job")?.addEventListener("click", async () => {
    const btn = $("btn-enriq-job");
    if (btn?.disabled) return;
    if (btn) btn.disabled = true;
    flashUnidade("Processando pendentes…");
    renderEnriqJobStatus({ running: true, processados: 0, total: "…", atual: "…" });
    try {
      const { res, body } = await api("/api/enriquecimento/job/pendentes", {
        method: "POST",
      });
      if (!res.ok) {
        flashUnidade(body?.detail || "Falha no job.");
        return;
      }
      flashUnidade(
        `Job: ${body.ok_count || 0} ok / ${body.erros || 0} erro(s) de ${body.total || 0}`,
      );
    } finally {
      if (btn) btn.disabled = false;
      await loadEnriquecimento();
    }
  });
  $("form-enriq-cnpj")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const { res, body } = await api("/api/enriquecimento/cnpj", {
      method: "POST",
      body: JSON.stringify({ cnpj: $("enriq-cnpj").value, forcar: false }),
    });
    const el = $("enriq-cnpj-result");
    if (!res.ok) {
      el.textContent = body?.detail || "Falha.";
      return;
    }
    el.textContent = body.cache
      ? `Cache · fonte ${body.fonte_cnpj}`
      : `OK · fonte ${body.fonte_cnpj} · ${body.razao_social || ""}`;
    await loadEnriquecimento();
  });
  $("form-enriq-cep")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const { res, body } = await api("/api/enriquecimento/cep", {
      method: "POST",
      body: JSON.stringify({ cep: $("enriq-cep").value }),
    });
    const el = $("enriq-cep-result");
    if (!res.ok) {
      el.textContent = body?.detail || "Falha.";
      return;
    }
    el.textContent =
      `${body.cache ? "Cache" : "OK"} · ${body.fonte_cep} · ` +
      `${body.municipio || "—"}/${body.uf || "—"}` +
      (body.codigo_municipio_ibge ? ` · IBGE ${body.codigo_municipio_ibge}` : "");
    await loadEnriquecimento();
  });

  async function loadOpsAcesso() {
    const meta = $("ops-acesso-meta");
    const btn = $("btn-ops-acesso-toggle");
    if (!meta || !btn) return;
    if (!state.me?.permissoes?.admin) {
      if ($("card-ops-acesso")) $("card-ops-acesso").hidden = true;
      return;
    }
    const { res, body } = await api("/api/ops/acesso");
    if (!res.ok) {
      meta.textContent = body?.detail || "Falha ao carregar modo de acesso.";
      return;
    }
    btn.textContent = body.restrito ? "Liberar acesso" : "Ativar restrição";
    btn.classList.toggle("btn-primary", !body.restrito);
    btn.classList.toggle("btn-secondary", !!body.restrito);
    meta.textContent = body.restrito
      ? `Restrito · ${body.mensagem}` +
        (body.atualizado_em
          ? ` · desde ${String(body.atualizado_em).replace("T", " ").slice(0, 19)}`
          : "")
      : "Acesso normal — consulta e admin podem entrar.";
    await refreshAcessoRestritoBanner();
  }

  async function loadOperacao() {
    const info = await api("/api/ops/info");
    if (info.res.ok) {
      const b = info.body;
      $("ops-info").textContent =
        `v${b.version} · fase ${b.fase} · analytics ${b.analytics} · ` +
        `Power BI: ${b.power_bi ? "ON (inválido)" : "off"}`;
    }
    await loadOpsAcesso();
    const pr = await api("/api/ops/prontidao");
    if (!pr.res.ok) {
      $("ops-pronto").textContent = pr.body?.detail || "Falha ao avaliar prontidão.";
      return;
    }
    $("ops-pronto").textContent = pr.body.pronto_app
      ? "App pronto nos checks automáticos — conclua os manuais na VM."
      : "App ainda incompleto nos checks automáticos.";
    $("tbody-ops-auto").innerHTML = (pr.body.itens || [])
      .map(
        (i) => `<tr>
          <td>${i.titulo}</td>
          <td>${i.ok ? "OK" : "Pendente"}</td>
          <td>${i.detalhe || "—"}</td>
        </tr>`,
      )
      .join("");
    $("tbody-ops-manual").innerHTML = (pr.body.manuais || [])
      .map(
        (i) => `<tr>
          <td>${i.titulo}</td>
          <td><code>${i.detalhe || "—"}</code></td>
        </tr>`,
      )
      .join("");

    const rm = await api("/api/ops/roadmap");
    if (rm.res.ok && $("tbody-roadmap")) {
      $("tbody-roadmap").innerHTML = (rm.body.itens || [])
        .map(
          (i) => `<tr>
          <td>${i.titulo}</td>
          <td>${i.status}</td>
          <td>${i.nota || "—"}</td>
        </tr>`,
        )
        .join("");
    }
  }

  $("btn-ops-acesso-toggle")?.addEventListener("click", async () => {
    if (!state.me?.permissoes?.admin) return;
    const cur = await api("/api/ops/acesso");
    if (!cur.res.ok) {
      flashUnidade(cur.body?.detail || "Falha ao ler modo de acesso.");
      return;
    }
    const next = !cur.body.restrito;
    const { res, body } = await api("/api/ops/acesso", {
      method: "PUT",
      body: JSON.stringify({
        restrito: next,
        mensagem: next
          ? "Sistema em janela operacional (coleta/enriquecimento). Acesso liberado apenas para administradores."
          : undefined,
      }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao alterar acesso.");
      return;
    }
    flashUnidade(
      next
        ? `Acesso restrito ativado` +
          (body.sessoes_nao_admin_encerradas
            ? ` · ${body.sessoes_nao_admin_encerradas} sessão(ões) encerrada(s)`
            : "")
        : "Acesso liberado para todos os usuários ativos.",
    );
    await loadOpsAcesso();
  });

  async function loadAlertas() {
    const av = await api("/api/alertas/avaliacao");
    if (av.res.ok) {
      const d = av.body.disparados || [];
      const ok = av.body.ok || [];
      $("alertas-resumo").textContent = d.length
        ? `${d.length} alerta(s) disparado(s) · ${ok.length} ok`
        : `Nenhum alerta disparado · ${ok.length} regra(s) ok`;
      const rows = [...d, ...ok];
      $("tbody-alertas").innerHTML = rows.length
        ? rows
            .map(
              (a) => `<tr>
            <td>${a.nome}</td>
            <td>${a.severidade}</td>
            <td>${a.valor}</td>
            <td>${a.operador} ${a.limiar}</td>
            <td>${a.disparado ? "Disparado" : "OK"}</td>
          </tr>`,
            )
            .join("")
        : '<tr><td colspan="5" class="muted">Sem regras ativas.</td></tr>';
    }
    const rg = await api("/api/alertas/regras");
    if (rg.res.ok) {
      $("tbody-alerta-regras").innerHTML = (rg.body || [])
        .map(
          (r) => `<tr>
          <td>${r.chave}</td>
          <td>${r.metrica}</td>
          <td>${r.limiar}</td>
          <td>${r.ativo ? "sim" : "não"}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" data-toggle-alerta="${r.id}" data-ativo="${r.ativo ? "1" : "0"}">
              ${r.ativo ? "Desativar" : "Ativar"}
            </button>
          </td>
        </tr>`,
        )
        .join("");
      $("tbody-alerta-regras").querySelectorAll("[data-toggle-alerta]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const ativo = btn.dataset.ativo === "1" ? false : true;
          const r = await api(`/api/alertas/regras/${btn.dataset.toggleAlerta}`, {
            method: "PATCH",
            body: JSON.stringify({ ativo }),
          });
          if (!r.res.ok) {
            flashUnidade(r.body?.detail || "Somente admin altera regras.");
            return;
          }
          await loadAlertas();
        });
      });
    }
  }

  $("btn-alertas-refresh")?.addEventListener("click", () => loadAlertas());

  $("btn-ops-refresh")?.addEventListener("click", () => loadOperacao());
  $("btn-ops-backup")?.addEventListener("click", async () => {
    const { res, body } = await api("/api/ops/backup", {
      method: "POST",
      body: JSON.stringify({ label: "ui", manter: 14 }),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Backup restrito a admin ou falhou.");
      return;
    }
    flashUnidade(`Backup criado: ${body.pasta}`);
    await loadOperacao();
  });

  // —— Backlog (melhorias BLG-) ——
  function canWriteBacklog() {
    return !!(state.me && state.me.permissoes && state.me.permissoes.admin);
  }

  function formatDateTimeBlg(value) {
    if (!value) return "—";
    const raw = String(value).replace("T", " ").trim();
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) return escapeHtml(raw);
    return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
  }

  function toDatetimeLocalValue(value) {
    if (!value) return "";
    const raw = String(value).replace("T", " ").trim();
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
    return m ? `${m[1]}T${m[2]}` : "";
  }

  function fromDatetimeLocalValue(value) {
    if (!value) return null;
    return String(value).replace("T", " ").slice(0, 16);
  }

  async function loadBacklog() {
    const canWrite = canWriteBacklog();
    const cardNovo = $("card-backlog-novo");
    const thAcoes = $("th-blg-acoes");
    if (cardNovo) cardNovo.hidden = !canWrite;
    if (thAcoes) thAcoes.hidden = !canWrite;

    const q = ($("blg-q")?.value || "").trim();
    const situacao = $("blg-situacao")?.value || "todos";
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (situacao) params.set("situacao", situacao);
    const qs = params.toString();
    const { res, body } = await api(`/api/backlog${qs ? `?${qs}` : ""}`);
    const tbody = $("tbody-backlog");
    const stats = $("blg-stats");
    if (!res.ok) {
      if (stats) stats.textContent = formatDetail(body?.detail) || "Falha ao carregar backlog.";
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="${canWrite ? 7 : 6}" class="muted">Não foi possível carregar.</td></tr>`;
      }
      return;
    }
    const rows = body.data || [];
    if (stats) {
      stats.textContent = `${body.total ?? rows.length} item(ns) · ${body.abertos ?? 0} aberto(s) · ${body.concluidos ?? 0} concluído(s)`;
    }
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${canWrite ? 7 : 6}" class="muted" style="padding:1.25rem">Nenhuma tarefa neste filtro.${canWrite ? " Lance a primeira acima." : ""}</td></tr>`;
      return;
    }
    tbody.innerHTML = rows
      .map((r) => {
        const aberto = r.situacao === "ABERTO";
        const pill = aberto
          ? `<span class="badge badge-matriz">ABERTO</span>`
          : `<span class="badge badge-filial">CONCLUIDO</span>`;
        const obs = r.observacao_conclusao
          ? escapeHtml(r.observacao_conclusao)
          : `<span class="muted">—</span>`;
        let acoes = "";
        if (canWrite) {
          if (aberto) {
            acoes = `
              <button type="button" class="btn btn-primary btn-sm" data-blg-concluir="${r.id}" data-blg-inicio="${escapeHtml(r.inicio_em || "")}">Concluir</button>
              <button type="button" class="btn btn-secondary btn-sm" data-blg-excluir="${r.id}">Excluir</button>`;
          } else {
            acoes = `
              <button type="button" class="btn btn-secondary btn-sm" data-blg-reabrir="${r.id}">Reabrir</button>
              <button type="button" class="btn btn-secondary btn-sm" data-blg-excluir="${r.id}">Excluir</button>`;
          }
        }
        return `<tr>
          <td><code>${escapeHtml(r.codigo)}</code></td>
          <td>${escapeHtml(r.tarefa)}</td>
          <td>${formatDateTimeBlg(r.inicio_em)}</td>
          <td>${formatDateTimeBlg(r.fim_em)}</td>
          <td>${obs}</td>
          <td>${pill}</td>
          ${canWrite ? `<td><div style="display:flex;gap:0.35rem;flex-wrap:wrap">${acoes}</div></td>` : ""}
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll("[data-blg-concluir]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.dataset.blgConcluir);
        const obs = window.prompt("Observação da conclusão (como ficou / o que foi feito):", "") ?? "";
        const fimDefault = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const sugestao = `${fimDefault.getFullYear()}-${pad(fimDefault.getMonth() + 1)}-${pad(fimDefault.getDate())}T${pad(fimDefault.getHours())}:${pad(fimDefault.getMinutes())}`;
        const fimLocal = window.prompt("Data/hora de fim (AAAA-MM-DDTHH:MM):", sugestao);
        if (fimLocal === null) return;
        const fim = fromDatetimeLocalValue(fimLocal);
        if (!fim) {
          flashUnidade("Informe a data/hora de fim.");
          return;
        }
        const { res: r2, body: b2 } = await api(`/api/backlog/${id}/concluir`, {
          method: "POST",
          body: JSON.stringify({
            fim_em: fim,
            observacao_conclusao: obs.trim() || null,
          }),
        });
        if (!r2.ok) {
          flashUnidade(b2?.detail || "Falha ao concluir.");
          return;
        }
        await loadBacklog();
      });
    });
    tbody.querySelectorAll("[data-blg-reabrir]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.dataset.blgReabrir);
        const { res: r2, body: b2 } = await api(`/api/backlog/${id}/reabrir`, {
          method: "POST",
          body: "{}",
        });
        if (!r2.ok) {
          flashUnidade(b2?.detail || "Falha ao reabrir.");
          return;
        }
        await loadBacklog();
      });
    });
    tbody.querySelectorAll("[data-blg-excluir]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!window.confirm("Excluir este item do backlog?")) return;
        const id = Number(btn.dataset.blgExcluir);
        const { res: r2, body: b2 } = await api(`/api/backlog/${id}`, { method: "DELETE" });
        if (!r2.ok) {
          flashUnidade(b2?.detail || "Falha ao excluir.");
          return;
        }
        await loadBacklog();
      });
    });
  }

  $("btn-backlog-refresh")?.addEventListener("click", () => loadBacklog());
  $("form-backlog-filtro")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    loadBacklog();
  });
  $("form-backlog-novo")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!canWriteBacklog()) return;
    const tarefa = ($("blg-tarefa")?.value || "").trim();
    const inicio = fromDatetimeLocalValue($("blg-inicio")?.value);
    const fim = fromDatetimeLocalValue($("blg-fim")?.value);
    const obs = ($("blg-obs")?.value || "").trim();
    if (!tarefa || !inicio) {
      flashUnidade("Informe tarefa e data de início.");
      return;
    }
    const payload = {
      tarefa,
      inicio_em: inicio,
      fim_em: fim || null,
      observacao_conclusao: fim ? obs || null : null,
    };
    const { res, body } = await api("/api/backlog", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao lançar.");
      return;
    }
    $("blg-tarefa").value = "";
    $("blg-inicio").value = "";
    $("blg-fim").value = "";
    $("blg-obs").value = "";
    flashUnidade(`Lançado ${body.data?.codigo || "BLG"}`);
    await loadBacklog();
  });

  /* ========== CNPJs vencedores (visão filial · padrão Compras.gov) ========== */
  const VENCEDORES_PERIODO_KEY = "osb50_vencedores_periodo";
  const VENCEDORES_PERIODO_INI_KEY = "osb50_vencedores_periodo_ini";
  const VENCEDORES_PERIODO_FIM_KEY = "osb50_vencedores_periodo_fim";
  const VENCEDORES_QUAD_ANO_KEY = "osb50_vencedores_quad_ano";
  const VENCEDORES_QUAD_Q_KEY = "osb50_vencedores_quad_q";
  const VENCEDORES_PAGE_SIZE = 50;
  const VENCEDORES_COLS = 8;
  const VENCEDORES_SVG_REFRESH =
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 1.5a6.5 6.5 0 0 0-5.7 3.4V3.25a.75.75 0 0 0-1.5 0v3.5c0 .41.34.75.75.75h3.5a.75.75 0 0 0 0-1.5H3.48A5 5 0 1 1 3 8a.75.75 0 0 0-1.5 0A6.5 6.5 0 1 0 8 1.5z"/></svg>';
  let vencedoresPeriodo = (() => {
    let raw = sessionStorage.getItem(VENCEDORES_PERIODO_KEY) || "ano_atual";
    if (raw === "quadrimestre_atual") raw = "quadrimestre";
    return COMPRAS_PERIODOS_OK.has(raw) ? raw : "ano_atual";
  })();
  let vencedoresQuadAno = (() => {
    const n = Number(sessionStorage.getItem(VENCEDORES_QUAD_ANO_KEY));
    return Number.isFinite(n) && n >= 2000 && n <= 2100
      ? n
      : new Date().getFullYear();
  })();
  let vencedoresQuadQ = (() => {
    const n = Number(sessionStorage.getItem(VENCEDORES_QUAD_Q_KEY));
    return n === 1 || n === 2 || n === 3 ? n : indQuadCorrente();
  })();
  let vencedoresItems = [];
  let vencedoresTotal = 0;
  let vencedoresPage = 1;
  let vencedoresPageSize = VENCEDORES_PAGE_SIZE;
  let vencedoresSortKey = null;
  let vencedoresSortDir = "asc";
  let vencedoresFiltrosCarregados = false;
  let vencedoresAtualizando = new Set();

  function fmtCnpjCpf(ni) {
    const d = String(ni || "").replace(/\D/g, "");
    if (d.length === 14) {
      return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    }
    if (d.length === 11) {
      return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    }
    return ni || "—";
  }

  function fmtDataCurtaIso(iso) {
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

  function fmtDataHomolog(raw) {
    if (!raw) return "—";
    const s = String(raw).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return s.length > 10 ? s.slice(0, 10) : s;
  }

  function persistVencedoresQuad() {
    sessionStorage.setItem(VENCEDORES_QUAD_ANO_KEY, String(vencedoresQuadAno));
    sessionStorage.setItem(VENCEDORES_QUAD_Q_KEY, String(vencedoresQuadQ));
  }

  function syncVencedoresPeriodoUi() {
    document
      .querySelectorAll("#vencedores-periodo-toggle .ind-periodo-btn")
      .forEach((btn) => {
        const on = btn.dataset.periodo === vencedoresPeriodo;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
      });
    const rotulo = $("vencedores-periodo-rotulo");
    const formInt = $("form-vencedores-periodo-intervalo");
    const quadWrap = $("vencedores-periodo-quad-wrap");
    const isInt = vencedoresPeriodo === "intervalo";
    const isQuad = vencedoresPeriodo === "quadrimestre";
    if (rotulo) rotulo.hidden = isInt || isQuad;
    if (formInt) formInt.hidden = !isInt;
    if (quadWrap) quadWrap.hidden = !isQuad;
    if (isInt) {
      const ini = $("vencedores-data-inicio");
      const fim = $("vencedores-data-fim");
      if (ini && !ini.value) {
        ini.value = sessionStorage.getItem(VENCEDORES_PERIODO_INI_KEY) || "";
      }
      if (fim && !fim.value) {
        fim.value = sessionStorage.getItem(VENCEDORES_PERIODO_FIM_KEY) || "";
      }
    }
    if (isQuad) {
      const anoEl = $("vencedores-quad-ano");
      const range = $("vencedores-quad-range");
      const qRotulo = $("vencedores-quad-rotulo");
      if (anoEl) anoEl.textContent = String(vencedoresQuadAno);
      if (range) {
        range.value = String(vencedoresQuadQ);
        range.setAttribute("aria-valuenow", String(vencedoresQuadQ));
      }
      if (qRotulo) {
        qRotulo.textContent = `${vencedoresQuadAno} · ${
          IND_QUAD_LABELS[vencedoresQuadQ] || `Q${vencedoresQuadQ}`
        }`;
      }
    }
    if (!isInt && !isQuad && rotulo) {
      const labels = {
        ano_atual: "Ano atual",
        ano_anterior: "Ano anterior",
        tudo: "Todo o histórico",
      };
      rotulo.textContent = `Período: ${labels[vencedoresPeriodo] || vencedoresPeriodo}`;
    }
  }

  function vencedoresPeriodoParams() {
    const params = new URLSearchParams();
    params.set("periodo", vencedoresPeriodo);
    if (vencedoresPeriodo === "intervalo") {
      const ini =
        $("vencedores-data-inicio")?.value ||
        sessionStorage.getItem(VENCEDORES_PERIODO_INI_KEY) ||
        "";
      const fim =
        $("vencedores-data-fim")?.value ||
        sessionStorage.getItem(VENCEDORES_PERIODO_FIM_KEY) ||
        "";
      if (ini) params.set("data_inicio", ini);
      if (fim) params.set("data_fim", fim);
    } else if (vencedoresPeriodo === "quadrimestre") {
      params.set("ano", String(vencedoresQuadAno));
      params.set("quadrimestre", String(vencedoresQuadQ));
    }
    return params;
  }

  function aplicarVencedoresPeriodoRotulo(periodoAplicado) {
    const rotulo = $("vencedores-periodo-rotulo");
    const qRotulo = $("vencedores-quad-rotulo");
    if (vencedoresPeriodo === "quadrimestre") {
      if (qRotulo) {
        qRotulo.textContent = periodoAplicado?.rotulo
          ? periodoAplicado.rotulo
          : `${vencedoresQuadAno} · ${IND_QUAD_LABELS[vencedoresQuadQ] || `Q${vencedoresQuadQ}`}`;
      }
      return;
    }
    if (vencedoresPeriodo === "intervalo") return;
    if (!rotulo) return;
    if (periodoAplicado?.rotulo) {
      rotulo.textContent = `Período: ${periodoAplicado.rotulo}`;
      return;
    }
    syncVencedoresPeriodoUi();
  }

  async function carregarVencedoresFiltros() {
    const { res, body } = await api("/api/consultas/vencedores-cnpj/filtros");
    if (!res.ok) return;
    const uasgEl = $("vencedores-filtro-uasg");
    if (uasgEl) {
      const cur = uasgEl.value;
      uasgEl.innerHTML =
        '<option value="">Todas do escopo</option>' +
        (body.uasgs || [])
          .map((u) => {
            const cod = escHtml(u.codigo || "");
            const lab = u.nome ? `${cod} · ${escHtml(u.nome)}` : cod;
            return `<option value="${cod}">${lab}</option>`;
          })
          .join("");
      if (cur) uasgEl.value = cur;
    }
    multiSelectOf("#vencedores-filtro-modalidade")?.setOptions(
      (body.modalidades || []).map((m) => ({
        value: String(m.codigo),
        label: `${m.codigo} · ${m.nome}`,
      })),
    );
    const ufEl = $("vencedores-filtro-uf");
    if (ufEl) {
      const cur = ufEl.value;
      ufEl.innerHTML =
        '<option value="">Todas</option>' +
        (body.ufs || [])
          .map(
            (u) =>
              `<option value="${escHtml(u.sigla)}">${escHtml(u.sigla)} · ${escHtml(
                u.nome || u.sigla,
              )}</option>`,
          )
          .join("");
      if (cur) ufEl.value = cur;
    }
    const porteEl = $("vencedores-filtro-porte");
    if (porteEl) {
      const cur = porteEl.value;
      const extras = (body.portes || [])
        .map((p) => `<option value="${escHtml(p)}">${escHtml(p)}</option>`)
        .join("");
      porteEl.innerHTML =
        '<option value="">Todos</option><option value="_vazio_">Não informado</option>' +
        extras;
      if (cur) porteEl.value = cur;
    }
    vencedoresFiltrosCarregados = true;
  }

  function vencedoresFiltroParams() {
    const params = vencedoresPeriodoParams();
    const uasg = $("vencedores-filtro-uasg")?.value?.trim();
    const uf = $("vencedores-filtro-uf")?.value?.trim();
    const porte = $("vencedores-filtro-porte")?.value?.trim();
    const status = $("vencedores-filtro-status")?.value?.trim();
    const q = $("vencedores-filtro-q")?.value?.trim();
    if (uasg) params.set("codigo_uasg", uasg);
    if (uf) params.set("uf", uf);
    if (porte) params.set("porte", porte);
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    (multiSelectOf("#vencedores-filtro-modalidade")?.getValues() || []).forEach(
      (cod) => {
        if (cod) params.append("modalidade_codigo", cod);
      },
    );
    params.set("page", String(Math.max(1, vencedoresPage || 1)));
    params.set("page_size", String(VENCEDORES_PAGE_SIZE));
    if (vencedoresSortKey) {
      params.set("sort", vencedoresSortKey);
      params.set("sort_dir", vencedoresSortDir === "desc" ? "desc" : "asc");
    }
    return params;
  }

  function limparVencedoresFiltros() {
    const form = $("form-vencedores-busca");
    if (form) form.reset();
    multiSelectOf("#vencedores-filtro-modalidade")?.clear({ silent: true });
    vencedoresSortKey = null;
    vencedoresSortDir = "asc";
    vencedoresPage = 1;
  }

  function vencedoresMaxPage() {
    const size = Math.max(1, vencedoresPageSize || VENCEDORES_PAGE_SIZE);
    return Math.max(1, Math.ceil((vencedoresTotal || 0) / size));
  }

  function syncVencedoresPager() {
    const pager = $("vencedores-pager");
    const label = $("vencedores-pager-label");
    const prev = $("vencedores-page-prev");
    const next = $("vencedores-page-next");
    if (!pager) return;
    const total = vencedoresTotal || 0;
    const size = Math.max(1, vencedoresPageSize || VENCEDORES_PAGE_SIZE);
    const maxP = vencedoresMaxPage();
    if (vencedoresPage > maxP) vencedoresPage = maxP;
    const show = total > size;
    pager.hidden = !show;
    if (!show) return;
    const from = total === 0 ? 0 : (vencedoresPage - 1) * size + 1;
    const to = Math.min(total, vencedoresPage * size);
    if (label) {
      label.textContent = `${from}–${to} de ${total} · pág. ${vencedoresPage}/${maxP}`;
    }
    if (prev) prev.disabled = vencedoresPage <= 1;
    if (next) next.disabled = vencedoresPage >= maxP;
  }

  function markVencedoresSortHeaders() {
    document
      .querySelectorAll("#vencedores-tabela-head th.sortable")
      .forEach((th) => {
        th.classList.toggle(
          "sort-asc",
          th.dataset.sort === vencedoresSortKey && vencedoresSortDir === "asc",
        );
        th.classList.toggle(
          "sort-desc",
          th.dataset.sort === vencedoresSortKey && vencedoresSortDir === "desc",
        );
      });
  }

  function atualizarMetaVencedores() {
    const meta = $("vencedores-consulta-meta");
    if (!meta) return;
    const total = Number(vencedoresTotal || 0);
    const size = Math.max(1, vencedoresPageSize || VENCEDORES_PAGE_SIZE);
    const from = total === 0 ? 0 : (vencedoresPage - 1) * size + 1;
    const to = Math.min(total, vencedoresPage * size);
    if (total <= 0) {
      meta.textContent = "Nenhum fornecedor no filtro atual.";
      return;
    }
    const faixa =
      total > size
        ? `Mostrando ${from}–${to} de ${total}`
        : `${total} fornecedor(es)`;
    meta.textContent = `${faixa} · CNPJs vencedores`;
  }

  function renderVencedoresTabela() {
    const tb = $("tbody-vencedores");
    if (!tb) return;
    markVencedoresSortHeaders();
    if (!vencedoresItems.length) {
      tb.innerHTML = `<tr><td colspan="${VENCEDORES_COLS}" class="muted">Nenhum fornecedor vencedor encontrado com os filtros atuais.</td></tr>`;
      return;
    }
    // Ordem vem do servidor (sort global antes da paginação).
    const rows = vencedoresItems;
    tb.innerHTML = rows
      .map((r) => {
        const ni = String(r.cod_fornecedor || "");
        const nome = r.nome_fornecedor || "—";
        const mun = r.municipio
          ? `${r.municipio}${r.uf ? `/${r.uf}` : ""}`
          : "—";
        const busy = vencedoresAtualizando.has(ni);
        const pode = r.pode_atualizar;
        let acao = `<span class="muted">—</span>`;
        if (pode) {
          acao = `<button type="button" class="btn btn-secondary btn-icon btn-vencedor-atualizar" data-ni="${escHtml(
            ni,
          )}" data-nome="${escHtml(nome)}" title="Atualizar CNPJ via API pública" aria-label="Atualizar ${escHtml(
            fmtCnpjCpf(ni),
          )}" ${busy ? "disabled" : ""}>${VENCEDORES_SVG_REFRESH}</button>`;
        }
        return `<tr data-ni="${escHtml(ni)}">
          <td>
            <button type="button" class="link-vencedor btn-vencedor-detalhe" data-ni="${escHtml(
              ni,
            )}" data-nome="${escHtml(nome)}" title="Ver cadastro e QSA">${escHtml(
              nome,
            )}</button>
          </td>
          <td class="mono">${escHtml(fmtCnpjCpf(ni))}</td>
          <td class="col-num">
            <button type="button" class="link-vencedor btn-vencedor-homolog" data-ni="${escHtml(
              ni,
            )}" data-nome="${escHtml(nome)}" title="Ver homologações">${
              r.qtd_itens ?? 0
            }</button>
          </td>
          <td class="col-num">${r.qtd_compras ?? 0}</td>
          <td class="col-num col-money">${
            r.valor_total_homologado != null
              ? escHtml(fmtMoedaBr(r.valor_total_homologado))
              : "—"
          }</td>
          <td>${escHtml(mun)}</td>
          <td>${escHtml(fmtDataCurtaIso(r.cnpj_enriquecido_em))}</td>
          <td class="td-actions">${acao}</td>
        </tr>`;
      })
      .join("");

    tb.querySelectorAll(".btn-vencedor-detalhe").forEach((btn) => {
      btn.addEventListener("click", () =>
        abrirModalVencedor(btn.dataset.ni, btn.dataset.nome, { modo: "cadastro" }),
      );
    });
    tb.querySelectorAll(".btn-vencedor-homolog").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        abrirModalVencedor(btn.dataset.ni, btn.dataset.nome, {
          modo: "homologacoes",
        });
      });
    });
    tb.querySelectorAll(".btn-vencedor-atualizar").forEach((btn) => {
      btn.addEventListener("click", () =>
        atualizarVencedorIndividual(btn.dataset.ni, btn.dataset.nome),
      );
    });
  }

  function renderEmpresaVencedor(empresa, { tipo } = {}) {
    const dl = $("modal-vencedor-empresa");
    const qsaWrap = $("modal-vencedor-qsa-wrap");
    const qsaTb = $("modal-vencedor-qsa");
    if (!dl) return;
    if (!empresa) {
      dl.innerHTML = `<dt>Cadastro</dt><dd class="muted">${
        tipo === "cpf"
          ? "CPF sem enriquecimento cadastral."
          : "Cadastro ainda não enriquecido. Use o ícone de atualizar na tabela."
      }</dd>`;
      if (qsaWrap) qsaWrap.hidden = true;
      if (qsaTb) qsaTb.innerHTML = "";
      return;
    }
    const mun = empresa.municipio
      ? `${empresa.municipio}${empresa.uf ? `/${empresa.uf}` : ""}`
      : null;
    const endParts = [
      empresa.logradouro,
      empresa.numero,
      empresa.bairro,
      empresa.cep,
    ].filter((v) => v != null && String(v).trim() !== "");
    const cnae =
      empresa.cnae_codigo != null && empresa.cnae
        ? `${empresa.cnae_codigo} — ${empresa.cnae}`
        : empresa.cnae || empresa.cnae_codigo || null;
    dlPairs(dl, [
      ["Razão social", empresa.razao_social],
      ["Nome fantasia", empresa.nome_fantasia],
      ["Porte", empresa.porte],
      ["Natureza jurídica", empresa.natureza_juridica],
      ["Situação", empresa.situacao_cadastral],
      ["CNAE", cnae],
      ["Município", mun],
      ["Endereço", endParts.length ? endParts.join(", ") : null],
      ["Fonte CNPJ", empresa.fonte_cnpj],
    ]);
    const qsa = Array.isArray(empresa.qsa) ? empresa.qsa : [];
    if (qsaWrap && qsaTb) {
      if (!qsa.length) {
        qsaWrap.hidden = true;
        qsaTb.innerHTML = "";
      } else {
        qsaWrap.hidden = false;
        qsaTb.innerHTML = qsa
          .map(
            (s) =>
              `<tr><td>${escHtml(s.nome || "—")}</td><td>${escHtml(
                s.qualificacao || "—",
              )}</td></tr>`,
          )
          .join("");
      }
    }
  }

  function renderHomologacoesVencedor(items) {
    const wrap = $("modal-vencedor-homolog-wrap");
    const meta = $("modal-vencedor-homolog-meta");
    const tb = $("modal-vencedor-homolog");
    if (!wrap || !tb) return;
    wrap.hidden = false;
    if (meta) {
      meta.textContent = items?.length
        ? `${items.length} homologação(ões) no recorte`
        : "Nenhuma homologação no recorte.";
    }
    if (!items?.length) {
      tb.innerHTML =
        '<tr><td colspan="6" class="muted">Nenhuma homologação encontrada.</td></tr>';
      return;
    }
    tb.innerHTML = items
      .map((r) => {
        const cid = r.contratacao_id != null ? String(r.contratacao_id) : "";
        const valor =
          r.valor_homologado ||
          (r.valor_homologado_num != null
            ? fmtMoedaBr(r.valor_homologado_num)
            : "—");
        return `<tr${
          cid ? ` class="clickable" data-contratacao-id="${escHtml(cid)}"` : ""
        }>
          <td class="mono">${escHtml(fmtDataHomolog(r.data))}</td>
          <td class="mono">${escHtml(r.compra || "—")}</td>
          <td class="mono">${escHtml(r.processo || "—")}</td>
          <td>${escHtml(r.objeto || "—")}</td>
          <td>${escHtml(r.descricao_item || "—")}</td>
          <td class="col-num col-money">${escHtml(valor)}</td>
        </tr>`;
      })
      .join("");
    tb.querySelectorAll("tr[data-contratacao-id]").forEach((tr) => {
      tr.addEventListener("click", () => {
        const id = tr.dataset.contratacaoId;
        if (!id) return;
        fecharModalVencedor();
        abrirDetalheCompra(id);
      });
    });
  }

  async function abrirModalVencedor(ni, nomeHint, { modo = "cadastro" } = {}) {
    if (!ni) return;
    const dlg = $("modal-vencedor");
    if (!dlg) return;
    $("modal-vencedor-titulo").textContent = nomeHint || "Fornecedor";
    $("modal-vencedor-meta").textContent = fmtCnpjCpf(ni);
    $("modal-vencedor-empresa").innerHTML =
      '<dt></dt><dd class="muted">Carregando…</dd>';
    $("modal-vencedor-qsa-wrap").hidden = true;
    $("modal-vencedor-homolog-wrap").hidden = modo !== "homologacoes";
    if ($("modal-vencedor-homolog")) {
      $("modal-vencedor-homolog").innerHTML =
        modo === "homologacoes"
          ? '<tr><td colspan="6" class="muted">Carregando…</td></tr>'
          : "";
    }
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");

    const det = await api(
      `/api/consultas/vencedores-cnpj/${encodeURIComponent(ni)}`,
    );
    if (det.res.ok) {
      $("modal-vencedor-titulo").textContent =
        det.body.nome_fornecedor || nomeHint || "Fornecedor";
      $("modal-vencedor-meta").textContent = `${fmtCnpjCpf(ni)} · ${
        det.body.status_cache || "—"
      }`;
      renderEmpresaVencedor(det.body.empresa, { tipo: det.body.tipo });
    } else {
      renderEmpresaVencedor(null, {});
    }

    if (modo === "homologacoes") {
      const params = vencedoresPeriodoParams();
      const uasg = $("vencedores-filtro-uasg")?.value?.trim();
      const uf = $("vencedores-filtro-uf")?.value?.trim();
      if (uasg) params.set("codigo_uasg", uasg);
      if (uf) params.set("uf", uf);
      (multiSelectOf("#vencedores-filtro-modalidade")?.getValues() || []).forEach(
        (cod) => {
          if (cod) params.append("modalidade_codigo", cod);
        },
      );
      const hom = await api(
        `/api/consultas/vencedores-cnpj/${encodeURIComponent(
          ni,
        )}/homologacoes?${params}`,
      );
      if (hom.res.ok) {
        if (hom.body.nome_fornecedor) {
          $("modal-vencedor-titulo").textContent = hom.body.nome_fornecedor;
        }
        if (hom.body.empresa) {
          renderEmpresaVencedor(hom.body.empresa, { tipo: hom.body.tipo });
        }
        renderHomologacoesVencedor(hom.body.items || []);
      } else {
        renderHomologacoesVencedor([]);
        flashUnidade(hom.body?.detail || "Falha ao carregar homologações.");
      }
    }
  }

  function fecharModalVencedor() {
    const dlg = $("modal-vencedor");
    if (!dlg) return;
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }

  async function atualizarVencedorIndividual(ni, nome) {
    if (!ni || vencedoresAtualizando.has(ni)) return;
    vencedoresAtualizando.add(ni);
    renderVencedoresTabela();
    flashUnidade(`Atualizando ${fmtCnpjCpf(ni)}…`);
    const { res, body } = await api("/api/enriquecimento/cnpj", {
      method: "POST",
      body: JSON.stringify({ cnpj: ni, forcar: true }),
    });
    vencedoresAtualizando.delete(ni);
    if (!res.ok) {
      flashUnidade(body?.detail || `Falha ao atualizar ${fmtCnpjCpf(ni)}.`);
      renderVencedoresTabela();
      return;
    }
    flashUnidade(
      body.cache
        ? `Cache · ${fmtCnpjCpf(ni)} · ${body.fonte_cnpj || "—"}`
        : `OK · ${fmtCnpjCpf(ni)} · ${body.razao_social || nome || body.fonte_cnpj || ""}`,
    );
    await loadVencedores({ silencioso: true });
  }

  async function loadVencedores({ silencioso = false } = {}) {
    if (!isVisaoFilial()) return;
    syncVencedoresPeriodoUi();
    if (!vencedoresFiltrosCarregados) {
      await carregarVencedoresFiltros();
    }
    if (
      vencedoresPeriodo === "intervalo" &&
      (!$("vencedores-data-inicio")?.value || !$("vencedores-data-fim")?.value)
    ) {
      const meta = $("vencedores-consulta-meta");
      if (meta) meta.textContent = "Informe o intervalo e clique em Aplicar.";
      return;
    }

    const params = vencedoresFiltroParams();
    const tb = $("tbody-vencedores");
    const meta = $("vencedores-consulta-meta");
    if (!silencioso && meta) meta.textContent = "Carregando…";
    if (!silencioso && tb) {
      tb.innerHTML = `<tr><td colspan="${VENCEDORES_COLS}" class="muted">Carregando…</td></tr>`;
    }

    const { res, body } = await api(
      `/api/consultas/vencedores-cnpj?${params}`,
    );
    if (!res.ok) {
      vencedoresItems = [];
      flashUnidade(body?.detail || "Falha ao carregar CNPJs vencedores.");
      if (tb) {
        tb.innerHTML = `<tr><td colspan="${VENCEDORES_COLS}" class="muted">${escHtml(
          body?.detail || "Falha.",
        )}</td></tr>`;
      }
      if (meta) meta.textContent = "Consulta indisponível.";
      syncVencedoresPager();
      return;
    }

    vencedoresItems = body.items || [];
    vencedoresTotal = Number(body.total || 0);
    vencedoresPageSize =
      Number(body.page_size || body.limit) || VENCEDORES_PAGE_SIZE;
    vencedoresPage = Number(body.page) || vencedoresPage || 1;
    aplicarVencedoresPeriodoRotulo(body.periodo_aplicado);
    atualizarMetaVencedores();
    syncVencedoresPager();
    renderVencedoresTabela();
  }

  function vencedoresIrPagina(nextPage) {
    const maxP = vencedoresMaxPage();
    const p = Math.max(1, Math.min(maxP, Number(nextPage) || 1));
    vencedoresPage = p;
    loadVencedores();
  }

  $("form-vencedores-busca")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    vencedoresPage = 1;
    loadVencedores();
  });
  $("btn-vencedores-limpar")?.addEventListener("click", () => {
    limparVencedoresFiltros();
    loadVencedores();
  });
  $("vencedores-page-prev")?.addEventListener("click", () => {
    if (vencedoresPage <= 1) return;
    vencedoresIrPagina(vencedoresPage - 1);
  });
  $("vencedores-page-next")?.addEventListener("click", () => {
    if (vencedoresPage >= vencedoresMaxPage()) return;
    vencedoresIrPagina(vencedoresPage + 1);
  });
  $("vencedores-tabela-head")?.addEventListener("click", (ev) => {
    const th = ev.target.closest("th.sortable");
    if (!th?.dataset.sort) return;
    const key = th.dataset.sort;
    if (vencedoresSortKey === key) {
      vencedoresSortDir = vencedoresSortDir === "asc" ? "desc" : "asc";
    } else {
      vencedoresSortKey = key;
      vencedoresSortDir = "asc";
    }
    vencedoresPage = 1;
    markVencedoresSortHeaders();
    loadVencedores();
  });

  $("vencedores-periodo-toggle")?.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".ind-periodo-btn");
    if (!btn?.dataset.periodo) return;
    const next = btn.dataset.periodo;
    if (next === vencedoresPeriodo && next !== "intervalo") return;
    vencedoresPeriodo = next;
    sessionStorage.setItem(VENCEDORES_PERIODO_KEY, vencedoresPeriodo);
    if (vencedoresPeriodo === "quadrimestre") persistVencedoresQuad();
    vencedoresPage = 1;
    syncVencedoresPeriodoUi();
    if (vencedoresPeriodo === "intervalo") return;
    loadVencedores();
  });
  $("form-vencedores-periodo-intervalo")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const ini = $("vencedores-data-inicio")?.value;
    const fim = $("vencedores-data-fim")?.value;
    if (!ini || !fim) {
      flashUnidade("Informe data inicial e final.");
      return;
    }
    sessionStorage.setItem(VENCEDORES_PERIODO_INI_KEY, ini);
    sessionStorage.setItem(VENCEDORES_PERIODO_FIM_KEY, fim);
    vencedoresPeriodo = "intervalo";
    sessionStorage.setItem(VENCEDORES_PERIODO_KEY, vencedoresPeriodo);
    vencedoresPage = 1;
    syncVencedoresPeriodoUi();
    loadVencedores();
  });
  $("vencedores-quad-ano-prev")?.addEventListener("click", () => {
    vencedoresQuadAno -= 1;
    persistVencedoresQuad();
    vencedoresPeriodo = "quadrimestre";
    sessionStorage.setItem(VENCEDORES_PERIODO_KEY, vencedoresPeriodo);
    vencedoresPage = 1;
    syncVencedoresPeriodoUi();
    loadVencedores();
  });
  $("vencedores-quad-ano-next")?.addEventListener("click", () => {
    vencedoresQuadAno += 1;
    persistVencedoresQuad();
    vencedoresPeriodo = "quadrimestre";
    sessionStorage.setItem(VENCEDORES_PERIODO_KEY, vencedoresPeriodo);
    vencedoresPage = 1;
    syncVencedoresPeriodoUi();
    loadVencedores();
  });
  $("vencedores-quad-range")?.addEventListener("input", (ev) => {
    const n = Number(ev.target.value);
    if (n !== 1 && n !== 2 && n !== 3) return;
    vencedoresQuadQ = n;
    persistVencedoresQuad();
    vencedoresPeriodo = "quadrimestre";
    sessionStorage.setItem(VENCEDORES_PERIODO_KEY, vencedoresPeriodo);
    vencedoresPage = 1;
    syncVencedoresPeriodoUi();
    loadVencedores();
  });

  $("modal-vencedor-fechar")?.addEventListener("click", () => fecharModalVencedor());
  $("modal-vencedor")?.addEventListener("click", (ev) => {
    if (ev.target === $("modal-vencedor")) fecharModalVencedor();
  });

  /* ========== Propostas abertas (visão filial · sem IA) ========== */
  const PROP_PAGE_SIZE = 50;
  const PROP_COLS = 11;
  let propFiltrosCarregados = false;
  /** Filial cujo cadastro UASG está no select — invalida ao trocar a visão. */
  let propFiltrosFilialId = null;
  let propLastItems = [];
  let propTotal = 0;
  let propPage = 1;
  let propPageSize = PROP_PAGE_SIZE;
  let propSortKey = "horas_restantes";
  let propSortDir = "asc";
  let propItemAtual = null;

  function propFilialIdAtual(me = state.me) {
    const id =
      me?.escopo?.filtro_unidade_id ??
      me?.filtro_visao?.id ??
      me?.unidade_ativa?.id ??
      null;
    return id != null ? Number(id) : null;
  }

  function propPillUrgencia(urg, horas) {
    const map = {
      critica: "Crítica",
      alta: "Alta",
      media: "Média",
      normal: "Normal",
    };
    const label = map[urg] || urg || "—";
    let tempo = "—";
    if (horas != null && Number.isFinite(Number(horas))) {
      const h = Number(horas);
      tempo = h < 48 ? `${Math.round(h)}h` : `${(h / 24).toFixed(1)}d`;
    }
    return `<span class="pill-urg pill-urg-${escHtml(urg || "normal")}" title="${escHtml(label)}">${escHtml(tempo)}</span>`;
  }

  function propPillDesvio(desvio) {
    if (!desvio) return '<span class="muted">—</span>';
    const cls = `pill-desvio pill-desvio-${escHtml(desvio.sinal || "alinhado")}`;
    return `<span class="${cls}" title="Em relação à mediana local do catálogo">${escHtml(
      desvio.percentual_fmt || "—",
    )}</span>`;
  }

  function propFmtMoney(n) {
    if (n == null || !Number.isFinite(Number(n))) return "—";
    return fmtMoedaBr(Number(n));
  }

  async function carregarPropostasFiltros() {
    const { res, body } = await api("/api/propostas-abertas/filtros");
    if (!res.ok) return;
    const uasgEl = $("prop-filtro-uasg");
    const codigos = new Set((body.uasgs || []).map((u) => String(u.codigo)));
    if (uasgEl) {
      const cur = uasgEl.value;
      uasgEl.innerHTML =
        '<option value="">Todas da filial</option>' +
        (body.uasgs || [])
          .map((u) => {
            const label = u.nome ? `${u.codigo} · ${u.nome}` : u.codigo;
            return `<option value="${escHtml(u.codigo)}">${escHtml(label)}</option>`;
          })
          .join("");
      // Mantém seleção só se a UASG ainda pertence à filial filtrada.
      uasgEl.value = cur && codigos.has(cur) ? cur : "";
    }
    multiSelectOf("#prop-filtro-modalidade")?.setOptions(
      (body.modalidades || []).map((m) => ({
        value: String(m.codigo),
        label: `${m.codigo} · ${m.nome}`,
      })),
    );
    propFiltrosCarregados = true;
    propFiltrosFilialId =
      body.filial_id != null ? Number(body.filial_id) : propFilialIdAtual();
  }

  function propFiltroParams() {
    const params = new URLSearchParams();
    const horizonte = $("prop-filtro-horizonte")?.value?.trim() || "todos";
    const uasg = $("prop-filtro-uasg")?.value?.trim();
    const tipo = $("prop-filtro-tipo")?.value?.trim();
    const q = $("prop-filtro-q")?.value?.trim();
    const acompanhamento = $("prop-filtro-acompanhamento")?.value?.trim();
    params.set("horizonte", horizonte);
    if (uasg) params.set("codigo_uasg", uasg);
    if (tipo) params.set("material_ou_servico", tipo);
    if (q) params.set("q", q);
    if (
      acompanhamento === "minhas" ||
      acompanhamento === "sem" ||
      acompanhamento === "com" ||
      acompanhamento === "sem_resp"
    ) {
      params.set("acompanhamento", acompanhamento);
    }
    (multiSelectOf("#prop-filtro-modalidade")?.getValues() || []).forEach((cod) => {
      if (cod) params.append("modalidade_codigo", cod);
    });
    params.set("page", String(Math.max(1, propPage || 1)));
    params.set("page_size", String(PROP_PAGE_SIZE));
    if (propSortKey) {
      params.set("sort", propSortKey);
      params.set("sort_dir", propSortDir === "desc" ? "desc" : "asc");
    }
    return params;
  }

  function limparPropostasFiltros() {
    const form = $("form-propostas-busca");
    if (form) form.reset();
    const h = $("prop-filtro-horizonte");
    if (h) h.value = "todos";
    multiSelectOf("#prop-filtro-modalidade")?.clear({ silent: true });
    propSortKey = "horas_restantes";
    propSortDir = "asc";
    propPage = 1;
  }

  function propMaxPage() {
    const size = Math.max(1, propPageSize || PROP_PAGE_SIZE);
    return Math.max(1, Math.ceil((propTotal || 0) / size));
  }

  function syncPropostasPager() {
    const pager = $("prop-pager");
    const label = $("prop-pager-label");
    const prev = $("prop-page-prev");
    const next = $("prop-page-next");
    if (!pager) return;
    const total = propTotal || 0;
    const size = Math.max(1, propPageSize || PROP_PAGE_SIZE);
    const maxP = propMaxPage();
    if (propPage > maxP) propPage = maxP;
    const show = total > size;
    pager.hidden = !show;
    if (!show) return;
    const from = total === 0 ? 0 : (propPage - 1) * size + 1;
    const to = Math.min(total, propPage * size);
    if (label) {
      label.textContent = `${from}–${to} de ${total} · pág. ${propPage}/${maxP}`;
    }
    if (prev) prev.disabled = propPage <= 1;
    if (next) next.disabled = propPage >= maxP;
  }

  function markPropostasSortHeaders() {
    document.querySelectorAll("#prop-tabela-head th.sortable").forEach((th) => {
      th.classList.toggle(
        "sort-asc",
        th.dataset.sort === propSortKey && propSortDir === "asc",
      );
      th.classList.toggle(
        "sort-desc",
        th.dataset.sort === propSortKey && propSortDir === "desc",
      );
    });
  }

  function renderPropostasResumo(resumo) {
    const el = $("prop-resumo");
    if (!el) return;
    if (!resumo || !resumo.itens) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    const chips = [
      ["Itens", Number(resumo.itens || 0).toLocaleString("pt-BR")],
      ["Contratações", Number(resumo.contratacoes || 0).toLocaleString("pt-BR")],
      ["Valor est.", resumo.valor_estimado_total_fmt || "—"],
      ["≤24h", Number(resumo.urgentes_24h || 0).toLocaleString("pt-BR"), "critica"],
      ["≤72h", Number(resumo.urgentes_72h || 0).toLocaleString("pt-BR"), "alta"],
    ];
    el.innerHTML =
      `<p class="prop-resumo-label">Síntese do recorte</p>` +
      `<div class="prop-chips">${chips
        .map(
          ([l, n, tone]) =>
            `<span class="prop-chip${tone ? ` prop-chip-${tone}` : ""}">` +
            `<span class="prop-chip-n">${escHtml(String(n))}</span>` +
            `<span class="prop-chip-l">${escHtml(l)}</span></span>`,
        )
        .join("")}</div>`;
  }

  function renderPropostasTabela() {
    const tbody = $("tbody-propostas");
    if (!tbody) return;
    markPropostasSortHeaders();
    if (!propLastItems.length) {
      tbody.innerHTML =
        `<tr><td colspan="${PROP_COLS}" class="muted">Nenhum item com proposta aberta neste filtro. ` +
        "Confira o horizonte, a coleta de itens e o prazo PNCP.</td></tr>";
      return;
    }
    tbody.innerHTML = propLastItems
      .map((r) => {
        const temResp = !!r.responsavel;
        const mark = pillResponsavel(r);
        const desc = (r.descricao_resumida || "—").slice(0, 90);
        const uasgLabel = r.unidade_nome
          ? `${r.unidade_compradora} · ${r.unidade_nome}`
          : r.unidade_compradora || "—";
        const mod = r.modalidade_descricao || "";
        return `<tr data-item-id="${r.item_id}" class="${temResp ? "compras-row--acomp" : ""}" title="Ver detalhe do item">
          <td class="col-prazo">${propPillUrgencia(r.urgencia, r.horas_restantes)}</td>
          <td class="col-num-compra" title="${escHtml(mod ? `${r.numero_compra} · ${mod}` : r.numero_compra || "")}"><strong>${escHtml(
            r.numero_compra || "—",
          )}</strong>${mark}</td>
          <td class="col-processo">${escHtml(r.processo || "—")}</td>
          <td class="col-num">${escHtml(r.numero_item ?? "—")}</td>
          <td title="${escHtml(r.descricao_resumida || "")}">${escHtml(desc)}</td>
          <td class="col-num">${escHtml(r.codigo_ncm || "—")}</td>
          <td class="col-num">${escHtml(r.quantidade || "—")}</td>
          <td class="col-num col-money">${escHtml(propFmtMoney(r.valor_unitario_estimado_num))}</td>
          <td class="col-num col-money">${escHtml(propFmtMoney(r.valor_total_num))}</td>
          <td class="col-num">${propPillDesvio(r.desvio_preco)}</td>
          <td class="col-uasg" title="${escHtml(uasgLabel)}">${escHtml(r.unidade_compradora || "—")}</td>
        </tr>`;
      })
      .join("");
    tbody.querySelectorAll("tr[data-item-id]").forEach((tr) => {
      tr.addEventListener("click", () => abrirDetalheProposta(tr.dataset.itemId));
    });
  }

  async function loadPropostas() {
    if (!isVisaoFilial()) return;
    const filialAtual = propFilialIdAtual();
    if (
      !propFiltrosCarregados ||
      (filialAtual != null && propFiltrosFilialId !== filialAtual)
    ) {
      await carregarPropostasFiltros();
    }
    const params = propFiltroParams();
    const tbody = $("tbody-propostas");
    const meta = $("prop-consulta-meta");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="${PROP_COLS}" class="muted">Carregando…</td></tr>`;
    }
    const [lista, resumo] = await Promise.all([
      api(`/api/propostas-abertas/itens?${params}`),
      api(`/api/propostas-abertas/resumo?${params}`),
    ]);
    if (!lista.res.ok) {
      propLastItems = [];
      propTotal = 0;
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="${PROP_COLS}" class="muted">${escHtml(
          lista.body?.detail || "Falha ao carregar.",
        )}</td></tr>`;
      }
      if (meta) meta.textContent = "Consulta indisponível.";
      renderPropostasResumo(null);
      syncPropostasPager();
      flashUnidade(lista.body?.detail || "Falha ao carregar propostas abertas.");
      return;
    }
    const body = lista.body || {};
    propLastItems = body.items || [];
    propTotal = Number(body.total || 0);
    propPageSize = Number(body.page_size) || PROP_PAGE_SIZE;
    propPage = Number(body.page) || propPage || 1;
    const horizonte = $("prop-filtro-horizonte")?.value || "todos";
    const rotuloEscopo = state.me?.escopo?.rotulo || "";
    if (meta) {
      meta.textContent =
        `${propTotal.toLocaleString("pt-BR")} item(ns) · horizonte ${horizonte}` +
        (rotuloEscopo ? ` · ${rotuloEscopo}` : "") +
        (body.aviso ? ` · ${body.aviso}` : "");
    }
    renderPropostasResumo(resumo.res.ok ? resumo.body : null);
    syncPropostasPager();
    renderPropostasTabela();
  }

  function propDl(pairs) {
    return pairs
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(
        ([k, v]) =>
          `<dt>${escHtml(k)}</dt><dd>${
            k === "Link PNCP"
              ? `<a href="${escHtml(v)}" target="_blank" rel="noopener">Abrir no PNCP</a>`
              : escHtml(v)
          }</dd>`,
      )
      .join("");
  }

  async function abrirDetalheProposta(itemId) {
    const { res, body } = await api(`/api/propostas-abertas/itens/${itemId}`);
    if (!res.ok) {
      flashUnidade(body?.detail || "Falha ao carregar item.");
      return;
    }
    propItemAtual = body;
    const dlg = $("modal-prop-item");
    const it = body.item || {};
    const c = body.contratacao || {};
    const titulo = [
      it.numero_item != null ? `Item ${it.numero_item}` : null,
      c.numero || null,
    ]
      .filter(Boolean)
      .join(" · ");
    $("modal-prop-titulo").textContent = titulo || "Item · proposta aberta";
    $("modal-prop-meta").textContent = [
      c.unidade_compradora ? `UASG ${c.unidade_compradora}` : null,
      c.modalidade_descricao,
      c.horas_restantes != null ? `${c.horas_restantes}h restantes` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    $("modal-prop-leitura").textContent = body.leitura || "";
    $("modal-prop-dados-item").innerHTML = propDl([
      ["Descrição", it.descricao_resumida],
      ["Detalhe", it.descricao_detalhada],
      ["NCM", it.codigo_ncm],
      ["Catálogo", it.cod_item_catalogo],
      ["Tipo", it.material_ou_servico_nome || it.material_ou_servico],
      ["Qtd", it.quantidade],
      ["Unidade", it.unidade_medida],
      ["Unitário est.", it.valor_unitario_estimado],
      ["Total est.", it.valor_total],
      ["Situação", it.situacao_item],
    ]);
    $("modal-prop-contratacao").innerHTML = propDl([
      ["Nº compra", c.numero],
      ["Processo", c.processo],
      ["Ano", c.ano],
      ["Modalidade", c.modalidade_descricao],
      ["UASG", c.unidade_compradora],
      ["Unidade", c.unidade_nome],
      ["Encerramento", c.data_encerramento_proposta_pncp],
      ["Link PNCP", c.link_pncp],
      ["Objeto", c.objeto],
    ]);
    const b = body.benchmark_catalogo;
    const desvio = body.desvio_preco;
    if (b) {
      $("modal-prop-benchmark").innerHTML = propDl([
        ["Origem", b.origem === "catalogo" ? "Mesmo catálogo" : "Mesma descrição"],
        ["Amostras", b.amostras],
        ["Mediana", b.mediana_fmt],
        ["Mínimo", b.minimo_fmt],
        ["Máximo", b.maximo_fmt],
        ["Média", b.media_fmt],
        ["Desvio", desvio?.percentual_fmt],
      ]);
    } else {
      $("modal-prop-benchmark").innerHTML =
        "<p class='muted' style='margin:0'>Sem amostra local suficiente.</p>";
    }
    const chave = $("modal-prop-campos-chave");
    if (chave) {
      const cards = [
        ["Prazo", propPillUrgencia(c.urgencia, c.horas_restantes)],
        ["Unitário", escHtml(it.valor_unitario_estimado || "—")],
        ["vs mediana", propPillDesvio(desvio)],
        ["Total", escHtml(it.valor_total || "—")],
      ];
      chave.innerHTML = cards
        .map(
          ([l, v]) =>
            `<div class="prop-chave"><span class="prop-chave-l">${escHtml(l)}</span>` +
            `<span class="prop-chave-v">${v}</span></div>`,
        )
        .join("");
    }
    const comps = body.comparaveis || [];
    $("modal-prop-comp-meta").textContent = comps.length
      ? `${comps.length} comparável(is) na base local`
      : "Nenhum comparável encontrado.";
    const tb = $("modal-prop-comparaveis");
    if (tb) {
      tb.innerHTML = comps.length
        ? comps
            .map(
              (x) => `<tr>
                <td>${escHtml(x.numero_compra || "—")}</td>
                <td>${escHtml(x.processo || "—")}</td>
                <td>${escHtml(x.unidade_nome || "—")}</td>
                <td class="col-num">${escHtml(x.valor_unitario || "—")}</td>
                <td>${escHtml(x.origem_preco || "—")}</td>
              </tr>`,
            )
            .join("")
        : `<tr><td colspan="5" class="muted">Sem comparáveis.</td></tr>`;
    }
    if (dlg && typeof dlg.showModal === "function") dlg.showModal();
    else if (dlg) dlg.setAttribute("open", "");
  }

  function fecharModalProposta() {
    const dlg = $("modal-prop-item");
    propItemAtual = null;
    if (!dlg) return;
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }

  $("form-propostas-busca")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    propPage = 1;
    loadPropostas();
  });
  $("btn-prop-limpar")?.addEventListener("click", () => {
    limparPropostasFiltros();
    loadPropostas();
  });
  $("prop-page-prev")?.addEventListener("click", () => {
    if (propPage <= 1) return;
    propPage -= 1;
    loadPropostas();
  });
  $("prop-page-next")?.addEventListener("click", () => {
    if (propPage >= propMaxPage()) return;
    propPage += 1;
    loadPropostas();
  });
  $("prop-tabela-head")?.addEventListener("click", (ev) => {
    const th = ev.target.closest("th.sortable");
    if (!th || !th.dataset.sort) return;
    const key = th.dataset.sort;
    if (propSortKey === key) {
      propSortDir = propSortDir === "asc" ? "desc" : "asc";
    } else {
      propSortKey = key;
      propSortDir = key === "horas_restantes" ? "asc" : "asc";
    }
    propPage = 1;
    loadPropostas();
  });
  $("modal-prop-fechar")?.addEventListener("click", () => fecharModalProposta());
  $("modal-prop-item")?.addEventListener("click", (ev) => {
    if (ev.target === $("modal-prop-item")) fecharModalProposta();
  });
  $("btn-prop-abrir-compra")?.addEventListener("click", () => {
    const cid = propItemAtual?.contratacao?.id;
    if (!cid) return;
    fecharModalProposta();
    abrirDetalheCompra(cid);
  });

  refreshMe();
})();
