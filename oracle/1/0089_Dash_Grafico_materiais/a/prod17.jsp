<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resumo Material</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
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
    </style>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <snk:load/>
</head>
<body>
    <div class="container mx-auto p-4">
        <h1 class="text-2xl font-bold mb-4">Resumo Material</h1>
        <div class="table-container">
            <table id="materialTable" class="min-w-full bg-white border border-gray-300">
                <thead class="bg-gray-100 sticky top-0">
                    <tr>
                        <th class="px-4 py-2">Tip. Mov.</th>
                        <th class="px-4 py-2">NÚ. Único</th>
                        <th class="px-4 py-2">Fornecedor</th>
                        <th class="px-4 py-2">Código</th>
                        <th class="px-4 py-2">Descrição</th>
                        <th class="px-4 py-2">Perfil</th>
                        <th class="px-4 py-2">Material</th>
                        <th class="px-4 py-2">Qtd. (m)</th>
                        <th class="px-4 py-2">Peso Unit. (kg/m)</th>
                        <th class="px-4 py-2">Peso Total Requisição</th>
                        <th class="px-4 py-2">Peso Total Pedido</th>
                        <th class="px-4 py-2">Peso Total Compra</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                </tbody>
            </table>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            carregarDados();
        });

        function carregarDados() {
            const codCencus = parseInt(JX.getParametro("P_CODCENCUS")) || 0;

        const query = `
            select
                cab.tipmov,
                cab.nunota,
                LPAD(SUBSTR(par.razaosocial, 1, 6), 6) as fornecedor,
                ite.codprod,
                pro.descrprod,
                pro.ad_perfil,
                pro.ad_material,
                COALESCE(NULLIF(pro.AD_PESO_UNITARIO, 0), 1) as AD_PESO_UNITARIO,
                (case when cab.tipmov = 'J' then ite.qtdneg end)/COALESCE(NULLIF(pro.AD_PESO_UNITARIO, 0), 1) as QTDE_M,
                case when cab.tipmov = 'J' then ite.qtdneg end as QTDREQUISICAO,
                case when cab.tipmov = 'O' then ite.qtdneg end as QTDPEDIDO,
                case when cab.tipmov = 'C' then ite.qtdneg end as QTDCOMPRA
            from tgfcab cab
            left join tgfite ite on cab.nunota = ite.nunota
            left join tgfpro pro on ite.codprod = pro.codprod
            left join tgfpar par on cab.codparc = par.codparc
            where cab.codcencus = 524036001 and cab.tipmov in ('J','O','C')
        `;

            JX.consultar(query).then(function(result) {
                const tableBody = document.getElementById('tableBody');
                tableBody.innerHTML = '';

                result.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-gray-50';
                    
                    tr.innerHTML = `
                        <td class="px-4 py-2 border">${row.TIPMOV || ''}</td>
                        <td class="px-4 py-2 border">${row.NUNOTA || ''}</td>
                        <td class="px-4 py-2 border">${row.FORNECEDOR || ''}</td>
                        <td class="px-4 py-2 border">${row.CODPROD || ''}</td>
                        <td class="px-4 py-2 border">${row.DESCRPROD || ''}</td>
                        <td class="px-4 py-2 border">${row.AD_PERFIL || ''}</td>
                        <td class="px-4 py-2 border">${row.AD_MATERIAL || ''}</td>
                        <td class="px-4 py-2 border">${row.AD_PESO_UNITARIO ? parseFloat(row.AD_PESO_UNITARIO).toFixed(2) : ''}</td>
                        <td class="px-4 py-2 border">${row.QTDE_M ? parseFloat(row.QTDE_M).toFixed(2) : ''}</td>
                        <td class="px-4 py-2 border">${row.QTDREQUISICAO ? parseFloat(row.QTDREQUISICAO).toFixed(2) : ''}</td>
                        <td class="px-4 py-2 border">${row.QTDPEDIDO ? parseFloat(row.QTDPEDIDO).toFixed(2) : ''}</td>
                        <td class="px-4 py-2 border">${row.QTDCOMPRA ? parseFloat(row.QTDCOMPRA).toFixed(2) : ''}</td>
                    `;
                    
                    tableBody.appendChild(tr);
                });
            }).catch(function(error) {
                console.error('Erro ao carregar os dados:', error);
            });
        }
    </script>
</body>
</html>