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
            margin: 28px auto;
            background-color: #ffffff;
            padding: 18px;
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
        /* Estilo para o botão overlay */
        .overlay-button {
            position: fixed;
            top: 10px;
            left: 10px;
            background-color: #007BFF; /* Azul */
            color: #ffffff; /* Branco */
            border: none;
            border-radius: 5px;
            padding: 10px 20px;
            font-size: 10px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: background-color 0.3s ease;
            z-index: 1000;
        }

        .overlay-button:hover {
            background-color: green; 
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

SELECT
CODEMP,NOMEFANTASIA,CODPROD,DESCRPROD,MARCA,
DU,DU_GIRO,ESTOQUE,
VENDA_PER_GIRO,

ROUND(VENDA_PER_GIRO/NULLIF(DU_GIRO,0),2) AS GIRO,
ROUND((VENDA_PER_GIRO/NULLIF(DU_GIRO,0)) * DU,2) AS EST_MIN

FROM (

SELECT
CODEMP,NOMEFANTASIA,CODPROD,DESCRPROD,MARCA,
DU,GIRO,DU_GIRO,ESTOQUE,
VENDA_PER_GIRO - (CASE WHEN :P_TRIANGULACAO = 'N' THEN QTDNEG ELSE 0 END) AS VENDA_PER_GIRO,
EST_MIN

FROM(


	select 
	D.CODEMP,D.NOMEFANTASIA,D.CODPROD,D.DESCRPROD,D.MARCA,
	D.DU,round(D.GIRO,2)GIRO,D.DU_GIRO,D.ESTOQUE,
    D.VENDA_PER_GIRO,
    NVL(B.QTDNEG,0)QTDNEG,
    round(D.EST_MIN,2)EST_MIN
    from(

    SELECT
        A.CODEMP,
        EMP.NOMEFANTASIA,
        A.CODPROD,
        A.DESCRPROD,
        A.MARCA,

        
        FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO.INI, :P_PERIODO.FIN) AS DU,
        FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO1.INI, :P_PERIODO1.FIN) AS DU_GIRO,
        SUM(A.ESTOQUE) ESTOQUE,

        NVL((
        SELECT SUM(QTD) QTD
        FROM VGF_VENDAS_SATIS
        WHERE     DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
        AND CODEMP = A.CODEMP
        AND CODPROD = A.CODPROD
        AND CODTIPOPER IN (SELECT MAX(CODTIPOPER) CODTIPOPER FROM TGFTOP WHERE AD_ANALISE_GIRO = 'S' GROUP BY CODTIPOPER)
       
        ),0) AS VENDA_PER_GIRO,

        
        NVL((
            SELECT SUM(QTD) QTD
            FROM VGF_VENDAS_SATIS
            WHERE     DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
            AND CODEMP = A.CODEMP
            AND CODPROD = A.CODPROD
            AND CODTIPOPER IN (SELECT MAX(CODTIPOPER) CODTIPOPER FROM TGFTOP WHERE AD_ANALISE_GIRO = 'S' GROUP BY CODTIPOPER)
            


        ) / FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO1.INI, :P_PERIODO1.FIN),0) AS GIRO,             


        NVL(FUN_TOT_DIAS_UTE_SATIS(:P_PERIODO.INI, :P_PERIODO.FIN) *

        ((
            SELECT SUM(QTD) QTD
            FROM VGF_VENDAS_SATIS
            WHERE     DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
            AND CODEMP = A.CODEMP
            AND CODPROD = A.CODPROD
            AND CODTIPOPER IN (SELECT MAX(CODTIPOPER) CODTIPOPER FROM TGFTOP WHERE AD_ANALISE_GIRO = 'S' GROUP BY CODTIPOPER)

            
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
            SUM(EST.ESTOQUE) AS ESTOQUE,
            PRO.AD_QTDVOLLT,
            EST.CODLOCAL,
            LOC.DESCRLOCAL,

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
            AND EST.CODLOCAL = 103
            AND EST.DTVAL >= SYSDATE    
            
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
    AND ((NVL((
        SELECT SUM(QTD) QTD
        FROM VGF_VENDAS_SATIS
        WHERE     DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
        AND CODEMP = A.CODEMP
        AND CODPROD = A.CODPROD
    ), 0) != 0 AND NVL(:P_CHECK_GIRO,'N') = 'N') OR :P_CHECK_GIRO = 'S')
    AND A.MARCA IN (:P_MARCA)
    AND :P_PERIODO1.INI < SYSDATE
    AND :P_PERIODO1.FIN < SYSDATE

    GROUP BY
        A.CODEMP, EMP.NOMEFANTASIA, A.CODPROD, A.DESCRPROD, A.MARCA
    )

    D
    LEFT JOIN (
        select 
        CAB.CODEMP, ITE.CODPROD, PRO.MARCA, SUM(nvl(ITE.QTDNEG * AD_QTDVOLLT,0)) as QTDNEG
        from tgfcab cab
        INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
        WHERE 
        
        (cab.DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN) AND
        
        CAB.CODEMP <> CAB.AD_CODEMPORIGEM
        GROUP BY CAB.CODEMP,ITE.CODPROD,PRO.MARCA
) B ON D.CODPROD = b.CODPROD AND D.CODEMP = B.CODEMP

)
)
</snk:query>

<div style="display: flex; gap: 10px;">
    
    <button class="overlay-button" style="position: static;" onclick="abrir()">Abrir Por Marca/Meta</button>
    <button class="overlay-button" style="position: static;" onclick="exportTableToExcel('tabela-dados', 'dados')">Exportar *.xlsx</button>
  </div>
  
  

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

    <h2 style="text-align:center; color:#333;">Dash Análise de Giro - Por Produto</h2>
    <div class="table-container">
        <table id="tabela-dados">
            <thead>
                <tr>
                    <th>Empresa</th>
                    <th>Nome Fantasia</th>
                    <th>Código Produto</th>
                    <th>Descrição</th>
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
                    </tr>
                </c:forEach>
            </tbody>
        </table>
    </div>
</div>

<script>
    const incrementValue = 0.1;
    let ajusteGeral = 0;

    function updateCalculationEstMinVarEscolha(span, estMin) {
        const value = parseFloat(span.textContent);
        const estMinComVarEscolha = estMin * (1 + value + ajusteGeral);
        const estoqueAtual = parseFloat(span.closest('tr').querySelector('td:nth-child(13)').textContent);
        const statusCell = span.closest('tr').querySelector('td:nth-child(14)');

        // Atualiza a célula do estoque ajustado
        span.closest('td').nextElementSibling.textContent = estMinComVarEscolha.toFixed(2);

        // Calcula a diferença e atualiza a célula "Status"
        const diferenca = estoqueAtual - estMinComVarEscolha;
        const seta = diferenca >= 0 ? ' \u2191' : ' \u2193'; 
        statusCell.textContent = diferenca.toFixed(2);
        statusCell.className = diferenca >= 0 ? 'status-positive' : 'status-negative';
    }

    function updateCalculationEstMinVarEscolha1(span, estMinComVar) {
        const value = parseFloat(span.textContent);
        const estMinComVarEscolha1 = estMinComVar * (1 + value + ajusteGeral);
        const estoqueAtual = parseFloat(span.closest('tr').querySelector('td:nth-child(13)').textContent);
        const statusCell = span.closest('tr').querySelector('td:nth-child(14)');

        // Atualiza a célula do estoque ajustado
        span.closest('td').nextElementSibling.textContent = estMinComVarEscolha1.toFixed(2);

        // Calcula a diferença e atualiza a célula "Status"
        const diferenca = estoqueAtual - estMinComVarEscolha1;
        statusCell.textContent = diferenca.toFixed(2);
    }

    document.querySelectorAll('.btn').forEach(function(button) {
        button.addEventListener('click', function() {
            var span = this.parentElement.querySelector('span');
            var estMin = parseFloat(span.getAttribute('data-est-min'));
            var estMinComVar = parseFloat(span.getAttribute('data-est-min-com-var'));
            var value = parseFloat(span.textContent);

            value = (this.classList.contains('btn-decrease')) ? (value - incrementValue).toFixed(2) : (value + incrementValue).toFixed(2);

            span.textContent = value;

            if (span.classList.contains('var-escolha')) {
                updateCalculationEstMinVarEscolha(span, estMin);
            } else if (span.classList.contains('var-escolha1')) {
                updateCalculationEstMinVarEscolha1(span, estMinComVar);
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

        document.querySelectorAll('.var-escolha1').forEach(function(span) {
            const estMinComVar = parseFloat(span.getAttribute('data-est-min-com-var'));
            updateCalculationEstMinVarEscolha1(span, estMinComVar);
        });
    }

    // Atualiza o valor percentual
    function updatePercentageDisplay() {
        const percentual = (ajusteGeral * 100).toFixed(2); // Multiplica por 100 para obter o valor em percentual
        document.getElementById('ajuste-geral-percent').textContent = percentual + '%';
    }

    // Atualiza os cálculos ao carregar a página
    window.addEventListener('load', function() {
        updateCalculations();
        updatePercentageDisplay();
    });

    function abrir() {
                var params = '';//{'A_CODPARC' : parseInt(grupo)};
                var level = 'lvl_adzfz6k';
                openLevel(level, params);
            }  

    function abrir1() {
        var params = '';//{'A_CODPARC' : parseInt(grupo)};
        var level = 'lvl_amumjf5';
        openLevel(level, params);
    }            

                        

    function exportTableToExcel(tableID, filename = '') {
            const downloadLink = document.createElement('a');
            const dataType = 'application/vnd.ms-excel';
            const tableSelect = document.getElementById(tableID);
            const tableHTML = tableSelect.outerHTML.replace(/ /g, '%20');

            // Nome padrão para o arquivo
            filename = filename ? filename + '.xls' : 'dados_tabela.xls';

            // Criando o link de download
            downloadLink.href = 'data:' + dataType + ', ' + tableHTML;
            downloadLink.download = filename;

            // Fazendo o download
            downloadLink.click();
        }


</script>
</body>
</html>
