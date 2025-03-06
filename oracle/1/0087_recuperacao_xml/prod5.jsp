<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extrair Dados XML</title>

    <style>
    body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }

        h1 {
            text-align: center;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
        }

        tr:nth-child(even) {
            background-color: #f9f9f9;
        }

        tr:hover {
            background-color: #ddd;
        }
    </style>

    <snk:load/>
</head>

<body>
    <snk:query var="nfe">

    SELECT 
    xml AS xml,
    XMLTYPE(xml).EXTRACT('/NFe/infNFe/emit/CNPJ/text()', 'xmlns="http://www.portalfiscal.inf.br/nfe"').getStringVal() AS CNPJ,
    XMLTYPE(xml).EXTRACT('/NFe/infNFe/ide/nNF/text()', 'xmlns="http://www.portalfiscal.inf.br/nfe"').getStringVal() AS nNF,
    XMLTYPE(xml).EXTRACT('/NFe/infNFe/ide/dhEmi/text()', 'xmlns="http://www.portalfiscal.inf.br/nfe"').getStringVal() AS dhEmi
FROM (
    SELECT xml
    FROM tgfnfe
    ORDER BY chavenfe DESC
)
WHERE ROWNUM < 10

</snk:query>

    <h1>Dados da NFe</h1>

    <table>
        <thead>
        <tr>
        <th>CNPJ</th>
        <th>nNF</th>
        <th>dhEmi</th>
        </tr>
        </thead>
        <c:forEach var="row" items="${nfe.rows}">
        <tbody>
        <tr>
        <td>${row.CNPJ}</td>
        <td>${row.nNF}</td>
        <td>${row.dhEmi}</td>
        </tr>
    </tbody>
    </c:forEach>
        </table>




</body>
</html>
