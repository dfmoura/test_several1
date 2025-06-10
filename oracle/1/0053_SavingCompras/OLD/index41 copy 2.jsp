<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tabela de Ganho de Negociação</title>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    
    <!-- Add Flatpickr CSS and JS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="https://npmcdn.com/flatpickr/dist/l10n/pt.js"></script>
    <!-- Add SheetJS library -->
    <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>
            

    <style>
        body {
            background-color: #f8f9fa;
            font-family: 'Arial', sans-serif;
            position: relative;
            padding-bottom: 60px;
        }

        .tables-container {
            display: flex;
            justify-content: space-around;
            padding: 20px;
        }

        .table-container {
            flex: 1;
            overflow-y: auto;
            margin: 0 10px;
            height: 700px;
        }

        .table {
            width: 100%;
            margin-bottom: 0;
            border-collapse: separate;
            border-spacing: 0 10px;
        }

        .table thead th {
            position: sticky;
            top: 0;
            background: #28a745;
            color: white;
            z-index: 1;
            box-shadow: 0 2px 2px -1px rgba(0, 0, 0, 0.4);
            text-align: center;
            padding: 10px;
            font-size: 12px;
        }

        .table tbody tr {
            background-color: white;
            transition: background-color 0.3s ease;
        }

        .table tbody tr:hover {
            background-color: #e9ecef;
        }

        .table tbody td {
            font-size: 10px;
            padding: 8px;
            text-align: center;
            border-top: 1px solid #dee2e6;
            white-space: nowrap;
        }

        .table tbody tr:nth-of-type(even) {
            background-color: #f1f1f1;
        }

        .table tbody tr td:first-child {
            border-top-left-radius: 10px;
            border-bottom-left-radius: 10px;
        }

        .table tbody tr td:last-child {
            border-top-right-radius: 10px;
            border-bottom-right-radius: 10px;
        }

        .table tfoot td {
            font-weight: bold;
            font-size: 8px;
            background: #e3eae4;
            text-align: center;
        }

        .pdf-button {
            position: fixed;
            bottom: 20px;
            padding: 10px 20px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .pdf-button:hover {
            background-color: #218838;
        }

        .pdf-button.left {
            left: 20px;
        }

        .pdf-button.right {
            right: 20px;
        }
        .export-buttons {
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 1000;
            display: flex;
            gap: 10px;
        }

        .export-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        }

        .export-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }

        .pdf-btn {
            background: linear-gradient(135deg, #dc3545, #c82333);
        }

        .excel-btn {
            background: linear-gradient(135deg, #28a745, #1e7e34);
        }


    </style>

    <snk:load />
</head>

<body>
    <snk:query var="ganho_negcociacao_detalhe">

    SELECT 
    CODEMP,PARCEIRO,PRODUTO,NUFIN,NUNOTA,DTNEG,DTVENC,DHBAIXA,COMPRADOR, SAVING,GANHO_EVOLUCAO,GANHO_NEGOCIACAO,SAVING+GANHO_EVOLUCAO+GANHO_NEGOCIACAO TOTAL_ECONOMIA
    FROM (
    
    SELECT 
    CODEMP,PARCEIRO,PRODUTO,NUFIN,NUNOTA,DTNEG,DTVENC,DHBAIXA,COMPRADOR, SUM(SAVING)SAVING,SUM(GANHO_EVOLUCAO)GANHO_EVOLUCAO,SUM(GANHO_NEGOCIACAO)GANHO_NEGOCIACAO
    FROM (
            SELECT
            CODEMP,
            PARCEIRO,
            PRODUTO,
            NULL NUFIN,
            NUNOTA,
            TO_CHAR(DTNEG,'DD-MM-YYYY') DTNEG,
            NULL DTVENC,
            NULL DHBAIXA,
            COMPRADOR,
            SAVING,
            GANHO_EVOLUCAO,
            0 GANHO_NEGOCIACAO
            FROM(
            SELECT
            CODEMP,
            PARCEIRO,
            PRODUTO,
            CODPROD,
            GRUPO,
            CODGRUPOPROD,
            UN,
            NUNOTA,
            TIPMOV,
            DTNEG,
            COMPRADOR,
            USUARIO_INC,
            QTDNEG,
            VLRTOT,
            SAVING,
            (SAVING / NULLIF(VLRTOT,0)) * 100 AS PERC_SAVING,
            (VLRTOT) / NULLIF(QTDNEG,0) AS PRECO_COMPRA_UN,
            (VLRTOT - SAVING) / NULLIF(QTDNEG,0) AS PRECO_COMPRA_UN_LIQ,
            GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) AS PRECO_COMPRA_UN_LIQ_ANT_MED,
            CASE
            WHEN (GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
            NULLIF(QTDNEG,0)))>0
            AND CODGRUPOPROD IN(3020000,3010000)
            THEN
            ABS(GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
            NULLIF(QTDNEG,0)))
            ELSE 0 END GANHO_EVOLUCAO_UN,
        
            CASE WHEN (GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
            NULLIF(QTDNEG,0)))>0
            AND CODGRUPOPROD IN(3020000,3010000)
            THEN
            ABS(GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
            NULLIF(QTDNEG,0))) *
            QTDNEG ELSE 0 END GANHO_EVOLUCAO,
        
            CASE
            WHEN GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) / NULLIF(QTDNEG,
            0))
            > 0 THEN 'REDUCAO'
            WHEN GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) / NULLIF(QTDNEG,
            0))
            < 0 AND GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) <> 0 THEN 'AUMENTO'
                WHEN GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) /
                NULLIF(QTDNEG,
                0)) < 0 AND GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)=0 THEN 'SEM ALTERACAO'
                    ELSE 'MANTEVE' END AS SITUACAO_PRECO, (CASE WHEN
                    GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL) - ((VLRTOT - SAVING) /
                    NULLIF(QTDNEG, 0)) < 0 AND GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)=0 THEN
                    0 ELSE ABS(ABS(GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING)
                    / NULLIF(QTDNEG,0)))/NULLIF(((VLRTOT - SAVING) / NULLIF(QTDNEG,0)),0))*100 END) AS
                    PERC_DIF_PRECO_ULT_COMPRA_UN_LIQ_MED_POR_COMPRA_UN_ATUAL_LIQ, SAVING + CASE WHEN
                    (GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
                    NULLIF(QTDNEG,0)))>0
                    AND CODGRUPOPROD IN(3020000,3010000)
                    THEN ABS(GET_PRECMED_ANT_PROD_COMP_SAT(DTNEG,CODPROD,NULL)-((VLRTOT - SAVING) /
                    NULLIF(QTDNEG,0))) * QTDNEG ELSE 0 END
        
                    AS ECONOMIA_COMPRA
        
                    FROM(
                    WITH
                    USU AS (SELECT CODUSU,NOMEUSU,AD_USUCOMPRADOR FROM TSIUSU)
                    SELECT CAB.CODEMP,
                    SUBSTR(CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL), 1, 20) AS PARCEIRO,
                    SUBSTR(ITE.CODPROD||'-'||PRO.DESCRPROD,1,15) AS PRODUTO,
                    PRO.CODPROD,
                    SUBSTR(PRO.CODGRUPOPROD||'-'|| GRU.DESCRGRUPOPROD,1,15) AS GRUPO,
                    PRO.CODGRUPOPROD,
                    ITE.CODVOL AS UN,
                    ITE.NUNOTA AS NUNOTA,
                    CAB.TIPMOV AS TIPMOV,
                    CAB.DTNEG,
                    SUBSTR(VEN.CODVEND||'-'||VEN.APELIDO,1,10) AS COMPRADOR,
                    SUBSTR(CAB.CODUSUINC||'-'||USU.NOMEUSU,1,10) AS USUARIO_INC,
                    CASE WHEN ITE.CODVOL = 'MI'
                    THEN GET_QTDNEG_SATIS(ITE.NUNOTA,ITE.SEQUENCIA,ITE.CODPROD)
                    ELSE ITE.QTDNEG END AS QTDNEG,
                    ITE.VLRTOT,
                    ITE.VLRDESC AS SAVING
                    FROM TGFITE ITE
                    INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
                    INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
                    INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = (
                    SELECT
                    MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER ) )
                    INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
                    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
                    INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
                    INNER JOIN USU ON CAB.CODUSUINC = USU.CODUSU
                    WHERE CAB.TIPMOV = 'O'
                    AND CAB.STATUSNOTA = 'L'
                    AND USU.AD_USUCOMPRADOR = 'S'
                    AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        
                    )
                    )
    
    UNION ALL
    
            SELECT
            CODEMP,
            PARCEIRO,
            NULL PRODUTO,
            NUFIN,
            NUNOTA,
            DTNEG,
            DTVENC,
            DHBAIXA,
            NULL COMPRADOR,
            0 SAVING,
            0 GANHO_EVOLUCAO,
            ABS(GANHO_NEGOCIACAO)GANHO_NEGOCIACAO
            FROM(
            SELECT
            CODEMP,
            NUFIN,
            NUNOTA,
            CODPARC||'-'||NOMEPARC PARCEIRO,
            TO_CHAR(DTNEG,'DD-MM-YYYY')DTNEG,
            TO_CHAR(DTVENC,'DD-MM-YYYY')DTVENC,
            TO_CHAR(DHBAIXA,'DD-MM-YYYY')DHBAIXA,
            CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END AS DIAS,
            VLRLIQ,
    
            CASE
            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) = 30 THEN
            VLRLIQ * 0.01
            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) > 30 THEN
            VLRLIQ * 0.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE
            DHBAIXA
            - DTNEG END) - 30)
            ELSE
            0
            END AS GANHO_NEGOCIACAO,
            CASE
            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) = 30 THEN
            VLRLIQ * 1.01
            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) > 30 THEN
            VLRLIQ * 1.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE
            DHBAIXA
            - DTNEG END) - 30)
            ELSE
            VLRLIQ
            END AS VLRLIQ_COM_JUROS
            FROM
            (
    
            SELECT
            FIN.CODEMP,
            FIN.NUFIN,
            FIN.CODPARC,
            SUBSTR(UPPER(PAR.NOMEPARC), 1, 15) AS NOMEPARC,
            FIN.NUNOTA,
            FIN.DTNEG,
            FIN.DTVENC,
            FIN.DHBAIXA,
            FIN.DESDOBRAMENTO,
            (NVL(FIN.VLRDESDOB,0) + (CASE WHEN FIN.TIPMULTA = '1' THEN NVL(FIN.VLRMULTA,0) ELSE 0 END) +
            (CASE WHEN FIN.TIPJURO = '1' THEN NVL(FIN.VLRJURO,0) ELSE 0 END) + NVL(FIN.DESPCART,0) +
            NVL(FIN.VLRVENDOR,0) - NVL(FIN.VLRDESC,0) - (CASE WHEN FIN.IRFRETIDO = 'S' THEN
            NVL(FIN.VLRIRF,0) ELSE 0 END) - (CASE WHEN FIN.ISSRETIDO = 'S' THEN NVL(FIN.VLRISS,0) ELSE 0
            END) - (CASE WHEN FIN.INSSRETIDO = 'S' THEN NVL(FIN.VLRINSS,0) ELSE 0 END) -
            NVL(FIN.CARTAODESC,0) + NVL((SELECT ROUND(SUM(I.VALOR * I.TIPIMP),2) FROM TGFIMF I WHERE
            I.NUFIN
            = FIN.NUFIN),0) + NVL(FIN.VLRMULTANEGOC,0) + NVL(FIN.VLRJURONEGOC,0) -
            NVL(FIN.VLRMULTALIB,0) -
            NVL(FIN.VLRJUROLIB,0) + NVL(FIN.VLRVARCAMBIAL,0)) * NVL(FIN.RECDESP,0) VLRLIQ,
            CASE WHEN FIN.DHBAIXA IS NULL THEN FIN.DTVENC - FIN.DTNEG ELSE FIN.DHBAIXA - FIN.DTNEG END
            AS
            DIAS
            FROM TGFFIN FIN
            INNER JOIN TGFCAB CAB ON FIN.NUNOTA = CAB.NUNOTA
            INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
            INNER JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
            WHERE
            FIN.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
            AND FIN.RECDESP = -1
            AND FIN.NUNOTA IS NOT NULL
            AND CAB.TIPMOV = 'O'
            AND CAB.STATUSNOTA = 'L'
            AND USU.AD_USUCOMPRADOR = 'S'
            )
            )
    )
    GROUP BY CODEMP,PARCEIRO,PRODUTO,NUFIN,NUNOTA,DTNEG,DTVENC,DHBAIXA,COMPRADOR
    
    )



</snk:query>

<!-- Adicionar no <body> logo após a tag de abertura -->
    <div class="export-buttons">
        <button class="export-btn pdf-btn" onclick="gerarPDFCompleto()" title="Exportar PDF Completo">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 24 24">
                <path d="M6 2a2 2 0 0 0-2 2v16c0 1.104.896 2 2 2h12a2 2 0 0 0 2-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM7 13h1v-1h1.5a1 1 0 0 1 0 2H8v1H7v-3zm4.5 0H12v3h-1v-3zm2.5 0h2a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-2v-3zm1 1v1h1v-1h-1z"/>
            </svg>
        </button>
        
        <button class="export-btn excel-btn" onclick="exportarExcelCompleto()" title="Exportar Excel Completo">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="white" viewBox="0 0 24 24" style="vertical-align: middle;">
                <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8.6 12l-1.6 2.3L5.4 12H4.2l2.2 3L4.2 18h1.2l1.6-2.3L8.6 18h1.2l-2.2-3 2.2-3H8.6zM11 12h1v6h-1v-6zm2.5 0h1.1l.9 1.6.9-1.6h1.1l-1.5 2.6 1.5 2.4h-1.1l-1-1.6-1 1.6h-1.1l1.5-2.4-1.5-2.6z"/>
            </svg>
        </button>
    </div>   

    <div class="container-fluid tables-container">
        <div class="table-container">
            <!-- Primeira Tabela -->
            <table id="tabela1" class="table table-bordered">
                <thead>
                    <tr>
                        <th>Emp.</th>
                        <th>Parceiro</th>
                        <th>Produto</th>
                        <th>NÚ. Fin.</th>
                        <th>NÚ. Único</th>
                        <th>Dt. Neg.</th>
                        <th>Dt. Venc.</th>
                        <th>Dt. Baixa.</th>
                        <th>Comprador</th>
                        <th>Saving</th>
                        <th>Gan. Ev. Preço</th>
                        <th>Gan. Negociação</th>
                        <th>Total Economia</th>
                    </tr>
                </thead>
                <tbody>
                    <c:forEach items="${ganho_negcociacao_detalhe.rows}" var="row">
                        <tr>
                            <td>${row.CODEMP}</td>
                            <td>${row.PARCEIRO}</td>
                            <td>${row.PRODUTO}</td>
                            <td onclick="abrir_mov('${row.NUFIN}')">${row.NUFIN}</td>
                            <td onclick="abrir_portal('${row.NUNOTA}')">${row.NUNOTA}</td>
                            <td>${row.DTNEG}</td>
                            <td>${row.DTVENC}</td>
                            <td>${row.DHBAIXA}</td>
                            <td>${row.COMPRADOR}</td>
                            <td>
                                <fmt:formatNumber value="${row.SAVING}" type="number"
                                    maxFractionDigits="2" groupingUsed="true" />
                            </td>
                            <td>
                                <fmt:formatNumber value="${row.GANHO_EVOLUCAO}" type="number"
                                    maxFractionDigits="2" groupingUsed="true" />
                            </td>
                            <td>
                                <fmt:formatNumber value="${row.GANHO_NEGOCIACAO}" type="number"
                                    maxFractionDigits="2" groupingUsed="true" />
                            </td>   
                            <td>
                                <fmt:formatNumber value="${row.TOTAL_ECONOMIA}" type="number"
                                    maxFractionDigits="2" groupingUsed="true" />
                            </td>                                                         
                        </tr>
                        <c:set var="totalSaving" value="${totalSaving + row.SAVING}" />
                        <c:set var="totalVlrGanEvo" value="${totalVlrGanEvo + row.GANHO_EVOLUCAO}" />
                        <c:set var="totalVlrGanNeg" value="${totalVlrGanNeg + row.GANHO_NEGOCIACAO}" />                        
                        <c:set var="totalVlrTotEco" value="${totalVlrTotEco + row.TOTAL_ECONOMIA}" />                        
                    </c:forEach>
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="9"><strong>Total:</strong></td>
                        <td class="total-column">
                            <fmt:formatNumber value="${totalSaving}" type="currency"
                                maxFractionDigits="2" groupingUsed="true" />
                        </td>
                        <td class="total-column">
                            <fmt:formatNumber value="${totalVlrGanEvo}" type="currency"
                                maxFractionDigits="2" groupingUsed="true" />
                        </td>                        
                        <td class="total-column">
                            <fmt:formatNumber value="${totalVlrGanNeg}" type="currency"
                                maxFractionDigits="2" groupingUsed="true" />
                        </td>
                        <td class="total-column">
                            <fmt:formatNumber value="${totalVlrTotEco}" type="currency"
                                maxFractionDigits="2" groupingUsed="true" />
                        </td>                        
                    </tr>
                </tfoot>
            </table>
        </div>
    

    </div>

    <!-- Botões para gerar PDF 
    <button class="pdf-button left" onclick="gerarPDFTabela1()">Gerar PDF Tabela 1</button>
    <button class="pdf-button right" onclick="gerarPDFTabela2()">Gerar PDF Tabela 2</button>
        -->
    <script>
        // Inicializa o jsPDF
        const { jsPDF } = window.jspdf;

        function abrir_mov(nufin) {
            var params = {'NUFIN': nufin};
            var level = 'br.com.sankhya.fin.cad.movimentacaoFinanceira';
            openApp(level, params);
        }

        function abrir_portal(nunota) {
            var params = {'NUNOTA': nunota};
            var level = 'br.com.sankhya.com.mov.CentralNotas';
            openApp(level, params);
        }

// Função para gerar PDF com ambas as tabelas
function gerarPDFCompleto() {
    const doc = new jsPDF('l', 'pt');
    const tabela1 = document.getElementById('tabela1');
    
    
    // Título principal
    doc.setFontSize(16);
    doc.text("Relatório Total Economia", 40, 40);
    
    // Primeira tabela
    doc.setFontSize(12);
    doc.text("Detalhamento Saving + Evolução de Preço + Ganho Negociação = Total Economia", 40, 70);
    
    doc.autoTable({
        html: tabela1,
        startY: 90,
        styles: {
            fontSize: 8,
            cellPadding: 3,
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [40, 167, 69],
            textColor: 255
        }
    });
    
    
    doc.save('relatorio_total_economia.pdf');
}


function exportarExcelCompleto() {
    try {
        // Verifica se a biblioteca está disponível
        if (!window.XLSX) {
            alert("A biblioteca SheetJS não foi carregada corretamente!");
            return;
        }

        // Cria uma nova pasta de trabalho
        const workbook = XLSX.utils.book_new();

        // Processa a primeira tabela (Saving e Evolução)
        const table1 = document.getElementById('tabela1');
        if (table1) {
            // Converte a tabela HTML para worksheet mantendo os textos exatos
            const worksheet1 = XLSX.utils.table_to_sheet(table1, {raw: true});
            
            // Adiciona o título na primeira linha
            XLSX.utils.sheet_add_aoa(worksheet1, [["Detalhamento Saving + Evolução de Preço + Ganho Negociação = Total Economia"]], {origin: 'A1'});
            
            // Força o formato de texto para as colunas de data (Dt. Neg.)
            const dateCols1 = [5]; // Índice da coluna F (Dt. Neg.)
            for (let row = 2; ; row++) {
                const cell = XLSX.utils.encode_cell({c: 5, r: row});
                if (!worksheet1[cell]) break;
                worksheet1[cell].t = 's'; // Tipo string
            }
            
            // Formata as colunas numéricas
            worksheet1['!cols'] = [
                {}, {}, {}, {}, {},           // Colunas A-E
                {},                          // Coluna F (já tratada como texto)
                { numFmt: '#,##0.00' },      // Coluna G (Saving)
                { numFmt: '#,##0.00' }       // Coluna H (Ev. Preço)
            ];
            
            // Formata o título em negrito
            worksheet1['A1'].s = { font: { bold: true } };
            
            // Adiciona a planilha ao workbook
            XLSX.utils.book_append_sheet(workbook, worksheet1, "Total Economia");
        }



        // Gera o arquivo Excel
        XLSX.writeFile(workbook, 'relatorio_Total_economia.xlsx');

    } catch (error) {
        console.error("Erro ao exportar para Excel:", error);
        alert("Erro ao exportar: " + error.message);
    }
}

</script>
</body>
</html>