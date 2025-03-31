<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dados Vendas SATIS</title>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <snk:load/>

    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            padding: 0;
            color: #333;
        }
        h1 {
            color: #23a059;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .table-container {
            overflow-x: auto;
            margin-top: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            border: 1px solid #ddd;
        }
        th {
            background-color: #23a059;
            color: white;
            padding: 10px;
            text-align: left;
            position: sticky;
            top: 0;
        }
        td {
            padding: 8px 10px;
            border-bottom: 1px solid #ddd;
            color: #333;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #f1f1f1;
        }
        .loading {
            text-align: center;
            padding: 20px;
            font-style: italic;
            color: #666;
        }
        .error {
            color: #d9534f;
            padding: 20px;
            text-align: center;
        }
        .no-data {
            text-align: center;
            padding: 20px;
            font-style: italic;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>Dados Vendas SATIS</h1>
    <div class="table-container">
        <div id="loading" class="loading">Carregando dados...</div>
        <table id="dataTable" style="display: none;">
            <thead>
                <tr>
                    <th>CODIGO</th>
                    <th>DTMOV</th>
                    <th>DTNEG</th>
                    <th>NUNOTA</th>
                    <th>NUMNOTA</th>
                    <th>NRO</th>
                    <th>CODEMP</th>
                    <th>AD_OBSINTERNA</th>
                    <th>EMPRESA</th>
                    <th>EMP</th>
                    <th>NOMEFANTASIAEMP</th>
                    <th>CPFCNPJ</th>
                    <th>IE</th>
                    <th>TEL</th>
                    <th>FAX</th>
                    <th>CODVEND</th>
                    <th>APELIDO</th>
                    <th>VEND</th>
                    <th>CODGER</th>
                    <th>CODPARC</th>
                    <th>PARCEIRO</th>
                    <th>PARC</th>
                    <th>NOMEPARC</th>
                    <th>UF</th>
                    <th>PROD</th>
                    <th>CODPROD</th>
                    <th>DESCRPROD</th>
                    <th>MARCA</th>
                    <th>MARCA1</th>
                    <th>CODGRUPOPROD</th>
                    <th>DESCRGRUPOPROD</th>
                    <th>VOL</th>
                    <th>CODTIPOPER</th>
                    <th>TOP</th>
                    <th>DESCROPER</th>
                    <th>ATUALEST</th>
                    <th>ATUALFIN</th>
                    <th>TIPATUALFIN</th>
                    <th>STATUSNFE</th>
                    <th>TIPMOV</th>
                    <th>BONIFICACAO</th>
                    <th>CODCENCUS</th>
                    <th>AD_APELIDO</th>
                    <th>DESCRCENCUS</th>
                    <th>AD_QTDVOLLT</th>
                    <th>QTD</th>
                    <th>VLR</th>
                    <th>VLRCUSICM1</th>
                    <th>VLRCUSGER1</th>
                    <th>VLRCUSICM2</th>
                    <th>VLRCUSGER2</th>
                </tr>
            </thead>
            <tbody id="tableBody"></tbody>
        </table>
        <div id="noData" class="no-data" style="display: none;">Nenhum dado encontrado.</div>
        <div id="error" class="error" style="display: none;"></div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            fetchData();
        });

        function fetchData() {
            const query = `
                SELECT 
                    CODIGO, DTMOV, DTNEG, NUNOTA, NUMNOTA, NRO, CODEMP, AD_OBSINTERNA, 
                    EMPRESA, EMP, NOMEFANTASIAEMP, CPFCNPJ, IE, TEL, FAX, CODVEND, 
                    APELIDO, VEND, CODGER, CODPARC, PARCEIRO, PARC, NOMEPARC, UF, 
                    PROD, CODPROD, DESCRPROD, MARCA, MARCA1, CODGRUPOPROD, 
                    DESCRGRUPOPROD, VOL, CODTIPOPER, TOP, DESCROPER, ATUALEST, 
                    ATUALFIN, TIPATUALFIN, STATUSNFE, TIPMOV, BONIFICACAO, 
                    CODCENCUS, AD_APELIDO, DESCRCENCUS, AD_QTDVOLLT, QTD, VLR, 
                    VLRCUSICM1, VLRCUSGER1, VLRCUSICM2, VLRCUSGER2 
                FROM VGF_VENDAS_SATIS
            `;
            
            JX.consultar(query)
                .then(response => {
                    console.log('Full response:', response);
                    
                    let data = [];
                    if (response && response.items) {
                        data = response.items;
                    } else if (Array.isArray(response)) {
                        data = response;
                    }
                    
                    document.getElementById('loading').style.display = 'none';
                    
                    if (data.length > 0) {
                        populateTable(data);
                    } else {
                        document.getElementById('noData').style.display = 'block';
                    }
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                    document.getElementById('loading').style.display = 'none';
                    const errorDiv = document.getElementById('error');
                    errorDiv.textContent = 'Erro ao carregar dados: ' + (error.message || 'Por favor, tente novamente.');
                    errorDiv.style.display = 'block';
                });
        }

        function populateTable(data) {
            const tableBody = document.getElementById('tableBody');
            tableBody.innerHTML = '';
            
            data.forEach(item => {
                const tr = document.createElement('tr');
                
                tr.innerHTML = `
                    <td>${item.CODIGO}</td>
                    <td>${item.DTMOV}</td>
                    <td>${item.DTNEG}</td>
                    <td>${item.NUNOTA}</td>
                    <td>${item.NUMNOTA}</td>
                    <td>${item.NRO}</td>
                    <td>${item.CODEMP}</td>
                    <td>${item.AD_OBSINTERNA}</td>
                    <td>${item.EMPRESA}</td>
                    <td>${item.EMP}</td>
                    <td>${item.NOMEFANTASIAEMP}</td>
                    <td>${item.CPFCNPJ}</td>
                    <td>${item.IE}</td>
                    <td>${item.TEL}</td>
                    <td>${item.FAX}</td>
                    <td>${item.CODVEND}</td>
                    <td>${item.APELIDO}</td>
                    <td>${item.VEND}</td>
                    <td>${item.CODGER}</td>
                    <td>${item.CODPARC}</td>
                    <td>${item.PARCEIRO}</td>
                    <td>${item.PARC}</td>
                    <td>${item.NOMEPARC}</td>
                    <td>${item.UF}</td>
                    <td>${item.PROD}</td>
                    <td>${item.CODPROD}</td>
                    <td>${item.DESCRPROD}</td>
                    <td>${item.MARCA}</td>
                    <td>${item.MARCA1}</td>
                    <td>${item.CODGRUPOPROD}</td>
                    <td>${item.DESCRGRUPOPROD}</td>
                    <td>${item.VOL}</td>
                    <td>${item.CODTIPOPER}</td>
                    <td>${item.TOP}</td>
                    <td>${item.DESCROPER}</td>
                    <td>${item.ATUALEST}</td>
                    <td>${item.ATUALFIN}</td>
                    <td>${item.TIPATUALFIN}</td>
                    <td>${item.STATUSNFE}</td>
                    <td>${item.TIPMOV}</td>
                    <td>${item.BONIFICACAO}</td>
                    <td>${item.CODCENCUS}</td>
                    <td>${item.AD_APELIDO}</td>
                    <td>${item.DESCRCENCUS}</td>
                    <td>${item.AD_QTDVOLLT}</td>
                    <td>${item.QTD}</td>
                    <td>${item.VLR}</td>
                    <td>${item.VLRCUSICM1}</td>
                    <td>${item.VLRCUSGER1}</td>
                    <td>${item.VLRCUSICM2}</td>
                    <td>${item.VLRCUSGER2}</td>
                `;
                
                tableBody.appendChild(tr);
            });
            
            document.getElementById('dataTable').style.display = 'table';
        }
    </script>
</body>
</html>
