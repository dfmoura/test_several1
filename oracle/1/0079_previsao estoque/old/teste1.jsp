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
    <title>Tabela Responsiva</title>
    <style>
        /* Reset básico */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            background-color: #f9f9f9;
            color: #333;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: auto;
            overflow: hidden;
            padding: 0 20px;
        }

        h1 {
            text-align: center;
            margin-bottom: 20px;
            color: #555;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: #fff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        table thead {
            background: #007BFF;
            color: #fff;
        }

        table th, table td {
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
        }

        table th {
            font-weight: bold;
        }

        table tbody tr:nth-child(even) {
            background: #f2f2f2;
        }

        table tbody tr:hover {
            background: #f1f7ff;
        }

        @media (max-width: 768px) {
            table thead {
                display: none;
            }

            table, table tbody, table tr, table td {
                display: block;
                width: 100%;
            }

            table tr {
                margin-bottom: 15px;
            }

            table td {
                text-align: right;
                padding-left: 50%;
                position: relative;
            }

            table td::before {
                content: attr(data-label);
                position: absolute;
                left: 10px;
                width: calc(50% - 20px);
                font-weight: bold;
                text-align: left;
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
    <h1>Tabela de Produtos</h1>
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
                <th>Dias Úteis</th>
                <th>Dias Úteis (Ant.)</th>
                <th>Estoque</th>
                <th>Venda Per. Ant.</th>
                <th>Dias Venda Per. Ant.</th>
                <th>Giro</th>
                <th>Est. Mín.</th>
                <th>Var. Meta</th>
                <th>Est. Mín. Var.</th>
            </tr>
        </thead>
        <tbody>
            <c:forEach var="row" items="${detalhe.rows}">
                <tr>
                    <td data-label="Empresa">${row.CODEMP}</td>
                    <td data-label="Nome Fantasia">${row.NOMEFANTASIA}</td>
                    <td data-label="Código Produto">${row.CODPROD}</td>
                    <td data-label="Descrição">${row.DESCRPROD}</td>
                    <td data-label="Marca">${row.MARCA}</td>
                    <td data-label="Grupo">${row.CODGRUPOPROD}</td>
                    <td data-label="Descrição Grupo">${row.DESCRGRUPOPROD}</td>
                    <td data-label="Qtd Vol">${row.AD_QTDVOLLT}</td>
                    <td data-label="D.U.">${row.DU}</td>
                    <td data-label="D.U. Ant.">${row.DU_ANT}</td>
                    <td data-label="Estoque">${row.ESTOQUE}</td>
                    <td data-label="Venda Ant.">${row.VENDA_PER_ANTERIOR}</td>
                    <td data-label="Dias Venda Ant.">${row.DIAS_VENDA_PER_ANTERIOR}</td>
                    <td data-label="Giro">${row.GIRO}</td>
                    <td data-label="Est. Mín.">${row.EST_MIN}</td>
                    <td data-label="Est. Mín.">${row.VAR_META}</td>
                    <td data-label="Est. Mín.">${row.EST_MIN_COM_VAR}</td>
                </tr>
            </c:forEach>
        </tbody>
    </table>
</div>
</body>
</html>