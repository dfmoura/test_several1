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
    <title>Tela de HL</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            font-family: Arial, sans-serif;
            background-color: #ffffff;
        }
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px; /* Ajuste do gap para aumentar o espaçamento vertical */
            width: 90%;
            height: 90%;
        }
        .section {
            display: flex;
            flex-direction: column;
            gap: 30px; /* Ajuste do gap para aumentar o espaçamento vertical */
        }
        .part {
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 20px;
            width: 100%;
            height: calc(50% - 20px); /* Ajuste da altura para refletir o novo gap */
            overflow: hidden; /* Impede que o conteúdo altere o tamanho da parte */
            position: relative; /* Necessário para posicionar o título */
            display: flex;
            flex-direction: column;
            justify-content: center; /* Centraliza verticalmente */
            align-items: center; /* Centraliza horizontalmente */
        }
        .part-title {
            position: absolute;
            top: 10px; /* Espaçamento do topo */
            left: 50%;
            transform: translateX(-50%);
            font-size: 18px;
            font-weight: bold;
            color: #333;
            background-color: #fff; /* Cor de fundo para legibilidade */
            padding: 0 10px; /* Espaçamento horizontal */
        }
        .chart-container {
            width: 80%; /* Ajuste da largura do gráfico */
            height: 80%; /* Ajuste da altura do gráfico */
            display: flex;
            justify-content: center; /* Centraliza horizontalmente o gráfico */
            align-items: center; /* Centraliza verticalmente o gráfico */
        }
        .dropdown-container {
            display: flex;
            justify-content: flex-start; /* Alinha o dropdown à esquerda */
            width: 100%;
        }
        .dropdown-container select {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
            width: 100%;
            max-width: 300px; /* Limita a largura máxima do dropdown */
        }
        canvas {
            width: 100% !important;
            height: 100% !important;
        }
        /* Estilo para a tabela */
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
    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">
    <snk:load/>

</head>
<body>

    <snk:query var="hl_tipo">
    SELECT
    NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD
    , ROUND(SUM(FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END), 2) AS HL 
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    WHERE TOP.GOLSINAL = -1
    
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)

    AND CAB.CODEMP IN (:P_EMPRESA)
    AND CAB.CODNAT IN (:P_NATUREZA)
    AND CAB.CODCENCUS IN (:P_CR)
    AND CAB.CODVEND IN (:P_VENDEDOR)
    AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
    AND VEN.CODGER IN (:P_GERENTE)
    AND VEN.AD_ROTA IN (:P_ROTA)

    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    GROUP BY NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO')
</snk:query>


<snk:query var="hl_ger">
    SELECT GERENTE, SUM(HL) AS HL FROM(
        SELECT
        DECODE(VEN1.APELIDO, '<SEM VENDEDOR>', 'NAO INFORMADO', VEN1.APELIDO) AS GERENTE
        , NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD    
        , ROUND(SUM(FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END), 2) AS HL 
        FROM TGFCAB CAB
        INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
        INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
        INNER JOIN TGFVEN VEN1 ON VEN.CODGER = VEN1.CODVEND
        INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
        WHERE TOP.GOLSINAL = -1
        
        AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
        AND CAB.CODEMP IN (:P_EMPRESA)
        AND CAB.CODNAT IN (:P_NATUREZA)
        AND CAB.CODCENCUS IN (:P_CR)
        AND CAB.CODVEND IN (:P_VENDEDOR)
        AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
        AND VEN.CODGER IN (:P_GERENTE)
        AND VEN.AD_ROTA IN (:P_ROTA)
        AND TOP.TIPMOV IN ('V', 'D')
        AND TOP.ATIVO = 'S'
        GROUP BY 
        VEN1.APELIDO
        , NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO')
        ORDER BY 3 DESC) WHERE TIPOPROD = :A_TIPOPROD GROUP BY GERENTE ORDER BY 2 DESC
</snk:query>

<snk:query var="hl_cli">
    SELECT CLIENTE,SUM(HL) HL FROM(
    SELECT
    SUBSTR(PAR.RAZAOSOCIAL, 1, 15) AS CLIENTE
    , NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD    
    , ROUND(SUM(FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END), 2) AS HL 
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
    INNER JOIN TGFVEN VEN1 ON VEN.CODGER = VEN1.CODVEND
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
    WHERE TOP.GOLSINAL = -1    
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
    AND CAB.CODEMP IN (:P_EMPRESA)
    AND CAB.CODNAT IN (:P_NATUREZA)
    AND CAB.CODCENCUS IN (:P_CR)
    AND CAB.CODVEND IN (:P_VENDEDOR)
    AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
    AND VEN.CODGER IN (:P_GERENTE)
    AND VEN.AD_ROTA IN (:P_ROTA)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    GROUP BY PAR.RAZAOSOCIAL, NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO')
    ORDER BY 3 DESC) WHERE ROWNUM < 11 AND TIPOPROD = :A_TIPOPROD GROUP BY CLIENTE ORDER BY 2 DESC
</snk:query>    


<snk:query var="hl_produto">
    SELECT PRODUTO,SUM(HL) HL FROM (
        SELECT
        ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO
        , NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD    
        , ROUND(SUM(FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END), 2) AS HL 
        FROM TGFCAB CAB
        INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
        INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
        INNER JOIN TGFVEN VEN1 ON VEN.CODGER = VEN1.CODVEND
        INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
        INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
        WHERE TOP.GOLSINAL = -1
        
        AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
        
        AND CAB.CODEMP IN (:P_EMPRESA)
        AND CAB.CODNAT IN (:P_NATUREZA)
        AND CAB.CODCENCUS IN (:P_CR)
        AND CAB.CODVEND IN (:P_VENDEDOR)
        AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
        AND VEN.CODGER IN (:P_GERENTE)
        AND VEN.AD_ROTA IN (:P_ROTA)
        
        AND TOP.TIPMOV IN ('V', 'D')
        AND TOP.ATIVO = 'S'
        GROUP BY ITE.CODPROD||'-'||PRO.DESCRPROD, NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO')
        ) WHERE TIPOPROD = :A_TIPOPROD GROUP BY PRODUTO ORDER BY 2 DESC
</snk:query>



    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">HL por Tipo Produto</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div class="part-title">HL Por Gerente</div>
                <div class="chart-container">
                    <canvas id="barChart"></canvas>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div class="part-title">HL Por Cliente</div>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div class="part-title">HL por Produto</div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>HL</th>
                            </tr>
                        </thead>
                        <tbody>
                            <c:set var="total" value="0" />
                            <c:forEach var="item" items="${hl_produto.rows}">
                                <tr>
                                    <td>${item.PRODUTO}</td>
                                    <td><fmt:formatNumber value="${item.HL}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <c:set var="total" value="${total + item.HL}" />
                                </tr>
                            </c:forEach>
                            <tr>
                                <td><b>Total</b></td>
                                <td><b><fmt:formatNumber value="${total}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></b></td>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Adicionando a biblioteca Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Adicionando a biblioteca jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- Adicionando a biblioteca DataTables -->
    <script src="https://cdn.datatables.net/1.12.1/js/jquery.dataTables.min.js"></script>
    <script>

   // Função para atualizar a query
   function ref_hl(tipoprod) {
        const params = {'A_TIPOPROD': tipoprod};
        refreshDetails('html5_a73fhg9', params); 
    }          

        // Obtendo os dados da query JSP para o gráfico de rosca

        var hlTipoLabel = [];
        var hlTipoData = [];
        <c:forEach items="${hl_tipo.rows}" var="row">
            hlTipoLabel.push('${row.TIPOPROD}');
            hlTipoData.push('${row.HL}');
        </c:forEach>
    
        // Dados fictícios para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: hlTipoLabel,
                datasets: [{
                    label: 'HL',
                    data: hlTipoData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Remove a legenda
                    }
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var label = hlTipoLabel[index];
                        ref_hl(label);
                        alert(label);
                    }
                }
            }
        });

        // Dados fictícios para o gráfico de barras verticais

        var gerHlLabels = [];
        var gerHlData = [];

        <c:forEach items="${hl_ger.rows}" var="row">
            gerHlLabels.push('${row.GERENTE}');
            gerHlData.push('${row.HL}');
        </c:forEach> 

        const ctxBar = document.getElementById('barChart').getContext('2d');
        const barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: gerHlLabels,
                datasets: [{
                    label: 'HL por Gerente',
                    data: gerHlData,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Remove a legenda
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Dados fictícios para o gráfico de colunas verticais

        var clienteLabels = [];
        var clienteData = [];

        <c:forEach items="${hl_cli.rows}" var="row">
            clienteLabels.push('${row.CLIENTE}');
            clienteData.push('${row.HL}');
        </c:forEach>         

        const ctxBarRight = document.getElementById('barChartRight').getContext('2d');
        const barChartRight = new Chart(ctxBarRight, {
            type: 'bar',
            data: {
                labels: clienteLabels,
                datasets: [{
                    label: 'HL por Cliente',
                    data: clienteData,
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Remove a legenda
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });




        
    </script>
</body>
</html>
