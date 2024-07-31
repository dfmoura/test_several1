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
    <title>Página com Cards</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.3/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.3/js/dataTables.bootstrap5.min.js"></script>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.3/css/jquery.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.3/css/dataTables.bootstrap5.min.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            height: 100vh;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .container {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            padding: 10px;
        }

        .half-row {
            display: flex;
            flex: 1;
            gap: 10px;
            height: 50%;
        }

        .column {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .card {
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 20px;
            margin: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            overflow: hidden;
            position: relative;
        }

        .card h2 {
            margin: 0 0 10px;
            font-size: 1.2em;
            align-self: flex-start;
        }

        .chart-container {
            position: relative;
            width: 100%;
            height: 80%; /* Reduzido em 20% */
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        canvas, .plotly-chart {
            width: 100%;
            height: 100%;
        }

        .dataTables_wrapper {
            width: 100%;
            height: 100%;
        }

        table {
            width: 100%;
            height: 100%;
        }


        .table-container {
            width: 100%; /* Largura da tabela ajustada para o contêiner */
            height: 100%;
            max-height: 200px; /* Define a altura máxima para o contêiner da tabela */
            overflow-y: auto; /* Habilita a rolagem vertical */
            overflow-x: hidden; /* Desabilita a rolagem horizontal */
            padding-right: 10px; /* Espaço para evitar o corte do conteúdo na rolagem */
        }
        .table-container table {
            width: 100%;
            border-collapse: collapse;
        }
        .table-container th, .table-container td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
        }
        .table-container th {
            background-color: #f4f4f4;
            position: sticky;
            top: 0; /* Fixa o cabeçalho no topo ao rolar */
            z-index: 2; /* Garante que o cabeçalho fique sobre o conteúdo */
        }
        .table-container tr:hover {
            background-color: #f1f1f1;
        }        
    </style>
<snk:load/>    
</head>
<body>

    <snk:query var="custo_tipo">  

    SELECT 
    NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD,
    NVL(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (CUS.CUSSEMICM * ITE.QTDNEG)*-1 ELSE (CUS.CUSSEMICM * ITE.QTDNEG) END),0) AS VLRCMV
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(DTATUAL)FROM TGFCUS WHERE DTATUAL <= CAB.DTNEG AND CODPROD = ITE.CODPROD AND CODEMP = CAB.CODEMP)
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
    INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
    
    WHERE TOP.GOLSINAL = -1 AND TOP.TIPMOV IN ('V', 'D') AND TOP.ATIVO = 'S'
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN) 
    
    AND CAB.CODEMP IN (:P_EMPRESA) 
    AND CAB.CODNAT IN (:P_NATUREZA)
    AND CAB.CODCENCUS IN (:P_CR)
    AND CAB.CODVEND IN (:P_VENDEDOR)
    AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
    AND VEN.CODGER IN (:P_GERENTE)
    AND VEN.AD_ROTA IN (:P_ROTA)
    
    GROUP BY NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO')
</snk:query>   

<snk:query var="custo_produto">  
        SELECT PRODUTO,SUM(VLRCMV) AS VLRCMV FROM(
        SELECT 
        ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO,
        NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD,
        NVL(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (CUS.CUSSEMICM * ITE.QTDNEG)*-1 ELSE (CUS.CUSSEMICM * ITE.QTDNEG) END),0) AS VLRCMV
        FROM TGFCAB CAB
        INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(DTATUAL)FROM TGFCUS WHERE DTATUAL <= CAB.DTNEG AND CODPROD = ITE.CODPROD AND CODEMP = CAB.CODEMP)
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
        INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
        INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
        INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
        INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
        
        WHERE TOP.GOLSINAL = -1 AND TOP.TIPMOV IN ('V', 'D') AND TOP.ATIVO = 'S'
        AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN) 
        
        AND CAB.CODEMP IN (:P_EMPRESA) 
        AND CAB.CODNAT IN (:P_NATUREZA)
        AND CAB.CODCENCUS IN (:P_CR)
        AND CAB.CODVEND IN (:P_VENDEDOR)
        AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
        AND VEN.CODGER IN (:P_GERENTE)
        AND VEN.AD_ROTA IN (:P_ROTA)
        
        GROUP BY ITE.CODPROD||'-'||PRO.DESCRPROD,NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO'))
        WHERE TIPOPROD = :A_TIPOPROD GROUP BY PRODUTO ORDER BY 2 DESC
</snk:query> 

<snk:query var="custo_detalhe">
        SELECT NUNOTA,PRODUTO,SUM(VLRCMV) AS VLRCMV FROM(
        SELECT 
        CAB.NUNOTA,
        ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO,
        NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD,
        NVL(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (CUS.CUSSEMICM * ITE.QTDNEG)*-1 ELSE (CUS.CUSSEMICM * ITE.QTDNEG) END),0) AS VLRCMV
        FROM TGFCAB CAB
        INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(DTATUAL)FROM TGFCUS WHERE DTATUAL <= CAB.DTNEG AND CODPROD = ITE.CODPROD AND CODEMP = CAB.CODEMP)
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
        INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
        INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
        INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
        INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
        WHERE TOP.GOLSINAL = -1 AND TOP.TIPMOV IN ('V', 'D') AND TOP.ATIVO = 'S'
        AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN) 
        AND CAB.CODEMP IN (:P_EMPRESA) 
        AND CAB.CODNAT IN (:P_NATUREZA)
        AND CAB.CODCENCUS IN (:P_CR)
        AND CAB.CODVEND IN (:P_VENDEDOR)
        AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
        AND VEN.CODGER IN (:P_GERENTE)
        AND VEN.AD_ROTA IN (:P_ROTA)
        GROUP BY CAB.NUNOTA,ITE.CODPROD||'-'||PRO.DESCRPROD,NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO'))
        WHERE TIPOPROD = :A_TIPOPROD 
        GROUP BY NUNOTA,PRODUTO 
        ORDER BY 3 DESC

</snk:query> 

    <div class="container">
        <div class="half-row">
            <div class="column">
                <div class="card">
                    <h2>Custo Médio por Grupo de Produto</h2>
                    <div class="chart-container">
                        <canvas id="donutChart"></canvas>
                    </div>
                </div>
            </div>
            <div class="column">
                <div class="card">
                    <h2>Produtos por grupo de produto</h2>
                    <div class="chart-container">
                        <div id="lineChart" class="plotly-chart"></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="half-row">
            <div class="column">
                <div class="card">
                    <h2>Detalhamento</h2>
                    <div class="table-container">
                        <table id="motivo_prod_table">
                            <thead>
                                <tr>
                                    <th>NÚ. Único</th>
                                    <th>Produto</th>
                                    <th>Custo Médio</th>
                                </tr>
                            </thead>
                            <tbody>
                                <c:set var="total" value="0" />
                                <c:forEach var="item" items="${custo_detalhe.rows}">
                                    <tr>
                                        <td onclick="abrir_portal('${row.NUNOTA}')">${item.NUNOTA}</td>
                                        <td>${item.PRODUTO}</td>
                                        <td><fmt:formatNumber value="${item.VLRCMV}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                        <c:set var="total" value="${total + item.VLRCMV}" />
                                    </tr>
                                </c:forEach>
                                <tr>
                                    <td><b>Total</b></td>
                                    <td></td>
                                    <td><b><fmt:formatNumber value="${total}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></b></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>


   // Função para atualizar a query
   function ref_cus(tipoprod) {
        const params = {'A_TIPOPROD': tipoprod};
        refreshDetails('html5_a73fhga', params); 
    }       


   // Função para abrir tela

    function abrir_portal(nunota) {
            var params = {'A_NUNOTA': nunota};
            var level = 'br.com.sankhya.com.mov.CentralNotas';
            openApp(level, params);
        }    


        // Obtendo os dados da query JSP para o gráfico de rosca

        var cusTipoLabel = [];
        var cusTipoData = [];
        <c:forEach items="${custo_tipo.rows}" var="row">
            cusTipoLabel.push('${row.TIPOPROD}');
            cusTipoData.push('${row.VLRCMV}');
        </c:forEach>

        // Gráfico de Rosca com Chart.js
        const ctx = document.getElementById('donutChart').getContext('2d');
        const donutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: cusTipoLabel,
                datasets: [{
                    data: cusTipoData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.4)', 
                        'rgba(54, 162, 235, 0.4)', 
                        'rgba(255, 206, 86, 0.4)', 
                        'rgba(75, 192, 192, 0.4)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)', 
                        'rgba(54, 162, 235, 1)', 
                        'rgba(255, 206, 86, 1)', 
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var label = cusTipoLabel[index];
                        ref_cus(label);
                        alert(label);
                    }
                }
            }
        });

        // Obtendo os dados da query JSP para o gráfico de rosca

        var cusProdLabels = [];
        var cusProdData = [];
        <c:forEach items="${custo_produto.rows}" var="row">
            cusProdLabels.push('${row.PRODUTO}');
            cusProdData.push('${row.VLRCMV}');
        </c:forEach>

        // Gráfico de Barra com Plotly.js
        const trace1 = {
            x: cusProdLabels,
            y: cusProdData,
            type: 'bar',
            
            line: { color: '#17BECF' },
            text: cusProdLabels, // Dicas com o nome do produto
            hoverinfo: 'x+y+text' // Informações exibidas ao passar o mouse            
        };

        const data = [trace1];

        const layout = {
            margin: { t: 0, l: 0, r: 0, b: 0 },
            legend: { display: false },
            xaxis: { fixedrange: true },
            yaxis: { fixedrange: true }
        };

        Plotly.newPlot('lineChart', data, layout, { responsive: true });
        

        // Inicialização da DataTable com mais opções
        $(document).ready(function() {
            $('#dataTable').DataTable({
                responsive: true,
                paging: true,
                searching: true,
                ordering: true,
                lengthMenu: [ [10, 25, 50, -1], [10, 25, 50, "Todos"] ],
                pageLength: 10,
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/Portuguese.json'
                },
                dom: 'lBfrtip',
                buttons: [
                    'copy', 'excel', 'pdf', 'print'
                ]
            });
        });
    </script>
</body>
</html>
