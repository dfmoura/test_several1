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
    <!-- Importando o Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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
USUARIO_INC AS COMPRADOR,
SUM(SAVING) AS SAVING
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
SELECT CAB.CODEMP,
       SUBSTR(CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL), 1, 20) AS PARCEIRO,
       ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO,
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
  INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
 WHERE CAB.TIPMOV = 'O'
   AND CAB.STATUSNOTA = 'L'
   AND USU.AD_USUCOMPRADOR = 'S'
   AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN 
   AND ITE.VLRDESC > 0
)
  

)GROUP BY USUARIO_INC
    </snk:query>


    <snk:query var="compras_ganh_evolucao_comprador">
        SELECT
        USUARIO_INC AS COMPRADOR,
        SUM(GANHO_EVOLUCAO) AS GANHO_EVOLUCAO
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
        SELECT CAB.CODEMP,
               SUBSTR(CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL), 1, 20) AS PARCEIRO,
               ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO,
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
          INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
         WHERE CAB.TIPMOV = 'O'
           AND CAB.STATUSNOTA = 'L'
           AND USU.AD_USUCOMPRADOR = 'S'
           AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN 
           AND ITE.VLRDESC > 0
           
        )        

        )GROUP BY USUARIO_INC
    </snk:query>




    <div class="container">
        <div class="card" id="left-card">
            <div class="chart-title">Saving por Comprador</div>
            <canvas id="chart-left"></canvas>
        </div>
        <div class="card" id="right-card">
            <div class="chart-title">Ganho de Evolução por Comprador</div>
            <canvas id="chart-right"></canvas>
        </div>
    </div>

    <!-- JavaScript para criar os gráficos -->
    <script>
        // Definindo 7 tons de verde
        const greenShades = [

            'rgba(126,32,64,0.79)',
            'rgba(64,156,204,0.96)',
            'rgba(211,116,48,0.94)',
            'rgba(66,190,138,0.82)',
            'rgba(211,116,48,0.94)',
            'rgba(126,32,64,0.79)'
        ];

        // Função para criar um gráfico de pizza com Chart.js
        function createPieChart(ctx, labels, data, title) {
            const colors = greenShades.slice(0, data.length);
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                        },
                        title: {
                            display: false,
                            text: title
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    let sum = context.dataset.data.reduce((a, b) => a + b, 0);
                                    let value = context.raw;
                                    let percentage = ((value / sum) * 100).toFixed(2);
                                    let formattedValue = new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
                                    label += formattedValue + ' (' + percentage + '%)';
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Obtendo dados do JSP para o gráfico da esquerda (Saving por Comprador)
        var labelsLeft = [
            <c:forEach var="row" items="${compras_saving_comprador.rows}">
                '${row.COMPRADOR}'<c:if test="${!loop.last}">,</c:if>
            </c:forEach>
        ];

        var dataLeft = [
            <c:forEach var="row" items="${compras_saving_comprador.rows}">
                ${row.SAVING}<c:if test="${!loop.last}">,</c:if>
            </c:forEach>
        ];

        // Obtendo dados do JSP para o gráfico da direita (Ganho de Evolução por Comprador)
        var labelsRight = [
            <c:forEach var="row" items="${compras_ganh_evolucao_comprador.rows}">
                '${row.COMPRADOR}'<c:if test="${!loop.last}">,</c:if>
            </c:forEach>
        ];

        var dataRight = [
            <c:forEach var="row" items="${compras_ganh_evolucao_comprador.rows}">
                ${row.GANHO_EVOLUCAO}<c:if test="${!loop.last}">,</c:if>
            </c:forEach>
        ];

        // Criando gráficos de pizza
        window.onload = function() {
            var ctxLeft = document.getElementById('chart-left').getContext('2d');
            createPieChart(ctxLeft, labelsLeft, dataLeft, 'Saving por Comprador');

            var ctxRight = document.getElementById('chart-right').getContext('2d');
            createPieChart(ctxRight, labelsRight, dataRight, 'Ganho de Evolução por Comprador');
        };
    </script>
</body>
</html>
