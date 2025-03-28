<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tabela de Dados SAFRA SATIS</title>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <snk:load/>

    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            padding: 0;
            color: #333;
        }
        h1 {
            color: #23a059;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .table-container {
            overflow-x: auto;
            margin-top: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            border: 1px solid #ddd;
        }
        th {
            background-color: #23a059;
            color: white;
            padding: 10px;
            text-align: left;
            position: sticky;
            top: 0;
        }
        td {
            padding: 8px 10px;
            border-bottom: 1px solid #ddd;
            color: #333;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #f1f1f1;
        }
        .loading {
            text-align: center;
            padding: 20px;
            font-style: italic;
            color: #666;
        }
        .error {
            color: #d9534f;
            padding: 20px;
            text-align: center;
        }
        .no-data {
            text-align: center;
            padding: 20px;
            font-style: italic;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>Dados SAFRA SATIS</h1>
    <div class="table-container">
        <div id="loading" class="loading">Carregando dados...</div>
        <table id="dataTable" style="display: none;">
            <thead>
                <tr>
                    <th>Valor Previsto</th>
                    <th>Valor Real</th>
                    <th>Período</th>
                </tr>
            </thead>
            <tbody id="tableBody"></tbody>
        </table>
        <div id="noData" class="no-data" style="display: none;">Nenhum dado encontrado.</div>
        <div id="error" class="error" style="display: none;"></div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            fetchData();
        });

        function fetchData() {
            const query = "select vlr_prev, vlr_real, period from VIEW_DADOS_SAFRA_SATIS";
            
            JX.consultar(query)
                .then(response => {
                    console.log('Full response:', response);
                    
                    // Verifica se há dados e extrai corretamente
                    let data = [];
                    if (response && response.items) {
                        data = response.items; // Pode ser response.rows ou outro nome dependendo da API
                    } else if (Array.isArray(response)) {
                        data = response;
                    }
                    
                    document.getElementById('loading').style.display = 'none';
                    
                    if (data.length > 0) {
                        populateTable(data);
                    } else {
                        document.getElementById('noData').style.display = 'block';
                    }
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                    document.getElementById('loading').style.display = 'none';
                    const errorDiv = document.getElementById('error');
                    errorDiv.textContent = 'Erro ao carregar dados: ' + (error.message || 'Por favor, tente novamente.');
                    errorDiv.style.display = 'block';
                });
        }

        function populateTable(data) {
            const tableBody = document.getElementById('tableBody');
            tableBody.innerHTML = '';
            
            data.forEach(item => {
                console.log('Processing item:', item);
                
                const tr = document.createElement('tr');
                
                // Acessa os campos verificando diferentes padrões de nome
                const vlrPrev = getFieldValue(item, ['vlr_prev', 'VLR_PREV', 'prev']);
                const vlrReal = getFieldValue(item, ['vlr_real', 'VLR_REAL', 'real']);
                const period = getFieldValue(item, ['period', 'PERIOD', 'periodo']);
                
                tr.innerHTML = `
                    <td>${formatCurrency(vlrPrev)}</td>
                    <td>${formatCurrency(vlrReal)}</td>
                    <td>${period || '-'}</td>
                `;
                
                tableBody.appendChild(tr);
            });
            
            document.getElementById('dataTable').style.display = 'table';
        }

        function getFieldValue(obj, possibleKeys) {
            for (const key of possibleKeys) {
                if (obj.hasOwnProperty(key)) {
                    return obj[key];
                }
            }
            return null;
        }

        function formatCurrency(value) {
            if (value === null || value === undefined || isNaN(value)) return '-';
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(Number(value));
        }
    </script>
</body>
</html>