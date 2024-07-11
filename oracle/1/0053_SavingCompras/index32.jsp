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
    <title>Resizable Page with Plotly.js</title>
    <!-- Importando Plotly.js -->
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <!-- Estilos CSS -->
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        .section {
            flex: 1;
            display: flex;
            flex-direction: column;
            margin: 10px;
            border: 1px solid #ccc;
            overflow: hidden;
        }
        .chart {
            flex: 1;
        }
    </style>

    <snk:load/>
</head>
<body>

    <snk:query var="ganhNegoc_cr">
        WITH BAS AS (
            SELECT ROWNUM AS A, CR, GANHO_NEGOCIACAO FROM (
            SELECT CR, SUM(GANHO_NEGOCIACAO) AS GANHO_NEGOCIACAO FROM (
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
            ))WHERE GANHO_NEGOCIACAO > 0 GROUP BY CR ORDER BY GANHO_NEGOCIACAO DESC))
            SELECT CR,GANHO_NEGOCIACAO FROM BAS WHERE A < 10
            UNION ALL 
            SELECT 'OUTROS' AS CR, SUM(GANHO_NEGOCIACAO) AS GANHO_NEGOCIACAO FROM BAS WHERE A >= 10
            



    
    </snk:query>
      
      <snk:query var="ganhNegoc_Par">

      WITH BAS AS (
        SELECT ROWNUM AS A, PARCEIRO, GANHO_NEGOCIACAO FROM (
        SELECT PARCEIRO, SUM(GANHO_NEGOCIACAO) AS GANHO_NEGOCIACAO FROM (
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
        ))WHERE GANHO_NEGOCIACAO > 0 GROUP BY PARCEIRO ORDER BY GANHO_NEGOCIACAO DESC))
        SELECT PARCEIRO,GANHO_NEGOCIACAO FROM BAS WHERE A < 10
        UNION ALL 
        SELECT 'OUTROS' AS PARCEIRO, SUM(GANHO_NEGOCIACAO) AS GANHO_NEGOCIACAO FROM BAS WHERE A >= 10
              

      </snk:query>

    <div class="container">
        <div class="section">
            <h2>CR's Com Maior Ganho Por Condição de Pagto</h2>
            <div id="chart1" class="chart"></div>
        </div>
        <div class="section">
            <h2>Parceiro's Com Maior Ganho Por Condição de Pagto</h2>
            <div id="chart2" class="chart"></div>
        </div>
    </div>
    
    <!-- Script JavaScript -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Dados dos fornecedores vindos das consultas
            var productData = [
                <c:forEach var="row" items="${ganhNegoc_cr.rows}">
                    { supplier: '${row.CR}', saving: ${row.GANHO_NEGOCIACAO} },
                </c:forEach>
            ];

            // Ordenando os dados por saving de forma decrescente
            productData.sort((a, b) => b.saving - a.saving);

            // Função para criar o gráfico de barras
            function createBarChart(containerId, data, title) {
                var labels = data.map(item => item.product || item.supplier);
                var values = data.map(item => item.saving);

                var trace = {
                    x: values,
                    y: labels,
                    type: 'bar',
                    orientation: 'h',
                    marker: {
                        color: '#28a745',
                        width: 0.5
                    }
                };

                var layout = {
                    
                    margin: { l: 180, r: 20, t: 40, b: 50 }
                };

                Plotly.newPlot(containerId, [trace], layout);
            }

            // Chamando a função para criar o gráfico
            createBarChart('chart1', productData.reverse());

            // Adicionar evento de redimensionamento para o gráfico
            window.addEventListener('resize', function() {
                Plotly.Plots.resize('chart1');
            });
        });
    </script>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Dados dos fornecedores vindos das consultas
        var parceiroData = [
            <c:forEach var="row" items="${ganhNegoc_Par.rows}">
                { supplier: '${row.PARCEIRO}', saving: ${row.GANHO_NEGOCIACAO} },
            </c:forEach>
        ];

        // Ordenando os dados por saving de forma decrescente
        parceiroData.sort((a, b) => b.saving - a.saving);

        // Função para criar o gráfico de barras
        function createBarChart(containerId, data, title) {
            var labels = data.map(item => item.parceiro || item.supplier);
            var values = data.map(item => item.saving);

            var trace = {
                x: values,
                y: labels,
                type: 'bar',
                orientation: 'h',
                marker: {
                    color: '#28a745',
                    width: 1
                }
            };

            var layout = {
                
                margin: { l: 180, r: 20, t: 40, b: 50 }
            };

            Plotly.newPlot(containerId, [trace], layout);
        }

        // Chamando a função para criar o gráfico
        createBarChart('chart2', parceiroData.reverse());

        // Adicionar evento de redimensionamento para o gráfico
        window.addEventListener('resize', function() {
            Plotly.Plots.resize('chart2');
        });
    });
</script>

</body>
</html>
