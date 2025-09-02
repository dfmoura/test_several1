<!DOCTYPE html PUBLIC>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false"%>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Pedidos</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
        }

        .dashboard-container {
            background: linear-gradient(135deg, #ffffff 0%, #e6b782 100%);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }

        .header-section {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
            flex-wrap: wrap;
            gap: 20px;
        }

        .logo-container {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .logo-container img {
            max-height: 80px;
            max-width: 200px;
            object-fit: contain;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }

        .dashboard-title {
            color: rgb(221, 136, 56);
            font-size: 2.5rem;
            font-weight: bold;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            margin: 0;
        }

        .export-button-container {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 20px;
            padding-right: 20px;
            gap: 15px;
        }

        .export-btn {
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 50px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .export-btn:hover {
            transform: translateY(-2px);
        }

        .export-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }

        .pdf-button {
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
        }

        .pdf-button:hover {
            box-shadow: 0 8px 25px rgba(255, 107, 107, 0.6);
        }

        .excel-button {
            background: linear-gradient(45deg, #27ae60, #2ecc71);
            box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
        }

        .excel-button:hover {
            box-shadow: 0 8px 25px rgba(39, 174, 96, 0.6);
        }

        .table-wrapper {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            position: relative;
        }

        .table-container {
            max-height: 600px;
            overflow-y: auto;
            overflow-x: auto;
            position: relative;
        }

        .table-container::-webkit-scrollbar {
            width: 12px;
            height: 12px;
        }

        .table-container::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 6px;
        }

        .table-container::-webkit-scrollbar-thumb {
            background: linear-gradient(45deg, #bd9f87, #ca6c00);
            border-radius: 6px;
            border: 2px solid #f1f5f9;
        }

        .table-container::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(45deg, #bd9f87, #ca6c00);
        }

        #pedidosTable {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 14px;
        }

        /* CABEÇALHO FIXO */
        #pedidosTable thead {
            background: linear-gradient(135deg, #bd9f87 0%, #ca6c00 100%);
            position: sticky;
            top: 0;
            z-index: 10;
        }

        #pedidosTable thead th {
            color: white;
            padding: 16px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-right: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
            position: sticky;
            top: 0;
            background: linear-gradient(135deg, #bd9f87 0%, #ca6c00 100%);
        }

        #pedidosTable thead th:hover {
            background: linear-gradient(135deg, #bd9f87 0%, #ca6c00 100%);
            cursor: pointer;
        }

        #pedidosTable tbody tr {
            transition: all 0.3s ease;
            border-bottom: 1px solid #e2e8f0;
        }

        #pedidosTable tbody tr:nth-child(even) {
            background-color: #f8fafc;
        }

        #pedidosTable tbody tr:hover {
            background: linear-gradient(90deg, #e6f3ff 0%, #f0f8ff 100%);
            transform: scale(1.01);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            z-index: 1;
            position: relative;
        }

        #pedidosTable tbody td {
            padding: 14px 12px;
            border-right: 1px solid #e2e8f0;
            vertical-align: middle;
            transition: all 0.3s ease;
        }

        #pedidosTable tbody td:hover {
            background-color: rgba(102, 126, 234, 0.1);
            color: #1e293b;
            font-weight: 500;
        }

        /* Styling para valores monetários */
        .currency-cell {
            font-weight: 600;
            color: #059669;
        }

        /* Styling para códigos */
        .code-cell {
            font-family: 'Courier New', monospace;
            background-color: #f1f5f9;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
        }

        /* Styling para linha de totais */
        .total-row {
            background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%) !important;
            border-top: 3px solid #667eea !important;
            position: sticky;
            bottom: 0;
            z-index: 5;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.15);
        }

        .total-row td {
            color: white !important;
            font-weight: bold !important;
            font-size: 14px !important;
            padding: 16px 12px !important;
            border-right: 1px solid rgba(255, 255, 255, 0.2) !important;
        }

        .total-row:hover {
            background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
            transform: none !important;
        }

        .total-label {
            text-align: center;
            font-size: 16px !important;
            letter-spacing: 1px;
        }

        .total-value {
            text-align: right;
            color: #68d391 !important;
        }

        /* Loading animation */
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Responsividade */
        @media (max-width: 768px) {
            .dashboard-container {
                padding: 15px;
                margin: 10px;
            }

            .header-section {
                flex-direction: column;
                text-align: center;
            }

            .dashboard-title {
                font-size: 1.8rem;
            }

            .export-button-container {
                flex-direction: column;
                align-items: center;
            }

            .export-btn {
                width: 100%;
                max-width: 300px;
                justify-content: center;
            }

            #pedidosTable {
                font-size: 12px;
            }

            #pedidosTable th,
            #pedidosTable td {
                padding: 8px 6px;
            }

            .table-container {
                max-height: 400px;
            }
        }

        @media (max-width: 480px) {
            #pedidosTable th,
            #pedidosTable td {
                padding: 6px 4px;
                font-size: 11px;
            }

            .dashboard-title {
                font-size: 1.5rem;
            }

            .logo-container img {
                max-height: 60px;
            }
        }

        .footer {
            display: flex;
            justify-content: center;
            padding: 10px;
            background: #f1f1f1;
            gap: 10px;
            margin-top: 15px;
            border-radius: 10px;
        }

        .footer button {
            margin: 0 10px;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            background: linear-gradient(145deg, #cc6e02, #cc6e02);
            color: white;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 8px rgba(204, 110, 2, 0.3);
        }

        .footer button:hover {
            background: linear-gradient(145deg, #b85d01, #b85d01);
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(204, 110, 2, 0.4);
        }
    </style>
    
    <snk:load/>
</head>
<body>
    <snk:query var="pedidos">
SELECT 
CAB.CODEMP||'- '||EMP.NOMEFANTASIA AS EMPRESA,
CAB.CODVEND||'- '||VEN.APELIDO AS VENDEDOR,
CAB.CODPARC||'- '||PAR.RAZAOSOCIAL AS PARCEIRO,
CAB.DTNEG,
CAB.NUNOTA,
CAB.NUMNOTA,
ITE.CODPROD||'- '||PRO.DESCRPROD AS PRODUTO,
ITE.QTDNEG,
ITE.VLRUNIT,
ITE.VLRDESC,
ITE.VLRTOT
FROM TGFCAB CAB 
LEFT JOIN TGFITE ITE ON CAB.NUNOTA  = ITE.NUNOTA
LEFT JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
LEFT JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
LEFT JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
LEFT JOIN TSIEMP EMP ON CAB.CODEMP  = EMP.CODEMP
WHERE CAB.STATUSNOTA = 'L' 
AND CAB.TIPMOV = 'P'
AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND (
    (:P_PRODUTO IS NOT NULL AND ITE.CODPROD = :P_PRODUTO)
    OR
    (:P_PRODUTO IS NULL AND ITE.CODPROD IN (:P_CODPROD))
)
AND CAB.CODVEND IN (:P_CODVEND)
AND CAB.CODEMP IN (:P_CODEMP)
AND CAB.CODPARC IN (:P_CODPARC)
AND CAB.CODTIPOPER IN (:P_TOP)
AND CAB.PENDENTE IN (:P_PENDENTE) 
ORDER BY CAB.DTNEG,PAR.RAZAOSOCIAL,CAB.NUNOTA,ITE.CODPROD
    </snk:query>

    <div class="dashboard-container">
        <div class="header-section">
            <div class="logo-container">
                <img src="https://portaosemtrilho.com.br/wp-content/uploads/2021/06/ermaq.jpeg" alt="Logo da Empresa" id="company-logo">
                <h1 class="dashboard-title">
                    <i class="fas fa-chart-line"></i> Dashboard de Pedidos
                </h1>
            </div>
        </div>

        <!-- Botões de Exportação -->
        <div class="export-button-container">
            <button class="export-btn excel-button" onclick="exportarParaExcel()" id="excelBtn">
                <i class="fas fa-file-excel"></i>
                <span id="excelText">Exportar Excel</span>
            </button>
            <button class="export-btn pdf-button" onclick="exportarPDF()" id="exportBtn">
                <i class="fas fa-file-pdf"></i>
                <span id="exportText">Exportar PDF</span>
            </button>
        </div>

        <!-- Tabela de pedidos -->
        <div class="table-wrapper">
            <div class="table-container">
                <table id="pedidosTable">
                    <thead>
                        <tr>
                            <th><i class="fas fa-building"></i> Empresa</th>
                            <th><i class="fas fa-user-tie"></i> Vendedor</th>
                            <th><i class="fas fa-handshake"></i> Parceiro</th>
                            <th><i class="fas fa-hashtag"></i> NÚ Nota</th>
                            <th><i class="fas fa-receipt"></i> Nº Nota</th>
                            <th><i class="fas fa-calendar"></i> Dt. Neg</th>
                            <th><i class="fas fa-box"></i> Produto</th>
                            <th><i class="fas fa-sort-numeric-up"></i> Qtd</th>
                            <th><i class="fas fa-dollar-sign"></i> Vlr Unit</th>
                            <th><i class="fas fa-percentage"></i> Vlr Desc</th>
                            <th><i class="fas fa-calculator"></i> Vlr Total</th>
                        </tr>
                    </thead>

                    <tbody id="details-tbody">
                        <c:set var="totalQtd" value="0" />
                        <c:set var="totalVlrDesc" value="0" />
                        <c:set var="totalVlrTot" value="0" />
                        
                        <c:forEach items="${pedidos.rows}" var="row">
                            <tr>
                                <td>${row.EMPRESA}</td>
                                <td>${row.VENDEDOR}</td>
                                <td>${row.PARCEIRO}</td>
                                <td class="code-cell">${row.NUNOTA}</td>
                                <td class="code-cell">${row.NUMNOTA}</td>
                                <td><fmt:formatDate value="${row.DTNEG}" pattern="dd/MM/yyyy"/></td>
                                <td>${row.PRODUTO}</td>
                                <td><fmt:formatNumber value="${row.QTDNEG}" type="number" maxFractionDigits="2" minFractionDigits="0"/></td>
                                <td class="currency-cell"><fmt:formatNumber value="${row.VLRUNIT}" type="currency" currencySymbol="R$ "/></td>
                                <td class="currency-cell"><fmt:formatNumber value="${row.VLRDESC}" type="currency" currencySymbol="R$ "/></td>
                                <td class="currency-cell"><fmt:formatNumber value="${row.VLRTOT}" type="currency" currencySymbol="R$ "/></td>
                            </tr>
                            <c:set var="totalQtd" value="${totalQtd + row.QTDNEG}" />
                            <c:set var="totalVlrDesc" value="${totalVlrDesc + row.VLRDESC}" />
                            <c:set var="totalVlrTot" value="${totalVlrTot + row.VLRTOT}" />
                        </c:forEach>
                        
                        <!-- Linha de Totais -->
                        <tr class="total-row">
                            <td colspan="7" class="total-label"><i class="fas fa-calculator"></i> <strong>TOTAIS</strong></td>
                            <td class="total-value"><strong><fmt:formatNumber value="${totalQtd}" type="number" maxFractionDigits="2" minFractionDigits="0"/></strong></td>
                            <td class="total-value"><strong>-</strong></td>
                            <td class="total-value"><strong><fmt:formatNumber value="${totalVlrDesc}" type="currency" currencySymbol="R$ "/></strong></td>
                            <td class="total-value"><strong><fmt:formatNumber value="${totalVlrTot}" type="currency" currencySymbol="R$ "/></strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Rodapé -->
    <div class="footer">
        <button onclick="abrir_nivel()"><u>Agrupado por Vendedor</u></button>
        <button onclick="abrir_nivel2()"><u>Agrupado Sem Vendedores</u></button>
    </div>

    <script>
        function abrir_nivel(){
            var params = '';
            var level = '04Z';
            openLevel(level, params);
        }

        function abrir_nivel2(){
            var params = '';
            var level = '074';
            openLevel(level, params);
        }

        // Função para exportar para Excel
        function exportarParaExcel() {
            const excelBtn = document.getElementById('excelBtn');
            const excelText = document.getElementById('excelText');
            
            excelBtn.disabled = true;
            excelText.innerHTML = '<span class="loading"></span> Gerando Excel...';
            
            try {
                const table = document.getElementById('pedidosTable');
                if (!table) {
                    throw new Error("Tabela não encontrada!");
                }

                // Criar workbook
                const wb = XLSX.utils.book_new();
                
                // Extrair dados da tabela de forma mais controlada
                const headers = [];
                const headerCells = table.querySelectorAll('thead th');
                headerCells.forEach(cell => {
                    // Remove ícones e mantém apenas o texto
                    const text = cell.textContent.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
                    headers.push(text);
                });

                const data = [];
                const rows = table.querySelectorAll('tbody tr');
                
                rows.forEach(row => {
                    const rowData = [];
                    const cells = row.querySelectorAll('td');
                    
                    cells.forEach((cell, index) => {
                        let cellValue = cell.textContent.trim();
                        
                        // Limpar formatação de moeda para valores numéricos
                        if (cellValue.includes('R$')) {
                            cellValue = cellValue.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
                            // Converter para número se possível
                            const numValue = parseFloat(cellValue);
                            if (!isNaN(numValue)) {
                                rowData.push(numValue);
                            } else {
                                rowData.push(cellValue);
                            }
                        } else if (index === 7 || index === 8 || index === 9 || index === 10) {
                            // Colunas numéricas (Qtd, Vlr Unit, Vlr Desc, Vlr Total)
                            const cleanValue = cellValue.replace(/[^\d,.-]/g, '').replace(',', '.');
                            const numValue = parseFloat(cleanValue);
                            if (!isNaN(numValue)) {
                                rowData.push(numValue);
                            } else {
                                rowData.push(cellValue);
                            }
                        } else {
                            rowData.push(cellValue);
                        }
                    });
                    
                    data.push(rowData);
                });

                // Criar planilha com dados
                const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
                
                // Configurar largura das colunas
                const colWidths = [
                    { wch: 25 }, // Empresa
                    { wch: 20 }, // Vendedor  
                    { wch: 30 }, // Parceiro
                    { wch: 12 }, // NÚ Nota
                    { wch: 12 }, // Nº Nota
                    { wch: 12 }, // Dt. Neg
                    { wch: 35 }, // Produto
                    { wch: 10 }, // Qtd
                    { wch: 12 }, // Vlr Unit
                    { wch: 12 }, // Vlr Desc
                    { wch: 12 }  // Vlr Total
                ];
                ws['!cols'] = colWidths;

                // Formatar cabeçalho
                const headerRange = XLSX.utils.decode_range(ws['!ref']);
                for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                    if (!ws[cellAddress]) continue;
                    
                    ws[cellAddress].s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "BD9F87" } },
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                }

                // Formatar linha de totais (última linha)
                const lastRowIndex = data.length; // índice da linha de totais (baseado em 0, já inclui cabeçalho)
                for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: lastRowIndex, c: col });
                    if (!ws[cellAddress]) continue;
                    
                    ws[cellAddress].s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "4A5568" } },
                        alignment: { horizontal: col >= 7 ? "right" : "center", vertical: "center" }
                    };
                }

                // Adicionar planilha ao workbook
                XLSX.utils.book_append_sheet(wb, ws, "Dashboard_Pedidos");
                
                // Gerar nome do arquivo com data
                const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
                const nomeArquivo = `Dashboard_Pedidos_${hoje}.xlsx`;
                
                // Salvar arquivo
                XLSX.writeFile(wb, nomeArquivo);
                
                excelText.textContent = 'Excel Gerado!';
                setTimeout(() => {
                    excelText.textContent = 'Exportar Excel';
                    excelBtn.disabled = false;
                }, 2000);
                
            } catch (error) {
                console.error('Erro ao gerar Excel:', error);
                excelText.textContent = 'Erro ao gerar Excel';
                setTimeout(() => {
                    excelText.textContent = 'Exportar Excel';
                    excelBtn.disabled = false;
                }, 3000);
            }
        }

        // Função para exportar PDF
        function exportarPDF() {
            const exportBtn = document.getElementById('exportBtn');
            const exportText = document.getElementById('exportText');
            
            exportBtn.disabled = true;
            exportText.innerHTML = '<span class="loading"></span> Gerando PDF...';
            
            try {
                const doc = new jspdf.jsPDF('l', 'mm', 'a4');
                const pageWidth = doc.internal.pageSize.width;
                
                // Cabeçalho
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text('Dashboard de Pedidos', pageWidth/2, 15, { align: 'center' });
                
                const table = document.getElementById('pedidosTable');
                const headers = Array.from(table.querySelectorAll('thead th'))
                    .map(header => header.textContent.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim());
                
                const dados = [];
                
                // Processar todas as linhas
                const allRows = Array.from(table.querySelectorAll('tbody tr'));
                allRows.forEach(row => {
                    if (row.classList.contains('total-row')) {
                        const totalCells = Array.from(row.cells);
                        const totalRowData = [];
                        
                        const firstCellText = totalCells[0].textContent.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
                        totalRowData.push(firstCellText);
                        for (let i = 1; i < 7; i++) totalRowData.push('');
                        for (let i = 1; i < totalCells.length; i++) {
                            totalRowData.push(totalCells[i].textContent.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim());
                        }

                        dados.push({ isTotal: true, rowData: totalRowData });
                    } else {
                        dados.push({
                            isTotal: false,
                            rowData: Array.from(row.cells).map(cell => 
                                cell.textContent.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()
                            )
                        });
                    }
                });

                // Gerar tabela
                doc.autoTable({
                    head: [headers],
                    body: dados.map(d => d.rowData),
                    startY: 25,
                    styles: {
                        font: 'helvetica',
                        fontSize: 7,
                        cellPadding: 2,
                        lineColor: [80, 80, 80],
                        lineWidth: 0.1,
                        overflow: 'linebreak'
                    },
                    headStyles: {
                        fillColor: [189, 159, 135],
                        textColor: [255, 255, 255],
                        fontSize: 8,
                        fontStyle: 'bold',
                        halign: 'center'
                    },
                    columnStyles: {
                        0: {cellWidth: 35},
                        1: {cellWidth: 25},
                        2: {cellWidth: 40},
                        3: {cellWidth: 20},
                        4: {cellWidth: 15},
                        5: {cellWidth: 22},
                        6: {cellWidth: 45},
                        7: {cellWidth: 13},
                        8: {cellWidth: 20},
                        9: {cellWidth: 20},
                        10: {cellWidth: 20}
                    },
                    didDrawPage: function(data) {
                        doc.setFontSize(8);
                        doc.text('Página ' + doc.internal.getCurrentPageInfo().pageNumber,
                            pageWidth - 20, doc.internal.pageSize.height - 10, {align: 'right'});
                        const dataHora = new Date().toLocaleString('pt-BR');
                        doc.text('Gerado em: ' + dataHora, 20, doc.internal.pageSize.height - 10);
                    },
                    willDrawCell: function(data) {
                        const rowInfo = dados[data.row.index];
                        
                        // Só aplicar em linhas do corpo (body), nunca no cabeçalho
                        if (data.section === 'body' && rowInfo && rowInfo.isTotal) {
                            data.cell.styles.fillColor = [255, 102, 0]; // fundo laranja
                            data.cell.styles.textColor = [255, 255, 255]; // texto branco
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.fontSize = 9;

                            if ([7, 8, 9, 10].includes(data.column.index)) {
                                data.cell.styles.halign = 'right';
                            }
                            if (data.column.index === 0) {
                                data.cell.styles.halign = 'center';
                            }
                        } else {
                            const colunasNumericasDireita = [7, 8, 9, 10];
                            if (colunasNumericasDireita.includes(data.column.index)) {
                                data.cell.styles.halign = 'right';
                            }
                        }
                    },
                    margin: { top: 25, right: 15, bottom: 20, left: 15 },
                    tableWidth: 'auto',
                    theme: 'grid'
                });

                // Salvar PDF
                const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
                doc.save(`Dashboard_Pedidos_${hoje}.pdf`);
                
                exportText.textContent = 'PDF Gerado!';
                setTimeout(() => {
                    exportText.textContent = 'Exportar PDF';
                    exportBtn.disabled = false;
                }, 2000);
                
            } catch (error) {
                console.error('Erro ao gerar PDF:', error);
                exportText.textContent = 'Erro ao gerar PDF';
                setTimeout(() => {
                    exportText.textContent = 'Exportar PDF';
                    exportBtn.disabled = false;
                }, 3000);
            }
        }

        // Função para ordenar tabela (excluindo linha de totais)
        function sortTable(columnIndex) {
            const table = document.getElementById("pedidosTable");
            const tbody = table.querySelector("tbody");
            const rows = Array.from(tbody.querySelectorAll("tr"));
            
            // Separar linha de totais
            const totalRow = rows.find(row => row.classList.contains('total-row'));
            const dataRows = rows.filter(row => !row.classList.contains('total-row'));
            
            dataRows.sort((a, b) => {
                const aValue = a.cells[columnIndex].textContent.trim();
                const bValue = b.cells[columnIndex].textContent.trim();
                
                // Tentar comparar como número primeiro
                const aNum = parseFloat(aValue.replace(/[^\d,-]/g, '').replace(',', '.'));
                const bNum = parseFloat(bValue.replace(/[^\d,-]/g, '').replace(',', '.'));
                
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return aNum - bNum;
                }
                
                return aValue.localeCompare(bValue);
            });
            
            // Limpar tbody e recriar
            tbody.innerHTML = '';
            dataRows.forEach(row => tbody.appendChild(row));
            if (totalRow) tbody.appendChild(totalRow);
        }

        // Inicializar funcionalidades quando o DOM estiver pronto
        document.addEventListener('DOMContentLoaded', function() {
            // Adicionar funcionalidade de ordenação aos cabeçalhos
            const headers = document.querySelectorAll('#pedidosTable thead th');
            headers.forEach((header, index) => {
                header.addEventListener('click', () => sortTable(index));
                header.style.cursor = 'pointer';
                header.title = 'Clique para ordenar';
            });
            
            // Verificar se a logo foi carregada corretamente
            const logo = document.getElementById('company-logo');
            logo.onerror = function() {
                console.warn('Logo não pôde ser carregada. Verifique a URL da imagem.');
                this.style.display = 'none';
            };
            
            console.log('Dashboard iniciado com sucesso!');
        });
    </script>
</body>
</html>