<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Receitas e Despesas por Natureza</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.sheetjs.com/xlsx-0.19.3/package/dist/xlsx.full.min.js"></script>
    
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            overflow: hidden;
        }
        .container {
            display: flex;
            height: calc(100vh - 60px); /* Subtract header height */
        }
        .left-panel {
            width: 50%;
            overflow-y: auto;
            padding: 20px;
        }
        .right-panel {
            width: 50%;
            display: flex;
            flex-direction: column;
            padding: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem; /* Reduced table font size */
        }
        th, td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 10;
            font-size: 0.9rem; /* Slightly larger than body but still reduced */
        }
        .cards-container {
            display: flex;
            height: 50%;
            gap: 10px;
        }
        .cards-column {
            display: flex;
            flex-direction: column;
            width: 50%;
            gap: 10px;
        }
        .card {
            flex: 1;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border: 2px solid #333;
        }
        .card h3 {
            margin-top: 0;
            font-size: 1.5em;
        }
        .card p {
            margin-bottom: 0;
            font-weight: bold;
        }
        .card-revenue {
            background: linear-gradient(145deg, #e6ffe6, #ccffcc);
        }
        .card-revenue:nth-child(2) {
            background: linear-gradient(145deg, #ccffcc, #b3ffb3);
        }
        .card-revenue:nth-child(3) {
            background: linear-gradient(145deg, #b3ffb3, #99ff99);
        }
        .card-expense {
            background: linear-gradient(145deg, #fff2e6, #ffd9b3);
        }
        .card-expense:nth-child(2) {
            background: linear-gradient(145deg, #ffd9b3, #ffc080);
        }
        .card-expense:nth-child(3) {
            background: linear-gradient(145deg, #ffc080, #ffa64d);
        }
        .highlighted {
            background-color: #ffff99;
        }
        .header {
            display: flex;
            justify-content: center;
            padding: 10px;
            background: #f1f1f1;
            height: 40px;
        }
        .header button {
            margin: 0 10px;
            padding: 5px 10px;
            border: none;
            border-radius: 5px;
            background: linear-gradient(145deg, #055c5c, #a1a2a1);
            color: white;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .header button:hover {
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            transform: translateY(-2px);
        }
        tr {
            cursor: pointer;
        }
        .table-container {
            max-height: calc(100vh - 120px);
            overflow-y: auto;
        }
        .total-row {
            font-weight: bold;
            background-color: #e6e6e6;
        }
        .chart-container {
            height: calc(100vh - 120px); /* Updated to take full height */
            width: 100%;
            position: relative;
        }

        #columnChart {
            width: 100% !important;
            height: 100% !important;
        }

        .export-btn {
            position: fixed;
            top: 10px;
            right: 20px; /* Aumentei de 0px para 20px para dar um pouco de margem */
            z-index: 1000;
            background: linear-gradient(145deg, #228B22, #32CD32);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 16px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 600;
        }

        .export-btn:hover {
            background: linear-gradient(145deg, #32CD32, #228B22);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
            transform: translateY(-2px);
        }

        .export-btn:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .excel-icon {
            width: 20px;
            height: 20px;
            fill: currentColor;
        }        


    </style>
    <snk:load/>
</head>
<body>

                    <!-- Botão de exportação Excel -->
                    <button class="export-btn" onclick="exportToExcel()" title="Exportar para Excel">
                        <svg class="excel-icon" viewBox="0 0 24 24">
                            <path
                                d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                            <path
                                d="M10.05,11.22L12.88,14.7H15L11.87,10.5L14.85,6.5H12.96L10.05,9.64L7.14,6.5H5.29L8.27,10.5L5.14,14.7H7.02L10.05,11.22Z" />
                        </svg>
    
                    </button>


    <snk:query var="valoresnat">
        SELECT

        DESCRNAT,
        SUM(ABS(PROVISAO_DESPESA))AS PROVISAO_DESPESA,
        SUM(ABS(REAL_DESPESA))AS REAL_DESPESA,
        SUM(ABS(PROVISAO_DESPESA- REAL_DESPESA)) AS DIVER_DESPESA,
        SUM(ABS(PROVISAO_RECEITA))AS PROVISAO_RECEITA ,
        SUM(ABS(REAL_RECEITA))AS REAL_RECEITA,
        SUM(ABS(PROVISAO_RECEITA - REAL_RECEITA)) AS DIVER_RECEITA
        
        
        FROM
        (SELECT 
            S.DESCRNAT,
            S.MES, 
            S.PROVISAO_DESPESA,
            S.PROVISAO_RECEITA,
        
            NVL((SELECT SUM(VLRBAIXA) 
             FROM VGFFIN 
             WHERE DTVENC BETWEEN :P_MES.INI AND :P_MES.FIN
               AND CODBCO IS NOT NULL
               AND PROVISAO = 'N'
               AND RECDESP = 1
               AND DHBAIXA IS NOT NULL
               AND CODNAT = S.CODNAT),0) AS REAL_RECEITA,
           NVL( (SELECT SUM(VLRDESDOB) 
             FROM TGFFIN 
             WHERE DTVENC BETWEEN :P_MES.INI AND :P_MES.FIN
               AND CODBCO IS NOT NULL
               AND PROVISAO = 'N'
               AND RECDESP = -1
               AND DHBAIXA IS NOT NULL
               AND CODNAT = S.CODNAT),0) AS REAL_DESPESA
        FROM 
        (
            SELECT 
                DET.CODNAT,
                DET.DESCRNAT AS DESCRNAT,
                SUM(CASE WHEN DET.TIPOMOV = 'DESPESA' THEN DET.VLRDESDOB ELSE 0 END) AS PROVISAO_DESPESA,
                SUM(CASE WHEN DET.TIPOMOV = 'RECEITA' THEN DET.VLRDESDOB ELSE 0 END) AS PROVISAO_RECEITA,
                DET.MES
            FROM AD_PROVISAODETALHE DET
            INNER JOIN TGFFIN FIN ON DET.NUFIN = FIN.NUFIN  
            WHERE DET.REFERENCIA BETWEEN :P_MES.INI AND :P_MES.FIN
            GROUP BY DET.DESCRNAT, DET.MES, DET.CODNAT
            ORDER BY DET.DESCRNAT
        ) S
          )X
        GROUP BY DESCRNAT
        ORDER BY DESCRNAT
    </snk:query>

    <div class="container">
        <div class="left-panel">
            <div class="table-container">
                <table id="naturezaTable">
                    <thead>
                        <tr>
                            <th>Natureza</th>
                            <th>Provisão de Receita</th>
                            <th>Real de Receita</th>
                            <th>Divergência de Receita</th>
                            <th>Provisão de Despesa</th>
                            <th>Real de Despesa</th>
                            <th>Divergência de Despesa</th>
                        </tr>
                    </thead>
                    <tbody id="valoresnat">
                        <c:forEach items="${valoresnat.rows}" var="row">
                            <tr onclick="selectNatureza('${row.DESCRNAT}')">
                                <td>${row.DESCRNAT}</td>
                                <td><fmt:formatNumber value="${row.PROVISAO_RECEITA}"  type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                <td><fmt:formatNumber value="${row.REAL_RECEITA}"  type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                <td><fmt:formatNumber value="${row.DIVER_RECEITA}"  type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                <td><fmt:formatNumber value="${row.PROVISAO_DESPESA}"  type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                <td><fmt:formatNumber value="${row.REAL_DESPESA}"  type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                <td><fmt:formatNumber value="${row.DIVER_DESPESA}"  type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                            </tr>
                        </c:forEach>
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td>Total</td>
                            <td id="totalProvisaoReceita"></td>
                            <td id="totalRealReceita"></td>
                            <td id="totalDivergenciaReceita"></td>
                            <td id="totalProvisaoDespesa"></td>
                            <td id="totalRealDespesa"></td>
                            <td id="totalDivergenciaDespesa"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
        <div class="right-panel">
            <div class="chart-container">
                <canvas id="columnChart"></canvas>
            </div>
        </div>
    </div>

    <script>
        function atualizar(codigo) {
            const params = {':NUMES': parseInt(codigo)};
            refreshDetails('lvl_a1oqcus',params);
        }

        function abrir_nivel(Codigo){
            var params = {':NUMES': parseInt(Codigo)};
            var level = 'lvl_ccy8ux';
            openLevel(level, params);
        }
        function abrir_nivel4(Codigo){
            var params = '';
            var level = 'br.com.sankhya.menu.adicional.nuDsb.216.1';
            openApp(level, params);
        }

        let columnChart;
        let selectedNatureza = null;
        let tableData = [];



        // Função para exportar tabela para Excel
        function exportToExcel() {
        const table = document.getElementById('naturezaTable');
        const wb = XLSX.utils.table_to_book(table, {
            sheet: "Receitas e Despesas",
            raw: true // Mantém os valores originais
        });

        // Formatar números como moeda brasileira
        const ws = wb.Sheets["Receitas e Despesas"];
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        // Aplicar formato de moeda para colunas numéricas (colunas 2-7)
        for (let R = 1; R <= range.e.r; ++R) {
            for (let C = 1; C <= range.e.c; ++C) {
                if (C >= 1 && C <= 6) { // Colunas de valores
                    const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
                    if (ws[cell_address]) {
                        ws[cell_address].z = '#,##0.00;[Red]-#,##0.00';
                        // Converter texto para número
                        if (typeof ws[cell_address].v === 'string') {
                            const numValue = parseFloat(ws[cell_address].v.replace(/\./g, '').replace(',', '.'));
                            if (!isNaN(numValue)) {
                                ws[cell_address].v = numValue;
                                ws[cell_address].t = 'n';
                            }
                        }
                    }
                }
            }
        }

        // Estilizar cabeçalho
        for (let C = 0; C <= range.e.c; ++C) {
            const cell_address = XLSX.utils.encode_cell({ c: C, r: 0 });
            if (ws[cell_address]) {
                ws[cell_address].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "4472C4" } },
                    alignment: { horizontal: "center" }
                };
            }
        }

        // Gerar nome do arquivo com data atual
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
        const filename = `Receitas_Despesas_${dateStr}.xlsx`;

        // Salvar arquivo
        XLSX.writeFile(wb, filename);
    }





        function createColumnChart(data) {
            const ctx = document.getElementById('columnChart').getContext('2d');
            
            // Destroy previous chart if it exists
            if (columnChart) {
                columnChart.destroy();
            }
            
            columnChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Provisão Receita', 'Real Receita', 'Divergência Receita', 'Provisão Despesa', 'Real Despesa', 'Divergência Despesa'],
                    datasets: [{
                        label: 'Valores',
                        data: data,
                        backgroundColor: [
                            'rgba(0, 128, 0, 1)',
                            'rgba(10, 175, 160)',
                            'rgba(60, 70, 150, 0)',
                            'rgba(245,110,30)',
                            'rgba(215,220,35)',
                            'rgba(235,25,70)'
                        ],
                        borderColor: [
                            'rgba(0, 128, 0, 1)',
                            'rgba(10, 175, 160)',
                            'rgba(60, 70, 150, 0)',
                            'rgba(245,110,30)',
                            'rgba(215,220,35)',
                            'rgba(235,25,70)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        function updateChart(data) {
            if (!columnChart) {
                createColumnChart(data);
                return;
            }
            
            columnChart.data.datasets[0].data = data;
            columnChart.update();
        }

        function selectNatureza(natureza) {
            selectedNatureza = natureza;
            updateChartWithSelectedNatureza();
            highlightSelectedRow(natureza);
        }

        function updateChartWithSelectedNatureza() {
            if (!selectedNatureza && tableData.length > 0) {
                selectedNatureza = tableData[0].DESCRNAT;
            }
            
            const selectedRow = tableData.find(row => row.DESCRNAT === selectedNatureza);
            
            if (selectedRow) {
                const data = [
                    parseNumber(selectedRow.PROVISAO_RECEITA),
                    parseNumber(selectedRow.REAL_RECEITA),
                    parseNumber(selectedRow.DIVER_RECEITA),
                    parseNumber(selectedRow.PROVISAO_DESPESA),
                    parseNumber(selectedRow.REAL_DESPESA),
                    parseNumber(selectedRow.DIVER_DESPESA)
                ];
                updateChart(data);
            }
        }

        function highlightSelectedRow(natureza) {
            const rows = document.querySelectorAll('#valoresnat tr');
            rows.forEach(row => row.classList.remove('highlighted'));
            const selectedRow = Array.from(rows).find(row => row.cells[0].textContent === natureza);
            if (selectedRow) {
                selectedRow.classList.add('highlighted');
            }
        }

        function calculateTotals() {
            const rows = document.querySelectorAll('#valoresnat tr');
            let totals = [0, 0, 0, 0, 0, 0];

            rows.forEach(row => {
                for (let i = 1; i < 7; i++) {
                    totals[i-1] += parseFloat(row.cells[i].textContent.replace(/\./g, '').replace(',', '.'));
                }
            });

            document.getElementById('totalProvisaoReceita').textContent = totals[0].toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('totalRealReceita').textContent = totals[1].toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('totalDivergenciaReceita').textContent = totals[2].toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('totalProvisaoDespesa').textContent = totals[3].toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('totalRealDespesa').textContent = totals[4].toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('totalDivergenciaDespesa').textContent = totals[5].toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }

        function parseNumber(value) {
            if (typeof value === 'number') return value;
            return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
        }

        function formatNumber(value) {
            if (typeof value === 'string') {
                value = parseNumber(value);
            }
            return value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }

        function generateTableFromData(data) {
            const tableBody = document.getElementById('valoresnat');
            tableBody.innerHTML = '';
            
            data.forEach(row => {
                const tr = document.createElement('tr');
                tr.onclick = () => selectNatureza(row.DESCRNAT);
                
                const cells = [
                    row.DESCRNAT,
                    formatNumber(row.PROVISAO_RECEITA),
                    formatNumber(row.REAL_RECEITA),
                    formatNumber(row.DIVER_RECEITA),
                    formatNumber(row.PROVISAO_DESPESA),
                    formatNumber(row.REAL_DESPESA),
                    formatNumber(row.DIVER_DESPESA)
                ];
                
                cells.forEach(cellText => {
                    const td = document.createElement('td');
                    td.textContent = cellText;
                    tr.appendChild(td);
                });
                
                tableBody.appendChild(tr);
            });
            
            calculateTotals();
            updateChartWithSelectedNatureza();
        }

        // Initialize when the page loads
        document.addEventListener('DOMContentLoaded', function() {
            // Convert JSTL data to JavaScript array
            tableData = [
                <c:forEach items="${valoresnat.rows}" var="row" varStatus="loop">
                {
                    DESCRNAT: '${row.DESCRNAT}',
                    PROVISAO_RECEITA: ${row.PROVISAO_RECEITA},
                    REAL_RECEITA: ${row.REAL_RECEITA},
                    DIVER_RECEITA: ${row.DIVER_RECEITA},
                    PROVISAO_DESPESA: ${row.PROVISAO_DESPESA},
                    REAL_DESPESA: ${row.REAL_DESPESA},
                    DIVER_DESPESA: ${row.DIVER_DESPESA}
                }<c:if test="${!loop.last}">,</c:if>
                </c:forEach>
            ];
            
            // Generate the table
            generateTableFromData(tableData);
            
            // Initialize the chart
            if (tableData.length > 0) {
                updateChartWithSelectedNatureza();
            }
        });
    </script>
</body>
</html>