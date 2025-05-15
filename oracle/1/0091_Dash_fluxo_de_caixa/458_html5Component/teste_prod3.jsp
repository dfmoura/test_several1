<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <title>Resumo Financeiro</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <style>
        .table-container { max-height: 600px; overflow-y: auto; }
        #financeTable {
            font-size: 10px;
            border-collapse: collapse;
        }
        #financeTable th, #financeTable td {
            padding: 4px 6px;
            border: 1px solid #ccc;
            white-space: nowrap;
            max-width: 180px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        #financeTable thead th {
            position: sticky;
            top: 0;
            background-color: #f7fafc;
            z-index: 10;
            text-align: center;
        }
    </style>
    <snk:load/>
</head>
<body class="bg-gray-100 p-6">
<div class="container mx-auto">
    <h1 class="text-2xl font-bold mb-4">Resumo Financeiro</h1>

    <button onclick="carregarDados()" class="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Carregar Dados
    </button>

    <button onclick="exportarParaExcel()" class="mb-4 ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
        Exportar Excel
    </button>

    <div class="table-container mt-4">
        <table id="financeTable" class="min-w-full bg-white border border-gray-300">
            <thead id="tableHead">
                <tr>
                    <th>ANO</th><th>MÊS</th><th>MÊS/ANO</th><th>DESCR. NATUREZA</th><th>DATA NEG.</th><th>ORIGEM</th>
                    <th>NUFIN</th><th>CÓD. PARC</th><th>NOME PARC</th><th>CÓD. PROJ</th><th>VENCIMENTO</th>
                    <th>DESCONTO</th><th>RECEITA/DESPESA</th><th>TIPO</th><th>BAIXA</th><th>CÓD. NAT</th>
                    <th>PROVISÃO</th><th>CONTA BAIXA</th><th>NOME CONTA</th><th>FINANCEIRO</th>
                    <th>VL. LÍQUIDO</th><th>FATOR MULTI.</th>
                </tr>
            </thead>
            <tbody id="tableBody"></tbody>
        </table>
    </div>
</div>

<script>

const inicio = "${P_BAIXA.INI}";
const fim = "${P_BAIXA.FIN}";

function carregarDados() {
    const query = `
        SELECT 
            ANO, MES, MES_ANO, DESCRNAT, DTNEG, ORIGEM, NUFIN,
            CODPARC, NOMEPARC, CODPROJ, DTVENC, VLRDESDO, RECDESP,
            TIPO, VLRBAIXA_CALC, CODNAT, PROVISAO, CONTA_BAIXA,
            NOME_CONTA_BAIXA, FINANCEIRO, VLRLIQUIDO, MULTIPLICACAO_RECEITA_ANTERIOR
        FROM VW_FIN_RESUMO_SATIS
        WHERE RECDESP = 1 AND PROVISAO = 'N'
        AND DTVENC BETWEEN '${inicio}' AND '${fim}'
    `;
    
    JX.consultar(query).then(data => {
        const tbody = document.getElementById("tableBody");
        tbody.innerHTML = '';
        data.forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${row.ANO}</td>
                <td>${row.MES}</td>
                <td>${row.MES_ANO}</td>
                <td>${row.DESCRNAT}</td>
                <td>${row.DTNEG}</td>
                <td>${row.ORIGEM}</td>
                <td>${row.NUFIN}</td>
                <td>${row.CODPARC}</td>
                <td>${row.NOMEPARC}</td>
                <td>${row.CODPROJ}</td>
                <td>${row.DTVENC}</td>
                <td>${parseFloat(row.VLRDESDO || 0).toFixed(2)}</td>
                <td>${row.RECDESP}</td>
                <td>${row.TIPO}</td>
                <td>${parseFloat(row.VLRBAIXA_CALC || 0).toFixed(2)}</td>
                <td>${row.CODNAT}</td>
                <td>${row.PROVISAO}</td>
                <td>${row.CONTA_BAIXA}</td>
                <td>${row.NOME_CONTA_BAIXA}</td>
                <td>${row.FINANCEIRO}</td>
                <td>${parseFloat(row.VLRLIQUIDO || 0).toFixed(2)}</td>
                <td>${parseFloat(row.MULTIPLICACAO_RECEITA_ANTERIOR || 0).toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function exportarParaExcel() {
    const table = document.getElementById("financeTable");
    const wb = XLSX.utils.table_to_book(table, { sheet: "ResumoFinanceiro" });
    XLSX.writeFile(wb, "ResumoFinanceiro.xlsx");
}
</script>
</body>
</html>
