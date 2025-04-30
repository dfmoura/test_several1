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
        }
        #materialTable th, #materialTable td {
            padding: 2px 4px;
        }
        /* Cabeçalho fixo */
        #materialTable thead th {
            position: sticky;
            top: 0;
            background-color: #f7fafc; /* Tailwind bg-gray-100 */
            z-index: 10;
        }
    </style>
    <snk:load/>
</head>
<body>
<div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Resumo Consolidado de Materiais</h1>
    <div class="table-container">
        <table id="materialTable" class="min-w-full bg-white border border-gray-300">
            <thead id="tableHead" class="bg-gray-100"></thead>
            <tbody id="tableBody"></tbody>
        </table>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function () {
    carregarDados();
});

function carregarDados() {
    const query = `
        select
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
        where cab.codcencus = 524036001 and cab.tipmov in ('J','O','C')
    `;

    JX.consultar(query).then(function (result) {
        const grouped = {};
        const pedidos = new Set();
        const compras = new Set();

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
                item.pedidos[row.NUNOTA] = (item.pedidos[row.NUNOTA] || 0) + parseFloat(row.QTDPEDIDO || 0);
            } else if (row.TIPMOV === 'C') {
                compras.add(row.NUNOTA);
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

        const pedidoArray = [...pedidos].sort();
        const compraArray = [...compras].sort();

        pedidoArray.forEach(p => {
            headHtml += `<th class="px-2 py-1 border bg-orange-200">Pedido - ${p}</th>`;
        });

        compraArray.forEach(c => {
            headHtml += `<th class="px-2 py-1 border bg-green-200">Compra - ${c}</th>`;
        });

        headHtml += '<th class="px-2 py-1 border bg-blue-200">Saldo</th></tr>';
        thead.innerHTML = headHtml;

        let totalRegistros = 0;
        let totalPesoReq = 0;
        let totalPedidos = {};
        let totalCompras = {};
        let totalSaldo = 0;

        Object.values(grouped).forEach(prod => {
            totalRegistros++;
            totalPesoReq += prod.pesoRequisicao;

            let rowHtml = `<tr>
                <td class="px-2 py-1 border">${prod.codigo}</td>
                <td class="px-2 py-1 border">${prod.descricao}</td>
                <td class="px-2 py-1 border">${prod.perfil}</td>
                <td class="px-2 py-1 border">${prod.material}</td>
                <td class="px-2 py-1 border">${prod.qtdTotalM.toFixed(2)}</td>
                <td class="px-2 py-1 border">${prod.pesoUnit.toFixed(2)}</td>
                <td class="px-2 py-1 border">${prod.pesoRequisicao.toFixed(2)}</td>`;

            let subtotalPedidos = 0;
            pedidoArray.forEach(p => {
                const val = prod.pedidos[p] || 0;
                subtotalPedidos += val;
                totalPedidos[p] = (totalPedidos[p] || 0) + val;
                rowHtml += `<td class="px-2 py-1 border text-right">${val ? val.toFixed(2) : '-'}</td>`;
            });

            let subtotalCompras = 0;
            compraArray.forEach(c => {
                const val = prod.compras[c] || 0;
                subtotalCompras += val;
                totalCompras[c] = (totalCompras[c] || 0) + val;
                rowHtml += `<td class="px-2 py-1 border text-right">${val ? val.toFixed(2) : '-'}</td>`;
            });

            const saldo = prod.pesoRequisicao - subtotalPedidos - subtotalCompras;
            totalSaldo += saldo;

            rowHtml += `<td class="px-2 py-1 border font-bold text-blue-700">${saldo.toFixed(2)}</td></tr>`;
            tbody.innerHTML += rowHtml;
        });

        // Linha de Totais com fonte 8px
        let totalRow = `<tr class="bg-gray-200 font-bold text-[8px] text-right">
            <td class="px-2 py-1 border" colspan="6">TOTAL (${totalRegistros} registros)</td>
            <td class="px-2 py-1 border text-right">${totalPesoReq.toFixed(2)}</td>`;

        pedidoArray.forEach(p => {
            totalRow += `<td class="px-2 py-1 border text-right">${(totalPedidos[p] || 0).toFixed(2)}</td>`;
        });

        compraArray.forEach(c => {
            totalRow += `<td class="px-2 py-1 border text-right">${(totalCompras[c] || 0).toFixed(2)}</td>`;
        });

        totalRow += `<td class="px-2 py-1 border text-blue-700">${totalSaldo.toFixed(2)}</td></tr>`;
        tbody.innerHTML += totalRow;

    }).catch(function (error) {
        console.error('Erro ao carregar os dados:', error);
    });
}
</script>
</body>
</html>
