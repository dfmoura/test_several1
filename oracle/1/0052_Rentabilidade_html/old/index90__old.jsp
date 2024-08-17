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


WITH 
ACF AS (
    SELECT DISTINCT
        ACF.NUNOTA,
        ACF.CODHIST,
        ACH.DESCRHIST
    FROM TGFACF ACF
    INNER JOIN TGFACH ACH ON ACF.CODHIST = ACH.CODHIST
    WHERE ACF.CODHIST > 0
),
BAS AS (
    SELECT 
        CAB.CODEMP,
        EMP.NOMEFANTASIA,        
        CAB.CODPARC,
        PAR.RAZAOSOCIAL,
        PAR.CODCID,
        UPPER(CID.NOMECID) AS NOMECID,
        PAR.CODBAI,
        BAI.NOMEBAI,
        CAB.CODTIPOPER,
        VEN.CODVEND||'-'||VEN.APELIDO AS VENDEDOR,
        VENS.CODVEND||'-'||VENS.APELIDO AS SUPERVISOR,
        VENG.CODVEND||'-'||VENG.APELIDO AS GERENTE,                        
        CAB.DTNEG,
        VAR.NUNOTA,
        VAR.NUNOTAORIG,
        CAB.TIPMOV AS TIPMOV,
        ITE.CODPROD,
        PRO.DESCRPROD,
        ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC AS VLRDEVOL,
        ACF.CODHIST,
        ACF.DESCRHIST
    FROM 
        TGFVAR VAR
        INNER JOIN TGFITE ITE ON VAR.NUNOTA = ITE.NUNOTA AND VAR.SEQUENCIA = ITE.SEQUENCIA
        INNER JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
        INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
        INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
        INNER JOIN TSIBAI BAI ON PAR.CODBAI = BAI.CODBAI
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
        INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
        INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
        LEFT JOIN ACF ON VAR.NUNOTAORIG = ACF.NUNOTA
        INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
        LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
        LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
    WHERE 
        CAB.TIPMOV IN ('D') 
        AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN
        
        AND CAB.CODEMP IN (:P_EMPRESA)
        AND CAB.CODNAT IN (:P_NATUREZA)
        AND CAB.CODCENCUS IN (:P_CR)
        AND VEN.AD_ROTA IN (:P_ROTA)
        
        AND ACF.CODHIST = :A_MOTIVO
        AND ITE.CODPROD = :A_PRODUTO
        
            
        
        AND TOP.GOLSINAL = -1
        AND TOP.ATIVO = 'S'
    ORDER BY 
        CAB.CODPARC,
        VAR.NUNOTA
)

SELECT    
BAS.CODEMP
, BAS.CODPROD||' - '||BAS.DESCRPROD AS PRODUTO
, BAS.NUNOTA
, TO_CHAR(BAS.DTNEG,'DD-MM-YYYY') AS DTNEG
, BAS.CODTIPOPER
, BAS.CODPARC
, BAS.RAZAOSOCIAL
, BAS.CODCID
, BAS.NOMECID
, BAS.CODBAI
, BAS.NOMEBAI
, BAS.VLRDEVOL
FROM BAS
ORDER BY 12 DESC


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
                            <th>Cód. Emp.</th>
                            <th>Nro. Único</th>
                            <th>Produto</th>
                            <th>Dt. Negociação</th>
                            <th>Cód. Tip. Oper.</th>
                            <th>Cód. Parc.</th>
                            <th>Parceiro</th>
                            <th>Cidade</th>
                            <th>Bairro</th>
                            <th>Vlr. Devol.</th>
                        </tr>
                    </thead>
                    <tbody>
                        <c:set var="total" value="0" />
                        <c:forEach items="${fat_det.rows}" var="row">
                            <tr>
                                <td>${row.CODEMP}</td>
                                <td onclick="abrir_portal('${row.NUNOTA}')">${row.NUNOTA}</td>
                                <td>${row.PRODUTO}</td>
                                <td>${row.DTNEG}</td>
                                <td>${row.CODTIPOPER}</td>
                                <td>${row.CODPARC}</td>
                                <td>${row.RAZAOSOCIAL}</td>
                                <td>${row.NOMECID}</td>
                                <td>${row.NOMEBAI}</td>
                                <td><fmt:formatNumber value="${row.VLRDEVOL}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                <c:set var="total" value="${total + row.VLRDEVOL}" />
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
