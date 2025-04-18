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
        #materialTable {
            font-size: 8px;
            width: 100%;
        }
        #materialTable th, #materialTable td {
            padding: 2px 4px;
            white-space: nowrap;
            border: 1px solid #d1d5db;
            vertical-align: top;
        }
        #materialTable th {
            position: sticky;
            top: 0;
            z-index: 10;
            background-color: #f3f4f6;
        }
    </style>
    <snk:load/>
</head>
<body>
<div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Resumo Consolidado de Materiais</h1>
    <div class="table-container">
        <table id="materialTable" class="bg-white border border-gray-300">
            <thead id="tableHead"></thead>
            <tbody id="tableBody"></tbody>
        </table>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function () {
    carregarDados();
});

function carregarDados() {
    const codCencus = parseInt(JX.getParametro("P_CODCENCUS")) || 0;

    const query = `
        select
            cab.codcencus as cr,
            cus.descrcencus as cr_descr,
            cab.tipmov,                    
            cab.nunota,
            LPAD(SUBSTR(par.razaosocial, 1, 6), 6) as fornecedor,
            ite.codprod,
            pro.descrprod,
            pro.ad_perfil,
            pro.ad_material,
            pro.AD_PESO_UNITARIO,
            (case when cab.tipmov = 'J' then ite.qtdneg end)/pro.AD_PESO_UNITARIO as QTDE_m,
            case when cab.tipmov = 'J' then ite.qtdneg end as qtdrequisicao,
            case when cab.tipmov = 'O' then ite.qtdneg end as qtdpedido,
            case when cab.tipmov = 'C' then ite.qtdneg end as qtdcompra
        from tgfcab cab
        inner join tgfite ite on cab.nunota = ite.nunota
        inner join tgfpro pro on ite.codprod = pro.codprod
        inner join tgfpar par on cab.codparc = par.codparc
        inner join tsicus cus on cab.codcencus = cus.codcencus
        where cab.codcencus = ${codCencus} and cab.tipmov in ('J','O','C')
    `;

    JX.consultar(query).then(function (result) {
        const grouped = {};
        const pedidos = new Set();
        const compras = new Set();
        const fornecedorMap = {};

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
                pedidos.add(row.NUNOTA);
                item.pedidos[row.NUNOTA] = {
                    valor: (item.pedidos[row.NUNOTA]?.valor || 0) + parseFloat(row.QTDPEDIDO || 0),
                    fornecedor: row.FORNECEDOR
                };
                fornecedorMap[`P-${row.NUNOTA}`] = row.FORNECEDOR;
            } else if (row.TIPMOV === 'C') {
                compras.add(row.NUNOTA);
                item.compras[row.NUNOTA] = {
                    valor: (item.compras[row.NUNOTA]?.valor || 0) + parseFloat(row.QTDCOMPRA || 0),
                    fornecedor: row.FORNECEDOR
                };
                fornecedorMap[`C-${row.NUNOTA}`] = row.FORNECEDOR;
            }
        });

        const thead = document.getElementById('tableHead');
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        const pedidoList = [...pedidos].sort();
        const compraList = [...compras].sort();

        let headHtml = '<tr>' +
            '<th>Código</th>' +
            '<th>Descrição</th>' +
            '<th>Perfil</th>' +
            '<th>Material</th>' +
            '<th>Qtd. (m)</th>' +
            '<th>Peso Unit. (kg/m)</th>' +
            '<th>Peso Total Requisição</th>';

        pedidoList.forEach(p => {
            const fornecedor = fornecedorMap[`P-${p}`] || '';
            headHtml += `<th class="bg-orange-200">Pedido - ${p}<br><span class="text-gray-600">${fornecedor}</span></th>`;
        });

        compraList.forEach(c => {
            const fornecedor = fornecedorMap[`C-${c}`] || '';
            headHtml += `<th class="bg-green-200">Compra - ${c}<br><span class="text-gray-600">${fornecedor}</span></th>`;
        });

        headHtml += '<th class="bg-blue-200">Saldo</th></tr>';
        thead.innerHTML = headHtml;

        let totalPesoRequisicao = 0;
        let totalPedidos = new Array(pedidoList.length).fill(0);
        let totalCompras = new Array(compraList.length).fill(0);
        let totalSaldo = 0;
        let totalRegistros = 0;

        Object.values(grouped).forEach(prod => {
            totalRegistros++;
            let rowHtml = `<tr>
                <td>${prod.codigo}</td>
                <td>${prod.descricao}</td>
                <td>${prod.perfil}</td>
                <td>${prod.material}</td>
                <td>${prod.qtdTotalM.toFixed(2)}</td>
                <td>${prod.pesoUnit.toFixed(2)}</td>
                <td>${prod.pesoRequisicao.toFixed(2)}</td>`;

            totalPesoRequisicao += prod.pesoRequisicao;

            let somaPedidos = 0;
            pedidoList.forEach((p, i) => {
                const val = prod.pedidos[p]?.valor || 0;
                const forn = prod.pedidos[p]?.fornecedor || '-';
                totalPedidos[i] += val;
                somaPedidos += val;
                rowHtml += `<td class="text-right">${val ? val.toFixed(2) : '-'}<br><span class="text-gray-500">${forn}</span></td>`;
            });

            let somaCompras = 0;
            compraList.forEach((c, i) => {
                const val = prod.compras[c]?.valor || 0;
                const forn = prod.compras[c]?.fornecedor || '-';
                totalCompras[i] += val;
                somaCompras += val;
                rowHtml += `<td class="text-right">${val ? val.toFixed(2) : '-'}<br><span class="text-gray-500">${forn}</span></td>`;
            });

            const saldo = prod.pesoRequisicao - somaPedidos - somaCompras;
            totalSaldo += saldo;

            rowHtml += `<td class="font-bold text-blue-700">${saldo.toFixed(2)}</td></tr>`;
            tbody.innerHTML += rowHtml;
        });

        let totalHtml = `<tr class="bg-gray-200 font-bold">
            <td colspan="6" class="text-center">Total (${totalRegistros} registros)</td>
            <td>${totalPesoRequisicao.toFixed(2)}</td>`;

        totalPedidos.forEach(val => {
            totalHtml += `<td class="text-right">${val.toFixed(2)}</td>`;
        });

        totalCompras.forEach(val => {
            totalHtml += `<td class="text-right">${val.toFixed(2)}</td>`;
        });

        totalHtml += `<td class="text-blue-800">${totalSaldo.toFixed(2)}</td></tr>`;
        tbody.innerHTML += totalHtml;
    }).catch(function (error) {
        console.error('Erro ao carregar os dados:', error);
    });
}
</script>
</body>
</html>
