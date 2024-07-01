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
        .left-section {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .top-section, .bottom-section {
            background-color: #ffffff;
            padding: 20px;
            flex: 0.45; /* Reduced from 0.5 to 0.45 for 10% reduction */
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .right-section {
            background-color: #ffffff;
            padding: 20px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .chart-title {
            text-align: center;
            margin-bottom: 20px;
            font-size: 24px;
            font-weight: bold;
        }
        .table-container {
            flex: 1;
            overflow-y: auto;
        }
        .table {
            width: 100%;
            margin-bottom: 0;
        }
        .table thead th {
            position: sticky;
            top: 0;
            background: #ffffff;
            z-index: 1;
            box-shadow: 0 2px 2px -1px rgba(0, 0, 0, 0.4);
        }
        .table tbody tr:hover {
            background-color: #f1f1f1;
        }
        #doughnutChart, #barChart {
            max-width: 80%; /* Reduce the size proportionally */
            max-height: 80%; /* Reduce the size proportionally */
        }
    </style>

<snk:load/>

</head>
<body>

<snk:query var="fat_tipo">  
    SELECT
    (F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD) ) AS TIPOPROD
    , ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    GROUP BY (F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD))
</snk:query> 

<snk:query var="fat_pruduto">
    SELECT
    ITE.CODPROD||' - '||PRO.DESCRPROD AS PRODUTO
    , ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
AND (F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD) ) = 'ÁGUA'
    GROUP BY ITE.CODPROD||' - '||PRO.DESCRPROD
    ORDER BY 2 DESC
</snk:query> 

    <div class="container-fluid">
        <div class="row">
            <div class="col-md-6 left-section">
                <div class="top-section">
                    <div class="chart-title">Faturamento por Tipo Produto</div>
                    <canvas id="doughnutChart"></canvas>
                </div>
                <div class="bottom-section">
                    <div class="chart-title">Faturamento por Produto</div>
                    <canvas id="barChart"></canvas>
                </div>
            </div>
            <div class="col-md-6 right-section">
                <div class="chart-title">Detalhamento por Produto</div>
                <div class="table-container">
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Cód.Produto</th>
                                <th>Produto</th>
                                <th>Preço Médio</th>
                                <th>Vlr. Fatura</th>
                                <th>Custo Médio</th>
                                <th>% Margem</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>001</td>
                                <td>Produto A</td>
                                <td>R$ 10,00</td>
                                <td>R$ 1.000,00</td>
                                <td>R$ 7,00</td>
                                <td>30%</td>
                            </tr>
                            <tr>
                                <td>002</td>
                                <td>Produto B</td>
                                <td>R$ 20,00</td>
                                <td>R$ 2.000,00</td>
                                <td>R$ 15,00</td>
                                <td>25%</td>
                            </tr>
                            <tr>
                                <td>003</td>
                                <td>Produto C</td>
                                <td>R$ 15,00</td>
                                <td>R$ 1.500,00</td>
                                <td>R$ 10,00</td>
                                <td>33%</td>
                            </tr>
                            <tr>
                                <td>004</td>
                                <td>Produto D</td>
                                <td>R$ 25,00</td>
                                <td>R$ 2.500,00</td>
                                <td>R$ 18,00</td>
                                <td>28%</td>
                            </tr>
                            <!-- Add more rows as needed -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Doughnut chart configuration        
        document.addEventListener('DOMContentLoaded', function () {
            var ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
            var labels = [];
            var data = [];
            
            <c:forEach items="${fat_tipo.rows}" var="row">
                labels.push("${row.TIPOPROD}");
                data.push(${row.VLRFAT});
            </c:forEach>

            var doughnutChart = new Chart(ctxDoughnut, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 159, 64, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
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
            });

            // Vertical Bar Chart configuration
            var ctxBar = document.getElementById('barChart').getContext('2d');
            var barLabels = [];
            var barData = [];
            
            <c:forEach items="${fat_pruduto.rows}" var="row">
                barLabels.push("${row.PRODUTO}");
                barData.push(${row.VLRFAT});
            </c:forEach>

            var barChart = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: barLabels,
                    datasets: [{
                        label: 'Faturamento por Produto',
                        data: barData,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
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
            });
        });
    </script>
</body>
</html>
