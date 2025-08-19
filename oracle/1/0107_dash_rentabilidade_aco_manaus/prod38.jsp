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
    <title>Tela de Desconto</title>
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
            left: 58%; /* Move o overlay 10% para a direita */
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
                <div class="part-title">Desconto por Tipo Produto</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <div class="chart-overlay">R$ 125.450,00</div>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div class="part-title">Desconto Por Gerente</div>
                <div class="chart-container">
                    <canvas id="barChart"></canvas>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div class="part-title">TOP 10 - Desconto Por Cliente</div>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div class="part-title">Desconto por Produto</div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Cód. Tp.Prod.</th>
                                <th>Tp. Prod.</th>
                                <th>Cód. Prod.</th>
                                <th>Produto</th>
                                <th>Vlr. Desconto</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1</td>
                                <td>Produto A</td>
                                <td onclick="abrir_prod('1','1001')">1001</td>
                                <td>Produto Exemplo 1</td>
                                <td>25.450,00</td>
                            </tr>
                            <tr>
                                <td>2</td>
                                <td>Produto B</td>
                                <td onclick="abrir_prod('2','1002')">1002</td>
                                <td>Produto Exemplo 2</td>
                                <td>18.750,00</td>
                            </tr>
                            <tr>
                                <td>3</td>
                                <td>Produto C</td>
                                <td onclick="abrir_prod('3','1003')">1003</td>
                                <td>Produto Exemplo 3</td>
                                <td>15.200,00</td>
                            </tr>
                            <tr>
                                <td>4</td>
                                <td>Produto D</td>
                                <td onclick="abrir_prod('4','1004')">1004</td>
                                <td>Produto Exemplo 4</td>
                                <td>12.800,00</td>
                            </tr>
                            <tr>
                                <td>5</td>
                                <td>Produto E</td>
                                <td onclick="abrir_prod('5','1005')">1005</td>
                                <td>Produto Exemplo 5</td>
                                <td>10.500,00</td>
                            </tr>
                            <tr>
                                <td><b>Total</b></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td><b>82.700,00</b></td>
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

   // Função para atualizar a query
   function ref_desc(tipoprod) {
        const params = {'A_TPPROD': tipoprod};
        refreshDetails('html5_a73fhib', params); 
    }          

/*

        // Função para abrir o novo nível

        function abrir_ger(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_CODGER': parseInt(grupo1)
             };
            var level = 'lvl_w1rozi';
            
            openLevel(level, params);
        }


        function abrir_cli(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_CODPARC': parseInt(grupo1)
             };
            var level = 'lvl_w1rozi';
            
            openLevel(level, params);
        }




        function abrir_prod(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_CODPROD': parseInt(grupo1)
             };
            var level = 'lvl_w1rozi';
            
            openLevel(level, params);
        }    

*/


    // Obtendo os dados da query JSP para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

        var descTipoLabel = [];
        var descTipoData = [];
        
        // Dados de exemplo para o gráfico de rosca - Desconto por Tipo Produto
        descTipoLabel = ['1 - Produto A', '2 - Produto B', '3 - Produto C', '4 - Produto D', '5 - Produto E'];
        descTipoData = [25450.00, 18750.00, 15200.00, 12800.00, 10500.00];
    
        // Dados fictícios para o gráfico de rosca
        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: descTipoLabel,
                datasets: [{
                    label: 'Vlr. Desc.',
                    data: descTipoData,
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
                        var label = descTipoLabel[index].split('-')[0];
                        
                        ref_desc(label);
                        
                    }
                }
            }
        });

        // Dados fictícios para o gráfico de barras verticais

        var gerDescLabels = [];
        var gerDescData = [];

        // Dados de exemplo para o gráfico de barras - Desconto por Gerente
        gerDescLabels = ['1 - 101 - João Silva', '2 - 102 - Maria Santos', '3 - 103 - Pedro Costa', '4 - 104 - Ana Oliveira', '5 - 105 - Carlos Lima'];
        gerDescData = [18500.00, 16200.00, 14300.00, 12100.00, 9800.00];

        // Dados fictícios para o gráfico de barras verticais
        const ctxBar = document.getElementById('barChart').getContext('2d');
        const barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: gerDescLabels,
                datasets: [{
                    label: 'Desconto por Gerente',
                    data: gerDescData,
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
                        const grupo = gerDescLabels[index].split('-')[0];
                        const grupo1 = gerDescLabels[index].split('-')[1];
                        abrir_ger(grupo,grupo1);
                    }
                }
            }
        });

        // Dados fictícios para o gráfico de colunas verticais

        var clienteLabels = [];
        var clienteData = [];

        // Dados de exemplo para o gráfico de barras - Desconto por Cliente
        clienteLabels = ['1 - 1001 - Cliente A Ltda', '2 - 1002 - Cliente B S/A', '3 - 1003 - Cliente C ME', '4 - 1004 - Cliente D Eireli', '5 - 1005 - Cliente E Ltda'];
        clienteData = [12500.00, 9800.00, 8700.00, 7200.00, 6500.00];

        // Dados fictícios para o gráfico de colunas verticais
        const ctxBarRight = document.getElementById('barChartRight').getContext('2d');
        const barChartRight = new Chart(ctxBarRight, {
            type: 'bar',
            data: {
                labels: clienteLabels,
                datasets: [{
                    label: 'Desconto por Cliente',
                    data: clienteData,
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
                        const grupo = clienteLabels[index].split('-')[0];
                        const grupo1 = clienteLabels[index].split('-')[1];
                        abrir_cli(grupo,grupo1);
                    }
                }
            }
        });




        
    </script>
</body>
</html>
