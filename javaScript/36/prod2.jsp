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
    <title>Dash Análise de Giro e Previsão Demanda</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            background-color: #f9f9f9;
            color: #333;
        }
        .container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            text-align: center;
            padding: 20px;
            flex: 0 0 auto;
        }
        .header h1 {
            margin: 0;
        }
        .info {
            margin-top: 10px;
        }
        .info span {
            display: block;
            margin: 5px 0;
        }
        .table-container {
            flex: 1 1 auto;
            padding: 20px;
            overflow-y: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        th, td {
            padding: 12px;
            text-align: center;
            border: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        td input {
            width: 60px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
            text-align: center;
        }
        td span {
            display: block;
            font-weight: bold;
            margin-top: 5px;
        }
        @media (max-width: 768px) {
            th, td {
                font-size: 14px;
                padding: 8px;
            }
            td input {
                width: 50px;
            }
        }
    </style>
    <snk:load/>
</head>
<body>
    <snk:query var="detalhe"> 
        SELECT
        A.CODEMP,
        EMP.NOMEFANTASIA,
        A.CODPROD,
        A.DESCRPROD,
        A.MARCA,
        A.CODGRUPOPROD,
        A.DESCRGRUPOPROD,
        A.AD_QTDVOLLT,
        
        FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO.INI, :P_PERIODO.FIN) AS DU,
        FUN_TOT_DIAS_UTE_SATIS(ADD_MONTHS(:P_PERIODO.INI, :P_RETROCEDER_MESES), ADD_MONTHS(:P_PERIODO.INI, :P_RETROCEDER_MESES)) AS DU_ANT,
        

        
        
        (WITH DIAS AS (
            SELECT ADD_MONTHS(:P_PERIODO.INI, :P_RETROCEDER_MESES) + LEVEL - 1 AS DIA
            FROM DUAL
            CONNECT BY LEVEL <= ADD_MONTHS(:P_PERIODO.FIN, :P_RETROCEDER_MESES) - ADD_MONTHS(:P_PERIODO.INI, :P_RETROCEDER_MESES) + 1
        )
        SELECT COUNT(DIA) DIAS
        FROM DIAS
        WHERE TO_CHAR(DIA, 'DY', 'NLS_DATE_LANGUAGE=ENGLISH') NOT IN ('SAT', 'SUN')
        /* PODE COLOCAR AQUI UM NOT IN COM A TABELA DE FERIADOS */
        AND TO_DATE(DIA,'DD/MM/YYYY') NOT IN (SELECT TO_DATE(DATA,'DD/MM/YYYY') FROM AD_FERIADOS) 
        ) DU_ANT,
        
        (
        WITH DIAS AS (
            SELECT TRUNC(ADD_MONTHS(:P_PERIODO.INI, :P_RETROCEDER_MESES), 'MM') + LEVEL - 1 AS DIA
            FROM DUAL
            CONNECT BY LEVEL <= LAST_DAY(ADD_MONTHS(:P_PERIODO.INI, :P_RETROCEDER_MESES)) - TRUNC(ADD_MONTHS(:P_PERIODO.INI, :P_RETROCEDER_MESES), 'MM') + 1
        )
        SELECT COUNT(DIA) DIAS
        FROM DIAS
        WHERE TO_CHAR(DIA, 'DY', 'NLS_DATE_LANGUAGE=ENGLISH') NOT IN ('SAT', 'SUN')
        /* PODE COLOCAR AQUI UM NOT IN COM A TABELA DE FERIADOS */
        AND TO_DATE(DIA,'DD/MM/YYYY') NOT IN (SELECT TO_DATE(DATA,'DD/MM/YYYY') FROM AD_FERIADOS) 
        ) POR_MES_DU_ANT,
        
        
        
        SUM(A.ESTOQUE*A.AD_QTDVOLLT) ESTOQUE,
        
        
        
        
        NVL((
        SELECT SUM(QTD) QTD
        FROM VGF_VENDAS_SATIS
        WHERE     TO_CHAR(DTNEG,'MM-YYYY') = TO_CHAR(ADD_MONTHS(:P_PERIODO.INI, :P_RETROCEDER_MESES),'MM-YYYY')
        AND CODEMP = A.CODEMP
        /*
        AND (:P_CHECK_EMP = 'S' OR (CODEMP = :P_EMPRESA  AND NVL(:P_CHECK_EMP,'N') = 'N'))
        */
        AND CODPROD = A.CODPROD
        ),0) AS VENDA_PER_ANTERIOR_MES_COMPLETO,
        
        
        NVL((
        SELECT SUM(QTD) QTD
        FROM VGF_VENDAS_SATIS
        WHERE     DTNEG BETWEEN ADD_MONTHS(:P_PERIODO.INI, :P_RETROCEDER_MESES)
                  AND ADD_MONTHS(:P_PERIODO.FIN, :P_RETROCEDER_MESES)
        AND CODEMP = A.CODEMP
        /*
        AND (:P_CHECK_EMP = 'S' OR (CODEMP = :P_EMPRESA  AND NVL(:P_CHECK_EMP,'N') = 'N'))
        */
        AND CODPROD = A.CODPROD
        ),0) AS VENDA_PER_ANTERIOR,
        
        
        
        
        NVL((
        SELECT COUNT(DISTINCT QTD) QTD
        FROM VGF_VENDAS_SATIS
        WHERE     DTNEG BETWEEN ADD_MONTHS(:P_PERIODO.INI, :P_RETROCEDER_MESES)
                  AND ADD_MONTHS(:P_PERIODO.FIN, :P_RETROCEDER_MESES)
        AND (:P_CHECK_EMP = 'S' OR (CODEMP = :P_EMPRESA  AND NVL(:P_CHECK_EMP,'N') = 'N'))
        AND CODPROD = A.CODPROD
        ),0) AS DIAS_VENDA_PER_ANTERIOR,
        
        
        NVL((
        SELECT GIRO
        FROM
        (
        SELECT
        CODEMP,
        MES,
        CODPROD,
        AVG(GIRO) GIRO
        FROM(
        SELECT 
        CODEMP,
        EXTRACT(YEAR FROM DTNEG) ANO,
        EXTRACT(MONTH FROM DTNEG) MES,
        CODPROD,
        SUM(QTD)/CALC_DU_MES_SATIS(EXTRACT(YEAR FROM DTNEG),EXTRACT(MONTH FROM DTNEG)) AS GIRO
        FROM VGF_VENDAS_SATIS
        WHERE EXTRACT(YEAR FROM DTNEG) >= EXTRACT(YEAR FROM SYSDATE)-1
        
        GROUP BY
        CODEMP,
        EXTRACT(YEAR FROM DTNEG),
        EXTRACT(MONTH FROM DTNEG),
        CALC_DU_MES_SATIS(EXTRACT(YEAR FROM DTNEG),EXTRACT(MONTH FROM DTNEG)),
        CODPROD
        )
        GROUP BY
        CODEMP,
        MES,
        CODPROD
        )
        WHERE CODEMP = A.CODEMP AND CODPROD = A.CODPROD AND MES = EXTRACT(MONTH FROM TO_DATE(:P_PERIODO.INI,'DD/MM/YYYY'))
        ),0)GIRO,
        
        nvl(
        
        (WITH DIAS AS (
            SELECT :P_PERIODO.INI + LEVEL - 1 AS DIA
            FROM DUAL
            CONNECT BY LEVEL <= :P_PERIODO.FIN - :P_PERIODO.INI + 1
        )
        SELECT COUNT(DIA) DIAS
        FROM DIAS
        WHERE TO_CHAR(DIA, 'DY', 'NLS_DATE_LANGUAGE=ENGLISH') NOT IN ('SAT', 'SUN')
        /* PODE COLOCAR AQUI UM NOT IN COM A TABELA DE FERIADOS */
        AND TO_DATE(DIA,'DD/MM/YYYY') NOT IN (SELECT TO_DATE(DATA,'DD/MM/YYYY') FROM AD_FERIADOS) 
        )
        
        *
        NULLIF(
        NVL((
        SELECT GIRO
        FROM
        (
        SELECT
        CODEMP,
        MES,
        CODPROD,
        AVG(GIRO) GIRO
        FROM(
        SELECT 
        CODEMP,
        EXTRACT(YEAR FROM DTNEG) ANO,
        EXTRACT(MONTH FROM DTNEG) MES,
        CODPROD,
        SUM(QTD)/CALC_DU_MES_SATIS(EXTRACT(YEAR FROM DTNEG),EXTRACT(MONTH FROM DTNEG)) AS GIRO
        FROM VGF_VENDAS_SATIS
        WHERE EXTRACT(YEAR FROM DTNEG) >= EXTRACT(YEAR FROM SYSDATE)-1
        
        GROUP BY
        CODEMP,
        EXTRACT(YEAR FROM DTNEG),
        EXTRACT(MONTH FROM DTNEG),
        CALC_DU_MES_SATIS(EXTRACT(YEAR FROM DTNEG),EXTRACT(MONTH FROM DTNEG)),
        CODPROD
        )
        GROUP BY
        CODEMP,
        MES,
        CODPROD
        )
        WHERE CODEMP = A.CODEMP AND CODPROD = A.CODPROD AND MES = EXTRACT(MONTH FROM TO_DATE(:P_PERIODO.INI,'DD/MM/YYYY'))
        ),0)
        ,0) ,0)
        EST_MIN,
        
        
        NVL(
        (
        SELECT
        NVL((QTDPREV1-QTDPREV2)/NULLIF(QTDPREV2,0),0) VAR
        FROM(
        SELECT
        MARCA,MAX(DTREF) AS DTREF1,MIN(DTREF) AS DTREF2,
        SUM(CASE WHEN TO_DATE(DTREF, 'DD/MM/YYYY') = TO_DATE(TRUNC(:P_PERIODO.INI, 'MM'), 'DD/MM/YYYY') THEN QTDPREV ELSE 0 END) AS QTDPREV1,
        SUM(CASE WHEN TO_DATE(DTREF, 'DD/MM/YYYY') = ADD_MONTHS(TO_DATE(TRUNC(:P_PERIODO.INI, 'MM'), 'DD/MM/YYYY'), :P_RETROCEDER_MESES) THEN QTDPREV ELSE 0 END) AS QTDPREV2
        FROM (
        SELECT
        MARCA,DTREF,SUM(QTDPREV) AS QTDPREV
        FROM tgfmet
        WHERE codmeta = 4 AND TO_DATE(DTREF, 'DD/MM/YYYY') IN (
        TO_DATE(TRUNC(:P_PERIODO.INI, 'MM'), 'DD/MM/YYYY'),ADD_MONTHS(TO_DATE(TRUNC(:P_PERIODO.INI, 'MM'), 'DD/MM/YYYY'), :P_RETROCEDER_MESES)
        )
        AND QTDPREV > 0
        GROUP BY MARCA, DTREF
        )
        GROUP BY MARCA
        )WHERE NVL((QTDPREV1-QTDPREV2)/NULLIF(QTDPREV2,0),0)<>0 AND MARCA = A.MARCA
        
        ),0) VAR_META,
        
        nvl(
        (
        nvl(
        
        (WITH DIAS AS (
            SELECT :P_PERIODO.INI + LEVEL - 1 AS DIA
            FROM DUAL
            CONNECT BY LEVEL <= :P_PERIODO.FIN - :P_PERIODO.INI + 1
        )
        SELECT COUNT(DIA) DIAS
        FROM DIAS
        WHERE TO_CHAR(DIA, 'DY', 'NLS_DATE_LANGUAGE=ENGLISH') NOT IN ('SAT', 'SUN')
        /* PODE COLOCAR AQUI UM NOT IN COM A TABELA DE FERIADOS */
        AND TO_DATE(DIA,'DD/MM/YYYY') NOT IN (SELECT TO_DATE(DATA,'DD/MM/YYYY') FROM AD_FERIADOS) 
        )
        
        *
        NULLIF(
        NVL((
        SELECT GIRO
        FROM
        (
        SELECT
        CODEMP,
        MES,
        CODPROD,
        AVG(GIRO) GIRO
        FROM(
        SELECT 
        CODEMP,
        EXTRACT(YEAR FROM DTNEG) ANO,
        EXTRACT(MONTH FROM DTNEG) MES,
        CODPROD,
        SUM(QTD)/CALC_DU_MES_SATIS(EXTRACT(YEAR FROM DTNEG),EXTRACT(MONTH FROM DTNEG)) AS GIRO
        FROM VGF_VENDAS_SATIS
        WHERE EXTRACT(YEAR FROM DTNEG) >= EXTRACT(YEAR FROM SYSDATE)-1
        
        GROUP BY
        CODEMP,
        EXTRACT(YEAR FROM DTNEG),
        EXTRACT(MONTH FROM DTNEG),
        CALC_DU_MES_SATIS(EXTRACT(YEAR FROM DTNEG),EXTRACT(MONTH FROM DTNEG)),
        CODPROD
        )
        GROUP BY
        CODEMP,
        MES,
        CODPROD
        )
        WHERE CODEMP = A.CODEMP AND CODPROD = A.CODPROD AND MES = EXTRACT(MONTH FROM TO_DATE(:P_PERIODO.INI,'DD/MM/YYYY'))
        ),0)
        ,0) ,0)
        
        
        *
        
        (
        1+
        (
        SELECT
        NVL((QTDPREV1-QTDPREV2)/NULLIF(QTDPREV2,0),0) VAR
        FROM(
        SELECT
        MARCA,MAX(DTREF) AS DTREF1,MIN(DTREF) AS DTREF2,
        SUM(CASE WHEN TO_DATE(DTREF, 'DD/MM/YYYY') = TO_DATE(TRUNC(:P_PERIODO.INI, 'MM'), 'DD/MM/YYYY') THEN QTDPREV ELSE 0 END) AS QTDPREV1,
        SUM(CASE WHEN TO_DATE(DTREF, 'DD/MM/YYYY') = ADD_MONTHS(TO_DATE(TRUNC(:P_PERIODO.INI, 'MM'), 'DD/MM/YYYY'), :P_RETROCEDER_MESES) THEN QTDPREV ELSE 0 END) AS QTDPREV2
        FROM (
        SELECT
        MARCA,DTREF,SUM(QTDPREV) AS QTDPREV
        FROM tgfmet
        WHERE codmeta = 4 AND TO_DATE(DTREF, 'DD/MM/YYYY') IN (
        TO_DATE(TRUNC(:P_PERIODO.INI, 'MM'), 'DD/MM/YYYY'),ADD_MONTHS(TO_DATE(TRUNC(:P_PERIODO.INI, 'MM'), 'DD/MM/YYYY'), :P_RETROCEDER_MESES)
        )
        AND QTDPREV > 0
        GROUP BY MARCA, DTREF
        )
        GROUP BY MARCA
        )WHERE NVL((QTDPREV1-QTDPREV2)/NULLIF(QTDPREV2,0),0)<>0 AND MARCA = A.MARCA
        )
        )
        )
        ,0)
        AS EST_MIN_COM_VAR
        
        
        
        
        FROM(
        
        SELECT
        PRO.CODPROD,
        PRO.DESCRPROD,
        PRO.MARCA,
        PRO.CODGRUPOPROD,
        GRU.DESCRGRUPOPROD,
        EST.CODEMP,
        SUM(EST.ESTOQUE) -
        NVL((SELECT SUM(ITE.QTDNEG*ITE.ATUALESTOQUE) FROM TGFITE ITE WHERE ITE.RESERVA = 'N' AND ITE.CODEMP = EST.CODEMP AND ITE.CODPROD = EST.CODPROD AND ITE.CODLOCALORIG = EST.CODLOCAL AND ITE.CONTROLE = EST.CONTROLE AND ITE.ATUALESTOQUE <> 0 AND
                                  ITE.NUNOTA IN(SELECT NUNOTA FROM TGFCAB WHERE DTNEG > :P_PERIODO.INI) ),0) AS ESTOQUE,
        PRO.AD_QTDVOLLT,
        
        EST.CODLOCAL,
        LOC.DESCRLOCAL,
        (SELECT CUS.CUSMEDICM FROM TGFCUS CUS WHERE CUS.CODEMP = EST.CODEMP AND CUS.CODPROD = EST.CODPROD AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CUS.CODEMP AND C.CODPROD = CUS.CODPROD AND C.DTATUAL <= :P_PERIODO.INI) ) AS CUSUNIT,
        EST.CONTROLE AS LOTE,
        (SUM(EST.ESTOQUE) -
        NVL((SELECT SUM(ITE.QTDNEG*ITE.ATUALESTOQUE) FROM TGFITE ITE WHERE ITE.RESERVA = 'N' AND  EST.CODEMP = ITE.CODEMP AND ITE.CODPROD = EST.CODPROD AND ITE.CODLOCALORIG = EST.CODLOCAL AND ITE.CONTROLE = EST.CONTROLE AND ITE.ATUALESTOQUE <> 0 AND
                                  ITE.NUNOTA IN(SELECT NUNOTA FROM TGFCAB WHERE DTNEG > :P_PERIODO.INI) ),0)) *
                                  (SELECT CUS.CUSMEDICM FROM TGFCUS CUS WHERE CUS.CODEMP = EST.CODEMP AND CUS.CODPROD = EST.CODPROD AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CUS.CODEMP AND C.CODPROD = CUS.CODPROD AND C.DTATUAL <= :P_PERIODO.INI) ) AS custotal
                                  
        FROM
        TGFEST EST,
        TGFPRO PRO,
        TGFLOC LOC,
        TGFGRU GRU
        
        WHERE 
        EST.CODPROD = PRO.CODPROD AND
        EST.CODLOCAL = LOC.CODLOCAL AND
        GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
        
        GROUP BY 
        PRO.CODPROD, PRO.DESCRPROD,PRO.MARCA,PRO.CODGRUPOPROD,GRU.DESCRGRUPOPROD, LOC.DESCRLOCAL, EST.CONTROLE, EST.CODLOCAL, EST.CODPROD, EST.CODEMP, PRO.AD_QTDVOLLT
        
        )A
        INNER JOIN TSIEMP EMP ON A.CODEMP = EMP.CODEMP
        
        
        
        
        
        WHERE 
        (:P_CHECK_EMP = 'S' OR (A.CODEMP = :P_EMPRESA  AND NVL(:P_CHECK_EMP,'N') = 'N'))
        AND (:P_CHECK_EST = 'S' OR (A.ESTOQUE <> 0 AND NVL(:P_CHECK_EST,'N') = 'N'))
        AND (A.CODPROD = :P_CODPROD OR :P_CODPROD IS NULL)
        AND A.CODGRUPOPROD NOT IN (3010000,3020000,5000000,6000000)
        GROUP BY
        A.CODEMP,
        EMP.NOMEFANTASIA,
        A.CODPROD,
        A.DESCRPROD,
        A.MARCA,
        A.CODGRUPOPROD,
        A.DESCRGRUPOPROD,
        A.AD_QTDVOLLT
    </snk:query>
    <div class="container">
        <!-- Parte Superior -->
        
        <div class="header">
            <h1>Dash Análise de Giro e Previsão Demanda</h1>
            <div class="info">
                <span>Data Inicial: </span>
                <span>Data Final: </span>
                    <span>Dias Úteis no Período: </span>
                    <span>Períodos para retroceder em meses: </span>
                </div>
            </div>
        

        <!-- Parte Inferior -->
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>CODEMP</th>
                        <th>NOMEFANTASIA</th>
                        <th>CODPROD</th>
                        <th>DESCRPROD</th>
                        <th>MARCA</th>
                        <th>CODGRUPOPROD</th>
                        <th>DESCRGRUPOPROD</th>
                        <th>AD_QTDVOLLT</th>
                        <th>ESTOQUE</th>
                        <th>VENDA_PER_ANTERIOR</th>
                        <th>GIRO</th>
                        <th>ESTMIN</th>
                        <th>Variação</th>
                        <th>ESTMIN com Variação</th>
                        <th>Variação 2</th>
                        <th>EST_MIN_COM_VAR Final</th>
                    </tr>
                </thead>
                <tbody>
                    <c:forEach var="row" items="${detalhe.rows}">
                        <tr>
                            <td>${row.CODEMP}</td>
                            <td>${row.NOMEFANTASIA}</td>
                            <td>${row.CODPROD}</td>
                            <td>${row.DESCRPROD}</td>
                            <td>${row.MARCA}</td>
                            <td>${row.CODGRUPOPROD}</td>
                            <td>${row.DESCRGRUPOPROD}</td>
                            <td>${row.AD_QTDVOLLT}</td>
                            <td>${row.ESTOQUE}</td>
                            <td>${row.VENDA_PER_ANTERIOR}</td>
                            <td>${row.GIRO}</td>
                            <td>${row.ESTMIN}</td>
                            <td>
                                <input type="number" value="0" oninput="updateEstMin(this, ${row.ESTMIN})">
                                <span class="result"></span>
                            </td>
                            <td>${row.EST_MIN_COM_VAR}</td>
                            <td>
                                <input type="number" value="0" oninput="updateEstMinComVar(this, ${row.EST_MIN_COM_VAR})">
                                <span class="result"></span>
                            </td>
                            <td>${row.EST_MIN_COM_VAR}</td>
                        </tr>
                    </c:forEach>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        function updateEstMin(input, baseValue) {
            const result = input.nextElementSibling;
            const variation = parseFloat(input.value) || 0;
            result.textContent = (baseValue + variation).toFixed(2);
        }

        function updateEstMinComVar(input, baseValue) {
            const result = input.nextElementSibling;
            const variation = parseFloat(input.value) || 0;
            result.textContent = (baseValue + variation).toFixed(2);
        }
    </script>
</body>
</html>
