<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Example</title>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            background-color: #f8f9fa;
        }
        .left-section, .right-section {
            background-color: #ffffff;
            padding: 20px;
            height: 50vh; /* Ajuste para metade da altura */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative; /* Adicionado para posicionamento relativo */
        }
        .chart-title {
            text-align: center;
            margin-bottom: 20px;
            font-size: 24px;
            font-weight: bold;
        }
        #doughnutChart, #doughnutChart2, #barChart {
            max-width: 80%;
            max-height: 80%;
        }
        .overlay-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 25px;
            font-weight: bold;
            color: #000;
        }
        .table-container {
            flex-grow: 1;
            width: 100%;
            overflow-y: auto;
        }
        .table-scrollable {
            width: 100%;
            overflow-y: auto;
        }
        .table-container table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 12px;
            border: 1px solid #dddddd; /* Adicionado para bordas arredondadas */
            border-radius: 8px; /* Adicionado para bordas arredondadas */
        }
        .table-container th, .table-container td {
            border: 1px solid #dddddd;
            text-align: left;
            padding: 8px;
        }
        .table-container th:first-child,
        .table-container td:first-child {
            border-left: none;
        }
        .table-container th:last-child,
        .table-container td:last-child {
            border-right: none;
        }
        .table-container th {
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 1;
        }
        .table-container tbody tr:first-child th,
        .table-container tbody tr:first-child td {
            border-top: none;
        }
        .table-container tbody tr:last-child th,
        .table-container tbody tr:last-child td {
            border-bottom: none;
        }
        .table-container tbody tr:hover {
            background-color: #f0f0f0; /* Cor de fundo ao passar o mouse */
            cursor: pointer; /* Altera o cursor para indicar que é clicável */
        }
    </style>

<snk:load/>

</head>
<body>




    
    <snk:query var="fat_produto">
    
        SELECT
        ITE.CODPROD||' - '||PRO.DESCRPROD AS PRODUTO
        , ROUND(AVG(ITE.VLRUNIT * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)), 2) AS VLR_UN
        , ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
    
        , ROUND(NVL(AVG(ITE.VLRSUBST + ITE.VLRIPI + 
        (CASE 
        WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD = 1 AND CID.UF = 2 AND PAR.INSCESTADNAUF <> '    ' 
        THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.04
        WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD = 1 AND CID.UF = 2 AND PAR.INSCESTADNAUF = '    ' 
        THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.06
        WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD = 1 AND CID.UF <> 2 AND PAR.TIPPESSOA = 'J' 
        THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.04
        WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD IN (2,3,4) AND CID.UF = 2
        THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.06
        WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD IN (2,3,4) AND CID.UF IN (1,7,8,15,13)
        THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.03
        WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD IN (2,3,4) AND CID.UF NOT IN (2, 1, 7, 8, 15, 13)
        THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.01
        ELSE ITE.VLRICMS END)
        + NVL((SELECT VALOR FROM TGFDIN WHERE NUNOTA = ITE.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 6),0)
        + NVL((SELECT VALOR FROM TGFDIN WHERE NUNOTA = ITE.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 7),0)
        ),0),2) AS VLRIMP
    
        , ROUND(AVG(NVL(CUS.CUSSEMICM,0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)),2) AS CMV
        , ROUND(AVG((
        (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6 AND SEQUENCIA = ITE.SEQUENCIA),0)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7 AND SEQUENCIA = ITE.SEQUENCIA),0)
        - (NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
        ) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)),2) AS MAR_NON
    
        , ROUND(AVG((
        (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS) 
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6 AND SEQUENCIA = ITE.SEQUENCIA),0)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7 AND SEQUENCIA = ITE.SEQUENCIA),0)
        - (NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
        ) * 100 / 
        NULLIF((ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC),0)),2) AS MAR_PERC
            
        FROM TGFCAB CAB
        INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
        INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
        LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND DTATUAL <= CAB.DTNEG)
        INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
        INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
        INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
        WHERE TOP.GOLSINAL = -1 
        AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
        
        AND TOP.TIPMOV IN ('V', 'D')
        AND TOP.ATIVO = 'S'
        AND (F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD)) = :A_TPPROD
        GROUP BY ITE.CODPROD||' - '||PRO.DESCRPROD
        ORDER BY 3 DESC
    
    </snk:query> 
    




<div class="container-fluid">
    <div class="row">
        <div class="col-md-6">
            <div class="left-section">
                <div class="chart-title">Faturamento por Tipo de Produto</div>
                <canvas id="doughnutChart"></canvas>
                <div class="overlay-text">150.000</div> <!-- Texto sobreposto -->
            </div>
            <div class="left-section">
                <div class="chart-title">Detalhamentos dos valores do CIP</div>
                <canvas id="doughnutChart2"></canvas>
                <div class="overlay-text">100.000</div> <!-- Texto sobreposto -->
            </div>
        </div>
        <div class="col-md-6">
            <div class="right-section">
                <div class="chart-title">Detalhamento por Produto</div>
                <div class="table-container table-scrollable">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Preço Médio</th>
                                <th>Vlr. Fat.</th>
                                <th>Impostos</th>
                                <th>CMV</th>
                                <th>Margem Nom.</th>
                                <th>Margem %</th>
                            </tr>
                        </thead>

                        <tbody>
                            <c:set var="total" value="0" />
                            <c:forEach items="${fat_produto.rows}" var="row">
                                <tr>
                                    <td>${row.PRODUTO}</td>
                                    <td><fmt:formatNumber value="${row.VLR_UN}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <td><fmt:formatNumber value="${row.VLRFAT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <td><fmt:formatNumber value="${row.VLRIMP}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <td><fmt:formatNumber value="${row.CMV}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <td><fmt:formatNumber value="${row.MAR_NON}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <td><fmt:formatNumber value="${row.MAR_PERC}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <c:set var="total" value="${total + row.VLRFAT}" />
                                </tr>
                            </c:forEach>
                            <tr>
                                <td><b>Total</b></td>
                                <td></td>
                                <td><b><fmt:formatNumber value="${total}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></b></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tbody>                        


                    </table>
                </div>
            </div>
            <div class="right-section">
                <div class="chart-title">Valores de venda por gerentes</div>
                <canvas id="barChart"></canvas>
            </div>
        </div>
    </div>
</div>

<script>

    // Função para atualizar a query
    function ref_fat(TIPOPROD) {
        const params = {'A_TPPROD': TIPOPROD};
        refreshDetails('html5_30a1tq', params); 
    }

    // Configuração dos gráficos de rosca
    document.addEventListener('DOMContentLoaded', function () {
        var ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
        var ctxDoughnut2 = document.getElementById('doughnutChart2').getContext('2d');
        var ctxBar = document.getElementById('barChart').getContext('2d');
        var labels = ["Tipo 1", "Tipo 2", "Tipo 3"];
        var data = [50000, 30000, 70000];

        var doughnutConfig = {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                }
            }
        };

        var barConfig = {
            type: 'bar',
            data: {
                labels: ["Produto 1", "Produto 2", "Produto 3"],
                datasets: [{
                    label: 'Vlr. Fat.',
                    data: [50000, 30000, 70000],
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        };

        new Chart(ctxDoughnut, doughnutConfig);
        new Chart(ctxDoughnut2, doughnutConfig);
        new Chart(ctxBar, barConfig);
    });
</script>
</body>
</html>
