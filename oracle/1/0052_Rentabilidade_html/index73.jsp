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
    CAB.CODEMP
    , ITE.CODPROD||' - '||PRO.DESCRPROD AS PRODUTO
    , CAB.NUNOTA
    , TO_CHAR(CAB.DTNEG,'DD-MM-YYYY') AS DTNEG
    , CAB.CODTIPOPER
    , CAB.CODPARC
    , PAR.RAZAOSOCIAL
    , ROUND(AVG(ITE.VLRUNIT * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)), 2) AS VLR_UN
    , ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
    
    , ROUND(NVL(AVG(ITE.VLRSUBST + ITE.VLRIPI + 
    (CASE 
    WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD = 1 AND CID.UF = 2 AND PAR.INSCESTADNAUF <> '    ' 
    THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.04
    WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD = 1 AND CID.UF = 2 AND PAR.INSCESTADNAUF = '    ' 
    THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.06
    WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD = 1 AND CID.UF <> 2 AND PAR.TIPPESSOA = 'J' 
    THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.04
    WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD IN (2,3,4) AND CID.UF = 2
    THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.06
    WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD IN (2,3,4) AND CID.UF IN (1,7,8,15,13)
    THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.03
    WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD IN (2,3,4) AND CID.UF NOT IN (2, 1, 7, 8, 15, 13)
    THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.01
    ELSE ITE.VLRICMS END)
    + NVL((SELECT VALOR FROM TGFDIN WHERE NUNOTA = ITE.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 6),0)
    + NVL((SELECT VALOR FROM TGFDIN WHERE NUNOTA = ITE.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 7),0)
    ),0),2) AS VLRIMP
    
    , ROUND(AVG(NVL(CUS.CUSSEMICM,0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)),2) AS CMV
    , ROUND(AVG((
    (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
    - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6 AND SEQUENCIA = ITE.SEQUENCIA),0)
    - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7 AND SEQUENCIA = ITE.SEQUENCIA),0)
    - (NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
    ) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)),2) AS MAR_NON
    
    , ROUND(AVG((
    (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS) 
    - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6 AND SEQUENCIA = ITE.SEQUENCIA),0)
    - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7 AND SEQUENCIA = ITE.SEQUENCIA),0)
    - (NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
    ) * 100 / 
    NULLIF((ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC),0)),2) AS MAR_PERC
        
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND DTATUAL <= CAB.DTNEG)
    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
    INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
    WHERE TOP.GOLSINAL = -1 
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
    
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    
    AND VEN.AD_SUPERVISOR = :A_SUPERVISOR
    AND ITE.CODPROD = :A_CODPROD
    AND CAB.CODEMP IN (:P_EMPRESA)
    AND CAB.CODNAT IN (:P_NATUREZA)
    AND CAB.CODCENCUS IN (:P_CR)
    
    AND VEN.AD_ROTA IN (:P_ROTA)
    GROUP BY CAB.CODEMP, ITE.CODPROD||' - '||PRO.DESCRPROD
    , CAB.NUNOTA
    , CAB.DTNEG
    , CAB.CODTIPOPER
    , CAB.CODPARC
    , PAR.RAZAOSOCIAL
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
                                <td>${row.RAZAOSOCIAL}</td>
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
