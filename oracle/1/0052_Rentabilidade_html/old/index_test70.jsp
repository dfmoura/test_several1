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
    <title>Gráfico de Barras com Plotly.js</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f4f4f4;
        }
        #chart {
            width: 80%;
            max-width: 800px;
            height: 400px;
        }
    </style>

<snk:load/>

</head>
<body>

    <snk:query var="fat_tipo">
        SELECT 'Produto A' AS PRODUTO, 20 AS VALOR FROM DUAL UNION ALL
        SELECT 'Produto B' AS PRODUTO, 14 AS VALOR FROM DUAL UNION ALL
        SELECT 'Produto C' AS PRODUTO, 23 AS VALOR FROM DUAL UNION ALL
        SELECT 'Produto D' AS PRODUTO, 25 AS VALOR FROM DUAL UNION ALL
        SELECT 'Produto E' AS PRODUTO, 22 AS VALOR FROM DUAL 
    </snk:query>

    <div id="chart"></div>
    <script>
        var produtos = [];
        var valores = [];

        <c:forEach var="row" items="${fat_tipo.rows}">
            produtos.push('${row.PRODUTO}');
            valores.push(${row.VALOR});
        </c:forEach>

        var data = [
            {
                x: produtos,
                y: valores,
                type: 'bar',
                marker: {
                    color: 'rgba(55,128,191,0.7)',
                    line: {
                        color: 'rgba(55,128,191,1.0)',
                        width: 2
                    }
                }
            }
        ];

        var layout = {
            title: 'Vendas por Produto',
            xaxis: {
                title: 'Produtos',
                tickangle: -45
            },
            yaxis: {
                title: 'Vendas'
            },
            margin: {
                l: 50,
                r: 50,
                b: 100,
                t: 50,
                pad: 10
            },
            bargap: 0.05
        };

        Plotly.newPlot('chart', data, layout);
    </script>
</body>
</html>
