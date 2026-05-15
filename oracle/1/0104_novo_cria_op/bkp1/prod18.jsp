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
      // Botão "Parar a produção" (guia Iniciadas): cadastre no Sankhya e use o ID aqui.
      const ID_BOTAO_PARAR_PRODUCAO = 300;

      // Estado global
      let filtroAtual = "Agd. Aceite";
      let operacoes = [];

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
                TO_CHAR(DHINICIO, 'DD/MM/YYYY') AS DTFAB,
                CODPRODPA,
                DESCRPROD,
                NROLOTE,
                QTDPRODUZIR
            FROM (
                SELECT 
                    TPRIATV.IDIPROC AS IDIPROC,
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
            // Transformar dados do banco para o formato esperado
            operacoes = resultado.map((item) => ({
              idiproc: item.IDIPROC || item.idiproc,
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
                TO_CHAR(DHINICIO, 'DD/MM/YYYY') AS DTFAB,
                CODPRODPA,
                DESCRPROD,
                NROLOTE,
                QTDPRODUZIR
            FROM (
                SELECT 
                    TPRIATV.IDIPROC AS IDIPROC,
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
            // Transformar dados do banco para o formato esperado
            operacoes = resultado.map((item) => ({
              idiproc: item.IDIPROC || item.idiproc,
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

      // Abre o overlay com todos os detalhes do registro (mobile first)
      function abrirOverlayDetalhe(op) {
        opOverlay = op;
        var overlay = document.getElementById("overlayDetalhe");
        var body = document.getElementById("overlayBody");
        var btnAcao = document.getElementById("overlayBtnAcao");
        if (!overlay || !body || !btnAcao) return;

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
          "</span></div>";

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
          JX.acionarBotao(
            { IDIPROC: idiprocVal },
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
