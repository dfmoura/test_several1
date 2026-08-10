(() => {
  const $ = (sel) => document.querySelector(sel);

  const state = {
    apiBase: localStorage.getItem("zg_api") || "http://localhost:8141",
    token: sessionStorage.getItem("zg_admin") || "",
    activePairSender: null,
  };

  $("#apiBase").value = state.apiBase;
  $("#adminToken").value = state.token;

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), 3200);
  }

  function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.token}`,
    };
  }

  async function api(path, opts = {}) {
    const url = `${state.apiBase.replace(/\/$/, "")}${path}`;
    const res = await fetch(url, {
      ...opts,
      headers: { ...headers(), ...(opts.headers || {}) },
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) {
      const msg = data?.detail?.message || data?.message || data?.detail || res.statusText;
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
    return data;
  }

  $("#btnSaveAuth").addEventListener("click", () => {
    state.apiBase = $("#apiBase").value.trim();
    state.token = $("#adminToken").value.trim();
    localStorage.setItem("zg_api", state.apiBase);
    sessionStorage.setItem("zg_admin", state.token);
    toast("Credenciais salvas nesta sessão");
    refreshAll();
  });

  function statusBadge(status) {
    return `<span class="badge ${status}">${status}</span>`;
  }

  function renderSenders(rows) {
    const root = $("#sendersList");
    if (!rows.length) {
      root.innerHTML = `<div class="meta">Nenhum sender ainda. Crie o primeiro acima.</div>`;
      return;
    }
    root.innerHTML = rows.map((s) => `
      <article class="card" data-id="${s.id}">
        <div class="card-top">
          <div>
            <h3>${escapeHtml(s.name)}</h3>
            <div class="meta">
              <code>${s.id}</code> · key <code>${escapeHtml(s.api_key_prefix)}</code><br/>
              instance <code>${escapeHtml(s.evolution_instance)}</code>
              ${s.phone_e164 ? ` · ${escapeHtml(s.phone_e164)}` : ""}
            </div>
          </div>
          ${statusBadge(s.status)}
        </div>
        <div class="actions">
          <button class="btn sm primary" data-act="pair">Pair / QR</button>
          <button class="btn sm warn" data-act="rebind">Rebind</button>
          <button class="btn sm ghost" data-act="pause">Pause</button>
          <button class="btn sm ghost" data-act="resume">Resume</button>
          <button class="btn sm danger" data-act="rotate">Rotate key</button>
        </div>
      </article>
    `).join("");

    root.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.closest("[data-id]").dataset.id;
        const act = btn.dataset.act;
        try {
          if (act === "pair") await openQr(id, "pair");
          else if (act === "rebind") await openQr(id, "rebind");
          else if (act === "pause") { await api(`/v1/admin/senders/${id}/pause`, { method: "POST" }); toast("Sender pausado"); await loadSenders(); }
          else if (act === "resume") { await api(`/v1/admin/senders/${id}/resume`, { method: "POST" }); toast("Sender retomado"); await loadSenders(); }
          else if (act === "rotate") {
            if (!confirm("Rotacionar API key? Integradores antigos param imediatamente.")) return;
            const data = await api(`/v1/admin/senders/${id}/rotate-key`, { method: "POST" });
            showApiKey(data.api_key);
            await loadSenders();
          }
        } catch (err) {
          toast(err.message);
        }
      });
    });
  }

  function showApiKey(key) {
    const banner = $("#apiKeyBanner");
    banner.classList.remove("hidden");
    banner.innerHTML = `<strong>Guarde a API key agora (exibida uma única vez)</strong><code>${escapeHtml(key)}</code>`;
  }

  async function openQr(senderId, mode) {
    state.activePairSender = senderId;
    const path = mode === "rebind"
      ? `/v1/admin/senders/${senderId}/rebind`
      : `/v1/admin/senders/${senderId}/pair`;
    const data = await api(path, { method: "POST" });
    $("#qrTitle").textContent = mode === "rebind" ? "Rebind — novo QR" : "Pairing QR";
    $("#qrDetail").textContent = data.detail || `Instance: ${data.instance}`;
    const img = $("#qrImage");
    if (data.qrcode_base64) {
      const b64 = data.qrcode_base64.startsWith("data:")
        ? data.qrcode_base64
        : `data:image/png;base64,${data.qrcode_base64}`;
      img.src = b64;
      img.style.display = "block";
    } else {
      img.removeAttribute("src");
      img.style.display = "none";
      $("#qrDetail").textContent += " — QR ainda não disponível; tente gerar novo.";
    }
    $("#qrDialog").showModal();
    await loadSenders();
  }

  $("#btnRefreshQr").addEventListener("click", async () => {
    if (!state.activePairSender) return;
    try {
      await openQr(state.activePairSender, "pair");
    } catch (err) {
      toast(err.message);
    }
  });

  async function loadSenders() {
    const rows = await api("/v1/admin/senders");
    renderSenders(rows);
  }

  async function loadQueue() {
    const data = await api("/v1/admin/queue/stats");
    $("#queueStats").textContent = JSON.stringify(data, null, 2);
  }

  async function loadFailed() {
    const rows = await api("/v1/admin/messages?status=failed");
    const dead = await api("/v1/admin/messages?status=dead");
    const all = [...rows, ...dead];
    const root = $("#failedList");
    if (!all.length) {
      root.innerHTML = `<div class="meta">Nenhuma falha recente.</div>`;
      return;
    }
    root.innerHTML = all.map((m) => `
      <div class="fail-item">
        <div><code>${escapeHtml(m.id)}</code> · <strong>${escapeHtml(m.status)}</strong></div>
        <div class="meta">${escapeHtml(m.external_id)} → ${escapeHtml(m.to || "")}</div>
        <div class="err">${escapeHtml(m.last_error || "—")}</div>
      </div>
    `).join("");
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  $("#createForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const body = {
        name: $("#senderName").value.trim(),
        rate_limit_per_minute: Number($("#senderRate").value) || 20,
      };
      const data = await api("/v1/admin/senders", {
        method: "POST",
        body: JSON.stringify(body),
      });
      showApiKey(data.api_key);
      $("#senderName").value = "";
      toast("Sender criado");
      await refreshAll();
    } catch (err) {
      toast(err.message);
    }
  });

  async function refreshAll() {
    if (!state.token) {
      toast("Informe o ADMIN_TOKEN");
      return;
    }
    try {
      await Promise.all([loadSenders(), loadQueue(), loadFailed()]);
    } catch (err) {
      toast(err.message);
    }
  }

  $("#btnRefresh").addEventListener("click", () => refreshAll());
  $("#btnQueue").addEventListener("click", () => loadQueue().catch((e) => toast(e.message)));
  $("#btnFailed").addEventListener("click", () => loadFailed().catch((e) => toast(e.message)));

  if (state.token) refreshAll();
})();
