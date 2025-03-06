<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extrair Dados XML</title>

    <style>
    body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }

        h1 {
            text-align: center;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
        }

        tr:nth-child(even) {
            background-color: #f9f9f9;
        }

        tr:hover {
            background-color: #ddd;
        }
    </style>

    <snk:load/>
</head>

<body>
    <snk:query var="nfe">
        select * from(select xml from tgfnfe order by chavenfe desc) where rownum < 10
    </snk:query>

    <h1>Dados da NFe</h1>
    <table id="nfeTable">
        <thead>
            <tr>
                <th>CNPJ</th>
                <th>NF</th>
                <th>Emissão</th>
                <th>Modelo</th>
                <th>Item</th>
                <th>NCM</th>
                <th>Cód.</th>
                <th>Produto</th>
                <th>Un. Trib.</th>
                <th>Quantidade</th>
                <th>Valor Unitário</th>
                <th>Valor Total</th>
                <th>CST</th>
                <th>BC Icms</th>
                <th>Aliq. Icms</th>
                <th>Valor Icms</th>
            </tr>
        </thead>
        <tbody>
            <!-- Os dados serão inseridos aqui via JavaScript -->
        </tbody>
    </table>

    <script>
    document.addEventListener("DOMContentLoaded", function() {

        // Obter o conteúdo do XML da variável nfe diretamente

        const nfeList = [
            <c:forEach items="${nfe.rows}" var="row" varStatus="status">
                decodeURIComponent(escape(atob('${snk:blobToBase64(row.XML)}')))${!status.last ? ',' : ''}
            </c:forEach>
        ];

        // Processar cada XML da lista
        nfeList.forEach(nfeXmlString => {
        // Criar um objeto XML a partir da string
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(nfeXmlString, "application/xml");


            const emitElement = xmlDoc.getElementsByTagName("emit")[0];
            let cnpj = emitElement ? emitElement.getElementsByTagName("CNPJ")[0]?.textContent || "" : "";

            const ideElement = xmlDoc.getElementsByTagName("ide")[0];
            let numeroNF = ideElement ? ideElement.getElementsByTagName("nNF")[0]?.textContent || "" : "";
            let dataEmissao = ideElement ? ideElement.getElementsByTagName("dhEmi")[0]?.textContent || "" : "";
            let modeloNF = ideElement ? ideElement.getElementsByTagName("mod")[0]?.textContent || "" : "";

            const detElements = xmlDoc.getElementsByTagName("det");
            const tableBody = document.querySelector("#nfeTable tbody");

            for (let i = 0; i < detElements.length; i++) {
                const det = detElements[i];
                const prod = det.getElementsByTagName("prod")[0];
                const imposto = det.getElementsByTagName("imposto")[0];

                let cstICMS = "", vBC = "", pICMS = "", vICMS = "";
                const icmsElements = imposto.getElementsByTagName("ICMS")[0];

                if (icmsElements) {
                    const icmsChildren = icmsElements.children;
                    for (let j = 0; j < icmsChildren.length; j++) {
                        const cstElement = icmsChildren[j].getElementsByTagName("CST")[0];
                        const vBCElement = icmsChildren[j].getElementsByTagName("vBC")[0];
                        const pICMSElement = icmsChildren[j].getElementsByTagName("pICMS")[0];
                        const vICMSElement = icmsChildren[j].getElementsByTagName("vICMS")[0];

                        if (cstElement) cstICMS = cstElement.textContent;
                        if (vBCElement) vBC = vBCElement.textContent;
                        if (pICMSElement) pICMS = pICMSElement.textContent;
                        if (vICMSElement) vICMS = vICMSElement.textContent;
                        if (cstICMS && vBC && pICMS && vICMS) break;            
                    }
                }

                const item = det.getAttribute("nItem");
                const ncm = prod.getElementsByTagName("NCM")[0].textContent;
                const codigoProduto = prod.getElementsByTagName("cProd")[0].textContent;
                const produto = prod.getElementsByTagName("xProd")[0].textContent;
                const uTrib = prod.getElementsByTagName("uTrib")[0].textContent;
                const quantidade = prod.getElementsByTagName("qCom")[0].textContent;
                const valorUnitario = prod.getElementsByTagName("vUnCom")[0].textContent;
                const valorTotal = prod.getElementsByTagName("vProd")[0].textContent;

                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${cnpj}</td>
                    <td>${numeroNF}</td>
                    <td>${dataEmissao}</td>
                    <td>${modeloNF}</td>
                    <td>${item}</td>
                    <td>${ncm}</td>
                    <td>${codigoProduto}</td>
                    <td>${produto}</td>
                    <td>${uTrib}</td>
                    <td>${quantidade}</td>
                    <td>${valorUnitario}</td>
                    <td>${valorTotal}</td>
                    <td>${cstICMS}</td>
                    <td>${vBC}</td>
                    <td>${pICMS}</td>
                    <td>${vICMS}</td>
                `;

                tableBody.appendChild(row);
            }
        });
    });
    </script>
</body>
</html>
