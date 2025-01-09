<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

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

        .record-count {
            font-size: 12px;
            color: #777;
            text-align: right;
            padding-top: 10px;
        }

        /* Overlay do botão de exportação */
        .export-btn {
            position: fixed;
            bottom: 20px;
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
    </style>
    <snk:load/>
</head>
<body>

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
                    <th onclick="sortTable(3)">Dt. Baixa</th>
                    <th onclick="sortTable(4)">Cód. Parc.</th>
                    <th onclick="sortTable(5)">Parceiro</th>
                    <th onclick="sortTable(6)">Cód. Nat.</th>
                    <th onclick="sortTable(7)">Natureza</th>
                    <th onclick="sortTable(8)">Cód. CR</th>
                    <th onclick="sortTable(9)">CR</th>
                    <th onclick="sortTable(10)">HISTORICO</th>
                    <th onclick="sortTable(11)">Vlr. DO</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <!-- Dados fictícios -->
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><b>Total</b></td>
                    <td colspan="10"></td>
                    <td style="text-align: center;" id="totalAmount"><b>0,00</b></td>
                </tr>
            </tfoot>
        </table>
    </div>
    <div class="record-count" id="recordCount">Total de registros: 0</div>
</div>

<!-- Botão para exportar -->
<button class="export-btn" onclick="exportTableToExcel()">*.xlsx</button>

<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.1/xlsx.full.min.js"></script>

<script>
    // Dados fictícios para popular a tabela
    const fakeData = [
        { CODEMP: '001', EMPRESA: 'Empresa A', NUFIN: '12345', DHBAIXA: '01-01-2025', CODPARC: '1001', NOMEPARC: 'Parceiro X', CODNAT: '2001', NATUREZA: 'Despesa', CODCENCUS: '3001', CR: 'Centro 1', HISTORICO: 'Pagamento de serviço', VLRDO: 1200.50 },
        { CODEMP: '002', EMPRESA: 'Empresa B', NUFIN: '12346', DHBAIXA: '02-01-2025', CODPARC: '1002', NOMEPARC: 'Parceiro Y', CODNAT: '2002', NATUREZA: 'Despesa', CODCENCUS: '3002', CR: 'Centro 2', HISTORICO: 'Compra de material', VLRDO: 850.75 },
        { CODEMP: '003', EMPRESA: 'Empresa C', NUFIN: '12347', DHBAIXA: '03-01-2025', CODPARC: '1003', NOMEPARC: 'Parceiro Z', CODNAT: '2003', NATUREZA: 'Despesa', CODCENCUS: '3003', CR: 'Centro 3', HISTORICO: 'Contratação de serviço', VLRDO: 640.00 },
        { CODEMP: '001', EMPRESA: 'Empresa A', NUFIN: '12345', DHBAIXA: '01-01-2025', CODPARC: '1001', NOMEPARC: 'Parceiro X', CODNAT: '2001', NATUREZA: 'Despesa', CODCENCUS: '3001', CR: 'Centro 1', HISTORICO: 'Pagamento de serviço', VLRDO: 1200.50 },
        { CODEMP: '002', EMPRESA: 'Empresa B', NUFIN: '12346', DHBAIXA: '02-01-2025', CODPARC: '1002', NOMEPARC: 'Parceiro Y', CODNAT: '2002', NATUREZA: 'Despesa', CODCENCUS: '3002', CR: 'Centro 2', HISTORICO: 'Compra de material', VLRDO: 850.75 },
        { CODEMP: '003', EMPRESA: 'Empresa C', NUFIN: '12347', DHBAIXA: '03-01-2025', CODPARC: '1003', NOMEPARC: 'Parceiro Z', CODNAT: '2003', NATUREZA: 'Despesa', CODCENCUS: '3003', CR: 'Centro 3', HISTORICO: 'Contratação de serviço', VLRDO: 640.00 },
        { CODEMP: '001', EMPRESA: 'Empresa A', NUFIN: '12345', DHBAIXA: '01-01-2025', CODPARC: '1001', NOMEPARC: 'Parceiro X', CODNAT: '2001', NATUREZA: 'Despesa', CODCENCUS: '3001', CR: 'Centro 1', HISTORICO: 'Pagamento de serviço', VLRDO: 1200.50 },
        { CODEMP: '002', EMPRESA: 'Empresa B', NUFIN: '12346', DHBAIXA: '02-01-2025', CODPARC: '1002', NOMEPARC: 'Parceiro Y', CODNAT: '2002', NATUREZA: 'Despesa', CODCENCUS: '3002', CR: 'Centro 2', HISTORICO: 'Compra de material', VLRDO: 850.75 },
        { CODEMP: '003', EMPRESA: 'Empresa C', NUFIN: '12347', DHBAIXA: '03-01-2025', CODPARC: '1003', NOMEPARC: 'Parceiro Z', CODNAT: '2003', NATUREZA: 'Despesa', CODCENCUS: '3003', CR: 'Centro 3', HISTORICO: 'Contratação de serviço', VLRDO: 640.00 },
        { CODEMP: '001', EMPRESA: 'Empresa A', NUFIN: '12345', DHBAIXA: '01-01-2025', CODPARC: '1001', NOMEPARC: 'Parceiro X', CODNAT: '2001', NATUREZA: 'Despesa', CODCENCUS: '3001', CR: 'Centro 1', HISTORICO: 'Pagamento de serviço', VLRDO: 1200.50 },
        { CODEMP: '002', EMPRESA: 'Empresa B', NUFIN: '12346', DHBAIXA: '02-01-2025', CODPARC: '1002', NOMEPARC: 'Parceiro Y', CODNAT: '2002', NATUREZA: 'Despesa', CODCENCUS: '3002', CR: 'Centro 2', HISTORICO: 'Compra de material', VLRDO: 850.75 },
        { CODEMP: '003', EMPRESA: 'Empresa C', NUFIN: '12347', DHBAIXA: '03-01-2025', CODPARC: '1003', NOMEPARC: 'Parceiro Z', CODNAT: '2003', NATUREZA: 'Despesa', CODCENCUS: '3003', CR: 'Centro 3', HISTORICO: 'Contratação de serviço', VLRDO: 640.00 },
        { CODEMP: '001', EMPRESA: 'Empresa A', NUFIN: '12345', DHBAIXA: '01-01-2025', CODPARC: '1001', NOMEPARC: 'Parceiro X', CODNAT: '2001', NATUREZA: 'Despesa', CODCENCUS: '3001', CR: 'Centro 1', HISTORICO: 'Pagamento de serviço', VLRDO: 1200.50 },
        { CODEMP: '002', EMPRESA: 'Empresa B', NUFIN: '12346', DHBAIXA: '02-01-2025', CODPARC: '1002', NOMEPARC: 'Parceiro Y', CODNAT: '2002', NATUREZA: 'Despesa', CODCENCUS: '3002', CR: 'Centro 2', HISTORICO: 'Compra de material', VLRDO: 850.75 },
        { CODEMP: '003', EMPRESA: 'Empresa C', NUFIN: '12347', DHBAIXA: '03-01-2025', CODPARC: '1003', NOMEPARC: 'Parceiro Z', CODNAT: '2003', NATUREZA: 'Despesa', CODCENCUS: '3003', CR: 'Centro 3', HISTORICO: 'Contratação de serviço', VLRDO: 640.00 },
        { CODEMP: '001', EMPRESA: 'Empresa A', NUFIN: '12345', DHBAIXA: '01-01-2025', CODPARC: '1001', NOMEPARC: 'Parceiro X', CODNAT: '2001', NATUREZA: 'Despesa', CODCENCUS: '3001', CR: 'Centro 1', HISTORICO: 'Pagamento de serviço', VLRDO: 1200.50 },
        { CODEMP: '002', EMPRESA: 'Empresa B', NUFIN: '12346', DHBAIXA: '02-01-2025', CODPARC: '1002', NOMEPARC: 'Parceiro Y', CODNAT: '2002', NATUREZA: 'Despesa', CODCENCUS: '3002', CR: 'Centro 2', HISTORICO: 'Compra de material', VLRDO: 850.75 },
        { CODEMP: '003', EMPRESA: 'Empresa C', NUFIN: '12347', DHBAIXA: '03-01-2025', CODPARC: '1003', NOMEPARC: 'Parceiro Z', CODNAT: '2003', NATUREZA: 'Despesa', CODCENCUS: '3003', CR: 'Centro 3', HISTORICO: 'Contratação de serviço', VLRDO: 640.00 },
        { CODEMP: '001', EMPRESA: 'Empresa A', NUFIN: '12345', DHBAIXA: '01-01-2025', CODPARC: '1001', NOMEPARC: 'Parceiro X', CODNAT: '2001', NATUREZA: 'Despesa', CODCENCUS: '3001', CR: 'Centro 1', HISTORICO: 'Pagamento de serviço', VLRDO: 1200.50 },
        { CODEMP: '002', EMPRESA: 'Empresa B', NUFIN: '12346', DHBAIXA: '02-01-2025', CODPARC: '1002', NOMEPARC: 'Parceiro Y', CODNAT: '2002', NATUREZA: 'Despesa', CODCENCUS: '3002', CR: 'Centro 2', HISTORICO: 'Compra de material', VLRDO: 850.75 },
        { CODEMP: '003', EMPRESA: 'Empresa C', NUFIN: '12347', DHBAIXA: '03-01-2025', CODPARC: '1003', NOMEPARC: 'Parceiro Z', CODNAT: '2003', NATUREZA: 'Despesa', CODCENCUS: '3003', CR: 'Centro 3', HISTORICO: 'Contratação de serviço', VLRDO: 640.00 },
        { CODEMP: '001', EMPRESA: 'Empresa A', NUFIN: '12345', DHBAIXA: '01-01-2025', CODPARC: '1001', NOMEPARC: 'Parceiro X', CODNAT: '2001', NATUREZA: 'Despesa', CODCENCUS: '3001', CR: 'Centro 1', HISTORICO: 'Pagamento de serviço', VLRDO: 1200.50 },
        { CODEMP: '002', EMPRESA: 'Empresa B', NUFIN: '12346', DHBAIXA: '02-01-2025', CODPARC: '1002', NOMEPARC: 'Parceiro Y', CODNAT: '2002', NATUREZA: 'Despesa', CODCENCUS: '3002', CR: 'Centro 2', HISTORICO: 'Compra de material', VLRDO: 850.75 },
        { CODEMP: '003', EMPRESA: 'Empresa C', NUFIN: '12347', DHBAIXA: '03-01-2025', CODPARC: '1003', NOMEPARC: 'Parceiro Z', CODNAT: '2003', NATUREZA: 'Despesa', CODCENCUS: '3003', CR: 'Centro 3', HISTORICO: 'Contratação de serviço', VLRDO: 640.00 },
        { CODEMP: '001', EMPRESA: 'Empresa A', NUFIN: '12345', DHBAIXA: '01-01-2025', CODPARC: '1001', NOMEPARC: 'Parceiro X', CODNAT: '2001', NATUREZA: 'Despesa', CODCENCUS: '3001', CR: 'Centro 1', HISTORICO: 'Pagamento de serviço', VLRDO: 1200.50 },
        { CODEMP: '002', EMPRESA: 'Empresa B', NUFIN: '12346', DHBAIXA: '02-01-2025', CODPARC: '1002', NOMEPARC: 'Parceiro Y', CODNAT: '2002', NATUREZA: 'Despesa', CODCENCUS: '3002', CR: 'Centro 2', HISTORICO: 'Compra de material', VLRDO: 850.75 },
        { CODEMP: '003', EMPRESA: 'Empresa C', NUFIN: '12347', DHBAIXA: '03-01-2025', CODPARC: '1003', NOMEPARC: 'Parceiro Z', CODNAT: '2003', NATUREZA: 'Despesa', CODCENCUS: '3003', CR: 'Centro 3', HISTORICO: 'Contratação de serviço', VLRDO: 640.00 },        
        // Adicionar mais dados conforme necessário
    ];

    const tableBody = document.getElementById('tableBody');
    const recordCountElement = document.getElementById('recordCount');

    // Popula a tabela com os dados fictícios
    fakeData.forEach(row => {
        const tr = document.createElement('tr');

        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.textContent = typeof value === 'number' ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : value;
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });

    function updateTotal() {
        const rows = document.querySelectorAll('#myTable tbody tr');
        let total = 0;

        rows.forEach(row => {
            const cellValue = row.cells[11].textContent.replace(/[^\d,-]/g, '').replace(',', '.');
            const value = parseFloat(cellValue);
            total += isNaN(value) ? 0 : value;
        });

        document.getElementById('totalAmount').innerHTML = '<b>' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</b>';
    }

    function updateRecordCount() {
        const rows = document.querySelectorAll('#myTable tbody tr');
        recordCountElement.textContent = `Total de registros: ${rows.length}`;
    }

    document.getElementById('tableFilter').addEventListener('keyup', function () {
        const filter = this.value.toLowerCase();
        const rows = document.querySelectorAll('#myTable tbody tr');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const match = Array.from(cells).some(cell => cell.textContent.toLowerCase().includes(filter));
            row.style.display = match ? '' : 'none';
        });

        updateTotal();
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
        XLSX.writeFile(wb, 'Despesas_Operacionais.xlsx');
    }


    updateTotal();
    updateRecordCount();
</script>

</body>
</html>
