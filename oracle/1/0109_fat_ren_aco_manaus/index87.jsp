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
    <title>Tela</title>
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
            left: 66%; /* Move o overlay 10% para a direita */
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
        select 
        sum(
        ISNULL(ROUND(VLRBAIXA, 2), 0) )
         as VLRDO
        FROM TGFFIN FIN
        INNER JOIN  TSIEMP EMP ON FIN.CODEMP = EMP.CODEMP
        INNER JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        INNER JOIN TSICUS CUS ON FIN.CODCENCUS = CUS.CODCENCUS
        WHERE 
        FIN.RECDESP = -1 
        AND NAT.ATIVA = 'S'
        AND FIN.DHBAIXA IS NOT NULL AND FIN.CODEMP IN (:P_EMPRESA)
        AND dhbaixa between :P_PERIODO.INI and :P_PERIODO.FIN 
        AND (NAT.AD_TIPOCUSTO IN ('D','I','F','V','E','R'))
        AND (FIN.NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
    </snk:query> 

    <snk:query var="fat_tipo">  
        select 
        FIN.Codemp,
        EMP.NOMEFANTASIA,
        sum(
        ISNULL(ROUND(VLRBAIXA, 2), 0) )
         as VLRDO
        FROM TGFFIN FIN
        INNER JOIN  TSIEMP EMP ON FIN.CODEMP = EMP.CODEMP
        INNER JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        INNER JOIN TSICUS CUS ON FIN.CODCENCUS = CUS.CODCENCUS
        WHERE 
        FIN.RECDESP = -1 
        AND NAT.ATIVA = 'S'
        AND FIN.DHBAIXA IS NOT NULL AND FIN.CODEMP IN (:P_EMPRESA)
        AND dhbaixa between :P_PERIODO.INI and :P_PERIODO.FIN 
        AND (NAT.AD_TIPOCUSTO IN ('D','I','F','V','E','R'))
        AND (FIN.NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
        group by FIN.Codemp,EMP.NOMEFANTASIA
    </snk:query> 



    <snk:query var="cip_total">  	
        select 
        sum(
        ISNULL(ROUND(VLRBAIXA, 2), 0) )
         as VLRDO
        FROM TGFFIN FIN
        INNER JOIN  TSIEMP EMP ON FIN.CODEMP = EMP.CODEMP
        INNER JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        INNER JOIN TSICUS CUS ON FIN.CODCENCUS = CUS.CODCENCUS
        WHERE 
        FIN.RECDESP = -1 
        AND NAT.ATIVA = 'S'
        AND FIN.DHBAIXA IS NOT NULL
        AND dhbaixa between :P_PERIODO.INI and :P_PERIODO.FIN 
        AND (fin.codemp = :A_CODEMP OR (:A_CODEMP IS NULL AND fin.CODEMP = 11)) and fin.CODEMP IN (:P_EMPRESA)          
        AND (NAT.AD_TIPOCUSTO IN ('D','I','F','V','E','R'))
        AND (FIN.NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
    </snk:query>    
    

    <snk:query var="cip_produto">  	

    with bas as (
                select 
                FIN.Codemp,
                FIN.CODNAT,
                CASE 
                    WHEN NAT.DESCRNAT = '<SEM NATUREZA>' THEN 'Sem valor definido'
                    ELSE NAT.DESCRNAT
                END DESCRNAT,
                sum(ISNULL(ROUND(VLRBAIXA, 2), 0) )as VLRDO,
                SUM(SUM(VLRBAIXA)) OVER (PARTITION BY FIN.CODNAT) AS total_grupo

                FROM TGFFIN FIN
                INNER JOIN  TSIEMP EMP ON FIN.CODEMP = EMP.CODEMP
                INNER JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
                INNER JOIN TSICUS CUS ON FIN.CODCENCUS = CUS.CODCENCUS
                WHERE 
                FIN.RECDESP = -1 
                AND NAT.ATIVA = 'S'
                AND FIN.DHBAIXA IS NOT NULL
                AND dhbaixa between :P_PERIODO.INI and :P_PERIODO.FIN 
                AND (NAT.AD_TIPOCUSTO IN ('D','I','F','V','E','R'))
                AND (FIN.NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
                group by FIN.Codemp,
                FIN.CODNAT,
                NAT.DESCRNAT),
        bas1 as (
        SELECT 
            codemp,
            codnat,
            DESCRNAT,
            VLRDO,
            total_grupo,
            -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
            DENSE_RANK() OVER (ORDER BY total_grupo DESC) AS rn
        FROM bas),
        bas2 as (
        SELECT 
               codemp, 
                CASE WHEN rn <= 6 THEN codnat ELSE 9999 END AS codnat,
                CASE WHEN rn <= 6 THEN DESCRNAT ELSE 'Outros' END AS DESCRNAT,
                SUM(VLRDO) AS VLRDO
            FROM bas1
            GROUP BY 
               codemp, 
                CASE WHEN rn <= 6 THEN codnat ELSE 9999 END,
                CASE WHEN rn <= 6 THEN DESCRNAT ELSE 'Outros' END
        )

        Select * from bas2
        where (codemp = :A_CODEMP OR (:A_CODEMP IS NULL AND CODEMP = 11)) and CODEMP IN (:P_EMPRESA)

    </snk:query> 
    
    

    
<snk:query var="fat_ger">


with bas as (
        select 
        FIN.Codemp,
        FIN.CODCENCUS,
        CASE 
            WHEN CUS.DESCRCENCUS = '<SEM CENTRO DE RESULTADO>' THEN 'Sem valor definido'
            ELSE CUS.DESCRCENCUS
        END DESCRCENCUS,
        sum(ISNULL(ROUND(VLRBAIXA, 2), 0) )as VLRDO,
        SUM(SUM(VLRBAIXA)) OVER (PARTITION BY FIN.CODCENCUS) AS total_grupo

        FROM TGFFIN FIN
        INNER JOIN  TSIEMP EMP ON FIN.CODEMP = EMP.CODEMP
        INNER JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        INNER JOIN TSICUS CUS ON FIN.CODCENCUS = CUS.CODCENCUS
        WHERE 
        FIN.RECDESP = -1 
        AND NAT.ATIVA = 'S'
        AND FIN.DHBAIXA IS NOT NULL
        AND dhbaixa between :P_PERIODO.INI and :P_PERIODO.FIN 
        AND (NAT.AD_TIPOCUSTO IN ('D','I','F','V','E','R'))
        AND (FIN.NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
        group by FIN.Codemp,
        CUS.DESCRCENCUS,
        FIN.CODCENCUS),
bas1 as (
SELECT 
    codemp,
    CODCENCUS,
    DESCRCENCUS,
    VLRDO,
    total_grupo,
    -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
    DENSE_RANK() OVER (ORDER BY total_grupo DESC) AS rn
FROM bas),
bas2 as (
SELECT 
       codemp, 
        CASE WHEN rn <= 6 THEN CODCENCUS ELSE 9999 END AS CODCENCUS,
        CASE WHEN rn <= 6 THEN DESCRCENCUS ELSE 'Outros' END AS DESCRCENCUS,
        SUM(VLRDO) AS VLRDO
    FROM bas1
    GROUP BY 
       codemp, 
        CASE WHEN rn <= 6 THEN CODCENCUS ELSE 9999 END,
        CASE WHEN rn <= 6 THEN DESCRCENCUS ELSE 'Outros' END
)

Select * from bas2
where (codemp = :A_CODEMP OR (:A_CODEMP IS NULL AND CODEMP = 11)) and CODEMP IN (:P_EMPRESA)
ORDER BY VLRDO DESC



</snk:query>    
    



<snk:query var="fat_produto">
    select 
    FIN.CODEMP,
    FIN.CODNAT,
    CASE 
        WHEN NAT.DESCRNAT = '<SEM NATUREZA>' THEN 'Sem valor definido'
        ELSE NAT.DESCRNAT
    END DESCRNAT,
    FIN.CODCENCUS,
    CASE 
        WHEN CUS.DESCRCENCUS = '<SEM CENTRO DE RESULTADO>' THEN 'Sem valor definido'
        ELSE CUS.DESCRCENCUS
    END DESCRCENCUS,
    sum(ISNULL(ROUND(VLRBAIXA, 2), 0) )as VLRDO
    
    FROM TGFFIN FIN
    INNER JOIN  TSIEMP EMP ON FIN.CODEMP = EMP.CODEMP
    INNER JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
    INNER JOIN TSICUS CUS ON FIN.CODCENCUS = CUS.CODCENCUS
    WHERE 
    FIN.RECDESP = -1 
    AND NAT.ATIVA = 'S'
    AND FIN.DHBAIXA IS NOT NULL
    AND FIN.DHBAIXA between :P_PERIODO.INI and :P_PERIODO.FIN 
    AND (FIN.codemp = :A_CODEMP OR (:A_CODEMP IS NULL AND FIN.CODEMP = 11))
    AND (NAT.AD_TIPOCUSTO IN ('D','I','F','V','E','R'))
    AND (FIN.NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
    group by FIN.Codemp,
    FIN.CODNAT,
    CUS.DESCRCENCUS,
    NAT.DESCRNAT,
    FIN.CODCENCUS
</snk:query>

    <snk:query var="fat_prod_titulo">
        select 
        FIN.Codemp,
        EMP.NOMEFANTASIA
        
        FROM TGFFIN FIN
        INNER JOIN  TSIEMP EMP ON FIN.CODEMP = EMP.CODEMP
        INNER JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        INNER JOIN TSICUS CUS ON FIN.CODCENCUS = CUS.CODCENCUS
        WHERE 
        FIN.RECDESP = -1 
        AND NAT.ATIVA = 'S'
        AND FIN.DHBAIXA IS NOT NULL 
        AND FIN.dhbaixa between :P_PERIODO.INI and :P_PERIODO.FIN 
        AND (FIN.codemp = :A_CODEMP OR (:A_CODEMP IS NULL AND FIN.CODEMP = 11))
        AND (NAT.AD_TIPOCUSTO IN ('D','I','F','V','E','R'))
        AND (FIN.NUNOTA = :P_NUNOTA OR :P_NUNOTA IS NULL)
        group by 
        FIN.Codemp,
        EMP.NOMEFANTASIA
    </snk:query>


    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title"> Desp. Operacional</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <c:forEach items="${fat_total.rows}" var="row">
                        <div class="chart-overlay"><fmt:formatNumber value="${row.VLRDO}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                    </c:forEach>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <c:forEach items="${fat_prod_titulo.rows}" var="row">
                    <div class="part-title">${row.NOMEFANTASIA} - Natureza</div>
                </c:forEach>
                <div class="chart-container">
                    <canvas id="doughnutChart1"></canvas>
                    <c:forEach items="${cip_total.rows}" var="row">
                        <div class="chart-overlay"><fmt:formatNumber value="${row.VLRDO}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                    </c:forEach> 
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <c:forEach items="${fat_prod_titulo.rows}" var="row">
                <div class="part-title">${row.NOMEFANTASIA} - CR</div>
            </c:forEach>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <c:forEach items="${fat_prod_titulo.rows}" var="row">
                    <div class="part-title">${row.NOMEFANTASIA}</div>
                </c:forEach>
                <div class="table-container">
                    <table id="table">
                        <thead>
                            <tr>
                                <th>Cód. Emp.</th>
                                <th>Cód. Nat.</th>
                                <th>Descr. Nat.</th>
                                <th>Cód. Cen.</th>
                                <th>Descr. Cen.</th>
                                <th>Total Vlr.DO</th>
                            </tr>
                        </thead>
                        <tbody>
                            <c:set var="total" value="0" />
                            <c:forEach items="${fat_produto.rows}" var="row">
                                <tr>
                                    <td>${row.CODEMP}</td>
                                    <td>${row.CODNAT}</td>
                                    <td>${row.DESCRNAT}</td>
                                    <td>${row.CODCENCUS}</td>
                                    <td>${row.DESCRCENCUS}</td>
                                    <td><fmt:formatNumber value="${row.VLRDO}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <c:set var="total" value="${total + row.VLRDO}" />
                                </tr>
                            </c:forEach>
                            <tr>
                                <td><b>Total</b></td>
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
            const params1 = {'A_CODEMP': TIPOPROD};
            refreshDetails('html5_af0k7fn', params1); 
            
        }




        // Dados para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

        var fatTipoLabels = [];
        var fatTipoData = [];
        <c:forEach items="${fat_tipo.rows}" var="row">
            fatTipoLabels.push("${row.CODEMP} - ${row.NOMEFANTASIA}");
            fatTipoData.push(${row.VLRDO});
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
                                return label + ': ' + formattedValue + ' (' + percentage + '%)';
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
            cipTipoLabels.push('${row.CODNAT} - ${row.DESCRNAT}');
            cipTipoData.push(${row.VLRDO});
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
                                return label + ': ' + formattedValue + ' (' + percentage + '%)';
                            }
                        }
                    },
                    legend: {
                        position: 'left',
                        align: 'center', // Alinhamento vertical da legenda
                    }                    
                }
            }
        });

        // Dados para o gráfico de barras verticais (direito)
        const ctxBarRight = document.getElementById('barChartRight').getContext('2d');

        const gerenteLabels = [
            <c:forEach items="${fat_ger.rows}" var="row">
                "${row.CODCENCUS}-${row.DESCRCENCUS}",
            </c:forEach>              
        ];

        const gerenteData = [
            <c:forEach items="${fat_ger.rows}" var="row">
                ${row.VLRDO},
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
                }
            }
        });


        

    </script>
</body>
</html>
