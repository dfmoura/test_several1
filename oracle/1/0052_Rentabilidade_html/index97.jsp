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

    SELECT DISTINCT 
    I.CODEMP,
    I.NUNOTA,
    CAB.IDIPROC,
    TO_CHAR(CAB.DTNEG,'DD-MM-YYYY') DTNEG,
    P.AD_TPPROD,
    NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', P.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD,
    I.CODPROD,
    P.DESCRPROD,
    I.QTDNEG,
    I.CODVOL,
    	(SELECT ENTRADASEMICMS FROM TGFCUSITE WHERE NUNOTA=I.NUNOTA AND SEQUENCIA=I.SEQUENCIA AND CODPROD=I.CODPROD) AS CUSNOTA,
    (SELECT CUSSEMICM
     FROM TGFCUS
    WHERE     TGFCUS.CODPROD = I.CODPROD
          AND DTATUAL = (SELECT MAX (DTATUAL)
                           FROM TGFCUS
                          WHERE DTATUAL <= CAB.DTNEG)
          AND TGFCUS.CODEMP = CAB.CODEMP) CUSTO
    FROM TGFITE I
         INNER JOIN TGFCAB CAB ON (CAB.NUNOTA = I.NUNOTA)
         INNER JOIN TGFPRO P ON (P.CODPROD = I.CODPROD)
   WHERE     CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
         AND I.ATUALESTOQUE = 1
		 AND I.CODPROD = :A_CODPROD
         
         
         
		AND CAB.TIPMOV='F'
ORDER BY CODPROD, I.NUNOTA

    
    
</snk:query>

<div class="table-wrapper">
    <h2>Detalhamento - Custo de Produção por Produto</h2>
    <div class="filter-container">
        <input type="text" id="tableFilter" placeholder="Digite para filtrar...">
    </div>
    <div class="table-container">
        <table id="myTable">
            <thead>
                <tr>
                    <th onclick="sortTable(0)">Cód. Emp.</th>
                    <th onclick="sortTable(1)">NÚ. Único</th>
                    <th onclick="sortTable(2)">OP</th>
                    <th onclick="sortTable(3)">Dt. Neg.</th>
                    <th onclick="sortTable(4)">Cód. Tp. Prod.</th>
                    <th onclick="sortTable(5)">Tp. Prod.</th>
                    <th onclick="sortTable(6)">Cód. Prod.</th>
                    <th onclick="sortTable(7)">Produto</th>
                    <th onclick="sortTable(8)">Qtd. Neg.</th>
                    <th onclick="sortTable(9)">Cód. Vol.</th>
                    <th onclick="sortTable(10)">Custo Nota</th>
                    <th onclick="sortTable(11)">Custo Médio</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <c:forEach var="row" items="${fat_det.rows}">
                    <tr>
                        <td>${row.CODEMP}</td>
                        <td>${row.NUNOTA}</td>
                        <td onclick="abrir_op('${row.IDIPROC}'); copiar('${row.IDIPROC}');">${row.IDIPROC}</td>
                        <td>${row.DTNEG}</td>
                        <td>${row.AD_TPPROD}</td>
                        <td>${row.TIPOPROD}</td>
                        <td>${row.CODPROD}</td>
                        <td>${row.DESCRPROD}</td>
                        <td>${row.QTDNEG}</td>
                        <td>${row.CODVOL}</td>
                        <td style="text-align: center;"><fmt:formatNumber value="${row.CUSNOTA}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                        <td style="text-align: center;"><fmt:formatNumber value="${row.CUSTO}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                    </tr>
                </c:forEach>              
            </tbody>
        </table>
    </div>
</div>

<script>
    function abrir_op(idiproc) {
        var params = {'A_IDIPROC': idiproc};
        var level = 'br.com.sankhya.prod.OrdensProducaoHTML';
        openApp(level, params);
    }

    function updateTotal() {
        const rows = document.querySelectorAll('#myTable tbody tr:not(.total-row)');
        let total = 0;

        rows.forEach(row => {
            if (row.style.display !== 'none') {
                const cellValue = row.cells[11].textContent.replace(/[^\d,-]/g, '').replace(',', '.'); // Remove simbolos e converte ',' para '.'
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




    function copiar(texto) {

        const elementoTemporario = document.createElement('textarea');
        elementoTemporario.value = texto;
        document.body.appendChild(elementoTemporario);
        elementoTemporario.select();
        document.execCommand('copy');
        document.body.removeChild(elementoTemporario);

        //alert('Texto copiado: ' + texto);
    }


</script>
</body>
</html>
