<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gráfico Sunburst com Plotly.js</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f4f4f9;
        }

        #chart-container {
            width: 100vw;  /* Ocupa toda a largura da tela */
            height: 100vh; /* Ocupa toda a altura da tela */
            margin: 0;
            padding: 0;
        }

        #sunburst-chart {
            width: 100%;
            height: 100%;
        }
    </style>
<snk:load/>
</head>
<body>

    <snk:query var="dias">
    WITH BAS AS (
        SELECT
            USU.NOMEUSU AS COMPRADOR,
            CASE WHEN USU.AD_USUCOMPRADOR='S' THEN 'COMPRADOR' ELSE 'NAO COMPRADOR' END AS VERIF,
            COUNT(*) AS TOTAL_PEDIDOS
        FROM
        (
            SELECT * FROM TGFCAB CAB
            WHERE TIPMOV IN ('O') AND CAB.NUMCOTACAO IN (
                SELECT COT.NUMCOTACAO
                FROM TGFCOT COT
                WHERE 
                    COT.NUMCOTACAO IN (
                        SELECT CAB.NUMCOTACAO
                        FROM TGFCAB CAB
                        WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN '01-08-2024' AND '31-08-2024'
                    )
            )
            UNION ALL
            SELECT * FROM TGFCAB CAB
            WHERE TIPMOV IN ('O') AND CAB.DTMOV BETWEEN '01-08-2024' AND '31-08-2024'
            AND CAB.NUNOTA NOT IN (
                SELECT CAB.NUNOTA
                FROM TGFCAB CAB
                WHERE CAB.NUMCOTACAO IN (
                    SELECT COT.NUMCOTACAO
                    FROM TGFCOT COT
                    WHERE 
                        COT.NUMCOTACAO IN (
                            SELECT CAB.NUMCOTACAO
                            FROM TGFCAB CAB
                            WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN '01-08-2024' AND '31-08-2024'
                        )
                )
            )
        ) A
        INNER JOIN TSIUSU USU ON A.CODUSUINC = USU.CODUSU
        GROUP BY USU.NOMEUSU, USU.AD_USUCOMPRADOR
        ORDER BY 3 DESC
    )
    SELECT VERIF, COMPRADOR, TOTAL_PEDIDOS FROM BAS
    </snk:query>

    <div id="chart-container">
        <div id="sunburst-chart"></div>
    </div>

<!-- Inclusão do Plotly.js -->
<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
<script>

    var queryData = [
        <c:forEach var="row" items="${dias.rows}">
            {
                comprador: '${row.COMPRADOR}',
                verif: '${row.VERIF}',
                total_pedidos: ${row.TOTAL_PEDIDOS}
            }<c:if test="${!rowStatus.last}">,</c:if>
        </c:forEach>
    ];


    var labels = [];
    var parents = [];
    var values = [];

    
    queryData.forEach(function(row) {
        labels.push(row.comprador);
        parents.push(row.verif);
        values.push(row.total_pedidos);
    });

    // Adiciona um nó pai para cada tipo de verificação
    var uniqueParents = Array.from(new Set(parents));
    uniqueParents.forEach(function(parent) {
        if (parent) {
            labels.push(parent);
            parents.push('');
            values.push(0); // Inicializa com zero, os valores serão calculados abaixo
        }
    });

    // Soma os valores dos filhos nos nós pai
    uniqueParents.forEach(function(parent) {
        var total = 0;
        queryData.forEach(function(row) {
            if (row.verif === parent) {
                total += row.total_pedidos;
            }
        });
        if (total > 0) {
            var index = labels.indexOf(parent);
            if (index !== -1) {
                values[index] += total; // Adiciona o total ao nó pai correspondente
            }
        }
    });


    // Dados do gráfico Sunburst
    var data = [{
        type: "sunburst",
        maxdepth: 2,
        labels: labels,
        parents: parents,
        values: values,
        leaf: { opacity: 0.7 },
        marker: { line: { width: 1 } },
        textinfo: "value", // Exibe rótulo, valor e percentual do pai
        //texttemplate: "%{label}<br>%{value}<br>%{percentParent}", // Personaliza o conteúdo que aparece nas fatias
        textfont: { size: 10, color: "black" }, 
        textposition: 'inside',
        insidetextorientation: 'vertical',
        hoverinfo: "label+value+percent parent"
    }];


    // Layout do gráfico
    var layout = {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        sunburstcolorway: ["#636efa", "#EF553B", "#00cc96", "#ab63fa", "#FFA15A"],
        extendsunburstcolorway: true
        
    };

    // Renderizando o gráfico
    Plotly.newPlot('sunburst-chart', data, layout);

</script>

</body>
</html>
