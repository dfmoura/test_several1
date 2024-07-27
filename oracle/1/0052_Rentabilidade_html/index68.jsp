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
            background-color: #ffffff; /* Cor de fundo da seção superior */
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

        .button {
            background-color: #130455;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.3s ease;
        }
        .button:hover {
            background-color: #0056b3;
        }
        .button:active {
            background-color: #00408a;
        }

        /* Estilo do filtro */
        .filter-container {
            margin-bottom: 20px;
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
        AND VEN2.APELIDO = :A_GERENTE
        AND CAB.CODEMP IN (:P_EMPRESA)
        AND CAB.CODNAT IN (:P_NATUREZA)
        AND CAB.CODCENCUS IN (:P_CR)
        AND CAB.CODVEND IN (:P_VENDEDOR)
        AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
        
        AND VEN.AD_ROTA IN (:P_ROTA)
        GROUP BY VEN1.APELIDO
        ORDER BY 2 DESC
    </snk:query>



    <snk:query var="fat_ger">  	
        SELECT
        DECODE(VEN1.APELIDO, '<SEM VENDEDOR>', 'NAO INFORMADO', VEN1.APELIDO) AS GERENTE
        
        FROM TGFCAB CAB
        INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
        INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
        INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
        INNER JOIN TGFVEN VEN1 ON VEN.CODGER = VEN1.CODVEND
        WHERE TOP.GOLSINAL = -1
        AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
        AND TOP.TIPMOV IN ('V', 'D')
        AND TOP.ATIVO = 'S'
        AND CAB.CODEMP IN (:P_EMPRESA)
        AND CAB.CODNAT IN (:P_NATUREZA)
        AND CAB.CODCENCUS IN (:P_CR)
        AND CAB.CODVEND IN (:P_VENDEDOR)
        AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
        AND VEN.CODGER IN (:P_GERENTE)
        AND VEN.AD_ROTA IN (:P_ROTA)
        GROUP BY DECODE(VEN1.APELIDO, '<SEM VENDEDOR>', 'NAO INFORMADO', VEN1.APELIDO)
        ORDER BY 1 DESC
    </snk:query> 



    <snk:query var="tot_ger">

    SELECT
    ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
    INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
    INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
    INNER JOIN TGFVEN VEN1 ON VEN.CODGER = VEN1.CODVEND
    WHERE TOP.GOLSINAL = -1
    AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
    AND TOP.TIPMOV IN ('V', 'D')
    AND TOP.ATIVO = 'S'
    AND VEN1.APELIDO = :A_GERENTE
    AND CAB.CODEMP IN (:P_EMPRESA)
    AND CAB.CODNAT IN (:P_NATUREZA)
    AND CAB.CODCENCUS IN (:P_CR)
    AND CAB.CODVEND IN (:P_VENDEDOR)
    AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)
    AND VEN.AD_ROTA IN (:P_ROTA)
    </snk:query>


    <snk:query var="fat_produto">
      
        SELECT
        VEN2.APELIDO AS SUPERVISOR
        , ITE.CODPROD||' - '||PRO.DESCRPROD AS PRODUTO
        , ROUND(AVG(ITE.VLRUNIT * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)), 2) AS VLR_UN
        , ROUND(SUM(CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END), 2) AS VLRFAT
    
        , ROUND(NVL(AVG(ITE.VLRSUBST + ITE.VLRIPI + 
        (CASE 
        WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD = 1 AND CID.UF = 2 AND PAR.INSCESTADNAUF <> '    ' 
        THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.04
        WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD = 1 AND CID.UF = 2 AND PAR.INSCESTADNAUF = '    ' 
        THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.06
        WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD = 1 AND CID.UF <> 2 AND PAR.TIPPESSOA = 'J' 
        THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.04
        WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD IN (2,3,4) AND CID.UF = 2
        THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.06
        WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD IN (2,3,4) AND CID.UF IN (1,7,8,15,13)
        THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.03
        WHEN CAB.CODEMP = 1 AND PRO.AD_TPPROD IN (2,3,4) AND CID.UF NOT IN (2, 1, 7, 8, 15, 13)
        THEN (CASE WHEN CAB.TIPMOV = 'D' THEN (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) * -1 ELSE (ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC) END) * 0.01
        ELSE ITE.VLRICMS END)
        + NVL((SELECT VALOR FROM TGFDIN WHERE NUNOTA = ITE.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 6),0)
        + NVL((SELECT VALOR FROM TGFDIN WHERE NUNOTA = ITE.NUNOTA AND SEQUENCIA = ITE.SEQUENCIA AND CODIMP = 7),0)
        ),0),2) AS VLRIMP
    
        , ROUND(AVG(NVL(CUS.CUSSEMICM,0) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)),2) AS CMV
        , ROUND(AVG((
        (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6 AND SEQUENCIA = ITE.SEQUENCIA),0)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7 AND SEQUENCIA = ITE.SEQUENCIA),0)
        - (NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
        ) * (CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END)),2) AS MAR_NON
    
        , ROUND(AVG((
        (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRICMS) 
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 6 AND SEQUENCIA = ITE.SEQUENCIA),0)
        - NVL((SELECT SUM(VALOR) FROM TGFDIN WHERE NUNOTA = CAB.NUNOTA AND CODIMP = 7 AND SEQUENCIA = ITE.SEQUENCIA),0)
        - (NVL(CUS.CUSSEMICM,0) * ITE.QTDNEG)
        ) * 100 / 
        NULLIF((ITE.VLRTOT + ITE.VLRIPI + ITE.VLRSUBST - ITE.VLRDESC),0)),2) AS MAR_PERC
            
        FROM TGFCAB CAB
        INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER AND TOP.DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
        INNER JOIN TGFPRO PRO ON ITE.CODPROD = PRO.CODPROD
        LEFT JOIN TGFCUS CUS ON CUS.CODPROD = ITE.CODPROD AND CUS.CODEMP = CAB.CODEMP AND CUS.DTATUAL = (SELECT MAX(C.DTATUAL) FROM TGFCUS C WHERE C.CODEMP = CAB.CODEMP AND C.CODPROD = ITE.CODPROD AND DTATUAL <= CAB.DTNEG)
        INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
        INNER JOIN TSICID CID ON PAR.CODCID = CID.CODCID
        INNER JOIN TGFVEN VEN ON CAB.CODVEND = VEN.CODVEND
        INNER JOIN TGFVEN VEN1 ON VEN.CODGER = VEN1.CODVEND
        INNER JOIN TGFVEN VEN2 ON VEN.AD_SUPERVISOR = VEN2.CODVEND
        WHERE TOP.GOLSINAL = -1 
        AND (CAB.DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN)
        
        AND TOP.TIPMOV IN ('V', 'D')
        AND TOP.ATIVO = 'S'
        AND VEN1.APELIDO = :A_GERENTE
        AND CAB.CODEMP IN (:P_EMPRESA)
        AND CAB.CODNAT IN (:P_NATUREZA)
        AND CAB.CODCENCUS IN (:P_CR)
        AND CAB.CODVEND IN (:P_VENDEDOR)
        AND VEN.AD_SUPERVISOR IN (:P_SUPERVISOR)

        AND VEN.AD_ROTA IN (:P_ROTA)
        GROUP BY VEN2.APELIDO,ITE.CODPROD||' - '||PRO.DESCRPROD
        ORDER BY 1, 4 DESC

    
    </snk:query> 


    <div class="header-section">
        <div class="container" id="button-container"></div>
    </div>

    <div class="container-fluid">
        <div class="row">
            <div class="col-md-6 left-section">
                <div class="chart-title">Faturamento por Supervisor</div>
                <canvas id="doughnutChart"></canvas>
                <c:forEach items="${tot_ger.rows}" var="row">                    
                    <div class="overlay-text"><fmt:formatNumber value="${row.VLRFAT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                </c:forEach>
            </div>
            <div class="col-md-6 right-section">
                <div class="chart-title">Detalhamento por Produto</div>

                <!-- Filtro de Supervisor -->
                <div class="filter-container">
                    <label for="supervisorFilter">Filtro por Supervisor:</label>
                    <select id="supervisorFilter" class="form-control">
                        <option value="">Todos</option>
                        <c:forEach items="${fat_tipo.rows}" var="row">
                            <option value="${row.SUPERVISOR}">${row.SUPERVISOR}</option>
                        </c:forEach>
                    </select>
                </div>


                <div class="table-container table-scrollable">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Supervisor</th>
                                <th>Produto</th>
                                <th>Preço Médio</th>
                                <th>Vlr. Fat.</th>
                                <th>Margem Nom.</th>
                            </tr>
                        </thead>
                        <tbody id="productTableBody">
                            <c:set var="total" value="0" />
                            <c:forEach items="${fat_produto.rows}" var="row">
                                <tr class="table-row" data-supervisor="${row.SUPERVISOR}">
                                    <td>${row.SUPERVISOR}</td>
                                    <td>${row.PRODUTO}</td>
                                    <td><fmt:formatNumber value="${row.VLR_UN}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <td><fmt:formatNumber value="${row.VLRFAT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <td><fmt:formatNumber value="${row.MAR_NON}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <c:set var="total" value="${total + row.VLRFAT}" />
                                </tr>
                            </c:forEach>
                            <tr>
                                <td><b>Total</b></td>
                                <td></td>
                                <td></td>
                                <td><b><fmt:formatNumber value="${total}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></b></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <script>

            // Função para abrir o novo nível
            function abrir_ven(){
                var params = '';
                var level = 'lvl_a0togpw';
                openLevel(level, params);
            }


        // Filtrar tabela com base na seleção do supervisor
        document.getElementById('supervisorFilter').addEventListener('change', function() {
            var selectedSupervisor = this.value;
            var rows = document.querySelectorAll('#productTableBody .table-row');

            rows.forEach(function(row) {
                if (selectedSupervisor === '' || row.dataset.supervisor === selectedSupervisor) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });


            let selectedGerente = '';

            // Função para atualizar a query
            function ref_fat(GERENTE1) {
                selectedGerente = {'A_GERENTE': GERENTE1};
                const level = 'html5_ayqcy5d';
                refreshDetails(level, selectedGerente);
            }



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



        // Função para gerar botões dinamicamente
        function generateButtons(records) {
            const container = document.getElementById('button-container');

            records.forEach((record, index) => {
                const button = document.createElement('button');
                button.className = 'button';
                button.textContent = record.GERENTE; // Usar o valor da coluna GERENTE
                const gerenteValue = record.GERENTE;
                button.addEventListener('click', () => {
                    //alert( record.GERENTE );
                    ref_fat(gerenteValue);

                    
                });
                container.appendChild(button);
            });
        }

        // Obtendo dados da query e gerando botões
        const records = [
            <c:forEach items="${fat_ger.rows}" var="row">
                { GERENTE: '${row.GERENTE}' }<c:if test="${!empty row.GERENTE}">,</c:if>
            </c:forEach>
        ];

        // Chamar a função para gerar os botões
        generateButtons(records);


    </script>
</body>
</html>
