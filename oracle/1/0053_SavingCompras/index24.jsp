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
    <title>Pie Charts</title>
    <!-- Importando o Plotly.js -->
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <!-- Estilos CSS internos para manter tudo em um único arquivo -->
    <style>
        body, html {
            height: 100%;
            margin: 0;
            font-family: Arial, sans-serif;
            overflow: hidden;
        }
        .container {
            display: flex;
            height: 100%;
            flex-direction: row;
        }
        .card {
            flex: 1;
            padding: 20px;
            overflow: hidden;
            position: relative;
            background-color: #f0f0f0;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            border-radius: 10px;
            margin: 20px;
            transition: all 0.3s ease;
        }
        .card:hover {
            transform: scale(1.05);
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
        }
        .chart {
            width: 100%;
            height: 100%;
        }
        .chart-title {
            text-align: center;
            margin-bottom: 10px;
            font-size: 18px;
            color: #333;
        }
        .legend {
            font-size: 12px;
            margin-top: 5px;
        }        
    </style>
<snk:load/>

</head>

<body>

    <snk:query var="compras_saving_comprador">
        SELECT
COMPRADOR,
SUM(SAVING) AS SAVING
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
           CAB.CODEMP,
           SUBSTR(CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL),1,20) AS PARCEIRO,
           SUBSTR(ITE.CODPROD||'-'||PRO.DESCRPROD,1,15) AS PRODUTO,
           SUBSTR(PRO.CODGRUPOPROD||'-'|| GRU.DESCRGRUPOPROD,1,15) AS GRUPO,
           ITE.CODVOL AS UN,
           ITE.NUNOTA AS NUNOTA,
           CAB.TIPMOV AS TIPMOV,
           TO_CHAR(CAB.DTNEG,'DD-MM-YYYY') AS DTNEG,
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
)GROUP BY COMPRADOR
    </snk:query>


    <snk:query var="compras_ganh_evolucao_comprador">
        SELECT
COMPRADOR,
SUM(GANHO_EVOLUCAO) AS GANHO_EVOLUCAO
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
           CAB.CODEMP,
           SUBSTR(CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL),1,20) AS PARCEIRO,
           SUBSTR(ITE.CODPROD||'-'||PRO.DESCRPROD,1,15) AS PRODUTO,
           SUBSTR(PRO.CODGRUPOPROD||'-'|| GRU.DESCRGRUPOPROD,1,15) AS GRUPO,
           ITE.CODVOL AS UN,
           ITE.NUNOTA AS NUNOTA,
           CAB.TIPMOV AS TIPMOV,
           TO_CHAR(CAB.DTNEG,'DD-MM-YYYY') AS DTNEG,
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
)GROUP BY COMPRADOR
    </snk:query>


    <div class="container">
        <div class="card" id="left-card">
            <div class="chart-title">Saving por Comprador</div>
            <div class="chart" id="chart-left"></div>
        </div>
        <div class="card" id="right-card">
            <div class="chart-title">Ganho de Evolução por Comprador</div>
            <div class="chart" id="chart-right"></div>
        </div>
    </div>

    <!-- JavaScript para criar os gráficos -->
    <script>
        // Dados para o gráfico da esquerda (Saving por Comprador)
        var dataLeft = {
            labels: [
                <c:forEach var="row" items="${compras_saving_comprador.rows}">
                    '${row.COMPRADOR}'<c:if test="${!loop.last}">,</c:if>
                </c:forEach>
            ],
            values: [
                <c:forEach var="row" items="${compras_saving_comprador.rows}">
                    ${row.SAVING}<c:if test="${!loop.last}">,</c:if>
                </c:forEach>
            ],
            type: 'pie',
            textinfo: 'none'
        };

        // Dados para o gráfico da direita (Ganho de Evolução por Comprador)
        var dataRight = {
            labels: [
                <c:forEach var="row" items="${compras_ganh_evolucao_comprador.rows}">
                    '${row.COMPRADOR}'<c:if test="${!loop.last}">,</c:if>
                </c:forEach>
            ],
            values: [
                <c:forEach var="row" items="${compras_ganh_evolucao_comprador.rows}">
                    ${row.GANHO_EVOLUCAO}<c:if test="${!loop.last}">,</c:if>
                </c:forEach>
            ],
            type: 'pie',
            textinfo: 'none' 
        };

        // Configurações do layout
        var layout = {
            showlegend: false,
            legend: {
                x: 0.5,
                y: 1.2,
                orientation: 'h',
                traceorder: 'normal',
                font: {
                    size: 10 // Tamanho da fonte da legenda
                } 
            }
        };

        // Configuração dos gráficos
        Plotly.newPlot('chart-left', [dataLeft], Object.assign({}, layout), {responsive: true});
        Plotly.newPlot('chart-right', [dataRight], Object.assign({}, layout), {responsive: true});



</script>
</body>
</html>
