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
    <title>Tela de Desconto</title>
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

        .chart-overlay {
            position: absolute;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 20px;
            font-weight: bold;
            color: #333;
            left: 58%; /* Move o overlay 10% para a direita */
            transform: translateX(45%); /* Ajusta a posição do texto para centralizá-lo */
            /*text-align: center; Opcional, para centralizar o texto se ele tiver várias linhas */            
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
            font-size: 12px;
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

<snk:query var="desco_total">
    WITH DESCO AS
    (
    SELECT
    VGF.CODEMP,VGF.EMPRESA,VGF.NUNOTA,VGF.DTNEG,VGF.AD_TPPROD,VGF.TIPOPROD,VGF.CODPROD,VGF.DESCRPROD,VGF.CODGER,VGF.GERENTE,VGF.CODPARC,VGF.NOMEPARC AS PARCEIRO,VGF.VLRDESC

    FROM VGF_CONSOLIDADOR_NOTAS_GM VGF
    INNER JOIN TGFPAR PAR ON VGF.CODPARC = PAR.CODPARC
    LEFT JOIN TGFPAR PARM ON PAR.CODPARCMATRIZ = PARM.CODPARC
    WHERE 
    VGF.GOLSINAL = -1
    AND (VGF.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
    AND VGF.TIPMOV IN ('V', 'D')
    AND VGF.ATIVO = 'S'
    AND VGF.CODEMP IN (:P_EMPRESA)
    AND VGF.CODNAT IN (:P_NATUREZA)
    AND VGF.CODCENCUS IN (:P_CR)
    AND VGF.CODVEND IN (:P_VENDEDOR)
    AND VGF.AD_SUPERVISOR IN (:P_SUPERVISOR)
    AND VGF.CODGER IN (:P_GERENTE)
    AND VGF.AD_ROTA IN (:P_ROTA)
    AND VGF.CODTIPOPER IN (:P_TOP)
    AND (:P_MATRIZ_RVE ='S'  OR PARM.CODPARC <> 518077)
    AND (
    (:P_MATRIZ_RVE = 'S')
    OR 
    (:P_MATRIZ_RVE = 'N' OR :P_MATRIZ_RVE IS NULL AND PARM.CODPARC <> 518077)
    )        
    )
    SELECT SUM(VLRDESC) VLRDESC FROM DESCO 
</snk:query>


<snk:query var="desc_tipo">
    WITH DESCO AS
    (
        SELECT
        VGF.CODEMP,VGF.EMPRESA,VGF.NUNOTA,VGF.DTNEG,VGF.AD_TPPROD,VGF.TIPOPROD,VGF.CODPROD,VGF.DESCRPROD,VGF.CODGER,VGF.GERENTE,VGF.CODPARC,VGF.NOMEPARC AS PARCEIRO,VGF.VLRDESC
        FROM VGF_CONSOLIDADOR_NOTAS_GM VGF
        INNER JOIN TGFPAR PAR ON VGF.CODPARC = PAR.CODPARC
        LEFT JOIN TGFPAR PARM ON PAR.CODPARCMATRIZ = PARM.CODPARC
        WHERE 
        VGF.GOLSINAL = -1
        AND (VGF.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
        AND VGF.TIPMOV IN ('V', 'D')
        AND VGF.ATIVO = 'S'
        AND VGF.CODEMP IN (:P_EMPRESA)
        AND VGF.CODNAT IN (:P_NATUREZA)
        AND VGF.CODCENCUS IN (:P_CR)
        AND VGF.CODVEND IN (:P_VENDEDOR)
        AND VGF.AD_SUPERVISOR IN (:P_SUPERVISOR)
        AND VGF.CODGER IN (:P_GERENTE)
        AND VGF.AD_ROTA IN (:P_ROTA)
        AND VGF.CODTIPOPER IN (:P_TOP)
        AND (:P_MATRIZ_RVE ='S'  OR PARM.CODPARC <> 518077)
        AND (
        (:P_MATRIZ_RVE = 'S')
        OR 
        (:P_MATRIZ_RVE = 'N' OR :P_MATRIZ_RVE IS NULL AND PARM.CODPARC <> 518077)
        )
    )
    SELECT AD_TPPROD,TIPOPROD,SUM(VLRDESC) VLRDESC FROM DESCO GROUP BY AD_TPPROD,TIPOPROD            
</snk:query>


<snk:query var="desc_ger">
    WITH DESCO AS
    (
        SELECT
        VGF.CODEMP,VGF.EMPRESA,VGF.NUNOTA,VGF.DTNEG,VGF.AD_TPPROD,VGF.TIPOPROD,VGF.CODPROD,VGF.DESCRPROD,VGF.CODGER,VGF.GERENTE,VGF.CODPARC,VGF.NOMEPARC AS PARCEIRO,VGF.VLRDESC
    
        FROM VGF_CONSOLIDADOR_NOTAS_GM VGF
        INNER JOIN TGFPAR PAR ON VGF.CODPARC = PAR.CODPARC
        LEFT JOIN TGFPAR PARM ON PAR.CODPARCMATRIZ = PARM.CODPARC
        WHERE 
        VGF.GOLSINAL = -1
        AND (VGF.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
        AND VGF.TIPMOV IN ('V', 'D')
        AND VGF.ATIVO = 'S'
        AND VGF.CODEMP IN (:P_EMPRESA)
        AND VGF.CODNAT IN (:P_NATUREZA)
        AND VGF.CODCENCUS IN (:P_CR)
        AND VGF.CODVEND IN (:P_VENDEDOR)
        AND VGF.AD_SUPERVISOR IN (:P_SUPERVISOR)
        AND VGF.CODGER IN (:P_GERENTE)
        AND VGF.AD_ROTA IN (:P_ROTA)
        AND VGF.CODTIPOPER IN (:P_TOP)
        AND (:P_MATRIZ_RVE ='S'  OR PARM.CODPARC <> 518077)
        AND (
        (:P_MATRIZ_RVE = 'S')
        OR 
        (:P_MATRIZ_RVE = 'N' OR :P_MATRIZ_RVE IS NULL AND PARM.CODPARC <> 518077)
        )
    )
    SELECT AD_TPPROD,TIPOPROD,CODGER,GERENTE,SUM(VLRDESC) VLRDESC 
    FROM DESCO 
    WHERE AD_TPPROD = :A_TPPROD OR ( AD_TPPROD = 4 AND :A_TPPROD IS NULL)
    GROUP BY AD_TPPROD,TIPOPROD,CODGER,GERENTE
    ORDER BY 5 DESC
</snk:query>




<snk:query var="desc_cli">
    SELECT * FROM (
        WITH DESCO AS
        (
            SELECT
            VGF.CODEMP,VGF.EMPRESA,VGF.NUNOTA,VGF.DTNEG,VGF.AD_TPPROD,VGF.TIPOPROD,VGF.CODPROD,VGF.DESCRPROD,VGF.CODGER,VGF.GERENTE,VGF.CODPARC,SUBSTR(VGF.NOMEPARC,1,13) AS PARCEIRO,VGF.VLRDESC
        
            FROM VGF_CONSOLIDADOR_NOTAS_GM VGF
            INNER JOIN TGFPAR PAR ON VGF.CODPARC = PAR.CODPARC
            LEFT JOIN TGFPAR PARM ON PAR.CODPARCMATRIZ = PARM.CODPARC
            WHERE 
            VGF.GOLSINAL = -1
            AND (VGF.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
            AND VGF.TIPMOV IN ('V', 'D')
            AND VGF.ATIVO = 'S'
            AND VGF.CODEMP IN (:P_EMPRESA)
            AND VGF.CODNAT IN (:P_NATUREZA)
            AND VGF.CODCENCUS IN (:P_CR)
            AND VGF.CODVEND IN (:P_VENDEDOR)
            AND VGF.AD_SUPERVISOR IN (:P_SUPERVISOR)
            AND VGF.CODGER IN (:P_GERENTE)
            AND VGF.AD_ROTA IN (:P_ROTA)
            AND VGF.CODTIPOPER IN (:P_TOP)
            AND (:P_MATRIZ_RVE ='S'  OR PARM.CODPARC <> 518077)
            AND (
            (:P_MATRIZ_RVE = 'S')
            OR 
            (:P_MATRIZ_RVE = 'N' OR :P_MATRIZ_RVE IS NULL AND PARM.CODPARC <> 518077)
            )
        )
        SELECT AD_TPPROD,TIPOPROD,CODPARC,PARCEIRO,SUM(VLRDESC) VLRDESC 
        FROM DESCO 
        WHERE AD_TPPROD = :A_TPPROD OR ( AD_TPPROD = 4 AND :A_TPPROD IS NULL)
        GROUP BY AD_TPPROD,TIPOPROD,CODPARC,PARCEIRO
        ORDER BY 5 DESC)
        WHERE ROWNUM <= 10
</snk:query>    


<snk:query var="desc_produto">
    WITH DESCO AS
    (
        SELECT
        VGF.CODEMP,VGF.EMPRESA,VGF.NUNOTA,VGF.DTNEG,VGF.AD_TPPROD,VGF.TIPOPROD,VGF.CODPROD,VGF.DESCRPROD,VGF.CODGER,VGF.GERENTE,VGF.CODPARC,VGF.NOMEPARC AS PARCEIRO,VGF.VLRDESC
    
        FROM VGF_CONSOLIDADOR_NOTAS_GM VGF
        INNER JOIN TGFPAR PAR ON VGF.CODPARC = PAR.CODPARC
        LEFT JOIN TGFPAR PARM ON PAR.CODPARCMATRIZ = PARM.CODPARC
        WHERE 
        VGF.GOLSINAL = -1
        AND (VGF.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
        AND VGF.TIPMOV IN ('V', 'D')
        AND VGF.ATIVO = 'S'
        AND VGF.CODEMP IN (:P_EMPRESA)
        AND VGF.CODNAT IN (:P_NATUREZA)
        AND VGF.CODCENCUS IN (:P_CR)
        AND VGF.CODVEND IN (:P_VENDEDOR)
        AND VGF.AD_SUPERVISOR IN (:P_SUPERVISOR)
        AND VGF.CODGER IN (:P_GERENTE)
        AND VGF.AD_ROTA IN (:P_ROTA)
        AND VGF.CODTIPOPER IN (:P_TOP)
        AND (:P_MATRIZ_RVE ='S'  OR PARM.CODPARC <> 518077)
        AND (
        (:P_MATRIZ_RVE = 'S')
        OR 
        (:P_MATRIZ_RVE = 'N' OR :P_MATRIZ_RVE IS NULL AND PARM.CODPARC <> 518077)
        )
    )
    SELECT AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD,SUM(VLRDESC) VLRDESC 
    FROM DESCO 
    WHERE AD_TPPROD = :A_TPPROD OR ( AD_TPPROD = 4 AND :A_TPPROD IS NULL)
    GROUP BY AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD
    ORDER BY 5 DESC


</snk:query>



    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">Desconto por Tipo Produto</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <c:forEach items="${desco_total.rows}" var="row">
                        <div class="chart-overlay"><fmt:formatNumber value="${row.VLRDESC}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                    </c:forEach>                    
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div class="part-title">Desconto Por Gerente</div>
                <div class="chart-container">
                    <canvas id="barChart"></canvas>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div class="part-title">TOP 10 - Desconto Por Cliente</div>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div class="part-title">Desconto por Produto</div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Cód. Tp.Prod.</th>
                                <th>Tp. Prod.</th>
                                <th>Cód. Prod.</th>
                                <th>Produto</th>
                                <th>Vlr. Desconto</th>
                            </tr>
                        </thead>
                        <tbody>
                            <c:set var="total" value="0" />
                            <c:forEach var="item" items="${desc_produto.rows}">
                                <tr>
                                    <td>${item.AD_TPPROD}</td>
                                    <td>${item.TIPOPROD}</td>
                                    <td onclick="abrir_prod('${item.AD_TPPROD}','${item.CODPROD}')">${item.CODPROD}</td>
                                    <td>${item.DESCRPROD}</td>
                                    <td><fmt:formatNumber value="${item.VLRDESC}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <c:set var="total" value="${total + item.VLRDESC}" />
                                </tr>
                            </c:forEach>
                            <tr>
                                <td><b>Total</b></td>
                                <td></td>
                                <td></td>
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
   function ref_desc(tipoprod) {
        const params = {'A_TPPROD': tipoprod};
        refreshDetails('html5_a73fhib', params); 
    }          



        // Função para abrir o novo nível

        function abrir_ger(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_CODGER': parseInt(grupo1)
             };
            var level = 'lvl_w1rozi';
            
            openLevel(level, params);
        }


        function abrir_cli(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_CODPARC': parseInt(grupo1)
             };
            var level = 'lvl_w1rozi';
            
            openLevel(level, params);
        }




        function abrir_prod(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_CODPROD': parseInt(grupo1)
             };
            var level = 'lvl_w1rozi';
            
            openLevel(level, params);
        }    




    // Obtendo os dados da query JSP para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

        var descTipoLabel = [];
        var descTipoData = [];
        <c:forEach items="${desc_tipo.rows}" var="row">
            descTipoLabel.push('${row.AD_TPPROD} - ${row.TIPOPROD}');
            descTipoData.push(parseFloat(${row.VLRDESC}));
        </c:forEach>
    
        // Dados fictícios para o gráfico de rosca
        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: descTipoLabel,
                datasets: [{
                    label: 'Vlr. Desc.',
                    data: descTipoData,
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
                        position: 'left',
                        align: 'center', // Alinhamento vertical da legenda
                    }
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var label = descTipoLabel[index].split('-')[0];
                        
                        ref_desc(label);
                        
                    }
                }
            }
        });

        // Dados fictícios para o gráfico de barras verticais

        var gerDescLabels = [];
        var gerDescData = [];

        <c:forEach items="${desc_ger.rows}" var="row">
            gerDescLabels.push('${row.AD_TPPROD} - ${row.CODGER} - ${row.GERENTE}');
            gerDescData.push(parseFloat(${row.VLRDESC}));
        </c:forEach> 

        const ctxBar = document.getElementById('barChart').getContext('2d');
        const barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: gerDescLabels,
                datasets: [{
                    label: 'Desconto por Gerente',
                    data: gerDescData,
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
                },
                onClick: function(evt, activeElements) {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const grupo = gerDescLabels[index].split('-')[0];
                        const grupo1 = gerDescLabels[index].split('-')[1];
                        abrir_ger(grupo,grupo1);
                    }
                }
            }
        });

        // Dados fictícios para o gráfico de colunas verticais

        var clienteLabels = [];
        var clienteData = [];

        <c:forEach items="${desc_cli.rows}" var="row">
            clienteLabels.push('${row.AD_TPPROD} - ${row.CODPARC} - ${row.PARCEIRO}');
            clienteData.push(parseFloat(${row.VLRDESC}));
        </c:forEach>         

        const ctxBarRight = document.getElementById('barChartRight').getContext('2d');
        const barChartRight = new Chart(ctxBarRight, {
            type: 'bar',
            data: {
                labels: clienteLabels,
                datasets: [{
                    label: 'Desconto por Cliente',
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
                },
                onClick: function(evt, activeElements) {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const grupo = clienteLabels[index].split('-')[0];
                        const grupo1 = clienteLabels[index].split('-')[1];
                        abrir_cli(grupo,grupo1);
                    }
                }
            }
        });




        
    </script>
</body>
</html>