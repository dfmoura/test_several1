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


                            /* Adicione este novo estilo para o overlay do logo */
                            .logo-overlay {
                                position: fixed;
                                bottom: 20px;
                                right: 20px;
                                z-index: 9999;
                                opacity: 0.7;
                                transition: opacity 0.3s ease;
                            }

                            .logo-overlay:hover {
                                opacity: 1;
                            }

                            .logo-overlay img {
                                width: 150px;
                                height: auto;
                            }

                            .container {
                                width: 100%;
                                padding: 20px;
                                position: relative;
                                padding-top: 60px;
                                /* Adicionei este padding para dar espaço ao botão */
                            }

                            .section {
                                display: flex;
                                flex-direction: column;
                                margin-bottom: 40px;
                                position: relative;
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
                                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                            }

                            .footer button:hover {
                                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                                transform: translateY(-2px);
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

                            @keyframes shake {
                                0% {
                                    transform: translateX(0);
                                }

                                25% {
                                    transform: translateX(-5px);
                                }

                                50% {
                                    transform: translateX(5px);
                                }

                                75% {
                                    transform: translateX(-5px);
                                }

                                100% {
                                    transform: translateX(0);
                                }
                            }

                            .shake {
                                animation: shake 0.5s;
                            }

                            table {
                                width: 100%;
                                border-collapse: collapse;
                            }

                            th,
                            td {
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
                        <link rel="stylesheet"
                            href="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.6.1/nouislider.min.css" />
                        <link rel="stylesheet"
                            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                        <snk:load />
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
                            AND FIN2.PROVISAO = 'N'
                            AND TRUNC(FIN2.DTVENC,'MM') = DET.REFERENCIA
                            AND FIN2.CODCTABCOINT IS NOT NULL),0)AS REAL_DESPESA,


                            NVL((SELECT SUM(FINN.VLRBAIXA)
                            FROM TGFFIN FIN2
                            INNER JOIN VGFFIN FINN ON FIN2.NUFIN = FINN.NUFIN
                            WHERE FIN2.RECDESP = 1
                            AND FIN2.PROVISAO = 'N'
                            AND TRUNC(FIN2.DTVENC,'MM') = DET.REFERENCIA
                            AND FIN2.CODCTABCOINT IS NOT NULL),0) AS REAL_RECEITA,



                            NVL (SUM(CASE WHEN DET.TIPOMOV = 'DESPESA' THEN DET.VLRDESDOB ELSE 0 END) - NVL((SELECT
                            SUM(FINN.VLRBAIXA)
                            FROM TGFFIN FIN2
                            INNER JOIN VGFFIN FINN ON FIN2.NUFIN = FINN.NUFIN
                            WHERE FIN2.RECDESP = -1
                            AND FIN2.PROVISAO = 'N'
                            AND TRUNC(FIN2.DTVENC,'MM') = DET.REFERENCIA
                            AND FIN2.CODCTABCOINT IS NOT NULL),0),0 )AS DIVERGENCIA_DESPESA,

                            NVL (SUM(CASE WHEN DET.TIPOMOV = 'RECEITA' THEN DET.VLRDESDOB ELSE 0 END)- NVL((SELECT
                            SUM(FINN.VLRBAIXA)
                            FROM TGFFIN FIN2
                            INNER JOIN VGFFIN FINN ON FIN2.NUFIN = FINN.NUFIN
                            WHERE FIN2.RECDESP = 1
                            AND FIN2.PROVISAO = 'N'
                            AND TRUNC(FIN2.DTVENC,'MM') = DET.REFERENCIA
                            AND FIN2.CODCTABCOINT IS NOT NULL),0),0)*-1 AS DIVERGENCIA_RECEITA


                            FROM
                            AD_PROVISAODETALHE DET
                            INNER JOIN
                            TGFFIN FIN ON DET.NUFIN = FIN.NUFIN
                            WHERE DET.REFERENCIA BETWEEN :P_MES.INI AND :P_MES.FIN

                            GROUP BY
                            DET.MES,DET.REFERENCIA

                            ORDER BY DET.REFERENCIA ASC
                        </snk:query>

                                <!-- Botão de exportação Excel -->
                                <button class="export-btn" onclick="exportToExcel()" title="Exportar para Excel">
                                    <svg class="excel-icon" viewBox="0 0 24 24">
                                        <path
                                            d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                        <path
                                            d="M10.05,11.22L12.88,14.7H15L11.87,10.5L14.85,6.5H12.96L10.05,9.64L7.14,6.5H5.29L8.27,10.5L5.14,14.7H7.02L10.05,11.22Z" />
                                    </svg>

                                </button>


                        <div class="container">
                            <div class="section">
                                <div class="chart-container">
                                    <canvas id="barChart"></canvas>
                                </div>
                            </div>

                            <div class="section">


                                <table id="dataTable">
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
                                                <td class="clickable" onclick="abrirNivel2('${row.MESANO}')">${row.MES}
                                                </td>
                                                <td>
                                                    <i class="fas fa-chart-pie clickable"
                                                        style="color: #4CAF50; margin-right: 10px;" title="Sintético"
                                                        onclick="abrir_det_nat_sintetico('${row.MESANO}')"></i>
                                                    <i class="fas fa-chart-line clickable" style="color: #2196F3;"
                                                        title="Analítico"
                                                        onclick="abrir_det_nat_analitico('${row.MESANO}')"></i>
                                                </td>

                                                <td data-value="${row.PROVISAO_RECEITA}">
                                                    <fmt:formatNumber value="${row.PROVISAO_RECEITA}" type="currency"
                                                        currencySymbol="R$" />
                                                </td>
                                                <td data-value="${row.REAL_RECEITA}">
                                                    <fmt:formatNumber value="${row.REAL_RECEITA}" type="currency"
                                                        currencySymbol="R$" />
                                                </td>
                                                <td data-value="${row.PROVISAO_DESPESA}">
                                                    <fmt:formatNumber value="${row.PROVISAO_DESPESA}" type="currency"
                                                        currencySymbol="R$" />
                                                </td>
                                                <td data-value="${row.REAL_DESPESA}">
                                                    <fmt:formatNumber value="${row.REAL_DESPESA}" type="currency"
                                                        currencySymbol="R$" />
                                                </td>
                                                <td data-value="${row.DIVERGENCIA_DESPESA}">
                                                    <fmt:formatNumber value="${row.DIVERGENCIA_DESPESA}" type="currency"
                                                        currencySymbol="R$" />
                                                </td>
                                                <td data-value="${row.DIVERGENCIA_RECEITA}">
                                                    <fmt:formatNumber value="${row.DIVERGENCIA_RECEITA}" type="currency"
                                                        currencySymbol="R$" />
                                                </td>
                                            </tr>
                                        </c:forEach>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="footer">
                            <button onclick="abrir_nivel('lvl_ccy8vw', '')">Detalhamento por dias</button>
                            <button onclick="abrir_nivel2('lvl_ccy8v8', '')">Resumo por Naturezas</button>
                            <button onclick="abrir_nivel3('lvl_ccy8wm', '')">Detalhamento Analitico por
                                naturezas</button>
                        </div>

                        <!-- Substitua o div do logo-overlay por este código -->
                        <div class="logo-overlay">
                            <a href="https://neuon.com.br/" target="_blank" rel="noopener noreferrer">
                                <img src="https://neuon.com.br/logos/logo-5.svg" alt="Neuon Logo">
                            </a>
                        </div>

                        <tr>
                            <td onclick="abrir_nivel('${row.COD}')">${row.COD}</td>
                        </tr>

                        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                        <script
                            src="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.6.1/nouislider.min.js"></script>
                        <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

                        <script>

                            // Função para exportar tabela para Excel
                            function exportToExcel() {
                                const table = document.getElementById('dataTable');
                                const wb = XLSX.utils.book_new();

                                // Criar dados da planilha
                                const data = [];

                                // Adicionar cabeçalhos
                                const headers = [];
                                const headerCells = table.querySelectorAll('thead th');
                                headerCells.forEach(cell => {
                                    headers.push(cell.textContent.trim());
                                });
                                data.push(headers);

                                // Adicionar dados das linhas
                                const rows = table.querySelectorAll('tbody tr');
                                rows.forEach(row => {
                                    const rowData = [];
                                    const cells = row.querySelectorAll('td');

                                    cells.forEach((cell, index) => {
                                        if (index === 0) {
                                            // Primeira coluna (Mês) - texto simples
                                            rowData.push(cell.textContent.trim());
                                        } else if (index === 1) {
                                            // Segunda coluna (Verificação) - pular ícones
                                            rowData.push('Sintético/Analítico');
                                        } else {
                                            // Colunas de valores monetários
                                            const dataValue = cell.getAttribute('data-value');
                                            if (dataValue) {
                                                // Converter para número
                                                const numValue = parseFloat(dataValue);
                                                rowData.push(numValue);
                                            } else {
                                                rowData.push(cell.textContent.trim());
                                            }
                                        }
                                    });
                                    data.push(rowData);
                                });

                                // Criar worksheet
                                const ws = XLSX.utils.aoa_to_sheet(data);

                                // Configurar largura das colunas
                                const colWidths = [
                                    { wch: 20 }, // Mês
                                    { wch: 20 }, // Verificação
                                    { wch: 25 }, // Provisionado Receita
                                    { wch: 25 }, // Realizado Receita
                                    { wch: 25 }, // Provisionado Despesa
                                    { wch: 25 }, // Realizado Despesa
                                    { wch: 25 }, // Divergencia Despesa
                                    { wch: 25 }  // Divergencia Receita
                                ];
                                ws['!cols'] = colWidths;

                                // Formatar células de valores monetários
                                const range = XLSX.utils.decode_range(ws['!ref']);
                                for (let R = 1; R <= range.e.r; ++R) {
                                    for (let C = 2; C <= range.e.c; ++C) {
                                        const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
                                        if (!ws[cell_address]) continue;

                                        // Aplicar formato de moeda brasileira
                                        ws[cell_address].z = 'R$ #,##0.00';
                                        ws[cell_address].t = 'n';
                                    }
                                }

                                // Estilizar cabeçalho
                                for (let C = 0; C <= range.e.c; ++C) {
                                    const cell_address = XLSX.utils.encode_cell({ c: C, r: 0 });
                                    if (ws[cell_address]) {
                                        ws[cell_address].s = {
                                            font: { bold: true, color: { rgb: "FFFFFF" } },
                                            fill: { fgColor: { rgb: "4472C4" } },
                                            alignment: { horizontal: "center", vertical: "center" }
                                        };
                                    }
                                }

                                // Adicionar worksheet ao workbook
                                XLSX.utils.book_append_sheet(wb, ws, 'Fluxo de Caixa');

                                // Gerar nome do arquivo com data atual
                                const now = new Date();
                                const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
                                const filename = `Fluxo_Caixa_${dateStr}.xlsx`;

                                // Salvar arquivo
                                XLSX.writeFile(wb, filename);
                            }

                            function abrirDetalhe(mesano, level) {
                                var params = { 'A_MESANO': parseInt(mesano) };
                                openLevel(level, params);
                            }


                            function abrirNivel2(mesano) {
                                var params = { 'A_MESANO': parseInt(mesano) };
                                var level = 'lvl_ccy8v8';
                                openLevel(level, params);
                            }
                            //Função atualizar o Nível
                            function atualizar(codigo) {
                                const params = { ':NUMES': parseInt(codigo) };
                                refreshDetails('lvl_u25bz', params);
                            }

                            function abrir_nivel(Codigo) {
                                var params = { ':NUMES': parseInt(Codigo) };
                                var level = 'lvl_ccy8vw';
                                openLevel(level, params);
                            }

                            function abrir_nivel2(Codigo) {
                                var params = '';
                                var level = 'lvl_akpljcj';
                                openLevel(level, params);
                            }
                            function abrir_nivel3(Codigo) {
                                var params = { ':NUMES': parseInt(Codigo) };
                                var level = 'lvl_ccy8wm';
                                openLevel(level, params);
                            }


                            function abrir_det_nat_sintetico(mesano) {
                                var params = { 'A_MESANO': parseInt(mesano) };
                                var level = 'lvl_a46a975';
                                openLevel(level, params);
                            }

                            function abrir_det_nat_analitico(mesano) {
                                var params = { 'A_MESANO': parseInt(mesano) };
                                var level = 'lvl_a46a995';
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
                                                label: function (context) {
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
                                        title: { display: true, text: 'Receitas e Despesas', font: { size: 24, weight: 'bold' }, padding: { top: 20, bottom: 20 } }
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


                            });

                        </script>
                    </body>

                    </html>