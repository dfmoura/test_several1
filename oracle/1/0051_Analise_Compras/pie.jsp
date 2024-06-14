<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pedidos Por Comprador</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f4f4f4;
        }
        #chart-container {
            width: 60%;
            height: 60%;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <snk:load />
</head>
<body>
<snk:query var="pizza">
WITH BAS AS( SELECT
ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS ORDEM,
DECODE(APELIDO,'<SEM VENDEDOR>','NAO INFORMADO',APELIDO) AS COMPRADOR,
COUNT(*) QTD_PEDIDOS
FROM TGFCAB CAB
INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
WHERE TIPMOV IN ('O')
GROUP BY 
DECODE(APELIDO,'<SEM VENDEDOR>','NAO INFORMADO',APELIDO)
ORDER BY 2 DESC)
SELECT COMPRADOR,QTD_PEDIDOS FROM BAS WHERE ORDEM <= 5
UNION ALL
SELECT 'OUTROS' AS COMPRADOR, SUM(QTD_PEDIDOS) AS QTD_PEDIDOS FROM BAS WHERE ORDEM > 5
ORDER BY 2 DESC
</snk:query>    

<div id="chart-container">
    <canvas id="myPieChart"></canvas>
</div>

<script>
    document.addEventListener('DOMContentLoaded', function () {
        var ctx = document.getElementById('myPieChart').getContext('2d');
        var data = {
            labels: [
                <c:forEach items="${pizza.rows}" var="row">
                    "${row.COMPRADOR}", 
                </c:forEach>
            ],
            datasets: [{
                data: [
                    <c:forEach items="${pizza.rows}" var="row">
                        ${row.QTD_PEDIDOS}, 
                    </c:forEach>
                ],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40'
                ]
            }]
        };

        var myPieChart = new Chart(ctx, {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: 'Pedidos Por Comprador'
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var clickedIndex = elements[0]._index;
                        var comprador = "${pizza.rows[clickedIndex].COMPRADOR}";
                        abrir(comprador);
                    }
                }
            }
        });

        function abrir(comprador) {
            const parametros = { A_COMPRADOR: comprador };
            const level = 'lvl_exidt0';
            openLevel(level, parametros);
        }
    });
</script>

</body>
</html>
