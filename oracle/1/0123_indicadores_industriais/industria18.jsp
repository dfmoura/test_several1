<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8"
pageEncoding="UTF-8"%> <%@ page import="java.util.*" %> <%@ taglib
uri="http://java.sun.com/jstl/core_rt" prefix="c" %> <%@ taglib prefix="snk"
uri="/WEB-INF/tld/sankhyaUtil.tld" %> <%@ taglib prefix="fmt"
uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel Indicador DTI - Gerir Entregas</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js"></script>
     <script src="path/to/chartjs/dist/chart.umd.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <style>
        body { background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .process-card { border-left: 4px solid #007bff; transition: transform 0.2s; cursor: pointer; background: linear-gradient(135deg, #f8f9ff, white); }
        .process-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .section-header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 15px; margin-bottom: 20px; border-radius: 8px 0 8px 0; }
        .kpi-card { background: linear-gradient(135deg, #e3f2fd, #bbdefb); border: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 15px; }
        .kpi-card h5 { color: #1976d2; }
        .indicator-value { font-size: 1.5em; font-weight: bold; }
        .positive { color: #28a745; }
        .warning { color: #ffc107; }
        .negative { color: #dc3545; }
        .obs-note { font-size: 0.85em; color: #6c757d; font-style: italic; }
        .progress { height: 20px; margin-top: 5px; }
        .chart-container { position: relative; height: 400px; width: 100%; margin-top: 20px; }
        .nav-pills .nav-link.active { background: linear-gradient(135deg, #007bff, #0056b3); }
        .nav-pills .nav-link { color: #007bff; }
        .card-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
        .kpi-card:hover .card-overlay { opacity: 1; }
        .card-overlay i { font-size: 2em; color: #007bff; }
        .kpi-card.card-hover-chart { position: relative; }
        .kpi-card.card-hover-chart .card-overlay-chart { background: transparent; }
        .kpi-card.card-hover-chart .card-overlay-chart i { font-size: 1.25rem; color: rgba(0,0,0,0.25); }
        .kpi-card.card-hover-chart:hover .card-overlay-chart i { color: rgba(255,193,7,0.6); }
        .sidebar { background: white; border-right: 1px solid #dee2e6; height: 100vh; position: fixed; left: 0; top: 0; z-index: 1000; padding: 20px; width: 300px; transition: transform 0.3s ease-in-out; }
        .sidebar.hidden { transform: translateX(-100%); }
        .sidebar h5 { margin-bottom: 15px; color: #007bff; }
        .sidebar .form-label { font-weight: bold; color: #6c757d; }
        .sidebar select[multiple] { height: 150px; }
        .main-content { margin-left: 300px; padding: 20px; transition: margin-left 0.3s ease-in-out; }
        .main-content.expanded { margin-left: 0; }
        .filter-toggle-btn { position: fixed; top: 15px; left: 15px; z-index: 1001; background: #007bff; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease; }
        .filter-toggle-btn:hover { background: #0056b3; transform: scale(1.1); }
        .filter-toggle-btn.sidebar-visible { left: 315px; }
        @media (max-width: 768px) { .sidebar { display: none; } .main-content { margin-left: 0; } .filter-toggle-btn { display: none; } }
        .kpi-selected { border-color: #007bff !important; box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25); }
        .detail-chart { margin-bottom: 20px; }
        .detail-chart h6 { color: #007bff; }
        #detail-view { min-height: calc(100vh - 200px); padding: 20px 0; }
        .kpi-cards-row { margin-bottom: 20px; }
        .kpi-charts-row { margin-top: 30px; }
        .loading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; z-index: 9999; }
        .loading-spinner { border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>

     <snk:load/>
</head>
<body>

     <!-- Botão para mostrar/esconder filtros -->
    <button class="filter-toggle-btn" id="filterToggleBtn" onclick="toggleFilters()" title="Mostrar/Esconder Filtros">
        <i class="bi bi-funnel" id="filterToggleIcon"></i>
    </button>

     <!-- Painel Lateral (Sidebar) -->
    <div class="sidebar" id="sidebarFilters">
        <div class="card">
            <div class="card-body">
                <h5><i class="bi bi-funnel me-2"></i>Filtros</h5>
                
                <!-- Parâmetro de Data - Período -->
                <div class="mb-3">
                    <label for="dataIni" class="form-label">Data Inicial</label>
                    <input type="date" class="form-control" id="dataIni" value="2025-10-01">
                </div>
                <div class="mb-3">
                    <label for="dataFin" class="form-label">Data Final</label>
                    <input type="date" class="form-control" id="dataFin" value="2025-10-21">
                </div>
                
                <!-- Multilist para Empresa (CDs) -->
                <div class="mb-3">
                    <label for="empresas" class="form-label">Empresas (CDs)</label>
                    <select multiple class="form-control" id="empresas">
                        <!-- Será populado dinamicamente -->
                    </select>
                    <small class="text-muted">Selecione múltiplas opções (Ctrl+clique)</small>
                </div>
                
                <button class="btn btn-primary w-100" onclick="applyFilters()">Aplicar Filtros</button>
            </div>
        </div>
    </div>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay" style="display: none;">
        <div>
            <div class="loading-spinner"></div>
            <p class="mt-3">Carregando dados...</p>
        </div>
    </div>

    <!-- Conteúdo Principal -->
    <div class="main-content" id="mainContent">
        <div class="container-fluid py-4">
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="text-center mb-2">Painel Indicador </h1>
                    <p class="text-center text-muted" id="subtitlePeriodo">Gerenciamento de Processos</p>
                </div>
            </div>

            <!-- Navegação por Processos -->
            <ul class="nav nav-pills nav-fill mb-4" id="processNav">
                <li class="nav-item">
                    <a class="nav-link active" href="#gerir-entregas" data-bs-toggle="pill">Gerir Entregas</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#industria" data-bs-toggle="pill">Indústria</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#manutencao" data-bs-toggle="pill">Manutenção</a>
                </li>
            </ul>

            <div class="tab-content">
                <!-- Conteúdo para Gerir Entregas -->
                <div class="tab-pane fade show active" id="gerir-entregas">
                    <div class="section-header">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h3><i class="bi bi-truck me-2"></i>Gerir Entregas</h3>
                            </div>
                            <div class="col-md-6 text-end">
                                <small>Meta Geral: 95% Eficiência | Para cada CD separado</small>
                            </div>
                        </div>
                    </div>

                    <!-- Cards de Indicadores -->
                    <div class="row mb-4 kpi-cards-row" id="kpi-cards">
                        <div class="col-lg-3 col-md-6">
                            <div class="card kpi-card card-clickable" data-kpi="qualidade" id="cardQualidade">
                                <div class="card-overlay">
                                    <i class="bi bi-graph-up"></i>
                                </div>
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-check-circle text-success me-2"></i>Qualidade na entrega</h5>
                                    <p class="indicator-name mb-2">Feedbacks "conforme"/Notas emitidas</p>
                                    <div class="indicator-value positive" id="qualidadeValue">-</div>
                                    <div class="progress">
                                        <div class="progress-bar bg-success" id="qualidadeProgress" style="width: 0%"></div>
                                    </div>
                                    <p class="obs-note">Para cada CD separado</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-6">
                            <div class="card kpi-card card-clickable" data-kpi="custoEntrega" id="cardCustoEntrega">
                                <div class="card-overlay">
                                    <i class="bi bi-graph-up"></i>
                                </div>
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-currency-dollar text-warning me-2"></i>Custo entrega</h5>
                                    <p class="indicator-name mb-2">Custo frete/Valores de notas da OC</p>
                                    <div class="indicator-value warning" id="custoEntregaValue">-</div>
                                    <div class="progress">
                                        <div class="progress-bar bg-warning" id="custoEntregaProgress" style="width: 0%"></div>
                                    </div>
                                    <p class="obs-note">Para cada CD separado</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-6">
                            <div class="card kpi-card card-clickable" data-kpi="tempoEntrega" id="cardTempoEntrega">
                                <div class="card-overlay">
                                    <i class="bi bi-graph-up"></i>
                                </div>
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-clock text-info me-2"></i>Tempo de entrega</h5>
                                    <p class="indicator-name mb-2">Diferença entre data prevista e efetiva</p>
                                    <div class="indicator-value positive" id="tempoEntregaValue">-</div>
                                    <div class="progress">
                                        <div class="progress-bar bg-info" id="tempoEntregaProgress" style="width: 0%"></div>
                                    </div>
                                    <p class="obs-note">Para cada CD separado</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-6">
                            <div class="card kpi-card card-clickable" data-kpi="custoCD" id="cardCustoCD">
                                <div class="card-overlay">
                                    <i class="bi bi-graph-up"></i>
                                </div>
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-building text-primary me-2"></i>Custo do CD</h5>
                                    <p class="indicator-name mb-2">Centro de custo/faturamento</p>
                                    <div class="indicator-value negative" id="custoCDValue">-</div>
                                    <div class="progress">
                                        <div class="progress-bar bg-danger" id="custoCDProgress" style="width: 0%"></div>
                                    </div>
                                    <p class="obs-note">Para cada CD separado</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Área para Gráficos Detalhados -->
                    <div class="row mb-4 kpi-charts-row"></div>

                </div>

                <!-- Conteúdo para Indústria -->
                <div class="tab-pane fade" id="industria">
                    <div class="section-header" style="background: linear-gradient(135deg, #ff9800, #f57c00);">
                        <h3><i class="bi bi-factory me-2"></i>Indústria</h3>
                    </div>
                    <div class="row mb-4 kpi-cards-row">
                        <div class="col-lg-3">
                            <div class="card kpi-card process-card card-clickable" data-kpi="formulacao">
                                <div class="card-body">
                                    <h5><i class="bi bi-flask text-success me-2"></i>Qualidade de Formulação</h5>
                                    <div class="indicator-value positive">99.2%</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-3">
                            <div class="card kpi-card process-card card-clickable" data-kpi="envase">
                                <div class="card-body">
                                    <h5><i class="bi bi-droplet text-primary me-2"></i>Qualidade no Envase</h5>
                                    <div class="indicator-value positive">96.8%</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-3">
                            <div class="card kpi-card process-card card-clickable" data-kpi="volumeRealizado">
                                <div class="card-body">
                                    <h5><i class="bi bi-graph-up text-warning me-2"></i>Volume Realizado</h5>
                                    <div class="indicator-value warning" id="volumeRealizadoValue">-</div>
                                    <div class="progress">
                                        <div class="progress-bar bg-warning" id="volumeRealizadoProgress" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-3">
                            <div class="card kpi-card process-card card-clickable" data-kpi="ocupacaoProducao">
                                <div class="card-body">
                                    <h5><i class="bi bi-people-fill text-info me-2"></i>Ocupação Produção</h5>
                                    <div class="indicator-value positive" id="ocupacaoProducaoValue">-</div>
                                    <div class="progress">
                                        <div class="progress-bar bg-info" id="ocupacaoProducaoProgress" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Área para Gráficos Detalhados -->
                    <div class="row mb-4 kpi-charts-row"></div>
                </div>

                <!-- Conteúdo para Manutenção -->
                <div class="tab-pane fade" id="manutencao">
                    <div class="section-header" style="background: linear-gradient(135deg, #9e9e9e, #757575);">
                        <h3><i class="bi bi-tools me-2"></i>Manutenção</h3>
                    </div>
                    <div class="row mb-4 kpi-cards-row">
                        <div class="col-lg-4">
                            <div class="card kpi-card process-card card-clickable" data-kpi="manutencaoPreventiva">
                                <div class="card-body">
                                    <h5><i class="bi bi-wrench text-secondary me-2"></i>Manutenções Preventivas</h5>
                                    <div class="indicator-value positive" id="manutencaoPreventivaValue">-</div>
                                    <div class="progress">
                                        <div class="progress-bar bg-success" id="manutencaoPreventivaProgress" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="card kpi-card process-card card-clickable card-hover-chart" data-kpi="manutencaoCorretiva">
                                <div class="card-overlay card-overlay-chart">
                                    <i class="bi bi-bar-chart-line"></i>
                                </div>
                                <div class="card-body">
                                    <h5><i class="bi bi-wrench-adjustable text-warning me-2"></i>Manutenções Corretivas</h5>
                                    <div class="indicator-value warning" id="manutencaoCorretivaValue">-</div>
                                    <div class="progress">
                                        <div class="progress-bar bg-warning" id="manutencaoCorretivaProgress" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="card kpi-card process-card card-clickable" data-kpi="planejadoRealizado">
                                <div class="card-body">
                                    <h5><i class="bi bi-calendar-event text-dark me-2"></i>Planejado Realizado</h5>
                                    <div class="indicator-value warning">78.9%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Área para Gráficos Detalhados -->
                    <div class="row mb-4 kpi-charts-row"></div>
                </div>
            </div>

            <!-- Área para Detalhamento Fullscreen (compartilhada) -->
            <div id="detail-view" class="row mb-4 d-none"></div>

        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Função para mostrar/esconder filtros
        function toggleFilters() {
            const sidebar = document.getElementById('sidebarFilters');
            const mainContent = document.getElementById('mainContent');
            const toggleBtn = document.getElementById('filterToggleBtn');
            const toggleIcon = document.getElementById('filterToggleIcon');
            
            if (sidebar.classList.contains('hidden')) {
                // Mostrar filtros
                sidebar.classList.remove('hidden');
                mainContent.classList.remove('expanded');
                toggleBtn.classList.add('sidebar-visible');
                toggleIcon.className = 'bi bi-funnel';
            } else {
                // Esconder filtros
                sidebar.classList.add('hidden');
                mainContent.classList.add('expanded');
                toggleBtn.classList.remove('sidebar-visible');
                toggleIcon.className = 'bi bi-funnel-fill';
            }
        }

        // Dados de exemplo para os gráficos de linha
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        let selectedPeriod = { start: '2025-10-01', end: '2025-10-21' };
        let selectedEmpresas = [];
        let filteredLabels = ['Out'];
        let filteredIndices = [9];
        const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1'];

        // Variável global para armazenar dados reais do Custo do CD
        let custoCDRealData = {};

        // Variável global para armazenar dados reais do Tempo de Entrega (evolução média dias_entrega)
        let tempoEntregaRealData = {};

        // Variável global para armazenar dados reais do Custo Entrega (evolução média VLRFRETE)
        let custoEntregaRealData = {};

        // Variável global para armazenar dados reais da Qualidade na Entrega (evolução percentual AD_FEEDBACK = 1)
        let qualidadeRealData = {};

        // Variável global para evolução do Volume Realizado (média PERC_REALIZADO por mês, índice 0-11)
        let volumeRealizadoRealData = [];

        // Variável global para evolução da Ocupação Produção (PARTICIPACAO_EFETIVO_DISPONIVEL por mês, índice 0-11)
        let ocupacaoProducaoRealData = [];

        // Variável global para evolução Manutenções Preventivas (participação % PV por mês, índice 0-11)
        let manutencaoPreventivaRealData = [];

        // Variável global para evolução Manutenções Corretivas (participação % CO por mês, índice 0-11)
        let manutencaoCorretivaRealData = [];

        // Função para mostrar/esconder loading
        function showLoading(show) {
            document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
        }

        // Função para converter data de YYYY-MM-DD para DD-MM-YYYY
        function convertDateToDB(dateStr) {
            if (!dateStr) return '';
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        }

        // Função para formatar número como moeda
        function formatCurrency(value) {
            if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value);
        }

        // Função para formatar percentual
        function formatPercent(value) {
            if (value === null || value === undefined || isNaN(value)) return '0%';
            return new Intl.NumberFormat('pt-BR', {
                style: 'percent',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value / 100);
        }

        // Função para formatar data para dd/mm/yyyy
        function formatDate(dateStr) {
            if (!dateStr) return '';
            // Se já está no formato dd/mm/yyyy ou dd-mm-yyyy, retornar como está
            if (typeof dateStr === 'string' && dateStr.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/)) {
                return dateStr.replace(/-/g, '/');
            }
            // Tentar parsear como Date se for objeto Date
            let date;
            if (dateStr instanceof Date) {
                date = dateStr;
            } else if (typeof dateStr === 'string') {
                // Tentar vários formatos comuns
                // Formato: "03112025 00:00:00" -> ddMMyyyy HH:mm:ss
                const match1 = dateStr.match(/^(\d{2})(\d{2})(\d{4})/);
                if (match1) {
                    const [, day, month, year] = match1;
                    return `${day}/${month}/${year}`;
                }
                // Formato: "2025-11-03 00:00:00" ou "2025-11-03"
                const match2 = dateStr.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
                if (match2) {
                    const [, year, month, day] = match2;
                    return `${day}/${month}/${year}`;
                }
                // Tentar parsear como ISO ou outros formatos
                date = new Date(dateStr);
            } else {
                return '';
            }
            // Se conseguiu criar um Date válido, formatar
            if (date instanceof Date && !isNaN(date.getTime())) {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            }
            return dateStr;
        }

        // Função para carregar empresas do banco
        async function carregarEmpresas() {
            try {
                if (typeof JX === "undefined" || !JX.consultar) {
                    console.error("SankhyaJX não está disponível");
                    return;
                }

                const sql = "SELECT CODEMP, NOMEFANTASIA FROM TSIEMP ORDER BY NOMEFANTASIA";
                const result = await JX.consultar(sql);
                
                const empresasSelect = document.getElementById('empresas');
                empresasSelect.innerHTML = '';

                if (result && result.length > 0) {
                    result.forEach((empresa, index) => {
                        const option = document.createElement('option');
                        option.value = empresa.CODEMP || empresa.codemp;
                        option.textContent = `${empresa.CODEMP || empresa.codemp} - ${empresa.NOMEFANTASIA || empresa.nomefantasia || ''}`;
                        // Selecionar as duas primeiras por padrão
                        if (index < 2) {
                            option.selected = true;
                            selectedEmpresas.push(option.value);
                        }
                        empresasSelect.appendChild(option);
                    });
                } else {
                    empresasSelect.innerHTML = '<option value="">Nenhuma empresa encontrada</option>';
                }
            } catch (error) {
                console.error("Erro ao carregar empresas:", error);
                alert("Erro ao carregar empresas: " + error.message);
            }
        }

        // Função para carregar dados de custo/faturamento (total)
        async function carregarCustoFaturamento() {
            try {
                if (typeof JX === "undefined" || !JX.consultar) {
                    console.error("SankhyaJX não está disponível");
                    return;
                }

                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);

                if (!dataIni || !dataFin) {
                    console.warn("Datas não informadas");
                    return;
                }

                // Converter datas para formato Oracle
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);

                // Construir filtro de empresas
                let filtroEmpresa = '';
                if (empresasSelecionadas.length > 0) {
                    const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                    filtroEmpresa = `AND X.CODEMP IN (${empresasStr})`;
                }

                // Query corrigida com parâmetros de data e codemp
                const sql = `
                    SELECT SUM(abs(VLRDESP)) as custo, SUM(abs(VLR)) as faturamento, 
                           CASE WHEN SUM(abs(VLR)) = 0 THEN 0 
                                ELSE ROUND((SUM(abs(VLRDESP)) / NULLIF(SUM(abs(VLR)), 0)) * 100, 2) 
                           END as custo_por_fat 
                    FROM (
                        WITH CUSTO_FIXO AS (
                            SELECT 
                                X.CODEMP,
                                SUM(NVL(CASE WHEN X.CODNAT = 2020202 AND X.RECDESP IN (-1, 0) THEN X.VLRDESDOB 
                                         WHEN X.CODNAT <> 2020202 AND X.RECDESP IN (-1) THEN X.VLRBAIXA 
                                         ELSE 0 END, 0)) AS VLRDESP
                            FROM TSICUS CUS1
                            LEFT JOIN VGF_RESULTADO2_SATIS X ON X.CODCENCUS = CUS1.CODCENCUS
                            INNER JOIN TGFNAT NAT ON X.CODNAT = NAT.CODNAT
                            WHERE 
                                X.DHBAIXA BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                                ${filtroEmpresa}
                                AND X.CODNAT NOT IN (1010000, 1020000, 6010100, 6010200)
                                AND X.CODCENCUS LIKE '9%'
                                AND X.PROVISAO = 'N'
                                AND X.VLRBAIXA <> 0
                                AND X.CODNAT IN (2020202,2020301,2020302,2020303,2020304,2020305,2020306,2020307,
                                                2020308,2020309,2020310,2020312,2020313,2020314,2020400,2020501,2020900,
                                                2030300,2040100,2040200,3030202,3030308,4010300,4010400,4010500,4020105,
                                                4030203,4030301)
                            GROUP BY X.CODEMP
                        ),
                        FATURAMENTO AS (
                            SELECT 
                                CODEMP,
                                SUM(VLR) AS VLR 
                            FROM VGF_VENDAS_SATIS
                            WHERE 
                                DTMOV BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                                AND BONIFICACAO = 'N'
                                ${filtroEmpresa.replace('X.CODEMP', 'CODEMP')}
                            GROUP BY CODEMP
                        )
                        SELECT 
                            COALESCE(CF.CODEMP, FAT.CODEMP) AS CODEMP,
                            NVL(CF.VLRDESP, 0) AS VLRDESP,
                            NVL(FAT.VLR, 0) AS VLR
                        FROM CUSTO_FIXO CF
                        FULL OUTER JOIN FATURAMENTO FAT ON CF.CODEMP = FAT.CODEMP
                    )
                `;

                const result = await JX.consultar(sql);
                
                if (result && result.length > 0) {
                    const row = result[0];
                    const custo = parseFloat(row.CUSTO || row.custo || 0);
                    const faturamento = parseFloat(row.FATURAMENTO || row.faturamento || 0);
                    const custoPorFat = parseFloat(row.CUSTO_POR_FAT || row.custo_por_fat || 0);

                    // Atualizar o card de custo do CD
                    const custoCDValue = document.getElementById('custoCDValue');
                    const custoCDProgress = document.getElementById('custoCDProgress');
                    
                    if (custoPorFat > 0) {
                        custoCDValue.textContent = formatPercent(custoPorFat);
                        custoCDValue.className = custoPorFat > 30 ? 'indicator-value negative' : 
                                                 custoPorFat > 20 ? 'indicator-value warning' : 
                                                 'indicator-value positive';
                        
                        // Atualizar barra de progresso (limitando a 100%)
                        const progressWidth = Math.min(custoPorFat, 100);
                        custoCDProgress.style.width = progressWidth + '%';
                        custoCDProgress.className = custoPorFat > 30 ? 'progress-bar bg-danger' : 
                                                    custoPorFat > 20 ? 'progress-bar bg-warning' : 
                                                    'progress-bar bg-success';
                    } else {
                        custoCDValue.textContent = '-';
                        custoCDProgress.style.width = '0%';
                    }
                } else {
                    // Se não houver dados, mostrar "-"
                    document.getElementById('custoCDValue').textContent = '-';
                    document.getElementById('custoCDProgress').style.width = '0%';
                }
            } catch (error) {
                console.error("Erro ao carregar custo/faturamento:", error);
                document.getElementById('custoCDValue').textContent = 'Erro';
                document.getElementById('custoCDProgress').style.width = '0%';
            }
        }

        // Função para carregar dados históricos mensais do Custo do CD
        async function carregarCustoCDHistorico() {
            try {
                if (typeof JX === "undefined" || !JX.consultar) {
                    console.error("SankhyaJX não está disponível");
                    return;
                }

                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);

                if (!dataIni || !dataFin || empresasSelecionadas.length === 0) {
                    console.warn("Dados incompletos para carregar histórico");
                    return;
                }

                // Converter datas para formato Oracle
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);

                // Construir filtro de empresas
                let filtroEmpresa = '';
                if (empresasSelecionadas.length > 0) {
                    const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                    filtroEmpresa = `AND X.CODEMP IN (${empresasStr})`;
                }

                // Query para buscar dados mensais agrupados por empresa e mês
                const sql = `
                    SELECT 
                        CODEMP,
                        TO_NUMBER(TO_CHAR(MES_ANO, 'MM')) - 1 AS MES_INDEX,
                        TO_CHAR(MES_ANO, 'Mon', 'NLS_DATE_LANGUAGE=PORTUGUESE') AS MES_NOME,
                        CUSTO_POR_FAT
                    FROM (
                        SELECT 
                            COALESCE(CF.CODEMP, FAT.CODEMP) AS CODEMP,
                            TRUNC(COALESCE(CF.MES_ANO, FAT.MES_ANO), 'MM') AS MES_ANO,
                            CASE WHEN NVL(FAT.VLR, 0) = 0 THEN 0 
                                 ELSE ROUND((NVL(CF.VLRDESP, 0) / NULLIF(NVL(FAT.VLR, 0), 0)) * 100, 2) 
                            END AS CUSTO_POR_FAT
                        FROM (
                            SELECT 
                                X.CODEMP,
                                TRUNC(X.DHBAIXA, 'MM') AS MES_ANO,
                                SUM(NVL(CASE WHEN X.CODNAT = 2020202 AND X.RECDESP IN (-1, 0) THEN X.VLRDESDOB 
                                         WHEN X.CODNAT <> 2020202 AND X.RECDESP IN (-1) THEN X.VLRBAIXA 
                                         ELSE 0 END, 0)) AS VLRDESP
                            FROM TSICUS CUS1
                            LEFT JOIN VGF_RESULTADO2_SATIS X ON X.CODCENCUS = CUS1.CODCENCUS
                            INNER JOIN TGFNAT NAT ON X.CODNAT = NAT.CODNAT
                            WHERE 
                                X.DHBAIXA BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                                ${filtroEmpresa}
                                AND X.CODNAT NOT IN (1010000, 1020000, 6010100, 6010200)
                                AND X.CODCENCUS LIKE '9%'
                                AND X.PROVISAO = 'N'
                                AND X.VLRBAIXA <> 0
                                AND X.CODNAT IN (2020202,2020301,2020302,2020303,2020304,2020305,2020306,2020307,
                                                2020308,2020309,2020310,2020312,2020313,2020314,2020400,2020501,2020900,
                                                2030300,2040100,2040200,3030202,3030308,4010300,4010400,4010500,4020105,
                                                4030203,4030301)
                            GROUP BY X.CODEMP, TRUNC(X.DHBAIXA, 'MM')
                        ) CF
                        FULL OUTER JOIN (
                            SELECT 
                                CODEMP,
                                TRUNC(DTMOV, 'MM') AS MES_ANO,
                                SUM(VLR) AS VLR 
                            FROM VGF_VENDAS_SATIS
                            WHERE 
                                DTMOV BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                                AND BONIFICACAO = 'N'
                                ${filtroEmpresa.replace('X.CODEMP', 'CODEMP')}
                            GROUP BY CODEMP, TRUNC(DTMOV, 'MM')
                        ) FAT ON CF.CODEMP = FAT.CODEMP AND CF.MES_ANO = FAT.MES_ANO
                    )
                    ORDER BY CODEMP, MES_ANO
                `;

                const result = await JX.consultar(sql);
                
                // Resetar dados
                custoCDRealData = {};
                
                if (result && result.length > 0) {
                    // Organizar dados por empresa
                    empresasSelecionadas.forEach(emp => {
                        custoCDRealData[emp] = new Array(12).fill(null);
                    });

                    result.forEach(row => {
                        const codemp = String(row.CODEMP || row.codemp);
                        const mesIndex = parseInt(row.MES_INDEX || row.mes_index || 0);
                        const custoPorFat = parseFloat(row.CUSTO_POR_FAT || row.custo_por_fat || 0);
                        
                        if (custoCDRealData[codemp] && mesIndex >= 0 && mesIndex < 12) {
                            custoCDRealData[codemp][mesIndex] = custoPorFat;
                        }
                    });
                } else {
                    // Se não houver dados, inicializar com arrays vazios
                    empresasSelecionadas.forEach(emp => {
                        custoCDRealData[emp] = new Array(12).fill(null);
                    });
                }
            } catch (error) {
                console.error("Erro ao carregar histórico de custo do CD:", error);
                // Em caso de erro, inicializar com arrays vazios
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                empresasSelecionadas.forEach(emp => {
                    custoCDRealData[emp] = new Array(12).fill(null);
                });
            }
        }

        // Base SQL Tempo de Entrega (query_base1) – filtros codemp e dtneg aplicados via params
        function sqlBaseTempoEntrega(dtInicial, dtFinal, filtroEmpresa) {
            return `
                SELECT vgf.codemp, vgf.nunota, vgf.numnota, vgf.codvend, vgf.apelido, vgf.codparc, vgf.nomeparc,
                       SUM(vgf.qtd) AS qtd, SUM(vgf.vlr) AS vlr,
                       cab.codtipoper, TOP.DESCROPER,
                       vgf.dtneg, cab.AD_DTENTREGAEFETIVA,
                       TRUNC(cab.AD_DTENTREGAEFETIVA - vgf.dtneg) AS dias_entrega
                FROM VGF_VENDAS_SATIS vgf
                INNER JOIN tgfcab cab ON vgf.nunota = cab.nunota
                INNER JOIN TGFTOP TOP ON (
                    CAB.CODTIPOPER = TOP.CODTIPOPER
                    AND CAB.DHTIPOPER = (SELECT MAX(TOP2.DHALTER) FROM TGFTOP TOP2 WHERE TOP2.CODTIPOPER = TOP.CODTIPOPER)
                )
                WHERE cab.AD_DTENTREGAEFETIVA IS NOT NULL
                  AND vgf.tipmov IN ('V')
                  AND cab.AD_DTENTREGAEFETIVA >= vgf.dtneg
                  AND TRUNC(vgf.dtneg) BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                  ${filtroEmpresa}
                GROUP BY vgf.codemp, vgf.nunota, vgf.numnota, vgf.codvend, vgf.apelido, vgf.codparc, vgf.nomeparc,
                         vgf.dtneg, cab.AD_DTENTREGAEFETIVA, cab.codtipoper, TOP.DESCROPER
            `;
        }

        // Carregar média de dias_entrega para o card Tempo de Entrega (respeitando codemp e dtneg)
        async function carregarTempoEntrega() {
            try {
                if (typeof JX === "undefined" || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) {
                    document.getElementById('tempoEntregaValue').textContent = '-';
                    document.getElementById('tempoEntregaProgress').style.width = '0%';
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                const filtroEmpresa = `AND vgf.codemp IN (${empresasStr})`;
                const base = sqlBaseTempoEntrega(dtInicial, dtFinal, filtroEmpresa);
                const sql = `SELECT ROUND(AVG(dias_entrega), 2) AS media_dias FROM (${base}) T`;
                const result = await JX.consultar(sql);
                const elVal = document.getElementById('tempoEntregaValue');
                const elProg = document.getElementById('tempoEntregaProgress');
                if (result && result.length > 0) {
                    const media = parseFloat(result[0].MEDIA_DIAS != null ? result[0].MEDIA_DIAS : result[0].media_dias);
                    if (!isNaN(media)) {
                        elVal.textContent = media.toFixed(1) + ' dias';
                        elVal.className = media <= 3 ? 'indicator-value positive' : media <= 7 ? 'indicator-value warning' : 'indicator-value negative';
                        const pct = Math.min(100, Math.max(0, (1 - media / 15) * 100));
                        elProg.style.width = pct + '%';
                        elProg.className = media <= 3 ? 'progress-bar bg-success' : media <= 7 ? 'progress-bar bg-warning' : 'progress-bar bg-danger';
                    } else {
                        elVal.textContent = '-';
                        elProg.style.width = '0%';
                    }
                } else {
                    elVal.textContent = '-';
                    elProg.style.width = '0%';
                }
            } catch (e) {
                console.error('Erro ao carregar Tempo de Entrega:', e);
                document.getElementById('tempoEntregaValue').textContent = 'Erro';
                document.getElementById('tempoEntregaProgress').style.width = '0%';
            }
        }

        // Carregar evolução da média de dias_entrega por empresa/mês para o gráfico (codemp e dtneg)
        async function carregarTempoEntregaHistorico() {
            try {
                if (typeof JX === "undefined" || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) {
                    tempoEntregaRealData = {};
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                const filtroEmpresa = `AND vgf.codemp IN (${empresasStr})`;
                const base = sqlBaseTempoEntrega(dtInicial, dtFinal, filtroEmpresa);
                const sql = `
                    SELECT codemp, TO_NUMBER(TO_CHAR(mes_ano, 'MM')) - 1 AS mes_index,
                           ROUND(AVG(dias_entrega), 2) AS avg_dias
                    FROM (SELECT codemp, TRUNC(dtneg, 'MM') AS mes_ano, dias_entrega FROM (${base}) B) T
                    GROUP BY codemp, mes_ano
                    ORDER BY codemp, mes_ano
                `;
                const result = await JX.consultar(sql);
                tempoEntregaRealData = {};
                empresasSelecionadas.forEach(emp => { tempoEntregaRealData[String(emp)] = new Array(12).fill(null); });
                if (result && result.length > 0) {
                    result.forEach(row => {
                        const codemp = String(row.CODEMP != null ? row.CODEMP : row.codemp);
                        const mi = parseInt(row.MES_INDEX != null ? row.MES_INDEX : row.mes_index || 0);
                        const avg = parseFloat(row.AVG_DIAS != null ? row.AVG_DIAS : row.avg_dias || 0);
                        if (tempoEntregaRealData[codemp] && mi >= 0 && mi < 12) tempoEntregaRealData[codemp][mi] = avg;
                    });
                }
            } catch (e) {
                console.error('Erro ao carregar histórico Tempo de Entrega:', e);
                tempoEntregaRealData = {};
            }
        }

        // Base SQL Custo Entrega (query_base2) – filtros codemp e dtneg aplicados via params
        function sqlBaseCustoEntrega(dtInicial, dtFinal, filtroEmpresa) {
            return `
                SELECT cab.CODEMP,
                       cab.NUNOTA,
                       cab.NUMNOTA,
                       cab.CODPARC,
                       par.nomeparc,
                       cab.DTNEG,
                       cab.DTFATUR,
                       cab.DTENTSAI,
                       cab.DTMOV,
                       cab.VLRNOTA,
                       cab.VLRFRETE,
                       CASE 
                           WHEN cab.VLRNOTA > 0 THEN ROUND((cab.VLRFRETE / cab.VLRNOTA) * 100, 2)
                           ELSE 0
                       END AS PERC_FRETE_VLRNOTA
                FROM TGFCAB cab
                INNER JOIN TGFPAR par ON cab.CODPARC = par.CODPARC
                WHERE cab.TIPMOV = 'C'
                  AND cab.VLRFRETE > 0
                  AND TRUNC(cab.DTNEG) BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                  ${filtroEmpresa}
            `;
        }

        // Carregar média de VLRFRETE para o card Custo Entrega (respeitando codemp e dtneg)
        async function carregarCustoEntrega() {
            try {
                if (typeof JX === "undefined" || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) {
                    document.getElementById('custoEntregaValue').textContent = '-';
                    document.getElementById('custoEntregaProgress').style.width = '0%';
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                const filtroEmpresa = `AND cab.CODEMP IN (${empresasStr})`;
                const base = sqlBaseCustoEntrega(dtInicial, dtFinal, filtroEmpresa);
                const sql = `SELECT ROUND(AVG(VLRFRETE), 2) AS media_custo FROM (${base}) T`;
                const result = await JX.consultar(sql);
                const elVal = document.getElementById('custoEntregaValue');
                const elProg = document.getElementById('custoEntregaProgress');
                if (result && result.length > 0) {
                    const media = parseFloat(result[0].MEDIA_CUSTO != null ? result[0].MEDIA_CUSTO : result[0].media_custo);
                    if (!isNaN(media) && media > 0) {
                        elVal.textContent = formatCurrency(media);
                        elVal.className = media <= 5000 ? 'indicator-value positive' : media <= 15000 ? 'indicator-value warning' : 'indicator-value negative';
                        const maxCusto = 50000;
                        const pct = Math.min(100, Math.max(0, (media / maxCusto) * 100));
                        elProg.style.width = pct + '%';
                        elProg.className = media <= 5000 ? 'progress-bar bg-success' : media <= 15000 ? 'progress-bar bg-warning' : 'progress-bar bg-danger';
                    } else {
                        elVal.textContent = '-';
                        elProg.style.width = '0%';
                    }
                } else {
                    elVal.textContent = '-';
                    elProg.style.width = '0%';
                }
            } catch (e) {
                console.error('Erro ao carregar Custo Entrega:', e);
                document.getElementById('custoEntregaValue').textContent = 'Erro';
                document.getElementById('custoEntregaProgress').style.width = '0%';
            }
        }

        // Carregar evolução da média de VLRFRETE por empresa/mês para o gráfico (codemp e dtneg)
        async function carregarCustoEntregaHistorico() {
            try {
                if (typeof JX === "undefined" || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) {
                    custoEntregaRealData = {};
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                const filtroEmpresa = `AND cab.CODEMP IN (${empresasStr})`;
                const base = sqlBaseCustoEntrega(dtInicial, dtFinal, filtroEmpresa);
                const sql = `
                    SELECT CODEMP, TO_NUMBER(TO_CHAR(mes_ano, 'MM')) - 1 AS mes_index,
                           ROUND(AVG(VLRFRETE), 2) AS avg_custo
                    FROM (SELECT CODEMP, TRUNC(DTNEG, 'MM') AS mes_ano, VLRFRETE FROM (${base}) B) T
                    GROUP BY CODEMP, mes_ano
                    ORDER BY CODEMP, mes_ano
                `;
                const result = await JX.consultar(sql);
                custoEntregaRealData = {};
                empresasSelecionadas.forEach(emp => { custoEntregaRealData[String(emp)] = new Array(12).fill(null); });
                if (result && result.length > 0) {
                    result.forEach(row => {
                        const codemp = String(row.CODEMP != null ? row.CODEMP : row.codemp);
                        const mi = parseInt(row.MES_INDEX != null ? row.MES_INDEX : row.mes_index || 0);
                        const avg = parseFloat(row.AVG_CUSTO != null ? row.AVG_CUSTO : row.avg_custo || 0);
                        if (custoEntregaRealData[codemp] && mi >= 0 && mi < 12) custoEntregaRealData[codemp][mi] = avg;
                    });
                }
            } catch (e) {
                console.error('Erro ao carregar histórico Custo Entrega:', e);
                custoEntregaRealData = {};
            }
        }

        // Carregar detalhes Custo Entrega (query_base2) – filtros codemp e dtneg; opcional cd+month
        async function carregarDetalhesCustoEntrega(cd, month, value) {
            try {
                if (typeof JX === "undefined" || !JX.consultar) return [];
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) return [];
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                let filtroEmpresa = `AND cab.CODEMP IN (${empresasStr})`;
                let dtIni = dtInicial, dtFim = dtFinal;
                if (cd != null && cd !== '' && month != null && month !== '') {
                    const year = new Date(dataIni).getFullYear();
                    const range = getMonthDateRange(month, year);
                    if (range) {
                        dtIni = convertDateToDB(range.start);
                        dtFim = convertDateToDB(range.end);
                        filtroEmpresa = `AND cab.CODEMP = '${cd}'`;
                    }
                }
                const sql = sqlBaseCustoEntrega(dtIni, dtFim, filtroEmpresa) + ' ORDER BY cab.CODEMP, cab.DTNEG, cab.NUNOTA';
                const result = await JX.consultar(sql);
                return result || [];
            } catch (e) {
                console.error('Erro ao carregar detalhes Custo Entrega:', e);
                return [];
            }
        }

        // Base SQL Qualidade na Entrega (query_base3) – filtros codemp e dtneg aplicados via params
        function sqlBaseQualidade(dtInicial, dtFinal, filtroEmpresa) {
            return `
                SELECT DISTINCT
                    vgf.CODEMP,
                    vgf.NUNOTA,
                    vgf.NUMNOTA,
                    vgf.CODPARC,
                    vgf.nomeparc,
                    vgf.DTNEG,
                    vgf.DTMOV,
                    cab.AD_FEEDBACK
                FROM VGF_VENDAS_SATIS vgf
                INNER JOIN tgfcab cab ON vgf.nunota = cab.nunota
                WHERE cab.AD_FEEDBACK IS NOT NULL
                  AND TRUNC(vgf.DTNEG) BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                  ${filtroEmpresa}
            `;
        }

        // Base SQL Volume Realizado (query_base7) – datas dinâmicas via dtInicial e dtFinal (DD-MM-YYYY)
        function sqlBaseVolumeRealizado(dtInicial, dtFinal) {
            return `
                SELECT
                    CODIGO_ITEM,
                    ITEM,
                    CODIGO_GRUPO,
                    GRUPO,
                    CODVOL,
                    QUANTIDADE,
                    TOTALUNID,
                    QTDPREV,
                    QUANTIDADE / NULLIF(QTDPREV,0) AS PERC_REALIZADO,
                    TOTALUNID - QTDPREV AS DIFERENCA
                FROM (
                    SELECT
                        I.CODPROD AS CODIGO_ITEM,
                        P.DESCRPROD AS ITEM,
                        P.CODGRUPOPROD AS CODIGO_GRUPO,
                        G.DESCRGRUPOPROD AS GRUPO,
                        I.CODVOL,
                        SUM(I.QTDNEG) AS QUANTIDADE,
                        SUM(I.QTDNEG * P.AD_QTDVOLLT) AS TOTALUNID,
                        (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(LAST_DAY(TO_DATE(MET.DTREF)),'DD')) *
                            (ABS((CASE WHEN TO_DATE('${dtFinal}', 'DD-MM-YYYY') > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE TO_DATE('${dtFinal}', 'DD-MM-YYYY') END - TRUNC(MET.DTREF,'MM')))+1)) AS QTDPREV
                            FROM TGMMET MET
                            WHERE MET.CODMETA = 8
                            AND MET.DTREF BETWEEN TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                            AND MET.CODPROD = I.CODPROD) AS QTDPREV
                    FROM TGFCAB C
                    INNER JOIN TGFITE I ON I.NUNOTA = C.NUNOTA
                    INNER JOIN TGFPRO P ON P.CODPROD = I.CODPROD
                    INNER JOIN TGFGRU G ON G.CODGRUPOPROD = P.CODGRUPOPROD
                    WHERE C.TIPMOV = 'F'
                      AND C.CODTIPOPER = 801
                      AND C.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                      AND I.USOPROD = 'V'
                    GROUP BY I.CODPROD, P.DESCRPROD, P.CODGRUPOPROD, G.DESCRGRUPOPROD, I.CODVOL
                    UNION ALL
                    SELECT
                        P.CODPROD AS CODIGO_ITEM,
                        P.DESCRPROD AS ITEM,
                        P.CODGRUPOPROD AS CODIGO_GRUPO,
                        G.DESCRGRUPOPROD AS GRUPO,
                        P.CODVOL,
                        0 AS QUANTIDADE,
                        0 AS TOTALUNID,
                        (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(LAST_DAY(TO_DATE(MET.DTREF)),'DD')) *
                            (ABS((CASE WHEN TO_DATE('${dtFinal}', 'DD-MM-YYYY') > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE TO_DATE('${dtFinal}', 'DD-MM-YYYY') END - TRUNC(MET.DTREF,'MM')))+1)) AS QTDPREV
                            FROM TGMMET MET
                            WHERE MET.CODMETA = 8
                            AND MET.DTREF BETWEEN TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                            AND MET.CODPROD = P.CODPROD) AS QTDPREV
                    FROM TGMMET M
                    INNER JOIN TGFPRO P ON P.CODPROD = M.CODPROD
                    INNER JOIN TGFGRU G ON G.CODGRUPOPROD = P.CODGRUPOPROD
                    WHERE M.CODMETA = 8
                      AND NVL(M.QTDPREV,0) <> 0
                      AND NOT EXISTS (SELECT 1 FROM TGFITE I, TGFCAB C WHERE C.NUNOTA = I.NUNOTA AND I.CODPROD = M.CODPROD AND C.CODTIPOPER = 801 AND C.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY') AND I.USOPROD = 'V')
                    GROUP BY P.CODPROD, P.DESCRPROD, P.CODGRUPOPROD, G.DESCRGRUPOPROD, P.CODVOL
                )
                WHERE QTDPREV > 0
            `;
        }

        // Carregar percentual de AD_FEEDBACK = 1 (conforme) para o card Qualidade na Entrega (respeitando codemp e dtneg)
        async function carregarQualidade() {
            try {
                if (typeof JX === "undefined" || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) {
                    document.getElementById('qualidadeValue').textContent = '-';
                    document.getElementById('qualidadeProgress').style.width = '0%';
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                const filtroEmpresa = `AND vgf.CODEMP IN (${empresasStr})`;
                const base = sqlBaseQualidade(dtInicial, dtFinal, filtroEmpresa);
                // Calcular percentual de AD_FEEDBACK = 1 (conforme)
                const sql = `
                    SELECT 
                        ROUND(
                            SUM(CASE WHEN AD_FEEDBACK = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
                            2
                        ) AS perc_conforme
                    FROM (${base}) T
                `;
                const result = await JX.consultar(sql);
                const elVal = document.getElementById('qualidadeValue');
                const elProg = document.getElementById('qualidadeProgress');
                if (result && result.length > 0) {
                    const perc = parseFloat(result[0].PERC_CONFORME != null ? result[0].PERC_CONFORME : result[0].perc_conforme);
                    if (!isNaN(perc) && perc >= 0) {
                        elVal.textContent = perc.toFixed(2) + '%';
                        elVal.className = perc >= 95 ? 'indicator-value positive' : perc >= 85 ? 'indicator-value warning' : 'indicator-value negative';
                        const pct = Math.min(100, Math.max(0, perc));
                        elProg.style.width = pct + '%';
                        elProg.className = perc >= 95 ? 'progress-bar bg-success' : perc >= 85 ? 'progress-bar bg-warning' : 'progress-bar bg-danger';
                    } else {
                        elVal.textContent = '-';
                        elProg.style.width = '0%';
                    }
                } else {
                    elVal.textContent = '-';
                    elProg.style.width = '0%';
                }
            } catch (e) {
                console.error('Erro ao carregar Qualidade na Entrega:', e);
                document.getElementById('qualidadeValue').textContent = 'Erro';
                document.getElementById('qualidadeProgress').style.width = '0%';
            }
        }

        // Carregar evolução do percentual de conforme por empresa/mês para o gráfico (codemp e dtneg)
        async function carregarQualidadeHistorico() {
            try {
                if (typeof JX === "undefined" || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) {
                    qualidadeRealData = {};
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                const filtroEmpresa = `AND vgf.CODEMP IN (${empresasStr})`;
                const base = sqlBaseQualidade(dtInicial, dtFinal, filtroEmpresa);
                const sql = `
                    SELECT CODEMP, TO_NUMBER(TO_CHAR(mes_ano, 'MM')) - 1 AS mes_index,
                           ROUND(
                               SUM(CASE WHEN AD_FEEDBACK = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
                               2
                           ) AS perc_conforme
                    FROM (SELECT CODEMP, TRUNC(DTNEG, 'MM') AS mes_ano, AD_FEEDBACK FROM (${base}) B) T
                    GROUP BY CODEMP, mes_ano
                    ORDER BY CODEMP, mes_ano
                `;
                const result = await JX.consultar(sql);
                qualidadeRealData = {};
                empresasSelecionadas.forEach(emp => { qualidadeRealData[String(emp)] = new Array(12).fill(null); });
                if (result && result.length > 0) {
                    result.forEach(row => {
                        const codemp = String(row.CODEMP != null ? row.CODEMP : row.codemp);
                        const mi = parseInt(row.MES_INDEX != null ? row.MES_INDEX : row.mes_index || 0);
                        const perc = parseFloat(row.PERC_CONFORME != null ? row.PERC_CONFORME : row.perc_conforme || 0);
                        if (qualidadeRealData[codemp] && mi >= 0 && mi < 12) qualidadeRealData[codemp][mi] = perc;
                    });
                }
            } catch (e) {
                console.error('Erro ao carregar histórico Qualidade na Entrega:', e);
                qualidadeRealData = {};
            }
        }

        // Carregar detalhes Qualidade na Entrega (query_base3) – filtros codemp e dtneg; opcional cd+month
        async function carregarDetalhesQualidade(cd, month, value) {
            try {
                if (typeof JX === "undefined" || !JX.consultar) return [];
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) return [];
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                let filtroEmpresa = `AND vgf.CODEMP IN (${empresasStr})`;
                let dtIni = dtInicial, dtFim = dtFinal;
                if (cd != null && cd !== '' && month != null && month !== '') {
                    const year = new Date(dataIni).getFullYear();
                    const range = getMonthDateRange(month, year);
                    if (range) {
                        dtIni = convertDateToDB(range.start);
                        dtFim = convertDateToDB(range.end);
                        filtroEmpresa = `AND vgf.CODEMP = '${cd}'`;
                    }
                }
                const sql = sqlBaseQualidade(dtIni, dtFim, filtroEmpresa) + ' ORDER BY vgf.nunota DESC';
                const result = await JX.consultar(sql);
                return result || [];
            } catch (e) {
                console.error('Erro ao carregar detalhes Qualidade na Entrega:', e);
                return [];
            }
        }

        // Carregar média PERC_REALIZADO (percentual) para o card Volume Realizado – respeitando intervalo de datas
        async function carregarVolumeRealizado() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                if (!dataIni || !dataFin) {
                    const elVal = document.getElementById('volumeRealizadoValue');
                    const elProg = document.getElementById('volumeRealizadoProgress');
                    if (elVal) elVal.textContent = '-';
                    if (elProg) elProg.style.width = '0%';
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const base = sqlBaseVolumeRealizado(dtInicial, dtFinal);
                const sql = `SELECT ROUND(AVG(PERC_REALIZADO) * 100, 2) AS media_perc FROM (${base}) T`;
                const result = await JX.consultar(sql);
                const elVal = document.getElementById('volumeRealizadoValue');
                const elProg = document.getElementById('volumeRealizadoProgress');
                if (result && result.length > 0) {
                    const perc = parseFloat(result[0].MEDIA_PERC != null ? result[0].MEDIA_PERC : result[0].media_perc);
                    if (!isNaN(perc) && perc >= 0) {
                        if (elVal) {
                            elVal.textContent = perc.toFixed(2) + '%';
                            elVal.className = perc >= 95 ? 'indicator-value positive' : perc >= 85 ? 'indicator-value warning' : 'indicator-value negative';
                        }
                        if (elProg) {
                            const pct = Math.min(100, Math.max(0, perc));
                            elProg.style.width = pct + '%';
                            elProg.className = perc >= 95 ? 'progress-bar bg-success' : perc >= 85 ? 'progress-bar bg-warning' : 'progress-bar bg-danger';
                        }
                    } else {
                        if (elVal) elVal.textContent = '-';
                        if (elProg) elProg.style.width = '0%';
                    }
                } else {
                    if (elVal) elVal.textContent = '-';
                    if (elProg) elProg.style.width = '0%';
                }
            } catch (e) {
                console.error('Erro ao carregar Volume Realizado:', e);
                const elVal = document.getElementById('volumeRealizadoValue');
                const elProg = document.getElementById('volumeRealizadoProgress');
                if (elVal) elVal.textContent = 'Erro';
                if (elProg) elProg.style.width = '0%';
            }
        }

        // Carregar evolução do PERC_REALIZADO por mês para o gráfico Volume Realizado (média por mês no período)
        async function carregarVolumeRealizadoHistorico() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                if (!dataIni || !dataFin) {
                    volumeRealizadoRealData = [];
                    return;
                }
                volumeRealizadoRealData = new Array(12).fill(null);
                const start = new Date(dataIni);
                const end = new Date(dataFin);
                let current = new Date(start.getFullYear(), start.getMonth(), 1);
                while (current <= end) {
                    const mesIndex = current.getMonth();
                    const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0);
                    const dtIniMes = '01-' + (current.getMonth() + 1).toString().padStart(2, '0') + '-' + current.getFullYear();
                    const dtFimMes = lastDay.getDate().toString().padStart(2, '0') + '-' + (lastDay.getMonth() + 1).toString().padStart(2, '0') + '-' + lastDay.getFullYear();
                    const base = sqlBaseVolumeRealizado(dtIniMes, dtFimMes);
                    const sql = `SELECT ROUND(AVG(PERC_REALIZADO) * 100, 2) AS media_perc FROM (${base}) T`;
                    const result = await JX.consultar(sql);
                    if (result && result.length > 0) {
                        const v = parseFloat(result[0].MEDIA_PERC != null ? result[0].MEDIA_PERC : result[0].media_perc);
                        if (!isNaN(v)) volumeRealizadoRealData[mesIndex] = v;
                    }
                    current.setMonth(current.getMonth() + 1);
                }
            } catch (e) {
                console.error('Erro ao carregar histórico Volume Realizado:', e);
                volumeRealizadoRealData = [];
            }
        }

        // Carregar detalhes Volume Realizado (query_base7) – tabela com todos os campos da query
        async function carregarDetalhesVolumeRealizado() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return [];
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                if (!dataIni || !dataFin) return [];
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const sql = sqlBaseVolumeRealizado(dtInicial, dtFinal) + ' ORDER BY CODIGO_ITEM';
                const result = await JX.consultar(sql);
                return result || [];
            } catch (e) {
                console.error('Erro ao carregar detalhes Volume Realizado:', e);
                return [];
            }
        }

        // Base SQL Ocupação Produção - Query consolidada (query7) para CARD - média PARTICIPACAO_EFETIVO_DISPONIVEL
        function sqlOcupacaoProducaoCard(dtInicial, dtFinal) {
            return `
                WITH FERIADOS AS (
                    SELECT '01/01' AS dia_mes_feriado FROM DUAL
                    UNION ALL SELECT '03/04' FROM DUAL
                    UNION ALL SELECT '21/04' FROM DUAL
                    UNION ALL SELECT '01/05' FROM DUAL
                    UNION ALL SELECT '07/09' FROM DUAL
                    UNION ALL SELECT '12/10' FROM DUAL
                    UNION ALL SELECT '02/11' FROM DUAL
                    UNION ALL SELECT '20/11' FROM DUAL
                    UNION ALL SELECT '25/12' FROM DUAL
                ),
                BASE AS (
                    SELECT DHINICIO, DHFINAL
                    FROM TPRIATV
                    WHERE DHINCLUSAO BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                      AND DHINICIO IS NOT NULL AND DHFINAL IS NOT NULL
                ),
                CALC_EFETIVAS AS (
                    SELECT DHINICIO, DHFINAL,
                        CASE WHEN DHINICIO IS NULL OR DHFINAL IS NULL THEN 0
                             WHEN DHINICIO > DHFINAL THEN 0
                             ELSE (
                                CASE WHEN TRUNC(DHINICIO) = TRUNC(DHFINAL) THEN
                                    CASE WHEN TO_NUMBER(TO_CHAR(DHINICIO, 'D')) BETWEEN 2 AND 6
                                         AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DHINICIO, 'DD/MM')) THEN
                                        GREATEST(0, LEAST(18, TO_NUMBER(TO_CHAR(DHFINAL, 'HH24')) + TO_NUMBER(TO_CHAR(DHFINAL, 'MI'))/60)
                                            - GREATEST(8, TO_NUMBER(TO_CHAR(DHINICIO, 'HH24')) + TO_NUMBER(TO_CHAR(DHINICIO, 'MI'))/60))
                                    ELSE 0 END
                                ELSE
                                    CASE WHEN TO_NUMBER(TO_CHAR(DHINICIO, 'D')) BETWEEN 2 AND 6
                                         AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DHINICIO, 'DD/MM')) THEN
                                        GREATEST(0, 18 - GREATEST(8, TO_NUMBER(TO_CHAR(DHINICIO, 'HH24')) + TO_NUMBER(TO_CHAR(DHINICIO, 'MI'))/60))
                                    ELSE 0 END +
                                    CASE WHEN TRUNC(DHFINAL) - TRUNC(DHINICIO) <= 1 THEN 0
                                         ELSE (SELECT NVL(SUM(10), 0) FROM (
                                                SELECT TRUNC(DHINICIO) + LEVEL AS dia_intermediario FROM DUAL
                                                CONNECT BY LEVEL < TRUNC(DHFINAL) - TRUNC(DHINICIO)
                                              ) WHERE TO_NUMBER(TO_CHAR(dia_intermediario, 'D')) BETWEEN 2 AND 6
                                                AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(dia_intermediario, 'DD/MM')))
                                    END +
                                    CASE WHEN TO_NUMBER(TO_CHAR(DHFINAL, 'D')) BETWEEN 2 AND 6
                                         AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DHFINAL, 'DD/MM')) THEN
                                        GREATEST(0, LEAST(18, TO_NUMBER(TO_CHAR(DHFINAL, 'HH24')) + TO_NUMBER(TO_CHAR(DHFINAL, 'MI'))/60) - 8)
                                    ELSE 0 END
                                END
                             ) END AS HORAS_EFETIVAS
                    FROM BASE
                ),
                HORAS_DISPONIVEIS_CALC AS (
                    SELECT SUM(10) AS HORAS_DISPONIVEIS
                    FROM (
                        SELECT TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY')) + LEVEL - 1 AS dia
                        FROM DUAL
                        CONNECT BY LEVEL <= TRUNC(TO_DATE('${dtFinal}', 'DD-MM-YYYY')) - TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY')) + 1
                    ) dias
                    WHERE TO_NUMBER(TO_CHAR(dias.dia, 'D')) BETWEEN 2 AND 6
                      AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(dias.dia, 'DD/MM'))
                )
                SELECT ROUND(SUM(c.HORAS_EFETIVAS) / NULLIF(d.HORAS_DISPONIVEIS, 0) * 100, 2) AS PARTICIPACAO_EFETIVO_DISPONIVEL
                FROM CALC_EFETIVAS c
                CROSS JOIN HORAS_DISPONIVEIS_CALC d
                GROUP BY d.HORAS_DISPONIVEIS
            `;
        }

        // SQL Ocupação Produção - Query por MÊS/ANO (query8) para GRÁFICO - evolução PARTICIPACAO_EFETIVO_DISPONIVEL
        function sqlOcupacaoProducaoHistorico(dtInicial, dtFinal) {
            return `
                WITH FERIADOS AS (
                    SELECT '01/01' AS dia_mes_feriado FROM DUAL
                    UNION ALL SELECT '03/04' FROM DUAL
                    UNION ALL SELECT '21/04' FROM DUAL
                    UNION ALL SELECT '01/05' FROM DUAL
                    UNION ALL SELECT '07/09' FROM DUAL
                    UNION ALL SELECT '12/10' FROM DUAL
                    UNION ALL SELECT '02/11' FROM DUAL
                    UNION ALL SELECT '20/11' FROM DUAL
                    UNION ALL SELECT '25/12' FROM DUAL
                ),
                MESES AS (
                    SELECT TO_NUMBER(TO_CHAR(mes_ref, 'YYYY')) AS ANO, TO_NUMBER(TO_CHAR(mes_ref, 'MM')) AS MES,
                           TRUNC(mes_ref, 'MM') AS DATA_INICIO, LAST_DAY(mes_ref) AS DATA_FIM
                    FROM (
                        SELECT ADD_MONTHS(TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'), 'MM'), LEVEL - 1) AS mes_ref
                        FROM DUAL
                        CONNECT BY ADD_MONTHS(TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'), 'MM'), LEVEL - 1) <= TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                    )
                ),
                BASE AS (
                    SELECT m.ANO, m.MES, m.DATA_INICIO, m.DATA_FIM, t.DHINICIO, t.DHFINAL
                    FROM MESES m
                    JOIN TPRIATV t ON t.DHINCLUSAO >= m.DATA_INICIO AND t.DHINCLUSAO <= m.DATA_FIM
                       AND t.DHINICIO IS NOT NULL AND t.DHFINAL IS NOT NULL
                ),
                CALC_EFETIVAS AS (
                    SELECT ANO, MES, DHINICIO, DHFINAL,
                        CASE WHEN DHINICIO IS NULL OR DHFINAL IS NULL THEN 0
                             WHEN DHINICIO > DHFINAL THEN 0
                             ELSE (
                                CASE WHEN TRUNC(DHINICIO) = TRUNC(DHFINAL) THEN
                                    CASE WHEN TO_NUMBER(TO_CHAR(DHINICIO, 'D')) BETWEEN 2 AND 6
                                         AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DHINICIO, 'DD/MM')) THEN
                                        GREATEST(0, LEAST(18, TO_NUMBER(TO_CHAR(DHFINAL, 'HH24')) + TO_NUMBER(TO_CHAR(DHFINAL, 'MI'))/60)
                                            - GREATEST(8, TO_NUMBER(TO_CHAR(DHINICIO, 'HH24')) + TO_NUMBER(TO_CHAR(DHINICIO, 'MI'))/60))
                                    ELSE 0 END
                                ELSE
                                    CASE WHEN TO_NUMBER(TO_CHAR(DHINICIO, 'D')) BETWEEN 2 AND 6
                                         AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DHINICIO, 'DD/MM')) THEN
                                        GREATEST(0, 18 - GREATEST(8, TO_NUMBER(TO_CHAR(DHINICIO, 'HH24')) + TO_NUMBER(TO_CHAR(DHINICIO, 'MI'))/60))
                                    ELSE 0 END +
                                    CASE WHEN TRUNC(DHFINAL) - TRUNC(DHINICIO) <= 1 THEN 0
                                         ELSE (SELECT NVL(SUM(10), 0) FROM (
                                                SELECT TRUNC(DHINICIO) + LEVEL AS dia_intermediario FROM DUAL
                                                CONNECT BY LEVEL < TRUNC(DHFINAL) - TRUNC(DHINICIO)
                                              ) WHERE TO_NUMBER(TO_CHAR(dia_intermediario, 'D')) BETWEEN 2 AND 6
                                                AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(dia_intermediario, 'DD/MM')))
                                    END +
                                    CASE WHEN TO_NUMBER(TO_CHAR(DHFINAL, 'D')) BETWEEN 2 AND 6
                                         AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DHFINAL, 'DD/MM')) THEN
                                        GREATEST(0, LEAST(18, TO_NUMBER(TO_CHAR(DHFINAL, 'HH24')) + TO_NUMBER(TO_CHAR(DHFINAL, 'MI'))/60) - 8)
                                    ELSE 0 END
                                END
                             ) END AS HORAS_EFETIVAS
                    FROM BASE
                ),
                HORAS_DISPONIVEIS_CALC AS (
                    SELECT m.ANO, m.MES,
                        NVL((SELECT SUM(10) FROM (
                            SELECT m.DATA_INICIO + LEVEL - 1 AS dia FROM DUAL
                            CONNECT BY LEVEL <= (m.DATA_FIM - m.DATA_INICIO + 1)
                        ) dias
                        WHERE TO_NUMBER(TO_CHAR(dias.dia, 'D')) BETWEEN 2 AND 6
                          AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(dias.dia, 'DD/MM'))), 0) AS HORAS_DISPONIVEIS
                    FROM MESES m
                )
                SELECT c.ANO, c.MES, c.MES - 1 AS MES_INDEX,
                       ROUND(SUM(c.HORAS_EFETIVAS) / NULLIF(d.HORAS_DISPONIVEIS, 0) * 100, 2) AS PARTICIPACAO_EFETIVO_DISPONIVEL
                FROM CALC_EFETIVAS c
                JOIN HORAS_DISPONIVEIS_CALC d ON d.ANO = c.ANO AND d.MES = c.MES
                GROUP BY c.ANO, c.MES, d.HORAS_DISPONIVEIS
                ORDER BY c.ANO, c.MES
            `;
        }

        // Base SQL Ocupação Produção - Query detalhe (query9) para TABELA - todos os dados TPRIATV + HORAS_EFETIVAS_PRODUCAO
        function sqlBaseOcupacaoProducaoDetalhe(dtInicial, dtFinal) {
            return `
                WITH FERIADOS AS (
                    SELECT '01/01' AS dia_mes_feriado FROM DUAL
                    UNION ALL SELECT '03/04' FROM DUAL
                    UNION ALL SELECT '21/04' FROM DUAL
                    UNION ALL SELECT '01/05' FROM DUAL
                    UNION ALL SELECT '07/09' FROM DUAL
                    UNION ALL SELECT '12/10' FROM DUAL
                    UNION ALL SELECT '02/11' FROM DUAL
                    UNION ALL SELECT '20/11' FROM DUAL
                    UNION ALL SELECT '25/12' FROM DUAL
                ),
                BASE AS (
                    SELECT * FROM TPRIATV
                    WHERE DHINCLUSAO BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                      AND DHINICIO IS NOT NULL AND DHFINAL IS NOT NULL
                )
                SELECT BASE.*,
                    CASE WHEN DHINICIO IS NULL OR DHFINAL IS NULL THEN NULL
                         WHEN DHINICIO > DHFINAL THEN NULL
                         ELSE (
                            CASE WHEN TRUNC(DHINICIO) = TRUNC(DHFINAL) THEN
                                CASE WHEN TO_NUMBER(TO_CHAR(DHINICIO, 'D')) BETWEEN 2 AND 6
                                     AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DHINICIO, 'DD/MM')) THEN
                                    GREATEST(0, LEAST(18, TO_NUMBER(TO_CHAR(DHFINAL, 'HH24')) + TO_NUMBER(TO_CHAR(DHFINAL, 'MI'))/60)
                                        - GREATEST(8, TO_NUMBER(TO_CHAR(DHINICIO, 'HH24')) + TO_NUMBER(TO_CHAR(DHINICIO, 'MI'))/60))
                                ELSE 0 END
                            ELSE
                                CASE WHEN TO_NUMBER(TO_CHAR(DHINICIO, 'D')) BETWEEN 2 AND 6
                                     AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DHINICIO, 'DD/MM')) THEN
                                    GREATEST(0, 18 - GREATEST(8, TO_NUMBER(TO_CHAR(DHINICIO, 'HH24')) + TO_NUMBER(TO_CHAR(DHINICIO, 'MI'))/60))
                                ELSE 0 END +
                                CASE WHEN TRUNC(DHFINAL) - TRUNC(DHINICIO) <= 1 THEN 0
                                     ELSE (SELECT NVL(SUM(10), 0) FROM (
                                            SELECT TRUNC(DHINICIO) + LEVEL AS dia_intermediario FROM DUAL
                                            CONNECT BY LEVEL < TRUNC(DHFINAL) - TRUNC(DHINICIO)
                                          ) WHERE TO_NUMBER(TO_CHAR(dia_intermediario, 'D')) BETWEEN 2 AND 6
                                            AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(dia_intermediario, 'DD/MM')))
                                END +
                                CASE WHEN TO_NUMBER(TO_CHAR(DHFINAL, 'D')) BETWEEN 2 AND 6
                                     AND NOT EXISTS (SELECT 1 FROM FERIADOS WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DHFINAL, 'DD/MM')) THEN
                                    GREATEST(0, LEAST(18, TO_NUMBER(TO_CHAR(DHFINAL, 'HH24')) + TO_NUMBER(TO_CHAR(DHFINAL, 'MI'))/60) - 8)
                                ELSE 0 END
                            END
                         ) END AS HORAS_EFETIVAS_PRODUCAO
                FROM BASE
            `;
        }

        // Carregar média PARTICIPACAO_EFETIVO_DISPONIVEL para o card Ocupação Produção (query7) – intervalo de datas
        async function carregarOcupacaoProducao() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                if (!dataIni || !dataFin) {
                    const elVal = document.getElementById('ocupacaoProducaoValue');
                    const elProg = document.getElementById('ocupacaoProducaoProgress');
                    if (elVal) elVal.textContent = '-';
                    if (elProg) elProg.style.width = '0%';
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const sql = sqlOcupacaoProducaoCard(dtInicial, dtFinal);
                const result = await JX.consultar(sql);
                const elVal = document.getElementById('ocupacaoProducaoValue');
                const elProg = document.getElementById('ocupacaoProducaoProgress');
                if (result && result.length > 0) {
                    const perc = parseFloat(result[0].PARTICIPACAO_EFETIVO_DISPONIVEL != null ? result[0].PARTICIPACAO_EFETIVO_DISPONIVEL : result[0].participacao_efetivo_disponivel);
                    if (!isNaN(perc) && perc >= 0) {
                        if (elVal) {
                            elVal.textContent = perc.toFixed(2) + '%';
                            elVal.className = perc >= 85 ? 'indicator-value positive' : perc >= 70 ? 'indicator-value warning' : 'indicator-value negative';
                        }
                        if (elProg) {
                            const pct = Math.min(100, Math.max(0, perc));
                            elProg.style.width = pct + '%';
                            elProg.className = perc >= 85 ? 'progress-bar bg-success' : perc >= 70 ? 'progress-bar bg-warning' : 'progress-bar bg-danger';
                        }
                    } else {
                        if (elVal) elVal.textContent = '-';
                        if (elProg) elProg.style.width = '0%';
                    }
                } else {
                    if (elVal) elVal.textContent = '-';
                    if (elProg) elProg.style.width = '0%';
                }
            } catch (e) {
                console.error('Erro ao carregar Ocupação Produção:', e);
                const elVal = document.getElementById('ocupacaoProducaoValue');
                const elProg = document.getElementById('ocupacaoProducaoProgress');
                if (elVal) elVal.textContent = 'Erro';
                if (elProg) elProg.style.width = '0%';
            }
        }

        // Carregar evolução PARTICIPACAO_EFETIVO_DISPONIVEL por mês para o gráfico Ocupação Produção (query8)
        async function carregarOcupacaoProducaoHistorico() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                if (!dataIni || !dataFin) {
                    ocupacaoProducaoRealData = [];
                    return;
                }
                ocupacaoProducaoRealData = new Array(12).fill(null);
                const sql = sqlOcupacaoProducaoHistorico(convertDateToDB(dataIni), convertDateToDB(dataFin));
                const result = await JX.consultar(sql);
                if (result && result.length > 0) {
                    result.forEach(row => {
                        const mi = parseInt(row.MES_INDEX != null ? row.MES_INDEX : row.mes_index || (row.MES - 1));
                        const perc = parseFloat(row.PARTICIPACAO_EFETIVO_DISPONIVEL != null ? row.PARTICIPACAO_EFETIVO_DISPONIVEL : row.participacao_efetivo_disponivel || 0);
                        if (mi >= 0 && mi < 12 && !isNaN(perc)) ocupacaoProducaoRealData[mi] = perc;
                    });
                }
            } catch (e) {
                console.error('Erro ao carregar histórico Ocupação Produção:', e);
                ocupacaoProducaoRealData = [];
            }
        }

        // Carregar detalhes Ocupação Produção (query9) – tabela com todos os dados da query
        async function carregarDetalhesOcupacaoProducao() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return [];
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                if (!dataIni || !dataFin) return [];
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const sql = sqlBaseOcupacaoProducaoDetalhe(dtInicial, dtFinal) + ' ORDER BY DHINCLUSAO, DHINICIO';
                const result = await JX.consultar(sql);
                return result || [];
            } catch (e) {
                console.error('Erro ao carregar detalhes Ocupação Produção:', e);
                return [];
            }
        }

        // Base SQL Manutenções Preventivas (query_base8) – CARD: participação percentual tipo PV no total de ordens
        function sqlManutencaoPreventivaCard(dtInicial, dtFinal) {
            return `
                SELECT
                    COUNT(CASE WHEN NVL(TMT.TIPO,'NF') = 'PV' THEN 1 END) AS qtd_pv,
                    COUNT(*) AS total_ordens,
                    ROUND(100 * COUNT(CASE WHEN NVL(TMT.TIPO,'NF') = 'PV' THEN 1 END) / NULLIF(COUNT(*), 0), 2) AS participacao_pct_pv
                FROM TMEOMT OMT
                LEFT JOIN TMETMT TMT ON OMT.CODTMT = TMT.CODTMT
                WHERE OMT.DTHRCAD BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
            `;
        }

        // Base SQL Manutenções Preventivas (query_base8) – GRÁFICO: evolução da participação % PV por mês
        function sqlManutencaoPreventivaGrafico(dtInicial, dtFinal) {
            return `
                SELECT
                    TO_CHAR(OMT.DTHRCAD,'YYYY') ANO,
                    TO_NUMBER(TO_CHAR(OMT.DTHRCAD,'MM')) AS MES,
                    TO_NUMBER(TO_CHAR(OMT.DTHRCAD,'MM')) - 1 AS MES_INDEX,
                    TO_CHAR(OMT.DTHRCAD,'MM/YYYY') MES_ANO,
                    COUNT(CASE WHEN NVL(TMT.TIPO,'NF') = 'PV' THEN 1 END) AS qtd_pv,
                    COUNT(*) AS total_ordens,
                    ROUND(100 * COUNT(CASE WHEN NVL(TMT.TIPO,'NF') = 'PV' THEN 1 END) / NULLIF(COUNT(*), 0), 2) AS participacao_pct_pv
                FROM TMEOMT OMT
                LEFT JOIN TMETMT TMT ON OMT.CODTMT = TMT.CODTMT
                WHERE OMT.DTHRCAD BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                GROUP BY
                    TO_CHAR(OMT.DTHRCAD,'YYYY'),
                    TO_CHAR(OMT.DTHRCAD,'MM'),
                    TO_CHAR(OMT.DTHRCAD,'MM/YYYY')
                ORDER BY
                    TO_CHAR(OMT.DTHRCAD,'YYYY'),
                    TO_CHAR(OMT.DTHRCAD,'MM')
            `;
        }

        // Base SQL Manutenções Preventivas (query_base8) – TABELA: detalhamento de ordens no período
        function sqlManutencaoPreventivaTabela(dtInicial, dtFinal) {
            return `
                SELECT
                    OMT.codomt,
                    OMT.codimt,
                    NVL(TMT.DESCRICAO,'NAO INFORMADO') AS DESCRICAO,
                    NVL(TMT.TIPO,'NF') AS TIPO,
                    NVL(F_DESCROPC('TMETMT', 'TIPO', TMT.TIPO),'NAO INFORMADO') AS DESC_TIPO,
                    OMT.status,
                    F_DESCROPC('TMEOMT', 'STATUS', OMT.STATUS) AS DESC_STATUS,
                    OMT.DTHRCAD,
                    OMT.DTHRCONCLUSAO,
                    OMT.TEMPOPARADO,
                    OMT.USUSOL
                FROM TMEOMT OMT
                LEFT JOIN TMETMT TMT ON OMT.CODTMT = TMT.CODTMT
                WHERE OMT.DTHRCAD BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
            `;
        }

        // Base SQL Manutenções Corretivas (query_base9) – CARD: participação percentual tipo CO no total de ordens
        function sqlManutencaoCorretivaCard(dtInicial, dtFinal) {
            return `
                SELECT
                    COUNT(CASE WHEN NVL(TMT.TIPO,'NF') = 'CO' THEN 1 END) AS qtd_co,
                    COUNT(*) AS total_ordens,
                    ROUND(100 * COUNT(CASE WHEN NVL(TMT.TIPO,'NF') = 'CO' THEN 1 END) / NULLIF(COUNT(*), 0), 2) AS participacao_pct_co
                FROM TMEOMT OMT
                LEFT JOIN TMETMT TMT ON OMT.CODTMT = TMT.CODTMT
                WHERE OMT.DTHRCAD BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
            `;
        }

        // Base SQL Manutenções Corretivas (query_base9) – GRÁFICO: evolução da participação % CO por mês
        function sqlManutencaoCorretivaGrafico(dtInicial, dtFinal) {
            return `
                SELECT
                    TO_CHAR(OMT.DTHRCAD,'YYYY') ANO,
                    TO_NUMBER(TO_CHAR(OMT.DTHRCAD,'MM')) AS MES,
                    TO_NUMBER(TO_CHAR(OMT.DTHRCAD,'MM')) - 1 AS MES_INDEX,
                    TO_CHAR(OMT.DTHRCAD,'MM/YYYY') MES_ANO,
                    COUNT(CASE WHEN NVL(TMT.TIPO,'NF') = 'CO' THEN 1 END) AS qtd_co,
                    COUNT(*) AS total_ordens,
                    ROUND(100 * COUNT(CASE WHEN NVL(TMT.TIPO,'NF') = 'CO' THEN 1 END) / NULLIF(COUNT(*), 0), 2) AS participacao_pct_co
                FROM TMEOMT OMT
                LEFT JOIN TMETMT TMT ON OMT.CODTMT = TMT.CODTMT
                WHERE OMT.DTHRCAD BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                GROUP BY
                    TO_CHAR(OMT.DTHRCAD,'YYYY'),
                    TO_CHAR(OMT.DTHRCAD,'MM'),
                    TO_CHAR(OMT.DTHRCAD,'MM/YYYY')
                ORDER BY
                    TO_CHAR(OMT.DTHRCAD,'YYYY'),
                    TO_CHAR(OMT.DTHRCAD,'MM')
            `;
        }

        // Base SQL Manutenções Corretivas (query_base9) – TABELA: detalhamento ordens tipo CO no período
        function sqlManutencaoCorretivaTabela(dtInicial, dtFinal) {
            return `
                SELECT
                    OMT.codomt,
                    OMT.codimt,
                    NVL(TMT.DESCRICAO,'NAO INFORMADO') AS DESCRICAO,
                    NVL(TMT.TIPO,'NF') AS TIPO,
                    NVL(F_DESCROPC('TMETMT', 'TIPO', TMT.TIPO),'NAO INFORMADO') AS DESC_TIPO,
                    OMT.status,
                    F_DESCROPC('TMEOMT', 'STATUS', OMT.STATUS) AS DESC_STATUS,
                    OMT.DTHRCAD,
                    OMT.DTHRCONCLUSAO,
                    OMT.TEMPOPARADO,
                    OMT.USUSOL
                FROM TMEOMT OMT
                LEFT JOIN TMETMT TMT ON OMT.CODTMT = TMT.CODTMT
                WHERE OMT.DTHRCAD BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                AND NVL(TMT.TIPO,'NF') = 'CO'
            `;
        }

        // Carregar participação percentual PV para o card Manutenções Preventivas (respeitando intervalo de datas)
        async function carregarManutencaoPreventiva() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const elVal = document.getElementById('manutencaoPreventivaValue');
                const elProg = document.getElementById('manutencaoPreventivaProgress');
                if (!elVal) return;
                if (!dataIni || !dataFin) {
                    elVal.textContent = '-';
                    if (elProg) { elProg.style.width = '0%'; }
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const sql = sqlManutencaoPreventivaCard(dtInicial, dtFinal);
                const result = await JX.consultar(sql);
                if (result && result.length > 0) {
                    const perc = parseFloat(result[0].PARTICIPACAO_PCT_PV != null ? result[0].PARTICIPACAO_PCT_PV : result[0].participacao_pct_pv);
                    if (!isNaN(perc) && perc >= 0) {
                        elVal.textContent = perc.toFixed(2) + '%';
                        elVal.className = perc >= 80 ? 'indicator-value positive' : perc >= 60 ? 'indicator-value warning' : 'indicator-value negative';
                        const pct = Math.min(100, Math.max(0, perc));
                        if (elProg) {
                            elProg.style.width = pct + '%';
                            elProg.className = perc >= 80 ? 'progress-bar bg-success' : perc >= 60 ? 'progress-bar bg-warning' : 'progress-bar bg-danger';
                        }
                    } else {
                        elVal.textContent = '-';
                        if (elProg) elProg.style.width = '0%';
                    }
                } else {
                    elVal.textContent = '-';
                    if (elProg) elProg.style.width = '0%';
                }
            } catch (e) {
                console.error('Erro ao carregar Manutenções Preventivas (card):', e);
                const elVal = document.getElementById('manutencaoPreventivaValue');
                const elProg = document.getElementById('manutencaoPreventivaProgress');
                if (elVal) elVal.textContent = 'Erro';
                if (elProg) elProg.style.width = '0%';
            }
        }

        // Carregar evolução da participação % PV por mês para o gráfico Manutenções Preventivas
        async function carregarManutencaoPreventivaHistorico() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                if (!dataIni || !dataFin) {
                    manutencaoPreventivaRealData = [];
                    return;
                }
                manutencaoPreventivaRealData = new Array(12).fill(null);
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const sql = sqlManutencaoPreventivaGrafico(dtInicial, dtFinal);
                const result = await JX.consultar(sql);
                if (result && result.length > 0) {
                    result.forEach(row => {
                        const mi = parseInt(row.MES_INDEX != null ? row.MES_INDEX : row.mes_index || (row.MES - 1));
                        const perc = parseFloat(row.PARTICIPACAO_PCT_PV != null ? row.PARTICIPACAO_PCT_PV : row.participacao_pct_pv || 0);
                        if (mi >= 0 && mi < 12 && !isNaN(perc)) manutencaoPreventivaRealData[mi] = perc;
                    });
                }
            } catch (e) {
                console.error('Erro ao carregar histórico Manutenções Preventivas:', e);
                manutencaoPreventivaRealData = [];
            }
        }

        // Carregar detalhes Manutenções Preventivas (query_base8) – tabela com todos os dados da query
        async function carregarDetalhesManutencaoPreventiva() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return [];
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                if (!dataIni || !dataFin) return [];
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const sql = sqlManutencaoPreventivaTabela(dtInicial, dtFinal) + ' ORDER BY OMT.DTHRCAD, OMT.codomt';
                const result = await JX.consultar(sql);
                return result || [];
            } catch (e) {
                console.error('Erro ao carregar detalhes Manutenções Preventivas:', e);
                return [];
            }
        }

        // Carregar participação percentual CO para o card Manutenções Corretivas (respeitando intervalo de datas)
        async function carregarManutencaoCorretiva() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const elVal = document.getElementById('manutencaoCorretivaValue');
                const elProg = document.getElementById('manutencaoCorretivaProgress');
                if (!elVal) return;
                if (!dataIni || !dataFin) {
                    elVal.textContent = '-';
                    if (elProg) { elProg.style.width = '0%'; }
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const sql = sqlManutencaoCorretivaCard(dtInicial, dtFinal);
                const result = await JX.consultar(sql);
                if (result && result.length > 0) {
                    const perc = parseFloat(result[0].PARTICIPACAO_PCT_CO != null ? result[0].PARTICIPACAO_PCT_CO : result[0].participacao_pct_co);
                    if (!isNaN(perc) && perc >= 0) {
                        elVal.textContent = perc.toFixed(2) + '%';
                        elVal.className = perc <= 20 ? 'indicator-value positive' : perc <= 40 ? 'indicator-value warning' : 'indicator-value negative';
                        const pct = Math.min(100, Math.max(0, perc));
                        if (elProg) {
                            elProg.style.width = pct + '%';
                            elProg.className = perc <= 20 ? 'progress-bar bg-success' : perc <= 40 ? 'progress-bar bg-warning' : 'progress-bar bg-danger';
                        }
                    } else {
                        elVal.textContent = '-';
                        if (elProg) elProg.style.width = '0%';
                    }
                } else {
                    elVal.textContent = '-';
                    if (elProg) elProg.style.width = '0%';
                }
            } catch (e) {
                console.error('Erro ao carregar Manutenções Corretivas (card):', e);
                const elVal = document.getElementById('manutencaoCorretivaValue');
                const elProg = document.getElementById('manutencaoCorretivaProgress');
                if (elVal) elVal.textContent = 'Erro';
                if (elProg) elProg.style.width = '0%';
            }
        }

        // Carregar evolução da participação % CO por mês para o gráfico Manutenções Corretivas
        async function carregarManutencaoCorretivaHistorico() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                if (!dataIni || !dataFin) {
                    manutencaoCorretivaRealData = [];
                    return;
                }
                manutencaoCorretivaRealData = new Array(12).fill(null);
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const sql = sqlManutencaoCorretivaGrafico(dtInicial, dtFinal);
                const result = await JX.consultar(sql);
                if (result && result.length > 0) {
                    result.forEach(row => {
                        const mi = parseInt(row.MES_INDEX != null ? row.MES_INDEX : row.mes_index || (row.MES != null ? row.MES - 1 : 0));
                        const perc = parseFloat(row.PARTICIPACAO_PCT_CO != null ? row.PARTICIPACAO_PCT_CO : row.participacao_pct_co || 0);
                        if (mi >= 0 && mi < 12 && !isNaN(perc)) manutencaoCorretivaRealData[mi] = perc;
                    });
                }
            } catch (e) {
                console.error('Erro ao carregar histórico Manutenções Corretivas:', e);
                manutencaoCorretivaRealData = [];
            }
        }

        // Carregar detalhes Manutenções Corretivas (query_base9) – tabela com todos os dados da query (ordens tipo CO)
        async function carregarDetalhesManutencaoCorretiva() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return [];
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                if (!dataIni || !dataFin) return [];
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const sql = sqlManutencaoCorretivaTabela(dtInicial, dtFinal) + ' ORDER BY OMT.DTHRCAD, OMT.codomt';
                const result = await JX.consultar(sql);
                return result || [];
            } catch (e) {
                console.error('Erro ao carregar detalhes Manutenções Corretivas:', e);
                return [];
            }
        }

        const qualidadeData = {
            CD1: [95, 96, 97, 98, 98.5, 98.7, 98.8, 98.9, 99.0, 98.5, 98.5, 98.5],
            CD2: [94, 95, 96, 97, 98.0, 98.2, 98.3, 98.4, 98.6, 98.0, 98.0, 98.0],
            CD3: [96, 97, 98, 98.5, 99.0, 99.1, 99.2, 99.0, 98.8, 98.7, 98.7, 98.7],
            CD4: [93, 94, 95, 96, 97.0, 97.2, 97.3, 97.4, 97.6, 97.0, 97.0, 97.0],
            CD5: [97, 98, 99, 99.5, 99.8, 99.9, 99.8, 99.7, 99.5, 99.2, 99.2, 99.2]
        };

        const custoEntregaData = {
            CD1: [10000, 10500, 11000, 11200, 11500, 11800, 12000, 12200, 12300, 12450, 12450, 12450],
            CD2: [11000, 11200, 11500, 11700, 12000, 12200, 12400, 12600, 12700, 12800, 12800, 12800],
            CD3: [9000, 9500, 10000, 10200, 10500, 10800, 11000, 11200, 11300, 11400, 11400, 11400],
            CD4: [12000, 12200, 12500, 12700, 13000, 13200, 13400, 13600, 13700, 13800, 13800, 13800],
            CD5: [8000, 8500, 9000, 9200, 9500, 9800, 10000, 10200, 10300, 10400, 10400, 10400]
        };

        const tempoEntregaData = {
            CD1: [2.5, 2.2, 2.0, 1.8, 1.6, 1.4, 1.3, 1.2, 1.1, 1.0, 1.0, 1.0],
            CD2: [3.0, 2.8, 2.5, 2.3, 2.1, 1.9, 1.8, 1.7, 1.6, 1.5, 1.5, 1.5],
            CD3: [2.0, 1.9, 1.7, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.9, 0.9],
            CD4: [2.8, 2.5, 2.3, 2.1, 1.9, 1.7, 1.6, 1.5, 1.4, 1.3, 1.3, 1.3],
            CD5: [1.8, 1.6, 1.4, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.6, 0.6]
        };

        // Dados mockados do custoCD serão substituídos pelos dados reais
        const custoCDData = {
            CD1: [7000, 7100, 7200, 7300, 7400, 7500, 7600, 7700, 7800, 7900, 7900, 7900],
            CD2: [7500, 7600, 7700, 7800, 7900, 8000, 8100, 8200, 8300, 8400, 8400, 8400],
            CD3: [8000, 8100, 8200, 8300, 8400, 8500, 8600, 8700, 8800, 8900, 8900, 8900],
            CD4: [6500, 6600, 6700, 6800, 6900, 7000, 7100, 7200, 7300, 7400, 7400, 7400],
            CD5: [8500, 8600, 8700, 8800, 8900, 9000, 9100, 9200, 9300, 9400, 9400, 9400]
        };

        const formulacaoData = {
            CD1: [99.0, 99.1, 99.2, 99.3, 99.4, 99.5, 99.6, 99.7, 99.8, 99.2, 99.2, 99.2],
            CD2: [98.5, 98.6, 98.7, 98.8, 98.9, 99.0, 99.1, 99.2, 99.3, 99.0, 99.0, 99.0],
            CD3: [99.5, 99.6, 99.7, 99.8, 99.9, 99.9, 99.9, 99.8, 99.7, 99.5, 99.5, 99.5],
            CD4: [98.0, 98.1, 98.2, 98.3, 98.4, 98.5, 98.6, 98.7, 98.8, 98.5, 98.5, 98.5],
            CD5: [99.2, 99.3, 99.4, 99.5, 99.6, 99.7, 99.8, 99.9, 99.9, 99.2, 99.2, 99.2]
        };

        const envaseData = {
            CD1: [96.5, 96.6, 96.7, 96.8, 96.9, 97.0, 97.1, 97.2, 97.3, 96.8, 96.8, 96.8],
            CD2: [95.5, 95.6, 95.7, 95.8, 95.9, 96.0, 96.1, 96.2, 96.3, 96.0, 96.0, 96.0],
            CD3: [97.0, 97.1, 97.2, 97.3, 97.4, 97.5, 97.6, 97.7, 97.8, 97.5, 97.5, 97.5],
            CD4: [94.5, 94.6, 94.7, 94.8, 94.9, 95.0, 95.1, 95.2, 95.3, 95.0, 95.0, 95.0],
            CD5: [96.8, 96.9, 97.0, 97.1, 97.2, 97.3, 97.4, 97.5, 97.6, 96.8, 96.8, 96.8]
        };

        const volumeRealizadoData = {
            CD1: [88, 89, 90, 91, 91.5, 91.7, 91.8, 91.9, 92.0, 91.5, 91.5, 91.5],
            CD2: [89, 90, 91, 92, 92.5, 92.7, 92.8, 92.9, 93.0, 92.5, 92.5, 92.5],
            CD3: [90, 91, 92, 93, 93.5, 93.7, 93.8, 93.9, 94.0, 93.5, 93.5, 93.5],
            CD4: [87, 88, 89, 90, 90.5, 90.7, 90.8, 90.9, 91.0, 90.5, 90.5, 90.5],
            CD5: [92, 93, 94, 95, 95.5, 95.7, 95.8, 95.9, 96.0, 95.5, 95.5, 95.5]
        };

        const ocupacaoProducaoData = {
            CD1: [85, 86, 87, 87.3, 87.5, 87.6, 87.7, 87.8, 87.9, 87.3, 87.3, 87.3],
            CD2: [86, 87, 88, 88.3, 88.5, 88.6, 88.7, 88.8, 88.9, 88.3, 88.3, 88.3],
            CD3: [84, 85, 86, 86.3, 86.5, 86.6, 86.7, 86.8, 86.9, 86.3, 86.3, 86.3],
            CD4: [88, 89, 90, 90.3, 90.5, 90.6, 90.7, 90.8, 90.9, 90.3, 90.3, 90.3],
            CD5: [83, 84, 85, 85.3, 85.5, 85.6, 85.7, 85.8, 85.9, 85.3, 85.3, 85.3]
        };

        const manutencaoPreventivaData = {
            CD1: [78, 79, 80, 81, 81.5, 81.7, 81.8, 81.9, 82.0, 82.1, 82.1, 82.1],
            CD2: [79, 80, 81, 82, 82.5, 82.7, 82.8, 82.9, 83.0, 82.5, 82.5, 82.5],
            CD3: [80, 81, 82, 83, 83.5, 83.7, 83.8, 83.9, 84.0, 83.5, 83.5, 83.5],
            CD4: [77, 78, 79, 80, 80.5, 80.7, 80.8, 80.9, 81.0, 80.5, 80.5, 80.5],
            CD5: [81, 82, 83, 84, 84.5, 84.7, 84.8, 84.9, 85.0, 84.5, 84.5, 84.5]
        };

        const manutencaoCorretivaData = {
            CD1: [18, 19, 20, 19.5, 19, 18.5, 18, 17.5, 17, 17, 17, 17],
            CD2: [19, 20, 21, 20.5, 20, 19.5, 19, 18.5, 18, 18, 18, 18],
            CD3: [17, 18, 19, 18.5, 18, 17.5, 17, 16.5, 16, 16, 16, 16],
            CD4: [20, 21, 22, 21.5, 21, 20.5, 20, 19.5, 19, 19, 19, 19],
            CD5: [16, 17, 18, 17.5, 17, 16.5, 16, 15.5, 15, 15, 15, 15]
        };

        const planejadoRealizadoData = {
            CD1: [75, 76, 77, 78, 78.5, 78.7, 78.8, 78.9, 79.0, 78.9, 78.9, 78.9],
            CD2: [76, 77, 78, 79, 79.5, 79.7, 79.8, 79.9, 80.0, 79.5, 79.5, 79.5],
            CD3: [77, 78, 79, 80, 80.5, 80.7, 80.8, 80.9, 81.0, 80.5, 80.5, 80.5],
            CD4: [74, 75, 76, 77, 77.5, 77.7, 77.8, 77.9, 78.0, 77.5, 77.5, 77.5],
            CD5: [78, 79, 80, 81, 81.5, 81.7, 81.8, 81.9, 82.0, 81.5, 81.5, 81.5]
        };

        const dataMap = {
            qualidade: qualidadeData,
            custoEntrega: custoEntregaData,
            tempoEntrega: tempoEntregaData,
            custoCD: custoCDData,
            formulacao: formulacaoData,
            envase: envaseData,
            volumeRealizado: volumeRealizadoData,
            ocupacaoProducao: ocupacaoProducaoData,
            manutencaoPreventiva: manutencaoPreventivaData,
            manutencaoCorretiva: manutencaoCorretivaData,
            planejadoRealizado: planejadoRealizadoData
        };

        const kpiTitles = {
            qualidade: 'Qualidade na Entrega',
            custoEntrega: 'Custo Entrega',
            tempoEntrega: 'Tempo de Entrega',
            custoCD: 'Custo do CD',
            formulacao: 'Qualidade de Formulação',
            envase: 'Qualidade no Envase',
            volumeRealizado: 'Volume Realizado',
            ocupacaoProducao: 'Ocupação Produção',
            manutencaoPreventiva: 'Manutenções Preventivas',
            manutencaoCorretiva: 'Manutenções Corretivas',
            planejadoRealizado: 'Planejado Realizado'
        };

        const tabToKpis = {
            'gerir-entregas': ['qualidade', 'custoEntrega', 'tempoEntrega', 'custoCD'],
            'industria': ['formulacao', 'envase', 'volumeRealizado', 'ocupacaoProducao'],
            'manutencao': ['manutencaoPreventiva', 'manutencaoCorretiva', 'planejadoRealizado']
        };

        const breakdownConfigs = {
            qualidade: [
                { name: 'Feedbacks Conforme', unit: '%' },
                { name: 'Feedbacks Não Conforme', unit: '%' }
            ],
            custoEntrega: [
                { name: 'Custo Frete', unit: 'R$' },
                { name: 'Valores OC', unit: 'R$' }
            ],
            tempoEntrega: [
                { name: 'Dias Efetivos', unit: 'dias' },
                { name: 'Dias Previstos', unit: 'dias' }
            ],
            custoCD: [
                { name: 'Centro de Custo', unit: 'R$' },
                { name: 'Faturamento', unit: 'R$' }
            ],
            formulacao: [
                { name: 'Testes Aprovados', unit: '%' },
                { name: 'Testes Reprovados', unit: '%' }
            ],
            envase: [
                { name: 'Unidades Conformes', unit: '%' },
                { name: 'Unidades Não Conformes', unit: '%' }
            ],
            volumeRealizado: [
                { name: 'Volume Realizado', unit: '%' },
                { name: 'Volume Planejado', unit: '%' }
            ],
            ocupacaoProducao: [
                { name: 'Ocupação Real', unit: '%' },
                { name: 'Capacidade Total', unit: '%' }
            ],
            manutencaoPreventiva: [
                { name: 'Preventivas Realizadas', unit: '%' },
                { name: 'Preventivas Planejadas', unit: '%' }
            ],
            manutencaoCorretiva: [
                { name: 'Manutenções Corretivas', unit: '%' },
                { name: 'Total Ordens', unit: '' }
            ],
            planejadoRealizado: [
                { name: 'Planejado', unit: '%' },
                { name: 'Realizado', unit: '%' }
            ]
        };

        let selectedKPIs = new Set(); // Conjunto de KPIs selecionados

        // Dados de exemplo para a tabela de detalhamento
        const sampleDetailData = [
            { nroUnico: 'INV001', dtaNegociacao: '2025-10-01', parceiro: 'Parceiro A', empresa: 'Empresa X', vlrNota: '1500.00' },
            { nroUnico: 'INV002', dtaNegociacao: '2025-10-02', parceiro: 'Parceiro B', empresa: 'Empresa Y', vlrNota: '2300.50' },
            { nroUnico: 'INV003', dtaNegociacao: '2025-10-03', parceiro: 'Parceiro C', empresa: 'Empresa Z', vlrNota: '1800.75' },
            { nroUnico: 'INV004', dtaNegociacao: '2025-10-05', parceiro: 'Parceiro A', empresa: 'Empresa X', vlrNota: '1200.00' },
            { nroUnico: 'INV005', dtaNegociacao: '2025-10-07', parceiro: 'Parceiro D', empresa: 'Empresa W', vlrNota: '2900.25' },
            { nroUnico: 'INV006', dtaNegociacao: '2025-10-10', parceiro: 'Parceiro B', empresa: 'Empresa Y', vlrNota: '1600.00' },
            { nroUnico: 'INV007', dtaNegociacao: '2025-10-12', parceiro: 'Parceiro E', empresa: 'Empresa V', vlrNota: '2100.80' },
            { nroUnico: 'INV008', dtaNegociacao: '2025-10-15', parceiro: 'Parceiro C', empresa: 'Empresa Z', vlrNota: '1750.30' }
        ];

        // Função para converter nome do mês para número (0-11)
        function getMonthIndex(monthName) {
            const monthMap = {
                'Jan': 0, 'Fev': 1, 'Mar': 2, 'Abr': 3, 'Mai': 4, 'Jun': 5,
                'Jul': 6, 'Ago': 7, 'Set': 8, 'Out': 9, 'Nov': 10, 'Dez': 11
            };
            return monthMap[monthName] !== undefined ? monthMap[monthName] : -1;
        }

        // Função para obter datas inicial e final do mês
        function getMonthDateRange(monthName, year) {
            const monthIndex = getMonthIndex(monthName);
            if (monthIndex === -1) return null;
            
            const startDate = new Date(year, monthIndex, 1);
            const endDate = new Date(year, monthIndex + 1, 0); // Último dia do mês
            
            return {
                start: startDate.toISOString().split('T')[0], // YYYY-MM-DD
                end: endDate.toISOString().split('T')[0]
            };
        }

        // Função para carregar detalhes do Custo do CD do banco
        async function carregarDetalhesCustoCD(codemp, monthName, value) {
            try {
                if (typeof JX === "undefined" || !JX.consultar) {
                    console.error("SankhyaJX não está disponível");
                    return [];
                }

                // Obter ano do período selecionado
                const dataIni = document.getElementById('dataIni').value;
                const year = new Date(dataIni).getFullYear();
                
                // Calcular intervalo de datas do mês
                const dateRange = getMonthDateRange(monthName, year);
                if (!dateRange) {
                    console.error("Mês inválido:", monthName);
                    return [];
                }

                // Obter todos os codemp selecionados no filtro
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                
                if (!empresasSelecionadas || empresasSelecionadas.length === 0) {
                    console.warn("Nenhuma empresa selecionada no filtro");
                    return [];
                }

                // Converter datas para formato Oracle
                const dtInicial = convertDateToDB(dateRange.start);
                const dtFinal = convertDateToDB(dateRange.end);

                // Construir filtro de empresas para incluir todos os codemp selecionados
                const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                const filtroEmpresa = `AND X.CODEMP IN (${empresasStr})`;

                // Query baseada em query_custo.sql
                const sql = `
                    SELECT 
                        X.CODEMP,
                        X.NUFIN,
                        X.NUMNOTA,
                        X.NUNOTA,
                        X.CODPARC,
                        X.NOMEPARC,
                        X.CODCENCUS,
                        X.CODCENCUSPAI,
                        X.GRAU,
                        X.DESCRCENCUS,
                        X.CODNAT,
                        X.DESCRNAT,
                        TO_CHAR(X.DHBAIXA, 'DD-MM-YYYY') AS DHBAIXA,
                        X.VLRBAIXA,
                        X.VLRDESDOB,
                        X.RECDESP,
                        NVL(CASE WHEN X.CODNAT = 2020202 AND X.RECDESP IN (-1, 0) THEN X.VLRDESDOB 
                                 WHEN X.CODNAT <> 2020202 AND X.RECDESP IN (-1) THEN X.VLRBAIXA 
                                 ELSE 0 END, 0) AS VLRDESP
                    FROM TSICUS CUS1
                    LEFT JOIN VGF_RESULTADO2_SATIS X ON X.CODCENCUS = CUS1.CODCENCUS
                    INNER JOIN TGFNAT NAT ON X.CODNAT = NAT.CODNAT
                    WHERE 
                        X.DHBAIXA BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                        ${filtroEmpresa}
                        AND X.CODNAT NOT IN (1010000, 1020000, 6010100, 6010200)
                        AND X.CODCENCUS LIKE '9%'
                        AND X.PROVISAO = 'N'
                        AND X.VLRBAIXA <> 0
                        AND X.CODNAT IN (2020202,2020301,2020302,2020303,2020304,2020305,2020306,2020307,
                                         2020308,2020309,2020310,2020312,2020313,2020314,2020400,2020501,
                                         2020900,2030300,2040100,2040200,3030202,3030308,4010300,4010400,
                                         4010500,4020105,4030203,4030301)
                    ORDER BY X.CODEMP, X.DHBAIXA, X.NUFIN
                `;

                const result = await JX.consultar(sql);
                return result || [];
            } catch (error) {
                console.error("Erro ao carregar detalhes do Custo do CD:", error);
                return [];
            }
        }

        // Carregar detalhes Tempo de Entrega (query_base1) – filtros codemp e dtneg; opcional cd+month
        async function carregarDetalhesTempoEntrega(cd, month, value) {
            try {
                if (typeof JX === "undefined" || !JX.consultar) return [];
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) return [];
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                let filtroEmpresa = `AND vgf.codemp IN (${empresasStr})`;
                let dtIni = dtInicial, dtFim = dtFinal;
                if (cd != null && cd !== '' && month != null && month !== '') {
                    const year = new Date(dataIni).getFullYear();
                    const range = getMonthDateRange(month, year);
                    if (range) {
                        dtIni = convertDateToDB(range.start);
                        dtFim = convertDateToDB(range.end);
                        filtroEmpresa = `AND vgf.codemp = '${cd}'`;
                    }
                }
                const sql = sqlBaseTempoEntrega(dtIni, dtFim, filtroEmpresa) + ' ORDER BY codemp, dtneg, nunota';
                const result = await JX.consultar(sql);
                return result || [];
            } catch (e) {
                console.error('Erro ao carregar detalhes Tempo de Entrega:', e);
                return [];
            }
        }

        // Função para mostrar detalhamento fullscreen
        async function showDetails(kpi, cd, month, value) {
            let title = `${kpiTitles[kpi]} - ${cd} - ${month} (Valor Total: ${value})`;
            
            // Se for custoCD, carregar dados do banco
            if (kpi === 'custoCD') {
                showLoading(true);
                try {
                    // Obter empresas selecionadas para o título
                    const empresasSelect = document.getElementById('empresas');
                    const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                    if (empresasSelecionadas.length > 1) {
                        title = `${kpiTitles[kpi]} - Todas as Empresas Selecionadas (${empresasSelecionadas.join(', ')}) - ${month}`;
                    }
                    
                    const detailData = await carregarDetalhesCustoCD(cd, month, value);
                    
                    let tableHTML = `
                        <div class="col-12">
                            <h2>${title}</h2>
                            <table class="table table-striped table-hover" id="detail-table">
                                <thead class="table-dark">
                                    <tr>
                                        <th>CODEMP</th>
                                        <th>NUFIN</th>
                                        <th>NUMNOTA</th>
                                        <th>NUNOTA</th>
                                        <th>CODPARC</th>
                                        <th>NOMEPARC</th>
                                        <th>CODCENCUS</th>
                                        <th>DESCRCENCUS</th>
                                        <th>CODNAT</th>
                                        <th>DESCRNAT</th>
                                        <th>DHBAIXA</th>
                                        <th>VLRBAIXA</th>
                                        <th>VLRDESP</th>
                                    </tr>
                                </thead>
                                <tbody>`;

                    if (detailData && detailData.length > 0) {
                        detailData.forEach(row => {
                            const codemp = row.CODEMP || row.codemp || '';
                            const nufin = row.NUFIN || row.nufin || '';
                            const numnota = row.NUMNOTA || row.numnota || '';
                            const nunota = row.NUNOTA || row.nunota || '';
                            const codparc = row.CODPARC || row.codparc || '';
                            const nomeparc = row.NOMEPARC || row.nomeparc || '';
                            const codcencus = row.CODCENCUS || row.codcencus || '';
                            const descrcencus = row.DESCRCENCUS || row.descrccencus || '';
                            const codnat = row.CODNAT || row.codnat || '';
                            const descrnat = row.DESCRNAT || row.descrnat || '';
                            const dhbaixa = row.DHBAIXA || row.dhbaixa || '';
                            const vlrbaixa = parseFloat(row.VLRBAIXA || row.vlrbaixa || 0);
                            const vlrdesp = parseFloat(row.VLRDESP || row.vlrdesp || 0);

                            tableHTML += `
                                <tr>
                                    <td>${codemp}</td>
                                    <td>${nufin}</td>
                                    <td>${numnota}</td>
                                    <td>${nunota}</td>
                                    <td>${codparc}</td>
                                    <td>${nomeparc}</td>
                                    <td>${codcencus}</td>
                                    <td>${descrcencus}</td>
                                    <td>${codnat}</td>
                                    <td>${descrnat}</td>
                                    <td>${formatDate(dhbaixa)}</td>
                                    <td>${formatCurrency(vlrbaixa)}</td>
                                    <td>${formatCurrency(vlrdesp)}</td>
                                </tr>`;
                        });
                    } else {
                        tableHTML += `
                            <tr>
                                <td colspan="13" class="text-center">Nenhum registro encontrado para o período selecionado.</td>
                            </tr>`;
                    }

                    tableHTML += `
                                </tbody>
                            </table>
                            <div class="mb-3">
                                <button class="btn btn-success me-2" onclick="exportToExcel()">Exportar Excel</button>
                                <button class="btn btn-primary me-2" onclick="exportToPDF()">Exportar PDF</button>
                                <button class="btn btn-secondary" onclick="closeDetail()">Fechar</button>
                            </div>
                        </div>`;

                    document.getElementById('detail-view').innerHTML = tableHTML;
                } catch (error) {
                    console.error("Erro ao carregar detalhes:", error);
                    alert("Erro ao carregar detalhes: " + error.message);
                } finally {
                    showLoading(false);
                }
            } else if (kpi === 'qualidade') {
                showLoading(true);
                try {
                    title = `${kpiTitles[kpi]}${cd && month ? ` - ${cd} - ${month} (Percentual: ${value != null ? value + '%' : '-'})` : ' - Detalhamento'}`;
                    const detailData = await carregarDetalhesQualidade(cd || null, month || null, value);
                    let tableHTML = `
                        <div class="col-12">
                            <h2>${title}</h2>
                            <table class="table table-striped table-hover" id="detail-table">
                                <thead class="table-dark">
                                    <tr>
                                        <th>CODEMP</th>
                                        <th>NUNOTA</th>
                                        <th>NUMNOTA</th>
                                        <th>CODPARC</th>
                                        <th>NOMEPARC</th>
                                        <th>DTNEG</th>
                                        <th>DTMOV</th>
                                        <th>AD_FEEDBACK</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                    if (detailData && detailData.length > 0) {
                        detailData.forEach(row => {
                            const codemp = row.CODEMP ?? row.codemp ?? '';
                            const nunota = row.NUNOTA ?? row.nunota ?? '';
                            const numnota = row.NUMNOTA ?? row.numnota ?? '';
                            const codparc = row.CODPARC ?? row.codparc ?? '';
                            const nomeparc = (row.NOMEPARC ?? row.nomeparc ?? '').toString();
                            const dtneg = row.DTNEG ?? row.dtneg ?? '';
                            const dtmov = row.DTMOV ?? row.dtmov ?? '';
                            const adFeedback = row.AD_FEEDBACK ?? row.ad_feedback ?? '';
                            const feedbackLabel = adFeedback == 1 ? 'Conforme' : adFeedback == 2 ? 'Não Conforme' : adFeedback;
                            tableHTML += `
                                <tr>
                                    <td>${codemp}</td>
                                    <td>${nunota}</td>
                                    <td>${numnota}</td>
                                    <td>${codparc}</td>
                                    <td>${nomeparc}</td>
                                    <td>${formatDate(dtneg)}</td>
                                    <td>${formatDate(dtmov)}</td>
                                    <td>${feedbackLabel}</td>
                                </tr>`;
                        });
                    } else {
                        tableHTML += `
                            <tr>
                                <td colspan="8" class="text-center">Nenhum registro encontrado para o período selecionado.</td>
                            </tr>`;
                    }
                    tableHTML += `
                                </tbody>
                            </table>
                            <div class="mb-3">
                                <button class="btn btn-success me-2" onclick="exportToExcel()">Exportar Excel</button>
                                <button class="btn btn-primary me-2" onclick="exportToPDF()">Exportar PDF</button>
                                <button class="btn btn-secondary" onclick="closeDetail()">Fechar</button>
                            </div>
                        </div>`;
                    document.getElementById('detail-view').innerHTML = tableHTML;
                } catch (err) {
                    console.error('Erro ao carregar detalhes Qualidade na Entrega:', err);
                    alert('Erro ao carregar detalhes: ' + err.message);
                } finally {
                    showLoading(false);
                }
            } else if (kpi === 'custoEntrega') {
                showLoading(true);
                try {
                    title = `${kpiTitles[kpi]}${cd && month ? ` - ${cd} - ${month} (Média: ${value != null ? formatCurrency(value) : '-'})` : ' - Detalhamento'}`;
                    const detailData = await carregarDetalhesCustoEntrega(cd || null, month || null, value);
                    let tableHTML = `
                        <div class="col-12">
                            <h2>${title}</h2>
                            <table class="table table-striped table-hover" id="detail-table">
                                <thead class="table-dark">
                                    <tr>
                                        <th>CODEMP</th>
                                        <th>NUNOTA</th>
                                        <th>NUMNOTA</th>
                                        <th>CODPARC</th>
                                        <th>NOMEPARC</th>
                                        <th>DTNEG</th>
                                        <th>DTFATUR</th>
                                        <th>DTENTSAI</th>
                                        <th>DTMOV</th>
                                        <th>VLRNOTA</th>
                                        <th>VLRFRETE</th>
                                        <th>PERC_FRETE_VLRNOTA</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                    if (detailData && detailData.length > 0) {
                        detailData.forEach(row => {
                            const codemp = row.CODEMP ?? row.codemp ?? '';
                            const nunota = row.NUNOTA ?? row.nunota ?? '';
                            const numnota = row.NUMNOTA ?? row.numnota ?? '';
                            const codparc = row.CODPARC ?? row.codparc ?? '';
                            const nomeparc = (row.NOMEPARC ?? row.nomeparc ?? '').toString();
                            const dtneg = row.DTNEG ?? row.dtneg ?? '';
                            const dtfatur = row.DTFATUR ?? row.dtfatur ?? '';
                            const dtentsai = row.DTENTSAI ?? row.dtentsai ?? '';
                            const dtmov = row.DTMOV ?? row.dtmov ?? '';
                            const vlrnota = parseFloat(row.VLRNOTA ?? row.vlrnota ?? 0);
                            const vlrfrete = parseFloat(row.VLRFRETE ?? row.vlrfrete ?? 0);
                            const percFrete = parseFloat(row.PERC_FRETE_VLRNOTA ?? row.perc_frete_vlrnota ?? 0);
                            tableHTML += `
                                <tr>
                                    <td>${codemp}</td>
                                    <td>${nunota}</td>
                                    <td>${numnota}</td>
                                    <td>${codparc}</td>
                                    <td>${nomeparc}</td>
                                    <td>${formatDate(dtneg)}</td>
                                    <td>${formatDate(dtfatur)}</td>
                                    <td>${formatDate(dtentsai)}</td>
                                    <td>${formatDate(dtmov)}</td>
                                    <td>${formatCurrency(vlrnota)}</td>
                                    <td>${formatCurrency(vlrfrete)}</td>
                                    <td>${percFrete.toFixed(2)}%</td>
                                </tr>`;
                        });
                    } else {
                        tableHTML += `
                            <tr>
                                <td colspan="12" class="text-center">Nenhum registro encontrado para o período selecionado.</td>
                            </tr>`;
                    }
                    tableHTML += `
                                </tbody>
                            </table>
                            <div class="mb-3">
                                <button class="btn btn-success me-2" onclick="exportToExcel()">Exportar Excel</button>
                                <button class="btn btn-primary me-2" onclick="exportToPDF()">Exportar PDF</button>
                                <button class="btn btn-secondary" onclick="closeDetail()">Fechar</button>
                            </div>
                        </div>`;
                    document.getElementById('detail-view').innerHTML = tableHTML;
                } catch (err) {
                    console.error('Erro ao carregar detalhes Custo Entrega:', err);
                    alert('Erro ao carregar detalhes: ' + err.message);
                } finally {
                    showLoading(false);
                }
            } else if (kpi === 'tempoEntrega') {
                showLoading(true);
                try {
                    title = `${kpiTitles[kpi]}${cd && month ? ` - ${cd} - ${month} (Média: ${value != null ? value + ' dias' : '-'})` : ' - Detalhamento'}`;
                    const detailData = await carregarDetalhesTempoEntrega(cd || null, month || null, value);
                    let tableHTML = `
                        <div class="col-12">
                            <h2>${title}</h2>
                            <table class="table table-striped table-hover" id="detail-table">
                                <thead class="table-dark">
                                    <tr>
                                        <th>CODEMP</th>
                                        <th>NUNOTA</th>
                                        <th>NUMNOTA</th>
                                        <th>CODVEND</th>
                                        <th>APELIDO</th>
                                        <th>CODPARC</th>
                                        <th>NOMEPARC</th>
                                        <th>QTD</th>
                                        <th>VLR</th>
                                        <th>CODTIPOPER</th>
                                        <th>DESCROPER</th>
                                        <th>DTNEG</th>
                                        <th>AD_DTENTREGAEFETIVA</th>
                                        <th>DIAS_ENTREGA</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                    if (detailData && detailData.length > 0) {
                        detailData.forEach(row => {
                            const codemp = row.CODEMP ?? row.codemp ?? '';
                            const nunota = row.NUNOTA ?? row.nunota ?? '';
                            const numnota = row.NUMNOTA ?? row.numnota ?? '';
                            const codvend = row.CODVEND ?? row.codvend ?? '';
                            const apelido = (row.APELIDO ?? row.apelido ?? '').toString();
                            const codparc = row.CODPARC ?? row.codparc ?? '';
                            const nomeparc = (row.NOMEPARC ?? row.nomeparc ?? '').toString();
                            const qtd = parseFloat(row.QTD ?? row.qtd ?? 0);
                            const vlr = parseFloat(row.VLR ?? row.vlr ?? 0);
                            const codtipoper = row.CODTIPOPER ?? row.codtipoper ?? '';
                            const descroper = (row.DESCROPER ?? row.descroper ?? '').toString();
                            const dtneg = row.DTNEG ?? row.dtneg ?? '';
                            const dtentrega = row.AD_DTENTREGAEFETIVA ?? row.ad_dtentregaefetiva ?? '';
                            const dias = row.DIAS_ENTREGA ?? row.dias_entrega ?? '';
                            tableHTML += `
                                <tr>
                                    <td>${codemp}</td>
                                    <td>${nunota}</td>
                                    <td>${numnota}</td>
                                    <td>${codvend}</td>
                                    <td>${apelido}</td>
                                    <td>${codparc}</td>
                                    <td>${nomeparc}</td>
                                    <td>${qtd}</td>
                                    <td>${formatCurrency(vlr)}</td>
                                    <td>${codtipoper}</td>
                                    <td>${descroper}</td>
                                    <td>${formatDate(dtneg)}</td>
                                    <td>${formatDate(dtentrega)}</td>
                                    <td>${dias}</td>
                                </tr>`;
                        });
                    } else {
                        tableHTML += `
                            <tr>
                                <td colspan="15" class="text-center">Nenhum registro encontrado para o período selecionado.</td>
                            </tr>`;
                    }
                    tableHTML += `
                                </tbody>
                            </table>
                            <div class="mb-3">
                                <button class="btn btn-success me-2" onclick="exportToExcel()">Exportar Excel</button>
                                <button class="btn btn-primary me-2" onclick="exportToPDF()">Exportar PDF</button>
                                <button class="btn btn-secondary" onclick="closeDetail()">Fechar</button>
                            </div>
                        </div>`;
                    document.getElementById('detail-view').innerHTML = tableHTML;
                } catch (err) {
                    console.error('Erro ao carregar detalhes Tempo de Entrega:', err);
                    alert('Erro ao carregar detalhes: ' + err.message);
                } finally {
                    showLoading(false);
                }
            } else if (kpi === 'ocupacaoProducao') {
                showLoading(true);
                try {
                    title = `${kpiTitles[kpi]} - Detalhamento (período: ${document.getElementById('dataIni').value} a ${document.getElementById('dataFin').value})`;
                    const detailData = await carregarDetalhesOcupacaoProducao();
                    const columns = detailData && detailData.length > 0 ? Object.keys(detailData[0]) : [];
                    let tableHTML = `
                        <div class="col-12">
                            <h2>${title}</h2>
                            <table class="table table-striped table-hover" id="detail-table">
                                <thead class="table-dark">
                                    <tr>`;
                    columns.forEach(col => { tableHTML += `<th>${col}</th>`; });
                    tableHTML += `
                                    </tr>
                                </thead>
                                <tbody>`;
                    if (detailData && detailData.length > 0) {
                        const dateCols = ['DHINICIO','DHFINAL','DHINCLUSAO','DTNEG','DTMOV','DHALTER'];
                        detailData.forEach(row => {
                            tableHTML += '<tr>';
                            columns.forEach(col => {
                                const val = row[col];
                                let disp = '';
                                if (val != null) {
                                    if (typeof val === 'number') disp = Number.isInteger(val) ? val : Number(val).toFixed(2);
                                    else disp = dateCols.includes(col.toUpperCase()) ? formatDate(String(val)) : String(val);
                                }
                                tableHTML += `<td>${disp}</td>`;
                            });
                            tableHTML += '</tr>';
                        });
                    } else {
                        tableHTML += `
                            <tr>
                                <td colspan="${Math.max(1, columns.length)}" class="text-center">Nenhum registro encontrado para o período selecionado.</td>
                            </tr>`;
                    }
                    tableHTML += `
                                </tbody>
                            </table>
                            <div class="mb-3">
                                <button class="btn btn-success me-2" onclick="exportToExcel()">Exportar Excel</button>
                                <button class="btn btn-primary me-2" onclick="exportToPDF()">Exportar PDF</button>
                                <button class="btn btn-secondary" onclick="closeDetail()">Fechar</button>
                            </div>
                        </div>`;
                    document.getElementById('detail-view').innerHTML = tableHTML;
                } catch (err) {
                    console.error('Erro ao carregar detalhes Ocupação Produção:', err);
                    alert('Erro ao carregar detalhes: ' + err.message);
                } finally {
                    showLoading(false);
                }
            } else if (kpi === 'volumeRealizado') {
                showLoading(true);
                try {
                    title = `${kpiTitles[kpi]} - Detalhamento (período: ${document.getElementById('dataIni').value} a ${document.getElementById('dataFin').value})`;
                    const detailData = await carregarDetalhesVolumeRealizado();
                    let tableHTML = `
                        <div class="col-12">
                            <h2>${title}</h2>
                            <table class="table table-striped table-hover" id="detail-table">
                                <thead class="table-dark">
                                    <tr>
                                        <th>CODIGO_ITEM</th>
                                        <th>ITEM</th>
                                        <th>CODIGO_GRUPO</th>
                                        <th>GRUPO</th>
                                        <th>CODVOL</th>
                                        <th>QUANTIDADE</th>
                                        <th>TOTALUNID</th>
                                        <th>QTDPREV</th>
                                        <th>PERC_REALIZADO (%)</th>
                                        <th>DIFERENCA</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                    if (detailData && detailData.length > 0) {
                        detailData.forEach(row => {
                            const codigoItem = row.CODIGO_ITEM ?? row.codigo_item ?? '';
                            const item = (row.ITEM ?? row.item ?? '').toString();
                            const codigoGrupo = row.CODIGO_GRUPO ?? row.codigo_grupo ?? '';
                            const grupo = (row.GRUPO ?? row.grupo ?? '').toString();
                            const codvol = row.CODVOL ?? row.codvol ?? '';
                            const quantidade = parseFloat(row.QUANTIDADE ?? row.quantidade ?? 0);
                            const totalunid = parseFloat(row.TOTALUNID ?? row.totalunid ?? 0);
                            const qtdprev = parseFloat(row.QTDPREV ?? row.qtdprev ?? 0);
                            const percRealizado = row.PERC_REALIZADO != null ? row.PERC_REALIZADO : row.perc_realizado;
                            const percPct = (percRealizado != null && !isNaN(parseFloat(percRealizado))) ? (parseFloat(percRealizado) * 100).toFixed(2) + '%' : '-';
                            const diferenca = parseFloat(row.DIFERENCA ?? row.diferenca ?? 0);
                            tableHTML += `
                                <tr>
                                    <td>${codigoItem}</td>
                                    <td>${item}</td>
                                    <td>${codigoGrupo}</td>
                                    <td>${grupo}</td>
                                    <td>${codvol}</td>
                                    <td>${quantidade.toFixed(2)}</td>
                                    <td>${totalunid.toFixed(2)}</td>
                                    <td>${qtdprev.toFixed(2)}</td>
                                    <td>${percPct}</td>
                                    <td>${diferenca.toFixed(2)}</td>
                                </tr>`;
                        });
                    } else {
                        tableHTML += `
                            <tr>
                                <td colspan="10" class="text-center">Nenhum registro encontrado para o período selecionado.</td>
                            </tr>`;
                    }
                    tableHTML += `
                                </tbody>
                            </table>
                            <div class="mb-3">
                                <button class="btn btn-success me-2" onclick="exportToExcel()">Exportar Excel</button>
                                <button class="btn btn-primary me-2" onclick="exportToPDF()">Exportar PDF</button>
                                <button class="btn btn-secondary" onclick="closeDetail()">Fechar</button>
                            </div>
                        </div>`;
                    document.getElementById('detail-view').innerHTML = tableHTML;
                } catch (err) {
                    console.error('Erro ao carregar detalhes Volume Realizado:', err);
                    alert('Erro ao carregar detalhes: ' + err.message);
                } finally {
                    showLoading(false);
                }
            } else if (kpi === 'manutencaoPreventiva') {
                showLoading(true);
                try {
                    title = `${kpiTitles[kpi]} - Detalhamento (período: ${document.getElementById('dataIni').value} a ${document.getElementById('dataFin').value})`;
                    const detailData = await carregarDetalhesManutencaoPreventiva();
                    const columns = detailData && detailData.length > 0 ? Object.keys(detailData[0]) : [];
                    const dateCols = ['DTHRCAD', 'DTHRCONCLUSAO'];
                    let tableHTML = `
                        <div class="col-12">
                            <h2>${title}</h2>
                            <table class="table table-striped table-hover" id="detail-table">
                                <thead class="table-dark">
                                    <tr>`;
                    columns.forEach(col => { tableHTML += `<th>${col}</th>`; });
                    tableHTML += `
                                    </tr>
                                </thead>
                                <tbody>`;
                    if (detailData && detailData.length > 0) {
                        detailData.forEach(row => {
                            tableHTML += '<tr>';
                            columns.forEach(col => {
                                const val = row[col];
                                let disp = '';
                                if (val != null) {
                                    if (typeof val === 'number') disp = Number.isInteger(val) ? val : Number(val).toFixed(2);
                                    else disp = dateCols.includes(col.toUpperCase()) ? formatDate(String(val)) : String(val);
                                }
                                tableHTML += `<td>${disp}</td>`;
                            });
                            tableHTML += '</tr>';
                        });
                    } else {
                        tableHTML += `
                            <tr>
                                <td colspan="${Math.max(1, columns.length)}" class="text-center">Nenhum registro encontrado para o período selecionado.</td>
                            </tr>`;
                    }
                    tableHTML += `
                                </tbody>
                            </table>
                            <div class="mb-3">
                                <button class="btn btn-success me-2" onclick="exportToExcel()">Exportar Excel</button>
                                <button class="btn btn-primary me-2" onclick="exportToPDF()">Exportar PDF</button>
                                <button class="btn btn-secondary" onclick="closeDetail()">Fechar</button>
                            </div>
                        </div>`;
                    document.getElementById('detail-view').innerHTML = tableHTML;
                } catch (err) {
                    console.error('Erro ao carregar detalhes Manutenções Preventivas:', err);
                    alert('Erro ao carregar detalhes: ' + err.message);
                } finally {
                    showLoading(false);
                }
            } else if (kpi === 'manutencaoCorretiva') {
                showLoading(true);
                try {
                    title = `${kpiTitles[kpi]} - Detalhamento (período: ${document.getElementById('dataIni').value} a ${document.getElementById('dataFin').value})`;
                    const detailData = await carregarDetalhesManutencaoCorretiva();
                    const columns = detailData && detailData.length > 0 ? Object.keys(detailData[0]) : [];
                    const dateCols = ['DTHRCAD', 'DTHRCONCLUSAO'];
                    let tableHTML = `
                        <div class="col-12">
                            <h2>${title}</h2>
                            <table class="table table-striped table-hover" id="detail-table">
                                <thead class="table-dark">
                                    <tr>`;
                    columns.forEach(col => { tableHTML += `<th>${col}</th>`; });
                    tableHTML += `
                                    </tr>
                                </thead>
                                <tbody>`;
                    if (detailData && detailData.length > 0) {
                        detailData.forEach(row => {
                            tableHTML += '<tr>';
                            columns.forEach(col => {
                                const val = row[col];
                                let disp = '';
                                if (val != null) {
                                    if (typeof val === 'number') disp = Number.isInteger(val) ? val : Number(val).toFixed(2);
                                    else disp = dateCols.includes(col.toUpperCase()) ? formatDate(String(val)) : String(val);
                                }
                                tableHTML += `<td>${disp}</td>`;
                            });
                            tableHTML += '</tr>';
                        });
                    } else {
                        tableHTML += `
                            <tr>
                                <td colspan="${Math.max(1, columns.length)}" class="text-center">Nenhum registro encontrado para o período selecionado.</td>
                            </tr>`;
                    }
                    tableHTML += `
                                </tbody>
                            </table>
                            <div class="mb-3">
                                <button class="btn btn-success me-2" onclick="exportToExcel()">Exportar Excel</button>
                                <button class="btn btn-primary me-2" onclick="exportToPDF()">Exportar PDF</button>
                                <button class="btn btn-secondary" onclick="closeDetail()">Fechar</button>
                            </div>
                        </div>`;
                    document.getElementById('detail-view').innerHTML = tableHTML;
                } catch (err) {
                    console.error('Erro ao carregar detalhes Manutenções Corretivas:', err);
                    alert('Erro ao carregar detalhes: ' + err.message);
                } finally {
                    showLoading(false);
                }
            } else {
                // Para outros KPIs, usar dados de exemplo
                let tableHTML = `
                    <div class="col-12">
                        <h2>${title}</h2>
                        <table class="table table-striped" id="detail-table">
                            <thead class="table-dark">
                                <tr>
                                    <th>Nro Unico</th>
                                    <th>Dta. Negociação</th>
                                    <th>Parceiro</th>
                                    <th>Empresa</th>
                                    <th>Vlr. Nota</th>
                                </tr>
                            </thead>
                            <tbody>`;

                sampleDetailData.forEach(row => {
                    tableHTML += `
                        <tr>
                            <td>${row.nroUnico}</td>
                            <td>${row.dtaNegociacao}</td>
                            <td>${row.parceiro}</td>
                            <td>${row.empresa}</td>
                            <td>R$ ${row.vlrNota}</td>
                        </tr>`;
                });

                tableHTML += `
                            </tbody>
                        </table>
                        <div class="mb-3">
                            <button class="btn btn-success me-2" onclick="exportToExcel()">Exportar Excel</button>
                            <button class="btn btn-primary me-2" onclick="exportToPDF()">Exportar PDF</button>
                            <button class="btn btn-secondary" onclick="closeDetail()">Fechar</button>
                        </div>
                    </div>`;

                document.getElementById('detail-view').innerHTML = tableHTML;
            }

            // Esconder elementos do painel
            document.getElementById('processNav').classList.add('d-none');
            document.querySelectorAll('.kpi-cards-row').forEach(row => row.classList.add('d-none'));
            document.querySelectorAll('.kpi-charts-row').forEach(row => row.classList.add('d-none'));
            document.getElementById('detail-view').classList.remove('d-none');

            // Definir variáveis globais para export
            window.currentKPI = kpi;
            window.currentCD = cd;
            window.currentMonth = month;
            window.currentTitle = title;
        }

        // Função para fechar detalhamento
        window.closeDetail = function() {
            document.getElementById('detail-view').classList.add('d-none');
            document.getElementById('processNav').classList.remove('d-none');
            document.querySelectorAll('.kpi-cards-row').forEach(row => row.classList.remove('d-none'));
            document.querySelectorAll('.kpi-charts-row').forEach(row => row.classList.remove('d-none'));
        };

        // Função para exportar Excel
        window.exportToExcel = function() {
            const wb = XLSX.utils.table_to_book(document.getElementById('detail-table'), {sheet: "Sheet1"});
            XLSX.writeFile(wb, `${window.currentKPI}_${window.currentCD}_${window.currentMonth}.xlsx`);
        };

        // Função para exportar PDF
        window.exportToPDF = function() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.text(window.currentTitle, 14, 15);
            doc.autoTable({
                html: '#detail-table',
                startY: 20,
                theme: 'striped',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185] }
            });
            doc.save(`${window.currentKPI}_${window.currentCD}_${window.currentMonth}.pdf`);
        };

        // Atualiza o subtítulo com o intervalo de datas do filtro
        function updateSubtitlePeriodo() {
            const dataIni = document.getElementById('dataIni').value;
            const dataFin = document.getElementById('dataFin').value;
            const el = document.getElementById('subtitlePeriodo');
            if (!el) return;
            if (dataIni && dataFin) {
                const fmt = (s) => {
                    const [y, m, d] = s.split('-');
                    return `${d}/${m}/${y}`;
                };
                el.textContent = 'Gerenciamento de Processos - ' + fmt(dataIni) + ' a ' + fmt(dataFin);
            } else {
                el.textContent = 'Gerenciamento de Processos';
            }
        }

        // Função para aplicar filtros e mostrar todos os gráficos por padrão
        async function applyFilters() {
            showLoading(true);
            
            try {
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);

                if (empresas.length === 0) {
                    alert('Selecione pelo menos uma empresa.');
                    showLoading(false);
                    return;
                }

                selectedPeriod = { start: dataIni, end: dataFin };
                selectedEmpresas = empresas;

                // Carregar dados de custo/faturamento (total)
                await carregarCustoFaturamento();
                
                // Carregar dados históricos mensais do Custo do CD
                await carregarCustoCDHistorico();

                // Tempo de Entrega: card (média dias), gráfico (evolução) e detalhes
                await carregarTempoEntrega();
                await carregarTempoEntregaHistorico();

                // Custo Entrega: card (média VLRFRETE), gráfico (evolução) e detalhes
                await carregarCustoEntrega();
                await carregarCustoEntregaHistorico();

                // Qualidade na Entrega: card (percentual conforme), gráfico (evolução) e detalhes
                await carregarQualidade();
                await carregarQualidadeHistorico();

                // Volume Realizado (Indústria): card (média PERC_REALIZADO %), gráfico (evolução) e detalhes
                await carregarVolumeRealizado();
                await carregarVolumeRealizadoHistorico();

                // Ocupação Produção (Indústria): card (média PARTICIPACAO_EFETIVO_DISPONIVEL %), gráfico (evolução) e detalhes
                await carregarOcupacaoProducao();
                await carregarOcupacaoProducaoHistorico();

                // Manutenções Preventivas (Manutenção): card (participação % PV), gráfico (evolução) e detalhes
                await carregarManutencaoPreventiva();
                await carregarManutencaoPreventivaHistorico();

                // Manutenções Corretivas (Manutenção): card (participação % CO), gráfico (evolução) e detalhes
                await carregarManutencaoCorretiva();
                await carregarManutencaoCorretivaHistorico();

                // Calcular meses no período
                const start = new Date(dataIni);
                const end = new Date(dataFin);
                const monthIndices = [];
                let current = new Date(start.getFullYear(), start.getMonth(), 1);
                while (current <= end) {
                    monthIndices.push(current.getMonth());
                    current.setMonth(current.getMonth() + 1);
                    if (current.getFullYear() > end.getFullYear()) break;
                }
                filteredIndices = [...new Set(monthIndices)].sort((a, b) => a - b);
                filteredLabels = filteredIndices.map(m => months[m]);

                console.log('Filtros aplicados:', { dataIni, dataFin, empresas, filteredLabels });
                console.log('Dados reais do Custo do CD:', custoCDRealData);

                updateSubtitlePeriodo();

                // Resetar seleções e mostrar todos para a aba ativa
                selectedKPIs.clear();
                const activeTabPane = document.querySelector('.tab-pane.show.active');
                if (activeTabPane) {
                    activeTabPane.querySelectorAll('.kpi-card').forEach(card => card.classList.remove('kpi-selected'));
                    const container = activeTabPane.querySelector('.kpi-charts-row');
                    if (container) {
                        showAllCharts(container);
                    }
                }
            } catch (error) {
                console.error('Erro ao aplicar filtros:', error);
                alert('Erro ao aplicar filtros: ' + error.message);
            } finally {
                showLoading(false);
            }
        }

        // Função para mostrar todos os gráficos
        function showAllCharts(container) {
            container.innerHTML = '';
            const tabPane = container.closest('.tab-pane');
            const tabId = tabPane.id;
            const kpis = tabToKpis[tabId] || [];
            kpis.forEach(kpi => {
                appendChart(container, kpi);
            });
        }

        // Função para obter dados para um KPI específico
        function getDataFor(kpi) {
            // Se for custoCD, usar dados reais do banco
            if (kpi === 'custoCD' && Object.keys(custoCDRealData).length > 0) {
                const datasets = selectedEmpresas.map((cd, idx) => {
                    const empresaData = custoCDRealData[cd] || new Array(12).fill(null);
                    const filteredData = filteredIndices.map(mesIndex => empresaData[mesIndex]);
                    return {
                        label: cd,
                        data: filteredData,
                        borderColor: colors[idx % colors.length],
                        backgroundColor: colors[idx % colors.length] + '33',
                        tension: 0.4,
                        fill: false
                    };
                });
                return { labels: filteredLabels, datasets };
            }
            // Se for tempoEntrega, usar dados reais do banco (evolução média dias_entrega)
            if (kpi === 'tempoEntrega' && Object.keys(tempoEntregaRealData).length > 0) {
                const datasets = selectedEmpresas.map((cd, idx) => {
                    const empresaData = tempoEntregaRealData[cd] || tempoEntregaRealData[String(cd)] || new Array(12).fill(null);
                    const filteredData = filteredIndices.map(mesIndex => empresaData[mesIndex]);
                    return {
                        label: cd,
                        data: filteredData,
                        borderColor: colors[idx % colors.length],
                        backgroundColor: colors[idx % colors.length] + '33',
                        tension: 0.4,
                        fill: false
                    };
                });
                return { labels: filteredLabels, datasets };
            }
            // Se for custoEntrega, usar dados reais do banco (evolução média VLRFRETE)
            if (kpi === 'custoEntrega' && Object.keys(custoEntregaRealData).length > 0) {
                const datasets = selectedEmpresas.map((cd, idx) => {
                    const empresaData = custoEntregaRealData[cd] || custoEntregaRealData[String(cd)] || new Array(12).fill(null);
                    const filteredData = filteredIndices.map(mesIndex => empresaData[mesIndex]);
                    return {
                        label: cd,
                        data: filteredData,
                        borderColor: colors[idx % colors.length],
                        backgroundColor: colors[idx % colors.length] + '33',
                        tension: 0.4,
                        fill: false
                    };
                });
                return { labels: filteredLabels, datasets };
            }
            // Se for qualidade, usar dados reais do banco (evolução percentual AD_FEEDBACK = 1)
            if (kpi === 'qualidade' && Object.keys(qualidadeRealData).length > 0) {
                const datasets = selectedEmpresas.map((cd, idx) => {
                    const empresaData = qualidadeRealData[cd] || qualidadeRealData[String(cd)] || new Array(12).fill(null);
                    const filteredData = filteredIndices.map(mesIndex => empresaData[mesIndex]);
                    return {
                        label: cd,
                        data: filteredData,
                        borderColor: colors[idx % colors.length],
                        backgroundColor: colors[idx % colors.length] + '33',
                        tension: 0.4,
                        fill: false
                    };
                });
                return { labels: filteredLabels, datasets };
            }
            // Se for volumeRealizado, usar dados reais do banco (evolução média PERC_REALIZADO por mês)
            if (kpi === 'volumeRealizado' && volumeRealizadoRealData && volumeRealizadoRealData.length > 0) {
                const filteredData = filteredIndices.map(mesIndex => volumeRealizadoRealData[mesIndex] ?? null);
                const hasAny = filteredData.some(v => v != null && !isNaN(v));
                if (hasAny) {
                    return {
                        labels: filteredLabels,
                        datasets: [{
                            label: 'Volume Realizado (%)',
                            data: filteredData,
                            borderColor: colors[0],
                            backgroundColor: colors[0] + '33',
                            tension: 0.4,
                            fill: false
                        }]
                    };
                }
            }
            // Se for ocupacaoProducao, usar dados reais do banco (evolução PARTICIPACAO_EFETIVO_DISPONIVEL por mês)
            if (kpi === 'ocupacaoProducao' && ocupacaoProducaoRealData && ocupacaoProducaoRealData.length > 0) {
                const filteredData = filteredIndices.map(mesIndex => ocupacaoProducaoRealData[mesIndex] ?? null);
                const hasAny = filteredData.some(v => v != null && !isNaN(v));
                if (hasAny) {
                    return {
                        labels: filteredLabels,
                        datasets: [{
                            label: 'Ocupação Produção (%)',
                            data: filteredData,
                            borderColor: colors[0],
                            backgroundColor: colors[0] + '33',
                            tension: 0.4,
                            fill: false
                        }]
                    };
                }
            }
            // Se for manutencaoPreventiva, usar dados reais do banco (evolução participação % PV por mês)
            if (kpi === 'manutencaoPreventiva' && manutencaoPreventivaRealData && manutencaoPreventivaRealData.length > 0) {
                const filteredData = filteredIndices.map(mesIndex => manutencaoPreventivaRealData[mesIndex] ?? null);
                const hasAny = filteredData.some(v => v != null && !isNaN(v));
                if (hasAny) {
                    return {
                        labels: filteredLabels,
                        datasets: [{
                            label: 'Participação Preventivas (%)',
                            data: filteredData,
                            borderColor: colors[0],
                            backgroundColor: colors[0] + '33',
                            tension: 0.4,
                            fill: false
                        }]
                    };
                }
            }
            // Se for manutencaoCorretiva, usar dados reais do banco (evolução participação % CO por mês)
            if (kpi === 'manutencaoCorretiva' && manutencaoCorretivaRealData && manutencaoCorretivaRealData.length > 0) {
                const filteredData = filteredIndices.map(mesIndex => manutencaoCorretivaRealData[mesIndex] ?? null);
                const hasAny = filteredData.some(v => v != null && !isNaN(v));
                if (hasAny) {
                    return {
                        labels: filteredLabels,
                        datasets: [{
                            label: 'Manutenções Corretivas (%)',
                            data: filteredData,
                            borderColor: colors[0],
                            backgroundColor: colors[0] + '33',
                            tension: 0.4,
                            fill: false
                        }]
                    };
                }
            }
            // Para outros KPIs, usar dados mockados
            const dataByCD = dataMap[kpi];
            const datasets = selectedEmpresas.map((cd, idx) => ({
                label: cd,
                data: (dataByCD[cd] || []).filter((_, i) => filteredIndices.includes(i)),
                borderColor: colors[idx % colors.length],
                backgroundColor: colors[idx % colors.length] + '33',
                tension: 0.4,
                fill: false
            }));
            return { labels: filteredLabels, datasets };
        }

        // Função para criar canvas único para cada gráfico
        let chartCounter = 0;
        function createCanvasId(kpi) {
            return `lineChart_${kpi}_${++chartCounter}`;
        }

        // Função para adicionar um gráfico ao container
        function appendChart(container, kpi) {
            const data = getDataFor(kpi);
            if (data.datasets.length === 0 || data.labels.length === 0) return;

            const numSelected = selectedKPIs.size || (tabToKpis[container.closest('.tab-pane').id] || []).length;
            const colClass = numSelected === 1 ? 'col-12' : numSelected === 2 ? 'col-md-6' : numSelected === 3 ? 'col-md-4' : 'col-md-3';

            const col = document.createElement('div');
            col.className = colClass;
            col.innerHTML = `
                <div class="detail-chart">
                    <h6>${kpiTitles[kpi]}</h6>
                    <div class="chart-container" style="height: 300px;">
                        <canvas id="${createCanvasId(kpi)}"></canvas>
                    </div>
                </div>
            `;
            container.appendChild(col);

            const canvasId = col.querySelector('canvas').id;
            if (!window.charts) window.charts = {};
            window.charts[canvasId] = createLineChart(canvasId, data, kpi);
        }

        // Função para recriar os gráficos baseados nos selecionados
        function renderSelectedCharts(container) {
            container.innerHTML = '';

            // Destruir gráficos antigos
            Object.keys(window.charts || {}).forEach(id => {
                if (id.startsWith('lineChart_')) {
                    window.charts[id].destroy();
                    delete window.charts[id];
                }
            });

            if (selectedKPIs.size === 0) {
                showAllCharts(container);
                return;
            }

            selectedKPIs.forEach(kpi => {
                appendChart(container, kpi);
            });
        }

        // Função para criar gráfico de linha
        function createLineChart(canvasId, chartData, kpi) {
            const ctx = document.getElementById(canvasId).getContext('2d');
            const beginAtZero = kpi !== 'qualidade' && kpi !== 'formulacao' && kpi !== 'envase' && kpi !== 'volumeRealizado' && kpi !== 'ocupacaoProducao' && kpi !== 'manutencaoPreventiva' && kpi !== 'manutencaoCorretiva' && kpi !== 'planejadoRealizado' && kpi !== 'custoCD';
            const suggestedMax = (kpi === 'qualidade' || kpi === 'formulacao' || kpi === 'envase' || kpi === 'volumeRealizado' || kpi === 'ocupacaoProducao' || kpi === 'manutencaoPreventiva' || kpi === 'manutencaoCorretiva' || kpi === 'planejadoRealizado' || kpi === 'custoCD') ? 100 : undefined;
            const tooltipCustoCD = kpi === 'custoCD' ? {
                callbacks: {
                    label: function(context) {
                        const v = context.parsed.y;
                        if (v === null || v === undefined) return 'Sem dados';
                        return context.dataset.label + ': ' + v.toFixed(2) + '%';
                    }
                }
            } : {};
            const tooltipTempoEntrega = kpi === 'tempoEntrega' ? {
                callbacks: {
                    label: function(context) {
                        const v = context.parsed.y;
                        if (v === null || v === undefined) return 'Sem dados';
                        return context.dataset.label + ': ' + Number(v).toFixed(1) + ' dias';
                    }
                }
            } : {};
            const tooltipCustoEntrega = kpi === 'custoEntrega' ? {
                callbacks: {
                    label: function(context) {
                        const v = context.parsed.y;
                        if (v === null || v === undefined) return 'Sem dados';
                        return context.dataset.label + ': ' + formatCurrency(v);
                    }
                }
            } : {};
            const tooltipQualidade = kpi === 'qualidade' ? {
                callbacks: {
                    label: function(context) {
                        const v = context.parsed.y;
                        if (v === null || v === undefined) return 'Sem dados';
                        return context.dataset.label + ': ' + Number(v).toFixed(2) + '%';
                    }
                }
            } : {};
            const tooltipVolumeRealizado = kpi === 'volumeRealizado' ? {
                callbacks: {
                    label: function(context) {
                        const v = context.parsed.y;
                        if (v === null || v === undefined) return 'Sem dados';
                        return context.dataset.label + ': ' + Number(v).toFixed(2) + '%';
                    }
                }
            } : {};
            const tooltipOcupacaoProducao = kpi === 'ocupacaoProducao' ? {
                callbacks: {
                    label: function(context) {
                        const v = context.parsed.y;
                        if (v === null || v === undefined) return 'Sem dados';
                        return context.dataset.label + ': ' + Number(v).toFixed(2) + '%';
                    }
                }
            } : {};
            const tooltipManutencaoPreventiva = kpi === 'manutencaoPreventiva' ? {
                callbacks: {
                    label: function(context) {
                        const v = context.parsed.y;
                        if (v === null || v === undefined) return 'Sem dados';
                        return context.dataset.label + ': ' + Number(v).toFixed(2) + '%';
                    }
                }
            } : {};
            const tooltipManutencaoCorretiva = kpi === 'manutencaoCorretiva' ? {
                callbacks: {
                    label: function(context) {
                        const v = context.parsed.y;
                        if (v === null || v === undefined) return 'Sem dados';
                        return context.dataset.label + ': ' + Number(v).toFixed(2) + '%';
                    }
                }
            } : {};
            return new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { intersect: false },
                        scales: {
                        y: {
                            beginAtZero: kpi === 'custoCD' || kpi === 'tempoEntrega' || kpi === 'custoEntrega' || kpi === 'qualidade' || kpi === 'volumeRealizado' || kpi === 'ocupacaoProducao' || kpi === 'manutencaoPreventiva' || kpi === 'manutencaoCorretiva',
                            ...(suggestedMax && { max: suggestedMax }),
                            ...(kpi === 'custoCD' && {
                                ticks: { callback: function(v) { return v.toFixed(2) + '%'; } }
                            }),
                            ...(kpi === 'tempoEntrega' && {
                                ticks: { callback: function(v) { return v + ' dias'; } }
                            }),
                            ...(kpi === 'custoEntrega' && {
                                ticks: { callback: function(v) { return formatCurrency(v); } }
                            }),
                            ...(kpi === 'qualidade' && {
                                ticks: { callback: function(v) { return v.toFixed(2) + '%'; } }
                            }),
                            ...(kpi === 'volumeRealizado' && {
                                ticks: { callback: function(v) { return v != null ? v.toFixed(2) + '%' : ''; } }
                            }),
                            ...(kpi === 'ocupacaoProducao' && {
                                ticks: { callback: function(v) { return v != null ? v.toFixed(2) + '%' : ''; } }
                            }),
                            ...(kpi === 'manutencaoPreventiva' && {
                                ticks: { callback: function(v) { return v != null ? v.toFixed(2) + '%' : ''; } }
                            }),
                            ...(kpi === 'manutencaoCorretiva' && {
                                ticks: { callback: function(v) { return v != null ? v.toFixed(2) + '%' : ''; } }
                            })
                        }
                    },
                    plugins: {
                        legend: { display: true },
                        tooltip: { ...tooltipCustoCD, ...tooltipTempoEntrega, ...tooltipCustoEntrega, ...tooltipQualidade, ...tooltipVolumeRealizado, ...tooltipOcupacaoProducao, ...tooltipManutencaoPreventiva, ...tooltipManutencaoCorretiva }
                    },
                    onClick: function(event, elements) {
                        if (elements.length > 0) {
                            const el = elements[0];
                            const cd = chartData.datasets[el.datasetIndex].label;
                            const month = chartData.labels[el.index];
                            const value = chartData.datasets[el.datasetIndex].data[el.index];
                            showDetails(kpi, cd, month, value);
                        }
                    }
                }
            });
        }

        // Inicializar seleções
        document.addEventListener('DOMContentLoaded', async function() {
            updateSubtitlePeriodo();
            // Carregar empresas do banco
            await carregarEmpresas();
            
            // Aplicar filtros iniciais
            await applyFilters();

            // Listeners para os cards de KPIs
            document.querySelectorAll('.tab-content .kpi-card[data-kpi]').forEach(card => {
                card.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const kpi = this.dataset.kpi;
                    const tabPane = this.closest('.tab-pane');
                    const container = tabPane.querySelector('.kpi-charts-row');
                    if (selectedKPIs.has(kpi)) {
                        // Deselecionar: remover e, se vazio, mostrar todos
                        selectedKPIs.delete(kpi);
                        this.classList.remove('kpi-selected');
                    } else {
                        // Maximizar só este: limpar outros da aba e selecionar somente o clicado
                        selectedKPIs.clear();
                        tabPane.querySelectorAll('.kpi-card[data-kpi]').forEach(c => c.classList.remove('kpi-selected'));
                        selectedKPIs.add(kpi);
                        this.classList.add('kpi-selected');
                    }
                    renderSelectedCharts(container);
                });
            });

            // Listeners para mudança de aba
            document.querySelectorAll('#processNav .nav-link').forEach(tab => {
                tab.addEventListener('shown.bs.tab', function (e) {
                    const tabId = e.target.getAttribute('href').substring(1);
                    const tabPane = document.getElementById(tabId);
                    const container = tabPane.querySelector('.kpi-charts-row');
                    if (container) {
                        selectedKPIs.clear();
                        tabPane.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('kpi-selected'));
                        showAllCharts(container);
                    }
                });
            });
        });

        // Ativação de tabs
        var triggerTabList = [].slice.call(document.querySelectorAll('#processNav a'));
        triggerTabList.forEach(function (triggerEl) {
            var tabTrigger = new bootstrap.Tab(triggerEl);
            triggerEl.addEventListener('click', function (event) {
                event.preventDefault();
                tabTrigger.show();
            });
        });
    </script>
</body>
</html>
