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

        .chart-overlay {
            position: absolute;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 20px;
            font-weight: bold;
            color: #333;
            left: 56%; /* Move o overlay 10% para a direita */
            transform: translateX(45%); /* Ajusta a posição do texto para centralizá-lo */
            /*text-align: center; Opcional, para centralizar o texto se ele tiver várias linhas */            
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


        .table-container {
            width: 100%; /* Largura da tabela ajustada para o contêiner */
            height: 100%;
            max-height: 200px; /* Define a altura máxima para o contêiner da tabela */
            overflow-y: auto; /* Habilita a rolagem vertical */
            overflow-x: hidden; /* Desabilita a rolagem horizontal */
            padding-right: 10px; /* Espaço para evitar o corte do conteúdo na rolagem */
            font-size: 12px;
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
            z-index: 2; /* Garante que o cabeçalho fique sobre o conteúdo */
        }
        .table-container tr:hover {
            background-color: #f1f1f1;
        }        

    </style>
    <snk:load/>
</head>
<body>

<%
    // Obtendo os dados das queries
    List<Map<String, Object>> custoTotalEmp = (List<Map<String, Object>>) request.getAttribute("custo_total_emp");
    List<Map<String, Object>> custoTotalTop = (List<Map<String, Object>>) request.getAttribute("custo_total_top");
    List<Map<String, Object>> custoTotal = (List<Map<String, Object>>) request.getAttribute("custo_total");
    List<Map<String, Object>> custoProduto = (List<Map<String, Object>>) request.getAttribute("custo_produto");
%>

<script>
    // Função para formatar valores monetários
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    // Carregar dados da JSP para variáveis JavaScript
    var custoTotalEmp = <%= new Gson().toJson(custoTotalEmp) %>;
    var custoTotalTop = <%= new Gson().toJson(custoTotalTop) %>;
    var custoTotal = <%= new Gson().toJson(custoTotal) %>;
    var custoProduto = <%= new Gson().toJson(custoProduto) %>;

    document.addEventListener('DOMContentLoaded', function() {
        // Exemplo de como usar os dados para criar gráficos e tabelas

        // Criar gráficos
        var ctx1 = document.getElementById('doughnutChart1').getContext('2d');
        new Chart(ctx1, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: custoTotalTop.map(item => item.CUSMEDSICM_TOT),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                }],
                labels: custoTotalTop.map(item => item.EMPRESA)
            }
        });

        var ctx2 = document.getElementById('doughnutChart2').getContext('2d');
        new Chart(ctx2, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: custoTotalEmp.map(item => item.CUSMEDSICM_TOT),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                }],
                labels: custoTotalEmp.map(item => item.EMPRESA)
            }
        });

        // Preencher a tabela
        var tableBody = document.querySelector('.table-container tbody');
        custoProduto.forEach(function(item) {
            var row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.CODEMP}</td>
                <td>${item.CODTIPOPER}</td>
                <td>${item.AD_TPPROD}</td>
                <td>${item.TIPOPROD}</td>
                <td onclick="abrir_prod('${item.CODEMP}', '${item.CODPROD}')">${item.CODPROD}</td>
                <td>${item.DESCRPROD}</td>
                <td>${formatCurrency(item.CUSMEDSICM_TOT)}</td>
            `;
            tableBody.appendChild(row);
        });

        // Calcular e exibir total
        var total = custoProduto.reduce(function(sum, item) {
            return sum + item.CUSMEDSICM_TOT;
        }, 0);
        var totalRow = document.createElement('tr');
        totalRow.innerHTML = `
            <td><b>Total</b></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>${formatCurrency(total)}</td>
        `;
        tableBody.appendChild(totalRow);
    });
</script>

<div class="container">
    <div class="half-row">
        <div class="column">
            <div class="card">
                <h2>Custo Médio por Empresa de Produtos Faturados</h2>
                <div class="chart-container">
                    <canvas id="doughnutChart2"></canvas>
                </div>
            </div>
        </div>
        <div class="column">
            <div class="card">
                <h2>Custo Médio por TOP de Produtos Faturados</h2>
                <div class="chart-container">
                    <canvas id="doughnutChart1"></canvas>
                </div>
            </div>
        </div>
    </div>
    <div class="half-row">
        <div class="column">
            <div class="card">
                <h2>Custo Médio por Tipo de Produtos Faturados</h2>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                </div>
            </div>
        </div>
        <div class="column">
            <div class="card">
                <h2>Custo Médio dos Produtos Faturados</h2>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Cód.Emp.</th>
                                <th>Cód. Top.</th>
                                <th>Cód.</th>
                                <th>Tp. Prod.</th>
                                <th>Cód.</th>
                                <th>Produto</th>
                                <th>Custo Méd. Tot.</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- As linhas serão adicionadas dinamicamente pelo script -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

</body>
</html>
