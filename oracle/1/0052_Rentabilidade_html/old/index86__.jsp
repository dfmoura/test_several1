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
    <title>Tela de Despesa Operacional</title>
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

<snk:query var="do_emp">
    SELECT 
    VGF.CODEMP||'-'||EMP.NOMEFANTASIA AS CODEMP,
    ROUND(SUM(VGF.VLRBAIXA),2) * -1 AS VLRDO
    FROM VGF_RESULTADO_GM VGF
    INNER JOIN TSIEMP EMP ON VGF.CODEMP = EMP.CODEMP
    WHERE 
    VGF.AD_TIPOCUSTO NOT LIKE 'N' 
    AND VGF.CODCENCUS NOT BETWEEN 2500000 AND 2599999  
    AND VGF.RECDESP = -1 
    AND SUBSTR(VGF.codnat, 1, 1) <> '9'
    AND VGF.DHBAIXA IS NOT NULL 
    AND (VGF.DHBAIXA BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
    AND VGF.CODEMP IN (:P_EMPRESA) 
    AND VGF.CODNAT IN (:P_NATUREZA) 
    AND VGF.CODCENCUS IN (:P_CR)
    GROUP BY VGF.CODEMP||'-'||EMP.NOMEFANTASIA
</snk:query>


<snk:query var="do_nat">
    SELECT NATUREZA,VLRDO 
    FROM (
        SELECT 
        VGF.CODNAT||'-'||VGF.DESCRNAT AS NATUREZA,
        ROUND(SUM(VGF.VLRBAIXA),2) * -1 AS VLRDO
        FROM VGF_RESULTADO_GM VGF
        INNER JOIN TSIEMP EMP ON VGF.CODEMP = EMP.CODEMP
        WHERE 
        VGF.AD_TIPOCUSTO NOT LIKE 'N' 
        AND VGF.CODCENCUS NOT BETWEEN 2500000 AND 2599999  
        AND VGF.RECDESP = -1 
        AND SUBSTR(VGF.codnat, 1, 1) <> '9'
        AND VGF.DHBAIXA IS NOT NULL 
        AND (VGF.DHBAIXA BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
        AND CODEMP IN (:P_EMPRESA) 
        AND CODNAT IN (:P_NATUREZA) 
        AND CODCENCUS IN (:P_CR)
        AND VGF.CODEMP||'-'||EMP.NOMEFANTASIA = :A_EMPRESA
        GROUP BY VGF.CODNAT||'-'||VGF.DESCRNAT
        ORDER BY 2 DESC)
    WHERE ROWNUM < 11

</snk:query>

<snk:query var="do_cli">
    SELECT CLIENTE,VLRDO FROM(
        WITH
        DOP AS(
        SELECT 1 AS COD, ROUND(SUM(VLRBAIXA),2) * -1 AS VLRDO
        FROM VGF_RESULTADO_GM
        WHERE 
        AD_TIPOCUSTO NOT LIKE 'N' 
        AND CODCENCUS NOT BETWEEN 2500000 AND 2599999  
        AND RECDESP = -1 
        AND SUBSTR(codnat, 1, 1) <> '9'
        AND DHBAIXA IS NOT NULL 
        AND (DHBAIXA BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
        AND CODEMP IN (:P_EMPRESA) 
        AND CODNAT IN (:P_NATUREZA) 
        AND CODCENCUS IN (:P_CR)
        ),
        FAT AS (
        SELECT
        1 AS COD
        , NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD
        , DECODE(VEN1.APELIDO, '<SEM VENDEDOR>', 'NAO INFORMADO', VEN1.APELIDO) AS GERENTE
        , SUBSTR(PAR.RAZAOSOCIAL, 1, 15) AS CLIENTE
        , ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
        ,   ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) 
                / SUM(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END)) 
                  OVER (), 4)  AS PERC_PARTICIPACAO
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
        GROUP BY NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO'),DECODE(VEN1.APELIDO, '<SEM VENDEDOR>', 'NAO INFORMADO', VEN1.APELIDO),SUBSTR(PAR.RAZAOSOCIAL, 1, 15)
        )
        SELECT FAT.TIPOPROD,FAT.CLIENTE,SUM(FAT.PERC_PARTICIPACAO*DOP.VLRDO) AS VLRDO
        FROM FAT
        INNER JOIN DOP ON FAT.COD = DOP.COD
        GROUP BY FAT.TIPOPROD,FAT.CLIENTE ORDER BY 3 DESC) 
        WHERE ROWNUM < 11

</snk:query>    


<snk:query var="do_produto">
    SELECT PRODUTO,VLRDO FROM(
        WITH
        DOP AS(
        SELECT 1 AS COD, ROUND(SUM(VLRBAIXA),2) * -1 AS VLRDO
        FROM VGF_RESULTADO_GM
        WHERE 
        AD_TIPOCUSTO NOT LIKE 'N' 
        AND CODCENCUS NOT BETWEEN 2500000 AND 2599999  
        AND RECDESP = -1 
        AND SUBSTR(codnat, 1, 1) <> '9'
        AND DHBAIXA IS NOT NULL 
        AND (DHBAIXA BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
        AND CODEMP IN (:P_EMPRESA) 
        AND CODNAT IN (:P_NATUREZA) 
        AND CODCENCUS IN (:P_CR)
        )
        SELECT A.COD,A.PRODUTO,A.TIPOPROD,A.PERC_PARTICIPACAO*DOP.VLRDO AS VLRDO FROM(
        SELECT
        1 AS COD
        , ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO
        , NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO') AS TIPOPROD
        , ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
        ,   ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) 
                / SUM(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END)) 
                  OVER (), 4)  AS PERC_PARTICIPACAO
        FROM TGFCAB CAB
        INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
        INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
        INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
        WHERE
        
        (CAB.DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN)
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
        NVL(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD),'NAO INFORMADO'),
        ITE.CODPROD||'-'||PRO.DESCRPROD) A
        INNER JOIN DOP ON A.COD = DOP.COD)
        
        ORDER BY 2 DESC
</snk:query>



    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">Desp. Operac. por Empresa</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div class="part-title">Desp. Operac. Por Natureza</div>
                <div class="chart-container">
                    <canvas id="barChart"></canvas>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div class="part-title">Desp. Operac. Por Natureza / CR</div>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div class="part-title">Desp. Operac. Detalhamento</div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Vlr. DO</th>
                            </tr>
                        </thead>
                        <tbody>
                            <c:set var="total" value="0" />
                            <c:forEach var="item" items="${do_produto.rows}">
                                <tr>
                                    <td>${item.PRODUTO}</td>
                                    <td><fmt:formatNumber value="${item.VLRDO}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <c:set var="total" value="${total + item.VLRDO}" />
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
   function ref_do(empresa) {
        const params = {'A_EMPRESA': empresa};
        refreshDetails('html5_a73fhk1', params); 
    }          

        // Obtendo os dados da query JSP para o gráfico de rosca

        var doEmpLabel = [];
        var doEmpData = [];
        <c:forEach items="${do_emp.rows}" var="row">
            doEmpLabel.push('${row.CODEMP}');
            doEmpData.push('${row.VLRDO}');
        </c:forEach>
    
        // Dados fictícios para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: doEmpLabel,
                datasets: [{
                    label: 'DO por Empresa',
                    data: doEmpData,
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
                        var label = doEmpLabel[index];
                        ref_do(label);
                        alert(label);
                    }
                }
            }
        });

        // Dados fictícios para o gráfico de barras verticais

        var natDoLabels = [];
        var natDoData = [];

        <c:forEach items="${do_nat.rows}" var="row">
            natDoLabels.push('${row.NATUREZA}');
            natDoData.push('${row.VLRDO}');
        </c:forEach> 

        const ctxBar = document.getElementById('barChart').getContext('2d');
        const barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: natDoLabels,
                datasets: [{
                    label: 'DO por Natureza',
                    data: natDoData,
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

        var doCliLabels = [];
        var doCliData = [];

        <c:forEach items="${do_cli.rows}" var="row">
            doCliLabels.push('${row.CLIENTE}');
            doCliData.push('${row.VLRDO}');
        </c:forEach>         

        const ctxBarRight = document.getElementById('barChartRight').getContext('2d');
        const barChartRight = new Chart(ctxBarRight, {
            type: 'bar',
            data: {
                labels: doCliLabels,
                datasets: [{
                    label: 'DO por Cliente',
                    data: doCliData,
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
