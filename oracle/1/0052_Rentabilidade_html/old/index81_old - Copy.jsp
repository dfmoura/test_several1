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
    <title>Página com Cards</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.3/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.3/js/dataTables.bootstrap5.min.js"></script>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.3/css/jquery.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.3/css/dataTables.bootstrap5.min.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            height: 100vh;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .container {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            padding: 10px;
        }

        .half-row {
            display: flex;
            flex: 1;
            gap: 10px;
            height: 50%;
        }

        .column {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .card {
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 20px;
            margin: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            overflow: hidden;
            position: relative;
        }

        .card h2 {
            margin: 0 0 10px;
            font-size: 1.2em;
            align-self: flex-start;
        }

        .chart-container {
            position: relative;
            width: 100%;
            height: 80%; /* Reduzido em 20% */
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        canvas, .plotly-chart {
            width: 100%;
            height: 100%;
        }

        .dataTables_wrapper {
            width: 100%;
            height: 100%;
        }

        table {
            width: 100%;
            height: 100%;
        }
    </style>
<snk:load/>    
</head>
<body>
    <div class="container">
        <div class="half-row">
            <div class="column">
                <div class="card">
                    <h2>Impostos por Empresa</h2>
                    <div class="chart-container">
                        <canvas id="donutChart"></canvas>
                    </div>
                </div>
            </div>
            <div class="column">
                <div class="card">
                    <h2>Impostos por Grupo de Produtos</h2>
                    <div class="chart-container">
                        <div id="lineChart" class="plotly-chart"></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="half-row">
            <div class="column">
                <div class="card">
                    <h2>Detalhamento</h2>
                    <div class="chart-container">
                        <table id="dataTable" class="display table table-striped table-bordered">
                            <thead>
                                <tr>
                                    <th>OP</th>
                                    <th>Produto</th>
                                    <th>Custo Médio</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>123</td>
                                    <td>Produto A</td>
                                    <td>R$ 10,00</td>
                                </tr>
                                <tr>
                                    <td>456</td>
                                    <td>Produto B</td>
                                    <td>R$ 15,00</td>
                                </tr>
                                <tr>
                                    <td>789</td>
                                    <td>Produto C</td>
                                    <td>R$ 20,00</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Gráfico de Rosca com Chart.js
        const ctx = document.getElementById('donutChart').getContext('2d');
        const donutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Grupo 1', 'Grupo 2', 'Grupo 3', 'Grupo 4'],
                datasets: [{
                    data: [30, 20, 25, 25],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.4)', 
                        'rgba(54, 162, 235, 0.4)', 
                        'rgba(255, 206, 86, 0.4)', 
                        'rgba(75, 192, 192, 0.4)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)', 
                        'rgba(54, 162, 235, 1)', 
                        'rgba(255, 206, 86, 1)', 
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Gráfico de Linha com Plotly.js
        const trace1 = {
            x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            y: [10, 15, 13, 17, 21, 19, 24],
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#17BECF' }
        };

        const data = [trace1];

        const layout = {
            margin: { t: 0, l: 0, r: 0, b: 0 },
            legend: { display: false },
            xaxis: { fixedrange: true },
            yaxis: { fixedrange: true }
        };

        Plotly.newPlot('lineChart', data, layout, { responsive: true });

        // Inicialização da DataTable com mais opções
        $(document).ready(function() {
            $('#dataTable').DataTable({
                responsive: true,
                paging: true,
                searching: true,
                ordering: true,
                lengthMenu: [ [10, 25, 50, -1], [10, 25, 50, "Todos"] ],
                pageLength: 10,
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/Portuguese.json'
                },
                dom: 'lBfrtip',
                buttons: [
                    'copy', 'excel', 'pdf', 'print'
                ]
            });
        });
    </script>
</body>
</html>