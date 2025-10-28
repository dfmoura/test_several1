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
<title>Dashboard Fechamento Plus</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>

<style>
    /* Estilos base */
    body {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        padding-top: 60px !important;
        min-height: 100vh;
    }

    /* Fixed header styles */
    .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 60px;
        background: linear-gradient(135deg, #008a70, #00695e);
        box-shadow: 0 4px 20px rgba(0, 138, 112, 0.3);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 20px;
    }
    
    .header-logo {
        position: absolute;
        left: 20px;
        display: flex;
        align-items: center;
    }
    
    .header-logo img {
        width: 40px;
        height: auto;
        filter: brightness(0) invert(1);
        transition: transform 0.3s ease;
    }
    
    .header-logo img:hover {
        transform: scale(1.1);
    }
    
    .header-title {
        color: white;
        font-size: 1.8rem;
        font-weight: 700;
        margin: 0;
        text-align: center;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        letter-spacing: 1px;
    }

    /* Container principal */
    .main-container {
        padding: 30px 20px;
        max-width: 1400px;
        margin: 0 auto;
    }

    /* Cards superiores */
    .dashboard-card {
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        border: none;
        overflow: hidden;
        height: 160px;
        position: relative;
    }

    .dashboard-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    .dashboard-card .card-body {
        padding: 25px;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
    }

    .card-icon {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
    }

    .card-title {
        font-size: 14px;
        font-weight: 600;
        color: #6e6e6e;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .card-value {
        font-size: 28px;
        font-weight: 800;
        color: #2c3e50;
        margin-bottom: 5px;
        line-height: 1.2;
    }

    .card-subtitle {
        font-size: 12px;
        color: #9c9c9c;
        font-weight: 500;
    }

    /* Cores específicas dos cards */
    .card-faturamento .card-icon {
        background: linear-gradient(135deg, #00afa0, #008a70);
    }

    .card-meta .card-icon {
        background: linear-gradient(135deg, #00b4cd, #00695e);
    }

    .card-atingido .card-icon {
        background: linear-gradient(135deg, #50af32, #a2c73b);
    }

    .card-comissao .card-icon {
        background: linear-gradient(135deg, #ffb914, #f56e1e);
    }

    /* Seção de gráficos */
    .charts-section {
        margin-top: 40px;
    }

    .chart-container {
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        padding: 30px;
        margin-bottom: 30px;
        height: 450px;
    }

    .chart-title {
        font-size: 20px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 20px;
        text-align: center;
        position: relative;
    }

    .chart-title::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 3px;
        background: linear-gradient(135deg, #008a70, #00afa0);
        border-radius: 2px;
    }

    .chart-wrapper {
        height: 350px;
        position: relative;
    }

    /* Loading states */
    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        flex-direction: column;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #008a70;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .loading-text {
        color: #6e6e6e;
        font-size: 14px;
        font-weight: 500;
    }

    /* Responsividade */
    @media (max-width: 768px) {
        .header-title {
            font-size: 1.4rem;
        }
        
        .header-logo {
            left: 10px;
        }
        
        .header-logo img {
            width: 35px;
        }
        
        .fixed-header {
            height: 50px;
            padding: 0 10px;
        }
        
        body {
            padding-top: 50px !important;
        }

        .main-container {
            padding: 20px 15px;
        }

        .dashboard-card {
            height: 140px;
            margin-bottom: 20px;
        }

        .dashboard-card .card-body {
            padding: 20px;
        }

        .card-value {
            font-size: 24px;
        }

        .chart-container {
            padding: 20px;
            height: 400px;
        }

        .chart-wrapper {
            height: 300px;
        }
    }

    @media (max-width: 576px) {
        .main-container {
            padding: 15px 10px;
        }

        .dashboard-card {
            height: 120px;
        }

        .dashboard-card .card-body {
            padding: 15px;
        }

        .card-value {
            font-size: 20px;
        }

        .card-icon {
            width: 40px;
            height: 40px;
            font-size: 20px;
        }
    }
</style>
</head>

<body>
    <!-- Fixed Header -->
    <div class="fixed-header">
        <div class="header-logo">
            <a href="https://neuon.com.br/" target="_blank" rel="noopener noreferrer">
                <img src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg" alt="Neuon Logo">
            </a>
        </div>
        <h1 class="header-title">Dashboard Fechamento Plus</h1>
    </div>

    <div class="main-container">
        <!-- Cards Superiores -->
        <div class="row mb-4">
            <div class="col-lg-3 col-md-6 mb-4">
                <div class="card dashboard-card card-faturamento">
                    <div class="card-body">
                        <div class="card-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div>
                            <div class="card-title">Faturamento</div>
                            <div class="card-value" id="faturamento-valor">R$ 0,00</div>
                            <div class="card-subtitle">Valor Real</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-3 col-md-6 mb-4">
                <div class="card dashboard-card card-meta">
                    <div class="card-body">
                        <div class="card-icon">
                            <i class="fas fa-target"></i>
                        </div>
                        <div>
                            <div class="card-title">Meta</div>
                            <div class="card-value" id="meta-valor">R$ 0,00</div>
                            <div class="card-subtitle">Valor Previsto</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-3 col-md-6 mb-4">
                <div class="card dashboard-card card-atingido">
                    <div class="card-body">
                        <div class="card-icon">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div>
                            <div class="card-title">% Atingido</div>
                            <div class="card-value" id="atingido-valor">0%</div>
                            <div class="card-subtitle">Meta Atingida</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-3 col-md-6 mb-4">
                <div class="card dashboard-card card-comissao">
                    <div class="card-body">
                        <div class="card-icon">
                            <i class="fas fa-coins"></i>
                        </div>
                        <div>
                            <div class="card-title">Comissão Plus</div>
                            <div class="card-value" id="comissao-valor">R$ 0,00</div>
                            <div class="card-subtitle">Valor Benefício</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Seção de Gráficos -->
        <div class="charts-section">
            <div class="row">
                <!-- Gráfico de Linha - Real x Meta Mês a Mês -->
                <div class="col-lg-6 mb-4">
                    <div class="chart-container">
                        <h3 class="chart-title">Real x Meta - Evolução Mensal</h3>
                        <div class="chart-wrapper">
                            <canvas id="lineChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Gráfico de Colunas - Top 10 Vendedores -->
                <div class="col-lg-6 mb-4">
                    <div class="chart-container">
                        <h3 class="chart-title">Top 10 Vendedores - Real x Meta</h3>
                        <div class="chart-wrapper">
                            <canvas id="barChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Variáveis globais para os gráficos
        let lineChart = null;
        let barChart = null;
        
        // Função para formatar valores monetários
        function formatCurrency(value) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        }

        // Função para formatar percentuais
        function formatPercentage(value) {
            return value.toFixed(1) + '%';
        }

        // Função para carregar dados dos cards (dados fictícios)
        async function loadCardsData() {
            try {
                // Dados fictícios simulados
                const vlrReal = 2850000.50;      // Faturamento real
                const vlrPrev = 3200000.00;      // Meta prevista
                const vlrComissao = 45000.75;    // Comissão Plus
                const percentualAtingido = vlrPrev > 0 ? (vlrReal / vlrPrev) * 100 : 0;

                // Simular delay de carregamento
                await new Promise(resolve => setTimeout(resolve, 800));

                // Atualizar cards
                document.getElementById('faturamento-valor').textContent = formatCurrency(vlrReal);
                document.getElementById('meta-valor').textContent = formatCurrency(vlrPrev);
                document.getElementById('atingido-valor').textContent = formatPercentage(percentualAtingido);
                document.getElementById('comissao-valor').textContent = formatCurrency(vlrComissao);

                // Aplicar cores baseadas no percentual atingido
                const atingidoElement = document.getElementById('atingido-valor');
                if (percentualAtingido >= 100) {
                    atingidoElement.style.color = '#50af32'; // Verde
                } else if (percentualAtingido >= 80) {
                    atingidoElement.style.color = '#ffb914'; // Amarelo
                } else {
                    atingidoElement.style.color = '#e30613'; // Vermelho
                }

            } catch (error) {
                console.error('Erro ao carregar dados dos cards:', error);
                // Definir valores padrão em caso de erro
                document.getElementById('faturamento-valor').textContent = 'R$ 0,00';
                document.getElementById('meta-valor').textContent = 'R$ 0,00';
                document.getElementById('atingido-valor').textContent = '0%';
                document.getElementById('comissao-valor').textContent = 'R$ 0,00';
            }
        }

        // Função para carregar dados do gráfico de linha (dados fictícios)
        async function loadLineChartData() {
            try {
                // Dados fictícios para evolução mensal
                const data = [
                    { MES_ANO: '01/2024', VLR_REAL: 1800000, VLR_PREV: 2000000 },
                    { MES_ANO: '02/2024', VLR_REAL: 1950000, VLR_PREV: 2100000 },
                    { MES_ANO: '03/2024', VLR_REAL: 2200000, VLR_PREV: 2200000 },
                    { MES_ANO: '04/2024', VLR_REAL: 2050000, VLR_PREV: 2300000 },
                    { MES_ANO: '05/2024', VLR_REAL: 2400000, VLR_PREV: 2400000 },
                    { MES_ANO: '06/2024', VLR_REAL: 2600000, VLR_PREV: 2500000 },
                    { MES_ANO: '07/2024', VLR_REAL: 2850000, VLR_PREV: 2700000 },
                    { MES_ANO: '08/2024', VLR_REAL: 2700000, VLR_PREV: 2800000 },
                    { MES_ANO: '09/2024', VLR_REAL: 2900000, VLR_PREV: 2900000 },
                    { MES_ANO: '10/2024', VLR_REAL: 3100000, VLR_PREV: 3000000 },
                    { MES_ANO: '11/2024', VLR_REAL: 2850000, VLR_PREV: 3100000 },
                    { MES_ANO: '12/2024', VLR_REAL: 3200000, VLR_PREV: 3200000 }
                ];

                // Simular delay de carregamento
                await new Promise(resolve => setTimeout(resolve, 1200));

                if (data && data.length > 0) {
                    const labels = data.map(item => item.MES_ANO);
                    const realData = data.map(item => parseFloat(item.VLR_REAL) || 0);
                    const metaData = data.map(item => parseFloat(item.VLR_PREV) || 0);

                    createLineChart(labels, realData, metaData);
                } else {
                    showChartError('lineChart', 'Nenhum dado encontrado para o gráfico de evolução mensal');
                }

            } catch (error) {
                console.error('Erro ao carregar dados do gráfico de linha:', error);
                showChartError('lineChart', 'Erro ao carregar dados');
            }
        }

        // Função para carregar dados do gráfico de barras (dados fictícios)
        async function loadBarChartData() {
            try {
                // Dados fictícios para top 10 vendedores
                const data = [
                    { CODVEND: 101, APELIDO: 'João Silva', VLR_REAL: 420000, VLR_PREV: 380000, PERC: 110.5 },
                    { CODVEND: 102, APELIDO: 'Maria Santos', VLR_REAL: 398000, VLR_PREV: 400000, PERC: 99.5 },
                    { CODVEND: 103, APELIDO: 'Pedro Costa', VLR_REAL: 385000, VLR_PREV: 350000, PERC: 110.0 },
                    { CODVEND: 104, APELIDO: 'Ana Oliveira', VLR_REAL: 365000, VLR_PREV: 380000, PERC: 96.1 },
                    { CODVEND: 105, APELIDO: 'Carlos Lima', VLR_REAL: 340000, VLR_PREV: 320000, PERC: 106.3 },
                    { CODVEND: 106, APELIDO: 'Lucia Ferreira', VLR_REAL: 320000, VLR_PREV: 350000, PERC: 91.4 },
                    { CODVEND: 107, APELIDO: 'Roberto Souza', VLR_REAL: 310000, VLR_PREV: 300000, PERC: 103.3 },
                    { CODVEND: 108, APELIDO: 'Fernanda Rocha', VLR_REAL: 295000, VLR_PREV: 310000, PERC: 95.2 },
                    { CODVEND: 109, APELIDO: 'Marcos Alves', VLR_REAL: 280000, VLR_PREV: 280000, PERC: 100.0 },
                    { CODVEND: 110, APELIDO: 'Juliana Moraes', VLR_REAL: 270000, VLR_PREV: 290000, PERC: 93.1 }
                ];

                // Simular delay de carregamento
                await new Promise(resolve => setTimeout(resolve, 1000));

                if (data && data.length > 0) {
                    const labels = data.map(item => `${item.CODVEND} - ${item.APELIDO}`);
                    const realData = data.map(item => parseFloat(item.VLR_REAL) || 0);
                    const metaData = data.map(item => parseFloat(item.VLR_PREV) || 0);

                    createBarChart(labels, realData, metaData);
                } else {
                    showChartError('barChart', 'Nenhum dado encontrado para o gráfico de vendedores');
                }

            } catch (error) {
                console.error('Erro ao carregar dados do gráfico de barras:', error);
                showChartError('barChart', 'Erro ao carregar dados');
            }
        }

        // Função para criar gráfico de linha
        function createLineChart(labels, realData, metaData) {
            const ctx = document.getElementById('lineChart').getContext('2d');
            
            if (lineChart) {
                lineChart.destroy();
            }

            lineChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Real',
                            data: realData,
                            borderColor: '#008a70',
                            backgroundColor: 'rgba(0, 138, 112, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#008a70',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            pointRadius: 6,
                            pointHoverRadius: 8
                        },
                        {
                            label: 'Meta',
                            data: metaData,
                            borderColor: '#00afa0',
                            backgroundColor: 'rgba(0, 175, 160, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#00afa0',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            pointRadius: 6,
                            pointHoverRadius: 8,
                            borderDash: [5, 5]
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#008a70',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 11
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    }
                }
            });
        }

        // Função para criar gráfico de barras
        function createBarChart(labels, realData, metaData) {
            const ctx = document.getElementById('barChart').getContext('2d');
            
            if (barChart) {
                barChart.destroy();
            }

            barChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Real',
                            data: realData,
                            backgroundColor: 'rgba(0, 138, 112, 0.8)',
                            borderColor: '#008a70',
                            borderWidth: 1,
                            borderRadius: 6,
                            borderSkipped: false,
                        },
                        {
                            label: 'Meta',
                            data: metaData,
                            backgroundColor: 'rgba(0, 175, 160, 0.8)',
                            borderColor: '#00afa0',
                            borderWidth: 1,
                            borderRadius: 6,
                            borderSkipped: false,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#008a70',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 10
                                },
                                maxRotation: 45
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            }
                        }
                    }
                }
            });
        }

        // Função para mostrar erro nos gráficos
        function showChartError(chartId, message) {
            const canvas = document.getElementById(chartId);
            const wrapper = canvas.parentElement;
            
            wrapper.innerHTML = `
                <div class="loading">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e30613; margin-bottom: 15px;"></i>
                    <div class="loading-text">${message}</div>
                </div>
            `;
        }

        // Função principal de inicialização
        async function initializeDashboard() {
            try {
                // Mostrar loading nos gráficos
                document.getElementById('lineChart').parentElement.innerHTML = `
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Carregando dados...</div>
                    </div>
                `;
                
                document.getElementById('barChart').parentElement.innerHTML = `
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Carregando dados...</div>
                    </div>
                `;

                // Carregar dados em paralelo
                await Promise.all([
                    loadCardsData(),
                    loadLineChartData(),
                    loadBarChartData()
                ]);

            } catch (error) {
                console.error('Erro ao inicializar dashboard:', error);
            }
        }

        // Inicializar quando a página carregar
        document.addEventListener('DOMContentLoaded', function() {
            // Aguardar um pouco para garantir que o SankhyaJX esteja carregado
            setTimeout(initializeDashboard, 500);
        });

        // Função para atualizar dados (pode ser chamada externamente)
        window.refreshDashboard = function() {
            initializeDashboard();
        };

        // Auto-refresh a cada 5 minutos
        setInterval(initializeDashboard, 300000);
    </script>
</body>
</html>