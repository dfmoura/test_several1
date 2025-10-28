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
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
<!-- SheetJS para exportação Excel -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<!-- jsPDF para exportação PDF -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>

<style>
    /* Estilos base */
    body {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        padding-top: 40px !important;
        min-height: 100vh;
    }

    /* Fixed header styles */
    .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 35px;
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
        width: 22px;
        height: auto;
        filter: brightness(0) invert(1);
        transition: transform 0.3s ease;
    }
    
    .header-logo img:hover {
        transform: scale(1.1);
    }
    
    .header-title {
        color: white;
        font-size: 1.0rem;
        font-weight: 700;
        margin: 0;
        text-align: center;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        letter-spacing: 1px;
    }

    /* Filtro dropdown */
    .filter-container {
        position: fixed;
        top: 40px;
        left: 0;
        right: 0;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(0, 138, 112, 0.1);
        padding: 6px 20px;
        z-index: 999;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .filter-label {
        font-size: 11px;
        font-weight: 600;
        color: #6e6e6e;
        margin-right: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .filter-dropdown {
        background: white;
        border: 1px solid rgba(0, 138, 112, 0.2);
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 12px;
        color: #2c3e50;
        font-weight: 500;
        min-width: 150px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    }

    .filter-dropdown:hover {
        border-color: #008a70;
        box-shadow: 0 3px 8px rgba(0, 138, 112, 0.15);
        transform: translateY(-1px);
    }

    .filter-dropdown:focus {
        outline: none;
        border-color: #008a70;
        box-shadow: 0 0 0 2px rgba(0, 138, 112, 0.2);
    }

    /* Container principal */
    .main-container {
        padding: 10px 20px;
        max-width: 1400px;
        margin: 0 auto;
        margin-top: 55px;
    }

    /* Cards superiores */
    .dashboard-card {
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        border: none;
        overflow: hidden;
        height: 110px;
        position: relative;
    }

    .dashboard-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    .dashboard-card .card-body {
        padding: 15px;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
    }

    .card-icon {
        position: absolute;
        top: 15px;
        right: 15px;
        width: 45px;
        height: 45px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        color: white;
    }

    .card-title {
        font-size: 13px;
        font-weight: 600;
        color: #6e6e6e;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .card-value {
        font-size: 20px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 4px;
        line-height: 1.1;
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
        margin-top: 0px;
    }

    .chart-container {
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        padding: 20px;
        margin-bottom: 20px;
        height: 380px;
    }

    .chart-title {
        font-size: 18px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 15px;
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
        height: 300px;
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
            font-size: 1.0rem;
        }
        
        .header-logo {
            left: 10px;
        }
        
        .header-logo img {
            width: 22px;
        }
        
        .fixed-header {
            height: 30px;
            padding: 0 10px;
        }
        
        body {
            padding-top: 35px !important;
        }

        .filter-container {
            top: 35px;
            padding: 5px 15px;
        }

        .main-container {
            margin-top: 50px;
        }

        .main-container {
            padding: 8px 15px;
        }

        .dashboard-card {
            height: 100px;
            margin-bottom: 15px;
        }

        .dashboard-card .card-body {
            padding: 12px;
        }

        .card-value {
            font-size: 18px;
        }

        .chart-container {
            padding: 15px;
            height: 320px;
        }

        .chart-wrapper {
            height: 250px;
        }
    }

    @media (max-width: 576px) {
        .main-container {
            padding: 6px 10px;
        }

        .dashboard-card {
            height: 90px;
        }

        .dashboard-card .card-body {
            padding: 10px;
        }

        .card-value {
            font-size: 16px;
        }

        .card-icon {
            width: 35px;
            height: 35px;
            font-size: 18px;
        }
    }

    /* Estilos para overlays e modais */
    .overlay-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        backdrop-filter: blur(4px);
    }

    .overlay-modal.show {
        display: flex;
    }

    .overlay-content {
        background: white;
        border-radius: 20px;
        padding: 0;
        max-width: 95vw;
        width: 95vw;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        animation: modalSlideIn 0.3s ease-out;
    }

    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .overlay-header {
        background: linear-gradient(135deg, #008a70, #00695e);
        color: white;
        padding: 20px 30px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: 20px 20px 0 0;
    }

    .overlay-title {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 15px;
    }

    .overlay-title i {
        font-size: 1.8rem;
    }

    .overlay-close {
        width: 40px;
        height: 40px;
        border: none;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        cursor: pointer;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        font-size: 18px;
    }

    .overlay-close:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
    }

    .overlay-toolbar {
        background: #f8f9fa;
        padding: 15px 30px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
    }

    .toolbar-left {
        display: flex;
        align-items: center;
        gap: 15px;
        flex: 1;
        min-width: 300px;
    }

    .toolbar-right {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .search-container {
        position: relative;
        flex: 1;
        max-width: 400px;
    }

    .search-input {
        width: 100%;
        padding: 10px 15px 10px 45px;
        border: 2px solid #e9ecef;
        border-radius: 10px;
        font-size: 14px;
        background: white;
        transition: all 0.3s;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    }

    .search-input:focus {
        outline: none;
        border-color: #008a70;
        box-shadow: 0 0 0 3px rgba(0, 138, 112, 0.1);
    }

    .search-icon {
        position: absolute;
        left: 15px;
        top: 50%;
        transform: translateY(-50%);
        color: #6c757d;
        font-size: 14px;
    }

    .btn-overlay {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border: 2px solid #e9ecef;
        border-radius: 10px;
        background: white;
        color: #495057;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
        text-decoration: none;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    }

    .btn-overlay:hover {
        background: #f8f9fa;
        border-color: #dee2e6;
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }

    .btn-overlay.btn-success {
        background: #50af32;
        border-color: #50af32;
        color: white;
    }

    .btn-overlay.btn-success:hover {
        background: #45a02a;
        border-color: #45a02a;
        box-shadow: 0 4px 12px rgba(80, 175, 50, 0.3);
    }

    .btn-overlay.btn-primary {
        background: #008a70;
        border-color: #008a70;
        color: white;
    }

    .btn-overlay.btn-primary:hover {
        background: #00695e;
        border-color: #00695e;
        box-shadow: 0 4px 12px rgba(0, 138, 112, 0.3);
    }

    .overlay-info {
        background: #f8f9fa;
        padding: 12px 30px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 15px;
    }

    .info-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #6c757d;
    }

    .info-value {
        font-weight: 600;
        color: #495057;
    }

    .overlay-table-container {
        overflow-x: auto;
        position: relative;
        background: white;
        max-height: 50vh;
        overflow-y: auto;
    }

    .overlay-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
        background: white;
    }

    .overlay-table thead {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .overlay-table th {
        padding: 15px 20px;
        text-align: left;
        font-weight: 600;
        color: #495057;
        border-bottom: 2px solid #dee2e6;
        white-space: nowrap;
        position: relative;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .overlay-table th.sortable {
        cursor: pointer;
        user-select: none;
        transition: all 0.2s;
        padding-right: 40px;
    }

    .overlay-table th.sortable:hover {
        background: #e9ecef;
        color: #008a70;
    }

    .sort-icon {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #6c757d;
        font-size: 12px;
        transition: all 0.2s;
    }

    .overlay-table th.sortable:hover .sort-icon {
        color: #008a70;
    }

    .overlay-table td {
        padding: 15px 20px;
        border-bottom: 1px solid #f1f3f4;
        vertical-align: middle;
        color: #495057;
    }

    .overlay-table tbody tr {
        transition: all 0.15s;
    }

    .overlay-table tbody tr:hover {
        background: linear-gradient(135deg, rgba(0, 138, 112, 0.02) 0%, rgba(0, 138, 112, 0.05) 100%);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .overlay-footer {
        background: #f8f9fa;
        padding: 15px 30px;
        border-top: 1px solid #e9ecef;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
    }

    .footer-left {
        display: flex;
        align-items: center;
        gap: 20px;
    }

    .footer-right {
        display: flex;
        align-items: center;
        gap: 15px;
    }

    .page-info {
        font-size: 14px;
        color: #6c757d;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .page-size-select {
        padding: 8px 12px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        background: white;
        font-size: 14px;
        color: #495057;
        cursor: pointer;
        transition: all 0.2s;
    }

    .page-size-select:focus {
        outline: none;
        border-color: #008a70;
    }

    .pagination {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .page-btn {
        width: 36px;
        height: 36px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        background: white;
        color: #6c757d;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        font-size: 14px;
        font-weight: 500;
    }

    .page-btn:hover:not(:disabled) {
        background: #008a70;
        border-color: #008a70;
        color: white;
        transform: translateY(-1px);
    }

    .page-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .page-btn.active {
        background: #008a70;
        border-color: #008a70;
        color: white;
        box-shadow: 0 2px 8px rgba(0, 138, 112, 0.3);
    }

    .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 100;
        backdrop-filter: blur(2px);
    }

    .loading-overlay.show {
        display: flex;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #e9ecef;
        border-top: 4px solid #008a70;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Badges para status */
    .badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        border: 1px solid transparent;
    }

    .badge-success {
        background: rgba(80, 175, 50, 0.1);
        color: #50af32;
        border-color: rgba(80, 175, 50, 0.2);
    }

    .badge-warning {
        background: rgba(255, 185, 20, 0.1);
        color: #cc9200;
        border-color: rgba(255, 185, 20, 0.2);
    }

    .badge-danger {
        background: rgba(227, 6, 19, 0.1);
        color: #e30613;
        border-color: rgba(227, 6, 19, 0.2);
    }

    .badge-info {
        background: rgba(0, 180, 205, 0.1);
        color: #00b4cd;
        border-color: rgba(0, 180, 205, 0.2);
    }

    .badge-neutral {
        background: #f8f9fa;
        color: #6c757d;
        border-color: #dee2e6;
    }

    /* Cursor pointer para cards clicáveis */
    .dashboard-card {
        cursor: pointer;
    }

    .dashboard-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    /* Responsividade para overlays */
    @media (max-width: 768px) {
        .overlay-content {
            width: 98vw;
            max-height: 95vh;
        }

        .overlay-header {
            padding: 15px 20px;
        }

        .overlay-title {
            font-size: 1.2rem;
        }

        .overlay-toolbar {
            padding: 12px 20px;
            flex-direction: column;
            align-items: stretch;
        }

        .toolbar-left,
        .toolbar-right {
            justify-content: center;
        }

        .search-container {
            max-width: none;
        }

        .overlay-info {
            padding: 10px 20px;
            flex-direction: column;
            align-items: stretch;
        }

        .overlay-footer {
            padding: 12px 20px;
            flex-direction: column;
            align-items: stretch;
        }

        .footer-left,
        .footer-right {
            justify-content: center;
        }

        .overlay-table th,
        .overlay-table td {
            padding: 12px 15px;
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

    <!-- Filtro Dropdown -->
    <div class="filter-container">
        <span class="filter-label">Fechamento:</span>
        <select class="filter-dropdown" id="fechamentoFilter">
            <option value="">Carregando...</option>
        </select>
    </div>

    <div class="main-container">
        <!-- Cards Superiores -->
        <div class="row mb-0">
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card dashboard-card card-faturamento" onclick="openFaturamentoOverlay()">
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

            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card dashboard-card card-meta" onclick="openMetaOverlay()">
                    <div class="card-body">
                        <div class="card-icon">
                            <i class="fas fa-bullseye"></i>
                        </div>
                        <div>
                            <div class="card-title">Meta</div>
                            <div class="card-value" id="meta-valor">R$ 0,00</div>
                            <div class="card-subtitle">Valor Previsto</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card dashboard-card card-atingido" onclick="openAtingidoOverlay()">
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

            <div class="col-lg-3 col-md-6 mb-3">
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
                <div class="col-lg-6 mb-3">
                    <div class="chart-container">
                        <h3 class="chart-title">Real x Meta - Evolução Mensal</h3>
                        <div class="chart-wrapper">
                            <canvas id="lineChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Gráfico de Colunas - Top 10 Vendedores -->
                <div class="col-lg-6 mb-3">
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

    <!-- Overlay Modal para Faturamento -->
    <div class="overlay-modal" id="faturamentoModal">
        <div class="overlay-content">
            <div class="overlay-header">
                <h2 class="overlay-title">
                    <i class="fas fa-chart-line"></i>
                    Detalhamento do Faturamento
                </h2>
                <button class="overlay-close" onclick="closeOverlay('faturamentoModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="overlay-toolbar">
                <div class="toolbar-left">
                    <div class="search-container">
                        <i class="fas fa-search search-icon"></i>
                        <input type="text" id="faturamentoSearch" class="search-input" 
                               placeholder="Buscar por vendedor, código...">
                    </div>
                    <button class="btn-overlay" onclick="refreshFaturamentoData()">
                        <i class="fas fa-sync-alt"></i>
                        Atualizar
                    </button>
                </div>
                <div class="toolbar-right">
                    <button class="btn-overlay btn-success" onclick="exportFaturamentoToExcel()">
                        <i class="fas fa-file-excel"></i>
                        Excel
                    </button>
                    <button class="btn-overlay btn-primary" onclick="exportFaturamentoToPDF()">
                        <i class="fas fa-file-pdf"></i>
                        PDF
                    </button>
                </div>
            </div>

            <div class="overlay-info">
                <div class="info-item">
                    <i class="fas fa-database"></i>
                    <span>Total de registros:</span>
                    <span class="info-value" id="faturamentoTotalRecords">0</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-eye"></i>
                    <span>Registros visíveis:</span>
                    <span class="info-value" id="faturamentoVisibleRecords">0</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span>Última atualização:</span>
                    <span class="info-value" id="faturamentoLastUpdate">-</span>
                </div>
            </div>

            <div class="overlay-table-container">
                <div class="loading-overlay" id="faturamentoLoadingOverlay">
                    <div class="spinner"></div>
                </div>
                
                <table class="overlay-table" id="faturamentoTable">
                    <thead>
                        <tr>
                            <th class="sortable" data-sort="codvend" onclick="sortFaturamentoTable('codvend')">
                                Código Vendedor <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable" data-sort="apelido" onclick="sortFaturamentoTable('apelido')">
                                Vendedor <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="qtdprev" onclick="sortFaturamentoTable('qtdprev')">
                                Qtd Prevista <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="qtdreal" onclick="sortFaturamentoTable('qtdreal')">
                                Qtd Real <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="vlr_prev" onclick="sortFaturamentoTable('vlr_prev')">
                                Valor Previsto <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="vlr_real" onclick="sortFaturamentoTable('vlr_real')">
                                Valor Real <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="perc" onclick="sortFaturamentoTable('perc')">
                                % Atingido <i class="fas fa-sort sort-icon"></i>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="faturamentoTableBody">
                        <!-- Dados serão inseridos via JavaScript -->
                    </tbody>
                </table>
            </div>

            <div class="overlay-footer">
                <div class="footer-left">
                    <div class="page-info">
                        <i class="fas fa-info-circle"></i>
                        <span id="faturamentoPageInfo">Mostrando 0-0 de 0 registros</span>
                    </div>
                    <select class="page-size-select" id="faturamentoPageSize" onchange="changeFaturamentoPageSize()">
                        <option value="10">10 por página</option>
                        <option value="25" selected>25 por página</option>
                        <option value="50">50 por página</option>
                        <option value="100">100 por página</option>
                    </select>
                </div>
                <div class="footer-right">
                    <div class="pagination" id="faturamentoPagination">
                        <!-- Botões de paginação serão inseridos via JavaScript -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Overlay Modal para Meta -->
    <div class="overlay-modal" id="metaModal">
        <div class="overlay-content">
            <div class="overlay-header">
                <h2 class="overlay-title">
                    <i class="fas fa-bullseye"></i>
                    Detalhamento da Meta
                </h2>
                <button class="overlay-close" onclick="closeOverlay('metaModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="overlay-toolbar">
                <div class="toolbar-left">
                    <div class="search-container">
                        <i class="fas fa-search search-icon"></i>
                        <input type="text" id="metaSearch" class="search-input" 
                               placeholder="Buscar por vendedor, código...">
                    </div>
                    <button class="btn-overlay" onclick="refreshMetaData()">
                        <i class="fas fa-sync-alt"></i>
                        Atualizar
                    </button>
                </div>
                <div class="toolbar-right">
                    <button class="btn-overlay btn-success" onclick="exportMetaToExcel()">
                        <i class="fas fa-file-excel"></i>
                        Excel
                    </button>
                    <button class="btn-overlay btn-primary" onclick="exportMetaToPDF()">
                        <i class="fas fa-file-pdf"></i>
                        PDF
                    </button>
                </div>
            </div>

            <div class="overlay-info">
                <div class="info-item">
                    <i class="fas fa-database"></i>
                    <span>Total de registros:</span>
                    <span class="info-value" id="metaTotalRecords">0</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-eye"></i>
                    <span>Registros visíveis:</span>
                    <span class="info-value" id="metaVisibleRecords">0</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span>Última atualização:</span>
                    <span class="info-value" id="metaLastUpdate">-</span>
                </div>
            </div>

            <div class="overlay-table-container">
                <div class="loading-overlay" id="metaLoadingOverlay">
                    <div class="spinner"></div>
                </div>
                
                <table class="overlay-table" id="metaTable">
                    <thead>
                        <tr>
                            <th class="sortable" data-sort="codvend" onclick="sortMetaTable('codvend')">
                                Código Vendedor <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable" data-sort="apelido" onclick="sortMetaTable('apelido')">
                                Vendedor <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="qtdprev" onclick="sortMetaTable('qtdprev')">
                                Qtd Prevista <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="qtdreal" onclick="sortMetaTable('qtdreal')">
                                Qtd Real <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="vlr_prev" onclick="sortMetaTable('vlr_prev')">
                                Valor Previsto <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="vlr_real" onclick="sortMetaTable('vlr_real')">
                                Valor Real <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="perc" onclick="sortMetaTable('perc')">
                                % Atingido <i class="fas fa-sort sort-icon"></i>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="metaTableBody">
                        <!-- Dados serão inseridos via JavaScript -->
                    </tbody>
                </table>
            </div>

            <div class="overlay-footer">
                <div class="footer-left">
                    <div class="page-info">
                        <i class="fas fa-info-circle"></i>
                        <span id="metaPageInfo">Mostrando 0-0 de 0 registros</span>
                    </div>
                    <select class="page-size-select" id="metaPageSize" onchange="changeMetaPageSize()">
                        <option value="10">10 por página</option>
                        <option value="25" selected>25 por página</option>
                        <option value="50">50 por página</option>
                        <option value="100">100 por página</option>
                    </select>
                </div>
                <div class="footer-right">
                    <div class="pagination" id="metaPagination">
                        <!-- Botões de paginação serão inseridos via JavaScript -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Overlay Modal para % Atingido -->
    <div class="overlay-modal" id="atingidoModal">
        <div class="overlay-content">
            <div class="overlay-header">
                <h2 class="overlay-title">
                    <i class="fas fa-percentage"></i>
                    Detalhamento do % Atingido
                </h2>
                <button class="overlay-close" onclick="closeOverlay('atingidoModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="overlay-toolbar">
                <div class="toolbar-left">
                    <div class="search-container">
                        <i class="fas fa-search search-icon"></i>
                        <input type="text" id="atingidoSearch" class="search-input" 
                               placeholder="Buscar por vendedor, código...">
                    </div>
                    <button class="btn-overlay" onclick="refreshAtingidoData()">
                        <i class="fas fa-sync-alt"></i>
                        Atualizar
                    </button>
                </div>
                <div class="toolbar-right">
                    <button class="btn-overlay btn-success" onclick="exportAtingidoToExcel()">
                        <i class="fas fa-file-excel"></i>
                        Excel
                    </button>
                    <button class="btn-overlay btn-primary" onclick="exportAtingidoToPDF()">
                        <i class="fas fa-file-pdf"></i>
                        PDF
                    </button>
                </div>
            </div>

            <div class="overlay-info">
                <div class="info-item">
                    <i class="fas fa-database"></i>
                    <span>Total de registros:</span>
                    <span class="info-value" id="atingidoTotalRecords">0</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-eye"></i>
                    <span>Registros visíveis:</span>
                    <span class="info-value" id="atingidoVisibleRecords">0</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span>Última atualização:</span>
                    <span class="info-value" id="atingidoLastUpdate">-</span>
                </div>
            </div>

            <div class="overlay-table-container">
                <div class="loading-overlay" id="atingidoLoadingOverlay">
                    <div class="spinner"></div>
                </div>
                
                <table class="overlay-table" id="atingidoTable">
                    <thead>
                        <tr>
                            <th class="sortable" data-sort="codvend" onclick="sortAtingidoTable('codvend')">
                                Código Vendedor <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable" data-sort="apelido" onclick="sortAtingidoTable('apelido')">
                                Vendedor <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="qtdprev" onclick="sortAtingidoTable('qtdprev')">
                                Qtd Prevista <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="qtdreal" onclick="sortAtingidoTable('qtdreal')">
                                Qtd Real <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="vlr_prev" onclick="sortAtingidoTable('vlr_prev')">
                                Valor Previsto <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="vlr_real" onclick="sortAtingidoTable('vlr_real')">
                                Valor Real <i class="fas fa-sort sort-icon"></i>
                            </th>
                            <th class="sortable text-right" data-sort="perc" onclick="sortAtingidoTable('perc')">
                                % Atingido <i class="fas fa-sort sort-icon"></i>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="atingidoTableBody">
                        <!-- Dados serão inseridos via JavaScript -->
                    </tbody>
                </table>
            </div>

            <div class="overlay-footer">
                <div class="footer-left">
                    <div class="page-info">
                        <i class="fas fa-info-circle"></i>
                        <span id="atingidoPageInfo">Mostrando 0-0 de 0 registros</span>
                    </div>
                    <select class="page-size-select" id="atingidoPageSize" onchange="changeAtingidoPageSize()">
                        <option value="10">10 por página</option>
                        <option value="25" selected>25 por página</option>
                        <option value="50">50 por página</option>
                        <option value="100">100 por página</option>
                    </select>
                </div>
                <div class="footer-right">
                    <div class="pagination" id="atingidoPagination">
                        <!-- Botões de paginação serão inseridos via JavaScript -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Variáveis globais para os gráficos
        let lineChart = null;
        let barChart = null;
        
        // Variável global para o código de fechamento selecionado
        let codFechSelecionado = 1;

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

        // Função para carregar dados do dropdown de fechamento
        async function loadFechamentoDropdown() {
            try {
                if (typeof JX === 'undefined' || !JX.consultar) {
                    console.error('SankhyaJX não está disponível para carregar dropdown');
                    return;
                }

                const sql = `
                    SELECT
                        codfech,
                        descr
                    FROM AD_FECHAPLUS
                    ORDER BY codfech
                `;

                const data = await JX.consultar(sql);
                const dropdown = document.getElementById('fechamentoFilter');
                
                // Limpar opções existentes
                dropdown.innerHTML = '';
                
                if (data && data.length > 0) {
                    data.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.CODFECH;
                        option.textContent = `${item.CODFECH} - ${item.DESCR}`;
                        dropdown.appendChild(option);
                    });
                    
                    // Selecionar o primeiro item por padrão
                    dropdown.value = data[0].CODFECH;
                    codFechSelecionado = data[0].CODFECH;
                } else {
                    dropdown.innerHTML = '<option value="">Nenhum registro encontrado</option>';
                }

            } catch (error) {
                console.error('Erro ao carregar dropdown de fechamento:', error);
                document.getElementById('fechamentoFilter').innerHTML = '<option value="">Erro ao carregar</option>';
            }
        }

        // Função para atualizar filtro
        function updateFechamentoFilter() {
            const dropdown = document.getElementById('fechamentoFilter');
            codFechSelecionado = dropdown.value;
            
            // Recarregar todos os dados com o novo filtro
            initializeDashboard();
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
                                (SELECT INISAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado})
                            AND (SELECT FINSAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado}))
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
                    WHERE CODFECH = ${codFechSelecionado}
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

        // Função para carregar dados do gráfico de linha
        async function loadLineChartData() {
            try {
                // Verificar se JX está disponível
                if (typeof JX === 'undefined' || !JX.consultar) {
                    console.error('SankhyaJX não está disponível para o gráfico');
                    return;
                }

                // Query para dados mensais do gráfico
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
                                (SELECT INISAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado})
                            AND (SELECT FINSAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado}))
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

                const data = await JX.consultar(sql);

                if (data && data.length > 0) {
                    const labels = data.map(item => item.MES_ANO);
                    const realData = data.map(item => parseFloat(item.VLR_REAL) || 0);
                    const metaData = data.map(item => parseFloat(item.VLR_PREV) || 0);

                    createLineChart(labels, realData, metaData);
                } else {
                    console.warn('Nenhum dado encontrado para o gráfico de linha');
                }

            } catch (error) {
                console.error('Erro ao carregar dados do gráfico de linha:', error);
            }
        }

        // Função para criar gráfico de linha
        function createLineChart(labels, realData, metaData) {
            // Verificar se os dados são válidos
            if (!labels || !realData || !metaData || labels.length === 0) {
                console.warn('Dados inválidos para o gráfico de linha');
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

        // Função para carregar dados do gráfico de colunas
        async function loadBarChartData() {
            try {
                // Verificar se JX está disponível
                if (typeof JX === 'undefined' || !JX.consultar) {
                    console.error('SankhyaJX não está disponível para o gráfico de colunas');
                    return;
                }

                // Query baseada na query_vededor_metaXreal_top10.sql
                const sql = `
                    SELECT
                        CODVEND,
                        SUBSTR(APELIDO, 1, 7) AS APELIDO,
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
                        GROUP BY 
                            CODVEND,
                            APELIDO
                        ORDER BY 6 DESC
                    ) WHERE ROWNUM < 11
                `;

                console.log('Executando consulta SQL para gráfico de colunas...');
                const data = await JX.consultar(sql);
                console.log('Dados recebidos para gráfico de colunas:', data);

                if (data && data.length > 0) {
                    const labels = data.map(item => `${item.CODVEND} - ${item.APELIDO}`);
                    const realData = data.map(item => parseFloat(item.VLR_REAL) || 0);
                    const metaData = data.map(item => parseFloat(item.VLR_PREV) || 0);

                    createBarChart(labels, realData, metaData);
                } else {
                    console.warn('Nenhum dado encontrado para o gráfico de colunas');
                }

            } catch (error) {
                console.error('Erro ao carregar dados do gráfico de colunas:', error);
            }
        }

        // Função para criar gráfico de colunas
        function createBarChart(labels, realData, metaData) {
            console.log('Criando gráfico de colunas com dados:', { labels, realData, metaData });
            
            // Verificar se os dados são válidos
            if (!labels || !realData || !metaData || labels.length === 0) {
                console.warn('Dados inválidos para o gráfico de colunas');
                return;
            }

            // Destruir gráfico anterior se existir
            if (barChart) {
                barChart.destroy();
                barChart = null;
            }

            // Verificar se Chart.js está disponível
            if (typeof Chart === 'undefined') {
                console.error('Chart.js não está carregado');
                return;
            }
            
            const ctx = document.getElementById('barChart').getContext('2d');
            
            barChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Real',
                            data: realData,
                            backgroundColor: 'rgba(0, 138, 112, 0.8)',
                            borderColor: '#008a70',
                            borderWidth: 2,
                            borderRadius: 4,
                            borderSkipped: false,
                        },
                        {
                            label: 'Meta',
                            data: metaData,
                            backgroundColor: 'rgba(0, 175, 160, 0.8)',
                            borderColor: '#00afa0',
                            borderWidth: 2,
                            borderRadius: 4,
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
                                text: 'Vendedores',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            },
                            grid: {
                                display: false
                            },
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45,
                                font: {
                                    size: 10
                                }
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

        // Função principal de inicialização
        async function initializeDashboard() {
            try {
                await loadCardsData();
                await loadLineChartData();
                await loadBarChartData();
            } catch (error) {
                console.error('Erro ao inicializar dashboard:', error);
            }
        }

        // Inicializar quando a página carregar
        document.addEventListener('DOMContentLoaded', function() {
            // Aguardar um pouco para garantir que o SankhyaJX esteja carregado
            setTimeout(async function() {
                await loadFechamentoDropdown();
                await initializeDashboard();
            }, 500);
            
            // Event listener para o dropdown de fechamento
            document.getElementById('fechamentoFilter').addEventListener('change', updateFechamentoFilter);
        });

        // Função para atualizar dados (pode ser chamada externamente)
        window.refreshDashboard = function() {
            initializeDashboard();
        };

        // Auto-refresh a cada 5 minutos
        setInterval(function() {
            initializeDashboard();
        }, 300000);

        // ===== FUNÇÕES DOS OVERLAYS =====

        // Estados dos overlays
        const overlayStates = {
            faturamento: {
                data: [],
                filteredData: [],
                currentPage: 1,
                pageSize: 25,
                sortField: null,
                sortDirection: 'asc',
                searchTerm: '',
                lastUpdate: new Date()
            },
            meta: {
                data: [],
                filteredData: [],
                currentPage: 1,
                pageSize: 25,
                sortField: null,
                sortDirection: 'asc',
                searchTerm: '',
                lastUpdate: new Date()
            },
            atingido: {
                data: [],
                filteredData: [],
                currentPage: 1,
                pageSize: 25,
                sortField: null,
                sortDirection: 'asc',
                searchTerm: '',
                lastUpdate: new Date()
            }
        };

        // Função para abrir overlay de faturamento
        function openFaturamentoOverlay() {
            document.getElementById('faturamentoModal').classList.add('show');
            loadFaturamentoData();
        }

        // Função para abrir overlay de meta
        function openMetaOverlay() {
            document.getElementById('metaModal').classList.add('show');
            loadMetaData();
        }

        // Função para abrir overlay de % atingido
        function openAtingidoOverlay() {
            document.getElementById('atingidoModal').classList.add('show');
            loadAtingidoData();
        }

        // Função para fechar overlays
        function closeOverlay(modalId) {
            document.getElementById(modalId).classList.remove('show');
        }

        // Função para carregar dados do faturamento
        async function loadFaturamentoData() {
            try {
                showOverlayLoading('faturamentoLoadingOverlay');
                
                if (typeof JX === 'undefined' || !JX.consultar) {
                    console.error('SankhyaJX não está disponível');
                    return;
                }

                const sql = `
                    SELECT
                        CODVEND,
                        APELIDO,
                        SUM(QTDPREV) AS QTDPREV,
                        SUM(QTDREAL) AS QTDREAL,
                        SUM(QTDPREV * PRECOLT) AS VLR_PREV,
                        SUM(NVL(VLRREAL, 0)) AS VLR_REAL,
                        CASE WHEN SUM(QTDPREV) = 0 THEN 0 ELSE SUM(QTDREAL) * 100 / NULLIF(SUM(QTDPREV), 0) END AS PERC
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
                            (SELECT INISAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado})
                        AND (SELECT FINSAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado}))
                        AND (
                            CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) 
                            OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO)
                            OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.AD_COORDENADOR AND USU.CODUSU = STP_GET_CODUSULOGADO)
                            OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' 
                        )
                    GROUP BY
                        CODVEND,
                        APELIDO
                    ORDER BY VLR_REAL DESC
                `;

                const data = await JX.consultar(sql);
                
                if (data && data.length > 0) {
                    overlayStates.faturamento.data = data.map(item => ({
                        codvend: item.CODVEND,
                        apelido: item.APELIDO,
                        qtdprev: parseFloat(item.QTDPREV) || 0,
                        qtdreal: parseFloat(item.QTDREAL) || 0,
                        vlr_prev: parseFloat(item.VLR_PREV) || 0,
                        vlr_real: parseFloat(item.VLR_REAL) || 0,
                        perc: parseFloat(item.PERC) || 0
                    }));
                    
                    overlayStates.faturamento.filteredData = [...overlayStates.faturamento.data];
                    overlayStates.faturamento.lastUpdate = new Date();
                    
                    renderFaturamentoTable();
                    updateFaturamentoInfo();
                } else {
                    overlayStates.faturamento.data = [];
                    overlayStates.faturamento.filteredData = [];
                    renderFaturamentoTable();
                    updateFaturamentoInfo();
                }

                hideOverlayLoading('faturamentoLoadingOverlay');
                
            } catch (error) {
                console.error('Erro ao carregar dados do faturamento:', error);
                hideOverlayLoading('faturamentoLoadingOverlay');
            }
        }

        // Função para carregar dados da meta (mesma query)
        async function loadMetaData() {
            try {
                showOverlayLoading('metaLoadingOverlay');
                
                if (typeof JX === 'undefined' || !JX.consultar) {
                    console.error('SankhyaJX não está disponível');
                    return;
                }

                const sql = `
                    SELECT
                        CODVEND,
                        APELIDO,
                        SUM(QTDPREV) AS QTDPREV,
                        SUM(QTDREAL) AS QTDREAL,
                        SUM(QTDPREV * PRECOLT) AS VLR_PREV,
                        SUM(NVL(VLRREAL, 0)) AS VLR_REAL,
                        CASE WHEN SUM(QTDPREV) = 0 THEN 0 ELSE SUM(QTDREAL) * 100 / NULLIF(SUM(QTDPREV), 0) END AS PERC
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
                            (SELECT INISAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado})
                        AND (SELECT FINSAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado}))
                        AND (
                            CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) 
                            OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO)
                            OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.AD_COORDENADOR AND USU.CODUSU = STP_GET_CODUSULOGADO)
                            OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' 
                        )
                    GROUP BY
                        CODVEND,
                        APELIDO
                    ORDER BY VLR_PREV DESC
                `;

                const data = await JX.consultar(sql);
                
                if (data && data.length > 0) {
                    overlayStates.meta.data = data.map(item => ({
                        codvend: item.CODVEND,
                        apelido: item.APELIDO,
                        qtdprev: parseFloat(item.QTDPREV) || 0,
                        qtdreal: parseFloat(item.QTDREAL) || 0,
                        vlr_prev: parseFloat(item.VLR_PREV) || 0,
                        vlr_real: parseFloat(item.VLR_REAL) || 0,
                        perc: parseFloat(item.PERC) || 0
                    }));
                    
                    overlayStates.meta.filteredData = [...overlayStates.meta.data];
                    overlayStates.meta.lastUpdate = new Date();
                    
                    renderMetaTable();
                    updateMetaInfo();
                } else {
                    overlayStates.meta.data = [];
                    overlayStates.meta.filteredData = [];
                    renderMetaTable();
                    updateMetaInfo();
                }

                hideOverlayLoading('metaLoadingOverlay');
                
            } catch (error) {
                console.error('Erro ao carregar dados da meta:', error);
                hideOverlayLoading('metaLoadingOverlay');
            }
        }

        // Função para carregar dados do % atingido (mesma query)
        async function loadAtingidoData() {
            try {
                showOverlayLoading('atingidoLoadingOverlay');
                
                if (typeof JX === 'undefined' || !JX.consultar) {
                    console.error('SankhyaJX não está disponível');
                    return;
                }

                const sql = `
                    SELECT
                        CODVEND,
                        APELIDO,
                        SUM(QTDPREV) AS QTDPREV,
                        SUM(QTDREAL) AS QTDREAL,
                        SUM(QTDPREV * PRECOLT) AS VLR_PREV,
                        SUM(NVL(VLRREAL, 0)) AS VLR_REAL,
                        CASE WHEN SUM(QTDPREV) = 0 THEN 0 ELSE SUM(QTDREAL) * 100 / NULLIF(SUM(QTDPREV), 0) END AS PERC
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
                            (SELECT INISAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado})
                        AND (SELECT FINSAFRA FROM AD_FECHAPLUS WHERE CODFECH = ${codFechSelecionado}))
                        AND (
                            CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) 
                            OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO)
                            OR CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.AD_COORDENADOR AND USU.CODUSU = STP_GET_CODUSULOGADO)
                            OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' 
                        )
                    GROUP BY
                        CODVEND,
                        APELIDO
                    ORDER BY PERC DESC
                `;

                const data = await JX.consultar(sql);
                
                if (data && data.length > 0) {
                    overlayStates.atingido.data = data.map(item => ({
                        codvend: item.CODVEND,
                        apelido: item.APELIDO,
                        qtdprev: parseFloat(item.QTDPREV) || 0,
                        qtdreal: parseFloat(item.QTDREAL) || 0,
                        vlr_prev: parseFloat(item.VLR_PREV) || 0,
                        vlr_real: parseFloat(item.VLR_REAL) || 0,
                        perc: parseFloat(item.PERC) || 0
                    }));
                    
                    overlayStates.atingido.filteredData = [...overlayStates.atingido.data];
                    overlayStates.atingido.lastUpdate = new Date();
                    
                    renderAtingidoTable();
                    updateAtingidoInfo();
                } else {
                    overlayStates.atingido.data = [];
                    overlayStates.atingido.filteredData = [];
                    renderAtingidoTable();
                    updateAtingidoInfo();
                }

                hideOverlayLoading('atingidoLoadingOverlay');
                
            } catch (error) {
                console.error('Erro ao carregar dados do % atingido:', error);
                hideOverlayLoading('atingidoLoadingOverlay');
            }
        }

        // Funções de loading
        function showOverlayLoading(loadingId) {
            document.getElementById(loadingId).classList.add('show');
        }

        function hideOverlayLoading(loadingId) {
            document.getElementById(loadingId).classList.remove('show');
        }

        // Funções de renderização das tabelas
        function renderFaturamentoTable() {
            const tbody = document.getElementById('faturamentoTableBody');
            const startIndex = (overlayStates.faturamento.currentPage - 1) * overlayStates.faturamento.pageSize;
            const endIndex = startIndex + overlayStates.faturamento.pageSize;
            const pageData = overlayStates.faturamento.filteredData.slice(startIndex, endIndex);
            
            tbody.innerHTML = '';
            
            pageData.forEach((item, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="font-mono font-semibold">${item.codvend}</td>
                    <td>${item.apelido}</td>
                    <td class="text-right font-semibold">${item.qtdprev.toLocaleString('pt-BR')}</td>
                    <td class="text-right font-semibold">${item.qtdreal.toLocaleString('pt-BR')}</td>
                    <td class="text-right font-semibold">${formatCurrency(item.vlr_prev)}</td>
                    <td class="text-right font-semibold">${formatCurrency(item.vlr_real)}</td>
                    <td class="text-right">${getPercentualBadge(item.perc)}</td>
                `;
                tbody.appendChild(row);
            });
            
            updateFaturamentoPageInfo();
            renderFaturamentoPagination();
        }

        function renderMetaTable() {
            const tbody = document.getElementById('metaTableBody');
            const startIndex = (overlayStates.meta.currentPage - 1) * overlayStates.meta.pageSize;
            const endIndex = startIndex + overlayStates.meta.pageSize;
            const pageData = overlayStates.meta.filteredData.slice(startIndex, endIndex);
            
            tbody.innerHTML = '';
            
            pageData.forEach((item, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="font-mono font-semibold">${item.codvend}</td>
                    <td>${item.apelido}</td>
                    <td class="text-right font-semibold">${item.qtdprev.toLocaleString('pt-BR')}</td>
                    <td class="text-right font-semibold">${item.qtdreal.toLocaleString('pt-BR')}</td>
                    <td class="text-right font-semibold">${formatCurrency(item.vlr_prev)}</td>
                    <td class="text-right font-semibold">${formatCurrency(item.vlr_real)}</td>
                    <td class="text-right">${getPercentualBadge(item.perc)}</td>
                `;
                tbody.appendChild(row);
            });
            
            updateMetaPageInfo();
            renderMetaPagination();
        }

        function renderAtingidoTable() {
            const tbody = document.getElementById('atingidoTableBody');
            const startIndex = (overlayStates.atingido.currentPage - 1) * overlayStates.atingido.pageSize;
            const endIndex = startIndex + overlayStates.atingido.pageSize;
            const pageData = overlayStates.atingido.filteredData.slice(startIndex, endIndex);
            
            tbody.innerHTML = '';
            
            pageData.forEach((item, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="font-mono font-semibold">${item.codvend}</td>
                    <td>${item.apelido}</td>
                    <td class="text-right font-semibold">${item.qtdprev.toLocaleString('pt-BR')}</td>
                    <td class="text-right font-semibold">${item.qtdreal.toLocaleString('pt-BR')}</td>
                    <td class="text-right font-semibold">${formatCurrency(item.vlr_prev)}</td>
                    <td class="text-right font-semibold">${formatCurrency(item.vlr_real)}</td>
                    <td class="text-right">${getPercentualBadge(item.perc)}</td>
                `;
                tbody.appendChild(row);
            });
            
            updateAtingidoPageInfo();
            renderAtingidoPagination();
        }

        // Função para criar badge de percentual
        function getPercentualBadge(perc) {
            let badgeClass = 'badge-neutral';
            if (perc >= 100) {
                badgeClass = 'badge-success';
            } else if (perc >= 80) {
                badgeClass = 'badge-warning';
            } else {
                badgeClass = 'badge-danger';
            }
            return `<span class="badge ${badgeClass}">${perc.toFixed(1)}%</span>`;
        }

        // Funções de atualização de informações
        function updateFaturamentoInfo() {
            document.getElementById('faturamentoTotalRecords').textContent = overlayStates.faturamento.data.length.toLocaleString('pt-BR');
            document.getElementById('faturamentoVisibleRecords').textContent = overlayStates.faturamento.filteredData.length.toLocaleString('pt-BR');
            document.getElementById('faturamentoLastUpdate').textContent = overlayStates.faturamento.lastUpdate.toLocaleTimeString('pt-BR');
        }

        function updateMetaInfo() {
            document.getElementById('metaTotalRecords').textContent = overlayStates.meta.data.length.toLocaleString('pt-BR');
            document.getElementById('metaVisibleRecords').textContent = overlayStates.meta.filteredData.length.toLocaleString('pt-BR');
            document.getElementById('metaLastUpdate').textContent = overlayStates.meta.lastUpdate.toLocaleTimeString('pt-BR');
        }

        function updateAtingidoInfo() {
            document.getElementById('atingidoTotalRecords').textContent = overlayStates.atingido.data.length.toLocaleString('pt-BR');
            document.getElementById('atingidoVisibleRecords').textContent = overlayStates.atingido.filteredData.length.toLocaleString('pt-BR');
            document.getElementById('atingidoLastUpdate').textContent = overlayStates.atingido.lastUpdate.toLocaleTimeString('pt-BR');
        }

        // Funções de paginação
        function updateFaturamentoPageInfo() {
            const startIndex = (overlayStates.faturamento.currentPage - 1) * overlayStates.faturamento.pageSize + 1;
            const endIndex = Math.min(overlayStates.faturamento.currentPage * overlayStates.faturamento.pageSize, overlayStates.faturamento.filteredData.length);
            const total = overlayStates.faturamento.filteredData.length;
            
            document.getElementById('faturamentoPageInfo').textContent = 
                `Mostrando ${startIndex}-${endIndex} de ${total} registros`;
        }

        function updateMetaPageInfo() {
            const startIndex = (overlayStates.meta.currentPage - 1) * overlayStates.meta.pageSize + 1;
            const endIndex = Math.min(overlayStates.meta.currentPage * overlayStates.meta.pageSize, overlayStates.meta.filteredData.length);
            const total = overlayStates.meta.filteredData.length;
            
            document.getElementById('metaPageInfo').textContent = 
                `Mostrando ${startIndex}-${endIndex} de ${total} registros`;
        }

        function updateAtingidoPageInfo() {
            const startIndex = (overlayStates.atingido.currentPage - 1) * overlayStates.atingido.pageSize + 1;
            const endIndex = Math.min(overlayStates.atingido.currentPage * overlayStates.atingido.pageSize, overlayStates.atingido.filteredData.length);
            const total = overlayStates.atingido.filteredData.length;
            
            document.getElementById('atingidoPageInfo').textContent = 
                `Mostrando ${startIndex}-${endIndex} de ${total} registros`;
        }

        // Funções de paginação (renderização dos botões)
        function renderFaturamentoPagination() {
            const totalPages = Math.ceil(overlayStates.faturamento.filteredData.length / overlayStates.faturamento.pageSize);
            const pagination = document.getElementById('faturamentoPagination');
            
            if (totalPages <= 1) {
                pagination.innerHTML = '';
                return;
            }
            
            let html = '';
            
            // Botão anterior
            html += `<button class="page-btn" onclick="goToFaturamentoPage(${overlayStates.faturamento.currentPage - 1})" 
                     ${overlayStates.faturamento.currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i>
                     </button>`;
            
            // Páginas
            const startPage = Math.max(1, overlayStates.faturamento.currentPage - 2);
            const endPage = Math.min(totalPages, overlayStates.faturamento.currentPage + 2);
            
            if (startPage > 1) {
                html += `<button class="page-btn" onclick="goToFaturamentoPage(1)">1</button>`;
                if (startPage > 2) {
                    html += `<span class="text-muted">...</span>`;
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                html += `<button class="page-btn ${i === overlayStates.faturamento.currentPage ? 'active' : ''}" 
                         onclick="goToFaturamentoPage(${i})">${i}</button>`;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    html += `<span class="text-muted">...</span>`;
                }
                html += `<button class="page-btn" onclick="goToFaturamentoPage(${totalPages})">${totalPages}</button>`;
            }
            
            // Botão próximo
            html += `<button class="page-btn" onclick="goToFaturamentoPage(${overlayStates.faturamento.currentPage + 1})" 
                     ${overlayStates.faturamento.currentPage === totalPages ? 'disabled' : ''}>
                        <i class="fas fa-chevron-right"></i>
                     </button>`;
            
            pagination.innerHTML = html;
        }

        function renderMetaPagination() {
            const totalPages = Math.ceil(overlayStates.meta.filteredData.length / overlayStates.meta.pageSize);
            const pagination = document.getElementById('metaPagination');
            
            if (totalPages <= 1) {
                pagination.innerHTML = '';
                return;
            }
            
            let html = '';
            
            // Botão anterior
            html += `<button class="page-btn" onclick="goToMetaPage(${overlayStates.meta.currentPage - 1})" 
                     ${overlayStates.meta.currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i>
                     </button>`;
            
            // Páginas
            const startPage = Math.max(1, overlayStates.meta.currentPage - 2);
            const endPage = Math.min(totalPages, overlayStates.meta.currentPage + 2);
            
            if (startPage > 1) {
                html += `<button class="page-btn" onclick="goToMetaPage(1)">1</button>`;
                if (startPage > 2) {
                    html += `<span class="text-muted">...</span>`;
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                html += `<button class="page-btn ${i === overlayStates.meta.currentPage ? 'active' : ''}" 
                         onclick="goToMetaPage(${i})">${i}</button>`;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    html += `<span class="text-muted">...</span>`;
                }
                html += `<button class="page-btn" onclick="goToMetaPage(${totalPages})">${totalPages}</button>`;
            }
            
            // Botão próximo
            html += `<button class="page-btn" onclick="goToMetaPage(${overlayStates.meta.currentPage + 1})" 
                     ${overlayStates.meta.currentPage === totalPages ? 'disabled' : ''}>
                        <i class="fas fa-chevron-right"></i>
                     </button>`;
            
            pagination.innerHTML = html;
        }

        function renderAtingidoPagination() {
            const totalPages = Math.ceil(overlayStates.atingido.filteredData.length / overlayStates.atingido.pageSize);
            const pagination = document.getElementById('atingidoPagination');
            
            if (totalPages <= 1) {
                pagination.innerHTML = '';
                return;
            }
            
            let html = '';
            
            // Botão anterior
            html += `<button class="page-btn" onclick="goToAtingidoPage(${overlayStates.atingido.currentPage - 1})" 
                     ${overlayStates.atingido.currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i>
                     </button>`;
            
            // Páginas
            const startPage = Math.max(1, overlayStates.atingido.currentPage - 2);
            const endPage = Math.min(totalPages, overlayStates.atingido.currentPage + 2);
            
            if (startPage > 1) {
                html += `<button class="page-btn" onclick="goToAtingidoPage(1)">1</button>`;
                if (startPage > 2) {
                    html += `<span class="text-muted">...</span>`;
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                html += `<button class="page-btn ${i === overlayStates.atingido.currentPage ? 'active' : ''}" 
                         onclick="goToAtingidoPage(${i})">${i}</button>`;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    html += `<span class="text-muted">...</span>`;
                }
                html += `<button class="page-btn" onclick="goToAtingidoPage(${totalPages})">${totalPages}</button>`;
            }
            
            // Botão próximo
            html += `<button class="page-btn" onclick="goToAtingidoPage(${overlayStates.atingido.currentPage + 1})" 
                     ${overlayStates.atingido.currentPage === totalPages ? 'disabled' : ''}>
                        <i class="fas fa-chevron-right"></i>
                     </button>`;
            
            pagination.innerHTML = html;
        }

        // Funções de navegação de páginas
        function goToFaturamentoPage(page) {
            const totalPages = Math.ceil(overlayStates.faturamento.filteredData.length / overlayStates.faturamento.pageSize);
            if (page >= 1 && page <= totalPages) {
                overlayStates.faturamento.currentPage = page;
                renderFaturamentoTable();
            }
        }

        function goToMetaPage(page) {
            const totalPages = Math.ceil(overlayStates.meta.filteredData.length / overlayStates.meta.pageSize);
            if (page >= 1 && page <= totalPages) {
                overlayStates.meta.currentPage = page;
                renderMetaTable();
            }
        }

        function goToAtingidoPage(page) {
            const totalPages = Math.ceil(overlayStates.atingido.filteredData.length / overlayStates.atingido.pageSize);
            if (page >= 1 && page <= totalPages) {
                overlayStates.atingido.currentPage = page;
                renderAtingidoTable();
            }
        }

        // Funções de mudança de tamanho de página
        function changeFaturamentoPageSize() {
            overlayStates.faturamento.pageSize = parseInt(document.getElementById('faturamentoPageSize').value);
            overlayStates.faturamento.currentPage = 1;
            renderFaturamentoTable();
        }

        function changeMetaPageSize() {
            overlayStates.meta.pageSize = parseInt(document.getElementById('metaPageSize').value);
            overlayStates.meta.currentPage = 1;
            renderMetaTable();
        }

        function changeAtingidoPageSize() {
            overlayStates.atingido.pageSize = parseInt(document.getElementById('atingidoPageSize').value);
            overlayStates.atingido.currentPage = 1;
            renderAtingidoTable();
        }

        // Funções de ordenação
        function sortFaturamentoTable(field) {
            if (overlayStates.faturamento.sortField === field) {
                overlayStates.faturamento.sortDirection = overlayStates.faturamento.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                overlayStates.faturamento.sortField = field;
                overlayStates.faturamento.sortDirection = 'asc';
            }
            
            overlayStates.faturamento.filteredData.sort((a, b) => {
                let aVal = a[field];
                let bVal = b[field];
                
                if (aVal < bVal) return overlayStates.faturamento.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return overlayStates.faturamento.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
            
            updateFaturamentoSortIndicators();
            renderFaturamentoTable();
        }

        function sortMetaTable(field) {
            if (overlayStates.meta.sortField === field) {
                overlayStates.meta.sortDirection = overlayStates.meta.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                overlayStates.meta.sortField = field;
                overlayStates.meta.sortDirection = 'asc';
            }
            
            overlayStates.meta.filteredData.sort((a, b) => {
                let aVal = a[field];
                let bVal = b[field];
                
                if (aVal < bVal) return overlayStates.meta.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return overlayStates.meta.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
            
            updateMetaSortIndicators();
            renderMetaTable();
        }

        function sortAtingidoTable(field) {
            if (overlayStates.atingido.sortField === field) {
                overlayStates.atingido.sortDirection = overlayStates.atingido.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                overlayStates.atingido.sortField = field;
                overlayStates.atingido.sortDirection = 'asc';
            }
            
            overlayStates.atingido.filteredData.sort((a, b) => {
                let aVal = a[field];
                let bVal = b[field];
                
                if (aVal < bVal) return overlayStates.atingido.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return overlayStates.atingido.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
            
            updateAtingidoSortIndicators();
            renderAtingidoTable();
        }

        // Funções de atualização dos indicadores de ordenação
        function updateFaturamentoSortIndicators() {
            document.querySelectorAll('#faturamentoTable .sort-icon').forEach(icon => {
                icon.className = 'fas fa-sort sort-icon';
            });
            
            if (overlayStates.faturamento.sortField) {
                const header = document.querySelector(`#faturamentoTable th[data-sort="${overlayStates.faturamento.sortField}"] .sort-icon`);
                if (header) {
                    header.className = `fas fa-sort-${overlayStates.faturamento.sortDirection === 'asc' ? 'up' : 'down'} sort-icon`;
                }
            }
        }

        function updateMetaSortIndicators() {
            document.querySelectorAll('#metaTable .sort-icon').forEach(icon => {
                icon.className = 'fas fa-sort sort-icon';
            });
            
            if (overlayStates.meta.sortField) {
                const header = document.querySelector(`#metaTable th[data-sort="${overlayStates.meta.sortField}"] .sort-icon`);
                if (header) {
                    header.className = `fas fa-sort-${overlayStates.meta.sortDirection === 'asc' ? 'up' : 'down'} sort-icon`;
                }
            }
        }

        function updateAtingidoSortIndicators() {
            document.querySelectorAll('#atingidoTable .sort-icon').forEach(icon => {
                icon.className = 'fas fa-sort sort-icon';
            });
            
            if (overlayStates.atingido.sortField) {
                const header = document.querySelector(`#atingidoTable th[data-sort="${overlayStates.atingido.sortField}"] .sort-icon`);
                if (header) {
                    header.className = `fas fa-sort-${overlayStates.atingido.sortDirection === 'asc' ? 'up' : 'down'} sort-icon`;
                }
            }
        }

        // Funções de refresh
        function refreshFaturamentoData() {
            loadFaturamentoData();
        }

        function refreshMetaData() {
            loadMetaData();
        }

        function refreshAtingidoData() {
            loadAtingidoData();
        }

        // Funções de exportação para Excel
        function exportFaturamentoToExcel() {
            const ws = XLSX.utils.json_to_sheet(overlayStates.faturamento.filteredData.map(item => ({
                'Código Vendedor': item.codvend,
                'Vendedor': item.apelido,
                'Qtd Prevista': item.qtdprev,
                'Qtd Real': item.qtdreal,
                'Valor Previsto': item.vlr_prev,
                'Valor Real': item.vlr_real,
                '% Atingido': item.perc
            })));
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Faturamento Detalhado');
            
            const fileName = `faturamento_detalhado_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        }

        function exportMetaToExcel() {
            const ws = XLSX.utils.json_to_sheet(overlayStates.meta.filteredData.map(item => ({
                'Código Vendedor': item.codvend,
                'Vendedor': item.apelido,
                'Qtd Prevista': item.qtdprev,
                'Qtd Real': item.qtdreal,
                'Valor Previsto': item.vlr_prev,
                'Valor Real': item.vlr_real,
                '% Atingido': item.perc
            })));
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Meta Detalhada');
            
            const fileName = `meta_detalhada_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        }

        function exportAtingidoToExcel() {
            const ws = XLSX.utils.json_to_sheet(overlayStates.atingido.filteredData.map(item => ({
                'Código Vendedor': item.codvend,
                'Vendedor': item.apelido,
                'Qtd Prevista': item.qtdprev,
                'Qtd Real': item.qtdreal,
                'Valor Previsto': item.vlr_prev,
                'Valor Real': item.vlr_real,
                '% Atingido': item.perc
            })));
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Percentual Atingido Detalhado');
            
            const fileName = `percentual_atingido_detalhado_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        }

        // Funções de exportação para PDF
        function exportFaturamentoToPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');
            
            // Cabeçalho do PDF
            doc.setFillColor(0, 138, 112);
            doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Dashboard Fechamento Plus - Faturamento Detalhado', 20, 16);
            
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 32);
            doc.text(`Total de registros: ${overlayStates.faturamento.filteredData.length}`, 20, 37);
            
            // Preparar dados para a tabela
            const tableData = overlayStates.faturamento.filteredData.map(item => [
                item.codvend.toString(),
                item.apelido,
                item.qtdprev.toLocaleString('pt-BR'),
                item.qtdreal.toLocaleString('pt-BR'),
                formatCurrency(item.vlr_prev),
                formatCurrency(item.vlr_real),
                item.perc.toFixed(1) + '%'
            ]);
            
            // Cabeçalhos da tabela
            const headers = [
                'Código',
                'Vendedor',
                'Qtd Prevista',
                'Qtd Real',
                'Valor Previsto',
                'Valor Real',
                '% Atingido'
            ];
            
            // Configurações da tabela
            const tableConfig = {
                startY: 45,
                head: [headers],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [0, 138, 112],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 9
                },
                bodyStyles: {
                    fontSize: 8,
                    cellPadding: 3
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250]
                },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 30 },
                    5: { cellWidth: 30 },
                    6: { cellWidth: 25 }
                },
                margin: { top: 45, left: 10, right: 10 },
                pageBreak: 'auto',
                tableWidth: 'wrap'
            };
            
            doc.autoTable(tableConfig);
            
            // Rodapé
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(
                    `Página ${i} de ${pageCount}`,
                    doc.internal.pageSize.width - 30,
                    doc.internal.pageSize.height - 10
                );
            }
            
            const fileName = `faturamento_detalhado_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        }

        function exportMetaToPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');
            
            // Cabeçalho do PDF
            doc.setFillColor(0, 138, 112);
            doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Dashboard Fechamento Plus - Meta Detalhada', 20, 16);
            
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 32);
            doc.text(`Total de registros: ${overlayStates.meta.filteredData.length}`, 20, 37);
            
            // Preparar dados para a tabela
            const tableData = overlayStates.meta.filteredData.map(item => [
                item.codvend.toString(),
                item.apelido,
                item.qtdprev.toLocaleString('pt-BR'),
                item.qtdreal.toLocaleString('pt-BR'),
                formatCurrency(item.vlr_prev),
                formatCurrency(item.vlr_real),
                item.perc.toFixed(1) + '%'
            ]);
            
            // Cabeçalhos da tabela
            const headers = [
                'Código',
                'Vendedor',
                'Qtd Prevista',
                'Qtd Real',
                'Valor Previsto',
                'Valor Real',
                '% Atingido'
            ];
            
            // Configurações da tabela
            const tableConfig = {
                startY: 45,
                head: [headers],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [0, 138, 112],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 9
                },
                bodyStyles: {
                    fontSize: 8,
                    cellPadding: 3
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250]
                },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 30 },
                    5: { cellWidth: 30 },
                    6: { cellWidth: 25 }
                },
                margin: { top: 45, left: 10, right: 10 },
                pageBreak: 'auto',
                tableWidth: 'wrap'
            };
            
            doc.autoTable(tableConfig);
            
            // Rodapé
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(
                    `Página ${i} de ${pageCount}`,
                    doc.internal.pageSize.width - 30,
                    doc.internal.pageSize.height - 10
                );
            }
            
            const fileName = `meta_detalhada_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        }

        function exportAtingidoToPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');
            
            // Cabeçalho do PDF
            doc.setFillColor(0, 138, 112);
            doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Dashboard Fechamento Plus - % Atingido Detalhado', 20, 16);
            
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 32);
            doc.text(`Total de registros: ${overlayStates.atingido.filteredData.length}`, 20, 37);
            
            // Preparar dados para a tabela
            const tableData = overlayStates.atingido.filteredData.map(item => [
                item.codvend.toString(),
                item.apelido,
                item.qtdprev.toLocaleString('pt-BR'),
                item.qtdreal.toLocaleString('pt-BR'),
                formatCurrency(item.vlr_prev),
                formatCurrency(item.vlr_real),
                item.perc.toFixed(1) + '%'
            ]);
            
            // Cabeçalhos da tabela
            const headers = [
                'Código',
                'Vendedor',
                'Qtd Prevista',
                'Qtd Real',
                'Valor Previsto',
                'Valor Real',
                '% Atingido'
            ];
            
            // Configurações da tabela
            const tableConfig = {
                startY: 45,
                head: [headers],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [0, 138, 112],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 9
                },
                bodyStyles: {
                    fontSize: 8,
                    cellPadding: 3
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250]
                },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 30 },
                    5: { cellWidth: 30 },
                    6: { cellWidth: 25 }
                },
                margin: { top: 45, left: 10, right: 10 },
                pageBreak: 'auto',
                tableWidth: 'wrap'
            };
            
            doc.autoTable(tableConfig);
            
            // Rodapé
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(
                    `Página ${i} de ${pageCount}`,
                    doc.internal.pageSize.width - 30,
                    doc.internal.pageSize.height - 10
                );
            }
            
            const fileName = `percentual_atingido_detalhado_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        }

        // Event listeners para busca
        document.addEventListener('DOMContentLoaded', function() {
            // Event listeners para busca nos overlays
            document.getElementById('faturamentoSearch').addEventListener('input', debounce(function(e) {
                overlayStates.faturamento.searchTerm = e.target.value.toLowerCase();
                overlayStates.faturamento.currentPage = 1;
                applyFaturamentoFilters();
                renderFaturamentoTable();
            }, 300));

            document.getElementById('metaSearch').addEventListener('input', debounce(function(e) {
                overlayStates.meta.searchTerm = e.target.value.toLowerCase();
                overlayStates.meta.currentPage = 1;
                applyMetaFilters();
                renderMetaTable();
            }, 300));

            document.getElementById('atingidoSearch').addEventListener('input', debounce(function(e) {
                overlayStates.atingido.searchTerm = e.target.value.toLowerCase();
                overlayStates.atingido.currentPage = 1;
                applyAtingidoFilters();
                renderAtingidoTable();
            }, 300));

            // Fechar overlays ao clicar fora
            document.getElementById('faturamentoModal').addEventListener('click', (e) => {
                if (e.target.id === 'faturamentoModal') {
                    closeOverlay('faturamentoModal');
                }
            });

            document.getElementById('metaModal').addEventListener('click', (e) => {
                if (e.target.id === 'metaModal') {
                    closeOverlay('metaModal');
                }
            });

            document.getElementById('atingidoModal').addEventListener('click', (e) => {
                if (e.target.id === 'atingidoModal') {
                    closeOverlay('atingidoModal');
                }
            });
        });

        // Funções de filtro
        function applyFaturamentoFilters() {
            let filtered = overlayStates.faturamento.data;
            
            if (overlayStates.faturamento.searchTerm) {
                filtered = filtered.filter(item => 
                    item.codvend.toString().toLowerCase().includes(overlayStates.faturamento.searchTerm) ||
                    item.apelido.toLowerCase().includes(overlayStates.faturamento.searchTerm)
                );
            }
            
            overlayStates.faturamento.filteredData = filtered;
        }

        function applyMetaFilters() {
            let filtered = overlayStates.meta.data;
            
            if (overlayStates.meta.searchTerm) {
                filtered = filtered.filter(item => 
                    item.codvend.toString().toLowerCase().includes(overlayStates.meta.searchTerm) ||
                    item.apelido.toLowerCase().includes(overlayStates.meta.searchTerm)
                );
            }
            
            overlayStates.meta.filteredData = filtered;
        }

        function applyAtingidoFilters() {
            let filtered = overlayStates.atingido.data;
            
            if (overlayStates.atingido.searchTerm) {
                filtered = filtered.filter(item => 
                    item.codvend.toString().toLowerCase().includes(overlayStates.atingido.searchTerm) ||
                    item.apelido.toLowerCase().includes(overlayStates.atingido.searchTerm)
                );
            }
            
            overlayStates.atingido.filteredData = filtered;
        }

        // Função debounce
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    </script>
</body>
</html>