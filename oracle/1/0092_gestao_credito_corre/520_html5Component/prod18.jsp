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
    SELECT * FROM (
        SELECT
        CODPARCMATRIZ,
        RAZAOSOCIAL,
        CASE 
            WHEN CODPARCMATRIZ IN (SELECT DISTINCT CODPARC FROM AD_ANCREDITO) 
            THEN 'Possui Análise de Crédito'
            ELSE 'Não Possui Análise de Crédito'
        END AS ANALISE_CREDITO,        
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
            ABS(ROUND(AVG(DIAS_EM_ATRASO), 0)) DIAS_EM_ATRASO,
            ROUND(AVG(VLRDESDOB), 2) VLRDESDOB,
            ROUND(AVG(VLRBAIXA), 2) VLRBAIXA
            FROM (
                SELECT
                NVL(PAR.CODPARCMATRIZ, PAR.CODPARC) CODPARCMATRIZ,
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
                    <th onclick="sortTable(2)">Análise</th>
                    <th style="text-align: center;" onclick="sortTable(3)">Dias Atraso</th>
                    <th style="text-align: center;" onclick="sortTable(4)">Vlr. Desdob.</th>
                    <th style="text-align: center;" onclick="sortTable(5)">Vlr. Baixa</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <c:forEach var="row" items="${detalhe.rows}">
                    <tr>
                        <td onclick="abrir('${row.CODPARCMATRIZ}')">${row.CODPARCMATRIZ}</td>
                        <td>${row.RAZAOSOCIAL}</td>
                        <td>${row.ANALISE_CREDITO}</td>
                        <td style="text-align: center;">${row.DIAS_EM_ATRASO}</td>
                        <fmt:setLocale value="pt_BR" />
                        <td style="text-align: center;">
                            <fmt:formatNumber value="${row.VLRDESDOB}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
                        </td>
                        <td style="text-align: center;">
                            <fmt:formatNumber value="${row.VLRBAIXA}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
                        </td>
                    </tr>
                </c:forEach> 
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total de registros:</b><span id="recordCount">0</span></td>
                    <td colspan="2"></td>
                    <td><b>Total</b></td>
                    <td style="text-align: center;" id="totalDesdob"><b>0,00</b></td>
                    <td style="text-align: center;" id="totalBaixa"><b>0,00</b></td>
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
        let totalDesdob = 0;
        let totalBaixa = 0;

        rows.forEach(row => {
        // Verificar se a linha está visível
            if (row.style.display !== 'none') {            
                const desdobValue = row.cells[4].textContent.replace(/[^\d,-]/g, '').replace(',', '.');
                const desdob = parseFloat(desdobValue);
                totalDesdob += isNaN(desdob) ? 0 : desdob;

                const baixaValue = row.cells[5].textContent.replace(/[^\d,-]/g, '').replace(',', '.');
                const baixa = parseFloat(baixaValue);
                totalBaixa += isNaN(baixa) ? 0 : baixa;
            }
        });

        document.getElementById('totalDesdob').innerHTML = '<b>' + totalDesdob.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</b>';
        document.getElementById('totalBaixa').innerHTML = '<b>' + totalBaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</b>';
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
        XLSX.writeFile(wb, 'Detalh_Pontual_Negativa.xlsx');
    }

    updateTotal();
    updateRecordCount();


    function abrir(grupo) {
            var params = { 
                'A_CODPARC' : parseInt(grupo)
             };
            var level = 'lvl_ut74b5';
            openLevel(level, params);
    }

     

</script>
</body>
</html>
