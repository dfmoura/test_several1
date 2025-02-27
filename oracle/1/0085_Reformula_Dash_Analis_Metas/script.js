// script.js
document.addEventListener('DOMContentLoaded', function () {
    // Gráfico de Volume de Vendas
    const salesVolumeOptions = {
        chart: {
            type: 'bar',
            height: 350,
        },
        series: [{
            name: 'Real',
            data: [120000, 150000, 80000, 200000],
        }, {
            name: 'Previsto',
            data: [110000, 140000, 90000, 190000],
        }],
        xaxis: {
            categories: ['Vendedor A', 'Vendedor B', 'Vendedor C', 'Vendedor D'],
        },
        colors: ['#6C63FF', '#4A47A3'],
    };

    const salesVolumeChart = new ApexCharts(document.querySelector('#salesVolumeChart'), salesVolumeOptions);
    salesVolumeChart.render();

    // Gráfico de Faturamento
    const revenueOptions = {
        chart: {
            type: 'line',
            height: 350,
        },
        series: [{
            name: 'Real',
            data: [50000, 60000, 70000, 80000, 90000, 100000],
        }, {
            name: 'Previsto',
            data: [55000, 65000, 75000, 85000, 95000, 105000],
        }],
        xaxis: {
            categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        },
        colors: ['#6C63FF', '#4A47A3'],
    };

    const revenueChart = new ApexCharts(document.querySelector('#revenueChart'), revenueOptions);
    revenueChart.render();
});