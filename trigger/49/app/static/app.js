const VAZIO = "nenhuma UASG aderida — a coleta ainda não tem escopo";

const estado = { eu: null, periodo: periodoDaUrl() };

function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function iso(data) {
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${m}-${d}`;
}

function periodoDaUrl() {
  const q = new URLSearchParams(location.search);
  const hoje = new Date();
  const ano = hoje.getFullYear();
  return {
    de: q.get("de") || `${ano}-01-01`,
    ate: q.get("ate") || `${ano}-12-31`,
  };
}

function definirPeriodo(de, ate) {
  const q = new URLSearchParams(location.search);
  q.set("de", de);
  q.set("ate", ate);
  history.replaceState(null, "", `${location.pathname}?${q}${location.hash}`);
  estado.periodo = { de, ate };
  desenhar();
}

function atalhoAno() {
  const ano = new Date().getFullYear();
  definirPeriodo(`${ano}-01-01`, `${ano}-12-31`);
}

function atalho12() {
  const fim = new Date();
  const ini = new Date(fim);
  ini.setFullYear(ini.getFullYear() - 1);
  definirPeriodo(iso(ini), iso(fim));
}

function queryPeriodo() {
  const p = estado.periodo;
  return `de=${encodeURIComponent(p.de)}&ate=${encodeURIComponent(p.ate)}`;
}

async function api(caminho, opcoes = {}) {
  const resposta = await fetch(caminho, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(opcoes.headers || {}) },
    ...opcoes,
  });
  const texto = await resposta.text();
  let corpo = {};
  if (texto) {
    try { corpo = JSON.parse(texto); } catch { corpo = { detail: texto }; }
  }
  if (!resposta.ok) {
    const erro = new Error(mensagemDe(corpo));
    erro.status = resposta.status;
    erro.corpo = corpo;
    throw erro;
  }
  return corpo;
}

function mensagemDe(corpo) {
  if (!corpo) return "Falha na operação.";
  if (typeof corpo.detail === "string") return corpo.detail;
  if (corpo.detail && corpo.detail.detail) return corpo.detail.detail;
  return "Falha na operação.";
}

function mostrarErro(alvo, erro) {
  let aviso = alvo.querySelector(":scope > .erro");
  if (!aviso) {
    aviso = document.createElement("p");
    aviso.className = "erro";
    alvo.prepend(aviso);
  }
  aviso.textContent = "Erro: " + (erro.message || "Falha na operação.");
}

function rota() {
  const partes = (location.hash || "").replace(/^#/, "").split("/").filter(Boolean);
  return {
    nome: partes[0] || "",
    id: partes[1] || "",
    sub: partes[2] || "",
    item: partes[3] || "",
  };
}

function ehMaster() {
  return (estado.eu.papel || "").startsWith("master");
}

function menus() {
  if (!estado.eu) return [];
  if (ehMaster()) {
    const itens = [
      ["consolidado", "Consolidado"],
      ["filiais", "Filiais"],
      ["fila", "Fila"],
      ["usuarios", "Usuários"],
    ];
    return itens;
  }
  const itens = [
    ["painel", "Painel"],
    ["contratacoes", "Contratações"],
    ["contratos", "Contratos"],
    ["atas", "Atas"],
  ];
  if (estado.eu.papel === "filial_gestor") {
    itens.push(["escopo", "Escopo"], ["coleta", "Coleta"], ["observadores", "Observadores"], ["usuarios", "Usuários"]);
  }
  return itens;
}

function barraPeriodo() {
  const p = estado.periodo;
  return `
    <p class="periodo">Período ${esc(p.de.split("-").reverse().join("/"))} a ${esc(p.ate.split("-").reverse().join("/"))}</p>
    <div class="acoes">
      <button type="button" id="atalho-ano">Ano corrente</button>
      <button type="button" id="atalho-12">12 meses</button>
    </div>
    <form id="form-periodo" class="filtros">
      <label>De <input name="de" type="date" value="${esc(p.de)}" required></label>
      <label>Até <input name="ate" type="date" value="${esc(p.ate)}" required></label>
      <button type="submit">Aplicar intervalo</button>
    </form>`;
}

function paramsExtras(chaves) {
  const q = new URLSearchParams(location.search);
  return chaves
    .filter((chave) => q.get(chave))
    .map((chave) => `${chave}=${encodeURIComponent(q.get(chave))}`)
    .join("&");
}

function gravarFiltros(form, chaves) {
  const dados = new FormData(form);
  const params = new URLSearchParams(location.search);
  chaves.forEach((chave) => {
    const valor = (dados.get(chave) || "").toString().trim();
    if (valor) params.set(chave, valor);
    else params.delete(chave);
  });
  history.replaceState(null, "", `${location.pathname}?${params}${location.hash}`);
  desenhar();
}

function marcarCidade(filial) {
  if (!filial) return;
  document.getElementById("titulo").textContent = filial.municipio;
  document.getElementById("contexto").textContent = `${filial.nome} · ${filial.municipio}/${filial.uf}`;
}

function abasCidade(id, atual) {
  const itens = [
    ["", "Painel"],
    ["contratacoes", "Contratações"],
    ["contratos", "Contratos"],
    ["atas", "Atas"],
    ["escopo", "Escopo"],
    ["coleta", "Coleta"],
  ];
  return `<div class="abas">${itens.map(([sub, rotulo]) =>
    `<button type="button" class="aba${atual === sub ? " active" : ""}" data-aba="filial/${id}${sub ? "/" + sub : ""}">${esc(rotulo)}</button>`
  ).join("")}</div>`;
}

function ligarAbas() {
  document.querySelectorAll("[data-aba]").forEach((botao) => {
    botao.addEventListener("click", () => { location.hash = botao.dataset.aba; });
  });
}

async function opcoesModalidade(selecionado) {
  if (!estado.modalidades) {
    const corpo = await api("/api/catalogo/modalidades");
    estado.modalidades = corpo.modalidades;
  }
  const opcoes = [`<option value="">Todas</option>`].concat(
    estado.modalidades.map((item) =>
      `<option value="${esc(item.codigo)}"${String(item.codigo) === String(selecionado) ? " selected" : ""}>${esc(item.nome)}</option>`
    )
  );
  return opcoes.join("");
}

async function opcoesObservador(selecionado, cidade) {
  const caminho = cidade
    ? `/api/master/filiais/${cidade}/observadores`
    : "/api/observadores?ativos=true";
  const corpo = await api(caminho);
  const pessoas = (corpo.observadores || []).filter((pessoa) => cidade || pessoa.ativo);
  const opcoes = [
    `<option value="">Todos</option>`,
    `<option value="sem"${selecionado === "sem" ? " selected" : ""}>Sem observador</option>`,
  ].concat(
    pessoas.map((pessoa) =>
      `<option value="${esc(pessoa.id)}"${pessoa.id === selecionado ? " selected" : ""}>${esc(pessoa.nome)}</option>`
    )
  );
  return opcoes.join("");
}

function ligarPeriodo() {
  document.getElementById("atalho-ano")?.addEventListener("click", atalhoAno);
  document.getElementById("atalho-12")?.addEventListener("click", atalho12);
  document.getElementById("form-periodo")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const dados = new FormData(ev.target);
    definirPeriodo(dados.get("de"), dados.get("ate"));
  });
}

function statusHtml(valor) {
  const texto = valor || "sem coleta";
  return `<span class="status ${esc(texto)}">${esc(texto.replaceAll("_", " "))}</span>`;
}

function tabela(colunas, linhas) {
  if (!linhas.length) return `<p class="vazio">Nenhum registro neste recorte.</p>`;
  const cabeca = colunas.map((c) => `<th>${esc(c[0])}</th>`).join("");
  const corpo = linhas.map((linha) => `<tr>${colunas.map((c) => `<td>${c[1](linha)}</td>`).join("")}</tr>`).join("");
  return `<table class="data-table"><thead><tr>${cabeca}</tr></thead><tbody>${corpo}</tbody></table>`;
}

let loginPendente = null;

function mostrarPortao(aviso = "") {
  document.body.classList.add("auth-locked");
  document.getElementById("auth-gate").hidden = false;
  document.getElementById("app-shell").hidden = true;
  const msg = document.getElementById("auth-msg");
  if (aviso) {
    msg.hidden = false;
    msg.textContent = "Erro: " + aviso;
  } else {
    msg.hidden = true;
    msg.textContent = "";
  }
  document.getElementById("auth-takeover").hidden = true;
}

function mostrarApp() {
  document.body.classList.remove("auth-locked");
  document.getElementById("auth-gate").hidden = true;
  document.getElementById("app-shell").hidden = false;
}

function telaLogin(aviso = "") {
  mostrarPortao(aviso);
  document.getElementById("nav").innerHTML = "";
  document.getElementById("titulo").textContent = "PNCP";
  document.getElementById("contexto").textContent = "";
}

function navHtml(atual) {
  const botoes = menus().map(([id, rotulo]) =>
    `<button type="button" class="nav-btn${atual === id ? " active" : ""}" data-ir="${id}" ${atual === id ? 'aria-current="page"' : ""}>${esc(rotulo)}</button>`
  ).join("");
  document.getElementById("nav").innerHTML = botoes;
  document.querySelectorAll("[data-ir]").forEach((botao) => {
    botao.addEventListener("click", () => { location.hash = botao.dataset.ir; });
  });
  const quem = document.getElementById("quem");
  if (quem && estado.eu) quem.textContent = estado.eu.usuario;
}

async function desenhar() {
  if (!estado.eu) return telaLogin();
  mostrarApp();
  let { nome, id, sub, item } = rota();
  if (!nome) nome = ehMaster() ? "consolidado" : "painel";
  if (ehMaster() && ["painel", "contratacoes", "contratacao", "contratos", "atas", "escopo", "coleta", "observadores"].includes(nome)) {
    location.hash = "consolidado";
    return;
  }
  if (!ehMaster() && ["consolidado", "filiais", "fila", "filial"].includes(nome)) {
    location.hash = "painel";
    return;
  }
  navHtml(nome === "filial" ? "consolidado" : nome);
  const titulo = document.getElementById("titulo");
  const contexto = document.getElementById("contexto");
  if (ehMaster()) {
    if (nome !== "filial") {
      titulo.textContent = "Visão nacional";
      contexto.textContent = estado.eu.usuario;
    }
  } else {
    titulo.textContent = estado.eu.municipio || "Filial";
    contexto.textContent = `${estado.eu.filial || ""} · ${estado.eu.usuario}`;
  }
  const main = document.getElementById("conteudo");
  main.innerHTML = "<p>Carregando.</p>";
  try {
    if (nome === "painel") await telaPainel(main);
    else if (nome === "contratacoes") await telaContratacoes(main, {});
    else if (nome === "contratacao") await telaDetalhe(main, id, {});
    else if (nome === "contratos") await telaInstrumentos(main, { caminho: "/api/contratos", chave: "contratos", titulo: "Contratos" });
    else if (nome === "atas") await telaInstrumentos(main, { caminho: "/api/atas", chave: "atas", titulo: "Atas" });
    else if (nome === "escopo") await telaEscopo(main);
    else if (nome === "coleta") await telaColeta(main);
    else if (nome === "observadores") await telaObservadores(main);
    else if (nome === "usuarios") await telaUsuarios(main);
    else if (nome === "consolidado") await telaConsolidado(main);
    else if (nome === "filiais") await telaFiliais(main);
    else if (nome === "fila") await telaFila(main);
    else if (nome === "filial" && id && sub === "contratacoes") {
      await telaContratacoes(main, { base: `/api/master/filiais/${id}/contratacoes`, prefixo: `filial/${id}/`, cidade: id });
    } else if (nome === "filial" && id && sub === "contratacao" && item) {
      await telaDetalhe(main, item, { base: `/api/master/filiais/${id}/contratacoes/${item}`, prefixo: `filial/${id}/`, cidade: id });
    } else if (nome === "filial" && id && sub === "contratos") {
      await telaInstrumentos(main, { caminho: `/api/master/filiais/${id}/contratos`, chave: "contratos", titulo: "Contratos", cidade: id });
    } else if (nome === "filial" && id && sub === "atas") {
      await telaInstrumentos(main, { caminho: `/api/master/filiais/${id}/atas`, chave: "atas", titulo: "Atas", cidade: id });
    } else if (nome === "filial" && id && sub === "escopo") await telaEscopoCidade(main, id);
    else if (nome === "filial" && id && sub === "coleta") await telaColetaCidade(main, id);
    else if (nome === "filial" && id) await telaDrill(main, id);
    else main.innerHTML = `<p class="vazio">Seção indisponível.</p>`;
  } catch (erro) {
    if (erro.status === 401) return telaLogin();
    main.innerHTML = `<p class="erro">Erro: ${esc(erro.message)}</p>`;
  }
}

async function telaPainel(main) {
  const corpo = await api(`/api/painel?${queryPeriodo()}`);
  main.innerHTML = `
    <h2>Painel</h2>
    ${barraPeriodo()}
    ${corpo.vazio ? `<p class="vazio">${esc(corpo.vazio)}</p>` : ""}
    <div class="cartoes">
      ${cartao("Contratações", corpo.contratacoes)}
      ${cartao("Valor estimado", corpo.valor_estimado)}
      ${cartao("Valor homologado", corpo.valor_homologado)}
      ${cartao("Contratos", corpo.contratos)}
      ${cartao("Atas", corpo.atas)}
      ${cartao("UASGs com movimento", corpo.uasgs_com_movimento)}
    </div>
    <p>Última coleta: ${statusHtml(corpo.coleta && corpo.coleta.status)}</p>
    ${blocosRecorte(corpo)}
    <div class="acoes">
      <button type="button" data-secao="contratacoes">Ver contratações</button>
      <button type="button" data-secao="contratos">Ver contratos</button>
      <button type="button" data-secao="atas">Ver atas</button>
    </div>`;
  ligarPeriodo();
  document.querySelectorAll("[data-secao]").forEach((botao) => {
    botao.addEventListener("click", () => { location.hash = botao.dataset.secao; });
  });
}

function cartao(rotulo, valor) {
  return `<article class="cartao"><span>${esc(rotulo)}</span><strong>${esc(valor)}</strong></article>`;
}

function blocosRecorte(corpo) {
  return `
    <h3>Por UASG</h3>
    ${tabela(
      [["UASG", (r) => esc(r.codigo_uasg)], ["Contratações", (r) => esc(r.total)]],
      corpo.por_uasg || [],
    )}
    <h3>Por modalidade</h3>
    ${tabela(
      [["Modalidade", (r) => esc(r.nome)], ["Código", (r) => esc(r.codigo ?? "")], ["Contratações", (r) => esc(r.total)]],
      corpo.por_modalidade || [],
    )}
    <h3>Por situação</h3>
    ${tabela(
      [["Situação", (r) => esc(r.situacao)], ["Contratações", (r) => esc(r.total)]],
      corpo.por_situacao || [],
    )}`;
}

async function telaContratacoes(main, opcoes) {
  const base = opcoes.base || "/api/contratacoes";
  const prefixo = opcoes.prefixo || "";
  const chaves = ["uasg", "codigo_modalidade", "situacao", "objeto", "fornecedor", "observador"];
  const extra = paramsExtras(chaves);
  const q = new URLSearchParams(location.search);
  const corpo = await api(`${base}?${queryPeriodo()}${extra ? "&" + extra : ""}`);
  marcarCidade(corpo.filial);
  const modalidades = await opcoesModalidade(q.get("codigo_modalidade") || "");
  const observadores = await opcoesObservador(q.get("observador") || "", opcoes.cidade || "");
  main.innerHTML = `
    ${opcoes.cidade ? abasCidade(opcoes.cidade, "contratacoes") : ""}
    <h2>Contratações</h2>
    ${barraPeriodo()}
    <form id="form-filtro" class="filtros">
      <label>UASG <input name="uasg" value="${esc(q.get("uasg") || "")}"></label>
      <label>Modalidade <select name="codigo_modalidade">${modalidades}</select></label>
      <label>Situação <input name="situacao" value="${esc(q.get("situacao") || "")}"></label>
      <label>Objeto <input name="objeto" value="${esc(q.get("objeto") || "")}"></label>
      <label>Fornecedor <input name="fornecedor" value="${esc(q.get("fornecedor") || "")}"></label>
      <label>Observador <select name="observador">${observadores}</select></label>
      <button type="submit">Filtrar</button>
    </form>
    ${tabela(
      [
        ["Publicação", (r) => esc(r.data_publicacao)],
        ["UASG", (r) => esc(r.codigo_uasg)],
        ["Modalidade", (r) => esc(r.modalidade_nome)],
        ["Objeto", (r) => `<button type="button" data-id="${esc(r.id)}">${esc(r.objeto)}</button>`],
        ["Observador", (r) => esc(r.observador_nome || "sem observador")],
        ["Estimado", (r) => esc(r.valor_estimado)],
        ["Homologado", (r) => esc(r.valor_homologado)],
      ],
      corpo.contratacoes,
    )}`;
  ligarPeriodo();
  ligarAbas();
  document.getElementById("form-filtro").addEventListener("submit", (ev) => {
    ev.preventDefault();
    gravarFiltros(ev.target, chaves);
  });
  document.querySelectorAll("[data-id]").forEach((botao) => {
    botao.addEventListener("click", () => { location.hash = `${prefixo}contratacao/${botao.dataset.id}`; });
  });
}

async function telaDetalhe(main, id, opcoes) {
  const base = opcoes.base || `/api/contratacoes/${id}`;
  const prefixo = opcoes.prefixo || "";
  const corpo = await api(base);
  marcarCidade(corpo.filial);
  const delta = corpo.delta_valor
    ? `Diferença homologado − estimado: ${esc(corpo.delta_valor)}${corpo.delta_percentual ? " (" + esc(corpo.delta_percentual) + ")" : ""}`
    : "Diferença indisponível sem os dois valores.";
  const acompanhamento = opcoes.cidade
    ? `<p>Observador: ${esc(corpo.observador_nome || "sem observador")}</p>`
    : `<form id="form-acompanhamento" class="filtros">
        <label>Observador
          <select name="observador_id">
            <option value="">Nenhum</option>
            ${await opcoesAcompanhar(corpo.observador_id || "")}
          </select>
        </label>
        <button type="submit">Salvar acompanhamento</button>
      </form>`;
  main.innerHTML = `
    ${opcoes.cidade ? abasCidade(opcoes.cidade, "contratacoes") : ""}
    <h2>${esc(corpo.objeto)}</h2>
    <p>${esc(corpo.modalidade_nome)} · código ${esc(corpo.codigo_modalidade)} · UASG ${esc(corpo.codigo_uasg)}</p>
    <p>Publicação ${esc(corpo.data_publicacao)} · estimado ${esc(corpo.valor_estimado)} · homologado ${esc(corpo.valor_homologado)}</p>
    <p>${delta}</p>
    <h3>Acompanhamento interno</h3>
    ${acompanhamento}
    <p><button type="button" id="voltar">Voltar às contratações</button></p>
    <h3>Itens</h3>
    ${tabela(
      [
        ["Item", (r) => esc(r.numero_item)],
        ["Descrição", (r) => esc(r.descricao)],
        ["Valor", (r) => esc(r.valor_total)],
        ["Fornecedor", (r) => esc(r.nome_fornecedor)],
      ],
      corpo.itens,
    )}
    <h3>Resultados</h3>
    ${tabela(
      [
        ["Item", (r) => esc(r.numero_item)],
        ["Fornecedor", (r) => esc(r.nome_fornecedor)],
        ["NI", (r) => esc(r.ni_fornecedor)],
        ["Valor", (r) => esc(r.valor)],
        ["Data", (r) => esc(r.data_resultado)],
      ],
      corpo.resultados,
    )}`;
  ligarAbas();
  document.getElementById("voltar").addEventListener("click", () => { location.hash = `${prefixo}contratacoes`; });
  const form = document.getElementById("form-acompanhamento");
  if (form) {
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const escolhido = new FormData(form).get("observador_id");
      await api(`/api/contratacoes/${id}/observador`, {
        method: "PUT",
        body: JSON.stringify({ observador_id: escolhido || null }),
      });
      desenhar();
    });
  }
}

async function telaInstrumentos(main, opcoes) {
  const chaves = ["uasg", "objeto", "vinculo"];
  const extra = paramsExtras(chaves);
  const q = new URLSearchParams(location.search);
  const corpo = await api(`${opcoes.caminho}?${queryPeriodo()}${extra ? "&" + extra : ""}`);
  marcarCidade(corpo.filial);
  main.innerHTML = `
    ${opcoes.cidade ? abasCidade(opcoes.cidade, opcoes.chave) : ""}
    <h2>${esc(opcoes.titulo)}</h2>
    ${barraPeriodo()}
    <form id="form-filtro" class="filtros">
      <label>UASG <input name="uasg" value="${esc(q.get("uasg") || "")}"></label>
      <label>Objeto <input name="objeto" value="${esc(q.get("objeto") || "")}"></label>
      <label>Vínculo
        <select name="vinculo">
          <option value="">Todos</option>
          <option value="vinculado"${q.get("vinculo") === "vinculado" ? " selected" : ""}>vinculado</option>
          <option value="nao_vinculado"${q.get("vinculo") === "nao_vinculado" ? " selected" : ""}>não vinculado</option>
        </select>
      </label>
      <button type="submit">Filtrar</button>
    </form>
    ${tabela(
      [
        ["Número", (r) => esc(r.numero_controle_pncp)],
        ["UASG", (r) => esc(r.codigo_uasg)],
        ["Assinatura", (r) => esc(r.data_assinatura)],
        ["Objeto", (r) => esc(r.objeto)],
        ["Valor", (r) => esc(r.valor)],
        ["Vínculo", (r) => esc(r.vinculo_rotulo)],
        ["Compra", (r) => esc(r.numero_controle_pncp_compra)],
      ],
      corpo[opcoes.chave],
    )}`;
  ligarPeriodo();
  ligarAbas();
  document.getElementById("form-filtro").addEventListener("submit", (ev) => {
    ev.preventDefault();
    gravarFiltros(ev.target, chaves);
  });
}

async function telaEscopoCidade(main, id) {
  const corpo = await api(`/api/master/filiais/${id}/escopo`);
  marcarCidade(corpo.filial);
  main.innerHTML = `
    ${abasCidade(id, "escopo")}
    <h2>Escopo</h2>
    <p>Leitura da cidade. A adesão continua com o gestor da filial.</p>
    ${corpo.vazio ? `<p class="vazio">${esc(corpo.vazio)}</p>` : ""}
    ${tabela(
      [
        ["UASG", (r) => esc(r.codigo_uasg)],
        ["Nome", (r) => esc(r.nome)],
        ["Oficial", (r) => (r.ativa_oficial ? "ativa" : "inativa")],
        ["Adesão", (r) => (r.aderida ? "aderida" : "não aderida")],
      ],
      corpo.uasgs,
    )}`;
  ligarAbas();
}

async function telaColetaCidade(main, id) {
  const corpo = await api(`/api/master/filiais/${id}/coleta`);
  const coleta = corpo.coleta || {};
  marcarCidade(corpo.filial);
  const etapas = (coleta.etapas || []).map((etapa) =>
    `<li>${esc(etapa.codigo)} ${statusHtml(etapa.status)} ${esc((etapa.mensagens || []).slice(-3).join(" "))}</li>`
  ).join("");
  main.innerHTML = `
    ${abasCidade(id, "coleta")}
    <h2>Coleta</h2>
    <p>Última execução: ${statusHtml(coleta.status)} ${coleta.noite ? "· noite " + esc(coleta.noite) : ""} ${coleta.faixa ? "· faixa " + esc(coleta.faixa) : ""}</p>
    <p>Cursor: ${coleta.cursor ? esc(coleta.cursor) : "ainda não gravado"}</p>
    ${coleta.motivo ? `<p>${esc(coleta.motivo)}</p>` : ""}
    <details>
      <summary>Últimas mensagens</summary>
      <ul>${etapas || "<li>Sem mensagens nesta execução.</li>"}</ul>
    </details>
    <p>O enfileiramento desta cidade fica com o gestor. A fila nacional continua no menu Fila.</p>`;
  ligarAbas();
}

async function opcoesAcompanhar(selecionado) {
  const corpo = await api("/api/observadores?ativos=true");
  return (corpo.observadores || []).map((pessoa) =>
    `<option value="${esc(pessoa.id)}"${pessoa.id === selecionado ? " selected" : ""}>${esc(pessoa.nome)}</option>`
  ).join("");
}

async function telaObservadores(main) {
  const corpo = await api("/api/observadores");
  const form = estado.eu.papel === "filial_gestor" ? `
    <form id="form-observador" class="filtros">
      <label>Nome <input name="nome" required minlength="2"></label>
      <label>E-mail <input name="email" type="email"></label>
      <label>Telefone <input name="telefone"></label>
      <button type="submit">Cadastrar</button>
    </form>` : `<p>O cadastro de observadores é do gestor. A associação ao processo fica no detalhe da contratação.</p>`;
  main.innerHTML = `
    <h2>Observadores</h2>
    <p>Pessoas da filial que acompanham contratações. Não ocupam vaga de login.</p>
    ${form}
    ${tabela(
      [
        ["Nome", (r) => esc(r.nome)],
        ["E-mail", (r) => esc(r.email)],
        ["Telefone", (r) => esc(r.telefone)],
        ["Situação", (r) => (r.ativo ? "ativo" : "inativo")],
        ["Ação", (r) => estado.eu.papel === "filial_gestor"
          ? `<button type="button" data-obs="${esc(r.id)}" data-ativo="${r.ativo ? "0" : "1"}">${r.ativo ? "Desativar" : "Reativar"}</button>`
          : ""],
      ],
      corpo.observadores,
    )}`;
  const cadastro = document.getElementById("form-observador");
  if (cadastro) {
    cadastro.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const dados = new FormData(cadastro);
      await api("/api/observadores", {
        method: "POST",
        body: JSON.stringify({
          nome: dados.get("nome"),
          email: dados.get("email") || "",
          telefone: dados.get("telefone") || "",
        }),
      });
      desenhar();
    });
  }
  document.querySelectorAll("[data-obs]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      await api(`/api/observadores/${botao.dataset.obs}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: botao.dataset.ativo === "1" }),
      });
      desenhar();
    });
  });
}

async function telaEscopo(main) {
  const corpo = await api("/api/escopo");
  main.innerHTML = `
    <h2>Escopo</h2>
    ${corpo.vazio ? `<p class="vazio">${esc(corpo.vazio)}</p>` : ""}
    ${tabela(
      [
        ["UASG", (r) => esc(r.codigo_uasg)],
        ["Nome", (r) => esc(r.nome)],
        ["Oficial", (r) => (r.ativa_oficial ? "ativa" : "inativa")],
        ["Adesão", (r) => (r.aderida ? "aderida" : "não aderida")],
        ["Ação", (r) => estado.eu.papel === "filial_gestor"
          ? `<button type="button" data-uasg="${esc(r.codigo_uasg)}" data-aderida="${r.aderida ? "0" : "1"}">${r.aderida ? "Remover adesão" : "Aderir"}</button>`
          : ""],
      ],
      corpo.uasgs,
    )}`;
  document.querySelectorAll("[data-uasg]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      await api(`/api/escopo/${botao.dataset.uasg}`, {
        method: "POST",
        body: JSON.stringify({ aderida: botao.dataset.aderida === "1" }),
      });
      desenhar();
    });
  });
}

async function telaColeta(main) {
  const corpo = await api("/api/coleta");
  const etapas = (corpo.etapas || []).map((etapa) =>
    `<li>${esc(etapa.codigo)} ${statusHtml(etapa.status)} ${esc((etapa.mensagens || []).slice(-3).join(" "))}</li>`
  ).join("");
  main.innerHTML = `
    <h2>Coleta</h2>
    <p>Última execução: ${statusHtml(corpo.status)} ${corpo.noite ? "· noite " + esc(corpo.noite) : ""} ${corpo.faixa ? "· faixa " + esc(corpo.faixa) : ""}</p>
    <p>Cursor: ${corpo.cursor ? esc(corpo.cursor) : "ainda não gravado"}</p>
    ${corpo.motivo ? `<p>${esc(corpo.motivo)}</p>` : ""}
    <details>
      <summary>Últimas mensagens</summary>
      <ul>${etapas || "<li>Sem mensagens nesta execução.</li>"}</ul>
    </details>
    <div class="acoes">
      <button type="button" id="enfileirar-diario">Enfileirar diário</button>
      <button type="button" id="enfileirar-carga">Enfileirar carga inicial</button>
    </div>`;
  document.getElementById("enfileirar-diario").addEventListener("click", () => enfileirar("diario"));
  document.getElementById("enfileirar-carga").addEventListener("click", () => enfileirar("carga_inicial"));
}

async function enfileirar(tipo) {
  await api("/api/coleta", { method: "POST", body: JSON.stringify({ tipo }) });
  desenhar();
}

async function telaUsuarios(main) {
  if (ehMaster()) return telaUsuariosMaster(main);
  const corpo = await api("/api/usuarios");
  main.innerHTML = `
    <h2>Usuários da filial</h2>
    <p>Vagas restantes: ${esc(corpo.vagas.restantes)} de ${esc(corpo.vagas.teto)}.</p>
    ${tabela(
      [
        ["Usuário", (r) => esc(r.usuario)],
        ["Papel", (r) => esc(r.papel)],
        ["Situação", (r) => (r.ativo ? "ativo" : "desativado")],
        ["Ação", (r) => r.ativo ? `<button type="button" data-off="${esc(r.id)}">Desativar</button>` : ""],
      ],
      corpo.usuarios,
    )}
    <form id="form-usuario">
      <label>Usuário <input name="usuario" required minlength="3"></label>
      <label>Senha <input name="senha" type="password" required minlength="8"></label>
      <label>Papel
        <select name="papel">
          <option value="filial_analista">filial_analista</option>
          <option value="filial_gestor">filial_gestor</option>
        </select>
      </label>
      <button type="submit">Criar usuário</button>
    </form>`;
  document.querySelectorAll("[data-off]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      await api(`/api/usuarios/${botao.dataset.off}/desativar`, { method: "POST", body: "{}" });
      desenhar();
    });
  });
  document.getElementById("form-usuario").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const dados = new FormData(ev.target);
    await api("/api/usuarios", { method: "POST", body: JSON.stringify(Object.fromEntries(dados)) });
    desenhar();
  });
}

async function telaUsuariosMaster(main) {
  const corpo = await api("/api/master/usuarios");
  const form = estado.eu.papel === "master_admin" ? `
    <form id="form-master">
      <label>Usuário <input name="usuario" required minlength="3"></label>
      <label>Senha <input name="senha" type="password" required minlength="8"></label>
      <label>Papel
        <select name="papel">
          <option value="master_analista">master_analista</option>
          <option value="master_admin">master_admin</option>
        </select>
      </label>
      <button type="submit">Criar usuário master</button>
    </form>` : "";
  main.innerHTML = `
    <h2>Usuários master</h2>
    <p>Cota própria, separada das 5 vagas de cada filial.</p>
    ${tabela(
      [["Usuário", (r) => esc(r.usuario)], ["Papel", (r) => esc(r.papel)], ["Situação", (r) => (r.ativo ? "ativo" : "desativado")]],
      corpo.usuarios,
    )}
    ${form}`;
  document.getElementById("form-master")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const dados = new FormData(ev.target);
    await api("/api/master/usuarios", { method: "POST", body: JSON.stringify(Object.fromEntries(dados)) });
    desenhar();
  });
}

async function telaConsolidado(main) {
  const corpo = await api(`/api/master/consolidado?${queryPeriodo()}`);
  main.innerHTML = `
    <h2>Consolidado</h2>
    ${barraPeriodo()}
    <div class="cartoes">
      ${cartao("Contratações", corpo.totais.contratacoes)}
      ${cartao("Valor homologado", corpo.totais.valor_homologado)}
      ${cartao("Contratos", corpo.totais.contratos)}
    </div>
    <h3>Filiais ativas</h3>
    ${tabelaFiliais(corpo.filiais)}
    <h3>Suspensas</h3>
    ${tabelaFiliais(corpo.suspensas)}`;
  ligarPeriodo();
  ligarDrill();
}

function tabelaFiliais(linhas) {
  return tabela(
    [
      ["Cidade", (r) => esc(`${r.municipio}/${r.uf}`)],
      ["UASGs aderidas", (r) => esc(r.uasgs_aderidas)],
      ["Contratações", (r) => esc(r.contratacoes)],
      ["Homologado", (r) => esc(r.valor_homologado)],
      ["Contratos", (r) => esc(r.contratos)],
      ["Coleta", (r) => statusHtml(r.ultima_coleta)],
      ["Abrir", (r) => `<button type="button" data-filial="${esc(r.id)}" data-cidade="${esc(r.municipio)}">Abrir ${esc(r.municipio)}</button>`],
    ],
    linhas,
  );
}

function ligarDrill() {
  document.querySelectorAll("[data-filial]").forEach((botao) => {
    botao.addEventListener("click", () => { location.hash = `filial/${botao.dataset.filial}`; });
  });
}

async function telaDrill(main, id) {
  const corpo = await api(`/api/master/filiais/${id}/painel?${queryPeriodo()}`);
  document.getElementById("titulo").textContent = corpo.filial.municipio;
  document.getElementById("contexto").textContent = `${corpo.filial.nome} · ${corpo.filial.municipio}/${corpo.filial.uf}`;
  main.innerHTML = `
    <h2>${esc(corpo.filial.municipio)}/${esc(corpo.filial.uf)}</h2>
    <p>${esc(corpo.filial.nome)}</p>
    ${abasCidade(id, "")}
    ${barraPeriodo()}
    ${corpo.vazio ? `<p class="vazio">${esc(corpo.vazio)}</p>` : ""}
    <div class="cartoes">
      ${cartao("Contratações", corpo.contratacoes)}
      ${cartao("Valor estimado", corpo.valor_estimado)}
      ${cartao("Valor homologado", corpo.valor_homologado)}
      ${cartao("Contratos", corpo.contratos)}
      ${cartao("Atas", corpo.atas)}
      ${cartao("UASGs com movimento", corpo.uasgs_com_movimento)}
    </div>
    <p>Última coleta: ${statusHtml(corpo.coleta && corpo.coleta.status)}${corpo.coleta && corpo.coleta.cursor ? " · cursor " + esc(corpo.coleta.cursor) : ""}</p>
    ${blocosRecorte(corpo)}
    <p><button type="button" id="voltar-macro">Voltar ao consolidado</button></p>`;
  ligarPeriodo();
  ligarAbas();
  document.getElementById("voltar-macro").addEventListener("click", () => { location.hash = "consolidado"; });
}

async function telaFiliais(main) {
  const linhas = await api("/api/filiais");
  const form = estado.eu.papel === "master_admin" ? `
    <form id="form-filial">
      <label>Nome <input name="nome" required></label>
      <label>CNPJ da OSC <input name="cnpj" inputmode="numeric" required></label>
      <label>Município <input name="municipio" required></label>
      <label>UF <input name="uf" maxlength="2" required></label>
      <label>IBGE <input name="codigo_ibge" inputmode="numeric" required></label>
      <button type="submit">Cadastrar filial</button>
    </form>
    <h3>Primeiro usuário da filial</h3>
    <form id="form-onboarding">
      <label>Filial <select name="filial_id">${linhas.map((f) => `<option value="${esc(f.id)}">${esc(f.municipio)}</option>`).join("")}</select></label>
      <label>Usuário <input name="usuario" required minlength="3"></label>
      <label>Senha <input name="senha" type="password" required minlength="8"></label>
      <label>Papel
        <select name="papel"><option value="filial_gestor">filial_gestor</option><option value="filial_analista">filial_analista</option></select>
      </label>
      <button type="submit">Criar usuário da filial</button>
    </form>` : "";
  main.innerHTML = `
    <h2>Filiais</h2>
    ${tabela(
      [
        ["Município", (r) => esc(`${r.municipio}/${r.uf}`)],
        ["Nome", (r) => esc(r.nome)],
        ["CNPJ", (r) => esc(r.cnpj)],
        ["IBGE", (r) => esc(r.codigo_ibge)],
        ["Situação", (r) => esc(r.situacao)],
        ["Ação", (r) => estado.eu.papel === "master_admin"
          ? `<button type="button" data-sit="${esc(r.id)}" data-para="${r.situacao === "ativa" ? "suspender" : "reativar"}">${r.situacao === "ativa" ? "Suspender" : "Reativar"}</button>`
          : ""],
      ],
      linhas,
    )}
    ${form}`;
  document.querySelectorAll("[data-sit]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      await api(`/api/filiais/${botao.dataset.sit}/${botao.dataset.para}`, { method: "POST", body: "{}" });
      desenhar();
    });
  });
  document.getElementById("form-filial")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const dados = Object.fromEntries(new FormData(ev.target));
    dados.codigo_ibge = Number(dados.codigo_ibge);
    try {
      await api("/api/filiais", { method: "POST", body: JSON.stringify(dados) });
      desenhar();
    } catch (erro) {
      mostrarErro(ev.target, erro);
    }
  });
  document.getElementById("form-onboarding")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const dados = Object.fromEntries(new FormData(ev.target));
    const filialId = dados.filial_id;
    delete dados.filial_id;
    try {
      await api(`/api/filiais/${filialId}/usuarios`, { method: "POST", body: JSON.stringify(dados) });
      desenhar();
    } catch (erro) {
      mostrarErro(ev.target, erro);
    }
  });
}

async function telaFila(main) {
  const corpo = await api("/api/master/fila");
  const agenda = await api("/api/master/agenda");
  main.innerHTML = `
    <h2>Fila</h2>
    <p>Agenda ${esc(String(agenda.hora).padStart(2, "0"))}:${esc(String(agenda.minuto).padStart(2, "0"))} · backup ${esc(String(agenda.backup_hora).padStart(2, "0"))}:${esc(String(agenda.backup_minuto).padStart(2, "0"))} · relógio ${esc(agenda.relogio)}</p>
    <p>Faixa C ${agenda.faixa_c ? "ligada" : "desligada"}. Faixa D ${agenda.faixa_d ? "ligada" : "desligada"}.</p>
    ${tabela(
      [
        ["Noite", (r) => esc(r.noite)],
        ["Filial", (r) => esc(r.filial)],
        ["Faixa", (r) => esc(r.faixa)],
        ["Tipo", (r) => esc(r.tipo)],
        ["Status", (r) => statusHtml(r.status)],
        ["Cursor", (r) => esc(r.cursor)],
        ["Motivo", (r) => esc(r.motivo)],
        ["Ação", (r) => estado.eu.papel === "master_admin" && !["ok", "cancelado"].includes(r.status)
          ? `<button type="button" data-cancelar="${esc(r.id)}">Cancelar</button>` : ""],
      ],
      corpo.jobs,
    )}`;
  document.querySelectorAll("[data-cancelar]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      await api(`/api/master/fila/${botao.dataset.cancelar}/cancelar`, { method: "POST", body: "{}" });
      desenhar();
    });
  });
}

async function iniciar() {
  try {
    estado.eu = await api("/api/eu");
  } catch {
    estado.eu = null;
    return telaLogin();
  }
  if (!location.hash) location.hash = ehMaster() ? "consolidado" : "painel";
  desenhar();
}

window.addEventListener("hashchange", desenhar);

document.getElementById("form-login").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const dados = new FormData(ev.target);
  loginPendente = { usuario: dados.get("usuario"), senha: dados.get("senha") };
  try {
    await api("/api/sessao", { method: "POST", body: JSON.stringify(loginPendente) });
    location.hash = "";
    await iniciar();
  } catch (erro) {
    if (erro.status === 409) {
      document.getElementById("auth-msg").hidden = true;
      document.getElementById("auth-takeover-lead").textContent = erro.message;
      document.getElementById("auth-takeover").hidden = false;
      return;
    }
    telaLogin(erro.message);
  }
});

document.getElementById("encerrar").addEventListener("click", async () => {
  if (!loginPendente) return;
  loginPendente.encerrar_anterior = true;
  try {
    await api("/api/sessao", { method: "POST", body: JSON.stringify(loginPendente) });
    location.hash = "";
    await iniciar();
  } catch (erro) {
    telaLogin(erro.message);
  }
});

document.getElementById("sair").addEventListener("click", async () => {
  await api("/api/sessao", { method: "DELETE" });
  estado.eu = null;
  location.hash = "";
  telaLogin();
});

iniciar();
