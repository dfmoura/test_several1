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
            transition: transform 0.3s ease; /* Adicionado para transição suave */
        }
        .part:hover {
           transform: translateY(-10px); /* Movimento para cima ao passar o mouse */
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
            position: relative; /* Para posicionamento absoluto do overlay */
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
            font-size: 17px;
            font-weight: bold;
            color: #333;
            left: 54%; /* Move o overlay 10% para a direita */
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
        }
        .table-container table {
            width: 100%;
            border-collapse: collapse;
        }
        .table-container th, .table-container td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
            font-size: 12px; /* Ajuste o tamanho da fonte conforme necessário */
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

    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">
</head>
<body>

    <snk:query var="fat_total">  
        SELECT 
        SUM(TOTALLIQ) VLRFAT
        FROM VGF_CONSOLIDADOR_NOTAS_GM
        WHERE 
        DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND GOLSINAL = -1
        AND TIPMOV IN ('V', 'D')
        AND ATIVO = 'S' 
        AND CODEMP IN (:P_EMPRESA)
        AND CODNAT IN (:P_NATUREZA)
        AND CODCENCUS IN (:P_CR)
        AND CODVEND IN (:P_VENDEDOR)
        AND AD_SUPERVISOR IN (:P_SUPERVISOR)
        AND CODGER IN (:P_GERENTE)
        AND AD_ROTA IN (:P_ROTA)
        AND CODTIPOPER IN (:P_TOP)
    </snk:query> 

    <snk:query var="fat_tipo">  
        SELECT 
        AD_TPPROD,
        TIPOPROD,
        SUM(TOTALLIQ) VLRFAT
        FROM VGF_CONSOLIDADOR_NOTAS_GM
        WHERE
        DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
        AND GOLSINAL = -1
        AND TIPMOV IN ('V', 'D')
        AND ATIVO = 'S' 
        AND CODEMP IN (:P_EMPRESA)
        AND CODNAT IN (:P_NATUREZA)
        AND CODCENCUS IN (:P_CR)
        AND CODVEND IN (:P_VENDEDOR)
        AND AD_SUPERVISOR IN (:P_SUPERVISOR)
        AND CODGER IN (:P_GERENTE)
        AND AD_ROTA IN (:P_ROTA)
        AND CODTIPOPER IN (:P_TOP)
        group by AD_TPPROD,TIPOPROD
    </snk:query> 



    <snk:query var="cip_total">  	

    SELECT 1 AS COD,ABS(SUM(VLRBAIXA)) AS VLRCIP
      FROM VGF_RESULTADO_GM
      WHERE  
        AD_TIPOCUSTO = 'F'
        AND CODCENCUS NOT BETWEEN 2500000 AND 2599999
        AND DHBAIXA IS NOT NULL
        AND (DHBAIXA BETWEEN :P_PERIODO.INI and :P_PERIODO.FIN)
        AND RECDESP = -1
    </snk:query>    
    

    <snk:query var="cip_produto">  	
        WITH BAS AS 
        (
            SELECT
            1 AS COD, AD_TPPROD,TIPOPROD,SUM(TOTALLIQ) AS VLRFAT
            FROM VGF_CONSOLIDADOR_NOTAS_GM 
            WHERE 
            GOLSINAL = -1
            AND (DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
            AND TIPMOV IN ('V', 'D')
            AND ATIVO = 'S'
            AND CODEMP IN (:P_EMPRESA)
            AND CODNAT IN (:P_NATUREZA)
            AND CODCENCUS IN (:P_CR)
            AND CODVEND IN (:P_VENDEDOR)
            AND AD_SUPERVISOR IN (:P_SUPERVISOR)
            AND CODGER IN (:P_GERENTE)
            AND AD_ROTA IN (:P_ROTA)
            AND CODTIPOPER IN (:P_TOP)
            GROUP BY AD_TPPROD,TIPOPROD
        
        ),
        FIN AS (
        SELECT 1 AS COD,ABS(SUM(VLRBAIXA)) AS VLRBAIXA
        FROM VGF_RESULTADO_GM
        WHERE  
        AD_TIPOCUSTO = 'F'
        AND CODCENCUS NOT BETWEEN 2500000 AND 2599999
        AND DHBAIXA IS NOT NULL
        AND (DHBAIXA BETWEEN :P_PERIODO.INI and :P_PERIODO.FIN)
        AND RECDESP = -1)
        SELECT BAS.AD_TPPROD,BAS.TIPOPROD, (BAS.VLRFAT / SUM(BAS.VLRFAT) OVER ())*FIN.VLRBAIXA AS VLRCIP_PERC 
        FROM BAS
        INNER JOIN FIN ON BAS.COD = FIN.COD
    </snk:query> 
    
    

<snk:query var="fat_ger">
    
SELECT
AD_TPPROD,CODGER,GERENTE,SUM(TOTALLIQ)VLRFAT
FROM VGF_CONSOLIDADOR_NOTAS_GM
WHERE
DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN
AND GOLSINAL = -1
AND TIPMOV IN ('V', 'D')
AND ATIVO = 'S' 
AND CODEMP IN (:P_EMPRESA)
AND CODNAT IN (:P_NATUREZA)
AND CODCENCUS IN (:P_CR)
AND CODVEND IN (:P_VENDEDOR)
AND AD_SUPERVISOR IN (:P_SUPERVISOR)
AND CODGER IN (:P_GERENTE)
AND AD_ROTA IN (:P_ROTA) 
AND CODTIPOPER IN (:P_TOP)
AND (AD_TPPROD = :A_TPPROD OR ( AD_TPPROD = 4 AND :A_TPPROD IS NULL ))
group by AD_TPPROD,CODGER,GERENTE
ORDER BY 4 DESC 
</snk:query>    
    


<snk:query var="fat_produto">

    
    
SELECT
CODEMP,TIPOPROD,CODPROD,DESCRPROD AS PRODUTO,CODGER,GERENTE,SUM(TOTALLIQ)TOTALLIQ
FROM VGF_CONSOLIDADOR_NOTAS_GM
WHERE
DTNEG BETWEEN :P_PERIODO.INI AND  :P_PERIODO.FIN
AND GOLSINAL = -1
AND TIPMOV IN ('V', 'D')
AND ATIVO = 'S' 
AND CODEMP IN (:P_EMPRESA)
AND CODNAT IN (:P_NATUREZA)
AND CODCENCUS IN (:P_CR)
AND CODVEND IN (:P_VENDEDOR)
AND AD_SUPERVISOR IN (:P_SUPERVISOR)
AND CODGER IN (:P_GERENTE)
AND AD_ROTA IN (:P_ROTA)
AND CODTIPOPER IN (:P_TOP)
AND (AD_TPPROD = :A_TPPROD OR ( AD_TPPROD = 4 AND :A_TPPROD IS NULL ))
group by CODEMP,TIPOPROD,CODPROD,DESCRPROD,CODGER,GERENTE

    
</snk:query>

    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">Faturamento por Tipo de Produto</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <c:forEach items="${fat_total.rows}" var="row">
                        <div class="chart-overlay"><fmt:formatNumber value="${row.VLRFAT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                    </c:forEach>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div class="part-title">Detalhamentos dos valores do CIP</div>
                <div class="chart-container">
                    <canvas id="doughnutChart1"></canvas>
                    <c:forEach items="${cip_total.rows}" var="row">
                        <div class="chart-overlay"><fmt:formatNumber value="${row.VLRCIP}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                    </c:forEach> 
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div class="part-title">Valores de venda por gerentes</div>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div class="part-title">Detalhamento por Produto</div>
                <div class="table-container">
                    <table id="table">
                        <thead>
                            <tr>
                                <th>Cód. Emp.</th>
                                <th>Tp. Produto</th>
                                <th>Cód. Prod.</th>
                                <th>Produto</th>
                                <th>Cód. Ger.</th>
                                <th>Gerente</th>
                                <th>Total Líq.</th>
                            </tr>
                        </thead>
                        <tbody>
                            <c:set var="total" value="0" />
                            <c:forEach items="${fat_produto.rows}" var="row">
                                <tr>
                                    <td>${row.CODEMP}</td>
                                    <td>${row.TIPOPROD}</td>
                                    <td onclick="abrir_det('${row.CODPROD}','${row.CODGER}')">${row.CODPROD}</td>
                                    <td>${row.PRODUTO}</td>
                                    <td>${row.CODGER}</td>
                                    <td>${row.GERENTE}</td>
                                    <td><fmt:formatNumber value="${row.TOTALLIQ}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <c:set var="total" value="${total + row.TOTALLIQ}" />
                                </tr>
                            </c:forEach>
                            <tr>
                                <td><b>Total</b></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td><b><fmt:formatNumber value="${total}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></b></td>
                            </tr>
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
    <script src="https://cdn.datatables.net/1.11.3/js/jquery.dataTables.min.js"></script>
    <script>

        // Função para atualizar a query

        
        function ref_fat1(TIPOPROD) {
            const params1 = {'A_TPPROD': TIPOPROD};
            refreshDetails('html5_ax6oqii', params1); 
            
        }



        // Função para abrir o novo nível
        function abrir(grupo,grupo1) {
            var params = { 
                'A_TPPROD' : parseInt(grupo),
                'A_GERENTE': parseInt(grupo1)
             };
            var level = 'lvl_fcsg85';//Faturamento_1 - index 68
            
            openLevel(level, params);
        }
        
       

        function abrir_det(produto,gerente) {
            var params = {'A_CODPROD': parseInt(produto),
                        'A_GERENTE': parseInt(gerente)
            };
            var level = 'lvl_a129doi'; //Faturamento_3 - index70
            openLevel(level, params);
        }

        function abrir_cip(grupo) {
            var params = { 
                'A_TPPROD' : parseInt(grupo)
             };
            var level = 'lvl_t4arq4';
            
            openLevel(level, params);
        }        

        // Dados para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

        var fatTipoLabels = [];
        var fatTipoData = [];
        <c:forEach items="${fat_tipo.rows}" var="row">
            fatTipoLabels.push("${row.AD_TPPROD} - ${row.TIPOPROD}");
            fatTipoData.push(${row.VLRFAT});
        </c:forEach>

        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: fatTipoLabels,
                datasets: [{
                    label: 'My Doughnut Chart',
                    data: fatTipoData,
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
                cutout: '50%',
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                let value = context.raw || 0;
                                let total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                let percentage = ((value / total) * 100).toFixed(2);
                                let formattedValue = new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
                                return label + ': ' + formattedValue;
                            }
                        }
                    },
                    legend: {
                        position: 'left',
                        align: 'center', // Alinhamento vertical da legenda
                    }                    
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var label = fatTipoLabels[index].split('-')[0];
                        ref_fat1(label);
                    }
                }   
            }
        });

        // Dados fictícios para o gráfico de rosca
        const ctxDoughnut1 = document.getElementById('doughnutChart1').getContext('2d');

        var cipTipoLabels = [

        ];
        var cipTipoData = [

        ];
        <c:forEach items="${cip_produto.rows}" var="row">
            cipTipoLabels.push('${row.AD_TPPROD} - ${row.TIPOPROD}');
            cipTipoData.push('${row.VLRCIP_PERC}');
        </c:forEach>        

        const doughnutChart1 = new Chart(ctxDoughnut1, {
            type: 'doughnut',
            data: {
                labels: cipTipoLabels,
                datasets: [{
                    label: 'CIP',
                    data: cipTipoData,
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
                cutout: '50%',
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                let value = context.raw || 0;
                                let total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                let percentage = ((value / total) * 100).toFixed(2);
                                let formattedValue = new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
                                return label + ': ' + formattedValue;
                            }
                        }
                    },
                    legend: {
                        position: 'left',
                        align: 'center', // Alinhamento vertical da legenda
                    }                    
                },
                onClick: function(evt, activeElements) {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const grupo = cipTipoLabels[index].split('-')[0];
                        //alert(grupo);
                        abrir_cip(grupo);
                    }
                }
            }
        });

        // Dados para o gráfico de barras verticais (direito)
        const ctxBarRight = document.getElementById('barChartRight').getContext('2d');

        const gerenteLabels = [
            <c:forEach items="${fat_ger.rows}" var="row">
                "${row.AD_TPPROD}-${row.CODGER}-${row.GERENTE}",
            </c:forEach>              
        ];

        const gerenteData = [
            <c:forEach items="${fat_ger.rows}" var="row">
                ${row.VLRFAT},
            </c:forEach>        
        ];


        const barChartRight = new Chart(ctxBarRight, {
            type: 'bar',
            data: {
                labels: gerenteLabels,
                datasets: [{
                    label: 'Quantidade',
                    data: gerenteData,
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                },
                onClick: function(evt, activeElements) {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const grupo = gerenteLabels[index].split('-')[0];
                        const grupo1 = gerenteLabels[index].split('-')[1];
                        abrir(grupo,grupo1);
                    }
                }
            }
        });


        

    </script>
</body>
</html>
