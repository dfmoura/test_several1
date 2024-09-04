<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
    <%@ page import="java.util.*" %>
        <%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
            <%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
                <%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

                    <html lang="pt-BR">

                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Dashboard de Saving e Evolução de Compra</title>
                        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap"
                            rel="stylesheet">
                        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>

                        <style>
                            body {
                                font-family: 'Roboto', sans-serif;
                                margin: 0;
                                padding: 0;
                                height: 100vh;
                                background-color: #f8f9fa;
                                display: flex;
                                flex-direction: column;
                            }

                            .container {
                                display: flex;
                                flex-direction: column;
                                flex: 1;
                                padding: 20px;
                                box-sizing: border-box;
                            }

                            .cards-row {
                                display: flex;
                                justify-content: space-between;
                                margin-bottom: 20px;
                            }

                            .card {
                                flex: 1;
                                background-color: #ffffff;
                                border-radius: 10px;
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                                text-align: center;
                                padding: 20px;
                                margin: 10px;
                                transition: transform 0.2s, box-shadow 0.2s;
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                            }

                            .card:hover {
                                transform: translateY(-5px);
                                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
                            }

                            .card-number {
                                font-size: 48px;
                                font-weight: bold;
                                color: #28a745;
                            }

                            .card-text {
                                font-size: 18px;
                                color: #6c757d;
                            }

                            .chart-container {
                                flex: 1;
                                background-color: #ffffff;
                                border-radius: 10px;
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                                padding: 20px;
                                margin-top: 20px;
                                transition: transform 0.2s, box-shadow 0.2s;
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                                width: 100%;
                                height: 100%;
                            }

                            .chart-container:hover {
                                transform: translateY(-5px);
                                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
                            }

                            .chart-title {
                                text-align: center;
                                font-size: 20px;
                                font-weight: bold;
                                margin-bottom: 10px;
                                color: #333;
                            }

                            #chart {
                                width: 100%;
                                max-width: 1400px;
                                height: 100%;
                            }
                        </style>


                        <snk:load />

                    </head>

                    <body>

                        <snk:query var="compras_saving">
                            WITH
                            USU AS (SELECT CODUSU,NOMEUSU,AD_USUCOMPRADOR FROM TSIUSU)
                            SELECT SUM(ITE.VLRDESC) AS SAVING
                            FROM TGFITE ITE
                            INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
                            INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
                            INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX
                            (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER))
                            INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
                            INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
                            INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
                            INNER JOIN USU ON CAB.CODUSUINC = USU.CODUSU
                            WHERE CAB.TIPMOV = 'O'
                            AND CAB.STATUSNOTA = 'L'
                            AND USU.AD_USUCOMPRADOR = 'S'
                            AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                            AND ITE.VLRDESC IS NOT NULL
                        </snk:query>




                        <snk:query var="compras_ganho_negociacao">

                            SELECT ABS(SUM(GANHO_NEGOCIACAO)) AS GANHO_NEGOCIACAO
                            FROM
                            (
                            SELECT
                            NUNOTA,
                            DTNEG,
                            DTVENC,
                            DHBAIXA,
                            CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END AS DIAS,
                            VLRLIQ,

                            CASE
                            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) = 30 THEN
                            VLRLIQ * 0.01
                            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) > 30 THEN
                            VLRLIQ * 0.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE
                            DHBAIXA - DTNEG END) - 30)
                            ELSE
                            0
                            END AS GANHO_NEGOCIACAO,
                            CASE
                            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) = 30 THEN
                            VLRLIQ * 1.01
                            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) > 30 THEN
                            VLRLIQ * 1.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE
                            DHBAIXA - DTNEG END) - 30)
                            ELSE
                            VLRLIQ
                            END AS VLRLIQ_COM_JUROS
                            FROM
                            (
                            SELECT
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
                            I.NUFIN = FIN.NUFIN),0) + NVL(FIN.VLRMULTANEGOC,0) + NVL(FIN.VLRJURONEGOC,0) -
                            NVL(FIN.VLRMULTALIB,0) - NVL(FIN.VLRJUROLIB,0) + NVL(FIN.VLRVARCAMBIAL,0)) *
                            NVL(FIN.RECDESP,0) VLRLIQ,
                            CASE WHEN FIN.DHBAIXA IS NULL THEN FIN.DTVENC - FIN.DTNEG ELSE FIN.DHBAIXA - FIN.DTNEG END
                            AS DIAS
                            FROM TGFFIN FIN
                            INNER JOIN TGFCAB CAB ON FIN.NUNOTA = CAB.NUNOTA
                            INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
                            WHERE FIN.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                            AND FIN.RECDESP = -1
                            AND FIN.NUNOTA IS NOT NULL
                            AND CAB.TIPMOV = 'O'
                            AND CAB.STATUSNOTA = 'L'
                            AND USU.AD_USUCOMPRADOR = 'S'
                            )
                            )


                        </snk:query>




                        <snk:query var="compras_ganho_evolução">
                            SELECT

                            SUM(GANHO_EVOLUCAO) AS GANHO_EVOLUCAO
                            FROM(

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
                            NULLIF(QTDNEG,0))) ELSE 0 END GANHO_EVOLUCAO_UN,

                            CASE WHEN (GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
                            NULLIF(QTDNEG,0)))>0
                            AND CODGRUPOPROD IN(3020000,3010000)
                            THEN
                            ABS(GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
                            NULLIF(QTDNEG,0))) * QTDNEG ELSE 0 END GANHO_EVOLUCAO,

                            CASE
                            WHEN GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) / NULLIF(QTDNEG,
                            0)) > 0 THEN 'REDUCAO'
                            WHEN GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) / NULLIF(QTDNEG,
                            0)) < 0 AND GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) <> 0 THEN 'AUMENTO'
                                WHEN GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) /
                                NULLIF(QTDNEG, 0)) < 0 AND GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)=0
                                    THEN 'SEM ALTERACAO' ELSE 'MANTEVE' END AS SITUACAO_PRECO, (CASE WHEN
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
                                    SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )
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

                                            )

                        </snk:query>


                        <snk:query var="total_economia">
                            SELECT
                            ANO,MES,MES_ANO, SUM(VALOR) VALOR
                            FROM (

                            SELECT

                            TO_CHAR(DTNEG,'YYYY') AS ANO,
                            TO_CHAR(DTNEG,'MM') AS MES,
                            TO_CHAR(DTNEG,'MM-YYYY') AS MES_ANO,

                            ABS(SUM(GANHO_NEGOCIACAO)) AS VALOR
                            FROM
                            (
                            SELECT
                            NUNOTA,
                            DTNEG,
                            DTVENC,
                            DHBAIXA,
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
                            WHERE
                            FIN.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                            AND FIN.RECDESP = -1
                            AND FIN.NUNOTA IS NOT NULL
                            AND CAB.TIPMOV = 'O'
                            AND CAB.STATUSNOTA = 'L'
                            AND USU.AD_USUCOMPRADOR = 'S'
                            )


                            )


                            GROUP BY
                            TO_CHAR(DTNEG,'YYYY'),
                            TO_CHAR(DTNEG,'MM'),
                            TO_CHAR(DTNEG,'MM-YYYY')


                            union all



                            SELECT

                            TO_CHAR(DTNEG,'YYYY') AS ANO,
                            TO_CHAR(DTNEG,'MM') AS MES,
                            TO_CHAR(DTNEG,'MM-YYYY') AS MES_ANO,

                            ABS(SUM(ECONOMIA_COMPRA)) AS VALOR





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
                                    WHERE (SAVING <> 0 OR GANHO_EVOLUCAO_UN <> 0)

                                            GROUP BY
                                            TO_CHAR(DTNEG,'YYYY'),
                                            TO_CHAR(DTNEG,'MM'),
                                            TO_CHAR(DTNEG,'MM-YYYY')
                                            )
                                            GROUP BY ANO, MES, MES_ANO

                                            ORDER BY 1,2
                        </snk:query>


                        <div class="container">
                            <!-- Cards na parte superior -->
                            <div class="cards-row">
                                <!-- Repita as divs dos cards conforme necessário -->
                                <c:forEach items="${compras_saving.rows}" var="row">
                                    <div class="card">
                                        <div class="card-number" data-type="saving">
                                            <fmt:formatNumber value="${row.SAVING}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
                                        </div>
                                        <div class="card-text">Saving</div>
                                    </div>
                                </c:forEach>
                                <c:forEach items="${compras_ganho_evolução.rows}" var="row">
                                    <div class="card">
                                        <div class="card-number" data-type="ganho_evolucao">
                                            <fmt:formatNumber value="${row.GANHO_EVOLUCAO}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
                                        </div>
                                        <div class="card-text">Evolução de Preço</div>
                                    </div>
                                </c:forEach>
                                <c:forEach items="${compras_ganho_negociacao.rows}" var="row">
                                    <div class="card">
                                        <div class="card-number" data-type="ganho_negociacao">
                                            <fmt:formatNumber value="${row.GANHO_NEGOCIACAO}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
                                        </div>
                                        <div class="card-text">Ganho Por Condição de Pgto.</div>
                                    </div>
                                </c:forEach>
                                <div class="card" onclick="abrirDetTotEcon()">
                                    <div id="totalNumber" class="card-number"></div>
                                    <div class="card-text">Total Economia</div>
                                </div>
                            </div>

                            <!-- Gráfico na parte inferior -->
                            <div class="chart-container">
                                <div class="chart-title">Evolução Total Economia</div>
                                <div id="chart"></div>
                            </div>
                        </div>

                        <script>
                            document.addEventListener('DOMContentLoaded', function () {
                                // Obtém os valores dos elementos card
                                var saving = parseFloat(document.querySelector('.card-number[data-type="saving"]').textContent.replace(/[^0-9.-]+/g, ""));
                                var ganhoEvolucao = parseFloat(document.querySelector('.card-number[data-type="ganho_evolucao"]').textContent.replace(/[^0-9.-]+/g, ""));
                                var ganhoNegociacao = parseFloat(document.querySelector('.card-number[data-type="ganho_negociacao"]').textContent.replace(/[^0-9.-]+/g, ""));

                                // Calcula o total
                                var total = ((isNaN(saving) ? 0 : saving) + (isNaN(ganhoEvolucao) ? 0 : ganhoEvolucao) + (isNaN(ganhoNegociacao) ? 0 : ganhoNegociacao))*1000;

                                // Atualiza o conteúdo do elemento com o ID totalNumber
                                //document.getElementById('totalNumber').textContent = total.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
                                document.getElementById('totalNumber').textContent = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total);
                            });


                            document.addEventListener('DOMContentLoaded', function () {

                                var mesAno1 = [];
                                var totEconomia = [];
                                <c:forEach items="${total_economia.rows}" var="row">
                                    mesAno1.push('${row.MES_ANO}');
                                    totEconomia.push(${row.VALOR});
                                </c:forEach>

                                var trace1 = {
                                    x: mesAno1,
                                    y: totEconomia,
                                    mode: 'lines+markers',
                                    marker: {
                                        color: '#28a745',
                                        size: 8
                                    },
                                    line: {
                                        color: '#28a745',
                                        width: 2
                                    }
                                };

                                var layout = {

                                    margin: {
                                        l: 0,
                                        r: 0,
                                        t: 20,
                                        b: 20
                                    },
                                    plot_bgcolor: '#f8f9fa',
                                    paper_bgcolor: '#ffffff',
                                    font: {
                                        size: 12,
                                        color: '#333'
                                    }
                                };
                                Plotly.newPlot('chart', [trace1], layout);
                            });


                            function abrirDetTotEcon(){
                                var params = '';
                                var level = 'lvl_aoft9ge';
                                openLevel(level, params);
                            }


                        </script>
                    </body>

                    </html>