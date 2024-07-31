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
<title>Dashboard</title>
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  /* Adicione seus estilos aqui */
</style>
<snk:load/>
</head>
<body>
<snk:query var="produto">  
  select
  codprod,vlrtot
  from(
  select
  ite.codprod,
  sum(ite.vlrtot) as vlrtot
  from tgfite ite
  inner join tgfpro pro on ite.codprod = pro.codprod
  where pro.codgrupoprod = :A_CODGRUPOPROD
  group by ite.codprod
  order by 2 desc
  )where rownum < 15
</snk:query> 

<div class="container">
  <canvas id="barChart"></canvas>
</div>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Obtenha os dados da consulta JSP
    const labels = [
      <c:forEach var="row" items="${produto.rows}">
        "${row.codprod}",
      </c:forEach>
    ];

    const data = [
      <c:forEach var="row" items="${produto.rows}">
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
        }
      }
    });
  });
</script>
</body>
</html>
