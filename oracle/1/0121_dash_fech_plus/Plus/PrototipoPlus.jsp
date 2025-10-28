<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Gestão de Comissionamento</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; background-color: #1a1a2e; color: #ffffff; }
        .dashboard { padding: 20px; }
        .card { background-color: #16213e; border: 1px solid #2a4066; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4); }
        .card-header { background-color: #0f172a; color: #ffffff; font-weight: 600; font-size: 1.1rem; padding: 10px; border-bottom: 1px solid #2a4066; }
        .chart-container { position: relative; height: 400px; width: 100%; padding: 10px; } /* Aumentado para 400px */
        .indicator { font-size: 1.6rem; text-align: center; margin-bottom: 10px; font-weight: bold; color: #00d4ff; }
        .header-title { background-color: #0f172a; color: #ffffff; padding: 12px; text-align: center; font-size: 1.8rem; font-weight: 600; border-radius: 6px; letter-spacing: 0.5px; }
        .controls { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; color: #ffffff; }
        .bar-chart-container { height: 200px; }
        h2, h3, h4, h5 { color: #ffffff; margin-bottom: 10px; }
        p, span, label { color: #e0e0e0; }
        .table-container { background-color: #0f172a; border-radius: 6px; padding: 10px; color: #ffffff; }
        .table-container table th, .table-container table td { color: #ffffff; border-color: #2a4066; }
        button { background-color: #00a8ff; color: #ffffff; border: none; padding: 8px 14px; border-radius: 4px; cursor: pointer; font-weight: bold; }
        button:hover { background-color: #0090d9; }
    </style>
</head>
<body>
    <div class="dashboard container-fluid">
        <div class="header-title">
            <h2>Dashboard Gestão de Comissionamento</h2>
            <div class="controls">
                <span>Atualização: 04:25 PM -03, 12/10/2025</span>
                <span>Expandir | Reduzir</span>
            </div>
        </div>

        <div class="row">
            <!-- Indicadores Principais -->
            <div class="col-md-3">
                <div class="card">
                    <div class="card-header">Faturamento Total</div>
                    <div class="card-body indicator">R$ 17.508.624,49</div>
                </div>
                <div class="card">
                    <div class="card-header">Custo Total</div>
                    <div class="card-body indicator">R$ 7.163.693,00</div>
                </div>
                <div class="card">
                    <div class="card-header">Devoluções</div>
                    <div class="card-body indicator">6.381.172</div>
                </div>
            </div>

            <!-- Gráfico de Área: Faturamento Mensal -->
            <div class="col-md-9">
                <div class="card">
                    <div class="card-header">Desempenho Mensal (Metas, Realizado e Tendência)</div>
                    <div class="card-body">
                        <div class="chart-container">
                            <canvas id="areaChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Gráfico de Barras: Faturamento por Vendedor -->
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">Comissão por Vendedor</div>
                    <div class="card-body">
                        <div class="chart-container bar-chart-container">
                            <canvas id="barChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Gráfico de Pizza: Distribuição de Comissões -->
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">Distribuição de Comissões</div>
                    <div class="card-body">
                        <div class="chart-container">
                            <canvas id="pieChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top 10 Faturamento Produtos -->
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">Top 10 Produtos por Comissão</div>
                    <div class="card-body">
                        <ul class="list-group">
                            <li class="list-group-item bg-dark text-white">Power BI - R$ 2.001.234,56</li>
                            <li class="list-group-item bg-dark text-white">Plano de Contas - R$ 1.876.543,21</li>
                            <li class="list-group-item bg-dark text-white">Plano de Ação - R$ 1.654.321,09</li>
                            <li class="list-group-item bg-dark text-white">Top 100 - R$ 1.432.109,87</li>
                            <li class="list-group-item bg-dark text-white">Plano de Slide - R$ 1.210.987,65</li>
                            <li class="list-group-item bg-dark text-white">Plano de Vendas - R$ 987.654,32</li>
                            <li class="list-group-item bg-dark text-white">Plano de Controle - R$ 765.432,10</li>
                            <li class="list-group-item bg-dark text-white">Plano de Acompanhamento - R$ 543.210,98</li>
                            <li class="list-group-item bg-dark text-white">Plano de Gestão - R$ 321.098,76</li>
                            <li class="list-group-item bg-dark text-white">Plano de Relatórios - R$ 100.987,65</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Vendedores -->
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">Vendedores</div>
                    <div class="card-body">
                        <ul class="list-group">
                            <li class="list-group-item bg-dark text-white">Diego Aragão</li>
                            <li class="list-group-item bg-dark text-white">Emilly Rocha</li>
                            <li class="list-group-item bg-dark text-white">Produtor G. de Jesus</li>
                            <li class="list-group-item bg-dark text-white">Paço de Martelinho</li>
                            <li class="list-group-item bg-dark text-white">Paço de RHI</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        // Gráfico de Área: Desempenho Mensal (Metas, Realizado e Tendência)
        const ctxArea = document.getElementById('areaChart').getContext('2d');
        new Chart(ctxArea, {
            type: 'line',
            data: {
                labels: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out'],
                datasets: [
                    {
                        label: 'Metas',
                        data: [18000000, 18200000, 18500000, 18800000, 19000000, 19200000, 19500000, 19700000, 20000000, 20500000],
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Realizado',
                        data: [15000000, 15200000, 15500000, 15800000, 16000000, 16200000, 16500000, 16700000, 17000000, 17508624],
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Tendência',
                        data: [15500000, 15700000, 16000000, 16300000, 16500000, 16700000, 17000000, 17200000, 17500000, 18000000],
                        borderColor: 'rgba(153, 102, 255, 1)',
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        fill: false,
                        borderDash: [5, 5],
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: { display: true, text: 'R$', color: '#fff' },
                        ticks: { color: '#fff' }
                    },
                    x: { ticks: { color: '#fff' } }
                },
                plugins: { legend: { labels: { color: '#fff' } } }
            }
        });

        // Gráfico de Barras: Comissão por Vendedor
        const ctxBar = document.getElementById('barChart').getContext('2d');
        new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Diego Aragão', 'Emilly Rocha', 'Produtor G. de Jesus', 'Paço de Martelinho', 'Paço de RHI'],
                datasets: [{
                    label: 'Comissão',
                    data: [152319.60, 145678.90, 138945.67, 130000.00, 125000.00],
                    backgroundColor: 'rgba(75, 192, 192, 0.8)'
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                scales: {
                    x: { beginAtZero: true, title: { display: true, text: 'R$', color: '#fff' }, ticks: { color: '#fff' } },
                    y: { ticks: { color: '#fff' } }
                },
                plugins: { legend: { labels: { color: '#fff' } } }
            }
        });

        // Gráfico de Pizza: Distribuição de Comissões
        const ctxPie = document.getElementById('pieChart').getContext('2d');
        new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: ['Fixo', 'Variável', 'Bônus'],
                datasets: [{
                    data: [40, 35, 25],
                    backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: '#fff' } } }
            }
        });
    </script>
</body>
</html>