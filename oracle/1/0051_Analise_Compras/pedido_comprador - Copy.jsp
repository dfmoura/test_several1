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
            flex-direction: column; /* Para organizar o título e o gráfico verticalmente */
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f4f4f9;
        }

        h1 {
            margin: 20px; /* Margem para espaçamento do título */
            color: #333; /* Cor do texto do título */
        }

        #chart-container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100vw; /* Ocupa toda a largura da tela */
            height: 90vh; /* O gráfico ocupará 90% da altura da tela */
            padding: 0;
        }

        #sunburst-chart {
            width: 90vw;  /* O gráfico ocupará 90% da largura da tela */
            height: 90vh; /* O gráfico ocupará 90% da altura da tela */
        }

        @media (max-width: 600px) {
            #sunburst-chart {
                width: 100vw;  /* Para telas menores, o gráfico ocupa toda a largura */
                height: 80vh;  /* E 80% da altura */
            }
        }
    </style>
<snk:load/>
</head>
<body>

    <h1>Pedidos por Usuário</h1> <!-- Título adicionado -->

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
                            WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                        )
                )
                UNION ALL
                SELECT * FROM TGFCAB CAB
                WHERE TIPMOV IN ('O') AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
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
                                WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
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
        // Processando dados da consulta
        var queryData = [
            <c:forEach var="row" items="${dias.rows}">
                {
                    comprador: '${row.COMPRADOR}',
                    verif: '${row.VERIF}',
                    total_pedidos: ${row.TOTAL_PEDIDOS}
                }<c:if test="${!rowStatus.last}">,</c:if>
            </c:forEach>
        ];

        // Criando listas de labels, parents e values
        var labels = [];
        var parents = [];
        var values = [];

        // Preenche as listas com base nos dados da query
        queryData.forEach(function(row) {
            labels.push(row.comprador);
            parents.push(row.verif);
            values.push(row.total_pedidos);
        });

        // Adicionando os valores dos pais (COMPRADOR e NAO COMPRADOR)
        var totalsByParent = {};
        queryData.forEach(function(row) {
            if (totalsByParent[row.verif]) {
                totalsByParent[row.verif] += row.total_pedidos;
            } else {
                totalsByParent[row.verif] = row.total_pedidos;
            }
        });

        // Adicionando nós principais (pais) se não estiverem na lista e calculando seus totais
        var uniqueParents = Array.from(new Set(parents));
        uniqueParents.forEach(function(parent) {
            if (!labels.includes(parent)) {
                labels.push(parent);
                parents.push(''); // Pais principais não têm pais
                values.push(totalsByParent[parent]); // Adiciona o valor total de seus filhos
            }
        });

        // Definindo os dados do gráfico
        var data = [{
            type: "sunburst",
            maxdepth: 2,
            labels: labels,
            parents: parents,
            values: values,
            textinfo: "label+value",  // Exibe apenas rótulo e valor
            textposition: 'inside',
            insidetextorientation: 'radial',
            leaf: { opacity: 0.7 },
            marker: { line: { width: 1 } },
            textfont: { size: 14, color: "black" }, // Tamanho de texto aumentado
            hoverinfo: "label+value+percent parent",
            automargin: true  // Força margem automática para visibilidade
        }];

        // Configuração do layout
        var layout = {
            margin: { l: 10, r: 10, b: 10, t: 10 },  // Ajuste para evitar o corte do gráfico
            sunburstcolorway: ["#9DD6A8", "#FFA07A"], // Cores atualizadas
            extendsunburstcolorway: true,
            responsive: true,  // Torna o gráfico responsivo
            uniformtext: {
                minsize: 10,  // Tamanho mínimo para textos menores
                mode: 'hide'  // Garante que o texto seja exibido uniformemente
            }
        };

        // Renderizando o gráfico
        Plotly.newPlot('sunburst-chart', data, layout);

        // Centralizando e redimensionando o gráfico ao redimensionar a janela
        window.onresize = function() {
            Plotly.Plots.resize('sunburst-chart');
        };
    </script>
</body>
</html>
