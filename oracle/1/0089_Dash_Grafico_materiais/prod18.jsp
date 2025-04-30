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
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>    
    <snk:load/>
</head>
<body class="p-8 bg-gray-100">

    <h1 class="text-2xl font-bold mb-4">Resumo Consolidado de Materiais</h1>
    <div id="tabelaContainer" class="overflow-x-auto bg-white shadow-md rounded-lg p-4"></div>

    <script>

        document.addEventListener('DOMContentLoaded', function () {
            carregarDados();
        });

        function carregarDados() {
        
        const codCencus1 = 524036001; 

        const query = `
        SELECT
            CAB.TIPMOV,
            CAB.NUNOTA,
            LPAD(SUBSTR(PAR.RAZAOSOCIAL, 1, 6), 6) as FORNECEDOR,
            PRO.CODPROD,
            PRO.DESCRPROD,
            PRO.AD_PERFIL,
            PRO.AD_MATERIAL,
            SUM(NVL((case when cab.tipmov = 'J' then ite.qtdneg end),0)) as qtdrequisicao,
            SUM(NVL(case when cab.tipmov = 'O' then ite.qtdneg end,0)) as qtdpedido,
            SUM(NVL(case when cab.tipmov = 'C' then ite.qtdneg end,0)) as qtdcompra
        FROM TGFPRO PRO
        LEFT JOIN TGFITE ITE ON PRO.CODPROD = ITE.CODPROD
        LEFT JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
        LEFT JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
        WHERE
            CAB.TIPMOV IN ('C','J','O') AND CAB.CODCENCUS = ${codCencus1}
        GROUP BY 
            CAB.TIPMOV,
            CAB.NUNOTA,
            LPAD(SUBSTR(PAR.RAZAOSOCIAL, 1, 6), 6),
            PRO.CODPROD,
            PRO.DESCRPROD,
            PRO.AD_PERFIL,
            PRO.AD_MATERIAL
        ORDER BY PRO.CODPROD`;

        JX.consultar(query).then(data => {
            const consolidado = {};

            data.forEach(item => {
                const chave = `${item.CODPROD}_${item.DESCRPROD}_${item.AD_PERFIL}_${item.AD_MATERIAL}`;

                if (!consolidado[chave]) {
                    consolidado[chave] = {
                        CODPROD: item.CODPROD,
                        DESCRPROD: item.DESCRPROD,
                        AD_PERFIL: item.AD_PERFIL,
                        AD_MATERIAL: item.AD_MATERIAL,
                        qtdrequisicao: 0
                    };
                }

                consolidado[chave].qtdrequisicao += item.QTDREQUISICAO || 0;
            });

            let html = `
            <table class="table-auto w-full text-left text-sm border border-gray-200">
                <thead class="bg-gray-200 text-gray-700">
                    <tr>
                        <th class="px-4 py-2 border">Código Produto</th>
                        <th class="px-4 py-2 border">Descrição</th>
                        <th class="px-4 py-2 border">Perfil</th>
                        <th class="px-4 py-2 border">Material</th>
                        <th class="px-4 py-2 border">Qtd. Requisição</th>
                    </tr>
                </thead>
                <tbody class="bg-white">`;

            Object.values(consolidado).forEach(row => {
                html += `
                    <tr class="hover:bg-gray-100">
                        <td class="px-4 py-2 border">${row.CODPROD}</td>
                        <td class="px-4 py-2 border">${row.DESCRPROD}</td>
                        <td class="px-4 py-2 border">${row.AD_PERFIL || '-'}</td>
                        <td class="px-4 py-2 border">${row.AD_MATERIAL || '-'}</td>
                        <td class="px-4 py-2 border">${row.qtdrequisicao.toFixed(2)}</td>
                    </tr>`;
            });

            html += `</tbody></table>`;

            document.getElementById('tabelaContainer').innerHTML = html;
        }).catch(error => {
            console.error('Erro ao consultar:', error);
            document.getElementById('tabelaContainer').innerText = 'Erro ao carregar os dados.';
        });
        }
    </script>

</body>
</html>
