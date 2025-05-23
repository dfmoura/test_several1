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
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f9;
        }

        .container {
            width: 90%;
            margin: 30px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }

        .info-container {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }

        .info-container div {
            flex: 1;
            margin-right: 15px;
        }

        .info-container div:last-child {
            margin-right: 0;
        }

        .info-container label {
            font-weight: bold;
            margin-bottom: 5px;
            display: block;
        }

        .info-container span {
            display: block;
            padding: 8px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
            color: #333;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
        }

        th, td {
            padding: 8px;
            text-align: center;
            border: 1px solid #ddd;
        }

        th {
            background-color: #3a970f;
            color: white;
            font-weight: bold;
            position: sticky;
            top: 0;
            z-index: 1;
        }

        td {
            background-color: #f9f9f9;
        }

        .btn {
            padding: 5px 10px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .btn-decrease {
            background-color: #dc3545;
        }

        .btn-group {
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .btn-group button {
            margin: 0 5px;
        }

        .calculation-cell {
            font-weight: bold;
            color: #007BFF;
        }
    </style>
    <snk:load/>
</head>
<body>

<snk:query var="cab">
    select
    TO_CHAR(DTINI,'DD/MM/YYYY')DTINI,
    TO_CHAR(DTFIN,'DD/MM/YYYY')DTFIN,
    DU,
    TO_CHAR(DTINI_GIRO,'DD/MM/YYYY')DTINI_GIRO,
    TO_CHAR(DTFIN_GIRO,'DD/MM/YYYY')DTFIN_GIRO,
    DU_GIRO
    
    FROM(
    SELECT        
    :P_PERIODO.INI DTINI, 
    :P_PERIODO.FIN DTFIN,
    FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO.INI, :P_PERIODO.FIN) AS DU,
    :P_PERIODO1.INI DTINI_GIRO, 
    :P_PERIODO1.FIN DTFIN_GIRO,
    FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO1.INI, :P_PERIODO1.FIN) AS DU_GIRO    
    from dual)
</snk:query>

<snk:query var="detalhe">
	select 
	CODEMP,NOMEFANTASIA,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD,AD_QTDVOLLT,
	ESTOQUE,VENDA_PER_GIRO,round(GIRO,2)GIRO,round(EST_MIN,2)EST_MIN,round(VAR_META,2)VAR_META,round(EST_MIN_COM_VAR,2)EST_MIN_COM_VAR

    from(

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
        WHERE     DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO.FIN
        AND CODEMP = A.CODEMP
        AND CODPROD = A.CODPROD
        ),0) AS VENDA_PER_GIRO,

        
        NVL((
            SELECT SUM(QTD) QTD
            FROM VGF_VENDAS_SATIS
            WHERE     DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO.FIN
            AND CODEMP = A.CODEMP
            AND CODPROD = A.CODPROD
        ) / FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO1.INI, :P_PERIODO1.FIN),0) AS GIRO,             


        NVL(FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO.INI, :P_PERIODO.FIN) *

        ((
            SELECT SUM(QTD) QTD
            FROM VGF_VENDAS_SATIS
            WHERE     DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO.FIN
            AND CODEMP = A.CODEMP
            AND CODPROD = A.CODPROD
        ) / FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO1.INI, :P_PERIODO1.FIN)),0)
            AS EST_MIN,        
                
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


                    NVL(
                    (1 + (                        
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

                    ((
                        SELECT SUM(QTD) QTD
                        FROM VGF_VENDAS_SATIS
                        WHERE     DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO.FIN
                        AND CODEMP = A.CODEMP
                        AND CODPROD = A.CODPROD
                    ) / FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO1.INI, :P_PERIODO1.FIN))),0)                    
                        
                        
                        AS EST_MIN_COM_VAR




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
    )
    
</snk:query>
<div class="container">
    <c:forEach var="row" items="${cab.rows}">
        <div class="info-container">
            <div>
                <label>Data Inicial Estocagem:</label>
                <span>${row.DTINI}</span>
            </div>
            <div>
                <label>Data Final Estocagem:</label>
                <span>${row.DTFIN}</span>
            </div>
            <div>
                <label>Dias Úteis no Período:</label>
                <span>${row.DU}</span>
            </div>
            <div>
                <label>Data Inicial Giro:</label>
                <span>${row.DTINI_GIRO}</span>
            </div>
            <div>
                <label>Data Final Giro:</label>
                <span>${row.DTFIN_GIRO}</span>
            </div>
            <div>
                <label>Dias Úteis no Período Giro:</label>
                <span>${row.DU_GIRO}</span>
            </div>   
            <div>
                <label>Ajuste Geral:</label>
                <div class="btn-group">
                    <button class="btn btn-decrease btn-decrease-general">-</button>
                    <span id="ajuste-geral" data-value="0.00">0.00</span>
                    <button class="btn btn-increase btn-increase-general">+</button>
                </div>
            </div>
        </div>
    </c:forEach>

    <h2 style="text-align:center; color:#333;">Dash Análise de Giro e Previsão Demanda</h2>
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
                <th>Estoque Atual</th>
                <th title="Venda Período de Giro">Venda Per. Giro</th>
                <th title="Giro Período">Giro Período</th>
                <th title="Estoque Mínimo">Est. Mín.</th>
                <th title="Ajuste">Ajuste</th>
                <th title="Estoque Mínimo Ajustado">Est. Mín. Ajustado</th>
                <th title="Variação da Meta">Var. Meta</th>
                <th title="Estoque Mínimo com a Variação">Est. Mín. com Var.</th>
                <th title="Ajuste">Ajuste</th>
                <th title="Estoque Mínimo Ajustado com Variação">Est. Mín. Ajustado com Var.</th>
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

                    <td>${row.ESTOQUE}</td>
                    <td>${row.VENDA_PER_GIRO}</td>
                    <td>${row.GIRO}</td>
                    <td>${row.EST_MIN}</td>
                    <td class="btn-group">
                        <button class="btn btn-decrease">-</button>
                        <span class="var-escolha" data-est-min="${row.EST_MIN}">0.00</span>
                        <button class="btn">+</button>
                    </td>
                    <td class="calculation-cell"></td>
                    <td>${row.VAR_META}</td>
                    <td>${row.EST_MIN_COM_VAR}</td>
                    <td class="btn-group">
                        <button class="btn btn-decrease">-</button>
                        <span class="var-escolha1" data-est-min-com-var="${row.EST_MIN_COM_VAR}">0.00</span>
                        <button class="btn">+</button>
                    </td>
                    <td class="calculation-cell"></td>
                </tr>
            </c:forEach>
        </tbody>
    </table>
</div>

<script>
    const incrementValue = 0.01;

    function updateCalculationEstMinVarEscolha(span, estMin) {
        const value = parseFloat(span.textContent);
        const estMinComVarEscolha = estMin * (1 + value);
        span.closest('td').nextElementSibling.textContent = estMinComVarEscolha.toFixed(2);
    }

    function updateCalculationEstMinVarEscolha1(span, estMinComVar) {
        const value = parseFloat(span.textContent);
        const estMinComVarEscolha1 = estMinComVar * (1 + value);
        span.closest('td').nextElementSibling.textContent = estMinComVarEscolha1.toFixed(2);
    }

    function updateAllAdjustments(generalAdjustment) {
        document.querySelectorAll('.var-escolha').forEach(function(span) {
            const estMin = parseFloat(span.getAttribute('data-est-min'));
            const individualAdjustment = parseFloat(span.textContent);
            const totalAdjustment = generalAdjustment + individualAdjustment;
            span.textContent = totalAdjustment.toFixed(2);
            updateCalculationEstMinVarEscolha(span, estMin);
        });

        document.querySelectorAll('.var-escolha1').forEach(function(span) {
            const estMinComVar = parseFloat(span.getAttribute('data-est-min-com-var'));
            const individualAdjustment = parseFloat(span.textContent);
            const totalAdjustment = generalAdjustment + individualAdjustment;
            span.textContent = totalAdjustment.toFixed(2);
            updateCalculationEstMinVarEscolha1(span, estMinComVar);
        });
    }

    document.querySelectorAll('.btn').forEach(function(button) {
        button.addEventListener('click', function() {
            var span = this.parentElement.querySelector('span');
            var value = parseFloat(span.textContent);

            value = (this.classList.contains('btn-decrease')) ? (value - incrementValue).toFixed(2) : (value + incrementValue).toFixed(2);

            span.textContent = value;

            if (span.id === 'ajuste-geral') {
                updateAllAdjustments(value);
            } else {
                if (span.classList.contains('var-escolha')) {
                    const estMin = parseFloat(span.getAttribute('data-est-min'));
                    updateCalculationEstMinVarEscolha(span, estMin);
                } else if (span.classList.contains('var-escolha1')) {
                    const estMinComVar = parseFloat(span.getAttribute('data-est-min-com-var'));
                    updateCalculationEstMinVarEscolha1(span, estMinComVar);
                }
            }
        });
    });

    window.addEventListener('load', function() {
        const generalAdjustmentSpan = document.getElementById('ajuste-geral');
        const generalAdjustment = parseFloat(generalAdjustmentSpan.textContent);
        updateAllAdjustments(generalAdjustment);
    });
</script>
</body>
</html>
