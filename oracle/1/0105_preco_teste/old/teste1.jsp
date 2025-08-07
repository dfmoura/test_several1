<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resumo Material</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> 
  
  <style>

  </style>
  <snk:load/>
</head>
<body>

  <snk:query var="tipo">
  SELECT 
  DISTINCT
  SUM(CAB.VLRNOTA) AS VLR,
  COUNT(CAB.NUNOTA) AS QTD,
  VW.STATUS AS TIPO,
  CASE WHEN VW.STATUS =  'A'    THEN 1
       WHEN VW.STATUS =  'ANF'  THEN 2
       WHEN VW.STATUS =  'C'    THEN 3
       WHEN VW.STATUS =  'PE'   THEN 4 
       WHEN VW.STATUS =  'R'    THEN 5
       WHEN VW.STATUS =  'MA'   THEN 6 
       WHEN VW.STATUS =  'PS'   THEN 7
       WHEN VW.STATUS =  'EE'   THEN 8
       WHEN VW.STATUS =  'PFP'  THEN 9
  END AS CODHIST,
  CASE WHEN VW.STATUS ='A'   THEN  'Pedido Aprovado'
       WHEN VW.STATUS ='ANF' THEN  'Aguardando NF'
       WHEN VW.STATUS ='C'   THEN  'Pedido Cancelado'
       WHEN VW.STATUS ='PE'  THEN  'Progamado Entrega'
       WHEN VW.STATUS ='R'   THEN  'Reprovado'
       WHEN VW.STATUS ='MA'  THEN  'Mercadoria a Caminho'
       WHEN VW.STATUS ='PS'  THEN  'Pedido em Separação'
       WHEN VW.STATUS ='EE'  THEN  'Pedido em Analise'
       WHEN VW.STATUS ='PFP' THEN  'Faturado Parcial'
  END AS STATUS,
  -- Percentual de participação do valor
  ROUND(
      (SUM(CAB.VLRNOTA) * 100.0 / SUM(SUM(CAB.VLRNOTA)) OVER()), 2
  ) AS PCT_VLR,
  -- Percentual de participação da quantidade
  ROUND(
      (COUNT(CAB.NUNOTA) * 100.0 / SUM(COUNT(CAB.NUNOTA)) OVER()), 2
  ) AS PCT_QTD
  
  FROM  
  AD_VGFSTATUSA2W VW 
  LEFT JOIN TGFCAB CAB ON VW.NUNOTA = CAB.NUNOTA
  
  WHERE CAB.PENDENTE = 'S'
  AND CAB.TIPMOV = 'P'
  AND CAB.AD_DTENTREGAEFETIVA IS NULL 
  
  GROUP BY VW.STATUS
  ORDER BY CODHIST    

  </snk:query>


  <div class="column">
    <div class="card">
        <h2>Texto para colocar aqui</h2>
        <div class="chart-container">
            <canvas id="doughnutChart"></canvas>                      
        </div>
    </div>
</div>



<script>


// Obtendo os dados da query JSP para o gráfico de rosca - TPPROD
const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

var custoTipoLabel = [];
var custoTipoData = [];
<c:forEach items="${tipo.rows}" var="row">
    custoTipoLabel.push('${row.CODHIST} - ${row.STATUS}');
    custoTipoData.push(parseFloat(${row.VLR}));
</c:forEach>

// Dados fictícios para o gráfico de rosca
const doughnutChart = new Chart(ctxDoughnut, {
    type: 'doughnut',
    data: {
        labels: custoTipoLabel,
        datasets: [{
            label: 'Custo',
            data: custoTipoData,
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)','rgba(54, 162, 235, 0.2)','rgba(255, 206, 86, 0.2)','rgba(75, 192, 192, 0.2)','rgba(153, 102, 255, 0.2)','rgba(255, 159, 64, 0.2)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)','rgba(54, 162, 235, 1)','rgba(255, 206, 86, 1)','rgba(75, 192, 192, 1)','rgba(153, 102, 255, 1)','rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'left',
                align: 'center', // Alinhamento vertical da legenda
            }
        },
        onClick: function(event, elements) {
            if (elements.length > 0) {
                var index = elements[0].index;
                var label = custoTipoLabel[index].split('-')[0];
                var label1 = custoTipoLabel[index].split('-')[1];
                abrir_tpprod(label,label1);
                
            }
        }
    }
});

</script>
  

</body>
</html>