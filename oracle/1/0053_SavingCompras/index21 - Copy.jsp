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
    <title>Tabela de Ganho de Negociação</title>
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
        font-size: 8px;
        background: #e3eae4;
        text-align: center;
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
        <button type="button" class="btn btn-primary" onclick="abrir()">Relatorio</button>
		
    </div>


    <snk:query var="ganho_negcociacao_detalhe">
SELECT * FROM (
    

SELECT
CODEMP,
PARCEIRO,
COMPRADOR,
USUARIO_INC,
NUNOTA,
TO_CHAR(DTNEG,'DD-MM-YYYY') AS DTNEG,
TO_CHAR(DTVENC,'DD-MM-YYYY') AS DTVENC,
TO_CHAR(DHBAIXA,'DD-MM-YYYY') AS DHBAIXA,
PARCELA,
CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END AS DIAS,
ABS(VLRLIQ) AS VLRLIQ,

    ABS(CASE 
    WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) = 30 THEN 
        VLRLIQ * 0.01
    WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) > 30 THEN 
        VLRLIQ * 0.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) - 30)
    ELSE 
        0
    END) AS GANHO_NEGOCIACAO,
    ABS(CASE 
    WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) = 30 THEN 
        VLRLIQ * 1.01
    WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) > 30 THEN 
        VLRLIQ * 1.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) - 30)
    ELSE 
        VLRLIQ
    END) AS VLRLIQ_COM_JUROS
FROM
(

SELECT 
FIN.CODEMP,
SUBSTR(CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL), 1, 20) AS PARCEIRO,
SUBSTR(VEN.CODVEND||'-'||VEN.APELIDO,1,10) AS COMPRADOR,
SUBSTR(CAB.CODUSUINC||'-'||USU.NOMEUSU,1,10) AS USUARIO_INC,
FIN.NUNOTA,
FIN.DTNEG,
FIN.DTVENC,
FIN.DHBAIXA,
FIN.DESDOBRAMENTO AS PARCELA,
(NVL(FIN.VLRDESDOB,0) + (CASE WHEN FIN.TIPMULTA = '1' THEN NVL(FIN.VLRMULTA,0) ELSE 0 END) + (CASE WHEN FIN.TIPJURO = '1' THEN NVL(FIN.VLRJURO,0) ELSE 0 END) + NVL(FIN.DESPCART,0) + NVL(FIN.VLRVENDOR,0) - NVL(FIN.VLRDESC,0) - (CASE WHEN FIN.IRFRETIDO = 'S' THEN NVL(FIN.VLRIRF,0) ELSE 0 END) - (CASE WHEN FIN.ISSRETIDO = 'S' THEN NVL(FIN.VLRISS,0) ELSE 0 END) - (CASE WHEN FIN.INSSRETIDO = 'S' THEN NVL(FIN.VLRINSS,0) ELSE 0 END) - NVL(FIN.CARTAODESC,0) + NVL((SELECT ROUND(SUM(I.VALOR * I.TIPIMP),2) FROM TGFIMF I WHERE I.NUFIN = FIN.NUFIN),0) + NVL(FIN.VLRMULTANEGOC,0) + NVL(FIN.VLRJURONEGOC,0) - NVL(FIN.VLRMULTALIB,0) - NVL(FIN.VLRJUROLIB,0) + NVL(FIN.VLRVARCAMBIAL,0)) * NVL(FIN.RECDESP,0) VLRLIQ,
CASE WHEN FIN.DHBAIXA IS NULL THEN FIN.DTVENC - FIN.DTNEG ELSE FIN.DHBAIXA - FIN.DTNEG END AS DIAS
FROM TGFFIN FIN
INNER JOIN TGFCAB CAB ON FIN.NUNOTA = CAB.NUNOTA
INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
WHERE FIN.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN 
AND FIN.RECDESP = -1
AND FIN.NUNOTA IS NOT NULL
AND CAB.TIPMOV = 'O'
AND CAB.STATUSNOTA = 'L'
AND USU.AD_USUCOMPRADOR = 'S'
)

    


    
    )WHERE GANHO_NEGOCIACAO > 0

    </snk:query>

    <div class="container-fluid table-container">
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Cód. Emp.</th>
                    <th>Parceiro</th>
                    <th>Comprador</th>
                    <th>Usuário Inc.</th>
                    <th>NÚ. Único</th>
                    <th>Dt. Neg.</th>
                    <th>Dt. Venc.</th>
                    <th>Dt. Baixa.</th>
                    <th>Parcela</th>
                    <th>Dias</th>
                    <th>Vlr. Liq.</th>
                    <th>Ganho Negociação</th>
                    <th>Vlr. Liq. Ajustado</th>
                </tr>
            </thead>
            <tbody>
                <c:forEach items="${ganho_negcociacao_detalhe.rows}" var="row">

                    
                    <tr>
                        <td>${row.CODEMP}</td>
                        <td>${row.PARCEIRO}</td>
                        <td>${row.COMPRADOR}</td>
                        <td>${row.USUARIO_INC}</td>
                        <td>${row.NUNOTA}</td>
                        <td>${row.DTNEG}</td>
                        <td>${row.DTVENC}</td>
                        <td>${row.DHBAIXA}</td>
                        <td>${row.PARCELA}</td>
                        <td>${row.DIAS}</td>
                        <td><fmt:formatNumber value="${row.VLRLIQ}" type="number" maxFractionDigits="2" groupingUsed="true"/></td>
                        <td><fmt:formatNumber value="${row.GANHO_NEGOCIACAO}" type="currency" maxFractionDigits="2" groupingUsed="true"/></td>
                        <td><fmt:formatNumber value="${row.VLRLIQ_COM_JUROS}" type="currency" maxFractionDigits="2" groupingUsed="true"/></td>
                    </tr>


                    <c:set var="totalVlrLiq" value="${totalVlrLiq + row.VLRLIQ}" />
                    <c:set var="totalVlrGanNeg" value="${totalVlrGanNeg + row.GANHO_NEGOCIACAO}" />
                    <c:set var="totalVlrLiqAjus" value="${totalVlrLiqAjus + row.VLRLIQ_AJUSTADO}" />
           

                </c:forEach>
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="10"><strong>Total:</strong></td>
                    <td class="total-column"><fmt:formatNumber value="${totalVlrLiq}" type="currency" maxFractionDigits="2" groupingUsed="true"/></td>
                    <td class="total-column"><fmt:formatNumber value="${totalVlrGanNeg}" type="currency" maxFractionDigits="2" groupingUsed="true"/></td>
                    <td class="total-column"><fmt:formatNumber value="${totalVlrLiqAjus}" type="currency" maxFractionDigits="2" groupingUsed="true"/></td>
                </tr>
            </tfoot>
            
        </table>
    </div>
	
	<script>
	    function abrir() {
        var params = '';
        var level = 'br.com.sankhya.menu.adicional.rfe.286.1';
		openApp(level, params);
    }
	</script>
	
</body>
</html>