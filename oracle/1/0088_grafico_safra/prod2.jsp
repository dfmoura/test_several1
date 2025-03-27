<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gráfico de Barras Vertical Responsivo</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
    <style>
        /* Custom styles for the chart container */
        #chartContainer {
            position: relative;
            height: 48vh;
            width: 80%;
            margin: 0 auto;
        }
        .legend-icon {
            width: 16px;
            height: 16px;
            display: inline-block;
            margin-right: 4px;
        }
        .styled-table {
            border-collapse: collapse;
            width: 80%;
            max-width: 560px;
            margin: 16px auto;
            text-align: center;
            font-family: Arial, sans-serif;
            box-shadow: 0 1.6px 8px rgba(0, 0, 0, 0.1);
            border-radius: 6.4px;
            overflow: hidden;
        }
        .styled-table thead th {
            background-color: #4A5568;
            color: white;
            padding: 8px;
            font-weight: bold;
            font-size: 11.2px;
        }
        .styled-table tbody td {
            border: 1px solid #ddd;
            padding: 6.4px;
            font-size: 11.2px;
            background-color: #F7FAFC;
        }
        .styled-table tbody tr:hover {
            background-color: #E2E8F0;
        }
        .header-icon {
            font-size: 12.8px;
            vertical-align: middle;
            margin-right: 4px;
        }
        .table-container {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 8px;
            margin: 4px;
        }
        .loading {
            text-align: center;
            padding: 20px;
            font-style: italic;
            color: #666;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>    
    <snk:load/>
</head>
<body>
    <div id="loading" class="loading">Carregando dados...</div>
    
    <div id="content" style="display: none;">
        <div class="flex justify-between items-stretch">
            <div class="table-container w-2/3">
                <table class="styled-table" id="mainTable">
                    <thead>
                        <tr>
                            <th><i class="fas fa-seedling header-icon"></i> Safra</th>
                            <th><i class="fas fa-chart-line header-icon"></i> Previsto</th>
                            <th><i class="fas fa-check-circle header-icon"></i> Realizado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Dados serão preenchidos via JavaScript -->
                    </tbody>
                </table>
            </div>

            <div class="table-container w-1/3">
                <table class="styled-table" id="secondaryTable">
                    <thead>
                        <tr>
                            <th><i class="fas fa-seedling header-icon"></i> Safra Atual</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Dados serão preenchidos via JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>
        
        <div id="chartContainer" style="margin-bottom: 16px;">
            <canvas id="barChart"></canvas>
        </div>
    </div>

    <script>
        let chart;

        document.addEventListener("DOMContentLoaded", function() {
            // Primeiro carregamos os dados
            loadData();
        });

        async function loadData() {
            try {
                // Usamos await para lidar com a Promise
                const response = await JX.consultar('select vlr_prev, vlr_real, period from VIEW_DADOS_SAFRA_SATIS');
                console.log("Dados recebidos:", response);
                
                // Verificamos a estrutura dos dados
                let data = [];
                if (Array.isArray(response)) {
                    data = response;
                } else if (response && response.items) {
                    data = response.items;
                } else if (response && response.rows) {
                    data = response.rows;
                }
                
                if (data.length === 0) {
                    throw new Error("Nenhum dado retornado pela consulta");
                }
                
                processData(data);
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                document.getElementById('loading').textContent = 'Erro ao carregar dados: ' + error.message;
            }
        }

        function processData(data) {
            let forecast, realizedCurrent, realizedPrevious, totalRealizedPrevious;
            
            // Procuramos os valores nos dados
            data.forEach(row => {
                // Verificamos diferentes padrões de nome de campo
                const period = row.period || row.PERIOD || row.Period;
                const vlrPrev = row.vlr_prev || row.VLR_PREV || row.vlrprev;
                const vlrReal = row.vlr_real || row.VLR_REAL || row.vlrreal;
                
                if (period && vlrPrev !== undefined && vlrReal !== undefined) {
                    if (period.toString().toLowerCase().includes('atual')) {
                        forecast = parseFloat(vlrPrev);
                        realizedCurrent = parseFloat(vlrReal);
                    } else if (period.toString().toLowerCase().includes('anterior')) {
                        realizedPrevious = parseFloat(vlrReal);
                        totalRealizedPrevious = parseFloat(vlrReal);
                    }
                }
            });
            
            console.log("Valores processados:", {
                forecast, 
                realizedCurrent, 
                realizedPrevious, 
                totalRealizedPrevious
            });
            
            // Atualizamos as tabelas
            updateTables(forecast, realizedCurrent, realizedPrevious);
            
            // Criamos o gráfico
            createChart(forecast, realizedCurrent, realizedPrevious, totalRealizedPrevious);
            
            // Mostramos o conteúdo
            document.getElementById('loading').style.display = 'none';
            document.getElementById('content').style.display = 'block';
        }

        function updateTables(forecast, realizedCurrent, realizedPrevious) {
            // Formatamos os valores para exibição
            const formatCurrency = value => {
                return new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                }).format(value || 0);
            };
            
            // Atualizamos a tabela principal
            const mainTableBody = document.querySelector('#mainTable tbody');
            mainTableBody.innerHTML = `
                <tr>
                    <td>Atual</td>
                    <td>${formatCurrency(forecast)}</td>
                    <td>${formatCurrency(realizedCurrent)}</td>
                </tr>
                <tr>
                    <td>Anterior</td>
                    <td>-</td>
                    <td>${formatCurrency(realizedPrevious)}</td>
                </tr>
            `;
            
            // Atualizamos a tabela secundária
            const missingValue = (forecast || 0) - (realizedCurrent || 0);
            const secondaryTableBody = document.querySelector('#secondaryTable tbody');
            secondaryTableBody.innerHTML = `
                <tr>
                    <td><i class="fas fa-chart-line header-icon"></i> Valor Faltante</td>
                </tr>
                <tr>
                    <td class="font-bold text-xl ${missingValue >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${formatCurrency(missingValue)}
                    </td>
                </tr>
            `;
        }

        function createChart(forecast, realizedCurrent, realizedPrevious, totalRealizedPrevious) {
            const missingValue = (forecast || 0) - (realizedCurrent || 0);
            
            const ctx = document.getElementById('barChart').getContext('2d');
            const data = {
                labels: ['Safra Atual', 'Safra Anterior'],
                datasets: [
                    {
                        label: 'Previsto',
                        data: [forecast || null, null],
                        backgroundColor: 'rgba(255, 99, 32, 0.8)',
                        borderRadius: 5
                    },
                    {
                        label: 'Realizado (Atual)',
                        data: [realizedCurrent || null, null],
                        backgroundColor: 'rgba(34, 197, 94, 0.8)',
                        borderRadius: 5
                    },
                    {
                        label: 'Realizado (Anterior)',
                        data: [null, realizedPrevious || null],
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderRadius: 5
                    },
                    {
                        label: 'Total Realizado (Anterior)',
                        data: [null, totalRealizedPrevious || null],
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderRadius: 5
                    }
                ]
            };

            // Destruímos o gráfico anterior se existir
            if (chart) {
                chart.destroy();
            }
            
            chart = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { stacked: false },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: value => `R$ ${value.toLocaleString('pt-BR')}`
                            }
                        }
                    },
                    plugins: {
                        legend: { 
                            display: true,
                            labels: { font: { size: 8 } }
                        },
                        datalabels: {
                            color: '#000',
                            anchor: 'end',
                            align: 'bottom',
                            formatter: value => value ? `R$ ${value.toLocaleString('pt-BR')}` : '',
                            offset: 5
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
        }
    </script>
</body>
</html>