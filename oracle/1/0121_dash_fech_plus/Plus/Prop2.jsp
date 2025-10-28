<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel de Gestão de Comissionamento</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #1a1a2e;
            color: #ffffff;
        }
        .dashboard {
            padding: 20px;
        }
        .card {
            background-color: #16213e;
            border: 1px solid #2a4066;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        }
        .card-header {
            background-color: #0f172a;
            color: #ffffff;
            font-weight: 600;
            font-size: 1.1rem;
            padding: 12px;
            border-bottom: 1px solid #2a4066;
        }
        .chart-container {
            position: relative;
            height: 500px;
            width: 100%;
            padding: 20px;
        }
        .indicator {
            font-size: 1.8rem;
            text-align: center;
            margin-bottom: 10px;
            font-weight: bold;
            color: #00d4ff;
        }
        .header-title {
            background-color: #0f172a;
            color: #ffffff;
            padding: 15px;
            text-align: center;
            font-size: 2rem;
            font-weight: 600;
            border-radius: 6px;
            letter-spacing: 0.5px;
            margin-bottom: 20px;
        }
        .controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            color: #ffffff;
            font-size: 0.9rem;
        }
        .bar-chart-container {
            height: 350px;
        }
        h2, h3, h4, h5 {
            color: #ffffff;
            margin-bottom: 10px;
        }
        p, span, label {
            color: #e0e0e0;
        }
        .list-group-item {
            background-color: #0f172a !important;
            color: #ffffff !important;
            border-color: #2a4066 !important;
            padding: 12px;
            font-size: 0.95rem;
        }
        .metric-label {
            font-size: 0.85rem;
            color: #a0a0a0;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="dashboard container-fluid">
        <div class="header-title">
            <h2>Painel de Gestão de Comissionamento</h2>
            <div class="controls">
                <span>Atualização: 04:15 PM -03, 12/10/2025</span>
                <span>Expandir | Reduzir</span>
            </div>
        </div>

        <div class="row">
            <!-- Indicadores Principais -->
            <div class="col-md-2">
                <div class="card">
                    <div class="card-header">Faturamento</div>
                    <div class="card-body">
                        <div class="metric-label">Realizado</div>
                        <div class="indicator">R$ 17,5M</div>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card">
                    <div class="card-header">Meta</div>
                    <div class="card-body">
                        <div class="metric-label">Outubro</div>
                        <div class="indicator">R$ 20M</div>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card">
                    <div class="card-header">Atingimento</div>
                    <div class="card-body">
                        <div class="metric-label">% da Meta</div>
                        <div class="indicator" style="color: #ffa500;">87,5%</div>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card">
                    <div class="card-header">Tendência</div>
                    <div class="card-body">
                        <div class="metric-label">Projeção</div>
                        <div class="indicator" style="color: #ff6b6b;">R$ 19,2M</div>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card">
                    <div class="card-header">Comissão</div>
                    <div class="card-body">
                        <div class="metric-label">Acumulada</div>
                        <div class="indicator" style="color: #4ecdc4;">R$ 525K</div>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card">
                    <div class="card-header">Devolução</div>
                    <div class="card-body">
                        <div class="metric-label">Total</div>
                        <div class="indicator" style="color: #ff6b6b;">R$ 6,4M</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Gráfico Principal: Meta vs Realizado vs Tendência -->
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header">Desempenho Mensal - Meta vs Realizado vs Tendência</div>
                    <div class="card-body">
                        <div class="chart-container">
                            <canvas id="mainChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Vendedores -->
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">Vendedores - Atingimento</div>
                    <div class="card-body">
                        <ul class="list-group">
                            <li class="list-group-item">Diego Aragão - 92% (R$ 4,8M)</li>
                            <li class="list-group-item">Emilly Rocha - 89% (R$ 3,6M)</li>
                            <li class="list-group-item">Produtor G. de Jesus - 85% (R$ 3,2M)</li>
                            <li class="list-group-item">Paço de Martelinho - 88% (R$ 3,1M)</li>
                            <li class="list-group-item">Paço de RHI - 83% (R$ 2,8M)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Faturamento por Vendedor -->
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">Desempenho por Vendedor - Meta vs Realizado</div>
                    <div class="card-body">
                        <div class="chart-container bar-chart-container">
                            <canvas id="barChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top 10 Produtos -->
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">Top 10 Produtos - Faturamento</div>
                    <div class="card-body">
                        <ul class="list-group">
                            <li class="list-group-item">Power BI - R$ 2.001.234,56</li>
                            <li class="list-group-item">Plano de Contas - R$ 1.876.543,21</li>
                            <li class="list-group-item">Plano de Ação - R$ 1.654.321,09</li>
                            <li class="list-group-item">Top 100 - R$ 1.432.109,87</li>
                            <li class="list-group-item">Plano de Slide - R$ 1.210.987,65</li>
                            <li class="list-group-item">Plano de Vendas - R$ 987.654,32</li>
                            <li class="list-group-item">Plano de Controle - R$ 765.432,10</li>
                            <li class="list-group-item">Plano de Acompanhamento - R$ 543.210,98</li>
                            <li class="list-group-item">Plano de Gestão - R$ 321.098,76</li>
                            <li class="list-group-item">Plano de Relatórios - R$ 100.987,65</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Gráfico Principal: Meta vs Realizado vs Tendência
        const ctxMain = document.getElementById('mainChart').getContext('2d');
        new Chart(ctxMain, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out'],
                datasets: [
                    {
                        label: 'Meta',
                        data: [18000000, 18000000, 18500000, 19000000, 19000000, 19500000, 19500000, 20000000, 20000000, 20000000],
                        borderColor: '#ff6b6b',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        borderWidth: 3,
                        borderDash: [10, 5],
                        tension: 0.4,
                        fill: false,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Realizado',
                        data: [15000000, 15200000, 15500000, 15800000, 16000000, 16200000, 16500000, 16700000, 17000000, 17508624],
                        borderColor: '#4ecdc4',
                        backgroundColor: 'rgba(78, 205, 196, 0.2)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Tendência',
                        data: [15000000, 15200000, 15500000, 15900000, 16300000, 16600000, 17000000, 17300000, 17600000, 19200000],
                        borderColor: '#ffa500',
                        backgroundColor: 'rgba(255, 165, 0, 0.1)',
                        borderWidth: 3,
                        borderDash: [5, 5],
                        tension: 0.4,
                        fill: false,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#ffffff',
                            font: {
                                size: 14
                            },
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += 'R$ ' + context.parsed.y.toLocaleString('pt-BR');
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            color: '#ffffff',
                            callback: function(value) {
                                return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });

        // Gráfico de Barras: Meta vs Realizado por Vendedor
        const ctxBar = document.getElementById('barChart').getContext('2d');
        new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Diego Aragão', 'Emilly Rocha', 'G. de Jesus', 'Martelinho', 'RHI'],
                datasets: [
                    {
                        label: 'Meta',
                        data: [5200000, 4050000, 3750000, 3500000, 3400000],
                        backgroundColor: 'rgba(255, 107, 107, 0.6)',
                        borderColor: '#ff6b6b',
                        borderWidth: 2
                    },
                    {
                        label: 'Realizado',
                        data: [4784000, 3604500, 3187500, 3080000, 2822000],
                        backgroundColor: 'rgba(78, 205, 196, 0.8)',
                        borderColor: '#4ecdc4',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#ffffff',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += 'R$ ' + context.parsed.y.toLocaleString('pt-BR');
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#ffffff',
                            callback: function(value) {
                                return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>