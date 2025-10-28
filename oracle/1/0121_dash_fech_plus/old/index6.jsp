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
<title>Dashboard Fechamento Plus</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>

<style>
    /* Estilos base */
    body {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        padding-top: 60px !important;
        min-height: 100vh;
    }

    /* Fixed header styles */
    .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 60px;
        background: linear-gradient(135deg, #008a70, #00695e);
        box-shadow: 0 4px 20px rgba(0, 138, 112, 0.3);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 20px;
    }
    
    .header-logo {
        position: absolute;
        left: 20px;
        display: flex;
        align-items: center;
    }
    
    .header-logo img {
        width: 40px;
        height: auto;
        filter: brightness(0) invert(1);
        transition: transform 0.3s ease;
    }
    
    .header-logo img:hover {
        transform: scale(1.1);
    }
    
    .header-title {
        color: white;
        font-size: 1.8rem;
        font-weight: 700;
        margin: 0;
        text-align: center;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        letter-spacing: 1px;
    }

    /* Container principal */
    .main-container {
        padding: 30px 20px;
        max-width: 1400px;
        margin: 0 auto;
    }

    /* Cards superiores */
    .dashboard-card {
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        border: none;
        overflow: hidden;
        height: 160px;
        position: relative;
    }

    .dashboard-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    .dashboard-card .card-body {
        padding: 25px;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
    }

    .card-icon {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
    }

    .card-title {
        font-size: 14px;
        font-weight: 600;
        color: #6e6e6e;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .card-value {
        font-size: 28px;
        font-weight: 800;
        color: #2c3e50;
        margin-bottom: 5px;
        line-height: 1.2;
    }

    .card-subtitle {
        font-size: 12px;
        color: #9c9c9c;
        font-weight: 500;
    }

    /* Cores específicas dos cards */
    .card-faturamento .card-icon {
        background: linear-gradient(135deg, #00afa0, #008a70);
    }

    .card-meta .card-icon {
        background: linear-gradient(135deg, #00b4cd, #00695e);
    }

    .card-atingido .card-icon {
        background: linear-gradient(135deg, #50af32, #a2c73b);
    }

    .card-comissao .card-icon {
        background: linear-gradient(135deg, #ffb914, #f56e1e);
    }

    /* Seção de gráficos */
    .charts-section {
        margin-top: 40px;
    }

    .chart-container {
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        padding: 30px;
        margin-bottom: 30px;
        height: 450px;
    }

    .chart-title {
        font-size: 20px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 20px;
        text-align: center;
        position: relative;
    }

    .chart-title::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 3px;
        background: linear-gradient(135deg, #008a70, #00afa0);
        border-radius: 2px;
    }

    .chart-wrapper {
        height: 350px;
        position: relative;
    }

    /* Loading states */
    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        flex-direction: column;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #008a70;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .loading-text {
        color: #6e6e6e;
        font-size: 14px;
        font-weight: 500;
    }

    /* Responsividade */
    @media (max-width: 768px) {
        .header-title {
            font-size: 1.4rem;
        }
        
        .header-logo {
            left: 10px;
        }
        
        .header-logo img {
            width: 35px;
        }
        
        .fixed-header {
            height: 50px;
            padding: 0 10px;
        }
        
        body {
            padding-top: 50px !important;
        }

        .main-container {
            padding: 20px 15px;
        }

        .dashboard-card {
            height: 140px;
            margin-bottom: 20px;
        }

        .dashboard-card .card-body {
            padding: 20px;
        }

        .card-value {
            font-size: 24px;
        }

        .chart-container {
            padding: 20px;
            height: 400px;
        }

        .chart-wrapper {
            height: 300px;
        }
    }

    @media (max-width: 576px) {
        .main-container {
            padding: 15px 10px;
        }

        .dashboard-card {
            height: 120px;
        }

        .dashboard-card .card-body {
            padding: 15px;
        }

        .card-value {
            font-size: 20px;
        }

        .card-icon {
            width: 40px;
            height: 40px;
            font-size: 20px;
        }
    }
</style>
</head>

<body>
    <!-- Fixed Header -->
    <div class="fixed-header">
        <div class="header-logo">
            <a href="https://neuon.com.br/" target="_blank" rel="noopener noreferrer">
                <img src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg" alt="Neuon Logo">
            </a>
        </div>
        <h1 class="header-title">Dashboard Fechamento Plus</h1>
    </div>

    <div class="main-container">
        <!-- Cards Superiores -->
        <div class="row mb-4">
            <div class="col-lg-3 col-md-6 mb-4">
                <div class="card dashboard-card card-faturamento">
                    <div class="card-body">
                        <div class="card-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div>
                            <div class="card-title">Faturamento</div>
                            <div class="card-value" id="faturamento-valor">R$ 0,00</div>
                            <div class="card-subtitle">Valor Real</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-3 col-md-6 mb-4">
                <div class="card dashboard-card card-meta">
                    <div class="card-body">
                        <div class="card-icon">
                            <i class="fas fa-target"></i>
                        </div>
                        <div>
                            <div class="card-title">Meta</div>
                            <div class="card-value" id="meta-valor">R$ 0,00</div>
                            <div class="card-subtitle">Valor Previsto</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-3 col-md-6 mb-4">
                <div class="card dashboard-card card-atingido">
                    <div class="card-body">
                        <div class="card-icon">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div>
                            <div class="card-title">% Atingido</div>
                            <div class="card-value" id="atingido-valor">0%</div>
                            <div class="card-subtitle">Meta Atingida</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-3 col-md-6 mb-4">
                <div class="card dashboard-card card-comissao">
                    <div class="card-body">
                        <div class="card-icon">
                            <i class="fas fa-coins"></i>
                        </div>
                        <div>
                            <div class="card-title">Comissão Plus</div>
                            <div class="card-value" id="comissao-valor">R$ 0,00</div>
                            <div class="card-subtitle">Valor Benefício</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Seção de Gráficos -->
        <div class="charts-section">
            <div class="row">
                <!-- Gráfico de Linha - Real x Meta Mês a Mês -->
                <div class="col-lg-6 mb-4">
                    <div class="chart-container">
                        <h3 class="chart-title">Real x Meta - Evolução Mensal</h3>
                        <div class="chart-wrapper">
                            <canvas id="lineChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Gráfico de Colunas - Top 10 Vendedores -->
                <div class="col-lg-6 mb-4">
                    <div class="chart-container">
                        <h3 class="chart-title">Top 10 Vendedores - Real x Meta</h3>
                        <div class="chart-wrapper">
                            <canvas id="barChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Variáveis globais para os gráficos
        let lineChart = null;
        let barChart = null;
        
        // Função para formatar valores monetários
        function formatCurrency(value) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        }

        // Função para formatar percentuais
        function formatPercentage(value) {
            return value.toFixed(1) + '%';
        }

        // Função para carregar dados dos cards usando SankhyaJX
        async function loadCardsData() {
            try {
                // Query para buscar dados de faturamento, meta e percentual atingido
                const sql = `
                    SELECT
                        SUM(VLR_PREV) AS VLR_PREV,
                        SUM(VLR_REAL) AS VLR_REAL,
                        CASE WHEN SUM(QTDPREV) = 0 THEN 0 ELSE SUM(QTDREAL) * 100 / NULLIF(SUM(QTDPREV), 0) END AS PERC
                    FROM (
                        SELECT
                            DTREF,
                            CODMETA,
                            CODVEND,
                            APELIDO,
                            CODGER,
                            CODPARC,
                            PARCEIRO,
                            MARCA,
                            CODGRUPOPROD,
                            SUM(QTDPREV) AS QTDPREV,
                            SUM(QTDREAL) AS QTDREAL,
                            SUM(QTDPREV * PRECOLT) AS VLR_PREV,
                            SUM(NVL(VLRREAL, 0)) AS VLR_REAL
                        FROM (
                            SELECT MET.CODMETA,MET.DTREF, NVL(MET.CODVEND,0) AS CODVEND, NVL(VEN.APELIDO,0) AS APELIDO,NVL(VEN.CODGER,0) AS CODGER, NVL(MET.CODPARC,0) AS CODPARC, 
                            NVL(PAR.RAZAOSOCIAL,0) AS PARCEIRO, 
                            NVL(MET.MARCA,0) AS MARCA,
                            NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD) AS CODGRUPOPROD,
                            NVL(VGF.CODCENCUS,0) AS CODCENCUS, 
                            NVL(MET.QTDPREV,0) AS QTDPREV, 
                            SUM(NVL(VGF.QTD,0)) AS QTDREAL,
                            NVL(PRC.VLRVENDALT,0)AS PRECOLT, 
                            SUM(NVL(VGF.VLR,0)) AS VLRREAL
                            FROM TGFMET MET
                            LEFT JOIN TGFMAR MAR ON MAR.DESCRICAO = MET.MARCA
                            LEFT JOIN VGF_VENDAS_SATIS VGF ON MET.DTREF = TRUNC(VGF.DTMOV,'MM') AND MET.CODVEND = VGF.CODVEND AND MET.CODPARC = VGF.CODPARC AND MET.MARCA = VGF.MARCA AND VGF.BONIFICACAO = 'N'
                            LEFT JOIN AD_PRECOMARCA PRC ON (MET.MARCA = PRC.MARCA AND PRC.CODMETA = MET.CODMETA AND PRC.DTREF = (SELECT MAX(DTREF) FROM AD_PRECOMARCA WHERE CODMETA = MET.CODMETA AND DTREF <= MET.DTREF AND MARCA = MET.MARCA))
                            LEFT JOIN TGFPAR PAR ON MET.CODPARC = PAR.CODPARC
                            LEFT JOIN TGFVEN VEN ON MET.CODVEND = VEN.CODVEND
                            GROUP BY NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD), MET.CODMETA,MET.DTREF,NVL(MET.CODVEND,0),NVL(VEN.APELIDO,0),NVL(VEN.CODGER,0),NVL(MET.CODPARC,0),NVL(PAR.RAZAOSOCIAL,0),NVL(MET.MARCA,0),NVL(VGF.CODCENCUS,0), NVL(MET.QTDPREV,0), NVL(PRC.VLRVENDALT,0)
                        )
                        WHERE 
                            CODMETA = 4
                            AND (DTREF BETWEEN 
                                (SELECT INISAFRA FROM AD_FECHAPLUS WHERE CODFECH = 1)
                            AND (SELECT FINSAFRA FROM AD_FECHAPLUS WHERE CODFECH = 1))
                            AND (
                                CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) 
                                OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO)
                                OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.AD_COORDENADOR AND USU.CODUSU = STP_GET_CODUSULOGADO)
                                OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' 
                            )
                        GROUP BY
                            DTREF,
                            CODMETA,
                            CODVEND,
                            APELIDO,
                            CODGER,
                            CODPARC,
                            PARCEIRO,
                            MARCA,
                            CODGRUPOPROD
                    )
                `;

                // Executar query usando SankhyaJX
                const resultado = await JX.consultar(sql);
                
                // Query para buscar dados de comissão
                const sqlComissao = `
                    SELECT SUM(BASECALC) AS VLRBENEFICIO
                    FROM AD_REALSINTET
                    WHERE CODFECH = 1
                `;
                
                const resultadoComissao = await JX.consultar(sqlComissao);

                // Processar dados
                let vlrReal = 0;
                let vlrPrev = 0;
                let percentualAtingido = 0;
                let vlrComissao = 0;

                if (resultado && resultado.length > 0) {
                    const dados = resultado[0];
                    vlrReal = parseFloat(dados.VLR_REAL) || 0;
                    vlrPrev = parseFloat(dados.VLR_PREV) || 0;
                    percentualAtingido = parseFloat(dados.PERC) || 0;
                }

                if (resultadoComissao && resultadoComissao.length > 0) {
                    vlrComissao = parseFloat(resultadoComissao[0].VLRBENEFICIO) || 0;
                }

                // Atualizar cards
                document.getElementById('faturamento-valor').textContent = formatCurrency(vlrReal);
                document.getElementById('meta-valor').textContent = formatCurrency(vlrPrev);
                document.getElementById('atingido-valor').textContent = formatPercentage(percentualAtingido);
                document.getElementById('comissao-valor').textContent = formatCurrency(vlrComissao);

                // Aplicar cores baseadas no percentual atingido
                const atingidoElement = document.getElementById('atingido-valor');
                if (percentualAtingido >= 100) {
                    atingidoElement.style.color = '#50af32'; // Verde
                } else if (percentualAtingido >= 80) {
                    atingidoElement.style.color = '#ffb914'; // Amarelo
                } else {
                    atingidoElement.style.color = '#e30613'; // Vermelho
                }

            } catch (error) {
                console.error('Erro ao carregar dados dos cards:', error);
                // Definir valores padrão em caso de erro
                document.getElementById('faturamento-valor').textContent = 'R$ 0,00';
                document.getElementById('meta-valor').textContent = 'R$ 0,00';
                document.getElementById('atingido-valor').textContent = '0%';
                document.getElementById('comissao-valor').textContent = 'R$ 0,00';
            }
        }

        // Função para carregar dados do gráfico de linha usando SankhyaJX
        async function loadLineChartData() {
            // TEMPORÁRIO: Usar dados estáticos para testar se o problema é na query ou no gráfico
            console.log('Carregando gráfico de linha com dados de teste...');
            
            // Dados de teste estáticos
            const testLabels = ['01/2024', '02/2024', '03/2024', '04/2024', '05/2024', '06/2024'];
            const testRealData = [120000, 95000, 130000, 110000, 140000, 125000];
            const testMetaData = [100000, 110000, 120000, 115000, 130000, 120000];
            
            // Tentar criar o gráfico imediatamente
            try {
                createLineChart(testLabels, testRealData, testMetaData);
                console.log('Gráfico de linha criado com sucesso!');
            } catch (error) {
                console.error('Erro ao criar gráfico de linha:', error);
                showChartError('lineChart', 'Erro ao criar gráfico: ' + error.message);
            }
            
            // TODO: Implementar query real depois que o gráfico básico funcionar
            /*
            try {
                // Verificar se JX está disponível
                if (typeof JX === 'undefined' || !JX.consultar) {
                    console.error('SankhyaJX não está disponível');
                    showChartError('lineChart', 'SankhyaJX não está carregado');
                    return;
                }

                // Query exata da query_real_meta1.sql
                const sql = `...`;

                const data = await JX.consultar(sql);

                if (data && data.length > 0) {
                    const labels = data.map(item => item.MES_ANO);
                    const realData = data.map(item => parseFloat(item.VLR_REAL) || 0);
                    const metaData = data.map(item => parseFloat(item.VLR_PREV) || 0);

                    createLineChart(labels, realData, metaData);
                } else {
                    showChartError('lineChart', 'Nenhum dado encontrado para o gráfico de evolução mensal');
                }

            } catch (error) {
                console.error('Erro ao carregar dados do gráfico de linha:', error);
                showChartError('lineChart', 'Erro ao carregar dados: ' + error.message);
            }
            */
        }

        // Função para carregar dados do gráfico de barras usando SankhyaJX
        async function loadBarChartData() {
            try {
                const sql = `
                    SELECT
                        CODVEND,
                        APELIDO,
                        VLR_PREV,
                        VLR_REAL,
                        PERC
                    FROM (
                        SELECT
                            CODVEND,
                            APELIDO,
                            SUM(QTDPREV) AS QTDPREV,
                            SUM(QTDREAL) AS QTDREAL,
                            SUM(VLR_PREV) AS VLR_PREV,
                            SUM(VLR_REAL) AS VLR_REAL,
                            CASE WHEN SUM(QTDPREV) = 0 THEN 0 ELSE SUM(QTDREAL) * 100 / NULLIF(SUM(QTDPREV), 0) END AS PERC,
                            CASE WHEN SUM(VLR_PREV) = 0 THEN 0 ELSE NVL(SUM(VLR_REAL) * 100 / NULLIF(SUM(VLR_PREV), 0), 0) END AS PERC_VLR
                        FROM (
                            SELECT
                                DTREF,
                                CODMETA,
                                CODVEND,
                                APELIDO,
                                CODGER,
                                CODPARC,
                                PARCEIRO,
                                MARCA,
                                CODGRUPOPROD,
                                SUM(QTDPREV) AS QTDPREV,
                                SUM(QTDREAL) AS QTDREAL,
                                SUM(QTDPREV * PRECOLT) AS VLR_PREV,
                                SUM(NVL(VLRREAL, 0)) AS VLR_REAL
                            FROM (
                                SELECT MET.CODMETA,MET.DTREF, NVL(MET.CODVEND,0) AS CODVEND, NVL(VEN.APELIDO,0) AS APELIDO,NVL(VEN.CODGER,0) AS CODGER, NVL(MET.CODPARC,0) AS CODPARC, 
                                NVL(PAR.RAZAOSOCIAL,0) AS PARCEIRO, 
                                NVL(MET.MARCA,0) AS MARCA,
                                NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD) AS CODGRUPOPROD,
                                NVL(VGF.CODCENCUS,0) AS CODCENCUS, 
                                NVL(MET.QTDPREV,0) AS QTDPREV, 
                                SUM(NVL(VGF.QTD,0)) AS QTDREAL,
                                NVL(PRC.VLRVENDALT,0)AS PRECOLT, 
                                SUM(NVL(VGF.VLR,0)) AS VLRREAL
                                FROM TGFMET MET
                                LEFT JOIN TGFMAR MAR ON MAR.DESCRICAO = MET.MARCA
                                LEFT JOIN VGF_VENDAS_SATIS VGF ON MET.DTREF = TRUNC(VGF.DTMOV,'MM') AND MET.CODVEND = VGF.CODVEND AND MET.CODPARC = VGF.CODPARC AND MET.MARCA = VGF.MARCA AND VGF.BONIFICACAO = 'N'
                                LEFT JOIN AD_PRECOMARCA PRC ON (MET.MARCA = PRC.MARCA AND PRC.CODMETA = MET.CODMETA AND PRC.DTREF = (SELECT MAX(DTREF) FROM AD_PRECOMARCA WHERE CODMETA = MET.CODMETA AND DTREF <= MET.DTREF AND MARCA = MET.MARCA))
                                LEFT JOIN TGFPAR PAR ON MET.CODPARC = PAR.CODPARC
                                LEFT JOIN TGFVEN VEN ON MET.CODVEND = VEN.CODVEND
                                GROUP BY NVL(VGF.CODGRUPOPROD,MAR.AD_GRUPOPROD), MET.CODMETA,MET.DTREF,NVL(MET.CODVEND,0),NVL(VEN.APELIDO,0),NVL(VEN.CODGER,0),NVL(MET.CODPARC,0),NVL(PAR.RAZAOSOCIAL,0),NVL(MET.MARCA,0),NVL(VGF.CODCENCUS,0), NVL(MET.QTDPREV,0), NVL(PRC.VLRVENDALT,0)
                            )
                            WHERE 
                                CODMETA = 4
                                AND (DTREF BETWEEN 
                                    (SELECT INISAFRA FROM AD_FECHAPLUS WHERE CODFECH = 1)
                                AND (SELECT FINSAFRA FROM AD_FECHAPLUS WHERE CODFECH = 1))
                                AND (
                                    CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) 
                                    OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO)
                                    OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.AD_COORDENADOR AND USU.CODUSU = STP_GET_CODUSULOGADO)
                                    OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' 
                                )
                            GROUP BY
                                DTREF,
                                CODMETA,
                                CODVEND,
                                APELIDO,
                                CODGER,
                                CODPARC,
                                PARCEIRO,
                                MARCA,
                                CODGRUPOPROD
                        )
                        GROUP BY CODVEND, APELIDO
                        ORDER BY PERC DESC
                    ) WHERE ROWNUM < 11
                `;

                const data = await JX.consultar(sql);

                if (data && data.length > 0) {
                    const labels = data.map(item => `${item.CODVEND} - ${item.APELIDO}`);
                    const realData = data.map(item => parseFloat(item.VLR_REAL) || 0);
                    const metaData = data.map(item => parseFloat(item.VLR_PREV) || 0);

                    createBarChart(labels, realData, metaData);
                } else {
                    showChartError('barChart', 'Nenhum dado encontrado para o gráfico de vendedores');
                }

            } catch (error) {
                console.error('Erro ao carregar dados do gráfico de barras:', error);
                showChartError('barChart', 'Erro ao carregar dados');
            }
        }

        // Função para criar gráfico de linha
        function createLineChart(labels, realData, metaData) {
            console.log('Iniciando createLineChart com dados:', { labels, realData, metaData });
            
            // Verificar se os dados são válidos
            if (!labels || !realData || !metaData || labels.length === 0) {
                console.warn('Dados inválidos para o gráfico de linha');
                showChartError('lineChart', 'Dados inválidos para o gráfico');
                return;
            }

            // Garantir que o canvas existe
            let ctx = document.getElementById('lineChart');
            if (!ctx) {
                console.log('Canvas não encontrado, criando novo...');
                const chartWrapper = document.querySelector('.chart-wrapper');
                if (chartWrapper) {
                    chartWrapper.innerHTML = '<canvas id="lineChart"></canvas>';
                    ctx = document.getElementById('lineChart');
                }
            }
            
            if (!ctx) {
                console.error('Não foi possível criar o canvas');
                showChartError('lineChart', 'Erro ao criar canvas');
                return;
            }
            
            // Destruir gráfico anterior se existir
            if (lineChart) {
                console.log('Destruindo gráfico anterior...');
                lineChart.destroy();
                lineChart = null;
            }

            // Verificar se Chart.js está disponível
            if (typeof Chart === 'undefined') {
                console.error('Chart.js não está carregado');
                showChartError('lineChart', 'Chart.js não está carregado');
                return;
            }
            
            console.log('Criando novo gráfico...');
            lineChart = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Real',
                            data: realData,
                            borderColor: '#008a70',
                            backgroundColor: 'rgba(0, 138, 112, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#008a70',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            pointRadius: 6,
                            pointHoverRadius: 8
                        },
                        {
                            label: 'Meta',
                            data: metaData,
                            borderColor: '#00afa0',
                            backgroundColor: 'rgba(0, 175, 160, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#00afa0',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            pointRadius: 6,
                            pointHoverRadius: 8,
                            borderDash: [5, 5]
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#008a70',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 11
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    }
                }
            });
            
            console.log('Gráfico de linha criado com sucesso!');
        }

        // Função para criar gráfico de barras
        function createBarChart(labels, realData, metaData) {
            // Verificar se os dados são válidos
            if (!labels || !realData || !metaData || labels.length === 0) {
                console.warn('Dados inválidos para o gráfico de barras');
                showChartError('barChart', 'Dados inválidos para o gráfico');
                return;
            }

            const ctx = document.getElementById('barChart');
            if (!ctx) {
                console.error('Elemento canvas barChart não encontrado');
                return;
            }
            
            // Destruir gráfico anterior se existir
            if (barChart) {
                barChart.destroy();
                barChart = null;
            }

            barChart = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Real',
                            data: realData,
                            backgroundColor: 'rgba(0, 138, 112, 0.8)',
                            borderColor: '#008a70',
                            borderWidth: 1,
                            borderRadius: 6,
                            borderSkipped: false,
                        },
                        {
                            label: 'Meta',
                            data: metaData,
                            backgroundColor: 'rgba(0, 175, 160, 0.8)',
                            borderColor: '#00afa0',
                            borderWidth: 1,
                            borderRadius: 6,
                            borderSkipped: false,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#008a70',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 10
                                },
                                maxRotation: 45
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            }
                        }
                    }
                }
            });
        }

        // Função para mostrar erro nos gráficos
        function showChartError(chartId, message) {
            const canvas = document.getElementById(chartId);
            const wrapper = canvas.parentElement;
            
            wrapper.innerHTML = `
                <div class="loading">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e30613; margin-bottom: 15px;"></i>
                    <div class="loading-text">${message}</div>
                </div>
            `;
        }

        // Variável para controlar se o dashboard está sendo inicializado
        let isInitializing = false;

        // Função principal de inicialização
        async function initializeDashboard() {
            // Evitar múltiplas inicializações simultâneas
            if (isInitializing) {
                console.log('Dashboard já está sendo inicializado...');
                return;
            }

            isInitializing = true;
            
            try {
                // Mostrar loading nos gráficos
                const lineChartElement = document.getElementById('lineChart');
                const barChartElement = document.getElementById('barChart');
                
                if (lineChartElement && lineChartElement.parentElement) {
                    lineChartElement.parentElement.innerHTML = `
                        <div class="loading">
                            <div class="loading-spinner"></div>
                            <div class="loading-text">Carregando dados...</div>
                        </div>
                    `;
                }
                
                if (barChartElement && barChartElement.parentElement) {
                    barChartElement.parentElement.innerHTML = `
                        <div class="loading">
                            <div class="loading-spinner"></div>
                            <div class="loading-text">Carregando dados...</div>
                        </div>
                    `;
                }

                // Carregar dados em paralelo
                await Promise.all([
                    loadCardsData(),
                    loadLineChartData(),
                    loadBarChartData()
                ]);

            } catch (error) {
                console.error('Erro ao inicializar dashboard:', error);
            } finally {
                isInitializing = false;
            }
        }

        // Inicializar quando a página carregar
        document.addEventListener('DOMContentLoaded', function() {
            // Aguardar um pouco para garantir que o SankhyaJX esteja carregado
            setTimeout(initializeDashboard, 500);
        });

        // Função para atualizar dados (pode ser chamada externamente)
        window.refreshDashboard = function() {
            if (!isInitializing) {
                initializeDashboard();
            } else {
                console.log('Dashboard está sendo inicializado, aguarde...');
            }
        };

        // Função de debug para testar o gráfico de linha
        window.testLineChart = function() {
            console.log('Testando gráfico de linha...');
            const testLabels = ['01/2024', '02/2024', '03/2024', '04/2024'];
            const testRealData = [120000, 95000, 130000, 110000];
            const testMetaData = [100000, 110000, 120000, 115000];
            createLineChart(testLabels, testRealData, testMetaData);
        };

        // Função de teste mais simples
        window.testSimpleChart = function() {
            console.log('Teste simples do gráfico...');
            
            // Verificar se Chart.js está disponível
            if (typeof Chart === 'undefined') {
                alert('Chart.js não está carregado!');
                return;
            }
            
            // Verificar se o canvas existe
            const canvas = document.getElementById('lineChart');
            if (!canvas) {
                alert('Canvas lineChart não encontrado!');
                return;
            }
            
            // Criar gráfico simples
            try {
                const ctx = canvas.getContext('2d');
                const chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Fev', 'Mar', 'Abr'],
                        datasets: [{
                            label: 'Teste',
                            data: [10, 20, 15, 25],
                            borderColor: 'blue',
                            backgroundColor: 'rgba(0, 0, 255, 0.1)'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
                console.log('Gráfico simples criado com sucesso!');
                alert('Gráfico simples criado com sucesso!');
            } catch (error) {
                console.error('Erro ao criar gráfico simples:', error);
                alert('Erro ao criar gráfico: ' + error.message);
            }
        };

        // Auto-refresh a cada 5 minutos (apenas se não estiver inicializando)
        setInterval(function() {
            if (!isInitializing) {
                initializeDashboard();
            }
        }, 300000);
    </script>
</body>
</html>