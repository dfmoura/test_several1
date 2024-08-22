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

        .negative {
            color: blue;
        }

        .positive {
            color: red;
        }        
    </style>

<snk:load/>
</head>
<body>


<snk:query var="fat_det">

SELECT 
TO_CHAR(LAN.REFERENCIA,'MM-YYYY') AS MES_ANO,
LAN.CODEMP,
TO_CHAR(LAN.REFERENCIA,'DD-MM-YYYY') AS  REFERENCIA,
LAN.NUMLOTE,
LAN.NUMLANC,
LAN.TIPLANC,
LAN.CODCTACTB,
LAN.CODCONPAR,
LAN.CODCENCUS,
CRI.DESCRCENCUS,
TO_CHAR(LAN.DTMOV,'DD-MM-YYYY') AS DTMOV,
LAN.CODHISTCTB,
LAN.COMPLHIST,
LAN.NUMDOC,
TO_CHAR(LAN.VENCIMENTO,'DD-MM-YYYY') AS VENCIMENTO,
LAN.LIBERADO,
LAN.CODUSU,
LAN.CODPROJ,
LAN.PARTLALUR_A,
LAN.SEQUENCIA,
PLA.DESCRCTA, 
PLA.CTACTB, 
PLA.DESCRCTA, 
CASE WHEN LAN.TIPLANC = 'R' THEN (LAN.VLRLANC *(-1)) ELSE LAN.VLRLANC END AS "VLRLANC",
CASE WHEN LAN.TIPLANC = 'D' THEN 'RED' ELSE 'BLUE' END AS FGCOLOR
FROM TCBLAN LAN
INNER JOIN TCBPLA PLA ON LAN.CODCTACTB = PLA.CODCTACTB
LEFT JOIN TSICUS CRI ON LAN.CODCENCUS = CRI.CODCENCUS
WHERE
(PLA.CTACTB  LIKE '3.1.04.005%' OR
PLA.CTACTB  LIKE '3.1.04.006%'  OR
PLA.CTACTB  LIKE '3.1.04.009%'  OR
PLA.CTACTB  LIKE '3.1.04.010%') AND
(LAN.DTMOV BETWEEN ADD_MONTHS (:P_PERIODO.FIN, -12) AND :P_PERIODO.FIN) AND
NUMLOTE<>999 AND
( 
(    

(TO_CHAR(LAN.REFERENCIA,'MM') = :A_MES) AND 
(TO_CHAR(LAN.REFERENCIA,'YYYY') = :A_ANO)
) AND

(:A_CODCTACTB IS NULL OR LAN.CODCTACTB = :A_CODCTACTB)) AND
PLA.CTACTB <> '3.1.04.010.0001'

ORDER BY LAN.REFERENCIA
    
    
    
</snk:query>

<div class="table-wrapper">
    <h2>Detalhamento dos Lançamentos</h2>
    <div class="filter-container">
        <input type="text" id="tableFilter" placeholder="Digite para filtrar...">
    </div>
    <div class="table-container">
        <table id="myTable">
            <thead>
                <tr>
                    <th onclick="sortTable(0)">Cód. Emp.</th>
                    <th onclick="sortTable(1)">Mês / Ano</th>
                    <th onclick="sortTable(2)">Ref.</th>
                    <th onclick="sortTable(3)">Nro. Lote</th>
                    <th onclick="sortTable(4)">Nro. Lanç.</th>
                    <th onclick="sortTable(5)">Tp. Lanç.</th>
                    <th onclick="sortTable(6)">Cód. CTA CTB</th>
                    <th onclick="sortTable(7)">Cód. Con. Par.</th>
                    <th onclick="sortTable(8)">Cód. CR</th>
                    <th onclick="sortTable(9)">Descr. CR</th>
                    <th onclick="sortTable(10)">Dt. Mov.</th>
                    <th onclick="sortTable(11)">Cód. Hist.</th>
                    <th onclick="sortTable(12)">Compl. Hist.</th>
                    <th onclick="sortTable(13)">Nro. Doc.</th>
                    <th onclick="sortTable(14)">Dt. Venc.</th>
                    <th onclick="sortTable(15)">Liberado</th>
                    <th onclick="sortTable(16)">Cód. Usu.</th>
                    <th onclick="sortTable(17)">Cód. Proj.</th>
                    <th onclick="sortTable(18)">Part. Lalur.</th>
                    <th onclick="sortTable(19)">Seq.</th>
                    <th onclick="sortTable(20)">CTACTB</th>
                    <th onclick="sortTable(21)">Descr. CTA</th>
                    <th onclick="sortTable(22)">Vlr. Lanç.</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <c:forEach var="row" items="${fat_det.rows}">
                    <tr class="${row.VLRLANC < 0 ? 'negative' : 'positive'}">
                        <td>${row.CODEMP}</td>
                        <td>${row.MES_ANO}</td>
                        <td onclick="abrir_ctb()">${row.REFERENCIA}</td>
                        <td>${row.NUMLOTE}</td>
                        <td>${row.NUMLANC}</td>
                        <td>${row.TIPLANC}</td>
                        <td>${row.CODCTACTB}</td>
                        <td>${row.CODCONPAR}</td>
                        <td>${row.CODCENCUS}</td>
                        <td>${row.DESCRCENCUS}</td>
                        <td>${row.DTMOV}</td>
                        <td>${row.CODHISTCTB}</td>
                        <td>${row.COMPLHIST}</td>
                        <td>${row.NUMDOC}</td>
                        <td>${row.VENCIMENTO}</td>
                        <td>${row.LIBERADO}</td>
                        <td>${row.CODUSU}</td>
                        <td>${row.CODPROJ}</td>
                        <td>${row.PARTLALUR_A}</td>
                        <td>${row.SEQUENCIA}</td>
                        <td>${row.CTACTB}</td>
                        <td>${row.DESCRCTA}</td>
                        <td style="text-align: center;">
                            <fmt:formatNumber value="${row.VLRLANC}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
                        </td>
                    </tr>
                </c:forEach>              
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total</b></td>
                    <td colspan="21"></td>
                    <td style="text-align: center;" id="totalAmount"><b>R$ 0,00</b></td>
                </tr>       
            </tfoot>
        </table>
    </div>
</div>

<script>
    function abrir_ctb() {
        var params = '';
        var level = 'br.com.sankhya.mgecontab.mov.lancamentos.contabeis';
        openApp(level, params);
    }

    function updateTotal() {
        const rows = document.querySelectorAll('#myTable tbody tr:not(.total-row)');
        let total = 0;

        rows.forEach(row => {
            if (row.style.display !== 'none') {
                const cellValue = row.cells[22].textContent.replace(/[^\d,-]/g, '').replace(',', '.'); 
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
