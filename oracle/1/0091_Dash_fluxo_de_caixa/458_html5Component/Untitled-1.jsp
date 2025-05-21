<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>

<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gráfico de Vendas Mensais</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <snk:load/>
</head>
<body>

    <snk:query var="valoresnatmes">

      SELECT
      TOTAL_PROVISAO_RECEITA,
      TOTAL_REAL_BAIXA_RECEITA,
      TOTAL_PROVISAO_DESPESA,
      TOTAL_REAL_BAIXA_DESPESA,
      (CASE
          WHEN MES = '01' THEN 'JANEIRO'
          WHEN MES = '02' THEN 'FEVEREIRO'
          WHEN MES = '03' THEN 'MARÇO'
          WHEN MES = '04' THEN 'ABRIL'
          WHEN MES = '05' THEN 'MAIO'
          WHEN MES = '06' THEN 'JUNHO'
          WHEN MES = '07' THEN 'JULHO'
          WHEN MES = '08' THEN 'AGOSTO'
          WHEN MES = '09' THEN 'SETEMBRO'
          WHEN MES = '10' THEN 'OUTUBRO'
          WHEN MES = '11' THEN 'NOVEMBRO'
          WHEN MES = '12' THEN 'DEZEMBRO'
      END) AS MES
  FROM        
  (
      SELECT
          TO_CHAR(FIN.DTVENC, 'MM') AS MES,
          SUM(CASE WHEN FIN.PROVISAO = 'N' AND FIN.RECDESP = 1 THEN VFIN.VLRLIQUIDO ELSE 0 END) AS TOTAL_PROVISAO_RECEITA,
          
          SUM(CASE WHEN FIN.PROVISAO = 'N'AND FIN.DHBAIXA IS NOT NULL AND FIN.RECDESP = 1 AND EXISTS (SELECT 1 
          FROM TSICTA, TGFMBC 
          WHERE TGFMBC.NUBCO = FIN.NUBCO 
          AND TSICTA.CODCTABCOINT = TGFMBC.CODCTABCOINT
          AND TSICTA.CODCTABCOINT <> 0) THEN FIN.VLRBAIXA  ELSE 0 END) AS TOTAL_REAL_BAIXA_RECEITA,
          
         SUM(CASE WHEN FIN.PROVISAO = 'N' AND FIN.RECDESP = -1 THEN VFIN.VLRLIQUIDO ELSE 0 END) AS TOTAL_PROVISAO_DESPESA,
         
          SUM(CASE WHEN FIN.PROVISAO = 'N'AND FIN.DHBAIXA IS NOT NULL AND FIN.RECDESP = -1 AND EXISTS (SELECT 1 
          FROM TSICTA, TGFMBC 
          WHERE TGFMBC.NUBCO = FIN.NUBCO 
          AND TSICTA.CODCTABCOINT = TGFMBC.CODCTABCOINT
          AND TSICTA.CODCTABCOINT <> 0) THEN FIN.VLRBAIXA  ELSE 0 END) AS TOTAL_REAL_BAIXA_DESPESA
  
      FROM TGFFIN FIN
      LEFT JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
      INNER JOIN VGFFIN VFIN ON FIN.NUFIN = VFIN.NUFIN
      LEFT JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
      WHERE FIN.DTVENC BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
      
      AND FIN.CODNAT = :A_CODNAT
      GROUP BY 
          TO_CHAR(FIN.DTVENC, 'MM')
      ORDER BY
          TO_CHAR(FIN.DTVENC, 'MM')
  )
  
    </snk:query>

  <div>
    <canvas id="myChart"></canvas>
  </div>
    
  <script>

function abrir_nivel(){
        var params = '';
        var level = 'lvl_azhltjj';
        openLevel(level, params);
    }

    function abrir_nivel2(){
        var params = '';
        var level = 'lvl_a0pnrmd';
        openLevel(level, params);
    }

    function abrir_nivel3(){
        var params = '';
        var level = 'lvl_a0ti002';
        openLevel(level, params);
    }
    
    // Dados e configuração do gráfico de barras
    const labels = [];
    const realBaixarecData = [];
    const provisaorecData = [];
    const realBaixadesData = [];
    const provisaodesData = [];

    <c:forEach items="${valoresnatmes.rows}" var="row">
        labels.push('${row.MES}');
        realBaixarecData.push(Number('${row.TOTAL_REAL_BAIXA_RECEITA}'));
        provisaorecData.push(Number('${row.TOTAL_PROVISAO_RECEITA}'));
        realBaixadesData.push(Number('${row.TOTAL_REAL_BAIXA_DESPESA}'));
        provisaodesData.push(Number('${row.TOTAL_PROVISAO_DESPESA}'));


    </c:forEach>

    const ctx = document.getElementById('myChart').getContext('2d');

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Receitas Baixada',
            data: realBaixarecData,
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          },
          {
            label: 'Total em Provisão de Receitas',
            data: provisaorecData,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Total Real em Despesas Baixada',
            data: realBaixadesData,
            backgroundColor: 'rgba(207, 180, 7, 0.3)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          },
          {
            label: 'Total em Provisão de Despesas',
            data: provisaodesData,
            backgroundColor: 'rgba(110, 0, 0, 0.776)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  </script>
</body>
</html>
