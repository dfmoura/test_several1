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
            font-size: 14px;
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
            left: 62%; /* Move o overlay 10% para a direita */
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
        SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
        SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)
        AS MARGEMNON
        FROM vw_rentabilidade_aco 
        WHERE tipmov IN ('V', 'D')
          
          AND AD_COMPOE_FAT = 'S'
          AND ((DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN AND :P_NUNOTA IS NULL) OR NUNOTA = :P_NUNOTA)
          AND CODEMP IN (:P_EMPRESA)
          
    </snk:query> 

    <snk:query var="fat_tipo">  

    WITH bas AS (
        SELECT 
            codemp,
            codgrupai,
            descrgrupo_nivel1,

            SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
            SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)
            AS MARGEMNON,
            

            -- Soma total por codgrupai usando OVER (PARTITION BY)
            SUM(
                SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP) + (VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS) + SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)
            ) OVER (PARTITION BY codgrupai) AS total_grupo
        FROM vw_rentabilidade_aco 
        WHERE tipmov IN ('V', 'D')
          
          AND AD_COMPOE_FAT = 'S'
          AND ((DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN AND :P_NUNOTA IS NULL) OR NUNOTA = :P_NUNOTA)
          AND CODEMP IN (:P_EMPRESA)
          
        GROUP BY codemp,codgrupai,descrgrupo_nivel1
    ),
        bas1 as (
        SELECT 
            codgrupai,
            descrgrupo_nivel1,
            MARGEMNON,
            total_grupo,
            -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
            DENSE_RANK() OVER (ORDER BY total_grupo) AS rn
        FROM bas),
        bas2 as (
        SELECT 
                CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END AS codgrupai,
                CASE WHEN rn <= 5 THEN descrgrupo_nivel1 ELSE 'Outros' END AS descrgrupo_nivel1,
                SUM(MARGEMNON) AS MARGEMNON
            FROM bas1
            GROUP BY 
                CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END,
                CASE WHEN rn <= 5 THEN descrgrupo_nivel1 ELSE 'Outros' END
        )
        Select codgrupai AD_TPPROD,descrgrupo_nivel1 TIPOPROD,SUM(MARGEMNON)MARGEMNON from bas2
        GROUP BY codgrupai,descrgrupo_nivel1 ORDER BY SUM(MARGEMNON)    

    </snk:query> 



    <snk:query var="cip_total">  	
    with bas as (
SELECT 
    codgrupai,
    codemp,
    empresa,
    
    SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
    SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT) AS MARGEMNON,
    -- Soma total por codgrupai usando OVER (PARTITION BY)
    SUM(SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
    SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)) OVER (PARTITION BY codgrupai) AS total_grupo
FROM vw_rentabilidade_aco 
WHERE tipmov IN ('V', 'D')
  
  AND AD_COMPOE_FAT = 'S'
  AND ((DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN AND :P_NUNOTA IS NULL) OR NUNOTA = :P_NUNOTA)
  AND CODEMP IN (:P_EMPRESA)
  
GROUP BY codemp, codgrupai, empresa
),
bas1 as (
SELECT 
    codgrupai,
    codemp,
    empresa,
    MARGEMNON,
    total_grupo,
    -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
    DENSE_RANK() OVER (ORDER BY total_grupo) AS rn
FROM bas),
bas2 as (
SELECT 
        CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END AS codgrupai,
        codemp,
        empresa,
        SUM(MARGEMNON) AS MARGEMNON
    FROM bas1
    GROUP BY 
        CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END,
        codemp,
        empresa
)
Select SUM(MARGEMNON)VLRCIP from bas2
WHERE (codgrupai = :A_TPPROD) 
      
    </snk:query>    
    

    <snk:query var="cip_produto">  	
        with bas as (
            SELECT 
                codgrupai,
                codemp,
                empresa,
                
                SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT) AS MARGEMNON,
                -- Soma total por codgrupai usando OVER (PARTITION BY)
                SUM(SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)) OVER (PARTITION BY codgrupai) AS total_grupo
            FROM vw_rentabilidade_aco 
            WHERE tipmov IN ('V', 'D')
              
              AND AD_COMPOE_FAT = 'S'
              AND ((DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN AND :P_NUNOTA IS NULL) OR NUNOTA = :P_NUNOTA)
              AND CODEMP IN (:P_EMPRESA)
            GROUP BY codemp, codgrupai, empresa
            ),
            bas1 as (
            SELECT 
                codgrupai,
                codemp,
                empresa,
                MARGEMNON,
                total_grupo,
                -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
                DENSE_RANK() OVER (ORDER BY total_grupo ) AS rn
            FROM bas),
            bas2 as (
            SELECT 
                    CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END AS codgrupai,
                    codemp,
                    empresa,
                    SUM(MARGEMNON) AS MARGEMNON
                FROM bas1
                GROUP BY 
                    CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END,
                    codemp,
                    empresa
            )
            Select codgrupai,codemp,empresa,SUM(MARGEMNON)MARGEMNON from bas2
            WHERE (codgrupai = :A_TPPROD) 
            GROUP BY codgrupai,codemp,empresa ORDER BY SUM(MARGEMNON)
        
    </snk:query> 
    
    

    
<snk:query var="fat_ger">

with bas as (
SELECT 
    codemp,
    codgrupai,
    codvend,
    LEFT(vendedor, 8) AS vendedor,
    SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
    SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT) AS MARGEMNON,
    -- Soma total por codgrupai usando OVER (PARTITION BY)
    SUM(SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
    SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)) OVER (PARTITION BY codgrupai) AS total_grupo
FROM vw_rentabilidade_aco 
WHERE tipmov IN ('V', 'D')
  
  AND AD_COMPOE_FAT = 'S'
  AND ((DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN AND :P_NUNOTA IS NULL) OR NUNOTA = :P_NUNOTA)
  AND CODEMP IN (:P_EMPRESA)
GROUP BY codemp, codgrupai, codvend, vendedor
),
bas1 as (
SELECT 
    codemp,
    codgrupai,
    codvend,
    vendedor,
    MARGEMNON,
    total_grupo,
    -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
    DENSE_RANK() OVER (ORDER BY total_grupo) AS rn
FROM bas),
bas2 as (
SELECT 
        CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END AS codgrupai,
        codvend,
        vendedor,
        SUM(MARGEMNON) AS MARGEMNON
    FROM bas1
    GROUP BY 
        CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END,
        codvend,
        vendedor
)
Select codgrupai,CODVEND,VENDEDOR,SUM(MARGEMNON)MARGEMNON from bas2
WHERE (codgrupai = :A_TPPROD) 
GROUP BY codgrupai,CODVEND,VENDEDOR ORDER BY SUM(MARGEMNON)
</snk:query>    
    



<snk:query var="fat_produto">

WITH bas AS (
    SELECT 
        codemp,
        codgrupai,
        descrgrupo_nivel1,
        codprod,
        descrprod,
        SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
        SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT) AS MARGEMNON,
        -- Soma total por codgrupai usando OVER (PARTITION BY)
        SUM(SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
        SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)) OVER (PARTITION BY codgrupai) AS total_grupo
    FROM vw_rentabilidade_aco 
    WHERE tipmov IN ('V', 'D')
      
      AND AD_COMPOE_FAT = 'S'
      AND ((DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN AND :P_NUNOTA IS NULL) OR NUNOTA = :P_NUNOTA)
      AND CODEMP IN (:P_EMPRESA)
    GROUP BY codemp,codgrupai,descrgrupo_nivel1,codprod,descrprod
),
    bas1 as (
    SELECT 
        codemp,
        codgrupai,
        descrgrupo_nivel1,
        codprod,
        descrprod,
        MARGEMNON,
        total_grupo,
        -- Ranking baseado no total_grupo (todos do mesmo grupo recebem o mesmo ranking)
        DENSE_RANK() OVER (ORDER BY total_grupo) AS rn
    FROM bas),
    bas2 as (
    SELECT 
            codemp,
            CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END AS codgrupai,
            CASE WHEN rn <= 5 THEN descrgrupo_nivel1 ELSE 'Outros' END AS descrgrupo_nivel1,
            codprod,
            descrprod,
            SUM(MARGEMNON) AS MARGEMNON
        FROM bas1
        GROUP BY 
            codemp,
            CASE WHEN rn <= 5 THEN codgrupai ELSE 9999 END,
            CASE WHEN rn <= 5 THEN descrgrupo_nivel1 ELSE 'Outros' END,
            codprod,
            descrprod
    )
    Select codemp,codgrupai AD_TPPROD,descrgrupo_nivel1 TIPOPROD,codprod,descrprod,SUM(MARGEMNON)MARGEMNON from bas2
    where (codgrupai = :A_TPPROD)
    GROUP BY codemp,codgrupai,descrgrupo_nivel1,codprod,descrprod ORDER BY SUM(MARGEMNON) 

</snk:query>

    <snk:query var="fat_prod_titulo">

    SELECT 
    codgrupai AD_TPPROD,descrgrupo_nivel1
    FROM vw_rentabilidade_aco 
    WHERE tipmov IN ('V', 'D')
      
      AND AD_COMPOE_FAT = 'S'
          AND ((DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN AND :P_NUNOTA IS NULL) OR NUNOTA = :P_NUNOTA)
          AND CODEMP IN (:P_EMPRESA)
        and (codgrupai = :A_TPPROD)
    group by
    codgrupai,descrgrupo_nivel1
    
    </snk:query>


    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">Margem Grupo Produto</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <c:forEach items="${fat_total.rows}" var="row">
                        <div class="chart-overlay"><fmt:formatNumber value="${row.MARGEMNON}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
                    </c:forEach>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <c:forEach items="${fat_prod_titulo.rows}" var="row">
                    <div class="part-title">Margem - ${row.descrgrupo_nivel1} - Empresa</div>
                </c:forEach>
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
                <c:forEach items="${fat_prod_titulo.rows}" var="row">
                <div class="part-title">Margem ${row.descrgrupo_nivel1} - Vendedores</div>
            </c:forEach>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <c:forEach items="${fat_prod_titulo.rows}" var="row">
                    <div class="part-title">Margem ${row.descrgrupo_nivel1} - Produtos</div>
                </c:forEach>
                <div class="table-container">
                    <table id="table">
                        <thead>
                            <tr>
                                <th>Cód. Emp.</th>
                                <th>Cód. Prod.</th>
                                <th>Produto</th>
                                <th>Total Margem</th>
                            </tr>
                        </thead>
                        <tbody>
                            <c:set var="total" value="0" />
                            <c:forEach items="${fat_produto.rows}" var="row">
                                <tr>
                                    <td>${row.CODEMP}</td>
                                    <td>${row.CODPROD}</td>
                                    <td>${row.descrprod}</td>
                                    <td><fmt:formatNumber value="${row.MARGEMNON}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                                    <c:set var="total" value="${total + row.MARGEMNON}" />
                                </tr>
                            </c:forEach>
                            <tr>
                                <td><b>Total</b></td>
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

    <!-- Carregamento otimizado das bibliotecas -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.datatables.net/1.12.1/js/jquery.dataTables.min.js"></script>
    
    <script>
        // Aguarda o carregamento completo da página
        document.addEventListener('DOMContentLoaded', function() {

        // Função para atualizar a query

        
        function ref_fat1(TIPOPROD) {
            const params1 = {'A_TPPROD': TIPOPROD};
            refreshDetails('html5_af0k7bl', params1); 
            
        }




        // Função para verificar se um elemento existe
        function elementoExiste(id) {
            const elemento = document.getElementById(id);
            return elemento !== null;
        }

        // Função para criar gráfico com verificação de dados
        function criarGraficoRosca(elementId, labels, data, opcoes) {
            if (!elementoExiste(elementId)) {
                console.warn('Elemento não encontrado: ' + elementId);
                return null;
            }
            
            if (!labels || !data || labels.length === 0 || data.length === 0) {
                console.warn('Dados insuficientes para o gráfico: ' + elementId);
                // Exibe mensagem de "sem dados" no canvas
                const canvas = document.getElementById(elementId);
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#999';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Sem dados disponíveis', canvas.width/2, canvas.height/2);
                return null;
            }

            const ctx = document.getElementById(elementId).getContext('2d');
            return new Chart(ctx, opcoes);
        }

        // Função para criar gráfico de barras com verificação de dados
        function criarGraficoBarras(elementId, labels, data, opcoes) {
            if (!elementoExiste(elementId)) {
                console.warn('Elemento não encontrado: ' + elementId);
                return null;
            }
            
            if (!labels || !data || labels.length === 0 || data.length === 0) {
                console.warn('Dados insuficientes para o gráfico de barras: ' + elementId);
                // Exibe mensagem de "sem dados" no canvas
                const canvas = document.getElementById(elementId);
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#999';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Sem dados disponíveis', canvas.width/2, canvas.height/2);
                return null;
            }

            const ctx = document.getElementById(elementId).getContext('2d');
            return new Chart(ctx, opcoes);
        }

        // Dados para o gráfico de rosca (primeiro gráfico)
        var fatTipoLabels = [];
        var fatTipoData = [];
        <c:forEach items="${fat_tipo.rows}" var="row">
            fatTipoLabels.push("${row.AD_TPPROD} - ${row.TIPOPROD}");
            fatTipoData.push(${row.MARGEMNON});
        </c:forEach>

        const opcoesDoughnut = {
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
        };

        // Cria o primeiro gráfico com verificação de dados
        const doughnutChart = criarGraficoRosca('doughnutChart', fatTipoLabels, fatTipoData, opcoesDoughnut);

        // Dados para o segundo gráfico de rosca (empresas)
        var cipTipoLabels = [];
        var cipTipoData = [];
        <c:forEach items="${cip_produto.rows}" var="row">
            cipTipoLabels.push('${row.CODEMP} - ${row.EMPRESA}');
            cipTipoData.push(${row.MARGEMNON});
        </c:forEach>        

        const opcoesDoughnut1 = {
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
        };

        // Cria o segundo gráfico com verificação de dados
        const doughnutChart1 = criarGraficoRosca('doughnutChart1', cipTipoLabels, cipTipoData, opcoesDoughnut1);

        // Dados para o gráfico de barras verticais (vendedores)
        const gerenteLabels = [];
        const gerenteData = [];
        <c:forEach items="${fat_ger.rows}" var="row">
            gerenteLabels.push("${row.CODVEND}-${row.VENDEDOR}");
            gerenteData.push(${row.MARGEMNON});
        </c:forEach>

        const opcoesBarChart = {
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
        };

        // Cria o gráfico de barras com verificação de dados
        const barChartRight = criarGraficoBarras('barChartRight', gerenteLabels, gerenteData, opcoesBarChart);

        // Log de sucesso no carregamento dos gráficos
        console.log('Gráficos carregados com sucesso');

        }); // Fechamento do DOMContentLoaded

        // Tratamento de erro geral para Chart.js
        window.addEventListener('error', function(e) {
            if (e.message && e.message.includes('Chart')) {
                console.error('Erro no carregamento dos gráficos:', e.message);
                // Exibe mensagem de erro nos canvas se necessário
                const canvasElements = document.querySelectorAll('canvas');
                canvasElements.forEach(canvas => {
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ff6b6b';
                    ctx.font = '14px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('Erro ao carregar gráfico', canvas.width/2, canvas.height/2);
                });
            }
        });

    </script>
</body>
</html>
