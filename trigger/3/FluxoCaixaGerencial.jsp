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
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%); padding-top: 40px !important; min-height: 100vh; }
    .fixed-header {
      position: fixed; top: 0; left: 0; width: 100%; height: 40px;
      background: linear-gradient(135deg, #0e7490, #0f766e);
      box-shadow: 0 4px 20px rgba(14, 116, 144, 0.35);
      z-index: 1000;
      display: flex; align-items: center; justify-content: center; padding: 0 20px;
    }
    .header-title { color: white; font-size: 1.05rem; font-weight: 700; margin: 0; letter-spacing: 0.5px; }
    .main-container { padding: 12px 16px 24px; margin-top: 0; max-width: 100%; }
    .filter-container {
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 12px rgba(14, 116, 144, 0.1);
      padding: 14px 18px;
      margin-bottom: 16px;
      display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;
    }
    .filter-group { display: flex; align-items: center; gap: 8px; }
    .filter-label { font-size: 0.8rem; color: #475569; font-weight: 600; white-space: nowrap; }
    .filter-input {
      width: 130px; padding: 8px 10px;
      border: 1px solid #e2e8f0; border-radius: 6px;
      font-size: 0.85rem;
    }
    .filter-input:focus { outline: none; border-color: #0e7490; box-shadow: 0 0 0 2px rgba(14, 116, 144, 0.15); }
    .btn-filter {
      background: linear-gradient(135deg, #0e7490, #0f766e);
      color: white; border: none; padding: 8px 18px;
      border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .btn-filter:hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(14, 116, 144, 0.3); }
    .btn-excel {
      background: linear-gradient(135deg, #059669, #047857);
      color: white; border: none; padding: 8px 16px;
      border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .btn-excel:hover { filter: brightness(1.08); box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); }
    .card-panel {
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 14px rgba(14, 116, 144, 0.08);
      margin-bottom: 20px;
      overflow: hidden;
    }
    .card-panel-title {
      background: linear-gradient(135deg, #0e7490, #0f766e);
      color: white; padding: 12px 18px; font-size: 1rem; font-weight: 700;
      display: flex; align-items: center; gap: 10px;
    }
    .table-wrap { overflow-x: auto; width: 100%; }
    .dash-table {
      width: 100%; border-collapse: collapse; font-size: 0.8rem;
      min-width: 600px;
    }
    .dash-table thead { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); position: sticky; top: 0; z-index: 10; }
    .dash-table th {
      padding: 10px 10px; text-align: right; font-weight: 600; color: #334155;
      border-bottom: 2px solid #cbd5e1; white-space: nowrap;
    }
    .dash-table th.text-left { text-align: left; }
    .dash-table th.month-col { min-width: 100px; }
    .dash-table td {
      padding: 8px 10px; border-bottom: 1px solid #f1f5f9;
      text-align: right; color: #475569;
    }
    .dash-table td.text-left { text-align: left; }
    .dash-table tbody tr:hover { background: #f8fafc; }
    .dash-table .row-total { background: #f1f5f9; font-weight: 700; color: #0f766e; }
    .cell-val { font-weight: 600; color: #0e7490; }
    .cell-pct-v { font-size: 0.7rem; color: #64748b; }
    .cell-pct-h { font-size: 0.7rem; color: #94a3b8; }
    .loading-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(255,255,255,0.92);
      display: flex; justify-content: center; align-items: center;
      z-index: 9999; backdrop-filter: blur(4px);
    }
    .loading-spinner {
      width: 44px; height: 44px;
      border: 3px solid #e2e8f0; border-top-color: #0e7490;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { margin-top: 12px; color: #475569; font-weight: 500; font-size: 0.9rem; }
    .error-msg { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; text-align: center; font-weight: 500; }
    .success-msg { background: linear-gradient(135deg, #059669, #047857); color: white; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; text-align: center; font-weight: 500; }
    .empty-msg { text-align: center; padding: 32px; color: #64748b; font-size: 0.95rem; }
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
        <i class="fas fa-building"></i> Totais por Centro de Custo
      </div>
      <div class="table-wrap">
        <table class="dash-table" id="tabelaCentro">
          <thead id="theadCentro"></thead>
          <tbody id="tbodyCentro"></tbody>
        </table>
      </div>
      <div id="emptyCentro" class="empty-msg" style="display:none;">Selecione o período e clique em Aplicar.</div>
    </div>

    <div class="card-panel">
      <div class="card-panel-title">
        <i class="fas fa-layer-group"></i> Totais por Centro de Custo e Natureza
      </div>
      <div class="table-wrap">
        <table class="dash-table" id="tabelaNatureza">
          <thead id="theadNatureza"></thead>
          <tbody id="tbodyNatureza"></tbody>
        </table>
      </div>
      <div id="emptyNatureza" class="empty-msg" style="display:none;">Selecione o período e clique em Aplicar.</div>
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
      var totaisPorCentro = [];
      var totaisPorCentroNatureza = [];

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
          "  AND TRUNC(rat.dhbaixa) BETWEEN TO_DATE('" + dtInicio + "','DD/MM/YYYY') AND TO_DATE('" + dtFim + "','DD/MM/YYYY')",
          "GROUP BY",
          "  TO_CHAR(rat.dhbaixa,'YYYY'), TO_CHAR(rat.dhbaixa,'MM'), TO_CHAR(rat.dhbaixa,'MM/YYYY'),",
          "  cus.codcencus, cus.descrcencus, CRN.CODNAT, NAT.DESCRNAT",
          "ORDER BY 1, 2, 4, 6"
        ].join(' ');
      }

      function agregarDados(rows) {
        var mesesSet = {};
        var byCentro = {};
        var byCentroNat = {};

        (rows || []).forEach(function(r) {
          var mesAno = (r.MES_ANO || '').toString().trim();
          if (mesAno) mesesSet[mesAno] = true;

          var cod = (r.CODCENCUS != null) ? Number(r.CODCENCUS) : 0;
          var desc = (r.DESCRCENCUS != null) ? String(r.DESCRCENCUS).trim() : '';
          var codnat = (r.CODNAT != null) ? Number(r.CODNAT) : 0;
          var descnat = (r.DESCRNAT != null) ? String(r.DESCRNAT).trim() : '';
          var vlr = parseFloat(r.VLRBAIXA) || 0;

          var keyC = cod + '|' + desc;
          if (!byCentro[keyC]) byCentro[keyC] = { codcencus: cod, descrcencus: desc, meses: {}, total: 0 };
          if (!byCentro[keyC].meses[mesAno]) byCentro[keyC].meses[mesAno] = 0;
          byCentro[keyC].meses[mesAno] += vlr;
          byCentro[keyC].total += vlr;

          var keyN = keyC + '|' + codnat + '|' + descnat;
          if (!byCentroNat[keyN]) byCentroNat[keyN] = { codcencus: cod, descrcencus: desc, codnat: codnat, descrnat: descnat, meses: {}, total: 0 };
          if (!byCentroNat[keyN].meses[mesAno]) byCentroNat[keyN].meses[mesAno] = 0;
          byCentroNat[keyN].meses[mesAno] += vlr;
          byCentroNat[keyN].total += vlr;
        });

        mesesOrdenados = Object.keys(mesesSet).sort(function(a, b) {
          var pa = a.split('/'), pb = b.split('/');
          if (pa.length !== 2 || pb.length !== 2) return a.localeCompare(b);
          var am = parseInt(pa[0], 10), ay = parseInt(pa[1], 10);
          var bm = parseInt(pb[0], 10), by = parseInt(pb[1], 10);
          if (ay !== by) return ay - by;
          return am - bm;
        });

        totaisPorCentro = Object.keys(byCentro).map(function(k) { return byCentro[k]; });
        totaisPorCentroNatureza = Object.keys(byCentroNat).map(function(k) { return byCentroNat[k]; });
      }

      function totaisPorMes(lista) {
        var t = {};
        mesesOrdenados.forEach(function(m) { t[m] = 0; });
        lista.forEach(function(row) {
          mesesOrdenados.forEach(function(m) {
            t[m] += row.meses[m] || 0;
          });
        });
        return t;
      }

      function renderTabelaCentro() {
        var thead = document.getElementById('theadCentro');
        var tbody = document.getElementById('tbodyCentro');
        var empty = document.getElementById('emptyCentro');

        if (totaisPorCentro.length === 0) {
          thead.innerHTML = '';
          tbody.innerHTML = '';
          empty.style.display = 'block';
          return;
        }
        empty.style.display = 'none';

        var totaisMes = totaisPorMes(totaisPorCentro);
        var totalGeral = 0;
        mesesOrdenados.forEach(function(m) { totalGeral += totaisMes[m] || 0; });

        var tr = '<tr><th class="text-left">Código</th><th class="text-left">Centro de Custo</th>';
        mesesOrdenados.forEach(function(m) {
          tr += '<th class="month-col">' + m + '</th>';
        });
        tr += '<th class="month-col">Total</th></tr>';
        thead.innerHTML = tr;

        var html = '';
        totaisPorCentro.forEach(function(row) {
          var totalLinha = row.total;
          html += '<tr>';
          html += '<td class="text-left">' + (row.codcencus || '') + '</td>';
          html += '<td class="text-left">' + (row.descrcencus || '') + '</td>';
          mesesOrdenados.forEach(function(m) {
            var v = row.meses[m] || 0;
            var pctCol = (totaisMes[m] && totaisMes[m] !== 0) ? (v / totaisMes[m] * 100) : 0;
            var pctLin = totalLinha !== 0 ? (v / totalLinha * 100) : 0;
            html += '<td><span class="cell-val">' + formatBR(v) + '</span><br><span class="cell-pct-v">% col: ' + formatPct(pctCol) + '</span> <span class="cell-pct-h">% lin: ' + formatPct(pctLin) + '</span></td>';
          });
          html += '<td class="cell-val">' + formatBR(totalLinha) + '</td></tr>';
        });
        tr = '<tr class="row-total"><td class="text-left" colspan="2">Total</td>';
        mesesOrdenados.forEach(function(m) {
          var v = totaisMes[m] || 0;
          tr += '<td>' + formatBR(v) + '</td>';
        });
        tr += '<td>' + formatBR(totalGeral) + '</td></tr>';
        tbody.innerHTML = html + tr;
      }

      function renderTabelaNatureza() {
        var thead = document.getElementById('theadNatureza');
        var tbody = document.getElementById('tbodyNatureza');
        var empty = document.getElementById('emptyNatureza');

        if (totaisPorCentroNatureza.length === 0) {
          thead.innerHTML = '';
          tbody.innerHTML = '';
          empty.style.display = 'block';
          return;
        }
        empty.style.display = 'none';

        var totaisMes = totaisPorMes(totaisPorCentroNatureza);
        var totalGeral = 0;
        mesesOrdenados.forEach(function(m) { totalGeral += totaisMes[m] || 0; });

        var tr = '<tr><th class="text-left">Cód.Centro</th><th class="text-left">Centro de Custo</th><th class="text-left">Cód.Nat.</th><th class="text-left">Natureza</th>';
        mesesOrdenados.forEach(function(m) {
          tr += '<th class="month-col">' + m + '</th>';
        });
        tr += '<th class="month-col">Total</th></tr>';
        thead.innerHTML = tr;

        var html = '';
        totaisPorCentroNatureza.forEach(function(row) {
          var totalLinha = row.total;
          html += '<tr>';
          html += '<td class="text-left">' + (row.codcencus || '') + '</td>';
          html += '<td class="text-left">' + (row.descrcencus || '') + '</td>';
          html += '<td class="text-left">' + (row.codnat || '') + '</td>';
          html += '<td class="text-left">' + (row.descrnat || '') + '</td>';
          mesesOrdenados.forEach(function(m) {
            var v = row.meses[m] || 0;
            var pctCol = (totaisMes[m] && totaisMes[m] !== 0) ? (v / totaisMes[m] * 100) : 0;
            var pctLin = totalLinha !== 0 ? (v / totalLinha * 100) : 0;
            html += '<td><span class="cell-val">' + formatBR(v) + '</span><br><span class="cell-pct-v">% col: ' + formatPct(pctCol) + '</span> <span class="cell-pct-h">% lin: ' + formatPct(pctLin) + '</span></td>';
          });
          html += '<td class="cell-val">' + formatBR(totalLinha) + '</td></tr>';
        });
        var tr2 = '<tr class="row-total"><td class="text-left" colspan="4">Total</td>';
        mesesOrdenados.forEach(function(m) {
          tr2 += '<td>' + formatBR(totaisMes[m] || 0) + '</td>';
        });
        tr2 += '<td>' + formatBR(totalGeral) + '</td></tr>';
        tbody.innerHTML = html + tr2;
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
        var sql = buildSQL(dtInicio, dtFim);

        JX.consultar(sql).then(function(result) {
          rawData = result || [];
          agregarDados(rawData);
          renderTabelaCentro();
          renderTabelaNatureza();
          document.getElementById('btnExcel').disabled = rawData.length === 0;
          showMessage(rawData.length + ' registro(s) carregado(s).');
        }).catch(function(err) {
          rawData = [];
          totaisPorCentro = [];
          totaisPorCentroNatureza = [];
          mesesOrdenados = [];
          renderTabelaCentro();
          renderTabelaNatureza();
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
        var totaisMesC = totaisPorMes(totaisPorCentro);
        var totalGeralC = 0;
        mesesOrdenados.forEach(function(m) { totalGeralC += totaisMesC[m] || 0; });

        var dadosCentro = [];
        dadosCentro.push(['Código', 'Centro de Custo'].concat(mesesOrdenados).concat(['Total']));
        totaisPorCentro.forEach(function(row) {
          var totalLinha = row.total;
          var r = [row.codcencus, row.descrcencus];
          mesesOrdenados.forEach(function(m) {
            r.push(row.meses[m] || 0);
          });
          r.push(totalLinha);
          dadosCentro.push(r);
        });
        var rTotal = ['Total', ''];
        mesesOrdenados.forEach(function(m) { rTotal.push(totaisMesC[m] || 0); });
        rTotal.push(totalGeralC);
        dadosCentro.push(rTotal);

        var wsC = XLSX.utils.aoa_to_sheet(dadosCentro);
        XLSX.utils.book_append_sheet(wb, wsC, 'Por Centro de Custo');

        var totaisMesN = totaisPorMes(totaisPorCentroNatureza);
        var totalGeralN = 0;
        mesesOrdenados.forEach(function(m) { totalGeralN += totaisMesN[m] || 0; });
        var dadosNat = [];
        dadosNat.push(['Cód.Centro', 'Centro de Custo', 'Cód.Nat.', 'Natureza'].concat(mesesOrdenados).concat(['Total']));
        totaisPorCentroNatureza.forEach(function(row) {
          var r = [row.codcencus, row.descrcencus, row.codnat, row.descrnat];
          mesesOrdenados.forEach(function(m) { r.push(row.meses[m] || 0); });
          r.push(row.total);
          dadosNat.push(r);
        });
        var rTotalN = ['Total', '', '', ''];
        mesesOrdenados.forEach(function(m) { rTotalN.push(totaisMesN[m] || 0); });
        rTotalN.push(totalGeralN);
        dadosNat.push(rTotalN);
        var wsN = XLSX.utils.aoa_to_sheet(dadosNat);
        XLSX.utils.book_append_sheet(wb, wsN, 'Por Centro e Natureza');

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
    })();
  </script>
</body>
</html>
