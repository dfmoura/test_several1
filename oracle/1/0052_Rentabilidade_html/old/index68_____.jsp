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
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>    
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
            gap: 60px; /* Espaço aumentado entre as seções */
            width: 90%;
            height: 90%;
        }
        .section {
            display: flex;
            flex-direction: column;
            gap: 50px; /* Espaço entre os elementos dentro da seção */
        }
        .part {
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 20px;
            width: 100%;
            height: 100%;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: transform 0.3s ease;
        }
        .part:hover {
            transform: translateY(-10px);
        }
        .part-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 20px;
        }
        .chart-container {
            position: relative;
            width: 100%;
            height: 300px; /* Altura ajustada do gráfico */
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 30px; /* Margem superior para descer o gráfico */
        }
        canvas {
            width: 100% !important;
            height: 100% !important;
        }
        .overlay-text {
            position: absolute;
            top: 50%;
            left: 58%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }        
        /* Estilo para a tabela */
        .table-container {
            width: 100%; /* Largura da tabela ajustada para o contêiner */
            height: 100%;
            max-height: 500px; /* Define a altura máxima para o contêiner da tabela */
            overflow-y: auto; /* Habilita a rolagem vertical */
            overflow-x: hidden; /* Desabilita a rolagem horizontal */
            padding-right: 10px; /* Espaço para evitar o corte do conteúdo na rolagem */
            margin-top: 30px; /* Margem superior para descer a tabela */
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


    <div class="container">
        <div class="section">
            <div class="part" id="left-section">
                <div class="part-title">Faturamento por Supervisor</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <c:forEach items="${fat_ger.rows}" var="row">
                        <div class="chart-overlay"><fmt:formatNumber value="${row.VLRFAT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                    </c:forEach>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-section">
                <div class="part-title">Detalhamento por Produto</div>
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
        // Dados fictícios para o gráfico de rosca
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
        const doughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
                datasets: [{
                    label: 'My Doughnut Chart',
                    data: [12, 19, 3, 5, 2, 3],
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
                cutout: '60%', /* Ajuste a proporção do centro do gráfico */
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                let value = context.raw || 0;
                                let total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                let percentage = ((value / total) * 100).toFixed(2);
                                return label + ': ' + value + ' (' + percentage + '%)';
                            }
                        }
                    },
                    legend: {
                        position: 'left',
                        align: 'center',
                    }                    
                }
            }
        });

    </script>
</body>
</html>
