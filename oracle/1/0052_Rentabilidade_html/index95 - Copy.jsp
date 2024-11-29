<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tabela com Filtros e Ordenação</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }

        .table-wrapper {
            max-width: 1400px;
            margin: 20px auto;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #ddd;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .filter-container {
            margin: 10px;
            text-align: center;
        }

        .table-container {
            overflow-y: auto;
            height: 550px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
        }

        th, td {
            padding: 8px;
            border: 1px solid #ddd;
            text-align: left;
            white-space: nowrap; /* Impede a quebra de linha nas células */

        }

        th {
            cursor: pointer;
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 1;
            resize: horizontal;
            overflow: auto;
        }

        th.sort-asc::after {
            content: " ▲";
        }

        th.sort-desc::after {
            content: " ▼";
        }

        tbody tr:hover {
           background-color: #f5f5f5; /* Cor de fundo ao passar o mouse */
            cursor: pointer; /* Muda o cursor para indicar interatividade */
        }    

        input[type="text"] {
            width: 100%;
            box-sizing: border-box;
            padding: 8px;
            font-size: 14px;
        }

        h2 {
            text-align: center;
            margin-bottom: 0;
            padding: 10px;
            background-color: #f8f8f8;
            border-bottom: 1px solid #ddd;
        }

        .total-row td {
            font-weight: bold;
        }
    </style>

<snk:load/>
</head>
<body>
    <snk:query var="fat_det">
        WITH DESCO AS
        (
        SELECT
        CODEMP,EMPRESA,NUNOTA,TO_CHAR(DTNEG,'DD-MM-YYYY')DTNEG,AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD,CODGER,GERENTE,CODPARC,NOMEPARC AS PARCEIRO,QTDNEG,ROUND((VLRDESC/NULLIF(QTDNEG,0)),4) AS VLRDESC_UN,VLRDESC
        FROM VGF_CONSOLIDADOR_NOTAS_GM 
        WHERE 
        GOLSINAL = -1
        AND (DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
        AND TIPMOV IN ('V', 'D')
        AND ATIVO = 'S'
        AND CODEMP IN (:P_EMPRESA)
        AND CODNAT IN (:P_NATUREZA)
        AND CODCENCUS IN (:P_CR)
        AND CODVEND IN (:P_VENDEDOR)
        AND AD_SUPERVISOR IN (:P_SUPERVISOR)
        AND CODGER IN (:P_GERENTE)
        AND AD_ROTA IN (:P_ROTA)
        AND CODTIPOPER IN (:P_TOP)
        )
        SELECT CODEMP,EMPRESA,NUNOTA,DTNEG,AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD,CODGER,GERENTE,CODPARC,PARCEIRO,QTDNEG,VLRDESC_UN,VLRDESC
        FROM DESCO 
        WHERE 
        (AD_TPPROD = :A_TPPROD AND CODGER = :A_CODGER)
        OR
        (AD_TPPROD = :A_TPPROD AND CODPARC = :A_CODPARC)
        OR
        (AD_TPPROD = :A_TPPROD AND CODPROD = :A_CODPROD)
        ORDER BY 15 DESC
</snk:query>

<div class="table-wrapper">
    <h2>Detalhamento Desconto</h2>
    <div class="filter-container">
        <input type="text" id="tableFilter" placeholder="Digite para filtrar...">
    </div>
    <div class="table-container">
        <table id="myTable">
            <thead>
                <tr>
                    <th onclick="sortTable(0)">Cód. Emp.</th>
                    <th onclick="sortTable(1)">Empresa</th>
                    <th onclick="sortTable(2)">NÚ. Único</th>
                    <th onclick="sortTable(3)">Dt. Neg.</th>
                    <th onclick="sortTable(4)">Cód. Tp. Prod.</th>
                    <th onclick="sortTable(5)">Tp. Prod.</th>
                    <th onclick="sortTable(6)">Cód. Prod.</th>
                    <th onclick="sortTable(7)">Produto</th>
                    <th onclick="sortTable(8)">Cód. Ger.</th>
                    <th onclick="sortTable(9)">Gerente</th>
                    <th onclick="sortTable(10)">Cód. Parc.</th>
                    <th onclick="sortTable(11)">Parceiro</th>
                    <th onclick="sortTable(12)">Qtd. Neg.</th>
                    <th onclick="sortTable(13)">Vlr. Desc. (UN)</th>
                    <th onclick="sortTable(14)">Vlr. Desc.</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <c:forEach var="row" items="${fat_det.rows}">
                    <tr>
                        <td>${row.CODEMP}</td>
                        <td>${row.EMPRESA}</td>
                        <td onclick="abrir_portal('${row.NUNOTA}')">${row.NUNOTA}</td>
                        <td>${row.DTNEG}</td>
                        <td>${row.AD_TPPROD}</td>
                        <td>${row.TIPOPROD}</td>
                        <td>${row.CODPROD}</td>
                        <td>${row.DESCRPROD}</td>
                        <td>${row.CODGER}</td>
                        <td>${row.GERENTE}</td>
                        <td>${row.CODPARC}</td>
                        <td>${row.PARCEIRO}</td>
                        <td style="text-align: center;"><fmt:formatNumber value="${row.QTDNEG}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                        <td style="text-align: center;"><fmt:formatNumber value="${row.VLRDESC_UN}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="4" maxFractionDigits="4"/></td>
                        <td style="text-align: center;"><fmt:formatNumber value="${row.VLRDESC}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                    </tr>
                </c:forEach>              
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total</b></td>
                    <td colspan="13"></td>
                    <td style="text-align: center;" id="totalAmount"><b>R$ 0,00</b></td>
                </tr>       
            </tfoot>
        </table>
    </div>
</div>


<!-- Botão de exportação para Excel -->
<div id="exportOverlay" style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;">
    <button onclick="exportToExcel()" style="
        background-color: #4CAF50; 
        color: white; 
        border: none; 
        padding: 10px 20px; 
        text-align: center; 
        text-decoration: none; 
        display: inline-block; 
        font-size: 16px; 
        margin: 4px 2px; 
        cursor: pointer; 
        border-radius: 5px;
    ">
        XLS
    </button>
</div>


<script>
    function abrir_portal(nunota) {
        var params = {'NUNOTA': nunota};
        var level = 'br.com.sankhya.com.mov.CentralNotas';
        openApp(level, params);
    }

    function updateTotal() {
        const rows = document.querySelectorAll('#myTable tbody tr:not(.total-row)');
        let total = 0;

        rows.forEach(row => {
            if (row.style.display !== 'none') {
                const cellValue = row.cells[14].textContent.replace(/[^\d,-]/g, '').replace(',', '.'); // Remove simbolos e converte ',' para '.'
                const value = parseFloat(cellValue);
                total += isNaN(value) ? 0 : value;
            }
        });

        document.getElementById('totalAmount').innerHTML = '<b>' + total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '</b>';
    }

    document.getElementById('tableFilter').addEventListener('keyup', function () {
        const filter = this.value.toLowerCase();
        const rows = document.querySelectorAll('#myTable tbody tr:not(.total-row)');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const match = Array.from(cells).some(cell => cell.textContent.toLowerCase().includes(filter));
            row.style.display = match ? '' : 'none';
        });

        updateTotal(); // Atualiza o total após o filtro
    });

    function sortTable(n) {
        const table = document.getElementById("myTable");
        let rows = Array.from(table.querySelectorAll('tbody tr:not(.total-row)')); // Exclui a linha de total
        const isAscending = table.querySelectorAll('th')[n].classList.toggle('sort-asc');

        rows.sort((rowA, rowB) => {
            const cellA = rowA.cells[n].textContent.trim().toLowerCase();
            const cellB = rowB.cells[n].textContent.trim().toLowerCase();

            if (!isNaN(cellA) && !isNaN(cellB)) {
                return isAscending ? cellA - cellB : cellB - cellA;
            }

            return isAscending ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
        });

        rows.forEach(row => table.querySelector('tbody').appendChild(row));

        Array.from(table.querySelectorAll('th')).forEach((th, index) => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (index === n) {
                th.classList.add(isAscending ? 'sort-asc' : 'sort-desc');
            }
        });

        // Atualiza o total após a ordenação
        updateTotal();
    }

    // Calcula e exibe o total inicial após o carregamento da página
    document.addEventListener('DOMContentLoaded', (event) => {
        updateTotal();
    });
</script>


<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.1/xlsx.full.min.js"></script>
<script>
    function exportToExcel() {
        var table = document.getElementById('myTable');
        var wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
        XLSX.writeFile(wb, 'dados.xlsx');
    }
</script>


</body>
</html>
