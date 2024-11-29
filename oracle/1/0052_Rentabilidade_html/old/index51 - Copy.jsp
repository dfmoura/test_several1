<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>

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
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .chart-title {
            text-align: center;
            margin-bottom: 20px;
            font-size: 24px;
            font-weight: bold;
        }
        #doughnutChart {
            max-width: 80%;
            max-height: 80%;
            position: relative;
        }
        .overlay-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 18px;
            font-weight: bold;
            color: #000;
        }
        .table-container {
            max-height: 80vh;
            overflow-y: auto;
            padding: 10px;
        }
        .table-scrollable {
            max-height: 60vh; /* Ajuste conforme necessário */
            overflow-y: auto;
        }
        .table-container table {
            width: 100%;
            border-collapse: collapse;
        }
        .table-container th, .table-container td {
            border: 1px solid #dddddd;
            text-align: left;
            padding: 8px;
        }
        .table-container th {
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 1;
        }
        /* Efeito de hover */
        .table-container tbody tr:hover {
            background-color: #f0f0f0; /* Cor de fundo ao passar o mouse */
            cursor: pointer; /* Altera o cursor para indicar que é clicável */
        }
    </style>

    <snk:load/>

</head>
<body>

<snk:query var="fat_tipo">  
    SELECT
    (F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD)) AS TIPOPROD
    , ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    GROUP BY (F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD))
</snk:query> 

<snk:query var="fat_produto">
    SELECT
    ITE.CODPROD||' - '||PRO.DESCRPROD AS PRODUTO
    , ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    AND (F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD)) = :A_TPPROD
    GROUP BY ITE.CODPROD||' - '||PRO.DESCRPROD
    ORDER BY 2 DESC
</snk:query> 

<div class="container-fluid">
    <div class="row">
        <div class="col-md-6 left-section">
            <div class="chart-title">Faturamento por Tipo de Produto</div>
            <canvas id="doughnutChart"></canvas>
            <div class="overlay-text">TESTE XXXX</div> <!-- Texto sobreposto -->
        </div>
        <div class="col-md-6 right-section">
            <div class="chart-title">Faturamento por Produto</div>
            <div class="table-container table-scrollable">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th>Vlr. Fat.</th>
                        </tr>
                    </thead>
                    <tbody>
                        <c:forEach items="${fat_produto.rows}" var="row">
                            <tr>
                                <td>${row.PRODUTO}</td>
                                <td>${row.VLRFAT}</td>
                            </tr>
                        </c:forEach>
                        <tr>
                            <td><b>Total</b></td>
                            <td><b>
                                <c:forEach items="${fat_produto.rows}" var="row">
                                    <c:set var="total" value="${total + row.VLRFAT}" />
                                </c:forEach>
                                ${total}
                            </b></td>
                        </tr>
                    </tbody>
                </table>
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

    // Configuração do gráfico de rosca
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
                },
                onClick: function (e, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var label = this.data.labels[index];
                        ref_fat(label);
                    }
                }
            }
        });
    });
</script>
</body>
</html>
