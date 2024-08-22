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
            ACH.DESCRHIST
        FROM TGFACF ACF
        INNER JOIN TGFACH ACH ON ACF.CODHIST = ACH.CODHIST
        WHERE ACF.CODHIST > 0
    ),
    BAS AS (
        SELECT 
            CAB.CODEMP,
            EMP.NOMEFANTASIA,        
            CAB.CODPARC,
            PAR.RAZAOSOCIAL,
            PAR.CODCID,
            UPPER(CID.NOMECID) AS NOMECID,
            PAR.CODBAI,
            BAI.NOMEBAI,
            CAB.CODTIPOPER,
            VEN.CODVEND||'-'||VEN.APELIDO AS VENDEDOR,
            VENS.CODVEND||'-'||VENS.APELIDO AS SUPERVISOR,
            VENG.CODVEND||'-'||VENG.APELIDO AS GERENTE,                        
            CAB.DTNEG,
            VAR.NUNOTA,
            VAR.NUNOTAORIG,
            CAB.TIPMOV AS TIPMOV,
            ITE.CODPROD,
            PRO.DESCRPROD,
            ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC AS VLRDEVOL,
            ACF.CODHIST,
            ACF.DESCRHIST
        FROM 
            TGFVAR VAR
            INNER JOIN TGFITE ITE ON VAR.NUNOTA = ITE.NUNOTA AND VAR.SEQUENCIA = ITE.SEQUENCIA
            INNER JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
            INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
            INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
            INNER JOIN TSIBAI BAI ON PAR.CODBAI = BAI.CODBAI
            INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
            INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
            INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
            LEFT JOIN ACF ON VAR.NUNOTAORIG = ACF.NUNOTA
            INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
            LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
            LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
        WHERE 
            CAB.TIPMOV IN ('D') 
            AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN
            
            AND CAB.CODEMP IN (:P_EMPRESA)
            AND CAB.CODNAT IN (:P_NATUREZA)
            AND CAB.CODCENCUS IN (:P_CR)
            AND VEN.AD_ROTA IN (:P_ROTA)
            
            AND ACF.CODHIST = :A_MOTIVO
            AND PAR.CODCID = :A_CIDADE
            AND PAR.CODBAI = :A_BAIRRO
                
            
            AND TOP.GOLSINAL = -1
            AND TOP.ATIVO = 'S'
        ORDER BY 
            CAB.CODPARC,
            VAR.NUNOTA
    )
    
    SELECT    
    BAS.CODEMP
    , BAS.DESCRHIST
    , BAS.CODPROD||' - '||BAS.DESCRPROD AS PRODUTO
    , BAS.NUNOTA
    , TO_CHAR(BAS.DTNEG,'DD-MM-YYYY') AS DTNEG
    , BAS.CODTIPOPER
    , BAS.CODPARC
    , BAS.RAZAOSOCIAL
    , BAS.CODCID
    , BAS.NOMECID
    , BAS.CODBAI
    , BAS.NOMEBAI
    , BAS.VLRDEVOL
    FROM BAS
    ORDER BY 12 DESC
    
</snk:query>

<div class="table-wrapper">
    <h2>Detalhamento Motivo Devolução por Bairro</h2>
    <div class="filter-container">
        <input type="text" id="tableFilter" placeholder="Digite para filtrar...">
    </div>
    <div class="table-container">
        <table id="myTable">
            <thead>
                <tr>
                    <th onclick="sortTable(0)">Cód. Emp.</th>
                    <th onclick="sortTable(1)">Produto</th>
                    <th onclick="sortTable(2)">NÚ. Único</th>
                    <th onclick="sortTable(3)">Dt. Neg.</th>
                    <th onclick="sortTable(4)">Cód. TOP</th>
                    <th onclick="sortTable(5)">Cód. Parc.</th>
                    <th onclick="sortTable(6)">Parceiro</th>
                    <th onclick="sortTable(7)">Cidade</th>
                    <th onclick="sortTable(8)">Bairro</th>
                    <th onclick="sortTable(9)">Motivo</th>
                    <th onclick="sortTable(10)">Vlr. Devol.</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <c:forEach var="row" items="${fat_det.rows}">
                    <tr>
                        <td>${row.CODEMP}</td>
                        <td>${row.PRODUTO}</td>
                        <td onclick="abrir_portal('${row.NUNOTA}')">${row.NUNOTA}</td>
                        <td>${row.DTNEG}</td>
                        <td>${row.CODTIPOPER}</td>
                        <td>${row.CODPARC}</td>
                        <td>${row.RAZAOSOCIAL}</td>
                        <td>${row.NOMECID}</td>
                        <td>${row.NOMEBAI}</td>
                        <td>${row.DESCRHIST}</td>
                        <td style="text-align: center;">
                            <fmt:formatNumber value="${row.VLRDEVOL}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
                        </td>
                    </tr>
                </c:forEach>              
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total</b></td>
                    <td colspan="9"></td>
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
                const cellValue = row.cells[10].textContent.replace(/[^\d,-]/g, '').replace(',', '.'); // Remove simbolos e converte ',' para '.'
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
