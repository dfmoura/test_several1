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
    <title>Pie Chart</title>
    <!-- Importando o Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Estilos CSS internos para manter tudo em um único arquivo -->
    <style>
        body, html {
            height: 100%;
            margin: 0;
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #f0f0f0;
        }
        .card {
            flex: 1;
            padding: 20px;
            overflow: hidden;
            position: relative;
            background-color: #f0f0f0;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            border-radius: 10px;
            margin: 20px;
            transition: all 0.3s ease;
        }
        .card:hover {
            transform: scale(1.05);
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
        }        
        .chart-title {
            text-align: center;
            margin-bottom: 20px;
            font-size: 24px;
            color: #333;
        }
        .chart {
            width: 100%;
            height: 400px;
        }
    </style>
    <snk:load/>
</head>
<body>
    <snk:query var="ganhoNegoc_comprador">
        
    WITH BAS AS (
        SELECT ROWNUM AS A, USUARIO_INC, GANHO_NEGOCIACAO FROM (
        SELECT USUARIO_INC , SUM(GANHO_NEGOCIACAO) AS GANHO_NEGOCIACAO FROM (
        SELECT
        CODEMP,
        PARCEIRO,
        COMPRADOR,
        USUARIO_INC,
        CR,
        NUNOTA,
        TO_CHAR(DTNEG,'DD-MM-YYYY') AS DTNEG,
        TO_CHAR(DTVENC,'DD-MM-YYYY') AS DTVENC,
        TO_CHAR(DHBAIXA,'DD-MM-YYYY') AS DHBAIXA,
        PARCELA,
        CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END AS DIAS,
        ABS(VLRLIQ) AS VLRLIQ,
        
            ABS(CASE 
            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) = 30 THEN 
                VLRLIQ * 0.01
            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) > 30 THEN 
                VLRLIQ * 0.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) - 30)
            ELSE 
                0
            END) AS GANHO_NEGOCIACAO,
            ABS(CASE 
            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) = 30 THEN 
                VLRLIQ * 1.01
            WHEN (CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) > 30 THEN 
                VLRLIQ * 1.01 + VLRLIQ * 0.00033 * ((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) - 30)
            ELSE 
                VLRLIQ
            END) AS VLRLIQ_COM_JUROS
        FROM
        (
        SELECT 
        FIN.CODEMP,
        SUBSTR(CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL), 1, 20) AS PARCEIRO,
        SUBSTR(VEN.CODVEND||'-'||VEN.APELIDO,1,10) AS COMPRADOR,
        SUBSTR(CAB.CODUSUINC||'-'||USU.NOMEUSU,1,10) AS USUARIO_INC,
        FIN.CODCENCUS||'-'||CUS.DESCRCENCUS AS CR,
        FIN.NUNOTA,
        FIN.DTNEG,
        FIN.DTVENC,
        FIN.DHBAIXA,
        FIN.DESDOBRAMENTO AS PARCELA,
        (NVL(FIN.VLRDESDOB,0) + (CASE WHEN FIN.TIPMULTA = '1' THEN NVL(FIN.VLRMULTA,0) ELSE 0 END) + (CASE WHEN FIN.TIPJURO = '1' THEN NVL(FIN.VLRJURO,0) ELSE 0 END) + NVL(FIN.DESPCART,0) + NVL(FIN.VLRVENDOR,0) - NVL(FIN.VLRDESC,0) - (CASE WHEN FIN.IRFRETIDO = 'S' THEN NVL(FIN.VLRIRF,0) ELSE 0 END) - (CASE WHEN FIN.ISSRETIDO = 'S' THEN NVL(FIN.VLRISS,0) ELSE 0 END) - (CASE WHEN FIN.INSSRETIDO = 'S' THEN NVL(FIN.VLRINSS,0) ELSE 0 END) - NVL(FIN.CARTAODESC,0) + NVL((SELECT ROUND(SUM(I.VALOR * I.TIPIMP),2) FROM TGFIMF I WHERE I.NUFIN = FIN.NUFIN),0) + NVL(FIN.VLRMULTANEGOC,0) + NVL(FIN.VLRJURONEGOC,0) - NVL(FIN.VLRMULTALIB,0) - NVL(FIN.VLRJUROLIB,0) + NVL(FIN.VLRVARCAMBIAL,0)) * NVL(FIN.RECDESP,0) VLRLIQ,
        CASE WHEN FIN.DHBAIXA IS NULL THEN FIN.DTVENC - FIN.DTNEG ELSE FIN.DHBAIXA - FIN.DTNEG END AS DIAS
        FROM TGFFIN FIN
        INNER JOIN TGFCAB CAB ON FIN.NUNOTA = CAB.NUNOTA
        INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
        INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
        INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
        LEFT JOIN TSICUS CUS ON FIN.CODCENCUS = CUS.CODCENCUS
        WHERE FIN.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN 
        AND FIN.RECDESP = -1
        AND FIN.NUNOTA IS NOT NULL
        AND CAB.TIPMOV = 'O'
        AND CAB.STATUSNOTA = 'L'
        AND USU.AD_USUCOMPRADOR = 'S'
        ))WHERE GANHO_NEGOCIACAO > 0 GROUP BY USUARIO_INC ORDER BY GANHO_NEGOCIACAO DESC))
        SELECT USUARIO_INC AS COMPRADOR,GANHO_NEGOCIACAO FROM BAS    


    </snk:query>

    <div class="card">
        <div class="chart-title">Ganho Condição de Pagamento por Comprador</div>
        <canvas id="chart"></canvas>
    </div>

    <!-- JavaScript para criar o gráfico -->
    <script>
        // Definindo tons de cor
        const colors = [
            'rgba(126,32,64,0.79)',
            'rgba(64,156,204,0.96)',
            'rgba(211,116,48,0.94)',
            'rgba(66,190,138,0.82)',
            'rgba(211,116,48,0.94)',
            'rgba(126,32,64,0.79)'
        ];

        // Função para criar um gráfico de pizza com Chart.js
        function createPieChart(ctx, labels, data, title) {
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors.slice(0, data.length)
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                        },
                        title: {
                            display: false,
                            text: title
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    let sum = context.dataset.data.reduce((a, b) => a + b, 0);
                                    let value = context.raw;
                                    let percentage = ((value / sum) * 100).toFixed(2);
                                    let formattedValue = new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
                                    label += formattedValue + ' (' + percentage + '%)';
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Obtendo dados do JSP para o gráfico (Saving por Comprador)
        var labels = [
            <c:forEach var="row" items="${ganhoNegoc_comprador.rows}">
                '${row.COMPRADOR}'<c:if test="${!loop.last}">,</c:if>
            </c:forEach>
        ];

        var data = [
            <c:forEach var="row" items="${ganhoNegoc_comprador.rows}">
                ${row.GANHO_NEGOCIACAO}<c:if test="${!loop.last}">,</c:if>
            </c:forEach>
        ];

        // Criando gráfico de pizza
        window.onload = function() {
            var ctx = document.getElementById('chart').getContext('2d');
            createPieChart(ctx, labels, data, 'Saving por Comprador');
        };
    </script>
</body>
</html>
