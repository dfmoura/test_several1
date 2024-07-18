<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Example</title>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
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
        }
        #treemapChart {
            width: 100%;
            height: 80vh; /* Adjust height as needed */
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
    AND (F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD) ) = :A_TPPROD
    GROUP BY ITE.CODPROD||' - '||PRO.DESCRPROD
    ORDER BY 2 DESC
</snk:query> 

<div class="container-fluid">
    <div class="row">
        <div class="col-md-6 left-section">
            <div class="chart-title">Faturamento por Tipo Produto</div>
            <canvas id="doughnutChart"></canvas>
        </div>
        <div class="col-md-6 right-section">
            <div class="chart-title">Faturamento por Produto</div>
            <div id="treemapChart"></div>
        </div>
    </div>
</div>

<script>
    // Função para atualizar a query
    function ref_fat(TIPOPROD) {
        const params = {'A_TPPROD': TIPOPROD};
        refreshDetails('html5_30a1tq', params); 
    }

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

        // Treemap configuration with Plotly
        var treemapData = [];
        var labels = [];
        var parents = [];
        var values = [];
        var text = [];

        <c:forEach items="${fat_pruduto.rows}" var="row">
            labels.push("${row.PRODUTO}");
            parents.push(""); // raiz nao possui parentes
            values.push(${row.VLRFAT});
            //text.push("${row.PRODUTO} - R$ ${row.VLRFAT}");
        </c:forEach>

        var data = [{
            type: "treemap",
            labels: labels,
            parents: parents,
            values: values,
            text: text,
            hoverinfo: "label+value", // passar mouse
            marker: {
                textinfo: "text", // texto
                colors: [
                    'rgba(66, 135, 245, 0.2)',
                    'rgba(194, 78, 154, 0.2)',
                    'rgba(32, 201, 123, 0.2)',
                    'rgba(255, 87, 34, 0.2)',
                    'rgba(240, 98, 146, 0.2)',
                    'rgba(56, 173, 220, 0.2)',
                    'rgba(152, 61, 161, 0.2)',
                    'rgba(251, 188, 5, 0.2)',
                    'rgba(255, 150, 52, 0.2)',
                    'rgba(92, 184, 92, 0.2)',
                    'rgba(22, 160, 133, 0.2)',
                    'rgba(247, 159, 31, 0.2)',
                    'rgba(233, 30, 99, 0.2)',
                    'rgba(205, 220, 57, 0.2)',
                    'rgba(139, 195, 74, 0.2)',
                    'rgba(0, 188, 212, 0.2)',
                    'rgba(255, 64, 129, 0.2)',
                    'rgba(3, 169, 244, 0.2)',
                    'rgba(255, 193, 7, 0.2)',
                    'rgba(255, 235, 59, 0.2)',
                    'rgba(103, 58, 183, 0.2)',
                    'rgba(156, 39, 176, 0.2)',
                    'rgba(0, 150, 136, 0.2)',
                    'rgba(255, 87, 34, 0.2)',
                    'rgba(233, 30, 99, 0.2)'
                ]
            }
        }];

        var layout = {
            title: "",
            margin: { t: 0, l: 0, r: 0, b: 0 },
            height: '100%'
        };

        Plotly.newPlot('treemapChart', data, layout, {responsive: true});
    });
</script>
</body>
</html>
