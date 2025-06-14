<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>

<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório Financeiro Gerencial</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            position: relative;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
            padding: 30px 40px;
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
        }

        .header::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 300px;
            height: 300px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 50%;
            transform: translate(50%, -50%);
        }

        .logo {
            position: absolute;
            top: 20px;
            left: 20px;
            z-index: 10;
            filter: brightness(0) invert(1);
        }

        .logo img {
            height: 30px;
            width: auto;
        }

        .header-content {
            z-index: 5;
            width: 100%;
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 300;
            margin-bottom: 10px;
            letter-spacing: 1px;
        }

        .header .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
            font-weight: 300;
        }

        .content {
            padding: 20px 40px 40px;
            position: relative;
            z-index: 1;
        }

        .table-container {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            margin-bottom: 30px;
            position: relative;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
            table-layout: fixed;
        }

        thead {
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
            position: sticky;
            top: 0;
        }

        thead th {
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 0.8rem;
        }

        tbody tr {
            transition: all 0.3s ease;
            border-bottom: 1px solid #f0f0f0;
        }

        tbody tr:hover {
            background: linear-gradient(135deg, #f8f9ff 0%, #e8f4fd 100%);
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.1);
        }

        tbody td {
            padding: 12px 15px;
            color: #2c3e50;
            vertical-align: middle;
            font-size: 0.8rem;
            word-wrap: break-word;
        }

        tfoot tr {
            background: linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%);
            font-weight: bold;
        }

        tfoot td {
            padding: 12px 15px;
            font-size: 0.9rem;
            color: #2c3e50;
        }

        .valor-positivo {
            color: #27ae60;
            font-weight: 600;
        }

        .valor-negativo {
            color: #e74c3c;
            font-weight: 600;
        }

        .btn-pdf {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 50px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 10px 30px rgba(231, 76, 60, 0.3);
            transition: all 0.3s ease;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .btn-pdf:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(231, 76, 60, 0.4);
        }

        .btn-pdf:active {
            transform: translateY(-1px);
        }

        .no-data {
            text-align: center;
            padding: 60px 20px;
            color: #7f8c8d;
            font-size: 1.1rem;
        }

        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 60px;
        }

        .loading::after {
            content: '';
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .print-only {
            display: none;
        }

        @media print {
            body {
                background: white;
                padding: 0;
                margin: 0;
            }

            .container {
                box-shadow: none;
                border-radius: 0;
                max-width: none;
                margin: 0;
                width: 100%;
            }

            .btn-pdf {
                display: none;
            }

            .print-only {
                display: block;
            }

            .header {
                background: #2c3e50 !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
                padding: 10px 20px !important;
                height: auto !important;
            }

            .logo img {
                filter: brightness(0) invert(1);
                height: 20px !important;
            }

            .header h1 {
                font-size: 1.2rem !important;
                margin-bottom: 2px !important;
            }

            .header .subtitle {
                font-size: 0.7rem !important;
            }

            thead {
                background: #3498db !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }

            tbody tr:hover {
                background: none !important;
                transform: none !important;
                box-shadow: none !important;
            }

            .content {
                padding: 5px !important;
                margin-top: 0 !important;
            }

            table {
                font-size: 7pt !important;
            }

            thead th, tbody td {
                padding: 4px 6px !important;
            }

            @page {
                size: A4 landscape;
                margin: 5mm 5mm 5mm 5mm;
            }

            .table-container {
                box-shadow: none !important;
                margin-bottom: 5px !important;
            }
        }

        @media (max-width: 768px) {
            .container {
                margin: 10px;
                border-radius: 15px;
            }

            .header {
                padding: 20px;
                flex-direction: column;
                text-align: center;
            }

            .logo {
                position: relative;
                top: auto;
                left: auto;
                margin-bottom: 15px;
            }

            .header h1 {
                font-size: 1.8rem;
            }

            .content {
                padding: 15px;
            }

            .table-container {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }

            table {
                min-width: 800px;
            }

            .btn-pdf {
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                font-size: 0.9rem;
            }
        }
    </style>
    <snk:load/>
</head>
<body>
    <snk:query var="base">
        SELECT
            FIN.NUFIN,
            FIN.NUMNOTA,
            FIN.DTNEG,
            FIN.DTVENC,
            FIN.DHBAIXA,
            CASE WHEN FIN.RECDESP = 1 THEN FIN.VLRDESDOB
                 WHEN FIN.RECDESP = -1 THEN FIN.VLRDESDOB * -1 
            END VLRDESDOB,
            FIN.CODPARC || '-' || PAR.RAZAOSOCIAL RAZAOSOCIAL,
            FIN.CODNAT || '-' || NAT.DESCRNAT DESCRNAT,
            FIN.HISTORICO
        FROM TGFFIN FIN
        INNER JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        INNER JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
        WHERE 
            ((:P_VERIFICACAO = 1 AND FIN.DTVENC BETWEEN :P_PERIODO AND :P_PERIODO1)
            OR (:P_VERIFICACAO = 2 AND FIN.DHBAIXA BETWEEN :P_PERIODO AND :P_PERIODO1))
            AND (FIN.CODNAT IN (:P_CODNAT))
            AND (
                (:P_RECDESP = 1)
                OR (:P_RECDESP = 2 AND FIN.RECDESP = 1)
                OR (:P_RECDESP = 3 AND FIN.RECDESP = -1)
            )
            AND ((FIN.PROVISAO = 'S' AND FIN.DHBAIXA IS NULL) OR FIN.PROVISAO = 'N')
    </snk:query>

    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/dfmoura/test_several1/refs/heads/main/ireport/0044_Relatorio_Financeiro/logo-menu.png" alt="Logo" id="logo-img" />
            </div>
            <div class="header-content">
                <h1 class="titulo-centralizado">Relatório Financeiro Gerencial</h1>
                <p class="subtitle">Análise detalhada das movimentações financeiras</p>
            </div>
        </div>

        <div class="content">
            <div class="table-container">
                <c:choose>
                    <c:when test="${not empty base.rows}">
                        <table id="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 8%">Nº Financeiro</th>
                                    <th style="width: 8%">Nº Nota</th>
                                    <th style="width: 10%">Data Negociação</th>
                                    <th style="width: 10%">Data Vencimento</th>
                                    <th style="width: 10%">Data Baixa</th>
                                    <th style="width: 10%">Valor</th>
                                    <th style="width: 18%">Parceiro</th>
                                    <th style="width: 18%">Natureza</th>
                                    <th style="width: 18%">Histórico</th>
                                </tr>
                            </thead>
                            <tbody>
                                <c:set var="total" value="0" />
                                <c:forEach var="row" items="${base.rows}">
                                    <tr>
                                        <td>${row.NUFIN}</td>
                                        <td>${row.NUMNOTA}</td>
                                        <td><fmt:formatDate value="${row.DTNEG}" pattern="dd/MM/yyyy"/></td>
                                        <td><fmt:formatDate value="${row.DTVENC}" pattern="dd/MM/yyyy"/></td>
                                        <td>
                                            <c:choose>
                                                <c:when test="${not empty row.DHBAIXA}">
                                                    <fmt:formatDate value="${row.DHBAIXA}" pattern="dd/MM/yyyy"/>
                                                </c:when>
                                                <c:otherwise>-</c:otherwise>
                                            </c:choose>
                                        </td>
                                        <td class="${row.VLRDESDOB >= 0 ? 'valor-positivo' : 'valor-negativo'}">
                                            <fmt:setLocale value="pt_BR"/>
                                            <fmt:formatNumber value="${row.VLRDESDOB}" type="number" minFractionDigits="2" maxFractionDigits="2" groupingUsed="true"/>
                                        </td>
                                        <td>${row.RAZAOSOCIAL}</td>
                                        <td>${row.DESCRNAT}</td>
                                        <td>${row.HISTORICO}</td>
                                    </tr>
                                    <c:set var="total" value="${total + row.VLRDESDOB}" />
                                </c:forEach>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="5" style="text-align:right; font-weight: bold;">Total:</td>
                                    <td style="font-weight: bold;" class="${total >= 0 ? 'valor-positivo' : 'valor-negativo'}" id="total-value">
                                        <fmt:setLocale value="pt_BR"/>
                                        <fmt:formatNumber value="${total}" type="number" minFractionDigits="2" maxFractionDigits="2" groupingUsed="true"/>
                                    </td>
                                    <td colspan="3"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </c:when>
                    <c:otherwise>
                        <div class="no-data">
                            <p>Nenhum registro encontrado para os filtros selecionados.</p>
                        </div>
                    </c:otherwise>
                </c:choose>
            </div>
        </div>
    </div>

    <!-- Elemento oculto para armazenar o total calculado pelo JSP -->
    <div id="hidden-total" style="display: none;">
        <c:if test="${not empty base.rows}">
            <c:set var="hiddenTotal" value="0" />
            <c:forEach var="row" items="${base.rows}">
                <c:set var="hiddenTotal" value="${hiddenTotal + row.VLRDESDOB}" />
            </c:forEach>
            <span data-total="${hiddenTotal}">
                <fmt:setLocale value="pt_BR"/>
                <fmt:formatNumber value="${hiddenTotal}" type="number" minFractionDigits="2" maxFractionDigits="2" groupingUsed="true"/>
            </span>
        </c:if>
    </div>

    <button class="btn-pdf" onclick="gerarPDF()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10,9 9,9 8,9"></polyline>
        </svg>
        Gerar PDF
    </button>

    <!-- libs jsPDF e autoTable -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>
    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>

    <script>
        // Variável global para armazenar o total calculado pelo JSP
        let totalCalculado = 0;
        
        async function gerarPDF() {
            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('l', 'mm', 'a4');
                
                // Configurar margens
                const margin = 8;
                const pageWidth = doc.internal.pageSize.width - 2 * margin;
                
                // Configurar a logo branca para o PDF
                const logoUrl = 'https://raw.githubusercontent.com/dfmoura/test_several1/refs/heads/main/ireport/0044_Relatorio_Financeiro/logo-menu.png';
                
                // Criar elemento de imagem para processamento
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = logoUrl;
                });
                
                // Criar canvas para processar a logo
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // Desenhar fundo branco
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Aplicar a imagem original usando composição para manter apenas a parte branca
                ctx.globalCompositeOperation = 'multiply';
                ctx.drawImage(img, 0, 0);
                ctx.globalCompositeOperation = 'destination-in';
                ctx.drawImage(img, 0, 0);
                
                // Converter para base64
                const whiteLogoData = canvas.toDataURL('image/png');
                
                // Adicionar cabeçalho mais compacto (18mm de altura)
                doc.setFillColor(44, 62, 80);
                doc.rect(0, 0, doc.internal.pageSize.width, 18, 'F');
                
                // Adicionar logo branca (tamanho reduzido)
                doc.addImage(whiteLogoData, 'PNG', margin, 3, 25, 7.5);
                
                // Adicionar título e subtítulo mais compactos
                doc.setFontSize(12);
                doc.setTextColor(255, 255, 255);
                doc.text('Relatório Financeiro Gerencial', 40, 9);
                doc.setFontSize(7);
                doc.text('Análise detalhada das movimentações financeiras', 40, 13);
                
                // Configurar dados da tabela
                const head = [[
                    'Nº Financeiro', 'Nº Nota', 'Data Negociação', 'Data Vencimento',
                    'Data Baixa', 'Valor', 'Parceiro', 'Natureza', 'Histórico'
                ]];
                
                const body = [];
                
                // Processar cada linha da tabela para o PDF
                document.querySelectorAll("#data-table tbody tr").forEach(tr => {
                    const cells = Array.from(tr.querySelectorAll("td"));
                    const row = cells.map(td => td.textContent.trim());
                    body.push(row);
                });
                
                // Posição inicial da tabela logo após o cabeçalho (reduzida)
                const startY = 20; // Reduzido de 25 para 20
                
                // Adicionar tabela ao PDF
                doc.autoTable({
                    startY: startY,
                    head: head,
                    body: body,
                    styles: { 
                        fontSize: 7,
                        cellPadding: 1.5, // Reduzido
                        overflow: 'linebreak',
                        lineWidth: 0.1,
                        valign: 'middle'
                    },
                    headStyles: {
                        fillColor: [52, 152, 219],
                        textColor: 255,
                        fontStyle: 'bold',
                        fontSize: 7
                    },
                    alternateRowStyles: { fillColor: [248, 249, 250] },
                    margin: { 
                        top: startY, 
                        bottom: 12,
                        left: margin,
                        right: margin
                    },
                    tableWidth: 'auto',
                    theme: 'striped',
                    showHead: 'everyPage',
                    didParseCell: function(data) {
                        // Aplicar estilos de cor para valores positivos/negativos
                        if (data.column.index === 5) {
                            const cellText = data.cell.text[0] || "";
                            const hasNegativeSign = cellText.includes('-');
                            const numericValue = parseFloat(cellText.replace(/\./g, '').replace(',', '.'));
                            const isNegative = hasNegativeSign || numericValue < 0;
                            data.cell.styles.textColor = isNegative ? [231, 76, 60] : [39, 174, 96];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    },
                    columnStyles: {
                        0: { cellWidth: 18, halign: 'center' },  // Nº Financeiro
                        1: { cellWidth: 18, halign: 'center' },  // Nº Nota
                        2: { cellWidth: 20, halign: 'center' },  // Data Negociação
                        3: { cellWidth: 20, halign: 'center' },  // Data Vencimento
                        4: { cellWidth: 18, halign: 'center' },  // Data Baixa
                        5: { cellWidth: 22, halign: 'right' },   // Valor
                        6: { cellWidth: 55, halign: 'left' },    // Parceiro
                        7: { cellWidth: 55, halign: 'left' },    // Natureza
                        8: { cellWidth: 55, halign: 'left' }     // Histórico
                    },
                    pageBreak: 'auto',
                    tableLineWidth: 0.1,
                    tableLineColor: [200, 200, 200]
                });
                
                // Capturar o total exatamente como está exibido na página
                const totalElement = document.querySelector('#total-value');
                let totalText = '';
                let isNegativeTotal = false;
                
                if (totalElement) {
                    totalText = totalElement.textContent.trim();
                    isNegativeTotal = totalElement.classList.contains('valor-negativo');
                } else {
                    const footerTotal = document.querySelector('tfoot td.valor-positivo, tfoot td.valor-negativo');
                    if (footerTotal) {
                        totalText = footerTotal.textContent.trim();
                        isNegativeTotal = footerTotal.classList.contains('valor-negativo');
                    }
                }
                
                if (!totalText && totalCalculado !== 0) {
                    totalText = totalCalculado.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                    isNegativeTotal = totalCalculado < 0;
                }
                
                // Adicionar linha de total
                if (totalText) {
                    const finalY = doc.lastAutoTable.finalY || startY;
                    doc.autoTable({
                        startY: finalY + 3,
                        body: [[
                            {content: 'TOTAL GERAL:', styles: {fontStyle: 'bold', halign: 'right', fontSize: 9}},
                            {content: totalText, styles: {
                                fontStyle: 'bold', 
                                fontSize: 9,
                                halign: 'right',
                                textColor: isNegativeTotal ? [231, 76, 60] : [39, 174, 96]
                            }}
                        ]],
                        styles: { 
                            cellPadding: 3,
                            lineWidth: 0.3,
                            lineColor: [100, 100, 100]
                        },
                        margin: { 
                            left: pageWidth - 80,
                            right: margin
                        },
                        columnStyles: {
                            0: { cellWidth: 35 },
                            1: { cellWidth: 35 }
                        },
                        tableWidth: 'wrap',
                        theme: 'grid'
                    });
                }
                
                // Adicionar data e hora de geração no rodapé
                const now = new Date();
                const dateStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR');
                doc.setFontSize(6);
                doc.setTextColor(120, 120, 120);
                doc.text(`Relatório gerado em: ${dateStr}`, margin, doc.internal.pageSize.height - 8);
                
                // Adicionar número da página
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(6);
                    doc.setTextColor(120, 120, 120);
                    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 8);
                }
                
                doc.save('relatorio-financeiro-gerencial.pdf');
            } catch (error) {
                console.error('Erro ao gerar PDF:', error);
                alert('Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.');
            }
        }
        
        function capturarTotal() {
            const hiddenTotal = document.querySelector('#hidden-total span');
            if (hiddenTotal) {
                const totalNumerico = parseFloat(hiddenTotal.getAttribute('data-total'));
                if (!isNaN(totalNumerico)) {
                    totalCalculado = totalNumerico;
                    return;
                }
            }
            
            const totalElement = document.querySelector('#total-value');
            if (totalElement) {
                const totalText = totalElement.textContent.trim();
                const numeroLimpo = totalText.replace(/\./g, '').replace(',', '.');
                totalCalculado = parseFloat(numeroLimpo);
                return;
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const c = document.querySelector('.container');
            c.style.opacity = '0';
            c.style.transform = 'translateY(20px)';
            setTimeout(() => {
                c.style.transition = 'all 0.6s ease';
                c.style.opacity = '1';
                c.style.transform = 'translateY(0)';
                setTimeout(capturarTotal, 500);
            }, 100);
        });

        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                gerarPDF();
            }
        });
    </script>
</body>
</html>