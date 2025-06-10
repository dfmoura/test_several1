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
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 10;
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

    </style>
    <snk:load/>
</head>
<body>


    <snk:query var="valoresnat">
        SELECT
        DESCRNAT,
        MES, 
        ABS(PROVISAO_DESPESA)AS PROVISAO_DESPESA,
        ABS(REAL_DESPESA)AS REAL_DESPESA,
        ABS(PROVISAO_DESPESA- REAL_DESPESA) AS DIVER_DESPESA,
        ABS(PROVISAO_RECEITA)AS PROVISAO_RECEITA ,
        ABS(REAL_RECEITA)AS REAL_RECEITA,
        ABS(PROVISAO_RECEITA - REAL_RECEITA) AS DIVER_RECEITA        
        FROM
        (SELECT 
            S.DESCRNAT,
            S.MES, 
            S.PROVISAO_DESPESA,
            S.PROVISAO_RECEITA,
        
            NVL((SELECT SUM(VLRBAIXA) 
             FROM VGFFIN 
             WHERE TO_NUMBER(TO_CHAR(DTVENC,'MMYYYY')) = TO_NUMBER(:A_MESANO)
             
               AND CODBCO IS NOT NULL
               AND PROVISAO = 'N'
               AND RECDESP = 1
               AND DHBAIXA IS NOT NULL
               AND CODNAT = S.CODNAT),0) AS REAL_RECEITA,
           NVL( (SELECT SUM(VLRDESDOB) 
             FROM TGFFIN 
             WHERE TO_NUMBER(TO_CHAR(DTVENC,'MMYYYY')) = TO_NUMBER(:A_MESANO)
             
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
            WHERE TO_NUMBER(TO_CHAR(DET.DTVENC,'MMYYYY')) = TO_NUMBER(:A_MESANO)
            GROUP BY DET.DESCRNAT, DET.MES, DET.CODNAT
            ORDER BY DET.DESCRNAT
        ) S
          )X
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
                                <td class="provisao-receita"><fmt:formatNumber value="${row.PROVISAO_RECEITA}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                <td class="real-receita"><fmt:formatNumber value="${row.REAL_RECEITA}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                <td class="divergencia-receita"><fmt:formatNumber value="${row.DIVER_RECEITA}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                <td class="provisao-despesa"><fmt:formatNumber value="${row.PROVISAO_DESPESA}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                <td class="real-despesa"><fmt:formatNumber value="${row.REAL_DESPESA}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                <td class="divergencia-despesa"><fmt:formatNumber value="${row.DIVER_DESPESA}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                            </tr>
                        </c:forEach>
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td>Total</td>
                            <td id="totalProvisaoReceita">0,00</td>
                            <td id="totalRealReceita">0,00</td>
                            <td id="totalDivergenciaReceita">0,00</td>
                            <td id="totalProvisaoDespesa">0,00</td>
                            <td id="totalRealDespesa">0,00</td>
                            <td id="totalDivergenciaDespesa">0,00</td>
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

        function abrir_nivel2(Codigo){
            var params = {':NUMES': parseInt(Codigo)};
            var level = 'lvl_ccy8wm';
            openLevel(level, params);
        }

        function abrir_nivel3(Codigo){
            var params = {':NUMES': parseInt(Codigo)};
            var level = 'lvl_ccy8w2';
            openLevel(level, params);
        }
        function abrir_nivel4(Codigo){
            var params = '';
            var level = 'br.com.sankhya.menu.adicional.nuDsb.216.1';
            openApp(level, params);
        }

        let columnChart;
        let selectedNatureza = null;

        function createColumnChart(data) {
            const ctx = document.getElementById('columnChart').getContext('2d');
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
                    scales: {y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        function updateChart(data) {
            columnChart.data.datasets[0].data = data;
            columnChart.update();
        }

        function selectNatureza(natureza) {
            selectedNatureza = natureza;
            updateCards();
            updateChartWithSelectedNatureza();
            highlightSelectedRow(natureza);
        }

        function updateCards() {
            const selectedData = Array.from(document.querySelectorAll('#valoresnat tr')).find(row => row.cells[0].textContent === selectedNatureza);

            if (selectedData) {
                updateChartWithSelectedNatureza();
            }
        }

        function updateChartWithSelectedNatureza() {
            const selectedData = Array.from(document.querySelectorAll('#valoresnat tr')).find(row => row.cells[0].textContent === selectedNatureza);

            if (selectedData) {
                const data = [
                    parseFloat(selectedData.cells[1].textContent.replace(/\./g, '').replace(',', '.')),
                    parseFloat(selectedData.cells[2].textContent.replace(/\./g, '').replace(',', '.')),
                    parseFloat(selectedData.cells[3].textContent.replace(/\./g, '').replace(',', '.')),
                    parseFloat(selectedData.cells[4].textContent.replace(/\./g, '').replace(',', '.')),
                    parseFloat(selectedData.cells[5].textContent.replace(/\./g, '').replace(',', '.')),
                    parseFloat(selectedData.cells[6].textContent.replace(/\./g, '').replace(',', '.'))
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

        function parseNumber(value) {
            return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
        }

        function calculateTotals() {
            let totalProvisaoReceita = 0;
            let totalRealReceita = 0;
            let totalDivergenciaReceita = 0;
            let totalProvisaoDespesa = 0;
            let totalRealDespesa = 0;
            let totalDivergenciaDespesa = 0;

            const rows = document.querySelectorAll('#valoresnat tr');

            rows.forEach(row => {
                totalProvisaoReceita += parseNumber(row.querySelector('.provisao-receita').textContent);
                totalRealReceita += parseNumber(row.querySelector('.real-receita').textContent);
                totalDivergenciaReceita += parseNumber(row.querySelector('.divergencia-receita').textContent);
                totalProvisaoDespesa += parseNumber(row.querySelector('.provisao-despesa').textContent);
                totalRealDespesa += parseNumber(row.querySelector('.real-despesa').textContent);
                totalDivergenciaDespesa += parseNumber(row.querySelector('.divergencia-despesa').textContent);
            });

            document.getElementById('totalProvisaoReceita').textContent = totalProvisaoReceita.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('totalRealReceita').textContent = totalRealReceita.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('totalDivergenciaReceita').textContent = totalDivergenciaReceita.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('totalProvisaoDespesa').textContent = totalProvisaoDespesa.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('totalRealDespesa').textContent = totalRealDespesa.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('totalDivergenciaDespesa').textContent = totalDivergenciaDespesa.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }


        function updateChartWithSelectedNatureza() {
            const selectedData = Array.from(document.querySelectorAll('#valoresnat tr')).find(row => row.cells[0].textContent === selectedNatureza);

            if (selectedData) {
                const data = [
                    parseNumber(selectedData.cells[1].textContent),
                    parseNumber(selectedData.cells[2].textContent),
                    parseNumber(selectedData.cells[3].textContent),
                    parseNumber(selectedData.cells[4].textContent),
                    parseNumber(selectedData.cells[5].textContent),
                    parseNumber(selectedData.cells[6].textContent)
                ];
                updateChart(data);
            }
        }        




        // Initialize with the first natureza, if there's data
        document.addEventListener('DOMContentLoaded', function() {
            const firstNaturezaRow = document.querySelector('#valoresnat tr');
            if (firstNaturezaRow) {
                const initialData = [
                parseNumber(firstNaturezaRow.cells[1].textContent),
                parseNumber(firstNaturezaRow.cells[2].textContent),
                parseNumber(firstNaturezaRow.cells[3].textContent),
                parseNumber(firstNaturezaRow.cells[4].textContent),
                parseNumber(firstNaturezaRow.cells[5].textContent),
                parseNumber(firstNaturezaRow.cells[6].textContent)
            ];
                createColumnChart(initialData);
                selectNatureza(firstNaturezaRow.cells[0].textContent);
            }
            
            // Calculate totals when the page loads
            calculateTotals();
        });
    </script>
</body>
</html>