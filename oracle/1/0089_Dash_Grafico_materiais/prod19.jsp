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

    <!-- Botão para abrir overlay -->
    <button onclick="abrirOverlay()" class="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Selecionar Centro de Custo
    </button>

    <div id="tabelaContainer" class="overflow-x-auto bg-white shadow-md rounded-lg p-4"></div>

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
        let codCencus1 = null;

        document.addEventListener('DOMContentLoaded', function () {
            carregarDados();
        });

        function carregarDados() {
            if (!codCencus1) return;

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
                WHERE CAB.TIPMOV IN ('C','J','O') AND CAB.CODCENCUS = ${codCencus1}
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
                        codCencus1 = item.CODCENCUS;
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
    </script>

</body>
</html>
