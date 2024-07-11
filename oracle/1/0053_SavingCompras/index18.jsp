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

    <snk:query var="saving_produto">
        SELECT
        PRODUTO,SAVING
        FROM
        (
        WITH
            BAS AS (
            SELECT ROWNUM,PRODUTO, SUM(SAVING) AS SAVING
            FROM (

            SELECT 
                   ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO,
                   ITE.VLRDESC AS SAVING
            
              FROM TGFITE ITE
              INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
              INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
              INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER))
              INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
              INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
              INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
              INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
             WHERE CAB.TIPMOV = 'O'
               AND CAB.STATUSNOTA = 'L'
               AND USU.AD_USUCOMPRADOR = 'S'
               AND ITE.VLRDESC > 0
               AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN 
        
        
               )
        
        GROUP BY ROWNUM,PRODUTO ORDER BY 3 DESC),
        BAS2 AS ( SELECT ROWNUM AS A,PRODUTO, SAVING FROM BAS ORDER BY 3 DESC)
        SELECT PRODUTO, SAVING FROM BAS2 WHERE A <= 10
        UNION ALL
        SELECT 'OUTROS' AS PRODUTO, SUM(SAVING) AS SAVING FROM BAS2 WHERE A > 10
        )
        ORDER BY SAVING DESC
    
    </snk:query>
      
      <snk:query var="saving_fornecedor">
        SELECT
        PARCEIRO,SAVING
        FROM
        (
        WITH
            BAS AS (
            SELECT ROWNUM,PARCEIRO, SUM(SAVING) AS SAVING
            FROM (

            SELECT 
                   CAB.CODPARC||'-'||UPPER(PAR.RAZAOSOCIAL) AS PARCEIRO,
                   ITE.VLRDESC AS SAVING
            
              FROM TGFITE ITE
              INNER JOIN TGFPRO PRO ON (ITE.CODPROD = PRO.CODPROD)
              INNER JOIN TGFCAB CAB ON (ITE.NUNOTA = CAB.NUNOTA)
              INNER JOIN TGFTOP TOP ON ( CAB.CODTIPOPER = TOP.CODTIPOPER AND CAB.DHTIPOPER = ( SELECT MAX (TOP.DHALTER) FROM TGFTOP WHERE CODTIPOPER = TOP.CODTIPOPER))
              INNER JOIN TGFVEN VEN ON (CAB.CODVEND = VEN.CODVEND)
              INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
              INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
              INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
             WHERE CAB.TIPMOV = 'O'
               AND CAB.STATUSNOTA = 'L'
               AND USU.AD_USUCOMPRADOR = 'S'
               AND ITE.VLRDESC > 0
               AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN 
        
        
               )
        
        GROUP BY ROWNUM,PARCEIRO ORDER BY 3 DESC),
        BAS2 AS ( SELECT ROWNUM AS A,PARCEIRO, SAVING FROM BAS ORDER BY 3 DESC)
        SELECT PARCEIRO, SAVING FROM BAS2 WHERE A <= 10
        UNION ALL
        SELECT 'OUTROS' AS PARCEIRO, SUM(SAVING) AS SAVING FROM BAS2 WHERE A > 10
        )
        ORDER BY SAVING DESC
      
      </snk:query>

    <div class="container">
        <div class="section">
            <h2>Produtos que tiveram maior saving</h2>
            <div id="chart1" class="chart"></div>
        </div>
        <div class="section">
            <h2>Fornecedores que tiveram maior saving</h2>
            <div id="chart2" class="chart"></div>
        </div>
    </div>
    
    <!-- Script JavaScript -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Dados dos fornecedores vindos das consultas
            var productData = [
                <c:forEach var="row" items="${saving_produto.rows}">
                    { supplier: '${row.PRODUTO}', saving: ${row.SAVING} },
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
            <c:forEach var="row" items="${saving_fornecedor.rows}">
                { supplier: '${row.PARCEIRO}', saving: ${row.SAVING} },
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
