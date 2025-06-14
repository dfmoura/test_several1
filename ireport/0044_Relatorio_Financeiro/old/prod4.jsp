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
            padding: 15px;
            color: #2c3e50;
            vertical-align: middle;
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
    CASE 
        WHEN FIN.RECDESP = 1 THEN FIN.VLRDESDOB
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
    OR
    (:P_VERIFICACAO = 2 AND FIN.DHBAIXA BETWEEN :P_PERIODO AND :P_PERIODO1))
AND (FIN.CODNAT IN (:P_CODNAT))
AND (
    (:P_RECDESP = 1)
    OR
    (:P_RECDESP = 2 AND FIN.RECDESP = 1)
    OR
    (:P_RECDESP = 3 AND FIN.RECDESP = -1)
)
AND ((FIN.PROVISAO = 'S' AND FIN.DHBAIXA IS NULL) OR FIN.PROVISAO = 'N')
    </snk:query>

    <div class="container">
            <div class="table-container">
                <c:choose>
                    <c:when test="${not empty base.rows}">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nº Financeiro</th>
                                    <th>Nº Nota</th>
                                    <th>Data Negociação</th>
                                    <th>Data Vencimento</th>
                                    <th>Data Baixa</th>
                                    <th>Valor</th>
                                    <th>Parceiro</th>
                                    <th>Natureza</th>
                                    <th>Histórico</th>
                                </tr>
                            </thead>
                            <tbody>
                                <c:forEach var="row" items="${base.rows}">
                                    <tr>
                                        <td>${row.NUFIN}</td>
                                        <td>${row.NUMNOTA}</td>
                                        <td>
                                            <fmt:formatDate value="${row.DTNEG}" pattern="dd/MM/yyyy"/>
                                        </td>
                                        <td>
                                            <fmt:formatDate value="${row.DTVENC}" pattern="dd/MM/yyyy"/>
                                        </td>
                                        <td>
                                            <c:choose>
                                                <c:when test="${not empty row.DHBAIXA}">
                                                    <fmt:formatDate value="${row.DHBAIXA}" pattern="dd/MM/yyyy"/>
                                                </c:when>
                                                <c:otherwise>-</c:otherwise>
                                            </c:choose>
                                        </td>
                                        <td class="${row.VLRDESDOB >= 0 ? 'valor-positivo' : 'valor-negativo'}">
                                            <fmt:formatNumber value="${row.VLRDESDOB}" type="currency" currencySymbol="R$ "/>
                                        </td>
                                        <td>${row.RAZAOSOCIAL}</td>
                                        <td>${row.DESCRNAT}</td>
                                        <td>${row.HISTORICO}</td>
                                    </tr>
                                </c:forEach>
                            </tbody>
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
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
            <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.266.266 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.71 12.71 0 0 1 1.01-.193 11.744 11.744 0 0 1-.51-.858 20.801 20.801 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 7.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.135.968z"/>
        </svg>
        Gerar PDF
    </button>

    <!-- Bibliotecas necessárias -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

    <script>
        async function gerarPDF() {
            const { jsPDF } = window.jspdf;
            const container = document.querySelector('.container');

            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let position = 0;
            let heightLeft = imgHeight;

            while (heightLeft > 0) {
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
                if (heightLeft > 0) {
                    pdf.addPage();
                    position = -pageHeight;
                }
            }

            pdf.save('relatorio-financeiro.pdf');
        }

        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                gerarPDF();
            }
        });

        document.addEventListener('DOMContentLoaded', function() {
            const container = document.querySelector('.container');
            container.style.opacity = '0';
            container.style.transform = 'translateY(20px)';
            setTimeout(() => {
                container.style.transition = 'all 0.6s ease';
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            }, 100);
        });
    </script>
</body>
</html>
