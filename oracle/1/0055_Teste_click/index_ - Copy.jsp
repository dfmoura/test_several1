
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>

<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard</title>
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  /* Adicione seus estilos aqui */
</style>
<snk:load/>
</head>
<body>
<snk:query var="grupo">  
  SELECT
  GERENTE,SUM(TOTALLIQ)VLRFAT
  FROM(
  
  SELECT
  CAB.CODEMP,
  CAB.NUNOTA,
  (F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD)) AS TIPOPROD,
  ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO,
  VEN.CODGER||'-'||VENG.APELIDO AS GERENTE,
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
  LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
  LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
  INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
  LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND C.DTATUAL <= CAB.DTNEG)
  LEFT JOIN TGFPAR PARM ON PARM.CODPARC = PAR.CODPARCMATRIZ
  INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
  WHERE TOP.GOLSINAL = -1
  AND (CAB.DTNEG BETWEEN :P_PERIODO.INI and :P_PERIODO.FIN)
  AND TOP.TIPMOV IN ('V', 'D')
  AND TOP.ATIVO = 'S'

  
  GROUP BY CAB.CODEMP, CAB.NUNOTA, 
  CAB.TIPMOV,(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD)),
  ITE.CODPROD||'-'||PRO.DESCRPROD,
  VEN.CODGER||'-'||VENG.APELIDO
  )
  WHERE (TIPOPROD = :A_TPPROD OR :A_TPPROD IS NULL)
  GROUP BY GERENTE
  ORDER BY 2 DESC
</snk:query> 

<div class="container">
  <canvas id="barChart"></canvas>
</div>

<script>


function abrir(grupo) {
  grupo = encodeURIComponent(grupo);
  var params = { 'A_GERENTE': parseInt(grupo) };
  var level = 'lvl_etp2t7';
  openLevel(level, params);
}


document.addEventListener('DOMContentLoaded', function() {
  // Obtenha os dados da consulta JSP
  const labels = [
    <c:forEach var="row" items="${grupo.rows}">
      "${row.GERENTE}",
    </c:forEach>
  ];

  const data = [
    <c:forEach var="row" items="${grupo.rows}">
      ${row.VLRFAT},
    </c:forEach>
  ];

  // Configuração do gráfico de barras
  const ctx = document.getElementById('barChart').getContext('2d');
  const barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Valor Total',
        data: data,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      },
      onClick: function(evt, activeElements) {
        if (activeElements.length > 0) {
          const index = activeElements[0].index;
          const grupo = labels[index];
          grupo = grupo.split('-')[0];
          abrir(grupo);
        }
      }
    }
  });
});
</script>
</body>
</html>