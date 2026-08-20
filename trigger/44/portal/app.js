(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $("#app");
  const state = {
    token: localStorage.getItem("zapvia_token") || "",
    me: null,
    view: "landing",
    tab: "overview",
    error: "",
    notice: "",
    apiKeyOnce: "",
    loading: false,
    messages: [],
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

  const go = (view, tab) => {
    state.view = view;
    if (tab) state.tab = tab;
    state.error = "";
    render();
  };

  const loadMe = async () => {
    if (!state.token) return;
    state.me = await api("/v1/me");
    if (state.me.onboarding_step === "ready") state.tab = state.tab || "overview";
  };

  const escapeHtml = (s) => String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

  const brand = (compact = false) => `
    <a class="brand" href="#/" data-go="landing">
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
          <button class="btn primary" data-go="signup">Criar conta</button>
        </div>
      </header>
      <section class="hero">
        <div>
          <p class="kicker">WhatsApp Business · API oficial</p>
          <h1>Envie Zap pelo seu sistema, com o número já cadastrado.</h1>
          <p class="lede">Cadastre-se, pague a mensalidade, conecte o WhatsApp Business e receba o contrato da API. Destinatário e texto entram na requisição; o remetente é o celular autenticado — e a autenticação não cai como sessão de QR.</p>
          <ul class="points">
            <li>Somente WhatsApp Business (Cloud API da Meta).</li>
            <li>Token persistente. Sem “aparelho conectado” que desloga.</li>
            <li>Fila, idempotência e isolamento por conta.</li>
          </ul>
          <div class="cta-row">
            <button class="btn green" data-go="signup">Começar agora</button>
            <button class="btn ghost" data-go="login">Já tenho conta</button>
          </div>
        </div>
        <div class="card">
          <p class="kicker">Contrato de envio</p>
          <h3>POST /v1/messages</h3>
          <pre class="mono">curl -X POST /v1/messages \\
  -H "Authorization: Bearer zpv_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "external_id": "pedido-1001",
    "to": "5534999999999",
    "type": "text",
    "body": "Pedido confirmado."
  }'</pre>
          <p class="muted">A key aponta para o remetente cadastrado. O destino vai no campo <code>to</code>.</p>
        </div>
      </section>
      <section class="grid-3">
        <article class="card"><p class="step-n">01</p><h3>Conta e mensalidade</h3><p class="muted">Login próprio. A API só envia com a assinatura ativa.</p></article>
        <article class="card"><p class="step-n">02</p><h3>Cadastrar o Business</h3><p class="muted">Número E.164. Em produção, token permanente da Cloud API.</p></article>
        <article class="card"><p class="step-n">03</p><h3>Disparar pelo seu sistema</h3><p class="muted">ERP, CRM ou script: uma requisição, 202 Accepted, status consultável.</p></article>
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
        <h2 style="font-family:var(--display);margin:0 0 .3rem">${mode === "signup" ? "Criar conta" : "Entrar"}</h2>
        <p class="muted">${mode === "signup" ? "Comece pelo cadastro. Em seguida a mensalidade e o número Business." : "Acesse o painel da sua API."}</p>
        ${banner()}
        <form id="authForm">
          ${mode === "signup" ? `<label class="field"><span>Nome</span><input name="name" required minlength="2" /></label>` : ""}
          <label class="field"><span>E-mail</span><input name="email" type="email" required /></label>
          <label class="field"><span>Senha</span><input name="password" type="password" required minlength="${mode === "signup" ? 8 : 1}" /></label>
          <button class="btn primary" type="submit" style="width:100%">${mode === "signup" ? "Criar conta" : "Entrar"}</button>
        </form>
        <p class="muted" style="margin-top:1rem">
          ${mode === "signup" ? `Já tem conta? <a href="#/login" data-go="login">Entrar</a>` : `Novo por aqui? <a href="#/signup" data-go="signup">Criar conta</a>`}
        </p>
      </div>
    </div>`;

  const pill = (status) => `<span class="status-pill ${escapeHtml(status || "none")}">${escapeHtml(status || "—")}</span>`;

  const shell = (inner) => {
    const me = state.me;
    const step = me?.onboarding_step || "billing";
    return `
      <div class="app-shell">
        <aside class="side">
          ${brand(true)}
          <button class="nav ${state.tab === "overview" ? "active" : ""}" data-tab="overview">Visão geral</button>
          <button class="nav ${state.tab === "billing" ? "active" : ""}" data-tab="billing">Mensalidade</button>
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
        <div class="card"><p class="muted">Mensalidade</p><h3>${escapeHtml(me.subscription.status)}</h3><p class="muted">${escapeHtml(me.subscription.price_label || "")} / mês</p></div>
        <div class="card"><p class="muted">Remetente</p><h3>${escapeHtml(me.sender?.phone_e164 || "não cadastrado")}</h3><p class="muted">${escapeHtml(me.sender?.status || "pendente")}</p></div>
        <div class="card"><p class="muted">API</p><h3>${me.ready_to_send ? "pronta" : "aguardando"}</h3><p class="muted">${escapeHtml(me.sender?.api_key_prefix || "—")}</p></div>
      </div>
      <div class="card">
        <h3>Próximo passo</h3>
        <p class="muted">${
          me.onboarding_step === "billing" ? "Ative a mensalidade para liberar o cadastro do número." :
          me.onboarding_step === "connect" ? "Cadastre o WhatsApp Business. Só depois a API aceita envios." :
          "Sua conta está apta. Use o contrato em Como enviar."
        }</p>
      </div>`;
  };

  const billing = () => {
    const sub = state.me.subscription;
    return `
      <div class="card">
        <h3>${escapeHtml(sub.plan_name || "ZapVia Pro")}</h3>
        <p class="lede">${escapeHtml(sub.price_label || "R$ 97,00")} por 30 dias. Necessária para conectar o número e enviar.</p>
        <p class="muted">Status: ${pill(sub.status)} ${sub.current_period_end ? `· válido até ${new Date(sub.current_period_end).toLocaleString("pt-BR")}` : ""}</p>
        <p style="margin-top:1rem"><button class="btn primary" id="payBtn">Pagar mensalidade</button></p>
        <p class="muted">Ambiente local usa billing sandbox: a assinatura ativa na hora, sem cartão.</p>
      </div>`;
  };

  const phone = () => {
    const s = state.me.sender;
    return `
      ${state.apiKeyOnce ? `<div class="banner key">Guarde esta API key agora — ela não será exibida de novo:<br>${escapeHtml(state.apiKeyOnce)}</div>` : ""}
      <div class="card">
        <h3>Cadastrar WhatsApp Business</h3>
        <p class="muted">Somente número Business. A autenticação é o token da Cloud API — persistente, sem QR que cai. No sandbox local o número é ativado após a confirmação Business.</p>
        ${s ? `<p>Atual: <strong>${escapeHtml(s.phone_e164)}</strong> ${pill(s.status)} · ${escapeHtml(s.provider)}</p>` : ""}
        <form id="connectForm">
          <label class="field"><span>Nome do remetente</span><input name="name" required value="${escapeHtml(s?.name || "comercial")}" /></label>
          <label class="field"><span>Celular (E.164, só dígitos)</span><input name="phone" required placeholder="5534999999999" value="${escapeHtml(s?.phone_e164 || "")}" /></label>
          <label class="field"><span>Phone Number ID (Cloud API, opcional no sandbox)</span><input name="phone_number_id" value="${escapeHtml(s?.phone_number_id || "")}" /></label>
          <label class="field"><span>WABA ID (opcional)</span><input name="waba_id" value="${escapeHtml(s?.waba_id || "")}" /></label>
          <label class="field"><span>Token permanente Cloud API (opcional no sandbox)</span><input name="access_token" type="password" autocomplete="off" /></label>
          <label class="check">
            <input type="checkbox" name="business_confirmed" required />
            <span>Confirmo que este número é WhatsApp Business. Números pessoais não são aceitos.</span>
          </label>
          <button class="btn primary" type="submit">Conectar e gerar API key</button>
        </form>
      </div>`;
  };

  const curlExample = (curl) => {
    if (!state.apiKeyOnce) return curl;
    return curl.replace(/Bearer [^\s"\\]+/, `Bearer ${state.apiKeyOnce}`);
  };

  const docs = () => {
    const docs = state.me.api_docs;
    if (!docs) {
      return `<div class="card"><h3>API ainda não liberada</h3><p class="muted">Conclua mensalidade e cadastro do Business. O contrato aparece aqui, já com a URL e o formato exato.</p></div>`;
    }
    return `
      <div class="card">
        <h3>${escapeHtml(docs.method)} ${escapeHtml(docs.url)}</h3>
        <p class="muted">Autentique com a API key do remetente cadastrado. O sistema envia a partir desse número. Cole a key numa única linha — sem outro <code>zpv_live_</code> na frente.</p>
        <pre class="mono">${escapeHtml(curlExample(docs.curl))}</pre>
        <h3>Corpo</h3>
        <pre class="mono">${escapeHtml(JSON.stringify(docs.body, null, 2))}</pre>
        <ul class="points">${docs.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
        <p class="muted">Consulta: <code>GET /v1/messages/by-external/{external_id}</code> com o mesmo Bearer.</p>
      </div>`;
  };

  const inbox = () => {
    const ready = state.me?.ready_to_send;
    const rows = state.messages.map((m) => `
      <tr>
        <td class="mono">${escapeHtml(m.external_id)}</td>
        <td>${escapeHtml(m.to)}</td>
        <td>${pill(m.status)}</td>
        <td>${escapeHtml((m.body || "").slice(0, 80))}</td>
        <td class="muted">${m.created_at ? new Date(m.created_at).toLocaleString("pt-BR") : ""}</td>
      </tr>`).join("");
    return `
      ${ready ? `
      <div class="card" style="margin-bottom:1rem">
        <h3>Enviar para o destino</h3>
        <p class="muted">Dispara pelo remetente cadastrado. O worker entrega na fila e atualiza o status abaixo.</p>
        <form id="sendForm" class="send-form">
          <label class="field"><span>Destino (E.164, só dígitos)</span><input name="to" required placeholder="5534999999999" pattern="[0-9]{10,15}" /></label>
          <label class="field"><span>Texto</span><textarea name="body" required rows="3" maxlength="4096" placeholder="Sua mensagem"></textarea></label>
          <button class="btn green" type="submit">Enviar agora</button>
        </form>
      </div>` : `<div class="card" style="margin-bottom:1rem"><p class="muted">Conclua mensalidade e cadastro do Business para enviar.</p></div>`}
      <div class="card">
        <div class="page-h"><h3>Últimos envios</h3><button class="btn ghost" id="refreshMsg">Atualizar</button></div>
        <table class="table">
          <thead><tr><th>external_id</th><th>destino</th><th>status</th><th>texto</th><th>quando</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" class="muted">Nenhum envio ainda.</td></tr>`}</tbody>
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
    document.querySelectorAll("[data-tab]").forEach((el) => {
      el.addEventListener("click", async () => {
        state.tab = el.getAttribute("data-tab");
        state.error = "";
        if (state.tab === "inbox") {
          try { state.messages = await api("/v1/me/messages"); } catch (err) { state.error = err.message; }
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
          state.notice = "Sessão iniciada.";
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
      localStorage.removeItem("zapvia_token");
      go("landing");
    });
    $("#payBtn")?.addEventListener("click", async () => {
      try {
        await api("/v1/billing/checkout", { method: "POST", body: "{}" });
        await loadMe();
        state.notice = "Mensalidade ativa. Cadastre o WhatsApp Business.";
        state.tab = "phone";
        render();
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
    $("#connectForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {
        name: fd.get("name"),
        phone: fd.get("phone"),
        business_confirmed: fd.get("business_confirmed") === "on",
        phone_number_id: fd.get("phone_number_id") || null,
        waba_id: fd.get("waba_id") || null,
        access_token: fd.get("access_token") || null,
      };
      try {
        const created = await api("/v1/senders/connect", { method: "POST", body: JSON.stringify(body) });
        state.apiKeyOnce = created.api_key;
        await loadMe();
        state.notice = "WhatsApp Business conectado. A API está apta a receber requisições.";
        state.tab = "docs";
        render();
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
    $("#refreshMsg")?.addEventListener("click", async () => {
      try { state.messages = await api("/v1/me/messages"); } catch (err) { state.error = err.message; }
      render();
    });
    $("#sendForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = { to: fd.get("to"), body: fd.get("body") };
      try {
        const sent = await api("/v1/me/messages", { method: "POST", body: JSON.stringify(body) });
        state.messages = await api("/v1/me/messages");
        state.notice = `Mensagem enfileirada (${sent.external_id}). Status: ${sent.status}.`;
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
    const hash = (location.hash || "#/").replace("#/", "") || "landing";
    if (["login", "signup"].includes(hash)) state.view = hash;
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
