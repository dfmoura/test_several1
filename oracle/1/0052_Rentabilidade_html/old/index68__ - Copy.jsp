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
            background-color: #f8f9fa;
            margin: 0;
        }

        
        .left-section, .right-section {
            background-color: #ffffff;
            padding: 20px;
            height: calc(100vh - 60px); /* Ajusta a altura para compensar a altura da seção superior */
            overflow-y: auto;
        }
        .chart-title {
            text-align: center;
            margin-bottom: 20px;
            font-size: 24px;
            font-weight: bold;
        }
        #doughnutChart {
            max-width: 80%;
            max-height: 80%;
            position: relative;
        }
        .overlay-text {
            position: absolute;
            top: 47%;
            left: 40%;
            transform: translate(-50%, -50%);
            font-size: 25px;
            font-weight: bold;
            color: #000;
        }
        .table-container {
            flex-grow: 1;
            width: 100%;
            overflow-x: auto;
        }
        .table-scrollable {
            width: 100%;
            overflow-y: auto;
            overflow-x: auto;
            max-height: 400px; /* Ajuste conforme necessário */
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        th, td {
            border: 1px solid #dddddd;
            text-align: left;
            padding: 8px;
            border-radius: 8px;
        }
        th {
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 2; /* Certifique-se de que os cabeçalhos fiquem acima das linhas */
        }
        /* Efeito de hover */
        tbody tr:hover {
            background-color: #f0f0f0;
            cursor: pointer;
        }
        .container {
            display: flex;
            flex-wrap: nowrap; /* Não permite quebra de linha */
            overflow-x: auto;
            padding: 10px;
            gap: 10px;
        }        


        /* Estilo do filtro */
        .filter-container {
            margin-bottom: 20px;
        }
    </style>

<snk:load/>    
    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">
</head>
<body>



    <snk:query var="fat_ger">

    SELECT
    SUM(TOTALLIQ) AS VLRFAT
    FROM(
    
    SELECT
    CAB.CODEMP,
    CAB.NUNOTA,
    (F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD)) AS TIPOPROD,
    ITE.CODPROD||'-'||PRO.DESCRPROD AS PRODUTO,
    VEN.CODGER,
    SUM(ITE.VLRDESC) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRDESC,
    SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE 0 END) AS VLRDEV,
    SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) AS TOTALLIQ,
    SUM(ITE.VLRIPI) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRIPI,
    SUM(ITE.VLRSUBST) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRSUBST,
    SUM(ITE.VLRICMS) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRICMS,
    NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRPIS,
    NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS VLRCOFINS,
    SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS CUSMEDSICM_TOT,
    SUM((FC_QTDALT_HL(ITE.CODPROD, ITE.QTDNEG, 'HL') * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)) AS HL,
    (SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6),0)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7),0)
        - SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
    ) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END) AS MARGEMNON,
            (
    (SUM(ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
        - (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6)
        - (SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7)
        - SUM(NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
    ) * 100 / NULLIF(SUM(ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC),0)
    ) PERCMARGEM,
    CAB.TIPMOV
    FROM TGFCAB CAB
    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
    INNER JOIN TSIEMP EMP ON CAB.CODEMP = EMP.CODEMP
    INNER JOIN TGFNAT NAT ON CAB.CODNAT = NAT.CODNAT
    INNER JOIN TSICUS CUS ON CAB.CODCENCUS = CUS.CODCENCUS
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFTPV TPV ON CAB.CODTIPVENDA = TPV.CODTIPVENDA AND TPV.DHALTER = CAB.DHTIPVENDA
    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND

    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND C.DTATUAL <= CAB.DTNEG)
    LEFT JOIN TGFPAR PARM ON PARM.CODPARC = PAR.CODPARCMATRIZ
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI and :P_PERIODO.FIN)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'

    AND CAB.CODNAT IN (:P_NATUREZA)
    AND CAB.CODCENCUS IN (:P_CR)
    AND CAB.CODVEND IN (:P_VENDEDOR)
    AND VEN.AD_ROTA IN (:P_ROTA)

    GROUP BY CAB.CODEMP, CAB.NUNOTA, CAB.TIPMOV,(F_DESCROPC('TGFPRO', 'AD_TPPROD', PRO.AD_TPPROD)),ITE.CODPROD||'-'||PRO.DESCRPROD,VEN.CODGER
    )
    WHERE (CODGER = :A_GERENTE OR :A_GERENTE IS NULL)
        

    </snk:query>    
    

    <snk:query var="fat_tipo">  
        SELECT
        VEN1.APELIDO AS SUPERVISOR,
        ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
        FROM TGFCAB CAB
        INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
        INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
        INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
        INNER JOIN TGFVEN VEN1 ON VEN.AD_SUPERVISOR = VEN1.CODVEND
        INNER JOIN TGFVEN VEN2 ON VEN.CODGER = VEN2.CODVEND
        WHERE TOP.GOLSINAL = -1
        AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
        AND TOP.TIPMOV IN ('V', 'D')
        AND TOP.ATIVO = 'S'
        AND (VEN2.APELIDO = :A_GERENTE OR :A_GERENTE IS NULL)
        AND CAB.CODEMP IN (:P_EMPRESA)
        AND CAB.CODNAT IN (:P_NATUREZA)
        AND CAB.CODCENCUS IN (:P_CR)
        AND CAB.CODVEND IN (:P_VENDEDOR)

        
        AND VEN.AD_ROTA IN (:P_ROTA)
        GROUP BY VEN1.APELIDO
        ORDER BY 2 DESC
    </snk:query>


    <div class="container">
        <div class="section">
            <div class="part" id="left-section">
                <div class="part-title">Faturamento por Supervisor</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <c:forEach items="${tot_ger.rows}" var="row">
                        <div class="overlay-text"><fmt:formatNumber value="${row.VLRFAT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                    </c:forEach>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-section">
                <div class="part-title">HL por Produto</div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Motivo</th>
                                <th>Quantidade</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Produto A</td>
                                <td>Motivo 1</td>
                                <td>10</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>
                            <tr>
                                <td>Produto B</td>
                                <td>Motivo 2</td>
                                <td>20</td>
                            </tr>

                            <!-- Adicione mais linhas conforme necessário -->
                            <tr>
                                <td><b>Total</b></td>
                                <td></td>
                                <td>100,00</td>
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
    <script>

        // Configuração do gráfico de rosca
        document.addEventListener('DOMContentLoaded', function () {
            var ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
            var labels = [];
            var data = [];

            <c:forEach items="${fat_tipo.rows}" var="row">
                labels.push('${row.SUPERVISOR}');
                data.push('${row.VLRFAT}');
            </c:forEach>        

            var doughnutChart = new Chart(ctxDoughnut, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 159, 64, 0.2)',
                            'rgba(255, 0, 0, 0.2)',      // Vermelho
                            'rgba(0, 128, 0, 0.2)',      // Verde
                            'rgba(0, 0, 255, 0.2)',      // Azul
                            'rgba(255, 255, 0, 0.2)'    // Amarelo
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutoutPercentage: 70,
                    legend: {
                        display: true
                    },
                    onClick: function(event, elements) {
                        if (elements.length > 0) {
                            var index = elements[0].index;
                            var supervisor = doughnutChart.data.labels[index];
                            //alert( supervisor ); 
                            abrir_ven();                           
                        }
                    }
                }
            });
        });


    </script>
</body>
</html>