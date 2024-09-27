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
        SELECT
        DESCRCENCUS,
        COUNT(*) AS TOTAL_NOTAS
        FROM
        (
        /*********** NOTA SEM PEDIDO **************/
        SELECT 
        CAB.NUNOTA,CAB.CODEMP,CAB.CODCENCUS,CUS.DESCRCENCUS,CAB.CODNAT,CAB.CODPROJ,CAB.NUMNOTA,CAB.DTNEG,CAB.DTMOV,CAB.CODPARC,CAB.CODTIPOPER,CAB.DHTIPOPER,
        CAB.TIPMOV,CAB.NUMCOTACAO,CAB.VLRNOTA,CAB.AD_NUNOTAORIG,CAB.CODUSUINC,USU.NOMEUSU,USU.NOMEUSU AS COMPRADOR,
        'NOTA SEM PEDIDO' AS VERIFICACAO
        FROM TGFCAB CAB
        INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
        INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
        WHERE CAB.TIPMOV='C'
        AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND CAB.NUNOTA NOT IN (
        WITH VAR AS (SELECT DISTINCT NUNOTA,NUNOTAORIG FROM TGFVAR)
        SELECT 
        CAB.NUNOTA
        FROM TGFCAB CAB
        INNER JOIN VAR ON CAB.NUNOTA = VAR.NUNOTA
        WHERE CAB.TIPMOV='C'
        AND VAR.NUNOTAORIG IN (
        /*PEDIDOS COM COTACAO*/
        
        SELECT
        CAB.NUNOTA
        FROM TGFCAB CAB
        WHERE CAB.NUMCOTACAO IN(
        SELECT
        COT.NUMCOTACAO
        FROM TGFCOT COT
        WHERE 
        COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
        )
        
        UNION ALL
        
        
        /*PEDIDOS SEM COTACAO*/
        
        SELECT
        CAB.NUNOTA
        FROM TGFCAB CAB
        WHERE TIPMOV IN ('O') AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND CAB.NUNOTA NOT IN(
        SELECT
        CAB.NUNOTA
        FROM TGFCAB CAB
        WHERE CAB.NUMCOTACAO IN(
        SELECT
        COT.NUMCOTACAO
        FROM TGFCOT COT
        WHERE 
        COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
        )
        )
        )
        )
        
        
        UNION ALL
        
        
        
        /****************************** NOTA COM PEDIDO ***********************************/
        
        SELECT 
        B.NUNOTA,B.CODEMP,B.CODCENCUS,CUS.DESCRCENCUS,B.CODNAT,B.CODPROJ,B.NUMNOTA,B.DTNEG,B.DTMOV,B.CODPARC,B.CODTIPOPER,B.DHTIPOPER,
        B.TIPMOV,B.NUMCOTACAO,B.VLRNOTA,B.AD_NUNOTAORIG,B.CODUSUINC,USU.NOMEUSU,
        USU.NOMEUSU AS COMPRADOR,
        'NOTA COM PEDIDO' AS VERIFICACAO
        FROM
        (
        WITH VAR AS (SELECT DISTINCT NUNOTA,NUNOTAORIG FROM TGFVAR)
        SELECT 
        CAB.*
        FROM TGFCAB CAB
        INNER JOIN VAR ON CAB.NUNOTA = VAR.NUNOTA
        WHERE CAB.TIPMOV='C'
        AND VAR.NUNOTAORIG IN (
        /*PEDIDOS COM COTACAO*/
        
        SELECT
        CAB.NUNOTA
        FROM TGFCAB CAB
        WHERE CAB.NUMCOTACAO IN(
        SELECT
        COT.NUMCOTACAO
        FROM TGFCOT COT
        WHERE 
        COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
        )
        
        UNION ALL
        
        
        /*PEDIDOS SEM COTACAO*/
        
        SELECT
        CAB.NUNOTA
        FROM TGFCAB CAB
        WHERE TIPMOV IN ('O') AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND CAB.NUNOTA NOT IN(
        SELECT
        CAB.NUNOTA
        FROM TGFCAB CAB
        WHERE CAB.NUMCOTACAO IN(
        SELECT
        COT.NUMCOTACAO
        FROM TGFCOT COT
        WHERE 
        COT.NUMCOTACAO IN (SELECT CAB.NUMCOTACAO FROM TGFCAB CAB WHERE CAB.TIPMOV ='J' AND CAB.STATUSNOTA = 'L' AND CAB.DTMOV BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
        ))))B
        INNER JOIN TSIUSU USU ON B.CODUSUINC = USU.CODUSU
        INNER JOIN TSICUS CUS ON B.CODCENCUS = CUS.CODCENCUS
        ---------------------------------------------------
        ) GROUP BY DESCRCENCUS
        ORDER BY 2 DESC
    
    </snk:query>

    <div class="container">
        <div id="treemap"></div>
    </div>

    <script>
        var labels = [];
        var values = [];
        var filteredLabels = [];

        <c:forEach var="row" items="${dias.rows}">
            labels.push("${row.DESCRCENCUS}");
            values.push(${row.TOTAL_NOTAS});
            // Se o valor for maior ou igual a 30, mantém a label, caso contrário, deixa-a vazia
            filteredLabels.push(${row.TOTAL_NOTAS} >= 30 ? "${row.DESCRCENCUS}" : "Demais");
        </c:forEach>

        // Função para determinar a cor com base na quantidade
        function getColor(value) {
            if (value > 70) {
                return 'rgba(0, 128, 0, 0.6)'; // Verde forte
            } else if (value >= 51) {
                return 'rgba(34, 139, 34, 0.6)'; // Verde médio
            } else if (value >= 31) {
                return 'rgba(144, 238, 144, 0.6)'; // Verde claro
            } else if (value >= 11) {
                return 'rgba(220, 255, 220, 0.6)'; // Verde muito claro
            } else {
                return 'rgba(240, 255, 240, 0.6)'; // Verde muito pálido
            }
        }

        // Gera as cores para cada valor
        const colors = values.map(value => getColor(value));

        var data = [{
            type: "treemap",
            labels: filteredLabels,  // Usar a lista filtrada
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
