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
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            margin: 0;
            display: flex;
            height: 100vh;
            background-color: #f8f9fa;
        }

        .container {
            display: flex;
            width: 100%;
        }

        .side {
            flex: 1;
            padding: 20px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .card {
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            text-align: center;
            padding: 20px;
            margin-bottom: 20px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .card1 {
            flex: 1;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            text-align: center;
            padding: 20px;
            margin-bottom: 20px;
            transition: transform 0.2s, box-shadow 0.2s;
            margin-right: 20px;
        }
        .card-container {
            display: flex;
            justify-content: space-between; /* Distribui os itens ao longo do container */
            align-items: center; /* Alinha verticalmente os itens */
        }

        .card:hover ,.card1:hover {
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
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin-bottom: 20px;
            transition: transform 0.2s, box-shadow 0.2s;
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

        .buttons-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .button {
            flex: 1 1 calc(25% - 10px);
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 10px;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.2s;
        }

        .button:hover {
            background-color: #218838;
            transform: translateY(-2px);
        }

        .button img {
            margin-right: 5px;
            filter: brightness(0) invert(1); /* Torna a cor do ícone branca */
        }
    </style>

<snk:load/>

</head>
<body>

    <snk:query var="compras_saving">  
        SELECT TO_CHAR(SUM(ITE.VLRDESC), '999,999,999,999,990.00') AS SAVING
        FROM TGFITE ITE
        INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
        WHERE CAB.TIPMOV = 'O'
        AND CAB.STATUSNOTA = 'L'
        AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND ITE.VLRDESC IS NOT NULL
    </snk:query>

    <snk:query var="compras_saving_analitico">  

    SELECT 
    TO_CHAR(DTNEG,'YYYY') AS ANO,
    TO_CHAR(DTNEG,'MM') AS MES,
    TO_CHAR(DTNEG,'MM-YYYY') AS MES_ANO,
    SUM(SAVING) AS SAVING,
    SUM(GANHO_EVOLUCAO) AS GANHO_EVOLUCAO

FROM (

WITH
ANT AS (
SELECT
    CODPROD,
    DESCRICAO,
    AVG(PRECO_COMPRA_UN_LIQ) AS PRECO_COMPRA_UN_LIQ_ANT_MED
FROM
(
    SELECT
        ITE.CODPROD,
        PRO.DESCRPROD AS DESCRICAO,
        ITE.CODVOL AS UN,
        ITE.NUNOTA AS NUNOTA,
        F_DESCROPC('TGFCAB','TIPMOV',CAB.TIPMOV) AS TIPMOV,
        VEN.CODVEND||'-'||VEN.APELIDO AS COMPRADOR,
        ITE.QTDNEG,
        ITE.VLRTOT,
        ITE.VLRDESC,
        (ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA,
        (ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN_LIQ,

        ITE.VLRDESC AS SAVING,
        ((ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0)) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)) AS SAVING_UN,
        (ITE.VLRDESC / NULLIF(ITE.VLRTOT,0)) * 100 AS PERCENTUAL_SAVING
      FROM TGFITE ITE
      INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
      INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
      INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )
      INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
     WHERE CAB.TIPMOV = 'O'
       AND CAB.STATUSNOTA = 'L'
       AND CAB.DTNEG < :P_PERIODO.INI)
GROUP BY CODPROD, DESCRICAO
ORDER BY 2,3 DESC
),
USU AS (SELECT CODUSU,NOMEUSU FROM TSIUSU)

SELECT 
       CAB.CODEMP,
       SUBSTR(CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL),1,20) AS PARCEIRO,
       SUBSTR(ITE.CODPROD||'-'||PRO.DESCRPROD,1,15) AS PRODUTO,
       SUBSTR(PRO.CODGRUPOPROD||'-'|| GRU.DESCRGRUPOPROD,1,15) AS GRUPO,
       ITE.CODVOL AS UN,
       ITE.NUNOTA AS NUNOTA,
       CAB.TIPMOV AS TIPMOV,
       CAB.DTNEG,
       SUBSTR(VEN.CODVEND||'-'||VEN.APELIDO,1,15) AS COMPRADOR,
       SUBSTR(CAB.CODUSUINC||'-'||USU.NOMEUSU,1,15) AS USUARIO_INC,
       ITE.QTDNEG,
       ITE.VLRTOT,
       ITE.VLRDESC AS SAVING,
       (ITE.VLRDESC / NULLIF(ITE.VLRTOT,0)) * 100 AS PERC_SAVING,
       (ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN,
       (ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN_LIQ,
       NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) AS PRECO_COMPRA_UN_LIQ_ANT_MED,
       CASE WHEN (NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)))>0 THEN
       ABS(NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0))) ELSE 0 END GANHO_EVOLUCAO_UN,
       CASE WHEN (NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)))>0 THEN
       ABS(NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0))) * ITE.QTDNEG ELSE 0 END GANHO_EVOLUCAO,
       
       CASE
       WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) > 0 THEN 'REDUCAO'
       WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) < 0 AND NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) <> 0 THEN 'AUMENTO'
       WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) < 0  AND NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) = 0 THEN 'SEM ALTERACAO'
       ELSE 'MANTEVE'
       END AS SITUACAO_PRECO,
       
        (CASE WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) < 0  AND NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) = 0 THEN 0 ELSE
       ABS(ABS(NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)))/NULLIF(((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)),0))*100 END) AS PERC_DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ,
       ITE.VLRDESC + 
       CASE WHEN (NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)))>0 THEN
       ABS(NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0))) * ITE.QTDNEG ELSE 0 END           
       
       AS ECONOMIA_COMPRA
       
       
  FROM TGFITE ITE
  INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
  INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
  INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER))
  INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
  INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
  INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
  LEFT JOIN ANT ON ITE.CODPROD = ANT.CODPROD
  INNER JOIN USU ON CAB.CODUSUINC = USU.CODUSU
 WHERE CAB.TIPMOV = 'O'
   AND CAB.STATUSNOTA = 'L'
   AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
   AND ITE.VLRDESC > 0
)
GROUP BY
TO_CHAR(DTNEG,'YYYY'),
TO_CHAR(DTNEG,'MM'),
TO_CHAR(DTNEG,'MM-YYYY')

ORDER BY 1,2






    </snk:query>


    <snk:query var="compras_ganho_negociacao">
        SELECT TO_CHAR(ABS(SUM(GANHO_NEGOCIACAO)), '999,999,999,999,990.00') AS GANHO_NEGOCIACAO
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
                VLRLIQ * 0.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) - 30)
            ELSE 
                0
            END AS GANHO_NEGOCIACAO,
            CASE 
            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) = 30 THEN 
                VLRLIQ * 1.01
            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) > 30 THEN 
                VLRLIQ * 1.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) - 30)
            ELSE 
                VLRLIQ
            END AS VLRLIQ_COM_JUROS
        FROM
        (
        SELECT 
        NUNOTA,
        DTNEG,
        DTVENC,
        DHBAIXA,
        DESDOBRAMENTO,
        (NVL(TGFFIN.VLRDESDOB,0) + (CASE WHEN TGFFIN.TIPMULTA = '1' THEN NVL(TGFFIN.VLRMULTA,0) ELSE 0 END) + (CASE WHEN TGFFIN.TIPJURO = '1' THEN NVL(TGFFIN.VLRJURO,0) ELSE 0 END) + NVL(TGFFIN.DESPCART,0) + NVL(TGFFIN.VLRVENDOR,0) - NVL(TGFFIN.VLRDESC,0) - (CASE WHEN TGFFIN.IRFRETIDO = 'S' THEN NVL(TGFFIN.VLRIRF,0) ELSE 0 END) - (CASE WHEN TGFFIN.ISSRETIDO = 'S' THEN NVL(TGFFIN.VLRISS,0) ELSE 0 END) - (CASE WHEN TGFFIN.INSSRETIDO = 'S' THEN NVL(TGFFIN.VLRINSS,0) ELSE 0 END) - NVL(TGFFIN.CARTAODESC,0) + NVL((SELECT ROUND(SUM(I.VALOR * I.TIPIMP),2) FROM TGFIMF I WHERE I.NUFIN = TGFFIN.NUFIN),0) + NVL(TGFFIN.VLRMULTANEGOC,0) + NVL(TGFFIN.VLRJURONEGOC,0) - NVL(TGFFIN.VLRMULTALIB,0) - NVL(TGFFIN.VLRJUROLIB,0) + NVL(TGFFIN.VLRVARCAMBIAL,0)) * NVL(TGFFIN.RECDESP,0) VLRLIQ,
        CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END AS DIAS
        FROM TGFFIN 
        WHERE DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN 
        AND RECDESP = -1
        AND NUNOTA IS NOT NULL
        )
        )
    </snk:query>

    
    <snk:query var="compras_ganho_negociacao_periodo">
        SELECT

        TO_CHAR(DTNEG,'YYYY') AS ANO,
        TO_CHAR(DTNEG,'MM') AS MES,
        TO_CHAR(DTNEG,'MM-YYYY') AS MES_ANO,
        ABS(SUM(GANHO_NEGOCIACAO)) AS GANHO_NEGOCIACAO
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
                    VLRLIQ * 0.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) - 30)
                ELSE 
                    0
                END AS GANHO_NEGOCIACAO,
                CASE 
                WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) = 30 THEN 
                    VLRLIQ * 1.01
                WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) > 30 THEN 
                    VLRLIQ * 1.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) - 30)
                ELSE 
                    VLRLIQ
                END AS VLRLIQ_COM_JUROS
            FROM
            (
            SELECT 
            NUNOTA,
            DTNEG,
            DTVENC,
            DHBAIXA,
            DESDOBRAMENTO,
            (NVL(TGFFIN.VLRDESDOB,0) + (CASE WHEN TGFFIN.TIPMULTA = '1' THEN NVL(TGFFIN.VLRMULTA,0) ELSE 0 END) + (CASE WHEN TGFFIN.TIPJURO = '1' THEN NVL(TGFFIN.VLRJURO,0) ELSE 0 END) + NVL(TGFFIN.DESPCART,0) + NVL(TGFFIN.VLRVENDOR,0) - NVL(TGFFIN.VLRDESC,0) - (CASE WHEN TGFFIN.IRFRETIDO = 'S' THEN NVL(TGFFIN.VLRIRF,0) ELSE 0 END) - (CASE WHEN TGFFIN.ISSRETIDO = 'S' THEN NVL(TGFFIN.VLRISS,0) ELSE 0 END) - (CASE WHEN TGFFIN.INSSRETIDO = 'S' THEN NVL(TGFFIN.VLRINSS,0) ELSE 0 END) - NVL(TGFFIN.CARTAODESC,0) + NVL((SELECT ROUND(SUM(I.VALOR * I.TIPIMP),2) FROM TGFIMF I WHERE I.NUFIN = TGFFIN.NUFIN),0) + NVL(TGFFIN.VLRMULTANEGOC,0) + NVL(TGFFIN.VLRJURONEGOC,0) - NVL(TGFFIN.VLRMULTALIB,0) - NVL(TGFFIN.VLRJUROLIB,0) + NVL(TGFFIN.VLRVARCAMBIAL,0)) * NVL(TGFFIN.RECDESP,0) VLRLIQ,
            CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END AS DIAS
            FROM TGFFIN 
            WHERE DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN 
            AND RECDESP = -1
            AND NUNOTA IS NOT NULL
            )
            

        )
        
        GROUP BY 
        TO_CHAR(DTNEG,'YYYY'),
        TO_CHAR(DTNEG,'MM'),
        TO_CHAR(DTNEG,'MM-YYYY')
        ORDER BY 1,2
    </snk:query>




    <snk:query var="compras_ganho_evolução">
    SELECT 
    
    TO_CHAR(GANHO_EVOLUCAO, '999,999,999,999,990.00') AS GANHO_EVOLUCAO
    FROM(

    WITH
    ANT AS (
    SELECT
        CODPROD,
        DESCRICAO,
        AVG(PRECO_COMPRA_UN_LIQ) AS PRECO_COMPRA_UN_LIQ_ANT_MED
    FROM
    (
        SELECT
            ITE.CODPROD,
            PRO.DESCRPROD AS DESCRICAO,
            ITE.CODVOL AS UN,
            ITE.NUNOTA AS NUNOTA,
            F_DESCROPC('TGFCAB','TIPMOV',CAB.TIPMOV) AS TIPMOV,
            VEN.CODVEND||'-'||VEN.APELIDO AS COMPRADOR,
            ITE.QTDNEG,
            ITE.VLRTOT,
            ITE.VLRDESC,
            (ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA,
            (ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN_LIQ,
    
            ITE.VLRDESC AS SAVING,
            ((ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0)) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)) AS SAVING_UN,
            (ITE.VLRDESC / NULLIF(ITE.VLRTOT,0)) * 100 AS PERCENTUAL_SAVING
          FROM TGFITE ITE
          INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
          INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
          INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )
          INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
         WHERE CAB.TIPMOV = 'O'
           AND CAB.STATUSNOTA = 'L'
           AND CAB.DTNEG < :P_PERIODO.INI)
    GROUP BY CODPROD, DESCRICAO
    ORDER BY 2,3 DESC
    ),
    USU AS (SELECT CODUSU,NOMEUSU FROM TSIUSU)
    
    SELECT 
           SUM(CASE WHEN (NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)))>0 THEN
           ABS(NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0))) * ITE.QTDNEG ELSE 0 END) GANHO_EVOLUCAO
      FROM TGFITE ITE
      INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
      INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
      INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER))
      INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
      INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
      INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
      LEFT JOIN ANT ON ITE.CODPROD = ANT.CODPROD
      INNER JOIN USU ON CAB.CODUSUINC = USU.CODUSU
     WHERE CAB.TIPMOV = 'O'
       AND CAB.STATUSNOTA = 'L'
       AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
       AND ITE.VLRDESC > 0)
    </snk:query>





    <div class="container">
        <div class="side">
            <div class="card-container">


                <c:forEach items="${compras_saving.rows}" var="row">
                    <div class="card1" onclick="abrirSaving()">
                        <div class="card-number">${row.SAVING}</div>
                        <div class="card-text">Saving</div>
                    </div>
                </c:forEach>

                <c:forEach items="${compras_ganho_evolução.rows}" var="row">
                    <div class="card1" onclick="abrirSaving()">
                        
                        <div class="card-number">${row.GANHO_EVOLUCAO}</div>
                        <div class="card-text">Ganho de Evolução</div>
                    </div>
                </c:forEach>



            </div>

            <div class="chart-container">
                <div class="chart-title">Evolução Saving</div>
                <div id="chart-left"></div>
            </div>
            <div class="buttons-container">
                <button class="button" onclick="abrirSavProFor()">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    Top 10 Saving
                </button>
                <!-- Repita o botão abaixo até ter 8 -->
                <button class="button" onclick="abrirSavProPerc()">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    Comprador
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
            </div>
        </div>
        <div class="side">
            <c:forEach items="${compras_ganho_negociacao.rows}" var="row">
                <div class="card" onclick="abrirGanhNeg()">
                    <div class="card-number">${row.GANHO_NEGOCIACAO}</div>
                    <div class="card-text">Ganho Negociação</div>
                </div>
            </c:forEach>
            <div class="chart-container">
                <div class="chart-title">Evolução Ganho Negociação</div>
                <div id="chart-right"></div>
            </div>
            <div class="buttons-container">
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <!-- Repita o botão abaixo até ter 8 -->
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
                <button class="button">
                    <img src="https://www.svgrepo.com/show/487171/cash.svg" alt="Icon" width="16" height="16">
                    teste teste
                </button>
            </div>
        </div>
    </div>
    <script>
        var mesAno = [];
        var saving = [];
        <c:forEach items="${compras_saving_analitico.rows}" var="row">
            mesAno.push('${row.MES_ANO}');
            saving.push(${row.SAVING});
        </c:forEach>

        var trace1 = {
            x: mesAno,
            y: saving,
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
            title: '',
            xaxis: {
                title: 'Mês/Ano'
            },
            yaxis: {
                title: 'Saving'
            },
            margin: {
                l: 50,
                r: 30,
                t: 30,
                b: 50
            },
            plot_bgcolor: '#f8f9fa',
            paper_bgcolor: '#ffffff',
            font: {
                size: 12,
                color: '#333'
            }
        };

        Plotly.newPlot('chart-left', [trace1], layout);
    </script>

    <script>
        var mesAno = [];
        var ganhoNeg = [];
        <c:forEach items="${compras_ganho_negociacao_periodo.rows}" var="row">
            mesAno.push('${row.MES_ANO}');
            ganhoNeg.push(${row.GANHO_NEGOCIACAO});
        </c:forEach>

        var trace1 = {
            x: mesAno,
            y: ganhoNeg,
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
            title: '',
            xaxis: {
                title: 'Mês/Ano'
            },
            yaxis: {
                title: 'Ganho Negociação'
            },
            margin: {
                l: 50,
                r: 30,
                t: 30,
                b: 50
            },
            plot_bgcolor: '#f8f9fa',
            paper_bgcolor: '#ffffff',
            font: {
                size: 12,
                color: '#333'
            }
        };
        Plotly.newPlot('chart-right', [trace1], layout);
    </script>


<script>
    function abrirSaving(){
    var params = '';
    var level = 'lvl_9s400g';
    openLevel(level, params);
    }
    function abrirSavProFor(){
    var params = '';
    var level = 'lvl_acwo5md';
    openLevel(level, params);
    }
    function abrirSavProPerc(){
    var params = '';
    var level = 'lvl_acwo5or';
    openLevel(level, params);
    }    
    
    function abrirGanhNeg(){
    var params = '';
    var level = 'lvl_adrfvrm';
    openLevel(level, params);
    }
</script>

</body>
</html>
