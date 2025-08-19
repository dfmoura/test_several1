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
    <title>Página com Cards</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.3/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.3/js/dataTables.bootstrap5.min.js"></script>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.3/css/jquery.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.3/css/dataTables.bootstrap5.min.css">
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> 
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>    
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

    <div class="container">
        <div class="half-row">
            <div class="column">
                <div class="card">
                    <h2>Custo Médio por Empresa de Produtos Faturados</h2>
                    <div class="chart-container">
                        <canvas id="doughnutChart2"></canvas>
                        <div class="chart-overlay" id="overlay-emp">R$ 0</div>
                    </div>
                </div>
            </div>
            <div class="column">
                <div class="card">
                    <h2>Custo Médio por TOP de Produtos Faturados</h2>
                    <div class="chart-container">
                        <canvas id="doughnutChart1"></canvas>
                        <div class="chart-overlay" id="overlay-top">R$ 0</div>
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
                        <div class="chart-overlay" id="overlay-tipo">R$ 0</div>
                    </div>
                </div>
            </div>
            <div class="column">
                <div class="card">
                    <h2>Custo Médio dos Produtos Faturados</h2>
                    <div class="table-container">
                        <table id="produtosTable">
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
                            <tbody id="produtosTableBody">
                                <!-- Dados serão preenchidos via JavaScript -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>           
        </div>
    </div>
    
    <script>

   // Função para atualizar a query
   function ref_cus_emp(codemp) {
        const params = {'A_CODEMP': codemp};
        refreshDetails('html5_a73fhga', params); 
    }       
 
 /*  

   // Função para abrir tela


   function abrir_prod(grupo,grupo1) {
            var params = { 'A_CODEMP' : parseInt(grupo),
                           'A_CODPROD' : parseInt(grupo1)
             };
            var level = 'lvl_ye79i5';            
            openLevel(level, params);
        }       


        function abrir_top(grupo,grupo1) {
            var params = { 'A_CODEMP' : parseInt(grupo),
                           'A_TOP' : parseInt(grupo1)
             };
            var level = 'lvl_ye79i5';            
            openLevel(level, params);
        }


        function abrir_tpprod(grupo,grupo1) {
            var params = { 'A_CODEMP' : parseInt(grupo),
                           'A_TPPROD' : parseInt(grupo1)
             };
            var level = 'lvl_ye79i5';            
            openLevel(level, params);
        }
*/
        // Dados de exemplo para substituir as queries
        const dadosExemplo = {
            // Dados para custo por empresa
            custoEmp: [
                { CODEMP: 1, EMPRESA: 'Empresa A', CUSMEDSICM_TOT: 150000.00 },
                { CODEMP: 2, EMPRESA: 'Empresa B', CUSMEDSICM_TOT: 220000.00 },
                { CODEMP: 3, EMPRESA: 'Empresa C', CUSMEDSICM_TOT: 180000.00 }
            ],
            
            // Dados para custo por TOP
            custoTop: [
                { CODEMP: 1, CODTIPOPER: 1001, DESCROPER: 'Venda Direta', CUSMEDSICM_TOT: 80000.00 },
                { CODEMP: 1, CODTIPOPER: 1002, DESCROPER: 'Venda Consignada', CUSMEDSICM_TOT: 70000.00 },
                { CODEMP: 2, CODTIPOPER: 2001, DESCROPER: 'Venda Atacado', CUSMEDSICM_TOT: 120000.00 },
                { CODEMP: 2, CODTIPOPER: 2002, DESCROPER: 'Venda Varejo', CUSMEDSICM_TOT: 100000.00 },
                { CODEMP: 3, CODTIPOPER: 3001, DESCROPER: 'Venda E-commerce', CUSMEDSICM_TOT: 90000.00 },
                { CODEMP: 3, CODTIPOPER: 3002, DESCROPER: 'Venda Telemarketing', CUSMEDSICM_TOT: 90000.00 }
            ],
            
            // Dados para custo por tipo de produto
            custoTipo: [
                { CODEMP: 1, AD_TPPROD: 1, TIPOPROD: 'Produto A', CUSMEDSICM_TOT: 60000.00 },
                { CODEMP: 1, AD_TPPROD: 2, TIPOPROD: 'Produto B', CUSMEDSICM_TOT: 90000.00 },
                { CODEMP: 2, AD_TPPROD: 3, TIPOPROD: 'Produto C', CUSMEDSICM_TOT: 110000.00 },
                { CODEMP: 2, AD_TPPROD: 4, TIPOPROD: 'Produto D', CUSMEDSICM_TOT: 110000.00 },
                { CODEMP: 3, AD_TPPROD: 5, TIPOPROD: 'Produto E', CUSMEDSICM_TOT: 90000.00 },
                { CODEMP: 3, AD_TPPROD: 6, TIPOPROD: 'Produto F', CUSMEDSICM_TOT: 90000.00 }
            ],
            
            // Dados para produtos
            custoProduto: [
                { CODEMP: 1, CODTIPOPER: 1001, AD_TPPROD: 1, TIPOPROD: 'Produto A', CODPROD: 1001, DESCRPROD: 'Produto A - Modelo 1', CUSMEDSICM_TOT: 30000.00 },
                { CODEMP: 1, CODTIPOPER: 1001, AD_TPPROD: 1, TIPOPROD: 'Produto A', CODPROD: 1002, DESCRPROD: 'Produto A - Modelo 2', CUSMEDSICM_TOT: 30000.00 },
                { CODEMP: 1, CODTIPOPER: 1002, AD_TPPROD: 2, TIPOPROD: 'Produto B', CODPROD: 2001, DESCRPROD: 'Produto B - Modelo 1', CUSMEDSICM_TOT: 35000.00 },
                { CODEMP: 1, CODTIPOPER: 1002, AD_TPPROD: 2, TIPOPROD: 'Produto B', CODPROD: 2002, DESCRPROD: 'Produto B - Modelo 2', CUSMEDSICM_TOT: 35000.00 },
                { CODEMP: 2, CODTIPOPER: 2001, AD_TPPROD: 3, TIPOPROD: 'Produto C', CODPROD: 3001, DESCRPROD: 'Produto C - Modelo 1', CUSMEDSICM_TOT: 55000.00 },
                { CODEMP: 2, CODTIPOPER: 2001, AD_TPPROD: 3, TIPOPROD: 'Produto C', CODPROD: 3002, DESCRPROD: 'Produto C - Modelo 2', CUSMEDSICM_TOT: 55000.00 },
                { CODEMP: 2, CODTIPOPER: 2002, AD_TPPROD: 4, TIPOPROD: 'Produto D', CODPROD: 4001, DESCRPROD: 'Produto D - Modelo 1', CUSMEDSICM_TOT: 50000.00 },
                { CODEMP: 2, CODTIPOPER: 2002, AD_TPPROD: 4, TIPOPROD: 'Produto D', CODPROD: 4002, DESCRPROD: 'Produto D - Modelo 2', CUSMEDSICM_TOT: 50000.00 },
                { CODEMP: 3, CODTIPOPER: 3001, AD_TPPROD: 5, TIPOPROD: 'Produto E', CODPROD: 5001, DESCRPROD: 'Produto E - Modelo 1', CUSMEDSICM_TOT: 45000.00 },
                { CODEMP: 3, CODTIPOPER: 3001, AD_TPPROD: 5, TIPOPROD: 'Produto E', CODPROD: 5002, DESCRPROD: 'Produto E - Modelo 2', CUSMEDSICM_TOT: 45000.00 },
                { CODEMP: 3, CODTIPOPER: 3002, AD_TPPROD: 6, TIPOPROD: 'Produto F', CODPROD: 6001, DESCRPROD: 'Produto F - Modelo 1', CUSMEDSICM_TOT: 45000.00 },
                { CODEMP: 3, CODTIPOPER: 3002, AD_TPPROD: 6, TIPOPROD: 'Produto F', CODPROD: 6002, DESCRPROD: 'Produto F - Modelo 2', CUSMEDSICM_TOT: 45000.00 }
            ]
        };

        // Função para preencher a tabela de produtos
        function preencherTabelaProdutos() {
            const tbody = document.getElementById('produtosTableBody');
            let total = 0;
            
            dadosExemplo.custoProduto.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.CODEMP}</td>
                    <td>${item.CODTIPOPER}</td>
                    <td>${item.AD_TPPROD}</td>
                    <td>${item.TIPOPROD}</td>
                    <td onclick="abrir_prod('${item.CODEMP}','${item.CODPROD}')">${item.CODPROD}</td>
                    <td>${item.DESCRPROD}</td>
                    <td>${item.CUSMEDSICM_TOT.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                `;
                tbody.appendChild(row);
                total += item.CUSMEDSICM_TOT;
            });
            
            // Adicionar linha de total
            const totalRow = document.createElement('tr');
            totalRow.innerHTML = `
                <td><b>Total</b></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td><b>${total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</b></td>
            `;
            tbody.appendChild(totalRow);
        }

        // Função para atualizar os overlays dos gráficos
        function atualizarOverlays() {
            // Calcular totais
            const totalEmp = dadosExemplo.custoEmp.reduce((sum, item) => sum + item.CUSMEDSICM_TOT, 0);
            const totalTop = dadosExemplo.custoTop.reduce((sum, item) => sum + item.CUSMEDSICM_TOT, 0);
            const totalTipo = dadosExemplo.custoTipo.reduce((sum, item) => sum + item.CUSMEDSICM_TOT, 0);
            
            // Atualizar overlays
            document.getElementById('overlay-emp').textContent = `R$ ${totalEmp.toLocaleString('pt-BR')}`;
            document.getElementById('overlay-top').textContent = `R$ ${totalTop.toLocaleString('pt-BR')}`;
            document.getElementById('overlay-tipo').textContent = `R$ ${totalTipo.toLocaleString('pt-BR')}`;
        }

        // Obtendo os dados da query JSP para o gráfico de rosca - TPPROD
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

        var custoTipoLabel = [];
        var custoTipoData = [];
        
        // Preencher dados do tipo de produto
        dadosExemplo.custoTipo.forEach(item => {
            custoTipoLabel.push(`${item.CODEMP} - ${item.AD_TPPROD} - ${item.TIPOPROD}`);
            custoTipoData.push(parseFloat(item.CUSMEDSICM_TOT));
        });
    
        // Dados fictícios para o gráfico de rosca
        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: custoTipoLabel,
                datasets: [{
                    label: 'Custo',
                    data: custoTipoData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)','rgba(54, 162, 235, 0.2)','rgba(255, 206, 86, 0.2)','rgba(75, 192, 192, 0.2)','rgba(153, 102, 255, 0.2)','rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)','rgba(54, 162, 235, 1)','rgba(255, 206, 86, 1)','rgba(75, 192, 192, 1)','rgba(153, 102, 255, 1)','rgba(255, 159, 64, 1)'
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
                        var label = custoTipoLabel[index].split('-')[0];
                        var label1 = custoTipoLabel[index].split('-')[1];
                        abrir_tpprod(label,label1);
                        
                    }
                }
            }
        });



        // Obtendo os dados da query JSP para o gráfico de rosca - TOP
        const ctxDoughnut1 = document.getElementById('doughnutChart1').getContext('2d');

        var custoTopLabel = [];
        var custoTopData = [];
        
        // Preencher dados do TOP
        dadosExemplo.custoTop.forEach(item => {
            custoTopLabel.push(`${item.CODEMP} - ${item.CODTIPOPER} - ${item.DESCROPER}`);
            custoTopData.push(parseFloat(item.CUSMEDSICM_TOT));
        });
    
        // Dados fictícios para o gráfico de rosca
        const doughnutChart1 = new Chart(ctxDoughnut1, {
            type: 'doughnut',
            data: {
                labels: custoTopLabel,
                datasets: [{
                    label: 'Custo',
                    data: custoTopData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)','rgba(54, 162, 235, 0.2)','rgba(255, 206, 86, 0.2)','rgba(75, 192, 192, 0.2)','rgba(153, 102, 255, 0.2)','rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)','rgba(54, 162, 235, 1)','rgba(255, 206, 86, 1)','rgba(75, 192, 192, 1)','rgba(153, 102, 255, 1)','rgba(255, 159, 64, 1)'
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
                        var label = custoTopLabel[index].split('-')[0];
                        var label1 = custoTopLabel[index].split('-')[1];
                        abrir_top(label,label1);
                        
                    }
                }
            }
        });



        // Obtendo os dados da query JSP para o gráfico de rosca - EMP
        const ctxDoughnut2 = document.getElementById('doughnutChart2').getContext('2d');

        var custoEmpLabel = [];
        var custoEmpData = [];
        
        // Preencher dados da empresa
        dadosExemplo.custoEmp.forEach(item => {
            custoEmpLabel.push(`${item.CODEMP} - ${item.EMPRESA}`);
            custoEmpData.push(parseFloat(item.CUSMEDSICM_TOT));
        });
    
        // Dados fictícios para o gráfico de rosca
        const doughnutChart2 = new Chart(ctxDoughnut2, {
            type: 'doughnut',
            data: {
                labels: custoEmpLabel,
                datasets: [{
                    label: 'Custo',
                    data: custoEmpData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)','rgba(54, 162, 235, 0.2)','rgba(255, 206, 86, 0.2)','rgba(75, 192, 192, 0.2)','rgba(153, 102, 255, 0.2)','rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)','rgba(54, 162, 235, 1)','rgba(255, 206, 86, 1)','rgba(75, 192, 192, 1)','rgba(153, 102, 255, 1)','rgba(255, 159, 64, 1)'
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
                        var label = custoEmpLabel[index].split('-')[0];
                        
                        ref_cus_emp(label);
                        
                    }
                }
            }
        });

        function copiar(texto) {

            const elementoTemporario = document.createElement('textarea');
            elementoTemporario.value = texto;
            document.body.appendChild(elementoTemporario);
            elementoTemporario.select();
            document.execCommand('copy');
            document.body.removeChild(elementoTemporario);

            //alert('Texto copiado: ' + texto);
        }

        // Inicializar a página
        document.addEventListener('DOMContentLoaded', function() {
            preencherTabelaProdutos();
            atualizarOverlays();
        });

        </script>
</body>
</html>
