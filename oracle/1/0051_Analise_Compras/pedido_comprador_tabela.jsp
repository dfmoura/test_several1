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
        /* Estilos básicos para a tabela */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 18px;
            text-align: left;
        }

        th, td {
            padding: 12px;
            border: 1px solid #ddd;
        }

        th {
            background-color: #f2f2f2;
            color: #333;
        }

        tr:hover {
            background-color: #f1f1f1;
        }

        /* Estilo para o corpo da página */
        body {
            font-family: Arial, sans-serif;
            background-color: #fafafa;
            margin: 20px;
        }

        h1 {
            text-align: center;
        }
    </style>
<snk:load/>
</head>
<body>

    <h1>Resultados dos Pedidos</h1> <!-- Título para a tabela -->

    
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
        
    )
    SELECT VERIF, COMPRADOR, TOTAL_PEDIDOS FROM BAS
    order by 1,2

    
    </snk:query>

    <table>
        <thead>
            <tr>
                <th>Tipo</th>
                <th>Comprador</th>
                <th>Total de Pedidos</th>
            </tr>
        </thead>
        <tbody>
            <c:forEach items="${dias.rows}" var="row">            
                <tr>
                    <td>${row.VERIF}</td>
                    <td>${row.COMPRADOR}</td>
                    <td>${row.TOTAL_PEDIDOS}</td>
                </tr>
            </c:forEach>
        </tbody>
    </table>

</body>
</html>
