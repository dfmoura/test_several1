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
    <div style="margin: 20px 0;">
        <label for="startDate">Data Inicial:</label>
        <input type="text" id="startDate" name="startDate" placeholder="DD/MM/YYYY" maxlength="10">
        
        <label for="endDate" style="margin-left: 20px;">Data Final:</label>
        <input type="text" id="endDate" name="endDate" placeholder="DD/MM/YYYY" maxlength="10">
        
        <button onclick="filterData()" style="margin-left: 20px;">Filtrar</button>
    </div>
    <div id="tableContainer"></div>

    <script>
        // Function to format date from DD/MM/YYYY to DDMMYYYY
        function formatDateForQuery(dateStr) {
            if (!dateStr) return '';
            // Remove any slashes and spaces
            return dateStr.replace(/[\/\s]/g, '');
        }

        // Function to validate date format DD/MM/YYYY
        function isValidDate(dateStr) {
            if (!dateStr) return true; // Empty is valid
            const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
            if (!regex.test(dateStr)) return false;
            
            const [, day, month, year] = dateStr.match(regex);
            const date = new Date(year, month - 1, day);
            return date.getDate() === parseInt(day) &&
                   date.getMonth() === parseInt(month) - 1 &&
                   date.getFullYear() === parseInt(year);
        }

        // Function to fetch and display data
        function filterData() {
            const startDateInput = document.getElementById('startDate').value;
            const endDateInput = document.getElementById('endDate').value;

            // Check if both dates are filled
            if (!startDateInput || !endDateInput) {
                alert('Por favor, preencha ambas as datas para filtrar');
                return;
            }

            // Validate dates
            if (!isValidDate(startDateInput) || !isValidDate(endDateInput)) {
                alert('Por favor, insira as datas no formato DD/MM/YYYY');
                return;
            }

            const startDate = formatDateForQuery(startDateInput);
            const endDate = formatDateForQuery(endDateInput);
            
            let query = 'SELECT nunota, dtneg, vlrnota FROM tgfcab WHERE 1=1';
            query += ` AND dtneg >= '${startDate}'`;
            query += ` AND dtneg <= '${endDate}'`;
            query += ' ORDER BY dtneg';

            // Clear existing table
            document.getElementById('tableContainer').innerHTML = '';

            JX.consultar(query)
                .then(data => {
                    createTable(data);
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                    document.getElementById('tableContainer').innerHTML = 
                        '<p style="color: red;">Error loading data. Please try again later.</p>';
                });
        }

        // Add input mask for date fields
        function maskDate(input) {
            let value = input.value.replace(/\D/g, '');
            if (value.length > 8) value = value.substr(0, 8);
            
            if (value.length >= 4) {
                value = value.substr(0, 2) + '/' + value.substr(2, 2) + '/' + value.substr(4);
            } else if (value.length >= 2) {
                value = value.substr(0, 2) + '/' + value.substr(2);
            }
            
            input.value = value;
        }

        // Add event listeners for date inputs
        document.getElementById('startDate').addEventListener('input', function() {
            maskDate(this);
        });
        document.getElementById('endDate').addEventListener('input', function() {
            maskDate(this);
        });

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
                // Format date from DDMMYYYY HH:MM:SS to DD/MM/YYYY
                const dateStr = row.DTNEG;
                const formattedDate = dateStr ? (() => {
                    const day = dateStr.substring(0, 2);
                    const month = dateStr.substring(2, 4);
                    const year = dateStr.substring(4, 8);
                    return `${day}/${month}/${year}`;
                })() : '';
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
    </script>
</body>
</html>