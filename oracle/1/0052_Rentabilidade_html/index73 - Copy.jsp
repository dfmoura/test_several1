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
    SELECT
    VGF.CODEMP,
    VGF.CODPROD||' - '||VGF.DESCRPROD AS PRODUTO,
    VGF.NUNOTA,
    TO_CHAR(VGF.DTNEG,'DD-MM-YYYY')DTNEG,
    VGF.CODTIPOPER,
    VGF.CODPARC,
    VGF.NOMEPARC,
    VGF.VLRUNIT VLR_UN,
    VGF.TOTALLIQ VLRFAT
    FROM VGF_CONSOLIDADOR_NOTAS_GM  VGF
    INNER JOIN TGFPAR PAR ON VGF.CODPARC = PAR.CODPARC
    LEFT JOIN TGFPAR PARM ON PAR.CODPARCMATRIZ = PARM.CODPARC
    WHERE 
    DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
    AND GOLSINAL = -1
    AND TIPMOV IN ('V', 'D')
    AND VGF.ATIVO = 'S' 
    AND VGF.CODEMP IN (:P_EMPRESA)
    AND VGF.CODNAT IN (:P_NATUREZA)
    AND VGF.CODCENCUS IN (:P_CR)
    AND VGF.CODVEND IN (:P_VENDEDOR)
    AND VGF.CODGER IN (:P_GERENTE)
    AND VGF.AD_ROTA IN (:P_ROTA)
    AND VGF.CODTIPOPER IN (:P_TOP)
    AND (:P_MATRIZ_RVE ='S'  OR PARM.CODPARC <> 518077)
    AND (
    (:P_MATRIZ_RVE = 'S')
    OR 
    (:P_MATRIZ_RVE = 'N' OR :P_MATRIZ_RVE IS NULL AND PARM.CODPARC <> 518077)
    )    
    AND
    (
    (AD_SUPERVISOR = :A_SUPERVISOR AND VGF.CODPROD = :A_CODPROD)
    OR
    (VGF.CODVEND = :A_VENDEDOR AND VGF.CODPROD = :A_CODPROD)
    )
    ORDER BY 7 DESC    
</snk:query>

<div class="table-wrapper">
    <h2>Detalhamento Por Produto</h2>
    <div class="filter-container">
        <input type="text" id="tableFilter" placeholder="Digite para filtrar...">
    </div>
    <div class="table-container">
        <table id="myTable">
            <thead>
                <tr>
                    <th onclick="sortTable(0)">Nro. Único</th>
                    <th onclick="sortTable(1)">Dt. Negociação</th>
                    <th onclick="sortTable(2)">Cód. Tip. Oper.</th>
                    <th onclick="sortTable(3)">Cód. Parc.</th>
                    <th onclick="sortTable(4)">Parceiro</th>
                    <th onclick="sortTable(5)">Preço Médio</th>
                    <th onclick="sortTable(6)">Vlr. Fat.</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <c:forEach var="row" items="${fat_det.rows}">
                    <tr>
                        <td onclick="abrir_portal('${row.NUNOTA}')">${row.NUNOTA}</td>
                        <td>${row.DTNEG}</td>
                        <td>${row.CODTIPOPER}</td>
                        <td>${row.CODPARC}</td>
                        <td>${row.NOMEPARC}</td>
                        <td><fmt:formatNumber value="${row.VLR_UN}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                        <td><fmt:formatNumber value="${row.VLRFAT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                    </tr>
                </c:forEach>              
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total</b></td>
                    <td colspan="5"></td>
                    <td style="text-align: center;" id="totalAmount"><b>R$ 0,00</b></td>
                </tr>       
            </tfoot>
        </table>
    </div>
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
                const cellValue = row.cells[6].textContent.replace(/[^\d,-]/g, '').replace(',', '.'); // Remove simbolos e converte ',' para '.'
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
</body>
</html>