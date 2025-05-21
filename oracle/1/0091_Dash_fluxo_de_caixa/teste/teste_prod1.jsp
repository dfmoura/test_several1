<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <title>Resumo Financeiro</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <style>
        .table-container {
            max-height: 600px;
            overflow-y: auto;
        }
        #financeTable {
            font-size: 10px;
            border-collapse: collapse;
        }
        #financeTable th, #financeTable td {
            padding: 4px 6px;
            border: 1px solid #ccc;
            white-space: nowrap;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        #financeTable thead th {
            position: sticky;
            top: 0;
            background-color: #f7fafc;
            z-index: 10;
            font-weight: 600;
            text-align: center;
        }
        .export-button {
            position: absolute;
            top: 1rem;
            right: 1rem;
        }
    </style>
    <snk:load/>
</head>
<body class="bg-gray-100 p-4 relative">
<div class="container mx-auto">
    <h1 class="text-2xl font-bold mb-4">Resumo Financeiro</h1>

    <button onclick="carregarDados()" class="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Carregar Dados
    </button>

    <button onclick="exportarParaExcel()" class="export-button px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center space-x-2">
        <img src="https://img.icons8.com/color/20/microsoft-excel-2019.png" alt="Excel">
        <span class="text-sm">Exportar</span>
    </button>

    <div class="table-container mt-4">
        <table id="financeTable" class="min-w-full bg-white border border-gray-300">
            <thead id="tableHead"></thead>
            <tbody id="tableBody"></tbody>
        </table>
    </div>
</div>

<script>
function carregarDados() {
    Promise.all([
        JX.getParam('P_BAIXA.INI'),
        JX.getParam('P_BAIXA.FIN')
    ]).then(([dataIni, dataFin]) => {
        const query = `
            SELECT 
              ANO, MES, MES_ANO, DESCRNAT, DTNEG, ORIGEM, NUFIN,
              CODPARC, NOMEPARC, CODPROJ, DTVENC, VLRDESDO, RECDESP,
              TIPO, VLRBAIXA_CALC, CODNAT, PROVISAO, CONTA_BAIXA,
              NOME_CONTA_BAIXA, FINANCEIRO, VLRLIQUIDO, MULTIPLICACAO_RECEITA_ANTERIOR
            FROM VW_FIN_RESUMO_SATIS
            WHERE RECDESP = 1
              AND PROVISAO = 'N'
              AND DTVENC BETWEEN TO_DATE('${dataIni}', 'YYYY-MM-DD') AND TO_DATE('${dataFin}', 'YYYY-MM-DD')
        `;

        JX.consultar(query).then(data => {
            const head = document.getElementById('tableHead');
            const body = document.getElementById('tableBody');
            head.innerHTML = '';
            body.innerHTML = '';

            if (data.length === 0) {
                head.innerHTML = '<tr><th class="border px-2 py-1">Nenhum dado encontrado</th></tr>';
                return;
            }

            // Cabeçalho da tabela
            const cols = Object.keys(data[0]);
            let headRow = '<tr>';
            cols.forEach(col => {
                headRow += `<th class="border px-2 py-1 bg-gray-200">${col}</th>`;
            });
            headRow += '</tr>';
            head.innerHTML = headRow;

            // Corpo da tabela
            data.forEach(row => {
                let rowHtml = '<tr>';
                cols.forEach(col => {
                    rowHtml += `<td class="border px-2 py-1">${row[col] ?? ''}</td>`;
                });
                rowHtml += '</tr>';
                body.innerHTML += rowHtml;
            });
        });
    });
}

function exportarParaExcel() {
    const table = document.getElementById("financeTable");
    const wb = XLSX.utils.table_to_book(table, { sheet: "ResumoFinanceiro", raw: true });
    XLSX.writeFile(wb, `ResumoFinanceiro.xlsx`);
}
</script>
</body>
</html>
