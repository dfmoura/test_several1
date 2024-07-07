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
            background: #28a745;
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
            font-size: 12px;
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

    <snk:query var="compras_saving_detalhe">
    WITH
    ANT AS (
    SELECT
        CODPROD,
        DESCRICAO,
        AVG(PRECO_COMPRA_UN_LIQ) AS PRECO_COMPRA_UN_LIQ_ANT_MED
    FROM
    (
        SELECT
            ITE.CODPROD,
            PRO.DESCRPROD AS DESCRICAO,
            ITE.CODVOL AS UN,
            ITE.NUNOTA AS NUNOTA,
            F_DESCROPC('TGFCAB','TIPMOV',CAB.TIPMOV) AS TIPMOV,
            VEN.CODVEND||'-'||VEN.APELIDO AS COMPRADOR,
            ITE.QTDNEG,
            ITE.VLRTOT,
            ITE.VLRDESC,
            (ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA,
            (ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN_LIQ,
    
            ITE.VLRDESC AS SAVING,
            ((ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0)) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)) AS SAVING_UN,
            (ITE.VLRDESC / NULLIF(ITE.VLRTOT,0)) * 100 AS PERCENTUAL_SAVING
          FROM TGFITE ITE
          INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
          INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
          INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )
          INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
         WHERE CAB.TIPMOV = 'O'
           AND CAB.STATUSNOTA = 'L'
           AND CAB.DTNEG < :P_PERIODO.INI)
    GROUP BY CODPROD, DESCRICAO
    ORDER BY 2,3 DESC
    ),
    USU AS (SELECT CODUSU,NOMEUSU FROM TSIUSU)
    
    SELECT CAB.CODEMP,
           CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL) AS PARCEIRO,
           ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO,
           PRO.CODGRUPOPROD||'-'|| GRU.DESCRGRUPOPROD AS GRUPO,
           ITE.CODVOL AS UN,
           ITE.NUNOTA AS NUNOTA,
           CAB.TIPMOV AS TIPMOV,
           CAB.DTNEG,
           VEN.CODVEND||'-'||VEN.APELIDO AS COMPRADOR,
           CAB.CODUSUINC||'-'||USU.NOMEUSU AS USUARIO_INC,
           ITE.QTDNEG,
           ITE.VLRTOT,
           ITE.VLRDESC,
           (ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN,
           (ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN_LIQ,
           NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) AS PRECO_COMPRA_UN_LIQ_ANT_MED,
           NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)) AS DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ,
            CASE
            WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) > 0 THEN 'REDUCAO'
            WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) < 0 AND NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) <> 0 THEN 'AUMENTO'
            WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) < 0  AND NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) = 0 THEN 'SEM ALTERACAO'
            ELSE 'MANTEVE'
            END AS SITUACAO_PRECO,
           ABS(NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)))/NULLIF(((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)),0)*100 AS PERC_DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ,
           ITE.VLRDESC AS SAVING,
           ((ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0)) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)) AS SAVING_UN,
           (ITE.VLRDESC / NULLIF(ITE.VLRTOT,0)) * 100 AS PERC_SAVING
      FROM TGFITE ITE
      INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
      INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
      INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER))
      INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
      INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
      INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
      LEFT JOIN ANT ON ITE.CODPROD = ANT.CODPROD
      INNER JOIN USU ON CAB.CODUSUINC = USU.CODUSU
     WHERE CAB.TIPMOV = 'O'
       AND CAB.STATUSNOTA = 'L'
       AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
    ORDER BY 4,17 DESC
    </snk:query>

    <div class="container-fluid table-container">
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Cód. Emp.</th>
                    <th>Parceiro</th>
                    <th>Produto</th>
                    <th>Grupo</th>
                    <th>UN</th>
                    <th>NÚ. Único</th>
                    <th>Tp. Mov.</th>
                    <th>Dt. Neg.</th>
                    <th>Comprador</th>
                    <th>Usu. Inclusão</th>
                    <th>Qtd. Neg.</th>
                    <th>Vlr. Tot.</th>
                    <th>Vlr. Desc.</th>
                    <th>Preço (UN)</th>
                    <th>Preço Liq. (UN)</th>
                    <th>Preço Liq. Ante. Méd. (UN)</th>
                    <th>Dif.</th>
                    <th>Situação Preço</th>
                    <th>% Dif.</th>
                    <th>Saving</th>
                    <th>Saving (UN)</th>
                    <th>% Saving</th>
                </tr>
            </thead>
            <tbody>
                <c:forEach items="${compras_saving_detalhe.rows}" var="row">
                    <tr>
                        <td>${row.CODEMP}</td>
                        <td>${row.PARCEIRO}</td>
                        <td>${row.PRODUTO}</td>
                        <td>${row.GRUPO}</td>
                        <td>${row.UN}</td>
                        <td>${row.NUNOTA}</td>
                        <td>${row.TIPMOV}</td>
                        <td>${row.DTNEG}</td>
                        <td>${row.COMPRADOR}</td>
                        <td>${row.USUARIO_INC}</td>
                        <td>${row.QTDNEG}</td>
                        <td>${row.VLRTOT}</td>
                        <td>${row.VLRDESC}</td>
                        <td>${row.PRECO_COMPRA_UN}</td>
                        <td>${row.PRECO_COMPRA_UN_LIQ}</td>
                        <td>${row.PRECO_COMPRA_UN_LIQ_ANT_MED}</td>
                        <td>${row.DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ}</td>
                        <td>${row.SITUACAO_PRECO}</td>
                        <td>${row.PERC_DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ}</td>
                        <td>${row.SAVING}</td>
                        <td>${row.SAVING_UN}</td>
                        <td>${row.PERC_SAVING}</td>
                    </tr>
                </c:forEach>
            </tbody>
        </table>
    </div>
</body>
</html>