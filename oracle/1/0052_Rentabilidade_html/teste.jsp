<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard com Chart.js</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        .container {
            width: 100%;
            padding: 20px;
        }
        .card-container {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .card {
            flex: 1;
            margin: 0 10px;
            padding: 20px;
            border-radius: 10px;
            background: linear-gradient(145deg, rgba(255, 0, 0, 0.3), rgba(0, 0, 255, 0.3));
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .card h2 {
            font-size: 2rem;
            margin: 0;
        }
        .card p {
            margin: 10px 0 0;
        }
        .section {
            display: flex;
            justify-content: space-between;
            height: calc(100vh - 260px); /* Ajuste para utilizar o espaço disponível da tela */
            margin-bottom: 20px;
        }
        .chart-container {
            flex: 1;
            margin: 0 10px;
            height: 100%; /* Faz com que o container do gráfico ocupe toda a altura disponível */
        }
        .footer {
            display: flex;
            justify-content: center;
            padding: 10px;
            background: #f1f1f1;
        }
        .footer button {
            margin: 0 10px;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            background: linear-gradient(145deg, #4caf50, #2c6b2f);
            color: white;
            font-size: 1rem;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Primeira Seção: Cards -->
        <div class="card-container">
            <div class="card">
                <h2>100.000</h2>
                <p>Teste</p>
            </div>
            <div class="card">
                <h2>100.000</h2>
                <p>Teste</p>
            </div>
            <div class="card">
                <h2>100.000</h2>
                <p>Teste</p>
            </div>
            <div class="card">
                <h2>100.000</h2>
                <p>Teste</p>
            </div>
        </div>

        <!-- Segunda Seção: Gráficos -->
        <div class="section">
            <!-- Gráfico de Linhas (Esquerda) -->
            <div class="chart-container">
                <canvas id="lineChart"></canvas>
            </div>
            <!-- Gráfico de Colunas Horizontais (Direita) -->
            <div class="chart-container">
                <canvas id="barChart"></canvas>
            </div>
        </div>
    </div>

    <!-- Rodapé -->
    <div class="footer">
        <button>Teste</button>
        <button>Teste</button>
        <button>Teste</button>
    </div>

    <!-- Inclusão da Biblioteca Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        // Dados e configuração do gráfico de linhas
        const lineCtx = document.getElementById('lineChart').getContext('2d');
        const lineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio'],
                datasets: [{
                    label: 'Teste do Jonatam',
                    data: [10, 25, 15, 30, 20],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Dados e configuração do gráfico de colunas horizontais
        const barCtx = document.getElementById('barChart').getContext('2d');
        const barChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['Produto A', 'Produto B', 'Produto C', 'Produto D'],
                datasets: [{
                    label: 'Teste2 do Jonatam',
                    data: [40, 55, 20, 70],
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false
            }
        });
    </script>
</body>
</html>
