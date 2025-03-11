<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sales Data Table</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            overflow-y: auto;
        }        
        table {
            border-collapse: separate;
            border-spacing: 0;
            width: 100%;
            font-size: 14px;
        }
        
        thead {
            position: sticky;
            top: 0;
            z-index: 100;
        }

        th {
            background-color: #f2f2f2;
            font-weight: 600;
            padding: 12px 8px;
            text-align: left;
            border: 1px solid #ddd;
            border-bottom: 2px solid #ddd;
            position: sticky;
            top: 0;
            z-index: 10;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        td {
            border: 1px solid #ddd;
            padding: 12px 8px;
            text-align: left;
            vertical-align: middle;
        }
        
        /* Group color alternation */
        tr.group-even {
            background-color: rgba(200, 230, 255, 0.2); /* Light blue */
        }
        
        tr.group-odd {
            background-color: rgba(255, 250, 205, 0.3); /* Light yellow */
        }
        
        tr:hover {
            background-color: rgba(0, 0, 0, 0.05) !important;
        }

        /* Responsive table */
        .table-container {
            overflow: auto;
            max-height: calc(100vh - 200px); /* Adjust based on filter height */
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
        }
        
        .filter-container {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 8px;
            margin: 0 0 20px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            position: sticky;
            top: 0;
            z-index: 1000;
        }

        .filter-header {
            padding: 12px 20px;
            background: #ffffff;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
            transition: background-color 0.2s ease;
        }

        .filter-header:hover {
            background: #f8f9fa;
        }

        .filter-content {
            padding: 0 20px;
            max-height: 0;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0;
            transform: translateY(-10px);
        }

        .filter-content.expanded {
            padding: 20px;
            max-height: 500px;
            opacity: 1;
            transform: translateY(0);
        }

        .toggle-icon {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            color: #666;
            font-size: 12px;
        }

        .toggle-icon.expanded {
            transform: rotate(180deg);
        }

        .filter-form {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            align-items: end;
        }

        .input-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .input-group label {
            font-size: 14px;
            color: #555;
            font-weight: 500;
        }

        input[type="text"] {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        input[type="text"]:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
        }

        button {
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-weight: 500;
            height: 40px;
            min-width: 120px;
        }

        button:hover {
            background: #0056b3;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        button:active {
            transform: translateY(0);
        }

        @media (max-width: 768px) {
            .filter-form {
                grid-template-columns: 1fr;
            }
            
            button {
                width: 100%;
            }
        }
        tbody tr:last-child td {
            border-bottom: 1px solid #ddd;
        }
        /* Fix header corners */
        th:first-child {
            border-top-left-radius: 8px;
        }
        
        th:last-child {
            border-top-right-radius: 8px;
        }        
    </style>
    <!-- Include SankhyaJX library -->
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <snk:load/>
</head>
<body>
    <div class="filter-container">
        <div class="filter-header" onclick="toggleFilters()">
            <h3 style="margin: 0;">Filtros de Pesquisa</h3>
            <span class="toggle-icon">▼</span>
        </div>
        <div class="filter-content" id="filterContent">
            <div class="filter-form">
                <div class="input-group">
                    <label for="startDate">Data Inicial:</label>
                    <input type="text" id="startDate" name="startDate" placeholder="DD/MM/YYYY" maxlength="10">
                </div>
                
                <div class="input-group">
                    <label for="endDate">Data Final:</label>
                    <input type="text" id="endDate" name="endDate" placeholder="DD/MM/YYYY" maxlength="10">
                </div>
                
                <button onclick="filterData()">Filtrar</button>
            </div>
        </div>
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
            
            let query = `SELECT GRUPO, ORIGEM, CHAVEACESSO, CODEMP, NUNOTA, NUMNOTA, 
                        DHEMISSAO, CODPARC, RAZAOSOCIAL, UF, CNPJ_CPF, SEQUENCIA, 
                        CFOP, CST, NCM, CODPROD, DESCRPROD, CODVOL, QTDNEG, 
                        VLRUNIT, VLRTOT, BASEICMS, ALIQICMS, VLRICMS 
                        FROM AD_TEST_XMS_SIS_SATIS WHERE 1=1`;
            query += ` AND DHEMISSAO >= '${startDate}'`;
            query += ` AND DHEMISSAO <= '${endDate}'`;
            query += ' ORDER BY GRUPO';

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
            
            // Create table wrapper for responsive design
            const tableWrapper = document.createElement('div');
            tableWrapper.className = 'table-container';
            
            const table = document.createElement('table');
            
            // Create table header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const headers = [
                'Grupo', 'Origem', 'Chave de Acesso', 'Empresa', 'Nº Nota Internal',
                'Nº Nota', 'Data Emissão', 'Cód. Parceiro', 'Razão Social', 'UF',
                'CNPJ/CPF', 'Sequência', 'CFOP', 'CST', 'NCM', 'Cód. Produto',
                'Descrição Produto', 'Unidade', 'Quantidade', 'Valor Unitário',
                'Valor Total', 'Base ICMS', 'Alíquota ICMS', 'Valor ICMS'
            ];
            
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // Create table body
            const tbody = document.createElement('tbody');
            
            // Track current group for color alternation
            let currentGroup = null;
            let isEvenGroup = true;
            
            data.forEach(row => {
                const tr = document.createElement('tr');
                
                // Check if group has changed
                if (currentGroup !== row['GRUPO']) {
                    currentGroup = row['GRUPO'];
                    isEvenGroup = !isEvenGroup;
                }
                
                // Apply group-based class
                tr.className = isEvenGroup ? 'group-even' : 'group-odd';
                
                // Create cells for each column
                [
                    'GRUPO', 'ORIGEM', 'CHAVEACESSO', 'CODEMP', 'NUNOTA',
                    'NUMNOTA', 'DHEMISSAO', 'CODPARC', 'RAZAOSOCIAL', 'UF',
                    'CNPJ_CPF', 'SEQUENCIA', 'CFOP', 'CST', 'NCM', 'CODPROD',
                    'DESCRPROD', 'CODVOL', 'QTDNEG', 'VLRUNIT', 'VLRTOT',
                    'BASEICMS', 'ALIQICMS', 'VLRICMS'
                ].forEach(field => {
                    const td = document.createElement('td');
                    let value = row[field];

                    // Format specific fields
                    if (field === 'DHEMISSAO') {
                        value = value ? (() => {
                            const day = value.substring(0, 2);
                            const month = value.substring(2, 4);
                            const year = value.substring(4, 8);
                            return `${day}/${month}/${year}`;
                        })() : '';
                    } else if (['VLRUNIT', 'VLRTOT', 'BASEICMS', 'VLRICMS'].includes(field)) {
                        value = new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                        }).format(value);
                    } else if (field === 'ALIQICMS') {
                        value = value ? `${value}%` : '';
                    } else if (field === 'QTDNEG') {
                        value = new Intl.NumberFormat('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }).format(value);
                    }

                    td.textContent = value || '';
                    tr.appendChild(td);
                });
                
                tbody.appendChild(tr);
            });
            
            table.appendChild(tbody);
            tableWrapper.appendChild(table);
            container.appendChild(tableWrapper);
        }

        // Enhanced toggle function
        function toggleFilters() {
            const content = document.getElementById('filterContent');
            const icon = document.querySelector('.toggle-icon');
            const header = document.querySelector('.filter-header');
            
            // Toggle the expanded state
            const isExpanding = !content.classList.contains('expanded');
            
            // Update classes
            content.classList.toggle('expanded');
            icon.classList.toggle('expanded');
            
            // Store the state
            localStorage.setItem('filterMenuExpanded', isExpanding);
            
            // Optional: Scroll into view if expanding
            if (isExpanding) {
                setTimeout(() => {
                    header.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }

        // Initialize filter state and add keyboard support
        document.addEventListener('DOMContentLoaded', function() {
            const content = document.getElementById('filterContent');
            const icon = document.querySelector('.toggle-icon');
            const header = document.querySelector('.filter-header');
            const isExpanded = localStorage.getItem('filterMenuExpanded') === 'true';
            
            if (isExpanded) {
                content.classList.add('expanded');
                icon.classList.add('expanded');
            }

            // Add keyboard support
            header.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleFilters();
                }
            });
            
            header.setAttribute('tabindex', '0');
            header.setAttribute('role', 'button');
            header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        });
    </script>
</body>
</html>