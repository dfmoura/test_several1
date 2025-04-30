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
            

        const query = `SELECT
            CAB.TIPMOV,
            CAB.NUNOTA,
            LPAD(SUBSTR(PAR.RAZAOSOCIAL, 1, 6), 6) AS FORNECEDOR,
            ITE.CODPROD,
            PRO.DESCRPROD,
            PRO.AD_PERFIL,
            PRO.AD_MATERIAL,
            COALESCE(NULLIF(PRO.AD_PESO_UNITARIO, 0), 1) AS AD_PESO_UNITARIO,
            (CASE WHEN CAB.TIPMOV = 'J' THEN ITE.QTDNEG END)/COALESCE(NULLIF(PRO.AD_PESO_UNITARIO, 0), 1) AS QTDE_M,
            CASE WHEN CAB.TIPMOV = 'J' THEN ITE.QTDNEG END AS QTDREQUISICAO,
            CASE WHEN CAB.TIPMOV = 'O' THEN ITE.QTDNEG END AS QTDPEDIDO,
            CASE WHEN CAB.TIPMOV = 'C' THEN ITE.QTDNEG END AS QTDCOMPRA
        FROM TGFCAB CAB
        LEFT JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        LEFT JOIN TGEPRO PRO ON ITE.CODPROD = PRO.CODPROD
        LEFT JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
        WHERE CAB.CODCENCUS = ${codCencus} AND CAB.TIPMOV IN ('J','O','C')`;

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