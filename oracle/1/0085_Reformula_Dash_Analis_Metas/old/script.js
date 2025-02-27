// script.js
document.addEventListener('DOMContentLoaded', function () {
    const salesVolumeCtx = document.getElementById('salesVolumeChart').getContext('2d');
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');

    const salesVolumeChart = new Chart(salesVolumeCtx, {
        type: 'bar',
        data: {
            labels: ['Vendedor A', 'Vendedor B', 'Vendedor C', 'Vendedor D'],
            datasets: [{
                label: 'Volume de Vendas (Real)',
                data: [120000, 150000, 80000, 200000],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }, {
                label: 'Volume de Vendas (Previsto)',
                data: [110000, 140000, 90000, 190000],
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    const revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
                label: 'Faturamento (Real)',
                data: [50000, 60000, 70000, 80000, 90000, 100000],
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                fill: false
            }, {
                label: 'Faturamento (Previsto)',
                data: [55000, 65000, 75000, 85000, 95000, 105000],
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
});