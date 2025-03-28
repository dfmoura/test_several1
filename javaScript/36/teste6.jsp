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

        .info-container input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            padding: 12px;
            text-align: center;
            border: 1px solid #ddd;
        }

        th {
            background-color: #007BFF;
            color: white;
            font-weight: bold;
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
    <!-- Parte Superior -->
    <div class="info-container">
        <div>
            <label for="data-inicial">Data Inicial:</label>
            <input type="date" id="data-inicial">
        </div>
        <div>
            <label for="data-final">Data Final:</label>
            <input type="date" id="data-final">
        </div>
        <div>
            <label for="dias-uteis">Dias Úteis no Período:</label>
            <input type="text" id="dias-uteis" readonly>
        </div>
        <div>
            <label for="periodos-retroceder">Períodos para Retroceder em Meses:</label>
            <input type="number" id="periodos-retroceder" min="1" max="12">
        </div>
    </div>

    <!-- Parte Inferior (Tabela) -->
    <h2 style="text-align:center; color:#333;">Tabela de Análise de Produtos</h2>
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
                <th>Var. Meta</th>
                <th>Est. Mín. Var.</th>
                <th>Var. Escolha</th>
                <th>Est. Mín. com Var Escolha</th>
                <th>Var. Escolha 1</th>
                <th>Est. Mín. com Var Escolha 1</th>
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
                    <td>${row.EST_MIN}</td>
                    <td>${row.VAR_META}</td>
                    <td>${row.EST_MIN_COM_VAR}</td>
                    <td class="btn-group">
                        <button class="btn btn-decrease">-</button>
                        <span class="var-escolha" data-est-min="${row.EST_MIN}">0</span>
                        <button class="btn">+</button>
                    </td>
                    <td class="calculation-cell">
                        <!-- Est. Mín. com Var Escolha -->
                    </td>
                    <td class="btn-group">
                        <button class="btn btn-decrease">-</button>
                        <span class="var-escolha1" data-est-min-com-var="${row.EST_MIN_COM_VAR}">0</span>
                        <button class="btn">+</button>
                    </td>
                    <td class="calculation-cell">
                        <!-- Est. Mín. com Var Escolha 1 -->
                    </td>
                </tr>
            </c:forEach>
        </tbody>
    </table>
</div>

<script>
    // Função para atualizar o cálculo do Est. Mín. com Var Escolha
    function updateCalculationEstMinVarEscolha(span, estMin) {
        const value = parseFloat(span.textContent);
        const estMinComVarEscolha = estMin * (1 + value);
        span.closest('td').nextElementSibling.textContent = estMinComVarEscolha.toFixed(2);
    }

    // Função para atualizar o cálculo do Est. Mín. com Var Escolha 1
    function updateCalculationEstMinVarEscolha1(span, estMinComVar) {
        const value = parseFloat(span.textContent);
        const estMinComVarEscolha1 = estMinComVar * (1 + value);
        span.closest('td').nextElementSibling.textContent = estMinComVarEscolha1.toFixed(2);
    }

    // Gerenciar os cliques nos botões de + e -
    document.querySelectorAll('.btn').forEach(function(button) {
        button.addEventListener('click', function() {
            var span = this.parentElement.querySelector('span');
            var estMin = parseFloat(span.getAttribute('data-est-min'));
            var estMinComVar = parseFloat(span.getAttribute('data-est-min-com-var'));
            var value = parseFloat(span.textContent);

            if (this.classList.contains('btn-decrease')) {
                value--;
            } else {
                value++;
            }

            span.textContent = value;
            
            if (span.classList.contains('var-escolha')) {
                updateCalculationEstMinVarEscolha(span, estMin);
            } else if (span.classList.contains('var-escolha1')) {
                updateCalculationEstMinVarEscolha1(span, estMinComVar);
            }
        });
    });
</script>

</body>
</html>
