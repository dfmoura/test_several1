<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt">

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
            font-size: 16px;
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
            font-size: 18px;
            font-weight: bold;
            color: #333;
            left: 58%; /* Move o overlay para a direita*/
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
            font-size: 12px;
            margin-top: 30px; /* Adiciona um espaçamento superior para afastar a tabela do título */
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

        #download {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000; /* Certifica-se de que o botão esteja acima de outros elementos */
        }

        #download:hover {
            background-color: #45a049;
        }        
        /* Definir dimensões fixas para evitar distorção */
        @media print {
            .container {
                width: 100%;
                height: auto;
            }
        }

    </style>

    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">


    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">
    <!-- Biblioteca html2pdf.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js"></script>




    <snk:load/>

</head>


<body>

    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">Desp. Oper. por Empresa</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <div class="chart-overlay" onclick="abrir_emp_tot()" id="total-overlay">R$ 0</div>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div class="part-title">TOP 10 - Desp. Oper. por CR</div>

                <div class="chart-container">
                    <canvas id="barChart"></canvas>
                </div>
            </div>


        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div class="part-title">TOP 10 - Desp. Oper. por Natureza</div>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div class="part-title">Detalhamento Despesa Operacional</div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Emp.</th>
                                <th>Empresa</th>
                                <th>Cód. Nat.</th>
                                <th>Cód. CR</th>
                                <th>Vlr. D.O.</th>
                            </tr>
                        </thead>
                        <tbody id="detalhe-tbody">
                            <!-- Dados serão preenchidos via JavaScript -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <button id="download">Capturar e Salvar como PDF</button>
    


    <!-- Adicionando a biblioteca Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Adicionando a biblioteca jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- Adicionando a biblioteca DataTables -->
    <script src="https://cdn.datatables.net/1.12.1/js/jquery.dataTables.min.js"></script>
    <script>

        // Dados de exemplo para substituir as queries
        const dadosExemplo = {
            do_total: [
                { VLRDO: 1250000 }
            ],
            do_emp: [
                { CODEMP: 1, EMPRESA: "Empresa A", VLRDO: 450000 },
                { CODEMP: 2, EMPRESA: "Empresa B", VLRDO: 380000 },
                { CODEMP: 3, EMPRESA: "Empresa C", VLRDO: 320000 },
                { CODEMP: 4, EMPRESA: "Empresa D", VLRDO: 100000 }
            ],
            do_nat: [
                { CODEMP: 1, CODNAT: 1001, NATUREZA: "Natureza A", VLRDO: 180000 },
                { CODEMP: 1, CODNAT: 1002, NATUREZA: "Natureza B", VLRDO: 150000 },
                { CODEMP: 1, CODNAT: 1003, NATUREZA: "Natureza C", VLRDO: 120000 },
                { CODEMP: 2, CODNAT: 2001, NATUREZA: "Natureza D", VLRDO: 200000 },
                { CODEMP: 2, CODNAT: 2002, NATUREZA: "Natureza E", VLRDO: 180000 },
                { CODEMP: 3, CODNAT: 3001, NATUREZA: "Natureza F", VLRDO: 160000 },
                { CODEMP: 3, CODNAT: 3002, NATUREZA: "Natureza G", VLRDO: 160000 },
                { CODEMP: 4, CODNAT: 4001, NATUREZA: "Natureza H", VLRDO: 100000 }
            ],
            do_cr: [
                { CODEMP: 1, CODCENCUS: 101, CR: "Centro de Resultado A", VLRDO: 85000 },
                { CODEMP: 1, CODCENCUS: 102, CR: "Centro de Resultado B", VLRDO: 72000 },
                { CODEMP: 1, CODCENCUS: 103, CR: "Centro de Resultado C", VLRDO: 68000 },
                { CODEMP: 2, CODCENCUS: 201, CR: "Centro de Resultado D", VLRDO: 95000 },
                { CODEMP: 2, CODCENCUS: 202, CR: "Centro de Resultado E", VLRDO: 88000 },
                { CODEMP: 2, CODCENCUS: 203, CR: "Centro de Resultado F", VLRDO: 82000 },
                { CODEMP: 3, CODCENCUS: 301, CR: "Centro de Resultado G", VLRDO: 78000 },
                { CODEMP: 3, CODCENCUS: 302, CR: "Centro de Resultado H", VLRDO: 75000 },
                { CODEMP: 3, CODCENCUS: 303, CR: "Centro de Resultado I", VLRDO: 72000 },
                { CODEMP: 4, CODCENCUS: 401, CR: "Centro de Resultado J", VLRDO: 100000 }
            ],
            do_detalhe: [
                { CODEMP: 1, EMPRESA: "Empresa A", CODNAT: 1001, NATUREZA: "Natureza A", CODCENCUS: 101, CR: "Centro de Resultado A", VLRDO: 45000 },
                { CODEMP: 1, EMPRESA: "Empresa A", CODNAT: 1002, NATUREZA: "Natureza B", CODCENCUS: 102, CR: "Centro de Resultado B", VLRDO: 38000 },
                { CODEMP: 1, EMPRESA: "Empresa A", CODNAT: 1003, NATUREZA: "Natureza C", CODCENCUS: 103, CR: "Centro de Resultado C", VLRDO: 32000 },
                { CODEMP: 2, EMPRESA: "Empresa B", CODNAT: 2001, NATUREZA: "Natureza D", CODCENCUS: 201, CR: "Centro de Resultado D", VLRDO: 58000 },
                { CODEMP: 2, EMPRESA: "Empresa B", CODNAT: 2002, NATUREZA: "Natureza E", CODCENCUS: 202, CR: "Centro de Resultado E", VLRDO: 52000 },
                { CODEMP: 2, EMPRESA: "Empresa B", CODNAT: 2003, NATUREZA: "Natureza F", CODCENCUS: 203, CR: "Centro de Resultado F", VLRDO: 45000 },
                { CODEMP: 3, EMPRESA: "Empresa C", CODNAT: 3001, NATUREZA: "Natureza G", CODCENCUS: 301, CR: "Centro de Resultado G", VLRDO: 65000 },
                { CODEMP: 3, EMPRESA: "Empresa C", CODNAT: 3002, NATUREZA: "Natureza H", CODCENCUS: 302, CR: "Centro de Resultado H", VLRDO: 58000 },
                { CODEMP: 4, EMPRESA: "Empresa D", CODNAT: 4001, NATUREZA: "Natureza I", CODCENCUS: 401, CR: "Centro de Resultado I", VLRDO: 100000 }
            ]
        };

        // Função para preencher a tabela de detalhes
        function preencherTabelaDetalhes() {
            const tbody = document.getElementById('detalhe-tbody');
            let total = 0;
            
            dadosExemplo.do_detalhe.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td onclick="abrir_emp('${item.CODEMP}')">${item.CODEMP}</td>
                    <td>${item.EMPRESA}</td>
                    <td onclick="abrir_nat('${item.CODEMP}','${item.CODNAT}')">${item.NATUREZA}</td>
                    <td onclick="abrir_cr('${item.CODEMP}','${item.CODCENCUS}')">${item.CR}</td>
                    <td>${item.VLRDO.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                `;
                tbody.appendChild(row);
                total += item.VLRDO;
            });
            
            // Adicionar linha de total
            const totalRow = document.createElement('tr');
            totalRow.innerHTML = `
                <td><b>Total</b></td>
                <td></td>
                <td></td>
                <td></td>
                <td><b>${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>
            `;
            tbody.appendChild(totalRow);
        }

        // Função para atualizar o valor total no overlay
        function atualizarTotalOverlay() {
            const total = dadosExemplo.do_total[0].VLRDO;
            document.getElementById('total-overlay').textContent = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        }

   // Função para atualizar a query
   function ref_do(empresa) {
        const params = {'A_CODEMP': empresa};
        refreshDetails('html5_a73fhk1', params); 
    } 

    /*
        // Função para abrir o novo nível


        function abrir_emp_tot() {
            var params = ''
            var level = 'lvl_105wuo';
            openLevel(level, params);
        }


        function abrir_emp(grupo,grupo1) {
            var params = { 
                'A_CODEMP' : parseInt(grupo)
             };
            var level = 'lvl_105wuo';
            openLevel(level, params);
        }

        function abrir_cr(grupo,grupo1) {
            var params = { 
                'A_CODEMP' : parseInt(grupo),
                'A_CODCENCUS': parseInt(grupo1)
             };
            var level = 'lvl_105wuo';
            openLevel(level, params);
        }


        function abrir_nat(grupo,grupo1) {
            var params = { 
                'A_CODEMP' : parseInt(grupo),
                'A_CODNAT': parseInt(grupo1)
             };
            var level = 'lvl_105wuo';
            openLevel(level, params);
        }        
        */

        // Obtendo os dados da query JSP para o gráfico de rosca

        var doEmpLabel = [];
        var doEmpData = [];
        
        // Preencher dados do gráfico de rosca
        dadosExemplo.do_emp.forEach(item => {
            doEmpLabel.push(`${item.CODEMP}-${item.EMPRESA}`);
            doEmpData.push(item.VLRDO);
        });

        // Dados para o gráfico de rosca
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
                        position: 'left',
                        align: 'center', // Alinhamento vertical da legenda
                    }
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var label = doEmpLabel[index].split('-')[0];
                        ref_do(label);
                        //alert(label);
                    }
                }
            }
        });


        // Dados para o gráfico de barras verticais
        const ctxBar = document.getElementById('barChart').getContext('2d');

        var doCRLabels = [];
        var doCRData = [];

        // Preencher dados do gráfico de barras CR
        dadosExemplo.do_cr.forEach(item => {
            doCRLabels.push(`${item.CODEMP} - ${item.CODCENCUS} - ${item.CR}`);
            doCRData.push(item.VLRDO);
        });

        const barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: doCRLabels,
                datasets: [{
                    label: 'CR',
                    data: doCRData,
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
                        display: false
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
                        var index = activeElements[0].index;
                        var grupo = doCRLabels[index].split('-')[0];
                        var grupo1 = doCRLabels[index].split('-')[1];
                        
                        abrir_cr(grupo,grupo1);
                    }
                }
            }
        });        





        // Dados para o gráfico de colunas verticais

        var natDoLabels = [];
        var natDoData = [];

        // Preencher dados do gráfico de barras Natureza
        dadosExemplo.do_nat.forEach(item => {
            natDoLabels.push(`${item.CODEMP} - ${item.CODNAT} - ${item.NATUREZA}`);
            natDoData.push(item.VLRDO);
        });
        
        const ctxBarRight = document.getElementById('barChartRight').getContext('2d');
        const barChartRight = new Chart(ctxBarRight, {
            type: 'bar',
            data: {
                labels: natDoLabels,
                datasets: [{
                    label: 'Natureza',
                    data: natDoData,
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
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var label = natDoLabels[index].split('-')[0];
                        var label1 = natDoLabels[index].split('-')[1];
                        abrir_nat(label,label1);
                        
                    }
                }
            }
        });

        // Preencher a tabela e atualizar o overlay quando a página carregar
        document.addEventListener('DOMContentLoaded', function() {
            preencherTabelaDetalhes();
            atualizarTotalOverlay();
        });


    </script>

<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/0.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.3.2/jspdf.min.js"></script>

<script>
    document.getElementById("download").addEventListener("click", function() {

            // Esconde o botão antes da captura
            var button = document.getElementById("download");
            button.style.display = "none";

        html2canvas(document.body, {
            onrendered: function(canvas) {
                var imgData = canvas.toDataURL('image/png');
                var pdf = new jsPDF('l', 'mm', 'a4');

                // Definir as dimensões da imagem dentro do PDF
                var imgWidth = 297; // Largura A4
                var pageHeight = 210; // Altura A4
                var imgHeight = canvas.height * imgWidth / canvas.width;
                var heightLeft = imgHeight;

                var position = 0;

                // Adicionar a imagem ao PDF
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                // Adicionar páginas se a altura da imagem exceder uma página
                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }

                // Salvar o PDF
                pdf.save('captura_tela.pdf');

                // Exibe o botão novamente após a captura
                button.style.display = "block";                
            }
        });
    });
</script>


</body>
</html>
