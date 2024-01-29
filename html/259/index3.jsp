<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
    <title>Chart Example</title>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX/jx.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>

</head>
<body>
    <canvas id="myChart" width="400" height="200"></canvas>

    <script>
        // Fetch data from the database using SankhyaJX
        const fetchData = async () => {
            try {
                const response = await jx.query({
                    sql: "SELECT cab.codparc, cab.vlrnota FROM tgfcab cab WHERE rownum < 10 ORDER BY 1"
                });

                const data = response.data;

                // Transpose data into an array suitable for the chart
                const labels = data.map(item => item.codparc);
                const values = data.map(item => item.vlrnota);

                // Create a Chart.js chart
                const ctx = document.getElementById('myChart').getContext('2d');
                const myChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Data from Database',
                            data: values,
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
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
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    </script>
</body>
</html>
