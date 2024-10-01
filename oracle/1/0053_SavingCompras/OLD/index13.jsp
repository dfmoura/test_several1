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
            height: 700px;
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
            font-size: 12px;
        }

        .table tbody tr {
            background-color: white;
            transition: background-color 0.3s ease;
        }

        .table tbody tr:hover {
            background-color: #e9ecef;
        }

        .table tbody td {
            font-size: 10px;
            padding: 8px;
            text-align: center;
            border-top: 1px solid #dee2e6;
            white-space: nowrap; /* retirar quebra de linha */
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
        .table tfoot td {
        font-weight: bold;
        font-size: 7px;
        background: #e3eae4;
    }        

	.overlay-button {
		position: fixed;
		top: 10px;
		left: 10px;
		z-index: 9999; /* Para garantir que ele esteja acima de outros elementos */
	}

	.overlay-button button {
		padding: 10px 20px;
		font-size: 14px;
	}


</style>

<snk:load/>

</head>
<body>

    <div class="overlay-button">
        <button type="button" class="btn btn-primary" onclick="abrir()">Overlay Button</button>
    </div>

    <snk:query var="compras_saving_detalhe">

    SELECT
    *
    FROM(
    SELECT
    CODEMP,
    PARCEIRO,
    PRODUTO,
    CODPROD,
    GRUPO,
    CODGRUPOPROD,
    UN,
    NUNOTA,
    TIPMOV,
    TO_CHAR(DTNEG,'DD-MM-YYYY')AS DTNEG,
    COMPRADOR,
    USUARIO_INC,
    QTDNEG,
    VLRTOT,
    SAVING,
           (SAVING / NULLIF(VLRTOT,0)) * 100 AS PERC_SAVING,
           (VLRTOT) / NULLIF(QTDNEG,0) AS PRECO_COMPRA_UN,
           (VLRTOT - SAVING) / NULLIF(QTDNEG,0) AS PRECO_COMPRA_UN_LIQ,
           GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) AS PRECO_COMPRA_UN_LIQ_ANT_MED,
           CASE
           WHEN (GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) / NULLIF(QTDNEG,0)))>0
           AND CODGRUPOPROD IN(3020000,3010000)
           THEN
           ABS(GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) / NULLIF(QTDNEG,0))) ELSE 0 END GANHO_EVOLUCAO_UN,
    
           CASE WHEN (GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) / NULLIF(QTDNEG,0)))>0
           AND CODGRUPOPROD IN(3020000,3010000)
           THEN
           ABS(GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) / NULLIF(QTDNEG,0))) * QTDNEG ELSE 0 END GANHO_EVOLUCAO,
    
            CASE
            WHEN GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) / NULLIF(QTDNEG, 0)) > 0 THEN 'REDUCAO'
            WHEN GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) / NULLIF(QTDNEG, 0)) < 0 AND GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) <> 0 THEN 'AUMENTO'
            WHEN GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) / NULLIF(QTDNEG, 0)) < 0  AND GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) = 0 THEN 'SEM ALTERACAO'
            ELSE 'MANTEVE'
            END AS SITUACAO_PRECO,
                (CASE WHEN GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) / NULLIF(QTDNEG, 0)) < 0  AND GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) = 0 THEN 0 ELSE
               ABS(ABS(GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) / NULLIF(QTDNEG,0)))/NULLIF(((VLRTOT - SAVING) / NULLIF(QTDNEG,0)),0))*100 END) AS PERC_DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ,
    
           SAVING + 
           
           CASE WHEN (GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) / NULLIF(QTDNEG,0)))>0
           AND CODGRUPOPROD IN(3020000,3010000)
           THEN ABS(GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) / NULLIF(QTDNEG,0))) * QTDNEG ELSE 0 END
           
           AS ECONOMIA_COMPRA
               
    
    FROM(
    WITH
    USU AS (SELECT CODUSU,NOMEUSU,AD_USUCOMPRADOR FROM TSIUSU)
    SELECT CAB.CODEMP,
           SUBSTR(CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL), 1, 20) AS PARCEIRO,
           SUBSTR(ITE.CODPROD||'-'||PRO.DESCRPROD,1,15) AS PRODUTO,
           PRO.CODPROD,
           SUBSTR(PRO.CODGRUPOPROD||'-'|| GRU.DESCRGRUPOPROD,1,15) AS GRUPO,
           PRO.CODGRUPOPROD,
           ITE.CODVOL AS UN,
           ITE.NUNOTA AS NUNOTA,
           CAB.TIPMOV AS TIPMOV,
           CAB.DTNEG,
           SUBSTR(VEN.CODVEND||'-'||VEN.APELIDO,1,10) AS COMPRADOR,
           SUBSTR(CAB.CODUSUINC||'-'||USU.NOMEUSU,1,10) AS USUARIO_INC,
           CASE WHEN ITE.CODVOL = 'MI'
           THEN GET_QTDNEG_SATIS(ITE.NUNOTA,ITE.SEQUENCIA,ITE.CODPROD)
           ELSE ITE.QTDNEG END AS QTDNEG,
           ITE.VLRTOT,
           ITE.VLRDESC AS SAVING
      FROM TGFITE ITE
      INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
      INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
      INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )
      INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
      INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
      INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
      INNER JOIN USU ON CAB.CODUSUINC = USU.CODUSU
     WHERE CAB.TIPMOV = 'O'
       AND CAB.STATUSNOTA = 'L'
       AND USU.AD_USUCOMPRADOR = 'S'
       AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
    )
    )
    WHERE (SAVING <> 0 OR GANHO_EVOLUCAO_UN <> 0)
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
                    <th>Saving</th>
                    <th>% Saving</th>
                    <th>Preço (UN)</th>
                    <th>Preço Liq. (UN)</th>
                    <th>Preço Liq. Ante. Méd. (UN)</th>
                    <th>Ganho Evolução (UN)</th>
                    <th>Ganho Evolução</th>
                    <th>Situação Preço</th>
                    <th>% Dif.</th>
                    <th>Economia Compra</th>
                    
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
                        <td><fmt:formatNumber value="${row.QTDNEG}" type="number" maxFractionDigits="2" groupingUsed="true"/></td>
                        <td><fmt:formatNumber value="${row.VLRTOT}" type="currency" maxFractionDigits="2" groupingUsed="true"/></td>
                        <td><fmt:formatNumber value="${row.SAVING}" type="currency" maxFractionDigits="2" groupingUsed="true"/></td>
                        <td><fmt:formatNumber value="${row.PERC_SAVING}" type="number" maxFractionDigits="2" groupingUsed="true"/></td>
                        <td><fmt:formatNumber value="${row.PRECO_COMPRA_UN}" type="number" maxFractionDigits="2" groupingUsed="true"/></td>
                        <td><fmt:formatNumber value="${row.PRECO_COMPRA_UN_LIQ}" type="number" maxFractionDigits="2" groupingUsed="true"/></td>
                        <td><fmt:formatNumber value="${row.PRECO_COMPRA_UN_LIQ_ANT_MED}" type="number" maxFractionDigits="2" groupingUsed="true"/></td>
                        <td><fmt:formatNumber value="${row.GANHO_EVOLUCAO_UN}" type="number" maxFractionDigits="2" groupingUsed="true"/></td>
                        <td><fmt:formatNumber value="${row.GANHO_EVOLUCAO}" type="number" maxFractionDigits="2" groupingUsed="true"/></td>
                        <td>${row.SITUACAO_PRECO}</td>
                        <td><fmt:formatNumber value="${row.PERC_DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ}" type="number" maxFractionDigits="2" groupingUsed="true"/></td>
                        <td><fmt:formatNumber value="${row.ECONOMIA_COMPRA}" type="currency" maxFractionDigits="2" groupingUsed="true"/></td>

                    </tr>


                    <c:set var="totalQtdNeg" value="${totalQtdNeg + row.QTDNEG}" />
                    <c:set var="totalVlrTot" value="${totalVlrTot + row.VLRTOT}" />
                    <c:set var="totalSaving" value="${totalSaving + row.SAVING}" />
                    <c:set var="totalGanEvolucao" value="${totalGanEvolucao + row.GANHO_EVOLUCAO}" />
                    <c:set var="totalEcoCompra" value="${totalEcoCompra + row.ECONOMIA_COMPRA}" />

                </c:forEach>
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="10"><strong>Total:</strong></td>
                    <td class="total-column"><fmt:formatNumber value="${totalQtdNeg}" type="number" maxFractionDigits="2" groupingUsed="true"/></td>
                    <td class="total-column"><fmt:formatNumber value="${totalVlrTot}" type="currency" maxFractionDigits="2" groupingUsed="true"/></td>
                    <td class="total-column"><fmt:formatNumber value="${totalSaving}" type="currency" maxFractionDigits="2" groupingUsed="true"/></td>
                    <td class="total-column"></td> <!-- Coluna de saving % -->
                    <td class="total-column"></td> <!-- Coluna de preço (UN) -->
                    <td class="total-column"></td> <!-- Coluna de preço Liq. (UN) -->
                    <td class="total-column"></td> <!-- Coluna de preço Liq. Ante. Méd. (UN) -->
                    <td class="total-column"></td> <!-- Coluna de ganho evolução (UN) -->
                    <td class="total-column"><fmt:formatNumber value="${totalGanEvolucao}" type="currency" maxFractionDigits="2" groupingUsed="true"/></td>
                    <td class="total-column"></td> <!-- Coluna de Situação Preço -->
                    <td class="total-column"></td> <!-- Coluna de % Dif. -->
                    <td class="total-column"><fmt:formatNumber value="${totalEcoCompra}" type="currency" maxFractionDigits="2" groupingUsed="true"/></td>
                </tr>
            </tfoot>
            
        </table>
    </div>
	
	
	<script>
	    function abrir() {
        var params = '';
        var level = 'br.com.sankhya.menu.adicional.rfe.285.1';
        openApp(level, params);
    }
	</script>
</body>
</html>