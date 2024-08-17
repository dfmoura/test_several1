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
            font-size: 20px;
            font-weight: bold;
            color: #333;
            left: 52%; /* Move o overlay 10% para a direita */
            transform: translateX(45%); /* Ajusta a posição do texto para centralizá-lo */
            /*text-align: center; Opcional, para centralizar o texto se ele tiver várias linhas */            
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

    <!-- Adicionando a biblioteca Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

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
            <div class="part" id="left-top">
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
            <div class="part" id="right-top">
                <div class="part-title">Detalhamento</div>
                    <div class="table-container">
                        <table id="table">
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
                                    <td>Produto C</td>
                                    <td>Motivo 3</td>
                                    <td>30</td>
                                </tr>
                                <tr>
                                    <td>Produto D</td>
                                    <td>Motivo 4</td>
                                    <td>40</td>
                                </tr>
                                <tr>
                                    <td>Produto E</td>
                                    <td>Motivo 5</td>
                                    <td>50</td>
                                </tr>
                                <tr>
                                    <td>Produto E</td>
                                    <td>Motivo 5</td>
                                    <td>50</td>
                                </tr>
                                <tr>
                                    <td>Produto E</td>
                                    <td>Motivo 5</td>
                                    <td>50</td>
                                </tr>
                                <tr>
                                    <td>Produto E</td>
                                    <td>Motivo 5</td>
                                    <td>50</td>
                                </tr>
                                <tr>
                                    <td>Produto E</td>
                                    <td>Motivo 5</td>
                                    <td>50</td>
                                </tr>                                                                                    
                                <tr>
                                    <td>Produto E</td>
                                    <td>Motivo 5</td>
                                    <td>50</td>
                                </tr>
                                <tr>
                                    <td>Produto E</td>
                                    <td>Motivo 5</td>
                                    <td>50</td>
                                </tr>                                                        
                                <tr>
                                    <td>Produto E</td>
                                    <td>Motivo 5</td>
                                    <td>50</td>
                                </tr>                            
                            </tbody>
                            <tfoot>
                                <tr>
                                    <th>Total</th>
                                    <th></th>
                                    <th>10000</th>
                                </tr>
                            </tfoot>                        
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>



<script>

        // Dados para o gráfico de rosca
    document.addEventListener('DOMContentLoaded', function() {
        const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');


        const fatTipoLabels = [];
        const fatTipoData = [];
        <c:forEach items="${fat_tipo.rows}" var="row">
            fatTipoLabels.push('${row.SUPERVISOR}');
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
                    borderWidth: 0
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
                }
            }
        });
    });        
    </script>
</body>
</html>
