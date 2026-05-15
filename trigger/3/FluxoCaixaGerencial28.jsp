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
  <title>Fluxo de Caixa Gerencial</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>
  <snk:load/>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #FFFFFF 0%, #F5F7FB 100%);
      padding-top: 40px !important;
      min-height: 100vh;
      color: #4b5563;
    }
    .fixed-header {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 40px;
      background: linear-gradient(135deg, #0c3748, #1d4f6a);
      box-shadow: 0 4px 20px rgba(12, 55, 72, 0.4);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 20px;
    }
    .header-title {
      color: #FFFFFF;
      font-size: 1.05rem;
      font-weight: 700;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .main-container {
      padding: 12px 16px 24px;
      margin-top: 0;
      max-width: 100%;
    }
    .filter-container {
      background: #FFFFFF;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(12, 55, 72, 0.12);
      padding: 10px 14px;
      margin-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-end;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .filter-label {
      font-size: 0.75rem;
      color: #4b5563;
      font-weight: 600;
      white-space: nowrap;
    }
    .filter-input {
      width: 100px;
      padding: 6px 10px;
      border: 1px solid #E0E0E0;
      border-radius: 4px;
      font-size: 0.8rem;
      color: #4b5563;
    }
    .filter-input:focus {
      outline: none;
      border-color: #0c3748;
      box-shadow: 0 0 0 2px rgba(12, 55, 72, 0.18);
    }
    .btn-filter {
      background: linear-gradient(135deg, #0c3748, #1d4f6a);
      color: #FFFFFF;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.8rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-filter:hover {
      filter: brightness(1.05);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(12, 55, 72, 0.35);
    }
    .btn-excel {
      background: linear-gradient(135deg, #1d4f6a, #3b82f6);
      color: #FFFFFF;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.8rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-excel:hover {
      filter: brightness(1.05);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
    .analysis-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-left: 6px;
      user-select: none;
    }
    .analysis-toggle input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    .analysis-switch {
      width: 42px;
      height: 22px;
      background: #cbd5e1;
      border-radius: 999px;
      position: relative;
      transition: background 0.2s ease;
      box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.2);
    }
    .analysis-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.35);
      transition: transform 0.2s ease;
    }
    .analysis-toggle input:checked + .analysis-switch {
      background: linear-gradient(135deg, #0c3748, #1d4f6a);
    }
    .analysis-toggle input:checked + .analysis-switch::after {
      transform: translateX(20px);
    }
    .analysis-toggle-text {
      font-size: 0.75rem;
      color: #4b5563;
      font-weight: 600;
      white-space: nowrap;
    }
    .card-panel {
      background: #FFFFFF;
      border-radius: 8px;
      box-shadow: 0 2px 14px rgba(15, 23, 42, 0.08);
      margin-bottom: 20px;
      overflow: hidden;
    }
    .card-panel-title {
      background: linear-gradient(135deg, #0c3748, #1d4f6a);
      color: #FFFFFF;
      padding: 12px 18px;
      font-size: 0.95rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .table-wrap {
      overflow-x: auto;
      width: 100%;
    }
    .tree-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      min-width: 800px;
    }
    .tree-table thead {
      background: linear-gradient(135deg, #F5F5F5 0%, #E0E0E0 100%);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .tree-table th {
      padding: 10px 8px;
      text-align: right;
      font-weight: 600;
      color: #212121;
      border-bottom: 2px solid #E0E0E0;
      white-space: nowrap;
    }
    .tree-table th.text-left { text-align: left; }
    .tree-table th.col-expand { width: 36px; text-align: center; }
    .tree-table th.month-col { min-width: 120px; }
    .tree-table th.col-total { min-width: 100px; }
    .tree-table th.col-media { min-width: 100px; }
    .tree-table td {
      padding: 8px;
      border-bottom: 1px solid #F5F5F5;
      text-align: right;
      color: #616161;
      vertical-align: top;
    }
    .tree-table td.text-left { text-align: left; }
    .tree-table tbody tr.parent-row {
      background: #e2edf7;
      font-weight: 600;
      color: #0c3748;
    }
    .tree-table tbody tr.parent-row.group-row {
      background: #0c3748;
    }
    .tree-table tbody tr.parent-row.group-row td {
      color: #FFFFFF;
    }
    .tree-table tbody tr.parent-row.group-row .cell-value {
      color: #FFFFFF;
    }
    .tree-table tbody tr.parent-row.group-row .cell-analysis {
      color: #E5E7EB;
    }
    .tree-table tbody tr.parent-row.center-row {
      background: #dbe9f7;
    }
    .tree-table tbody tr.parent-row:hover {
      background: #c7daf5;
    }
    .tree-table tbody tr.child-row {
      background: #FFFFFF;
    }
    .tree-table tbody tr.child-row:hover {
      background: #f3f4f6;
    }
    .tree-table tbody tr.child-row td:first-child { padding-left: 24px; }
    .tree-table tbody tr.row-total {
      background: linear-gradient(135deg, #0c3748 0%, #1d4f6a 100%);
      font-weight: 700;
      color: #FFFFFF;
    }
    .tree-table tbody tr.row-total td {
      color: #FFFFFF;
    }
    .tree-table tbody tr.row-total .cell-value {
      color: #FFFFFF;
    }
    .tree-table tbody tr.row-total .cell-analysis {
      color: #E5E7EB;
    }
    .tree-table tbody tr.row-total .cell-analysis .pct-v {
      color: #93C5FD;
    }
    .expand-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      cursor: pointer;
      user-select: none;
      background: #e5e7eb;
      border-radius: 4px;
      color: #111827;
      font-weight: 700;
      font-size: 12px;
      transition: background 0.2s, color 0.2s;
    }
    .expand-toggle:hover {
      background: #dbe9f7;
      color: #0c3748;
    }
    .expand-toggle.no-children {
      visibility: hidden;
    }
    .cell-value {
      font-weight: 600;
      color: #0c3748;
      white-space: nowrap;
    }
    .cell-analysis {
      font-size: 0.7rem;
      color: #616161;
      margin-top: 2px;
      line-height: 1.3;
    }
    .cell-analysis .pct-v { color: #1565C0; }
    .cell-analysis .pct-h { color: #FB8C00; }
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(245, 245, 245, 0.92);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    }
    .loading-spinner {
      width: 44px;
      height: 44px;
      border: 3px solid #E0E0E0;
      border-top-color: #0c3748;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text {
      margin-top: 12px;
      color: #616161;
      font-weight: 500;
      font-size: 0.9rem;
    }
    .error-msg {
      background: linear-gradient(135deg, #FB8C00, #F9A825);
      color: #FFFFFF;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 12px;
      text-align: center;
      font-weight: 500;
    }
    .success-msg {
      background: linear-gradient(135deg, #0c3748, #1d4f6a);
      color: #FFFFFF;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 12px;
      text-align: center;
      font-weight: 500;
    }
    .empty-msg {
      text-align: center;
      padding: 32px;
      color: #616161;
      font-size: 0.95rem;
    }
    .nat-link {
      color: #0c3748;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 700;
    }
    .nat-link:hover {
      color: #1d4f6a;
    }
    .detail-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .detail-modal {
      background: #FFFFFF;
      border-radius: 10px;
      width: min(1400px, 96vw);
      max-height: 92vh;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.35);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .detail-modal-header {
      background: linear-gradient(135deg, #0c3748, #1d4f6a);
      color: #FFFFFF;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .detail-modal-title {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 700;
    }
    .detail-header-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-detail-excel {
      border: none;
      background: rgba(255, 255, 255, 0.18);
      color: #FFFFFF;
      border-radius: 6px;
      padding: 6px 10px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.75rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-detail-excel:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    .detail-modal-close {
      border: none;
      background: rgba(255, 255, 255, 0.18);
      color: #FFFFFF;
      width: 30px;
      height: 30px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 700;
    }
    .detail-modal-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    .detail-modal-body {
      padding: 10px 14px 14px;
      overflow: auto;
    }
    .detail-meta {
      font-size: 0.75rem;
      color: #64748b;
      margin-bottom: 8px;
    }
    .detail-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
      min-width: 1100px;
    }
    .detail-table th {
      background: #f1f5f9;
      color: #1f2937;
      font-weight: 700;
      text-align: left;
      padding: 8px;
      border-bottom: 2px solid #cbd5e1;
      white-space: nowrap;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .detail-table td {
      padding: 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
      white-space: nowrap;
    }
    .detail-table td.text-right { text-align: right; }
    .detail-table tfoot td {
      background: #0c3748;
      color: #FFFFFF;
      font-weight: 700;
      border-bottom: none;
    }
  </style>
</head>
<body>
  <header class="fixed-header">
    <h1 class="header-title"><i class="fas fa-chart-line"></i> Fluxo de Caixa Gerencial</h1>
  </header>

  <div class="main-container">
    <div id="messageArea"></div>

    <div class="filter-container">
      <div class="filter-group">
        <label class="filter-label">Data Inicial</label>
        <input type="text" id="dtInicio" class="filter-input" placeholder="DD/MM/AAAA" maxlength="10" />
      </div>
      <div class="filter-group">
        <label class="filter-label">Data Final</label>
        <input type="text" id="dtFim" class="filter-input" placeholder="DD/MM/AAAA" maxlength="10" />
      </div>
      <label class="analysis-toggle" title="Marcado: análise horizontal encadeada — 1º mês 100%, demais (valor ÷ mês anterior − 1). Desmarcado: cada mês em % do primeiro mês (índice na base).">
        <input type="checkbox" id="chkAnaliseHorizontalAtual" checked />
        <span class="analysis-switch"></span>
        <span class="analysis-toggle-text">Análise horizontal atual</span>
      </label>
      <button type="button" class="btn-filter" onclick="carregarDados()">
        <i class="fas fa-search"></i> Aplicar
      </button>
      <button type="button" class="btn-excel" onclick="exportarExcel()" id="btnExcel" disabled>
        <i class="fas fa-file-excel"></i> Exportar Excel
      </button>
    </div>

    <div class="card-panel">
      <div class="card-panel-title">
        <i class="fas fa-sitemap"></i> Fluxo de Caixa por Centro de Custo e Natureza (expandir para detalhar)
      </div>
      <div style="padding: 6px 18px; background: #f8fafc; font-size: 0.75rem; color: #64748b; border-bottom: 1px solid #e2e8f0;">
        <strong>Análise:</strong> <span class="pct-v">V</span> = vertical (% da coluna/mês) &nbsp;|&nbsp; <span class="pct-h">H</span> = horizontal (% da linha)
      </div>
      <div class="table-wrap">
        <table class="tree-table" id="tabelaFluxo">
          <thead id="theadFluxo"></thead>
          <tbody id="tbodyFluxo"></tbody>
        </table>
      </div>
      <div id="emptyFluxo" class="empty-msg" style="display:none;">Selecione o período e clique em Aplicar.</div>
    </div>
  </div>

  <div class="loading-overlay" id="loadingOverlay" style="display:none;">
    <div style="text-align:center;">
      <div class="loading-spinner"></div>
      <p class="loading-text">Carregando dados...</p>
    </div>
  </div>
  <div class="detail-overlay" id="detailOverlay">
    <div class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detailTitle">
      <div class="detail-modal-header">
        <h2 class="detail-modal-title" id="detailTitle">Detalhamento da Natureza</h2>
        <div class="detail-header-actions">
          <button type="button" class="btn-detail-excel" id="btnDetailExcel" onclick="exportarDetalheExcel()" disabled>
            <i class="fas fa-file-excel"></i> Exportar Excel
          </button>
          <button type="button" class="detail-modal-close" id="btnCloseDetail" aria-label="Fechar">X</button>
        </div>
      </div>
      <div class="detail-modal-body">
        <div class="detail-meta" id="detailMeta"></div>
        <div class="table-wrap">
          <table class="detail-table" id="detailTable">
            <thead id="detailThead"></thead>
            <tbody id="detailTbody"></tbody>
            <tfoot id="detailTfoot"></tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      'use strict';

      var rawData = [];
      var mesesOrdenados = [];
      var centrosMap = {};
      var naturezasPorCentro = {};
      var categoriasMap = {};
      var centroCategoria = {};
      var totaisPorMes = {};
      var totalGeral = 0;
      var expandedCentros = {};
      var baseCentroMes = {};
      var detalheAtual = [];
      var contextoDetalhe = null;

      function formatDateBR(d) {
        var dd = String(d.getDate()).padStart(2, '0');
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var yyyy = d.getFullYear();
        return dd + '/' + mm + '/' + yyyy;
      }
      function getPrimeiroDiaMesAtual() {
        var hoje = new Date();
        var primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        return formatDateBR(primeiro);
      }
      function getUltimoDiaMesAtual() {
        var hoje = new Date();
        var ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        return formatDateBR(ultimo);
      }
      function getDatasDinamicas() {
        return { dtInicio: getPrimeiroDiaMesAtual(), dtFim: getUltimoDiaMesAtual() };
      }

      function showLoading(show) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
      }
      function showMessage(text, isError) {
        var el = document.getElementById('messageArea');
        el.innerHTML = '<div class="' + (isError ? 'error-msg' : 'success-msg') + '">' + text + '</div>';
        setTimeout(function() { el.innerHTML = ''; }, 5000);
      }

      function formatBR(num) {
        if (num == null || isNaN(num)) return '-';
        var n = Number(num);
        var s = n < 0 ? '-' : '';
        n = Math.abs(n);
        var intPart = Math.floor(n);
        var decPart = Math.round((n - intPart) * 100);
        if (decPart === 100) {
          intPart += 1;
          decPart = 0;
        }
        var strInt = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        var strDec = (decPart < 10 ? '0' : '') + decPart;
        return s + strInt + ',' + strDec;
      }
      function toNumber(value) {
        if (value == null || value === '') return 0;
        if (typeof value === 'number') return isNaN(value) ? 0 : value;
        var raw = String(value).trim();
        if (!raw) return 0;
        var normalized = raw;
        if (normalized.indexOf(',') >= 0) {
          normalized = normalized.replace(/\./g, '').replace(',', '.');
        } else {
          normalized = normalized.replace(/,/g, '');
        }
        var num = Number(normalized);
        return isNaN(num) ? 0 : num;
      }
      function formatPct(num) {
        if (num == null || isNaN(num)) return '-';
        var n = Number(num);
        var s = (n < 0 ? '-' : '') + Math.abs(n).toFixed(1).replace('.', ',');
        return s + '%';
      }
      function escapeHtml(value) {
        return String(value == null ? '' : value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }
      function formatDateBRDet(value) {
        if (!value) return '-';
        if (value instanceof Date && !isNaN(value.getTime())) {
          return formatDateBR(value);
        }
        var raw = String(value).trim();
        var dmyCompact = raw.match(/^(\d{2})(\d{2})(\d{4})(?:\s+\d{2}:\d{2}:\d{2})?$/);
        if (dmyCompact) {
          return dmyCompact[1] + '/' + dmyCompact[2] + '/' + dmyCompact[3];
        }
        var dmy = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})(?:\s+\d{2}:\d{2}:\d{2})?$/);
        if (dmy) {
          return dmy[1] + '/' + dmy[2] + '/' + dmy[3];
        }
        var ymd = raw.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})(?:\s+\d{2}:\d{2}:\d{2})?$/);
        if (ymd) {
          return ymd[3] + '/' + ymd[2] + '/' + ymd[1];
        }
        var parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) {
          return formatDateBR(parsed);
        }
        return String(value);
      }

      function buildSQL(dtInicio, dtFim) {
        return [
          "SELECT",
          "  TO_CHAR(F.DHBAIXA, 'YYYY') AS ANO,",
          "  TO_CHAR(F.DHBAIXA, 'MM') AS MES,",
          "  TO_CHAR(F.DHBAIXA, 'MM/YYYY') AS MES_ANO,",
          "  CUS.AD_FC_CATEGORIA,",
          "  F_DESCROPC('TSICUS','AD_FC_CATEGORIA', CUS.AD_FC_CATEGORIA) AS DESC_FC_CATEGORIA,",
          "  C.CODCENCUS,",
          "  CUS.DESCRCENCUS,",
          "  F.CODNAT,",
          "  NAT.DESCRNAT,",
          "  NVL(SUM(CASE WHEN F.RECDESP = -1 THEN F.VLRDESDOB * -1 ELSE F.VLRDESDOB END), 0) AS VLRDESDOB",
          "FROM TGFFIN F",
          "INNER JOIN TGFNAT NAT ON F.CODNAT = NAT.CODNAT",
          "INNER JOIN TGFCRN C ON F.CODNAT = C.CODNAT",
          "INNER JOIN TSICUS CUS ON C.CODCENCUS = CUS.CODCENCUS",
          "WHERE C.CODCENCUS BETWEEN 160000 AND 350000",
          "  AND F.RECDESP IN (1, -1)",
          "  AND F.PROVISAO IN ('N','S')",
          "  AND F.DHBAIXA IS NOT NULL",
          "  AND TRUNC(F.DHBAIXA) BETWEEN TO_DATE('" + dtInicio + "','DD/MM/YYYY') AND TO_DATE('" + dtFim + "','DD/MM/YYYY')",
          "  AND NOT (F.PROVISAO = 'S' AND F.ORIGEM = 'E')",
          "GROUP BY",
          "  TO_CHAR(F.DHBAIXA,'YYYY'),",
          "  TO_CHAR(F.DHBAIXA,'MM'),",
          "  TO_CHAR(F.DHBAIXA,'MM/YYYY'),",
          "  CUS.AD_FC_CATEGORIA,",
          "  F_DESCROPC('TSICUS','AD_FC_CATEGORIA', CUS.AD_FC_CATEGORIA),",
          "  C.CODCENCUS,",
          "  CUS.DESCRCENCUS,",
          "  F.CODNAT,",
          "  NAT.DESCRNAT",
          "ORDER BY 1, 2, 4, 6"
        ].join(' ');
      }
      function buildSQLDetalheNatureza(dtInicio, dtFim, codnat, codcencus) {
        return [
          "SELECT",
          "  F.NUFIN,",
          "  F.NUNOTA,",
          "  F.NUMNOTA,",
          "  C.CODCENCUS,",
          "  CUS.DESCRCENCUS,",
          "  F.CODNAT,",
          "  NAT.DESCRNAT,",
          "  F.DHBAIXA,",
          "  F.CODPARC,",
          "  PAR.NOMEPARC,",
          "  (CASE WHEN F.RECDESP = -1 THEN F.VLRDESDOB * -1 ELSE F.VLRDESDOB END) AS VLRDESDOB",
          "FROM TGFFIN F",
          "INNER JOIN TGFNAT NAT ON F.CODNAT = NAT.CODNAT",
          "INNER JOIN TGFPAR PAR ON F.CODPARC = PAR.CODPARC",
          "INNER JOIN TGFCRN C ON F.CODNAT = C.CODNAT",
          "INNER JOIN TSICUS CUS ON C.CODCENCUS = CUS.CODCENCUS",
          "WHERE C.CODCENCUS BETWEEN 160000 AND 350000",
          "  AND F.RECDESP IN (1, -1)",
          "  AND F.PROVISAO IN ('N','S')",
          "  AND F.DHBAIXA IS NOT NULL",
          "  AND TRUNC(F.DHBAIXA) BETWEEN TO_DATE('" + dtInicio + "', 'DD/MM/YYYY') AND TO_DATE('" + dtFim + "', 'DD/MM/YYYY')",
          "  AND NOT (F.PROVISAO = 'S' AND F.ORIGEM = 'E')",
          "  AND F.CODNAT = " + Number(codnat || 0),
          "  AND CUS.CODCENCUS = " + Number(codcencus || 0),
          "ORDER BY F.NUFIN"
        ].join(' ');
      }

      function agregarDados(rows) {
        var mesesSet = {};
        centrosMap = {};
        naturezasPorCentro = {};
        categoriasMap = {};
        centroCategoria = {};
        totaisPorMes = {};
        totalGeral = 0;

        (rows || []).forEach(function(r) {
          var mesAno = (r.MES_ANO || '').toString().trim();
          if (mesAno) mesesSet[mesAno] = true;

          var cod = (r.CODCENCUS != null) ? Number(r.CODCENCUS) : 0;
          var desc = (r.DESCRCENCUS != null) ? String(r.DESCRCENCUS).trim() : '';
          var codnat = (r.CODNAT != null) ? Number(r.CODNAT) : 0;
          var descnat = (r.DESCRNAT != null) ? String(r.DESCRNAT).trim() : '';
          var vlr = toNumber(r.VLRDESDOB);
          var codCat = (r.AD_FC_CATEGORIA != null) ? String(r.AD_FC_CATEGORIA).trim() : '';
          var descCat = (r.DESC_FC_CATEGORIA != null) ? String(r.DESC_FC_CATEGORIA).trim() : '';

          var keyC = cod + '|' + desc;
          var keyCat = codCat + '|' + descCat;

          // Categoria (pai dinâmico vindo da query)
          if (!categoriasMap[keyCat]) {
            categoriasMap[keyCat] = { adCategoria: codCat, descCategoria: descCat, meses: {}, total: 0 };
          }
          if (!categoriasMap[keyCat].meses[mesAno]) categoriasMap[keyCat].meses[mesAno] = 0;
          categoriasMap[keyCat].meses[mesAno] += vlr;
          categoriasMap[keyCat].total += vlr;

          // Mapeia o centro para sua categoria (para uso no render)
          if (keyC) {
            centroCategoria[keyC] = keyCat;
          }

          // Centro de resultado
          if (!centrosMap[keyC]) {
            centrosMap[keyC] = { codcencus: cod, descrcencus: desc, meses: {}, total: 0 };
          }
          if (!centrosMap[keyC].meses[mesAno]) centrosMap[keyC].meses[mesAno] = 0;
          centrosMap[keyC].meses[mesAno] += vlr;
          centrosMap[keyC].total += vlr;

          var keyN = keyC + '|' + codnat + '|' + descnat;
          if (!naturezasPorCentro[keyC]) naturezasPorCentro[keyC] = [];
          var natObj = naturezasPorCentro[keyC].find(function(n) { return n.codnat === codnat && n.descrnat === descnat; });
          if (!natObj) {
            natObj = { codcencus: cod, descrcencus: desc, codnat: codnat, descrnat: descnat, meses: {}, total: 0 };
            naturezasPorCentro[keyC].push(natObj);
          }
          if (!natObj.meses[mesAno]) natObj.meses[mesAno] = 0;
          natObj.meses[mesAno] += vlr;
          natObj.total += vlr;

          if (!totaisPorMes[mesAno]) totaisPorMes[mesAno] = 0;
          totaisPorMes[mesAno] += vlr;
          totalGeral += vlr;
        });

        mesesOrdenados = Object.keys(mesesSet).sort(function(a, b) {
          var pa = a.split('/'), pb = b.split('/');
          if (pa.length !== 2 || pb.length !== 2) return a.localeCompare(b);
          var am = parseInt(pa[0], 10), ay = parseInt(pa[1], 10);
          var bm = parseInt(pb[0], 10), by = parseInt(pb[1], 10);
          if (ay !== by) return ay - by;
          return am - bm;
        });

        baseCentroMes = {};
        Object.keys(centrosMap).forEach(function(keyC) {
          var centro = centrosMap[keyC];
          if (centro.codcencus === 160000) {
            mesesOrdenados.forEach(function(m) {
              var v = centro.meses[m] || 0;
              if (!baseCentroMes[m]) baseCentroMes[m] = 0;
              baseCentroMes[m] += v;
            });
          }
        });
      }

      function toggleCentro(keyC) {
        expandedCentros[keyC] = !expandedCentros[keyC];
        renderTabela();
      }

      /** H: conforme meta — encadeada (atual−anterior)/anterior ou % do primeiro mês. */
      function pctHorizontalFromMeta(valor, metaHorizontal) {
        if (!metaHorizontal) return null;
        if (metaHorizontal.tipo === 'basePrimeiroMes') {
          return (metaHorizontal.base && metaHorizontal.base !== 0) ? (valor / metaHorizontal.base * 100) : null;
        }
        if (metaHorizontal.tipo === 'horizontalPrimeiro') return 100;
        if (metaHorizontal.tipo === 'horizontalVariacao') {
          var ant = metaHorizontal.anterior != null ? metaHorizontal.anterior : 0;
          if (ant === 0) return null;
          return ((valor - ant) / ant) * 100;
        }
        return null;
      }

      function cellHtml(v, baseVertical, metaHorizontal, showAnalysis) {
        var valor = v || 0;
        if (!showAnalysis)
          return '<span class="cell-value">' + formatBR(valor) + '</span>';
        var pctV = (baseVertical && baseVertical !== 0) ? (valor / baseVertical * 100) : null;
        var pctH = pctHorizontalFromMeta(valor, metaHorizontal);
        var txtV = (pctV == null) ? '-' : formatPct(pctV);
        var txtH = (pctH == null) ? '-' : formatPct(pctH);
        return '<span class="cell-value">' + formatBR(valor) + '</span>' +
          '<div class="cell-analysis"><span class="pct-v">V: ' + txtV + '</span> <span class="pct-h">H: ' + txtH + '</span></div>';
      }

      function isAnaliseHorizontalAtual() {
        var chk = document.getElementById('chkAnaliseHorizontalAtual');
        return !chk || chk.checked;
      }

      /** Por mês: meta para H. Marcado = variação encadeada (calculo1); desmarcado = % do 1º mês. */
      function getMetaHorizontalPorMes(mapaMeses) {
        var meta = {};
        var encadeadoCalculo1 = isAnaliseHorizontalAtual();
        var baseMes = mesesOrdenados.length > 0 ? mesesOrdenados[0] : null;
        if (encadeadoCalculo1) {
          mesesOrdenados.forEach(function(m, mi) {
            if (mi === 0) {
              meta[m] = { tipo: 'horizontalPrimeiro' };
            } else {
              var mAnt = mesesOrdenados[mi - 1];
              var anterior = (mapaMeses && mapaMeses[mAnt]) ? mapaMeses[mAnt] : 0;
              meta[m] = { tipo: 'horizontalVariacao', anterior: anterior };
            }
          });
          return meta;
        }
        var base0 = baseMes ? ((mapaMeses && mapaMeses[baseMes]) ? mapaMeses[baseMes] : 0) : 0;
        mesesOrdenados.forEach(function(m) {
          meta[m] = { tipo: 'basePrimeiroMes', base: base0 };
        });
        return meta;
      }

      /** Coluna Total: mesmo critério de AV do mês, com base = soma do período (160000) ou total do centro (naturezas). */
      function cellTotalHtml(valor, baseVerticalTotal, showAnalysis) {
        var v = valor || 0;
        if (!showAnalysis)
          return '<span class="cell-value">' + formatBR(v) + '</span>';
        var pctV = (baseVerticalTotal && baseVerticalTotal !== 0) ? (v / baseVerticalTotal * 100) : null;
        var txtV = (pctV == null) ? '-' : formatPct(pctV);
        return '<span class="cell-value">' + formatBR(v) + '</span>' +
          '<div class="cell-analysis"><span class="pct-v">V: ' + txtV + '</span></div>';
      }

      /** Média mensal: total do intervalo ÷ quantidade de meses; base dividida pelo mesmo fator para manter o V% da coluna Total. */
      function cellMediaHtml(valorTotal, baseVerticalTotal, showAnalysis) {
        var n = mesesOrdenados.length;
        if (n < 1) n = 1;
        return cellTotalHtml((valorTotal || 0) / n, (baseVerticalTotal || 0) / n, showAnalysis);
      }

      function renderTabela() {
        var thead = document.getElementById('theadFluxo');
        var tbody = document.getElementById('tbodyFluxo');
        var empty = document.getElementById('emptyFluxo');
        var keysCentro = Object.keys(centrosMap);
        var keysCategoria = Object.keys(categoriasMap);

        // Agregação dos grupos pais com base nas categorias dinâmicas da query
        function agregaPorDescricao(descAlvo) {
          var agg = { meses: {}, total: 0 };
          keysCategoria.forEach(function(keyCat) {
            var cat = categoriasMap[keyCat];
            if (!cat) return;
            if ((cat.descCategoria || '') !== descAlvo) return;
            mesesOrdenados.forEach(function(m) {
              var v = cat.meses[m] || 0;
              if (!agg.meses[m]) agg.meses[m] = 0;
              agg.meses[m] += v;
            });
            agg.total += cat.total || 0;
          });
          return agg;
        }

        var receitaFat = agregaPorDescricao('RECEITA / FATURAMENTO');
        var custosVariaveis = agregaPorDescricao('CUSTOS VARIÁVEIS');
        var despesasFixas = agregaPorDescricao('DESPESAS FIXAS');
        var investimentos = agregaPorDescricao('INVESTIMENTOS');
        var movNaoOperacionais = agregaPorDescricao('MOVIMENTAÇÕES NÃO OPERACIONAIS');

        // Cálculo da "MARGEM DE CONTRIBUIÇÃO" = RECEITA / FATURAMENTO + CUSTOS VARIÁVEIS
        var margemContribuicao = { meses: {}, total: 0 };
        mesesOrdenados.forEach(function(m) {
          var vReceita = receitaFat.meses[m] || 0;
          var vCustos = custosVariaveis.meses[m] || 0;
          var vMargem = vReceita + vCustos;
          margemContribuicao.meses[m] = vMargem;
          margemContribuicao.total += vMargem;
        });

        // Linha totalizadora "LUCRO OPERACIONAL ANTES DOS INVESTIMENTOS"
        // calculada como MARGEM DE CONTRIBUIÇÃO + DESPESAS FIXAS
        var lucroOperacionalAntesInvestimentos = { meses: {}, total: 0 };
        mesesOrdenados.forEach(function(m) {
          var vMC = margemContribuicao.meses[m] || 0;
          var vDF = despesasFixas.meses[m] || 0;
          var vLO = vMC + vDF;
          lucroOperacionalAntesInvestimentos.meses[m] = vLO;
          lucroOperacionalAntesInvestimentos.total += vLO;
        });

        // Linha totalizadora "DESPESA OPERACIONAL TOTAL"
        // calculada como CUSTOS VARIÁVEIS + DESPESAS FIXAS + INVESTIMENTOS
        var despesaOperacionalTotal = { meses: {}, total: 0 };
        mesesOrdenados.forEach(function(m) {
          var vCV = custosVariaveis.meses[m] || 0;
          var vDF = despesasFixas.meses[m] || 0;
          var vINV = investimentos.meses[m] || 0;
          var vDOT = vCV + vDF + vINV;
          despesaOperacionalTotal.meses[m] = vDOT;
          despesaOperacionalTotal.total += vDOT;
        });

        // Linha totalizadora "LUCRO OPERACIONAL"
        // calculada como LUCRO OPERACIONAL ANTES DOS INVESTIMENTOS + INVESTIMENTOS
        var lucroOperacional = { meses: {}, total: 0 };
        mesesOrdenados.forEach(function(m) {
          var vLOAI = lucroOperacionalAntesInvestimentos.meses[m] || 0;
          var vINV = investimentos.meses[m] || 0;
          var vLO = vLOAI + vINV;
          lucroOperacional.meses[m] = vLO;
          lucroOperacional.total += vLO;
        });

        if (keysCentro.length === 0) {
          thead.innerHTML = '';
          tbody.innerHTML = '';
          empty.style.display = 'block';
          return;
        }
        empty.style.display = 'none';

        var baseCentroTotal = 0;
        mesesOrdenados.forEach(function(m) {
          baseCentroTotal += (baseCentroMes[m] || 0);
        });

        var tr = '<tr><th class="col-expand text-left"></th><th class="text-left">Cód. Centro</th><th class="text-left">Centro de Custo</th><th class="text-left">Cód. Nat.</th><th class="text-left">Natureza</th>';
        mesesOrdenados.forEach(function(m) {
          tr += '<th class="month-col">' + m + '</th>';
        });
        tr += '<th class="col-total">Total</th><th class="col-media">Média</th></tr>';
        thead.innerHTML = tr;

        var html = '';
        var receitaFatInserida = false;
        var custosVariaveisInserido = false;
        var margemContribuicaoInserida = false;
        var despesasFixasInserido = false;
        var lucroOperacionalAntesInvestimentosInserido = false;
        var investimentosInserido = false;
        var movNaoOperacionaisInserido = false;
        keysCentro.forEach(function(keyC) {
          var centro = centrosMap[keyC];
          var keyCat = centroCategoria[keyC] || '';
          var cat = categoriasMap[keyCat] || null;
          var descCat = cat ? (cat.descCategoria || '') : '';
          var children = naturezasPorCentro[keyC] || [];
          var isExpanded = expandedCentros[keyC] === true;
          var hasChildren = children.length > 0;

          var expandIcon = hasChildren ? (isExpanded ? '−' : '+') : '';
          var expandClass = hasChildren ? 'expand-toggle' : 'expand-toggle no-children';
          var expandClick = hasChildren ? ('onclick="event.stopPropagation(); toggleCentro(\'' + keyC.replace(/'/g, "\\'") + '\')"') : '';

          // Linha agregada "RECEITA / FATURAMENTO" (sem opção de ocultar/reexibir),
          // inserida imediatamente antes do primeiro centro cuja categoria seja "RECEITA / FATURAMENTO"
          if (!receitaFatInserida && descCat === 'RECEITA / FATURAMENTO') {
            var metaHorizontalReceita = getMetaHorizontalPorMes(receitaFat.meses);
            html += '<tr class="parent-row group-row">';
            html += '<td class="text-left"><span class="expand-toggle no-children"></span></td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left">RECEITA / FATURAMENTO</td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left"></td>';
            mesesOrdenados.forEach(function(m) {
              var vRF = receitaFat.meses[m] || 0;
              var baseV = baseCentroMes[m] || 0;
              html += '<td>' + cellHtml(vRF, baseV, metaHorizontalReceita[m], true) + '</td>';
            });
            html += '<td>' + cellTotalHtml(receitaFat.total, baseCentroTotal, true) + '</td>';
            html += '<td>' + cellMediaHtml(receitaFat.total, baseCentroTotal, true) + '</td>';
            html += '</tr>';
            receitaFatInserida = true;
          }

          // Linha agregada "CUSTOS VARIÁVEIS" (sem opção de ocultar/reexibir),
          // inserida imediatamente antes do primeiro centro cuja categoria seja "CUSTOS VARIÁVEIS"
          if (!custosVariaveisInserido && descCat === 'CUSTOS VARIÁVEIS') {
            var metaHorizontalCustos = getMetaHorizontalPorMes(custosVariaveis.meses);
            html += '<tr class="parent-row group-row">';
            html += '<td class="text-left"><span class="expand-toggle no-children"></span></td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left">CUSTOS VARIÁVEIS</td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left"></td>';
            mesesOrdenados.forEach(function(m) {
              var vCV = custosVariaveis.meses[m] || 0;
              var baseV = baseCentroMes[m] || 0;
              html += '<td>' + cellHtml(vCV, baseV, metaHorizontalCustos[m], true) + '</td>';
            });
            html += '<td>' + cellTotalHtml(custosVariaveis.total, baseCentroTotal, true) + '</td>';
            html += '<td>' + cellMediaHtml(custosVariaveis.total, baseCentroTotal, true) + '</td>';
            html += '</tr>';
            custosVariaveisInserido = true;
          }

          // Linha agregada "DESPESAS FIXAS" (sem opção de ocultar/reexibir),
          // inserida imediatamente antes do primeiro centro cuja categoria seja "DESPESAS FIXAS"
          if (!despesasFixasInserido && descCat === 'DESPESAS FIXAS') {
            // Linha totalizadora "MARGEM DE CONTRIBUIÇÃO" antes de "DESPESAS FIXAS"
            if (!margemContribuicaoInserida) {
              var metaHorizontalMargem = getMetaHorizontalPorMes(margemContribuicao.meses);
              html += '<tr class="parent-row group-row">';
              html += '<td class="text-left"><span class="expand-toggle no-children"></span></td>';
              html += '<td class="text-left"></td>';
              html += '<td class="text-left">MARGEM DE CONTRIBUIÇÃO</td>';
              html += '<td class="text-left"></td>';
              html += '<td class="text-left"></td>';
              mesesOrdenados.forEach(function(m) {
                var vMC = margemContribuicao.meses[m] || 0;
                var baseVMC = baseCentroMes[m] || 0;
                html += '<td>' + cellHtml(vMC, baseVMC, metaHorizontalMargem[m], true) + '</td>';
              });
              html += '<td>' + cellTotalHtml(margemContribuicao.total, baseCentroTotal, true) + '</td>';
              html += '<td>' + cellMediaHtml(margemContribuicao.total, baseCentroTotal, true) + '</td>';
              html += '</tr>';
              margemContribuicaoInserida = true;
            }

            var metaHorizontalDespesas = getMetaHorizontalPorMes(despesasFixas.meses);
            html += '<tr class="parent-row group-row">';
            html += '<td class="text-left"><span class="expand-toggle no-children"></span></td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left">DESPESAS FIXAS</td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left"></td>';
            mesesOrdenados.forEach(function(m) {
              var vDF = despesasFixas.meses[m] || 0;
              var baseV = baseCentroMes[m] || 0;
              html += '<td>' + cellHtml(vDF, baseV, metaHorizontalDespesas[m], true) + '</td>';
            });
            html += '<td>' + cellTotalHtml(despesasFixas.total, baseCentroTotal, true) + '</td>';
            html += '<td>' + cellMediaHtml(despesasFixas.total, baseCentroTotal, true) + '</td>';
            html += '</tr>';
            despesasFixasInserido = true;
          }

          // Linha agregada "INVESTIMENTOS" (sem opção de ocultar/reexibir),
          // inserida imediatamente antes do primeiro centro cuja categoria seja "INVESTIMENTOS"
          if (!investimentosInserido && descCat === 'INVESTIMENTOS') {
            // Linha totalizadora "LUCRO OPERACIONAL ANTES DOS INVESTIMENTOS"
            // inserida imediatamente antes de "INVESTIMENTOS"
            if (!lucroOperacionalAntesInvestimentosInserido) {
              var metaHorizontalLucroOperacional = getMetaHorizontalPorMes(lucroOperacionalAntesInvestimentos.meses);
              html += '<tr class="parent-row group-row">';
              html += '<td class="text-left"><span class="expand-toggle no-children"></span></td>';
              html += '<td class="text-left"></td>';
              html += '<td class="text-left">LUCRO OPERACIONAL ANTES DOS INVESTIMENTOS</td>';
              html += '<td class="text-left"></td>';
              html += '<td class="text-left"></td>';
              mesesOrdenados.forEach(function(m) {
                var vLO = lucroOperacionalAntesInvestimentos.meses[m] || 0;
                var baseVLO = baseCentroMes[m] || 0;
                html += '<td>' + cellHtml(vLO, baseVLO, metaHorizontalLucroOperacional[m], true) + '</td>';
              });
              html += '<td>' + cellTotalHtml(lucroOperacionalAntesInvestimentos.total, baseCentroTotal, true) + '</td>';
              html += '<td>' + cellMediaHtml(lucroOperacionalAntesInvestimentos.total, baseCentroTotal, true) + '</td>';
              html += '</tr>';
              lucroOperacionalAntesInvestimentosInserido = true;
            }

            var metaHorizontalInvestimentos = getMetaHorizontalPorMes(investimentos.meses);
            html += '<tr class="parent-row group-row">';
            html += '<td class="text-left"><span class="expand-toggle no-children"></span></td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left">INVESTIMENTOS</td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left"></td>';
            mesesOrdenados.forEach(function(m) {
              var vINV = investimentos.meses[m] || 0;
              var baseV = baseCentroMes[m] || 0;
              html += '<td>' + cellHtml(vINV, baseV, metaHorizontalInvestimentos[m], true) + '</td>';
            });
            html += '<td>' + cellTotalHtml(investimentos.total, baseCentroTotal, true) + '</td>';
            html += '<td>' + cellMediaHtml(investimentos.total, baseCentroTotal, true) + '</td>';
            html += '</tr>';
            investimentosInserido = true;
          }

          // Linha agregada "MOVIMENTAÇÕES NÃO OPERACIONAIS" (sem opção de ocultar/reexibir),
          // inserida imediatamente antes do primeiro centro cuja categoria seja "MOVIMENTAÇÕES NÃO OPERACIONAIS"
          if (!movNaoOperacionaisInserido && descCat === 'MOVIMENTAÇÕES NÃO OPERACIONAIS') {
            // Linha totalizadora "DESPESA OPERACIONAL TOTAL" antes de "MOVIMENTAÇÕES NÃO OPERACIONAIS"
            var metaHorizontalDespesaOperacional = getMetaHorizontalPorMes(despesaOperacionalTotal.meses);
            html += '<tr class="parent-row group-row">';
            html += '<td class="text-left"><span class="expand-toggle no-children"></span></td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left">DESPESA OPERACIONAL TOTAL</td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left"></td>';
            mesesOrdenados.forEach(function(m) {
              var vDOT = despesaOperacionalTotal.meses[m] || 0;
              var baseVDOT = baseCentroMes[m] || 0;
              html += '<td>' + cellHtml(vDOT, baseVDOT, metaHorizontalDespesaOperacional[m], true) + '</td>';
            });
            html += '<td>' + cellTotalHtml(despesaOperacionalTotal.total, baseCentroTotal, true) + '</td>';
            html += '<td>' + cellMediaHtml(despesaOperacionalTotal.total, baseCentroTotal, true) + '</td>';
            html += '</tr>';

            // Linha totalizadora "LUCRO OPERACIONAL" antes de "MOVIMENTAÇÕES NÃO OPERACIONAIS"
            var metaHorizontalLucroOperacionalTotal = getMetaHorizontalPorMes(lucroOperacional.meses);
            html += '<tr class="parent-row group-row">';
            html += '<td class="text-left"><span class="expand-toggle no-children"></span></td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left">LUCRO OPERACIONAL</td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left"></td>';
            mesesOrdenados.forEach(function(m) {
              var vLO = lucroOperacional.meses[m] || 0;
              var baseVLO = baseCentroMes[m] || 0;
              html += '<td>' + cellHtml(vLO, baseVLO, metaHorizontalLucroOperacionalTotal[m], true) + '</td>';
            });
            html += '<td>' + cellTotalHtml(lucroOperacional.total, baseCentroTotal, true) + '</td>';
            html += '<td>' + cellMediaHtml(lucroOperacional.total, baseCentroTotal, true) + '</td>';
            html += '</tr>';

            var metaHorizontalMovNaoOp = getMetaHorizontalPorMes(movNaoOperacionais.meses);
            html += '<tr class="parent-row group-row">';
            html += '<td class="text-left"><span class="expand-toggle no-children"></span></td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left">MOVIMENTAÇÕES NÃO OPERACIONAIS</td>';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left"></td>';
            mesesOrdenados.forEach(function(m) {
              var vMNO = movNaoOperacionais.meses[m] || 0;
              var baseV = baseCentroMes[m] || 0;
              html += '<td>' + cellHtml(vMNO, baseV, metaHorizontalMovNaoOp[m], true) + '</td>';
            });
            html += '<td>' + cellTotalHtml(movNaoOperacionais.total, baseCentroTotal, true) + '</td>';
            html += '<td>' + cellMediaHtml(movNaoOperacionais.total, baseCentroTotal, true) + '</td>';
            html += '</tr>';
            movNaoOperacionaisInserido = true;
          }

          html += '<tr class="parent-row center-row" data-key="' + keyC.replace(/"/g, '&quot;') + '">';
          html += '<td class="text-left"><span class="' + expandClass + '" ' + expandClick + '>' + expandIcon + '</span></td>';
          html += '<td class="text-left">' + (centro.codcencus || '') + '</td>';
          html += '<td class="text-left">' + (centro.descrcencus || '') + '</td>';
          html += '<td class="text-left"></td>';
          html += '<td class="text-left"></td>';
          var metaHorizontalCentro = getMetaHorizontalPorMes(centro.meses);
          mesesOrdenados.forEach(function(m) {
            var v = centro.meses[m] || 0;
            var baseV = baseCentroMes[m] || 0;
            html += '<td>' + cellHtml(v, baseV, metaHorizontalCentro[m], true) + '</td>';
          });
          html += '<td>' + cellTotalHtml(centro.total, baseCentroTotal, true) + '</td>';
          html += '<td>' + cellMediaHtml(centro.total, baseCentroTotal, true) + '</td>';
          html += '</tr>';

          var safeKey = keyC.replace(/\|/g, '_').replace(/"/g, '').replace(/'/g, '');
          children.forEach(function(nat) {
            html += '<tr class="child-row" data-parent="' + safeKey + '" style="display:' + (isExpanded ? 'table-row' : 'none') + '">';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left">' + (nat.codcencus || '') + '</td>';
            html += '<td class="text-left">' + (nat.descrcencus || '') + '</td>';
            html += '<td class="text-left">' + (nat.codnat || '') + '</td>';
            html += '<td class="text-left"><span class="nat-link" data-codnat="' + (nat.codnat || '') + '" data-codcencus="' + (nat.codcencus || '') + '" data-descrnat="' + escapeHtml(nat.descrnat || '') + '" data-descrcencus="' + escapeHtml(nat.descrcencus || '') + '">' + escapeHtml(nat.descrnat || '') + '</span></td>';
            var metaHorizontalNat = getMetaHorizontalPorMes(nat.meses);
            mesesOrdenados.forEach(function(m) {
              var v = nat.meses[m] || 0;
              var baseV = centro.meses[m] || 0;
              html += '<td>' + cellHtml(v, baseV, metaHorizontalNat[m], true) + '</td>';
            });
            html += '<td>' + cellTotalHtml(nat.total, centro.total, true) + '</td>';
            html += '<td>' + cellMediaHtml(nat.total, centro.total, true) + '</td>';
            html += '</tr>';
          });
        });

        var totalResultadoLiquido = (lucroOperacional.total || 0) + (movNaoOperacionais.total || 0);
        var trTotal = '<tr class="row-total"><td class="text-left" colspan="5">RESULTADO LÍQUIDO (GERAÇÃO DE CAIXA)</td>';
        mesesOrdenados.forEach(function(m) {
          var vLO = lucroOperacional.meses[m] || 0;
          var vMNO = movNaoOperacionais.meses[m] || 0;
          var vRL = vLO + vMNO;
          trTotal += '<td>' + formatBR(vRL) + '</td>';
        });
        trTotal += '<td>' + cellTotalHtml(totalResultadoLiquido, baseCentroTotal, true) + '</td>';
        trTotal += '<td>' + cellMediaHtml(totalResultadoLiquido, baseCentroTotal, true) + '</td></tr>';
        tbody.innerHTML = html + trTotal;
      }
      function closeDetalheNatureza() {
        document.getElementById('detailOverlay').style.display = 'none';
      }
      function renderDetalheNatureza() {
        var thead = document.getElementById('detailThead');
        var tbody = document.getElementById('detailTbody');
        var tfoot = document.getElementById('detailTfoot');
        var meta = document.getElementById('detailMeta');
        var rows = detalheAtual || [];
        var titulo = 'Detalhamento da Natureza';
        if (contextoDetalhe) {
          titulo += ' - ' + (contextoDetalhe.codnat || '') + ' - ' + (contextoDetalhe.descrnat || '');
          meta.innerHTML = 'Centro: <strong>' + escapeHtml(contextoDetalhe.descrcencus || '') + '</strong> (' + escapeHtml(contextoDetalhe.codcencus || '') + ')';
        } else {
          meta.textContent = '';
        }
        document.getElementById('detailTitle').textContent = titulo;
        thead.innerHTML = '<tr>' +
          '<th>NUFIN</th>' +
          '<th>NUNOTA</th>' +
          '<th>NUMNOTA</th>' +
          '<th>CODNAT</th>' +
          '<th>DESCRNAT</th>' +
          '<th>DHBAIXA</th>' +
          '<th>CODPARC</th>' +
          '<th>NOMEPARC</th>' +
          '<th style="text-align:right;">VLRDESDOB</th>' +
          '</tr>';
        if (!rows.length) {
          tbody.innerHTML = '<tr><td colspan="9">Nenhum lançamento encontrado para os filtros selecionados.</td></tr>';
          tfoot.innerHTML = '<tr><td colspan="8">Total de Registros: 0</td><td class="text-right">0,00</td></tr>';
          return;
        }
        var html = '';
        var total = 0;
        rows.forEach(function(r) {
          var vlr = toNumber(r.VLRDESDOB);
          total += vlr;
          html += '<tr>' +
            '<td>' + escapeHtml(r.NUFIN) + '</td>' +
            '<td>' + escapeHtml(r.NUNOTA) + '</td>' +
            '<td>' + escapeHtml(r.NUMNOTA) + '</td>' +
            '<td>' + escapeHtml(r.CODNAT) + '</td>' +
            '<td>' + escapeHtml(r.DESCRNAT) + '</td>' +
            '<td>' + escapeHtml(formatDateBRDet(r.DHBAIXA)) + '</td>' +
            '<td>' + escapeHtml(r.CODPARC) + '</td>' +
            '<td>' + escapeHtml(r.NOMEPARC) + '</td>' +
            '<td class="text-right">' + formatBR(vlr) + '</td>' +
            '</tr>';
        });
        tbody.innerHTML = html;
        tfoot.innerHTML = '<tr><td colspan="8">Total de Registros: ' + rows.length + '</td><td class="text-right">' + formatBR(total) + '</td></tr>';
        document.getElementById('btnDetailExcel').disabled = rows.length === 0;
      }
      function abrirDetalheNatureza(codnat, codcencus, descrnat, descrcencus) {
        var dtInicio = (document.getElementById('dtInicio').value || '').trim();
        var dtFim = (document.getElementById('dtFim').value || '').trim();
        if (!dtInicio || !dtFim) {
          showMessage('Informe período para detalhar.', true);
          return;
        }
        showLoading(true);
        contextoDetalhe = {
          codnat: codnat,
          codcencus: codcencus,
          descrnat: descrnat || '',
          descrcencus: descrcencus || ''
        };
        var sql = buildSQLDetalheNatureza(dtInicio, dtFim, codnat, codcencus);
        JX.consultar(sql).then(function(result) {
          detalheAtual = result || [];
          renderDetalheNatureza();
          document.getElementById('detailOverlay').style.display = 'flex';
        }).catch(function(err) {
          showMessage('Erro ao carregar detalhamento: ' + (err && err.message ? err.message : String(err)), true);
        }).finally(function() {
          showLoading(false);
        });
      }

      function carregarDados() {
        var dtInicio = (document.getElementById('dtInicio').value || '').trim();
        var dtFim = (document.getElementById('dtFim').value || '').trim();
        var def = getDatasDinamicas();
        if (!dtInicio) dtInicio = def.dtInicio;
        if (!dtFim) dtFim = def.dtFim;
        document.getElementById('dtInicio').value = dtInicio;
        document.getElementById('dtFim').value = dtFim;

        if (typeof JX === 'undefined' || !JX.consultar) {
          showMessage('SankhyaJX não disponível.', true);
          return;
        }

        showLoading(true);
        expandedCentros = {};
        var sql = buildSQL(dtInicio, dtFim);

        JX.consultar(sql).then(function(result) {
          rawData = result || [];
          agregarDados(rawData);
          renderTabela();
          document.getElementById('btnExcel').disabled = rawData.length === 0;
          showMessage(rawData.length + ' registro(s) carregado(s).');
        }).catch(function(err) {
          rawData = [];
          centrosMap = {};
          naturezasPorCentro = {};
          mesesOrdenados = [];
          totaisPorMes = {};
          totalGeral = 0;
          renderTabela();
          document.getElementById('btnExcel').disabled = true;
          showMessage('Erro: ' + (err && err.message ? err.message : String(err)), true);
        }).finally(function() {
          showLoading(false);
        });
      }

      function exportarDetalheExcel() {
        if (typeof XLSX === 'undefined') {
          showMessage('Biblioteca XLSX não carregada.', true);
          return;
        }
        if (!detalheAtual || detalheAtual.length === 0) {
          showMessage('Não há dados de detalhamento para exportar.', true);
          return;
        }
        var wb = XLSX.utils.book_new();
        var dados = [[
          'NUFIN', 'NUNOTA', 'NUMNOTA', 'CODNAT', 'DESCRNAT', 'DHBAIXA', 'CODPARC', 'NOMEPARC', 'VLRDESDOB'
        ]];
        detalheAtual.forEach(function(r) {
          dados.push([
            r.NUFIN,
            r.NUNOTA,
            r.NUMNOTA,
            r.CODNAT,
            r.DESCRNAT,
            formatDateBRDet(r.DHBAIXA),
            r.CODPARC,
            r.NOMEPARC,
            toNumber(r.VLRDESDOB)
          ]);
        });
        var ws = XLSX.utils.aoa_to_sheet(dados);
        XLSX.utils.book_append_sheet(wb, ws, 'Detalhamento');
        XLSX.writeFile(wb, 'DetalhamentoNatureza_' + (new Date().toISOString().slice(0, 10)) + '.xlsx');
        showMessage('Exportação do detalhamento concluída.');
      }

      function exportarExcel() {
        if (typeof XLSX === 'undefined') {
          showMessage('Biblioteca XLSX não carregada.', true);
          return;
        }
        if (mesesOrdenados.length === 0) {
          showMessage('Não há dados para exportar.', true);
          return;
        }

        var nMesesExcel = mesesOrdenados.length || 1;
        var wb = XLSX.utils.book_new();
        // Cabeçalhos: centro de resultado, natureza e, para cada mês, Valor / AV / AH
        var headers = ['Centro Resultado', 'Descrição Centro', 'Natureza', 'Descrição Natureza'];
        mesesOrdenados.forEach(function(m) {
          headers.push(m + ' Valor');
          headers.push(m + ' AV (%)');
          headers.push(m + ' AH (%)');
        });
        headers.push('Total');
        headers.push('Média');

        var dados = [headers];
        var keysCentro = Object.keys(centrosMap);

        var keysCategoria = Object.keys(categoriasMap);
        function agregaPorDescricaoExp(descAlvo) {
          var agg = { meses: {}, total: 0 };
          keysCategoria.forEach(function(keyCat) {
            var cat = categoriasMap[keyCat];
            if (!cat) return;
            if ((cat.descCategoria || '') !== descAlvo) return;
            mesesOrdenados.forEach(function(m) {
              var vx = cat.meses[m] || 0;
              if (!agg.meses[m]) agg.meses[m] = 0;
              agg.meses[m] += vx;
            });
            agg.total += cat.total || 0;
          });
          return agg;
        }
        var receitaFatE = agregaPorDescricaoExp('RECEITA / FATURAMENTO');
        var custosVariaveisE = agregaPorDescricaoExp('CUSTOS VARIÁVEIS');
        var despesasFixasE = agregaPorDescricaoExp('DESPESAS FIXAS');
        var investimentosE = agregaPorDescricaoExp('INVESTIMENTOS');
        var movNaoOperacionaisE = agregaPorDescricaoExp('MOVIMENTAÇÕES NÃO OPERACIONAIS');
        var margemContribuicaoE = { meses: {}, total: 0 };
        mesesOrdenados.forEach(function(m) {
          margemContribuicaoE.meses[m] = (receitaFatE.meses[m] || 0) + (custosVariaveisE.meses[m] || 0);
          margemContribuicaoE.total += margemContribuicaoE.meses[m];
        });
        var loaiE = { meses: {}, total: 0 };
        mesesOrdenados.forEach(function(m) {
          loaiE.meses[m] = (margemContribuicaoE.meses[m] || 0) + (despesasFixasE.meses[m] || 0);
          loaiE.total += loaiE.meses[m];
        });
        var lucroOperacionalE = { meses: {}, total: 0 };
        mesesOrdenados.forEach(function(m) {
          lucroOperacionalE.meses[m] = (loaiE.meses[m] || 0) + (investimentosE.meses[m] || 0);
          lucroOperacionalE.total += lucroOperacionalE.meses[m];
        });
        var mapaResultadoLiquidoE = {};
        mesesOrdenados.forEach(function(m) {
          mapaResultadoLiquidoE[m] = (lucroOperacionalE.meses[m] || 0) + (movNaoOperacionaisE.meses[m] || 0);
        });
        var metaHorizontalResultadoE = getMetaHorizontalPorMes(mapaResultadoLiquidoE);

        keysCentro.forEach(function(keyC) {
          var centro = centrosMap[keyC];
          var metaHorizontalCentro = getMetaHorizontalPorMes(centro.meses);

          // Linha do centro de resultado
          var r = [centro.codcencus, centro.descrcencus, '', ''];
          mesesOrdenados.forEach(function(m) {
            var v = centro.meses[m] || 0;
            var baseV = baseCentroMes[m] || 0;
            var pctV = (baseV && baseV !== 0) ? (v / baseV * 100) : null;
            var pctH = pctHorizontalFromMeta(v, metaHorizontalCentro[m]);
            r.push(v);
            r.push(pctV != null ? pctV : null);
            r.push(pctH != null ? pctH : null);
          });
          r.push(centro.total);
          r.push(centro.total / nMesesExcel);
          dados.push(r);

          // Linhas das naturezas do centro
          (naturezasPorCentro[keyC] || []).forEach(function(nat) {
            var metaHorizontalNat = getMetaHorizontalPorMes(nat.meses);
            var rn = [nat.codcencus, nat.descrcencus, nat.codnat, nat.descrnat];
            mesesOrdenados.forEach(function(m) {
              var vN = nat.meses[m] || 0;
              var baseVN = centro.meses[m] || 0;
              var pctVN = (baseVN && baseVN !== 0) ? (vN / baseVN * 100) : null;
              var pctHN = pctHorizontalFromMeta(vN, metaHorizontalNat[m]);
              rn.push(vN);
              rn.push(pctVN != null ? pctVN : null);
              rn.push(pctHN != null ? pctHN : null);
            });
            rn.push(nat.total);
            rn.push(nat.total / nMesesExcel);
            dados.push(rn);
          });
        });

        // Linha totalizadora "RESULTADO LÍQUIDO (GERAÇÃO DE CAIXA)"
        // calculada como LUCRO OPERACIONAL + MOVIMENTAÇÕES NÃO OPERACIONAIS
        var rTotal = ['RESULTADO LÍQUIDO (GERAÇÃO DE CAIXA)', '', '', ''];
        mesesOrdenados.forEach(function(m) {
          var vLO = lucroOperacionalE.meses[m] || 0;
          var vMNO = movNaoOperacionaisE.meses[m] || 0;
          var vT = vLO + vMNO;
          var baseVT = (lucroOperacionalE.meses[m] || 0) + (movNaoOperacionaisE.meses[m] || 0);
          var pctVT = (baseVT && baseVT !== 0) ? (vT / baseVT * 100) : null;
          var pctHT = pctHorizontalFromMeta(vT, metaHorizontalResultadoE[m]);
          rTotal.push(vT);
          rTotal.push(pctVT != null ? pctVT : null);
          rTotal.push(pctHT != null ? pctHT : null);
        });
        var totalResultadoLiquidoExcel = (lucroOperacionalE.total || 0) + (movNaoOperacionaisE.total || 0);
        rTotal.push(totalResultadoLiquidoExcel);
        rTotal.push(totalResultadoLiquidoExcel / nMesesExcel);
        dados.push(rTotal);

        var ws = XLSX.utils.aoa_to_sheet(dados);
        XLSX.utils.book_append_sheet(wb, ws, 'Fluxo de Caixa');
        XLSX.writeFile(wb, 'FluxoCaixaGerencial_' + (new Date().toISOString().slice(0,10)) + '.xlsx');
        showMessage('Exportação concluída.');
      }

      document.addEventListener('DOMContentLoaded', function() {
        var def = getDatasDinamicas();
        if (!document.getElementById('dtInicio').value) document.getElementById('dtInicio').value = def.dtInicio;
        if (!document.getElementById('dtFim').value) document.getElementById('dtFim').value = def.dtFim;
        var chk = document.getElementById('chkAnaliseHorizontalAtual');
        if (chk) {
          chk.addEventListener('change', function() {
            if ((rawData || []).length > 0) renderTabela();
          });
        }
        document.getElementById('btnCloseDetail').addEventListener('click', closeDetalheNatureza);
        document.getElementById('detailOverlay').addEventListener('click', function(e) {
          if (e.target && e.target.id === 'detailOverlay') closeDetalheNatureza();
        });
        document.getElementById('tbodyFluxo').addEventListener('click', function(e) {
          var target = e.target;
          if (!target || !target.classList || !target.classList.contains('nat-link')) return;
          var codnat = target.getAttribute('data-codnat');
          var codcencus = target.getAttribute('data-codcencus');
          var descrnat = target.getAttribute('data-descrnat') || '';
          var descrcencus = target.getAttribute('data-descrcencus') || '';
          abrirDetalheNatureza(codnat, codcencus, descrnat, descrcencus);
        });
      });
      window.carregarDados = carregarDados;
      window.exportarExcel = exportarExcel;
      window.exportarDetalheExcel = exportarDetalheExcel;
      window.toggleCentro = toggleCentro;
    })();
  </script>
</body>
</html>
