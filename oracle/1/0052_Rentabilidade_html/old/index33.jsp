<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
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
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .chart-container {
            width: 80%;
            height: 80%;
            max-width: 800px; /* Define um valor máximo para largura */
            max-height: 600px; /* Define um valor máximo para altura */
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #doughnutChart {
            width: 100%;
            height: 100%;
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

<div class="chart-container">
    <canvas id="doughnutChart"></canvas>
</div>

<script>
    document.addEventListener('DOMContentLoaded', function () {
        var ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
        var labels = [];
        var data = [];
        var tiposProdutos = []; // Array para armazenar os tipos de produtos

        <c:forEach items="${fat_tipo.rows}" var="row">
            labels.push("${row.TIPOPROD}");
            data.push(${row.VLRFAT});
            tiposProdutos.push("${row.TIPOPROD}"); // Armazena os tipos de produtos
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
                    title: {
                        display: true,
                        text: 'Faturamento por Tipo Produto',
                        font: {
                            size: 18
                        }
                    },
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var clickedIndex = elements[0].index;
                        var TIPOPROD = tiposProdutos[clickedIndex];
                        ref_fat(TIPOPROD); // Chama a função ref_fat com o TIPOPROD clicado
                    }
                }
            }
        });
    });

    function ref_fat(TIPOPROD) {
        const params = {'A_TPPROD': TIPOPROD };
        // Atualize a função refreshDetails para enviar os parâmetros para o servidor
        refreshDetails('lvl_216fbu', params);
    }
</script>

</body>
</html>
