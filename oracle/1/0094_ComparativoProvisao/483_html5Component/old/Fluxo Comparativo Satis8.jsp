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
        .section {
            display: flex;
            flex-direction: column;
            margin-bottom: 40px;
        }
        .chart-container {
            width: 70%;
            padding: 20px;
            box-sizing: border-box;
            margin: 0 auto;
        }
        .footer {
            display: flex;
            justify-content: center;
            padding: 10px;
            background: #f1f1f1;
        }
        .footer button {
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
    .footer button:hover {
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        transform: translateY(-2px);
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
            .clickable {
        cursor: pointer;
        text-decoration: underline;
        color: #0066cc;
    }
    .clickable:hover {
        color: #004080;
    }
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.6.1/nouislider.min.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <snk:load/>
</head>
<body>
    <snk:query var="valoresnat">
        SELECT 
        TO_CHAR(REFERENCIA,'MM-YYYY') AS NUMES,
        TO_CHAR(REFERENCIA,'MMYYYY') AS MESANO,
        SUM(CASE WHEN DET.TIPOMOV = 'DESPESA' THEN DET.VLRDESDOB ELSE 0 END) AS PROVISAO_DESPESA,
        SUM(CASE WHEN DET.TIPOMOV = 'RECEITA' THEN DET.VLRDESDOB ELSE 0 END) AS PROVISAO_RECEITA,
        DET.MES||' - '||TO_CHAR(DET.REFERENCIA,'YYYY') AS MES,
        DET.REFERENCIA,

     NVL((SELECT SUM(FINN.VLRBAIXA) 
        FROM TGFFIN FIN2
        INNER JOIN VGFFIN FINN ON FIN2.NUFIN = FINN.NUFIN
        WHERE FIN2.RECDESP = -1
        AND  FIN2.PROVISAO = 'N'
        AND TRUNC(FIN2.DTVENC,'MM') = DET.REFERENCIA
        AND FIN2.CODCTABCOINT IS NOT NULL),0)AS REAL_DESPESA,  
        
        
     NVL((SELECT SUM(FINN.VLRBAIXA) 
        FROM TGFFIN FIN2
        INNER JOIN VGFFIN FINN ON FIN2.NUFIN = FINN.NUFIN
        WHERE FIN2.RECDESP = 1
        AND  FIN2.PROVISAO = 'N'
        AND TRUNC(FIN2.DTVENC,'MM') = DET.REFERENCIA
        AND FIN2.CODCTABCOINT IS NOT NULL),0) AS REAL_RECEITA,


        
        NVL (SUM(CASE WHEN DET.TIPOMOV = 'DESPESA' THEN DET.VLRDESDOB ELSE 0 END) - NVL((SELECT SUM(FINN.VLRBAIXA) 
        FROM TGFFIN FIN2
        INNER JOIN VGFFIN FINN ON FIN2.NUFIN = FINN.NUFIN
        WHERE FIN2.RECDESP = -1
        AND  FIN2.PROVISAO = 'N'
        AND TRUNC(FIN2.DTVENC,'MM') = DET.REFERENCIA
        AND FIN2.CODCTABCOINT IS NOT NULL),0),0 )AS DIVERGENCIA_DESPESA,  
        
      NVL (SUM(CASE WHEN DET.TIPOMOV = 'RECEITA' THEN DET.VLRDESDOB ELSE 0 END)- NVL((SELECT SUM(FINN.VLRBAIXA) 
        FROM TGFFIN FIN2
        INNER JOIN VGFFIN FINN ON FIN2.NUFIN = FINN.NUFIN
        WHERE FIN2.RECDESP = 1
        AND  FIN2.PROVISAO = 'N'
        AND TRUNC(FIN2.DTVENC,'MM') = DET.REFERENCIA
        AND FIN2.CODCTABCOINT IS NOT NULL),0),0) AS DIVERGENCIA_RECEITA
        

     FROM 
        AD_PROVISAODETALHE DET
     INNER JOIN 
        TGFFIN FIN ON DET.NUFIN = FIN.NUFIN 
        WHERE DET.REFERENCIA BETWEEN :P_MES.INI AND :P_MES.FIN

     GROUP BY 
        DET.MES,DET.REFERENCIA      

      ORDER BY DET.REFERENCIA DESC
    </snk:query>

    <div class="container">
        <div class="section">
            <div class="chart-container">
                <canvas id="barChart"></canvas>
            </div>
        </div>
        
        <div class="section">
            <div id="monthSlider" style="margin: 20px;"></div>
            <table>
                <thead>
                    <tr>
                        <th>Mês</th>
                        <th>Verificação</th>
                        <th>Provisionado Receita</th>
                        <th>Realizado em Receita </th>
                        <th>Provisionado Despesa</th>
                        <th>Realizado em Despesa </th>
                        <th>Divergencia em Despesa</th>
                        <th>Divergencia em Receita </th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                    <c:forEach items="${valoresnat.rows}" var="row">
                        <tr>
                            <td class="clickable" onclick="abrirNivel2('${row.NUMES}')">${row.MES}</td>
                            <td>
                                <i class="fas fa-chart-pie clickable" style="color: #4CAF50; margin-right: 10px;" title="Sintético" onclick="abrir_det_nat_sintetico('${row.MESANO}')"></i>
                                <i class="fas fa-chart-line clickable" style="color: #2196F3;" title="Analítico" onclick="abrir_det_nat_analitico('${row.MESANO}')"></i>
                            </td>
                            
                            <td><fmt:formatNumber value="${row.PROVISAO_RECEITA}" type="currency" currencySymbol="R$" /></td>
                            <td><fmt:formatNumber value="${row.REAL_RECEITA}" type="currency" currencySymbol="R$" /></td>
                            <td><fmt:formatNumber value="${row.PROVISAO_DESPESA}" type="currency" currencySymbol="R$" /></td>
                            <td><fmt:formatNumber value="${row.REAL_DESPESA}" type="currency" currencySymbol="R$" /></td>
                            <td><fmt:formatNumber value="${row.DIVERGENCIA_DESPESA}" type="currency" currencySymbol="R$" /></td>
                            <td><fmt:formatNumber value="${row.DIVERGENCIA_RECEITA}" type="currency" currencySymbol="R$" /></td>
                        </tr>
                    </c:forEach>
                </tbody>
            </table>
        </div>
    </div>

    <div class="footer">
        <button onclick="abrir_nivel('lvl_ccy8vw', '')">Detalhamento por dias</button>
        <button onclick="abrir_nivel2('lvl_ccy8v8', '')">Resumo por Naturezas</button>
        <button onclick="abrir_nivel3('lvl_ccy8wm', '')">Detalhamento Analitico por naturezas</button>
    </div>

    <tr>
        <td onclick="abrir_nivel('${row.COD}')">${row.COD}</td>
    </tr>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.6.1/nouislider.min.js"></script>

    <script>

function abrirDetalhe(mesano, level) {
    var params = {'A_MESANO': parseInt(mesano)};
    openLevel(level, params);
}


function abrirNivel2(mesAno) {
    var partes = mesAno.split('-');
    var mes = parseInt(partes[0]);
    var ano = parseInt(partes[1]);

    var params = {
        'A_MES': mes,
        'A_ANO': ano
    };

    var level = 'lvl_ccy8v8';
    openLevel(level, params);
}
	//Função atualizar o Nível
	function atualizar(codigo) {
     const params = {':NUMES': parseInt(codigo)};
	 refreshDetails('lvl_u25bz',params);
    }

    function abrir_nivel(Codigo){
        var params = {':NUMES': parseInt(Codigo)};
        var level = 'lvl_ccy8vw';
        openLevel(level, params);
    }

    function abrir_nivel2(Codigo){
        var params = '';
        var level = 'lvl_akpljcj';
        openLevel(level, params);
    }
    function abrir_nivel3(Codigo){
        var params = {':NUMES': parseInt(Codigo)};
        var level = 'lvl_ccy8wm';
        openLevel(level, params);
    }

    const allData = [];
    const labels = [];
    const provisaoreceita = [];
    const provisaodespesa = [];
    const realdespesa = [];
    const realreceita = [];
    const divergenciadespesa = [];
    const divergenciareceita = [];

    <c:forEach items="${valoresnat.rows}" var="row">
        labels.push('${row.MES}');
        provisaoreceita.push(${row.PROVISAO_RECEITA});
        provisaodespesa.push(${row.PROVISAO_DESPESA});
        realdespesa.push(${row.REAL_DESPESA});
        realreceita.push(${row.REAL_RECEITA});
        divergenciadespesa.push(${row.DIVERGENCIA_DESPESA});
        divergenciareceita.push(${row.DIVERGENCIA_RECEITA});
        allData.push({
            mes: '${row.MES}',
            mesano: '${row.MESANO}',
            provisaoReceita: ${row.PROVISAO_RECEITA},
            realReceita: ${row.REAL_RECEITA},
            provisaoDespesa: ${row.PROVISAO_DESPESA},
            realDespesa: ${row.REAL_DESPESA},
            divergenciaDespesa: ${row.DIVERGENCIA_DESPESA},
            divergenciaReceita: ${row.DIVERGENCIA_RECEITA}
        });
    </c:forEach>

    const ctx = document.getElementById('barChart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Provisão Receita', data: provisaoreceita, backgroundColor: 'rgba(0, 128, 0, 1)', borderColor: 'rgba(0, 128, 0, 1)', borderWidth: 1, stack: 'Receita' },
                { label: 'Realizado Receita', data: realreceita, backgroundColor: 'rgba(10, 175, 160)', borderColor: 'rgba(10, 175, 160)', borderWidth: 1, stack: 'Receita' },
                { label: 'Divergencia Receita', data: divergenciareceita, backgroundColor: 'rgba(60, 70, 150, 0)', borderColor: 'rgba(60, 70, 150, 0)', borderWidth: 1, stack: 'Receita' },
                { label: 'Provisão Despesa', data: provisaodespesa, backgroundColor: 'rgba(245,110,30)', borderColor: 'rgba(245,110,30)', borderWidth: 1, stack: 'Despesa' },
                { label: 'Realizado Despesa', data: realdespesa, backgroundColor: 'rgba(215,220,35)', borderColor: 'rgba(215,220,35)', borderWidth: 1, stack: 'Despesa' },
                { label: 'Divergencia Despesa', data: divergenciadespesa, backgroundColor: 'rgba(235,25,70)', borderColor: 'rgba(235,25,70)', borderWidth: 1, stack: 'Despesa' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                axis: 'y',
                intersect: true
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true }
            },
            plugins: {
                tooltip: { 
                    mode: 'nearest',
                    axis: 'y',
                    intersect: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                },
                legend: { position: 'top' },
                title: { display: true, text: 'Receitas e Despesas' }
            },
            onHover: (event, chartElement) => {
                if (chartElement.length === 1) {
                    const index = chartElement[0].index;
                    updateFocus(chart, 'tableBody', index);
                } else {
                    updateFocus(chart, 'tableBody', -1);
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const dataIndex = elements[0].index;
                    const label = chart.data.datasets[elements[0].datasetIndex].label;
                    const mesano = allData[dataIndex].mesano;
                    
                    const levelMap = {
                        'Realizado Despesa': 'lvl_a46a90p',
                        'Realizado Receita': 'lvl_a46a95l',
                        'Provisão Despesa': 'lvl_a514boq',
                        'Provisão Receita': 'lvl_a514bo4',
                        'Divergencia Despesa': 'lvl_a514bsy',
                        'Divergencia Receita': 'lvl_a514bux'
                    };
                    
                    const level = levelMap[label];
                    if (level) {
                        abrirDetalhe(mesano, level);
                    }
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

    // Table hover effects
    const tableRows = document.querySelectorAll('#tableBody tr');
    tableRows.forEach((row, index) => {
        row.addEventListener('mouseenter', () => updateFocus(chart, 'tableBody', index));
        row.addEventListener('mouseleave', () => updateFocus(chart, 'tableBody', -1));
    });

    // Animate buttons
    document.addEventListener('DOMContentLoaded', function () {
        const buttons = document.querySelectorAll('.footer button');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', function () {
                this.classList.add('shake');
            });
            button.addEventListener('animationend', function () {
                this.classList.remove('shake');
            });
        });

        // Initialize noUiSlider
        const monthSlider = document.getElementById('monthSlider');
        noUiSlider.create(monthSlider, {
            start: [0, labels.length - 1],
            connect: true,
            range: {
                min: 0,
                max: labels.length - 1
            },
            step: 1,
            tooltips: [true, true],
            format: {
                to: function (value) {
                    return labels[Math.round(value)];
                },
                from: function (value) {
                    return labels.indexOf(value);
                }
            }
        });

        // Update chart and table based on slider
        monthSlider.noUiSlider.on('update', function (values, handle) {
            const startLabel = values[0];
            const endLabel = values[1];
            const startIndex = labels.indexOf(startLabel);
            const endIndex = labels.indexOf(endLabel);

            const filteredLabels = labels.slice(startIndex, endIndex + 1);
            chart.data.labels = filteredLabels;
            chart.data.datasets.forEach((dataset, idx) => {
                const allSets = [provisaoreceita, realreceita, divergenciareceita, provisaodespesa, realdespesa, divergenciadespesa];
                dataset.data = allSets[idx].slice(startIndex, endIndex + 1);
            });
            chart.update();

            const rows = document.querySelectorAll('#tableBody tr');
            rows.forEach((row, index) => {
                const label = labels[index];
                if (filteredLabels.includes(label)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    });

    </script>
</body>
</html>