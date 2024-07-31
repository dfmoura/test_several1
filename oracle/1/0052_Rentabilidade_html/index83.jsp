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
    <title>Tela de Devoluções</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            font-family: Arial, sans-serif;
            background-color: #ffffff;
        }
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px; /* Ajuste do gap para aumentar o espaçamento vertical */
            width: 90%;
            height: 90%;
        }
        .section {
            display: flex;
            flex-direction: column;
            gap: 30px; /* Ajuste do gap para aumentar o espaçamento vertical */
        }
        .part {
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 20px;
            width: 100%;
            height: calc(50% - 20px); /* Ajuste da altura para refletir o novo gap */
            overflow: hidden; /* Impede que o conteúdo altere o tamanho da parte */
            position: relative; /* Necessário para posicionar o título */
            display: flex;
            flex-direction: column;
            justify-content: center; /* Centraliza verticalmente */
            align-items: center; /* Centraliza horizontalmente */
        }
        .part-title {
            position: absolute;
            top: 10px; /* Espaçamento do topo */
            left: 50%;
            transform: translateX(-50%);
            font-size: 18px;
            font-weight: bold;
            color: #333;
            background-color: #fff; /* Cor de fundo para legibilidade */
            padding: 0 10px; /* Espaçamento horizontal */
        }
        .chart-container {
            width: 80%; /* Ajuste da largura do gráfico */
            height: 80%; /* Ajuste da altura do gráfico */
            display: flex;
            justify-content: center; /* Centraliza horizontalmente o gráfico */
            align-items: center; /* Centraliza verticalmente o gráfico */
        }
        .dropdown-container {
            display: flex;
            justify-content: flex-start; /* Alinha o dropdown à esquerda */
            width: 100%;
        }
        .dropdown-container select {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
            width: 100%;
            max-width: 300px; /* Limita a largura máxima do dropdown */
        }
        canvas {
            width: 100% !important;
            height: 100% !important;
        }
        /* Estilo para a tabela */
        .table-container {
            width: 80%; /* Reduz a largura da tabela em 20% */
            height: 85%;
            display: flex;
            flex-direction: column;
        }
        .table-container table {
            width: 100%;
            border-collapse: collapse;
        }
        .table-container th, .table-container td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
        }
        .table-container th {
            background-color: #f4f4f4;
            position: sticky;
            top: 0; /* Fixa o cabeçalho no topo ao rolar */
            z-index: 1; /* Garante que o cabeçalho fique sobre o conteúdo */
        }
        .table-container tr:hover {
            background-color: #f1f1f1;
        }
    </style>
    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">
    <snk:load/>

</head>
<body>
    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">HL por Tipo Produto</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div class="part-title">HL Por Cliente</div>
                <div class="chart-container">
                    <canvas id="barChart"></canvas>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div class="part-title">HL Por Gerente</div>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div class="part-title">HL por Produto</div>
                <div class="table-container">
                    <table id="dataTable">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Motivo</th>
                                <th>Quantidade</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Produto A</td>
                                <td>Motivo 1</td>
                                <td>10</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto C</td>
                                <td>Motivo 3</td>
                                <td>30</td>
                            </tr>
                            <tr>
                                <td>Produto D</td>
                                <td>Motivo 4</td>
                                <td>40</td>
                            </tr>
                            <tr>
                                <td>Produto E</td>
                                <td>Motivo 5</td>
                                <td>50</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Adicionando a biblioteca Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Adicionando a biblioteca jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- Adicionando a biblioteca DataTables -->
    <script src="https://cdn.datatables.net/1.12.1/js/jquery.dataTables.min.js"></script>
    <script>
        // Dados fictícios para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
                datasets: [{
                    label: 'My Doughnut Chart',
                    data: [12, 19, 3, 5, 2, 3],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Remove a legenda
                    }
                }
            }
        });

        // Dados fictícios para o gráfico de barras verticais
        const ctxBar = document.getElementById('barChart').getContext('2d');
        const barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Cliente 1', 'Cliente 2', 'Cliente 3', 'Cliente 4'],
                datasets: [{
                    label: 'Quantidade',
                    data: [10, 20, 30, 40],
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Remove a legenda
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Dados fictícios para o gráfico de colunas verticais
        const ctxBarRight = document.getElementById('barChartRight').getContext('2d');
        const barChartRight = new Chart(ctxBarRight, {
            type: 'bar',
            data: {
                labels: ['Gerente A', 'Gerente B', 'Gerente C'],
                datasets: [{
                    label: 'HL por Gerente',
                    data: [15, 25, 10],
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Remove a legenda
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Inicializando a DataTable
        $(document).ready(function() {
            $('#dataTable').DataTable({
                responsive: true,
                paging: true,
                searching: true,
                ordering: true
            });
        });


        
    </script>
</body>
</html>
