<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pendentes de Faturamento</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
     <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #000000 0%, #4ba28c 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .dashboard-container {
            max-width: 1600px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            color: white;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        /* KPI Cards no Topo - Quadrados lado a lado */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }

        .kpi-card {
            background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            text-align: center;
            aspect-ratio: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .kpi-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #f5f5f5, #764ba2);
        }

        .kpi-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }

        .kpi-header {
            font-size: 0.75rem;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
            line-height: 1.2;
        }

        .kpi-value {
            font-size: 1.8rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 8px;
            line-height: 1;
        }

        .kpi-value h2 {
            font-size: 1.8rem;
            font-weight: bold;
            color: #333;
            margin: 0;
        }

        .kpi-subtitle {
            font-size: 0.7rem;
            color: #888;
            font-style: italic;
            line-height: 1.2;
        }

        /* Área Principal - Gráficos e Tabelas */
        .main-analytics {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin-bottom: 30px;
        }

        .analytics-panel {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 25px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            position: relative;
            overflow: hidden;
        }

        .analytics-panel::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #ff6b6b, #4ecdc4);
        }

        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .panel-title {
            font-size: 1.4rem;
            font-weight: bold;
            color: #333;
        }

        .refresh-btn {
            background: linear-gradient(135deg, #ffffff, #438d6e);
            color: white;
            border: none;
            padding: 10px 18px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .refresh-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }

        .refresh-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        /* Tabela de Status */
        .status-table {
            width: 100%;
        }

        .status-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 18px 0;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 10px;
            margin-bottom: 8px;
        }

        .status-row:hover {
            background: rgba(102, 126, 234, 0.08);
            transform: translateX(8px);
        }

        .status-row.active {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
            border-left: 5px solid #667eea;
            padding-left: 15px;
        }

        .status-label {
            font-weight: 600;
            color: #333;
            font-size: 1.1rem;
        }

        .status-values {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 5px;
        }

        .status-value {
            font-weight: bold;
            color: #667eea;
            font-size: 1.2rem;
        }

        .status-count {
            font-size: 0.9rem;
            color: #888;
            background: rgba(102, 126, 234, 0.1);
            padding: 2px 8px;
            border-radius: 12px;
        }

        /* Gráfico de Pizza */
        .chart-container {
            position: relative;
            height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Tabela de Detalhes */
        .details-section {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            position: relative;
            overflow: hidden;
        }

        .details-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #4CAF50, #2196F3);
        }

        .details-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
        }

        .details-title {
            font-size: 1.6rem;
            font-weight: bold;
            color: #333;
        }

        .filter-info {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 1rem;
            font-weight: 500;
        }

        .table-container {
            overflow-x: auto;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 12px;
            overflow: hidden;
        }

        th, td {
            padding: 15px 18px;
            text-align: left;
            border-bottom: 1px solid #f0f0f0;
        }

        th {
            background: linear-gradient(135deg, #f8f9ff, #f0f2ff);
            font-weight: 600;
            color: #333;
            text-transform: uppercase;
            font-size: 0.9rem;
            letter-spacing: 0.5px;
        }

        td {
            color: #555;
            font-size: 0.95rem;
        }

        tbody tr {
            transition: all 0.3s ease;
        }

        tbody tr:hover {
            background: rgba(102, 126, 234, 0.05);
            transform: scale(1.005);
        }

        .status-sim {
            color: #4CAF50;
            font-weight: bold;
            background: rgba(76, 175, 80, 0.15);
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 0.85rem;
        }

        .status-nao {
            color: #f44336;
            font-weight: bold;
            background: rgba(244, 67, 54, 0.15);
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 0.85rem;
        }

        .valor-cell {
            font-weight: bold;
            color: #667eea;
            font-size: 1rem;
        }

        .loading {
            text-align: center;
            padding: 50px;
            color: #666;
            font-size: 1.1rem;
        }

        .loading::after {
            content: '';
            display: inline-block;
            width: 25px;
            height: 25px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 15px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Responsividade */
        @media (max-width: 1400px) {
            .kpi-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        @media (max-width: 1200px) {
            .main-analytics {
                grid-template-columns: 1fr;
            }
            
            .kpi-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 768px) {
            .kpi-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .kpi-value, .kpi-value h2 {
                font-size: 1.4rem;
            }
            
            .kpi-header {
                font-size: 0.65rem;
            }
            
            .kpi-subtitle {
                font-size: 0.6rem;
            }
            
            .details-header {
                flex-direction: column;
                gap: 15px;
                align-items: flex-start;
            }
        }

        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            
            .kpi-grid {
                grid-template-columns: 1fr;
                gap: 15px;
            }
            
            .kpi-card {
                padding: 15px;
            }
            
            .analytics-panel, .details-section {
                padding: 20px;
            }
        }
    </style>
    <snk:load/>
</head>
<body>

    <snk:query var="Pedidos_pend">
SELECT 
(SELECT SUM(VLRNOTA) FROM TGFCAB CAB WHERE TIPMOV = 'P' AND PENDENTE = 'S' AND (SELECT COUNT(*) FROM TSILIB WHERE NUCHAVE = CAB.NUNOTA AND DHLIB IS NULL AND TABELA IN ('TGFCAB','TGFITE')) = 0) AS PENDENTE_FAT,
(SELECT COUNT(*) FROM TGFCAB CAB WHERE TIPMOV = 'P' AND PENDENTE = 'S' AND (SELECT COUNT(*) FROM TSILIB WHERE NUCHAVE = CAB.NUNOTA AND DHLIB IS NULL AND TABELA IN ('TGFCAB','TGFITE')) = 0) AS COUNT_PENDENTE_FAT,
(SELECT SUM(VLRNOTA) FROM TGFCAB CAB WHERE TIPMOV = 'P' AND PENDENTE = 'S' AND (SELECT COUNT(*) FROM TSILIB WHERE NUCHAVE = CAB.NUNOTA AND DHLIB IS NULL AND TABELA IN ('TGFCAB','TGFITE')) > 0 )AS PENDENTE_LIB,
(SELECT COUNT(*) FROM TGFCAB CAB WHERE TIPMOV = 'P' AND PENDENTE = 'S' AND (SELECT COUNT(*) FROM TSILIB WHERE NUCHAVE = CAB.NUNOTA AND DHLIB IS NULL AND TABELA IN ('TGFCAB','TGFITE')) > 0 )AS COUNT_PENDENTE_LIB,
(SELECT AVG(VLRNOTA) FROM TGFCAB CAB WHERE TIPMOV = 'P' AND PENDENTE = 'S') AS MED_PED,
(SELECT SUM(VLRNOTA) FROM TGFCAB CAB WHERE TIPMOV = 'P' AND PENDENTE = 'S' AND (SELECT COUNT(*) FROM TSILIB WHERE NUCHAVE = CAB.NUNOTA AND DHLIB IS NULL AND TABELA IN ('TGFCAB','TGFITE')) = 0)
+
(SELECT SUM(VLRNOTA) FROM TGFCAB CAB WHERE TIPMOV = 'P' AND PENDENTE = 'S' AND (SELECT COUNT(*) FROM TSILIB WHERE NUCHAVE = CAB.NUNOTA AND DHLIB IS NULL AND TABELA IN ('TGFCAB','TGFITE')) > 0 ) AS VLRTOT
FROM DUAL
    </snk:query>

    <snk:query var="tipos">
SELECT 
DISTINCT
SUM(CAB.VLRNOTA) AS VLR,
COUNT(CAB.NUNOTA)AS QTD,
VW.STATUS AS TIPO,
CASE WHEN VW.STATUS =  'A'    THEN 1
     WHEN VW.STATUS =  'ANF'  THEN 2
     WHEN VW.STATUS =  'C'    THEN 3
     WHEN VW.STATUS =  'PE'   THEN 4 
     WHEN VW.STATUS =  'R'    THEN 5
     WHEN VW.STATUS =  'MA'   THEN 6 
     WHEN VW.STATUS =  'PS'   THEN 7
     WHEN VW.STATUS =  'EE'   THEN 8
     WHEN VW.STATUS =  'PFP'  THEN 9

END AS CODHIST,
CASE WHEN VW.STATUS ='A'   THEN  'Pedido Aprovado'
     WHEN VW.STATUS ='ANF' THEN  'Aguardando NF'
     WHEN VW.STATUS ='C'   THEN  'Pedido Cancelado'
     WHEN VW.STATUS ='PE'  THEN  'Progamado Entrega'
     WHEN VW.STATUS ='R'   THEN  'Reprovado'
     WHEN VW.STATUS ='MA'  THEN  'Mercadoria a Caminho'
     WHEN VW.STATUS ='PS'  THEN  'Pedido em Separação'
     WHEN VW.STATUS ='EE'  THEN  'Pedido em Analise'
     WHEN VW.STATUS ='PFP' THEN  'Faturado Parcial'
END AS STATUS

FROM  
AD_VGFSTATUSA2W VW 
LEFT JOIN TGFCAB CAB ON VW.NUNOTA = CAB.NUNOTA

WHERE CAB.PENDENTE = 'S'
AND CAB.TIPMOV = 'P'
AND CAB.AD_DTENTREGAEFETIVA IS NULL 

GROUP BY VW.STATUS

    </snk:query>

        <snk:query var="analiticos">

SELECT 
NUNOTA,
DTNEG,
DTMOV,
PARCEIRO,
TOP,
EMP,
LIB_FAT,
LIB_LOG,
VLRNOTA,
STATUS,
CODHIST

FROM 

(
SELECT 
CAB.NUNOTA,
CAB.DTNEG,
CAB.DTMOV,
CAB.CODPARC||' - '||(SELECT RAZAOSOCIAL FROM TGFPAR WHERE CODPARC = CAB.CODPARC) AS PARCEIRO,
(SELECT DESCROPER FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER AND DHALTER = (SELECT MAX(DHALTER)FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)) AS TOP,
CAB.CODEMP||' - '||(SELECT NOMEFANTASIA FROM TSIEMP WHERE CODEMP = CAB.CODEMP) AS EMP,
CASE WHEN NVL(CAB.AD_LIBFATURAMENTO,'N') = 'N' THEN 'Não' ELSE 'Sim' END AS LIB_FAT,
CASE WHEN NVL(CAB.AD_LIBERADO,'N') = 'N' THEN 'Não' ELSE 'Sim' END AS LIB_LOG,
CAB.VLRNOTA,
CASE WHEN VW.STATUS ='A'   THEN  'Pedido Aprovado'
     WHEN VW.STATUS ='ANF' THEN  'Aguardando NF'
     WHEN VW.STATUS ='C'   THEN  'Pedido Cancelado'
     WHEN VW.STATUS ='PE'  THEN  'Progamado Entrega'
     WHEN VW.STATUS ='R'   THEN  'Reprovado'
     WHEN VW.STATUS ='MA'  THEN  'Mercadoria a Caminho'
     WHEN VW.STATUS ='PS'  THEN  'Pedido em Separação'
     WHEN VW.STATUS ='EE'  THEN  'Pedido em Analise'
     WHEN VW.STATUS ='PFP' THEN  'Faturado Parcial'
END AS STATUS,

CASE WHEN VW.STATUS =  'A'    THEN 1
     WHEN VW.STATUS =  'ANF'  THEN 2
     WHEN VW.STATUS =  'C'    THEN 3
     WHEN VW.STATUS =  'PE'   THEN 4 
     WHEN VW.STATUS =  'R'    THEN 5
     WHEN VW.STATUS =  'MA'   THEN 6 
     WHEN VW.STATUS =  'PS'   THEN 7
     WHEN VW.STATUS =  'EE'   THEN 8
     WHEN VW.STATUS =  'PFP'  THEN 9

END AS CODHIST

FROM  
AD_VGFSTATUSA2W VW 
LEFT JOIN TGFCAB CAB ON VW.NUNOTA = CAB.NUNOTA

WHERE CAB.PENDENTE = 'S'
AND CAB.TIPMOV = 'P'
AND CAB.AD_DTENTREGAEFETIVA IS NULL 

)
WHERE CODHIST = :A_CODHIST
        </snk:query>

    <div class="dashboard-container">
        <div class="header">
            <h1>Dash Analise de Pedidos </h1>
            <p>Controle de pendentes de Liberações e Faturamento</p>
        </div>

        <!-- Grid de KPIs no Topo -->
        <div class="kpi-grid">
            <c:forEach items="${Pedidos_pend.rows}" var="row">
                <div class="kpi-card">
                    <div class="kpi-header">Valor Não Faturado</div>
                    <div class="kpi-value">
                        <h2><fmt:formatNumber value="${row.VLRTOT}" type="number" maxFractionDigits="2" /></h2>
                    </div>
                    <div class="kpi-subtitle">Total pendente</div>
                </div>

                <div class="kpi-card">
                    <div class="kpi-header">Ticket Médio</div>
                    <div class="kpi-value">
                        <h2><fmt:formatNumber value="${row.MED_PED}" type="number" maxFractionDigits="2" /></h2>
                    </div>
                    <div class="kpi-subtitle">Valor médio por nota</div>
                </div>

                <div class="kpi-card">
                    <div class="kpi-header">Pedidos Pend. Liberação</div>
                    <div class="kpi-value">
                        <h2>${row.COUNT_PENDENTE_LIB}</h2>
                    </div>
                    <div class="kpi-subtitle">Qtd. Ped. Pendentes de Liberação</div>
                </div>

                <div class="kpi-card">
                    <div class="kpi-header">Vlr Ped. Pendentes de Liberação</div>
                    <div class="kpi-value">
                        <h2><fmt:formatNumber value="${row.PENDENTE_LIB}" type="number" maxFractionDigits="2" /></h2>
                    </div>
                    <div class="kpi-subtitle">Valor em R$</div>
                </div>

                <div class="kpi-card">
                    <div class="kpi-header">Vlr Ped. Pend de Faturamento</div>
                    <div class="kpi-value">
                        <h2><fmt:formatNumber value="${row.PENDENTE_FAT}" type="number" maxFractionDigits="2" /></h2>
                    </div>
                    <div class="kpi-subtitle">Valor em R$</div>
                </div>

                <div class="kpi-card">
                    <div class="kpi-header">Qtd Pend. Faturamento</div>
                    <div class="kpi-value">
                        <h2>${row.COUNT_PENDENTE_FAT}</h2>
                    </div>
                    <div class="kpi-subtitle">Quantidade de notas</div>
                </div>
            </c:forEach>

        </div>

        <!-- Área Principal: Tabela de Status + Gráfico -->
        <div class="main-analytics">
            <!-- Tabela de Status -->
            <div class="analytics-panel">
                <div class="panel-header">
                    <h3 class="panel-title">Status dos Pedidos</h3>
                </div>
                
                <div class="status-table">
                    <c:forEach items="${tipos.rows}" var="row" varStatus="status">
                        <c:set var="statusType" value="" />
                        <c:set var="statusLabel" value="" />
                        <c:choose>
                            <c:when test="${row.TIPO == 'A'}">
                                <c:set var="statusType" value="1" />
                                <c:set var="statusLabel" value="Pedido Aprovado" />
                            </c:when>
                            <c:when test="${row.TIPO == 'ANF'}">
                                <c:set var="statusType" value="2" />
                                <c:set var="statusLabel" value="Aguardando NF" />
                            </c:when>
                            <c:when test="${row.TIPO == 'C'}">
                                <c:set var="statusType" value="3" />
                                <c:set var="statusLabel" value="Pedido Cancelado" />
                            </c:when>
                            <c:when test="${row.TIPO == 'PE'}">
                                <c:set var="statusType" value="4" />
                                <c:set var="statusLabel" value="Progamado Entrega" />
                            </c:when>
                            <c:when test="${row.TIPO == 'R'}">
                                <c:set var="statusType" value="5" />
                                <c:set var="statusLabel" value="Reprovado" />
                            </c:when>
                            <c:when test="${row.TIPO == 'MA'}">
                                <c:set var="statusType" value="6" />
                                <c:set var="statusLabel" value="Mercadoria a Caminho" />
                            </c:when>
                            <c:when test="${row.TIPO == 'PS'}">
                                <c:set var="statusType" value="7" />
                                <c:set var="statusLabel" value="Pedido em Separação" />
                            </c:when>
                            <c:when test="${row.TIPO == 'EE'}">
                                <c:set var="statusType" value="8" />
                                <c:set var="statusLabel" value="Pedido em Analise" />
                            </c:when>
                            <c:when test="${row.TIPO == 'PFP'}">
                                <c:set var="statusType" value="9" />
                                <c:set var="statusLabel" value="Faturado Parcial" />
                            </c:when>
                        </c:choose>
                        
                        <div class="status-row ${status.first ? 'active' : ''}" 
                             onclick="filterByStatus('${row.CODHIST}', '${statusLabel}')" 
                             data-codhist="${row.CODHIST}"
                             data-status="${row.TIPO}">
                            <div class="status-label">${statusLabel}</div>
                            <div class="status-values">
                                <div class="status-value">
                                    <fmt:formatNumber value="${row.VLR}" type="currency" currencySymbol="R$ " />
                                </div>
                                <div class="status-count">${row.QTD} notas</div>
                            </div>
                        </div>
                    </c:forEach>
                </div>
            </div>
            <!-- Gráfico de Pizza -->
            <div class="analytics-panel">
                <div class="panel-header">
                    <h3 class="panel-title">Distribuição por Status</h3>
                </div>
                
                <div class="chart-container">
                    <canvas id="statusChart" width="400" height="400"></canvas>
                </div>
            </div>
        </div>

        <!-- Tabela de Detalhes -->
        <div class="details-section">
            <div class="details-header">
                <h3 class="details-title">Detalhes dos Pedidos</h3>
                <div class="filter-info" id="current-filter">Todos os Status</div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nº Nota</th>
                            <th>Dt. Neg</th>
                            <th>Dt. Mov</th>
                            <th>Cliente</th>
                            <th>Top</th>
                            <th>Empresa</th>
                            <th>Lib. Fat</th>
                            <th>Valor</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="details-tbody">
                        <c:choose>
                            <c:when test="${not empty analiticos.rows}">
                                <c:forEach items="${analiticos.rows}" var="row">
                                    <tr>
                                        <td>${row.NUNOTA}</td>
                                        <td><fmt:formatDate value="${row.DTNEG}" pattern="dd/MM/yyyy" /></td>
                                        <td><fmt:formatDate value="${row.DTMOV}" pattern="dd/MM/yyyy" /></td>
                                        <td>${row.PARCEIRO}</td>
                                        <td>${row.TOP}</td>
                                        <td>${row.EMP}</td>
                                        <td>
                                            <span class="${row.LIB_FAT == 'Sim' ? 'status-sim' : 'status-nao'}">
                                                ${row.LIB_FAT}
                                            </span>
                                        </td>
                                        <td class="valor-cell">
                                            <fmt:formatNumber value="${row.VLRNOTA}" type="currency" currencySymbol="R$ " />
                                        </td>
                                        <td>${row.STATUS}</td>
                                    </tr>
                                </c:forEach>
                            </c:when>
                            <c:otherwise>
                                <tr>
                                    <td colspan="9" style="text-align: center; color: #888; padding: 40px;">
                                        Selecione um status para visualizar os detalhes
                                    </td>
                                </tr>
                            </c:otherwise>
                        </c:choose>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>

        function ref_mot(codhist) {
            console.log('Chamando ref_mot com CODHIST:', codhist);
            const params = {'A_CODHIST': codhist};
            refreshDetails('html5_231pbv', params); 
        }

        // Criando os dados do gráfico diretamente do JSP de forma mais segura
      //  const chartData = {
       //     labels: [],
      //      values: [],
      //      tipos: [],
      //      codhists: [],
           
      //  };

        var tipodepend = [];
        var qtdpends = [];
        // Processando os dados da consulta tipos
        <c:forEach items="${tipos.rows}" var="row">
                tipodepend.push(${STATUS});
                chartData.tipos.push('${row.TIPO}');
                qtdpends.push(${row.QTD});
        </c:forEach>

        function formatCurrency(value) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        }

        function createChart() {
            const ctx = document.getElementById('statusChart');
            if (!ctx) {
                console.error('Canvas não encontrado');
                return;
            }

            // Verificando se há dados para exibir
            if (chartData.values.length === 0) {
                console.warn('Nenhum dado encontrado para o gráfico');
                ctx.getContext('2d').fillText('Nenhum dado disponível', 200, 200);
                return;
            }

            console.log('Dados do gráfico:', chartData);

            chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: tipodepend,
                    datasets: [{
                        data: qtdpends,
                        //backgroundColor: ['rgba(255, 99, 132, 0.2)','rgba(54, 162, 235, 0.2)','rgba(255, 206, 86, 0.2)','rgba(75, 192, 192, 0.2)','rgba(153, 102, 255, 0.2)','rgba(255, 159, 64, 0.2)'],
                        borderWidth: 3,
                        borderColor: '#ffffff',
                        hoverBorderWidth: 5,
                        hoverOffset: 15
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 25,
                                usePointStyle: true,
                                font: {
                                    size: 12,
                                    weight: '500'
                                },
                                generateLabels: function(chart) {
                                    const data = chart.data;
                                    if (data.labels.length && data.datasets.length) {
                                        return data.labels.map((label, i) => {
                                            const value = data.datasets[0].data[i];
                                            const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                            return {
                                                text: `${label} (${percentage}%)`,
                                                fillStyle: data.datasets[0].backgroundColor[i],
                                                strokeStyle: '#ffffff',
                                                lineWidth: 2,
                                                pointStyle: 'circle',
                                                hidden: false,
                                                index: i
                                            };
                                        });
                                    }
                                    return [];
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#ffffff',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    const value = formatCurrency(context.raw);
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : '0.0';
                                    return `${context.label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    onClick: (event, activeElements) => {
                        if (activeElements.length > 0) {
                            const index = activeElements[0].index;
                            const codhist = chartData.codhists[index];
                            const label = chartData.labels[index];
                            
                            console.log('Gráfico clicado - Index:', index, 'CODHIST:', codhist, 'Label:', label);
                            
                            // Atualizar visualmente qual status está selecionado
                            filterByStatus(codhist, label);
                            
                            // Chamar a função para atualizar os dados da tabela
                            ref_mot(codhist);
                        }
                    },
                    animation: {
                        animateRotate: true,
                        animateScale: true,
                        duration: 1500
                    }
                }
            });
        }

        function filterByStatus(codhist, statusLabel) {
            console.log('filterByStatus chamado com CODHIST:', codhist, 'Label:', statusLabel);
            
            // Atualiza visual da tabela de status
            document.querySelectorAll('.status-row').forEach(row => {
                row.classList.remove('active');
            });
            
            const targetRow = document.querySelector(`[data-codhist="${codhist}"]`);
            if (targetRow) {
                targetRow.classList.add('active');
                console.log('Status row ativado:', targetRow);
            } else {
                console.warn('Status row não encontrado para CODHIST:', codhist);
            }
            
            // Atualiza o filtro atual
            document.getElementById('current-filter').textContent = statusLabel || `Status ${codhist}`;
            
            // Chama a função para atualizar a tabela de detalhes
            ref_mot(codhist);
        }

        function updateChart() {
            if (chart && chartData.values.length > 0) {
                // Simula uma pequena variação nos dados (em produção, você faria nova consulta)
                const newData = chartData.values.map(value => 
                    Math.max(0, value * (0.95 + Math.random() * 0.1)) // Variação de -5% a +5%
                );
                
                // Atualiza os dados com animação
                chart.data.datasets[0].data = newData;
                chart.update('active');
                
                // Feedback visual no botão
                const btn = document.querySelector('.refresh-btn[onclick="updateChart()"]');
                if (btn) {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '✅ Atualizado';
                    btn.style.background = '#4CAF50';
                    
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.background = '';
                    }, 2000);
                }
            } else {
                console.warn('Gráfico não inicializado ou sem dados');
            }
        }

        function initializeFilter() {
            // Inicializa com o primeiro status disponível se não há dados carregados
            const firstStatus = document.querySelector('.status-row');
            if (firstStatus && !document.querySelector('#details-tbody tr td[class*="valor-cell"]')) {
                const firstCodhist = firstStatus.getAttribute('data-codhist');
                const firstLabel = firstStatus.querySelector('.status-label').textContent;
                if (firstCodhist) {
                    console.log('Inicializando com primeiro status:', firstCodhist, firstLabel);
                    filterByStatus(firstCodhist, firstLabel);
                }
            }
        }

        // Inicialização quando o DOM estiver pronto
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Inicializando dashboard...');
            
            // Pequeno delay para garantir que o canvas esteja renderizado
            setTimeout(() => {
                createChart();
                initializeFilter();
                console.log('Dashboard de Notas Sankhya carregado!');
            }, 100);
        });

        // Função para debug - pode ser removida em produção
        function debugChartData() {
            console.log('Debug - Dados do Gráfico:');
            console.log('Labels:', chartData.labels);
            console.log('Values:', chartData.values);
            console.log('Tipos:', chartData.tipos);
            console.log('CODHISTs:', chartData.codhists);
            console.log('Total de itens:', chartData.values.length);
        }

        // Chama o debug quando a página carrega (pode ser removido)
        window.addEventListener('load', debugChartData);
    </script>
</body>
</html>