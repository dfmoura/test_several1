<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Vendas - Satisfação (até 1000 registros)</title>

    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ccc;
            padding: 8px;
        }
        th {
            background-color: #f0f0f0;
        }
    </style>
        <snk:load/>

</head>
<body>
    <h2>Vendas - Satisfação (até 1000 registros)</h2>
    <div id="tabelaContainer">Carregando dados...</div>

    <script>
        JX.consultar("SELECT * FROM VGF_VENDAS_SATIS WHERE ROWNUM < 1000")
            .then(response => {
                const dados = response.dados;

                if (!dados || dados.length === 0) {
                    document.getElementById('tabelaContainer').innerHTML = "Nenhum dado encontrado.";
                    return;
                }

                const headers = Object.keys(dados[0]);
                const tabela = document.createElement("table");
                const thead = document.createElement("thead");
                const tbody = document.createElement("tbody");

                // Cabeçalho
                const headerRow = document.createElement("tr");
                headers.forEach(col => {
                    const th = document.createElement("th");
                    th.textContent = col;
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);

                // Dados
                dados.forEach(row => {
                    const tr = document.createElement("tr");
                    headers.forEach(col => {
                        const td = document.createElement("td");
                        td.textContent = row[col] ?? "";  // Tratamento para valores nulos
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });

                tabela.appendChild(thead);
                tabela.appendChild(tbody);
                const container = document.getElementById("tabelaContainer");
                container.innerHTML = "";
                container.appendChild(tabela);
            })
            .catch(error => {
                console.error("Erro ao consultar:", error);
                document.getElementById('tabelaContainer').innerHTML = "Erro ao carregar os dados.";
            });
    </script>
</body>
</html>
