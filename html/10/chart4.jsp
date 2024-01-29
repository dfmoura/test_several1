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
    <link href="//maxcdn.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css" rel="stylesheet" id="bootstrap-css">
    <script src="//maxcdn.bootstrapcdn.com/bootstrap/4.1.1/js/css/bootstrap.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script> <!-- Include Chart.js library -->

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

    <canvas id="myPieChart" width="300" height="300"></canvas>

    <script>
        // Extract data from the JSP query result
        var labels = [];
        var data = [];

        <c:forEach var="row" items="${cliente.rows}">
            labels.push("<c:out value="${row.RAZAOSOCIAL}" />");
            data.push(<c:out value="${row.VLRFAT}" />);
        </c:forEach>

        // Create the pie chart
        var ctx = document.getElementById('myPieChart').getContext('2d');
        var myPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(175, 210, 175, 0.7)',
                        'rgba(22, 167, 19, 0.7)',
                        'rgba(81, 223, 78, 0.7)',
                        'rgba(143, 227, 142, 0.7)',
                        'rgba(8, 251, 3, 0.7)'
                    ],
                    borderColor: [
                        'rgba(175, 210, 175, 0.7)',
                        'rgba(22, 167, 19, 0.7)',
                        'rgba(81, 223, 78, 0.7)',
                        'rgba(143, 227, 142, 0.7)',
                        'rgba(8, 251, 3, 0.7)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false,
                    }
                },
                title: {
                    display: true,
                    text: 'TOP 5 CLIENTES',
                },
                tooltips: {
                    callbacks: {
                        label: function (tooltipItem, data) {
                            var dataset = data.datasets[tooltipItem.datasetIndex];
                            var label = data.labels[tooltipItem.index] || '';
                            var value = dataset.data[tooltipItem.index];
                            return label + ': ' + value;
                        }
                    }
                }
            }
        });
    </script>
</body>

</html>
