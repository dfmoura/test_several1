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
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <style>
        :root {
            --app-teal: #008a70;
            --app-teal-dark: #00695e;
            --app-teal-light: #00afa0;
            --app-accent-blue: #0d6efd;
            --app-surface: #eef1f4;
            --app-card: #ffffff;
            --app-border: #e2e8f0;
            --app-text: #1a2332;
            --app-muted: #64748b;
            --header-h: 38px;
        }

        body {
            margin: 0;
            padding: 0;
            padding-top: var(--header-h) !important;
            background: linear-gradient(165deg, var(--app-surface) 0%, #f8fafc 45%, #eef1f4 100%);
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            color: var(--app-text);
            min-height: 100vh;
        }

        /* Header fixo — alinhado ao padrão AnaliseGeoGerencial64 */
        .fixed-header {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: var(--header-h);
            background: linear-gradient(135deg, var(--app-teal), var(--app-teal-dark));
            box-shadow: 0 2px 16px rgba(0, 105, 94, 0.28);
            z-index: 1100;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 20px;
        }
        .header-logo {
            position: absolute;
            left: 16px;
            display: flex;
            align-items: center;
        }
        .header-logo img {
            width: 22px;
            height: auto;
            filter: brightness(0) invert(1);
            transition: transform 0.25s ease;
        }
        .header-logo img:hover { transform: scale(1.08); }
        .header-title {
            color: #fff;
            font-size: 0.95rem;
            font-weight: 700;
            margin: 0;
            text-align: center;
            letter-spacing: 0.06em;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        }

        /* Sidebar filtros */
        .sidebar {
            background: var(--app-card);
            border-right: 1px solid var(--app-border);
            height: calc(100vh - var(--header-h));
            position: fixed;
            left: 0;
            top: var(--header-h);
            z-index: 1040;
            width: 300px;
            transition: transform 0.3s ease-in-out;
            box-shadow: 4px 0 20px rgba(15, 23, 42, 0.06);
            overflow-y: auto;
        }
        .sidebar.hidden { transform: translateX(-100%); }
        .sidebar-inner { padding: 1.25rem; }
        .sidebar-brand {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 700;
            font-size: 1rem;
            color: var(--app-teal);
            margin-bottom: 1rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid var(--app-border);
        }
        .sidebar .card {
            border: 1px solid var(--app-border);
            border-radius: 12px;
            box-shadow: none;
            background: #fafbfc;
        }
        .sidebar .form-label {
            font-weight: 600;
            font-size: 0.8rem;
            color: var(--app-muted);
            margin-bottom: 0.35rem;
        }
        .sidebar select[multiple] { height: 150px; border-radius: 8px; }
        .sidebar .btn-primary {
            background: linear-gradient(135deg, var(--app-teal-light), var(--app-teal));
            border: none;
            font-weight: 600;
            border-radius: 8px;
            padding: 0.55rem;
        }
        .sidebar .btn-primary:hover {
            background: linear-gradient(135deg, var(--app-teal), var(--app-teal-dark));
        }

        .main-content {
            margin-left: 300px;
            padding: 1rem 1rem 2.5rem;
            transition: margin-left 0.3s ease-in-out;
            min-height: calc(100vh - var(--header-h));
        }
        .main-content.expanded { margin-left: 0; }

        .filter-toggle-btn {
            position: fixed;
            top: calc(var(--header-h) + 10px);
            left: 12px;
            z-index: 1050;
            width: 44px;
            height: 44px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--app-teal-light), var(--app-teal));
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(0, 138, 112, 0.35);
            transition: transform 0.2s ease, box-shadow 0.2s ease, left 0.3s ease;
        }
        .filter-toggle-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(0, 138, 112, 0.45);
        }
        .filter-toggle-btn.sidebar-visible { left: 312px; }

        @media (max-width: 768px) {
            .sidebar { display: none; }
            .main-content { margin-left: 0; padding: 0.75rem; }
            .filter-toggle-btn { display: none; }
        }

        /* Intro da página */
        .page-hero {
            border-radius: 14px;
            border: 1px solid var(--app-border);
            background: var(--app-card);
            box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
        }
        .page-title {
            font-size: 1.45rem;
            font-weight: 800;
            color: var(--app-text);
            letter-spacing: -0.02em;
        }
        .hero-hint {
            font-size: 0.875rem;
            color: var(--app-muted);
            line-height: 1.5;
        }
        .hero-hint i { color: var(--app-teal); }

        /* Painel de abas */
        .tabs-panel {
            border-radius: 14px;
            border: 1px solid var(--app-border);
            background: var(--app-card);
            box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
            overflow: hidden;
        }
        .tabs-panel .nav-process {
            padding: 0.6rem 0.75rem 0;
            gap: 0.25rem;
            background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
            border-bottom: 1px solid var(--app-border);
        }
        .tabs-panel .nav-process .nav-link {
            color: var(--app-muted);
            font-weight: 600;
            font-size: 0.9rem;
            border-radius: 10px 10px 0 0;
            padding: 0.65rem 1.1rem;
            border: 1px solid transparent;
            transition: color 0.2s, background 0.2s;
        }
        .tabs-panel .nav-process .nav-link:hover {
            color: var(--app-teal);
            background: rgba(0, 138, 112, 0.06);
        }
        .tabs-panel .nav-process .nav-link.active {
            color: var(--app-teal);
            background: #fff;
            border-color: var(--app-border);
            border-bottom-color: #fff;
            margin-bottom: -1px;
        }
        .tab-content-inner { padding: 1.25rem 1.35rem 1.5rem; }

        /* Cabeçalhos de seção */
        .section-heading {
            border: 1px solid var(--app-border);
            border-left: 4px solid var(--app-teal-light);
            border-radius: 12px;
            padding: 1rem 1.2rem;
            margin-bottom: 1.25rem;
            background: linear-gradient(90deg, rgba(0, 175, 160, 0.06) 0%, #fff 40%);
        }
        .section-heading h3 {
            margin: 0 0 0.25rem 0;
            font-size: 1.12rem;
            font-weight: 700;
            color: var(--app-text);
        }
        .section-heading.section-industria { border-left-color: #f59e0b; background: linear-gradient(90deg, rgba(245, 158, 11, 0.08) 0%, #fff 45%); }
        .section-heading.section-manutencao { border-left-color: #94a3b8; background: linear-gradient(90deg, rgba(148, 163, 184, 0.12) 0%, #fff 45%); }
        .section-heading--compact {
            padding: 0.7rem 1rem;
            margin-bottom: 1rem;
        }
        .section-heading--compact h3 { margin-bottom: 0 !important; }

        /* KPIs */
        .process-card {
            border-left: 3px solid var(--app-teal-light);
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .process-card:hover { transform: translateY(-3px); }
        .kpi-card {
            border: 1px solid var(--app-border);
            border-radius: 12px;
            background: var(--app-card);
            box-shadow: 0 2px 12px rgba(15, 23, 42, 0.05);
            margin-bottom: 15px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .kpi-card:hover { box-shadow: 0 10px 28px rgba(0, 138, 112, 0.12); }
        .card-clickable { cursor: pointer; }
        .kpi-card .card-title {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--app-text);
        }
        .indicator-value { font-size: 1.55rem; font-weight: 800; letter-spacing: -0.02em; }
        .positive { color: #0d9488; }
        .warning { color: #d97706; }
        .negative { color: #dc2626; }
        .progress { height: 8px; margin-top: 8px; border-radius: 6px; overflow: hidden; }
        .chart-container { position: relative; height: 400px; width: 100%; margin-top: 16px; }

        .card-overlay {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.2s; pointer-events: none;
            border-radius: 12px;
            background: rgba(255,255,255,0.65);
        }
        .kpi-card:hover .card-overlay { opacity: 1; }
        .card-overlay i { font-size: 2rem; color: var(--app-teal); }
        .kpi-card.card-hover-chart { position: relative; }
        .kpi-card.card-hover-chart .card-overlay-chart { background: transparent; }
        .kpi-card.card-hover-chart .card-overlay-chart i { font-size: 1.25rem; color: rgba(0,0,0,0.2); }
        .kpi-card.card-hover-chart:hover .card-overlay-chart i { color: rgba(245, 158, 11, 0.65); }

        .kpi-selected {
            border-color: var(--app-teal) !important;
            box-shadow: 0 0 0 3px rgba(0, 175, 160, 0.25) !important;
        }
        .detail-chart { margin-bottom: 20px; }
        .detail-chart h6 { color: var(--app-teal); font-weight: 700; }

        #detail-view {
            min-height: calc(100vh - 220px);
            padding: 12px 0 24px;
        }
        #detail-view:not(.d-none) {
            background: var(--app-card);
            border: 1px solid var(--app-border);
            border-radius: 14px;
            padding: 1.25rem;
            box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
        }

        /* Mesma grelha que os cards: gráficos ficam na coluna certa (evitar col-md-4 vs col-lg-3) */
        .kpi-cards-row,
        .kpi-charts-row {
            margin-bottom: 1.25rem;
            --bs-gutter-x: 1rem;
            --bs-gutter-y: 1rem;
        }
        .kpi-charts-row { margin-top: 0; }
        .tab-pane .kpi-charts-row { align-items: flex-start; }

        .loading-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(248, 250, 252, 0.92);
            backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: 12000;
        }
        .loading-spinner {
            border: 3px solid #e2e8f0;
            border-top: 3px solid var(--app-teal);
            border-radius: 50%;
            width: 48px;
            height: 48px;
            animation: spin 0.9s linear infinite;
        }
        .loading-overlay p { color: var(--app-muted); font-weight: 500; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>

     <snk:load/>
</head>
<body>

    <!-- Cabeçalho fixo (padrão Analise Geo-Gerencial) -->
    <div class="fixed-header">
        <div class="header-logo">
            <a href="https://neuon.com.br/" target="_blank" rel="noopener noreferrer" title="Neuon">
                <img src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg" alt="Neuon" />
            </a>
        </div>
        <h1 class="header-title">Painel Indicadores Industriais</h1>
    </div>

    <!-- Botão para mostrar/esconder filtros -->
    <button type="button" class="filter-toggle-btn" id="filterToggleBtn" onclick="toggleFilters()" title="Mostrar ou ocultar painel de filtros" aria-label="Alternar filtros">
        <i class="bi bi-funnel" id="filterToggleIcon" aria-hidden="true"></i>
    </button>

    <!-- Painel lateral de filtros -->
    <div class="sidebar" id="sidebarFilters">
        <div class="sidebar-inner">
            <div class="sidebar-brand">
                <i class="bi bi-sliders" aria-hidden="true"></i>
                <span>Filtros do painel</span>
            </div>
            <div class="card">
                <div class="card-body p-3">
                    <p class="small text-muted mb-3 mb-md-4">Defina o <strong>período</strong> e as <strong>empresas (CDs)</strong>. Depois clique em <strong>Aplicar filtros</strong> para atualizar todos os indicadores e gráficos.</p>
                    <div class="mb-3">
                        <label for="dataIni" class="form-label">Data inicial</label>
                        <input type="date" class="form-control form-control-sm" id="dataIni">
                    </div>
                    <div class="mb-3">
                        <label for="dataFin" class="form-label">Data final</label>
                        <input type="date" class="form-control form-control-sm" id="dataFin">
                    </div>
                    <div class="mb-3">
                        <label for="empresas" class="form-label">Empresas (CDs)</label>
                        <select multiple class="form-control form-control-sm" id="empresas" size="6" aria-describedby="hintEmpresas"></select>
                        <small id="hintEmpresas" class="text-muted d-block mt-1">Múltipla seleção: Ctrl+clique (Windows) ou ⌘+clique (Mac).</small>
                    </div>
                    <button type="button" class="btn btn-primary w-100" onclick="applyFilters()">
                        <i class="bi bi-check2-circle me-1"></i>Aplicar filtros
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Loading -->
    <div id="loadingOverlay" class="loading-overlay" style="display: none;" role="status" aria-live="polite">
        <div class="text-center">
            <div class="loading-spinner"></div>
            <p class="mt-3 mb-0">Carregando dados…</p>
        </div>
    </div>

    <!-- Conteúdo principal -->
    <div class="main-content" id="mainContent">
        <div class="container-fluid px-2 px-md-3 py-3 py-md-4">

            <div class="page-hero card border-0 mb-4">
                <div class="card-body p-3 p-md-4">
                    <div class="row align-items-start g-3">
                        <div class="col-lg-8">
                            <h2 class="page-title mb-2">Indicadores operacionais</h2>
                            <p class="text-muted mb-2 mb-md-3" id="subtitlePeriodo">Gerenciamento de processos</p>
                            <p class="hero-hint mb-0">
                                <i class="bi bi-lightbulb me-1"></i>
                                Use o botão <strong class="text-dark">funil</strong> à esquerda para abrir os filtros. Em cada aba, clique em um <strong class="text-dark">cartão de indicador</strong> para destacar e ampliar os gráficos correspondentes.
                            </p>
                        </div>
                        <div class="col-lg-4">
                            <div class="rounded-3 border bg-light p-3 h-100">
                                <div class="d-flex align-items-center gap-2 mb-2">
                                    <i class="bi bi-diagram-3 text-secondary"></i>
                                    <span class="small fw-semibold text-secondary text-uppercase" style="letter-spacing:.06em;">Áreas</span>
                                </div>
                                <ul class="small text-muted mb-0 ps-3" style="line-height:1.65;">
                                    <li><strong class="text-dark">Gerir entregas</strong> — qualidade, custo e prazo de entrega</li>
                                    <li><strong class="text-dark">Indústria</strong> — formulação, volume e ocupação</li>
                                    <li><strong class="text-dark">Manutenção</strong> — preventiva e corretiva</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tabs-panel mb-4">
                <ul class="nav nav-pills nav-process flex-nowrap flex-md-wrap overflow-auto" id="processNav" role="tablist">
                    <li class="nav-item" role="presentation">
                        <a class="nav-link active" href="#gerir-entregas" data-bs-toggle="pill" role="tab" aria-selected="true" aria-controls="gerir-entregas">Gerir entregas</a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" href="#industria" data-bs-toggle="pill" role="tab" aria-selected="false" aria-controls="industria">Indústria</a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" href="#manutencao" data-bs-toggle="pill" role="tab" aria-selected="false" aria-controls="manutencao">Manutenção</a>
                    </li>
                </ul>

                <div class="tab-content-inner">
            <div class="tab-content">
                <!-- Gerir entregas -->
                <div class="tab-pane fade show active" id="gerir-entregas" role="tabpanel">
                    <div class="section-heading section-heading--compact">
                        <h3 class="mb-0"><i class="bi bi-truck me-2 text-success"></i>Gerir entregas</h3>
                    </div>

                    <!-- Cards de Indicadores -->
                    <div class="row g-3 mb-4 kpi-cards-row" id="kpi-cards">
                        <div class="col-lg-3 col-md-6">
                            <div class="card kpi-card card-clickable" data-kpi="qualidade" id="cardQualidade">
                                <div class="card-overlay">
                                    <i class="bi bi-graph-up"></i>
                                </div>
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-check-circle text-success me-2"></i>Qualidade na entrega</h5>
                                    <p class="indicator-name mb-2">Feedbacks "conforme"/Pedidos</p>
                                    <div class="indicator-value positive" id="qualidadeValue">-</div>
                                    <div class="progress">
                                        <div class="progress-bar bg-success" id="qualidadeProgress" style="width: 0%"></div>
                                    </div>
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
                                    <p class="indicator-name mb-2">(TOP 232 + TOP 233) / TOP 1101</p>
                                    <div class="indicator-value warning" id="custoEntregaValue">-</div>
                                    <div class="progress">
                                        <div class="progress-bar bg-warning" id="custoEntregaProgress" style="width: 0%"></div>
                                    </div>
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
                                    <p class="indicator-name mb-2">Pedidos <= 0 / total pedidos</p>
                                    <div class="indicator-value positive" id="tempoEntregaValue">-</div>
                                    <div class="progress">
                                        <div class="progress-bar bg-info" id="tempoEntregaProgress" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Gráficos (mesmas colunas que os cards acima) -->
                    <div class="row g-3 mb-4 kpi-charts-row"></div>

                </div>

                <!-- Indústria -->
                <div class="tab-pane fade" id="industria" role="tabpanel">
                    <div class="section-heading section-industria section-heading--compact">
                        <h3 class="mb-0"><i class="bi bi-factory me-2 text-warning"></i>Indústria</h3>
                    </div>
                    <div class="row g-3 mb-4 kpi-cards-row">
                        <div class="col-lg-3 col-md-6">
                            <div class="card kpi-card process-card card-clickable" data-kpi="formulacao">
                                <div class="card-body">
                                    <h5><i class="bi bi-flask text-success me-2"></i>Qualidade de Formulação</h5>
                                    <div class="indicator-value positive">99.2%</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-6">
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
                        <div class="col-lg-3 col-md-6">
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
                    <div class="row g-3 mb-4 kpi-charts-row"></div>
                </div>

                <!-- Manutenção -->
                <div class="tab-pane fade" id="manutencao" role="tabpanel">
                    <div class="section-heading section-manutencao section-heading--compact">
                        <h3 class="mb-0"><i class="bi bi-tools me-2 text-secondary"></i>Manutenção</h3>
                    </div>
                    <div class="row g-3 mb-4 kpi-cards-row">
                        <div class="col-lg-6 col-md-6">
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
                        <div class="col-lg-6 col-md-6">
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
                    </div>
                    <div class="row g-3 mb-4 kpi-charts-row"></div>
                </div>
            </div>
                </div><!-- /.tab-content-inner -->
            </div><!-- /.tabs-panel -->

            <!-- Detalhamento (compartilhado entre abas; export Excel/PDF) -->
            <div id="detail-view" class="row mb-4 d-none"></div>

        </div><!-- /.container-fluid -->
    </div><!-- /#mainContent -->

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

        // Variável global: evolução mensal % pedidos no prazo (COUNT no prazo / COUNT NUNOTA), índice 0–11
        let tempoEntregaRealData = [];

        // Variável global: evolução mensal % (TOP232+233)/TOP1101 — índice 0-11 (série consolidada no período)
        let custoEntregaRealData = new Array(12).fill(null);

        // Variável global: evolução mensal do % (SUM(AD_FEEDBACK)/COUNT(NUNOTA)) em TGFCAB — índice 0-11 (série consolidada)
        let qualidadeRealData = [];

        // Variável global para evolução do Volume Realizado (% volume produzido / previsto por mês, índice 0-11)
        let volumeRealizadoRealData = [];

        // Variável global para evolução da Ocupação Produção (% volume / 290.000 por mês, índice 0-11)
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

        /** Define dataIni/dataFin como primeiro e último dia do mês corrente (YYYY-MM-DD). */
        function aplicarDatasMesAtual() {
            const now = new Date();
            const y = now.getFullYear();
            const m = now.getMonth();
            const pad = function(n) { return String(n).padStart(2, '0'); };
            const ini = y + '-' + pad(m + 1) + '-01';
            const ultimoDia = new Date(y, m + 1, 0).getDate();
            const fin = y + '-' + pad(m + 1) + '-' + pad(ultimoDia);
            var elIni = document.getElementById('dataIni');
            var elFin = document.getElementById('dataFin');
            if (elIni) elIni.value = ini;
            if (elFin) elFin.value = fin;
        }

        // Função para carregar empresas do banco
        async function carregarEmpresas() {
            try {
                if (typeof JX === "undefined" || !JX.consultar) {
                    console.error("SankhyaJX não está disponível");
                    return;
                }

                selectedEmpresas = [];
                const sql = "SELECT CODEMP, NOMEFANTASIA FROM TSIEMP ORDER BY NOMEFANTASIA";
                const result = await JX.consultar(sql);
                
                const empresasSelect = document.getElementById('empresas');
                empresasSelect.innerHTML = '';

                if (result && result.length > 0) {
                    result.forEach((empresa) => {
                        const option = document.createElement('option');
                        option.value = empresa.CODEMP || empresa.codemp;
                        option.textContent = `${empresa.CODEMP || empresa.codemp} - ${empresa.NOMEFANTASIA || empresa.nomefantasia || ''}`;
                        var cod = String(empresa.CODEMP != null ? empresa.CODEMP : empresa.codemp);
                        if (cod === '1') {
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

        /**
         * SankhyaJX.consultar monta o corpo com JSON.parse em string template (jx.js), o que quebra
         * se o SQL contiver aspas duplas ou certas sequências. DbExplorer via JX.post + JSON.stringify
         * (padrão industria26 — Custo Entrega TOP 232/233/1101).
         */
        function parseDbExplorerRows(resposta) {
            const arrayResultado = [];
            if (resposta == null) return arrayResultado;
            let dados;
            try {
                dados = typeof resposta === 'string' ? JSON.parse(resposta) : resposta;
            } catch (e) {
                console.warn('Resposta DbExplorer não é JSON:', e);
                return arrayResultado;
            }
            if (dados.data) dados = dados.data.responseBody;
            else if (dados.responseBody) dados = dados.responseBody;
            if (!dados) return arrayResultado;
            if (dados.statusMessage && String(dados.statusMessage).toLowerCase().indexOf('error') !== -1) {
                console.warn('DbExplorerSP:', dados.statusMessage);
            }
            const nomes = dados.fieldsMetadata || [];
            const valores = dados.rows || [];
            if (!valores.length) return arrayResultado;
            valores.forEach(function(v) {
                const obj = {};
                nomes.forEach(function(n, i) {
                    if (n && n.name != null) obj[n.name] = v[i];
                });
                arrayResultado.push(obj);
            });
            return arrayResultado;
        }

        async function consultarSql(sql) {
            try {
                if (typeof JX === 'undefined' || !JX.post) {
                    console.error('SankhyaJX (JX.post) indisponível');
                    return [];
                }
                const sqlLinha = String(sql).replace(/(\r\n|\n|\r)/gm, ' ');
                const url = window.location.origin + '/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';
                const corpo = {
                    serviceName: 'DbExplorerSP.executeQuery',
                    requestBody: { sql: sqlLinha }
                };
                const resposta = await JX.post(url, corpo, { headers: { 'Content-Type': 'application/json; charset=UTF-8' } });
                return parseDbExplorerRows(resposta);
            } catch (e) {
                console.error('consultarSql:', e);
                return [];
            }
        }

        async function aguardarJX(timeoutMs) {
            const lim = timeoutMs || 8000;
            const t0 = Date.now();
            while (Date.now() - t0 < lim) {
                if (typeof JX !== 'undefined' && JX.post) return true;
                await new Promise(function(r) { setTimeout(r, 80); });
            }
            return false;
        }

        function primeiroValorNumerico(row, nomesPreferidos) {
            if (!row || typeof row !== 'object') return null;
            for (let i = 0; i < nomesPreferidos.length; i++) {
                const k = nomesPreferidos[i];
                if (row[k] !== undefined && row[k] !== null && row[k] !== '') {
                    const n = parseFloat(String(row[k]).replace(',', '.'));
                    if (!isNaN(n)) return n;
                }
            }
            const keys = Object.keys(row);
            for (let j = 0; j < keys.length; j++) {
                const kk = keys[j];
                if (/^perc$/i.test(kk)) {
                    const n = parseFloat(String(row[kk]).replace(',', '.'));
                    if (!isNaN(n)) return n;
                }
            }
            return null;
        }

        // Tempo de entrega (TGFCAB): % = COUNT(efetiva − prevista ≤ 0) / COUNT(NUNOTA); mesmos filtros de Qualidade na Entrega
        function sqlTempoEntregaPrazoCard(dtInicial, dtFinal, filtroEmpresa) {
            return `
                SELECT ROUND(100.0 * COUNT(CASE WHEN (CAB.AD_DTENTREGAEFETIVA - CAB.AD_DTENTREGAPREV) <= 0 THEN CAB.NUNOTA END)
                    / NULLIF(COUNT(CAB.NUNOTA), 0), 2) AS PERC
                FROM TGFCAB CAB
                WHERE CAB.TIPMOV = 'P'
                  AND CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                  AND CAB.CODTIPOPER IN (1001,1009,1010,1011)
                  ${filtroEmpresa}
            `;
        }

        function sqlTempoEntregaPrazoGrafico(dtInicial, dtFinal, filtroEmpresa) {
            return `
                SELECT TO_CHAR(CAB.DTNEG,'YYYY') AS ANO,
                       TO_CHAR(CAB.DTNEG,'MM') AS MES,
                       TO_CHAR(CAB.DTNEG,'MM/YYYY') AS MES_ANO,
                       ROUND(100.0 * COUNT(CASE WHEN (CAB.AD_DTENTREGAEFETIVA - CAB.AD_DTENTREGAPREV) <= 0 THEN CAB.NUNOTA END)
                           / NULLIF(COUNT(CAB.NUNOTA), 0), 2) AS PERC
                FROM TGFCAB CAB
                WHERE CAB.TIPMOV = 'P'
                  AND CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                  AND CAB.CODTIPOPER IN (1001,1009,1010,1011)
                  ${filtroEmpresa}
                GROUP BY TO_CHAR(CAB.DTNEG,'YYYY'), TO_CHAR(CAB.DTNEG,'MM'), TO_CHAR(CAB.DTNEG,'MM/YYYY')
                ORDER BY 1, 2
            `;
        }

        function sqlTempoEntregaPrazoDetalhe(dtIni, dtFim, filtroEmpresa) {
            return `
                SELECT CAB.NUNOTA, CAB.NUMNOTA, CAB.CODEMP, CAB.DTNEG,
                       (CAB.AD_DTENTREGAEFETIVA - CAB.AD_DTENTREGAPREV) AS ENTREGA_NO_PRAZO,
                       CAB.CODTIPOPER, CAB.CODPARC, PAR.NOMEPARC, CAB.VLRNOTA
                FROM TGFCAB CAB
                INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
                WHERE CAB.TIPMOV = 'P'
                  AND CAB.DTNEG BETWEEN TO_DATE('${dtIni}', 'DD-MM-YYYY') AND TO_DATE('${dtFim}', 'DD-MM-YYYY')
                  AND CAB.CODTIPOPER IN (1001,1009,1010,1011)
                  ${filtroEmpresa}
                ORDER BY CAB.CODEMP, CAB.DTNEG, CAB.NUNOTA
            `;
        }

        // Card Tempo de Entrega: % pedidos no prazo (TGFCAB)
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
                const filtroEmpresa = `AND CAB.CODEMP IN (${empresasStr})`;
                const sql = sqlTempoEntregaPrazoCard(dtInicial, dtFinal, filtroEmpresa);
                const result = await JX.consultar(sql);
                const elVal = document.getElementById('tempoEntregaValue');
                const elProg = document.getElementById('tempoEntregaProgress');
                if (result && result.length > 0) {
                    const perc = parseFloat(result[0].PERC != null ? result[0].PERC : result[0].perc);
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
                console.error('Erro ao carregar Tempo de Entrega:', e);
                document.getElementById('tempoEntregaValue').textContent = 'Erro';
                document.getElementById('tempoEntregaProgress').style.width = '0%';
            }
        }

        // Evolução mensal do % (série consolidada; mesma base do card)
        async function carregarTempoEntregaHistorico() {
            try {
                if (typeof JX === "undefined" || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) {
                    tempoEntregaRealData = [];
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                const filtroEmpresa = `AND CAB.CODEMP IN (${empresasStr})`;
                const sql = sqlTempoEntregaPrazoGrafico(dtInicial, dtFinal, filtroEmpresa);
                const result = await JX.consultar(sql);
                tempoEntregaRealData = new Array(12).fill(null);
                if (result && result.length > 0) {
                    result.forEach(row => {
                        const mes = parseInt(row.MES != null ? row.MES : row.mes, 10);
                        const mesIndex = mes - 1;
                        const perc = parseFloat(row.PERC != null ? row.PERC : row.perc);
                        if (!isNaN(mesIndex) && mesIndex >= 0 && mesIndex < 12 && !isNaN(perc)) {
                            tempoEntregaRealData[mesIndex] = perc;
                        }
                    });
                }
            } catch (e) {
                console.error('Erro ao carregar histórico Tempo de Entrega:', e);
                tempoEntregaRealData = [];
            }
        }

        /**
         * Card: PERC = (soma TOP232 + TOP233) / soma TOP1101 no intervalo (industria26).
         */
        function sqlCustoEntregaCard(dtInicial, dtFinal, filtroEmpresa) {
            return `
SELECT
    SUM(CASE WHEN CB.CODTIPOPER = 232 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END) AS TOP232,
    SUM(CASE WHEN CB.CODTIPOPER = 233 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END) AS TOP233,
    SUM(CASE WHEN CB.CODTIPOPER = 1101 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END) AS TOP1101,
    (
        SUM(CASE WHEN CB.CODTIPOPER = 232 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END) +
        SUM(CASE WHEN CB.CODTIPOPER = 233 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END)
    ) / NULLIF(SUM(CASE WHEN CB.CODTIPOPER = 1101 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END), 0) AS PERC
FROM (
    SELECT CAB.NUNOTA, CAB.CODTIPOPER, CAB.VLRNOTA,
           SUM(CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END * ITE.VLRTOT) AS VLRTOT_TOTAL
    FROM TGFITE ITE
    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    WHERE CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
      ${filtroEmpresa}
      AND CAB.STATUSNOTA = 'L'
    GROUP BY CAB.NUNOTA, CAB.CODTIPOPER, CAB.VLRNOTA
) CB
INNER JOIN (
    SELECT CAB.NUNOTA,
           SUM(CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END * ITE.VLRTOT) AS TOTAL_VLRTOT
    FROM TGFITE ITE
    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    WHERE CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
      ${filtroEmpresa}
      AND CAB.STATUSNOTA = 'L'
    GROUP BY CAB.NUNOTA
) TOT ON TOT.NUNOTA = CB.NUNOTA
WHERE CB.CODTIPOPER IN (232, 233, 1101)`;
        }

        function sqlCustoEntregaGrafico(dtInicial, dtFinal, filtroEmpresa) {
            return `
SELECT
    TO_CHAR(TRUNC(CB.DTNEG, 'MM'), 'YYYY') AS ANO,
    TO_CHAR(TRUNC(CB.DTNEG, 'MM'), 'MM') AS MES,
    TO_CHAR(TRUNC(CB.DTNEG, 'MM'), 'MM/YYYY') AS MES_ANO,
    (
        SUM(CASE WHEN CB.CODTIPOPER = 232 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END) +
        SUM(CASE WHEN CB.CODTIPOPER = 233 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END)
    ) / NULLIF(SUM(CASE WHEN CB.CODTIPOPER = 1101 THEN CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) ELSE 0 END), 0) AS PERC
FROM (
    SELECT CAB.DTNEG, CAB.NUNOTA, CAB.CODTIPOPER, CAB.VLRNOTA,
           SUM(CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END * ITE.VLRTOT) AS VLRTOT_TOTAL
    FROM TGFITE ITE
    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    WHERE CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
      ${filtroEmpresa}
      AND CAB.STATUSNOTA = 'L'
    GROUP BY CAB.DTNEG, CAB.NUNOTA, CAB.CODTIPOPER, CAB.VLRNOTA
) CB
INNER JOIN (
    SELECT CAB.NUNOTA,
           SUM(CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END * ITE.VLRTOT) AS TOTAL_VLRTOT
    FROM TGFITE ITE
    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    WHERE CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
      ${filtroEmpresa}
      AND CAB.STATUSNOTA = 'L'
    GROUP BY CAB.NUNOTA
) TOT ON TOT.NUNOTA = CB.NUNOTA
WHERE CB.CODTIPOPER IN (232, 233, 1101)
GROUP BY TRUNC(CB.DTNEG, 'MM')
ORDER BY TRUNC(CB.DTNEG, 'MM')`;
        }

        function sqlCustoEntregaDetalhe(dtInicial, dtFinal, filtroEmpresa) {
            return `
SELECT
    CB.NUNOTA, CB.NUMNOTA, CB.CODEMP, CB.DTNEG, CB.CODTIPOPER,
    CB.CODPARC, CB.NOMEPARC, CB.CODPROD, CB.DESCRPROD, 
    CB.QTDNEG, 
    CB.VOLUME,
    CB.VLRNOTA * NVL(CB.VLRTOT_TOTAL / NULLIF(TOT.TOTAL_VLRTOT, 0), 0) AS VLRNOTA
FROM (
    SELECT
        CAB.CODEMP, CAB.DTNEG, CAB.NUNOTA, CAB.NUMNOTA, CAB.CODTIPOPER,
        CAB.CODPARC, PAR.NOMEPARC, ITE.CODPROD, PRO.DESCRPROD, ITE.QTDNEG,
        SUM(ITE.QTDNEG * PRO.AD_QTDVOLLT) AS VOLUME,
        CAB.VLRNOTA,
        SUM(CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END * ITE.VLRTOT) AS VLRTOT_TOTAL
    FROM TGFITE ITE
    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    INNER JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
    INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
    WHERE CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
      ${filtroEmpresa}
      AND CAB.STATUSNOTA = 'L'
    GROUP BY
        CAB.CODEMP, CAB.DTNEG, CAB.NUNOTA, CAB.NUMNOTA, CAB.CODTIPOPER,
        CAB.CODPARC, PAR.NOMEPARC, ITE.CODPROD, PRO.DESCRPROD, ITE.QTDNEG,
        PRO.AD_QTDVOLLT, CAB.VLRNOTA
) CB
INNER JOIN (
    SELECT CAB.NUNOTA,
           SUM(CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END * ITE.VLRTOT) AS TOTAL_VLRTOT
    FROM TGFITE ITE
    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    WHERE CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
      ${filtroEmpresa}
      AND CAB.STATUSNOTA = 'L'
    GROUP BY CAB.NUNOTA
) TOT ON TOT.NUNOTA = CB.NUNOTA
WHERE CB.CODTIPOPER IN (232, 233, 1101)
ORDER BY CB.CODEMP, CB.DTNEG, CB.NUNOTA, CB.CODPROD`;
        }

        async function carregarCustoEntrega() {
            try {
                const ok = await aguardarJX();
                if (!ok) return;
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
                const codemps = empresasSelecionadas.map(function(e) { return parseInt(e, 10); }).filter(function(n) { return !isNaN(n); });
                if (!codemps.length) {
                    document.getElementById('custoEntregaValue').textContent = '-';
                    document.getElementById('custoEntregaProgress').style.width = '0%';
                    return;
                }
                const filtroEmpresa = `AND CAB.CODEMP IN (${codemps.join(',')})`;
                const sql = sqlCustoEntregaCard(dtInicial, dtFinal, filtroEmpresa);
                const result = await consultarSql(sql);
                const elVal = document.getElementById('custoEntregaValue');
                const elProg = document.getElementById('custoEntregaProgress');
                if (result && result.length > 0) {
                    const ratio = primeiroValorNumerico(result[0], ['PERC', 'perc']);
                    if (ratio !== null && !isNaN(ratio) && ratio >= 0) {
                        const percPct = ratio <= 1 ? ratio * 100 : ratio;
                        elVal.textContent = percPct.toFixed(2) + '%';
                        elVal.className = percPct <= 5 ? 'indicator-value positive' : percPct <= 15 ? 'indicator-value warning' : 'indicator-value negative';
                        const pct = Math.min(100, Math.max(0, percPct));
                        elProg.style.width = pct + '%';
                        elProg.className = percPct <= 5 ? 'progress-bar bg-success' : percPct <= 15 ? 'progress-bar bg-warning' : 'progress-bar bg-danger';
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

        async function carregarCustoEntregaHistorico() {
            try {
                const ok = await aguardarJX();
                if (!ok) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) {
                    custoEntregaRealData = new Array(12).fill(null);
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const codempsG = empresasSelecionadas.map(function(e) { return parseInt(e, 10); }).filter(function(n) { return !isNaN(n); });
                const filtroEmpresa = codempsG.length ? `AND CAB.CODEMP IN (${codempsG.join(',')})` : '';
                const sql = sqlCustoEntregaGrafico(dtInicial, dtFinal, filtroEmpresa);
                const result = await consultarSql(sql);
                custoEntregaRealData = new Array(12).fill(null);
                if (result && result.length > 0) {
                    result.forEach(function(row) {
                        const mes = parseInt(row.MES != null ? row.MES : row.mes, 10);
                        const mesIndex = mes - 1;
                        const ratio = primeiroValorNumerico(row, ['PERC', 'perc']);
                        if (!isNaN(mesIndex) && mesIndex >= 0 && mesIndex < 12 && ratio !== null && !isNaN(ratio) && ratio >= 0) {
                            custoEntregaRealData[mesIndex] = ratio <= 1 ? ratio * 100 : ratio;
                        }
                    });
                }
            } catch (e) {
                console.error('Erro ao carregar histórico Custo Entrega:', e);
                custoEntregaRealData = new Array(12).fill(null);
            }
        }

        async function carregarDetalhesCustoEntrega(cd, month, value) {
            try {
                const ok = await aguardarJX();
                if (!ok) return [];
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) return [];
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const codempsD = empresasSelecionadas.map(function(e) { return parseInt(e, 10); }).filter(function(n) { return !isNaN(n); });
                let filtroEmpresa = codempsD.length ? `AND CAB.CODEMP IN (${codempsD.join(',')})` : '';
                let dtIni = dtInicial, dtFim = dtFinal;
                if (month != null && month !== '') {
                    const year = new Date(dataIni + 'T12:00:00').getFullYear();
                    const range = getMonthDateRange(month, year);
                    if (range) {
                        dtIni = convertDateToDB(range.start);
                        dtFim = convertDateToDB(range.end);
                    }
                }
                const sql = sqlCustoEntregaDetalhe(dtIni, dtFim, filtroEmpresa);
                return await consultarSql(sql) || [];
            } catch (e) {
                console.error('Erro ao carregar detalhes Custo Entrega:', e);
                return [];
            }
        }

        // TGFTOP: tipos de operação F com última alteração (mesmo padrão das queries de Volume Realizado)
        function sqlVolumeRealizadoTopOperIn() {
            return `
                SELECT TOP.CODTIPOPER
                FROM TGFTOP TOP
                WHERE TOP.TIPMOV = 'F'
                  AND TOP.DHALTER = (SELECT MAX(T.DHALTER) FROM TGFTOP T WHERE T.CODTIPOPER = TOP.CODTIPOPER)
            `;
        }

        // Volume Realizado – CARD: média do % (TOTALUNID / QTDPREV) no período [dtInicial, dtFinal] (DD-MM-YYYY)
        function sqlVolumeRealizadoCard(dtInicial, dtFinal) {
            const topIn = sqlVolumeRealizadoTopOperIn();
            return `
                SELECT ROUND(100 * AVG(TOTALUNID / NULLIF(QTDPREV, 0)), 2) AS MEDIA_PERC
                FROM (
                    SELECT
                           SUM(I.QTDNEG * P.AD_QTDVOLLT) AS TOTALUNID,
                           (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(LAST_DAY(TO_DATE(MET.DTREF)),'DD')) *
                                    (ABS((CASE WHEN TO_DATE('${dtFinal}', 'DD-MM-YYYY') > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE TO_DATE('${dtFinal}', 'DD-MM-YYYY') END - TRUNC(MET.DTREF,'MM')))+1))
                            FROM TGMMET MET
                            WHERE MET.CODMETA = 8
                              AND MET.DTREF BETWEEN TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                              AND MET.CODPROD = I.CODPROD) AS QTDPREV
                    FROM TGFCAB C
                    INNER JOIN TGFITE I ON I.NUNOTA = C.NUNOTA
                    INNER JOIN TGFPRO P ON P.CODPROD = I.CODPROD
                    WHERE C.TIPMOV = 'F'
                      AND C.CODTIPOPER IN (${topIn})
                      AND C.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                      AND I.USOPROD = 'V'
                    GROUP BY I.CODPROD, I.CODVOL
                    UNION ALL
                    SELECT
                           0 AS TOTALUNID,
                           (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(LAST_DAY(TO_DATE(MET.DTREF)),'DD')) *
                                    (ABS((CASE WHEN TO_DATE('${dtFinal}', 'DD-MM-YYYY') > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE TO_DATE('${dtFinal}', 'DD-MM-YYYY') END - TRUNC(MET.DTREF,'MM')))+1))
                            FROM TGMMET MET
                            WHERE MET.CODMETA = 8
                              AND MET.DTREF BETWEEN TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                              AND MET.CODPROD = P.CODPROD) AS QTDPREV
                    FROM TGMMET M
                    INNER JOIN TGFPRO P ON P.CODPROD = M.CODPROD
                    WHERE M.CODMETA = 8
                      AND NVL(M.QTDPREV,0) <> 0
                      AND NOT EXISTS (
                          SELECT 1 FROM TGFITE I, TGFCAB C
                          WHERE C.NUNOTA = I.NUNOTA AND I.CODPROD = M.CODPROD
                            AND C.CODTIPOPER IN (${topIn})
                            AND C.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                            AND I.USOPROD = 'V'
                      )
                    GROUP BY P.CODPROD, P.CODVOL
                ) T
            `;
        }

        // Volume Realizado – TABELA: detalhe por item (TOTALUNID/QTDPREV = PERC)
        function sqlVolumeRealizadoDetalhe(dtInicial, dtFinal) {
            const topIn = sqlVolumeRealizadoTopOperIn();
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
                    TOTALUNID / NULLIF(QTDPREV,0) AS PERC
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
                                 (ABS((CASE WHEN TO_DATE('${dtFinal}', 'DD-MM-YYYY') > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE TO_DATE('${dtFinal}', 'DD-MM-YYYY') END - TRUNC(MET.DTREF,'MM')))+1))
                         FROM TGMMET MET
                         WHERE MET.CODMETA = 8
                           AND MET.DTREF BETWEEN TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                           AND MET.CODPROD = I.CODPROD) AS QTDPREV
                    FROM TGFCAB C
                    INNER JOIN TGFITE I ON I.NUNOTA = C.NUNOTA
                    INNER JOIN TGFPRO P ON P.CODPROD = I.CODPROD
                    INNER JOIN TGFGRU G ON G.CODGRUPOPROD = P.CODGRUPOPROD
                    WHERE C.TIPMOV = 'F'
                      AND C.CODTIPOPER IN (${topIn})
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
                                 (ABS((CASE WHEN TO_DATE('${dtFinal}', 'DD-MM-YYYY') > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE TO_DATE('${dtFinal}', 'DD-MM-YYYY') END - TRUNC(MET.DTREF,'MM')))+1))
                         FROM TGMMET MET
                         WHERE MET.CODMETA = 8
                           AND MET.DTREF BETWEEN TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                           AND MET.CODPROD = P.CODPROD) AS QTDPREV
                    FROM TGMMET M
                    INNER JOIN TGFPRO P ON P.CODPROD = M.CODPROD
                    INNER JOIN TGFGRU G ON G.CODGRUPOPROD = P.CODGRUPOPROD
                    WHERE M.CODMETA = 8
                      AND NVL(M.QTDPREV,0) <> 0
                      AND NOT EXISTS (
                          SELECT 1 FROM TGFITE I, TGFCAB C
                          WHERE C.NUNOTA = I.NUNOTA AND I.CODPROD = M.CODPROD
                            AND C.CODTIPOPER IN (${topIn})
                            AND C.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                            AND I.USOPROD = 'V'
                      )
                    GROUP BY P.CODPROD, P.DESCRPROD, P.CODGRUPOPROD, G.DESCRGRUPOPROD, P.CODVOL
                )
            `;
        }

        // Volume Realizado – GRÁFICO: evolução mensal do % (média TOTALUNID/QTDPREV por MES_ANO)
        function sqlVolumeRealizadoHistorico(dtInicial, dtFinal) {
            const topIn = sqlVolumeRealizadoTopOperIn();
            return `
                SELECT ANO,
                       MES,
                       MES_ANO,
                       ROUND(100 * AVG(TOTALUNID / NULLIF(QTDPREV, 0)), 2) AS PERCENTUAL
                FROM (
                    SELECT
                           V.TOTALUNID,
                           (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(LAST_DAY(TO_DATE(MET.DTREF)),'DD')) *
                                    (ABS((CASE WHEN LEAST(LAST_DAY(V.REF_DT), TO_DATE('${dtFinal}', 'DD-MM-YYYY')) > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE LEAST(LAST_DAY(V.REF_DT), TO_DATE('${dtFinal}', 'DD-MM-YYYY')) END - TRUNC(MET.DTREF,'MM')))+1))
                            FROM TGMMET MET
                            WHERE MET.CODMETA = 8
                              AND MET.DTREF BETWEEN GREATEST(TRUNC(V.REF_DT,'MM'), TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM'))
                                                AND LEAST(LAST_DAY(V.REF_DT), TO_DATE('${dtFinal}', 'DD-MM-YYYY'))
                              AND MET.CODPROD = V.CODPROD) AS QTDPREV,
                           TO_CHAR(V.REF_DT,'YYYY') AS ANO,
                           TO_CHAR(V.REF_DT,'MM') AS MES,
                           TO_CHAR(V.REF_DT,'MM/YYYY') AS MES_ANO
                    FROM (
                        SELECT I.CODPROD,
                               I.CODVOL,
                               SUM(I.QTDNEG * P.AD_QTDVOLLT) AS TOTALUNID,
                               MIN(C.DTNEG) AS REF_DT
                        FROM TGFCAB C
                        INNER JOIN TGFITE I ON I.NUNOTA = C.NUNOTA
                        INNER JOIN TGFPRO P ON P.CODPROD = I.CODPROD
                        WHERE C.TIPMOV = 'F'
                          AND C.CODTIPOPER IN (${topIn})
                          AND C.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                          AND I.USOPROD = 'V'
                        GROUP BY
                               I.CODPROD,
                               I.CODVOL,
                               TO_CHAR(C.DTNEG,'YYYY'),
                               TO_CHAR(C.DTNEG,'MM'),
                               TO_CHAR(C.DTNEG,'MM/YYYY')
                    ) V
                    UNION ALL
                    SELECT
                           0 AS TOTALUNID,
                           (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(LAST_DAY(TO_DATE(MET.DTREF)),'DD')) *
                                    (ABS((CASE WHEN LEAST(LAST_DAY(M_REP), TO_DATE('${dtFinal}', 'DD-MM-YYYY')) > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE LEAST(LAST_DAY(M_REP), TO_DATE('${dtFinal}', 'DD-MM-YYYY')) END - TRUNC(MET.DTREF,'MM')))+1))
                            FROM TGMMET MET
                            WHERE MET.CODMETA = 8
                              AND MET.DTREF BETWEEN GREATEST(TRUNC(M_REP,'MM'), TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM'))
                                                AND LEAST(LAST_DAY(M_REP), TO_DATE('${dtFinal}', 'DD-MM-YYYY'))
                              AND MET.CODPROD = META_SEM_VENDA.CODPROD) AS QTDPREV,
                           TO_CHAR(TRUNC(M_REP,'MM'),'YYYY') AS ANO,
                           TO_CHAR(TRUNC(M_REP,'MM'),'MM') AS MES,
                           TO_CHAR(TRUNC(M_REP,'MM'),'MM/YYYY') AS MES_ANO
                    FROM (
                        SELECT MAX(M.DTREF) AS M_REP,
                               P.CODPROD,
                               P.CODVOL
                        FROM TGMMET M
                        INNER JOIN TGFPRO P ON P.CODPROD = M.CODPROD
                        WHERE M.CODMETA = 8
                          AND NVL(M.QTDPREV,0) <> 0
                          AND M.DTREF BETWEEN TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                          AND NOT EXISTS (
                              SELECT 1 FROM TGFITE I, TGFCAB C
                              WHERE C.NUNOTA = I.NUNOTA AND I.CODPROD = M.CODPROD
                                AND C.CODTIPOPER IN (${topIn})
                                AND C.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                                AND I.USOPROD = 'V'
                          )
                        GROUP BY TRUNC(M.DTREF,'MM'), P.CODPROD, P.CODVOL
                    ) META_SEM_VENDA
                )
                GROUP BY ANO, MES, MES_ANO
                ORDER BY ANO, MES
            `;
        }

        // Qualidade na Entrega (TGFCAB): % = SUM(AD_FEEDBACK)/COUNT(NUNOTA) no período e empresas do filtro
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
                const filtroEmpresa = `AND CAB.CODEMP IN (${empresasStr})`;
                const sql = `
                    SELECT SUM(CAB.AD_FEEDBACK) AS PEDIDOS_CONFORME,
                           COUNT(CAB.NUNOTA) AS TOTAL_PEDIDOS,
                           ROUND(100.0 * SUM(CAB.AD_FEEDBACK) / NULLIF(COUNT(CAB.NUNOTA), 0), 2) AS PERC
                    FROM TGFCAB CAB
                    WHERE CAB.TIPMOV = 'P'
                      AND CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                      AND CAB.CODTIPOPER IN (1001,1009,1010,1011)
                      ${filtroEmpresa}
                `;
                const result = await JX.consultar(sql);
                const elVal = document.getElementById('qualidadeValue');
                const elProg = document.getElementById('qualidadeProgress');
                if (result && result.length > 0) {
                    const perc = parseFloat(result[0].PERC != null ? result[0].PERC : result[0].perc);
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

        // Evolução mensal do % (série consolidada; mesma base do card)
        async function carregarQualidadeHistorico() {
            try {
                if (typeof JX === "undefined" || !JX.consultar) return;
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                const empresasSelect = document.getElementById('empresas');
                const empresasSelecionadas = Array.from(empresasSelect.selectedOptions).map(opt => opt.value);
                if (!dataIni || !dataFin || !empresasSelecionadas.length) {
                    qualidadeRealData = [];
                    return;
                }
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const empresasStr = empresasSelecionadas.map(e => `'${e}'`).join(',');
                const filtroEmpresa = `AND CAB.CODEMP IN (${empresasStr})`;
                const sql = `
                    SELECT TO_CHAR(CAB.DTNEG,'YYYY') AS ANO,
                           TO_CHAR(CAB.DTNEG,'MM') AS MES,
                           TO_CHAR(CAB.DTNEG,'MM/YYYY') AS MES_ANO,
                           ROUND(100.0 * SUM(CAB.AD_FEEDBACK) / NULLIF(COUNT(CAB.NUNOTA), 0), 2) AS PERC
                    FROM TGFCAB CAB
                    WHERE CAB.TIPMOV = 'P'
                      AND CAB.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                      AND CAB.CODTIPOPER IN (1001,1009,1010,1011)
                      ${filtroEmpresa}
                    GROUP BY TO_CHAR(CAB.DTNEG,'YYYY'), TO_CHAR(CAB.DTNEG,'MM'), TO_CHAR(CAB.DTNEG,'MM/YYYY')
                    ORDER BY 1, 2
                `;
                const result = await JX.consultar(sql);
                qualidadeRealData = new Array(12).fill(null);
                if (result && result.length > 0) {
                    result.forEach(row => {
                        const mes = parseInt(row.MES != null ? row.MES : row.mes, 10);
                        const mesIndex = mes - 1;
                        const perc = parseFloat(row.PERC != null ? row.PERC : row.perc);
                        if (!isNaN(mesIndex) && mesIndex >= 0 && mesIndex < 12 && !isNaN(perc)) {
                            qualidadeRealData[mesIndex] = perc;
                        }
                    });
                }
            } catch (e) {
                console.error('Erro ao carregar histórico Qualidade na Entrega:', e);
                qualidadeRealData = [];
            }
        }

        // Detalhe TGFCAB + TGFPAR; com mês (clique no gráfico) restringe ao mês; cd = CODEMP apenas se estiver no filtro
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
                let filtroEmpresa = `AND CAB.CODEMP IN (${empresasStr})`;
                let dtIni = dtInicial, dtFim = dtFinal;
                const cdStr = cd != null ? String(cd) : '';
                const empresaNoFiltro = empresasSelecionadas.some(e => String(e) === cdStr);
                if (month != null && month !== '') {
                    const year = new Date(dataIni).getFullYear();
                    const range = getMonthDateRange(month, year);
                    if (range) {
                        dtIni = convertDateToDB(range.start);
                        dtFim = convertDateToDB(range.end);
                        if (cdStr && empresaNoFiltro) {
                            filtroEmpresa = `AND CAB.CODEMP = '${cdStr}'`;
                        }
                    }
                }
                const sql = `
                    SELECT CAB.NUNOTA, CAB.NUMNOTA, CAB.CODEMP, CAB.DTNEG, CAB.CODTIPOPER, CAB.CODPARC, PAR.NOMEPARC, CAB.VLRNOTA
                    FROM TGFCAB CAB
                    INNER JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
                    WHERE CAB.TIPMOV = 'P'
                      AND CAB.DTNEG BETWEEN TO_DATE('${dtIni}', 'DD-MM-YYYY') AND TO_DATE('${dtFim}', 'DD-MM-YYYY')
                      AND CAB.CODTIPOPER IN (1001,1009,1010,1011)
                      ${filtroEmpresa}
                    ORDER BY CAB.CODEMP, CAB.DTNEG, CAB.NUNOTA
                `;
                const result = await JX.consultar(sql);
                return result || [];
            } catch (e) {
                console.error('Erro ao carregar detalhes Qualidade na Entrega:', e);
                return [];
            }
        }

        // Card Volume Realizado: média % (volume produzido em un. padrão / meta QTDPREV) no período
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
                const sql = sqlVolumeRealizadoCard(dtInicial, dtFinal);
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

        // Gráfico Volume Realizado: % médio por mês (TOTALUNID/QTDPREV), uma consulta no intervalo do filtro
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
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const sql = sqlVolumeRealizadoHistorico(dtInicial, dtFinal);
                const result = await JX.consultar(sql);
                if (result && result.length > 0) {
                    result.forEach(function(row) {
                        const mes = parseInt(row.MES != null ? row.MES : row.mes, 10);
                        const mesIndex = mes - 1;
                        const perc = parseFloat(row.PERCENTUAL != null ? row.PERCENTUAL : row.percentual);
                        if (!isNaN(mesIndex) && mesIndex >= 0 && mesIndex < 12 && !isNaN(perc)) {
                            volumeRealizadoRealData[mesIndex] = perc;
                        }
                    });
                }
            } catch (e) {
                console.error('Erro ao carregar histórico Volume Realizado:', e);
                volumeRealizadoRealData = [];
            }
        }

        // Detalhes Volume Realizado – tabela (produzido / meta por item)
        async function carregarDetalhesVolumeRealizado() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return [];
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                if (!dataIni || !dataFin) return [];
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const sql = sqlVolumeRealizadoDetalhe(dtInicial, dtFinal) + ' ORDER BY CODIGO_ITEM';
                const result = await JX.consultar(sql);
                return result || [];
            } catch (e) {
                console.error('Erro ao carregar detalhes Volume Realizado:', e);
                return [];
            }
        }

        // Ocupação Produção – CARD: média % (TOTALUNID / 290.000) no período — mesma base que Volume Realizado (TGFCAB/TGFITE + TGMMET meta 8)
        function sqlOcupacaoProducaoCard(dtInicial, dtFinal) {
            const topIn = sqlVolumeRealizadoTopOperIn();
            return `
                SELECT ROUND(100 * AVG(TOTALUNID / 290000), 2) AS PERC
                FROM (
                    SELECT
                           SUM(I.QTDNEG * P.AD_QTDVOLLT) AS TOTALUNID,
                           (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(LAST_DAY(TO_DATE(MET.DTREF)),'DD')) *
                                    (ABS((CASE WHEN TO_DATE('${dtFinal}', 'DD-MM-YYYY') > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE TO_DATE('${dtFinal}', 'DD-MM-YYYY') END - TRUNC(MET.DTREF,'MM')))+1))
                            FROM TGMMET MET
                            WHERE MET.CODMETA = 8
                              AND MET.DTREF BETWEEN TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                              AND MET.CODPROD = I.CODPROD) AS QTDPREV
                    FROM TGFCAB C
                    INNER JOIN TGFITE I ON I.NUNOTA = C.NUNOTA
                    INNER JOIN TGFPRO P ON P.CODPROD = I.CODPROD
                    WHERE C.TIPMOV = 'F'
                      AND C.CODTIPOPER IN (${topIn})
                      AND C.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                      AND I.USOPROD = 'V'
                    GROUP BY I.CODPROD, I.CODVOL
                    UNION ALL
                    SELECT
                           0 AS TOTALUNID,
                           (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(LAST_DAY(TO_DATE(MET.DTREF)),'DD')) *
                                    (ABS((CASE WHEN TO_DATE('${dtFinal}', 'DD-MM-YYYY') > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE TO_DATE('${dtFinal}', 'DD-MM-YYYY') END - TRUNC(MET.DTREF,'MM')))+1))
                            FROM TGMMET MET
                            WHERE MET.CODMETA = 8
                              AND MET.DTREF BETWEEN TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                              AND MET.CODPROD = P.CODPROD) AS QTDPREV
                    FROM TGMMET M
                    INNER JOIN TGFPRO P ON P.CODPROD = M.CODPROD
                    WHERE M.CODMETA = 8
                      AND NVL(M.QTDPREV,0) <> 0
                      AND NOT EXISTS (
                          SELECT 1 FROM TGFITE I, TGFCAB C
                          WHERE C.NUNOTA = I.NUNOTA AND I.CODPROD = M.CODPROD
                            AND C.CODTIPOPER IN (${topIn})
                            AND C.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                            AND I.USOPROD = 'V'
                      )
                    GROUP BY P.CODPROD, P.CODVOL
                ) T
            `;
        }

        // Ocupação Produção – GRÁFICO: evolução mensal do % (média TOTALUNID/290.000 por MES_ANO) — mesma estrutura de sqlVolumeRealizadoHistorico
        function sqlOcupacaoProducaoHistorico(dtInicial, dtFinal) {
            const topIn = sqlVolumeRealizadoTopOperIn();
            return `
                SELECT ANO,
                       MES,
                       MES_ANO,
                       ROUND(100 * AVG(TOTALUNID / 290000), 2) AS PERCENTUAL
                FROM (
                    SELECT
                           V.TOTALUNID,
                           (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(LAST_DAY(TO_DATE(MET.DTREF)),'DD')) *
                                    (ABS((CASE WHEN LEAST(LAST_DAY(V.REF_DT), TO_DATE('${dtFinal}', 'DD-MM-YYYY')) > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE LEAST(LAST_DAY(V.REF_DT), TO_DATE('${dtFinal}', 'DD-MM-YYYY')) END - TRUNC(MET.DTREF,'MM')))+1))
                            FROM TGMMET MET
                            WHERE MET.CODMETA = 8
                              AND MET.DTREF BETWEEN GREATEST(TRUNC(V.REF_DT,'MM'), TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM'))
                                                AND LEAST(LAST_DAY(V.REF_DT), TO_DATE('${dtFinal}', 'DD-MM-YYYY'))
                              AND MET.CODPROD = V.CODPROD) AS QTDPREV,
                           TO_CHAR(V.REF_DT,'YYYY') AS ANO,
                           TO_CHAR(V.REF_DT,'MM') AS MES,
                           TO_CHAR(V.REF_DT,'MM/YYYY') AS MES_ANO
                    FROM (
                        SELECT I.CODPROD,
                               I.CODVOL,
                               SUM(I.QTDNEG * P.AD_QTDVOLLT) AS TOTALUNID,
                               MIN(C.DTNEG) AS REF_DT
                        FROM TGFCAB C
                        INNER JOIN TGFITE I ON I.NUNOTA = C.NUNOTA
                        INNER JOIN TGFPRO P ON P.CODPROD = I.CODPROD
                        WHERE C.TIPMOV = 'F'
                          AND C.CODTIPOPER IN (${topIn})
                          AND C.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                          AND I.USOPROD = 'V'
                        GROUP BY
                               I.CODPROD,
                               I.CODVOL,
                               TO_CHAR(C.DTNEG,'YYYY'),
                               TO_CHAR(C.DTNEG,'MM'),
                               TO_CHAR(C.DTNEG,'MM/YYYY')
                    ) V
                    UNION ALL
                    SELECT
                           0 AS TOTALUNID,
                           (SELECT SUM(MET.QTDPREV / ABS(TO_CHAR(LAST_DAY(TO_DATE(MET.DTREF)),'DD')) *
                                    (ABS((CASE WHEN LEAST(LAST_DAY(M_REP), TO_DATE('${dtFinal}', 'DD-MM-YYYY')) > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE LEAST(LAST_DAY(M_REP), TO_DATE('${dtFinal}', 'DD-MM-YYYY')) END - TRUNC(MET.DTREF,'MM')))+1))
                            FROM TGMMET MET
                            WHERE MET.CODMETA = 8
                              AND MET.DTREF BETWEEN GREATEST(TRUNC(M_REP,'MM'), TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM'))
                                                AND LEAST(LAST_DAY(M_REP), TO_DATE('${dtFinal}', 'DD-MM-YYYY'))
                              AND MET.CODPROD = META_SEM_VENDA.CODPROD) AS QTDPREV,
                           TO_CHAR(TRUNC(M_REP,'MM'),'YYYY') AS ANO,
                           TO_CHAR(TRUNC(M_REP,'MM'),'MM') AS MES,
                           TO_CHAR(TRUNC(M_REP,'MM'),'MM/YYYY') AS MES_ANO
                    FROM (
                        SELECT MAX(M.DTREF) AS M_REP,
                               P.CODPROD,
                               P.CODVOL
                        FROM TGMMET M
                        INNER JOIN TGFPRO P ON P.CODPROD = M.CODPROD
                        WHERE M.CODMETA = 8
                          AND NVL(M.QTDPREV,0) <> 0
                          AND M.DTREF BETWEEN TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                          AND NOT EXISTS (
                              SELECT 1 FROM TGFITE I, TGFCAB C
                              WHERE C.NUNOTA = I.NUNOTA AND I.CODPROD = M.CODPROD
                                AND C.CODTIPOPER IN (${topIn})
                                AND C.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                                AND I.USOPROD = 'V'
                          )
                        GROUP BY TRUNC(M.DTREF,'MM'), P.CODPROD, P.CODVOL
                    ) META_SEM_VENDA
                )
                GROUP BY ANO, MES, MES_ANO
                ORDER BY ANO, MES
            `;
        }

        // Ocupação Produção – TABELA: detalhe por item; PERC = TOTALUNID/290000 (exibir ×100 como % no front, igual Volume Realizado)
        function sqlBaseOcupacaoProducaoDetalhe(dtInicial, dtFinal) {
            const topIn = sqlVolumeRealizadoTopOperIn();
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
                    TOTALUNID / 290000 AS PERC
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
                                 (ABS((CASE WHEN TO_DATE('${dtFinal}', 'DD-MM-YYYY') > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE TO_DATE('${dtFinal}', 'DD-MM-YYYY') END - TRUNC(MET.DTREF,'MM')))+1))
                         FROM TGMMET MET
                         WHERE MET.CODMETA = 8
                           AND MET.DTREF BETWEEN TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                           AND MET.CODPROD = I.CODPROD) AS QTDPREV
                    FROM TGFCAB C
                    INNER JOIN TGFITE I ON I.NUNOTA = C.NUNOTA
                    INNER JOIN TGFPRO P ON P.CODPROD = I.CODPROD
                    INNER JOIN TGFGRU G ON G.CODGRUPOPROD = P.CODGRUPOPROD
                    WHERE C.TIPMOV = 'F'
                      AND C.CODTIPOPER IN (${topIn})
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
                                 (ABS((CASE WHEN TO_DATE('${dtFinal}', 'DD-MM-YYYY') > LAST_DAY(TO_DATE(MET.DTREF)) THEN LAST_DAY(TO_DATE(MET.DTREF)) ELSE TO_DATE('${dtFinal}', 'DD-MM-YYYY') END - TRUNC(MET.DTREF,'MM')))+1))
                         FROM TGMMET MET
                         WHERE MET.CODMETA = 8
                           AND MET.DTREF BETWEEN TRUNC(TO_DATE('${dtInicial}', 'DD-MM-YYYY'),'MM') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                           AND MET.CODPROD = P.CODPROD) AS QTDPREV
                    FROM TGMMET M
                    INNER JOIN TGFPRO P ON P.CODPROD = M.CODPROD
                    INNER JOIN TGFGRU G ON G.CODGRUPOPROD = P.CODGRUPOPROD
                    WHERE M.CODMETA = 8
                      AND NVL(M.QTDPREV,0) <> 0
                      AND NOT EXISTS (
                          SELECT 1 FROM TGFITE I, TGFCAB C
                          WHERE C.NUNOTA = I.NUNOTA AND I.CODPROD = M.CODPROD
                            AND C.CODTIPOPER IN (${topIn})
                            AND C.DTNEG BETWEEN TO_DATE('${dtInicial}', 'DD-MM-YYYY') AND TO_DATE('${dtFinal}', 'DD-MM-YYYY')
                            AND I.USOPROD = 'V'
                      )
                    GROUP BY P.CODPROD, P.DESCRPROD, P.CODGRUPOPROD, G.DESCRGRUPOPROD, P.CODVOL
                )
            `;
        }

        // Carregar média % (TOTALUNID/290.000) para o card Ocupação Produção – intervalo dataIni/dataFin (DD-MM-YYYY nas queries)
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
                    const perc = parseFloat(result[0].PERC != null ? result[0].PERC : result[0].perc);
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
                console.error('Erro ao carregar Ocupação Produção:', e);
                const elVal = document.getElementById('ocupacaoProducaoValue');
                const elProg = document.getElementById('ocupacaoProducaoProgress');
                if (elVal) elVal.textContent = 'Erro';
                if (elProg) elProg.style.width = '0%';
            }
        }

        // Carregar evolução mensal do % (TOTALUNID/290.000) para o gráfico Ocupação Produção — mesmo mapeamento MES → índice que Volume Realizado
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
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const sql = sqlOcupacaoProducaoHistorico(dtInicial, dtFinal);
                const result = await JX.consultar(sql);
                if (result && result.length > 0) {
                    result.forEach(function(row) {
                        const mes = parseInt(row.MES != null ? row.MES : row.mes, 10);
                        const mesIndex = mes - 1;
                        const perc = parseFloat(row.PERCENTUAL != null ? row.PERCENTUAL : row.percentual);
                        if (!isNaN(mesIndex) && mesIndex >= 0 && mesIndex < 12 && !isNaN(perc)) {
                            ocupacaoProducaoRealData[mesIndex] = perc;
                        }
                    });
                }
            } catch (e) {
                console.error('Erro ao carregar histórico Ocupação Produção:', e);
                ocupacaoProducaoRealData = [];
            }
        }

        // Detalhes Ocupação Produção – tabela por item (TOTALUNID/290.000 = PERC em razão; exibição ×100 no modal)
        async function carregarDetalhesOcupacaoProducao() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) return [];
                const dataIni = document.getElementById('dataIni').value;
                const dataFin = document.getElementById('dataFin').value;
                if (!dataIni || !dataFin) return [];
                const dtInicial = convertDateToDB(dataIni);
                const dtFinal = convertDateToDB(dataFin);
                const sql = sqlBaseOcupacaoProducaoDetalhe(dtInicial, dtFinal) + ' ORDER BY CODIGO_ITEM';
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

        const formulacaoData = {
            CD1: [99.0, 99.1, 99.2, 99.3, 99.4, 99.5, 99.6, 99.7, 99.8, 99.2, 99.2, 99.2],
            CD2: [98.5, 98.6, 98.7, 98.8, 98.9, 99.0, 99.1, 99.2, 99.3, 99.0, 99.0, 99.0],
            CD3: [99.5, 99.6, 99.7, 99.8, 99.9, 99.9, 99.9, 99.8, 99.7, 99.5, 99.5, 99.5],
            CD4: [98.0, 98.1, 98.2, 98.3, 98.4, 98.5, 98.6, 98.7, 98.8, 98.5, 98.5, 98.5],
            CD5: [99.2, 99.3, 99.4, 99.5, 99.6, 99.7, 99.8, 99.9, 99.9, 99.2, 99.2, 99.2]
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

        const dataMap = {
            qualidade: qualidadeData,
            custoEntrega: custoEntregaData,
            tempoEntrega: tempoEntregaData,
            formulacao: formulacaoData,
            volumeRealizado: volumeRealizadoData,
            ocupacaoProducao: ocupacaoProducaoData,
            manutencaoPreventiva: manutencaoPreventivaData,
            manutencaoCorretiva: manutencaoCorretivaData
        };

        const kpiTitles = {
            qualidade: 'Qualidade na Entrega',
            custoEntrega: 'Custo Entrega',
            tempoEntrega: 'Tempo de Entrega',
            formulacao: 'Qualidade de Formulação',
            volumeRealizado: 'Volume Realizado',
            ocupacaoProducao: 'Ocupação Produção',
            manutencaoPreventiva: 'Manutenções Preventivas',
            manutencaoCorretiva: 'Manutenções Corretivas'
        };

        const tabToKpis = {
            'gerir-entregas': ['qualidade', 'custoEntrega', 'tempoEntrega'],
            'industria': ['formulacao', 'volumeRealizado', 'ocupacaoProducao'],
            'manutencao': ['manutencaoPreventiva', 'manutencaoCorretiva']
        };

        const breakdownConfigs = {
            qualidade: [
                { name: 'Feedbacks Conforme', unit: '%' },
                { name: 'Feedbacks Não Conforme', unit: '%' }
            ],
            custoEntrega: [
                { name: 'TOP 232 + 233 (rateado)', unit: '%' },
                { name: 'TOP 1101 (base)', unit: '%' }
            ],
            tempoEntrega: [
                { name: 'Pedidos no prazo', unit: '%' },
                { name: 'Demais pedidos', unit: '%' }
            ],
            formulacao: [
                { name: 'Testes Aprovados', unit: '%' },
                { name: 'Testes Reprovados', unit: '%' }
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

        // Detalhe TGFCAB + TGFPAR; com mês (clique no gráfico) restringe ao mês; cd = CODEMP apenas se estiver no filtro
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
                let filtroEmpresa = `AND CAB.CODEMP IN (${empresasStr})`;
                let dtIni = dtInicial, dtFim = dtFinal;
                const cdStr = cd != null ? String(cd) : '';
                const empresaNoFiltro = empresasSelecionadas.some(e => String(e) === cdStr);
                if (month != null && month !== '') {
                    const year = new Date(dataIni).getFullYear();
                    const range = getMonthDateRange(month, year);
                    if (range) {
                        dtIni = convertDateToDB(range.start);
                        dtFim = convertDateToDB(range.end);
                        if (cdStr && empresaNoFiltro) {
                            filtroEmpresa = `AND CAB.CODEMP = '${cdStr}'`;
                        }
                    }
                }
                const sql = sqlTempoEntregaPrazoDetalhe(dtIni, dtFim, filtroEmpresa);
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
            
            if (kpi === 'qualidade') {
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
                                        <th>NUNOTA</th>
                                        <th>NUMNOTA</th>
                                        <th>CODEMP</th>
                                        <th>DTNEG</th>
                                        <th>CODTIPOPER</th>
                                        <th>CODPARC</th>
                                        <th>NOMEPARC</th>
                                        <th>VLRNOTA</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                    if (detailData && detailData.length > 0) {
                        detailData.forEach(row => {
                            const nunota = row.NUNOTA ?? row.nunota ?? '';
                            const numnota = row.NUMNOTA ?? row.numnota ?? '';
                            const codemp = row.CODEMP ?? row.codemp ?? '';
                            const dtneg = row.DTNEG ?? row.dtneg ?? '';
                            const codtipoper = row.CODTIPOPER ?? row.codtipoper ?? '';
                            const codparc = row.CODPARC ?? row.codparc ?? '';
                            const nomeparc = (row.NOMEPARC ?? row.nomeparc ?? '').toString();
                            const vlrnota = parseFloat(row.VLRNOTA ?? row.vlrnota ?? 0);
                            tableHTML += `
                                <tr>
                                    <td>${nunota}</td>
                                    <td>${numnota}</td>
                                    <td>${codemp}</td>
                                    <td>${formatDate(dtneg)}</td>
                                    <td>${codtipoper}</td>
                                    <td>${codparc}</td>
                                    <td>${nomeparc}</td>
                                    <td>${formatCurrency(vlrnota)}</td>
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
                    title = `${kpiTitles[kpi]}${month ? ` - ${month} (${value != null ? Number(value).toFixed(2) + '%' : '-'})` : ' - Detalhamento'}`;
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
                                        <th>DTNEG</th>
                                        <th>CODTIPOPER</th>
                                        <th>CODPARC</th>
                                        <th>NOMEPARC</th>
                                        <th>CODPROD</th>
                                        <th>DESCRPROD</th>
                                        <th>QTDNEG</th>
                                        <th>VOLUME</th>
                                        <th>VLRNOTA</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                    if (detailData && detailData.length > 0) {
                        detailData.forEach(row => {
                            const codemp = row.CODEMP ?? row.codemp ?? '';
                            const nunota = row.NUNOTA ?? row.nunota ?? '';
                            const numnota = row.NUMNOTA ?? row.numnota ?? '';
                            const dtneg = row.DTNEG ?? row.dtneg ?? '';
                            const codtipoper = row.CODTIPOPER ?? row.codtipoper ?? '';
                            const codparc = row.CODPARC ?? row.codparc ?? '';
                            const nomeparc = (row.NOMEPARC ?? row.nomeparc ?? '').toString();
                            const codprod = row.CODPROD ?? row.codprod ?? '';
                            const descrprod = (row.DESCRPROD ?? row.descrprod ?? '').toString();
                            const qtdneg = parseFloat(row.QTDNEG ?? row.qtdneg ?? 0);
                            const volume = parseFloat(row.VOLUME ?? row.volume ?? 0);
                            const vlrnota = parseFloat(row.VLRNOTA ?? row.vlrnota ?? 0);
                            tableHTML += `
                                <tr>
                                    <td>${codemp}</td>
                                    <td>${nunota}</td>
                                    <td>${numnota}</td>
                                    <td>${formatDate(dtneg)}</td>
                                    <td>${codtipoper}</td>
                                    <td>${codparc}</td>
                                    <td>${nomeparc}</td>
                                    <td>${codprod}</td>
                                    <td>${descrprod}</td>
                                    <td>${qtdneg}</td>
                                    <td>${volume.toFixed(4)}</td>
                                    <td>${formatCurrency(vlrnota)}</td>
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
                    title = `${kpiTitles[kpi]}${cd && month ? ` - ${cd} - ${month} (Percentual no gráfico: ${value != null ? Number(value).toFixed(2) + '%' : '-'})` : ' - Detalhamento'}`;
                    const detailData = await carregarDetalhesTempoEntrega(cd || null, month || null, value);
                    let tableHTML = `
                        <div class="col-12">
                            <h2>${title}</h2>
                            <table class="table table-striped table-hover" id="detail-table">
                                <thead class="table-dark">
                                    <tr>
                                        <th>NUNOTA</th>
                                        <th>NUMNOTA</th>
                                        <th>CODEMP</th>
                                        <th>DTNEG</th>
                                        <th>Entrega_no_Prazo (dias)</th>
                                        <th>CODTIPOPER</th>
                                        <th>CODPARC</th>
                                        <th>NOMEPARC</th>
                                        <th>VLRNOTA</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                    if (detailData && detailData.length > 0) {
                        detailData.forEach(row => {
                            const nunota = row.NUNOTA ?? row.nunota ?? '';
                            const numnota = row.NUMNOTA ?? row.numnota ?? '';
                            const codemp = row.CODEMP ?? row.codemp ?? '';
                            const dtneg = row.DTNEG ?? row.dtneg ?? '';
                            const entregaPrazo = row.ENTREGA_NO_PRAZO != null ? row.ENTREGA_NO_PRAZO : row.entrega_no_prazo;
                            const codtipoper = row.CODTIPOPER ?? row.codtipoper ?? '';
                            const codparc = row.CODPARC ?? row.codparc ?? '';
                            const nomeparc = (row.NOMEPARC ?? row.nomeparc ?? '').toString();
                            const vlrnota = parseFloat(row.VLRNOTA ?? row.vlrnota ?? 0);
                            const entregaDisp = entregaPrazo != null && entregaPrazo !== '' && !isNaN(parseFloat(entregaPrazo))
                                ? Number(parseFloat(entregaPrazo)).toFixed(2) : '';
                            tableHTML += `
                                <tr>
                                    <td>${nunota}</td>
                                    <td>${numnota}</td>
                                    <td>${codemp}</td>
                                    <td>${formatDate(dtneg)}</td>
                                    <td>${entregaDisp}</td>
                                    <td>${codtipoper}</td>
                                    <td>${codparc}</td>
                                    <td>${nomeparc}</td>
                                    <td>${formatCurrency(vlrnota)}</td>
                                </tr>`;
                        });
                    } else {
                        tableHTML += `
                            <tr>
                                <td colspan="9" class="text-center">Nenhum registro encontrado para o período selecionado.</td>
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
                                        <th>PERC (%)</th>
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
                            const percRaw = row.PERC != null ? row.PERC : row.perc;
                            const percPct = (percRaw != null && !isNaN(parseFloat(percRaw))) ? (parseFloat(percRaw) * 100).toFixed(2) + '%' : '-';
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
                                </tr>`;
                        });
                    } else {
                        tableHTML += `
                            <tr>
                                <td colspan="9" class="text-center">Nenhum registro encontrado para o período selecionado.</td>
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
                                        <th>PERC (%)</th>
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
                            const percRaw = row.PERC != null ? row.PERC : row.perc;
                            const percPct = (percRaw != null && !isNaN(parseFloat(percRaw))) ? (parseFloat(percRaw) * 100).toFixed(2) + '%' : '-';
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
                                </tr>`;
                        });
                    } else {
                        tableHTML += `
                            <tr>
                                <td colspan="9" class="text-center">Nenhum registro encontrado para o período selecionado.</td>
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
                headStyles: { fillColor: [0, 138, 112] }
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
                el.textContent = 'Gerenciamento de processos — ' + fmt(dataIni) + ' a ' + fmt(dataFin);
            } else {
                el.textContent = 'Gerenciamento de processos';
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

                // Tempo de Entrega: card (% no prazo), gráfico mensal e detalhe TGFCAB
                await carregarTempoEntrega();
                await carregarTempoEntregaHistorico();

                // Custo Entrega: card % (TOP232+233)/TOP1101, gráfico mensal e detalhe por item (industria26)
                await carregarCustoEntrega();
                await carregarCustoEntregaHistorico();

                // Qualidade na Entrega: card (% pedidos), gráfico (evolução mensal consolidada) e detalhes TGFCAB
                await carregarQualidade();
                await carregarQualidadeHistorico();

                // Volume Realizado (Indústria): card (% TOTALUNID/QTDPREV), gráfico mensal e detalhes
                await carregarVolumeRealizado();
                await carregarVolumeRealizadoHistorico();

                // Ocupação Produção (Indústria): card (% médio TOTALUNID/290.000), gráfico mensal e detalhe por item
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
            // Tempo de Entrega: evolução mensal do % consolidado (pedidos no prazo / total)
            if (kpi === 'tempoEntrega' && tempoEntregaRealData && tempoEntregaRealData.length > 0 && filteredLabels.length > 0) {
                const filteredData = filteredIndices.map(function(mesIndex) {
                    return tempoEntregaRealData[mesIndex] != null ? tempoEntregaRealData[mesIndex] : null;
                });
                return {
                    labels: filteredLabels,
                    datasets: [{
                        label: 'Pedidos no prazo (%)',
                        data: filteredData,
                        borderColor: colors[0],
                        backgroundColor: colors[0] + '33',
                        tension: 0.4,
                        fill: false,
                        spanGaps: false
                    }]
                };
            }
            // Custo Entrega: série consolidada % (TOP232+233)/TOP1101 por mês no período (industria26)
            if (kpi === 'custoEntrega' && custoEntregaRealData && custoEntregaRealData.length > 0 && filteredLabels.length > 0) {
                const filteredData = filteredIndices.map(function(mesIndex) {
                    return custoEntregaRealData[mesIndex] != null ? custoEntregaRealData[mesIndex] : null;
                });
                return {
                    labels: filteredLabels,
                    datasets: [{
                        label: 'Custo Entrega (%)',
                        data: filteredData,
                        borderColor: colors[0],
                        backgroundColor: colors[0] + '33',
                        tension: 0.4,
                        fill: false,
                        spanGaps: false
                    }]
                };
            }
            // Qualidade na Entrega: evolução mensal do % consolidado (SUM(AD_FEEDBACK)/COUNT(NUNOTA))
            if (kpi === 'qualidade' && qualidadeRealData && qualidadeRealData.length > 0) {
                const filteredData = filteredIndices.map(mesIndex => qualidadeRealData[mesIndex] ?? null);
                return {
                    labels: filteredLabels,
                    datasets: [{
                        label: 'Consolidado',
                        data: filteredData,
                        borderColor: colors[0],
                        backgroundColor: colors[0] + '33',
                        tension: 0.4,
                        fill: false
                    }]
                };
            }
            // volumeRealizado: evolução mensal do % (TOTALUNID/QTDPREV)
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
            // ocupacaoProducao: evolução mensal do % (TOTALUNID/290.000)
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

            const tabId = container.closest('.tab-pane').id;
            const totalInTab = (tabToKpis[tabId] || []).length;
            const numSelected = selectedKPIs.size > 0 ? selectedKPIs.size : totalInTab;
            let colClass;
            if (numSelected === 1) {
                colClass = 'col-12';
            } else if (numSelected === 2) {
                colClass = 'col-lg-6 col-md-6';
            } else if (numSelected === 3) {
                colClass = 'col-lg-3 col-md-6';
            } else {
                colClass = 'col-md-3';
            }

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

        /** Coleta todos os valores numéricos das séries do gráfico (ignora null). */
        function getNumericChartValues(chartData) {
            const values = [];
            if (!chartData || !chartData.datasets) return values;
            chartData.datasets.forEach(function(ds) {
                (ds.data || []).forEach(function(v) {
                    if (v != null && v !== '' && !isNaN(Number(v))) values.push(Number(v));
                });
            });
            return values;
        }

        /**
         * Escala Y dinâmica: min/max com margem (~12%) para o valor não “sumir” nem ficar colado nas bordas.
         * KPIs em % ficam entre 0 e 100 quando os dados permitem; séries fora desse intervalo expandem o eixo.
         */
        function computeDynamicYScale(chartData, kpi) {
            const values = getNumericChartValues(chartData);
            if (values.length === 0) {
                return { beginAtZero: true };
            }
            const minV = Math.min.apply(null, values);
            const maxV = Math.max.apply(null, values);
            const span = maxV - minV;
            const pad = span === 0
                ? (Math.abs(maxV) < 1e-9 ? 1 : Math.max(Math.abs(maxV) * 0.12, 0.01))
                : span * 0.12;

            const pctLike = ['qualidade', 'tempoEntrega', 'formulacao', 'volumeRealizado', 'ocupacaoProducao', 'manutencaoPreventiva', 'manutencaoCorretiva', 'custoEntrega'].indexOf(kpi) !== -1;

            let yMin = minV - pad;
            let yMax = maxV + pad;

            if (pctLike) {
                yMin = Math.max(0, yMin);
                if (maxV <= 100) {
                    yMax = Math.min(100, yMax);
                    yMin = Math.min(yMin, yMax);
                }
            }

            if (yMin >= yMax) {
                const bump = Math.max(0.5, Math.abs(maxV || minV) * 0.08 || 0.5);
                yMin = minV - bump;
                yMax = maxV + bump;
                if (pctLike) {
                    yMin = Math.max(0, yMin);
                    if (maxV <= 100) yMax = Math.min(100, yMax);
                }
            }

            return { min: yMin, max: yMax, beginAtZero: false };
        }

        // Função para criar gráfico de linha
        function createLineChart(canvasId, chartData, kpi) {
            const ctx = document.getElementById(canvasId).getContext('2d');
            const yScale = computeDynamicYScale(chartData, kpi);
            const tooltipTempoEntrega = kpi === 'tempoEntrega' ? {
                callbacks: {
                    label: function(context) {
                        const v = context.parsed.y;
                        if (v === null || v === undefined) return 'Sem dados';
                        return context.dataset.label + ': ' + Number(v).toFixed(2) + '%';
                    }
                }
            } : {};
            const tooltipCustoEntrega = kpi === 'custoEntrega' ? {
                callbacks: {
                    label: function(context) {
                        const v = context.parsed.y;
                        if (v === null || v === undefined) return 'Sem dados';
                        return context.dataset.label + ': ' + Number(v).toFixed(2) + '%';
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
                            beginAtZero: yScale.beginAtZero === true,
                            ...(yScale.min != null && { min: yScale.min }),
                            ...(yScale.max != null && { max: yScale.max }),
                            ...(kpi === 'tempoEntrega' && {
                                ticks: { callback: function(v) { return v != null ? Number(v).toFixed(2) + '%' : ''; } }
                            }),
                            ...(kpi === 'custoEntrega' && {
                                ticks: { callback: function(v) { return v != null ? Number(v).toFixed(2) + '%' : ''; } }
                            }),
                            ...(kpi === 'qualidade' && {
                                ticks: { callback: function(v) { return v != null ? Number(v).toFixed(2) + '%' : ''; } }
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
                        tooltip: { ...tooltipTempoEntrega, ...tooltipCustoEntrega, ...tooltipQualidade, ...tooltipVolumeRealizado, ...tooltipOcupacaoProducao, ...tooltipManutencaoPreventiva, ...tooltipManutencaoCorretiva }
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
            aplicarDatasMesAtual();
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
