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
            justify-content: center; /* centraliza horizontalmente */
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
        }

        .logo img {
            height: 30px;
            filter: brightness(0) invert(1);
        }

        .header-content {
            z-index: 5;
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
            padding: 40px;
        }

        .table-container {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            margin-bottom: 30px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }

        thead {
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
        }

        thead th {
            padding: 18px 15px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 0.6rem;
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
            padding: 15px;
            color: #2c3e50;
            vertical-align: middle;
            font-size: 0.6rem;
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
            }

            .container {
                box-shadow: none;
                border-radius: 0;
                max-width: none;
            }

            .btn-pdf {
                display: none;
            }

            .print-only {
                display: block;
            }

            .header {
                background: #2c3e50;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }

            thead {
                background: #3498db;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }

            tbody tr:hover {
                background: none;
                transform: none;
                box-shadow: none;
            }
        }

        @media (max-width: 768px) {
            .container {
                margin: 10px;
                border-radius: 15px;
            }

            .header {
                padding: 20px;
            }

            .header h1 {
                font-size: 1.8rem;
            }

            .content {
                padding: 20px;
            }

            .table-container {
                overflow-x: auto;
            }

            table {
                min-width: 800px;
            }

            .btn-pdf {
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
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
        <!-- Cabeçalho e logo conforme original -->
        <div class="header">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/dfmoura/test_several1/refs/heads/main/ireport/0044_Relatorio_Financeiro/logo-menu.png" alt="Logo" />
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
                        <table>
                            <thead>
                                <tr>
                                    <th>Nº Financeiro</th><th>Nº Nota</th><th>Data Negociação</th>
                                    <th>Data Vencimento</th><th>Data Baixa</th><th>Valor</th>
                                    <th>Parceiro</th><th>Natureza</th><th>Histórico</th>
                                </tr>
                            </thead>
                            <tbody>
                                <c:set var="total" value="0" />
                                <c:forEach var="row" items="${base.rows}">
                                    <tr>
                                        <td>${row.NUFIN}</td><td>${row.NUMNOTA}</td>
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
                                            <fmt:formatNumber value="${row.VLRDESDOB}" type="currency" currencySymbol="R$ " maxFractionDigits="2" minFractionDigits="2" groupingUsed="true" />
                                        </td>
                                        <td>${row.RAZAOSOCIAL}</td><td>${row.DESCRNAT}</td><td>${row.HISTORICO}</td>
                                    </tr>
                                    <c:set var="total" value="${total + row.VLRDESDOB}" />
                                </c:forEach>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="5" style="text-align:right; font-weight: bold;">Total:</td>
                                    <td style="font-weight: bold;" class="${total >= 0 ? 'valor-positivo' : 'valor-negativo'}">
                                        <fmt:formatNumber value="${total}" type="currency" currencySymbol="R$ " maxFractionDigits="2" minFractionDigits="2" groupingUsed="true" />
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

    <button class="btn-pdf" onclick="gerarPDF()">
        <!-- SVG conforme original -->
        Gerar PDF
    </button>

    <!-- libs jsPDF e autoTable -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>

    <script>
        
function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    const head = [[
        'Nº Financeiro','Nº Nota','Data Negociação','Data Vencimento',
        'Data Baixa','Valor','Parceiro','Natureza','Histórico'
    ]];
    const body = [];
    let total = 0;

    const linhas = document.querySelectorAll("tbody tr");
    linhas.forEach(tr => {
        const tds = tr.querySelectorAll("td");
        if (tds.length !== 9) return; // Ignora qualquer linha fora do padrão

        const row = [];
        tds.forEach((td, index) => {
            const texto = td.innerText.trim();
            row.push(texto);

            // Corrigir valor da coluna "Valor" (índice 5)
            if (index === 5) {
                const valorTexto = texto
                    .replace(/[^\d,-]/g, '') // Remove R$ e espaços
                    .replace(/\./g, '')       // Remove separador de milhar
                    .replace(',', '.');       // Troca vírgula decimal por ponto
                const valor = parseFloat(valorTexto);
                if (!isNaN(valor)) total += valor;
            }
        });

        body.push(row);
    });

    // Adiciona linha de total
    const totalFormatado = 'R$ ' + total.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    body.push([
        '', '', '', '', 'Total:',
        totalFormatado,
        '', '', ''
    ]);

    doc.setFontSize(14);
    doc.text("Relatório Financeiro Gerencial", 14, 20);

    doc.autoTable({
        startY: 30,
        head: head,
        body: body,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
            fillColor: [52, 152, 219],
            textColor: 255,
            fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 20, bottom: 20 },
        theme: 'striped',
        didParseCell: function(data) {
            // Cor de texto para a coluna de valor
            if (data.column.index === 5) {
                const raw = data.cell.raw.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.');
                const valor = parseFloat(raw);
                if (!isNaN(valor)) {
                    data.cell.styles.textColor = valor < 0 ? [231, 76, 60] : [39, 174, 96];
                }
            }
        }
    });

    doc.save('relatorio-financeiro.pdf');
}



        document.addEventListener('DOMContentLoaded', () => {
            const c = document.querySelector('.container');
            c.style.opacity = '0';
            c.style.transform = 'translateY(20px)';
            setTimeout(() => {
                c.style.transition = 'all 0.6s ease';
                c.style.opacity = '1';
                c.style.transform = 'translateY(0)';
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