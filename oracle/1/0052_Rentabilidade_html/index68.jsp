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
  <title>Tela com 2 Seções</title>
  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      display: flex;
      justify-content: center;
      padding: 20px;
      background-color: #f9f9f9;
    }
    .section {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      background-color: #fff;
      margin: 0 10px;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 600px; /* Altura mínima aumentada */
      position: relative; /* Adicionado para posicionamento do overlay */      
    }
    .title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .chart-container, .table-container {
      width: 100%;
      flex-grow: 1;
      /*display: flex;*/
      justify-content: center;
      align-items: center;
    }
    .chart-container canvas {
      max-width: 100%;
    }
    .table-container table {
      width: 100%;
      border-collapse: collapse;
    }
    .table-container th, .table-container td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: center;
    }
    .table-container th {
      background-color: #f2f2f2;
    }
    .overlay {
      position: absolute;
      top: 55%;
      left: 65%;
      transform: translate(-50%, -50%);
      font-size: 34px;
      font-weight: bold;
      pointer-events: none; /* Permite interação com o gráfico */
    }    
  </style>

<snk:load/>


</head>

<body>

  <snk:query var="fat_ger">

  SELECT
  SUM(TOTALLIQ) AS VLRFAT
  FROM(
  
  SELECT
  CAB.CODEMP,
  CAB.NUNOTA,
  (F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD)) AS TIPOPROD,
  ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO,
  VEN.CODGER,
  SUM(ITE.VLRDESC) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRDESC,
  SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE 0 END) AS VLRDEV,
  SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) AS TOTALLIQ,
  SUM(ITE.VLRIPI) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRIPI,
  SUM(ITE.VLRSUBST) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRSUBST,
  SUM(ITE.VLRICMS) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRICMS,
  NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRPIS,
  NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRCOFINS,
  SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS CUSMEDSICM_TOT,
  SUM((FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS HL,
  (SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
      - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0)
      - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0)
      - SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
  ) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS MARGEMNON,
          (
  (SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
      - (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6)
      - (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7)
      - SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
  ) * 100 / NULLIF(SUM(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC),0)
  ) PERCMARGEM,
  CAB.TIPMOV
  FROM TGFCAB CAB
  INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
  INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
  INNER JOIN TGFNAT NAT ON CAB.CODNAT = NAT.CODNAT
  INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
  INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
  INNER JOIN TGFTPV TPV ON CAB.CODTIPVENDA = TPV.CODTIPVENDA AND TPV.DHALTER = CAB.DHTIPVENDA
  INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND

  INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
  LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND C.DTATUAL <= CAB.DTNEG)
  LEFT JOIN TGFPAR PARM ON PARM.CODPARC = PAR.CODPARCMATRIZ
  INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
  WHERE TOP.GOLSINAL = -1
  AND (CAB.DTNEG BETWEEN :P_PERIODO.INI and :P_PERIODO.FIN)
  AND TOP.TIPMOV IN ('V', 'D')
  AND TOP.ATIVO = 'S'

  AND CAB.CODNAT IN (:P_NATUREZA)
  AND CAB.CODCENCUS IN (:P_CR)
  AND CAB.CODVEND IN (:P_VENDEDOR)
  AND VEN.AD_ROTA IN (:P_ROTA)

  GROUP BY CAB.CODEMP, CAB.NUNOTA, CAB.TIPMOV,(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD)),ITE.CODPROD||'-'||PRO.DESCRPROD,VEN.CODGER
  )
  WHERE (CODGER = :A_GERENTE OR :A_GERENTE IS NULL)
      


  </snk:query>   

  <snk:query var="fat_tipo">  
    SELECT
    VEN.AD_SUPERVISOR,
    VEN1.APELIDO AS SUPERVISOR,
    ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
    INNER JOIN TGFVEN VEN1 ON VEN.AD_SUPERVISOR = VEN1.CODVEND
    INNER JOIN TGFVEN VEN2 ON VEN.CODGER = VEN2.CODVEND
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    AND VEN.CODGER = :A_GERENTE
    AND CAB.CODEMP IN (:P_EMPRESA)
    AND CAB.CODNAT IN (:P_NATUREZA)
    AND CAB.CODCENCUS IN (:P_CR)
    AND CAB.CODVEND IN (:P_VENDEDOR)
    AND VEN.AD_ROTA IN (:P_ROTA)
    GROUP BY VEN.AD_SUPERVISOR,VEN1.APELIDO
    ORDER BY 3 DESC
</snk:query>    


<div class="section">
  <div class="title">Faturamento por Supervisor</div>
  <div class="chart-container">
    <canvas id="doughnutChart"></canvas>
    <c:forEach items="${fat_ger.rows}" var="row">                    
        <div class="overlay"><fmt:formatNumber value="${row.VLRFAT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
    </c:forEach>    
  </div>
</div>

<div class="section">
  <div class="title">Coloque o título</div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Coluna 1</th>
          <th>Coluna 2</th>
          <th>Coluna 3</th>
          <th>Coluna 4</th>
          <th>Coluna 5</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Dados 1</td>
          <td>Dados 2</td>
          <td>Dados 3</td>
          <td>Dados 4</td>
          <td>Dados 5</td>
        </tr>
        <tr>
          <td>Dados 6</td>
          <td>Dados 7</td>
          <td>Dados 8</td>
          <td>Dados 9</td>
          <td>Dados 10</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<script>
  document.addEventListener('DOMContentLoaded', function() {
  var ctx = document.getElementById('doughnutChart').getContext('2d');

  var supervisorLabels = [
            <c:forEach items="${fat_tipo.rows}" var="row">
                "${row.AD_SUPERVISOR}-${row.SUPERVISOR}",
            </c:forEach>              
        ];

  var supervisorData = [
      <c:forEach items="${fat_tipo.rows}" var="row">
          ${row.VLRFAT},
      </c:forEach>        
  ];


  var doughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: supervisorLabels,
      datasets: [{
        label: 'Faturamento',
        data: supervisorData,
        backgroundColor: [
        'rgba(255, 99, 132, 0.4)',
        'rgba(54, 162, 235, 0.4)',
        'rgba(255, 206, 86, 0.4)',
        'rgba(75, 192, 192, 0.4)',
        'rgba(153, 102, 255, 0.4)',
        'rgba(255, 159, 64, 0.4)'            
    ],
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '50%',
      plugins: {
        tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        let value = context.raw || 0;
                        let total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                        let percentage = ((value / total) * 100).toFixed(2);
                        let formattedValue = new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
                        return label + ': ' + formattedValue;
                    }
                }
            },        
        legend: {
            position: 'left',
            align: 'center', // Alinhamento vertical da legenda
        }
      }
    }
  });
});  
</script>

</body>
</html>
