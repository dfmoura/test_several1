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
                                gap: 60px;
                                /* Ajuste do gap para aumentar o espaçamento vertical */
                                width: 90%;
                                height: 90%;
                            }

                            .section {
                                display: flex;
                                flex-direction: column;
                                gap: 30px;
                                /* Ajuste do gap para aumentar o espaçamento vertical */
                            }

                            .part {
                                background-color: #fff;
                                border: 1px solid #ddd;
                                border-radius: 10px;
                                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                                padding: 20px;
                                width: 100%;
                                height: calc(50% - 20px);
                                /* Ajuste da altura para refletir o novo gap */
                                overflow: hidden;
                                /* Impede que o conteúdo altere o tamanho da parte */
                                position: relative;
                                /* Necessário para posicionar o título */
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                                /* Centraliza verticalmente */
                                align-items: center;
                                /* Centraliza horizontalmente */
                            }

                            .part-title {
                                position: absolute;
                                top: 10px;
                                /* Espaçamento do topo */
                                left: 50%;
                                transform: translateX(-50%);
                                font-size: 18px;
                                font-weight: bold;
                                color: #333;
                                background-color: #fff;
                                /* Cor de fundo para legibilidade */
                                padding: 0 10px;
                                /* Espaçamento horizontal */
                            }

                            .chart-container {
                                width: 80%;
                                /* Ajuste da largura do gráfico */
                                height: 80%;
                                /* Ajuste da altura do gráfico */
                                display: flex;
                                justify-content: center;
                                /* Centraliza horizontalmente o gráfico */
                                align-items: center;
                                /* Centraliza verticalmente o gráfico */
                            }

                            .chart-overlay {
                                position: absolute;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                font-size: 17px;
                                font-weight: bold;
                                color: #333;
                                left: 55%;
                                /* Move o overlay 10% para a direita */
                                transform: translateX(45%);
                                /* Ajusta a posição do texto para centralizá-lo */
                                /*text-align: center; Opcional, para centralizar o texto se ele tiver várias linhas */
                            }

                            .dropdown-container {
                                display: flex;
                                justify-content: flex-start;
                                /* Alinha o dropdown à esquerda */
                                width: 100%;
                            }

                            .dropdown-container select {
                                padding: 10px;
                                border: 1px solid #ddd;
                                border-radius: 5px;
                                font-size: 16px;
                                width: 100%;
                                max-width: 300px;
                                /* Limita a largura máxima do dropdown */
                            }

                            canvas {
                                width: 100% !important;
                                height: 100% !important;
                            }

                            /* Estilo para a tabela */
                            .table-container {
                                width: 100%;
                                /* Largura da tabela ajustada para o contêiner */
                                height: 100%;
                                max-height: 200px;
                                /* Define a altura máxima para o contêiner da tabela */
                                overflow-y: auto;
                                /* Habilita a rolagem vertical */
                                overflow-x: hidden;
                                /* Desabilita a rolagem horizontal */
                                padding-right: 10px;
                                /* Espaço para evitar o corte do conteúdo na rolagem */
                                font-size: 12px;
                            }

                            .table-container table {
                                width: 100%;
                                border-collapse: collapse;
                            }

                            .table-container th,
                            .table-container td {
                                padding: 10px;
                                border: 1px solid #ddd;
                                text-align: left;
                            }

                            .table-container th {
                                background-color: #f4f4f4;
                                position: sticky;
                                top: 0;
                                /* Fixa o cabeçalho no topo ao rolar */
                                z-index: 2;
                                /* Garante que o cabeçalho fique sobre o conteúdo */
                            }

                            .table-container tr:hover {
                                background-color: #f1f1f1;
                            }
                        </style>
                        <!-- DataTables CSS -->
                        <link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">
                        <snk:load />

                    </head>


                    <body>

                        <snk:query var="tot_impostos">
                            SELECT
                            SUM(VLRIPI+VLRSUBST+VLRICMS+VLRPIS+VLRCOFINS) TOT_IMP
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

                        </snk:query>


                        <snk:query var="tot2_impostos">
                            SELECT
                            SUM(VLRIPI+VLRSUBST+VLRICMS+VLRPIS+VLRCOFINS) TOT_IMP
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
                            AND (CODTIPPARC = :A_PERFIL OR ( CODTIPPARC = 10401000 AND :A_PERFIL IS NULL) )

                        </snk:query>


                        <snk:query var="impostos">
                            SELECT * FROM (
                            WITH IMP AS
                            (
                            SELECT
                            CODTIPPARC,VLRIPI,VLRSUBST,VLRICMS,VLRPIS,VLRCOFINS
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
                            SELECT CODTIPPARC,1 AS COD,'VLRSUBST' AS IMPOSTO, SUM(VLRSUBST) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC
                            UNION ALL
                            SELECT CODTIPPARC,2 AS COD,'VLRIPI' AS IMPOSTO, SUM(VLRIPI) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC
                            UNION ALL
                            SELECT CODTIPPARC,3 AS COD,'VLRICMS' AS IMPOSTO, SUM(VLRICMS) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC
                            UNION ALL
                            SELECT CODTIPPARC,4 AS COD,'VLRPIS' AS IMPOSTO, SUM(VLRPIS) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC
                            UNION ALL
                            SELECT CODTIPPARC,5 AS COD,'VLRCOFINS' AS IMPOSTO, SUM(VLRCOFINS) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC)
                            WHERE CODTIPPARC = :A_PERFIL OR ( CODTIPPARC = 10401000 AND :A_PERFIL IS NULL)

                        </snk:query>


                        <snk:query var="impostos_perfil">
                            SELECT
                            CODTIPPARC,
                            DESCRTIPPARC,
                            SUM(VALOR) VALOR
                            FROM
                            (
                            WITH IMP AS
                            (
                            SELECT
                            CODEMP,EMPRESA,VLRIPI,VLRSUBST,VLRICMS,VLRPIS,VLRCOFINS,CODTIPPARC,DESCRTIPPARC
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
                            SELECT CODTIPPARC,DESCRTIPPARC,1 AS COD,'VLRSUBST' AS IMPOSTO, SUM(VLRSUBST) AS VALOR FROM
                            IMP GROUP BY CODTIPPARC,DESCRTIPPARC,CODEMP,EMPRESA
                            UNION ALL
                            SELECT CODTIPPARC,DESCRTIPPARC,2 AS COD,'VLRIPI' AS IMPOSTO, SUM(VLRIPI) AS VALOR FROM IMP
                            GROUP BY CODTIPPARC,DESCRTIPPARC,CODEMP,EMPRESA
                            UNION ALL
                            SELECT CODTIPPARC,DESCRTIPPARC,3 AS COD,'VLRICMS' AS IMPOSTO, SUM(VLRICMS) AS VALOR FROM IMP
                            GROUP BY CODTIPPARC,DESCRTIPPARC,CODEMP,EMPRESA
                            UNION ALL
                            SELECT CODTIPPARC,DESCRTIPPARC,4 AS COD,'PIS' AS IMPOSTO, SUM(VLRPIS) AS VALOR FROM IMP
                            GROUP BY CODTIPPARC,DESCRTIPPARC,CODEMP,EMPRESA
                            UNION ALL
                            SELECT CODTIPPARC,DESCRTIPPARC,5 AS COD,'COFINS' AS IMPOSTO, SUM(VLRCOFINS) AS VALOR FROM
                            IMP GROUP BY CODTIPPARC,DESCRTIPPARC,CODEMP,EMPRESA
                            )

                            GROUP BY CODTIPPARC, DESCRTIPPARC
                            ORDER BY VALOR DESC

                        </snk:query>

                        <snk:query var="impostos_tipo">

                            SELECT CODTIPPARC,AD_TPPROD,TIPOPROD, SUM(VALOR) AS VALOR FROM(

                            WITH IMP AS
                            (
                            SELECT
                            CODTIPPARC,DESCRTIPPARC,CODEMP,EMPRESA,AD_TPPROD,TIPOPROD,VLRIPI,VLRSUBST,VLRICMS,VLRPIS,VLRCOFINS
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

                            SELECT CODTIPPARC,AD_TPPROD,TIPOPROD, SUM(VLRSUBST) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC,AD_TPPROD,TIPOPROD
                            UNION ALL
                            SELECT CODTIPPARC,AD_TPPROD,TIPOPROD, SUM(VLRIPI) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC,AD_TPPROD,TIPOPROD
                            UNION ALL
                            SELECT CODTIPPARC,AD_TPPROD,TIPOPROD, SUM(VLRICMS) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC,AD_TPPROD,TIPOPROD
                            UNION ALL
                            SELECT CODTIPPARC,AD_TPPROD,TIPOPROD, SUM(VLRPIS) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC,AD_TPPROD,TIPOPROD
                            UNION ALL
                            SELECT CODTIPPARC,AD_TPPROD,TIPOPROD, SUM(VLRCOFINS) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC,AD_TPPROD,TIPOPROD
                            )

                            WHERE CODTIPPARC = :A_PERFIL OR ( CODTIPPARC = 10401000 AND :A_PERFIL IS NULL)
                            GROUP BY CODTIPPARC,AD_TPPROD,TIPOPROD
                            ORDER BY VALOR DESC


                        </snk:query>

                        <snk:query var="impostos_produto">
                            SELECT CODTIPPARC,CODPROD,DESCRPROD, SUM(VALOR) AS VALOR FROM(

                            WITH IMP AS
                            (
                            SELECT
                            CODTIPPARC,DESCRTIPPARC,CODEMP,EMPRESA,AD_TPPROD,TIPOPROD,CODPROD,DESCRPROD,VLRIPI,VLRSUBST,VLRICMS,VLRPIS,VLRCOFINS
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

                            SELECT CODTIPPARC,CODPROD,DESCRPROD, SUM(VLRSUBST) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC,CODPROD,DESCRPROD
                            UNION ALL
                            SELECT CODTIPPARC,CODPROD,DESCRPROD, SUM(VLRIPI) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC,CODPROD,DESCRPROD
                            UNION ALL
                            SELECT CODTIPPARC,CODPROD,DESCRPROD, SUM(VLRICMS) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC,CODPROD,DESCRPROD
                            UNION ALL
                            SELECT CODTIPPARC,CODPROD,DESCRPROD, SUM(VLRPIS) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC,CODPROD,DESCRPROD
                            UNION ALL
                            SELECT CODTIPPARC,CODPROD,DESCRPROD, SUM(VLRCOFINS) AS VALOR FROM IMP GROUP BY
                            CODTIPPARC,CODPROD,DESCRPROD

                            )
                            WHERE CODTIPPARC = :A_PERFIL OR ( CODTIPPARC = 10401000 AND :A_PERFIL IS NULL)
                            GROUP BY CODTIPPARC,CODPROD,DESCRPROD
                            ORDER BY VALOR DESC
                        </snk:query>


                        <div class="container">
                            <div class="section">
                                <div class="part" id="left-top">
                                    <div class="part-title">Valor Impostos por Perfil Cliente</div>
                                    <div class="chart-container">
                                        <canvas id="doughnutChart1"></canvas>
                                        <c:forEach items="${tot_impostos.rows}" var="row">
                                            <div class="chart-overlay">
                                                <fmt:formatNumber value="${row.TOT_IMP}" type="currency"
                                                    currencySymbol="" groupingUsed="true" minFractionDigits="0"
                                                    maxFractionDigits="0" />
                                            </div>
                                        </c:forEach>
                                    </div>
                                </div>
                                <div class="part" id="left-bottom">
                                    <div class="part-title">Perfil Cliente por Impostos</div>
                                    <div class="chart-container">
                                        <canvas id="doughnutChart"></canvas>
                                        <c:forEach items="${tot2_impostos.rows}" var="row">
                                            <div class="chart-overlay">
                                                <fmt:formatNumber value="${row.TOT_IMP}" type="currency"
                                                    currencySymbol="" groupingUsed="true" minFractionDigits="0"
                                                    maxFractionDigits="0" />
                                            </div>
                                        </c:forEach>
                                    </div>
                                </div>
                            </div>
                            <div class="section">
                                <div class="part" id="right-top">
                                    <div class="part-title">Impostos por Perfil e Grupo de Produtos</div>
                                    <div class="chart-container">
                                        <canvas id="barChartRight"></canvas>
                                    </div>
                                </div>
                                <div class="part" id="right-bottom">
                                    <div class="part-title">Impostos por Perfil e Produto</div>
                                    <div class="table-container">
                                        <table id="motivo_prod_table">
                                            <thead>
                                                <tr>
                                                    <th>Cód. Perfil.</th>

                                                    <th>Cód. Prod.</th>
                                                    <th>Produto</th>
                                                    <th>Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <c:set var="total" value="0" />
                                                <c:forEach var="item" items="${impostos_produto.rows}">
                                                    <tr>
                                                        <td>${item.CODTIPPARC}</td>
                                                        <td onclick="abrir_prod('${item.CODTIPPARC}','${item.CODPROD}')">${item.CODPROD}</td>
                                                            
                                                        <td>${item.DESCRPROD}</td>
                                                        <td>
                                                            <fmt:formatNumber value="${item.VALOR}" type="number"
                                                                currencySymbol="" groupingUsed="true"
                                                                minFractionDigits="2" maxFractionDigits="2" />
                                                        </td>
                                                        <c:set var="total" value="${total + item.VALOR}" />
                                                    </tr>
                                                </c:forEach>
                                                <tr>
                                                    <td><b>Total</b></td>

                                                    <td></td>
                                                    <td></td>
                                                    <td><b>
                                                            <fmt:formatNumber value="${total}" type="number"
                                                                currencySymbol="" groupingUsed="true"
                                                                minFractionDigits="2" maxFractionDigits="2" />
                                                        </b></td>
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
                            function ref_perfil(perfil) {
                                const params = { 'A_PERFIL': perfil };
                                refreshDetails('html5_8tt89f', params);
                            }


                            // Função para abrir o novo nível
                            function abrir_perfil(grupo, grupo1) {
                                var params = {
                                    'A_PERFIL': parseInt(grupo),
                                    'A_COD': parseInt(grupo1)
                                };
                                var level = 'lvl_vkan0l';

                                openLevel(level, params);
                            }

                            function abrir_tpprod(grupo, grupo1) {
                                var params = {
                                    'A_PERFIL': parseInt(grupo),
                                    'A_TPPROD': parseInt(grupo1)
                                };
                                var level = 'lvl_vkan0l';

                                openLevel(level, params);
                            }

                            function abrir_prod(grupo, grupo1) {
                                var params = {
                                    'A_PERFIL': parseInt(grupo),
                                    'A_CODPROD': parseInt(grupo1)
                                };
                                var level = 'lvl_vkan0l';

                                openLevel(level, params);
                            }


                            // Obtendo os dados da query JSP para o gráfico de rosca

                            var impostos = [];
                            var valoresImpostos = [];
                            <c:forEach items="${impostos.rows}" var="row">
                                impostos.push('${row.CODTIPPARC} - ${row.COD} - ${row.IMPOSTO}');
                                valoresImpostos.push('${row.VALOR}');
                            </c:forEach>
                            // Dados fictícios para o gráfico de rosca
                            const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
                            const doughnutChart = new Chart(ctxDoughnut, {
                                type: 'doughnut',
                                data: {
                                    labels: impostos,
                                    datasets: [{
                                        label: 'Impostos',
                                        data: valoresImpostos,
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
                                    onClick: function (event, elements) {
                                        if (elements.length > 0) {
                                            var index = elements[0].index;
                                            var label = impostos[index].split('-')[0];
                                            var label1 = impostos[index].split('-')[1];
                                            abrir_perfil(label, label1);
                                            //alert(label);
                                        }
                                    }
                                }
                            });


                            // Obtendo os dados da query JSP para o gráfico de rosca

                            var perimpostos = [];
                            var pervaloresImpostos = [];
                            <c:forEach items="${impostos_perfil.rows}" var="row">
                                perimpostos.push('${row.CODTIPPARC} - ${row.DESCRTIPPARC}');
                                pervaloresImpostos.push('${row.VALOR}');
                            </c:forEach>
                            // Dados fictícios para o gráfico de rosca
                            const ctxDoughnut1 = document.getElementById('doughnutChart1').getContext('2d');
                            const doughnutChart1 = new Chart(ctxDoughnut1, {
                                type: 'doughnut',
                                data: {
                                    labels: perimpostos,
                                    datasets: [{
                                        label: 'Impostos',
                                        data: pervaloresImpostos,
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
                                    onClick: function (event, elements) {
                                        if (elements.length > 0) {
                                            var index = elements[0].index;
                                            var label = perimpostos[index].split('-')[0];
                                            ref_perfil(label);
                                            //alert(label);
                                        }
                                    }
                                }
                            });





                            // Dados fictícios para o gráfico de colunas verticais
                            var tipoLabels = [];
                            var tipoData = [];
                            <c:forEach items="${impostos_tipo.rows}" var="row">
                                tipoLabels.push('${row.CODTIPPARC} - ${row.AD_TPPROD} - ${row.TIPOPROD}');
                                tipoData.push('${row.VALOR}');
                            </c:forEach>
                            const ctxBarRight = document.getElementById('barChartRight').getContext('2d');
                            const barChartRight = new Chart(ctxBarRight, {
                                type: 'bar',
                                data: {
                                    labels: tipoLabels,
                                    datasets: [{
                                        label: 'Por Tipo Produto',
                                        data: tipoData,
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
                                    onClick: function (evt, activeElements) {
                                        if (activeElements.length > 0) {
                                            const index = activeElements[0].index;
                                            const grupo = tipoLabels[index].split('-')[0];
                                            const grupo1 = tipoLabels[index].split('-')[1];
                                            abrir_tpprod(grupo, grupo1);
                                        }
                                    }
                                }
                            });

                        </script>
                    </body>

                    </html>