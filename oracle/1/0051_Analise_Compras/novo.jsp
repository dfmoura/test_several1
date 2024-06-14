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
DECODE(VEN.APELIDO,'<SEM VENDEDOR>','NAO INFORMADO',VEN.APELIDO) AS COMPRADOR,
CAB.DTMOV,
CAB.NUNOTA,
CAB.NUMNOTA,
CAB.NUMCOTACAO,
F_DESCROPC('TGFCAB','TIPMOV',CAB.TIPMOV) AS DESC_TIPMOV,
CAB.CODPARC,
PAR.RAZAOSOCIAL,
CAB.CODTIPOPER,
CAB.VLRNOTA
FROM TGFCAB CAB
INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
WHERE TIPMOV IN ('O')
ORDER BY CAB.NUNOTA DESC


</snk:query>

<!-- Tabela estilizada -->
<table>
    <caption>Tabela de Exemplo</caption>
    <thead>
        <tr>
            <th>Comprador</th>
            <th>Dt. Movimentação</th>
            <th>NÚ. Único</th>
            <th>Nro. Nota</th>
            <th>Nro. Cotação</th>
            <th>Tp. Movimentação</th>
            <th>Cód. Parceiro</th>
            <th>Parceiro</th>
            <th>TOP</th>
            <th>Vlr. Nota</th>
        </tr>
    </thead>
    <tbody>
        <c:forEach items="${dias.rows}" var="row">
            <tr>
                <td>${row.COMPRADOR}</td>
                <td>${row.DTMOV}</td>
                <td>${row.NUNOTA}</td>
                <td>${row.NUMNOTA}</td>
                <td>${row.NUMCOTACAO}</td>
                <td>${row.CODPARC}</td>
                <td>${row.RAZAOSOCIAL}</td>
                <td>${row.CODTIPOPER}</td>
                <td><fmt:formatNumber value="${row.VLRNOTA}" pattern="#,##0.00" /></td>
            </tr>
        </c:forEach>
    </tbody>
</table>

</body>
</html>
