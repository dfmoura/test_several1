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
    <title>Tela de TON</title>
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
                <div class="part-title">TON por Tipo Produto</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <div class="chart-overlay" id="total-overlay">0</div>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div class="part-title">TON Por Gerente</div>
                <div class="chart-container">
                    <canvas id="barChart"></canvas>

                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div class="part-title">TOP 10 - TON Por Cliente</div>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div class="part-title">TON por Produto</div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Cód. Tp.Prod.</th>
                                <th>Tp. Prod.</th>
                                <th>Cód. Prod.</th>
                                <th>Produto</th>
                                <th>TON</th>
                            </tr>
                        </thead>
                        <tbody id="produto-table-body">
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

    <script>

   // Função para atualizar a query
   function ref_hl(tipoprod) {
        const params = {'A_TPPROD': parseInt(tipoprod)};
        refreshDetails('html5_a73fhg9', params); 
    }
/*
        // Função para abrir o novo nível

        function abrir_ger(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_CODGER': parseInt(grupo1)
             };
            var level = 'lvl_wedjo9';
            
            openLevel(level, params);
        }


        function abrir_cli(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_CODPARC': parseInt(grupo1)
             };
            var level = 'lvl_wedjo9';
            
            openLevel(level, params);
        }


        function abrir_prod(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_CODPROD': parseInt(grupo1)
             };
            var level = 'lvl_wedjo9';
            
            openLevel(level, params);
        }        
*/
        // Dados de exemplo para substituir as queries
        const dadosExemplo = {
            ton_total: 1250.50,
            ton_tipo: [
                { AD_TPPROD: 1, TIPOPROD: 'Produto A', TON: 450.25 },
                { AD_TPPROD: 2, TIPOPROD: 'Produto B', TON: 320.75 },
                { AD_TPPROD: 3, TIPOPROD: 'Produto C', TON: 280.50 },
                { AD_TPPROD: 4, TIPOPROD: 'Produto D', TON: 199.00 }
            ],
            ton_gerente: [
                { AD_TPPROD: 1, CODGER: 101, GERENTE: 'João Silva', TON: 450.25 },
                { AD_TPPROD: 2, CODGER: 102, GERENTE: 'Maria Santos', TON: 320.75 },
                { AD_TPPROD: 3, CODGER: 103, GERENTE: 'Pedro Costa', TON: 280.50 },
                { AD_TPPROD: 4, CODGER: 104, GERENTE: 'Ana Oliveira', TON: 199.00 }
            ],
            ton_cliente: [
                { AD_TPPROD: 1, CODPARC: 1001, PARCEIRO: 'Cliente A', TON: 150.25 },
                { AD_TPPROD: 2, CODPARC: 1002, PARCEIRO: 'Cliente B', TON: 120.75 },
                { AD_TPPROD: 3, CODPARC: 1003, PARCEIRO: 'Cliente C', TON: 100.50 },
                { AD_TPPROD: 4, CODPARC: 1004, PARCEIRO: 'Cliente D', TON: 89.00 },
                { AD_TPPROD: 1, CODPARC: 1005, PARCEIRO: 'Cliente E', TON: 75.30 },
                { AD_TPPROD: 2, CODPARC: 1006, PARCEIRO: 'Cliente F', TON: 65.45 },
                { AD_TPPROD: 3, CODPARC: 1007, PARCEIRO: 'Cliente G', TON: 55.20 },
                { AD_TPPROD: 4, CODPARC: 1008, PARCEIRO: 'Cliente H', TON: 45.80 },
                { AD_TPPROD: 1, CODPARC: 1009, PARCEIRO: 'Cliente I', TON: 38.95 },
                { AD_TPPROD: 2, CODPARC: 1010, PARCEIRO: 'Cliente J', TON: 32.10 }
            ],
            ton_produto: [
                { AD_TPPROD: 1, TIPOPROD: 'Produto A', CODPROD: 2001, DESCRPROD: 'Descrição Produto A', TON: 450.25 },
                { AD_TPPROD: 2, TIPOPROD: 'Produto B', CODPROD: 2002, DESCRPROD: 'Descrição Produto B', TON: 320.75 },
                { AD_TPPROD: 3, TIPOPROD: 'Produto C', CODPROD: 2003, DESCRPROD: 'Descrição Produto C', TON: 280.50 },
                { AD_TPPROD: 4, TIPOPROD: 'Produto D', CODPROD: 2004, DESCRPROD: 'Descrição Produto D', TON: 199.00 }
            ]
        };

        // Atualizar o overlay com o total
        document.getElementById('total-overlay').textContent = dadosExemplo.ton_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Preencher a tabela de produtos
        function preencherTabelaProdutos() {
            const tbody = document.getElementById('produto-table-body');
            let total = 0;
            
            dadosExemplo.ton_produto.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.AD_TPPROD}</td>
                    <td>${item.TIPOPROD}</td>
                    <td onclick="abrir_prod('${item.AD_TPPROD}','${item.CODPROD}')">${item.CODPROD}</td>
                    <td>${item.DESCRPROD}</td>
                    <td>${item.TON.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                `;
                tbody.appendChild(row);
                total += item.TON;
            });
            
            // Adicionar linha de total
            const totalRow = document.createElement('tr');
            totalRow.innerHTML = `
                <td><b>Total</b></td>
                <td></td>
                <td></td>
                <td></td>
                <td><b>${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>
            `;
            tbody.appendChild(totalRow);
        }

        // Chamar a função para preencher a tabela
        preencherTabelaProdutos();

        // Obtendo os dados da query JSP para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

        var hlTipoLabel = [];
        var hlTipoData = [];
        
        // Preencher dados do gráfico de rosca
        dadosExemplo.ton_tipo.forEach(item => {
            hlTipoLabel.push(`${item.AD_TPPROD} - ${item.TIPOPROD}`);
            hlTipoData.push(item.TON);
        });
    
        // Dados fictícios para o gráfico de rosca
        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: hlTipoLabel,
                datasets: [{
                    label: 'TON',
                    data: hlTipoData,
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
                        var label = hlTipoLabel[index].split('-')[0];
                        
                        ref_hl(label);
                        //alert(label);
                    }
                }
            }
        });



        // Dados para o gráfico de barras verticais
        const ctxBarRight = document.getElementById('barChart').getContext('2d');

        const gerenteLabels = [];
        const gerenteData = [];
        
        // Preencher dados do gráfico de gerentes
        dadosExemplo.ton_gerente.forEach(item => {
            gerenteLabels.push(`${item.AD_TPPROD} - ${item.CODGER} - ${item.GERENTE}`);
            gerenteData.push(item.TON);
        });

        const barChartRight = new Chart(ctxBarRight, {
            type: 'bar',
            data: {
                labels: gerenteLabels,
                datasets: [{
                    label: 'Quantidade',
                    data: gerenteData,
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                },
                onClick: function(evt, activeElements) {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const grupo = gerenteLabels[index].split('-')[0];
                        const grupo1 = gerenteLabels[index].split('-')[1];
                        abrir_ger(grupo,grupo1);
                    }
                }
            }
        });


        // Dados para o gráfico de barras verticais (direito)
        const ctxBar = document.getElementById('barChartRight').getContext('2d');

        const clienteLabels = [];
        const clienteData = [];
        
        // Preencher dados do gráfico de clientes
        dadosExemplo.ton_cliente.forEach(item => {
            clienteLabels.push(`${item.AD_TPPROD} - ${item.CODPARC} - ${item.PARCEIRO}`);
            clienteData.push(item.TON);
        });

        const barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: clienteLabels,
                datasets: [{
                    label: 'Quantidade',
                    data: clienteData,
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
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
