<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
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
    <link href="//maxcdn.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css" rel="stylesheet"
        id="bootstrap-css">
    <script src="//maxcdn.bootstrapcdn.com/bootstrap/4.1.1/js/css/bootstrap.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <snk:load />
</head>

<body>
    <snk:query var="cliente">
        SELECT 
        CAB.CODPARC,
        SUBSTR(PAR.RAZAOSOCIAL,1,6) AS RAZAOSOCIAL,
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

    <div style="width: 80%; margin: auto;">
        <canvas id="myPieChart"></canvas>
    </div>

    <script>
        // Extracting data from the JSP variable 'cliente' for Chart.js
        var razaoSocial = [];
        var vlrFat = [];

        <c:forEach var="row" items="${cliente.rows}">
            razaoSocial.push("${row.RAZAOSOCIAL}");
            vlrFat.push(${row.VLRFAT});
        </c:forEach>

        // Creating the Pie Chart
        var ctx = document.getElementById('myPieChart').getContext('2d');
        var myPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: razaoSocial,
                datasets: [{
                    data: vlrFat,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(255, 159, 64, 0.5)',
                        'rgba(255, 205, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(54, 162, 235, 0.5)'
                    ],
                }]
            },
            options: {
                legend: {
                    display: false
                }
            }
        });
    </script>
</body>

</html>
