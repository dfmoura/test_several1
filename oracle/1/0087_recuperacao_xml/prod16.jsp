<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sales Data Table</title>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
    </style>
    <!-- Include SankhyaJX library -->
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <snk:load/>
</head>
<body>
    <div id="tableContainer"></div>

    <script>
        // Function to create and populate the table
        function createTable(data) {
            const container = document.getElementById('tableContainer');
            const table = document.createElement('table');
            
            // Create table header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const headers = ['Número da Nota', 'Data Negociação', 'Valor da Nota'];
            
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // Create table body
            const tbody = document.createElement('tbody');
            data.forEach(row => {
                const tr = document.createElement('tr');
                
                // Create cells for each column
                const nunotaCell = document.createElement('td');
                nunotaCell.textContent = row.NUNOTA;
                
                const dtnegCell = document.createElement('td');
                // Format date as DD/MM/YYYY
                const dateStr = row.DTNEG;
                const formattedDate = dateStr ? dateStr.split('-').reverse().join('/') : '';
                dtnegCell.textContent = formattedDate;
                
                const vlrnotaCell = document.createElement('td');
                vlrnotaCell.textContent = new Intl.NumberFormat('pt-BR', 
                    { style: 'currency', currency: 'BRL' }
                ).format(row.VLRNOTA);
                
                tr.appendChild(nunotaCell);
                tr.appendChild(dtnegCell);
                tr.appendChild(vlrnotaCell);
                tbody.appendChild(tr);
            });
            
            table.appendChild(tbody);
            container.appendChild(table);
        }

        // Execute query and create table
        JX.consultar('SELECT nunota, dtneg, vlrnota FROM tgfcab WHERE rownum <= 10')
            .then(data => {
                createTable(data);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                document.getElementById('tableContainer').innerHTML = 
                    '<p style="color: red;">Error loading data. Please try again later.</p>';
            });
    </script>
</body>
</html>
