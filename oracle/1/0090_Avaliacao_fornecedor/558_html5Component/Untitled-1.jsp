<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false"%>
<!DOCTYPE html>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>

<html lang="pt-br">
  <!DOCTYPE html>
  <html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Dashboard Avaliações</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background-color: #f9f9f9;
      }
  
      .dashboard {
        display: flex;
        flex-direction: column;
        padding: 10px;
        gap: 10px;
      }
  
      .top-section {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
  
      .card {
        background: white;
        padding: 15px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        flex: 1 1 45%;
        box-sizing: border-box;
        min-width: 300px;
      }
  
      .tabela-scroll {
        max-height: 250px;
        overflow-y: auto;
      }
  
      table {
        width: 100%;
        border-collapse: collapse;
      }
  
      th, td {
        padding: 8px;
        text-align: left;
        border-bottom: 1px solid #eee;
      }
  
      th {
        background-color: #f0f0f0;
      }
  
      .bottom-section {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
  
      .chart-card {
        background: white;
        padding: 15px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        flex: 1 1 100%;
        min-width: 300px;
      }
  
      .chart-container {
        position: relative;
        height: 300px;
      }
  
      h3 {
        margin-top: 0;
        font-size: 1.1rem;
      }
  
      @media (max-width: 768px) {
        .top-section,
        .bottom-section {
          flex-direction: column;
        }
  
        .card,
        .chart-card {
          width: 100%;
        }
      }
    </style>
     <snk:load/>
  </head>
  <body>
 
<snk:query var="fornecedor" dataSource="MGEDS">
  SELECT  
  V.CODFORN,
  PAR.NOMEPARC,

  (SELECT SUM(CAB2.VLRNOTA)
   FROM TGFCAB CAB2
   INNER JOIN TGFTOP TOP2 ON CAB2.CODTIPOPER = TOP2.CODTIPOPER AND CAB2.DHTIPOPER = TOP2.DHALTER
   WHERE TOP2.TIPMOV = 'C' 
     AND CAB2.STATUSNOTA = 'L' 
     AND CAB2.VLRNOTA > 0 
     AND CAB2.CODPARC = V.CODFORN
     AND CAB2.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
     AND (CAB2.CODPARC=:P_CODPARC OR :P_CODPARC IS NULL)
  ) AS TOTAL_FORNECEDOR,

  (SELECT COUNT(CAB2.NUNOTA)
   FROM TGFCAB CAB2
   INNER JOIN TGFTOP TOP2 ON CAB2.CODTIPOPER = TOP2.CODTIPOPER AND CAB2.DHTIPOPER = TOP2.DHALTER
   WHERE TOP2.TIPMOV = 'C' 
     AND CAB2.STATUSNOTA = 'L' 
     AND CAB2.VLRNOTA > 0 
     AND CAB2.CODPARC = V.CODFORN
     AND CAB2.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
     AND (CAB2.CODPARC=:P_CODPARC OR :P_CODPARC IS NULL)
  ) AS TOTAL_COMPRAS

FROM AD_AVLFORNSATIS V
INNER JOIN TGFPAR PAR ON V.CODFORN = PAR.CODPARC


WHERE V.REFERENCIA BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND EXISTS (
    SELECT 1
    FROM TGFCAB CAB
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = TOP.DHALTER
    WHERE TOP.TIPMOV = 'C'
      AND CAB.STATUSNOTA = 'L'
      AND CAB.VLRNOTA > 0
      AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
      AND CAB.CODPARC = V.CODFORN
      AND (CAB.CODPARC=:P_CODPARC OR :P_CODPARC IS NULL)
)

GROUP BY 

  V.CODFORN,
  PAR.NOMEPARC

</snk:query>

<snk:query var="avaliacao" dataSource="MGEDS">
SELECT V.CODFORN, PAR.RAZAOSOCIAL, V.REFERENCIA, V.MEDIA
  FROM AD_AVLFORNSATIS V, TGFPAR PAR
 WHERE V.CODFORN = PAR.CODPARC
   AND V.REFERENCIA BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
   AND V.CODFORN=:A_CODPARC
 ORDER BY V.REFERENCIA
</snk:query>



<snk:query var="criterio" dataSource="MGEDS">

SELECT 
  V.CODFORN, 
  V.REFERENCIA, 
  V.CONDPAG, 
  V.CONDEMB, 
  V.ENVLAUDO, 
  V.PONTENTREGA, 
  V.CONDPROD, 
  V.TEMPCOT
FROM AD_AVLFORNSATIS V
JOIN TGFPAR PAR ON V.CODFORN = PAR.CODPARC
WHERE V.REFERENCIA BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN

  AND V.CODFORN=:A_CODPARC

GROUP BY

V.CODFORN, 
V.REFERENCIA, 
V.CONDPAG, 
V.CONDEMB, 
V.ENVLAUDO, 
V.PONTENTREGA, 
V.CONDPROD, 
V.TEMPCOT

ORDER BY V.REFERENCIA
</snk:query>

<div class="dashboard">
  <div class="top-section">
    <div class="card">
      <h3>Fornecedores</h3>
      <div class="tabela-scroll">
        <table>
          <thead>
            <tr>
              <th>Cód.Parc</th>
              <th>Nome</th>
              <th>Valor de Compras</th>
              <th>Total de Compras</th>
            </tr>
          </thead>
          <tbody>
            <c:forEach var="row" items="${fornecedor.rows}">
              <tr>
                <td onclick="atualizarAvaliacao('${row.CODFORN}')">${row.CODFORN}</td>
                <td>${row.NOMEPARC}</td>
                <td><fmt:formatNumber value="${row.TOTAL_FORNECEDOR}" type="currency" /></td>
                <td>${row.TOTAL_COMPRAS}</td>
              </tr>
            </c:forEach>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>Avaliações do Mês</h3>
      <div class="chart-container">
        <canvas id="barChart"></canvas>
      </div>
    </div>
  </div>

  <div class="bottom-section">
    <div class="chart-card">
      <h3>Avaliações por Critério</h3>
      <div class="chart-container">
        <canvas id="lineChart"></canvas>
      </div>
    </div>
  </div>
</div>

<script>
        // Função para atualizar a avaliação com base no fornecedor selecionado
        
        function atualizarAvaliacao(CODFORN) {
            const params1 = {'A_CODPARC': CODFORN};
            refreshDetails('html5_h962yy', params1); 
            
        }

</script>


<script>
  const barCtx = document.getElementById('barChart').getContext('2d');

  const barLabels = [];
  const barData = [];
  const barColors = [];

  <c:forEach var="row" items="${avaliacao.rows}">
    barLabels.push('<fmt:formatDate value="${row.REFERENCIA}" pattern="MM/yyyy"/>');
    barData.push(${row.MEDIA});

   
    <c:choose>
      <c:when test="${row.MEDIA <= 3}">
        barColors.push('#F44336'); // vermelho
      </c:when>
      <c:when test="${row.MEDIA <= 4}">
        barColors.push('#FFEB3B'); // amarelo
      </c:when>
      <c:otherwise>
        barColors.push('#4CAF50'); // verde
      </c:otherwise>
    </c:choose>
  </c:forEach>

  const barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [{
        label: 'Média de Avaliação',
        data: barData,
        backgroundColor: barColors,
        barPercentage: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 10
        }
      },
      plugins: {
        datalabels: {
          anchor: 'end',
          align: 'top',
          color: '#000',
          font: {
            weight: 'bold',
            size: 12
          },
          formatter: function(value) {
            return value.toFixed(1);
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
</script>


<script>
  const lineCtx = document.getElementById('lineChart').getContext('2d');

  const lineLabels = [];
  const condPag = [];
  const probEmb = [];
  const envLaudo = [];
  const pontEntrega = [];
  const qldProd = [];
  const tempoRespCotac = [];

 <c:forEach var="row" items="${criterio.rows}">
  lineLabels.push('<fmt:formatDate value="${row.REFERENCIA}" pattern="MM/yyyy" />');
  condPag.push(${row.CONDPAG});
  probEmb.push(${row.CONDEMB});
  envLaudo.push(${row.ENVLAUDO});
  pontEntrega.push(${row.PONTENTREGA});
  qldProd.push(${row.CONDPROD});
  tempoRespCotac.push(${row.TEMPCOT});
</c:forEach>
  const lineChart = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: lineLabels,
      datasets: [
        {
          label: 'Cond. Pagamento',
          data: condPag,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          tension: 0.4
        },
        {
          label: 'Problemas Embalagem',
          data: probEmb,
          borderColor: '#FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.2)',
          tension: 0.4
        },
        {
          label: 'Envio Laudo',
          data: envLaudo,
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.2)',
          tension: 0.4
        },
        {
          label: 'Pontualidade Entrega',
          data: pontEntrega,
          borderColor: '#9C27B0',
          backgroundColor: 'rgba(156, 39, 176, 0.2)',
          tension: 0.4
        },
        {
          label: 'Qualidade Produto',
          data: qldProd,
          borderColor: '#E91E63',
          backgroundColor: 'rgba(233, 30, 99, 0.2)',
          tension: 0.4
        },
        {
          label: 'Tempo Resp. Cotação',
          data: tempoRespCotac,
          borderColor: '#795548',
          backgroundColor: 'rgba(121, 85, 72, 0.2)',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 10
        }
      },
      plugins: {
        datalabels: {
          display: false
        },
        legend: {
          position: 'top'
        },
        title: {
          display: false
        }
      }
    }
  });
</script>



</body>
</html>