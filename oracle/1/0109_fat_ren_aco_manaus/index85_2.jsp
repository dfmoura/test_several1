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
        
        /* Estilo para o botão overlay de debug */
        .debug-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            transition: background-color 0.3s ease;
        }
        
        .debug-button:hover {
            background-color: #0056b3;
        }
        </style>

<snk:load/>

    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">
    <!-- SankhyaJX Library -->
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
</head>
<body>

    <!-- Query removida - será carregada dinamicamente via JX.consultar --> 

    <!-- Query removida - será carregada dinamicamente via JX.consultar --> 



    <!-- Query removida - será carregada dinamicamente via JX.consultar -->    
    

    <!-- Query removida - será carregada dinamicamente via JX.consultar --> 
    
    

    
    <!-- Query removida - será carregada dinamicamente via JX.consultar -->    
    



    <!-- Query removida - será carregada dinamicamente via JX.consultar -->

    <!-- Query removida - será carregada dinamicamente via JX.consultar -->


    <div class="container">
        <div class="section">
            <div class="part" id="left-top">
                <div class="part-title">Margem Grupo Produto</div>
                <div class="chart-container">
                    <canvas id="doughnutChart"></canvas>
                    <div id="chart-overlay-1" class="chart-overlay"><!-- Total será carregado dinamicamente --></div>
                </div>
            </div>
            <div class="part" id="left-bottom">
                <div id="part-title-2" class="part-title">Margem - Empresa</div>
                <div class="chart-container">
                    <canvas id="doughnutChart1"></canvas>
                    <div id="chart-overlay-2" class="chart-overlay"><!-- Total será carregado dinamicamente --></div>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="part" id="right-top">
                <div id="part-title-3" class="part-title">Margem - Vendedores</div>
                <div class="chart-container">
                    <canvas id="barChartRight"></canvas>
                </div>
            </div>
            <div class="part" id="right-bottom">
                <div id="part-title-4" class="part-title">Margem - Produtos</div>
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
                        <tbody id="table-body">
                            <!-- Dados serão carregados dinamicamente -->
                        </tbody>                   
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Botão de debug para mostrar parâmetros -->
    <button class="debug-button" onclick="mostrarParametros()" title="Mostrar Parâmetros">?</button>

    <!-- Carregamento otimizado das bibliotecas -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.datatables.net/1.12.1/js/jquery.dataTables.min.js"></script>
    
    <script>
        // Variáveis globais para armazenar os dados
        let fatTotalData = null;
        let fatTipoData = [];
        let cipTotalData = null;
        let cipProdutoData = [];
        let fatGerData = [];
        let fatProdutoData = [];
        let fatProdTituloData = null;

        // Função para formatar números em moeda brasileira
        function formatarMoeda(valor) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'decimal',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(valor);
        }

        // Função para formatar números com 2 casas decimais
        function formatarMoedaDecimal(valor) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'decimal',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(valor);
        }

        // Função para obter parâmetros
        async function obterParametros() {
            try {
                const periodoIni = await JX.getParametro('P_PERIODO.INI');
                const periodoFin = await JX.getParametro('P_PERIODO.FIN');
                const nunota = await JX.getParametro('P_NUNOTA');
                const empresa = await JX.getParametro('P_EMPRESA');
                const aTpprod = await JX.getParametro('A_TPPROD');
                
                return {
                    periodoIni: periodoIni || null,
                    periodoFin: periodoFin || null,
                    nunota: nunota || null,
                    empresa: empresa || null,
                    aTpprod: aTpprod || null
                };
            } catch (error) {
                console.error('Erro ao obter parâmetros:', error);
                return null;
            }
        }

        // Função para mostrar parâmetros em um alert (botão de debug)
        async function mostrarParametros() {
            try {
                const params = await obterParametros();
                let mensagem = 'Parâmetros obtidos:\n\n';
                
                if (params) {
                    mensagem += `P_PERIODO.INI: ${params.periodoIni || 'null'}\n`;
                    mensagem += `P_PERIODO.FIN: ${params.periodoFin || 'null'}\n`;
                    mensagem += `P_NUNOTA: ${params.nunota || 'null'}\n`;
                    mensagem += `P_EMPRESA: ${params.empresa || 'null'}\n`;
                    mensagem += `A_TPPROD: ${params.aTpprod || 'null'}`;
                } else {
                    mensagem += 'Erro ao obter parâmetros ou parâmetros não encontrados.';
                }
                
                alert(mensagem);
            } catch (error) {
                alert('Erro ao obter parâmetros: ' + error.message);
                console.error('Erro na função mostrarParametros:', error);
            }
        }

        // Função para carregar dados do fat_total
        async function carregarFatTotal() {
            try {
                const params = await obterParametros();
                if (!params) return;

                const query = `
                    SELECT 
                    SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                    SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)
                    AS MARGEMNON
                    FROM vw_rentabilidade_aco 
                    WHERE tipmov IN ('V', 'D')
                      AND AD_COMPOE_FAT = 'S'
                      AND ((DTNEG BETWEEN '${params.periodoIni}' AND '${params.periodoFin}' AND '${params.nunota}' IS NULL) OR NUNOTA = '${params.nunota}')
                      AND CODEMP IN (${params.empresa})
                `;
                
                fatTotalData = await JX.consultar(query);
                if (fatTotalData && fatTotalData.length > 0) {
                    document.getElementById('chart-overlay-1').textContent = formatarMoeda(fatTotalData[0].MARGEMNON);
                }
            } catch (error) {
                console.error('Erro ao carregar fat_total:', error);
            }
        }

        // Função para carregar dados do fat_tipo
        async function carregarFatTipo() {
            try {
                const params = await obterParametros();
                if (!params) return;

                const query = `
                    WITH bas AS (
                        SELECT 
                            codemp,
                            codgrupai,
                            descrgrupo_nivel1,
                            SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                            SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)
                            AS MARGEMNON,
                            SUM(
                                SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP) + (VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                                SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS) + SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)
                            ) OVER (PARTITION BY codgrupai) AS total_grupo
                        FROM vw_rentabilidade_aco 
                        WHERE tipmov IN ('V', 'D')
                          AND AD_COMPOE_FAT = 'S'
                          AND ((DTNEG BETWEEN '${params.periodoIni}' AND '${params.periodoFin}' AND '${params.nunota}' IS NULL) OR NUNOTA = '${params.nunota}')
                          AND CODEMP IN (${params.empresa})
                        GROUP BY codemp,codgrupai,descrgrupo_nivel1
                    ),
                    bas1 as (
                        SELECT 
                            codgrupai,
                            descrgrupo_nivel1,
                            MARGEMNON,
                            total_grupo,
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
                `;
                
                fatTipoData = await JX.consultar(query);
            } catch (error) {
                console.error('Erro ao carregar fat_tipo:', error);
            }
        }

        // Função para carregar dados do cip_total
        async function carregarCipTotal() {
            try {
                const params = await obterParametros();
                if (!params || !params.aTpprod) return;

                const query = `
                    with bas as (
                    SELECT 
                        codgrupai,
                        codemp,
                        empresa,
                        SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                        SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT) AS MARGEMNON,
                        SUM(SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                        SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)) OVER (PARTITION BY codgrupai) AS total_grupo
                    FROM vw_rentabilidade_aco 
                    WHERE tipmov IN ('V', 'D')
                      AND AD_COMPOE_FAT = 'S'
                      AND ((DTNEG BETWEEN '${params.periodoIni}' AND '${params.periodoFin}' AND '${params.nunota}' IS NULL) OR NUNOTA = '${params.nunota}')
                      AND CODEMP IN (${params.empresa})
                    GROUP BY codemp, codgrupai, empresa
                    ),
                    bas1 as (
                    SELECT 
                        codgrupai,
                        codemp,
                        empresa,
                        MARGEMNON,
                        total_grupo,
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
                    WHERE (codgrupai = ${params.aTpprod})
                `;
                
                cipTotalData = await JX.consultar(query);
                if (cipTotalData && cipTotalData.length > 0) {
                    document.getElementById('chart-overlay-2').textContent = formatarMoeda(cipTotalData[0].VLRCIP);
                }
            } catch (error) {
                console.error('Erro ao carregar cip_total:', error);
            }
        }

        // Função para carregar dados do cip_produto
        async function carregarCipProduto() {
            try {
                const params = await obterParametros();
                if (!params || !params.aTpprod) return;

                const query = `
                    with bas as (
                        SELECT 
                            codgrupai,
                            codemp,
                            empresa,
                            SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                            SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT) AS MARGEMNON,
                            SUM(SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                            SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)) OVER (PARTITION BY codgrupai) AS total_grupo
                        FROM vw_rentabilidade_aco 
                        WHERE tipmov IN ('V', 'D')
                          AND AD_COMPOE_FAT = 'S'
                          AND ((DTNEG BETWEEN '${params.periodoIni}' AND '${params.periodoFin}' AND '${params.nunota}' IS NULL) OR NUNOTA = '${params.nunota}')
                          AND CODEMP IN (${params.empresa})
                        GROUP BY codemp, codgrupai, empresa
                        ),
                        bas1 as (
                        SELECT 
                            codgrupai,
                            codemp,
                            empresa,
                            MARGEMNON,
                            total_grupo,
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
                        WHERE (codgrupai = ${params.aTpprod}) 
                        GROUP BY codgrupai,codemp,empresa ORDER BY SUM(MARGEMNON)
                `;
                
                cipProdutoData = await JX.consultar(query);
            } catch (error) {
                console.error('Erro ao carregar cip_produto:', error);
            }
        }

        // Função para carregar dados do fat_ger
        async function carregarFatGer() {
            try {
                const params = await obterParametros();
                if (!params || !params.aTpprod) return;

                const query = `
                    with bas as (
                    SELECT 
                        codemp,
                        codgrupai,
                        codvend,
                        LEFT(vendedor, 8) AS vendedor,
                        SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                        SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT) AS MARGEMNON,
                        SUM(SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                        SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)) OVER (PARTITION BY codgrupai) AS total_grupo
                    FROM vw_rentabilidade_aco 
                    WHERE tipmov IN ('V', 'D')
                      AND AD_COMPOE_FAT = 'S'
                      AND ((DTNEG BETWEEN '${params.periodoIni}' AND '${params.periodoFin}' AND '${params.nunota}' IS NULL) OR NUNOTA = '${params.nunota}')
                      AND CODEMP IN (${params.empresa})
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
                    WHERE (codgrupai = ${params.aTpprod}) 
                    GROUP BY codgrupai,CODVEND,VENDEDOR ORDER BY SUM(MARGEMNON)
                `;
                
                fatGerData = await JX.consultar(query);
            } catch (error) {
                console.error('Erro ao carregar fat_ger:', error);
            }
        }

        // Função para carregar dados do fat_produto
        async function carregarFatProduto() {
            try {
                const params = await obterParametros();
                if (!params || !params.aTpprod) return;

                const query = `
                    WITH bas AS (
                        SELECT 
                            codemp,
                            codgrupai,
                            descrgrupo_nivel1,
                            codprod,
                            descrprod,
                            SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                            SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT) AS MARGEMNON,
                            SUM(SUM(CASE WHEN TIPMOV = 'V' THEN (VLRTOT)-(VLRDESC1)-(VLRDESCTOT_PROP)+(VLRSUBST_PROP)-(VLRREPRED) ELSE 0 END)-
                            SUM(VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)+SUM(VLRSUBST_PROP) - SUM(CUSENTSEMICM_TOT)) OVER (PARTITION BY codgrupai) AS total_grupo
                        FROM vw_rentabilidade_aco 
                        WHERE tipmov IN ('V', 'D')
                          AND AD_COMPOE_FAT = 'S'
                          AND ((DTNEG BETWEEN '${params.periodoIni}' AND '${params.periodoFin}' AND '${params.nunota}' IS NULL) OR NUNOTA = '${params.nunota}')
                          AND CODEMP IN (${params.empresa})
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
                        where (codgrupai = ${params.aTpprod})
                        GROUP BY codemp,codgrupai,descrgrupo_nivel1,codprod,descrprod ORDER BY SUM(MARGEMNON)
                `;
                
                fatProdutoData = await JX.consultar(query);
                atualizarTabelaProdutos();
            } catch (error) {
                console.error('Erro ao carregar fat_produto:', error);
            }
        }

        // Função para carregar dados do fat_prod_titulo
        async function carregarFatProdTitulo() {
            try {
                const params = await obterParametros();
                if (!params || !params.aTpprod) return;

                const query = `
                    SELECT 
                    codgrupai AD_TPPROD,descrgrupo_nivel1
                    FROM vw_rentabilidade_aco 
                    WHERE tipmov IN ('V', 'D')
                      AND AD_COMPOE_FAT = 'S'
                      AND ((DTNEG BETWEEN '${params.periodoIni}' AND '${params.periodoFin}' AND '${params.nunota}' IS NULL) OR NUNOTA = '${params.nunota}')
                      AND CODEMP IN (${params.empresa})
                      and (codgrupai = ${params.aTpprod})
                    group by
                    codgrupai,descrgrupo_nivel1
                `;
                
                fatProdTituloData = await JX.consultar(query);
                if (fatProdTituloData && fatProdTituloData.length > 0) {
                    const titulo = fatProdTituloData[0].descrgrupo_nivel1;
                    document.getElementById('part-title-2').textContent = `Margem - ${titulo} - Empresa`;
                    document.getElementById('part-title-3').textContent = `Margem ${titulo} - Vendedores`;
                    document.getElementById('part-title-4').textContent = `Margem ${titulo} - Produtos`;
                }
            } catch (error) {
                console.error('Erro ao carregar fat_prod_titulo:', error);
            }
        }

        // Função para atualizar tabela de produtos
        function atualizarTabelaProdutos() {
            const tbody = document.getElementById('table-body');
            tbody.innerHTML = '';
            
            if (!fatProdutoData || fatProdutoData.length === 0) {
                return;
            }

            let total = 0;
            fatProdutoData.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.CODEMP}</td>
                    <td>${row.CODPROD}</td>
                    <td>${row.descrprod}</td>
                    <td>${formatarMoedaDecimal(row.MARGEMNON)}</td>
                `;
                tbody.appendChild(tr);
                total += parseFloat(row.MARGEMNON || 0);
            });

            // Adicionar linha de total
            const totalRow = document.createElement('tr');
            totalRow.innerHTML = `
                <td><b>Total</b></td>
                <td></td>
                <td></td>
                <td><b>${formatarMoedaDecimal(total)}</b></td>
            `;
            tbody.appendChild(totalRow);
        }

        // Função para atualizar a query
        function ref_fat1(TIPOPROD) {
            // Atualizar parâmetro A_TPPROD e recarregar dados relacionados
            JX.setParametro('A_TPPROD', TIPOPROD).then(() => {
                carregarCipTotal();
                carregarCipProduto();
                carregarFatGer();
                carregarFatProduto();
                carregarFatProdTitulo();
                recriarGraficos();
            });
        }

        // Aguarda o carregamento completo da página
        document.addEventListener('DOMContentLoaded', function() {




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

        // Função para carregar todos os dados
        async function carregarTodosDados() {
            await Promise.all([
                carregarFatTotal(),
                carregarFatTipo(),
                carregarCipTotal(),
                carregarCipProduto(),
                carregarFatGer(),
                carregarFatProduto(),
                carregarFatProdTitulo()
            ]);
            
            // Criar gráficos após carregar os dados
            criarGraficos();
        }

        // Função para recriar gráficos (usada quando parâmetros mudam)
        function recriarGraficos() {
            // Destruir gráficos existentes
            if (window.doughnutChart) {
                window.doughnutChart.destroy();
            }
            if (window.doughnutChart1) {
                window.doughnutChart1.destroy();
            }
            if (window.barChartRight) {
                window.barChartRight.destroy();
            }
            
            // Recriar gráficos
            criarGraficos();
        }

        // Função para criar todos os gráficos
        function criarGraficos() {
            // Dados para o gráfico de rosca (primeiro gráfico)
            var fatTipoLabels = [];
            var fatTipoDataValues = [];
            fatTipoData.forEach(row => {
                fatTipoLabels.push(`${row.AD_TPPROD} - ${row.TIPOPROD}`);
                fatTipoDataValues.push(row.MARGEMNON);
            });

        const opcoesDoughnut = {
            type: 'doughnut',
            data: {
                labels: fatTipoLabels,
                datasets: [{
                    label: 'My Doughnut Chart',
                    data: fatTipoDataValues,
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
        window.doughnutChart = criarGraficoRosca('doughnutChart', fatTipoLabels, fatTipoDataValues, opcoesDoughnut);

        // Dados para o segundo gráfico de rosca (empresas)
        var cipTipoLabels = [];
        var cipTipoDataValues = [];
        cipProdutoData.forEach(row => {
            cipTipoLabels.push(`${row.CODEMP} - ${row.EMPRESA}`);
            cipTipoDataValues.push(row.MARGEMNON);
        });        

        const opcoesDoughnut1 = {
            type: 'doughnut',
            data: {
                labels: cipTipoLabels,
                datasets: [{
                    label: 'CIP',
                    data: cipTipoDataValues,
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
        window.doughnutChart1 = criarGraficoRosca('doughnutChart1', cipTipoLabels, cipTipoDataValues, opcoesDoughnut1);

        // Dados para o gráfico de barras verticais (vendedores)
        const gerenteLabels = [];
        const gerenteData = [];
        fatGerData.forEach(row => {
            gerenteLabels.push(`${row.CODVEND}-${row.VENDEDOR}`);
            gerenteData.push(row.MARGEMNON);
        });

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
        window.barChartRight = criarGraficoBarras('barChartRight', gerenteLabels, gerenteData, opcoesBarChart);

        // Log de sucesso no carregamento dos gráficos
        console.log('Gráficos carregados com sucesso');
        }

        // Inicialização - carregar dados e criar gráficos
        carregarTodosDados();

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
