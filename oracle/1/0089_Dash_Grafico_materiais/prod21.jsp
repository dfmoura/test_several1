<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <title>Resumo Material</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <style>
        .table-container {
            max-height: 600px;
            overflow-y: auto;
        }
        .table td {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 150px;
        }
        #materialTable {
            font-size: 8px;
            border-collapse: collapse;
        }
        #materialTable th, #materialTable td {
            padding: 2px 4px;
            border: 1px solid #ccc;
        }
        #materialTable thead th {
            position: sticky;
            top: 0;
            background-color: #f7fafc;
            z-index: 10;
            font-weight: 600;
            text-align: center;
        }
        #materialTable tbody td {
            color: #333;
            background-color: #fdfdfd;
        }
        #materialTable tr:nth-child(even) td {
            background-color: #f1f5f9;
        }
        .bg-orange-300 {
            background-color: #fdba74 !important;
        }
        .bg-green-300 {
            background-color: #86efac !important;
        }
        .bg-blue-200 {
            background-color: #bfdbfe !important;
        }
        .text-gray-900 {
            color: #111827;
        }
        .text-gray-700 {
            color: #374151;
        }
        .text-xs {
            font-size: 8px;
        }
    </style>
    <snk:load/>
</head>
<body class="bg-gray-100 p-4">
<div class="container mx-auto">
    <h1 class="text-2xl font-bold mb-4">Resumo Consolidado de Materiais</h1>

    <button onclick="abrirOverlay()" class="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Selecionar Centro de Custo
    </button>

    <div class="table-container">
        <table id="materialTable" class="min-w-full bg-white border border-gray-300">
            <thead id="tableHead" class="bg-gray-100"></thead>
            <tbody id="tableBody"></tbody>
        </table>
    </div>
</div>

<!-- Overlay -->
<div id="overlay" class="fixed inset-0 bg-black bg-opacity-50 hidden justify-center items-center z-50">
    <div class="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-auto">
        <h2 class="text-lg font-semibold mb-2">Selecione um Centro de Custo</h2>
        <input type="text" id="filtroCencus" oninput="filtrarCencus()" placeholder="Buscar..." class="w-full p-2 border mb-3 rounded">
        <table class="w-full text-sm border border-gray-300" id="tabelaCencus">
            <thead class="bg-gray-100">
                <tr>
                    <th class="px-2 py-1 border">Código</th>
                    <th class="px-2 py-1 border">Descrição</th>
                </tr>
            </thead>
            <tbody id="listaCencus" class="bg-white"></tbody>
        </table>
        <div class="text-right mt-4">
            <button onclick="fecharOverlay()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Fechar</button>
        </div>
    </div>
</div>

<script>
let codCencus = null;

function abrirOverlay() {
    document.getElementById('overlay').classList.remove('hidden');
    carregarCencus();
}

function fecharOverlay() {
    document.getElementById('overlay').classList.add('hidden');
}

function carregarCencus() {
    const query = "SELECT CODCENCUS, DESCRCENCUS FROM TSICUS ORDER BY DESCRCENCUS";
    JX.consultar(query).then(data => {
        const tbody = document.getElementById('listaCencus');
        tbody.innerHTML = '';
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = "cursor-pointer hover:bg-gray-100";
            tr.innerHTML = `
                <td class="px-2 py-1 border">${item.CODCENCUS}</td>
                <td class="px-2 py-1 border">${item.DESCRCENCUS}</td>
            `;
            tr.ondblclick = () => {
                codCencus = item.CODCENCUS;
                fecharOverlay();
                carregarDados();
            };
            tbody.appendChild(tr);
        });
    });
}

function filtrarCencus() {
    const filtro = document.getElementById('filtroCencus').value.toLowerCase();
    const linhas = document.querySelectorAll('#listaCencus tr');
    linhas.forEach(tr => {
        const texto = tr.textContent.toLowerCase();
        tr.style.display = texto.includes(filtro) ? '' : 'none';
    });
}

function carregarDados() {
    if (!codCencus) return;

    const query = `
        SELECT cab.tipmov, cab.nunota, LPAD(SUBSTR(par.razaosocial, 1, 6), 6) as fornecedor,
               ite.codprod, pro.descrprod, NVL(pro.ad_perfil,'VAZIO') ad_perfil,
               NVL(pro.ad_material,'VAZIO') ad_material, NVL(pro.AD_PESO_UNITARIO,0) AD_PESO_UNITARIO,
               NVL((case when cab.tipmov = 'J' then ite.qtdneg end)/NULLIF(pro.AD_PESO_UNITARIO,0),0) as QTDE_m,
               NVL((case when cab.tipmov = 'J' then ite.qtdneg end),0) as qtdrequisicao,
               NVL(case when cab.tipmov = 'O' then ite.qtdneg end,0) as qtdpedido,
               NVL(case when cab.tipmov = 'C' then ite.qtdneg end,0) as qtdcompra
        FROM tgfcab cab
        LEFT JOIN tgfite ite ON cab.nunota = ite.nunota
        LEFT JOIN tgfpro pro ON ite.codprod = pro.codprod
        LEFT JOIN tgfpar par ON cab.codparc = par.codparc
        WHERE cab.codcencus = ${codCencus} AND cab.tipmov IN ('J','O','C')
    `;

    JX.consultar(query).then(function (result) {
        const grouped = {};
        const pedidos = new Map();
        const compras = new Map();

        result.forEach(row => {
            const key = `${row.CODPROD}-${row.DESCRPROD}-${row.AD_PERFIL}-${row.AD_MATERIAL}-${row.AD_PESO_UNITARIO}`;
            if (!grouped[key]) {
                grouped[key] = {
                    codigo: row.CODPROD,
                    descricao: row.DESCRPROD,
                    perfil: row.AD_PERFIL,
                    material: row.AD_MATERIAL,
                    pesoUnit: parseFloat(row.AD_PESO_UNITARIO || 0),
                    qtdTotalM: 0,
                    pesoRequisicao: 0,
                    pedidos: {},
                    compras: {}
                };
            }
            const item = grouped[key];
            if (row.TIPMOV === 'J') {
                item.qtdTotalM += parseFloat(row.QTDE_M || 0);
                item.pesoRequisicao += parseFloat(row.QTDREQUISICAO || 0);
            } else if (row.TIPMOV === 'O') {
                pedidos.set(row.NUNOTA, row.FORNECEDOR);
                item.pedidos[row.NUNOTA] = (item.pedidos[row.NUNOTA] || 0) + parseFloat(row.QTDPEDIDO || 0);
            } else if (row.TIPMOV === 'C') {
                compras.set(row.NUNOTA, row.FORNECEDOR);
                item.compras[row.NUNOTA] = (item.compras[row.NUNOTA] || 0) + parseFloat(row.QTDCOMPRA || 0);
            }
        });

        const thead = document.getElementById('tableHead');
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        let headHtml = '<tr>' +
            '<th class="px-2 py-1 border">Código</th>' +
            '<th class="px-2 py-1 border">Descrição</th>' +
            '<th class="px-2 py-1 border">Perfil</th>' +
            '<th class="px-2 py-1 border">Material</th>' +
            '<th class="px-2 py-1 border">Qtd. (m)</th>' +
            '<th class="px-2 py-1 border">Peso Unit. (kg/m)</th>' +
            '<th class="px-2 py-1 border">Peso Total Requisição</th>';

        const pedidoArray = [...pedidos.entries()].sort(([a], [b]) => a - b);
        const compraArray = [...compras.entries()].sort(([a], [b]) => a - b);

        pedidoArray.forEach(([num, fornecedor]) => {
            headHtml += `<th class="px-2 py-1 border bg-orange-300 text-gray-900 font-semibold text-center">Pedido ${num}<br><span class="text-xs font-normal text-gray-700">${fornecedor}</span></th>`;
        });

        compraArray.forEach(([num, fornecedor]) => {
            headHtml += `<th class="px-2 py-1 border bg-green-300 text-gray-900 font-semibold text-center">Compra ${num}<br><span class="text-xs font-normal text-gray-700">${fornecedor}</span></th>`;
        });

        headHtml += '<th class="px-2 py-1 border bg-blue-200">Saldo</th></tr>';
        thead.innerHTML = headHtml;

        let totalRegistros = 0, totalPesoReq = 0, totalPedidos = {}, totalCompras = {}, totalSaldo = 0;

        Object.values(grouped).forEach(prod => {
            totalRegistros++;
            totalPesoReq += prod.pesoRequisicao;

            let rowHtml = `<tr>
                <td class="px-2 py-1 border">${prod.codigo}</td>
                <td class="px-2 py-1 border">${prod.descricao}</td>
                <td class="px-2 py-1 border">${prod.perfil}</td>
                <td class="px-2 py-1 border">${prod.material}</td>
                <td class="px-2 py-1 border text-right">${prod.qtdTotalM.toFixed(2)}</td>
                <td class="px-2 py-1 border text-right">${prod.pesoUnit.toFixed(2)}</td>
                <td class="px-2 py-1 border text-right">${prod.pesoRequisicao.toFixed(2)}</td>`;

            let subtotalPedidos = 0;
            pedidoArray.forEach(([num]) => {
                const val = prod.pedidos[num] || 0;
                subtotalPedidos += val;
                totalPedidos[num] = (totalPedidos[num] || 0) + val;
                rowHtml += `<td class="px-2 py-1 border text-right">${val ? val.toFixed(2) : '-'}</td>`;
            });

            let subtotalCompras = 0;
            compraArray.forEach(([num]) => {
                const val = prod.compras[num] || 0;
                subtotalCompras += val;
                totalCompras[num] = (totalCompras[num] || 0) + val;
                rowHtml += `<td class="px-2 py-1 border text-right">${val ? val.toFixed(2) : '-'}</td>`;
            });

            const saldo = prod.pesoRequisicao - subtotalPedidos - subtotalCompras;
            totalSaldo += saldo;
            rowHtml += `<td class="px-2 py-1 border font-bold text-blue-700 text-right">${saldo.toFixed(2)}</td></tr>`;
            tbody.innerHTML += rowHtml;
        });

        let totalRow = `<tr class="bg-gray-200 font-bold text-[8px] text-right">
            <td class="px-2 py-1 border" colspan="6">TOTAL (${totalRegistros} registros)</td>
            <td class="px-2 py-1 border text-right">${totalPesoReq.toFixed(2)}</td>`;

        pedidoArray.forEach(([num]) => {
            totalRow += `<td class="px-2 py-1 border text-right">${(totalPedidos[num] || 0).toFixed(2)}</td>`;
        });

        compraArray.forEach(([num]) => {
            totalRow += `<td class="px-2 py-1 border text-right">${(totalCompras[num] || 0).toFixed(2)}</td>`;
        });

        totalRow += `<td class="px-2 py-1 border text-blue-700 text-right">${totalSaldo.toFixed(2)}</td></tr>`;
        tbody.innerHTML += totalRow;
    }).catch(function (error) {
        console.error('Erro ao carregar os dados:', error);
    });
}
</script>
</body>
</html>
