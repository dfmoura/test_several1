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
        font-size: 1.2rem;
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
    </style>
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
  ABS(AVG(DIAS_EM_ATRASO)) DIAS_EM_ATRASO,
  AVG(VLRDESDOB) VLRDESDOB,
  AVG(VLRBAIXA) VLRBAIXA
  FROM (
  SELECT
  PAR.CODPARCMATRIZ,
  PAR.RAZAOSOCIAL,
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
COUNT(CASE WHEN MESES <= 3 AND STATUS_CADASTRO = 'Casdastro Não Vencido' THEN MESES END) AS A_vencer_ate_3_MES,
COUNT(CASE WHEN MESES > 3 AND STATUS_CADASTRO = 'Casdastro Não Vencido' THEN MESES END) AS A_vencer_mais_3_MES,
COUNT(CASE WHEN MESES <= 6 AND STATUS_CADASTRO = 'Cadastro Vencido' THEN MESES END) vencido_ate_6_MES,
COUNT(CASE WHEN MESES > 6 AND STATUS_CADASTRO = 'Cadastro Vencido' THEN MESES END) AS vencido_mais_6_MES
FROM (
SELECT
CODPARC,
RAZAOSOCIAL,
AD_DTVENCCAD,
CASE
WHEN AD_DTVENCCAD >= SYSDATE THEN 'Casdastro Não Vencido'
WHEN AD_DTVENCCAD < SYSDATE THEN 'Cadastro Vencido' END AS STATUS_CADASTRO,
ABS(AD_DTVENCCAD - SYSDATE) AS DIAS,
ABS(MONTHS_BETWEEN(SYSDATE, AD_DTVENCCAD)) AS MESES
FROM TGFPAR 
WHERE AD_DTVENCCAD IS NOT NULL AND CODPARC > 0)
</snk:query>

<snk:query var="noventa_perc">
select 
SUBSTR(CODPARCMATRIZ||'-'||RAZAOSOCIAL,1,12) PARCEIRO,
LIMCREDISP
from (
SELECT
CODPARCMATRIZ,
RAZAOSOCIAL,
ATIVO,
LIMCRED,
LIMCREDCONSUM,
LIMCREDISP,
LIMCREDCONSUM/nullif(LIMCRED,0) perc
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
WHERE LIMCREDCONSUM/nullif(LIMCRED,0) > 0.9
GROUP BY
CODPARCMATRIZ,
RAZAOSOCIAL,
ATIVO,
LIMCRED,
LIMCREDCONSUM,
LIMCREDISP
)
ORDER BY LIMCREDISP DESC
</snk:query>

<div class="container">
  <div class="top">
    <c:forEach items="${dias.rows}" var="row">
    <div class="cards-container">
          <div class="cards-title">Dias de Pontualidade Negativa</div>
          <div class="cards">
            <!-- 4 cards on the left -->
            <div class="card">
              <div class="value">${row.ate_5_DIAS}</div>
              <div class="description">Até 5 Dias</div>
            </div>
            <div class="card">
              <div class="value">${row.entre_5_E_10_DIAS}</div>
              <div class="description">Até 10 Dias</div>
            </div>
            <div class="card">
              <div class="value">${row.entre_10_E_20_DIAS}</div>
              <div class="description">Até 20 Dias</div>
            </div>
            <div class="card">
              <div class="value">${row.Mais_20_DIAS}</div>
              <div class="description">> 20 Dias</div>
            </div>
          </div>
        </div>
      </c:forEach>
  
      <c:forEach items="${meses.rows}" var="row">
        <div class="cards-container">
          <div class="cards-title">Vencimento Cadastro em Meses</div>
          <div class="cards">
            <!-- 4 cards on the right -->
            <div class="card">
              <div class="value">${row.A_vencer_ate_3_MES}</div>
              <div class="description">Vencer Até 3</div>
            </div>
            <div class="card">
              <div class="value">${row.A_vencer_mais_3_MES}</div>
              <div class="description">Vencer + de 3</div>
            </div>
            <div class="card">
              <div class="value">${row.vencido_ate_6_MES}</div>
              <div class="description">Vencido até 6</div>
            </div>
            <div class="card">
              <div class="value">${row.vencido_mais_6_MES}</div>
              <div class="description">Vencido + 6</div>
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
                "${row.PARCEIRO}",
            </c:forEach>              
        ];


        const parcData = [
            <c:forEach items="${noventa_perc.rows}" var="row">
                "${row.LIMCREDISP}",
            </c:forEach>              
        ];
      
      
      
      const chartLeft = new Chart(ctxLeft, {
        type: 'bar',
        data: {
          labels: parcLabels,
          datasets: [{
            label: 'Vlr. Disp.',
            data: parcData,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
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
              text: 'Lim.Créd.Consumido > 90%' // Título do gráfico
            }
          }
          
        }
      });
  
      const ctxRight = document.getElementById('chartRight').getContext('2d');
      const chartRight = new Chart(ctxRight, {
        type: 'bar',
        data: {
          labels: ['Parc. A', 'Parc. B', 'Parc. C', 'Parc. D', 'Parc. E'],
          datasets: [{
            label: 'Dataset Right',
            data: [5, 9, 2, 8, 7],
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
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
              text: 'Diferença de Limite' // Título do gráfico
            }
          }
        }
      });
    </script>
  </body>
  </html>