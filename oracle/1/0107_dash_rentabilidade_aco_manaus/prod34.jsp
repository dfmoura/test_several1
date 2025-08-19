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
            transition: transform 0.3s ease; /* Adicionado para transição suave */
        }
        .part:hover {
           transform: translateY(-10px); /* Movimento para cima ao passar o mouse */
        }
        .part-title {
            position: absolute;
            top: 10px; /* Espaçamento do topo */
            left: 50%;
            transform: translateX(-50%);
            font-size: 15px;
            font-weight: bold;
            color: #333;
            background-color: #fff; /* Cor de fundo para legibilidade */
            padding: 0 15px; /* Espaçamento horizontal */
            text-align: center; /* Centraliza o texto */
            width: 80%; /* Aumenta a largura do título */
        }
        .chart-container {
            position: relative; /* Para posicionamento absoluto do overlay */
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
            left: 59%; /* Move o overlay 10% para a direita */
            transform: translateX(45%); /* Ajusta a posição do texto para centralizá-lo */
            /*text-align: center; Opcional, para centralizar o texto se ele tiver várias linhas */            
        }
        .dropdown-container {
            display: flex;
            justify-content: flex-start; /* Alinha o dropdown à esquerda */
            width: 100%;
        }
        .dropdown-container select {
            padding: 5px; /* Reduz o espaçamento interno */
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 12px; /* Reduz o tamanho da fonte */
            width: 100%;
            max-width: 150px; /* Limita a largura máxima do dropdown */
            height: 25px; /* Ajusta a altura */
            box-sizing: border-box; /* Inclui padding e border no cálculo da largura/altura */
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
        }
        .table-container table {
            width: 100%;
            border-collapse: collapse;
        }
        .table-container th, .table-container td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
            font-size: 12px; /* Ajuste o tamanho da fonte conforme necessário */
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

    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">
</head>
<body>

    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">Devolução por Motivo</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <div class="chart-overlay" id="totalOverlay"></div>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div class="part-title" id="bairroTitle">Devoluções por Cidade e Bairro</div>
                <div class="dropdown-container">
                    <select id="citySelect">
                        <!-- Opções serão preenchidas via JavaScript -->
                    </select>
                </div>                
                <div class="chart-container">
                    <canvas id="barChart"></canvas>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div class="part-title" id="vendedorTitle">Top 10 Dev. por Vendedor e por Motivo</div>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div class="part-title">Devoluções por Produto e por Motivo</div>
                <div class="table-container">
                    <table id="table">
                        <thead>
                            <tr>
                                <th>Cód. Mot.</th>
                                <th>Motivo</th>
                                <th>Cód. Prod.</th>
                                <th>Produto</th>
                                <th>Total Líq.</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
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
    <script src="https://cdn.datatables.net/1.11.3/js/jquery.dataTables.min.js"></script>
    <script>

        // Dados mockados para substituir as queries SQL
        const dadosMock = {
            motivo: [
                { CODHIST: 24, DESCRHIST: 'PRODUTO DEFEITUOSO', VLRDEVOL: 150000.00 },
                { CODHIST: 25, DESCRHIST: 'CLIENTE DESISTIU', VLRDEVOL: 120000.00 },
                { CODHIST: 26, DESCRHIST: 'PRODUTO DANIFICADO', VLRDEVOL: 95000.00 },
                { CODHIST: 27, DESCRHIST: 'ERRO NO PEDIDO', VLRDEVOL: 80000.00 },
                { CODHIST: 28, DESCRHIST: 'PRODUTO VENCIDO', VLRDEVOL: 65000.00 },
                { CODHIST: 9999, DESCRHIST: 'OUTROS MOTIVOS', VLRDEVOL: 45000.00 }
            ],
            tot_motivo: [
                { VLRDEVOL: 555000.00 }
            ],
            cidade: [
                { NOMECID: 'MANAUS' },
                { NOMECID: 'PARINTINS' },
                { NOMECID: 'ITACOATIARA' },
                { NOMECID: 'MANACAPURU' },
                { NOMECID: 'COARI' }
            ],
            bairro: [
                { CODHIST: 24, DESCRHIST: 'PRODUTO DEFEITUOSO', CODCID: 1, NOMECID: 'MANAUS', CODBAI: 101, NOMEBAI: 'CENTRO', VLRDEVOL: 50000.00 },
                { CODHIST: 24, DESCRHIST: 'PRODUTO DEFEITUOSO', CODCID: 1, NOMECID: 'MANAUS', CODBAI: 102, NOMEBAI: 'ADRIANÓPOLIS', VLRDEVOL: 35000.00 },
                { CODHIST: 25, DESCRHIST: 'CLIENTE DESISTIU', CODCID: 1, NOMECID: 'MANAUS', CODBAI: 101, NOMEBAI: 'CENTRO', VLRDEVOL: 40000.00 },
                { CODHIST: 25, DESCRHIST: 'CLIENTE DESISTIU', CODCID: 1, NOMECID: 'MANAUS', CODBAI: 102, NOMEBAI: 'ADRIANÓPOLIS', VLRDEVOL: 30000.00 },
                { CODHIST: 26, DESCRHIST: 'PRODUTO DANIFICADO', CODCID: 2, NOMECID: 'PARINTINS', CODBAI: 201, NOMEBAI: 'CENTRO', VLRDEVOL: 45000.00 },
                { CODHIST: 27, DESCRHIST: 'ERRO NO PEDIDO', CODCID: 2, NOMECID: 'PARINTINS', CODBAI: 202, NOMEBAI: 'SÃO LÁZARO', VLRDEVOL: 35000.00 },
                { CODHIST: 28, DESCRHIST: 'PRODUTO VENCIDO', CODCID: 3, NOMECID: 'ITACOATIARA', CODBAI: 301, NOMEBAI: 'CENTRO', VLRDEVOL: 30000.00 },
                { CODHIST: 9999, DESCRHIST: 'OUTROS MOTIVOS', CODCID: 3, NOMECID: 'ITACOATIARA', CODBAI: 302, NOMEBAI: 'SÃO FRANCISCO', VLRDEVOL: 25000.00 }
            ],
            vendedor: [
                { CODHIST: 24, CODVEND: 1001, VENDEDOR: 'JOÃO SILVA', VLRDEVOL: 25000.00 },
                { CODHIST: 24, CODVEND: 1002, VENDEDOR: 'MARIA SANTOS', VLRDEVOL: 22000.00 },
                { CODHIST: 25, CODVEND: 1003, VENDEDOR: 'PEDRO OLIVEIRA', VLRDEVOL: 20000.00 },
                { CODHIST: 25, CODVEND: 1004, VENDEDOR: 'ANA COSTA', VLRDEVOL: 18000.00 },
                { CODHIST: 26, CODVEND: 1005, VENDEDOR: 'CARLOS LIMA', VLRDEVOL: 17000.00 },
                { CODHIST: 26, CODVEND: 1006, VENDEDOR: 'LUCIA FERREIRA', VLRDEVOL: 15000.00 },
                { CODHIST: 27, CODVEND: 1007, VENDEDOR: 'ROBERTO ALVES', VLRDEVOL: 14000.00 },
                { CODHIST: 27, CODVEND: 1008, VENDEDOR: 'FERNANDA RIBEIRO', VLRDEVOL: 12000.00 },
                { CODHIST: 28, CODVEND: 1009, VENDEDOR: 'MARCOS PEREIRA', VLRDEVOL: 11000.00 },
                { CODHIST: 9999, CODVEND: 1010, VENDEDOR: 'JULIANA MARTINS', VLRDEVOL: 10000.00 }
            ],
            motivo_prod: [
                { CODHIST: 24, DESCRHIST: 'PRODUTO DEFEITUOSO', CODPROD: 1001, DESCRPROD: 'SMARTPHONE SAMSUNG', VLRDEVOL: 30000.00 },
                { CODHIST: 24, DESCRHIST: 'PRODUTO DEFEITUOSO', CODPROD: 1002, DESCRPROD: 'NOTEBOOK DELL', VLRDEVOL: 25000.00 },
                { CODHIST: 25, DESCRHIST: 'CLIENTE DESISTIU', CODPROD: 1003, DESCRPROD: 'TV LG 55"', VLRDEVOL: 20000.00 },
                { CODHIST: 25, DESCRHIST: 'CLIENTE DESISTIU', CODPROD: 1004, DESCRPROD: 'GELADEIRA BRASTEMP', VLRDEVOL: 18000.00 },
                { CODHIST: 26, DESCRHIST: 'PRODUTO DANIFICADO', CODPROD: 1005, DESCRPROD: 'MICROONDAS PANASONIC', VLRDEVOL: 15000.00 },
                { CODHIST: 26, DESCRHIST: 'PRODUTO DANIFICADO', CODPROD: 1006, DESCRPROD: 'AR CONDICIONADO SPLIT', VLRDEVOL: 12000.00 },
                { CODHIST: 27, DESCRHIST: 'ERRO NO PEDIDO', CODPROD: 1007, DESCRPROD: 'FONE DE OUVIDO JBL', VLRDEVOL: 10000.00 },
                { CODHIST: 28, DESCRHIST: 'PRODUTO VENCIDO', CODPROD: 1008, DESCRPROD: 'ALIMENTOS PERECÍVEIS', VLRDEVOL: 8000.00 },
                { CODHIST: 9999, DESCRHIST: 'OUTROS MOTIVOS', CODPROD: 1009, DESCRPROD: 'ACESSÓRIOS DIVERSOS', VLRDEVOL: 6000.00 }
            ]
        };

        // Função para atualizar a query
        function ref_mot(motivo) {
            const params = {'A_CODHIST': motivo};
            refreshDetails('html5_a7wgptm', params); 
        }   
/*
        // Função para abrir o novo nível
        function abrir_det_bai(motivo,cidade,bairro) {
            var params = {'A_MOTIVO': parseInt(motivo),
                        'A_CIDADE': parseInt(cidade),
                        'A_BAIRRO': parseInt(bairro)
            };
            var level = 'lvl_steru4';
            openLevel(level, params);
        }

        function abrir_det_ven(motivo,vendedor) {
            var params = {'A_MOTIVO': parseInt(motivo),
                        'A_VENDEDOR': parseInt(vendedor)
            };
            var level = 'lvl_steru4';
            openLevel(level, params);
        }

        function abrir_det_prod(motivo,produto) {
            var params = {'A_MOTIVO': parseInt(motivo),
                        'A_PRODUTO': parseInt(produto)
            };
            var level = 'lvl_steru4';
            openLevel(level, params);
        }        
*/
        // Função para preencher o dropdown de cidades
        function preencherDropdownCidades() {
            const select = document.getElementById('citySelect');
            select.innerHTML = '';
            
            dadosMock.cidade.forEach(cidade => {
                const option = document.createElement('option');
                option.value = cidade.NOMECID;
                option.textContent = cidade.NOMECID;
                select.appendChild(option);
            });
        }

        // Função para preencher a tabela de produtos
        function preencherTabelaProdutos() {
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';
            
            let total = 0;
            
            dadosMock.motivo_prod.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.CODHIST}</td>
                    <td>${row.DESCRHIST}</td>
                    <td onclick="abrir_det_prod('${row.CODHIST}','${row.CODPROD}')">${row.CODPROD}</td>
                    <td>${row.DESCRPROD}</td>
                    <td>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.VLRDEVOL)}</td>
                `;
                tbody.appendChild(tr);
                total += row.VLRDEVOL;
            });
            
            // Adicionar linha de total
            const trTotal = document.createElement('tr');
            trTotal.innerHTML = `
                <td><b>Total</b></td>
                <td></td>
                <td></td>
                <td></td>
                <td><b>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</b></td>
            `;
            tbody.appendChild(trTotal);
        }

        // Função para atualizar o título do gráfico de bairros
        function atualizarTituloBairro() {
            const titulo = document.getElementById('bairroTitle');
            if (dadosMock.bairro.length > 0) {
                titulo.textContent = `Devoluções por Cidade e Bairro - ${dadosMock.bairro[0].DESCRHIST}`;
            }
        }

        // Função para atualizar o título do gráfico de vendedores
        function atualizarTituloVendedor() {
            const titulo = document.getElementById('vendedorTitle');
            if (dadosMock.bairro.length > 0) {
                titulo.textContent = `Top 10 Dev. por Vendedor e por Motivo - ${dadosMock.bairro[0].DESCRHIST}`;
            }
        }

        // Função para atualizar o overlay do total
        function atualizarOverlayTotal() {
            const overlay = document.getElementById('totalOverlay');
            if (dadosMock.tot_motivo.length > 0) {
                overlay.textContent = new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(dadosMock.tot_motivo[0].VLRDEVOL);
            }
        }

        // Dados para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

        var motivos = [];
        var valoresDevolucao = [];
        
        dadosMock.motivo.forEach(row => {
            motivos.push(`${row.CODHIST} - ${row.DESCRHIST}`);
            valoresDevolucao.push(row.VLRDEVOL);
        });

        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: motivos,
                datasets: [{
                    label: 'My Doughnut Chart',
                    data: valoresDevolucao,
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
                cutout: '50%',
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                let value = context.raw || 0;
                                let total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                let percentage = ((value / total) * 100).toFixed(2);
                                let formattedValue = new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
                                return label + ': ' + formattedValue;
                            }
                        }
                    },
                    legend: {
                        position: 'left',
                        align: 'center', // Alinhamento vertical da legenda
                    }                    
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var label = motivos[index].split('-')[0];
                        //alert(label);
                        ref_mot(label);
                    }
                }   
            }
        });

        // Função para atualizar o gráfico de barras com base na cidade selecionada
        function updateBarChart(city) {
            var bairros = [];
            var valores = [];
            
            dadosMock.bairro.forEach(row => {
                if (row.NOMECID === city) {
                    bairros.push(`${row.CODHIST}-${row.CODCID}-${row.CODBAI}-${row.NOMEBAI}`);
                    valores.push(row.VLRDEVOL);
                }
            });

            barChart.data.labels = bairros;
            barChart.data.datasets[0].data = valores;
            barChart.update();
        }

        // Criação do gráfico de barras
        const ctxBar = document.getElementById('barChart').getContext('2d');
        const barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: [], // Inicialmente vazio
                datasets: [{
                    label: 'Devoluções',
                    data: [],
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
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var label = barChart.data.labels[index].split('-')[0];
                        var label1 = barChart.data.labels[index].split('-')[1];
                        var label2 = barChart.data.labels[index].split('-')[2];
                        abrir_det_bai(label,label1,label2);
                        //ref_fat1(label);
                    }
                } 
            }
        });        

        // Dados para o gráfico de barras verticais (direito)
        const ctxBarRight = document.getElementById('barChartRight').getContext('2d');

        const vendedorLabels = dadosMock.vendedor.map(row => `${row.CODHIST}-${row.CODVEND}-${row.VENDEDOR}`);
        const vendedorData = dadosMock.vendedor.map(row => row.VLRDEVOL);

        const barChartRight = new Chart(ctxBarRight, {
            type: 'bar',
            data: {
                labels: vendedorLabels,
                datasets: [{
                    label: 'Devoluções',
                    data: vendedorData,
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
                        const grupo = vendedorLabels[index].split('-')[0];
                        const grupo1 = vendedorLabels[index].split('-')[1];
                        abrir_det_ven(grupo,grupo1);
                    }
                }
            }
        });

        // Listener para o dropdown
        $('#citySelect').on('change', function() {
            var selectedCity = $(this).val();
            updateBarChart(selectedCity);
        });

        // Inicialização quando o documento estiver pronto
        $(document).ready(function() {
            // Preencher elementos da interface
            preencherDropdownCidades();
            preencherTabelaProdutos();
            atualizarTituloBairro();
            atualizarTituloVendedor();
            atualizarOverlayTotal();
            
            // Inicializa o gráfico de barras com a primeira cidade
            var firstCity = $('#citySelect').val();
            updateBarChart(firstCity);
        });
        

    </script>
</body>
</html>
