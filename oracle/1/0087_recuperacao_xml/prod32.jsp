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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
                         "Helvetica Neue", Arial, sans-serif;
            font-size: 13px;
            line-height: 1.4;
            color: #333;
        }        
        table {
            border-collapse: separate;
            border-spacing: 0;
            width: 100%;
            font-size: 12px;
        }
        
        thead {
            position: sticky;
            top: 0;
            z-index: 100;
        }

        th {
            background-color: #23a059;  /* Sea Green color */
            color: white;
            font-weight: 600;
            padding: 8px 6px;
            text-align: left;
            border: 1px solid #23a059;  /* Slightly darker green for borders */
            border-bottom: 2px solid #23a059;
            position: sticky;
            top: 0;
            z-index: 10;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            font-size: 12px;
        }

        td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
            vertical-align: middle;
            font-size: 12px;
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
            font-size: 13px;
            color: #444;
            font-weight: 500;
        }

        input[type="text"] {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 13px;
            font-family: inherit;
        }

        input[type="text"]:focus {
            outline: none;
            border-color: #23a059;
            box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
        }

        button {
            padding: 10px 20px;
            background: #23a059;
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
            background: #0e4928;
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
        
        /* Flatpickr custom styles */
        .flatpickr-input {
            background-color: white;
            cursor: pointer;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 13px;
            font-family: inherit;
            width: 100%;
        }
        
        .flatpickr-input:focus {
            outline: none;
            border-color: #23a059;
            box-shadow: 0 0 0 3px rgba(35, 160, 89, 0.1);
        }

        .export-button {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background-color: #23a059;
            color: white;
            border: none;
            border-radius: 50%;
            width: 56px;
            height: 56px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            z-index: 1000;
        }

        .export-button:hover {
            background-color: #0e4928;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
        }

        .export-button:active {
            transform: translateY(0);
        }

        .export-icon {
            width: 24px;
            height: 24px;
            fill: currentColor;
        }

        #searchField {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 13px;
            font-family: inherit;
        }

        #searchField:focus {
            outline: none;
            border-color: #23a059;
            box-shadow: 0 0 0 3px rgba(35, 160, 89, 0.1);
        }

        /* Add these new styles */
        .column-filter {
            position: relative;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
        }

        .filter-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            z-index: 1000;
            min-width: 200px;
            max-height: 300px;
            overflow-y: auto;
            display: none;
            padding: 8px;
            color: black;
        }

        .filter-dropdown.show {
            display: block;
        }

        .filter-dropdown input[type="text"] {
            width: 100%;
            margin-bottom: 8px;
        }

        .filter-options {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .filter-option {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px;
        }

        .filter-option:hover {
            background: #f5f5f5;
        }

        .filter-icon {
            opacity: 0.6;
            font-size: 12px;
            margin-left: 4px;
        }

        .active-filter th {
            color: #23a059;
            font-weight: bold;
        }
    </style>
    <!-- Include SankhyaJX library -->
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <snk:load/>
    <!-- Add Flatpickr CSS and JS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="https://npmcdn.com/flatpickr/dist/l10n/pt.js"></script>
    <!-- Add SheetJS library -->
    <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>
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
                    <label for="searchField">Busca rápida:</label>
                    <input type="text" id="searchField" name="searchField" 
                           placeholder="Digite para filtrar... (use | para múltiplos termos)">
                </div>

                <div class="input-group">
                    <label for="startDate">Data Inicial:</label>
                    <input type="text" id="startDate" name="startDate" placeholder="DD/MM/YYYY" maxlength="10">
                </div>
                
                <div class="input-group">
                    <label for="endDate">Data Final:</label>
                    <input type="text" id="endDate" name="endDate" placeholder="DD/MM/YYYY" maxlength="10">
                </div>
                
                <div class="input-group" style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="showDivergent" name="showDivergent">
                    <label for="showDivergent">Mostrar apenas registros com divergência</label>
                </div>
                
                <div class="input-group" style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="showWithAccessKey" name="showWithAccessKey">
                    <label for="showWithAccessKey">Mostrar registros com Chave de Acesso</label>
                </div>
                
                <button onclick="filterData()">Filtrar</button>
            </div>
        </div>
    </div>
    <div id="tableContainer"></div>

    <button class="export-button" onclick="exportToExcel()" title="Exportar para Excel">
        <svg class="export-icon" viewBox="0 0 24 24">
            <path d="M19,3H5C3.89,3,3,3.89,3,5V19C3,20.11,3.89,21,5,21H19C20.11,21,21,20.11,21,19V5C21,3.89,20.11,3,19,3M9.5,14.25L6.75,11.5L8,10.25L9.5,11.75L15,6.25L16.25,7.5L9.5,14.25Z"/>
        </svg>
    </button>

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
                   date.getFullYear() === parseInt(year) &&
                   date <= new Date(); // Ensure date is not in the future
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
            
            let query = `SELECT TP,GRUPO, ORIGEM, CHAVEACESSO, CODEMP, NUNOTA, NUMNOTA, 
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

        // Replace the date mask functions with Flatpickr initialization
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize Flatpickr for both date inputs
            const dateConfig = {
                dateFormat: "d/m/Y",
                locale: "pt",
                allowInput: true,
                maxDate: "today",
                wrap: true
            };

            flatpickr("#startDate", dateConfig);
            flatpickr("#endDate", dateConfig);
            
            // Remove the old event listeners since we're using Flatpickr now
            // The maskDate function is no longer needed
        });

        // Function to create and populate the table
        function createTable(data) {
            const container = document.getElementById('tableContainer');
            const showOnlyDivergent = document.getElementById('showDivergent').checked;
            const showWithAccessKey = document.getElementById('showWithAccessKey').checked;
            
            const tableWrapper = document.createElement('div');
            tableWrapper.className = 'table-container';
            
            const table = document.createElement('table');
            
            // Create table header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const headers = [
                'TP', 'Grupo', 'Origem', 'Chave de Acesso', 'Empresa', 'NÚ. Único',
                'Nº Nota', 'Data Emissão', 'Cód. Parceiro', 'Razão Social', 'UF',
                'CNPJ/CPF', 'Sequência', 'CFOP', 'CST', 'NCM', 'Cód. Produto',
                'Descrição Produto', 'Unidade', 'Quantidade', 'Valor Unitário',
                'Valor Total', 'Base ICMS', 'Alíquota ICMS', 'Valor ICMS'
            ];
            
            headers.forEach((headerText, index) => {
                const th = document.createElement('th');
                const headerContainer = document.createElement('div');
                headerContainer.className = 'column-filter';
                headerContainer.innerHTML = `
                    ${headerText}
                    <span class="filter-icon">⌄</span>
                    <div class="filter-dropdown">
                        <input type="text" placeholder="Buscar..." class="filter-search">
                        <div class="filter-options"></div>
                    </div>
                `;
                
                // Add click handler for the filter
                headerContainer.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const dropdown = headerContainer.querySelector('.filter-dropdown');
                    const isOpen = dropdown.classList.contains('show');
                    
                    // Close all other dropdowns
                    document.querySelectorAll('.filter-dropdown.show').forEach(d => {
                        if (d !== dropdown) d.classList.remove('show');
                    });
                    
                    // Toggle current dropdown
                    dropdown.classList.toggle('show');
                    
                    if (!isOpen) {
                        // Populate filter options when opening
                        populateFilterOptions(data, index, dropdown);
                    }
                });
                
                th.appendChild(headerContainer);
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // Create table body
            const tbody = document.createElement('tbody');
            
            let currentGroup = null;
            let isEvenGroup = true;
            let groupData = [];
            let visibleGroupCount = 0;  // Add counter for visible groups
            
            // First pass: organize data by groups
            data.forEach((row, index) => {
                if (currentGroup !== row['GRUPO']) {
                    if (groupData.length > 0) {
                        // Check if group should be visible based on filters
                        const shouldShow = shouldShowGroup(groupData, showOnlyDivergent, showWithAccessKey);
                        if (shouldShow) {
                            // Use visibleGroupCount to determine even/odd
                            renderGroupRows(groupData, tbody, visibleGroupCount % 2 === 0, showOnlyDivergent, showWithAccessKey);
                            visibleGroupCount++;
                        }
                    }
                    currentGroup = row['GRUPO'];
                    groupData = [];
                }
                groupData.push(row);
                
                // Process last group
                if (index === data.length - 1) {
                    const shouldShow = shouldShowGroup(groupData, showOnlyDivergent, showWithAccessKey);
                    if (shouldShow) {
                        renderGroupRows(groupData, tbody, visibleGroupCount % 2 === 0, showOnlyDivergent, showWithAccessKey);
                    }
                }
            });
            
            table.appendChild(tbody);
            tableWrapper.appendChild(table);
            container.appendChild(tableWrapper);

            // Add this new function for dynamic searching
            setupSearchField();
        }

        // Add helper function to determine if group should be shown
        function shouldShowGroup(groupData, showOnlyDivergent, showWithAccessKey) {
            if (showOnlyDivergent) {
                const divergenceFields = ['CST', 'NCM', 'QTDNEG', 'VLRUNIT', 
                                       'VLRTOT', 'BASEICMS', 'ALIQICMS', 'VLRICMS'];
                
                if (groupData.length <= 2) {
                    for (let field of divergenceFields) {
                        if (groupData.length === 2 && groupData[0][field] !== groupData[1][field]) {
                            return true;
                        }
                    }
                }
                return false;
            }
            
            if (showWithAccessKey) {
                return groupData.some(row => row['CHAVEACESSO']);
            }
            
            return true;
        }

        function renderGroupRows(groupData, tbody, isEvenGroup, showOnlyDivergent, showWithAccessKey) {
            const divergenceFields = ['CST', 'NCM', 'QTDNEG', 'VLRUNIT', 
                                   'VLRTOT', 'BASEICMS', 'ALIQICMS', 'VLRICMS'];
            
            // Check if group has divergences
            let hasDivergence = false;
            if (groupData.length <= 2) {
                for (let field of divergenceFields) {
                    if (groupData.length === 2 && groupData[0][field] !== groupData[1][field]) {
                        hasDivergence = true;
                        break;
                    }
                }
            }

            // Skip group if showing only divergent records and group has no divergences
            if (showOnlyDivergent && !hasDivergence) {
                return;
            }

            // Skip group if showing only records with access key and none exist
            if (showWithAccessKey && !groupData.some(row => row['CHAVEACESSO'])) {
                return;
            }

            // Render rows
            groupData.forEach((row, index) => {
                const tr = document.createElement('tr');
                tr.className = isEvenGroup ? 'group-even' : 'group-odd';
                
                // Create cells (existing column creation logic)
                [
                    'TP', 'GRUPO', 'ORIGEM', 'CHAVEACESSO', 'CODEMP', 'NUNOTA',
                    'NUMNOTA', 'DHEMISSAO', 'CODPARC', 'RAZAOSOCIAL', 'UF',
                    'CNPJ_CPF', 'SEQUENCIA', 'CFOP', 'CST', 'NCM', 'CODPROD',
                    'DESCRPROD', 'CODVOL', 'QTDNEG', 'VLRUNIT', 'VLRTOT',
                    'BASEICMS', 'ALIQICMS', 'VLRICMS'
                ].forEach(field => {
                    const td = document.createElement('td');
                    let value = row[field];

                    // Check for divergence in specified fields
                    if (divergenceFields.includes(field) && groupData.length <= 2) {
                        const otherRow = index === 0 ? groupData[1] : groupData[0];
                        if (otherRow && otherRow[field] !== value) {
                            td.style.color = 'red';
                            td.style.fontWeight = 'bold';
                        }
                    }

                    // Format specific fields (existing formatting logic)
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

        // Replace the exportToExcel function
        function exportToExcel() {
            const table = document.querySelector('table');
            if (!table || !table.rows.length) {
                alert('Por favor, realize uma pesquisa antes de exportar.');
                return;
            }

            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            
            // Convert table data to worksheet format
            let data = [];
            for (let i = 0; i < table.rows.length; i++) {
                let row = [];
                let cells = table.rows[i].cells;
                
                for (let j = 0; j < cells.length; j++) {
                    // Get the raw text content
                    let cellValue = cells[j].textContent.trim();
                    
                    // Convert currency values back to numbers
                    if (cellValue.startsWith('R$')) {
                        cellValue = Number(cellValue.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
                    }
                    // Convert percentage values back to numbers
                    else if (cellValue.endsWith('%')) {
                        cellValue = Number(cellValue.replace('%', '').trim());
                    }
                    // Convert numeric strings with commas to numbers
                    else if (/^\d+,\d+$/.test(cellValue)) {
                        cellValue = Number(cellValue.replace(',', '.'));
                    }
                    
                    row.push(cellValue);
                }
                data.push(row);
            }

            const ws = XLSX.utils.aoa_to_sheet(data);

            // Set column widths
            const colWidths = [
                {wch: 10},  // TP
                {wch: 10},  // Grupo
                {wch: 10},  // Origem
                {wch: 44},  // Chave de Acesso
                {wch: 8},   // Empresa
                {wch: 12},  // NÚ. Único
                {wch: 10},  // Nº Nota
                {wch: 12},  // Data Emissão
                {wch: 12},  // Cód. Parceiro
                {wch: 40},  // Razão Social
                {wch: 5},   // UF
                {wch: 18},  // CNPJ/CPF
                {wch: 10},  // Sequência
                {wch: 8},   // CFOP
                {wch: 6},   // CST
                {wch: 10},  // NCM
                {wch: 12},  // Cód. Produto
                {wch: 40},  // Descrição Produto
                {wch: 8},   // Unidade
                {wch: 12},  // Quantidade
                {wch: 12},  // Valor Unitário
                {wch: 12},  // Valor Total
                {wch: 12},  // Base ICMS
                {wch: 12},  // Alíquota ICMS
                {wch: 12}   // Valor ICMS
            ];
            ws['!cols'] = colWidths;

            // Add the worksheet to the workbook
            XLSX.utils.book_append_sheet(wb, ws, "Dados");

            // Generate Excel file and trigger download
            XLSX.writeFile(wb, "dados_tabela.xlsx");
        }

        // Add this new function for dynamic searching
        function setupSearchField() {
            const searchField = document.getElementById('searchField');
            let searchTimeout;

            searchField.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const searchTerms = this.value.toLowerCase().split('|').map(term => term.trim()).filter(term => term);
                    const rows = document.querySelectorAll('tbody tr');

                    rows.forEach(row => {
                        // If no search terms, show all rows
                        if (searchTerms.length === 0) {
                            row.style.display = '';
                            return;
                        }

                        // Check if ALL search terms match (AND logic between terms)
                        const shouldShow = searchTerms.every(term => {
                            const cells = Array.from(row.cells);
                            // Check each cell for an exact match
                            return cells.some(cell => {
                                const cellText = cell.textContent.toLowerCase().trim();
                                
                                // Special handling for dates (DD/MM format)
                                if (term.match(/^\d{2}\/\d{2}$/)) {
                                    return cellText.startsWith(term);
                                }
                                
                                // Special handling for numeric values (exact match)
                                if (!isNaN(term)) {
                                    return cellText.includes(term);
                                }
                                
                                // For other cases, check if the cell contains the term
                                return cellText.includes(term);
                            });
                        });

                        row.style.display = shouldShow ? '' : 'none';
                    });
                }, 200); // Reduced debounce delay to 200ms for better responsiveness
            });
        }

        // Add these new functions
        function populateFilterOptions(data, columnIndex, dropdown) {
            const optionsContainer = dropdown.querySelector('.filter-options');
            const searchInput = dropdown.querySelector('.filter-search');
            const headers = [
                'TP', 'GRUPO', 'ORIGEM', 'CHAVEACESSO', 'CODEMP', 'NUNOTA',
                'NUMNOTA', 'DHEMISSAO', 'CODPARC', 'RAZAOSOCIAL', 'UF',
                'CNPJ_CPF', 'SEQUENCIA', 'CFOP', 'CST', 'NCM', 'CODPROD',
                'DESCRPROD', 'CODVOL', 'QTDNEG', 'VLRUNIT', 'VLRTOT',
                'BASEICMS', 'ALIQICMS', 'VLRICMS'
            ];
            
            // Get values only from visible rows
            const visibleRows = Array.from(document.querySelectorAll('tbody tr'))
                .filter(row => row.style.display !== 'none');
            
            // Get unique values from visible rows for the column
            const uniqueValues = [...new Set(visibleRows.map(row => 
                row.cells[columnIndex].textContent.trim()
            ))].filter(Boolean);
            uniqueValues.sort((a, b) => String(a).localeCompare(String(b)));
            
            // Render options
            const renderOptions = (values) => {
                optionsContainer.innerHTML = '';
                values.forEach(value => {
                    const option = document.createElement('div');
                    option.className = 'filter-option';
                    option.innerHTML = `
                        <input type="checkbox" value="${value}">
                        <label>${value}</label>
                    `;
                    optionsContainer.appendChild(option);
                });
            };

            // Initial render
            renderOptions(uniqueValues);

            // Add search functionality
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filteredValues = uniqueValues.filter(value => 
                    String(value).toLowerCase().includes(searchTerm)
                );
                renderOptions(filteredValues);
            });

            // Add filter application
            const applyFilter = () => {
                const selectedValues = [...optionsContainer.querySelectorAll('input:checked')]
                    .map(input => input.value);
                
                const rows = document.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    if (row.style.display !== 'none') { // Only process currently visible rows
                        const cell = row.cells[columnIndex];
                        const cellValue = cell.textContent.trim();
                        row.style.display = selectedValues.length === 0 || 
                            selectedValues.includes(cellValue) ? '' : 'none';
                    }
                });

                // Highlight filtered column
                const th = dropdown.closest('th');
                th.classList.toggle('active-filter', selectedValues.length > 0);
            };

            // Add change event listeners to checkboxes
            optionsContainer.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    applyFilter();
                }
            });
        }
    </script>
</body>
</html>