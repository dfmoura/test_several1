<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dash Análise de Giro e Previsão Demanda</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f9f9f9;
            color: #333;
            margin: 0;
            padding: 0;
        }

        .container {
            max-width: 1200px;
            margin: 20px auto;
            padding: 20px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
        }

        .header h1 {
            font-size: 24px;
            color: #007BFF;
        }

        .header .filters {
            display: flex;
            justify-content: space-around;
            margin-top: 10px;
            font-size: 14px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        table thead {
            background: linear-gradient(90deg, #007BFF, #0056b3);
            color: #fff;
            text-transform: uppercase;
        }

        table th, table td {
            padding: 12px 15px;
            text-align: center;
            border: 1px solid #ddd;
            font-size: 14px;
        }

        table tbody tr:nth-child(even) {
            background: #f2f2f2;
        }

        table tbody tr:hover {
            background: #e6f7ff;
            cursor: pointer;
        }

        .input-variation {
            width: 80px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
            text-align: right;
        }

        .input-calculation {
            font-weight: bold;
            color: #007BFF;
        }

        @media (max-width: 768px) {
            .header .filters {
                flex-direction: column;
                align-items: center;
            }

            table {
                font-size: 12px;
            }

            .input-variation {
                width: 60px;
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
SUM(A.ESTOQUE*A.AD_QTDVOLLT) ESTOQUE,
NVL((
SELECT SUM(QTD) QTD
FROM VGF_VENDAS_SATIS
WHERE     DTNEG BETWEEN ADD_MONTHS(:P_PERIODO.INI, :P_RETROCEDER_MESES)
          AND ADD_MONTHS(:P_PERIODO.FIN, :P_RETROCEDER_MESES)
AND CODEMP = A.CODEMP
AND CODPROD = A.CODPROD
),0) AS VENDA_PER_ANTERIOR,


NVL((
SELECT COUNT(DISTINCT QTD) QTD
FROM VGF_VENDAS_SATIS
WHERE     DTNEG BETWEEN ADD_MONTHS(:P_PERIODO.INI, :P_RETROCEDER_MESES)
          AND ADD_MONTHS(:P_PERIODO.FIN, :P_RETROCEDER_MESES)
AND (:P_CHECK_EMP = 'S' OR (CODEMP = :P_EMPRESA  AND NVL(:P_CHECK_EMP,'N') = 'N'))
AND CODPROD = A.CODPROD
),0) AS DIAS_VENDA_PER_ANTERIOR ,
        


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
    WHERE CODEMP = A.CODEMP AND CODPROD = A.CODPROD AND MES = EXTRACT(MONTH FROM :P_PERIODO.INI)
    ),0)GIRO,


    FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO.INI, :P_PERIODO.FIN) *
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
        WHERE CODEMP = A.CODEMP AND CODPROD = A.CODPROD AND MES = EXTRACT(MONTH FROM :P_PERIODO.INI)
        ),0) AS EST_MIN,
        
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


            NVL((1 + (                        
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
            ))
            *
            (FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO.INI, :P_PERIODO.FIN) *
            (
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
                WHERE CODEMP = A.CODEMP AND CODPROD = A.CODPROD AND MES = EXTRACT(MONTH FROM :P_PERIODO.INI)
                )),0) AS EST_MIN_COM_VAR




FROM (
SELECT
    PRO.CODPROD,
    PRO.DESCRPROD,
    PRO.MARCA,
    PRO.CODGRUPOPROD,
    GRU.DESCRGRUPOPROD,
    EST.CODEMP,
    SUM(EST.ESTOQUE) -
    NVL((SELECT SUM(ITE.QTDNEG * ITE.ATUALESTOQUE)
         FROM TGFITE ITE
         WHERE ITE.RESERVA = 'N' AND ITE.CODEMP = EST.CODEMP AND ITE.CODPROD = EST.CODPROD
         AND ITE.CODLOCALORIG = EST.CODLOCAL AND ITE.CONTROLE = EST.CONTROLE
         AND ITE.ATUALESTOQUE <> 0
         AND ITE.NUNOTA IN (SELECT NUNOTA FROM TGFCAB WHERE DTNEG > :P_PERIODO.INI)), 0) AS ESTOQUE,
    PRO.AD_QTDVOLLT,
    EST.CODLOCAL,
    LOC.DESCRLOCAL,
    (SELECT CUS.CUSMEDICM
     FROM TGFCUS CUS
     WHERE CUS.CODEMP = EST.CODEMP AND CUS.CODPROD = EST.CODPROD
     AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL)
                        FROM TGFCUS C
                        WHERE C.CODEMP = CUS.CODEMP AND C.CODPROD = CUS.CODPROD
                        AND C.DTATUAL <= :P_PERIODO.INI)) AS CUSUNIT,
    EST.CONTROLE AS LOTE,
    (SUM(EST.ESTOQUE) -
     NVL((SELECT SUM(ITE.QTDNEG * ITE.ATUALESTOQUE)
          FROM TGFITE ITE
          WHERE ITE.RESERVA = 'N' AND EST.CODEMP = ITE.CODEMP
          AND ITE.CODPROD = EST.CODPROD AND ITE.CODLOCALORIG = EST.CODLOCAL
          AND ITE.CONTROLE = EST.CONTROLE AND ITE.ATUALESTOQUE <> 0
          AND ITE.NUNOTA IN (SELECT NUNOTA FROM TGFCAB WHERE DTNEG > :P_PERIODO.INI)), 0)) *
    (SELECT CUS.CUSMEDICM
     FROM TGFCUS CUS
     WHERE CUS.CODEMP = EST.CODEMP AND CUS.CODPROD = EST.CODPROD
     AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL)
                        FROM TGFCUS C
                        WHERE C.CODEMP = CUS.CODEMP AND C.CODPROD = CUS.CODPROD
                        AND C.DTATUAL <= :P_PERIODO.INI)) AS custotal
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
    PRO.CODPROD, PRO.DESCRPROD, PRO.MARCA, PRO.CODGRUPOPROD, GRU.DESCRGRUPOPROD,
    LOC.DESCRLOCAL, EST.CONTROLE, EST.CODLOCAL, EST.CODPROD, EST.CODEMP, PRO.AD_QTDVOLLT
) A
INNER JOIN TSIEMP EMP ON A.CODEMP = EMP.CODEMP
WHERE
(:P_CHECK_EMP = 'S' OR (A.CODEMP = :P_EMPRESA AND NVL(:P_CHECK_EMP,'N') = 'N')) AND
(:P_CHECK_EST = 'S' OR (A.ESTOQUE <> 0 AND NVL(:P_CHECK_EST,'N') = 'N')) AND
(A.CODPROD = :P_CODPROD OR :P_CODPROD IS NULL) AND
A.CODGRUPOPROD NOT IN (3010000,3020000,5000000,6000000)
GROUP BY
A.CODEMP, EMP.NOMEFANTASIA, A.CODPROD, A.DESCRPROD, A.MARCA, A.CODGRUPOPROD, A.DESCRGRUPOPROD, A.AD_QTDVOLLT

</snk:query>

<div class="container">
    <div class="header">
        <h1>Dash Análise de Giro e Previsão Demanda</h1>
        <div class="filters">
            <div>Data Inicial: <strong>01/01/2023</strong></div>
            <div>Data Final: <strong>31/12/2023</strong></div>
            <div>Dias Úteis no Período: <strong>252</strong></div>
            <div>Períodos para retroceder em meses: <strong>6</strong></div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Empresa</th>
                <th>Nome Fantasia</th>
                <th>Código Produto</th>
                <th>Descrição</th>
                <th>Marca</th>
                <th>Grupo</th>
                <th>Descrição Grupo</th>
                <th>Qtd Vol</th>
                <th>Estoque</th>
                <th>Venda Per. Ant.</th>
                <th>Giro</th>
                <th>Est. Mín.</th>
                <th>Var. Est. Mín.</th>
                <th>Est. Mín. + Var.</th>
                <th>Var. Est. Mín. + Var.</th>
                <th>Est. Final</th>
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
                    <td><input class="input-variation" type="number" step="0.01" value="0" /></td>
                    <td class="input-calculation">${row.ESTMIN}</td>
                    <td><input class="input-variation" type="number" step="0.01" value="0" /></td>
                    <td class="input-calculation">${row.EST_MIN_COM_VAR}</td>
                </tr>
            </c:forEach>
        </tbody>
    </table>
</div>
</body>
</html>
