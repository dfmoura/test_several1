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
        VGF.APELIDO,
        VGF.AD_ROTA AS ROTA,
        ROUND(SUM(CASE WHEN VGF.TIPMOV = 'D' THEN (VGF.VLRTOT + VGF.VLRIPI + VGF.VLRSUBST - VGF.VLRDESC) * -1 ELSE (VGF.VLRTOT + VGF.VLRIPI + VGF.VLRSUBST - VGF.VLRDESC) END), 2) AS VLRFAT
        FROM VGF_CONSOLIDADOR_NOTAS_GM  VGF
        INNER JOIN TGFPAR PAR ON VGF.CODPARC = PAR.CODPARC
        LEFT JOIN TGFPAR PARM ON PAR.CODPARCMATRIZ = PARM.CODPARC
        WHERE 
        DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND GOLSINAL = -1
        AND TIPMOV IN ('V', 'D')
        AND VGF.ATIVO = 'S' 
        AND VGF.CODEMP IN (:P_EMPRESA)
        AND VGF.CODNAT IN (:P_NATUREZA)
        AND VGF.CODCENCUS IN (:P_CR)
        AND VGF.CODVEND IN (:P_VENDEDOR)
        AND VGF.CODGER IN (:P_GERENTE)
        AND VGF.AD_ROTA IN (:P_ROTA)
        AND VGF.CODTIPOPER IN (:P_TOP)
        AND (:P_MATRIZ_RVE ='S'  OR PARM.CODPARC <> 518077)
        AND (
        (:P_MATRIZ_RVE = 'S')
        OR 
        (:P_MATRIZ_RVE = 'N' OR :P_MATRIZ_RVE IS NULL AND PARM.CODPARC <> 518077)
        )
        GROUP BY VGF.APELIDO,VGF.AD_ROTA
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
