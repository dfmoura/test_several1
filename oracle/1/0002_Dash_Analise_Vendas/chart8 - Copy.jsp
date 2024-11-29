<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
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
                        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script> <!-- Include Chart.js library -->

                        <snk:load />
                    </head>

                    <body>
                        <snk:query var="cliente">
                            SELECT ANO, MES, MES_ANO, TIPO, QTD
                            FROM (
                            SELECT
                            TO_CHAR(CAB.DTNEG,'YYYY') AS ANO,
                            TO_CHAR(CAB.DTNEG,'MM') AS MES,
                            TO_CHAR(CAB.DTNEG,'MM/YYYY') AS MES_ANO,
                            'QTD. NOTAS APROVADAS' AS TIPO,
                            COUNT(*) AS QTD
                            FROM TGFCAB CAB
                            WHERE CAB.TIPMOV = 'V'
                            AND CAB.STATUSNFE = 'A'
                            AND CAB.DTNEG BETWEEN TO_DATE('01-08-2023', 'DD-MM-YYYY') AND TO_DATE('04-12-2023',
                            'DD-MM-YYYY')
                            GROUP BY
                            TO_CHAR(CAB.DTNEG,'YYYY'),
                            TO_CHAR(CAB.DTNEG,'MM'),
                            TO_CHAR(CAB.DTNEG,'MM/YYYY')
                            UNION ALL
                            SELECT DISTINCT
                            TO_CHAR(FIN.DTNEG,'YYYY') AS ANO,
                            TO_CHAR(FIN.DTNEG,'MM') AS MES,
                            TO_CHAR(FIN.DTNEG,'MM/YYYY') AS MES_ANO,
                            'QTD. NOTAS RECEBIDAS' AS TIPO,
                            COUNT(*) AS QTD
                            FROM TGFFIN FIN
                            INNER JOIN TGFCAB CAB ON FIN.NUNOTA = CAB.NUNOTA
                            WHERE FIN.DHBAIXA IS NULL
                            AND CAB.DTNEG BETWEEN TO_DATE('01-08-2023', 'DD-MM-YYYY') AND TO_DATE('04-12-2023',
                            'DD-MM-YYYY')
                            GROUP BY
                            TO_CHAR(FIN.DTNEG,'YYYY'),
                            TO_CHAR(FIN.DTNEG,'MM'),
                            TO_CHAR(FIN.DTNEG,'MM/YYYY')
                            UNION ALL
                            SELECT DISTINCT
                            TO_CHAR(FIN.DTNEG,'YYYY') AS ANO,
                            TO_CHAR(FIN.DTNEG,'MM') AS MES,
                            TO_CHAR(FIN.DTNEG,'MM/YYYY') AS MES_ANO,
                            'QTD. NOTAS EM ABERTO' AS TIPO,
                            COUNT(*) AS QTD
                            FROM TGFFIN FIN
                            INNER JOIN TGFCAB CAB ON FIN.NUNOTA = CAB.NUNOTA
                            WHERE FIN.DHBAIXA IS NOT NULL
                            AND CAB.DTNEG BETWEEN TO_DATE('01-08-2023', 'DD-MM-YYYY') AND TO_DATE('04-12-2023',
                            'DD-MM-YYYY')
                            GROUP BY
                            TO_CHAR(FIN.DTNEG,'YYYY'),
                            TO_CHAR(FIN.DTNEG,'MM'),
                            TO_CHAR(FIN.DTNEG,'MM/YYYY')
                            )
                            ORDER BY ANO, MES
                        </snk:query>

                        <div style="width: 80%; margin: auto;">
                            <canvas id="myBarChart" width="800" height="400"></canvas>
                        </div>

                        <script>
                            // Extract data from the JSP query result
                            var labels = [];
                            var data = [];
                        
                            <c:forEach var="row" items="${cliente.rows}">
                                labels.push("<c:out value="${row.TIPO}" />");
                                data.push(<c:out value="${row.QTD}" />);
                            </c:forEach>
                        
                            // Create the bar chart
                            var ctx = document.getElementById('myBarChart').getContext('2d');
                            var myBarChart = new Chart(ctx, {
                                type: 'bar',
                                data: {
                                    labels: labels,
                                    datasets: [{
                                        label: 'A',
                                        data: data,
                                        backgroundColor: [
                                            'rgba(175, 210, 175, 0.7)',
                                            'rgba(22, 167, 19, 0.7)',
                                            'rgba(81, 223, 78, 0.7)'
                                        ],
                                        borderColor: [
                                            'rgba(175, 210, 175, 0.7)',
                                            'rgba(22, 167, 19, 0.7)',
                                            'rgba(81, 223, 78, 0.7)'
                                        ],
                                        borderWidth: 1
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    plugins: {
                                        legend: false, // Display legend
                                        tooltip: {
                                            callbacks: {
                                                label: function (context) {
                                                    var label = context.label || '';
                                                    var value = context.parsed.y;
                                                    return label + ': ' + value;
                                                }
                                            }
                                        }
                                    },
                                    scales: {
                                        x: {
                                            beginAtZero: true
                                        },
                                        y: {
                                            beginAtZero: true
                                        }
                                    },
                                    title: {
                                        display: true,
                                        text: 'ANALISE DE VENDAS' // Updated title
                                    }
                                }
                            });
                        </script>
                        
                    </body>

                    </html>