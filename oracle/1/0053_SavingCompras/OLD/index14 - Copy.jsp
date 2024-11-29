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
  <title>Resizable Screen with Horizontal Bar Charts</title>
  <!-- Plotly.js -->
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .container {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      width: 100%;
      max-width: 1200px;
    }
    .section {
      flex: 1;
      margin: 10px;
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 8px;
      background-color: #f9f9f9;
    }
    .chart {
      width: 100%;
      height: 400px;
    }
  </style>

<snk:load/>

</head>
<body>

<snk:query var="saving_produto">
  SELECT
PRODUTO,
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
GROUP BY PRODUTO
ORDER BY 2 DESC
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

<script>
  // Dados fictícios para os gráficos
  const produtosData = [
    { produto: 'Produto A', saving: 5000 },
    { produto: 'Produto B', saving: 3000 },
    { produto: 'Produto C', saving: 7000 },
    { produto: 'Produto D', saving: 4000 },
    { produto: 'Produto E', saving: 6000 }
  ];

  const fornecedoresData = [
    { fornecedor: 'Fornecedor X', saving: 8000 },
    { fornecedor: 'Fornecedor Y', saving: 6000 },
    { fornecedor: 'Fornecedor Z', saving: 9000 },
    { fornecedor: 'Fornecedor W', saving: 7000 },
    { fornecedor: 'Fornecedor V', saving: 8500 }
  ];

  // Função para criar gráfico de barras horizontais
  function createHorizontalBarChart(containerId, data) {
    const sortedData = data.sort((a, b) => b.saving - a.saving);
    const values = sortedData.map(item => item.saving);
    const labels = sortedData.map(item => item.produto || item.fornecedor);

    const trace = {
      x: values,
      y: labels,
      type: 'bar',
      orientation: 'h',
      marker: {
        color: '#28a745'
      }
    };

    const layout = {
      margin: { t: 40, r: 20, l: 150, b: 40 }
    };

    const config = { responsive: true };

    Plotly.newPlot(containerId, [trace], layout, config);
  }

  // Criar os gráficos
  createHorizontalBarChart('chart1', produtosData);
  createHorizontalBarChart('chart2', fornecedoresData);
</script>

</body>
</html>
