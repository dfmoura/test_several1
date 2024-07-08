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
    <title>Dashboard Example</title>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">

    <style>
        body {
            background-color: #f8f9fa;
            font-family: 'Arial', sans-serif;
        }

        .table-container {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }

        .table {
            width: 100%;
            margin-bottom: 0;
            border-collapse: separate;
            border-spacing: 0 10px;
        }

        .table thead th {
            position: sticky;
            top: 0;
            background: #007bff;
            color: white;
            z-index: 1;
            box-shadow: 0 2px 2px -1px rgba(0, 0, 0, 0.4);
            text-align: center;
            padding: 10px;
        }

        .table tbody tr {
            background-color: white;
            transition: background-color 0.3s ease;
        }

        .table tbody tr:hover {
            background-color: #e9ecef;
        }

        .table tbody td {
            padding: 15px;
            text-align: center;
            border-top: 1px solid #dee2e6;
        }

        .table tbody tr:nth-of-type(even) {
            background-color: #f1f1f1;
        }

        .table tbody tr td:first-child {
            border-top-left-radius: 10px;
            border-bottom-left-radius: 10px;
        }

        .table tbody tr td:last-child {
            border-top-right-radius: 10px;
            border-bottom-right-radius: 10px;
        }
    </style>

<snk:load/>

</head>
<body>

<snk:query var="compras_saving">  
    SELECT ITE.CODPROD,
           PRO.DESCRPROD AS DESCRICAO,
           ITE.CODVOL AS UN,
           ITE.NUNOTA AS NUNOTA,
           VEN.CODVEND||'-'||VEN.APELIDO AS COMPRADOR,
           (ITE.VLRTOT - ITE.VLRDESC) / ITE.QTDNEG AS PRECO_COMPRA, 0 AS PRECO_COMPRA_ANTERIOR, 0 AS SAVING
      FROM TGFITE ITE
      INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
      INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
      INNER JOIN TGFTOP TPO ON (CAB.CODTIPOPER = TPO.CODTIPOPER AND CAB.DHTIPOPER = TPO.DHALTER)
      INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
     WHERE CAB.TIPMOV = 'C'
       AND CAB.STATUSNOTA = 'L'
       AND TPO.GOLSINAL = 1
       AND TPO.GOLDEV = 1
       AND TRUNC(CAB.DTENTSAI) BETWEEN '01-06-2024' AND '30-06-2024'
</snk:query> 

    <div class="container-fluid table-container">
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Cód.Produto</th>
                    <th>Produto</th>
                    <th>UN</th>
                    <th>NÚ. Único</th>
                    <th>Comprador</th>
                    <th>Preço Compra</th>
                    <th>???Preço Anterior</th>
                    <th>???Saving</th>
                </tr>
            </thead>
            <tbody>
                <c:forEach items="${compras_saving.rows}" var="row">
                    <tr>
                        <td>${row.CODPROD}</td>
                        <td>${row.DESCRICAO}</td>
                        <td>${row.UN}</td>
                        <td>${row.NUNOTA}</td>
                        <td>${row.COMPRADOR}</td>
                        <td>${row.PRECO_COMPRA}</td>
                        <td>${row.PRECO_COMPRA_ANTERIOR}</td>
                        <td>${row.SAVING}</td>
                    </tr>
                </c:forEach>
            </tbody>
        </table>
    </div>
</body>
</html>


<span style="font-size: 30px; font-weight: bold; color: #4CAF50; text-decoration: underline;">
CALCULOS PARA VERIFICAÇÃO:

VALOR UNITARIO = (VALOR TOTAL - DESCONTO) / PREÇO UNITARIO
VALOR UNITARIO ANTERIOR = ?????
SAVING = ?????

</span>