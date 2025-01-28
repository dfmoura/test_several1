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
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>    
    <title>Dash Análise de Giro e Previsão Demanda</title>
    <style>
        .table-container {
            margin: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            overflow: hidden;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            text-align: center;
            padding: 10px;
            border: 1px solid #ddd;
        }
        th {
            background-color: #f4f4f4;
        }
        h2 {
            font-family: Arial, sans-serif;
        }
    </style>
</head>
<body>

<div class="container">
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
                    <th>Estoque Atual</th>
                    <th title="Qtd. Prevista - Periodo Estocagem">Qtd. Prev1</th>
                    <th title="Qtd. Prevista - Periodo Giro">Qtd. Prev2</th>
                    <th title="Variação Meta ">Var. Meta</th>
                </tr>
            </thead>
            <tbody id="data-table-body">
                <!-- Os dados serão adicionados dinamicamente aqui -->
            </tbody>
        </table>
    </div>
</div>

<script>
    // Executa a consulta e popula a tabela
    JX.consultar(`
 select 
	1 CODEMP,'SATIS ARAXA' NOMEFANTASIA,MARCA,AD_QTDVOLLT,
	ESTOQUE,VENDA_PER_GIRO,DU,round(GIRO,2)GIRO,DU_GIRO,round(EST_MIN,2)EST_MIN,
    QTDPREV2,QTDPREV1,ROUND(FUN_CALC_VAR_SATIS(QTDPREV2,QTDPREV1),2) VAR_META_AJUS


    from(

    SELECT
        
       

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
            AS EST_MIN ,

            FUN_CALC_QTDPREV_SATIS(
                TO_DATE(TRUNC(:P_PERIODO1.INI, 'MM'),'DD/MM/YYYY'),
                TO_DATE(TRUNC(:P_PERIODO1.FIN, 'MM'),'DD/MM/YYYY'),
                MARCA,4) QTDPREV2,
        
            FUN_CALC_QTDPREV_SATIS(
                TO_DATE(TRUNC(:P_PERIODO.INI, 'MM'),'DD/MM/YYYY'),
                TO_DATE(TRUNC(:P_PERIODO.FIN, 'MM'),'DD/MM/YYYY'),
                MARCA,4) QTDPREV1            
                


          
 
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
        
        A.ESTOQUE <> 0 AND
        
        A.CODGRUPOPROD NOT IN (3010000,3020000,5000000,6000000)
    AND ((NVL((
        SELECT SUM(QTD) QTD
        FROM VGF_VENDAS_SATIS
        WHERE     DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
        
        AND MARCA = A.MARCA
    ), 0) != 0 ))

    GROUP BY
        A.MARCA, A.AD_QTDVOLLT
    )
    `).then(response => {
        const tableBody = document.getElementById('data-table-body');

        // Itera sobre os dados retornados e adiciona as linhas à tabela
        response.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.CODEMP}</td>
                <td>${row.NOMEFANTASIA}</td>
                <td>${row.MARCA}</td>
                <td>${row.VENDA_PER_GIRO}</td>
                <td>${row.DU_GIRO}</td>
                <td>${row.GIRO}</td>
                <td>${row.DU}</td>
                <td>${row.EST_MIN}</td>
                <td>${row.ESTOQUE}</td>
                <td>${row.QTDPREV1}</td>
                <td>${row.QTDPREV2}</td>
                <td>${row.VAR_META_AJUS}</td>
            `;
            tableBody.appendChild(tr);
        });
    }).catch(error => {
        console.error('Erro ao buscar dados:', error);
    });
</script>

</body>
</html>
