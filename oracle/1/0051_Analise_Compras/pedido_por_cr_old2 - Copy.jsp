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

        /* Container flexível para centralizar o gráfico */
        .container {
            display: flex;
            justify-content: center;  /* Centraliza horizontalmente */
            align-items: center;      /* Centraliza verticalmente */
            height: 100%;             /* Ocupa a altura total da página */
            width: 100%;              /* Ocupa a largura total da página */
            padding: 20px;            /* Espaçamento opcional */
        }

        /* Treemap deve se ajustar ao container */
        #treemap {
            width: 100%;
            height: 100%;
            max-width: 1000px;        /* Limite máximo opcional para largura */
            max-height: 700px;        /* Limite máximo opcional para altura */
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
                /*PEDIDOS COM COTACAO*/
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
                /*PEDIDOS SEM COTACAO*/
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
            )A
            GROUP BY CODCENCUS, DESCRCENCUS
            ORDER BY 3 DESC
        )
        SELECT CODCENCUS, DESCRCENCUS, TOTAL_PEDIDOS FROM BAS
    </snk:query>

    <!-- Container para centralizar o gráfico -->
    <div class="container">
        <div id="treemap"></div>
    </div>

    <script>
        // Crie arrays vazios para armazenar os dados da query
        var labels = [];
        var values = [];

        // Use JSTL para iterar sobre os resultados da query e preencher os arrays
        <c:forEach var="row" items="${dias.rows}">
            labels.push("${row.DESCRCENCUS}");  // Nome do Centro de Custo
            values.push(${row.TOTAL_PEDIDOS});   // Total de Pedidos
        </c:forEach>

        // Configure o Treemap com os dados dinâmicos
        var data = [{
            type: "treemap",
            labels: labels,         // Dados dinâmicos
            parents: Array(labels.length).fill(""),  // Sem hierarquia
            values: values,         // Dados dinâmicos
            textinfo: "label+value+percent entry",
            marker: {
				colors: [
                    'rgba(123, 239, 178, 0.6)',   // Verde suave
                    'rgba(137, 196, 244, 0.6)',   // Azul suave
                    'rgba(236, 112, 99, 0.6)',    // Vermelho suave
                    'rgba(165, 105, 189, 0.6)',   // Roxo suave
                    'rgba(247, 220, 111, 0.6)',   // Amarelo suave
                    'rgba(240, 178, 122, 0.6)'    // Laranja suave
                ]
            }
        }];

        // Layout opcional
        var layout = {
            title: 'Distribuição por Centro de Custo',
            font: { size: 12 },
            margin: { t: 50, l: 0, r: 0, b: 0 },
            height: 700, // Ajuste o tamanho máximo do gráfico
            width: 1000
        };

        // Renderizando o gráfico
        Plotly.newPlot('treemap', data, layout);
    </script>
</body>
</html>
