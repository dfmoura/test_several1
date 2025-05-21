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
    <title>Fluxo de Caixa - Receitas e Despesas</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        .container {
            width: 100%;
            padding: 20px;
        }
        .header {
            display: flex;
            justify-content: center;
            padding: 10px;
            background: #f1f1f1;
            margin-bottom: 20px;
        }
        .header button {
            margin: 0 10px;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            background: linear-gradient(145deg, #055c5c, #a1a2a1);
            color: white;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .header button:hover {
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            transform: translateY(-2px);
        }
        .section {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        .chart-container {
            width: 48%;
            height: 400px;
            padding: 20px;
            box-sizing: border-box;
        }
        @keyframes shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            50% { transform: translateX(5px); }
            75% { transform: translateX(-5px); }
            100% { transform: translateX(0); }
        }
        .shake {
            animation: shake 0.5s;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center; 
        }
        th:hover {
            background-color: #7e8b85;
        }
        th {
            background-color: #f2f2f2;
        }
        .total-row {
            font-weight: bold;
            background-color: #e6e6e6;
        }
        .blurred {
            filter: blur(3px);
            opacity: 0.5;
            transition: all 0.5s ease;
        }
        .focused {
            filter: blur(0);
            opacity: 1;
            transform: scale(1.05);
            transition: all 0.4s ease;
        }
    </style>
    <snk:load/>
</head>
<body>
    <div class="header">
        <button onclick="abrir_nivel('lvl_ccy8ux', '')">Voltar ao Nivel Anterior</button>
 </div>

    <snk:query var="valoresdias">

    SELECT 
    SUM(CASE WHEN DET.TIPOMOV = 'DESPESA' THEN DET.VLRDESDOB ELSE 0 END)AS PROVISAO_DESPESA,
    SUM(CASE WHEN FIN.RECDESP = -1 THEN  FIN.VLRDESDOB ELSE 0 END) AS REAL_DESPESA,
    SUM(CASE WHEN DET.TIPOMOV = 'RECEITA' THEN DET.VLRDESDOB ELSE 0 END) AS PROVISAO_RECEITA,
    SUM(CASE WHEN FIN.RECDESP = 1 THEN  FIN.VLRDESDOB ELSE 0 END) AS REAL_RECEITA,
    DET.MES,
    TO_CHAR(DET.DTVENC,'DD-MM-YY')AS DTVENC
    
    FROM AD_PROVISAODETALHE DET
    INNER JOIN 
    TGFFIN FIN ON DET.NUFIN = FIN.NUFIN  
    WHERE DET.REFERENCIA BETWEEN :P_MES.INI AND :P_MES.FIN

    GROUP BY 
    DET.MES,
    TO_CHAR(DET.DTVENC,'DD-MM-YY')
    ORDER BY TO_CHAR(DET.DTVENC,'DD-MM-YY')

    </snk:query>


    <snk:query var="valoresnat">
        SELECT 
        DET.CODPARC|| ' - '|| DET.NOMEPARC AS PARCEIRO,
        SUM(CASE WHEN DET.TIPOMOV = 'DESPESA' THEN DET.VLRDESDOB ELSE 0 END)AS PROVISAO_DESPESA,
        SUM(CASE WHEN FIN.RECDESP = -1 THEN  FIN.VLRDESDOB ELSE 0 END) AS REAL_DESPESA,
        SUM(CASE WHEN DET.TIPOMOV = 'RECEITA' THEN DET.VLRDESDOB ELSE 0 END) AS PROVISAO_RECEITA,
        SUM(CASE WHEN FIN.RECDESP = 1 THEN  FIN.VLRDESDOB ELSE 0 END) AS REAL_RECEITA,
        DET.MES,
       TO_CHAR(DET.DTVENC, 'DD-MM')AS DTVENC
        
        FROM AD_PROVISAODETALHE DET
        INNER JOIN 
        TGFFIN FIN ON DET.NUFIN = FIN.NUFIN  

        WHERE DET.REFERENCIA BETWEEN :P_MES.INI AND :P_MES.FIN
   
        GROUP BY 
        DET.MES,
        DET.DTVENC,
        DET.CODPARC,
        DET.NOMEPARC 
        ORDER BY DET.DTVENC
    </snk:query>

    <div class="container">
        <div class="section">
            <div class="chart-container">
                <canvas id="revenueChart"></canvas>
            </div>
            <div class="chart-container">
                <canvas id="expenseChart"></canvas>
            </div>
        </div>
        
        <div class="section">
            <table>
                <thead>
                    <tr>
                        <th>Parceiro</th>
                        <th>Mês</th>
                        <th>Provisionado Receita</th>
                        <th>Realizado em Receita</th>
                        <th>Provisionado Despesa</th>
                        <th>Realizado em Despesa</th>
                        <th>Data de Vencimento</th>  
                    </tr>
                </thead>
                <tbody id="tableBody">
                    <c:forEach items="${valoresnat.rows}" var="row">
                        <tr>
                            <td>${row.PARCEIRO}</td>
                            <td>${row.MES}</td>
                            <td><fmt:formatNumber value="${row.PROVISAO_RECEITA}" type="currency" currencySymbol="R$" /></td>
                            <td><fmt:formatNumber value="${row.REAL_RECEITA}" type="currency" currencySymbol="R$" /></td>
                            <td><fmt:formatNumber value="${row.PROVISAO_DESPESA}" type="currency" currencySymbol="R$" /></td>
                            <td><fmt:formatNumber value="${row.REAL_DESPESA}" type="currency" currencySymbol="R$" /></td>
                            <td>${row.DTVENC}</td>
                        </tr>
                    </c:forEach>
                </tbody>
            </table>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>

        function getUrlParameter(name) {
            name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
            var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
            var results = regex.exec(location.search);
            return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
        };

        var selectedMonth = getUrlParameter('NUMES');

        function atualizar(codigo) {
            const params = {':NUMES': parseInt(codigo)};
            refreshDetails('lvl_a1oqcus',params);
        }

        function abrir_nivel(Codigo){
            var params = {':NUMES': parseInt(Codigo)};
            var level = 'lvl_ccy8ux';
            openLevel(level, params);
        }
        const labels = [];
        const provisaoreceita = [];
        const provisaodespesa = [];
        const realdespesa = [];
        const realreceita = [];

        <c:forEach items="${valoresdias.rows}" var="row">
            labels.push('${row.DTVENC}');
            provisaoreceita.push(${row.PROVISAO_RECEITA});
            provisaodespesa.push(${row.PROVISAO_DESPESA});
            realdespesa.push(${row.REAL_DESPESA});
            realreceita.push(${row.REAL_RECEITA});
        </c:forEach>

        const revenueCtx = document.getElementById('revenueChart').getContext('2d');
        const expenseCtx = document.getElementById('expenseChart').getContext('2d');

        const revenueChart = new Chart(revenueCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Provisão Receita',
                        data: provisaoreceita,
                        backgroundColor: 'rgba(0, 128, 0, 1)',
                        borderColor: 'rgba(0, 128, 0, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Receita Realizada',
                        data: realreceita,
                        backgroundColor: 'rgba(10, 175, 160)',
                        borderColor: 'rgba(10, 175, 160)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Receitas'
                    }
                }
            }
        });

        const expenseChart = new Chart(expenseCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Provisão de Despesa',
                        data: provisaodespesa,
                        backgroundColor: 'rgba(245,110,30)',
                        borderColor: 'rgba(245,110,30)',
                        borderWidth: 1
                    },
                    {
                        label: 'Realizado de Despesa',
                        data: realdespesa,
                        backgroundColor: 'rgba(215,220,35)',
                        borderColor: 'rgba(215,220,35)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Despesas'
                    }
                }
            }
        });

        function updateFocus(chart, tableBodyId, focusIndex) {
            chart.data.datasets.forEach((dataset) => {
                dataset.backgroundColor = dataset.data.map((_, index) => 
                    index === focusIndex ? 
                        Chart.helpers.color(dataset.borderColor).alpha(1).rgbString() :
                        Chart.helpers.color(dataset.borderColor).alpha(0.7).rgbString()
                );
            });
            chart.update();

            const rows = document.getElementById(tableBodyId).querySelectorAll('tr:not(.total-row)');
            rows.forEach((row, index) => {
                if (index === focusIndex) {
                    row.classList.add('focused');
                    row.style.backgroundColor = '#ffcc80';
                } else {
                    row.classList.remove('focused');
                    row.style.backgroundColor = '';
                }
            });
        }

        const tableRows = document.querySelectorAll('#tableBody tr');
        tableRows.forEach((row, index) => {
            row.addEventListener('mouseenter', () => {
                updateFocus(revenueChart, 'tableBody', index);
                updateFocus(expenseChart, 'tableBody', index);
            });
            row.addEventListener('mouseleave', () => {
                updateFocus(revenueChart, 'tableBody', -1);
                updateFocus(expenseChart, 'tableBody', -1);
            });
        });
        if (selectedMonth) {
            document.title = 'Fluxo de Caixa - Mês ' + selectedMonth;
            var messageElement = document.createElement('h2');
            messageElement.textContent = 'Dados para o mês ' + selectedMonth;
            document.body.insertBefore(messageElement, document.body.firstChild);
        }

        document.addEventListener('DOMContentLoaded', function() {
            const buttons = document.querySelectorAll('.header button');
            
            buttons.forEach(button => {
                button.addEventListener('mouseenter', function() {
                    this.classList.add('shake');
                });
                
                button.addEventListener('animationend', function() {
                    this.classList.remove('shake');
                });
            });
        });
    </script>
</body>
</html>