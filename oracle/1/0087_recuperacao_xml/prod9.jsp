<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tabela Profissional</title>
    <script src="https://cdn.jsdelivr.net/npm/sankhyajx"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <script src="jx.min.js"></script> <!-- Produção -->

    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
        }

        header {
            background-color: #007BFF;
            color: white;
            padding: 20px;
            text-align: center;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .table-container {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        th, td {
            padding: 8px 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        th {
            background-color: #007BFF;
            color: white;
            font-weight: bold;
        }

        tr:hover {
            background-color: #f1f1f1;
        }

        .highlight-red {
            color: red;
            font-weight: bold;
        }
    </style>
        <snk:load/>

</head>
<body>
    <header>
        <h1>Comparação XML vs Sistema</h1>
        <p>Esta página exibe a comparação entre os dados do XML e do Sistema.</p>
    </header>

    <div class="table-container">
        <table id="dataTable">
            <thead>
                <tr>
                    <th>Grupo</th>
                    <th>Origem</th>
                    <th>Chave</th>
                    <th>Filial</th>
                    <th>Nº Único</th>
                    <th>Nro. Nota</th>
                    <th>Dt. Emissão</th>
                    <th>Cód. Parc.</th>
                    <th>Parceiro</th>
                    <th>UF</th>
                    <th>CNPJ/CPF</th>
                    <th>Seq.</th>
                    <th>CFOP</th>
                    <th>CST</th>
                    <th>NCM</th>
                    <th>Cód. Prod.</th>
                    <th>Produto</th>
                    <th>Cód. Vol.</th>
                    <th>Qtd. Neg.</th>
                    <th>Vlr. Unit.</th>
                    <th>Vlr. Tot.</th>
                    <th>BC ICMS</th>
                    <th>Aliq. ICMS</th>
                    <th>Vlr. ICMS</th>
                </tr>
            </thead>
            <tbody>
                <!-- Dados serão inseridos via JavaScript -->
            </tbody>
        </table>
    </div>

    <script>
        function fetchData() {
            JX.consultar(`
                SELECT grupo, Origem, nvl(chaveacesso,'0') chaveacesso, codemp, nvl(nunota,0) nunota, 
                    NUMNOTA, dhEmissao, nvl(codparc,0) codparc, nvl(razaosocial,'0') razaosocial, 
                    nvl(UF,'0') UF, nvl(CNPJ_CPF,'0') CNPJ_CPF, sequencia, CFOP, 
                    nvl(CST,0) CST, nvl(ncm,'0') ncm, nvl(codprod,0) codprod, 
                    nvl(descrprod,'0') descrprod, codvol, qtdneg, vlrunit, vlrtot, 
                    baseicms, aliqicms, vlricms 
                FROM AD_TEST_XMS_SIS_SATIS 
                WHERE dhemissao BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN`
            )
            .then(data => createTable(data))
            .catch(error => console.error('Erro ao buscar dados:', error));
        }

        function createTable(data) {
            const tableBody = document.querySelector("#dataTable tbody");
            tableBody.innerHTML = "";
            data.forEach(row => {
                const tr = document.createElement("tr");
                Object.values(row).forEach(value => {
                    const td = document.createElement("td");
                    td.textContent = value;
                    tr.appendChild(td);
                });
                tableBody.appendChild(tr);
            });
            highlightDifferences();
        }

        function highlightDifferences() {
            const rows = document.querySelectorAll("#dataTable tbody tr");
            const fieldsToCheck = ["CST", "NCM", "Qtd. Neg.", "Vlr. Unit.", "Vlr. Tot.", "BC ICMS", "Aliq. ICMS", "Vlr. ICMS"];
            const headerRow = document.querySelector("#dataTable thead tr");
            const headers = Array.from(headerRow.cells).map(cell => cell.textContent);

            for (let i = 0; i < rows.length; i += 2) {
                if (i + 1 >= rows.length) break;
                const row1 = rows[i];
                const row2 = rows[i + 1];
                fieldsToCheck.forEach(field => {
                    const index = headers.indexOf(field);
                    if (index === -1) return;
                    const value1 = row1.cells[index].textContent;
                    const value2 = row2.cells[index].textContent;
                    if (value1 !== value2) {
                        row1.cells[index].classList.add("highlight-red");
                        row2.cells[index].classList.add("highlight-red");
                    }
                });
            }
        }

        document.addEventListener("DOMContentLoaded", fetchData);
    </script>
</body>
</html>
