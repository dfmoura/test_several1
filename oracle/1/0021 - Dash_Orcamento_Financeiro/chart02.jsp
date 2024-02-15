<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
    <%@ page import="java.util.*" %>
        <%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
            <%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
                <%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

                    <html lang="en">

                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>CHART</title>
                        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js"></script>
                        <style>

                        </style>
                        <snk:load />
                    </head>

                    <body>

                        <snk:query var="dias">


                            SELECT
                            TO_CHAR(DTREF,'YYYY') AS ANO,
                            TO_CHAR(DTREF,'MM') AS MES,
                            TO_CHAR(DTREF,'MM-YYYY') AS MES_ANO,
                            ABS(SUM(PREVREC + (PREVDESP*-1))) AS PREV,
                            ABS(SUM(REALREC + (REALDESP*-1))) AS REAL
                            FROM TGMMET MET
                            WHERE CODMETA = 7
                            GROUP BY
                            TO_CHAR(DTREF,'YYYY'),
                            TO_CHAR(DTREF,'MM'),
                            TO_CHAR(DTREF,'MM-YYYY')
                            ORDER BY
                            TO_CHAR(DTREF,'YYYY'),
                            TO_CHAR(DTREF,'MM')

                        </snk:query>




                        <canvas id="myChart"></canvas>

                        <script>
                            // Extracting data from JSP and formatting for Chart.js
                            var labels = [];
                            var prevData = [];
                            var realData = [];

                            <c:forEach items="${dias.rows}" var="row">
                                labels.push("${row.MES_ANO}");
                                prevData.push(${row.PREV});
                                realData.push(${row.REAL});
                            </c:forEach>

                            // Initialize Chart.js
                            var ctx = document.getElementById('myChart').getContext('2d');
                            var myChart = new Chart(ctx, {
                                type: 'line',
                                data: {
                                    labels: labels,
                                    datasets: [{
                                        label: 'PREV',
                                        data: prevData,
                                        borderColor: 'rgba(255, 99, 132, 1)',
                                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                        tension: 0.1
                                    }, {
                                        label: 'REAL',
                                        data: realData,
                                        borderColor: 'rgba(54, 162, 235, 1)',
                                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                        tension: 0.1
                                    }]
                                },
                                options: {
                                    // Add any chart options here

                                    responsive: true,
                                    maintainAspectRatio: false,

                                    plugins: {
                                        legend: {
                                            position: 'top',
                                        },
                                        title: {
                                            display: true,
                                            text: 'ORÇADO x REALIZADO'
                                        }
                                    },
                                }
                            });
                        </script>


                    </body>

                    </html>