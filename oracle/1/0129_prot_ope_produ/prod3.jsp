<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8"
pageEncoding="UTF-8"%> <%@ page import="java.util.*" %> <%@ taglib
uri="http://java.sun.com/jstl/core_rt" prefix="c" %> <%@ taglib prefix="snk"
uri="/WEB-INF/tld/sankhyaUtil.tld" %> <%@ taglib prefix="fmt"
uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sistema de Controle de Produção</title>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <style>
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
        --azul-claro: #dbeafe;
        --azul-escuro: #2563eb;
        --laranja-claro: #fed7aa;
        --laranja-escuro: #ea580c;
        --laranja-medio: #f97316;
        --laranja-hover: #c2410c;
        --sombra: 0 2px 8px rgba(20, 83, 45, 0.08);
        --sombra-overlay: 0 4px 20px rgba(0, 0, 0, 0.15);
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

      .tabela-op tr[data-clicavel="true"]:hover {
        background: var(--verde-claro);
        cursor: pointer;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(34, 197, 94, 0.1);
      }

      .tabela-op tr[data-clicavel="true"]:active {
        transform: translateY(0px);
      }

      .tabela-op td {
        color: var(--cinza-texto);
      }

      .tabela-op tr:last-child {
        border-bottom: none;
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

      /* Overlay para telas inferiores */
      .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(20, 83, 45, 0.85);
        backdrop-filter: blur(8px);
        z-index: 200;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .overlay-content {
        background: var(--branco);
        border-radius: 16px;
        box-shadow: var(--sombra-overlay);
        width: 100%;
        max-width: 700px;
        max-height: 90vh;
        overflow-y: auto;
        animation: overlayIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes overlayIn {
        from {
          transform: scale(0.9);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }

      .overlay-header {
        background: var(--verde-escuro);
        color: var(--branco);
        padding: 16px;
        border-radius: 16px 16px 0 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .overlay-title {
        font-size: 1.1rem;
        font-weight: 600;
      }

      .overlay-close {
        background: none;
        border: none;
        color: var(--branco);
        font-size: 1.5rem;
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: background 0.2s;
      }

      .overlay-close:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .overlay-body {
        padding: 12px;
      }

      /* Resumo da operação */
      .resumo {
        background: var(--cinza-fundo);
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 16px;
        border: 1px solid var(--cinza-borda);
      }

      .resumo-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }

      .resumo-icon {
        width: 32px;
        height: 32px;
        background: var(--verde-medio);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--branco);
        font-size: 1rem;
        font-weight: bold;
      }

      .resumo-titulo {
        flex: 1;
      }

      .resumo-codigo {
        font-size: 1rem;
        font-weight: 600;
        color: var(--verde-escuro);
        margin-bottom: 2px;
      }

      .resumo-descricao {
        font-size: 0.85rem;
        color: var(--cinza-texto);
        line-height: 1.2;
      }

      .resumo-detalhes {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .resumo-card {
        background: var(--branco);
        border-radius: 6px;
        padding: 8px;
        text-align: center;
        border: 1px solid var(--cinza-borda);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .resumo-card-label {
        font-size: 0.7rem;
        color: var(--verde-escuro);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin-bottom: 3px;
      }

      .resumo-card-valor {
        font-size: 0.9rem;
        color: var(--cinza-texto);
        font-weight: 500;
      }

      /* Controles do processo */
      .controles {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 10px;
        margin-bottom: 16px;
      }

      .controle-btn {
        padding: 10px 14px;
        border: none;
        border-radius: 10px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      }

      .btn-iniciar {
        background: var(--verde-medio);
        color: var(--branco);
      }

      .btn-parar {
        background: var(--amarelo);
        color: var(--verde-escuro);
      }

      .btn-continuar {
        background: var(--verde-hover);
        color: var(--branco);
      }

      .btn-finalizar {
        background: var(--vermelho);
        color: var(--branco);
      }

      .controle-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .controle-btn:active {
        transform: translateY(0px);
      }

      .controle-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      /* Abas */
      .abas {
        display: flex;
        border-radius: 10px 10px 0 0;
        overflow: hidden;
        margin-bottom: 0;
        box-shadow: var(--sombra);
      }

      .aba-btn {
        flex: 1;
        background: var(--verde-claro);
        color: var(--verde-escuro);
        border: none;
        padding: 12px 0;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .aba-btn:hover {
        background: var(--verde-medio);
        color: var(--branco);
      }

      .aba-btn.ativa {
        background: var(--verde-medio);
        color: var(--branco);
        box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
      }

      .conteudo-aba {
        display: none;
        min-height: 300px;
      }

      .conteudo-aba.ativa {
        display: block;
      }

      /* Estilos para a aba Detalhes */
      .detalhes-container {
        padding: 20px;
        background: var(--branco);
        border-radius: 12px;
        box-shadow: var(--sombra);
      }

      .detalhes-header {
        margin-bottom: 20px;
        text-align: center;
      }

      .detalhes-header h3 {
        color: var(--verde-escuro);
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0;
      }

      .detalhes-info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }

      .detalhes-item {
        background: var(--verde-claro);
        padding: 16px;
        border-radius: 8px;
        border: 1px solid var(--cinza-borda);
      }

      .detalhes-item-label {
        color: var(--verde-escuro);
        font-weight: 600;
        font-size: 0.9rem;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .detalhes-item-valor {
        color: var(--cinza-texto);
        font-size: 1.1rem;
        font-weight: 500;
      }

      /* Tabelas dentro do overlay */
      .tabela {
        width: 100%;
        border-collapse: collapse;
        background: var(--branco);
        border-radius: 0 0 12px 12px;
        overflow: hidden;
        box-shadow: var(--sombra);
        margin-bottom: 16px;
      }

      .tabela th,
      .tabela td {
        padding: 10px 8px;
        text-align: left;
        font-size: 0.9rem;
      }

      .tabela th {
        background: var(--verde-claro);
        color: var(--verde-escuro);
        font-weight: 600;
        border-bottom: 2px solid var(--cinza-borda);
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .tabela tr {
        border-bottom: 1px solid var(--cinza-tabela);
        transition: background 0.15s;
      }

      .tabela tr:nth-child(even) {
        background: rgba(246, 254, 249, 0.8);
      }

      .tabela tr:nth-child(odd) {
        background: var(--branco);
      }

      .tabela tr:last-child {
        border-bottom: none;
      }

      .tabela td {
        color: var(--cinza-texto);
      }

      /* Botões de ação */
      .acao-btn {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
        margin: 0 2px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .editar-btn {
        background: var(--verde-medio);
        color: var(--branco);
      }

      .editar-btn:hover {
        background: var(--verde-hover);
        transform: scale(1.05);
      }

      .excluir-btn {
        background: var(--vermelho);
        color: var(--branco);
      }

      .excluir-btn:hover {
        background: #dc2626;
        transform: scale(1.05);
      }

      .confirmar-btn {
        background: var(--amarelo);
        color: var(--verde-escuro);
      }

      .confirmar-btn:hover {
        background: #eab308;
        transform: scale(1.05);
      }

      .acao-btn:active {
        transform: scale(0.95);
      }

      /* Botão voltar */
      .btn-voltar {
        background: var(--verde-medio);
        color: var(--branco);
        border: none;
        border-radius: 12px;
        padding: 12px 24px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .btn-voltar:hover {
        background: var(--verde-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .btn-voltar:active {
        transform: translateY(0px);
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
        <button class="filtro-btn" data-situacao="Canceladas">
          Canceladas
        </button>
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
      </table>
      <div class="sem-registros" id="semRegistros" style="display: none">
        Nenhuma operação encontrada.
      </div>
    </main>

    <!-- Footer fixo -->
    <footer>Sistema de Controle de Produção &copy;</footer>

    <script>
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

          // Query baseada no arquivo query_aguardando_aceite.sql
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
                    TPRIPA.CODPRODPA,
                    TGFPRO.DESCRPROD,
                    TPRIPA.NROLOTE,
                    TPRIPA.QTDPRODUZIR,
                    TPRIATV.DHINCLUSAO AS DHINCLUSAO,
                    TPRIATV.AD_QUALIDADE AS AD_QUALIDADE,
                    TPRIATV.AD_REABERTA AS AD_REABERTA,
                    TPRIATV.CODEXEC AS CODEXEC,
                    TPRIATV.CODMTP AS CODMTP,
                    TPRIATV.CODPARCTERC AS CODPARCTERC,
                    TPRIATV.CODULTEXEC AS CODULTEXEC,
                    TPRIATV.CODUSU AS CODUSU,
                    TPRIATV.CODUSUFIN AS CODUSUFIN,
                    TPRIATV.CODWCP AS CODWCP,
                    TPRIATV.DHACEITE AS DHACEITE,
                    TPRIATV.DHFINAL AS DHFINAL,
                    TPRIATV.DHFINPREV AS DHFINPREV,
                    TPRIATV.DHINICIO AS DHINICIO,
                    TPRIATV.DHINIPREV AS DHINIPREV,
                    TPRIATV.IDEFX AS IDEFX,
                    TPRIATV.IDEXECWFLOW AS IDEXECWFLOW,
                    TPRIATV.IDIATV AS IDIATV,
                    TPRIATV.TEMPOGASTOMIN AS TEMPOGASTOMIN
                FROM 
                    TPRIATV
                    LEFT JOIN TPRIPA ON TPRIATV.IDIPROC = TPRIPA.IDIPROC
                    LEFT JOIN TGFPRO ON TPRIPA.CODPRODPA = TGFPRO.CODPROD
                    LEFT JOIN TPRATV R2_Atividade ON TPRIATV.IDEFX = R2_Atividade.IDEFX
                    LEFT JOIN TPREFX R0_ElementoFluxo ON R2_Atividade.IDEFX = R0_ElementoFluxo.IDEFX
                    LEFT JOIN TPRIPROC R1_CabecalhoInstanciaProcesso ON TPRIATV.IDIPROC = R1_CabecalhoInstanciaProcesso.IDIPROC
                WHERE 
                    R0_ElementoFluxo.TIPO IN (1101, 1109, 1110)
                    AND R1_CabecalhoInstanciaProcesso.STATUSPROC NOT IN ('C', 'S', 'AP', 'P', 'P2')
                    AND (TPRIATV.CODEXEC IS NULL AND TPRIATV.DHACEITE IS NULL)
            )
            ORDER BY IDIPROC
          `;

          // Executar query usando SankhyaJX
          const resultado = await JX.consultar(sql);

          if (resultado && resultado.length > 0) {
            // Transformar dados do banco para o formato esperado
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

          // Query baseada no arquivo query_iniciado.sql
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
                    TPRIPA.CODPRODPA,
                    TGFPRO.DESCRPROD,
                    TPRIPA.NROLOTE,
                    TPRIATV.DHINICIO AS DHINICIO,
                    TPRIPA.QTDPRODUZIR,
                    TPRIATV.AD_QUALIDADE AS AD_QUALIDADE,
                    TPRIATV.AD_REABERTA AS AD_REABERTA,
                    TPRIATV.CODEXEC AS CODEXEC,
                    TPRIATV.CODMTP AS CODMTP,
                    TPRIATV.CODPARCTERC AS CODPARCTERC,
                    TPRIATV.CODULTEXEC AS CODULTEXEC,
                    TPRIATV.CODUSU AS CODUSU,
                    TPRIATV.CODUSUFIN AS CODUSUFIN,
                    TPRIATV.CODWCP AS CODWCP,
                    TPRIATV.DHACEITE AS DHACEITE,
                    TPRIATV.DHFINAL AS DHFINAL,
                    TPRIATV.DHFINPREV AS DHFINPREV,
                    TPRIATV.DHINCLUSAO AS DHINCLUSAO,
                    TPRIATV.DHINIPREV AS DHINIPREV,
                    TPRIATV.IDEFX AS IDEFX,
                    TPRIATV.IDEXECWFLOW AS IDEXECWFLOW,
                    TPRIATV.IDIATV AS IDIATV,
                    TPRIATV.TEMPOGASTOMIN AS TEMPOGASTOMIN,
                    Atividade.OPERCQ AS l0_OPERCQ,
                    Atividade.SUBAPOPORCONF AS l0_SUBAPOPORCONF,
                    Atividade.IDRPADEST AS l0_IDRPADEST,
                    Atividade.DATAHORAAPONTAMENTO AS l0_DATAHORAAPONTAMENTO,
                    Atividade.IDRPAOPER AS l0_IDRPAOPER,
                    Atividade.PERMITEPARCIAL AS l0_PERMITEPARCIAL,
                    Atividade.APONTAMP AS l0_APONTAMP,
                    Atividade.APONTAPA AS l0_APONTAPA,
                    Atividade.APONTASP AS l0_APONTASP,
                    Atividade.LIBERARWCFINAL AS l0_LIBERARWCFINAL,
                    Atividade.LIBERARWCMANUAL AS l0_LIBERARWCMANUAL,
                    Atividade.IDCCQ AS l0_IDCCQ,
                    Atividade.IDPROC AS l0_IDPROC,
                    Atividade.CONTCUMULATIVA AS l0_CONTCUMULATIVA,
                    Atividade.QTDCONFIGUAIS AS l0_QTDCONFIGUAIS,
                    Atividade.QTDRECONTAGENS AS l0_QTDRECONTAGENS,
                    Atividade.SEPSEQCODBAR AS l0_SEPSEQCODBAR,
                    Atividade.APONTARECWC AS l0_APONTARECWC,
                    Atividade.MULTITURNO AS l0_MULTITURNO,
                    Atividade.CODMTPFINTURNO AS l0_CODMTPFINTURNO,
                    AlocacaoWorkCenterProcesso1_1.TIPALOCACAO AS l1_TIPALOCACAO,
                    CategoriaWorkCenter2_2.CODWCPPADRAO AS l2_CODWCPPADRAO,
                    ElementoFluxo3_1.TIPO AS l3_TIPO,
                    ElementoFluxo3_1.DESCRICAO AS l3_DESCRICAO,
                    MotivosParada4_1.DESCRICAO AS l4_DESCRICAO,
                    RepositorioPADestino5_1.DESCRICAO AS l5_DESCRICAO,
                    RepositorioPAOrigem6_1.DESCRICAO AS l6_DESCRICAO,
                    ProcessoProdutivo7_1.IDPROC AS l7_IDPROC,
                    ProcessoProdutivo7_1.CODPRC AS l7_CODPRC,
                    ProcessoProdutivo7_1.DESCRABREV AS l7_DESCRABREV,
                    ProcessoProdutivo7_1.VERSAO AS l7_VERSAO,
                    ProcessoProdutivo7_1.CODPLP AS l7_CODPLP,
                    ProcessoProdutivo7_1.PROCDESMONTE AS l7_PROCDESMONTE,
                    ProcessoProdutivo7_1.USATERCEIRO AS l7_USATERCEIRO,
                    ProcessoProdutivo7_1.DEFTERCEIRO AS l7_DEFTERCEIRO,
                    Executante.NOMEUSU AS l8_NOMEUSU,
                    HistoricoWorkCenterAtividade.DHLIBALOC AS l9_DHLIBALOC,
                    MotivosParada.DESCRICAO AS l10_DESCRICAO,
                    Parceiro.NOMEPARC AS l11_NOMEPARC,
                    UltimoExecutante.NOMEUSU AS l12_NOMEUSU,
                    Usuario.NOMEUSU AS l13_NOMEUSU,
                    UsuarioFinal.NOMEUSU AS l14_NOMEUSU,
                    WorkCenter.NOME AS l15_NOME,
                    WorkCenter.CODCWC AS l15_CODCWC,
                    WorkCenter.CODPLP AS l15_CODPLP,
                    WorkCenter.OPERACAO AS l15_OPERACAO
                FROM 
                    TPRIATV
                    LEFT JOIN TPRIPA ON TPRIATV.IDIPROC = TPRIPA.IDIPROC
                    LEFT JOIN TGFPRO ON TPRIPA.CODPRODPA = TGFPRO.CODPROD
                    LEFT JOIN (
                        SELECT 
                            IDRPADEST, SUBAPOPORCONF, QTDRECONTAGENS, IDPROC, DATAHORAAPONTAMENTO,
                            OPERCQ, SEPSEQCODBAR, APONTAPA, CONTCUMULATIVA, PERMITEPARCIAL, IDCCQ,
                            CODMTPFINTURNO, LIBERARWCMANUAL, IDAWC, MULTITURNO, IDEFX, APONTASP,
                            APONTARECWC, IDRPAOPER, LIBERARWCFINAL, APONTAMP, QTDCONFIGUAIS
                        FROM TPRATV
                    ) Atividade
                        ON TPRIATV.IDEFX = Atividade.IDEFX
                    LEFT JOIN (
                        SELECT IDPROC, IDAWC, TIPALOCACAO, CODCWC
                        FROM TPRAWC
                    ) AlocacaoWorkCenterProcesso1_1
                        ON Atividade.IDPROC = AlocacaoWorkCenterProcesso1_1.IDPROC
                        AND Atividade.IDAWC = AlocacaoWorkCenterProcesso1_1.IDAWC
                    LEFT JOIN (
                        SELECT CODWCPPADRAO, CODCWC
                        FROM TPRCWC
                    ) CategoriaWorkCenter2_2
                        ON AlocacaoWorkCenterProcesso1_1.CODCWC = CategoriaWorkCenter2_2.CODCWC
                    LEFT JOIN (
                        SELECT TIPO, DESCRICAO, IDEFX
                        FROM TPREFX
                    ) ElementoFluxo3_1
                        ON Atividade.IDEFX = ElementoFluxo3_1.IDEFX
                    LEFT JOIN (
                        SELECT DESCRICAO, CODMTP
                        FROM TPRMTP
                    ) MotivosParada4_1
                        ON Atividade.CODMTPFINTURNO = MotivosParada4_1.CODMTP
                    LEFT JOIN (
                        SELECT DESCRICAO, IDRPA
                        FROM TPRRPA
                    ) RepositorioPADestino5_1
                        ON Atividade.IDRPADEST = RepositorioPADestino5_1.IDRPA
                    LEFT JOIN (
                        SELECT DESCRICAO, IDRPA
                        FROM TPRRPA
                    ) RepositorioPAOrigem6_1
                        ON Atividade.IDRPAOPER = RepositorioPAOrigem6_1.IDRPA
                    LEFT JOIN (
                        SELECT IDPROC, IDIPROC
                        FROM TPRIPROC
                    ) CabecalhoInstanciaProcesso
                        ON TPRIATV.IDIPROC = CabecalhoInstanciaProcesso.IDIPROC
                    LEFT JOIN (
                        SELECT CODPLP, IDPROC, DESCRABREV, CODPRC, DEFTERCEIRO, PROCDESMONTE, USATERCEIRO, VERSAO
                        FROM TPRPRC
                    ) ProcessoProdutivo7_1
                        ON CabecalhoInstanciaProcesso.IDPROC = ProcessoProdutivo7_1.IDPROC
                    LEFT JOIN (
                        SELECT CODUSU, NOMEUSU
                        FROM TSIUSU
                    ) Executante
                        ON TPRIATV.CODEXEC = Executante.CODUSU
                    LEFT JOIN (
                        SELECT X.CODWCP, X.IDIATV, X.DHALOC, X.IDIPROC, X.DHLIBALOC
                        FROM TPRHWXA X
                        WHERE X.DHALOC = (
                            SELECT MAX(Y.DHALOC)
                            FROM TPRHWXA Y
                            WHERE Y.CODWCP = X.CODWCP
                            AND Y.IDIPROC = X.IDIPROC
                            AND Y.IDIATV = X.IDIATV
                            AND Y.DHALOC = (
                                SELECT MAX(HWXA.DHALOC)
                                FROM TPRHWXA HWXA
                                WHERE HWXA.CODWCP = Y.CODWCP
                                AND HWXA.IDIPROC = Y.IDIPROC
                                AND HWXA.IDIATV = Y.IDIATV
                            )
                        )
                    ) HistoricoWorkCenterAtividade
                        ON TPRIATV.IDIATV = HistoricoWorkCenterAtividade.IDIATV
                        AND TPRIATV.IDIPROC = HistoricoWorkCenterAtividade.IDIPROC
                        AND TPRIATV.CODWCP = HistoricoWorkCenterAtividade.CODWCP
                    LEFT JOIN (
                        SELECT DESCRICAO, CODMTP
                        FROM TPRMTP
                    ) MotivosParada
                        ON TPRIATV.CODMTP = MotivosParada.CODMTP
                    LEFT JOIN (
                        SELECT NOMEPARC, CODPARC
                        FROM TGFPAR
                    ) Parceiro
                        ON TPRIATV.CODPARCTERC = Parceiro.CODPARC
                    LEFT JOIN (
                        SELECT CODUSU, NOMEUSU
                        FROM TSIUSU
                    ) UltimoExecutante
                        ON TPRIATV.CODULTEXEC = UltimoExecutante.CODUSU
                    LEFT JOIN (
                        SELECT CODUSU, NOMEUSU
                        FROM TSIUSU
                    ) Usuario
                        ON TPRIATV.CODUSU = Usuario.CODUSU
                    LEFT JOIN (
                        SELECT CODUSU, NOMEUSU
                        FROM TSIUSU
                    ) UsuarioFinal
                        ON TPRIATV.CODUSUFIN = UsuarioFinal.CODUSU
                    LEFT JOIN (
                        SELECT OPERACAO, CODWCP, CODPLP, CODCWC, NOME
                        FROM TPRWCP
                    ) WorkCenter
                        ON TPRIATV.CODWCP = WorkCenter.CODWCP,
                    TPRATV R2_Atividade,
                    TPREFX R0_ElementoFluxo,
                    TPRIPROC R1_CabecalhoInstanciaProcesso
                WHERE
                    (
                        R2_Atividade.IDEFX = R0_ElementoFluxo.IDEFX
                        AND TPRIATV.IDIPROC = R1_CabecalhoInstanciaProcesso.IDIPROC
                        AND TPRIATV.IDEFX = R2_Atividade.IDEFX
                        AND (
                            R0_ElementoFluxo.TIPO IN (1101, 1109, 1110)
                            AND R1_CabecalhoInstanciaProcesso.STATUSPROC NOT IN ('C', 'S', 'AP', 'P', 'P2')
                            AND (
                                TPRIATV.DHINICIO IS NOT NULL
                                AND TPRIATV.DHFINAL IS NULL
                                AND NOT EXISTS (
                                    SELECT 1
                                    FROM TPREIATV EIATV
                                    WHERE EIATV.IDIATV = TPRIATV.IDIATV
                                    AND EIATV.TIPO = 'P'
                                    AND EIATV.DHFINAL IS NULL
                                )
                            )
                        )
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
        if (!tbody) return;

        tbody.innerHTML = "";

        // Filtrar operações pela situação
        const filtradas = operacoes.filter((op) => op.situacao === filtroAtual);

        if (filtradas.length === 0) {
          if (semRegistros) {
            semRegistros.style.display = "block";
          }
          return;
        } else {
          if (semRegistros) {
            semRegistros.style.display = "none";
          }
        }

        filtradas.forEach((op) => {
          // Apenas aguardando aceite são clicáveis
          const clicavel = op.situacao === "Agd. Aceite";
          const tr = document.createElement("tr");
          tr.setAttribute("data-clicavel", clicavel);

          if (clicavel) {
            tr.tabIndex = 0;
            tr.setAttribute("role", "button");
            tr.setAttribute(
              "aria-label",
              `Ver detalhes da operação ${op.idiproc}`
            );
            tr.addEventListener("click", () => abrirDetalhes(op));
            tr.addEventListener("keypress", (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                abrirDetalhes(op);
              }
            });
          }

          tr.innerHTML = `
          <td>${op.idiproc}</td>
          <td>${formatarData(op.dtfab)}</td>
          <td>${op.codprodpa} - ${op.descprod || ""}</td>
          <td>${op.qtdproduzir}</td>
          <td>${op.nrolote}</td>
        `;
          tbody.appendChild(tr);
        });
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

      // Função para abrir detalhes no overlay (simplificada)
      function abrirDetalhes(op) {
        alert(
          "Detalhes da OP " +
            op.idiproc +
            "\nProduto: " +
            op.codprodpa +
            " - " +
            op.descprod
        );
        // Aqui você pode implementar a abertura do overlay completo do index1.html se necessário
      }
    </script>
  </body>
</html>
