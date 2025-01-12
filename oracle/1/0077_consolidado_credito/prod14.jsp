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
    <title>Responsive Dashboard</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background-color: #f4f4f9;
        display: flex;
        flex-direction: column;
        height: 100vh;
      }
  
      .container {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 1rem;
        box-sizing: border-box;
      }
  
      .top {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
      }
  
      .cards-container {
        width: 48%;
      }
  
      .cards-title {
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 0.5rem;
        color: #333;
        text-align: center;
      }
  
      .cards {
        display: grid;
        /*grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));*/
        grid-template-columns: repeat(4, 1fr); /* 4 colunas */
        gap: 1rem;
        align-content: center; /* Centraliza verticalmente */
        justify-content: center; /* Centraliza horizontalmente */
      }
  
      .card {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        padding: 1rem;
        text-align: center;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
  
      .card .value {
        font-size: 1.5rem;
        font-weight: bold;
        color: #333;
      }
  
      .card .description {
        font-size: 0.9rem;
        color: #777;
      }
  
      .card .value1 {
        font-size: 1.5rem;
        font-weight: bold;
        color: #ffffff;
      }
  
      .card .description1 {
        font-size: 0.9rem;
        color: #ffffff;
      }
      
      .bottom {
        display: flex;
        justify-content: space-between;
        flex-grow: 1;
        gap: 2rem; /* Aumentando o espaço entre os gráficos */
      }
  
      .chart {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        padding: 1rem;
        width: 48%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
  
      .chart canvas {
        width: 100% !important;
        height: auto !important;
      }
  
      @media (max-width: 768px) {
        .cards {
          grid-template-columns: repeat(2, 1fr);
        }
  
        .bottom {
          flex-direction: column;
          gap: 1rem;
        }
  
        .chart {
          width: 100%;
        }
      }

      .card, .chart {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }

      .card:hover, .chart:hover {
        transform: translateY(-10px); /* Move o card para cima */
        box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2); /* Intensifica a sombra */
      }

    </style>
    <snk:load/>
  </head>
  <body>

<snk:query var="dias">  
  SELECT
  COUNT(CASE WHEN DIAS_EM_ATRASO <= 5 THEN DIAS_EM_ATRASO END) AS ate_5_DIAS,
  COUNT(CASE WHEN DIAS_EM_ATRASO > 5 AND DIAS_EM_ATRASO <= 10 THEN DIAS_EM_ATRASO END) AS entre_5_E_10_DIAS,
  COUNT(CASE WHEN DIAS_EM_ATRASO > 10 AND DIAS_EM_ATRASO <= 20 THEN DIAS_EM_ATRASO END) AS entre_10_E_20_DIAS,
  COUNT(CASE WHEN DIAS_EM_ATRASO > 20 THEN DIAS_EM_ATRASO END) AS Mais_20_DIAS
  FROM (
    SELECT
    CODPARCMATRIZ,
    RAZAOSOCIAL,
    ABS(ROUND(AVG(DIAS_EM_ATRASO),0)) DIAS_EM_ATRASO,
    ROUND(AVG(VLRDESDOB),2) VLRDESDOB,
    ROUND(AVG(VLRBAIXA),2) VLRBAIXA
    FROM (
    SELECT
    NVL(PAR.CODPARCMATRIZ,PAR.CODPARC) CODPARCMATRIZ,
    PAR1.RAZAOSOCIAL,
    NUFIN,
    NUNOTA,
    NUMNOTA,
    DTVENC,
    DHBAIXA,
    DTVENC - DHBAIXA AS DIAS_EM_ATRASO,
    VLRDESDOB,
    VLRBAIXA
    FROM TGFFIN FIN
    INNER JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
    INNER JOIN TGFPAR PAR1 ON PAR.CODPARCMATRIZ = PAR1.CODPARC
    WHERE RECDESP=1 AND PROVISAO='N'
    AND (FIN.DHBAIXA IS NOT NULL OR FIN.DTVENC < TRUNC(SYSDATE))
    )
    WHERE ((DTVENC - DHBAIXA) < 0)
    GROUP BY 
    CODPARCMATRIZ,
    RAZAOSOCIAL


  ) 
</snk:query>   


<snk:query var="meses">
  SELECT
  COUNT(CASE WHEN MESES <= 5 AND STATUS_CADASTRO = 'Casdastro Não Vencido' THEN MESES END) AS A_vencer_ate_5_MES,
  COUNT(CASE WHEN MESES > 5 AND STATUS_CADASTRO = 'Casdastro Não Vencido' THEN MESES END) AS A_vencer_mais_5_MES,
  COUNT(CASE WHEN MESES <= 6 AND STATUS_CADASTRO = 'Cadastro Vencido' THEN MESES END) vencido_ate_6_MES,
  COUNT(CASE WHEN MESES > 6 AND STATUS_CADASTRO = 'Cadastro Vencido' THEN MESES END) AS vencido_mais_6_MES
  FROM (
  
  SELECT 
  CODPARCMATRIZ,
  RAZAOSOCIAL,
  AD_DTVENCCAD,
  CASE
  WHEN AD_DTVENCCAD >= SYSDATE THEN 'Casdastro Não Vencido'
  WHEN AD_DTVENCCAD < SYSDATE THEN 'Cadastro Vencido' END AS STATUS_CADASTRO,
  ROUND(ABS(AD_DTVENCCAD - SYSDATE),0) AS DIAS,
  ROUND(ABS(MONTHS_BETWEEN(SYSDATE, AD_DTVENCCAD)),0) AS MESES
  FROM(
  
  SELECT
  NVL(PAR.CODPARCMATRIZ,PAR.CODPARC) CODPARCMATRIZ,
  PAR1.RAZAOSOCIAL,
  MAX(PAR.AD_DTVENCCAD) AD_DTVENCCAD
  FROM TGFPAR PAR
  INNER JOIN TGFPAR PAR1 ON NVL(PAR.CODPARCMATRIZ,PAR.CODPARC) = PAR1.CODPARC
  WHERE PAR.AD_DTVENCCAD IS NOT NULL AND PAR1.CODPARC > 2
  GROUP BY NVL(PAR.CODPARCMATRIZ,PAR.CODPARC),PAR1.RAZAOSOCIAL
  ))
</snk:query>

<snk:query var="noventa_perc">
  SELECT
  GRUPO_LIMCREDISP,
  INTERVALO,
  ROUND(AVG(LIMCREDISP),2) AVG_LIMCREDISP,
  COUNT(*) PARCEIROS
  FROM(
  
  SELECT
  PARCEIRO,
  LIMCREDISP,
  GRUPO_LIMCREDISP,
  'De: ' ||
  TO_CHAR((MIN(PERC) OVER (PARTITION BY GRUPO_LIMCREDISP)), 'FM999990.00')||'%' ||
  '_Até: ' ||
  TO_CHAR(MAX(PERC) OVER (PARTITION BY GRUPO_LIMCREDISP), 'FM999990.00')||'%' AS INTERVALO
  
  FROM (
  
  
  select 
  SUBSTR(CODPARCMATRIZ||'-'||RAZAOSOCIAL,1,12) PARCEIRO,
  LIMCRED,
  LIMCREDISP,
  perc,
  NTILE(6) OVER (ORDER BY perc DESC) AS GRUPO_LIMCREDISP
  from (
  SELECT
  CODPARCMATRIZ,
  RAZAOSOCIAL,
  ATIVO,
  LIMCRED,
  LIMCREDCONSUM,
  LIMCREDISP,
  (LIMCREDCONSUM / NULLIF(LIMCRED, 0)) * 100 perc
  FROM
  (
  SELECT
  COALESCE(PAR.CODPARCMATRIZ,PAR.CODPARC) AS CODPARCMATRIZ,
  COALESCE(PAR2.RAZAOSOCIAL,PAR.RAZAOSOCIAL) AS RAZAOSOCIAL,
  PAR2.ATIVO,
  NVL(PAR2.LIMCRED,0) AS LIMCRED,
  SUM(NVL(FIN.VLRDESDOB,0)) AS LIMCREDCONSUM,
  NVL(PAR2.LIMCRED,0) - SUM(NVL(FIN.VLRDESDOB,0)) AS LIMCREDISP,
  PAR2.AD_DTVENCCAD,
  CASE
  WHEN PAR2.AD_DTVENCCAD >= SYSDATE THEN 'Casdastro Não Vencido'
  WHEN PAR2.AD_DTVENCCAD < SYSDATE THEN 'Cadastro Vencido' 
  ELSE 'Sem Data de Cadastro' 
  END AS STATUS_CADASTRO
  FROM TGFPAR PAR 
  LEFT JOIN TGFFIN FIN ON PAR.CODPARC = FIN.CODPARC
  LEFT JOIN TGFPAR PAR2 ON PAR.CODPARCMATRIZ = PAR2.CODPARC
  LEFT JOIN TGFCAB CAB  ON FIN.NUNOTA = CAB.NUNOTA
  WHERE 
  FIN.RECDESP = 1 AND FIN.DHBAIXA IS NULL
  AND (CAB.STATUSNOTA = 'L' OR FIN.NUNOTA IS NULL)
  AND PAR.CLIENTE = 'S'
  GROUP BY
  COALESCE(PAR.CODPARCMATRIZ,PAR.CODPARC),
  COALESCE(PAR2.RAZAOSOCIAL,PAR.RAZAOSOCIAL),
  PAR2.ATIVO,PAR2.LIMCRED,PAR2.AD_DTVENCCAD
  UNION ALL
  SELECT * FROM (
  -- Primeiro, criamos um CTE (Common Table Expression) para o segundo SELECT
  WITH SegundoSelect AS (
    SELECT
    COALESCE(PAR.CODPARCMATRIZ,PAR.CODPARC) AS CODPARCMATRIZ,
    COALESCE(PAR2.RAZAOSOCIAL,PAR.RAZAOSOCIAL) AS RAZAOSOCIAL,
    PAR2.ATIVO,
    NVL(PAR2.LIMCRED,0) AS LIMCRED,
    SUM(NVL(FIN.VLRDESDOB,0)) AS LIMCREDCONSUM,
    NVL(PAR2.LIMCRED,0) - SUM(NVL(FIN.VLRDESDOB,0)) AS LIMCREDISP,
    PAR2.AD_DTVENCCAD,
    CASE
    WHEN PAR2.AD_DTVENCCAD >= SYSDATE THEN 'Casdastro Não Vencido'
    WHEN PAR2.AD_DTVENCCAD < SYSDATE THEN 'Cadastro Vencido' 
    ELSE 'Sem Data de Cadastro' 
    END AS STATUS_CADASTRO
    FROM TGFPAR PAR 
    LEFT JOIN TGFFIN FIN ON PAR.CODPARC = FIN.CODPARC
    LEFT JOIN TGFPAR PAR2 ON PAR.CODPARCMATRIZ = PAR2.CODPARC
    LEFT JOIN TGFCAB CAB  ON FIN.NUNOTA = CAB.NUNOTA
    WHERE 
    FIN.RECDESP = 1 AND FIN.DHBAIXA IS NULL
    AND (CAB.STATUSNOTA = 'L' OR FIN.NUNOTA IS NULL)
    AND PAR.CLIENTE = 'S'
    GROUP BY
    COALESCE(PAR.CODPARCMATRIZ,PAR.CODPARC),
    COALESCE(PAR2.RAZAOSOCIAL,PAR.RAZAOSOCIAL),
    PAR2.ATIVO,PAR2.LIMCRED,PAR2.AD_DTVENCCAD
  
  )
  -- Agora fazemos o SELECT principal excluindo os registros que estão no SecondSelect
  SELECT
      COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC) AS CODPARCMATRIZ,
      COALESCE(PAR2.RAZAOSOCIAL, PAR.RAZAOSOCIAL) AS PARCEIRO_MATRIZ,
      PAR2.ATIVO,
      NVL(PAR2.LIMCRED, 0) AS LIMCRED,
      0 AS LIMCREDCONSUM,
      NVL(PAR2.LIMCRED, 0) - 0 AS LIMCREDISP,
      PAR2.AD_DTVENCCAD,
      CASE
          WHEN PAR2.AD_DTVENCCAD >= SYSDATE THEN 'Cadastro Não Vencido'
          WHEN PAR2.AD_DTVENCCAD < SYSDATE THEN 'Cadastro Vencido'
          ELSE 'Sem Data de Cadastro'
      END AS STATUS_CADASTRO
  FROM TGFPAR PAR
  LEFT JOIN TGFPAR PAR2 ON PAR.CODPARCMATRIZ = PAR2.CODPARC
  WHERE PAR.CLIENTE = 'S' AND COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC) <> 0
  AND COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC) NOT IN (
      SELECT CODPARCMATRIZ FROM SegundoSelect
  )
  )
  )
  WHERE LIMCREDCONSUM/nullif(LIMCRED,0) > 0.9 AND LIMCRED > 0.01
  GROUP BY
  CODPARCMATRIZ,
  RAZAOSOCIAL,
  ATIVO,
  LIMCRED,
  LIMCREDCONSUM,
  LIMCREDISP
  )
  )
  )
  GROUP BY 
  INTERVALO,GRUPO_LIMCREDISP
  ORDER BY GRUPO_LIMCREDISP DESC
</snk:query>

<snk:query var="dif_limite">
  SELECT
  DIF_LIMITE,
  VERIFICADOR,
  COUNT(CLIENTE) TOT_PARCEIRO,
  SUM(DIFLIM) DIFLIM
  FROM (
  
  SELECT
  CLIENTE,
  RAZAOSOCIAL,
  PERC,
  CASE
  WHEN PERC <= 20 THEN 'Até 20%'
  WHEN PERC > 20 AND PERC <= 40 THEN 'Entre 21% e 40%'
  WHEN PERC > 40 AND PERC <= 60 THEN 'Entre 41% e 60%'
  WHEN PERC > 60 AND PERC <= 80 THEN 'Entre 61% e 80%'
  WHEN PERC > 80 THEN 'Maior que 80%' END AS DIF_LIMITE,
  CASE
  WHEN PERC <= 20 THEN 1
  WHEN PERC > 20 AND PERC <= 40 THEN 2
  WHEN PERC > 40 AND PERC <= 60 THEN 3
  WHEN PERC > 60 AND PERC <= 80 THEN 4
  WHEN PERC > 80 THEN 5 END AS VERIFICADOR,
  DIFLIM
  FROM
  (
  SELECT
  CLIENTE,
  RAZAOSOCIAL,
  ROUND(LIMCALC/LIMVIGOR*100,2) PERC,
  DIFLIM
  
  FROM (
  SELECT
  CRED.CLIENTE, 
  PAR.RAZAOSOCIAL,
  (SELECT NVL(PAR.LIMCRED,0) FROM TGFPAR PAR WHERE PAR.CODPARC = CRED.CLIENTE) LIMVIGOR,
  (SELECT NVL(RISCOSATIS,0) + NVL(VLRBENS,0) + NVL(VLRCPR,0) + NVL(VLRFIANC,0) + NVL(VALOR,0) FROM
  (SELECT
  CLIENTE, 
  RISCOSATIS,
  (SELECT SUM(VLRBENS) FROM AD_BENS WHERE CLIENTE = CRED.CLIENTE)AS VLRBENS,
  (SELECT SUM(VLRCPR) FROM AD_CPR WHERE CLIENTE = CRED.CLIENTE)AS VLRCPR,
  (SELECT SUM(VLRFIANC) FROM AD_CARTFIANC WHERE CLIENTE = CRED.CLIENTE)AS VLRFIANC,
  (SELECT SUM((CASE WHEN STATUS = 'ABERTO' THEN NVL(VALOR,0) ELSE 0 END)) FROM AD_DUPLIC WHERE CLIENTE = CRED.CLIENTE)AS VALOR
  FROM AD_GESTCRED CRED)
  WHERE CLIENTE = CRED.CLIENTE) LIMCALC,
  (SELECT (NVL(RISCOSATIS,0) + NVL(VLRBENS,0) + NVL(VLRCPR,0) + NVL(VLRFIANC,0) + NVL(VALOR,0)) - NVL(LIMCRED,0)  FROM
  (SELECT
  CLIENTE, 
  RISCOSATIS,
  (SELECT LIMCRED FROM TGFPAR WHERE CODPARC = CRED.CLIENTE)AS LIMCRED,
  (SELECT SUM(VLRBENS) FROM AD_BENS WHERE CLIENTE = CRED.CLIENTE)AS VLRBENS,
  (SELECT SUM(VLRCPR) FROM AD_CPR WHERE CLIENTE = CRED.CLIENTE)AS VLRCPR,
  (SELECT SUM(VLRFIANC) FROM AD_CARTFIANC WHERE CLIENTE = CRED.CLIENTE)AS VLRFIANC,
  (SELECT SUM(VALOR) FROM AD_DUPLIC WHERE CLIENTE = CRED.CLIENTE)AS VALOR
  FROM AD_GESTCRED CRED)
  WHERE CLIENTE = CRED.CLIENTE) DIFLIM,
  
  
  RISCOSATIS,
  (SELECT SUM(VLRBENS) FROM AD_BENS WHERE CLIENTE = CRED.CLIENTE)AS VLRBENS,
  (SELECT SUM(VLRCPR) FROM AD_CPR WHERE CLIENTE = CRED.CLIENTE)AS VLRCPR,
  (SELECT SUM(VLRFIANC) FROM AD_CARTFIANC WHERE CLIENTE = CRED.CLIENTE)AS VLRFIANC,
  (SELECT SUM(VALOR) FROM AD_DUPLIC WHERE CLIENTE = CRED.CLIENTE)AS VALOR
  FROM AD_GESTCRED CRED
  INNER JOIN TGFPAR PAR ON CRED.CLIENTE = PAR.CODPARC)
  WHERE LIMCALC > 0 AND DIFLIM < 0
  
  )
  )
  GROUP BY
  DIF_LIMITE,
  VERIFICADOR
</snk:query>

<div class="container">
  <div class="top">
    <c:forEach items="${dias.rows}" var="row">
    <div class="cards-container">
          <div class="cards-title">Dias de Pontualidade Negativa</div>
          <div class="cards">
            <!-- 4 cards on the left -->
            <div class="card" onclick="abrir('1')" style="background-color: #CCFFCC;">
              <div class="value">${row.ate_5_DIAS}</div>
              <div class="description">Até 5 Dias</div>
            </div>
            <div class="card" onclick="abrir('2')" style="background-color: #66FF66;">
              <div class="value">${row.entre_5_E_10_DIAS}</div>
              <div class="description">Até 10 Dias</div>
            </div>
            <div class="card" onclick="abrir('3')" style="background-color: #339933;">
              <div class="value1">${row.entre_10_E_20_DIAS}</div>
              <div class="description1">Até 20 Dias</div>
            </div>            
            <div class="card" onclick="abrir('4')" style="background-color: #004D00;">
              <div class="value1">${row.Mais_20_DIAS}</div>
              <div class="description1">> 20 Dias</div>
            </div>
          </div>
        </div>
      </c:forEach>
  
      <c:forEach items="${meses.rows}" var="row">
        <div class="cards-container">
          <div class="cards-title">Vencimento Cadastro em Meses</div>
          <div class="cards">

            <!-- 4 cards on the right -->
            <div class="card" onclick="abrir1('1')"  style="background-color: #CCFFCC;">
              <div class="value">${row.A_vencer_ate_5_MES}</div>
              <div class="description">Vencer Até 5</div>
            </div>

            <div class="card" onclick="abrir1('2')" style="background-color: #66FF66;">
              <div class="value">${row.A_vencer_mais_5_MES}</div>
              <div class="description">Vencer + de 5</div>
            </div>

            <div class="card" onclick="abrir1('3')" style="background-color: #339933;">
              <div class="value1">${row.vencido_ate_6_MES}</div>
              <div class="description1">Vencido até 6</div>
            </div>

            <div class="card" onclick="abrir1('4')" style="background-color: #004D00;">
              <div class="value1">${row.vencido_mais_6_MES}</div>
              <div class="description1">Vencido + 6</div>
            </div>
            
          </div>
        </div>
      </c:forEach>      
      </div>
  
      <div class="bottom">
        <div class="chart">
          <canvas id="chartLeft"></canvas>
        </div>
        <div class="chart">
          <canvas id="chartRight"></canvas>
        </div>
      </div>
    </div>

  
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
      const ctxLeft = document.getElementById('chartLeft').getContext('2d');
      const parcLabels = [
            <c:forEach items="${noventa_perc.rows}" var="row">
                "${row.GRUPO_LIMCREDISP}-${row.INTERVALO}",
            </c:forEach>              
        ];
        const parcData = [
            <c:forEach items="${noventa_perc.rows}" var="row">
                "${row.AVG_LIMCREDISP}",
            </c:forEach>              
        ];

        // Define uma escala de 6 tons de verde do mais claro para o mais escuro
        const greenScaleBackground = [
            'rgba(204, 255, 204, 0.6)', // Verde claro
            'rgba(153, 255, 153, 0.6)',
            'rgba(102, 255, 102, 0.6)',
            'rgba(51, 204, 51, 0.6)',
            'rgba(0, 153, 0, 0.6)',
            'rgba(0, 102, 0, 0.6)' // Verde escuro
        ];

        const greenScaleBorder = [
            'rgba(204, 255, 204, 1)',
            'rgba(153, 255, 153, 1)',
            'rgba(102, 255, 102, 1)',
            'rgba(51, 204, 51, 1)',
            'rgba(0, 153, 0, 1)',
            'rgba(0, 102, 0, 1)'
        ];        
      
        const chartLeft = new Chart(ctxLeft, {
          type: 'bar',
          data: {
            labels: parcLabels,
            datasets: [{
              label: 'Vlr. Médio Consumido.',
              data: parcData,
              // Aplica a escala de cores alternando as cores de acordo com o índice
              backgroundColor: parcData.map((_, index) => greenScaleBackground[index % greenScaleBackground.length]),
              borderColor: parcData.map((_, index) => greenScaleBorder[index % greenScaleBorder.length]),
              borderWidth: 2,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              title: {
                display: true,
                text: 'Lim.Créd.Consumido > 90%',
                font: {
                  size: 20, // Aproximado de 1.2rem
                  weight: 'bold'
                },
                color: '#333', // Cor definida na classe
                padding: {
                  bottom: 10 // Aproximado de 0.5rem
                },
                align: 'center' // Centraliza o título
              }
            },
            onClick: function(evt, activeElements) {
              if (activeElements.length > 0) {
                  const index = activeElements[0].index;
                  const grupo = parcLabels[index].split('-')[0];
                  abrir2(grupo);
              }
            }
          }
        });


  
      const ctxRight = document.getElementById('chartRight').getContext('2d');

      const difLabels = [
            <c:forEach items="${dif_limite.rows}" var="row">
                "${row.VERIFICADOR}-${row.DIF_LIMITE}",
            </c:forEach>              
        ];

        const difData = [
            <c:forEach items="${dif_limite.rows}" var="row">
              "${row.TOT_PARCEIRO}",
            </c:forEach>              
        ];

        // Define uma escala de 6 tons de verde do mais claro para o mais escuro
        const greenScaleBackground1 = [
            'rgba(204, 255, 204, 0.6)', // Verde claro
            'rgba(153, 255, 153, 0.6)',
            'rgba(102, 255, 102, 0.6)',
            'rgba(51, 204, 51, 0.6)',
            'rgba(0, 153, 0, 0.6)' // Verde escuro
        ];

        const greenScaleBorder1 = [
            'rgba(204, 255, 204, 1)', // Verde claro
            'rgba(153, 255, 153, 1)',
            'rgba(102, 255, 102, 1)',
            'rgba(51, 204, 51, 1)',
            'rgba(0, 153, 0, 0.6)' // Verde escuro
        ];      


      const chartRight = new Chart(ctxRight, {
        type: 'bar',
        data: {
          labels: difLabels,
          datasets: [{
            label: 'Qtd. Parceiros',
            data: difData,
              // Aplica a escala de cores alternando as cores de acordo com o índice
              backgroundColor: parcData.map((_, index) => greenScaleBackground1[index % greenScaleBackground1.length]),
              borderColor: parcData.map((_, index) => greenScaleBorder1[index % greenScaleBorder1.length]),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true, // Mostra o título
              text: 'Diferença de Limite',
                font: {
                  size: 20, // Aproximado de 1.2rem
                  weight: 'bold'
                },
                color: '#333', // Cor definida na classe
                padding: {
                  bottom: 10 // Aproximado de 0.5rem
                },
                align: 'center' // Centraliza o título
              }
            },
            onClick: function(evt, activeElements) {
              if (activeElements.length > 0) {
                  const index = activeElements[0].index;
                  const grupo = difLabels[index].split('-')[0];
                  abrir3(grupo);
              }
            }
          }
        });

        function abrir(grupo) {
            var params = { 
                'A_GRUPO' : parseInt(grupo)
             };
            var level = 'lvl_s0u8z5';
            openLevel(level, params);
        }    

        function abrir1(grupo) {
            var params = { 
                'A_GRUPO' : parseInt(grupo)
             };
            var level = 'lvl_tbtx32';
            openLevel(level, params);
        }    

        function abrir2(grupo) {
            var params = { 
                'A_GRUPO' : parseInt(grupo)
             };
            var level = 'lvl_tzi749';
            openLevel(level, params);
        }   


        function abrir3(grupo) {
            var params = { 
                'A_GRUPO' : parseInt(grupo)
             };
            var level = 'lvl_vfneqh';
            openLevel(level, params);
        }   

    </script>
  </body>
  </html>