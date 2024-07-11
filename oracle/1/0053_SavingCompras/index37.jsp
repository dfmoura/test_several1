<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gráfico de Barra com Plotly.js</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f4f4f9;
        }
        #chart-container {
            width: 80%;
            height: 80%;
            border-radius: 15px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s;
            background-color: white;
            padding: 20px;
        }
        #chart-container:hover {
            transform: scale(1.05);
        }
        #chart {
            width: 100%;
            height: 100%;
        }
    </style>

    <snk:load/>

</head>
<body>

    <snk:query var="volumes_compras"> 
    
    SELECT 
    CAB.CODUSUINC||'-'||USU.NOMEUSU AS COMPRADOR,
    COUNT(*) AS NEGOCIACOES,
    SUM(ITE.VLRTOT) AS VLRTOT
    FROM TGFITE ITE
    INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
    INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
    INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER))
    INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
    INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD 
    INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU       
    WHERE CAB.TIPMOV = 'O'
    AND CAB.STATUSNOTA = 'L'
    AND USU.AD_USUCOMPRADOR = 'S'
    AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN 
    AND ITE.VLRDESC IS NOT NULL
    GROUP BY
    CAB.CODUSUINC||'-'||USU.NOMEUSU
    ORDER BY 3 DESC
    

    </snk:query>

    <div id="chart-container">
        <div id="chart"></div>
    </div>

<script>
        // Obter dados da consulta JSP
        var compradores = [];
        var valoresTotais = [];

        <c:forEach var="row" items="${volumes_compras.rows}">
            compradores.push('${row.COMPRADOR}');
            valoresTotais.push(${row.VLRTOT});
        </c:forEach>

        // Configuração do gráfico Plotly.js
        var data = [{
            x: compradores,
            y: valoresTotais,
            type: 'bar',
            marker: {
                color: '#28a745' // Define a cor das colunas
            }
        }];

        var layout = {
            title: 'Valor Total e Quantidade Pedidos Por Comprador',
            xaxis: {
                title: 'Comprador'
            },
            yaxis: {
                title: 'Valor Total'
            },
            margin: {
                l: 50, // Margem esquerda
                r: 50, // Margem direita
                b: 100, // Margem inferior
                t: 100 // Margem superior
            }
        };

        Plotly.newPlot('chart', data, layout);


    </script>
</body>
</html>
