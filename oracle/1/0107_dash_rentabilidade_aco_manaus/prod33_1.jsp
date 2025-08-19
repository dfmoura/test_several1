<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> 
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
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
            font-size: 18px;
            font-weight: bold;
            color: #333;
            background-color: #fff; /* Cor de fundo para legibilidade */
            padding: 0 10px; /* Espaçamento horizontal */
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
            font-size: 17px;
            font-weight: bold;
            color: #333;
            left: 54%; /* Move o overlay 10% para a direita */
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
    <snk:query var="base">
        select 
        :A_DtInicial_Dia dia_ini,
        :A_DtInicial_Mes mes_ini,
        :A_DtInicial_Ano ano_ini,
        :A_DtFinal_Dia dia_fim,
        :A_DtFinal_Mes mes_fim,
        :A_DtFinal_Ano ano_fim
        from dual
    </snk:query>    

    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">Faturamento Grupo Produto</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <div class="chart-overlay" id="fatTotalOverlay"></div>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div class="part-title">Detalhamentos dos valores do CIP</div>
                <div class="chart-container">
                    <canvas id="doughnutChart1"></canvas>
                    <div class="chart-overlay" id="cipTotalOverlay"></div>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div class="part-title">Valores de venda por gerentes</div>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div class="part-title">Detalhamento por Produto</div>
                <div class="table-container">
                    <table id="table">
                        <thead>
                            <tr>
                                <th>Cód. Emp.</th>
                                <th>Tp. Produto</th>
                                <th>Cód. Prod.</th>
                                <th>Produto</th>
                                <th>Cód. Ger.</th>
                                <th>Gerente</th>
                                <th>Total Líq.</th>
                            </tr>
                        </thead>
                        <tbody id="produtoTableBody">
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

        // Dados para outros gráficos (mantidos para compatibilidade)
        const dadosFaturamento = {
            cipTotal: 850000.00,
            cipProduto: [
                { AD_TPPROD: 1, TIPOPROD: 'Produtos Alimentícios', VLRCIP_PERC: 306000.00 },
                { AD_TPPROD: 2, TIPOPROD: 'Bebidas', VLRCIP_PERC: 217600.00 },
                { AD_TPPROD: 3, TIPOPROD: 'Higiene Pessoal', VLRCIP_PERC: 190400.00 },
                { AD_TPPROD: 4, TIPOPROD: 'Limpeza', VLRCIP_PERC: 136000.00 }
            ],
            fatGer: [
                { AD_TPPROD: 1, CODGER: 101, GERENTE: 'João Silva', VLRFAT: 225000.00 },
                { AD_TPPROD: 1, CODGER: 102, GERENTE: 'Maria Santos', VLRFAT: 225000.00 },
                { AD_TPPROD: 2, CODGER: 103, GERENTE: 'Pedro Costa', VLRFAT: 160000.00 },
                { AD_TPPROD: 2, CODGER: 104, GERENTE: 'Ana Oliveira', VLRFAT: 160000.00 },
                { AD_TPPROD: 3, CODGER: 105, GERENTE: 'Carlos Lima', VLRFAT: 140000.00 },
                { AD_TPPROD: 3, CODGER: 106, GERENTE: 'Lucia Ferreira', VLRFAT: 140000.00 },
                { AD_TPPROD: 4, CODGER: 107, GERENTE: 'Roberto Alves', VLRFAT: 100000.00 },
                { AD_TPPROD: 4, CODGER: 108, GERENTE: 'Fernanda Rocha', VLRFAT: 100000.00 }
            ],
            fatProduto: [
                { CODEMP: 1, TIPOPROD: 'ALIMENTOS', CODPROD: 1001, PRODUTO: 'Arroz Integral', CODGER: 101, GERENTE: 'João Silva', TOTALLIQ: 75000.00 },
                { CODEMP: 1, TIPOPROD: 'ALIMENTOS', CODPROD: 1002, PRODUTO: 'Feijão Carioca', CODGER: 101, GERENTE: 'João Silva', TOTALLIQ: 50000.00 },
                { CODEMP: 1, TIPOPROD: 'ALIMENTOS', CODPROD: 1003, PRODUTO: 'Macarrão Espaguete', CODGER: 102, GERENTE: 'Maria Santos', TOTALLIQ: 45000.00 },
                { CODEMP: 1, TIPOPROD: 'ALIMENTOS', CODPROD: 1004, PRODUTO: 'Farinha de Trigo', CODGER: 102, GERENTE: 'Maria Santos', TOTALLIQ: 55000.00 },
                { CODEMP: 2, TIPOPROD: 'BEBIDAS', CODPROD: 2001, PRODUTO: 'Refrigerante Cola', CODGER: 103, GERENTE: 'Pedro Costa', TOTALLIQ: 80000.00 },
                { CODEMP: 2, TIPOPROD: 'BEBIDAS', CODPROD: 2002, PRODUTO: 'Suco de Laranja', CODGER: 103, GERENTE: 'Pedro Costa', TOTALLIQ: 40000.00 },
                { CODEMP: 2, TIPOPROD: 'BEBIDAS', CODPROD: 2003, PRODUTO: 'Água Mineral', CODGER: 104, GERENTE: 'Ana Oliveira', TOTALLIQ: 40000.00 },
                { CODEMP: 3, TIPOPROD: 'HIGIENE', CODPROD: 3001, PRODUTO: 'Sabonete', CODGER: 105, GERENTE: 'Carlos Lima', TOTALLIQ: 70000.00 },
                { CODEMP: 3, TIPOPROD: 'HIGIENE', CODPROD: 3002, PRODUTO: 'Shampoo', CODGER: 105, GERENTE: 'Carlos Lima', TOTALLIQ: 70000.00 },
                { CODEMP: 4, TIPOPROD: 'LIMPEZA', CODPROD: 4001, PRODUTO: 'Detergente', CODGER: 107, GERENTE: 'Roberto Alves', TOTALLIQ: 50000.00 },
                { CODEMP: 4, TIPOPROD: 'LIMPEZA', CODPROD: 4002, PRODUTO: 'Desinfetante', CODGER: 108, GERENTE: 'Fernanda Rocha', TOTALLIQ: 50000.00 }
            ]
        };

        // Função para converter data de DD/MM/YYYY para DD/MM/YYYY (já está no formato correto)
        function converterData(data) {
            if (!data) return '';
            // A data já está no formato DD/MM/YYYY, então retorna como está
            return data;
        }

        // Função para obter dados de faturamento por tipo de produto dinamicamente
        async function carregarDadosFaturamentoTipo() {
            try {
                // Obter datas dos campos (assumindo que existem campos com IDs dataInicio e dataFim)
                const dataInicio = document.getElementById('dataInicio') ? document.getElementById('dataInicio').value : '01/08/2025';
                const dataFim = document.getElementById('dataFim') ? document.getElementById('dataFim').value : '31/08/2028';
                
                // Converter datas para o formato correto
                const dataInicioFormatada = converterData(dataInicio);
                const dataFimFormatada = converterData(dataFim);

                // Obter empresas selecionadas (assumindo que existe um campo com ID empresas)
                const empresasInput = document.getElementById('empresas');
                let filtroEmpresa = '';
                
                if (empresasInput && empresasInput.value) {
                    const empresasSelecionadas = empresasInput.value.split(',').filter(value => value.trim() !== '');
                    if (empresasSelecionadas.length > 0) {
                        const empresasString = empresasSelecionadas.join(',');
                        filtroEmpresa = ` and codemp in (${empresasString})`;
                    }
                }

                // Consulta SQL para faturamento por tipo de produto
                const sql = `
                    WITH CTE AS (
                        SELECT 
                            descrgrupo_nivel1,
                            SUM(totalliq) AS totalliq,
                            ROW_NUMBER() OVER (ORDER BY SUM(totalliq) DESC) AS rn
                        FROM vw_rentabilidade_aco 
                        WHERE tipmov IN ('V', 'D')
                          AND ATIVO_TOP = 'S'
                          AND AD_COMPOE_FAT = 'S'
                          AND dtneg BETWEEN '${dataInicioFormatada}' and '${dataFimFormatada}' ${filtroEmpresa}
                        GROUP BY descrgrupo_nivel1
                    )
                    SELECT 
                        CASE 
                            WHEN rn <= 6 THEN descrgrupo_nivel1
                            ELSE 'Outros'
                        END AS descrgrupo_nivel1,
                        SUM(totalliq) AS totalliq
                    FROM CTE
                    GROUP BY CASE 
                                 WHEN rn <= 6 THEN descrgrupo_nivel1
                                 ELSE 'Outros'
                             END
                    ORDER BY totalliq DESC
                `;

                const resultado = await JX.consultar(sql);
                
                if (resultado && resultado.length > 0) {
                    // Atualizar os dados do gráfico
                    const fatTipoLabels = [];
                    const fatTipoData = [];
                    let fatTotal = 0;
                    
                    resultado.forEach(item => {
                        fatTipoLabels.push(item.descrgrupo_nivel1);
                        fatTipoData.push(item.totalliq);
                        fatTotal += item.totalliq;
                    });

                    // Atualizar o gráfico
                    atualizarGraficoFaturamento(fatTipoLabels, fatTipoData);
                    
                    // Atualizar o overlay com o total
                    document.getElementById('fatTotalOverlay').textContent = new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(fatTotal);
                    
                    console.log('Dados de faturamento carregados com sucesso:', resultado);
                } else {
                    console.log('Nenhum dado de faturamento encontrado');
                }
            } catch (error) {
                console.error('Erro ao carregar dados de faturamento:', error);
                // Em caso de erro, manter os dados padrão
            }
        }

        // Função para atualizar o gráfico de faturamento
        function atualizarGraficoFaturamento(labels, data) {
            if (doughnutChart) {
                doughnutChart.data.labels = labels;
                doughnutChart.data.datasets[0].data = data;
                doughnutChart.update();
            }
        }

        // Função para atualizar a query
        function ref_fat1(TIPOPROD) {
            const params1 = {'A_TPPROD': TIPOPROD};
            refreshDetails('html5_ax6oqii', params1); 
        }

        // Função para recarregar dados do gráfico (pode ser chamada quando necessário)
        function recarregarGraficoFaturamento() {
            carregarDadosFaturamentoTipo();
        }
/*
        // Função para abrir o novo nível
        function abrir(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_GERENTE': parseInt(grupo1)
             };
            var level = 'lvl_fcsg85';//Faturamento_1 - index 68
            
            openLevel(level, params);
        }
        
        function abrir_det(produto,gerente) {
            var params = {'A_CODPROD': parseInt(produto),
                        'A_GERENTE': parseInt(gerente)
            };
            var level = 'lvl_a129doi'; //Faturamento_3 - index70
            openLevel(level, params);
        }

        function abrir_cip(grupo) {
            var params = { 
                'A_TPPROD' : parseInt(grupo)
             };
            var level = 'lvl_t4arq4';
            
            openLevel(level, params);
        }        
*/
        // Função para preencher a tabela de produtos
        function preencherTabelaProdutos() {
            const tbody = document.getElementById('produtoTableBody');
            let total = 0;
            
            dadosFaturamento.fatProduto.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.CODEMP}</td>
                    <td>${item.TIPOPROD}</td>
                    <td onclick="abrir_det('${item.CODPROD}','${item.CODGER}')">${item.CODPROD}</td>
                    <td>${item.PRODUTO}</td>
                    <td>${item.CODGER}</td>
                    <td>${item.GERENTE}</td>
                    <td>${new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.TOTALLIQ)}</td>
                `;
                tbody.appendChild(row);
                total += item.TOTALLIQ;
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
                <td><b>${new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total)}</b></td>
            `;
            tbody.appendChild(totalRow);
        }

        // Função para atualizar os overlays dos gráficos
        function atualizarOverlays() {
            // fatTotalOverlay será atualizado pela função carregarDadosFaturamentoTipo()
            document.getElementById('cipTotalOverlay').textContent = new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(dadosFaturamento.cipTotal);
        }

        // Dados para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

        var fatTipoLabels = [];
        var fatTipoData = [];
        
        // Inicializar com arrays vazios (serão preenchidos pelos dados dinâmicos)
        // Os dados serão carregados pela função carregarDadosFaturamentoTipo()

        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: fatTipoLabels,
                datasets: [{
                    label: 'My Doughnut Chart',
                    data: fatTipoData,
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
                                return label + ': ' + formattedValue + ' (' + percentage + '%)';
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
                        var label = fatTipoLabels[index].split('-')[0];
                        ref_fat1(label);
                    }
                }   
            }
        });

        // Dados para o gráfico de rosca CIP
        const ctxDoughnut1 = document.getElementById('doughnutChart1').getContext('2d');

        var cipTipoLabels = [];
        var cipTipoData = [];
        
        dadosFaturamento.cipProduto.forEach(item => {
            cipTipoLabels.push(`${item.AD_TPPROD} - ${item.TIPOPROD}`);
            cipTipoData.push(item.VLRCIP_PERC);
        });        

        const doughnutChart1 = new Chart(ctxDoughnut1, {
            type: 'doughnut',
            data: {
                labels: cipTipoLabels,
                datasets: [{
                    label: 'CIP',
                    data: cipTipoData,
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
                                return label + ': ' + formattedValue + ' (' + percentage + '%)';
                            }
                        }
                    },
                    legend: {
                        position: 'left',
                        align: 'center', // Alinhamento vertical da legenda
                    }                    
                },
                onClick: function(evt, activeElements) {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const grupo = cipTipoLabels[index].split('-')[0];
                        //alert(grupo);
                        abrir_cip(grupo);
                    }
                }
            }
        });

        // Dados para o gráfico de barras verticais (direito)
        const ctxBarRight = document.getElementById('barChartRight').getContext('2d');

        const gerenteLabels = [];
        const gerenteData = [];
        
        dadosFaturamento.fatGer.forEach(item => {
            gerenteLabels.push(`${item.AD_TPPROD}-${item.CODGER}-${item.GERENTE}`);
            gerenteData.push(item.VLRFAT);
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
                        abrir(grupo,grupo1);
                    }
                }
            }
        });

        // Inicializar a página
        document.addEventListener('DOMContentLoaded', function() {
            preencherTabelaProdutos();
            atualizarOverlays();
            
            // Carregar dados de faturamento por tipo de produto dinamicamente
            carregarDadosFaturamentoTipo();
        });

    </script>
</body>
</html>
