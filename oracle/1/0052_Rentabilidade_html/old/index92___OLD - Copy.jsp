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
    <title>Teste de Tabela</title>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
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
    TO_CHAR(LAN.REFERENCIA,'MM-YYYY') AS MES_ANO,
    LAN.CODEMP,
    LAN.REFERENCIA,
    LAN.NUMLOTE,
    LAN.NUMLANC,
    LAN.TIPLANC,
    LAN.CODCTACTB,
    LAN.CODCONPAR,
    LAN.CODCENCUS,
    CRI.DESCRCENCUS,
    LAN.DTMOV,
    LAN.CODHISTCTB,
    LAN.COMPLHIST,
    LAN.NUMDOC,
    LAN.VENCIMENTO,
    LAN.LIBERADO,
    LAN.CODUSU,
    LAN.CODPROJ,
    LAN.PARTLALUR_A,
    LAN.SEQUENCIA,
    PLA.DESCRCTA, 
    PLA.CTACTB, 
    PLA.DESCRCTA, 
    CASE WHEN LAN.TIPLANC = 'R' THEN (LAN.VLRLANC *(-1)) ELSE LAN.VLRLANC END AS "VLRLANC",
    CASE WHEN LAN.TIPLANC = 'D' THEN 'RED' ELSE 'BLUE' END AS FGCOLOR
    FROM TCBLAN LAN
    INNER JOIN TCBPLA PLA ON LAN.CODCTACTB = PLA.CODCTACTB
    LEFT JOIN TSICUS CRI ON LAN.CODCENCUS = CRI.CODCENCUS
    WHERE
    (PLA.CTACTB  LIKE '3.1.04.005%' OR
    PLA.CTACTB  LIKE '3.1.04.006%'  OR
    PLA.CTACTB  LIKE '3.1.04.009%'  OR
    PLA.CTACTB  LIKE '3.1.04.010%') AND
    (LAN.DTMOV BETWEEN ADD_MONTHS (:P_PERIODO.FIN, -12) AND :P_PERIODO.FIN) AND
    NUMLOTE<>999 AND
    ( 
    (TO_CHAR(LAN.REFERENCIA,'MM') = :A_MES) AND
    (TO_CHAR(LAN.REFERENCIA,'YYYY') = :A_ANO)
    ) AND
    PLA.CTACTB <> '3.1.04.010.0001'
    ORDER BY LAN.REFERENCIA
    




</snk:query>

    <h1>Detalhamento dos Lançamentos</h1>
    <div class="table-container table-scrollable">
        <table class="table">
            <thead>
                <tr>
                    <th>Cód. Emp.</th>
                    <th>Mês / Ano</th>
                    <th>Ref.</th>
                    <th>Nro. Lote</th>
                    <th>Nro. Lanç.</th>
                    <th>Tp. Lanç.</th>
                    <th>Cód. CTA CTB</th>
                    <th>Cód. Con. Par.</th>
                    <th>Cód. CR</th>
                    <th>Vlr. Lanç.</th>
                </tr>
            </thead>
            <tbody>
                <c:forEach var="row" items="${fat_det.rows}">
                <tr>
                    <td>${row.CODEMP}</td>
                    <td>${row.MES_ANO}</td>
                    <td>${row.REFERENCIA}</td>
                    <td>${row.NUMLOTE}</td>
                    <td>${row.NUMLANC}</td>
                    <td>${row.TIPLANC}</td>
                    <td>${row.CODCTACTB}</td>
                    <td>${row.CODCONPAR}</td>
                    <td>${row.CODCENCUS}</td>
                    <td style="text-align: right;">${row.VLRLANC}</td>
                </tr>
                </c:forEach>
                <tr>
                    <td><b>Total</b></td>
                    <td></td>
                    <td></td>
                    <td></td>
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

    
    
    


</body>
</html>
