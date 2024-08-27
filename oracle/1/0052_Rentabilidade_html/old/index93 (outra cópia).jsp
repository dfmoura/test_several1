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

        th,
        td {
            padding: 8px;
            border: 1px solid #ddd;
            text-align: left;
            white-space: nowrap;
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
    </style>

    <snk:load />
</head>

<body>
    <snk:query var="fat_det">
        WITH IMP AS (
            SELECT CODEMP, EMPRESA, CODTIPPARC, DESCRTIPPARC, CODPARC, NOMEPARC, AD_TPPROD, TIPOPROD, CODPROD, DESCRPROD, NUNOTA, 
            TO_CHAR(DTNEG, 'DD-MM-YYYY') DTNEG, VLRIPI, VLRSUBST, VLRICMS, VLRPIS, VLRCOFINS, 
            (VLRIPI + VLRSUBST + VLRICMS + VLRPIS + VLRCOFINS) IMPOSTOS
            FROM VGF_CONSOLIDADOR_NOTAS_GM
            WHERE GOLSINAL = -1
            AND (DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
            AND TIPMOV IN ('V', 'D')
            AND ATIVO = 'S'
            AND CODEMP IN (:P_EMPRESA)
            AND CODNAT IN (:P_NATUREZA)
            AND CODCENCUS IN (:P_CR)
            AND CODVEND IN (:P_VENDEDOR)
            AND AD_SUPERVISOR IN (:P_SUPERVISOR)
            AND CODGER IN (:P_GERENTE)
            AND AD_ROTA IN (:P_ROTA)
            AND CODTIPOPER IN (:P_TOP)
        )
        SELECT CODEMP, EMPRESA, CODTIPPARC, DESCRTIPPARC, CODPARC, NOMEPARC, AD_TPPROD, TIPOPROD, CODPROD, DESCRPROD, NUNOTA, DTNEG, VLRIPI, VLRSUBST, VLRICMS, VLRPIS, VLRCOFINS, IMPOSTOS
        FROM IMP
        WHERE 
        
        (
            (
            (CODEMP = :A_CODEMP AND :A_TPPROD IS NULL AND :A_CODPROD IS NULL)
            OR
            (AD_TPPROD = :A_TPPROD AND :A_CODEMP IS NULL AND :A_CODPROD IS NULL)
            OR
            (CODPROD = :A_CODPROD AND :A_CODEMP IS NULL AND :A_TPPROD IS NULL)
            )
            
                   
            OR 
            (
            (CODTIPPARC = :A_PERFIL AND :A_TPPROD IS NULL AND :A_CODPROD IS NULL)
            OR
            (CODTIPPARC = :A_PERFIL AND AD_TPPROD = :A_TPPROD AND :A_CODPROD IS NULL)
            OR
            (CODTIPPARC = :A_PERFIL AND :A_TPPROD IS NULL AND CODPROD = :A_CODPROD)
            )
        )


        ORDER BY IMPOSTOS DESC
    </snk:query>

    <div class="table-wrapper">
        <h2>Detalhamento Impostos</h2>
        <div class="filter-container">
            <input type="text" id="tableFilter" placeholder="Digite para filtrar...">
        </div>
        <div class="table-container">
            <table id="myTable">
                <thead>
                    <tr>
                        <th onclick="sortTable(0)">Cód. Emp.</th>
                        <th onclick="sortTable(1)">Empresa</th>
                        <th onclick="sortTable(2)">Cód. Perfil</th>
                        <th onclick="sortTable(3)">Perfil</th>
                        <th onclick="sortTable(4)">Cód. Parc.</th>
                        <th onclick="sortTable(5)">Parceiro</th>
                        <th onclick="sortTable(6)">Cód. Tp. Prod.</th>
                        <th onclick="sortTable(7)">Tp. Prod.</th>
                        <th onclick="sortTable(8)">Cód. Prod.</th>
                        <th onclick="sortTable(9)">Produto</th>
                        <th onclick="sortTable(10)">NÚ. Único</th>
                        <th onclick="sortTable(11)">Dt. Neg.</th>
                        <th onclick="sortTable(12)">Vlr. IPI</th>
                        <th onclick="sortTable(13)">Vlr. ST</th>
                        <th onclick="sortTable(14)">Vlr. ICMS</th>
                        <th onclick="sortTable(15)">Vlr. PIS</th>
                        <th onclick="sortTable(16)">Vlr. COFINS</th>
                        <th onclick="sortTable(17)">Total</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                    <c:forEach var="row" items="${fat_det.rows}">
                        <tr>
                            <td>${row.CODEMP}</td>
                            <td>${row.EMPRESA}</td>
                            <td>${row.CODTIPPARC}</td>
                            <td>${row.DESCRTIPPARC}</td>
                            <td>${row.CODPARC}</td>
                            <td>${row.NOMEPARC}</td>
                            <td>${row.AD_TPPROD}</td>
                            <td>${row.TIPOPROD}</td>
                            <td>${row.CODPROD}</td>
                            <td>${row.DESCRPROD}</td>
                            <td onclick="abrir_portal('${row.NUNOTA}')">${row.NUNOTA}</td>
                            <td>${row.DTNEG}</td>
                            <td style="text-align: center;"><fmt:formatNumber value="${row.VLRIPI}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2" /></td>
                            <td style="text-align: center;"><fmt:formatNumber value="${row.VLRSUBST}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2" /></td>
                            <td style="text-align: center;"><fmt:formatNumber value="${row.VLRICMS}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2" /></td>
                            <td style="text-align: center;"><fmt:formatNumber value="${row.VLRPIS}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2" /></td>
                            <td style="text-align: center;"><fmt:formatNumber value="${row.VLRCOFINS}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2" /></td>
                            <td style="text-align: center;"><fmt:formatNumber value="${row.IMPOSTOS}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2" /></td>
                        </tr>
                    </c:forEach>
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td><b>Total</b></td>
                        <td colspan="11"></td>
                        <td style="text-align: center;" id="totalIPI"><b>R$ 0,00</b></td>
                        <td style="text-align: center;" id="totalSubst"><b>R$ 0,00</b></td>
                        <td style="text-align: center;" id="totalICMS"><b>R$ 0,00</b></td>
                        <td style="text-align: center;" id="totalPIS"><b>R$ 0,00</b></td>
                        <td style="text-align: center;" id="totalCOFINS"><b>R$ 0,00</b></td>
                        <td style="text-align: center;" id="totalImpostos"><b>R$ 0,00</b></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>

    <script>

        function abrir_portal(nunota) {
            var params = { 'NUNOTA': nunota };
            var level = 'br.com.sankhya.com.mov.CentralNotas';
            openApp(level, params);
        }



        document.getElementById('tableFilter').addEventListener('keyup', function () {
            const searchValue = this.value.toLowerCase();
            const rows = document.querySelectorAll('#myTable tbody tr');
            rows.forEach(row => {
                const rowText = row.textContent.toLowerCase();
                row.style.display = rowText.includes(searchValue) ? '' : 'none';
            });
            updateTotal(); // Atualiza os totais após filtragem
        });

        function sortTable(columnIndex) {
            const table = document.getElementById("myTable");
            const rows = Array.from(table.rows).slice(1);
            const isAsc = table.rows[0].cells[columnIndex].classList.toggle('sort-asc', !table.rows[0].cells[columnIndex].classList.contains('sort-asc'));
            rows.sort((rowA, rowB) => {
                const cellA = rowA.cells[columnIndex].textContent.trim();
                const cellB = rowB.cells[columnIndex].textContent.trim();
                return isAsc ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
            });
            rows.forEach(row => table.appendChild(row));
            updateTotal(); // Atualiza os totais após ordenação
        }

        function updateTotal() {
            const rows = document.querySelectorAll('#myTable tbody tr:not(.total-row)');

            let totalIPI = 0;
            let totalSubst = 0;
            let totalICMS = 0;
            let totalPIS = 0;
            let totalCOFINS = 0;
            let totalImpostos = 0;

            rows.forEach(row => {
                if (row.style.display !== 'none') {
                    const valorIPI = parseFloat(row.cells[12].textContent.replace(/[^\d,-]/g, '').replace(',', '.'));
                    const valorSubst = parseFloat(row.cells[13].textContent.replace(/[^\d,-]/g, '').replace(',', '.'));
                    const valorICMS = parseFloat(row.cells[14].textContent.replace(/[^\d,-]/g, '').replace(',', '.'));
                    const valorPIS = parseFloat(row.cells[15].textContent.replace(/[^\d,-]/g, '').replace(',', '.'));
                    const valorCOFINS = parseFloat(row.cells[16].textContent.replace(/[^\d,-]/g, '').replace(',', '.'));
                    const valorImpostos = parseFloat(row.cells[17].textContent.replace(/[^\d,-]/g, '').replace(',', '.'));

                    totalIPI += isNaN(valorIPI) ? 0 : valorIPI;
                    totalSubst += isNaN(valorSubst) ? 0 : valorSubst;
                    totalICMS += isNaN(valorICMS) ? 0 : valorICMS;
                    totalPIS += isNaN(valorPIS) ? 0 : valorPIS;
                    totalCOFINS += isNaN(valorCOFINS) ? 0 : valorCOFINS;
                    totalImpostos += isNaN(valorImpostos) ? 0 : valorImpostos;
                }
            });

            document.getElementById('totalIPI').innerHTML = totalIPI.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('totalSubst').innerHTML = totalSubst.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('totalICMS').innerHTML = totalICMS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('totalPIS').innerHTML = totalPIS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('totalCOFINS').innerHTML = totalCOFINS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('totalImpostos').innerHTML = totalImpostos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        document.addEventListener('DOMContentLoaded', (event) => {
            updateTotal(); // Chama a função quando a página carrega
        });
    </script>
</body>

</html>
