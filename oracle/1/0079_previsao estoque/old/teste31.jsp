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

        .adjustment-container {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
            font-weight: bold;
        }

        .adjustment-container label {
            margin-right: 10px;
        }

        .adjustment-container .btn-group {
            display: flex;
            align-items: center;
        }

        .btn-group button {
            margin: 0 5px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
        }
        .table-container {
            max-height: 400px; /* Defina a altura máxima que a tabela pode ocupar */
            overflow-y: auto; /* Adiciona o scroll vertical */
            border: 1px solid #ddd; /* Opcional: borda para destacar o contêiner */
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

        .calculation-cell {
            font-weight: bold;
            color: #007BFF;
        }

        .highlight-zero {
            color: rgb(255, 0, 0);
        }
        .status-positive {
            color: green;
            font-weight: bold;
        }

        .status-negative {
            color: red;
            font-weight: bold;
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
	1 CODEMP,'SATIS ARAXA' NOMEFANTASIA,MARCA,AD_QTDVOLLT,
	ESTOQUE,VENDA_PER_GIRO,DU,round(GIRO,2)GIRO,DU_GIRO,round(EST_MIN,2)EST_MIN,
    FUN_CALC_QTDPREV_SATIS(
        TO_DATE(TRUNC(:P_PERIODO1.INI, 'MM'),'DD/MM/YYYY'),
        TO_DATE(TRUNC(:P_PERIODO1.FIN, 'MM'),'DD/MM/YYYY'),
        MARCA,4) QTDPREV2,

    FUN_CALC_QTDPREV_SATIS(
        TO_DATE(TRUNC(:P_PERIODO.INI, 'MM'),'DD/MM/YYYY'),
        TO_DATE(TRUNC(:P_PERIODO.FIN, 'MM'),'DD/MM/YYYY'),
        MARCA,4) QTDPREV1  

    from(

    SELECT
        A.CODEMP,
        EMP.NOMEFANTASIA,

        A.MARCA,

        A.AD_QTDVOLLT,
        FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO.INI, :P_PERIODO.FIN) AS DU,
        FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO1.INI, :P_PERIODO1.FIN) AS DU_GIRO,
        SUM(A.ESTOQUE*A.AD_QTDVOLLT) ESTOQUE,

        NVL((
        SELECT SUM(QTD) QTD
        FROM VGF_VENDAS_SATIS
        WHERE     DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
        
        AND MARCA = A.MARCA
        
        ),0) AS VENDA_PER_GIRO,

        
        NVL((
            SELECT SUM(QTD) QTD
            FROM VGF_VENDAS_SATIS
            WHERE     DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
            
            AND MARCA = A.MARCA
        ) / FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO1.INI, :P_PERIODO1.FIN),0) AS GIRO,             


        NVL(FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO.INI, :P_PERIODO.FIN) *

        ((
            SELECT SUM(QTD) QTD
            FROM VGF_VENDAS_SATIS
            WHERE     DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
            
            AND MARCA = A.MARCA
        ) / FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO1.INI, :P_PERIODO1.FIN)),0)
            AS EST_MIN      
                


          
 
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
        
        (:P_CHECK_EST = 'S' OR (A.ESTOQUE <> 0 AND NVL(:P_CHECK_EST,'N') = 'N')) AND
        
        A.CODGRUPOPROD NOT IN (3010000,3020000,5000000,6000000)
    AND ((NVL((
        SELECT SUM(QTD) QTD
        FROM VGF_VENDAS_SATIS
        WHERE     DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
        
        AND MARCA = A.MARCA
    ), 0) != 0 AND NVL(:P_CHECK_GIRO,'N') = 'N') OR :P_CHECK_GIRO = 'S')

    GROUP BY
        A.CODEMP, EMP.NOMEFANTASIA, A.MARCA, A.AD_QTDVOLLT
    )
</snk:query>

<div class="container">
    <div class="adjustment-container">
        <label for="ajuste-geral">Ajuste Geral:</label>
        <div class="btn-group">
            <button class="btn btn-decrease" id="ajuste-geral-decrease">-</button>
            <span id="ajuste-geral-value">0.00</span>
            <button class="btn" id="ajuste-geral-increase">+</button>
        </div>
        <div style="margin-left: 10px;">
            
            <span id="ajuste-geral-percent">0.00%</span>
        </div>        
    </div>

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
        </div>
    </c:forEach>

    <h2 style="text-align:center; color:#333;">Dash Análise de Giro e Previsão Demanda (Por Marca)</h2>
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Empresa</th>
                    <th>Nome Fantasia</th>
                    <th>Marca</th>
                    <th title="Venda Período de Giro">Venda Per. Giro</th>
                    <th title="Dias Período de Giro">Dias Per. Giro</th>
                    <th title="Giro Período">Giro Período</th>
                    <th title="Dias Período Estoque">Dias Per. Est.</th>
                    <th title="Estoque Mínimo">Est. Mín.</th>
                    <th  title="Ajuste para Estoque Mínimo">Ajuste</th>
                    <th title="Estoque Mínimo Ajustado">Est. Mín. Ajustado</th>
                    <th>Estoque Atual</th>
                    <th title="Superávit ou Déficit">Saldo</th>
                    <th title="Qtd. Prevista - Periodo Estocagem">Qtd. Prev1</th>
                    <th title="Qtd. Prevista - Periodo Giro">Qtd. Prev2</th>
                    <th title="Variação Meta">Var. Meta</th>
                </tr>
            </thead>
            <tbody>
                <c:forEach var="row" items="${detalhe.rows}">
                    <tr>
                        <td>${row.CODEMP}</td>
                        <td>${row.NOMEFANTASIA}</td>
                        <td>${row.MARCA}</td>
                        <td>${row.VENDA_PER_GIRO}</td>
                        <td>${row.DU_GIRO}</td>
                        <td class="${row.GIRO == 0 ? 'highlight-zero' : ''}">${row.GIRO}</td>
                        <td>${row.DU}</td>
                        <td>${row.EST_MIN}</td>
                        <td class="btn-group">
                            <button class="btn btn-decrease">-</button>
                            <span class="var-escolha" data-est-min="${row.EST_MIN}">0.00</span>
                            <button class="btn">+</button>
                        </td>
                        <td class="calculation-cell"></td>
                        <td>${row.ESTOQUE}</td>
                        <td class="status-cell"></td>
                        <td>${row.QTDPREV1}</td>
                        <td>${row.QTDPREV2}</td>
                        <td>0</td>
                    </tr>
                </c:forEach>
            </tbody>
        </table>
    </div>
</div>

<script>
    const incrementValue = 0.01;
    let ajusteGeral = 0;

    function calculateVariation(qtdPrev1, qtdPrev2) {
        if (qtdPrev2 === 0) {
            return "N/A"; // Retorna 'N/A' se houver divisão por zero
        }
        return ((qtdPrev1 - qtdPrev2) / qtdPrev2).toFixed(2);
    }

    function updateVariationMeta() {
        document.querySelectorAll("tbody tr").forEach(function(row) {
            const qtdPrev1 = parseFloat(row.querySelector("td:nth-child(13)").textContent) || 0; // QTDPREV1
            const qtdPrev2 = parseFloat(row.querySelector("td:nth-child(14)").textContent) || 0; // QTDPREV2
            const variationCell = row.querySelector("td:nth-child(15)"); // Coluna de variação da meta

            const variation = calculateVariation(qtdPrev1, qtdPrev2);
            variationCell.textContent = variation;
            variationCell.className = variation.includes("-") ? "status-negative" : "status-positive";
        });
    }

    function updateCalculationEstMinVarEscolha(span, estMin) {
        const value = parseFloat(span.textContent);
        const estMinComVarEscolha = estMin * (1 + value + ajusteGeral);
        const estoqueAtual = parseFloat(span.closest('tr').querySelector('td:nth-child(11)').textContent);
        const statusCell = span.closest('tr').querySelector('td:nth-child(12)');

        // Atualiza a célula do estoque ajustado
        span.closest('td').nextElementSibling.textContent = estMinComVarEscolha.toFixed(2);

        // Calcula a diferença e atualiza a célula "Status"
        const diferenca = estoqueAtual - estMinComVarEscolha;
        const seta = diferenca >= 0 ? ' \u2191' : ' \u2193'; 
        statusCell.textContent = diferenca.toFixed(2) + seta;
        statusCell.className = diferenca >= 0 ? 'status-positive' : 'status-negative';

        // Atualiza a variação da meta
        updateVariationMeta();
    }

    document.querySelectorAll('.btn').forEach(function(button) {
        button.addEventListener('click', function() {
            var span = this.parentElement.querySelector('span');
            var estMin = parseFloat(span.getAttribute('data-est-min'));
            var value = parseFloat(span.textContent);

            value = (this.classList.contains('btn-decrease')) ? (value - incrementValue).toFixed(2) : (value + incrementValue).toFixed(2);
            span.textContent = value;

            if (span.classList.contains('var-escolha')) {
                updateCalculationEstMinVarEscolha(span, estMin);
            }
        });
    });

    // Ajuste Geral
    document.getElementById('ajuste-geral-increase').addEventListener('click', function() {
        ajusteGeral += incrementValue;
        document.getElementById('ajuste-geral-value').textContent = ajusteGeral.toFixed(2);
        updateCalculations();
        updatePercentageDisplay();
    });

    document.getElementById('ajuste-geral-decrease').addEventListener('click', function() {
        ajusteGeral -= incrementValue;
        document.getElementById('ajuste-geral-value').textContent = ajusteGeral.toFixed(2);
        updateCalculations();
        updatePercentageDisplay();
    });

    function updateCalculations() {
        document.querySelectorAll('.var-escolha').forEach(function(span) {
            const estMin = parseFloat(span.getAttribute('data-est-min'));
            updateCalculationEstMinVarEscolha(span, estMin);
        });

        updateVariationMeta(); // Atualiza a variação da meta ao calcular os ajustes
    }

    // Atualiza o valor percentual
    function updatePercentageDisplay() {
        const percentual = (ajusteGeral * 100).toFixed(2); // Multiplica por 100 para obter o valor em percentual
        document.getElementById('ajuste-geral-percent').textContent = percentual + '%';
    }

    // Atualiza os cálculos ao carregar a página
    window.addEventListener('load', function() {
        updateCalculations();
        updateVariationMeta(); // Atualiza a variação da meta ao carregar
        updatePercentageDisplay();
    });
</script>

</body>
</html>
