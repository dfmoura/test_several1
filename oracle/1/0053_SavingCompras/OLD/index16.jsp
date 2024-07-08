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
    <title>Resizable Page with Plotly.js</title>
    <!-- Importando Plotly.js -->
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <!-- Estilos CSS -->
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .chart-container {
            flex: 1;
            display: flex;
            overflow: hidden;
        }
        .chart {
            flex: 1;
            border: 1px solid #ccc;
            margin: 10px;
            overflow: hidden;
        }
    </style>

<snk:load/>

</head>

<body>


    <snk:query var="saving_produto">
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
        USU AS (SELECT CODUSU,NOMEUSU FROM TSIUSU),
        BAS AS (
        SELECT ROWNUM,PRODUTO, SUM(SAVING) AS SAVING
        FROM (
        SELECT CAB.CODEMP,
               SUBSTR(CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL),1,20) AS PARCEIRO,
               ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO,
               SUBSTR(PRO.CODGRUPOPROD||'-'|| GRU.DESCRGRUPOPROD,1,15) AS GRUPO,
               ITE.CODVOL AS UN,
               ITE.NUNOTA AS NUNOTA,
               CAB.TIPMOV AS TIPMOV,
               TO_CHAR(CAB.DTNEG,'DD-MM-YYYY') AS DTNEG,
               SUBSTR(VEN.CODVEND||'-'||VEN.APELIDO,1,15) AS COMPRADOR,
               SUBSTR(CAB.CODUSUINC||'-'||USU.NOMEUSU,1,15) AS USUARIO_INC,
               ITE.QTDNEG,
               ITE.VLRTOT,
               ITE.VLRDESC,
               (ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN,
               (ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN_LIQ,
               NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) AS PRECO_COMPRA_UN_LIQ_ANT_MED,
               ABS(NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0))) AS DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ,
                CASE
                WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) > 0 THEN 'REDUCAO'
                WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) < 0 AND NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) <> 0 THEN 'AUMENTO'
                WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) < 0  AND NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) = 0 THEN 'SEM ALTERACAO'
                ELSE 'MANTEVE'
                END AS SITUACAO_PRECO,
                (CASE WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) < 0  AND NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) = 0 THEN 0 ELSE
               ABS(ABS(NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)))/NULLIF(((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)),0))*100 END) AS PERC_DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ,
               ITE.VLRDESC AS SAVING,
               ((ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0)) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)) AS SAVING_UN,
               (ITE.VLRDESC / NULLIF(ITE.VLRTOT,0)) * 100 AS PERC_SAVING
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
    )GROUP BY ROWNUM,PRODUTO ORDER BY 3 DESC),
    BAS2 AS ( SELECT ROWNUM AS A,PRODUTO, SAVING FROM BAS ORDER BY 3 DESC)
    SELECT PRODUTO, SAVING FROM BAS2 WHERE A <= 10
    UNION ALL
    SELECT 'OUTROS' AS PRODUTO, SUM(SAVING) AS SAVING FROM BAS2 WHERE A > 10
    
      </snk:query>
      
      <snk:query var="saving_fornecedor">
        SELECT
        PARCEIRO,
        SUM(SAVING) AS SAVING
        FROM
        (
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
            
            SELECT CAB.CODEMP,
                   SUBSTR(CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL),1,20) AS PARCEIRO,
                   ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO,
                   SUBSTR(PRO.CODGRUPOPROD||'-'|| GRU.DESCRGRUPOPROD,1,15) AS GRUPO,
                   ITE.CODVOL AS UN,
                   ITE.NUNOTA AS NUNOTA,
                   CAB.TIPMOV AS TIPMOV,
                   TO_CHAR(CAB.DTNEG,'DD-MM-YYYY') AS DTNEG,
                   SUBSTR(VEN.CODVEND||'-'||VEN.APELIDO,1,15) AS COMPRADOR,
                   SUBSTR(CAB.CODUSUINC||'-'||USU.NOMEUSU,1,15) AS USUARIO_INC,
                   ITE.QTDNEG,
                   ITE.VLRTOT,
                   ITE.VLRDESC,
                   (ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN,
                   (ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0) AS PRECO_COMPRA_UN_LIQ,
                   NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) AS PRECO_COMPRA_UN_LIQ_ANT_MED,
                   ABS(NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0))) AS DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ,
                    CASE
                    WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) > 0 THEN 'REDUCAO'
                    WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) < 0 AND NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) <> 0 THEN 'AUMENTO'
                    WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) < 0  AND NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) = 0 THEN 'SEM ALTERACAO'
                    ELSE 'MANTEVE'
                    END AS SITUACAO_PRECO,
                    (CASE WHEN NVL(PRECO_COMPRA_UN_LIQ_ANT_MED, 0) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG, 0)) < 0  AND NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0) = 0 THEN 0 ELSE
                   ABS(ABS(NVL(PRECO_COMPRA_UN_LIQ_ANT_MED,0)-((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)))/NULLIF(((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)),0))*100 END) AS PERC_DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ,
                   ITE.VLRDESC AS SAVING,
                   ((ITE.VLRTOT) / NULLIF(ITE.QTDNEG,0)) - ((ITE.VLRTOT - ITE.VLRDESC) / NULLIF(ITE.QTDNEG,0)) AS SAVING_UN,
                   (ITE.VLRDESC / NULLIF(ITE.VLRTOT,0)) * 100 AS PERC_SAVING
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
        GROUP BY PARCEIRO
        ORDER BY 2 DESC
      
      </snk:query>

      <div class="container">
        <div class="section">
          <h2>Produtos que tiveram maior saving</h2>
          <div id="chart1" class="chart"></div>
        </div>
        <div class="section">
          <h2>Fornecedores que tiveram maior saving</h2>
          <div id="chart2" class="chart"></div>
        </div>
      </div>
      
    <!-- Script JavaScript -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Dados fictícios para os gráficos
            var productsData = [
                { product: 'Product A', saving: 3500 },
                { product: 'Product B', saving: 2800 },
                { product: 'Product C', saving: 2100 },
                { product: 'Product D', saving: 1800 },
                { product: 'Product E', saving: 1200 }
            ];

            var suppliersData = [
                { supplier: 'Supplier X', saving: 4500 },
                { supplier: 'Supplier Y', saving: 3900 },
                { supplier: 'Supplier Z', saving: 3200 },
                { supplier: 'Supplier W', saving: 2800 },
                { supplier: 'Supplier V', saving: 2200 }
            ];

            // Ordenando os dados por saving de forma decrescente
            productsData.sort((a, b) => b.saving - a.saving);
            suppliersData.sort((a, b) => b.saving - a.saving);

            // Função para criar o gráfico de barras
            function createBarChart(containerId, data, title) {
                var labels = data.map(item => item.product || item.supplier);
                var values = data.map(item => item.saving);

                var trace = {
                    x: values,
                    y: labels,
                    type: 'bar',
                    orientation: 'h',
                    marker: {
                        color: '#28a745',
                        width: 1
                    }
                };

                var layout = {
                    title: title,
                    margin: { l: 100, r: 20, t: 40, b: 50 }
                };

                Plotly.newPlot(containerId, [trace], layout);
            }

            // Chamando a função para criar os gráficos
            createBarChart('products-chart', productsData.reverse(), 'Produtos que tiveram maior saving');
            createBarChart('suppliers-chart', suppliersData.reverse(), 'Fornecedores que tiveram maior saving');

            // Adicionar evento de redimensionamento para os gráficos
            window.addEventListener('resize', function() {
                Plotly.Plots.resize('products-chart');
                Plotly.Plots.resize('suppliers-chart');
            });
        });
    </script>
</body>
</html>
