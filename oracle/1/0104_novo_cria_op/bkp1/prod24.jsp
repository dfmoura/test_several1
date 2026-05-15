<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Sistema de Controle de Produção</title>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <style>
      /* Layout e componentes priorizam mobile (mobile-first); breakpoints apenas para telas maiores */
      :root {
        --verde-escuro: #14532d;
        --verde-medio: #22c55e;
        --verde-claro: #bbf7d0;
        --verde-hover: #16a34a;
        --cinza-fundo: #f6fef9;
        --cinza-tabela: #e5e7eb;
        --cinza-borda: #d1fae5;
        --cinza-texto: #374151;
        --branco: #fff;
        --vermelho: #ef4444;
        --amarelo: #facc15;
        --sombra: 0 2px 8px rgba(20, 83, 45, 0.08);
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: "Segoe UI", Arial, sans-serif;
        background: var(--cinza-fundo);
        color: var(--cinza-texto);
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        overflow-x: hidden;
      }

      /* Header fixo */
      header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: var(--verde-escuro);
        color: var(--branco);
        display: flex;
        align-items: center;
        height: 60px;
        box-shadow: var(--sombra);
        z-index: 100;
        padding: 0 12px;
      }

      .header-icon {
        width: 32px;
        height: 32px;
        margin-right: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .header-title {
        font-size: 1.2rem;
        font-weight: 600;
        letter-spacing: 0.5px;
        flex: 1;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .filtro-btn {
        background: rgba(255, 255, 255, 0.1);
        color: var(--branco);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        padding: 8px 16px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(8px);
        white-space: nowrap;
      }

      .filtro-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }

      .filtro-btn.ativo {
        background: var(--verde-medio);
        color: var(--branco);
        border-color: var(--verde-medio);
        box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
      }

      .refresh-btn {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.08),
          rgba(255, 255, 255, 0.02)
        );
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: var(--branco);
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0.8;
        backdrop-filter: blur(8px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .refresh-btn:hover {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.15),
          rgba(255, 255, 255, 0.05)
        );
        border-color: rgba(255, 255, 255, 0.25);
        opacity: 1;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .refresh-btn:active {
        transform: translateY(0px) scale(0.95);
      }

      /* Main content */
      main {
        flex: 1 1 auto;
        margin-top: 60px;
        margin-bottom: 70px;
        padding: 12px;
        max-width: 800px;
        width: 100%;
        margin-left: auto;
        margin-right: auto;
      }

      /* Tabela de operações */
      .tabela-op {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        background: var(--branco);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: var(--sombra);
        margin-bottom: 16px;
      }

      .tabela-op thead {
        position: sticky;
        top: 0;
        z-index: 50;
      }

      .tabela-op th,
      .tabela-op td {
        padding: 10px 6px;
        text-align: left;
        font-size: 0.95rem;
        border-right: 1px solid var(--cinza-tabela);
      }

      .tabela-op th:last-child,
      .tabela-op td:last-child {
        border-right: none;
      }

      .tabela-op th {
        background: var(--verde-claro);
        color: var(--verde-escuro);
        font-weight: 600;
        border-bottom: 2px solid var(--cinza-borda);
        position: sticky;
        top: 0;
        z-index: 50;
        box-shadow: 0 2px 2px -1px rgba(0, 0, 0, 0.1);
      }

      .tabela-op tr {
        border-bottom: 1px solid var(--cinza-tabela);
        transition: background 0.15s;
      }

      .tabela-op tr[data-clicavel="true"]:hover,
      .tabela-op tr[data-row-clicavel]:hover {
        background: var(--verde-claro);
        cursor: pointer;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(34, 197, 94, 0.1);
      }

      .tabela-op tr[data-clicavel="true"]:active,
      .tabela-op tr[data-row-clicavel]:active {
        transform: translateY(0px);
      }

      .tabela-op td {
        color: var(--cinza-texto);
      }

      .tabela-op tr:last-child {
        border-bottom: none;
      }

      .tabela-op tfoot {
        background: var(--cinza-fundo);
      }

      .tabela-op tfoot td {
        padding: 8px 6px;
        font-size: 0.85rem;
        color: var(--cinza-texto);
        font-weight: 500;
        text-align: right;
        border-top: 1px solid var(--cinza-borda);
        opacity: 0.8;
      }

      .sem-registros {
        text-align: center;
        color: var(--verde-escuro);
        padding: 40px 20px;
        font-size: 1.1rem;
        background: var(--branco);
        border-radius: 12px;
        box-shadow: var(--sombra);
      }

      /* Footer fixo */
      footer {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        height: 70px;
        background: var(--verde-escuro);
        color: var(--branco);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        font-weight: 500;
        box-shadow: 0 -2px 8px rgba(20, 83, 45, 0.08);
        z-index: 100;
        border-top-left-radius: 16px;
        border-top-right-radius: 16px;
      }

      /* Responsividade */
      @media (max-width: 480px) {
        header {
          padding: 0 8px;
          height: 56px;
        }

        .header-title {
          font-size: 1.1rem;
        }

        .filtro-btn {
          padding: 6px 12px;
          font-size: 0.8rem;
        }

        .refresh-btn {
          width: 32px;
          height: 32px;
        }

        main {
          margin-top: 56px;
          padding: 8px;
        }

        .tabela-op th,
        .tabela-op td {
          padding: 8px 4px;
          font-size: 0.85rem;
        }
      }

      /* Overlay detalhe do registro - mobile first */
      .overlay-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(20, 83, 45, 0.4);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        z-index: 200;
        display: none;
        align-items: flex-end;
        justify-content: center;
        padding: 0;
        opacity: 0;
        transition: opacity 0.25s ease;
      }

      .overlay-backdrop.ativo {
        display: flex;
        opacity: 1;
      }

      .overlay-panel {
        background: var(--branco);
        width: 100%;
        max-width: 100%;
        max-height: 92vh;
        border-top-left-radius: 20px;
        border-top-right-radius: 20px;
        box-shadow: 0 -4px 24px rgba(20, 83, 45, 0.15);
        display: flex;
        flex-direction: column;
        transform: translateY(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
      }

      .overlay-backdrop.ativo .overlay-panel {
        transform: translateY(0);
      }

      .overlay-handle {
        padding: 10px 0 6px;
        display: flex;
        justify-content: center;
        flex-shrink: 0;
      }

      .overlay-handle::before {
        content: "";
        width: 40px;
        height: 4px;
        background: var(--cinza-tabela);
        border-radius: 2px;
      }

      .overlay-header {
        padding: 8px 16px 12px;
        border-bottom: 1px solid var(--cinza-borda);
        flex-shrink: 0;
      }

      .overlay-titulo {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--verde-escuro);
      }

      .overlay-body {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 16px;
        padding-bottom: 24px;
      }

      .detalhe-item {
        padding: 12px 0;
        border-bottom: 1px solid var(--cinza-borda);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .detalhe-item:last-of-type {
        border-bottom: none;
      }

      .detalhe-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--verde-escuro);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .detalhe-valor {
        font-size: 0.95rem;
        color: var(--cinza-texto);
        line-height: 1.4;
        word-break: break-word;
      }

      .overlay-actions {
        padding: 16px;
        padding-bottom: max(16px, env(safe-area-inset-bottom));
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex-shrink: 0;
        border-top: 1px solid var(--cinza-borda);
        background: var(--cinza-fundo);
      }

      .overlay-btn {
        width: 100%;
        min-height: 48px; /* alvo de toque >= 44px para mobile */
        padding: 14px 20px;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      .overlay-btn-fechar {
        background: var(--branco);
        color: var(--cinza-texto);
        border: 2px solid var(--cinza-tabela);
      }

      .overlay-btn-fechar:hover,
      .overlay-btn-fechar:active {
        background: var(--cinza-tabela);
        color: var(--verde-escuro);
      }

      .overlay-btn-acao {
        background: var(--verde-medio);
        color: var(--branco);
        border: 2px solid var(--verde-medio);
      }

      .overlay-btn-acao.parar {
        background: var(--vermelho);
        border-color: var(--vermelho);
      }

      .overlay-btn-acao.parar:hover,
      .overlay-btn-acao.parar:active {
        background: #dc2626;
        border-color: #dc2626;
      }

      .overlay-btn-acao:hover,
      .overlay-btn-acao:active {
        background: var(--verde-hover);
        border-color: var(--verde-hover);
        transform: translateY(-1px);
      }

      .overlay-observacao {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--cinza-tabela);
      }

      .overlay-observacao .detalhe-label {
        display: block;
        margin-bottom: 6px;
      }

      .overlay-observacao textarea {
        width: 100%;
        min-height: 72px;
        padding: 10px 12px;
        border: 1px solid var(--cinza-tabela);
        border-radius: 8px;
        font-family: inherit;
        font-size: 0.95rem;
        resize: vertical;
        box-sizing: border-box;
      }

      @media (min-width: 481px) {
        .overlay-backdrop {
          align-items: center;
          padding: 20px;
        }

        .overlay-panel {
          max-width: 420px;
          max-height: 85vh;
          border-radius: 16px;
        }

        .overlay-backdrop.ativo .overlay-panel {
          transform: translateY(0);
        }

        .overlay-handle {
          padding: 8px 0 4px;
        }
      }

      /* Abas dentro do overlay (Geral / Apontamentos / Execuções) */
      .overlay-tabs {
        margin-top: 12px;
      }

      .overlay-tabs-header {
        display: flex;
        gap: 6px;
        margin-bottom: 10px;
        border-bottom: 1px solid var(--cinza-borda);
        padding-bottom: 4px;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .overlay-tab-button {
        flex: 1;
        white-space: nowrap;
        padding: 8px 10px;
        font-size: 0.85rem;
        border-radius: 999px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--cinza-texto);
        font-weight: 500;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .overlay-tab-button.ativo {
        background: var(--verde-claro);
        color: var(--verde-escuro);
        border-color: var(--verde-medio);
      }

      .overlay-tabs-content {
        margin-top: 4px;
      }

      .overlay-tab-content {
        display: none;
      }

      .overlay-tab-content.ativo {
        display: block;
      }

      .overlay-campos-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .overlay-campo {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .overlay-campo label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--verde-escuro);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .overlay-campo input {
        width: 100%;
        padding: 6px 8px;
        border-radius: 8px;
        border: 1px solid var(--cinza-tabela);
        font-size: 0.9rem;
        background: #f9fafb;
        color: var(--cinza-texto);
      }

      .overlay-campo input:disabled {
        opacity: 0.9;
        cursor: not-allowed;
      }

      @media (min-width: 420px) {
        .overlay-campos-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      /* Tabela Execuções (TPREIATV) – compacta e mobile */
      .overlay-execucoes-container {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        margin-top: 4px;
        max-height: 50vh;
        overflow-y: auto;
      }
      .overlay-tabela-execucoes {
        width: 100%;
        min-width: 320px;
        border-collapse: collapse;
        font-size: 0.7rem;
        background: var(--branco);
        border-radius: 8px;
        border: 1px solid var(--cinza-borda);
      }
      .overlay-tabela-execucoes th,
      .overlay-tabela-execucoes td {
        padding: 4px 6px;
        text-align: left;
        border-bottom: 1px solid var(--cinza-tabela);
        white-space: nowrap;
      }
      .overlay-tabela-execucoes th {
        background: var(--verde-claro);
        color: var(--verde-escuro);
        font-weight: 600;
        position: sticky;
        top: 0;
      }
      .overlay-tabela-execucoes td {
        color: var(--cinza-texto);
      }
      .overlay-tabela-execucoes input.overlay-exec-input {
        width: 100%;
        min-width: 0;
        padding: 2px 4px;
        font-size: 0.7rem;
        border: 1px solid var(--cinza-tabela);
        border-radius: 4px;
        background: #f9fafb;
        color: var(--cinza-texto);
      }
      .overlay-tabela-execucoes input.overlay-exec-input:disabled {
        opacity: 0.95;
        cursor: default;
      }
      .overlay-execucoes-placeholder {
        font-size: 0.85rem;
        color: var(--cinza-texto);
        opacity: 0.8;
        margin: 0;
        padding: 8px 0;
      }

      /* Guia Apontamentos: lista e tabelas aninhadas (mobile) – sem botão cadastro */
      .apontamentos-container { margin-top: 6px; }
      .apontamentos-nivel { display: none; }
      .apontamentos-nivel.ativo { display: block; }
      .apontamentos-voltar {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        font-size: 0.85rem;
        color: var(--verde-escuro);
        background: transparent;
        border: 1px solid var(--verde-medio);
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 10px;
      }
      .apontamentos-lista-item {
        padding: 12px;
        background: var(--branco);
        border: 1px solid var(--cinza-borda);
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        color: var(--cinza-texto);
      }
      .apontamentos-lista-item:hover { background: var(--verde-claro); }
      .apontamentos-tabela {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;
        margin-top: 8px;
        background: var(--branco);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
      .apontamentos-tabela th, .apontamentos-tabela td { padding: 8px 6px; text-align: left; border-bottom: 1px solid var(--cinza-tabela); }
      .apontamentos-tabela th { background: var(--verde-claro); color: var(--verde-escuro); font-weight: 600; }
      .apontamentos-tabela tr[data-clicavel]:hover { background: var(--verde-claro); cursor: pointer; }
      .apontamentos-placeholder { font-size: 0.85rem; color: var(--cinza-texto); opacity: 0.8; padding: 12px 0; }
    </style>
  </head>
  <body>
    <!-- Header fixo -->
    <header>
      <span class="header-icon" aria-label="Menu">
        <svg
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h8M12 8v8" />
        </svg>
      </span>
      <span class="header-title">OP's</span>
      <div class="header-actions">
        <button class="filtro-btn ativo" data-situacao="Agd. Aceite">
          Agd. Aceite
        </button>
        <button class="filtro-btn" data-situacao="Iniciadas">Iniciadas</button>
        <button class="filtro-btn" data-situacao="Paradas">Paradas</button>
        <button
          class="refresh-btn"
          onclick="atualizarTabela()"
          title="Atualizar tabela"
          aria-label="Atualizar tabela"
        >
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6" />
            <path d="M12 17v6" />
            <path d="M4.93 4.93l4.24 4.24" />
            <path d="M16.24 16.24l4.24 4.24" />
            <path d="M1 12h6" />
            <path d="M17 12h6" />
            <path d="M4.93 19.07l4.24-4.24" />
            <path d="M16.24 7.76l4.24-4.24" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Main content -->
    <main>
      <!-- Tabela de operações -->
      <table class="tabela-op" id="tabelaOp">
        <thead>
          <tr>
            <th>OP</th>
            <th>Data</th>
            <th>Produto</th>
            <th>Qtd. Produzir</th>
            <th>Lote</th>
          </tr>
        </thead>
        <tbody id="tbodyOp">
          <!-- Linhas geradas via JS -->
        </tbody>
        <tfoot id="tfootTotal" style="display: none">
          <tr>
            <td colspan="5"></td>
          </tr>
        </tfoot>
      </table>
      <div class="sem-registros" id="semRegistros" style="display: none">
        Nenhuma operação encontrada.
      </div>
    </main>

    <!-- Footer fixo -->
    <footer>Sistema de Controle de Produção &copy;</footer>

    <!-- Overlay detalhe do registro (mobile first) -->
    <div class="overlay-backdrop" id="overlayDetalhe" role="dialog" aria-modal="true" aria-labelledby="overlayTitulo">
      <div class="overlay-panel" id="overlayPanel">
        <div class="overlay-handle" aria-hidden="true"></div>
        <div class="overlay-header">
          <h2 class="overlay-titulo" id="overlayTitulo">Detalhe da operação</h2>
        </div>
        <div class="overlay-body" id="overlayBody">
          <!-- Preenchido via JS -->
        </div>
        <div class="overlay-actions" id="overlayActions">
          <button type="button" class="overlay-btn overlay-btn-acao" id="overlayBtnAcao" style="display: none;">Ação</button>
          <button type="button" class="overlay-btn overlay-btn-fechar" id="overlayBtnFechar">Fechar</button>
        </div>
      </div>
    </div>

    <script>
      // --- Configuração para acionar botões Java no Sankhya (componente HTML5) ---
      // Botão "Continuar produção" (guia Paradas): classe ContinuarProducaoBTFromParam,
      // que recebe parâmetro IDIPROC via JX.acionarBotao. Cadastre no Sankhya e use o ID aqui.
      const ID_BOTAO_CONTINUAR_PRODUCAO = 299;
      // Botão "Parar a produção" (guia Iniciadas): classe PararProducaoBTFromParam,
      // que recebe parâmetro IDIPROC via JX.acionarBotao. Cadastre no Sankhya e use o ID aqui.
      const ID_BOTAO_PARAR_PRODUCAO = 300;
      // Botão "Cadastrar Cabeçalho de Apontamento" (guia Apontamentos): classe CadastrarCabecApontamentoBT,
      // recebe IDIATV e/ou IDIPROC via JX.acionarBotao. Cadastre no Sankhya e use o ID aqui.
      const ID_BOTAO_CADASTRAR_CABEC_APONTAMENTO = 301;

      // Estado global
      let filtroAtual = "Agd. Aceite";
      let operacoes = [];

      // Extrai número de valor vindo do Sankhya (pode ser number, string ou objeto com $/value)
      function toNumber(val) {
        if (val == null || val === undefined) return null;
        if (typeof val === "number" && !isNaN(val)) return val;
        if (typeof val === "string") {
          var n = Number(val);
          return isNaN(n) ? null : n;
        }
        if (typeof val === "object" && val.$ != null) {
          var n = Number(val.$);
          return isNaN(n) ? null : n;
        }
        if (typeof val === "object" && val.value != null) {
          var n = Number(val.value);
          return isNaN(n) ? null : n;
        }
        return null;
      }

      // Função para formatar data no padrão brasileiro
      function formatarData(dataStr) {
        if (!dataStr) return "";
        try {
          const data = new Date(dataStr);
          if (isNaN(data.getTime())) {
            return dataStr;
          }
          return data.toLocaleDateString("pt-BR");
        } catch (error) {
          return dataStr;
        }
      }

      // Função para carregar operações aguardando aceite usando SankhyaJX
      async function carregarOperacoesAguardandoAceite() {
        try {
          // Verificar se SankhyaJX está disponível
          if (typeof JX === "undefined" || !JX.consultar) {
            console.error("SankhyaJX não está disponível");
            mostrarErro("Biblioteca SankhyaJX não está disponível");
            return;
          }

          const sql = `
            SELECT 
                IDIPROC,
                TO_CHAR(DHINCLUSAO, 'DD/MM/YYYY') AS DTFAB,
                CODPRODPA,
                DESCRPROD,
                NROLOTE,
                QTDPRODUZIR
            FROM (
                SELECT 
                    TPRIATV.IDIPROC AS IDIPROC,
                    TPRIATV.DHINCLUSAO AS DHINCLUSAO,
                    TPRIPA.CODPRODPA,
                    TGFPRO.DESCRPROD,
                    TPRIPA.NROLOTE,
                    TPRIPA.QTDPRODUZIR
                FROM TPRIATV
                LEFT JOIN TPRIPA ON TPRIATV.IDIPROC = TPRIPA.IDIPROC
                LEFT JOIN TGFPRO ON TPRIPA.CODPRODPA = TGFPRO.CODPROD,
                TPRATV R2_Atividade,
                TPREFX R0_ElementoFluxo,
                TPRIPROC R1_CabecalhoInstanciaProcesso
                WHERE R2_Atividade.IDEFX = R0_ElementoFluxo.IDEFX
                  AND TPRIATV.IDIPROC = R1_CabecalhoInstanciaProcesso.IDIPROC
                  AND TPRIATV.IDEFX = R2_Atividade.IDEFX
                  AND R0_ElementoFluxo.TIPO IN (1101, 1109, 1110)
                  AND R1_CabecalhoInstanciaProcesso.STATUSPROC NOT IN ('C', 'S', 'AP', 'P', 'P2')
                  AND TPRIATV.CODEXEC IS NULL
                  AND TPRIATV.DHACEITE IS NULL
            )
            ORDER BY IDIPROC ASC
          `;

          // Executar query usando SankhyaJX
          const resultado = await JX.consultar(sql);

          if (resultado && resultado.length > 0) {
            operacoes = resultado.map((item) => ({
              idiproc: item.IDIPROC || item.idiproc,
              dtfab:
                item.DTFAB || item.dtfab || item.DHINCLUSAO || item.dhinclusao,
              codprodpa: item.CODPRODPA || item.codprodpa,
              descprod:
                item.DESCRPROD ||
                item.descrprod ||
                item.DESCRICAO ||
                item.descricao,
              qtdproduzir: item.QTDPRODUZIR || item.qtdproduzir || 0,
              nrolote: item.NROLOTE || item.nrolote || "",
              situacao: "Agd. Aceite",
            }));
          } else {
            operacoes = [];
          }

          // Atualizar tabela
          renderTabela();
        } catch (error) {
          console.error("Erro ao carregar operações:", error);
          mostrarErro("Erro ao carregar operações: " + error.message);
          operacoes = [];
          renderTabela();
        }
      }

      // Função para carregar operações iniciadas usando SankhyaJX
      async function carregarOperacoesIniciadas() {
        try {
          // Verificar se SankhyaJX está disponível
          if (typeof JX === "undefined" || !JX.consultar) {
            console.error("SankhyaJX não está disponível");
            mostrarErro("Biblioteca SankhyaJX não está disponível");
            return;
          }

          const sql = `
            SELECT 
                IDIPROC,
                IDIATV,
                TO_CHAR(DHINICIO, 'DD/MM/YYYY') AS DTFAB,
                CODPRODPA,
                DESCRPROD,
                NROLOTE,
                QTDPRODUZIR
            FROM (
                SELECT 
                    TPRIATV.IDIPROC AS IDIPROC,
                    TPRIATV.IDIATV AS IDIATV,
                    TPRIATV.DHINICIO AS DHINICIO,
                    TPRIPA.CODPRODPA,
                    TGFPRO.DESCRPROD,
                    TPRIPA.NROLOTE,
                    TPRIPA.QTDPRODUZIR
                FROM TPRIATV
                LEFT JOIN TPRIPA ON TPRIATV.IDIPROC = TPRIPA.IDIPROC
                LEFT JOIN TGFPRO ON TPRIPA.CODPRODPA = TGFPRO.CODPROD,
                TPRATV R2_Atividade,
                TPREFX R0_ElementoFluxo,
                TPRIPROC R1_CabecalhoInstanciaProcesso
                WHERE R2_Atividade.IDEFX = R0_ElementoFluxo.IDEFX
                  AND TPRIATV.IDIPROC = R1_CabecalhoInstanciaProcesso.IDIPROC
                  AND TPRIATV.IDEFX = R2_Atividade.IDEFX
                  AND R0_ElementoFluxo.TIPO IN (1101, 1109, 1110)
                  AND R1_CabecalhoInstanciaProcesso.STATUSPROC NOT IN ('C', 'S', 'AP', 'P', 'P2')
                  AND TPRIATV.DHINICIO IS NOT NULL
                  AND TPRIATV.DHFINAL IS NULL
                  AND NOT EXISTS (
                    SELECT 1 FROM TPREIATV EIATV
                    WHERE EIATV.IDIATV = TPRIATV.IDIATV
                      AND EIATV.TIPO = 'P'
                      AND EIATV.DHFINAL IS NULL
                  )
            )
            ORDER BY IDIPROC ASC
          `;

          // Executar query usando SankhyaJX
          const resultado = await JX.consultar(sql);

          if (resultado && resultado.length > 0) {
            // Transformar dados do banco (normalizar IDIPROC/IDIATV com toNumber para uso no botão Cadastrar)
            operacoes = resultado.map((item) => ({
              idiproc: toNumber(item.IDIPROC) != null ? toNumber(item.IDIPROC) : (item.IDIPROC != null ? item.IDIPROC : item.idiproc),
              idiatv: toNumber(item.IDIATV) != null ? toNumber(item.IDIATV) : (item.IDIATV != null ? item.IDIATV : item.idiatv),
              dtfab: item.DTFAB || item.dtfab || item.DHINICIO || item.dhinicio,
              codprodpa: item.CODPRODPA || item.codprodpa,
              descprod:
                item.DESCRPROD ||
                item.descrprod ||
                item.DESCRICAO ||
                item.descricao,
              qtdproduzir: item.QTDPRODUZIR || item.qtdproduzir || 0,
              nrolote: item.NROLOTE || item.nrolote || "",
              situacao: "Iniciadas",
            }));
          } else {
            operacoes = [];
          }

          // Atualizar tabela
          renderTabela();
        } catch (error) {
          console.error("Erro ao carregar operações:", error);
          mostrarErro("Erro ao carregar operações: " + error.message);
          operacoes = [];
          renderTabela();
        }
      }

      // Função para carregar operações paradas usando SankhyaJX
      async function carregarOperacoesParadas() {
        try {
          // Verificar se SankhyaJX está disponível
          if (typeof JX === "undefined" || !JX.consultar) {
            console.error("SankhyaJX não está disponível");
            mostrarErro("Biblioteca SankhyaJX não está disponível");
            return;
          }

          const sql = `
            SELECT 
                IDIPROC,
                IDIATV,
                TO_CHAR(DHINICIO, 'DD/MM/YYYY') AS DTFAB,
                CODPRODPA,
                DESCRPROD,
                NROLOTE,
                QTDPRODUZIR
            FROM (
                SELECT 
                    TPRIATV.IDIPROC AS IDIPROC,
                    TPRIATV.IDIATV AS IDIATV,
                    TPRIATV.DHINICIO AS DHINICIO,
                    TPRIPA.CODPRODPA,
                    TGFPRO.DESCRPROD,
                    TPRIPA.NROLOTE,
                    TPRIPA.QTDPRODUZIR
                FROM TPRIATV
                LEFT JOIN TPRIPA ON TPRIATV.IDIPROC = TPRIPA.IDIPROC
                LEFT JOIN TGFPRO ON TPRIPA.CODPRODPA = TGFPRO.CODPROD,
                TPRATV R2_Atividade,
                TPREFX R0_ElementoFluxo,
                TPRIPROC R1_CabecalhoInstanciaProcesso
                WHERE R2_Atividade.IDEFX = R0_ElementoFluxo.IDEFX
                  AND TPRIATV.IDIPROC = R1_CabecalhoInstanciaProcesso.IDIPROC
                  AND TPRIATV.IDEFX = R2_Atividade.IDEFX
                  AND R0_ElementoFluxo.TIPO IN (1101, 1109, 1110)
                  AND R1_CabecalhoInstanciaProcesso.STATUSPROC NOT IN ('C', 'S', 'AP', 'P', 'P2')
                  AND TPRIATV.DHINICIO IS NOT NULL
                  AND TPRIATV.DHFINAL IS NULL
                  AND EXISTS (
                    SELECT 1 FROM TPREIATV EIATV
                    WHERE EIATV.IDIATV = TPRIATV.IDIATV
                      AND EIATV.TIPO = 'P'
                      AND EIATV.DHFINAL IS NULL
                  )
            )
            ORDER BY IDIPROC ASC
          `;

          // Executar query usando SankhyaJX
          const resultado = await JX.consultar(sql);

          if (resultado && resultado.length > 0) {
            // Transformar dados do banco (normalizar IDIPROC/IDIATV com toNumber)
            operacoes = resultado.map((item) => ({
              idiproc: toNumber(item.IDIPROC) != null ? toNumber(item.IDIPROC) : (item.IDIPROC != null ? item.IDIPROC : item.idiproc),
              idiatv: toNumber(item.IDIATV) != null ? toNumber(item.IDIATV) : (item.IDIATV != null ? item.IDIATV : item.idiatv),
              dtfab: item.DTFAB || item.dtfab || item.DHINICIO || item.dhinicio,
              codprodpa: item.CODPRODPA || item.codprodpa,
              descprod:
                item.DESCRPROD ||
                item.descrprod ||
                item.DESCRICAO ||
                item.descricao,
              qtdproduzir: item.QTDPRODUZIR || item.qtdproduzir || 0,
              nrolote: item.NROLOTE || item.nrolote || "",
              situacao: "Paradas",
            }));
          } else {
            operacoes = [];
          }

          // Atualizar tabela
          renderTabela();
        } catch (error) {
          console.error("Erro ao carregar operações:", error);
          mostrarErro("Erro ao carregar operações: " + error.message);
          operacoes = [];
          renderTabela();
        }
      }

      // Função para mostrar erro
      function mostrarErro(mensagem) {
        const tbody = document.getElementById("tbodyOp");
        const semRegistros = document.getElementById("semRegistros");
        if (tbody) tbody.innerHTML = "";
        if (semRegistros) {
          semRegistros.textContent = mensagem;
          semRegistros.style.display = "block";
        }
      }

      // Função para renderizar a tabela de operações
      function renderTabela() {
        const tbody = document.getElementById("tbodyOp");
        const semRegistros = document.getElementById("semRegistros");
        const tfootTotal = document.getElementById("tfootTotal");
        if (!tbody) return;

        tbody.innerHTML = "";

        // Filtrar operações pela situação
        const filtradas = operacoes.filter((op) => op.situacao === filtroAtual);

        if (filtradas.length === 0) {
          if (semRegistros) {
            semRegistros.style.display = "block";
          }
          if (tfootTotal) {
            tfootTotal.style.display = "none";
          }
          return;
        } else {
          if (semRegistros) {
            semRegistros.style.display = "none";
          }
        }

        filtradas.forEach((op) => {
          const temAcao =
            filtroAtual !== "Agd. Aceite" &&
            (op.situacao === "Iniciadas" || op.situacao === "Paradas");
          const tr = document.createElement("tr");
          tr.setAttribute("data-row-clicavel", "true");
          tr.setAttribute("data-clicavel", temAcao ? "true" : "false");

          tr.innerHTML = `
          <td>${op.idiproc}</td>
          <td>${formatarData(op.dtfab)}</td>
          <td>${op.codprodpa} - ${op.descprod || ""}</td>
          <td>${op.qtdproduzir}</td>
          <td>${op.nrolote}</td>
        `;

          tr.tabIndex = 0;
          tr.setAttribute("role", "button");
          tr.setAttribute("aria-label", "Ver detalhes da operação " + op.idiproc);
          tr.addEventListener("click", () => abrirOverlayDetalhe(op));
          tr.addEventListener("keypress", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              abrirOverlayDetalhe(op);
            }
          });

          tbody.appendChild(tr);
        });

        // Atualizar total de registros
        if (tfootTotal) {
          const totalText =
            filtradas.length === 1
              ? "1 registro encontrado"
              : `${filtradas.length} registros encontrados`;
          tfootTotal.querySelector("td").textContent = totalText;
          tfootTotal.style.display = "";
        }
      }

      // Função para alternar filtro
      document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll(".filtro-btn").forEach((btn) => {
          btn.addEventListener("click", function () {
            document
              .querySelectorAll(".filtro-btn")
              .forEach((b) => b.classList.remove("ativo"));
            this.classList.add("ativo");
            filtroAtual = this.getAttribute("data-situacao");

            // Se for "Agd. Aceite", carregar do banco
            if (filtroAtual === "Agd. Aceite") {
              carregarOperacoesAguardandoAceite();
            } else if (filtroAtual === "Iniciadas") {
              carregarOperacoesIniciadas();
            } else if (filtroAtual === "Paradas") {
              carregarOperacoesParadas();
            } else {
              // Para outros filtros, apenas renderizar (você pode implementar outras queries)
              renderTabela();
            }
          });
        });

        // Carregar dados iniciais
        carregarOperacoesAguardandoAceite();
      });

      // Função para atualizar a tabela
      function atualizarTabela() {
        const btn = document.querySelector(".refresh-btn");
        const svg = btn.querySelector("svg");

        // Desabilita o botão durante a atualização
        btn.disabled = true;
        btn.style.opacity = "0.4";
        btn.style.transform = "scale(0.95)";

        // Adiciona animação de rotação
        svg.style.transform = "rotate(720deg)";
        svg.style.transition =
          "transform 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)";

        // Recarregar dados conforme o filtro
        if (filtroAtual === "Agd. Aceite") {
          carregarOperacoesAguardandoAceite().finally(() => {
            svg.style.transform = "rotate(0deg)";
            svg.style.transition = "transform 0.3s ease-out";
            btn.disabled = false;
            btn.style.opacity = "";
            btn.style.transform = "";
          });
        } else if (filtroAtual === "Iniciadas") {
          carregarOperacoesIniciadas().finally(() => {
            svg.style.transform = "rotate(0deg)";
            svg.style.transition = "transform 0.3s ease-out";
            btn.disabled = false;
            btn.style.opacity = "";
            btn.style.transform = "";
          });
        } else if (filtroAtual === "Paradas") {
          carregarOperacoesParadas().finally(() => {
            svg.style.transform = "rotate(0deg)";
            svg.style.transition = "transform 0.3s ease-out";
            btn.disabled = false;
            btn.style.opacity = "";
            btn.style.transform = "";
          });
        } else {
          // Para outros filtros, apenas renderizar
          setTimeout(() => {
            renderTabela();
            svg.style.transform = "rotate(0deg)";
            svg.style.transition = "transform 0.3s ease-out";
            btn.disabled = false;
            btn.style.opacity = "";
            btn.style.transform = "";
          }, 1200);
        }
      }

      // Referência à operação exibida no overlay (para o botão de ação)
      let opOverlay = null;

      // Carrega os dados da aba "Geral" para a OP (query específica por IDIPROC)
      async function carregarDadosGeralOp(idiproc) {
        if (!idiproc || typeof JX === "undefined" || !JX.consultar) {
          return null;
        }
        try {
          const idNum = Number(idiproc);
          const idVal = isNaN(idNum) ? idiproc : idNum;

          const sql = `
            SELECT 
              X.*
            FROM (
              SELECT
                IPA.CODPRODPA,
                IPA.NROLOTE,
                IPA.CONTROLEPA,
                (SELECT SUM(QTDPRODUZIR) FROM TPRIPA IPA2 WHERE IPA2.IDIPROC = ${idVal}) AS QTDPRODUZIR,
                PRO.COMPLDESC,
                PRO.CODVOL,
                PRO.CODGRUPOPROD,
                PRO.DESCRPROD,
                MPS.DTINICMPS,
                MPS.DTFINMPS,
                PRO.DECQTD,
                PRO.REFERENCIA,
                GRU.DESCRGRUPOPROD,
                IPROC.PRIORIDADE AS PRIORIDADE,
                (SELECT COUNT(1) FROM TPRIPA IPA3 WHERE IPA3.IDIPROC = IPA.IDIPROC) AS QTDPRODUTOS,
                (CASE WHEN IPA.NROLOTE <> 'CURINGA' THEN 1 ELSE 2 END) AS ORDER_NROLOTE
              FROM
                TPRIPA IPA
                INNER JOIN TGFPRO PRO ON (IPA.CODPRODPA = PRO.CODPROD)
                INNER JOIN TPRIPROC IPROC ON (IPROC.IDIPROC = IPA.IDIPROC)
                INNER JOIN TGFGRU GRU ON (PRO.CODGRUPOPROD = GRU.CODGRUPOPROD)
                LEFT JOIN TPRMPS MPS ON (MPS.NUMPS = IPROC.NUMPS)
              WHERE
                IPA.IDIPROC = ${idVal}
              ORDER BY
                IPA.CODPRODPA,
                ORDER_NROLOTE,
                IPA.CONTROLEPA
            ) X
          `;

          const resultado = await JX.consultar(sql);
          if (resultado && resultado.length > 0) {
            return resultado[0];
          }
        } catch (e) {
          console.error("Erro ao carregar dados da aba Geral:", e);
        }
        return null;
      }

      // Carrega execuções (TPREIATV) para o IDIATV da atividade (aba Execuções)
      async function carregarExecucoes(idiatv) {
        if (idiatv == null || idiatv === "" || typeof JX === "undefined" || !JX.consultar) {
          return [];
        }
        try {
          const idNum = Number(idiatv);
          const idVal = isNaN(idNum) ? idiatv : idNum;
          const sql = `
            SELECT
              TO_CHAR(ATV.DHINICIO, 'DD/MM/YYYY HH24:MI') AS DHINICIO,
              TO_CHAR(ATV.DHFINAL, 'DD/MM/YYYY HH24:MI') AS DHFINAL,
              ATV.TIPO,
              ATV.CODEXEC,
              USU.NOMEUSU,
              ATV.OBSERVACAO,
              ATV.CODMTP
            FROM TPREIATV ATV
            INNER JOIN TSIUSU USU ON ATV.CODEXEC = USU.CODUSU
            WHERE ATV.IDIATV = ${idVal}
          `;
          const resultado = await JX.consultar(sql);
          return resultado && Array.isArray(resultado) ? resultado : [];
        } catch (e) {
          console.error("Erro ao carregar execuções:", e);
          return [];
        }
      }

      // Carrega cabeçalhos de apontamento (TPRAPO) por IDIPROC para a guia Apontamentos
      async function carregarApontamentos(idiproc) {
        if (!idiproc || typeof JX === "undefined" || !JX.consultar) return [];
        try {
          const idVal = isNaN(Number(idiproc)) ? idiproc : Number(idiproc);
          const sql = `
            SELECT APO.NUAPO, TO_CHAR(APO.DHAPO, 'DD/MM/YYYY HH24:MI') AS DHAPO, APO.SITUACAO
            FROM TPRAPO APO
            INNER JOIN TPRIATV IATV ON IATV.IDIATV = APO.IDIATV
            WHERE IATV.IDIPROC = ${idVal}
            ORDER BY APO.NUAPO DESC
          `;
          const resultado = await JX.consultar(sql);
          return resultado && Array.isArray(resultado) ? resultado : [];
        } catch (e) {
          console.error("Erro ao carregar apontamentos:", e);
          return [];
        }
      }

      // Carrega itens do apontamento (TPRAPA) por NUAPO – Cód. PA, Descrição, Controle PA, Qtd. apontada, Qtd. baixada
      async function carregarItensApontamento(nuapo) {
        if (!nuapo || typeof JX === "undefined" || !JX.consultar) return [];
        try {
          const nVal = isNaN(Number(nuapo)) ? nuapo : Number(nuapo);
          const sql = `
            SELECT APA.SEQAPA, APA.CODPRODPA, NVL(PRO.DESCRPROD, '') AS DESCRPROD, NVL(APA.CONTROLEPA, '') AS CONTROLEPA,
                   NVL(APA.QTDAPONTADA, 0) AS QTDAPONTADA, NVL(APA.QTDFAT, 0) AS QTDFAT
            FROM TPRAPA APA
            LEFT JOIN TGFPRO PRO ON PRO.CODPROD = APA.CODPRODPA
            WHERE APA.NUAPO = ${nVal}
            ORDER BY APA.SEQAPA
          `;
          const resultado = await JX.consultar(sql);
          return resultado && Array.isArray(resultado) ? resultado : [];
        } catch (e) {
          console.error("Erro ao carregar itens do apontamento:", e);
          return [];
        }
      }

      // Carrega materiais (TPRAMP) por NUAPO e SEQAPA – Cód. MP, Descrição, Lote, Qtd. apontada, Estoque, UN
      async function carregarMateriaisItem(nuapo, seqapa) {
        if (!nuapo || seqapa == null || typeof JX === "undefined" || !JX.consultar) return [];
        try {
          const nVal = isNaN(Number(nuapo)) ? nuapo : Number(nuapo);
          const sVal = isNaN(Number(seqapa)) ? seqapa : Number(seqapa);
          const sql = `
            SELECT AMP.CODPRODMP, NVL(PRO.DESCRPROD, '') AS DESCRPROD, NVL(AMP.CONTROLEMP, '') AS CONTROLEMP,
                   NVL(AMP.QTD, 0) AS QTD,
                   (SELECT NVL(SUM(EST.ESTOQUE), 0) FROM TGFEST EST WHERE EST.CODPROD = AMP.CODPRODMP AND (EST.CONTROLE = AMP.CONTROLEMP OR NVL(AMP.CONTROLEMP, ' ') = ' ')) AS ESTOQUE,
                   NVL(AMP.CODVOL, 'UN') AS CODVOL
            FROM TPRAMP AMP
            LEFT JOIN TGFPRO PRO ON PRO.CODPROD = AMP.CODPRODMP
            WHERE AMP.NUAPO = ${nVal} AND AMP.SEQAPA = ${sVal}
            ORDER BY AMP.SEQMP
          `;
          const resultado = await JX.consultar(sql);
          return resultado && Array.isArray(resultado) ? resultado : [];
        } catch (e) {
          console.error("Erro ao carregar materiais do item:", e);
          return [];
        }
      }

      function montarConteudoDefaultOverlay(op, body) {
        body.innerHTML =
          '<div class="detalhe-item"><span class="detalhe-label">OP</span><span class="detalhe-valor">' +
          (op.idiproc != null ? op.idiproc : "-") +
          "</span></div>" +
          '<div class="detalhe-item"><span class="detalhe-label">Data</span><span class="detalhe-valor">' +
          (formatarData(op.dtfab) || "-") +
          "</span></div>" +
          '<div class="detalhe-item"><span class="detalhe-label">Código do produto</span><span class="detalhe-valor">' +
          (op.codprodpa != null ? op.codprodpa : "-") +
          "</span></div>" +
          '<div class="detalhe-item"><span class="detalhe-label">Descrição do produto</span><span class="detalhe-valor">' +
          (op.descprod || "-") +
          "</span></div>" +
          '<div class="detalhe-item"><span class="detalhe-label">Quantidade a produzir</span><span class="detalhe-valor">' +
          (op.qtdproduzir != null ? op.qtdproduzir : "-") +
          "</span></div>" +
          '<div class="detalhe-item"><span class="detalhe-label">Lote</span><span class="detalhe-valor">' +
          (op.nrolote != null && op.nrolote !== "" ? op.nrolote : "-") +
          "</span></div>" +
          '<div class="detalhe-item"><span class="detalhe-label">Situação</span><span class="detalhe-valor">' +
          (op.situacao || filtroAtual || "-") +
          "</span></div>" +
          (filtroAtual === "Iniciadas"
            ? '<div class="overlay-observacao" id="overlayObservacaoParada"><span class="detalhe-label">Observação para a parada (opcional)</span><textarea id="inputObservacaoParada" placeholder="Ex.: troca de ferramenta, manutenção..." maxlength="500"></textarea></div>'
            : "");
      }

      function montarConteudoOverlayIniciadas(op, body, dadosGeral) {
        const getVal = (obj, key, fallback) =>
          obj && (obj[key] ?? obj[key.toLowerCase()]) != null
            ? obj[key] ?? obj[key.toLowerCase()]
            : fallback;

        const codprodpa = getVal(dadosGeral, "CODPRODPA", op.codprodpa);
        const nrolote = getVal(dadosGeral, "NROLOTE", op.nrolote);
        const controlepa = getVal(dadosGeral, "CONTROLEPA", "");
        const qtdproduzir = getVal(dadosGeral, "QTDPRODUZIR", op.qtdproduzir);
        const compldesc = getVal(dadosGeral, "COMPLDESC", "");
        const codvol = getVal(dadosGeral, "CODVOL", "");
        const codgrupoprod = getVal(dadosGeral, "CODGRUPOPROD", "");
        const descrprod = getVal(dadosGeral, "DESCRPROD", op.descprod);
        const dtinicmps = getVal(dadosGeral, "DTINICMPS", "");
        const dtfinmps = getVal(dadosGeral, "DTFINMPS", "");
        const decqtd = getVal(dadosGeral, "DECQTD", "");
        const referencia = getVal(dadosGeral, "REFERENCIA", "");
        const descrgrupoprod = getVal(dadosGeral, "DESCRGRUPOPROD", "");
        const prioridade = getVal(dadosGeral, "PRIORIDADE", "");
        const qtdprodutos = getVal(dadosGeral, "QTDPRODUTOS", "");

        body.innerHTML =
          '<div class="detalhe-item"><span class="detalhe-label">OP</span><span class="detalhe-valor">' +
          (op.idiproc != null ? op.idiproc : "-") +
          "</span></div>" +
          '<div class="detalhe-item"><span class="detalhe-label">Situação</span><span class="detalhe-valor">' +
          (op.situacao || filtroAtual || "-") +
          "</span></div>" +
          '<div class="overlay-observacao" id="overlayObservacaoParada"><span class="detalhe-label">Observação para a parada (opcional)</span><textarea id="inputObservacaoParada" placeholder="Ex.: troca de ferramenta, manutenção..." maxlength="500"></textarea></div>' +
          '<div class="overlay-tabs">' +
          '<div class="overlay-tabs-header">' +
          '<button type="button" class="overlay-tab-button ativo" data-tab="geral">Geral</button>' +
          '<button type="button" class="overlay-tab-button" data-tab="apontamentos">Apontamentos</button>' +
          '<button type="button" class="overlay-tab-button" data-tab="execucoes">Execuções</button>' +
          "</div>" +
          '<div class="overlay-tabs-content">' +
          '<div class="overlay-tab-content ativo" data-tab-content="geral">' +
          '<div class="overlay-campos-grid">' +
          '<div class="overlay-campo"><label>Cód. Produto PA</label><input type="text" disabled value="' +
          (codprodpa != null ? codprodpa : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Lote</label><input type="text" disabled value="' +
          (nrolote != null ? nrolote : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Controle PA</label><input type="text" disabled value="' +
          (controlepa != null ? controlepa : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Qtd. Produzir (total)</label><input type="text" disabled value="' +
          (qtdproduzir != null ? qtdproduzir : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Descrição produto</label><input type="text" disabled value="' +
          (descrprod != null ? descrprod : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Compl. descrição</label><input type="text" disabled value="' +
          (compldesc != null ? compldesc : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Grupo produto</label><input type="text" disabled value="' +
          (descrgrupoprod != null ? descrgrupoprod : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Cód. grupo</label><input type="text" disabled value="' +
          (codgrupoprod != null ? codgrupoprod : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Referência</label><input type="text" disabled value="' +
          (referencia != null ? referencia : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Unidade</label><input type="text" disabled value="' +
          (codvol != null ? codvol : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Dec. qtd</label><input type="text" disabled value="' +
          (decqtd != null ? decqtd : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Data início MPS</label><input type="text" disabled value="' +
          (dtinicmps != null ? dtinicmps : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Data fim MPS</label><input type="text" disabled value="' +
          (dtfinmps != null ? dtfinmps : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Prioridade</label><input type="text" disabled value="' +
          (prioridade != null ? prioridade : "") +
          '"></div>' +
          '<div class="overlay-campo"><label>Qtd. produtos na OP</label><input type="text" disabled value="' +
          (qtdprodutos != null ? qtdprodutos : "") +
          '"></div>' +
          "</div>" +
          "</div>" +
          '<div class="overlay-tab-content" data-tab-content="apontamentos">' +
          '<div class="apontamentos-container" id="apontamentosContainer" data-carregado="false" data-idiproc="' + (toNumber(op.idiproc) != null ? toNumber(op.idiproc) : (toNumber(op.IDIPROC) != null ? toNumber(op.IDIPROC) : '')) + '" data-idiatv="' + (toNumber(op.idiatv) != null ? toNumber(op.idiatv) : (toNumber(op.IDIATV) != null ? toNumber(op.IDIATV) : '')) + '">' +
          '<div class="apontamentos-botoes" style="margin-bottom:10px;">' +
          '<button type="button" class="overlay-btn overlay-btn-acao" id="btnCadastrarCabecApontamento">Cadastrar Cabeçalho de Apontamento</button>' +
          '</div>' +
          '<div class="apontamentos-nivel apontamentos-nivel-cabec ativo" id="apontamentosNivelCabec">' +
          '<p class="apontamentos-placeholder" id="apontamentosPlaceholderCabec">Toque aqui para carregar os apontamentos.</p>' +
          '<div id="apontamentosListaCabec" style="display:none;"></div>' +
          '</div>' +
          '<div class="apontamentos-nivel apontamentos-nivel-itens" id="apontamentosNivelItens">' +
          '<button type="button" class="apontamentos-voltar" id="apontamentosVoltarItens">← Voltar</button>' +
          '<p class="apontamentos-placeholder" id="apontamentosTituloItens">Itens</p>' +
          '<div id="apontamentosTabelaItensWrap" style="display:none;"><table class="apontamentos-tabela" id="apontamentosTabelaItens"><thead><tr><th>Cód. PA</th><th>Descrição</th><th>Controle PA</th><th>Qtd. apont.</th><th>Qtd. baixada</th><th></th></tr></thead><tbody id="apontamentosTbodyItens"></tbody></table></div>' +
          '</div>' +
          '<div class="apontamentos-nivel apontamentos-nivel-materiais" id="apontamentosNivelMateriais">' +
          '<button type="button" class="apontamentos-voltar" id="apontamentosVoltarMateriais">← Voltar</button>' +
          '<p class="apontamentos-placeholder" id="apontamentosTituloMateriais">Materiais</p>' +
          '<div id="apontamentosTabelaMateriaisWrap" style="display:none;"><table class="apontamentos-tabela" id="apontamentosTabelaMateriais"><thead><tr><th>Cód. MP</th><th>Descrição</th><th>Lote</th><th>Qtd. apont.</th><th>Estoque</th><th>UN</th></tr></thead><tbody id="apontamentosTbodyMateriais"></tbody></table></div>' +
          '</div>' +
          '</div></div>' +
          "</div>" +
          '<div class="overlay-tab-content" data-tab-content="execucoes">' +
          '<div class="overlay-execucoes-container" id="execucoesContainer" data-carregado="false">' +
          '<p class="overlay-execucoes-placeholder">Toque aqui para carregar as execuções.</p>' +
          "</div>" +
          "</div>" +
          "</div>" +
          "</div>";

        // Controle das abas (Execuções: carrega sob demanda ao exibir a aba)
        const tabButtons = body.querySelectorAll(".overlay-tab-button");
        const tabContents = body.querySelectorAll(".overlay-tab-content");
        const execucoesContainer = body.querySelector("#execucoesContainer");
        const idiatv = op.idiatv != null ? op.idiatv : op.IDIATV;

        tabButtons.forEach((btn) => {
          btn.addEventListener("click", function () {
            const alvo = this.getAttribute("data-tab");
            tabButtons.forEach((b) => b.classList.remove("ativo"));
            tabContents.forEach((c) => c.classList.remove("ativo"));
            this.classList.add("ativo");
            const alvoContent = body.querySelector(
              '.overlay-tab-content[data-tab-content="' + alvo + '"]'
            );
            if (alvoContent) {
              alvoContent.classList.add("ativo");
            }
            if (alvo === "apontamentos") {
              var apontContainer = body.querySelector("#apontamentosContainer");
              if (apontContainer && apontContainer.getAttribute("data-carregado") !== "true") {
                apontContainer.setAttribute("data-carregado", "true");
                var idiprocApo = apontContainer.getAttribute("data-idiproc");
                var placeholderCabec = body.querySelector("#apontamentosPlaceholderCabec");
                var listaCabec = body.querySelector("#apontamentosListaCabec");
                placeholderCabec.textContent = "Carregando apontamentos...";
                carregarApontamentos(idiprocApo).then(function (rows) {
                  if (!apontContainer.parentNode) return;
                  placeholderCabec.style.display = "none";
                  listaCabec.style.display = "block";
                  listaCabec.innerHTML = "";
                  if (rows.length === 0) {
                    listaCabec.innerHTML = "<p class=\"apontamentos-placeholder\">Nenhum apontamento.</p>";
                  } else {
                    var esc = function (v) { if (v == null || v === undefined) return ""; return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
                    rows.forEach(function (r) {
                      var nuapo = r.NUAPO != null ? r.NUAPO : r.nuapo;
                      var dhapo = r.DHAPO != null ? r.DHAPO : (r.dhapo != null ? r.dhapo : "");
                      var sit = r.SITUACAO != null ? r.SITUACAO : (r.situacao != null ? r.situacao : "");
                      var div = document.createElement("div");
                      div.className = "apontamentos-lista-item";
                      div.setAttribute("data-nuapo", nuapo);
                      div.textContent = "Nro. único: " + nuapo + (dhapo ? " - " + dhapo : "") + (sit ? " (" + sit + ")" : "");
                      listaCabec.appendChild(div);
                    });
                  }
                });
                listaCabec.addEventListener("click", function (e) {
                  var item = e.target.closest(".apontamentos-lista-item");
                  if (!item) return;
                  var nuapo = item.getAttribute("data-nuapo");
                  if (!nuapo) return;
                  body.querySelector("#apontamentosNivelCabec").classList.remove("ativo");
                  body.querySelector("#apontamentosNivelItens").classList.add("ativo");
                  body.querySelector("#apontamentosNivelMateriais").classList.remove("ativo");
                  body.querySelector("#apontamentosTituloItens").textContent = "Nro. único " + nuapo + " – Itens";
                  body.querySelector("#apontamentosTabelaItensWrap").style.display = "none";
                  body.querySelector("#apontamentosTbodyItens").innerHTML = "";
                  carregarItensApontamento(nuapo).then(function (rows) {
                    var wrap = body.querySelector("#apontamentosTabelaItensWrap");
                    var tbody = body.querySelector("#apontamentosTbodyItens");
                    if (!tbody || !tbody.parentNode) return;
                    tbody.innerHTML = "";
                    wrap.style.display = "block";
                    if (rows.length === 0) {
                      tbody.innerHTML = "<tr><td colspan=\"6\" class=\"apontamentos-placeholder\">Nenhum item.</td></tr>";
                    } else {
                      var esc = function (v) { if (v == null || v === undefined) return ""; return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
                      rows.forEach(function (r) {
                        var seq = r.SEQAPA != null ? r.SEQAPA : r.seqapa;
                        var cod = r.CODPRODPA != null ? r.CODPRODPA : r.codprodpa;
                        var desc = r.DESCRPROD != null ? r.DESCRPROD : (r.descrprod != null ? r.descrprod : "");
                        var ctrl = r.CONTROLEPA != null ? r.CONTROLEPA : (r.controlepa != null ? r.controlepa : "");
                        var qtd = r.QTDAPONTADA != null ? r.QTDAPONTADA : (r.qtdapontada != null ? r.qtdapontada : 0);
                        var qtdb = r.QTDFAT != null ? r.QTDFAT : (r.qtdfat != null ? r.qtdfat : 0);
                        var tr = document.createElement("tr");
                        tr.setAttribute("data-clicavel", "true");
                        tr.setAttribute("data-nuapo", nuapo);
                        tr.setAttribute("data-seqapa", seq);
                        tr.innerHTML = "<td>" + esc(cod) + "</td><td>" + esc(desc) + "</td><td>" + esc(ctrl) + "</td><td>" + esc(qtd) + "</td><td>" + esc(qtdb) + "</td><td>Materiais ›</td>";
                        tbody.appendChild(tr);
                      });
                    }
                  });
                });
                body.querySelector("#apontamentosVoltarItens").onclick = function () {
                  body.querySelector("#apontamentosNivelCabec").classList.add("ativo");
                  body.querySelector("#apontamentosNivelItens").classList.remove("ativo");
                  body.querySelector("#apontamentosNivelMateriais").classList.remove("ativo");
                };
                body.querySelector("#apontamentosTbodyItens").addEventListener("click", function (e) {
                  var tr = e.target.closest("tr[data-nuapo][data-seqapa]");
                  if (!tr) return;
                  var nuapo = tr.getAttribute("data-nuapo");
                  var seqapa = tr.getAttribute("data-seqapa");
                  body.querySelector("#apontamentosNivelItens").classList.remove("ativo");
                  body.querySelector("#apontamentosNivelMateriais").classList.add("ativo");
                  body.querySelector("#apontamentosTituloMateriais").textContent = "Itens → Seq. " + seqapa + " – Materiais";
                  body.querySelector("#apontamentosTabelaMateriaisWrap").style.display = "none";
                  body.querySelector("#apontamentosTbodyMateriais").innerHTML = "";
                  carregarMateriaisItem(nuapo, seqapa).then(function (rows) {
                    var wrap = body.querySelector("#apontamentosTabelaMateriaisWrap");
                    var tbody = body.querySelector("#apontamentosTbodyMateriais");
                    if (!tbody || !tbody.parentNode) return;
                    tbody.innerHTML = "";
                    wrap.style.display = "block";
                    if (rows.length === 0) {
                      tbody.innerHTML = "<tr><td colspan=\"6\" class=\"apontamentos-placeholder\">Nenhum material.</td></tr>";
                    } else {
                      var esc = function (v) { if (v == null || v === undefined) return ""; return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
                      rows.forEach(function (r) {
                        var cod = r.CODPRODMP != null ? r.CODPRODMP : r.codprodmp;
                        var desc = r.DESCRPROD != null ? r.DESCRPROD : (r.descrprod != null ? r.descrprod : "");
                        var lote = r.CONTROLEMP != null ? r.CONTROLEMP : (r.controlemp != null ? r.controlemp : "");
                        var qtd = r.QTD != null ? r.QTD : (r.qtd != null ? r.qtd : 0);
                        var est = r.ESTOQUE != null ? r.ESTOQUE : (r.estoque != null ? r.estoque : 0);
                        var un = r.CODVOL != null ? r.CODVOL : (r.codvol != null ? r.codvol : "UN");
                        var trM = document.createElement("tr");
                        trM.innerHTML = "<td>" + esc(cod) + "</td><td>" + esc(desc) + "</td><td>" + esc(lote) + "</td><td>" + esc(qtd) + "</td><td>" + esc(est) + "</td><td>" + esc(un) + "</td>";
                        tbody.appendChild(trM);
                      });
                    }
                  });
                });
                body.querySelector("#apontamentosVoltarMateriais").onclick = function () {
                  body.querySelector("#apontamentosNivelMateriais").classList.remove("ativo");
                  body.querySelector("#apontamentosNivelItens").classList.add("ativo");
                };
              }
            }
            if (alvo === "execucoes" && execucoesContainer && execucoesContainer.getAttribute("data-carregado") !== "true") {
              execucoesContainer.setAttribute("data-carregado", "true");
              if (idiatv == null || idiatv === "") {
                execucoesContainer.innerHTML = "<p class=\"overlay-execucoes-placeholder\">Dados da atividade não disponíveis.</p>";
                return;
              }
              execucoesContainer.innerHTML = "<p class=\"overlay-execucoes-placeholder\">Carregando execuções...</p>";
              carregarExecucoes(idiatv).then(function (rows) {
                if (!execucoesContainer.parentNode) return;
                if (rows.length === 0) {
                  execucoesContainer.innerHTML = "<p class=\"overlay-execucoes-placeholder\">Nenhuma execução encontrada.</p>";
                  return;
                }
                const esc = function (v) {
                  if (v == null || v === undefined) return "";
                  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
                };
                var html = "<table class=\"overlay-tabela-execucoes\"><thead><tr>" +
                  "<th>Início</th><th>Fim</th><th>Tipo</th><th>Exec.</th><th>Usuário</th><th>Observ.</th><th>CODMTP</th></tr></thead><tbody>";
                rows.forEach(function (r) {
                  var dhinicio = r.DHINICIO != null ? r.DHINICIO : (r.dhinicio != null ? r.dhinicio : "");
                  var dhfinal = r.DHFINAL != null ? r.DHFINAL : (r.dhfinal != null ? r.dhfinal : "");
                  var tipo = r.TIPO != null ? r.TIPO : (r.tipo != null ? r.tipo : "");
                  var codexec = r.CODEXEC != null ? r.CODEXEC : (r.codexec != null ? r.codexec : "");
                  var nomeusu = r.NOMEUSU != null ? r.NOMEUSU : (r.nomeusu != null ? r.nomeusu : "");
                  var obs = r.OBSERVACAO != null ? r.OBSERVACAO : (r.observacao != null ? r.observacao : "");
                  var codmtp = r.CODMTP != null ? r.CODMTP : (r.codmtp != null ? r.codmtp : "");
                  html += "<tr><td><input type=\"text\" class=\"overlay-exec-input\" disabled value=\"" + esc(dhinicio) + "\"></td>" +
                    "<td><input type=\"text\" class=\"overlay-exec-input\" disabled value=\"" + esc(dhfinal) + "\"></td>" +
                    "<td><input type=\"text\" class=\"overlay-exec-input\" disabled value=\"" + esc(tipo) + "\"></td>" +
                    "<td><input type=\"text\" class=\"overlay-exec-input\" disabled value=\"" + esc(codexec) + "\"></td>" +
                    "<td><input type=\"text\" class=\"overlay-exec-input\" disabled value=\"" + esc(nomeusu) + "\"></td>" +
                    "<td><input type=\"text\" class=\"overlay-exec-input\" disabled value=\"" + esc(obs) + "\"></td>" +
                    "<td><input type=\"text\" class=\"overlay-exec-input\" disabled value=\"" + esc(codmtp) + "\"></td></tr>";
                });
                html += "</tbody></table>";
                execucoesContainer.innerHTML = html;
              });
            }
          });
        });

        // Botão "Cadastrar Cabeçalho de Apontamento" (guia Apontamentos) – aciona Java com IDIATV e IDIPROC
        var btnCadastrarCabec = body.querySelector("#btnCadastrarCabecApontamento");
        if (btnCadastrarCabec) {
          btnCadastrarCabec.onclick = function () {
            if (typeof JX === "undefined" || !JX.acionarBotao) {
              alert("Erro: Biblioteca SankhyaJX não está disponível");
              return;
            }
            // 1) Ler da fonte mais confiável: data-attributes do container (preenchidos na montagem do overlay)
            var apontContainer = document.getElementById("apontamentosContainer");
            var idiprocVal = null;
            var idiatvVal = null;
            if (apontContainer) {
              var rawIdiproc = apontContainer.getAttribute("data-idiproc");
              var rawIdiatv = apontContainer.getAttribute("data-idiatv");
              if (rawIdiproc !== "" && rawIdiproc != null) { idiprocVal = Number(rawIdiproc); if (isNaN(idiprocVal)) idiprocVal = null; }
              if (rawIdiatv !== "" && rawIdiatv != null) { idiatvVal = Number(rawIdiatv); if (isNaN(idiatvVal)) idiatvVal = null; }
            }
            // 2) Fallback: opOverlay (operação da linha clicada), normalizando com toNumber (Sankhya pode retornar objeto/string)
            if ((idiprocVal == null || idiprocVal <= 0) || (idiatvVal == null || idiatvVal <= 0)) {
              var opRef = opOverlay;
              if (opRef) {
                if (idiprocVal == null || idiprocVal <= 0) idiprocVal = toNumber(opRef.idiproc) || toNumber(opRef.IDIPROC);
                if (idiatvVal == null || idiatvVal <= 0) idiatvVal = toNumber(opRef.idiatv) || toNumber(opRef.IDIATV);
              }
            }
            if ((idiatvVal == null || idiatvVal <= 0) && (idiprocVal == null || idiprocVal <= 0)) {
              alert("Erro: IDIATV e IDIPROC não encontrados. Abra o overlay a partir de um registro da guia Iniciadas.");
              return;
            }
            // Montar params com os nomes exatos do cadastro no Sankhya (IDIATV e IDIPROC)
            var params = {};
            if (idiatvVal != null && idiatvVal > 0) params.IDIATV = idiatvVal;
            if (idiprocVal != null && idiprocVal > 0) params.IDIPROC = idiprocVal;
            if (!confirm("Deseja cadastrar o cabeçalho de apontamento para esta OP?")) return;
            console.log("CadastrarCabecApontamento - data-idiproc/data-idiatv:", apontContainer ? [ apontContainer.getAttribute("data-idiproc"), apontContainer.getAttribute("data-idiatv") ] : "sem container", "| idiprocVal:", idiprocVal, "idiatvVal:", idiatvVal, "| params:", params, "idBotao:", ID_BOTAO_CADASTRAR_CABEC_APONTAMENTO);
            JX.acionarBotao(params, { tipo: "JAVA", idBotao: ID_BOTAO_CADASTRAR_CABEC_APONTAMENTO })
              .then(function (resultado) {
                if (resultado && resultado.mensagem) alert(resultado.mensagem);
                var apontContainer = body.querySelector("#apontamentosContainer");
                if (apontContainer && apontContainer.getAttribute("data-carregado") === "true") {
                  var idiprocApo = apontContainer.getAttribute("data-idiproc");
                  apontContainer.setAttribute("data-carregado", "false");
                  carregarApontamentos(idiprocApo).then(function (rows) {
                    var placeholderCabec = body.querySelector("#apontamentosPlaceholderCabec");
                    var listaCabec = body.querySelector("#apontamentosListaCabec");
                    if (placeholderCabec) placeholderCabec.style.display = "none";
                    if (listaCabec) {
                      listaCabec.style.display = "block";
                      listaCabec.innerHTML = "";
                      if (rows.length === 0) {
                        listaCabec.innerHTML = "<p class=\"apontamentos-placeholder\">Nenhum apontamento.</p>";
                      } else {
                        var esc = function (v) { if (v == null || v === undefined) return ""; return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
                        rows.forEach(function (r) {
                          var nuapo = r.NUAPO != null ? r.NUAPO : r.nuapo;
                          var dhapo = r.DHAPO != null ? r.DHAPO : (r.dhapo != null ? r.dhapo : "");
                          var sit = r.SITUACAO != null ? r.SITUACAO : (r.situacao != null ? r.situacao : "");
                          var div = document.createElement("div");
                          div.className = "apontamentos-lista-item";
                          div.setAttribute("data-nuapo", nuapo);
                          div.textContent = "Nro. único: " + nuapo + (dhapo ? " - " + dhapo : "") + (sit ? " (" + sit + ")" : "");
                          listaCabec.appendChild(div);
                        });
                      }
                    }
                  });
                }
                atualizarTabela();
              })
              .catch(function (erro) {
                alert("Erro ao cadastrar cabeçalho de apontamento: " + (erro.message || erro));
              });
          };
        }
      }

      // Abre o overlay com todos os detalhes do registro (mobile first)
      function abrirOverlayDetalhe(op) {
        opOverlay = op;
        var overlay = document.getElementById("overlayDetalhe");
        var body = document.getElementById("overlayBody");
        var btnAcao = document.getElementById("overlayBtnAcao");
        if (!overlay || !body || !btnAcao) return;

        // placeholder enquanto carrega dados adicionais (quando Iniciadas)
        body.innerHTML =
          '<div class="detalhe-item"><span class="detalhe-label">Carregando detalhes</span><span class="detalhe-valor">Aguarde...</span></div>';

        var mostraAcao =
          filtroAtual === "Iniciadas" || filtroAtual === "Paradas";
        if (mostraAcao) {
          btnAcao.style.display = "flex";
          var ehParar = filtroAtual === "Iniciadas";
          btnAcao.textContent = ehParar ? "Parar a produção" : "Continuar produção";
          if (ehParar) btnAcao.classList.add("parar"); else btnAcao.classList.remove("parar");
          btnAcao.onclick = function () {
            executarAcaoOp(op);
          };
        } else {
          btnAcao.style.display = "none";
          btnAcao.classList.remove("parar");
          btnAcao.onclick = null;
        }

        overlay.classList.add("ativo");
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        btnAcao.focus();

        if (filtroAtual === "Iniciadas") {
          carregarDadosGeralOp(op.idiproc).then(function (dados) {
            montarConteudoOverlayIniciadas(op, body, dados || {});
          });
        } else {
          montarConteudoDefaultOverlay(op, body);
        }
      }

      function fecharOverlayDetalhe() {
        var overlay = document.getElementById("overlayDetalhe");
        if (!overlay) return;
        overlay.classList.remove("ativo");
        overlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        opOverlay = null;
      }

      document.addEventListener("DOMContentLoaded", function () {
        var overlay = document.getElementById("overlayDetalhe");
        var btnFechar = document.getElementById("overlayBtnFechar");
        if (overlay) {
          overlay.addEventListener("click", function (e) {
            if (e.target === overlay) fecharOverlayDetalhe();
          });
          document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && overlay.classList.contains("ativo")) {
              fecharOverlayDetalhe();
            }
          });
        }
        if (btnFechar) {
          btnFechar.addEventListener("click", fecharOverlayDetalhe);
        }
      });

      // Executa a ação (Parar ou Continuar produção) a partir do overlay
      function executarAcaoOp(op) {
        if (typeof JX === "undefined" || !JX.acionarBotao) {
          alert("Erro: Biblioteca SankhyaJX não está disponível");
          return;
        }
        if (!op || (op.idiproc !== 0 && !op.idiproc)) {
          alert("Erro: IDIPROC não encontrado na operação");
          return;
        }
        var idiprocVal = Number(op.idiproc);
        if (isNaN(idiprocVal)) idiprocVal = op.idiproc;

        if (filtroAtual === "Paradas") {
          var msgParadas =
            "Deseja retomar a produção para a OP " +
            op.idiproc +
            "?\n\nProduto: " +
            op.codprodpa +
            " - " +
            (op.descprod || "");
          if (!confirm(msgParadas)) return;
          JX.acionarBotao(
            { IDIPROC: idiprocVal },
            { tipo: "JAVA", idBotao: ID_BOTAO_CONTINUAR_PRODUCAO }
          )
            .then(function (resultado) {
              if (resultado && resultado.mensagem) alert(resultado.mensagem);
              fecharOverlayDetalhe();
              atualizarTabela();
            })
            .catch(function (erro) {
              alert("Erro ao retomar produção: " + (erro.message || erro));
            });
          return;
        }

        if (filtroAtual === "Iniciadas") {
          var msgParar =
            "Deseja parar a produção da OP " +
            op.idiproc +
            "?\n\nProduto: " +
            op.codprodpa +
            " - " +
            (op.descprod || "");
          if (!confirm(msgParar)) return;
          var inputObs = document.getElementById("inputObservacaoParada");
          var observacao = (inputObs && inputObs.value) ? String(inputObs.value).trim() : "";
          var paramsParar = { IDIPROC: idiprocVal, OBSERVACAO: observacao };
          JX.acionarBotao(
            paramsParar,
            { tipo: "JAVA", idBotao: ID_BOTAO_PARAR_PRODUCAO }
          )
            .then(function (resultado) {
              if (resultado && resultado.mensagem) alert(resultado.mensagem);
              fecharOverlayDetalhe();
              atualizarTabela();
            })
            .catch(function (erro) {
              alert("Erro ao parar produção: " + (erro.message || erro));
            });
        }
      }
    </script>
  </body>
</html>
