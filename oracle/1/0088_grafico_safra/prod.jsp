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
            height: 48vh; /* Reduced height by 20% */
            width: 80%; /* Reduced width by 20% */
            margin: 0 auto; /* Center the chart container horizontally */
        }
        .legend-icon {
            width: 16px; /* Reduced size by 20% */
            height: 16px; /* Reduced size by 20% */
            display: inline-block;
            margin-right: 4px; /* Reduced margin by 20% */
        }

        /* Improved table styles */
        .styled-table {
            border-collapse: collapse;
            width: 80%; /* Reduced width by 20% */
            max-width: 560px; /* Reduced max-width by 20% */
            margin: 16px auto; /* Reduced margin by 20% */
            text-align: center;
            font-family: Arial, sans-serif;
            box-shadow: 0 1.6px 8px rgba(0, 0, 0, 0.1); /* Reduced shadow size by 20% */
            border-radius: 6.4px; /* Reduced border-radius by 20% */
            overflow: hidden; /* Ensure rounded corners are visible */
        }

        /* Header styles */
        .styled-table thead th {
            background-color: #4A5568; /* No change */
            color: white; /* No change */
            padding: 8px; /* Reduced padding by 20% */
            font-weight: bold;
            font-size: 11.2px; /* Reduced font size by 20% */
        }

        /* Body styles */
        .styled-table tbody td {
            border: 1px solid #ddd;
            padding: 6.4px; /* Reduced padding by 20% */
            font-size: 11.2px; /* Reduced font size by 20% */
            background-color: #F7FAFC; /* No change */
        }

        /* Hover effect for rows */
        .styled-table tbody tr:hover {
            background-color: #E2E8F0; /* No change */
        }

        /* Icon styles */
        .header-icon {
            font-size: 12.8px; /* Reduced icon size by 20% */
            vertical-align: middle;
            margin-right: 4px; /* Reduced margin by 20% */
        }

        /* Table container styles */
        .table-container {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 8px; /* Reduced padding by 20% */
            margin: 4px; /* Added margin to reduce white space between tables */
        }
    </style>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>    
    <snk:load/>

</head>
<body class="bg-gray-100 flex items-center justify-center h-screen p-4">
    <div class="max-w-4xl w-full bg-white shadow-lg rounded-lg p-6">
        


        <div class="flex justify-between items-stretch">
            <!-- New table container -->
            <div class="table-container w-2/3"> <!-- Reduced width of the table -->
                <table class="styled-table">
                    <thead>
                        <tr>
                            <th>
                                <i class="fas fa-seedling header-icon"></i> Safra
                            </th>
                            <th>
                                <i class="fas fa-chart-line header-icon"></i> Previsto
                            </th>
                            <th>
                                <i class="fas fa-check-circle header-icon"></i> Realizado
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Atual</td>
                            <td>R$119.381.122,83</td>
                            <td>R$74.320.124,57</td>
                        </tr>
                        <tr>
                            <td>Anterior</td>
                            <td>R$82.732.772,78</td>
                            <td>R$90.000.000</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="table-container w-1/3"> <!-- Reduced width of the table -->
                <table class="styled-table">
                    <thead>
                        <tr>
                            <th>
                                <i class="fas fa-seedling header-icon"></i> <!-- Quebra de linha entre ícone e texto -->
                                Safra Atual
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><i class="fas fa-chart-line header-icon"></i> Valor Faltante</td>
                        </tr>
                        <tr>
                            <td class="font-bold text-xl text-green-600">R$44.902.737,33</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
        </div>
        
        
        <div id="chartContainer" style="margin-bottom: 16px;">
            <canvas id="barChart"></canvas>
        </div>        
        
        <!-- End of card container -->
    </div>

    <script>
        let chart; // Declare chart variable outside the event listener

        document.addEventListener("DOMContentLoaded", function() {
            const ctx = document.getElementById('barChart').getContext('2d');
            const data = {
                labels: ['Safra Atual', 'Safra Anterior'],
                datasets: [
                    {
                        label: 'Previsto',
                        data: [119381122.83, null], // Current Harvest Forecast
                        backgroundColor: 'rgba(255, 99, 32, 0.8)',
                        borderRadius: 5,
                        categoryPercentage: 0.6,
                        barPercentage: 0.6,
                    },
                    {
                        label: 'Realizado (Atual)',
                        data: [74320124.57, null], // Current Harvest Realized
                        backgroundColor: 'rgba(34, 197, 94, 0.8)',
                        borderRadius: 5,
                        categoryPercentage: 0.6,
                        barPercentage: 0.6,
                    },
                    {
                        label: 'Realizado (Anterior)',
                        data: [null, 82732772.78], // Previous Harvest Realized
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderRadius: 5,
                        categoryPercentage: 0.6,
                        barPercentage: 0.6,
                    },
                    {
                        label: 'Total Realizado (Anterior)',
                        data: [null, 90000000], // Previous Total Realized (example value)
                        backgroundColor: 'rgba(255, 206, 86, 0.8)',
                        borderRadius: 5,
                        categoryPercentage: 0.6,
                        barPercentage: 0.6,
                    }
                ]
            };

            // Check if chart already exists to prevent re-initialization
            if (!chart) {
                chart = new Chart(ctx, {
                    type: 'bar',
                    data: data,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                stacked: false, // Set to false to have bars next to each other
                            },
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    display: false, // Hide the y-axis ticks
                                    callback: value => `R$ ${value.toLocaleString('pt-BR')}`
                                }
                            }
                        },
                        plugins: {
                            legend: { 
                                display: true,
                                labels: {
                                    font: {
                                        size: 8 // Decreased font size of the legend
                                    }
                                }
                            },
                            datalabels: {
                                color: '#000',
                                anchor: 'end',
                                align: 'bottom',
                                formatter: value => value ? `R$ ${value.toLocaleString('pt-BR')}` : '',
                                offset: 5
                            }
                        },
                    },
                    plugins: [ChartDataLabels]
                });
            }
        });
    </script>
</body>
</html>