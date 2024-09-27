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
            white-space: nowrap; /* Impede a quebra de linha nas células */
            overflow: hidden; /* Para ocultar o texto que excede o limite */

        }

        th {
            
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 1;
            resize: horizontal;
            overflow: hidden;
            min-width: 100px; /* Define uma largura mínima para permitir o resize */
        }

        td {
            width: auto; /* Ajuste de largura automática */
        }       

        /* Limitar o conteúdo da coluna 'Histórico' a 40 caracteres */
        td.historico {
            max-width: 200px; /* Define uma largura máxima para a coluna */
            text-overflow: ellipsis; /* Adiciona '...' para o texto longo */
            overflow: hidden; /* Esconde o excesso de texto */
            white-space: nowrap; /* Evita quebra de linha */
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

        @media (max-width: 768px) {
            table {
                font-size: 8px; /* Reduz o tamanho da fonte em telas menores */
            }

            th, td {
                padding: 6px;
            }

            .table-container {
                height: auto; /* Ajusta a altura da tabela em telas menores */
            }
        }


    </style>

<snk:load/>
</head>
<body>
<snk:query var="fat_det">



SELECT CODEMP,EMPRESA,NUFIN,DHBAIXA,CODPARC,NOMEPARC,CODNAT,NATUREZA,CODCENCUS,CR,HISTORICO,SUM(VLRDO) AS VLRDO FROM (
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
    VGF.HISTORICO,
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
    VGF.DESCRCENCUS,
    VGF.HISTORICO)
    WHERE

    (DHBAIXA BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
    AND

    (
    (:A_CODEMP IS NULL)
    OR
    (CODEMP = :A_CODEMP AND CODNAT = :A_CODNAT)
    OR
    (CODEMP = :A_CODEMP AND CODCENCUS = :A_CODCENCUS)
    OR
    (CODEMP = :A_CODEMP AND :A_CODCENCUS IS NULL AND :A_CODNAT IS NULL)
    )
    GROUP BY CODEMP,EMPRESA,NUFIN,DHBAIXA,CODPARC,NOMEPARC,CODNAT,NATUREZA,CODCENCUS,CR,HISTORICO
    ORDER BY 12 DESC
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
                    <th onclick="sortTable(9)">HISTORICO</th>
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
                        <td class="historico">${row.HISTORICO}</td>
                        <td style="text-align: center;"><fmt:formatNumber value="${row.VLRDO}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                    </tr>
                </c:forEach>              
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total</b></td>
                    <td colspan="10"></td>
                    <td style="text-align: center;" id="totalAmount"><b>0,00</b></td>
                    <td></td>
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
                const cellValue = row.cells[11].textContent.replace(/[^\d,-]/g, '').replace(',', '.'); // Remove simbolos e converte ',' para '.'
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
