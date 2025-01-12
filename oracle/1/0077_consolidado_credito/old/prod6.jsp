<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

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
            max-width: 100%;
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
            white-space: nowrap;
            overflow: hidden;
        }

        th {
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 1;
        }

        th.sort-asc::after {
            content: " ▲";
        }

        th.sort-desc::after {
            content: " ▼";
        }

        tbody tr:hover {
            background-color: #f5f5f5;
            cursor: pointer;
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


        /* Overlay do botão de exportação */
        .export-btn {
            position: fixed;
            bottom: 20px;
            left: 20px;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }

        .export-btn:hover {
            background-color: #45a049;
        }
    </style>
    <snk:load/>
</head>
<body>

    <snk:query var="detalhe">

    select * from (
        SELECT
        CODPARCMATRIZ,
        RAZAOSOCIAL,
        DIAS_EM_ATRASO,
        CASE 
        WHEN DIAS_EM_ATRASO <= 5 THEN 1
        WHEN DIAS_EM_ATRASO > 5 AND DIAS_EM_ATRASO <= 10 THEN 2
        WHEN DIAS_EM_ATRASO > 10 AND DIAS_EM_ATRASO <= 20 THEN 3
        WHEN DIAS_EM_ATRASO > 20 THEN 4 END AS PONT_NEGAT,
        VLRDESDOB,
        VLRBAIXA
        FROM (
        SELECT
        CODPARCMATRIZ,
        RAZAOSOCIAL,
        ABS(ROUND(AVG(DIAS_EM_ATRASO),0)) DIAS_EM_ATRASO,
        ROUND(AVG(VLRDESDOB),2) VLRDESDOB,
        ROUND(AVG(VLRBAIXA),2) VLRBAIXA
        FROM (
        SELECT
        NVL(PAR.CODPARCMATRIZ,PAR.CODPARC) CODPARCMATRIZ,
        PAR1.RAZAOSOCIAL,
        NUFIN,
        NUNOTA,
        NUMNOTA,
        DTVENC,
        DHBAIXA,
        DTVENC - DHBAIXA AS DIAS_EM_ATRASO,
        VLRDESDOB,
        VLRBAIXA
        FROM TGFFIN FIN
        INNER JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
        INNER JOIN TGFPAR PAR1 ON PAR.CODPARCMATRIZ = PAR1.CODPARC
        WHERE RECDESP=1 AND PROVISAO='N'
        AND (FIN.DHBAIXA IS NOT NULL OR FIN.DTVENC < TRUNC(SYSDATE))
        )
        WHERE ((DTVENC - DHBAIXA) < 0)
        GROUP BY 
        CODPARCMATRIZ,
        RAZAOSOCIAL
        )
        )
        WHERE PONT_NEGAT = :A_GRUPO    

    </snk:query>

<div class="table-wrapper">
    <h2>Detalhamento - Pontualidade Negativa</h2>
    <div class="filter-container">
        <input type="text" id="tableFilter" placeholder="Digite para filtrar...">
    </div>
    <div class="table-container">
        <table id="myTable">
            <thead>
                <tr>
                    <th onclick="sortTable(0)">Cód. Matriz</th>
                    <th onclick="sortTable(1)">Parceiro</th>
                    <th onclick="sortTable(2)">Dias Atraso</th>
                    <th onclick="sortTable(3)">Vlr. Desdob.</th>
                    <th onclick="sortTable(4)">Vlr. Baixa</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <c:forEach var="row" items="${detalhe.rows}">
                    <tr>
                        <td>${row.CODPARCMATRIZ}</td>
                        <td>${row.RAZAOSOCIAL}</td>
                        <td>${row.DIAS_EM_ATRASO}</td>
                        <td>${row.VLRDESDOB}</td>
                        <td style="text-align: center;"><fmt:formatNumber value="${row.VLRBAIXA}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                    </tr>
                </c:forEach> 
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total</b></td>
                    <td colspan="3"></td>
                    <td style="text-align: center;" id="totalAmount"><b>0,00</b></td>
                </tr>
            </tfoot>
        </table>
    </div>

</div>


<!-- Botão para exportar -->
<button class="export-btn" onclick="exportTableToExcel()">*.xlsx</button>

<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.1/xlsx.full.min.js"></script>

<script>



    function updateTotal() {
        const rows = document.querySelectorAll('#myTable tbody tr');
        let total = 0;

        rows.forEach(row => {
            const cellValue = row.cells[4].textContent.replace(/[^\d,-]/g, '').replace(',', '.');
            const value = parseFloat(cellValue);
            total += isNaN(value) ? 0 : value;
        });

        document.getElementById('totalAmount').innerHTML = '<b>' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</b>';
    }



    document.getElementById('tableFilter').addEventListener('keyup', function () {
        const filter = this.value.toLowerCase();
        const rows = document.querySelectorAll('#myTable tbody tr');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const match = Array.from(cells).some(cell => cell.textContent.toLowerCase().includes(filter));
            row.style.display = match ? '' : 'none';
        });

        updateTotal();

    });

    function sortTable(n) {
        const table = document.getElementById("myTable");
        let rows = Array.from(table.querySelectorAll('tbody tr'));
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
    }

    function exportTableToExcel() {
        const table = document.getElementById("myTable");
        const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet 1" });
        XLSX.writeFile(wb, 'Detalh_Pontual_Negativa.xlsx');
    }


    updateTotal();





</script>

</body>
</html>
