<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
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

        .export-btn {
            position: fixed;
            top: 20px;
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

        .record-counter {
            text-align: right;
            font-size: 12px;
            color: #555;
            margin-top: 10px;
        }
    </style>
    <snk:load/>
</head>
<body>

<snk:query var="detalhe">

SELECT
CLIENTE,
RAZAOSOCIAL,
CASE 
WHEN CLIENTE IN (SELECT DISTINCT CLIENTE FROM AD_GESTCRED) 
THEN 'Possui Gestão de Crédito'
ELSE 'Não Possui Gestão de Crédito'
END AS ANALISE_CREDITO,    
PERC,
DIF_LIMITE,
VERIFICADOR,
DIFLIM
FROM (

SELECT
CLIENTE,
RAZAOSOCIAL,
PERC,
CASE
WHEN PERC <= 20 THEN 'Até 20%'
WHEN PERC > 20 AND PERC <= 40 THEN 'Entre 21% e 40%'
WHEN PERC > 40 AND PERC <= 60 THEN 'Entre 41% e 60%'
WHEN PERC > 60 AND PERC <= 80 THEN 'Entre 61% e 80%'
WHEN PERC > 80 THEN 'Maior que 80%' END AS DIF_LIMITE,
CASE
WHEN PERC <= 20 THEN 1
WHEN PERC > 20 AND PERC <= 40 THEN 2
WHEN PERC > 40 AND PERC <= 60 THEN 3
WHEN PERC > 60 AND PERC <= 80 THEN 4
WHEN PERC > 80 THEN 5 END AS VERIFICADOR,
DIFLIM
FROM
(
SELECT
CLIENTE,
RAZAOSOCIAL,
ROUND(LIMCALC/LIMVIGOR*100,2) PERC,
DIFLIM

FROM (
SELECT
CRED.CLIENTE, 
PAR.RAZAOSOCIAL,
(SELECT NVL(PAR.LIMCRED,0) FROM TGFPAR PAR WHERE PAR.CODPARC = CRED.CLIENTE) LIMVIGOR,
(SELECT NVL(RISCOSATIS,0) + NVL(VLRBENS,0) + NVL(VLRCPR,0) + NVL(VLRFIANC,0) + NVL(VALOR,0) FROM
(SELECT
CLIENTE, 
RISCOSATIS,
(SELECT SUM(VLRBENS) FROM AD_BENS WHERE CLIENTE = CRED.CLIENTE)AS VLRBENS,
(SELECT SUM(VLRCPR) FROM AD_CPR WHERE CLIENTE = CRED.CLIENTE)AS VLRCPR,
(SELECT SUM(VLRFIANC) FROM AD_CARTFIANC WHERE CLIENTE = CRED.CLIENTE)AS VLRFIANC,
(SELECT SUM((CASE WHEN STATUS = 'ABERTO' THEN NVL(VALOR,0) ELSE 0 END)) FROM AD_DUPLIC WHERE CLIENTE = CRED.CLIENTE)AS VALOR
FROM AD_GESTCRED CRED)
WHERE CLIENTE = CRED.CLIENTE) LIMCALC,
(SELECT (NVL(RISCOSATIS,0) + NVL(VLRBENS,0) + NVL(VLRCPR,0) + NVL(VLRFIANC,0) + NVL(VALOR,0)) - NVL(LIMCRED,0)  FROM
(SELECT
CLIENTE, 
RISCOSATIS,
(SELECT LIMCRED FROM TGFPAR WHERE CODPARC = CRED.CLIENTE)AS LIMCRED,
(SELECT SUM(VLRBENS) FROM AD_BENS WHERE CLIENTE = CRED.CLIENTE)AS VLRBENS,
(SELECT SUM(VLRCPR) FROM AD_CPR WHERE CLIENTE = CRED.CLIENTE)AS VLRCPR,
(SELECT SUM(VLRFIANC) FROM AD_CARTFIANC WHERE CLIENTE = CRED.CLIENTE)AS VLRFIANC,
(SELECT SUM(VALOR) FROM AD_DUPLIC WHERE CLIENTE = CRED.CLIENTE)AS VALOR
FROM AD_GESTCRED CRED)
WHERE CLIENTE = CRED.CLIENTE) DIFLIM,


RISCOSATIS,
(SELECT SUM(VLRBENS) FROM AD_BENS WHERE CLIENTE = CRED.CLIENTE)AS VLRBENS,
(SELECT SUM(VLRCPR) FROM AD_CPR WHERE CLIENTE = CRED.CLIENTE)AS VLRCPR,
(SELECT SUM(VLRFIANC) FROM AD_CARTFIANC WHERE CLIENTE = CRED.CLIENTE)AS VLRFIANC,
(SELECT SUM(VALOR) FROM AD_DUPLIC WHERE CLIENTE = CRED.CLIENTE)AS VALOR
FROM AD_GESTCRED CRED
INNER JOIN TGFPAR PAR ON CRED.CLIENTE = PAR.CODPARC)
WHERE LIMCALC > 0 AND DIFLIM < 0

)
)


    WHERE VERIFICADOR = :A_GRUPO

</snk:query>

<div class="table-wrapper">
    <h2>Detalhamento - Diferença de Limite</h2>
    <div class="filter-container">
        <input type="text" id="tableFilter" placeholder="Digite para filtrar...">
    </div>
    <div class="table-container">
        <table id="myTable">
            <thead>
                <tr>
                    <th onclick="sortTable(0)">Cód. Parceiro</th>
                    <th onclick="sortTable(1)">Parceiro</th>
                    <th onclick="sortTable(2)">Gestão Crédito</th>
                    <th onclick="sortTable(3)">%</th>
                    <th style="text-align: center;" onclick="sortTable(4)">Intervalo %</th>
                    <th style="text-align: center;" onclick="sortTable(5)">Lim. Dif.</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <c:forEach var="row" items="${detalhe.rows}">
                    <tr>
                        <td onclick="abrir('${row.CLIENTE}')">${row.CLIENTE}</td>
                        <td>${row.RAZAOSOCIAL}</td>
                        <td>${row.ANALISE_CREDITO}</td>
                        <td>${row.PERC}</td>
                        <td style="text-align: center;">${row.DIF_LIMITE}</td>
                        <fmt:setLocale value="pt_BR" />
                        <td style="text-align: center;">
                            <fmt:formatNumber value="${row.DIFLIM}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
                        </td>
                    </tr>
                </c:forEach> 
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total de registros:</b><span id="recordCount">0</span></td>
                    <td colspan="3"></td>
                    <td><b>Total</b></td>
                    <td style="text-align: center;" id="totaldiflim"><b>0,00</b></td>

                </tr>
            </tfoot>
        </table>
    </div>
</div>


<button class="export-btn" onclick="exportTableToExcel()">*.xlsx</button>

<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.1/xlsx.full.min.js"></script>
<script>

function updateTotal() {
    const rows = document.querySelectorAll('#myTable tbody tr');
    let totaldiflim = 0;

    rows.forEach(row => {
        const diflimValue = row.cells[5]?.textContent?.replace(/[^\d,-]/g, '').replace(',', '.');
        const diflim = parseFloat(diflimValue);
        
        if (isNaN(diflim)) {
            console.error(`Valor inválido encontrado: "${diflimValue}" na linha`, row);
        }

        totaldiflim += isNaN(diflim) ? 0 : diflim;
    });

    document.getElementById('totaldiflim').innerHTML = '<b>' + totaldiflim.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</b>';
}



    function updateRecordCount() {
        const rows = document.querySelectorAll('#myTable tbody tr');
        const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
        document.getElementById('recordCount').textContent = visibleRows.length;
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
        updateRecordCount();
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
        XLSX.writeFile(wb, 'Detalh_Vencimento_Cadastro.xlsx');
    }

    updateTotal();
    updateRecordCount();

    function abrir(grupo) {
            var params = { 
                'A_CODPARC' : parseInt(grupo)
             };
            var level = 'lvl_xcph0h';
            openLevel(level, params);
        }  

</script>
</body>
</html>
