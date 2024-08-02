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
  <%
  // Código para depuração
  String codGrupoProd = request.getParameter("A_CODGRUPOPROD");
  if (codGrupoProd == null || codGrupoProd.isEmpty()) {
    out.println("Nenhum código de grupo de produtos foi passado.");
  } else {
    out.println("Código do Grupo de Produtos: " + codGrupoProd);
  }
%>



<snk:query var="produto">  
  
select
codprod,vlrtot
from(
with tes as (SELECT 1 AS COD,TO_NUMBER(REPLACE(TO_CHAR(:A_CODGRUPOPROD),'"',' ')) AS TEST FROM DUAL)
select
1 AS COD,
ite.codprod,
sum(ite.vlrtot) as vlrtot
from tgfite ite
inner join tgfpro pro on ite.codprod = pro.codprod
inner join tes on 1 = tes.cod
where pro.codgrupoprod = tes.TEST
group by ite.codprod
order by 3 desc
)
where rownum < 6
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
