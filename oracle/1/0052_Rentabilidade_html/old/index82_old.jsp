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

        .chart-overlay {
            position: absolute;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 20px;
            font-weight: bold;
            color: #333;
            left: 56%; /* Move o overlay 10% para a direita */
            transform: translateX(45%); /* Ajusta a posição do texto para centralizá-lo */
            /*text-align: center; Opcional, para centralizar o texto se ele tiver várias linhas */            
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
<snk:load/>    
</head>
<body>

    
    <snk:query var="custo_total_emp">
    
    WITH CUS AS
    (
    SELECT
    CODEMP,EMPRESA,CODTIPOPER,DESCROPER,CUSMEDSICM_TOT
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
    )
    SELECT SUM(CUSMEDSICM_TOT) CUSMEDSICM_TOT FROM CUS  
    
    </snk:query>
        
        
    <snk:query var="custo_emp">
        WITH CUS AS
        (
        SELECT
        CODEMP,SUBSTR(EMPRESA,1,18)EMPRESA,CODTIPOPER,DESCROPER,CUSMEDSICM_TOT
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
        )
        SELECT CODEMP,EMPRESA,SUM(CUSMEDSICM_TOT) CUSMEDSICM_TOT 
        FROM CUS
        GROUP BY CODEMP,EMPRESA
    
    </snk:query>



<snk:query var="custo_total_top">
    WITH CUS AS
    (
    SELECT    
    CODEMP,EMPRESA,CODTIPOPER,DESCROPER,AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD,CUSMEDSICM_TOT
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
    )
    SELECT SUM(CUSMEDSICM_TOT) CUSMEDSICM_TOT 
    FROM CUS    
    WHERE
    (CODEMP = 1 AND :A_CODEMP IS NULL)
    or
    (CODEMP = :A_CODEMP)    

</snk:query>    


<snk:query var="custo_top">
    WITH CUS AS
    (
    SELECT    
    CODEMP,EMPRESA,CODTIPOPER,SUBSTR(DESCROPER,1,17)DESCROPER,CUSMEDSICM_TOT
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
    )
    SELECT CODEMP,EMPRESA,CODTIPOPER,DESCROPER,SUM(CUSMEDSICM_TOT) CUSMEDSICM_TOT 
    FROM CUS    
    WHERE 
    (CODEMP = 1 AND :A_CODEMP IS NULL)
    or
    (CODEMP = :A_CODEMP)
    
    GROUP BY CODEMP,EMPRESA,CODTIPOPER,DESCROPER
    order by 5 desc

</snk:query>    





<snk:query var="custo_total">

WITH CUS AS
(
SELECT
CODEMP,EMPRESA,CODTIPOPER,DESCROPER,CUSMEDSICM_TOT
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
)
SELECT SUM(CUSMEDSICM_TOT) CUSMEDSICM_TOT 
FROM CUS
WHERE
(CODEMP = 1 AND :A_CODEMP IS NULL AND CODTIPOPER = 1100 AND :A_TOP IS NULL)
or
(CODEMP = :A_CODEMP AND CODTIPOPER = :A_TOP)

</snk:query>

<snk:query var="custo_tipo">
    WITH CUS AS
    (
    SELECT
    CODEMP,EMPRESA,CODTIPOPER,DESCROPER,AD_TPPROD,TIPOPROD,CUSMEDSICM_TOT
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
    )
    SELECT CODEMP,CODTIPOPER,AD_TPPROD,TIPOPROD,SUM(CUSMEDSICM_TOT) CUSMEDSICM_TOT 
    FROM CUS
    WHERE
    (CODEMP = 1 AND :A_CODEMP IS NULL AND CODTIPOPER = 1100 AND :A_TOP IS NULL)
    or
    (CODEMP = :A_CODEMP AND CODTIPOPER = :A_TOP)
    GROUP BY CODEMP,CODTIPOPER,AD_TPPROD,TIPOPROD   
</snk:query>   


<snk:query var="custo_produto">  
    WITH CUS AS
    (
    SELECT
    CODEMP,EMPRESA,CODTIPOPER,DESCROPER,AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD,CUSMEDSICM_TOT
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
    )
    SELECT CODEMP,CODTIPOPER,AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD,SUM(CUSMEDSICM_TOT) CUSMEDSICM_TOT 
    FROM CUS 
    WHERE
    (CODEMP = 1 AND :A_CODEMP IS NULL AND CODTIPOPER = 1100 AND :A_TOP IS NULL AND AD_TPPROD = 4 AND :A_TPPROD IS NULL)
    or
    (CODEMP = :A_CODEMP AND CODTIPOPER = :A_TOP AND AD_TPPROD = :A_TPPROD)
    GROUP BY CODEMP,CODTIPOPER,AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD
</snk:query> 

    <div class="container">
        <div class="half-row">
            <div class="column">
                <div class="card">
                    <h2>Custo Médio por Empresa de Produtos Faturados</h2>
                    <div class="chart-container">
                        <canvas id="doughnutChart2"></canvas>
                        <c:forEach items="${custo_total_emp.rows}" var="row">
                            <div class="chart-overlay"><fmt:formatNumber value="${row.CUSMEDSICM_TOT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                        </c:forEach>                        
                    </div>
                </div>
            </div>
            <div class="column">
                <div class="card">
                    <h2>Custo Médio por TOP de Produtos Faturados</h2>
                    <div class="chart-container">
                        <canvas id="doughnutChart1"></canvas>
                        <c:forEach items="${custo_total_top.rows}" var="row">
                            <div class="chart-overlay"><fmt:formatNumber value="${row.CUSMEDSICM_TOT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                        </c:forEach>                        
                    </div>
                </div>
            </div>
        </div>
        <div class="half-row">
            <div class="column">
                <div class="card">
                    <h2>Custo Médio por Tipo de Produtos Faturados</h2>
                    <div class="chart-container">
                        <canvas id="doughnutChart"></canvas>
                        <c:forEach items="${custo_total.rows}" var="row">
                            <div class="chart-overlay"><fmt:formatNumber value="${row.CUSMEDSICM_TOT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                        </c:forEach>                        
                    </div>
                </div>
            </div>
            <div class="column">
                <div class="card">
                    <h2>Custo Médio dos Produtos Faturados</h2>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Cód.Emp.</th>
                                    <th>Cód. Top.</th>
                                    <th>Cód.</th>
                                    <th>Tp. Prod.</th>
                                    <th>Cód.</th>
                                    <th>Produto</th>
                                    <th>Custo Méd. Tot.</th>
                                </tr>
                            </thead>
                            <tbody>
                                <c:set var="total" value="0" />
                                <c:forEach var="item" items="${custo_produto.rows}">
                                    <tr>
                                        <td>${item.CODEMP}</td>
                                        <td>${item.CODTIPOPER}</td>
                                        <td>${item.AD_TPPROD}</td>
                                        <td>${item.TIPOPROD}</td>
                                        <td onclick="abrir_prod('${item.CODEMP}','${item.CODTIPOPER}','${item.CODPROD}')">${item.CODPROD}</td>                                        
                                        <td>${item.DESCRPROD}</td>
                                        <td><fmt:formatNumber value="${item.CUSMEDSICM_TOT}" type="number" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                        <c:set var="total" value="${total + item.CUSMEDSICM_TOT}" />
                                    </tr>
                                </c:forEach>
                                <tr>
                                    <td><b>Total</b></td>
                                    <td></td>
                                    <td></td>
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
    </div>
    
    <script>

   // Função para atualizar a query
   function ref_cus_emp(codemp) {
        const params = {'A_CODEMP': codemp};
        refreshDetails('html5_a73fhga', params); 
    }       


    function ref_cus_top(codemp,top) {
        const params = {'A_CODEMP': codemp,
                        'A_TOP':top
        };
        refreshDetails('html5_a73fhga', params); 
    }       


   function ref_cus_prod(codemp,top,tipoprod) {
        const params = {'A_CODEMP': codemp,
                        'A_TOP':top,
                        'A_TPPROD': tipoprod
        };
        refreshDetails('html5_a73fhga', params); 
    }       

   
   

   // Função para abrir tela


   function abrir_prod(grupo,grupo1,grupo2) {
            var params = { 
                'A_CODEMP' : parseInt(grupo),
                'A_TOP' : parseInt(grupo1),
                'A_CODPROD': parseInt(grupo2)
             };
            var level = 'lvl_ye79i5';
            
            openLevel(level, params);
        }       


    



        // Obtendo os dados da query JSP para o gráfico de rosca - TPPROD
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

        var custoTipoLabel = [];
        var custoTipoData = [];
        <c:forEach items="${custo_tipo.rows}" var="row">
            custoTipoLabel.push('${row.CODEMP} - ${row.CODTIPOPER} - ${row.AD_TPPROD} - ${row.TIPOPROD}');
            custoTipoData.push(parseFloat(${row.CUSMEDSICM_TOT}));
        </c:forEach>
    
        // Dados fictícios para o gráfico de rosca
        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: custoTipoLabel,
                datasets: [{
                    label: 'Custo',
                    data: custoTipoData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)','rgba(54, 162, 235, 0.2)','rgba(255, 206, 86, 0.2)','rgba(75, 192, 192, 0.2)','rgba(153, 102, 255, 0.2)','rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)','rgba(54, 162, 235, 1)','rgba(255, 206, 86, 1)','rgba(75, 192, 192, 1)','rgba(153, 102, 255, 1)','rgba(255, 159, 64, 1)'
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
                        var label = custoTipoLabel[index].split('-')[0];
                        var label1 = custoTipoLabel[index].split('-')[1];
                        var label2 = custoTipoLabel[index].split('-')[2];
                        ref_cus_prod(label,label1,label2);
                        
                    }
                }
            }
        });



        // Obtendo os dados da query JSP para o gráfico de rosca - TOP
        const ctxDoughnut1 = document.getElementById('doughnutChart1').getContext('2d');

        var custoTopLabel = [];
        var custoTopData = [];
        <c:forEach items="${custo_top.rows}" var="row">
            custoTopLabel.push('${row.CODEMP} - ${row.CODTIPOPER} - ${row.DESCROPER}');
            custoTopData.push(parseFloat(${row.CUSMEDSICM_TOT}));
        </c:forEach>
    
        // Dados fictícios para o gráfico de rosca
        const doughnutChart1 = new Chart(ctxDoughnut1, {
            type: 'doughnut',
            data: {
                labels: custoTopLabel,
                datasets: [{
                    label: 'Custo',
                    data: custoTopData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)','rgba(54, 162, 235, 0.2)','rgba(255, 206, 86, 0.2)','rgba(75, 192, 192, 0.2)','rgba(153, 102, 255, 0.2)','rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)','rgba(54, 162, 235, 1)','rgba(255, 206, 86, 1)','rgba(75, 192, 192, 1)','rgba(153, 102, 255, 1)','rgba(255, 159, 64, 1)'
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
                        var label = custoTopLabel[index].split('-')[0];
                        var label1 = custoTopLabel[index].split('-')[1];
                        ref_cus_top(label,label1);
                        
                    }
                }
            }
        });



        // Obtendo os dados da query JSP para o gráfico de rosca - EMP
        const ctxDoughnut2 = document.getElementById('doughnutChart2').getContext('2d');

        var custoEmpLabel = [];
        var custoEmpData = [];
        <c:forEach items="${custo_emp.rows}" var="row">
            custoEmpLabel.push('${row.CODEMP} - ${row.EMPRESA}');
            custoEmpData.push(parseFloat(${row.CUSMEDSICM_TOT}));
        </c:forEach>
    
        // Dados fictícios para o gráfico de rosca
        const doughnutChart2 = new Chart(ctxDoughnut2, {
            type: 'doughnut',
            data: {
                labels: custoEmpLabel,
                datasets: [{
                    label: 'Custo',
                    data: custoEmpData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)','rgba(54, 162, 235, 0.2)','rgba(255, 206, 86, 0.2)','rgba(75, 192, 192, 0.2)','rgba(153, 102, 255, 0.2)','rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)','rgba(54, 162, 235, 1)','rgba(255, 206, 86, 1)','rgba(75, 192, 192, 1)','rgba(153, 102, 255, 1)','rgba(255, 159, 64, 1)'
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
                        var label = custoEmpLabel[index].split('-')[0];
                        
                        ref_cus_emp(label);
                        
                    }
                }
            }
        });

        function copiar(texto) {

            const elementoTemporario = document.createElement('textarea');
            elementoTemporario.value = texto;
            document.body.appendChild(elementoTemporario);
            elementoTemporario.select();
            document.execCommand('copy');
            document.body.removeChild(elementoTemporario);

            //alert('Texto copiado: ' + texto);
        }



        </script>
</body>
</html>
