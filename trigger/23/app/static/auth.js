/* ============================================================
   auth.js — login, bootstrap, papéis e filtro do menu
   Observatório Social · Licitações Uberlândia
   ============================================================ */

window.OSB = window.OSB || { loaders: {} };
window.OSB._authGen = window.OSB._authGen || 0;

const PAPEL_LABEL = { admin: "Administrador", consulta: "Consulta" };

function authMsg(texto, ok) {
  const el = $("#auth-gate-msg");
  if (!el) return;
  el.textContent = texto || "";
  el.className = texto ? `meta-line ${ok ? "ok" : "err"}` : "meta-line";
}

function mostrarTakeover(visivel) {
  const box = $("#auth-login-takeover");
  if (box) box.hidden = !visivel;
}

function bumpAuthGen() {
  window.OSB._authGen = (window.OSB._authGen || 0) + 1;
}

function mostrarGate(modo) {
  const gate = $("#auth-gate");
  const shell = $("#app-shell");
  if (gate) gate.hidden = false;
  if (shell) shell.hidden = true;
  const login = $("#auth-login-panel");
  const boot = $("#auth-bootstrap-panel");
  if (login) login.hidden = modo !== "login";
  if (boot) boot.hidden = modo !== "bootstrap";
  document.body.classList.add("auth-locked");
}

function liberarApp(me) {
  bumpAuthGen();
  window.OSB.usuario = me;
  const gate = $("#auth-gate");
  const shell = $("#app-shell");
  if (gate) gate.hidden = true;
  if (shell) shell.hidden = false;
  document.body.classList.remove("auth-locked");
  aplicarPermissoesNav(me);
  atualizarBoxUsuario(me);
  if (typeof window.OSB.iniciarShell === "function") {
    window.OSB.iniciarShell();
  }
  // Setup wizard só após login (admin) — adiado para não competir com o 1º paint.
  if (me?.papel === "admin" && typeof window.verificarSetupInicial === "function") {
    setTimeout(() => {
      try {
        window.verificarSetupInicial();
      } catch (err) {
        console.error("Setup inicial:", err);
      }
    }, 0);
  }
}

function aplicarPermissoesNav(me) {
  const paginas = me?.permissoes?.paginas || {};
  $$(".nav-btn").forEach((btn) => {
    const page = btn.dataset.page;
    const roles = (btn.dataset.roles || "admin,consulta").split(",").map((s) => s.trim());
    const permitido =
      paginas[page] !== false && roles.includes(me?.papel || "");
    btn.hidden = !permitido;
  });
  // Esconde rótulos de grupo sem botões visíveis.
  $$(".nav-group-label").forEach((label) => {
    let el = label.nextElementSibling;
    let algum = false;
    while (el && !el.classList.contains("nav-group-label")) {
      if (el.classList.contains("nav-btn") && !el.hidden) algum = true;
      el = el.nextElementSibling;
    }
    label.hidden = !algum;
  });
}

function atualizarBoxUsuario(me) {
  const box = $("#auth-user-box");
  if (!box) return;
  if (!me) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const nome = $("#auth-user-name");
  const papel = $("#auth-user-papel");
  if (nome) nome.textContent = me.username;
  if (papel) papel.textContent = PAPEL_LABEL[me.papel] || me.papel;
}

async function carregarPerfil() {
  try {
    return await api("/api/auth/me");
  } catch (err) {
    if (err.status === 401) return null;
    throw err;
  }
}

/**
 * Após login/bootstrap: confirma que o cookie de sessão foi aceito
 * antes de abrir o app (evita flash → volta para o login).
 */
async function concluirAutenticacao(meFromLogin) {
  bumpAuthGen();
  // Pequena folga para o browser gravar o Set-Cookie da resposta.
  await new Promise((r) => setTimeout(r, 30));
  const me = await carregarPerfil();
  if (!me) {
    mostrarGate("login");
    authMsg(
      "Conta ok, mas o navegador não gravou a sessão (cookie). " +
        "Permita cookies para este site e tente entrar de novo.",
      false,
    );
    return;
  }
  liberarApp(me || meFromLogin);
}

async function iniciarAuth() {
  document.body.classList.add("auth-locked");
  try {
    const st = await api("/api/auth/bootstrap-status");
    if (st.precisa_bootstrap) {
      mostrarGate("bootstrap");
      return;
    }
    const me = await carregarPerfil();
    if (me) {
      liberarApp(me);
      return;
    }
    mostrarGate("login");
    mostrarTakeover(false);
  } catch (err) {
    mostrarGate("login");
    mostrarTakeover(false);
    authMsg(err.message || "Não foi possível verificar a sessão.", false);
  }
}

async function onLogin(e) {
  e.preventDefault();
  await executarLogin({ encerrarSessaoAnterior: false });
}

async function onLoginTakeover() {
  await executarLogin({ encerrarSessaoAnterior: true });
}

async function executarLogin({ encerrarSessaoAnterior }) {
  const btn = $("#btn-auth-login");
  const btnTake = $("#btn-auth-login-takeover");
  const username = $("#auth-login-user")?.value?.trim() || "";
  const password = $("#auth-login-pass")?.value || "";
  if (!username || !password) return;
  if (btn) btn.disabled = true;
  if (btnTake) btnTake.disabled = true;
  authMsg(encerrarSessaoAnterior ? "Encerrando sessão anterior…" : "Entrando…", true);
  try {
    const me = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        encerrar_sessao_anterior: !!encerrarSessaoAnterior,
      }),
    });
    mostrarTakeover(false);
    authMsg("Confirmando sessão…", true);
    await concluirAutenticacao(me);
    authMsg("");
  } catch (err) {
    if (!encerrarSessaoAnterior && err.status === 409) {
      mostrarTakeover(true);
      authMsg(err.message || "Sessão ativa em outro lugar.", false);
      return;
    }
    authMsg(err.message, false);
  } finally {
    if (btn) btn.disabled = false;
    if (btnTake) btnTake.disabled = false;
  }
}

async function onBootstrap(e) {
  e.preventDefault();
  const btn = $("#btn-auth-bootstrap");
  const username = $("#auth-boot-user")?.value?.trim() || "";
  const password = $("#auth-boot-pass")?.value || "";
  const password2 = $("#auth-boot-pass2")?.value || "";
  if (password !== password2) {
    authMsg("As senhas não coincidem.", false);
    return;
  }
  btn.disabled = true;
  authMsg("Criando administrador…", true);
  try {
    const me = await api("/api/auth/bootstrap", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    authMsg("Confirmando sessão…", true);
    await concluirAutenticacao(me);
    authMsg("");
  } catch (err) {
    // Se o admin já foi criado (ex.: retry), oferece o login.
    if (err.status === 409) {
      authMsg("Administrador já existe. Faça login com o usuário criado.", false);
      mostrarGate("login");
      if ($("#auth-login-user")) $("#auth-login-user").value = username;
      return;
    }
    authMsg(err.message, false);
  } finally {
    btn.disabled = false;
  }
}

async function onLogout() {
  try {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
  } catch { /* ignore */ }
  bumpAuthGen();
  window.OSB.usuario = null;
  mostrarGate("login");
  mostrarTakeover(false);
  authMsg("Sessão encerrada.", true);
  if ($("#auth-login-pass")) $("#auth-login-pass").value = "";
}

window.OSB.onUnauthorized = () => {
  if (document.body.classList.contains("auth-locked")) return;
  if (!window.OSB.usuario) return;
  bumpAuthGen();
  window.OSB.usuario = null;
  mostrarGate("login");
  mostrarTakeover(false);
  authMsg("Sessão expirada. Faça login novamente.", false);
};

document.addEventListener("DOMContentLoaded", () => {
  $("#form-auth-login")?.addEventListener("submit", onLogin);
  $("#btn-auth-login-takeover")?.addEventListener("click", onLoginTakeover);
  $("#form-auth-bootstrap")?.addEventListener("submit", onBootstrap);
  $("#btn-auth-logout")?.addEventListener("click", onLogout);
  iniciarAuth();
});
