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
<title>Template Base</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>

<style>
    /* Estilos para o body */
    body {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f8f9fa;
        padding-top: 50px !important;
    }

    /* Fixed header styles */
    .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 50px;
        background: linear-gradient(135deg, #008a70, #00695e);
        box-shadow: 0 2px 8px rgba(0, 138, 112, 0.2);
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
        width: 35px;
        height: auto;
        filter: brightness(0) invert(1);
        transition: transform 0.3s ease;
    }
    
    .header-logo img:hover {
        transform: scale(1.1);
    }
    
    .header-title {
        color: white;
        font-size: 1.5rem;
        font-weight: bold;
        margin: 0;
        text-align: center;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    /* Responsividade */
    @media (max-width: 768px) {
        .header-title {
            font-size: 1.2rem;
        }
        
        .header-logo {
            left: 10px;
        }
        
        .header-logo img {
            width: 30px;
        }
        
        .fixed-header {
            height: 45px;
            padding: 0 10px;
        }
        
        body {
            padding-top: 45px !important;
        }
    }
</style>
</head>

<body class="bg-light">
    <!-- Fixed Header -->
    <div class="fixed-header">
        <div class="header-logo">
            <a href="https://neuon.com.br/" target="_blank" rel="noopener noreferrer">
                <img src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg" alt="Neuon Logo">
            </a>
        </div>
        <h1 class="header-title">Gráfico Real x Meta</h1>
    </div>

    <!-- Main Content -->
    <div class="container-fluid mt-5 pt-3">
        <div class="row">
            <div class="col-12">
                <div class="card shadow">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">
                            <i class="fas fa-chart-line mr-2"></i>
                            Evolução Real x Meta - Mês a Mês
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="position: relative; height: 400px;">
                            <canvas id="lineChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let lineChart = null;

        // Função para carregar dados do gráfico
        async function loadChartData() {
            try {
                // Verificar se JX está disponível
                if (typeof JX === 'undefined' || !JX.consultar) {
                    console.error('SankhyaJX não está disponível');
                    showChartError('SankhyaJX não está carregado');
                    return;
                }

                // Query baseada na query_real_meta1.sql
                const sql = `
                    SELECT
                        TO_CHAR(DTREF,'MM')MES,
                        TO_CHAR(DTREF,'YYYY')ANO,
                        TO_CHAR(DTREF,'MM/YYYY') MES_ANO,
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
                    GROUP BY 
                        TO_CHAR(DTREF,'MM'),
                        TO_CHAR(DTREF,'YYYY'),
                        TO_CHAR(DTREF,'MM/YYYY')
                    ORDER BY 2,1
                `;

                console.log('Executando consulta SQL...');
                const data = await JX.consultar(sql);
                console.log('Dados recebidos:', data);

                if (data && data.length > 0) {
                    const labels = data.map(item => item.MES_ANO);
                    const realData = data.map(item => parseFloat(item.VLR_REAL) || 0);
                    const metaData = data.map(item => parseFloat(item.VLR_PREV) || 0);

                    createLineChart(labels, realData, metaData);
                } else {
                    showChartError('Nenhum dado encontrado para o gráfico');
                }

            } catch (error) {
                console.error('Erro ao carregar dados do gráfico:', error);
                showChartError('Erro ao carregar dados: ' + error.message);
            }
        }

        // Função para criar gráfico de linha
        function createLineChart(labels, realData, metaData) {
            console.log('Criando gráfico com dados:', { labels, realData, metaData });
            
            // Verificar se os dados são válidos
            if (!labels || !realData || !metaData || labels.length === 0) {
                console.warn('Dados inválidos para o gráfico');
                showChartError('Dados inválidos para o gráfico');
                return;
            }

            // Destruir gráfico anterior se existir
            if (lineChart) {
                lineChart.destroy();
                lineChart = null;
            }

            // Verificar se Chart.js está disponível
            if (typeof Chart === 'undefined') {
                console.error('Chart.js não está carregado');
                showChartError('Chart.js não está carregado');
                return;
            }
            
            const ctx = document.getElementById('lineChart').getContext('2d');
            
            lineChart = new Chart(ctx, {
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
                                    const value = context.parsed.y;
                                    return context.dataset.label + ': R$ ' + value.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    });
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Mês/Ano',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            },
                            grid: {
                                display: true,
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        y: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Valor (R$)',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            },
                            grid: {
                                display: true,
                                color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return 'R$ ' + value.toLocaleString('pt-BR');
                                }
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        }

        // Função para mostrar erro no gráfico
        function showChartError(message) {
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="alert alert-danger text-center" role="alert">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        ${message}
                    </div>
                `;
            }
        }

        // Inicializar quando a página carregar
        document.addEventListener('DOMContentLoaded', function() {
            // Aguardar um pouco para garantir que o SankhyaJX esteja carregado
            setTimeout(loadChartData, 500);
        });

        // Função para atualizar dados (pode ser chamada externamente)
        window.refreshChart = function() {
            loadChartData();
        };
    </script>
    
</body>
</html>
