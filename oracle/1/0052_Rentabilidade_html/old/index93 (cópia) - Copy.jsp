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
                                /* Impede a quebra de linha nas células */

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
                                background-color: #f5f5f5;
                                /* Cor de fundo ao passar o mouse */
                                cursor: pointer;
                                /* Muda o cursor para indicar interatividade */
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

                        WITH IMP AS
                        (
                        SELECT
                        CODEMP,EMPRESA,CODTIPPARC,DESCRTIPPARC,CODPARC,NOMEPARC,AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD,NUNOTA,TO_CHAR(DTNEG,'DD-MM-YYYY')DTNEG,VLRIPI,VLRSUBST,VLRICMS,VLRPIS,VLRCOFINS,
                        (VLRIPI+VLRSUBST+VLRICMS+VLRPIS+VLRCOFINS) IMPOSTOS
                        FROM VGF_CONSOLIDADOR_NOTAS_GM
                        WHERE
                        GOLSINAL = -1
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
                        SELECT
                        CODEMP,EMPRESA,CODTIPPARC,DESCRTIPPARC,CODPARC,NOMEPARC,AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD,NUNOTA,DTNEG,VLRIPI,VLRSUBST,VLRICMS,VLRPIS,VLRCOFINS, IMPOSTOS
                        FROM IMP
                        WHERE
                        (
                        (CODEMP = :A_CODEMP OR AD_TPPROD = :A_TPPROD OR CODPROD = :A_CODPROD)
                        OR
                        (CODTIPPARC = :A_PERFIL AND 
                        (AD_TPPROD = :A_TPPROD OR CODPROD = :A_CODPROD)
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
                                            <th onclick="sortTable(14)">Vlr. Icms</th>
                                            <th onclick="sortTable(15)">Vlr. Pis</th>
                                            <th onclick="sortTable(16)">Vlr. Cofins</th>
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
                                            <td colspan="14"></td>
                                            <td style="text-align: center;" id="totalAmount"><b>R$ 0,00</b></td>
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

                            function updateTotal() {
                                const rows = document.querySelectorAll('#myTable tbody tr:not(.total-row)');
                                let total = 0;

                                rows.forEach(row => {
                                    if (row.style.display !== 'none') {
                                        const cellValue = row.cells[17].textContent.replace(/[^\d,-]/g, '').replace(',', '.'); // Remove simbolos e converte ',' para '.'
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