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
    grupo,
    Origem,
    chaveacesso,
    codemp,
    nunota,
    NUMNOTA,
    dhEmissao,
    codparc,
    razaosocial,
    UF,
    CNPJ_CPF,
    sequencia,
    CFOP,
    CST,
    ncm,
    codprod,
    descrprod,
    codvol,
    qtdneg,
    vlrunit,
    vlrtot,
    baseicms,
    aliqicms,
    vlricms

    FROM VIEW_XML_SIS_SATIS
    WHERE 
    dhemissao BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
    AND (nunota = :P_NUNOTA OR :P_NUNOTA IS NULL)
    AND codemp IN :P_EMPRESA



</snk:query>

    <h1>Dados da NFe</h1>

    <table>
        <thead>
        <tr>
            <th>grupo</th>
            <th>Origem</th>
            <th>chaveacesso</th>
            <th>codemp</th>
            <th>nunota</th>
            <th>NUMNOTA</th>
            <th>dhEmissao</th>
            <th>codparc</th>
            <th>razaosocial</th>
            <th>UF</th>
            <th>CNPJ_CPF</th>
            <th>sequencia</th>
            <th>CFOP</th>
            <th>CST</th>
            <th>ncm</th>
            <th>codprod</th>
            <th>descrprod</th>
            <th>codvol</th>
            <th>qtdneg</th>
            <th>vlrunit</th>
            <th>vlrtot</th>
            <th>baseicms</th>
            <th>aliqicms</th>
            <th>vlricms</th>
        </tr>
        </thead>
        <c:forEach var="row" items="${nfe.rows}">
        <tbody>
        <tr>
            <td>${row.grupo}</td>
            <td>${row.Origem}</td>
            <td>${row.chaveacesso}</td>
            <td>${row.codemp}</td>
            <td>${row.nunota}</td>
            <td>${row.NUMNOTA}</td>
            <td>${row.dhEmissao}</td>
            <td>${row.codparc}</td>
            <td>${row.razaosocial}</td>
            <td>${row.UF}</td>
            <td>${row.CNPJ_CPF}</td>
            <td>${row.sequencia}</td>
            <td>${row.CFOP}</td>
            <td>${row.CST}</td>
            <td>${row.ncm}</td>
            <td>${row.codprod}</td>
            <td>${row.descrprod}</td>
            <td>${row.codvol}</td>
            <td>${row.qtdneg}</td>
            <td>${row.vlrunit}</td>
            <td>${row.vlrtot}</td>
            <td>${row.baseicms}</td>
            <td>${row.aliqicms}</td>
            <td>${row.vlricms}</td>
        </tr>
    </tbody>
    </c:forEach>
        </table>




</body>
</html>
