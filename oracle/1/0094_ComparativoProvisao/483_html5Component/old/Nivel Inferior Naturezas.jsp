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
         height: 400px;
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
    <div class="header">
        <button onclick="abrir_nivel('lvl_ccy8ux', '')">Voltar ao Nivel Anterior</button>
        <button onclick="abrir_nivel2('lvl_ccy8wm', '')">Detalhamento Analitico por naturezas</button>
        <button onclick="abrir_nivel3('lvl_ccy8w2', '')">Detalhamento Analitico de Divergencias </button> 
        <button onclick="abrir_nivel4('')">Dash Fluxo de Caixa </button> 
    </div>

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
             WHERE TO_CHAR(DTVENC,'MM') = :A_MES
             AND TO_CHAR(DTVENC,'YYYY') = :A_ANO
               AND CODBCO IS NOT NULL
               AND PROVISAO = 'N'
               AND RECDESP = 1
               AND DHBAIXA IS NOT NULL
               AND CODNAT = S.CODNAT),0) AS REAL_RECEITA,
           NVL( (SELECT SUM(VLRDESDOB) 
             FROM TGFFIN 
             WHERE TO_CHAR(DTVENC,'MM') = :A_MES
             AND TO_CHAR(DTVENC,'YYYY') = :A_ANO
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
            WHERE TO_CHAR(DET.REFERENCIA,'MM') = :A_MES
            AND TO_CHAR(DET.REFERENCIA,'YYYY') = :A_ANO
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

            <div class="cards-container">
                <div class="cards-column">
                    <div class="card card-revenue" id="cardProvisaoReceita">
                        <h3 id="provisaoReceita">0</h3>
                        <p>Provisão de Receita</p>
                    </div>
                    <div class="card card-revenue" id="cardRealReceita">
                        <h3 id="realReceita">0</h3>
                        <p>Real de Receita</p>
                    </div>
                    <div class="card card-revenue" id="cardDivergenciaReceita">
                        <h3 id="divergenciaReceita">0</h3>
                        <p>Divergência de Receita</p>
                    </div>
                </div>
                <div class="cards-column">
                    <div class="card card-expense" id="cardProvisaoDespesa">
                        <h3 id="provisaoDespesa">0</h3>
                        <p>Provisão de Despesa</p>
                    </div>
                    <div class="card card-expense" id="cardRealDespesa">
                        <h3 id="realDespesa">0</h3>
                        <p>Real de Despesa</p>
                    </div>
                    <div class="card card-expense" id="cardDivergenciaDespesa">
                        <h3 id="divergenciaDespesa">0</h3>
                        <p>Divergência de Despesa</p>
                    </div>
                </div>
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
                document.getElementById('provisaoReceita').textContent = selectedData.cells[1].textContent;
                document.getElementById('realReceita').textContent = selectedData.cells[2].textContent;
                document.getElementById('divergenciaReceita').textContent = selectedData.cells[3].textContent;
                document.getElementById('provisaoDespesa').textContent = selectedData.cells[4].textContent;
                document.getElementById('realDespesa').textContent = selectedData.cells[5].textContent;
                document.getElementById('divergenciaDespesa').textContent = selectedData.cells[6].textContent;
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

        // Initialize with the first natureza, if there's data
        const firstNaturezaRow = document.querySelector('#valoresnat tr');
        if (firstNaturezaRow) {
            const initialData = [
                parseFloat(firstNaturezaRow.cells[1].textContent.replace(/\./g, '').replace(',', '.')),
                parseFloat(firstNaturezaRow.cells[2].textContent.replace(/\./g, '').replace(',', '.')),
                parseFloat(firstNaturezaRow.cells[3].textContent.replace(/\./g, '').replace(',', '.')),
                parseFloat(firstNaturezaRow.cells[4].textContent.replace(/\./g, '').replace(',', '.')),
                parseFloat(firstNaturezaRow.cells[5].textContent.replace(/\./g, '').replace(',', '.')),
                parseFloat(firstNaturezaRow.cells[6].textContent.replace(/\./g, '').replace(',', '.'))
            ];
            createColumnChart(initialData);
            selectNatureza(firstNaturezaRow.cells[0].textContent);
        }

        // Calculate totals when the page loads
        window.onload = calculateTotals;
    </script>
</body>
</html>