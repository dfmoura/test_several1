<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt">
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

        .chart-overlay {
            position: absolute;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 20px;
            font-weight: bold;
            color: #333;
            left: 55%; /* Move o overlay 10% para a direita */
            transform: translateX(45%); /* Ajusta a posição do texto para centralizá-lo */
            /*text-align: center; Opcional, para centralizar o texto se ele tiver várias linhas */            
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
    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">

    <snk:load/>

</head>

<body>
    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">% Margem por Tipo Produto</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <div class="chart-overlay" id="total-overlay">% 15.75</div>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div class="part-title">% Margem Por Gerente</div>
                <div class="chart-container">
                    <canvas id="barChart"></canvas>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div class="part-title">TOP 10 - % Margem Por Cliente</div>
                <div class="chart-container">
                    <canvas id="barChart1"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div class="part-title">% Margem por Produto</div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Cód. Tp.Prod.</th>
                                <th>Tp. Prod.</th>
                                <th>Cód. Prod.</th>
                                <th>Produto</th>
                                <th>HL</th>
                                <th>Margem %</th>
                            </tr>
                        </thead>
                        <tbody id="produtos-tbody">
                            <!-- Dados serão preenchidos via JavaScript -->
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

        // Dados de exemplo para substituir as queries
        const dadosExemplo = {
            mar_tot: [
                { PERCMARGEM: 15.75 }
            ],
            mar_tipo: [
                { AD_TPPROD: 1, TIPOPROD: "Produto A", PERCMARGEM: 18.50 },
                { AD_TPPROD: 2, TIPOPROD: "Produto B", PERCMARGEM: 16.25 },
                { AD_TPPROD: 3, TIPOPROD: "Produto C", PERCMARGEM: 14.80 },
                { AD_TPPROD: 4, TIPOPROD: "Produto D", PERCMARGEM: 12.45 }
            ],
            mar_ger: [
                { AD_TPPROD: 1, CODGER: 101, GERENTE: "João Silva", PERCMARGEM: 19.20 },
                { AD_TPPROD: 1, CODGER: 102, GERENTE: "Maria Santos", PERCMARGEM: 17.80 },
                { AD_TPPROD: 1, CODGER: 103, GERENTE: "Pedro Costa", PERCMARGEM: 16.90 },
                { AD_TPPROD: 2, CODGER: 201, GERENTE: "Ana Oliveira", PERCMARGEM: 18.50 },
                { AD_TPPROD: 2, CODGER: 202, GERENTE: "Carlos Lima", PERCMARGEM: 16.75 },
                { AD_TPPROD: 3, CODGER: 301, GERENTE: "Lucia Ferreira", PERCMARGEM: 15.90 },
                { AD_TPPROD: 3, CODGER: 302, GERENTE: "Roberto Alves", PERCMARGEM: 15.60 }
            ],
            mar_cli: [
                { AD_TPPROD: 1, CODPARC: 1001, NOMEPARC: "Cliente A", PERCMARGEM: 20.15 },
                { AD_TPPROD: 1, CODPARC: 1002, NOMEPARC: "Cliente B", PERCMARGEM: 18.90 },
                { AD_TPPROD: 1, CODPARC: 1003, NOMEPARC: "Cliente C", PERCMARGEM: 17.45 },
                { AD_TPPROD: 2, CODPARC: 2001, NOMEPARC: "Cliente D", PERCMARGEM: 19.80 },
                { AD_TPPROD: 2, CODPARC: 2002, NOMEPARC: "Cliente E", PERCMARGEM: 18.25 },
                { AD_TPPROD: 2, CODPARC: 2003, NOMEPARC: "Cliente F", PERCMARGEM: 17.90 },
                { AD_TPPROD: 3, CODPARC: 3001, NOMEPARC: "Cliente G", PERCMARGEM: 16.75 },
                { AD_TPPROD: 3, CODPARC: 3002, NOMEPARC: "Cliente H", PERCMARGEM: 16.45 },
                { AD_TPPROD: 3, CODPARC: 3003, NOMEPARC: "Cliente I", PERCMARGEM: 15.90 },
                { AD_TPPROD: 4, CODPARC: 4001, NOMEPARC: "Cliente J", PERCMARGEM: 14.20 }
            ],
            mar_prod: [
                { AD_TPPROD: 1, TIPOPROD: "Produto A", CODPROD: 1001, DESCRPROD: "Produto A1", HL: 150, PERCMARGEM: 19.85 },
                { AD_TPPROD: 1, TIPOPROD: "Produto A", CODPROD: 1002, DESCRPROD: "Produto A2", HL: 120, PERCMARGEM: 18.45 },
                { AD_TPPROD: 1, TIPOPROD: "Produto A", CODPROD: 1003, DESCRPROD: "Produto A3", HL: 100, PERCMARGEM: 17.20 },
                { AD_TPPROD: 2, TIPOPROD: "Produto B", CODPROD: 2001, DESCRPROD: "Produto B1", HL: 180, PERCMARGEM: 19.10 },
                { AD_TPPROD: 2, TIPOPROD: "Produto B", CODPROD: 2002, DESCRPROD: "Produto B2", HL: 160, PERCMARGEM: 17.85 },
                { AD_TPPROD: 2, TIPOPROD: "Produto B", CODPROD: 2003, DESCRPROD: "Produto B3", HL: 140, PERCMARGEM: 16.90 },
                { AD_TPPROD: 3, TIPOPROD: "Produto C", CODPROD: 3001, DESCRPROD: "Produto C1", HL: 200, PERCMARGEM: 16.45 },
                { AD_TPPROD: 3, TIPOPROD: "Produto C", CODPROD: 3002, DESCRPROD: "Produto C2", HL: 180, PERCMARGEM: 15.75 },
                { AD_TPPROD: 4, TIPOPROD: "Produto D", CODPROD: 4001, DESCRPROD: "Produto D1", HL: 250, PERCMARGEM: 13.80 }
            ]
        };

        // Função para preencher a tabela de produtos
        function preencherTabelaProdutos() {
            const tbody = document.getElementById('produtos-tbody');
            let total = 0;
            
            dadosExemplo.mar_prod.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.AD_TPPROD}</td>
                    <td>${item.TIPOPROD}</td>
                    <td onclick="abrir_pro('${item.AD_TPPROD}','${item.CODPROD}')">${item.CODPROD}</td>
                    <td>${item.DESCRPROD}</td>
                    <td>${item.HL}</td>
                    <td>${item.PERCMARGEM.toFixed(2)}</td>
                `;
                tbody.appendChild(row);
                total += item.PERCMARGEM;
            });
            
            // Adicionar linha de total
            const totalRow = document.createElement('tr');
            totalRow.innerHTML = `
                <td><b>Total</b></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td><b>${(total / dadosExemplo.mar_prod.length).toFixed(2)}</b></td>
            `;
            tbody.appendChild(totalRow);
        }

        // Função para atualizar a query
        function ref_tpprod(tipoprod) {
                const params = {'A_TPPROD': parseInt(tipoprod)};
                refreshDetails('html5_adcdpw5', params); 
            }


    /*
        // Função para abrir o novo nível

        function abrir_ger(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_CODGER': parseInt(grupo1)
             };
            var level = 'lvl_1f45rd';
            
            openLevel(level, params);
        }


        function abrir_cli(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_CODPARC': parseInt(grupo1)
             };
            var level = 'lvl_1f45rd';
            
            openLevel(level, params);
        }


        function abrir_pro(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_CODPROD': parseInt(grupo1)
             };
            var level = 'lvl_1f45rd';
            
            openLevel(level, params);
        }
        */

        // Dados para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

        var marTpProdLabel = [];
        var marTpProdData = [];
        
        // Preencher dados do gráfico de rosca
        dadosExemplo.mar_tipo.forEach(item => {
            marTpProdLabel.push(`${item.AD_TPPROD} - ${item.TIPOPROD}`);
            marTpProdData.push(item.PERCMARGEM);
        });

        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: marTpProdLabel,
                datasets: [{
                    label: '% Margem por Tipo',
                    data: marTpProdData,
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
                        position: 'left',
                        align: 'center', // Alinhamento vertical da legenda
                    }
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var label = marTpProdLabel[index].split('-')[0];
                        
                        ref_tpprod(label);
                        //alert(label);
                    }
                }
            }
        });

        // Dados para o gráfico de barras verticais
        const ctxBar = document.getElementById('barChart').getContext('2d');

        var marGerLabel = [];
        var marGerData = [];
        
        // Preencher dados do gráfico de barras
        dadosExemplo.mar_ger.forEach(item => {
            marGerLabel.push(`${item.AD_TPPROD} - ${item.CODGER} - ${item.GERENTE}`);
            marGerData.push(item.PERCMARGEM);
        });       

        const barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: marGerLabel,
                datasets: [{
                    label: '% Margem por Gerente',
                    data: marGerData,
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
                },
                onClick: function(evt, activeElements) {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const grupo = marGerLabel[index].split('-')[0];
                        const grupo1 = marGerLabel[index].split('-')[1];
                        abrir_ger(grupo,grupo1);
                    }
                }
            }
        });

        // Dados para o gráfico de colunas verticais
        const ctxBarRight = document.getElementById('barChart1').getContext('2d');

        var marCliLabel = [];
        var marCliData = [];
        
        // Preencher dados do gráfico de clientes
        dadosExemplo.mar_cli.forEach(item => {
            marCliLabel.push(`${item.AD_TPPROD} - ${item.CODPARC} - ${item.NOMEPARC}`);
            marCliData.push(item.PERCMARGEM);
        });   

        const barChartRight = new Chart(ctxBarRight, {
            type: 'bar',
            data: {
                labels: marCliLabel,
                datasets: [{
                    label: 'Margem por Cliente',
                    data: marCliData,
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
                },
                onClick: function(evt, activeElements) {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const grupo = marCliLabel[index].split('-')[0];
                        const grupo1 = marCliLabel[index].split('-')[1];
                        abrir_cli(grupo,grupo1);
                    }
                }
            }
        });

        // Preencher a tabela quando a página carregar
        document.addEventListener('DOMContentLoaded', function() {
            preencherTabelaProdutos();
        });

        
    </script>
</body>
</html>
