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
    <title>Dashboard Example</title>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            background-color: #f8f9fa;
            margin: 0;
        }
        .header-section {
            background-color: #007bff; /* Cor de fundo da seção superior */
            color: white;
            padding: 10px;
            text-align: center;
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
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 25px;
            font-weight: bold;
            color: #000;
        }
        .table-container {
            flex-grow: 1;
            width: 100%;
            overflow-y: auto;
        }
        .table-scrollable {
            width: 100%;
            overflow-y: auto;
        }
        .table-container table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        .table-container th, .table-container td {
            border: 1px solid #dddddd;
            text-align: left;
            padding: 8px;
            border-radius: 8px; /* Bordas arredondadas */
        }
        .table-container th {
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
            z-index: 1;
        }
        /* Efeito de hover */
        .table-container tbody tr:hover {
            background-color: #f0f0f0; /* Cor de fundo ao passar o mouse */
            cursor: pointer; /* Altera o cursor para indicar que é clicável */
        }
        .container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }        

        .button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s ease;
        }
        .button:hover {
            background-color: #0056b3;
        }
        .button:active {
            background-color: #00408a;
        }


    </style>
    <snk:load/>
</head>
<body>

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
        AND VEN2.APELIDO = 'ALDO'
        GROUP BY VEN1.APELIDO
        ORDER BY 2 DESC
    </snk:query>




    <div class="header-section">
        <div class="container" id="button-container"></div>
    </div>

    <div class="container-fluid">
        <div class="row">
            <div class="col-md-6 left-section">
                <div class="chart-title">Faturamento por Supervisor</div>
                <canvas id="doughnutChart"></canvas>
                <div class="overlay-text">R$ 150.000,00</div> <!-- Texto sobreposto -->
            </div>
            <div class="col-md-6 right-section">
                <div class="chart-title">Detalhamento por Produto</div>
                <div class="table-container table-scrollable">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Preço Médio</th>
                                <th>Vlr. Fat.</th>
                                <th>Impostos</th>
                                <th>CMV</th>
                                <th>Margem Nom.</th>
                                <th>Margem %</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Produto 1</td>
                                <td>R$ 10,00</td>
                                <td>R$ 50.000,00</td>
                                <td>R$ 5.000,00</td>
                                <td>R$ 30.000,00</td>
                                <td>R$ 15.000,00</td>
                                <td>30%</td>
                            </tr>
                            <tr>
                                <td>Produto 2</td>
                                <td>R$ 20,00</td>
                                <td>R$ 30.000,00</td>
                                <td>R$ 3.000,00</td>
                                <td>R$ 15.000,00</td>
                                <td>R$ 12.000,00</td>
                                <td>40%</td>
                            </tr>
                            <tr>
                                <td>Produto 3</td>
                                <td>R$ 15,00</td>
                                <td>R$ 70.000,00</td>
                                <td>R$ 7.000,00</td>
                                <td>R$ 40.000,00</td>
                                <td>R$ 23.000,00</td>
                                <td>33%</td>
                            </tr>
                            <tr>
                                <td><b>Total</b></td>
                                <td></td>
                                <td><b>R$ 150.000,00</b></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

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
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)',
                            'rgba(255, 0, 0, 1)',      // Vermelho
                            'rgba(0, 128, 0, 1)',      // Verde
                            'rgba(0, 0, 255, 1)',      // Azul
                            'rgba(255, 255, 0, 1)'    // Amarelo
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom'
                        }
                    }
                }
            });
        });



        // Array de exemplo com dados
        const records = [
            'Registro 1',
            'Registro 2',
            'Registro 3',
            'Registro 4',
            'Registro 5',
            'Registro 6',
            'Registro 7',
            'Registro 8'
        ];

        // Função para gerar botões dinamicamente
        function generateButtons(records) {
            const container = document.getElementById('button-container');

            records.forEach((record, index) => {
                const button = document.createElement('button');
                button.className = 'button';
                button.textContent = `Botão ${index + 1}`;
                button.addEventListener('click', () => {
                    
                });
                container.appendChild(button);
            });
        }

        // Chamar a função para gerar os botões
        generateButtons(records);


    </script>
</body>
</html>
