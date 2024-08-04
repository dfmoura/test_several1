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
    <title>Tela de Devoluções</title>
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
            font-size: 10px;
            width: 100%;
            max-width: 200px; /* Limita a largura máxima do dropdown */
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

<snk:query var="motivo">

SELECT MOTIVO,VLRDEVOL FROM (
SELECT DESCRHIST AS MOTIVO,SUM(VLRNOTA) VLRDEVOL 
FROM(
    WITH 
    ACF AS (
        SELECT DISTINCT
            ACF.NUNOTA,
            ACF.CODHIST,
            ACH.DESCRHIST
        FROM TGFACF ACF
        INNER JOIN TGFACH ACH ON ACF.CODHIST = ACH.CODHIST
        WHERE ACF.CODHIST > 0
    ),
    BAS AS (
        SELECT 
            CAB.CODEMP,
            EMP.NOMEFANTASIA,        
            CAB.CODPARC,
            PAR.RAZAOSOCIAL,
            UPPER(CID.NOMECID) AS NOMECID,
            BAI.NOMEBAI,
            CAB.CODTIPOPER,
            VEN.CODVEND||'-'||VEN.APELIDO AS VENDEDOR,
            VENS.CODVEND||'-'||VENS.APELIDO AS SUPERVISOR,
            VENG.CODVEND||'-'||VENG.APELIDO AS GERENTE,                        
            CAB.DTNEG,
            VAR.NUNOTA,
            VAR.NUNOTAORIG,
            CAB.TIPMOV AS TIPMOV,
            ITE.CODPROD,
            PRO.DESCRPROD,
            ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC AS VLRNOTA,
            ACF.DESCRHIST
        FROM 
            TGFVAR VAR
            INNER JOIN TGFITE ITE ON VAR.NUNOTA = ITE.NUNOTA AND VAR.SEQUENCIA = ITE.SEQUENCIA
            INNER JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
            INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
            INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
            INNER JOIN TSIBAI BAI ON PAR.CODBAI = BAI.CODBAI
            INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
            INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
            INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
            LEFT JOIN ACF ON VAR.NUNOTAORIG = ACF.NUNOTA
            INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
            LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
            LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER
        WHERE 
            CAB.TIPMOV IN ('D') 
            AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
            AND TOP.GOLSINAL = -1
            AND TOP.ATIVO = 'S'
        ORDER BY 
            CAB.CODPARC,
            VAR.NUNOTA
    ),
    TES AS (
        SELECT
            CAB.CODEMP,
            EMP.NOMEFANTASIA,
            CAB.CODPARC,
            PAR.RAZAOSOCIAL,
            UPPER(CID.NOMECID) AS NOMECID,
            BAI.NOMEBAI,
            CAB.CODTIPOPER,
            VEN.CODVEND||'-'||VEN.APELIDO AS VENDEDOR,
            VENS.CODVEND||'-'||VENS.APELIDO AS SUPERVISOR,
            VENG.CODVEND||'-'||VENG.APELIDO AS GERENTE,            
            CAB.DTNEG,
            VAR.NUNOTA,
            VAR.NUNOTAORIG,
            CAB.TIPMOV AS TIPMOV,
            ITE.CODPROD,
            PRO.DESCRPROD,
            ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC AS VLRNOTA,
            NULL DESCRHIST
        FROM TGFVAR VAR
            INNER JOIN TGFITE ITE ON VAR.NUNOTA = ITE.NUNOTA AND VAR.SEQUENCIA = ITE.SEQUENCIA
            INNER JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
            INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
            INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
            INNER JOIN TSIBAI BAI ON PAR.CODBAI = BAI.CODBAI
            INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
            INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
            INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
            INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
            LEFT JOIN TGFVEN VENS ON VENS.CODVEND = VEN.AD_SUPERVISOR
            LEFT JOIN TGFVEN VENG ON VENG.CODVEND = VEN.CODGER            
        WHERE CAB.CODTIPOPER = 1215
            AND CAB.TIPMOV IN ('D') 
            AND CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
            
            AND TOP.ATIVO = 'S'
    )
    SELECT * FROM BAS
    UNION ALL
    SELECT * FROM TES
) GROUP BY DESCRHIST ORDER BY 2 DESC 
) WHERE ROWNUM < 9

</snk:query>

    <snk:query var="motivo_ven">
        SELECT
        VENDEDOR,
        MOTIVO,
        VLRDEVOL
        FROM
        (
        WITH DES AS
        (
        SELECT
            ACF.CODHIST,
            ACF.NUNOTA AS NUNOTA1, 
            ACH.DESCRHIST
        FROM TGFACF ACF
        INNER JOIN TGFACH ACH ON ACF.CODHIST = ACH.CODHIST
        WHERE ACF.CODHIST > 0
        )
        SELECT
        VEN.APELIDO AS VENDEDOR,
        NVL(DES.DESCRHIST,'NAO INFORMADO') AS MOTIVO,
        ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) ELSE 0 END), 2) AS VLRDEVOL
        FROM TGFCAB CAB
        INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(T2.DHALTER) FROM TGFTOP T2 WHERE T2.CODTIPOPER = CAB.CODTIPOPER)
        INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
        LEFT JOIN DES ON CAB.NUNOTA = DES.NUNOTA1
        WHERE TOP.GOLSINAL = -1
        AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)        
        
        AND CAB.CODEMP IN (:P_EMPRESA)
        AND CAB.CODNAT IN (:P_NATUREZA)
        AND CAB.CODCENCUS IN (:P_CR)
        AND CAB.CODVEND IN (:P_VENDEDOR)
        AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
        AND VEN.CODGER IN (:P_GERENTE)
        AND VEN.AD_ROTA IN (:P_ROTA)
        
        AND TOP.TIPMOV IN ('V', 'D')
        AND TOP.ATIVO = 'S'
        GROUP BY VEN.APELIDO,DES.DESCRHIST
        ORDER BY 3 DESC
        )
        WHERE VLRDEVOL > 0 AND MOTIVO = :A_MOTIVO AND ROWNUM < 10
    </snk:query>    


    <snk:query var="cidade">  
        SELECT NOMECID
        FROM(        
        SELECT
        UPPER(NOMECID) AS NOMECID,
        ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) ELSE 0 END), 2) AS VLRDEVOL
        FROM TGFCAB CAB
        INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(T2.DHALTER) FROM TGFTOP T2 WHERE T2.CODTIPOPER = CAB.CODTIPOPER)
        INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
        INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
        INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
        INNER JOIN TSIBAI BAI ON PAR.CODBAI = BAI.CODBAI
        WHERE TOP.GOLSINAL = -1
        AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)        
        AND CAB.CODEMP IN (:P_EMPRESA)
        AND CAB.CODNAT IN (:P_NATUREZA)
        AND CAB.CODCENCUS IN (:P_CR)
        AND CAB.CODVEND IN (:P_VENDEDOR)
        AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
        AND VEN.CODGER IN (:P_GERENTE)
        AND VEN.AD_ROTA IN (:P_ROTA)
        AND TOP.TIPMOV IN ('V', 'D')
        AND TOP.ATIVO = 'S'
        GROUP BY   NOMECID)
        WHERE VLRDEVOL >0
        ORDER BY 1
</snk:query>


<snk:query var="bairro">      
    SELECT NOMECID,NOMEBAI,VLRDEVOL
    FROM(
    SELECT
    UPPER(CID.NOMECID) AS NOMECID, UPPER(BAI.NOMEBAI) NOMEBAI,
    ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) ELSE 0 END), 2) AS VLRDEVOL
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(T2.DHALTER) FROM TGFTOP T2 WHERE T2.CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
    INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
    INNER JOIN TSIBAI BAI ON PAR.CODBAI = BAI.CODBAI
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)        
    AND CAB.CODEMP IN (:P_EMPRESA)
    AND CAB.CODNAT IN (:P_NATUREZA)
    AND CAB.CODCENCUS IN (:P_CR)
    AND CAB.CODVEND IN (:P_VENDEDOR)
    AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
    AND VEN.CODGER IN (:P_GERENTE)
    AND VEN.AD_ROTA IN (:P_ROTA)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    GROUP BY   CID.NOMECID,BAI.NOMEBAI
    )WHERE VLRDEVOL >0
    ORDER BY 1,2
</snk:query>


<snk:query var="vendedor"> 
    SELECT
    VENDEDOR,
    SUPERVISOR,
    GERENTE,
    MOTIVO,
    VLRDEVOL
    FROM
    (
    WITH DES AS
    (
    SELECT
        ACF.CODHIST,
        ACF.NUNOTA AS NUNOTA1, 
        ACH.DESCRHIST
    FROM TGFACF ACF
    INNER JOIN TGFACH ACH ON ACF.CODHIST = ACH.CODHIST
    WHERE ACF.CODHIST > 0
    )
    SELECT
    VEN.APELIDO AS VENDEDOR,
    VEN1.APELIDO AS SUPERVISOR,
    VEN2.APELIDO AS GERENTE,
    NVL(DES.DESCRHIST,'NAO INFORMADO') AS MOTIVO,
    
    ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) ELSE 0 END), 2) AS VLRDEVOL
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(T2.DHALTER) FROM TGFTOP T2 WHERE T2.CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
    INNER JOIN TGFVEN VEN1 ON VEN.AD_SUPERVISOR = VEN1.CODVEND
    INNER JOIN TGFVEN VEN2 ON VEN.CODGER = VEN2.CODVEND
    LEFT JOIN DES ON CAB.NUNOTA = DES.NUNOTA1
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)        
    AND CAB.CODEMP IN (:P_EMPRESA)
    AND CAB.CODNAT IN (:P_NATUREZA)
    AND CAB.CODCENCUS IN (:P_CR)
    AND CAB.CODVEND IN (:P_VENDEDOR)
    AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
    AND VEN.CODGER IN (:P_GERENTE)
    AND VEN.AD_ROTA IN (:P_ROTA)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    GROUP BY  DES.DESCRHIST,VEN.APELIDO,VEN1.APELIDO,VEN2.APELIDO)
</snk:query>


<snk:query var="motivo_prod">

SELECT
PRODUTO,
MOTIVO,
VLRDEVOL
FROM
(
WITH DES AS
(
SELECT
    ACF.CODHIST,
    ACF.NUNOTA AS NUNOTA1, 
    ACH.DESCRHIST
FROM TGFACF ACF
INNER JOIN TGFACH ACH ON ACF.CODHIST = ACH.CODHIST
WHERE ACF.CODHIST > 0
)
SELECT
ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO,
NVL(DES.DESCRHIST,'NAO INFORMADO') AS MOTIVO,
ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) ELSE 0 END), 2) AS VLRDEVOL
FROM TGFCAB CAB
INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(T2.DHALTER) FROM TGFTOP T2 WHERE T2.CODTIPOPER = CAB.CODTIPOPER)
INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
LEFT JOIN DES ON CAB.NUNOTA = DES.NUNOTA1
WHERE TOP.GOLSINAL = -1
AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)        

AND CAB.CODEMP IN (:P_EMPRESA)
AND CAB.CODNAT IN (:P_NATUREZA)
AND CAB.CODCENCUS IN (:P_CR)
AND CAB.CODVEND IN (:P_VENDEDOR)
AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
AND VEN.CODGER IN (:P_GERENTE)
AND VEN.AD_ROTA IN (:P_ROTA)

AND TOP.TIPMOV IN ('V', 'D')
AND TOP.ATIVO = 'S'
GROUP BY ITE.CODPROD||'-'||PRO.DESCRPROD,DES.DESCRHIST ORDER BY 3 DESC)
WHERE VLRDEVOL > 0 AND MOTIVO = :A_MOTIVO

</snk:query>


    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">Devolução por Motivo</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div class="part-title">Devoluções por Cidade e Bairro</div>
                <div class="dropdown-container">
                    <select id="citySelect">
                        <c:forEach items="${cidade.rows}" var="row">
                            <option value="${row.NOMECID}">${row.NOMECID}</option>
                        </c:forEach>
                    </select>
                </div>
                <div class="chart-container">
                    <canvas id="barChart"></canvas>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div class="part-title">Top 10 Dev. por Vendedor e por Motivo</div>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div class="part-title">Devoluções por Produto e por Motivo</div>
                <div class="table-container">
                    <table id="motivo_prod_table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Motivo</th>
                                <th>Valor Devolvido</th>
                            </tr>
                        </thead>
                        <tbody>
                            <c:set var="total" value="0" />
                            <c:forEach var="item" items="${motivo_prod.rows}">
                                <tr>
                                    <td>${item.PRODUTO}</td>
                                    <td>${item.MOTIVO}</td>
                                    <td><fmt:formatNumber value="${item.VLRDEVOL}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <c:set var="total" value="${total + item.VLRDEVOL}" />
                                </tr>
                            </c:forEach>
                            <tr>
                                <td><b>Total</b></td>
                                <td></td>
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
   function ref_mot(motivo) {
        const params = {'A_MOTIVO': motivo};
        refreshDetails('html5_a7wgptm', params); 
    }        


    // Obtendo os dados da query JSP para o gráfico de rosca

        var motivos = [];
        var valoresDevolucao = [];
        <c:forEach items="${motivo.rows}" var="row">
            motivos.push('${row.MOTIVO}');
            valoresDevolucao.push('${row.VLRDEVOL}');
        </c:forEach>
    
        // Dados fictícios para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: motivos,
                datasets: [{
                    label: 'Vlr. Devol.',
                    data: valoresDevolucao,
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
                        var label = motivos[index];
                        ref_mot(label);
                    }
                }
            }
        });

        // Função para atualizar o gráfico de barras com base na cidade selecionada
        function updateBarChart(city) {
            var bairros = [];
            var valores = [];
            <c:forEach items="${bairro.rows}" var="row">
                if ('${row.NOMECID}' === city) {
                    bairros.push('${row.NOMEBAI}');
                    valores.push('${row.VLRDEVOL}');
                }
            </c:forEach>

            barChart.data.labels = bairros;
            barChart.data.datasets[0].data = valores;
            barChart.update();
        }

        // Criação do gráfico de barras
        const ctxBar = document.getElementById('barChart').getContext('2d');
        const barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: [], // Inicialmente vazio
                datasets: [{
                    label: 'Quantidade',
                    data: [],
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
        var motVendLabels = [];
        var motVendData = [];
        <c:forEach items="${motivo_ven.rows}" var="row">
            motVendLabels.push('${row.VENDEDOR}');
            motVendData.push('${row.VLRDEVOL}');
        </c:forEach>        
        const ctxBarRight = document.getElementById('barChartRight').getContext('2d');
        const barChartRight = new Chart(ctxBarRight, {
            type: 'bar',
            data: {
                labels: motVendLabels,
                datasets: [{
                    label: 'Top 10 por Vendedor',
                    data: motVendData,
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

        // Inicializando a DataTable
        /*
        $(document).ready(function() {
        $('#motivo_prod_table').DataTable({
            "pageLength": 10,
            "ordering": true,
            "order": [[2, "desc"]],
            "columns": [
                { "data": "Produto" },
                { "data": "Motivo" },
                { "data": "Valor Devolvido", "render": $.fn.dataTable.render.number(',', '.', 2, 'R$ ') }
            ]
            });
        });
        */

        // Listener para o dropdown
        $('#citySelect').on('change', function() {
            var selectedCity = $(this).val();
            updateBarChart(selectedCity);
        });

        // Inicializa o gráfico de barras com a primeira cidade
        $(document).ready(function() {
            var firstCity = $('#citySelect').val();
            updateBarChart(firstCity);
        });
    </script>
</body>
</html>