<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8"
pageEncoding="UTF-8"%> <%@ page import="java.util.*" %> <%@ taglib
uri="http://java.sun.com/jstl/core_rt" prefix="c" %> <%@ taglib prefix="snk"
uri="/WEB-INF/tld/sankhyaUtil.tld" %> <%@ taglib prefix="fmt"
uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custo Entrega — Gerir Entregas</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <style>
        body { background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .section-header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 15px; margin-bottom: 20px; border-radius: 8px 0 8px 0; }
        .kpi-card { background: linear-gradient(135deg, #e3f2fd, #bbdefb); border: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 15px; cursor: pointer; }
        .kpi-card h5 { color: #1976d2; }
        .indicator-value { font-size: 1.5em; font-weight: bold; }
        .positive { color: #28a745; }
        .warning { color: #ffc107; }
        .negative { color: #dc3545; }
        .obs-note { font-size: 0.85em; color: #6c757d; font-style: italic; }
        .progress { height: 20px; margin-top: 5px; }
        .chart-container { position: relative; height: 400px; width: 100%; margin-top: 20px; }
        .card-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
        .kpi-card:hover .card-overlay { opacity: 1; }
        .card-overlay i { font-size: 2em; color: #007bff; }
        .sidebar { background: white; border-right: 1px solid #dee2e6; height: 100vh; position: fixed; left: 0; top: 0; z-index: 1000; padding: 20px; width: 300px; transition: transform 0.3s ease-in-out; }
        .sidebar.hidden { transform: translateX(-100%); }
        .sidebar h5 { margin-bottom: 15px; color: #007bff; }
        .sidebar .form-label { font-weight: bold; color: #6c757d; }
        .sidebar select[multiple] { height: 150px; }
        .main-content { margin-left: 300px; padding: 20px; transition: margin-left 0.3s ease-in-out; }
        .main-content.expanded { margin-left: 0; }
        .filter-toggle-btn { position: fixed; top: 15px; left: 15px; z-index: 1001; background: #007bff; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease; }
        .filter-toggle-btn:hover { background: #0056b3; transform: scale(1.1); }
        .filter-toggle-btn.sidebar-visible { left: 315px; }
        @media (max-width: 768px) { .sidebar { display: none; } .main-content { margin-left: 0; } .filter-toggle-btn { display: none; } }
        .kpi-selected { border-color: #007bff !important; box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25); }
        .detail-chart { margin-bottom: 20px; }
        .detail-chart h6 { color: #007bff; }
        #detail-view { min-height: calc(100vh - 200px); padding: 20px 0; }
        .kpi-cards-row { margin-bottom: 20px; }
        .kpi-charts-row { margin-top: 30px; }
        .loading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; z-index: 9999; }
        .loading-spinner { border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
    <snk:load/>
</head>
<body>

    <button class="filter-toggle-btn" id="filterToggleBtn" onclick="toggleFilters()" title="Mostrar/Esconder Filtros">
        <i class="bi bi-funnel" id="filterToggleIcon"></i>
    </button>

    <div class="sidebar" id="sidebarFilters">
        <div class="card">
            <div class="card-body">
                <h5><i class="bi bi-funnel me-2"></i>Filtros</h5>
                <div class="mb-3">
                    <label for="dataIni" class="form-label">Data Inicial</label>
                    <input type="date" class="form-control" id="dataIni" value="2026-01-01">
                </div>
                <div class="mb-3">
                    <label for="dataFin" class="form-label">Data Final</label>
                    <input type="date" class="form-control" id="dataFin" value="2026-01-31">
                </div>
                <div class="mb-3">
                    <label for="empresas" class="form-label">Empresas (CDs)</label>
                    <select multiple class="form-control" id="empresas"></select>
                    <small class="text-muted">Selecione múltiplas opções (Ctrl+clique)</small>
                </div>
                <button class="btn btn-primary w-100" onclick="applyFilters()">Aplicar Filtros</button>
            </div>
        </div>
    </div>

    <div id="loadingOverlay" class="loading-overlay" style="display: none;">
        <div>
            <div class="loading-spinner"></div>
            <p class="mt-3">Carregando dados...</p>
        </div>
    </div>

    <div class="main-content" id="mainContent">
        <div class="container-fluid py-4">
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="text-center mb-2">Painel Indicador — Custo Entrega</h1>
                    <p class="text-center text-muted" id="subtitlePeriodo">Gerir Entregas</p>
                </div>
            </div>

            <div class="tab-pane" id="gerir-entregas">
                <div class="section-header">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h3 class="mb-0"><i class="bi bi-truck me-2"></i>Gerir Entregas</h3>
                        </div>
                        <div class="col-md-4 text-end">
                            <small>Extrato estoque (TOP 232+233) / TOP 1101 — % no período</small>
                        </div>
                    </div>
                </div>

                <div class="row mb-4 kpi-cards-row" id="kpi-cards">
                    <div class="col-lg-4 col-md-6">
                        <div class="card kpi-card card-clickable kpi-selected" data-kpi="custoEntrega" id="cardCustoEntrega">
                            <div class="card-overlay">
                                <i class="bi bi-graph-up"></i>
                            </div>
                            <div class="card-body">
                                <h5 class="card-title"><i class="bi bi-currency-dollar text-warning me-2"></i>Custo entrega</h5>
                                <p class="indicator-name mb-2">(TOP 232 + TOP 233) / TOP 1101 — participação por item na nota</p>
                                <div class="indicator-value warning" id="custoEntregaValue">-</div>
                                <div class="progress">
                                    <div class="progress-bar bg-warning" id="custoEntregaProgress" style="width: 0%"></div>
                                </div>
                                <p class="obs-note">Filtros: intervalo de datas e empresa(s)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mb-4 kpi-charts-row"></div>
            </div>

            <div id="detail-view" class="row mb-4 d-none"></div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        /**
         * SankhyaJX.consultar monta o corpo com JSON.parse em string template (jx.js), o que quebra
         * se o SQL contiver aspas duplas ou certas sequências. O mesmo serviço funciona enviando objeto
         * via JX.post → JSON.stringify (padrão do README: https://github.com/wansleynery/SankhyaJX ).
         */
        function parseDbExplorerRows(resposta) {
            const arrayResultado = [];
            if (resposta == null) return arrayResultado;
            let dados;
            try {
                dados = typeof resposta === 'string' ? JSON.parse(resposta) : resposta;
            } catch (e) {
                console.warn('Resposta DbExplorer não é JSON:', e);
                return arrayResultado;
            }
            if (dados.data) dados = dados.data.responseBody;
            else if (dados.responseBody) dados = dados.responseBody;
            if (!dados) return arrayResultado;
            if (dados.statusMessage && String(dados.statusMessage).toLowerCase().indexOf('error') !== -1) {
                console.warn('DbExplorerSP:', dados.statusMessage);
            }
            const nomes = dados.fieldsMetadata || [];
            const valores = dados.rows || [];
            if (!valores.length) return arrayResultado;
            valores.forEach(function(v) {
                const obj = {};
                nomes.forEach(function(n, i) {
                    if (n && n.name != null) obj[n.name] = v[i];
                });
                arrayResultado.push(obj);
            });
            return arrayResultado;
        }

        async function consultarSql(sql) {
            try {
                if (typeof JX === 'undefined' || !JX.post) {
                    console.error('SankhyaJX (JX.post) indisponível');
                    return [];
                }
                const sqlLinha = String(sql).replace(/(\r\n|\n|\r)/gm, ' ');
                const url = window.location.origin + '/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';
                const corpo = {
                    serviceName: 'DbExplorerSP.executeQuery',
                    requestBody: { sql: sqlLinha }
                };
                const resposta = await JX.post(url, corpo, { headers: { 'Content-Type': 'application/json; charset=UTF-8' } });
                return parseDbExplorerRows(resposta);
            } catch (e) {
                console.error('consultarSql:', e);
                return [];
            }
        }

        async function aguardarJX(timeoutMs) {
            const lim = timeoutMs || 8000;
            const t0 = Date.now();
            while (Date.now() - t0 < lim) {
                if (typeof JX !== 'undefined' && JX.post) return true;
                await new Promise(function(r) { setTimeout(r, 80); });
            }
            return false;
        }

        function primeiroValorNumerico(row, nomesPreferidos) {
            if (!row || typeof row !== 'object') return null;
            for (let i = 0; i < nomesPreferidos.length; i++) {
                const k = nomesPreferidos[i];
                if (row[k] !== undefined && row[k] !== null && row[k] !== '') {
                    const n = parseFloat(String(row[k]).replace(',', '.'));
                    if (!isNaN(n)) return n;
                }
            }
            const keys = Object.keys(row);
            for (let j = 0; j < keys.length; j++) {
                const kk = keys[j];
                if (/^perc$/i.test(kk)) {
                    const n = parseFloat(String(row[kk]).replace(',', '.'));
                    if (!isNaN(n)) return n;
                }
            }
            return null;
        }

        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        let selectedPeriod = { start: '2026-01-01', end: '2026-01-31' };
        let selectedEmpresas = [];
        let filteredLabels = ['Jan'];
        let filteredIndices = [0];
        const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1'];

        let custoEntregaRealData = new Array(12).fill(null);

        function toggleFilters() {
            const sidebar = document.getElementById('sidebarFilters');
            const mainContent = document.getElementById('mainContent');
            const toggleBtn = document.getElementById('filterToggleBtn');
            const toggleIcon = document.getElementById('filterToggleIcon');
            if (sidebar.classList.contains('hidden')) {
                sidebar.classList.remove('hidden');
                mainContent.classList.remove('expanded');
                toggleBtn.classList.add('sidebar-visible');
                toggleIcon.className = 'bi bi-funnel';
            } else {
                sidebar.classList.add('hidden');
                mainContent.classList.add('expanded');
                toggleBtn.classList.remove('sidebar-visible');
                toggleIcon.className = 'bi bi-funnel-fill';
            }
        }

        function showLoading(show) {
            document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
        }

        function convertDateToDB(dateStr) {
            if (!dateStr) return '';
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        }

        function formatCurrency(value) {
            if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value);
        }

        function formatDate(dateStr) {
            if (!dateStr) return '';
            if (typeof dateStr === 'string' && dateStr.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/)) {
                return dateStr.replace(/-/g, '/');
            }
            let date;
            if (dateStr instanceof Date) {
                date = dateStr;
            } else if (typeof dateStr === 'string') {
                const match1 = dateStr.match(/^(\d{2})(\d{2})(\d{4})/);
                if (match1) {
                    const [, day, month, year] = match1;
                    return `${day}/${month}/${year}`;
                }
                const match2 = dateStr.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
                if (match2) {
                    const [, year, month, day] = match2;
                    return `${day}/${month}/${year}`;
                }
                date = new Date(dateStr);
            } else {
                return '';
            }
            if (date instanceof Date && !isNaN(date.getTime())) {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            }
            return dateStr;
        }

        async function carregarEmpresas() {
            try {
                const ok = await aguardarJX();
                if (!ok) {
                    console.error('SankhyaJX não está disponível (timeout)');
                    return;
                }
                const sql = 'SELECT CODEMP, NOMEFANTASIA FROM TSIEMP ORDER BY NOMEFANTASIA';
                const result = await consultarSql(sql);
                const empresasSelect = document.getElementById('empresas');
                empresasSelect.innerHTML = '';
                selectedEmpresas = [];
                if (result && result.length > 0) {
                    result.forEach((empresa, index) => {
                        const option = document.createElement('option');
                        option.value = empresa.CODEMP != null ? empresa.CODEMP : empresa.codemp;
                        option.textContent = `${option.value} - ${empresa.NOMEFANTASIA || empresa.nomefantasia || ''}`;
                        if (index < 2) {
                            option.selected = true;
                            selectedEmpresas.push(String(option.value));
                        }
                        empresasSelect.appendChild(option);
                    });
                } else {
                    empresasSelect.innerHTML = '<option value="">Nenhuma empresa encontrada</option>';
                }
            } catch (error) {
                console.error('Erro ao carregar empresas:', error);
                alert('Erro ao carregar empresas: ' + error.message);
            }
        }

        /**
         * Card: PERC = (soma TOP232 + TOP233) / soma TOP1101 no intervalo.
         * Equivalente à query com CTE + PARTICIPACAO_VLRTOT; aqui via JOIN (sem OVER — compatível SankhyaJX).
         */
        function sqlCustoEntregaCard(dtInicial, dtFinal, filtroEmpresa) {
            return `
SELECT
    SUM(CASE WHEN CB.CODTIPOPER = 232 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END) AS TOP232,
    SUM(CASE WHEN CB.CODTIPOPER = 233 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END) AS TOP233,
    SUM(CASE WHEN CB.CODTIPOPER = 1101 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END) AS TOP1101,
    (
        SUM(CASE WHEN CB.CODTIPOPER = 232 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END) +
        SUM(CASE WHEN CB.CODTIPOPER = 233 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END)
    ) / NULLIF(SUM(CASE WHEN CB.CODTIPOPER = 1101 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END), 0) AS PERC
FROM (
    SELECT CAB.NUNOTA, CAB.CODTIPOPER, CAB.VLRNOTA,
           SUM(CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END * ITE.VLRTOT) AS VLRTOT_TOTAL
    FROM TGFITE ITE
    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    WHERE CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
      ${filtroEmpresa}
      AND CAB.STATUSNOTA = 'L'
    GROUP BY CAB.NUNOTA, CAB.CODTIPOPER, CAB.VLRNOTA
) CB
INNER JOIN (
    SELECT CAB.NUNOTA,
           SUM(CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END * ITE.VLRTOT) AS TOTAL_VLRTOT
    FROM TGFITE ITE
    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    WHERE CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
      ${filtroEmpresa}
      AND CAB.STATUSNOTA = 'L'
    GROUP BY CAB.NUNOTA
) TOT ON TOT.NUNOTA = CB.NUNOTA
WHERE CB.CODTIPOPER IN (232, 233, 1101)`;
        }

        function sqlCustoEntregaGrafico(dtInicial, dtFinal, filtroEmpresa) {
            return `
SELECT
    TO_CHAR(TRUNC(CB.DTNEG, 'MM'), 'YYYY') AS ANO,
    TO_CHAR(TRUNC(CB.DTNEG, 'MM'), 'MM') AS MES,
    TO_CHAR(TRUNC(CB.DTNEG, 'MM'), 'MM/YYYY') AS MES_ANO,
    (
        SUM(CASE WHEN CB.CODTIPOPER = 232 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END) +
        SUM(CASE WHEN CB.CODTIPOPER = 233 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END)
    ) / NULLIF(SUM(CASE WHEN CB.CODTIPOPER = 1101 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END), 0) AS PERC
FROM (
    SELECT CAB.DTNEG, CAB.NUNOTA, CAB.CODTIPOPER, CAB.VLRNOTA,
           SUM(CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END * ITE.VLRTOT) AS VLRTOT_TOTAL
    FROM TGFITE ITE
    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    WHERE CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
      ${filtroEmpresa}
      AND CAB.STATUSNOTA = 'L'
    GROUP BY CAB.DTNEG, CAB.NUNOTA, CAB.CODTIPOPER, CAB.VLRNOTA
) CB
INNER JOIN (
    SELECT CAB.NUNOTA,
           SUM(CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END * ITE.VLRTOT) AS TOTAL_VLRTOT
    FROM TGFITE ITE
    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    WHERE CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
      ${filtroEmpresa}
      AND CAB.STATUSNOTA = 'L'
    GROUP BY CAB.NUNOTA
) TOT ON TOT.NUNOTA = CB.NUNOTA
WHERE CB.CODTIPOPER IN (232, 233, 1101)
GROUP BY TRUNC(CB.DTNEG, 'MM')
ORDER BY TRUNC(CB.DTNEG, 'MM')`;
        }

        function sqlCustoEntregaDetalhe(dtInicial, dtFinal, filtroEmpresa) {
            return `
SELECT
    CB.NUNOTA, CB.NUMNOTA, CB.CODEMP, CB.DTNEG, CB.CODTIPOPER,
    CB.CODPARC, CB.NOMEPARC, CB.CODPROD, CB.DESCRPROD, CB.QTDNEG, CB.VOLUME,
    CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) AS VLRNOTA
FROM (
    SELECT
        CAB.CODEMP, CAB.DTNEG, CAB.NUNOTA, CAB.NUMNOTA, CAB.CODTIPOPER,
        CAB.CODPARC, PAR.NOMEPARC, ITE.CODPROD, PRO.DESCRPROD, ITE.QTDNEG,
        SUM(ITE.QTDNEG * PRO.AD_QTDVOLLT) AS VOLUME,
        CAB.VLRNOTA,
        SUM(CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END * ITE.VLRTOT) AS VLRTOT_TOTAL
    FROM TGFITE ITE
    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
    INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
    WHERE CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
      ${filtroEmpresa}
      AND CAB.STATUSNOTA = 'L'
    GROUP BY
        CAB.CODEMP, CAB.DTNEG, CAB.NUNOTA, CAB.NUMNOTA, CAB.CODTIPOPER,
        CAB.CODPARC, PAR.NOMEPARC, ITE.CODPROD, PRO.DESCRPROD, ITE.QTDNEG,
        PRO.AD_QTDVOLLT, CAB.VLRNOTA
) CB
INNER JOIN (
    SELECT CAB.NUNOTA,
           SUM(CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END * ITE.VLRTOT) AS TOTAL_VLRTOT
    FROM TGFITE ITE
    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    WHERE CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
      ${filtroEmpresa}
      AND CAB.STATUSNOTA = 'L'
    GROUP BY CAB.NUNOTA
) TOT ON TOT.NUNOTA = CB.NUNOTA
WHERE CB.CODTIPOPER IN (232, 233, 1101)
ORDER BY CB.CODEMP, CB.DTNEG, CB.NUNOTA, CB.CODPROD`;
        }

        async function carregarCustoEntrega() {
            try {
                if (typeof JX === 'undefined' || !JX.post) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) {
                    document.getElementById('custoEntregaValue').textContent = '-';
                    document.getElementById('custoEntregaProgress').style.width = '0%';
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const codemps = empresasSelecionadas.map(function(e) { return parseInt(e, 10); }).filter(function(n) { return !isNaN(n); });
                if (!codemps.length) {
                    document.getElementById('custoEntregaValue').textContent = '-';
                    document.getElementById('custoEntregaProgress').style.width = '0%';
                    return;
                }
                const filtroEmpresa = `AND CAB.CODEMP IN (${codemps.join(',')})`;
                const sql = sqlCustoEntregaCard(dtInicial, dtFinal, filtroEmpresa);
                const result = await consultarSql(sql);
                const elVal = document.getElementById('custoEntregaValue');
                const elProg = document.getElementById('custoEntregaProgress');
                if (result && result.length > 0) {
                    const ratio = primeiroValorNumerico(result[0], ['PERC', 'perc']);
                    if (ratio !== null && !isNaN(ratio) && ratio >= 0) {
                        const percPct = ratio <= 1 ? ratio * 100 : ratio;
                        elVal.textContent = percPct.toFixed(2) + '%';
                        elVal.className = percPct <= 5 ? 'indicator-value positive' : percPct <= 15 ? 'indicator-value warning' : 'indicator-value negative';
                        const pct = Math.min(100, Math.max(0, percPct));
                        elProg.style.width = pct + '%';
                        elProg.className = percPct <= 5 ? 'progress-bar bg-success' : percPct <= 15 ? 'progress-bar bg-warning' : 'progress-bar bg-danger';
                    } else {
                        elVal.textContent = '-';
                        elProg.style.width = '0%';
                    }
                } else {
                    elVal.textContent = '-';
                    elProg.style.width = '0%';
                }
            } catch (e) {
                console.error('Erro ao carregar Custo Entrega:', e);
                document.getElementById('custoEntregaValue').textContent = 'Erro';
                document.getElementById('custoEntregaProgress').style.width = '0%';
            }
        }

        async function carregarCustoEntregaHistorico() {
            try {
                if (typeof JX === 'undefined' || !JX.post) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) {
                    custoEntregaRealData = [];
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const codempsG = empresasSelecionadas.map(function(e) { return parseInt(e, 10); }).filter(function(n) { return !isNaN(n); });
                const filtroEmpresa = codempsG.length ? `AND CAB.CODEMP IN (${codempsG.join(',')})` : '';
                const sql = sqlCustoEntregaGrafico(dtInicial, dtFinal, filtroEmpresa);
                const result = await consultarSql(sql);
                custoEntregaRealData = new Array(12).fill(null);
                if (result && result.length > 0) {
                    result.forEach(function(row) {
                        const mes = parseInt(row.MES != null ? row.MES : row.mes, 10);
                        const mesIndex = mes - 1;
                        const ratio = primeiroValorNumerico(row, ['PERC', 'perc']);
                        if (!isNaN(mesIndex) && mesIndex >= 0 && mesIndex < 12 && ratio !== null && !isNaN(ratio) && ratio >= 0) {
                            custoEntregaRealData[mesIndex] = ratio <= 1 ? ratio * 100 : ratio;
                        }
                    });
                }
            } catch (e) {
                console.error('Erro ao carregar histórico Custo Entrega:', e);
                custoEntregaRealData = [];
            }
        }

        async function carregarDetalhesCustoEntrega(cd, month, value) {
            try {
                if (typeof JX === 'undefined' || !JX.post) return [];
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) return [];
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const codempsD = empresasSelecionadas.map(function(e) { return parseInt(e, 10); }).filter(function(n) { return !isNaN(n); });
                let filtroEmpresa = codempsD.length ? `AND CAB.CODEMP IN (${codempsD.join(',')})` : '';
                let dtIni = dtInicial, dtFim = dtFinal;
                if (month != null && month !== '') {
                    const year = new Date(dataIni + 'T12:00:00').getFullYear();
                    const range = getMonthDateRange(month, year);
                    if (range) {
                        dtIni = convertDateToDB(range.start);
                        dtFim = convertDateToDB(range.end);
                    }
                }
                const sql = sqlCustoEntregaDetalhe(dtIni, dtFim, filtroEmpresa);
                return await consultarSql(sql) || [];
            } catch (e) {
                console.error('Erro ao carregar detalhes Custo Entrega:', e);
                return [];
            }
        }

        const kpiTitles = { custoEntrega: 'Custo Entrega' };
        const tabToKpis = { 'gerir-entregas': ['custoEntrega'] };

        function getMonthIndex(monthName) {
            const monthMap = {
                Jan: 0, Fev: 1, Mar: 2, Abr: 3, Mai: 4, Jun: 5,
                Jul: 6, Ago: 7, Set: 8, Out: 9, Nov: 10, Dez: 11
            };
            return monthMap[monthName] !== undefined ? monthMap[monthName] : -1;
        }

        function getMonthDateRange(monthName, year) {
            const monthIndex = getMonthIndex(monthName);
            if (monthIndex === -1) return null;
            const startDate = new Date(year, monthIndex, 1);
            const endDate = new Date(year, monthIndex + 1, 0);
            return {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0]
            };
        }

        async function showDetails(kpi, cd, month, value) {
            if (kpi !== 'custoEntrega') return;
            showLoading(true);
            let title = `${kpiTitles[kpi]}${month ? ` - ${month} (${value != null ? Number(value).toFixed(2) + '%' : '-'})` : ' - Detalhamento'}`;
            try {
                const detailData = await carregarDetalhesCustoEntrega(cd || null, month || null, value);
                let tableHTML = `
                    <div class="col-12">
                        <h2>${title}</h2>
                        <table class="table table-striped table-hover" id="detail-table">
                            <thead class="table-dark">
                                <tr>
                                    <th>CODEMP</th>
                                    <th>NUNOTA</th>
                                    <th>NUMNOTA</th>
                                    <th>DTNEG</th>
                                    <th>CODTIPOPER</th>
                                    <th>CODPARC</th>
                                    <th>NOMEPARC</th>
                                    <th>CODPROD</th>
                                    <th>DESCRPROD</th>
                                    <th>QTDNEG</th>
                                    <th>VOLUME</th>
                                    <th>VLRNOTA</th>
                                </tr>
                            </thead>
                            <tbody>`;
                if (detailData && detailData.length > 0) {
                    detailData.forEach(row => {
                        const codemp = row.CODEMP ?? row.codemp ?? '';
                        const nunota = row.NUNOTA ?? row.nunota ?? '';
                        const numnota = row.NUMNOTA ?? row.numnota ?? '';
                        const dtneg = row.DTNEG ?? row.dtneg ?? '';
                        const codtipoper = row.CODTIPOPER ?? row.codtipoper ?? '';
                        const codparc = row.CODPARC ?? row.codparc ?? '';
                        const nomeparc = (row.NOMEPARC ?? row.nomeparc ?? '').toString();
                        const codprod = row.CODPROD ?? row.codprod ?? '';
                        const descrprod = (row.DESCRPROD ?? row.descrprod ?? '').toString();
                        const qtdneg = parseFloat(row.QTDNEG ?? row.qtdneg ?? 0);
                        const volume = parseFloat(row.VOLUME ?? row.volume ?? 0);
                        const vlrnota = parseFloat(row.VLRNOTA ?? row.vlrnota ?? 0);
                        tableHTML += `
                            <tr>
                                <td>${codemp}</td>
                                <td>${nunota}</td>
                                <td>${numnota}</td>
                                <td>${formatDate(dtneg)}</td>
                                <td>${codtipoper}</td>
                                <td>${codparc}</td>
                                <td>${nomeparc}</td>
                                <td>${codprod}</td>
                                <td>${descrprod}</td>
                                <td>${qtdneg}</td>
                                <td>${volume.toFixed(4)}</td>
                                <td>${formatCurrency(vlrnota)}</td>
                            </tr>`;
                    });
                } else {
                    tableHTML += `
                        <tr>
                            <td colspan="12" class="text-center">Nenhum registro encontrado para o período selecionado.</td>
                        </tr>`;
                }
                tableHTML += `
                            </tbody>
                        </table>
                        <div class="mb-3">
                            <button class="btn btn-success me-2" onclick="exportToExcel()">Exportar Excel</button>
                            <button class="btn btn-primary me-2" onclick="exportToPDF()">Exportar PDF</button>
                            <button class="btn btn-secondary" onclick="closeDetail()">Fechar</button>
                        </div>
                    </div>`;
                document.getElementById('detail-view').innerHTML = tableHTML;
            } catch (err) {
                console.error('Erro ao carregar detalhes Custo Entrega:', err);
                alert('Erro ao carregar detalhes: ' + err.message);
            } finally {
                showLoading(false);
            }

            document.querySelectorAll('.kpi-cards-row').forEach(row => row.classList.add('d-none'));
            document.querySelectorAll('.kpi-charts-row').forEach(row => row.classList.add('d-none'));
            document.querySelector('.section-header')?.classList.add('d-none');
            document.getElementById('detail-view').classList.remove('d-none');

            window.currentKPI = kpi;
            window.currentCD = cd;
            window.currentMonth = month;
            window.currentTitle = title;
        }

        window.closeDetail = function() {
            document.getElementById('detail-view').classList.add('d-none');
            document.querySelectorAll('.kpi-cards-row').forEach(row => row.classList.remove('d-none'));
            document.querySelectorAll('.kpi-charts-row').forEach(row => row.classList.remove('d-none'));
            document.querySelector('.section-header')?.classList.remove('d-none');
        };

        window.exportToExcel = function() {
            const wb = XLSX.utils.table_to_book(document.getElementById('detail-table'), { sheet: 'Sheet1' });
            XLSX.writeFile(wb, `${window.currentKPI}_${window.currentCD}_${window.currentMonth}.xlsx`);
        };

        window.exportToPDF = function() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.text(window.currentTitle, 14, 15);
            doc.autoTable({
                html: '#detail-table',
                startY: 20,
                theme: 'striped',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185] }
            });
            doc.save(`${window.currentKPI}_${window.currentCD}_${window.currentMonth}.pdf`);
        };

        function updateSubtitlePeriodo() {
            const dataIni = document.getElementById('dataIni').value;
            const dataFin = document.getElementById('dataFin').value;
            const el = document.getElementById('subtitlePeriodo');
            if (!el) return;
            if (dataIni && dataFin) {
                const fmt = (s) => {
                    const [y, m, d] = s.split('-');
                    return `${d}/${m}/${y}`;
                };
                el.textContent = 'Gerir Entregas — ' + fmt(dataIni) + ' a ' + fmt(dataFin);
            } else {
                el.textContent = 'Gerir Entregas';
            }
        }

        async function applyFilters() {
            showLoading(true);
            try {
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (empresas.length === 0) {
                    alert('Selecione pelo menos uma empresa.');
                    showLoading(false);
                    return;
                }
                selectedPeriod = { start: dataIni, end: dataFin };
                selectedEmpresas = empresas;

                await carregarCustoEntrega();
                await carregarCustoEntregaHistorico();

                const start = new Date(dataIni);
                const end = new Date(dataFin);
                const monthIndices = [];
                let current = new Date(start.getFullYear(), start.getMonth(), 1);
                while (current <= end) {
                    monthIndices.push(current.getMonth());
                    current.setMonth(current.getMonth() + 1);
                    if (current.getFullYear() > end.getFullYear()) break;
                }
                filteredIndices = [...new Set(monthIndices)].sort((a, b) => a - b);
                filteredLabels = filteredIndices.map(m => months[m]);

                updateSubtitlePeriodo();

                const tabPane = document.getElementById('gerir-entregas');
                const container = tabPane.querySelector('.kpi-charts-row');
                if (container) {
                    showAllCharts(container);
                }
            } catch (error) {
                console.error('Erro ao aplicar filtros:', error);
                alert('Erro ao aplicar filtros: ' + error.message);
            } finally {
                showLoading(false);
            }
        }

        function showAllCharts(container) {
            Object.keys(window.charts || {}).forEach(id => {
                try {
                    if (window.charts[id] && typeof window.charts[id].destroy === 'function') {
                        window.charts[id].destroy();
                    }
                } catch (e) { /* ignore */ }
                delete window.charts[id];
            });
            window.charts = {};
            container.innerHTML = '';
            const tabPane = container.closest('.tab-pane');
            const tabId = tabPane.id;
            const kpis = tabToKpis[tabId] || [];
            kpis.forEach(kpi => appendChart(container, kpi));
        }

        function getDataFor(kpi) {
            if (kpi === 'custoEntrega' && custoEntregaRealData && custoEntregaRealData.length > 0 && filteredLabels.length > 0) {
                const filteredData = filteredIndices.map(function(mesIndex) {
                    return custoEntregaRealData[mesIndex] != null ? custoEntregaRealData[mesIndex] : null;
                });
                return {
                    labels: filteredLabels,
                    datasets: [{
                        label: 'Custo Entrega (%)',
                        data: filteredData,
                        borderColor: colors[0],
                        backgroundColor: colors[0] + '33',
                        tension: 0.4,
                        fill: false,
                        spanGaps: false
                    }]
                };
            }
            return { labels: filteredLabels, datasets: [] };
        }

        let chartCounter = 0;
        function createCanvasId(kpi) {
            return `lineChart_${kpi}_${++chartCounter}`;
        }

        function appendChart(container, kpi) {
            const data = getDataFor(kpi);
            if (!data.datasets.length || !data.labels.length) {
                const placeholder = document.createElement('div');
                placeholder.className = 'col-12';
                placeholder.innerHTML = '<p class="text-muted small">Sem pontos no período para o gráfico (ajuste datas/filtros ou verifique se há dados nas TOP 232, 233 e 1101).</p>';
                container.appendChild(placeholder);
                return;
            }

            const col = document.createElement('div');
            col.className = 'col-12';
            col.innerHTML = `
                <div class="detail-chart">
                    <h6>${kpiTitles[kpi]}</h6>
                    <div class="chart-container" style="height: 300px;">
                        <canvas id="${createCanvasId(kpi)}"></canvas>
                    </div>
                </div>
            `;
            container.appendChild(col);
            const canvasId = col.querySelector('canvas').id;
            if (!window.charts) window.charts = {};
            window.charts[canvasId] = createLineChart(canvasId, data, kpi);
        }

        function createLineChart(canvasId, chartData, kpi) {
            const ctx = document.getElementById(canvasId).getContext('2d');
            return new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { intersect: false },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(v) {
                                    return v != null ? Number(v).toFixed(2) + '%' : '';
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: { display: true },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const v = context.parsed.y;
                                    if (v === null || v === undefined) return 'Sem dados';
                                    return context.dataset.label + ': ' + Number(v).toFixed(2) + '%';
                                }
                            }
                        }
                    },
                    onClick: function(event, elements) {
                        if (elements.length > 0) {
                            const el = elements[0];
                            const cd = chartData.datasets[el.datasetIndex].label;
                            const month = chartData.labels[el.index];
                            const value = chartData.datasets[el.datasetIndex].data[el.index];
                            showDetails(kpi, cd, month, value);
                        }
                    }
                }
            });
        }

        document.addEventListener('DOMContentLoaded', async function() {
            updateSubtitlePeriodo();
            await carregarEmpresas();
            await applyFilters();
        });
    </script>
</body>
</html>
