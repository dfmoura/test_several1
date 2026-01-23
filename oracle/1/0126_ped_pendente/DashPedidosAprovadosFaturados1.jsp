<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dash Pedidos Aprovados e Faturados</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <style>
      :root {
        --brand-1: #008a70;
        --brand-2: #00afa0;
        --brand-3: #0f172a;
        --soft: #f4f6f8;
        --card: #ffffff;
        --muted: #6e6e6e;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        color: #1f2937;
        padding-top: 40px;
        min-height: 100vh;
      }
      .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--brand-1), #00695e);
        box-shadow: 0 4px 20px rgba(0, 138, 112, 0.3);
        z-index: 1000;
        padding: 0 16px;
      }
      .header-logo {
        position: absolute;
        left: 16px;
        display: flex;
        align-items: center;
      }
      .header-logo img {
        width: 24px;
        height: auto;
        filter: brightness(0) invert(1);
        transition: transform 0.3s ease;
      }
      .header-logo img:hover {
        transform: scale(1.05);
      }
      .fixed-header .header-title {
        color: #fff;
        font-weight: 700;
        letter-spacing: 0.5px;
        font-size: 0.95rem;
        margin: 0;
      }
      .main-container {
        padding: 12px 16px 24px 16px;
      }
      .page-hero {
        background: linear-gradient(135deg, rgba(0, 138, 112, 0.12), rgba(0, 175, 160, 0.1));
        border: 1px solid rgba(0, 138, 112, 0.12);
        border-radius: 12px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        box-shadow: 0 2px 12px rgba(0, 138, 112, 0.08);
        margin-bottom: 10px;
      }
      .hero-text h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--brand-1);
      }
      .hero-text .subtitle {
        margin: 4px 0 0 0;
        color: var(--muted);
        font-size: 0.9rem;
      }
      .pill {
        background: #fff;
        color: var(--brand-1);
        padding: 6px 10px;
        border-radius: 999px;
        font-weight: 600;
        border: 1px solid rgba(0, 138, 112, 0.18);
        box-shadow: 0 1px 8px rgba(0, 138, 112, 0.06);
        white-space: nowrap;
      }
      .filters-bar {
        background: #fff;
        border: 1px solid rgba(0, 138, 112, 0.12);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        box-shadow: 0 2px 12px rgba(0, 138, 112, 0.08);
        margin-bottom: 14px;
      }
      .filters-bar label {
        font-size: 0.85rem;
        color: var(--muted);
        font-weight: 600;
      }
      .filters-bar input {
        padding: 6px 10px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 0.9rem;
        width: 140px;
      }
      .filters-bar input:focus {
        outline: none;
        border-color: var(--brand-2);
        box-shadow: 0 0 0 2px rgba(0, 175, 160, 0.12);
      }
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 12px;
        margin-bottom: 14px;
      }
      .summary-card {
        background: var(--card);
        border-radius: 10px;
        padding: 16px;
        box-shadow: 0 2px 12px rgba(0, 138, 112, 0.08);
        border: 1px solid rgba(0, 138, 112, 0.08);
        transition: all 0.2s ease;
        cursor: pointer;
      }
      .summary-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 18px rgba(0, 138, 112, 0.12);
      }
      .summary-card.active {
        border-color: var(--brand-2);
        box-shadow: 0 4px 16px rgba(0, 175, 160, 0.2);
      }
      .summary-card .label {
        color: var(--muted);
        font-weight: 600;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .summary-card .value {
        margin: 0;
        font-size: 1.8rem;
        font-weight: 800;
        color: var(--brand-1);
      }
      .summary-card .subtitle {
        margin: 8px 0 0 0;
        color: var(--muted);
        font-size: 0.8rem;
      }
      .faturados-subcards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
        margin-top: 12px;
      }
      .subcard {
        background: linear-gradient(135deg, rgba(0, 138, 112, 0.05), rgba(0, 175, 160, 0.03));
        border: 1px solid rgba(0, 138, 112, 0.15);
        border-radius: 8px;
        padding: 12px;
        transition: all 0.2s ease;
        cursor: pointer;
      }
      .subcard:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 138, 112, 0.1);
      }
      .subcard.active {
        border-color: var(--brand-2);
        background: linear-gradient(135deg, rgba(0, 138, 112, 0.12), rgba(0, 175, 160, 0.08));
      }
      .subcard .label {
        color: var(--muted);
        font-weight: 600;
        font-size: 0.8rem;
        margin-bottom: 6px;
      }
      .subcard .value {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--brand-1);
        margin: 0;
      }
      .panel {
        background: var(--card);
        border-radius: 10px;
        padding: 12px;
        box-shadow: 0 2px 12px rgba(0, 138, 112, 0.08);
        border: 1px solid rgba(0, 138, 112, 0.08);
      }
      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
      }
      .panel-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 800;
        color: #0f172a;
      }
      .panel-subtitle {
        color: var(--muted);
        font-size: 0.85rem;
        margin: 4px 0 0 0;
      }
      .table-wrapper {
        overflow: auto;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 960px;
      }
      thead {
        background: #f8fafc;
      }
      th,
      td {
        padding: 10px 12px;
        font-size: 0.9rem;
        text-align: left;
        border-bottom: 1px solid #eef2f7;
      }
      th {
        font-weight: 700;
        color: #0f172a;
      }
      td {
        color: #374151;
      }
      .status-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 999px;
        font-weight: 700;
        font-size: 0.8rem;
        color: #0f172a;
        background: #f1f5f9;
      }
      .muted {
        color: var(--muted);
      }
      .loading-overlay {
        position: fixed;
        inset: 0;
        background: rgba(255, 255, 255, 0.92);
        display: none;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        z-index: 1200;
        backdrop-filter: blur(5px);
      }
      .spinner {
        width: 42px;
        height: 42px;
        border: 3px solid #e5e7eb;
        border-top: 3px solid var(--brand-1);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 6px;
        font-weight: 600;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .btn-primary {
        background: linear-gradient(135deg, var(--brand-2), var(--brand-1));
        color: #fff;
        border-color: transparent;
        box-shadow: 0 6px 16px rgba(0, 138, 112, 0.18);
      }
      .btn-ghost {
        background: #fff;
        color: var(--brand-1);
        border: 1px solid rgba(0, 138, 112, 0.16);
      }
      .btn:hover {
        transform: translateY(-1px);
      }
      @media (max-width: 768px) {
        .page-hero {
          flex-direction: column;
          align-items: flex-start;
        }
        .summary-cards {
          grid-template-columns: 1fr;
        }
        .faturados-subcards {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="fixed-header">
      <div class="header-logo">
        <a href="https://neuon.com.br/" target="_blank" rel="noopener noreferrer">
          <img src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg" alt="Neuon Logo" />
        </a>
      </div>
      <p class="header-title"><i class="fa-solid fa-chart-line"></i>&nbsp; Dashboard &bull; Pedidos Aprovados e Faturados</p>
    </div>
    <div class="loading-overlay" id="loadingOverlay">
      <div class="spinner"></div>
      <p class="muted" style="margin-top: 10px; font-weight: 600;">Carregando dados...</p>
    </div>
    <main class="main-container">
      <section class="page-hero">
        <div class="hero-text">
          <p class="muted" style="margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Visão gerencial</p>
          <h1>Pedidos Aprovados e Faturados</h1>
          <p class="subtitle">Análise de pedidos aprovados e faturados com tempo de processamento</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <span class="pill" id="pillPeriodo">Período: todos</span>
          <span class="pill" id="pillAtualizacao">Atualizado agora</span>
        </div>
      </section>

      <section class="filters-bar">
        <label for="dataInicio">Data início (dd/mm/aaaa)</label>
        <input type="text" id="dataInicio" placeholder="dd/mm/aaaa" />
        <label for="dataFim">Data fim (dd/mm/aaaa)</label>
        <input type="text" id="dataFim" placeholder="dd/mm/aaaa" />
        <button class="btn btn-primary" id="btnAplicarPeriodo">
          <i class="fa-regular fa-calendar-check"></i> Aplicar período
        </button>
        <button class="btn btn-ghost" id="btnLimparPeriodo">
          <i class="fa-regular fa-circle-xmark"></i> Limpar período
        </button>
      </section>

      <section class="summary-cards">
        <div class="summary-card" id="cardAprovados" data-type="aprovados">
          <div class="label"><i class="fa-solid fa-check-circle"></i> Pedidos Aprovados</div>
          <div class="value" id="cardAprovadosQtd">--</div>
          <p class="subtitle" id="cardAprovadosHint">Total de pedidos aprovados</p>
        </div>
        <div class="summary-card" id="cardFaturados" data-type="faturados">
          <div class="label"><i class="fa-solid fa-file-invoice-dollar"></i> Pedidos Faturados</div>
          <div class="value" id="cardFaturadosQtd">--</div>
          <p class="subtitle" id="cardFaturadosHint">Total de pedidos faturados</p>
          <div class="faturados-subcards" id="subcardsFaturados">
            <div class="subcard" id="subcard4h" data-filter="4h">
              <div class="label">Até 4 horas</div>
              <div class="value" id="subcard4hQtd">--</div>
            </div>
            <div class="subcard" id="subcard7h" data-filter="7h">
              <div class="label">Entre 4h e 7h</div>
              <div class="value" id="subcard7hQtd">--</div>
            </div>
            <div class="subcard" id="subcard24h" data-filter="24h">
              <div class="label">Acima de 24h</div>
              <div class="value" id="subcard24hQtd">--</div>
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Detalhamento</h3>
            <p class="panel-subtitle" id="tableCaption">Clique em um card para filtrar os dados</p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="pill" id="activeFilter">Filtro: todos</span>
            <button class="btn btn-ghost" id="btnExportar">
              <i class="fa-regular fa-file-excel"></i> Exportar Excel
            </button>
            <button class="btn btn-primary" id="btnRefresh">
              <i class="fa-solid fa-arrows-rotate"></i> Atualizar
            </button>
          </div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Data Movimento</th>
                <th>Data Negociação</th>
                <th>Data Faturamento</th>
                <th>Vendedor</th>
                <th>Parceiro</th>
                <th style="text-align: right;">Horas Úteis</th>
                <th>Faixa</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              <tr>
                <td colspan="8" class="muted" style="text-align: center; padding: 24px;">Carregando...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <script>
      let rawDataAprovados = [];
      let rawDataFaturados = [];
      let selectedFilter = null;
      let dateStart = null;
      let dateEnd = null;
      let dateEndLimit = null;

      function formatNumber(value) {
        return Number(value || 0).toLocaleString("pt-BR");
      }

      function showLoading(show = true) {
        const overlay = document.getElementById("loadingOverlay");
        overlay.style.display = show ? "flex" : "none";
      }

      function parseBrDateOnly(str) {
        if (!str) return null;
        if (str instanceof Date) return str;
        if (typeof str !== "string") return null;
        const trimmed = str.trim();
        // DD/MM/YYYY
        const dmy = trimmed.includes("/") ? trimmed.split("/") : null;
        if (dmy && dmy.length === 3) {
          const [dd, mm, yyyy] = dmy.map((p) => parseInt(p, 10));
          if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) {
            return new Date(yyyy, mm - 1, dd, 0, 0, 0);
          }
        }
        // DDMMYYYY
        const compact = /^(\d{2})(\d{2})(\d{4})$/.exec(trimmed);
        if (compact) {
          const dd = parseInt(compact[1], 10);
          const mm = parseInt(compact[2], 10);
          const yyyy = parseInt(compact[3], 10);
          return new Date(yyyy, mm - 1, dd, 0, 0, 0);
        }
        // YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          const [yyyy, mm, dd] = trimmed.split("-").map((p) => parseInt(p, 10));
          return new Date(yyyy, mm - 1, dd, 0, 0, 0);
        }
        return null;
      }

      function formatDateBr(value) {
        if (!value) return "-";
        const dt = parseBrDateOnly(value);
        if (!dt || isNaN(dt.getTime())) {
          // Tentar como datetime
          const dt2 = new Date(value);
          if (!isNaN(dt2.getTime())) {
            return dt2.toLocaleDateString("pt-BR") + " " + dt2.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          }
          return value;
        }
        return dt.toLocaleDateString("pt-BR");
      }

      function formatDateForSQL(date) {
        if (!date) return null;
        const d = date instanceof Date ? date : parseBrDateOnly(date);
        if (!d || isNaN(d.getTime())) return null;
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      }

      function applyDateFilter() {
        const startStr = document.getElementById("dataInicio").value;
        const endStr = document.getElementById("dataFim").value;
        dateStart = parseBrDateOnly(startStr);
        dateEnd = parseBrDateOnly(endStr);
        dateEndLimit = dateEnd ? new Date(dateEnd.getFullYear(), dateEnd.getMonth(), dateEnd.getDate(), 23, 59, 59, 999) : null;

        if (dateStart && dateEnd && dateStart > dateEndLimit) {
          alert("Data início não pode ser maior que data fim.");
          return;
        }

        const periodoLabel =
          dateStart || dateEnd
            ? `Período: ${dateStart ? formatDateBr(dateStart) : "..."} a ${dateEnd ? formatDateBr(dateEnd) : "..."}`
            : "Período: todos";
        document.getElementById("pillPeriodo").textContent = periodoLabel;

        carregarDados();
      }

      function clearDateFilter() {
        document.getElementById("dataInicio").value = "";
        document.getElementById("dataFim").value = "";
        dateStart = null;
        dateEnd = null;
        dateEndLimit = null;
        document.getElementById("pillPeriodo").textContent = "Período: todos";
        carregarDados();
      }

      async function carregarDados() {
        try {
          showLoading(true);
          if (typeof JX === "undefined" || !JX.consultar) {
            rawDataAprovados = [];
            rawDataFaturados = [];
            document.getElementById("tableBody").innerHTML =
              '<tr><td colspan="8" class="muted" style="text-align:center; padding:24px;">Conector JX indisponível.</td></tr>';
            renderResumo();
            return;
          }

          // Construir filtro de data dinâmico
          let dateFilter = "";
          if (dateStart && dateEnd) {
            const startStr = formatDateForSQL(dateStart);
            const endStr = formatDateForSQL(dateEnd);
            dateFilter = `WHERE DTMOV BETWEEN '${startStr}' AND '${endStr}'`;
          } else if (dateStart) {
            const startStr = formatDateForSQL(dateStart);
            dateFilter = `WHERE DTMOV >= '${startStr}'`;
          } else if (dateEnd) {
            const endStr = formatDateForSQL(dateEnd);
            dateFilter = `WHERE DTMOV <= '${endStr}'`;
          }

          // Query para pedidos aprovados (query3.sql) com filtro dinâmico
          const sqlAprovados = `
            SELECT DISTINCT 
              NUNOTA,
              DTMOV,
              DTNEG,
              DTFATUR,
              CODVEND,
              APELIDO,
              CODPARC,
              NOMEPARC
            FROM (
              SELECT
                CAB.DTMOV,
                CAB.DTNEG,
                CAB.DTFATUR,
                CAB.NUNOTA,
                CAB.NUMNOTA,
                CAB.NUNOTA || ' / ' || CAB.NUMNOTA AS NRO,
                CAB.CODEMP,
                CAB.AD_OBSINTERNA,
                EMP.RAZAOSOCIAL AS EMPRESA,
                EMP.CODEMP || '-' || EMP.RAZAOSOCIAL AS EMP,
                EMP.CODEMP || '-' || EMP.RAZAOABREV AS NOMEFANTASIAEMP,
                EMP.CGC AS CPFCNPJ,
                EMP.INSCESTAD AS IE,
                EMP.TELEFONE AS TEL,
                EMP.FAX AS FAX,
                CAB.CODVEND,
                VEN.APELIDO,
                CAB.CODVEND || ' - ' || VEN.APELIDO AS VEND,
                VEN.CODGER,
                CAB.CODPARC,
                PAR.RAZAOSOCIAL AS PARCEIRO,
                CAB.CODPARC || ' - ' || PAR.NOMEPARC AS PARC,
                PAR.NOMEPARC,
                UFS.UF || ' - ' || UFS.DESCRICAO AS UF,
                ITE.CODPROD || ' - ' || PRO.DESCRPROD AS PROD,
                ITE.CODPROD AS CODPROD,
                PRO.DESCRPROD AS DESCRPROD,
                MAR.DESCRICAO AS MARCA,
                CASE
                  WHEN MAR.DESCRICAO IS NULL THEN 'MARCA NÃO CADASTRADA'
                  ELSE MAR.DESCRICAO
                END AS MARCA1,
                GRU.CODGRUPOPROD,
                GRU.DESCRGRUPOPROD,
                ITE.CODVOL AS VOL,
                CAB.CODTIPOPER,
                CAB.CODTIPOPER || '-' || TOP.DESCROPER AS TOP,
                TOP.DESCROPER,
                TOP.ATUALEST,
                TOP.ATUALFIN,
                TOP.TIPATUALFIN,
                CAB.STATUSNFE,
                CAB.TIPMOV,
                TOP.BONIFICACAO,
                CAB.CODCENCUS,
                CUS.AD_APELIDO,
                CUS.DESCRCENCUS,
                PRO.AD_QTDVOLLT,
                CASE
                  WHEN CAB.TIPMOV = 'D' THEN (ITE.QTDNEG * PRO.AD_QTDVOLLT) * -1
                  ELSE (ITE.QTDNEG * PRO.AD_QTDVOLLT)
                END AS QTD,
                CASE
                  WHEN CAB.TIPMOV = 'D'
                    THEN (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRREPRED) * -1
                  ELSE (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRREPRED)
                END AS VLR,
                CASE
                  WHEN CAB.TIPMOV = 'D'
                    THEN (CUS1.CUSSEMICM * (ITE.QTDNEG * PRO.AD_QTDVOLLT)) * -1
                  ELSE (CUS1.CUSSEMICM * (ITE.QTDNEG * PRO.AD_QTDVOLLT))
                END AS VLRCUSICM1,
                CASE
                  WHEN CAB.TIPMOV = 'D'
                    THEN (CUS1.CUSGER * (ITE.QTDNEG * PRO.AD_QTDVOLLT)) * -1
                  ELSE (CUS1.CUSGER * (ITE.QTDNEG * PRO.AD_QTDVOLLT))
                END AS VLRCUSGER1,
                CASE
                  WHEN CAB.TIPMOV = 'D' THEN (CUS1.CUSSEMICM * ITE.QTDNEG) * -1
                  ELSE (CUS1.CUSSEMICM * ITE.QTDNEG)
                END AS VLRCUSICM2,
                CASE
                  WHEN CAB.TIPMOV = 'D' THEN (CUS1.CUSGER * ITE.QTDNEG) * -1
                  ELSE (CUS1.CUSGER * ITE.QTDNEG)
                END AS VLRCUSGER2,
                (ITE.VLRUNIT - (ITE.VLRDESC / NULLIF(ITE.QTDNEG, 0)) - (ITE.VLRREPRED/NULLIF(ITE.QTDNEG, 0))) AS VLRUNIT_LIQ,
                CASE 
                  WHEN NVL(SNK_PRECO(PAR.CODTAB, PRO.CODPROD), 0) = 0
                    THEN SNK_PRECO(0, PRO.CODPROD) 
                  ELSE SNK_PRECO(PAR.CODTAB, PRO.CODPROD)
                END AS PRECO_TAB,
                ITE.VLRICMS,
                ITE.QTDNEG AS QTDNEG,
                ITE.SEQUENCIA,
                ITE.VLRUNIT
              FROM TSIEMP EMP
              INNER JOIN TGFCAB CAB ON (EMP.CODEMP = CAB.CODEMP)
              LEFT JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
              INNER JOIN TGFPAR PAR ON (CAB.CODPARC = PAR.CODPARC)
              INNER JOIN TSICID CID ON (PAR.CODCID = CID.CODCID)
              INNER JOIN TSIUFS UFS ON (CID.UF = UFS.CODUF)
              INNER JOIN TGFITE ITE ON (CAB.NUNOTA = ITE.NUNOTA)
              INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
              LEFT JOIN TGFMAR MAR ON (MAR.DESCRICAO = PRO.MARCA)
              LEFT JOIN TGFGRU GRU ON (MAR.AD_GRUPOPROD = GRU.CODGRUPOPROD)
              INNER JOIN TSICUS CUS ON (CUS.CODCENCUS = CAB.CODCENCUS)
              INNER JOIN TGFTOP TOP ON (
                CAB.CODTIPOPER = TOP.CODTIPOPER
                AND CAB.DHTIPOPER = (SELECT MAX(TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER)
              )
              LEFT JOIN TGFCUS CUS1 ON (
                CUS1.CODPROD = ITE.CODPROD
                AND CUS1.CODEMP = CAB.CODEMP
                AND CUS1.DTATUAL <= CAB.DTNEG
              )
              WHERE (TOP.ATUALEST <> 'N')
                AND (
                  (TOP.ATUALFIN <> 0 AND TOP.TIPATUALFIN = 'I')
                  OR (TOP.CODTIPOPER IN (1112, 1113))
                  OR TOP.BONIFICACAO = 'S'
                )
                AND CAB.TIPMOV IN ('P')
                AND CAB.STATUSNOTA = 'L'
                AND (
                  CAB.STATUSNFE = 'A'
                  OR CAB.STATUSNFE = 'T'
                  OR CAB.STATUSNFE = 'S'
                  OR CAB.STATUSNFE IS NULL
                )
                AND (
                  CUS1.DTATUAL = (
                    SELECT MAX(C.DTATUAL)
                    FROM TGFCUS C
                    WHERE C.CODPROD = ITE.CODPROD
                      AND C.DTATUAL <= CAB.DTNEG
                      AND C.CODEMP = CAB.CODEMP
                  )
                  OR CUS1.DTATUAL IS NULL
                )
            )
            ${dateFilter}
          `;

          // Construir filtro de data para query5 (faturados)
          let dateFilterFaturados = "";
          if (dateStart && dateEnd) {
            const startStr = formatDateForSQL(dateStart);
            const endStr = formatDateForSQL(dateEnd);
            dateFilterFaturados = `WHERE DTMOV BETWEEN '${startStr}' AND '${endStr}'`;
          } else if (dateStart) {
            const startStr = formatDateForSQL(dateStart);
            dateFilterFaturados = `WHERE DTMOV >= '${startStr}'`;
          } else if (dateEnd) {
            const endStr = formatDateForSQL(dateEnd);
            dateFilterFaturados = `WHERE DTMOV <= '${endStr}'`;
          }

          // Query para pedidos faturados (query5.sql) com filtro dinâmico
          const sqlFaturados = `
            WITH FERIADOS AS (
              SELECT '01/01' AS dia_mes_feriado FROM DUAL
              UNION ALL SELECT '03/04' FROM DUAL
              UNION ALL SELECT '21/04' FROM DUAL
              UNION ALL SELECT '01/05' FROM DUAL
              UNION ALL SELECT '07/09' FROM DUAL
              UNION ALL SELECT '12/10' FROM DUAL
              UNION ALL SELECT '02/11' FROM DUAL
              UNION ALL SELECT '20/11' FROM DUAL
              UNION ALL SELECT '25/12' FROM DUAL
            ),
            BASE_DATA AS (
              SELECT A.NUNOTA, A.DTFATUR, A.DTMOV, A.DTNEG, VAR.NUNOTAORIG, cab1.dtfatur dtfatur1, A.CODVEND, A.APELIDO, A.CODPARC, A.NOMEPARC
              FROM (
                SELECT DISTINCT NUNOTA, NUMNOTA, DTFATUR, DTMOV, DTNEG, CODVEND, APELIDO, CODPARC, NOMEPARC
                FROM (
                  SELECT
                    CAB.DTMOV,
                    CAB.DTNEG,
                    CAB.DTFATUR,
                    CAB.NUNOTA,
                    CAB.NUMNOTA,
                    CAB.NUNOTA || ' / ' || CAB.NUMNOTA AS NRO,
                    CAB.CODEMP,
                    CAB.AD_OBSINTERNA,
                    EMP.RAZAOSOCIAL AS EMPRESA,
                    EMP.CODEMP || '-' || EMP.RAZAOSOCIAL AS EMP,
                    EMP.CODEMP || '-' || EMP.RAZAOABREV AS NOMEFANTASIAEMP,
                    EMP.CGC AS CPFCNPJ,
                    EMP.INSCESTAD AS IE,
                    EMP.TELEFONE AS TEL,
                    EMP.FAX AS FAX,
                    CAB.CODVEND,
                    VEN.APELIDO,
                    CAB.CODVEND || ' - ' || VEN.APELIDO AS VEND,
                    VEN.CODGER,
                    CAB.CODPARC,
                    PAR.RAZAOSOCIAL AS PARCEIRO,
                    CAB.CODPARC || ' - ' || PAR.NOMEPARC AS PARC,
                    PAR.NOMEPARC,
                    UFS.UF || ' - ' || UFS.DESCRICAO AS UF,
                    ITE.CODPROD || ' - ' || PRO.DESCRPROD AS PROD,
                    ITE.CODPROD AS CODPROD,
                    PRO.DESCRPROD AS DESCRPROD,
                    MAR.DESCRICAO AS MARCA,
                    CASE
                      WHEN MAR.DESCRICAO IS NULL THEN 'MARCA NÃO CADASTRADA'
                      ELSE MAR.DESCRICAO
                    END AS MARCA1,
                    GRU.CODGRUPOPROD,
                    GRU.DESCRGRUPOPROD,
                    ITE.CODVOL AS VOL,
                    CAB.CODTIPOPER,
                    CAB.CODTIPOPER || '-' || TOP.DESCROPER AS TOP,
                    TOP.DESCROPER,
                    TOP.ATUALEST,
                    TOP.ATUALFIN,
                    TOP.TIPATUALFIN,
                    CAB.STATUSNFE,
                    CAB.TIPMOV,
                    TOP.BONIFICACAO,
                    CAB.CODCENCUS,
                    CUS.AD_APELIDO,
                    CUS.DESCRCENCUS,
                    PRO.AD_QTDVOLLT,
                    CASE
                      WHEN CAB.TIPMOV = 'D' THEN (ITE.QTDNEG * PRO.AD_QTDVOLLT) * -1
                      ELSE (ITE.QTDNEG * PRO.AD_QTDVOLLT)
                    END AS QTD,
                    CASE
                      WHEN CAB.TIPMOV = 'D'
                        THEN (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRREPRED) * -1
                      ELSE (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRREPRED)
                    END AS VLR,
                    CASE
                      WHEN CAB.TIPMOV = 'D'
                        THEN (CUS1.CUSSEMICM * (ITE.QTDNEG * PRO.AD_QTDVOLLT)) * -1
                      ELSE (CUS1.CUSSEMICM * (ITE.QTDNEG * PRO.AD_QTDVOLLT))
                    END AS VLRCUSICM1,
                    CASE
                      WHEN CAB.TIPMOV = 'D'
                        THEN (CUS1.CUSGER * (ITE.QTDNEG * PRO.AD_QTDVOLLT)) * -1
                      ELSE (CUS1.CUSGER * (ITE.QTDNEG * PRO.AD_QTDVOLLT))
                    END AS VLRCUSGER1,
                    CASE
                      WHEN CAB.TIPMOV = 'D' THEN (CUS1.CUSSEMICM * ITE.QTDNEG) * -1
                      ELSE (CUS1.CUSSEMICM * ITE.QTDNEG)
                    END AS VLRCUSICM2,
                    CASE
                      WHEN CAB.TIPMOV = 'D' THEN (CUS1.CUSGER * ITE.QTDNEG) * -1
                      ELSE (CUS1.CUSGER * ITE.QTDNEG)
                    END AS VLRCUSGER2,
                    (ITE.VLRUNIT - (ITE.VLRDESC / NULLIF(ITE.QTDNEG, 0)) - (ITE.VLRREPRED/NULLIF(ITE.QTDNEG, 0))) AS VLRUNIT_LIQ,
                    CASE 
                      WHEN NVL(SNK_PRECO(PAR.CODTAB, PRO.CODPROD), 0) = 0
                        THEN SNK_PRECO(0, PRO.CODPROD) 
                      ELSE SNK_PRECO(PAR.CODTAB, PRO.CODPROD)
                    END AS PRECO_TAB,
                    ITE.VLRICMS,
                    ITE.QTDNEG AS QTDNEG,
                    ITE.SEQUENCIA,
                    ITE.VLRUNIT
                  FROM TSIEMP EMP
                  INNER JOIN TGFCAB CAB ON (EMP.CODEMP = CAB.CODEMP)
                  LEFT JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
                  INNER JOIN TGFPAR PAR ON (CAB.CODPARC = PAR.CODPARC)
                  INNER JOIN TSICID CID ON (PAR.CODCID = CID.CODCID)
                  INNER JOIN TSIUFS UFS ON (CID.UF = UFS.CODUF)
                  INNER JOIN TGFITE ITE ON (CAB.NUNOTA = ITE.NUNOTA)
                  INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
                  LEFT JOIN TGFMAR MAR ON (MAR.DESCRICAO = PRO.MARCA)
                  LEFT JOIN TGFGRU GRU ON (MAR.AD_GRUPOPROD = GRU.CODGRUPOPROD)
                  INNER JOIN TSICUS CUS ON (CUS.CODCENCUS = CAB.CODCENCUS)
                  INNER JOIN TGFTOP TOP ON (
                    CAB.CODTIPOPER = TOP.CODTIPOPER
                    AND CAB.DHTIPOPER = (SELECT MAX(TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER)
                  )
                  LEFT JOIN TGFCUS CUS1 ON (
                    CUS1.CODPROD = ITE.CODPROD
                    AND CUS1.CODEMP = CAB.CODEMP
                    AND CUS1.DTATUAL <= CAB.DTNEG
                  )
                  WHERE (TOP.ATUALEST <> 'N')
                    AND (
                      (TOP.ATUALFIN <> 0 AND TOP.TIPATUALFIN = 'I')
                      OR (TOP.CODTIPOPER IN (1112, 1113))
                      OR TOP.BONIFICACAO = 'S'
                    )
                    AND CAB.TIPMOV IN ('V', 'D')
                    AND CAB.STATUSNOTA = 'L'
                    AND (
                      CAB.STATUSNFE = 'A'
                      OR CAB.STATUSNFE = 'T'
                      OR CAB.STATUSNFE = 'S'
                      OR CAB.STATUSNFE IS NULL
                    )
                    AND (
                      CUS1.DTATUAL = (
                        SELECT MAX(C.DTATUAL)
                        FROM TGFCUS C
                        WHERE C.CODPROD = ITE.CODPROD
                          AND C.DTATUAL <= CAB.DTNEG
                          AND C.CODEMP = CAB.CODEMP
                      )
                      OR CUS1.DTATUAL IS NULL
                    )
                    ${dateFilterFaturados ? 'AND ' + dateFilterFaturados.replace('WHERE ', '') : ''}
                )
              ) A
              LEFT JOIN (
                SELECT NUNOTA, NUNOTAORIG
                FROM (
                  SELECT VAR.*,
                    ROW_NUMBER() OVER (PARTITION BY VAR.NUNOTA ORDER BY VAR.nunota DESC) RN
                  FROM TGFVAR VAR
                )
                WHERE RN = 1
              ) VAR ON A.NUNOTA = VAR.NUNOTA
              LEFT JOIN tgfcab cab1 ON VAR.NUNOTAORIG = cab1.nunota
            ),
            CALC_HORAS AS (
              SELECT 
                NUNOTA,
                DTFATUR,
                DTMOV,
                DTNEG,
                NUNOTAORIG,
                dtfatur1,
                CODVEND,
                APELIDO,
                CODPARC,
                NOMEPARC,
                CASE 
                  WHEN dtfatur1 IS NULL OR DTFATUR IS NULL THEN NULL
                  WHEN dtfatur1 > DTFATUR THEN NULL
                  ELSE (
                    CASE 
                      WHEN TRUNC(dtfatur1) = TRUNC(DTFATUR) THEN
                        CASE 
                          WHEN TO_NUMBER(TO_CHAR(dtfatur1, 'D')) BETWEEN 2 AND 6 
                            AND NOT EXISTS (
                              SELECT 1 FROM FERIADOS 
                              WHERE FERIADOS.dia_mes_feriado = TO_CHAR(dtfatur1, 'DD/MM')
                            ) THEN
                            GREATEST(0, 
                              LEAST(18, TO_NUMBER(TO_CHAR(DTFATUR, 'HH24')) + TO_NUMBER(TO_CHAR(DTFATUR, 'MI'))/60) 
                              - GREATEST(8, TO_NUMBER(TO_CHAR(dtfatur1, 'HH24')) + TO_NUMBER(TO_CHAR(dtfatur1, 'MI'))/60)
                            )
                          ELSE 0
                        END
                      ELSE
                        CASE 
                          WHEN TO_NUMBER(TO_CHAR(dtfatur1, 'D')) BETWEEN 2 AND 6 
                            AND NOT EXISTS (
                              SELECT 1 FROM FERIADOS 
                              WHERE FERIADOS.dia_mes_feriado = TO_CHAR(dtfatur1, 'DD/MM')
                            ) THEN
                            GREATEST(0, 18 - GREATEST(8, TO_NUMBER(TO_CHAR(dtfatur1, 'HH24')) + TO_NUMBER(TO_CHAR(dtfatur1, 'MI'))/60))
                          ELSE 0
                        END +
                        CASE 
                          WHEN TRUNC(DTFATUR) - TRUNC(dtfatur1) <= 1 THEN 0
                          ELSE (
                            SELECT NVL(SUM(10), 0)
                            FROM (
                              SELECT TRUNC(dtfatur1) + LEVEL AS dia_intermediario
                              FROM DUAL
                              CONNECT BY LEVEL < TRUNC(DTFATUR) - TRUNC(dtfatur1)
                            )
                            WHERE TO_NUMBER(TO_CHAR(dia_intermediario, 'D')) BETWEEN 2 AND 6
                              AND NOT EXISTS (
                                SELECT 1 FROM FERIADOS 
                                WHERE FERIADOS.dia_mes_feriado = TO_CHAR(dia_intermediario, 'DD/MM')
                              )
                          )
                        END +
                        CASE 
                          WHEN TO_NUMBER(TO_CHAR(DTFATUR, 'D')) BETWEEN 2 AND 6 
                            AND NOT EXISTS (
                              SELECT 1 FROM FERIADOS 
                              WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DTFATUR, 'DD/MM')
                            ) THEN
                            GREATEST(0, LEAST(18, TO_NUMBER(TO_CHAR(DTFATUR, 'HH24')) + TO_NUMBER(TO_CHAR(DTFATUR, 'MI'))/60) - 8)
                          ELSE 0
                        END
                    END
                  )
                END AS HORAS_UTEIS
              FROM BASE_DATA
            )
            SELECT 
              NUNOTA,
              DTFATUR,
              DTMOV,
              DTNEG,
              NUNOTAORIG,
              dtfatur1,
              CODVEND,
              APELIDO,
              CODPARC,
              NOMEPARC,
              CASE 
                WHEN HORAS_UTEIS IS NULL THEN NULL
                WHEN HORAS_UTEIS <= 4 THEN 'SIM'
                ELSE 'NÃO'
              END AS EM_4H,
              CASE 
                WHEN HORAS_UTEIS IS NULL THEN NULL
                WHEN HORAS_UTEIS > 4 AND HORAS_UTEIS <= 7 THEN 'SIM'
                ELSE 'NÃO'
              END AS EM_7H,
              CASE 
                WHEN HORAS_UTEIS IS NULL THEN NULL
                WHEN HORAS_UTEIS > 24 THEN 'SIM'
                ELSE 'NÃO'
              END AS ACIMA_24H,
              HORAS_UTEIS
            FROM CALC_HORAS
            WHERE HORAS_UTEIS IS NOT NULL
            ORDER BY NUNOTA
          `;

          const [rowsAprovados, rowsFaturados] = await Promise.all([
            JX.consultar(sqlAprovados) || [],
            JX.consultar(sqlFaturados) || []
          ]);

          rawDataAprovados = rowsAprovados.map((row) => ({
            NUNOTA: row.NUNOTA,
            DTMOV: row.DTMOV,
            DTNEG: row.DTNEG,
            DTFATUR: row.DTFATUR,
            CODVEND: row.CODVEND,
            APELIDO: row.APELIDO || "",
            CODPARC: row.CODPARC,
            NOMEPARC: row.NOMEPARC || "",
            TIPO: "aprovado"
          }));

          rawDataFaturados = rowsFaturados.map((row) => ({
            NUNOTA: row.NUNOTA,
            DTMOV: row.DTMOV,
            DTNEG: row.DTNEG,
            DTFATUR: row.DTFATUR,
            NUNOTAORIG: row.NUNOTAORIG,
            DTFATUR1: row.DTFATUR1,
            CODVEND: row.CODVEND,
            APELIDO: row.APELIDO || "",
            CODPARC: row.CODPARC,
            NOMEPARC: row.NOMEPARC || "",
            HORAS_UTEIS: row.HORAS_UTEIS != null ? Number(row.HORAS_UTEIS) : null,
            EM_4H: row.EM_4H,
            EM_7H: row.EM_7H,
            ACIMA_24H: row.ACIMA_24H,
            TIPO: "faturado"
          }));

          renderResumo();
          renderTabela();
          document.getElementById("pillAtualizacao").textContent = "Atualizado: " + new Date().toLocaleString("pt-BR");
        } catch (error) {
          console.error("Erro ao carregar dados:", error);
          document.getElementById("tableBody").innerHTML =
            '<tr><td colspan="8" class="muted" style="text-align:center; padding:24px;">Erro ao buscar dados: ' + error.message + '</td></tr>';
        } finally {
          showLoading(false);
        }
      }

      function renderResumo() {
        const qtdAprovados = rawDataAprovados.length;
        const qtdFaturados = rawDataFaturados.length;

        document.getElementById("cardAprovadosQtd").textContent = formatNumber(qtdAprovados);
        document.getElementById("cardAprovadosHint").textContent = "Total de pedidos aprovados";

        document.getElementById("cardFaturadosQtd").textContent = formatNumber(qtdFaturados);
        document.getElementById("cardFaturadosHint").textContent = "Total de pedidos faturados";

        // Calcular subcards de faturados
        const qtd4h = rawDataFaturados.filter((r) => r.EM_4H === "SIM").length;
        const qtd7h = rawDataFaturados.filter((r) => r.EM_7H === "SIM").length;
        const qtd24h = rawDataFaturados.filter((r) => r.ACIMA_24H === "SIM").length;

        document.getElementById("subcard4hQtd").textContent = formatNumber(qtd4h);
        document.getElementById("subcard7hQtd").textContent = formatNumber(qtd7h);
        document.getElementById("subcard24hQtd").textContent = formatNumber(qtd24h);
      }

      function currentTableData() {
        if (!selectedFilter) {
          return [...rawDataAprovados, ...rawDataFaturados];
        }

        if (selectedFilter === "aprovados") {
          return rawDataAprovados;
        }

        if (selectedFilter === "faturados") {
          return rawDataFaturados;
        }

        if (selectedFilter === "4h") {
          return rawDataFaturados.filter((r) => r.EM_4H === "SIM");
        }

        if (selectedFilter === "7h") {
          return rawDataFaturados.filter((r) => r.EM_7H === "SIM");
        }

        if (selectedFilter === "24h") {
          return rawDataFaturados.filter((r) => r.ACIMA_24H === "SIM");
        }

        return [];
      }

      function renderTabela() {
        const corpo = document.getElementById("tableBody");
        const data = currentTableData();

        if (!data.length) {
          corpo.innerHTML =
            '<tr><td colspan="8" class="muted" style="text-align:center; padding:24px;">Sem dados para o filtro selecionado.</td></tr>';
          return;
        }

        const linhas = data
          .sort((a, b) => {
            const dA = new Date(a.DTMOV || a.DTNEG || a.DTFATUR || 0);
            const dB = new Date(b.DTMOV || b.DTNEG || b.DTFATUR || 0);
            return dB.getTime() - dA.getTime();
          })
          .map((item) => {
            const horasUteis = item.HORAS_UTEIS != null ? item.HORAS_UTEIS.toFixed(2) : "-";
            let faixa = "-";
            if (item.TIPO === "faturado" && item.HORAS_UTEIS != null) {
              if (item.HORAS_UTEIS <= 4) faixa = "Até 4h";
              else if (item.HORAS_UTEIS <= 7) faixa = "4h-7h";
              else if (item.HORAS_UTEIS > 24) faixa = "Acima de 24h";
              else faixa = "Outros";
            }
            return `
              <tr>
                <td><strong>${item.NUNOTA || "-"}</strong></td>
                <td>${formatDateBr(item.DTMOV)}</td>
                <td>${formatDateBr(item.DTNEG)}</td>
                <td>${formatDateBr(item.DTFATUR)}</td>
                <td>${item.APELIDO || "-"} <span class="muted">(${item.CODVEND || "-"})</span></td>
                <td>${item.NOMEPARC || "-"} <span class="muted">(${item.CODPARC || "-"})</span></td>
                <td style="text-align:right;">${horasUteis !== "-" ? horasUteis + "h" : "-"}</td>
                <td><span class="status-tag">${faixa}</span></td>
              </tr>
            `;
          })
          .join("");

        corpo.innerHTML = linhas;
      }

      function updateFilterLabel() {
        const filterLabels = {
          aprovados: "Pedidos Aprovados",
          faturados: "Pedidos Faturados",
          "4h": "Faturados até 4h",
          "7h": "Faturados entre 4h-7h",
          "24h": "Faturados acima de 24h"
        };
        const label = selectedFilter ? filterLabels[selectedFilter] || "Filtro ativo" : "todos";
        document.getElementById("activeFilter").textContent = "Filtro: " + label;
        document.getElementById("tableCaption").textContent = selectedFilter
          ? "Mostrando: " + label
          : "Clique em um card para filtrar os dados";
      }

      function handleCardClick(type) {
        // Remover active de todos os cards
        document.querySelectorAll(".summary-card").forEach((card) => card.classList.remove("active"));
        document.querySelectorAll(".subcard").forEach((card) => card.classList.remove("active"));

        if (selectedFilter === type) {
          selectedFilter = null;
        } else {
          selectedFilter = type;
          if (type === "aprovados") {
            document.getElementById("cardAprovados").classList.add("active");
          } else if (type === "faturados") {
            document.getElementById("cardFaturados").classList.add("active");
          } else if (["4h", "7h", "24h"].includes(type)) {
            document.getElementById("subcard" + type).classList.add("active");
            document.getElementById("cardFaturados").classList.add("active");
          }
        }

        updateFilterLabel();
        renderTabela();
      }

      function exportarCsv() {
        const data = currentTableData();
        if (!data.length) {
          alert("Não há dados para exportar.");
          return;
        }
        const headers = [
          "Pedido",
          "Data Movimento",
          "Data Negociação",
          "Data Faturamento",
          "Vendedor",
          "Parceiro",
          "Horas Úteis",
          "Faixa"
        ];

        const escape = (val) => {
          if (val === null || val === undefined) return "";
          const s = String(val).replace(/"/g, '""');
          return `"${s}"`;
        };

        const rows = data.map((item) => {
          const horasUteis = item.HORAS_UTEIS != null ? item.HORAS_UTEIS.toFixed(2) : "-";
          let faixa = "-";
          if (item.TIPO === "faturado" && item.HORAS_UTEIS != null) {
            if (item.HORAS_UTEIS <= 4) faixa = "Até 4h";
            else if (item.HORAS_UTEIS <= 7) faixa = "4h-7h";
            else if (item.HORAS_UTEIS > 24) faixa = "Acima de 24h";
            else faixa = "Outros";
          }
          return [
            item.NUNOTA || "-",
            formatDateBr(item.DTMOV),
            formatDateBr(item.DTNEG),
            formatDateBr(item.DTFATUR),
            `${item.APELIDO || "-"} (${item.CODVEND || "-"})`,
            `${item.NOMEPARC || "-"} (${item.CODPARC || "-"})`,
            horasUteis !== "-" ? horasUteis.replace(".", ",") + "h" : "-",
            faixa
          ]
            .map(escape)
            .join(";");
        });

        const csvContent = ["\ufeff" + headers.join(";"), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `pedidos_aprovados_faturados_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      // Event listeners
      document.getElementById("cardAprovados").addEventListener("click", () => handleCardClick("aprovados"));
      document.getElementById("cardFaturados").addEventListener("click", () => handleCardClick("faturados"));
      document.getElementById("subcard4h").addEventListener("click", (e) => {
        e.stopPropagation();
        handleCardClick("4h");
      });
      document.getElementById("subcard7h").addEventListener("click", (e) => {
        e.stopPropagation();
        handleCardClick("7h");
      });
      document.getElementById("subcard24h").addEventListener("click", (e) => {
        e.stopPropagation();
        handleCardClick("24h");
      });
      document.getElementById("btnRefresh").addEventListener("click", () => carregarDados());
      document.getElementById("btnAplicarPeriodo").addEventListener("click", () => applyDateFilter());
      document.getElementById("btnLimparPeriodo").addEventListener("click", () => clearDateFilter());
      document.getElementById("btnExportar").addEventListener("click", () => exportarCsv());

      document.addEventListener("DOMContentLoaded", () => {
        carregarDados();
      });
    </script>
  </body>
</html>
