(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $("#app");
  const state = {
    token: localStorage.getItem("zapvia_token") || "",
    me: null,
    meta: {
      deployment_mode: "saas",
      registration_mode: "open",
      registration_open: true,
      pairing_enabled: true,
      billing_auto_activate: false,
    },
    view: "landing",
    tab: "overview",
    error: "",
    notice: "",
    apiKeyOnce: sessionStorage.getItem("zapvia_api_key_once") || "",
    loading: false,
    messages: [],
    qr: null,
    qrPolling: null,
    showCloudForm: false,
    selectedSenderId: sessionStorage.getItem("zapvia_selected_sender") || "",
    addingSender: false,
  };

  const api = async (path, opts = {}) => {
    const headers = { ...(opts.headers || {}) };
    if (!(opts.body instanceof FormData) && opts.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const res = await fetch(path, { ...opts, headers, credentials: "include" });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
    if (!res.ok) {
      const msg = data?.detail?.message || data?.message || data?.detail || res.statusText;
      const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      err.status = res.status;
      throw err;
    }
    return data;
  };

  const isPrivate = () =>
    (state.me?.deployment_mode || state.meta?.deployment_mode) === "private";

  const canRegister = () => state.meta?.registration_open !== false;

  const guestEntry = () => (isPrivate() ? "login" : "landing");

  const normalizeGuestRoute = (route) => {
    if (!route || route === "landing") return guestEntry();
    return route;
  };

  const go = (view, tab) => {
    state.error = "";
    if (view === "signup" && !canRegister()) {
      state.view = "login";
      state.error = "Cadastro fechado nesta instância. Entre com a conta do operador.";
    } else {
      state.view = view;
    }
    if (tab) state.tab = tab;
    render();
  };

  const loadMe = async () => {
    if (!state.token) return;
    const q = state.selectedSenderId
      ? `?sender_id=${encodeURIComponent(state.selectedSenderId)}`
      : "";
    state.me = await api(`/v1/me${q}`);
    syncSelectedSender();
    if (state.me.onboarding_step === "ready") state.tab = state.tab || "overview";
  };
  const sendersList = () => state.me?.senders || (state.me?.sender ? [state.me.sender] : []);

  const syncSelectedSender = () => {
    const rows = sendersList();
    if (!rows.length) {
      state.selectedSenderId = "";
      sessionStorage.removeItem("zapvia_selected_sender");
      return;
    }
    const preferred = state.selectedSenderId || state.me?.selected_sender_id || "";
    const match = rows.find((s) => s.id === preferred);
    const pick = match || rows.find((s) => s.status === "active") || rows[0];
    state.selectedSenderId = pick.id;
    sessionStorage.setItem("zapvia_selected_sender", pick.id);
  };

  const selectedSender = () => {
    const rows = sendersList();
    return rows.find((s) => s.id === state.selectedSenderId) || rows[0] || null;
  };

  const selectSender = (id) => {
    state.selectedSenderId = id || "";
    state.addingSender = false;
    if (id) sessionStorage.setItem("zapvia_selected_sender", id);
    else sessionStorage.removeItem("zapvia_selected_sender");
  };


  const escapeHtml = (s) => String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

  const rememberApiKey = (key) => {
    state.apiKeyOnce = key || "";
    if (key) sessionStorage.setItem("zapvia_api_key_once", key);
    else sessionStorage.removeItem("zapvia_api_key_once");
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const docsCurl = (docs) => {
    let curl = docs?.curl || "";
    if (state.apiKeyOnce) {
      return curl
        .replace(/Bearer [^\s"'\\]+/, `Bearer ${state.apiKeyOnce}`)
        .replaceAll("$ZAPVIA_API_KEY", state.apiKeyOnce)
        .replaceAll("COLE_A_API_KEY_COMPLETA", state.apiKeyOnce);
    }
    return curl.replaceAll("COLE_A_API_KEY_COMPLETA", "$ZAPVIA_API_KEY");
  };

  const brand = (compact = false) => `
    <a class="brand" href="#/${guestEntry()}" data-go="${guestEntry()}">
      <span class="mark" aria-hidden="true"></span>
      <div>
        <div class="wordmark">ZapVia</div>
        ${compact ? "" : `<p class="byline">por Trigger Data Intelligence</p>`}
      </div>
    </a>`;

  const banner = () => {
    if (state.error) return `<div class="banner err">${escapeHtml(state.error)}</div>`;
    if (state.notice) return `<div class="banner ok">${escapeHtml(state.notice)}</div>`;
    return "";
  };

  const landing = () => `
    <div class="wrap">
      <header class="topbar">
        ${brand()}
        <div class="cta-row">
          <button class="btn ghost" data-go="login">Entrar</button>
          ${canRegister()
            ? `<button class="btn primary" data-go="signup">${isPrivate() ? "Conta do operador" : "Criar conta"}</button>`
            : ""}
        </div>
      </header>
      <section class="hero">
        <div>
          <p class="kicker">${isPrivate() ? "Hub privado · só o operador" : "WhatsApp Business · API de envio"}</p>
          <h1>${isPrivate()
            ? "Um site só seu. N números. API key por remetente nos seus sistemas."
            : "Envie Zap pelo seu sistema, com o número já cadastrado."}</h1>
          <p class="lede">${isPrivate()
            ? "Entre, cadastre cada WhatsApp Business (QR) e use a API key correspondente no setup do sistema que envia. Não há cadastro público: esta instância é só sua. Painel ou script entram no mesmo pipeline — destino e texto na requisição; o remetente já está no cadastro."
            : "Cadastre-se, pague a mensalidade, escaneie o QR do WhatsApp Business e receba o contrato da API. Painel, ERP ou script entram no mesmo pipeline: a mensagem é amarrada ao Zap cadastrado, vai para a fila daquele remetente e o worker envia."}</p>
          <ul class="points">
            <li>${isPrivate() ? "Só você opera o painel; seus sistemas só chamam a API." : "Qualquer origem: o remetente é sempre o número autenticado no painel."}</li>
            <li>Fila isolada por remetente, idempotência e status consultável.</li>
            <li>${isPrivate() ? "Quantos números precisar: cada um com key e fila próprias." : "Cloud API da Meta disponível como caminho avançado."}</li>
          </ul>
          <div class="cta-row">
            ${canRegister()
              ? `<button class="btn green" data-go="signup">${isPrivate() ? "Criar conta do operador" : "Começar agora"}</button>`
              : `<button class="btn green" data-go="login">Entrar na instância</button>`}
            ${canRegister() ? `<button class="btn ghost" data-go="login">Já tenho conta</button>` : ""}
          </div>
        </div>
        <div class="card">
          <p class="kicker">Contrato de envio</p>
          <h3>POST /v1/messages</h3>
          <pre class="mono">curl -X POST /v1/messages \\
  -H "Authorization: Bearer $ZAPVIA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "external_id": "pedido-1001",
    "to": "5534999999999",
    "type": "text",
    "body": "Pedido confirmado."
  }'</pre>
          <p class="muted">A API key aponta para o remetente cadastrado. O destino vai no campo <code>to</code>.</p>
        </div>
      </section>
      <section class="grid-3">
        <article class="card"><p class="step-n">01</p><h3>Receber</h3><p class="muted">Painel, API key ou o seu sistema. Destino e texto entram; o remetente não.</p></article>
        <article class="card"><p class="step-n">02</p><h3>Amarrar ao Zap</h3><p class="muted">A key (ou a sessão) aponta para o WhatsApp Business cadastrado. A fila é só daquele número.</p></article>
        <article class="card"><p class="step-n">03</p><h3>Enviar</h3><p class="muted">O worker consome <code>q.sender</code> daquele remetente e entrega no destino.</p></article>
      </section>
      <footer class="footer">ZapVia · TRIGGER Data Intelligence · WhatsApp é marca da Meta. Produto independente.</footer>
    </div>`;

  const authForm = (mode) => `
    <div class="auth-layout">
      <aside class="auth-aside">
        ${brand(true)}
        <div>
          <p class="kicker" style="color:#7cb518">API estável</p>
          <h2>O remetente fica no cadastro. A requisição só traz destino e texto.</h2>
        </div>
        <p class="byline" style="color:#9db0d0">Desenvolvido por TRIGGER Data Intelligence</p>
      </aside>
      <div class="auth-form">
          <h2 style="font-family:var(--display);margin:0 0 .3rem">${mode === "signup"
            ? (isPrivate() ? "Conta do operador" : "Criar conta")
            : "Entrar"}</h2>
        <p class="muted">${mode === "signup"
          ? (isPrivate()
            ? "Primeira e única conta desta instância. Em seguida conecte os números WhatsApp Business."
            : "Comece pelo cadastro. Em seguida a mensalidade e o número Business.")
          : (isPrivate() ? "Acesse o painel desta instância privada." : "Acesse o painel da sua API.")}</p>
        ${banner()}
        <form id="authForm">
          ${mode === "signup" ? `<label class="field"><span>Nome</span><input name="name" required minlength="2" /></label>` : ""}
          <label class="field"><span>E-mail</span><input name="email" type="email" required /></label>
          <label class="field"><span>Senha</span><input name="password" type="password" required minlength="${mode === "signup" ? 8 : 1}" /></label>
          <button class="btn primary" type="submit" style="width:100%">${mode === "signup"
            ? (isPrivate() ? "Criar conta do operador" : "Criar conta")
            : "Entrar"}</button>
        </form>
        <p class="muted" style="margin-top:1rem">
          ${mode === "signup" && canRegister()
            ? `Já tem conta? <a href="#/login" data-go="login">Entrar</a>`
            : canRegister()
              ? `Novo por aqui? <a href="#/signup" data-go="signup">Criar conta</a>`
              : `Instância privada — somente o operador.`}
        </p>
      </div>
    </div>`;

  const statusLabel = (status) => ({
    queued: "na fila",
    processing: "enviando",
    sent: "enviada",
    failed: "falhou",
    dead: "não entregue",
    received: "recebida",
    active: "ativo",
    ready: "pronto",
    billing: "mensalidade",
    connect: "conectar",
    pending: "pendente",
    pending_pair: "aguardando QR",
    rebind_required: "reconectar",
    paused: "pausado",
    credentials_invalid: "credencial inválida",
  }[status] || status);

  const sourceLabel = (source) => ({
    api: "API",
    portal: "painel",
  }[source] || source || "API");

  const flow = () => `
    <ol class="flow" aria-label="Pipeline de envio">
      <li><span class="n">1</span><strong>Receber</strong><p>Painel ou POST /v1/messages</p></li>
      <li><span class="n">2</span><strong>Remetente</strong><p>Zap Business cadastrado</p></li>
      <li><span class="n">3</span><strong>Fila</strong><p>q.sender do seu número</p></li>
      <li><span class="n">4</span><strong>Enviar</strong><p>Worker entrega no destino</p></li>
    </ol>`;

  const pill = (status) => {
    const raw = status || "none";
    return `<span class="status-pill ${escapeHtml(raw)}">${escapeHtml(statusLabel(raw))}</span>`;
  };

  const shell = (inner) => {
    const me = state.me;
    const step = me?.onboarding_step || "billing";
    return `
      <div class="app-shell">
        <aside class="side">
          ${brand(true)}
          <button class="nav ${state.tab === "overview" ? "active" : ""}" data-tab="overview">Visão geral</button>
          <button class="nav ${state.tab === "billing" ? "active" : ""}" data-tab="billing">${isPrivate() ? "Licença" : "Mensalidade"}</button>
          <button class="nav ${state.tab === "phone" ? "active" : ""}" data-tab="phone">WhatsApp Business</button>
          <button class="nav ${state.tab === "docs" ? "active" : ""}" data-tab="docs">Como enviar</button>
          <button class="nav ${state.tab === "inbox" ? "active" : ""}" data-tab="inbox">Envios</button>
          <div class="grow"></div>
          <p class="byline" style="padding:.5rem">${escapeHtml(me?.account?.email || "")}</p>
          <button class="nav" id="logout">Sair</button>
        </aside>
        <main class="main">
          <div class="page-h">
            <div>
              <p class="kicker">Onboarding · ${escapeHtml(step)}</p>
              <h2>${escapeHtml(me?.account?.name || "Painel")}</h2>
            </div>
            ${pill(me?.ready_to_send ? "active" : step)}
          </div>
          ${banner()}
          ${inner}
        </main>
      </div>`;
  };

  const overview = () => {
    const me = state.me;
    return `
      <div class="stats">
        <div class="card"><p class="muted">${isPrivate() ? "Licença" : "Mensalidade"}</p><h3>${escapeHtml(me.subscription.status)}</h3><p class="muted">${isPrivate() ? "instância interna · sem cobrança" : `${escapeHtml(me.subscription.price_label || "")} / mês`}</p></div>
        <div class="card"><p class="muted">Remetentes</p><h3>${(me.senders || []).length || (me.sender ? 1 : 0)}</h3><p class="muted">${escapeHtml(selectedSender()?.phone_e164 || selectedSender()?.name || "nenhum cadastrado")}</p></div>
        <div class="card"><p class="muted">API</p><h3>${me.ready_to_send ? "pronta" : "aguardando"}</h3><p class="muted">${escapeHtml(selectedSender()?.api_key_prefix || "—")}</p></div>
      </div>
      <div class="card">
        <h3>Pipeline de envio</h3>
        <p class="muted">Tudo o que entra — painel ou API — segue o mesmo caminho. O remetente é o número autenticado nesta conta; a requisição só traz destino e texto.</p>
        ${flow()}
        <p class="muted">${
          me.onboarding_step === "billing" ? (isPrivate() ? "A licença interna ainda não está ativa. Use Licença no menu se precisar renovar." : "Ative a mensalidade para liberar a conexão do número.") :
          me.onboarding_step === "connect" ? "Escaneie o QR do WhatsApp Business. Só depois a fila aceita envios." :
          "Conta apta. Use Envios no painel ou o contrato em Como enviar."
        }</p>
      </div>`;
  };

  const billing = () => {
    const sub = state.me.subscription;
    if (isPrivate()) {
      return `
      <div class="card">
        <h3>Licença desta instância</h3>
        <p class="lede">Sem cobrança. A assinatura sandbox libera o envio para o operador desta máquina.</p>
        <p class="muted">Status: ${pill(sub.status)} ${sub.current_period_end ? `· válido até ${new Date(sub.current_period_end).toLocaleString("pt-BR")}` : ""}</p>
        ${sub.status === "active"
          ? `<p class="muted" style="margin-top:1rem">Nada a pagar. Conecte o WhatsApp Business e use a API nos seus sistemas.</p>`
          : `<p style="margin-top:1rem"><button class="btn primary" id="payBtn">Ativar licença interna</button></p>`}
      </div>`;
    }
    return `
      <div class="card">
        <h3>${escapeHtml(sub.plan_name || "ZapVia Pro")}</h3>
        <p class="lede">${escapeHtml(sub.price_label || "R$ 97,00")} por 30 dias. Necessária para conectar o número e enviar.</p>
        <p class="muted">Status: ${pill(sub.status)} ${sub.current_period_end ? `· válido até ${new Date(sub.current_period_end).toLocaleString("pt-BR")}` : ""}</p>
        <p style="margin-top:1rem"><button class="btn primary" id="payBtn">Pagar mensalidade</button></p>
        <p class="muted">Ambiente local usa billing sandbox: a assinatura ativa na hora, sem cartão.</p>
      </div>`;
  };

  const stopQrPoll = () => {
    if (state.qrPolling) {
      clearInterval(state.qrPolling);
      state.qrPolling = null;
    }
  };

  const openQrDialog = (data) => {
    const dialog = $("#qrDialog");
    const img = $("#qrImage");
    const detail = $("#qrDetail");
    if (!dialog || !img) return;
    $("#qrTitle").textContent = "Conectar WhatsApp Business";
    detail.textContent = data?.detail
      || "Abra o WhatsApp Business → Aparelhos conectados → Conectar um aparelho";
    if (data?.qrcode_base64) {
      const b64 = data.qrcode_base64.startsWith("data:")
        ? data.qrcode_base64
        : `data:image/png;base64,${data.qrcode_base64}`;
      img.src = b64;
      img.style.display = "block";
    } else {
      img.removeAttribute("src");
      img.style.display = "none";
      detail.textContent += " — QR ainda não disponível; toque em Gerar novo.";
    }
    if (!dialog.open) dialog.showModal();
  };

  const startQrPoll = () => {
    stopQrPoll();
    state.qrPolling = setInterval(async () => {
      try {
        const sid = state.selectedSenderId ? `?sender_id=${encodeURIComponent(state.selectedSenderId)}` : "";
        const sender = await api(`/v1/senders/pair/status${sid}`);
        await loadMe();
        if (sender.status === "active") {
          stopQrPoll();
          const dialog = $("#qrDialog");
          if (dialog?.open) dialog.close();
          state.notice = "WhatsApp conectado. Envios liberados.";
          state.tab = "docs";
          render();
        } else if (state.view === "app" && state.tab === "phone") {
          const pillEl = document.querySelector("[data-pair-status]");
          if (pillEl) pillEl.outerHTML = pill(sender.status);
        }
      } catch {
        /* keep polling while dialog/session open */
      }
    }, 2500);
  };

  const phone = () => {
    const rows = sendersList();
    const s = selectedSender();
    const pairing = state.me.pairing_enabled;
    const waiting = s && ["pending_pair", "rebind_required"].includes(s.status);
    const creating = state.addingSender || !rows.length;
    const list = rows.map((row) => {
      const active = row.id === state.selectedSenderId;
      return `<button type="button" class="sender-chip ${active ? "active" : ""}" data-select-sender="${escapeHtml(row.id)}">
        <strong>${escapeHtml(row.label || row.name)}</strong>
        <span>${escapeHtml(row.phone_e164 || "sem número")}</span>
        ${pill(row.status)}
      </button>`;
    }).join("");
    return `
      ${state.apiKeyOnce ? `<div class="banner key">Guarde esta API key agora — ela não será exibida de novo:<br><code>${escapeHtml(state.apiKeyOnce)}</code>
        <div class="cta-row" style="margin-top:.75rem">
          <button class="btn green" type="button" id="copyKeyPhone">Copiar API key</button>
          <button class="btn ghost" type="button" data-tab="docs">Ver requisição pronta</button>
        </div></div>` : ""}
      <div class="card">
        <div class="page-h">
          <div>
            <h3>Remetentes WhatsApp</h3>
            <p class="muted">Cada número é um remetente com fila e API key próprias. Nos seus sistemas, guarde a key no setup da entidade que envia.</p>
          </div>
          <button class="btn primary" type="button" id="btnAddSender">${rows.length ? "Adicionar remetente" : "Cadastrar primeiro remetente"}</button>
        </div>
        ${rows.length ? `<div class="sender-list">${list}</div>` : `<p class="muted">Nenhum remetente ainda. Cadastre o primeiro número Business abaixo.</p>`}
      </div>
      ${creating || waiting || (s && pairing) ? `
      ${pairing ? `
      <div class="card pair-card" style="margin-top:1rem">
        <h3>${creating && rows.length ? "Novo remetente via QR" : "Conectar via QR Code"}</h3>
        <p class="muted">No celular: WhatsApp Business → <strong>Aparelhos conectados</strong> → Conectar um aparelho.</p>
        ${!creating && s ? `<p>Selecionado: <strong>${escapeHtml(s.label || s.name)}</strong> · <strong>${escapeHtml(s.phone_e164 || "aguardando scan")}</strong> <span data-pair-status>${pill(s.status)}</span> · ${escapeHtml(s.provider)}</p>` : ""}
        ${waiting && !creating ? `<div class="banner warn">Aguardando leitura do QR. Se expirou, gere um novo.</div>` : ""}
        <form id="pairForm">
          <label class="field"><span>Nome do remetente</span><input name="name" required value="${escapeHtml(creating ? "" : (s?.name || "comercial"))}" placeholder="ex.: Loja Centro" /></label>
          <label class="field"><span>Rótulo interno (opcional)</span><input name="label" maxlength="80" value="${escapeHtml(creating ? "" : (s?.label || ""))}" placeholder="ex.: sistema-x / cliente-acme" /></label>
          <label class="check">
            <input type="checkbox" name="business_confirmed" required />
            <span>Confirmo que este número é WhatsApp Business. Números pessoais não são aceitos.</span>
          </label>
          <div class="cta-row">
            <button class="btn primary" type="submit">${creating ? "Gerar QR do novo remetente" : (waiting ? "Gerar / renovar QR" : "Gerar QR e ativar")}</button>
            ${!creating && s && s.provider === "baileys" ? `<button class="btn ghost" type="button" id="btnRebind">Reconectar</button>` : ""}
            ${creating && rows.length ? `<button class="btn ghost" type="button" id="btnCancelAdd">Cancelar</button>` : ""}
          </div>
        </form>
      </div>
      <p class="muted" style="margin:1rem 0 .5rem">
        <button class="btn ghost" type="button" id="btnToggleCloud">${state.showCloudForm ? "Ocultar Cloud API / sandbox" : "Caminho avançado: Cloud API ou sandbox"}</button>
      </p>` : ""}
      ${(state.showCloudForm || !pairing) ? `
      <div class="card" style="margin-top:1rem">
        <h3>${pairing ? "Cloud API / sandbox" : (creating && rows.length ? "Novo remetente (Cloud / sandbox)" : "Cadastrar WhatsApp Business")}</h3>
        <p class="muted">${pairing
          ? "Use token permanente da Meta (produção) ou sandbox local sem Evolution."
          : "Somente número Business. No sandbox local o número é ativado após a confirmação Business."}</p>
        <form id="connectForm">
          <label class="field"><span>Nome do remetente</span><input name="name" required value="${escapeHtml(creating ? "" : (s?.name || "comercial"))}" /></label>
          <label class="field"><span>Rótulo interno (opcional)</span><input name="label" maxlength="80" value="${escapeHtml(creating ? "" : (s?.label || ""))}" placeholder="ex.: sistema-x / cliente-acme" /></label>
          <label class="field"><span>Celular (E.164, só dígitos)</span><input name="phone" required placeholder="5534999999999" value="${escapeHtml(creating ? "" : (s?.phone_e164 || ""))}" /></label>
          <label class="field"><span>Phone Number ID (Cloud API, opcional no sandbox)</span><input name="phone_number_id" value="${escapeHtml(creating ? "" : (s?.phone_number_id || ""))}" /></label>
          <label class="field"><span>WABA ID (opcional)</span><input name="waba_id" value="${escapeHtml(creating ? "" : (s?.waba_id || ""))}" /></label>
          <label class="field"><span>Token permanente Cloud API (opcional no sandbox)</span><input name="access_token" type="password" autocomplete="off" /></label>
          <label class="check">
            <input type="checkbox" name="business_confirmed" required />
            <span>Confirmo que este número é WhatsApp Business. Números pessoais não são aceitos.</span>
          </label>
          <div class="cta-row">
            <button class="btn primary" type="submit">${creating ? "Criar remetente e gerar API key" : "Conectar e gerar API key"}</button>
            ${creating && rows.length ? `<button class="btn ghost" type="button" id="btnCancelAddCloud">Cancelar</button>` : ""}
          </div>
        </form>
      </div>` : ""}` : `
      <div class="card" style="margin-top:1rem">
        <h3>Remetente selecionado</h3>
        <p>Nome: <strong>${escapeHtml(s.label || s.name)}</strong></p>
        <p>Número: <strong>${escapeHtml(s.phone_e164 || "—")}</strong> ${pill(s.status)} · ${escapeHtml(s.provider)}</p>
        <p class="muted">Prefixo da API key: <code class="mono">${escapeHtml(s.api_key_prefix)}</code>. Use a aba Como enviar para o contrato deste remetente.</p>
        <div class="cta-row">
          <button class="btn ghost" type="button" data-tab="docs">Como enviar com este remetente</button>
          ${s.provider === "baileys" ? `<button class="btn ghost" type="button" id="btnRebind">Reconectar QR</button>` : ""}
        </div>
      </div>`}
      <dialog id="qrDialog">
        <form method="dialog" class="qr-box">
          <h3 id="qrTitle">Conectar WhatsApp Business</h3>
          <p id="qrDetail" class="muted"></p>
          <img id="qrImage" alt="QR Code WhatsApp Business" />
          <p class="muted qr-hint">O status atualiza sozinho após o scan. Se o QR expirar, gere um novo.</p>
          <menu>
            <button class="btn ghost" value="cancel">Fechar</button>
            <button id="btnRefreshQr" class="btn primary" type="button">Gerar novo</button>
          </menu>
        </form>
      </dialog>`;
  };

  const docs = () => {
    const docs = state.me.api_docs;
    const s = selectedSender();
    if (!docs) {
      return `<div class="card"><h3>API ainda não liberada</h3><p class="muted">${isPrivate() ? "Conecte o WhatsApp Business. O contrato aparece aqui, já com a URL e o formato exato." : "Conclua mensalidade e cadastro do Business. O contrato aparece aqui, já com a URL e o formato exato."}</p></div>`;
    }
    const prefix = s?.api_key_prefix || state.me.sender?.api_key_prefix || "zpv_live_…";
    const curl = docsCurl(docs);
    const hasKey = Boolean(state.apiKeyOnce);
    return `
      <div class="card">
        <h3>O Zap já está no cadastro. A requisição só traz destino e texto.</h3>
        <p class="muted">Conectar o WhatsApp Business autentica o <strong>remetente</strong>. Isso não gera um token no celular nem um campo “digite aqui”. Para o seu sistema enfileirar um envio, use a <strong>API key</strong> da ZapVia.</p>
        ${flow()}
      </div>
      <div class="card" style="margin-top:1rem">
        <h3>1. API key</h3>
        <p class="muted">Vai no header <code>Authorization: Bearer …</code>. Não é a senha da conta, não é a sessão do painel e não é token da Meta.</p>
        <p>Prefixo visível: <code class="mono">${escapeHtml(prefix)}</code> — recorte de segurança. A key completa não fica guardada em texto.</p>
        ${hasKey ? `
          <div class="key-reveal">
            <code id="revealedKey">${escapeHtml(state.apiKeyOnce)}</code>
            <button class="btn green" type="button" id="copyKey">Copiar</button>
          </div>
          <p class="muted">Copie agora. Depois desta sessão ela some da tela.</p>
        ` : `
          <div class="banner warn">
            <code>$ZAPVIA_API_KEY</code> no exemplo abaixo é só o lugar da key — não existe um token escondido para achar.
            Se não copiou na conexão do QR, gere uma nova. O WhatsApp permanece conectado; a key antiga deixa de funcionar.
          </div>
        `}
        <div class="cta-row" style="margin-top:.8rem">
          <button class="btn ${hasKey ? "ghost" : "primary"}" type="button" id="rotateKey">${hasKey ? "Gerar outra API key" : "Gerar API key agora"}</button>
        </div>
      </div>
      <div class="card" style="margin-top:1rem">
        <div class="page-h" style="margin-bottom:.7rem">
          <h3>2. ${escapeHtml(docs.method)} ${escapeHtml(docs.url)}</h3>
          <button class="btn ghost" type="button" id="copyCurl">Copiar curl</button>
        </div>
        <pre class="mono" id="curlSnippet">${escapeHtml(curl)}</pre>
        <h3>Corpo</h3>
        <pre class="mono">${escapeHtml(JSON.stringify(docs.body, null, 2))}</pre>
        <table class="table">
          <thead><tr><th>campo</th><th>o que preencher</th></tr></thead>
          <tbody>
            <tr><td class="mono">external_id</td><td>ID seu (pedido, UUID). O mesmo id no mesmo remetente não duplica.</td></tr>
            <tr><td class="mono">to</td><td>Destinatário em E.164, só dígitos — ex. <code>5534999999999</code>. Não coloque o seu Zap aqui.</td></tr>
            <tr><td class="mono">type</td><td>Sempre <code>text</code> nesta versão.</td></tr>
            <tr><td class="mono">body</td><td>Texto que o destino recebe.</td></tr>
          </tbody>
        </table>
        <ul class="points">${docs.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
        <p class="muted">202 Accepted = na fila deste remetente. Consulta: <code>GET /v1/messages/by-external/{external_id}</code> com o mesmo Bearer.</p>
      </div>
      <div class="card" style="margin-top:1rem">
        <h3>Sem montar HTTP</h3>
        <p class="muted">A aba <strong>Envios</strong> usa a sessão do painel e entra no mesmo pipeline. Serve para testar o Zap sem a API key.</p>
        <p><button class="btn ghost" type="button" data-tab="inbox">Abrir Envios</button></p>
      </div>`;
  };

  const inbox = () => {
    const ready = state.me?.ready_to_send;
    const fromPhone = selectedSender()?.phone_e164 || selectedSender()?.name || state.me?.sender?.phone_e164 || "remetente cadastrado";
    const rows = state.messages.map((m) => `
      <tr>
        <td class="mono">${escapeHtml(m.external_id)}</td>
        <td>${escapeHtml(m.to)}</td>
        <td>${pill(m.status)}</td>
        <td>${escapeHtml(sourceLabel(m.source))}</td>
        <td>${escapeHtml((m.body || "").slice(0, 80))}</td>
        <td class="muted">${m.created_at ? new Date(m.created_at).toLocaleString("pt-BR") : ""}</td>
      </tr>`).join("");
    return `
      ${ready ? `
      <div class="card" style="margin-bottom:1rem">
        <h3>Enviar pelo Zap cadastrado</h3>
        <p class="muted">Remetente: <strong>${escapeHtml(fromPhone)}</strong>. Destino e texto entram aqui; internamente a mensagem segue a fila desse número — o mesmo caminho da API.</p>
        ${flow()}
        <form id="sendForm" class="send-form">
          <label class="field"><span>Destino (E.164, só dígitos)</span><input name="to" required placeholder="5534999999999" pattern="[0-9]{10,15}" /></label>
          <label class="field"><span>Texto</span><textarea name="body" required rows="3" maxlength="4096" placeholder="Sua mensagem"></textarea></label>
          <button class="btn green" type="submit">Enfileirar envio</button>
        </form>
      </div>` : `<div class="card" style="margin-bottom:1rem"><p class="muted">${isPrivate() ? "Conecte o WhatsApp Business para enviar." : "Conclua mensalidade e cadastro do Business para enviar."}</p></div>`}
      <div class="card">
        <div class="page-h"><h3>Fila deste remetente</h3><button class="btn ghost" id="refreshMsg">Atualizar</button></div>
        <table class="table">
          <thead><tr><th>external_id</th><th>destino</th><th>status</th><th>origem</th><th>texto</th><th>quando</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="6" class="muted">Nenhum envio ainda.</td></tr>`}</tbody>
        </table>
      </div>`;
  };

  const panel = () => {
    const map = { overview, billing, phone, docs, inbox };
    const fn = map[state.tab] || overview;
    return shell(fn());
  };

  const render = () => {
    if (state.view === "landing") app.innerHTML = landing();
    else if (state.view === "login" || state.view === "signup") app.innerHTML = authForm(state.view);
    else app.innerHTML = panel();
    bind();
  };

  const bind = () => {
    document.querySelectorAll("[data-go]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        go(el.getAttribute("data-go"));
      });
    });
    document.querySelectorAll("[data-select-sender]").forEach((el) => {
      el.addEventListener("click", async () => {
        selectSender(el.getAttribute("data-select-sender"));
        state.addingSender = false;
        state.error = "";
        try { await loadMe(); } catch (err) { state.error = err.message; }
        render();
      });
    });
    $("#btnAddSender")?.addEventListener("click", () => {
      state.addingSender = true;
      state.notice = "Preencha os dados do novo número. Cada remetente terá fila e API key próprias.";
      render();
    });
    $("#btnCancelAdd, #btnCancelAddCloud")?.addEventListener("click", () => {
      state.addingSender = false;
      render();
    });
    // cancel buttons are two ids — bind both
    ["btnCancelAdd", "btnCancelAddCloud"].forEach((id) => {
      document.getElementById(id)?.addEventListener("click", () => {
        state.addingSender = false;
        render();
      });
    });
    document.querySelectorAll("[data-tab]").forEach((el) => {
      el.addEventListener("click", async () => {
        state.tab = el.getAttribute("data-tab");
        state.error = "";
        if (state.tab === "inbox") {
          try {
          const sid = state.selectedSenderId ? `?sender_id=${encodeURIComponent(state.selectedSenderId)}` : "";
          state.messages = await api(`/v1/me/messages${sid}`);
        } catch (err) { state.error = err.message; }
        }
        render();
      });
    });
    const authFormEl = $("#authForm");
    if (authFormEl) {
      authFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(authFormEl);
        const body = Object.fromEntries(fd.entries());
        try {
          const path = state.view === "signup" ? "/v1/auth/register" : "/v1/auth/login";
          const data = await api(path, { method: "POST", body: JSON.stringify(body) });
          state.token = data.access_token;
          localStorage.setItem("zapvia_token", state.token);
          await loadMe();
          state.view = "app";
          state.tab = state.me.onboarding_step === "ready" ? "overview" : state.me.onboarding_step === "connect" ? "phone" : "billing";
          state.notice = isPrivate() && state.me.billing_auto_activate
            ? "Conta pronta. Conecte o WhatsApp Business."
            : "Sessão iniciada.";
          render();
        } catch (err) {
          state.error = err.message;
          render();
        }
      });
    }
    $("#logout")?.addEventListener("click", async () => {
      try { await api("/v1/auth/logout", { method: "POST" }); } catch { /* ignore */ }
      state.token = "";
      state.me = null;
      rememberApiKey("");
      localStorage.removeItem("zapvia_token");
      go(guestEntry());
    });
    $("#payBtn")?.addEventListener("click", async () => {
      try {
        await api("/v1/billing/checkout", { method: "POST", body: "{}" });
        await loadMe();
        state.notice = isPrivate()
          ? "Licença ativa. Conecte o WhatsApp Business pelo QR."
          : "Mensalidade ativa. Conecte o WhatsApp Business pelo QR.";
        state.tab = "phone";
        render();
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
    $("#pairForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        state.loading = true;
        const creating = state.addingSender || !sendersList().length;
        const data = await api("/v1/senders/pair", {
          method: "POST",
          body: JSON.stringify({
            name: fd.get("name"),
            label: fd.get("label") || null,
            label: fd.get("label") || null,
            business_confirmed: fd.get("business_confirmed") === "on",
            as_new: creating,
            sender_id: creating ? null : (state.selectedSenderId || null),
          }),
        });
        if (data.sender?.id) selectSender(data.sender.id);
        state.addingSender = false;
        if (data.api_key) rememberApiKey(data.api_key);
        state.qr = data;
        state.notice = "QR gerado. Escaneie no celular e aguarde a confirmação.";
        state.error = "";
        startQrPoll();
        render();
        openQrDialog(data);
      } catch (err) {
        state.error = err.message;
        render();
      } finally {
        state.loading = false;
      }
    });
    $("#btnRebind")?.addEventListener("click", async () => {
      try {
        const sid = state.selectedSenderId ? `?sender_id=${encodeURIComponent(state.selectedSenderId)}` : "";
        const data = await api(`/v1/senders/rebind${sid}`, { method: "POST", body: "{}" });
        state.qr = data;
        state.notice = "Novo QR gerado. Escaneie para reconectar.";
        startQrPoll();
        render();
        openQrDialog(data);
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
    $("#btnToggleCloud")?.addEventListener("click", () => {
      state.showCloudForm = !state.showCloudForm;
      render();
    });
    $("#btnRefreshQr")?.addEventListener("click", async () => {
      const cur = selectedSender();
      const name = cur?.name || state.me?.sender?.name || "comercial";
      try {
        const data = await api("/v1/senders/pair", {
          method: "POST",
          body: JSON.stringify({
            name,
            business_confirmed: true,
            sender_id: state.selectedSenderId || null,
            as_new: false,
          }),
        });
        state.qr = data;
        openQrDialog(data);
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
    $("#qrDialog")?.addEventListener("close", () => {
      /* polling continues until active */
    });
    $("#connectForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const creating = state.addingSender || !sendersList().length;
      const body = {
        name: fd.get("name"),
        label: fd.get("label") || null,
        phone: fd.get("phone"),
        business_confirmed: fd.get("business_confirmed") === "on",
        phone_number_id: fd.get("phone_number_id") || null,
        waba_id: fd.get("waba_id") || null,
        access_token: fd.get("access_token") || null,
        as_new: creating,
        sender_id: creating ? null : (state.selectedSenderId || null),
      };
      try {
        const created = await api("/v1/senders/connect", { method: "POST", body: JSON.stringify(body) });
        if (created.id) selectSender(created.id);
        state.addingSender = false;
        rememberApiKey(created.api_key);
        stopQrPoll();
        await loadMe();
        state.notice = "WhatsApp Business conectado. A API está apta a receber requisições.";
        state.tab = "docs";
        render();
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
    $("#copyKeyPhone")?.addEventListener("click", async () => {
      const ok = await copyText(state.apiKeyOnce);
      state.notice = ok ? "API key copiada." : "Não foi possível copiar. Selecione o texto e copie manualmente.";
      render();
    });
    $("#copyKey")?.addEventListener("click", async () => {
      const ok = await copyText(state.apiKeyOnce);
      state.notice = ok ? "API key copiada." : "Não foi possível copiar. Selecione o texto e copie manualmente.";
      render();
    });
    $("#copyCurl")?.addEventListener("click", async () => {
      const snippet = $("#curlSnippet")?.textContent || "";
      const ok = await copyText(snippet);
      state.notice = ok ? "curl copiado." : "Não foi possível copiar. Selecione o bloco e copie manualmente.";
      render();
    });
    $("#rotateKey")?.addEventListener("click", async () => {
      const warn = state.apiKeyOnce
        ? "A API key atual deixa de funcionar. O WhatsApp permanece conectado. Gerar outra?"
        : "Isso gera a API key do seu sistema. O WhatsApp permanece conectado. Continuar?";
      if (!window.confirm(warn)) return;
      try {
        const sid = state.selectedSenderId ? `?sender_id=${encodeURIComponent(state.selectedSenderId)}` : "";
        const created = await api(`/v1/senders/rotate-key${sid}`, { method: "POST", body: "{}" });
        rememberApiKey(created.api_key);
        await loadMe();
        state.notice = "API key gerada. Copie agora — ela não será exibida de novo.";
        state.error = "";
        state.tab = "docs";
        render();
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
    $("#refreshMsg")?.addEventListener("click", async () => {
      try {
          const sid = state.selectedSenderId ? `?sender_id=${encodeURIComponent(state.selectedSenderId)}` : "";
          state.messages = await api(`/v1/me/messages${sid}`);
        } catch (err) { state.error = err.message; }
      render();
    });
    $("#sendForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = { to: fd.get("to"), body: fd.get("body"), sender_id: state.selectedSenderId || null };
      try {
        const sent = await api("/v1/me/messages", { method: "POST", body: JSON.stringify(body) });
        const sid = state.selectedSenderId ? `?sender_id=${encodeURIComponent(state.selectedSenderId)}` : "";
        state.messages = await api(`/v1/me/messages${sid}`);
        state.notice = `Na fila do remetente (${sent.external_id}). Status: ${statusLabel(sent.status)}.`;
        state.error = "";
        e.target.reset();
        render();
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
  };

  const boot = async () => {
    try {
      state.meta = await api("/v1/meta");
    } catch {
      /* defaults keep local SaaS copy if meta is unavailable */
    }
    const hash = (location.hash || "").replace(/^#\/?/, "");
    const route = normalizeGuestRoute(hash);
    if (["login", "signup"].includes(route)) state.view = route;
    else if (!hash || route === guestEntry()) state.view = guestEntry();
    if (isPrivate() && (!hash || hash === "landing") && state.view === "login" && !state.token) {
      history.replaceState(null, "", "#/login");
    }
    if (state.view === "signup" && !canRegister()) {
      state.view = "login";
      state.error = "Cadastro fechado nesta instância. Entre com a conta do operador.";
    }
    if (state.token) {
      try {
        await loadMe();
        state.view = "app";
      } catch {
        state.token = "";
        localStorage.removeItem("zapvia_token");
      }
    }
    render();
  };

  boot();
})();
