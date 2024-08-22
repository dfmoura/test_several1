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


    WITH 
    ACF AS (
        SELECT DISTINCT
            ACF.NUNOTA,
            ACF.CODHIST,
            SUBSTR(ACH.DESCRHIST, 1, 15) AS DESCRHIST
        FROM TGFACF ACF
        INNER JOIN TGFACH ACH ON ACF.CODHIST = ACH.CODHIST
        WHERE ACF.CODHIST > 0
    ),
    BAS AS (
        SELECT
            VGF.CODEMP,
            VGF.EMPRESA,
            VGF.NUNOTA,
            TO_CHAR(VGF.DTNEG,'DD-MM-YYYY') DTNEG,
            VGF.CODTIPOPER,
            VGF.DESCROPER,
            VGF.CODPARC,
            VGF.NOMEPARC,            
            VGF.CODCID,
            VGF.NOMECID,
            VGF.CODBAI,
            VGF.NOMEBAI,
            ACF.CODHIST,
            ACF.DESCRHIST,
            VGF.AD_TPPROD,
            VGF.TIPOPROD,
            VGF.CODPROD,
            VGF.DESCRPROD,
            VGF.CODVEND,
            VGF.VENDEDOR,
            VGF.AD_SUPERVISOR,
            VGF.SUPERVISOR,
            VGF.CODGER,
            VGF.GERENTE,           
            ABS(VGF.VLRDEV) AS VLRDEVOL
        FROM TGFVAR VAR
        INNER JOIN VGF_CONSOLIDADOR_NOTAS_GM VGF ON VAR.NUNOTA = VGF.NUNOTA AND VAR.SEQUENCIA = VGF.SEQUENCIA
        LEFT JOIN ACF ON VAR.NUNOTAORIG = ACF.NUNOTA
        WHERE
            VGF.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
            AND VGF.GOLSINAL = -1
            AND VGF.TIPMOV IN ('D')
            AND VGF.ATIVO = 'S'
            AND VGF.VLRDEV <> 0

            AND VGF.CODEMP IN (:P_EMPRESA)
            AND VGF.CODNAT IN (:P_NATUREZA)
            AND VGF.CODCENCUS IN (:P_CR)
            AND VGF.CODVEND IN (:P_VENDEDOR)
            AND VGF.AD_SUPERVISOR IN (:P_SUPERVISOR)
            AND VGF.CODGER IN (:P_GERENTE)
            AND VGF.AD_ROTA IN (:P_ROTA)
            AND VGF.CODTIPOPER IN (:P_TOP)
            AND
            (
            (ACF.CODHIST = :A_MOTIVO AND VGF.CODCID = :A_CIDADE  AND VGF.CODBAI = :A_BAIRRO)
            OR
            (ACF.CODHIST = :A_MOTIVO AND VGF.CODVEND = :A_VENDEDOR)
            OR
            (ACF.CODHIST = :A_MOTIVO AND VGF.CODPROD = :A_PRODUTO)
            )


    ),
    RAN_BAS AS (
        SELECT
            CODEMP,
            EMPRESA,
            NUNOTA,
            DTNEG,
            CODTIPOPER,
            DESCROPER,
            CODPARC,
            NOMEPARC,            
            CODCID,
            NOMECID,
            CODBAI,
            NOMEBAI,
            CODHIST,
            DESCRHIST,
            AD_TPPROD,
            TIPOPROD,                
            CODPROD,
            DESCRPROD,
            CODVEND,
            VENDEDOR,
            AD_SUPERVISOR,
            SUPERVISOR,
            CODGER,
            GERENTE,
            VLRDEVOL,
            SUM(VLRDEVOL) OVER (PARTITION BY CODHIST) AS TOTAL_VLRDEVOL
        FROM BAS
    ),
    RAN_BAS1 AS (
    SELECT
        CODEMP,
        EMPRESA,
        NUNOTA,
        DTNEG,
        CODTIPOPER,
        DESCROPER,
        CODPARC,
        NOMEPARC,            
        CODCID,
        NOMECID,
        CODBAI,
        NOMEBAI,
        CODHIST,
        DESCRHIST,
        AD_TPPROD,
        TIPOPROD,                
        CODPROD,
        DESCRPROD,
        CODVEND,
        VENDEDOR,
        AD_SUPERVISOR,
        SUPERVISOR,
        CODGER,
        GERENTE,
        VLRDEVOL,
        TOTAL_VLRDEVOL,
        DENSE_RANK() OVER (ORDER BY TOTAL_VLRDEVOL DESC) AS CODIGO_UNICO
    FROM RAN_BAS),
    
    BAS1 AS (
    SELECT CODEMP, EMPRESA, NUNOTA,DTNEG, CODTIPOPER, DESCROPER, CODPARC, NOMEPARC, CODCID, NOMECID, CODBAI, NOMEBAI, CODHIST, DESCRHIST,AD_TPPROD,TIPOPROD, CODPROD, DESCRPROD, CODVEND, VENDEDOR, AD_SUPERVISOR, SUPERVISOR, CODGER, GERENTE,
    SUM(VLRDEVOL) VLRDEVOL
    FROM RAN_BAS1 
    WHERE CODIGO_UNICO < 7 
    GROUP BY CODEMP, EMPRESA, NUNOTA,DTNEG, CODTIPOPER, DESCROPER, CODPARC, NOMEPARC, CODCID, NOMECID, CODBAI, NOMEBAI, CODHIST, DESCRHIST,AD_TPPROD,TIPOPROD, CODPROD, DESCRPROD, CODVEND, VENDEDOR, AD_SUPERVISOR, SUPERVISOR, CODGER, GERENTE
    UNION ALL 
    SELECT CODEMP, EMPRESA, NUNOTA,DTNEG, CODTIPOPER, DESCROPER, CODPARC, NOMEPARC, CODCID, NOMECID, CODBAI, NOMEBAI, CODHIST, DESCRHIST,AD_TPPROD,TIPOPROD, CODPROD, DESCRPROD, CODVEND, VENDEDOR, AD_SUPERVISOR, SUPERVISOR, CODGER, GERENTE,
    SUM(VLRDEVOL) VLRDEVOL
    FROM RAN_BAS1 
    WHERE CODIGO_UNICO >= 7
    GROUP BY CODEMP, EMPRESA, NUNOTA,DTNEG, CODTIPOPER, DESCROPER, CODPARC, NOMEPARC, CODCID, NOMECID, CODBAI, NOMEBAI, CODHIST, DESCRHIST,AD_TPPROD,TIPOPROD, CODPROD, DESCRPROD, CODVEND, VENDEDOR, AD_SUPERVISOR, SUPERVISOR, CODGER, GERENTE)
    
    
    
    SELECT CODEMP, EMPRESA, NUNOTA,DTNEG, CODTIPOPER, DESCROPER, CODPARC, NOMEPARC, CODCID, NOMECID, CODBAI, NOMEBAI, CODHIST, DESCRHIST,AD_TPPROD,TIPOPROD, CODPROD, DESCRPROD, CODVEND, VENDEDOR, AD_SUPERVISOR, SUPERVISOR, CODGER, GERENTE,
    SUM(VLRDEVOL) VLRDEVOL 
    FROM BAS1 

    GROUP BY CODEMP, EMPRESA, NUNOTA,DTNEG, CODTIPOPER, DESCROPER, CODPARC, NOMEPARC, CODCID, NOMECID, CODBAI, NOMEBAI, CODHIST, DESCRHIST,AD_TPPROD,TIPOPROD, CODPROD, DESCRPROD, CODVEND, VENDEDOR, AD_SUPERVISOR, SUPERVISOR, CODGER, GERENTE
    ORDER BY 24 DESC           
    
</snk:query>

<div class="table-wrapper">
    <h2>Detalhamento Motivo Devolução</h2>
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
                    <th onclick="sortTable(4)">Cód. Top.</th>
                    <th onclick="sortTable(5)">Top</th>
                    <th onclick="sortTable(6)">Cód. Parc.</th>
                    <th onclick="sortTable(7)">Parceiro</th>
                    <th onclick="sortTable(8)">Cód. Cid.</th>
                    <th onclick="sortTable(9)">Cidade</th>
                    <th onclick="sortTable(10)">Cód. Bai.</th>
                    <th onclick="sortTable(11)">Bairro</th>
                    <th onclick="sortTable(12)">Cód. Mot.</th>
                    <th onclick="sortTable(13)">Motivo</th>
                    <th onclick="sortTable(14)">Cód. Tp. Prod.</th>
                    <th onclick="sortTable(15)">Tp. Prod.</th>
                    <th onclick="sortTable(16)">Cód. Prod.</th>
                    <th onclick="sortTable(17)">Produto</th>
                    <th onclick="sortTable(18)">Cód. Ven.</th>
                    <th onclick="sortTable(19)">Vendedor</th>
                    <th onclick="sortTable(20)">Cód. Sup.</th>
                    <th onclick="sortTable(21)">Supervisor</th>
                    <th onclick="sortTable(22)">Cód. Ger.</th>
                    <th onclick="sortTable(23)">Gerente</th>
                    <th onclick="sortTable(24)">Vlr. Devol.</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <c:forEach var="row" items="${fat_det.rows}">
                    <tr>
                        
                        <td>${row.CODEMP}</td>
                        <td>${row.EMPRESA}</td>
                        <td onclick="abrir_portal('${row.NUNOTA}')">${row.NUNOTA}</td>
                        <td>${row.DTNEG}</td>
                        <td>${row.CODTIPOPER}</td>
                        <td>${row.DESCROPER}</td>
                        <td>${row.CODPARC}</td>
                        <td>${row.NOMEPARC}</td>
                        <td>${row.CODCID}</td>
                        <td>${row.NOMECID}</td>
                        <td>${row.CODBAI}</td>
                        <td>${row.NOMEBAI}</td>
                        <td>${row.CODHIST}</td>
                        <td>${row.DESCRHIST}</td>
                        <td>${row.AD_TPPROD}</td>
                        <td>${row.TIPOPROD}</td>          
                        <td>${row.CODPROD}</td>
                        <td>${row.DESCRPROD}</td>
                        <td>${row.VENDEDOR}</td>
                        <td>${row.AD_SUPERVISOR}</td>
                        <td>${row.SUPERVISOR}</td>
                        <td>${row.CODVEND}</td>
                        <td>${row.CODGER}</td>
                        <td>${row.GERENTE}</td>
                        <td style="text-align: center;">
                            <fmt:formatNumber value="${row.VLRDEVOL}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
                        </td>
                    </tr>
                </c:forEach>              
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total</b></td>
                    <td colspan="23"></td>
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
                const cellValue = row.cells[24].textContent.replace(/[^\d,-]/g, '').replace(',', '.'); // Remove simbolos e converte ',' para '.'
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
