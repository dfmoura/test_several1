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
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding-top: 40px !important;
      min-height: 100vh;
    }
    .fixed-header {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 40px;
      background: linear-gradient(135deg, #008a70, #00695e);
      box-shadow: 0 4px 20px rgba(0, 138, 112, 0.35);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 20px;
    }
    .header-title {
      color: white;
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
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 138, 112, 0.1);
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
      color: #6e6e6e;
      font-weight: 600;
      white-space: nowrap;
    }
    .filter-input {
      width: 100px;
      padding: 6px 10px;
      border: 1px solid #ebebeb;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .filter-input:focus {
      outline: none;
      border-color: #00afa0;
      box-shadow: 0 0 0 2px rgba(0, 175, 160, 0.15);
    }
    .btn-filter {
      background: linear-gradient(135deg, #00afa0, #008a70);
      color: white;
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
      filter: brightness(1.08);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 138, 112, 0.3);
    }
    .btn-excel {
      background: linear-gradient(135deg, #059669, #047857);
      color: white;
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
      filter: brightness(1.08);
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
    }
    .card-panel {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 14px rgba(0, 138, 112, 0.08);
      margin-bottom: 20px;
      overflow: hidden;
    }
    .card-panel-title {
      background: linear-gradient(135deg, #008a70, #00695e);
      color: white;
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
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .tree-table th {
      padding: 10px 8px;
      text-align: right;
      font-weight: 600;
      color: #334155;
      border-bottom: 2px solid #cbd5e1;
      white-space: nowrap;
    }
    .tree-table th.text-left { text-align: left; }
    .tree-table th.col-expand { width: 36px; text-align: center; }
    .tree-table th.month-col { min-width: 120px; }
    .tree-table th.col-total { min-width: 100px; }
    .tree-table td {
      padding: 8px;
      border-bottom: 1px solid #f1f5f9;
      text-align: right;
      color: #475569;
      vertical-align: top;
    }
    .tree-table td.text-left { text-align: left; }
    .tree-table tbody tr.parent-row {
      background: #fafbfc;
      font-weight: 600;
    }
    .tree-table tbody tr.parent-row:hover {
      background: #f1f5f9;
    }
    .tree-table tbody tr.child-row {
      background: #fff;
    }
    .tree-table tbody tr.child-row:hover {
      background: #f8fafc;
    }
    .tree-table tbody tr.child-row td:first-child { padding-left: 24px; }
    .tree-table tbody tr.row-total {
      background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
      font-weight: 700;
      color: #0f766e;
    }
    .expand-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      cursor: pointer;
      user-select: none;
      background: #e2e8f0;
      border-radius: 4px;
      color: #475569;
      font-weight: 700;
      font-size: 12px;
      transition: background 0.2s;
    }
    .expand-toggle:hover {
      background: #cbd5e1;
      color: #334155;
    }
    .expand-toggle.no-children {
      visibility: hidden;
    }
    .cell-value {
      font-weight: 600;
      color: #008a70;
      white-space: nowrap;
    }
    .cell-analysis {
      font-size: 0.7rem;
      color: #64748b;
      margin-top: 2px;
      line-height: 1.3;
    }
    .cell-analysis .pct-v { color: #0ea5e9; }
    .cell-analysis .pct-h { color: #8b5cf6; }
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255,255,255,0.92);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    }
    .loading-spinner {
      width: 44px;
      height: 44px;
      border: 3px solid #e2e8f0;
      border-top-color: #008a70;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { margin-top: 12px; color: #475569; font-weight: 500; font-size: 0.9rem; }
    .error-msg {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: white;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 12px;
      text-align: center;
      font-weight: 500;
    }
    .success-msg {
      background: linear-gradient(135deg, #059669, #047857);
      color: white;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 12px;
      text-align: center;
      font-weight: 500;
    }
    .empty-msg {
      text-align: center;
      padding: 32px;
      color: #64748b;
      font-size: 0.95rem;
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

  <script>
    (function() {
      'use strict';

      var rawData = [];
      var mesesOrdenados = [];
      var centrosMap = {};
      var naturezasPorCentro = {};
      var totaisPorMes = {};
      var totalGeral = 0;
      var expandedCentros = {};
      var baseCentroMes = {};

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
        var strInt = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        var strDec = (decPart < 10 ? '0' : '') + decPart;
        return s + strInt + ',' + strDec;
      }
      function formatPct(num) {
        if (num == null || isNaN(num)) return '-';
        var n = Number(num);
        var s = (n < 0 ? '-' : '') + Math.abs(n).toFixed(1).replace('.', ',');
        return s + '%';
      }

      function buildSQL(dtInicio, dtFim) {
        return [
          "SELECT",
          "  TO_CHAR(rat.dhbaixa,'YYYY') AS ANO,",
          "  TO_CHAR(rat.dhbaixa,'MM') AS MES,",
          "  TO_CHAR(rat.dhbaixa,'MM/YYYY') AS MES_ANO,",
          "  cus.codcencus,",
          "  cus.descrcencus,",
          "  CRN.CODNAT,",
          "  NAT.DESCRNAT,",
          "  NVL(SUM(CASE WHEN rat.recdesp = -1 THEN rat.vlrbaixa * -1 ELSE rat.vlrbaixa END), 0) AS vlrbaixa",
          "FROM tsicus cus",
          "LEFT JOIN TGFCRN CRN ON cus.codcencus = CRN.codcencus",
          "LEFT JOIN VGFFINRAT rat ON CRN.codnat = rat.codnat",
          "LEFT JOIN TGFNAT NAT ON rat.CODNAT = NAT.CODNAT",
          "WHERE cus.codcencus >= 160000",
          "  AND rat.dhbaixa IS NOT NULL",
          "  AND TRUNC(rat.dhbaixa) BETWEEN TO_DATE('" + dtInicio + "','DD/MM/YYYY') AND TO_DATE('" + dtFim + "','DD/MM/YYYY')",
          "GROUP BY",
          "  TO_CHAR(rat.dhbaixa,'YYYY'), TO_CHAR(rat.dhbaixa,'MM'), TO_CHAR(rat.dhbaixa,'MM/YYYY'),",
          "  cus.codcencus, cus.descrcencus, CRN.CODNAT, NAT.DESCRNAT",
          "ORDER BY 1, 2, 4, 6"
        ].join(' ');
      }

      function agregarDados(rows) {
        var mesesSet = {};
        centrosMap = {};
        naturezasPorCentro = {};
        totaisPorMes = {};
        totalGeral = 0;

        (rows || []).forEach(function(r) {
          var mesAno = (r.MES_ANO || '').toString().trim();
          if (mesAno) mesesSet[mesAno] = true;

          var cod = (r.CODCENCUS != null) ? Number(r.CODCENCUS) : 0;
          var desc = (r.DESCRCENCUS != null) ? String(r.DESCRCENCUS).trim() : '';
          var codnat = (r.CODNAT != null) ? Number(r.CODNAT) : 0;
          var descnat = (r.DESCRNAT != null) ? String(r.DESCRNAT).trim() : '';
          var vlr = parseFloat(r.VLRBAIXA) || 0;

          var keyC = cod + '|' + desc;
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

      function cellHtml(v, baseVertical, baseHorizontal, showAnalysis) {
        var valor = v || 0;
        if (!showAnalysis)
          return '<span class="cell-value">' + formatBR(valor) + '</span>';
        var pctV = (baseVertical && baseVertical !== 0) ? (valor / baseVertical * 100) : null;
        var pctH = (baseHorizontal && baseHorizontal !== 0) ? (valor / baseHorizontal * 100) : null;
        var txtV = (pctV == null) ? '-' : formatPct(pctV);
        var txtH = (pctH == null) ? '-' : formatPct(pctH);
        return '<span class="cell-value">' + formatBR(valor) + '</span>' +
          '<div class="cell-analysis"><span class="pct-v">V: ' + txtV + '</span> <span class="pct-h">H: ' + txtH + '</span></div>';
      }

      function renderTabela() {
        var thead = document.getElementById('theadFluxo');
        var tbody = document.getElementById('tbodyFluxo');
        var empty = document.getElementById('emptyFluxo');
        var keysCentro = Object.keys(centrosMap);

        if (keysCentro.length === 0) {
          thead.innerHTML = '';
          tbody.innerHTML = '';
          empty.style.display = 'block';
          return;
        }
        empty.style.display = 'none';

        var baseMes = mesesOrdenados.length > 0 ? mesesOrdenados[0] : null;

        var tr = '<tr><th class="col-expand text-left"></th><th class="text-left">Cód. Centro</th><th class="text-left">Centro de Custo</th><th class="text-left">Cód. Nat.</th><th class="text-left">Natureza</th>';
        mesesOrdenados.forEach(function(m) {
          tr += '<th class="month-col">' + m + '</th>';
        });
        tr += '<th class="col-total">Total</th></tr>';
        thead.innerHTML = tr;

        var html = '';
        keysCentro.forEach(function(keyC) {
          var centro = centrosMap[keyC];
          var children = naturezasPorCentro[keyC] || [];
          var isExpanded = expandedCentros[keyC] === true;
          var hasChildren = children.length > 0;

          var expandIcon = hasChildren ? (isExpanded ? '−' : '+') : '';
          var expandClass = hasChildren ? 'expand-toggle' : 'expand-toggle no-children';
          var expandClick = hasChildren ? ('onclick="event.stopPropagation(); toggleCentro(\'' + keyC.replace(/'/g, "\\'") + '\')"') : '';

          html += '<tr class="parent-row" data-key="' + keyC.replace(/"/g, '&quot;') + '">';
          html += '<td class="text-left"><span class="' + expandClass + '" ' + expandClick + '>' + expandIcon + '</span></td>';
          html += '<td class="text-left">' + (centro.codcencus || '') + '</td>';
          html += '<td class="text-left">' + (centro.descrcencus || '') + '</td>';
          html += '<td class="text-left">—</td>';
          html += '<td class="text-left">—</td>';
          var baseHorizontalCentro = baseMes ? (centro.meses[baseMes] || 0) : 0;
          mesesOrdenados.forEach(function(m) {
            var v = centro.meses[m] || 0;
            var baseV = baseCentroMes[m] || 0;
            html += '<td>' + cellHtml(v, baseV, baseHorizontalCentro, true) + '</td>';
          });
          html += '<td class="cell-value">' + formatBR(centro.total) + '</td>';
          html += '</tr>';

          var safeKey = keyC.replace(/\|/g, '_').replace(/"/g, '').replace(/'/g, '');
          children.forEach(function(nat) {
            html += '<tr class="child-row" data-parent="' + safeKey + '" style="display:' + (isExpanded ? 'table-row' : 'none') + '">';
            html += '<td class="text-left"></td>';
            html += '<td class="text-left">' + (nat.codcencus || '') + '</td>';
            html += '<td class="text-left">' + (nat.descrcencus || '') + '</td>';
            html += '<td class="text-left">' + (nat.codnat || '') + '</td>';
            html += '<td class="text-left">' + (nat.descrnat || '') + '</td>';
            var baseHorizontalNat = baseMes ? (nat.meses[baseMes] || 0) : 0;
            mesesOrdenados.forEach(function(m) {
              var v = nat.meses[m] || 0;
              var baseV = centro.meses[m] || 0;
              html += '<td>' + cellHtml(v, baseV, baseHorizontalNat, true) + '</td>';
            });
            html += '<td class="cell-value">' + formatBR(nat.total) + '</td>';
            html += '</tr>';
          });
        });

        var trTotal = '<tr class="row-total"><td class="text-left" colspan="5">Total</td>';
        mesesOrdenados.forEach(function(m) {
          trTotal += '<td>' + formatBR(totaisPorMes[m] || 0) + '</td>';
        });
        trTotal += '<td>' + formatBR(totalGeral) + '</td></tr>';
        tbody.innerHTML = html + trTotal;
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

      function exportarExcel() {
        if (typeof XLSX === 'undefined') {
          showMessage('Biblioteca XLSX não carregada.', true);
          return;
        }
        var wb = XLSX.utils.book_new();
        var headers = ['Cód. Centro', 'Centro de Custo', 'Cód. Nat.', 'Natureza'].concat(mesesOrdenados).concat(['Total']);
        var dados = [headers];
        var keysCentro = Object.keys(centrosMap);
        keysCentro.forEach(function(keyC) {
          var centro = centrosMap[keyC];
          var r = [centro.codcencus, centro.descrcencus, '', ''];
          mesesOrdenados.forEach(function(m) { r.push(centro.meses[m] || 0); });
          r.push(centro.total);
          dados.push(r);
          (naturezasPorCentro[keyC] || []).forEach(function(nat) {
            var rn = [nat.codcencus, nat.descrcencus, nat.codnat, nat.descrnat];
            mesesOrdenados.forEach(function(m) { rn.push(nat.meses[m] || 0); });
            rn.push(nat.total);
            dados.push(rn);
          });
        });
        var rTotal = ['Total', '', '', ''];
        mesesOrdenados.forEach(function(m) { rTotal.push(totaisPorMes[m] || 0); });
        rTotal.push(totalGeral);
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
      });
      window.carregarDados = carregarDados;
      window.exportarExcel = exportarExcel;
      window.toggleCentro = toggleCentro;
    })();
  </script>
</body>
</html>
