<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false"%>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Card Dashboard</title>
    <link rel="stylesheet" type="text/css" href="${BASE_FOLDER}styles.css">
    <link href="//maxcdn.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css" rel="stylesheet" id="bootstrap-css">
    <script src="//maxcdn.bootstrapcdn.com/bootstrap/4.1.1/js/css/bootstrap.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script> <!-- Add Chart.js library -->
    <snk:load/>
</head>
<body>

<snk:query var="cliente">
    SELECT 
    CAB.CODPARC,
    PAR.RAZAOSOCIAL,
    SUM(CASE 
          WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 
          ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) 
        END) AS VLRFAT
  FROM 
    TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (
      SELECT MAX(DTATUAL) FROM TGFCUS 
      WHERE DTATUAL <= CAB.DTNEG AND CODPROD = ITE.CODPROD AND CODEMP = CAB.CODEMP
    )
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (
      SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER
    )
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
  WHERE 
    TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN '01-11-2023' AND '03-11-2023')
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    AND PRO.AD_TPPROD IS NOT NULL
  GROUP BY 
    CAB.CODPARC, PAR.RAZAOSOCIAL
  ORDER BY 
    VLRFAT DESC
  FETCH FIRST 5 ROWS ONLY
</snk:query>

<canvas id="myPizzaChart" width="400" height="400"></canvas> <!-- Add a canvas for the chart -->

<script>
    // Process the query result to prepare data for the chart
    var labels = [];
    var data = [];

    <c:forEach var="row" items="${cliente.rows}">
        labels.push("${row.RAZAOSOCIAL}");
        data.push(${row.VLRFAT});
    </c:forEach>

    // Create a pizza chart using Chart.js
    var ctx = document.getElementById('myPizzaChart').getContext('2d');
    var myPizzaChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                    // Add more colors if needed
                ],
            }],
        },
        options: {
            // Add options if needed
        },
    });
</script>

</body>
</html>
