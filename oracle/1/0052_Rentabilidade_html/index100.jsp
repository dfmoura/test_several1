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



SELECT CODEMP,EMPRESA,NUFIN,DHBAIXA,CODPARC,NOMEPARC,CODNAT,NATUREZA,CODCENCUS,CR,SUM(VLRDO) AS VLRDO FROM (
    SELECT 
    VGF.CODEMP,
    SUBSTR(EMP.RAZAOSOCIAL,1,11)||'-'||EMP.RAZAOABREV AS EMPRESA,
    VGF.NUFIN,
    TO_CHAR(VGF.DHBAIXA,'DD-MM-YYYY') DHBAIXA,
    VGF.CODPARC,
    VGF.NOMEPARC,
    VGF.CODNAT,
    VGF.DESCRNAT AS NATUREZA,
    VGF.CODCENCUS,
    VGF.DESCRCENCUS AS CR,
    ROUND(SUM(VGF.VLRBAIXA),2) * -1 AS VLRDO
    FROM VGF_RESULTADO_GM VGF
    INNER JOIN TSIEMP EMP ON VGF.CODEMP = EMP.CODEMP
    WHERE 
    VGF.AD_TIPOCUSTO NOT LIKE 'N' 
    
    AND VGF.RECDESP = -1 
    AND (VGF.AD_DASH_RENTABILIDADE IS NULL OR VGF.AD_DASH_RENTABILIDADE = 'N')
    AND VGF.CODNAT <> 9070000
    AND SUBSTR(VGF.codnat, 1, 1) <> '9'
    AND VGF.DHBAIXA IS NOT NULL 
    AND VGF.ANALITICO = 'S'
    AND VGF.ATIVO = 'S'
    
    

    
    GROUP BY 
    VGF.CODEMP,
    SUBSTR(EMP.RAZAOSOCIAL,1,11)||'-'||EMP.RAZAOABREV,
    VGF.NUFIN,
    TO_CHAR(VGF.DHBAIXA,'DD-MM-YYYY'),
    VGF.CODPARC,
    VGF.NOMEPARC,        
    VGF.CODNAT,
    VGF.DESCRNAT,
    VGF.CODCENCUS,
    VGF.DESCRCENCUS)
    WHERE

    (DHBAIXA BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
    AND

    (
    (CODEMP = :A_CODEMP AND CODNAT = :A_CODNAT)
    OR
    (CODEMP = :A_CODEMP AND CODCENCUS = :A_CODCENCUS)
    OR
    (CODEMP = :A_CODEMP AND :A_CODCENCUS IS NULL AND :A_CODNAT IS NULL)
    )
    GROUP BY CODEMP,EMPRESA,NUFIN,DHBAIXA,CODPARC,NOMEPARC,CODNAT,NATUREZA,CODCENCUS,CR
    ORDER BY 11 DESC
</snk:query>

<div class="table-wrapper">
    <h2>Detalhamento Despesas Operacionais</h2>
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
                    <th onclick="sortTable(3)">Dt. Baixa.</th>
                    <th onclick="sortTable(4)">Cód. Parc.</th>
                    <th onclick="sortTable(5)">Parceiro</th>
                    <th onclick="sortTable(6)">Cód. Nat.</th>
                    <th onclick="sortTable(7)">Natureza</th>
                    <th onclick="sortTable(8)">Cód. CR</th>
                    <th onclick="sortTable(9)">CR</th>
                    <th onclick="sortTable(10)">Vlr. DO</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <c:forEach var="row" items="${fat_det.rows}">
                    <tr>
                        <td>${row.CODEMP}</td>
                        <td>${row.EMPRESA}</td>
                        <td onclick="abrir_mov('${row.NUFIN}')">${row.NUFIN}</td>
                        <td>${row.DHBAIXA}</td>
                        <td>${row.CODPARC}</td>
                        <td>${row.NOMEPARC}</td>
                        <td>${row.CODNAT}</td>
                        <td>${row.NATUREZA}</td>
                        <td>${row.CODCENCUS}</td>
                        <td>${row.CR}</td>
                        <td style="text-align: center;"><fmt:formatNumber value="${row.VLRDO}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                    </tr>
                </c:forEach>              
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total</b></td>
                    <td colspan="9"></td>
                    <td style="text-align: center;" id="totalAmount"><b>0,00</b></td>
                    <td></td>
                </tr>       
            </tfoot>
        </table>
    </div>
</div>

<script>
    function abrir_mov(nufin) {
        var params = {'NUFIN': nufin};
        var level = 'br.com.sankhya.fin.cad.movimentacaoFinanceira';
        openApp(level, params);
    }

    function updateTotal() {
        const rows = document.querySelectorAll('#myTable tbody tr:not(.total-row)');
        let total = 0;

        rows.forEach(row => {
            if (row.style.display !== 'none') {
                const cellValue = row.cells[10].textContent.replace(/[^\d,-]/g, '').replace(',', '.'); // Remove simbolos e converte ',' para '.'
                const value = parseFloat(cellValue);
                total += isNaN(value) ? 0 : value;
            }
        });

        document.getElementById('totalAmount').innerHTML = '<b>' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</b>';

        
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
</body>
</html>
