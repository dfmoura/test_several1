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
  select
    codgrupoprod, vlrtot
  from(
    select
      pro.codgrupoprod,
      sum(ite.vlrtot) as vlrtot
    from tgfite ite
    inner join tgfpro pro on ite.codprod = pro.codprod
    group by pro.codgrupoprod
    order by 2 desc
  ) where rownum < 10
</snk:query> 

<div class="container">
  <canvas id="barChart"></canvas>
</div>

<script>
function abrir(grupo) {
  var params = { 'A_CODGRUPOPROD': grupo };
  var level = 'lvl_a0a22l';
  openLevel(level, params);
}

document.addEventListener('DOMContentLoaded', function() {
  // Obtenha os dados da consulta JSP
  const labels = [
    <c:forEach var="row" items="${grupo.rows}">
      "${row.codgrupoprod}",
    </c:forEach>
  ];

  const data = [
    <c:forEach var="row" items="${grupo.rows}">
      ${row.vlrtot},
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
          abrir(grupo);
        }
      }
    }
  });
});
</script>
</body>
</html>
