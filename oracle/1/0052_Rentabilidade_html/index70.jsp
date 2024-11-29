<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Example</title>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            margin: 20px;
        }
        .card {
            border-radius: 15px;
        }
        .card-header {
            border-top-left-radius: 0px;
            border-top-right-radius: 0px;
        }
        .card-body {
            border-bottom-left-radius: 0px;
            border-bottom-right-radius: 0px;
        }
        .table-container {
            flex-grow: 1;
            width: 100%;
            overflow-x: auto;
        }
        .table-scrollable {
            width: 100%;
            overflow-y: auto;
            overflow-x: auto;
            max-height: 400px; /* Ajuste conforme necessário */
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        th, td {
            
            text-align: left;
            padding: 8px;
            border-radius: 8px;
        }
        th {
            background-color: #130455;
            color: white;
            position: sticky;
            top: 0;
            z-index: 2; /* Certifique-se de que os cabeçalhos fiquem acima das linhas */
        }
        /* Efeito de hover */
        tbody tr:hover {
            background-color: #f0f0f0;
            cursor: pointer;
        }
    </style>
    <snk:load/>
</head>

<body>
<snk:query var="fat_det">
SELECT
CODEMP,
CODPROD||' - '||DESCRPROD AS PRODUTO,
NUNOTA,
TO_CHAR(DTNEG,'DD-MM-YYYY') DTNEG,
CODTIPOPER,
CODPARC,
NOMEPARC,
0 VLR_UN,
SUM(TOTALLIQ)VLRFAT

FROM VGF_CONSOLIDADOR_NOTAS_GM
WHERE
DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND GOLSINAL = -1
AND TIPMOV IN ('V', 'D')
AND ATIVO = 'S' 
AND CODEMP IN (:P_EMPRESA)
AND CODNAT IN (:P_NATUREZA)
AND CODCENCUS IN (:P_CR)
AND CODVEND IN (:P_VENDEDOR)
AND AD_SUPERVISOR IN (:P_SUPERVISOR)
AND CODGER IN (:P_GERENTE)
AND AD_ROTA IN (:P_ROTA)
AND CODTIPOPER IN (:P_TOP)

AND CODPROD = :A_CODPROD
AND CODGER = :A_GERENTE

GROUP BY 
CODEMP, 
CODPROD||' - '||DESCRPROD,
NUNOTA,
TO_CHAR(DTNEG,'DD-MM-YYYY'),
CODTIPOPER,
CODPARC,
NOMEPARC
ORDER BY 7 DESC
</snk:query>

    <div class="container-fluid">
        <div class="card">
            <div class="card-header">
                <h3>Faturamento Detalhado</h3>
            </div>
            <div class="table-container table-scrollable">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nro. Único</th>
                            <th>Dt. Negociação</th>
                            <th>Cód. Tip. Oper.</th>
                            <th>Cód. Parc.</th>
                            <th>Parceiro</th>
                            <th>Preço Médio</th>
                            <th>Vlr. Fat.</th>
                        </tr>
                    </thead>
                    <tbody>
                        <c:set var="total" value="0" />
                        <c:forEach items="${fat_det.rows}" var="row">
                            <tr>
                                <td onclick="abrir_portal('${row.NUNOTA}')">${row.NUNOTA}</td>
                                <td>${row.DTNEG}</td>
                                <td>${row.CODTIPOPER}</td>
                                <td>${row.CODPARC}</td>
                                <td>${row.NOMEPARC}</td>
                                <td><fmt:formatNumber value="${row.VLR_UN}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                <td><fmt:formatNumber value="${row.VLRFAT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                <c:set var="total" value="${total + row.VLRFAT}" />
                            </tr>
                        </c:forEach>
                        <tr>
                            <td><b>Total</b></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td><b><fmt:formatNumber value="${total}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></b></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        function abrir_portal(nunota) {
            var params = {'NUNOTA': nunota};
            var level = 'br.com.sankhya.com.mov.CentralNotas';
            openApp(level, params);
        }

    </script>

    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.4/dist/umd/popper.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>
</html>
