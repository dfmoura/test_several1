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
                        <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css"
                            rel="stylesheet">

                        <style>
                            body {
                                background-color: #f8f9fa;
                                font-family: 'Arial', sans-serif;
                            }

                            .tables-container {
                                display: flex;
                                justify-content: space-around;
                                padding: 20px;
                            }

                            .table-container {
                                flex: 1;
                                overflow-y: auto;
                                margin: 0 10px;
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
                                white-space: nowrap;
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
                        </style>

                        <snk:load />


                    </head>

                    <body>


                        <snk:query var="ganho_negcociacao_detalhe">
                            SELECT
                            CODEMP,
                            PARCEIRO,
                            CODPROD,
                            PRODUTO,
                            NUNOTA,
                            TO_CHAR(DTNEG,'DD-MM-YYYY') DTNEG,
                            COMPRADOR,
                            SAVING,
                            GANHO_EVOLUCAO
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
                            DTNEG,
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
                            WHEN (GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
                            NULLIF(QTDNEG,0)))>0
                            AND CODGRUPOPROD IN(3020000,3010000)
                            THEN
                            ABS(GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
                            NULLIF(QTDNEG,0)))
                            ELSE 0 END GANHO_EVOLUCAO_UN,

                            CASE WHEN (GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
                            NULLIF(QTDNEG,0)))>0
                            AND CODGRUPOPROD IN(3020000,3010000)
                            THEN
                            ABS(GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
                            NULLIF(QTDNEG,0))) *
                            QTDNEG ELSE 0 END GANHO_EVOLUCAO,

                            CASE
                            WHEN GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) / NULLIF(QTDNEG,
                            0))
                            > 0 THEN 'REDUCAO'
                            WHEN GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) / NULLIF(QTDNEG,
                            0))
                            < 0 AND GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) <> 0 THEN 'AUMENTO'
                                WHEN GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) /
                                NULLIF(QTDNEG,
                                0)) < 0 AND GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)=0 THEN 'SEM ALTERACAO'
                                    ELSE 'MANTEVE' END AS SITUACAO_PRECO, (CASE WHEN
                                    GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) /
                                    NULLIF(QTDNEG, 0)) < 0 AND GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)=0 THEN
                                    0 ELSE ABS(ABS(GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING)
                                    / NULLIF(QTDNEG,0)))/NULLIF(((VLRTOT - SAVING) / NULLIF(QTDNEG,0)),0))*100 END) AS
                                    PERC_DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ, SAVING + CASE WHEN
                                    (GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
                                    NULLIF(QTDNEG,0)))>0
                                    AND CODGRUPOPROD IN(3020000,3010000)
                                    THEN ABS(GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
                                    NULLIF(QTDNEG,0))) * QTDNEG ELSE 0 END

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
                                    INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = (
                                    SELECT
                                    MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )
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

                        </snk:query>


                        <snk:query var="ganho_neg_detalhe">
                            SELECT
                            CODEMP,
                            NUFIN,
                            NUNOTA,
                            PARCEIRO,
                            DTNEG,
                            DTVENC,
                            DHBAIXA,
                            ABS(GANHO_NEGOCIACAO)GANHO_NEGOCIACAO
                            FROM(
                            SELECT
                            CODEMP,
                            NUFIN,
                            NUNOTA,
                            CODPARC||'-'||NOMEPARC PARCEIRO,
                            TO_CHAR(DTNEG,'DD-MM-YYYY')DTNEG,
                            TO_CHAR(DTVENC,'DD-MM-YYYY')DTVENC,
                            TO_CHAR(DHBAIXA,'DD-MM-YYYY')DHBAIXA,
                            CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END AS DIAS,
                            VLRLIQ,

                            CASE
                            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) = 30 THEN
                            VLRLIQ * 0.01
                            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) > 30 THEN
                            VLRLIQ * 0.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE
                            DHBAIXA
                            - DTNEG END) - 30)
                            ELSE
                            0
                            END AS GANHO_NEGOCIACAO,
                            CASE
                            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) = 30 THEN
                            VLRLIQ * 1.01
                            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) > 30 THEN
                            VLRLIQ * 1.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE
                            DHBAIXA
                            - DTNEG END) - 30)
                            ELSE
                            VLRLIQ
                            END AS VLRLIQ_COM_JUROS
                            FROM
                            (

                            SELECT
                            FIN.CODEMP,
                            FIN.NUFIN,
                            FIN.CODPARC,
                            SUBSTR(UPPER(PAR.NOMEPARC), 1, 15) AS NOMEPARC,
                            FIN.NUNOTA,
                            FIN.DTNEG,
                            FIN.DTVENC,
                            FIN.DHBAIXA,
                            FIN.DESDOBRAMENTO,
                            (NVL(FIN.VLRDESDOB,0) + (CASE WHEN FIN.TIPMULTA = '1' THEN NVL(FIN.VLRMULTA,0) ELSE 0 END) +
                            (CASE WHEN FIN.TIPJURO = '1' THEN NVL(FIN.VLRJURO,0) ELSE 0 END) + NVL(FIN.DESPCART,0) +
                            NVL(FIN.VLRVENDOR,0) - NVL(FIN.VLRDESC,0) - (CASE WHEN FIN.IRFRETIDO = 'S' THEN
                            NVL(FIN.VLRIRF,0) ELSE 0 END) - (CASE WHEN FIN.ISSRETIDO = 'S' THEN NVL(FIN.VLRISS,0) ELSE 0
                            END) - (CASE WHEN FIN.INSSRETIDO = 'S' THEN NVL(FIN.VLRINSS,0) ELSE 0 END) -
                            NVL(FIN.CARTAODESC,0) + NVL((SELECT ROUND(SUM(I.VALOR * I.TIPIMP),2) FROM TGFIMF I WHERE
                            I.NUFIN
                            = FIN.NUFIN),0) + NVL(FIN.VLRMULTANEGOC,0) + NVL(FIN.VLRJURONEGOC,0) -
                            NVL(FIN.VLRMULTALIB,0) -
                            NVL(FIN.VLRJUROLIB,0) + NVL(FIN.VLRVARCAMBIAL,0)) * NVL(FIN.RECDESP,0) VLRLIQ,
                            CASE WHEN FIN.DHBAIXA IS NULL THEN FIN.DTVENC - FIN.DTNEG ELSE FIN.DHBAIXA - FIN.DTNEG END
                            AS
                            DIAS
                            FROM TGFFIN FIN
                            INNER JOIN TGFCAB CAB ON FIN.NUNOTA = CAB.NUNOTA
                            INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
                            INNER JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
                            WHERE
                            FIN.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                            AND FIN.RECDESP = -1
                            AND FIN.NUNOTA IS NOT NULL
                            AND CAB.TIPMOV = 'O'
                            AND CAB.STATUSNOTA = 'L'
                            AND USU.AD_USUCOMPRADOR = 'S'
                            )
                            )
                        </snk:query>



                        <div class="container-fluid tables-container">
                            <div class="table-container">
                                <!-- Primeira Tabela -->
                                <table class="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Emp.</th>
                                            <th>Parceiro</th>
                                            <th>Comprador</th>
                                            <th>Produto</th>
                                            <th>Único</th>
                                            <th>Dt. Neg.</th>
                                            <th>Saving</th>
                                            <th>Ev. Preço</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <c:forEach items="${ganho_negcociacao_detalhe.rows}" var="row">
                                            <tr>
                                                <td>${row.CODEMP}</td>
                                                <td>${row.PARCEIRO}</td>
                                                <td>${row.COMPRADOR}</td>
                                                <td>${row.PRODUTO}</td>
                                                <td onclick="abrir_portal('${row.NUNOTA}')">${row.NUNOTA}</td>
                                                <td>${row.DTNEG}</td>
                                                <td>
                                                    <fmt:formatNumber value="${row.SAVING}" type="number"
                                                        maxFractionDigits="2" groupingUsed="true" />
                                                </td>
                                                <td>
                                                    <fmt:formatNumber value="${row.GANHO_EVOLUCAO}" type="number"
                                                        maxFractionDigits="2" groupingUsed="true" />
                                                </td>
                                            </tr>
                                            <c:set var="totalSaving" value="${totalSaving + row.SAVING}" />
                                            <c:set var="totalVlrGanNeg" value="${totalVlrGanNeg + row.GANHO_EVOLUCAO}" />
                                        </c:forEach>
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="6"><strong>Total:</strong></td>
                                            <td class="total-column">
                                                <fmt:formatNumber value="${totalSaving}" type="currency"
                                                    maxFractionDigits="2" groupingUsed="true" />
                                            </td>
                                            <td class="total-column">
                                                <fmt:formatNumber value="${totalVlrGanNeg}" type="currency"
                                                    maxFractionDigits="2" groupingUsed="true" />
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        
                            <div class="table-container">
                                <!-- Segunda Tabela -->
                                <table class="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Cód. Emp.</th>
                                            <th>Parceiro</th>
                                            <th>NÚ. Fin.</th>
                                            <th>NÚ. Ún.</th>
                                            <th>Dt. Neg.</th>
                                            <th>Dt. Venc.</th>
                                            <th>Dt. Baixa.</th>
                                            <th>Gan. Con. Pgto.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <c:forEach items="${ganho_neg_detalhe.rows}" var="row">
                                            <tr>
                                                <td>${row.CODEMP}</td>
                                                <td>${row.PARCEIRO}</td>                                               
                                                <td onclick="abrir_mov('${row.NUFIN}')">${row.NUFIN}</td>
                                                <td onclick="abrir_portal('${row.NUNOTA}')">${row.NUNOTA}</td>
                                                <td>${row.DTNEG}</td>
                                                <td>${row.DTVENC}</td>
                                                <td>${row.DHBAIXA}</td>
                                                <td>
                                                    <fmt:formatNumber value="${row.GANHO_NEGOCIACAO}" type="number"
                                                        maxFractionDigits="2" groupingUsed="true" />
                                                </td>
                                            </tr>
                                            <c:set var="totalGanNeg" value="${totalGanNeg + row.GANHO_NEGOCIACAO}" />
                                        </c:forEach>
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="7"><strong>Total:</strong></td>
                                            <td class="total-column">
                                                <fmt:formatNumber value="${totalGanNeg}" type="currency"
                                                    maxFractionDigits="2" groupingUsed="true" />
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>                        
                    </body>
                    <script>

                               function abrir_mov(nufin) {
                                    var params = {'NUFIN': nufin};
                                    var level = 'br.com.sankhya.fin.cad.movimentacaoFinanceira';
                                    openApp(level, params);
                                }

                                function abrir_portal(nunota) {
                                    var params = {'NUNOTA': nunota};
                                    var level = 'br.com.sankhya.com.mov.CentralNotas';
                                    openApp(level, params);
                                }                                
                    </script>

                    </html>