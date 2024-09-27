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
    <title>Card Dashboard</title>
	<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            width: 100%;
            padding: 20px;
        }

        #treemap {
            width: 100%;
            height: 100%;
            max-width: 1000px;
            max-height: 700px;
        }
    </style>
    <snk:load/>
</head>
<body>
    <snk:query var="dias">
        WITH BAS AS (
            SELECT
                CODCENCUS,
                DESCRCENCUS,
                COUNT(*) AS TOTAL_PEDIDOS
            FROM (
                SELECT
                    CAB.CODCENCUS,
                    CUS.DESCRCENCUS
                FROM TGFCAB CAB
                INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
                WHERE TIPMOV IN ('O') 
                AND CAB.NUMCOTACAO IN (
                    SELECT COT.NUMCOTACAO 
                    FROM TGFCOT COT 
                    WHERE COT.NUMCOTACAO IN (
                        SELECT CAB.NUMCOTACAO 
                        FROM TGFCAB CAB 
                        WHERE CAB.TIPMOV ='J' 
                        AND CAB.STATUSNOTA = 'L' 
                        AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                    )
                )
                UNION ALL
                SELECT
                    CAB.CODCENCUS,
                    CUS.DESCRCENCUS
                FROM TGFCAB CAB
                INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
                WHERE TIPMOV IN ('O') 
                AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                AND CAB.NUNOTA NOT IN (
                    SELECT CAB.NUNOTA 
                    FROM TGFCAB CAB 
                    WHERE CAB.NUMCOTACAO IN (
                        SELECT COT.NUMCOTACAO 
                        FROM TGFCOT COT 
                        WHERE COT.NUMCOTACAO IN (
                            SELECT CAB.NUMCOTACAO 
                            FROM TGFCAB CAB 
                            WHERE CAB.TIPMOV ='J' 
                            AND CAB.STATUSNOTA = 'L' 
                            AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                        )
                    )
                )
            ) A
            GROUP BY CODCENCUS, DESCRCENCUS
            ORDER BY 3 DESC
        )
        SELECT CODCENCUS, DESCRCENCUS, TOTAL_PEDIDOS FROM BAS
    </snk:query>

    <div class="container">
        <div id="treemap"></div>
    </div>

    <script>
        var labels = [];
        var values = [];
        <c:forEach var="row" items="${dias.rows}">
            labels.push("${row.DESCRCENCUS}");
            values.push(${row.TOTAL_PEDIDOS});
        </c:forEach>

        // Função para calcular a cor com base na quantidade
        function getColor(value, min, max) {
            const ratio = (value - min) / (max - min); // Normaliza o valor entre 0 e 1
            const r = Math.round(255 * (1 - ratio)); // Vermelho
            const g = Math.round(255 * ratio); // Verde
            const b = 0; // Azul fixo em 0
            return `rgba(${r}, ${g}, ${b}, 0.6)`; // Cor com transparência
        }

        // Determina o valor mínimo e máximo para a normalização
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);

        // Gera as cores para cada valor
        const colors = values.map(value => getColor(value, minValue, maxValue));

        var data = [{
            type: "treemap",
            labels: labels,
            parents: Array(labels.length).fill(""),
            values: values,
            textinfo: "label+value+percent entry",
            marker: {
                colors: colors // Usar as cores geradas
            }
        }];

        var layout = {
            title: 'Distribuição por Centro de Custo',
            font: { size: 12 },
            margin: { t: 50, l: 0, r: 0, b: 0 },
            height: 700,
            width: 1000
        };

        Plotly.newPlot('treemap', data, layout);
    </script>
</body>
</html>
