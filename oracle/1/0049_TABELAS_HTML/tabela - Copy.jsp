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
    <title>Card Dashboard</title>
    <style>
        /* Reset CSS */
        /* Body styles */
        body {
            font-family: Arial, sans-serif;
        }
        /* Card styles */
        .card {
            width: 300px;
            padding: 8px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            text-align: center;
            cursor: pointer; /* Add cursor pointer to indicate it's clickable */
        }
        .card-title {
            font-size: 20px;
            color: #fff;
            margin-bottom: 10px;
        }
        .card-content {
            font-size: 45px;
            margin-bottom: 20px;
        }
        .card-description {
            font-size: 15px;
            color: #fff;
        }
        /* Blue card style */
        .blue-card {
            background-color: #007bff;
            color: #fff;
            font-weight: bold;
        }
        /* Red card style */
        .red-card {
            background-color: #dc3545;
            color: #fff;
            font-weight: bold;
        }
        /* Table styles */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 18px;
            text-align: left;
        }
        table thead tr {
            background-color: #0add62ea;
            color: #ffffff;
            text-align: left;
        }
        table th, table td {
            padding: 12px 15px;
            border: 1px solid #dddddd;
        }
        table tbody tr:nth-of-type(even) {
            background-color: #f3f3f3;
        }
        table tbody tr:nth-of-type(odd) {
            background-color: #ffffff;
        }
        table tbody tr:hover {
            background-color: #f1f1f1;
        }
        caption {
            caption-side: top;
            font-size: 1.5em;
            margin: 10px;
        }
    </style>
    <snk:load />
</head>
<body>

<snk:query var="dias">

SELECT
ORDEM,
VERIFICACAO,
MARCA,
VOLUME_SB,
VOLUME_SA
FROM 
(

SELECT ORDEM, 'OK' AS VERIFICACAO,MARCA, VOLUME_SB,VOLUME_SA FROM(
SELECT
ROW_NUMBER() OVER (ORDER BY SUM(VOLUME_SB) DESC) AS ORDEM, MARCA,SUM(VOLUME_SB) AS VOLUME_SB,SUM(VOLUME_SA) AS VOLUME_SA
FROM
(        SELECT VGF.MARCA,
               SUM(VGF.QTD) AS VOLUME_SB,  ------ VOLUME SAFRA BASE
               0 AS VOLUME_SA,  ------ VOLUME SAFRA ANTERIOR
               VGF.CODPARC,
               VGF.CODPROD,
               VGF.CODGRUPOPROD
        FROM VGF_VENDAS_SATIS VGF
        WHERE VGF.DTMOV BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
          AND VGF.CODTIPOPER NOT IN ('1111', '1103')
          AND VGF.BONIFICACAO = 'N'
        GROUP BY VGF.MARCA, VGF.CODPARC, VGF.CODPROD, VGF.CODGRUPOPROD
        UNION 
        SELECT VGF.MARCA,
               0 AS VOLUME_SB,  ------ VOLUME SAFRA BASE
               SUM(VGF.QTD) AS VOLUME_SA,  ------ VOLUME SAFRA ANTERIOR
               VGF.CODPARC,
               VGF.CODPROD,
               VGF.CODGRUPOPROD
        FROM VGF_VENDAS_SATIS VGF
        WHERE VGF.DTMOV BETWEEN :P_PERIODO2.INI AND :P_PERIODO2.FIN
          AND VGF.CODTIPOPER NOT IN ('1111', '1103')
          AND VGF.BONIFICACAO = 'N'
        GROUP BY VGF.MARCA, VGF.CODPARC, VGF.CODPROD, VGF.CODGRUPOPROD )
GROUP BY MARCA ) WHERE ORDEM <=7


UNION ALL


SELECT ORDEM,'OUTROS' AS VERIFICACAO, MARCA, VOLUME_SB,VOLUME_SA FROM(
SELECT ROW_NUMBER() OVER (ORDER BY SUM(VOLUME_SB) DESC) AS ORDEM, MARCA,SUM(VOLUME_SB) AS VOLUME_SB,SUM(VOLUME_SA) AS VOLUME_SA
FROM
(        SELECT VGF.MARCA,
               SUM(VGF.QTD) AS VOLUME_SB,  ------ VOLUME SAFRA BASE
               0 AS VOLUME_SA,  ------ VOLUME SAFRA ANTERIOR
               VGF.CODPARC,
               VGF.CODPROD,
               VGF.CODGRUPOPROD
        FROM VGF_VENDAS_SATIS VGF
        WHERE VGF.DTMOV BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
          AND VGF.CODTIPOPER NOT IN ('1111', '1103')
          AND VGF.BONIFICACAO = 'N'
        GROUP BY VGF.MARCA, VGF.CODPARC, VGF.CODPROD, VGF.CODGRUPOPROD
        UNION 
        SELECT VGF.MARCA,
               0 AS VOLUME_SB,  ------ VOLUME SAFRA BASE
               SUM(VGF.QTD) AS VOLUME_SA,  ------ VOLUME SAFRA ANTERIOR
               VGF.CODPARC,
               VGF.CODPROD,
               VGF.CODGRUPOPROD
        FROM VGF_VENDAS_SATIS VGF
        WHERE VGF.DTMOV BETWEEN :P_PERIODO2.INI AND :P_PERIODO2.FIN
          AND VGF.CODTIPOPER NOT IN ('1111', '1103')
          AND VGF.BONIFICACAO = 'N'
        GROUP BY VGF.MARCA, VGF.CODPARC, VGF.CODPROD, VGF.CODGRUPOPROD )
GROUP BY MARCA ) WHERE ORDEM >7
)
WHERE VERIFICACAO = :A_VERIFICACAO AND (ORDEM <=7 OR ORDEM >7) AND (MARCA = :A_MARCA OR VERIFICACAO = 'OUTROS')


</snk:query>

<!-- Tabela estilizada -->
<table>
    <caption>Tabela de Exemplo</caption>
    <thead>
        <tr>
            <th>Ordem</th>
            <th>Verificação</th>
            <th>Marca</th>
            <th>Volume SB</th>
            <th>Volume SA</th>
        </tr>
    </thead>
    <tbody>
        <c:forEach items="${dias.rows}" var="row">
            <tr>
                <td>${row.ORDEM}</td>
                <td>${row.VERIFICACAO}</td>
                <td>${row.MARCA}</td>
                <td><fmt:formatNumber value="${row.VOLUME_SB}" pattern="#,##0.00" /></td>
                <td><fmt:formatNumber value="${row.VOLUME_SA}" pattern="#,##0.00" /></td>
            </tr>
        </c:forEach>
    </tbody>
</table>

</body>
</html>