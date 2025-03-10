<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comparação XML vs Sistema</title>
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

        header h1 {
            margin: 0;
            font-size: 24px;
        }

        header p {
            margin: 10px 0 0;
            font-size: 14px;
        }

        .table-container {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            font-size: 12px;
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
            font-size: 12px;
        }

        tr:hover {
            background-color: #f1f1f1;
        }

        .highlight-red {
            color: red;
            font-weight: bold;
        }

        .group-color-1 {
            background-color: #e3f2fd; /* Azul claro */
        }

        .group-color-2 {
            background-color: #fff3e0; /* Laranja claro */
        }
    </style>
    <snk:load/>
</head>
<body>
    <header>
        <h1>Comparação XML vs Sistema</h1>
        <p>Esta página exibe a comparação entre os dados do XML e do Sistema, destacando as diferenças e agrupando as informações.</p>
    </header>

    <snk:query var="nfe">
        SELECT
            grupo,
            Origem,
            nvl(chaveacesso,'0') chaveacesso,
            codemp,
            nvl(nunota,0) nunota,
            NUMNOTA,
            dhEmissao,
            nvl(codparc,0) codparc,
            nvl(razaosocial,'0') razaosocial,
            nvl(UF,'0') UF,
            nvl(CNPJ_CPF,'0') CNPJ_CPF,
            sequencia,
            CFOP,
            nvl(CST,0) CST,
            nvl(ncm,'0') ncm,
            nvl(codprod,0) codprod,
            nvl(descrprod,'0') descrprod,
            codvol,
            qtdneg,
            vlrunit,
            vlrtot,
            baseicms,
            aliqicms,
            vlricms
        FROM AD_TEST_XMS_SIS_SATIS
        WHERE 
            dhemissao BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
    </snk:query>

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
        // Convertendo a variável JSTL para JavaScript
        const nfeData = [
            <c:forEach var="row" items="${nfe.rows}" varStatus="loop">
                {
                    Grupo: "${row.grupo}",
                    Origem: "${row.Origem}",
                    Chave: "${row.chaveacesso}",
                    Filial: "${row.codemp}",
                    "Nº Único": "${row.nunota}",
                    "Nro. Nota": "${row.NUMNOTA}",
                    "Dt. Emissão": "${row.dhEmissao}",
                    "Cód. Parc.": "${row.codparc}",
                    Parceiro: "${row.razaosocial}",
                    UF: "${row.UF}",
                    "CNPJ/CPF": "${row.CNPJ_CPF}",
                    Seq: "${row.sequencia}",
                    CFOP: "${row.CFOP}",
                    CST: "${row.CST}",
                    NCM: "${row.ncm}",
                    "Cód. Prod.": "${row.codprod}",
                    Produto: "${row.descrprod}",
                    "Cód. Vol.": "${row.codvol}",
                    "Qtd. Neg.": "${row.qtdneg}",
                    "Vlr. Unit.": "${row.vlrunit}",
                    "Vlr. Tot.": "${row.vlrtot}",
                    "BC ICMS": "${row.baseicms}",
                    "Aliq. ICMS": "${row.aliqicms}",
                    "Vlr. ICMS": "${row.vlricms}"
                }<c:if test="${!loop.last}">,</c:if>
            </c:forEach>
        ];

        function createTable(data) {
            const tableBody = document.querySelector("#dataTable tbody");
            let currentGroup = null;
            let colorIndex = 0;

            data.forEach((row, index) => {
                const tr = document.createElement("tr");

                // Verifica se o grupo mudou
                if (row.Grupo !== currentGroup) {
                    currentGroup = row.Grupo;
                    colorIndex = (colorIndex + 1) % 2; // Alterna entre 0 e 1 para as cores
                }

                // Aplica a cor com base no índice atual
                tr.classList.add(`group-color-${colorIndex + 1}`);

                // Preenche as células da linha
                Object.values(row).forEach((value) => {
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

                fieldsToCheck.forEach((field) => {
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

        document.addEventListener("DOMContentLoaded", () => {
            createTable(nfeData);
        });
    </script>
</body>
</html>