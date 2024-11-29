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
    <title>Gráfico de Linhas com Plotly.js</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body {
            background-color: white;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            overflow: hidden;
        }
        h1 {
            font-size: 25px;
            margin-bottom: 20px;
        }
        #chart {
            width: 90%;
            height: calc(100% - 60px);
        }
    </style>
    <snk:load/>
</head>
<body>

    <snk:query var="rota_det">
    SELECT
    VEN.APELIDO,
    VEN.AD_ROTA AS ROTA,
    ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
    INNER JOIN TGFVEN VEN1 ON VEN.AD_SUPERVISOR = VEN1.CODVEND
    INNER JOIN TGFVEN VEN2 ON VEN.CODGER = VEN2.CODVEND
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    AND VEN.APELIDO = REPLACE(:A_VENDEDOR, '"', '')
    AND CAB.CODEMP IN (:P_EMPRESA)
    AND CAB.CODNAT IN (:P_NATUREZA)
    AND CAB.CODCENCUS IN (:P_CR)
    
    AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
    AND VEN.CODGER IN (:P_GERENTE)
    AND VEN.AD_ROTA IN (:P_ROTA)
    GROUP BY VEN.APELIDO,VEN.AD_ROTA
    ORDER BY 2 DESC
    </snk:query>

    
    <h1>Rotas por Vendedor</h1>
    

    <div id="chart"></div>

    <script>
        // Preparar data no JavaScript
        var data = {
            rotas: [],
            vlrfat: [],
            hoverText: []
        };

        <c:forEach var="item" items="${rota_det.rows}">
            data.rotas.push("${item.ROTA}");
            data.vlrfat.push(${item.VLRFAT});
            data.hoverText.push("Rota: ${item.ROTA}<br>Valor Faturado: ${item.VLRFAT}");
        </c:forEach>

        var trace1 = {
            x: data.rotas,
            y: data.vlrfat,
            type: 'scatter',
            mode: 'lines+markers',
            hoverinfo: 'text',
            hovertext: data.hoverText
        };

        var layout = {
            title: '',
            margin: {
                l: 50,
                r: 50,
                b: 50,
                t: 50,
                pad: 4
            },
            autosize: true
        };

        var config = { responsive: true };

        Plotly.newPlot('chart', [trace1], layout, config);
    </script>
</body>
</html>
