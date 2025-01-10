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
    CODPARCMATRIZ,
    RAZAOSOCIAL,
    CASE 
    WHEN CODPARCMATRIZ IN (SELECT DISTINCT CODPARC FROM AD_ANCREDITO) 
    THEN 'Possui Análise de Crédito'
    ELSE 'Não Possui Análise de Crédito'
    END AS ANALISE_CREDITO,    
    LIMCREDISP,
    GRUPO_LIMCREDISP,
    INTERVALO
    FROM (
    SELECT
    CODPARCMATRIZ,
    RAZAOSOCIAL,
    LIMCREDISP,
    GRUPO_LIMCREDISP,
    'De: ' ||
    TO_CHAR((MIN(PERC) OVER (PARTITION BY GRUPO_LIMCREDISP)), 'FM999990.00')||'%' ||
    '_Até: ' ||
    TO_CHAR(MAX(PERC) OVER (PARTITION BY GRUPO_LIMCREDISP), 'FM999990.00')||'%' AS INTERVALO
    FROM (
    select 
    CODPARCMATRIZ,
    RAZAOSOCIAL,
    LIMCRED,
    LIMCREDISP,
    perc,
    NTILE(6) OVER (ORDER BY perc DESC) AS GRUPO_LIMCREDISP
    from (
    SELECT
    CODPARCMATRIZ,
    RAZAOSOCIAL,
    ATIVO,
    LIMCRED,
    LIMCREDCONSUM,
    LIMCREDISP,
    (LIMCREDCONSUM / NULLIF(LIMCRED, 0)) * 100 perc
    FROM
    (
    SELECT
    COALESCE(PAR.CODPARCMATRIZ,PAR.CODPARC) AS CODPARCMATRIZ,
    COALESCE(PAR2.RAZAOSOCIAL,PAR.RAZAOSOCIAL) AS RAZAOSOCIAL,
    PAR2.ATIVO,
    NVL(PAR2.LIMCRED,0) AS LIMCRED,
    SUM(NVL(FIN.VLRDESDOB,0)) AS LIMCREDCONSUM,
    NVL(PAR2.LIMCRED,0) - SUM(NVL(FIN.VLRDESDOB,0)) AS LIMCREDISP,
    PAR2.AD_DTVENCCAD,
    CASE
    WHEN PAR2.AD_DTVENCCAD >= SYSDATE THEN 'Casdastro Não Vencido'
    WHEN PAR2.AD_DTVENCCAD < SYSDATE THEN 'Cadastro Vencido' 
    ELSE 'Sem Data de Cadastro' 
    END AS STATUS_CADASTRO
    FROM TGFPAR PAR 
    LEFT JOIN TGFFIN FIN ON PAR.CODPARC = FIN.CODPARC
    LEFT JOIN TGFPAR PAR2 ON PAR.CODPARCMATRIZ = PAR2.CODPARC
    LEFT JOIN TGFCAB CAB  ON FIN.NUNOTA = CAB.NUNOTA
    WHERE 
    FIN.RECDESP = 1 AND FIN.DHBAIXA IS NULL
    AND (CAB.STATUSNOTA = 'L' OR FIN.NUNOTA IS NULL)
    AND PAR.CLIENTE = 'S'
    GROUP BY
    COALESCE(PAR.CODPARCMATRIZ,PAR.CODPARC),
    COALESCE(PAR2.RAZAOSOCIAL,PAR.RAZAOSOCIAL),
    PAR2.ATIVO,PAR2.LIMCRED,PAR2.AD_DTVENCCAD
    UNION ALL
    SELECT * FROM (
    -- Primeiro, criamos um CTE (Common Table Expression) para o segundo SELECT
    WITH SegundoSelect AS (
    SELECT
    COALESCE(PAR.CODPARCMATRIZ,PAR.CODPARC) AS CODPARCMATRIZ,
    COALESCE(PAR2.RAZAOSOCIAL,PAR.RAZAOSOCIAL) AS RAZAOSOCIAL,
    PAR2.ATIVO,
    NVL(PAR2.LIMCRED,0) AS LIMCRED,
    SUM(NVL(FIN.VLRDESDOB,0)) AS LIMCREDCONSUM,
    NVL(PAR2.LIMCRED,0) - SUM(NVL(FIN.VLRDESDOB,0)) AS LIMCREDISP,
    PAR2.AD_DTVENCCAD,
    CASE
    WHEN PAR2.AD_DTVENCCAD >= SYSDATE THEN 'Casdastro Não Vencido'
    WHEN PAR2.AD_DTVENCCAD < SYSDATE THEN 'Cadastro Vencido' 
    ELSE 'Sem Data de Cadastro' 
    END AS STATUS_CADASTRO
    FROM TGFPAR PAR 
    LEFT JOIN TGFFIN FIN ON PAR.CODPARC = FIN.CODPARC
    LEFT JOIN TGFPAR PAR2 ON PAR.CODPARCMATRIZ = PAR2.CODPARC
    LEFT JOIN TGFCAB CAB  ON FIN.NUNOTA = CAB.NUNOTA
    WHERE 
    FIN.RECDESP = 1 AND FIN.DHBAIXA IS NULL
    AND (CAB.STATUSNOTA = 'L' OR FIN.NUNOTA IS NULL)
    AND PAR.CLIENTE = 'S'
    GROUP BY
    COALESCE(PAR.CODPARCMATRIZ,PAR.CODPARC),
    COALESCE(PAR2.RAZAOSOCIAL,PAR.RAZAOSOCIAL),
    PAR2.ATIVO,PAR2.LIMCRED,PAR2.AD_DTVENCCAD
    
    )
    -- Agora fazemos o SELECT principal excluindo os registros que estão no SecondSelect
    SELECT
    COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC) AS CODPARCMATRIZ,
    COALESCE(PAR2.RAZAOSOCIAL, PAR.RAZAOSOCIAL) AS PARCEIRO_MATRIZ,
    PAR2.ATIVO,
    NVL(PAR2.LIMCRED, 0) AS LIMCRED,
    0 AS LIMCREDCONSUM,
    NVL(PAR2.LIMCRED, 0) - 0 AS LIMCREDISP,
    PAR2.AD_DTVENCCAD,
    CASE
    WHEN PAR2.AD_DTVENCCAD >= SYSDATE THEN 'Cadastro Não Vencido'
    WHEN PAR2.AD_DTVENCCAD < SYSDATE THEN 'Cadastro Vencido'
    ELSE 'Sem Data de Cadastro'
    END AS STATUS_CADASTRO
    FROM TGFPAR PAR
    LEFT JOIN TGFPAR PAR2 ON PAR.CODPARCMATRIZ = PAR2.CODPARC
    WHERE PAR.CLIENTE = 'S' AND COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC) <> 0
    AND COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC) NOT IN (
    SELECT CODPARCMATRIZ FROM SegundoSelect
    )
    )
    )
    WHERE LIMCREDCONSUM/nullif(LIMCRED,0) > 0.9 AND LIMCRED > 0.01
    GROUP BY
    CODPARCMATRIZ,
    RAZAOSOCIAL,
    ATIVO,
    LIMCRED,
    LIMCREDCONSUM,
    LIMCREDISP
    )
    )
    )
    WHERE GRUPO_LIMCREDISP = :A_GRUPO

</snk:query>

<div class="table-wrapper">
    <h2>Detalhamento - Limite Crédito Consumido</h2>
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
                    <th style="text-align: center;" onclick="sortTable(3)">Intervalo</th>
                    <th style="text-align: center;" onclick="sortTable(4)">Lim. Créd. Consu.</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <c:forEach var="row" items="${detalhe.rows}">
                    <tr>
                        <td onclick="abrir('${row.CODPARCMATRIZ}')">${row.CODPARCMATRIZ}</td>
                        <td>${row.RAZAOSOCIAL}</td>
                        <td>${row.ANALISE_CREDITO}</td>
                        <td style="text-align: center;">${row.INTERVALO}</td>
                        <td style="text-align: center;">
                            <fmt:formatNumber value="${row.LIMCREDISP}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
                        </td>
                    </tr>
                </c:forEach> 
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total de registros:</b><span id="recordCount">0</span></td>
                    <td colspan="4"></td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>


<button class="export-btn" onclick="exportTableToExcel()">*.xlsx</button>

<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.1/xlsx.full.min.js"></script>
<script>


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
