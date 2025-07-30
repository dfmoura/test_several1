<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resumo Material</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <style>
    html, body {
      font-size: 12.6px; 
    }
    
    table {
      font-size: 0.81rem;
    }
    
    input, button, select, textarea {
      font-size: 0.81rem; 
      padding: 0.45rem 0.675rem;
    }
    
    th {
      font-size: 0.85rem;
      padding: 0.45rem 0.675rem;
    }
    
    td {
      padding: 0.36rem 0.54rem;
    }
    
    #dataTable {
      width: 100%;
      border-collapse: collapse;
    }
    
    #dataTable th, #dataTable td {
      white-space: normal;
      overflow-wrap: break-word; 
      text-overflow: ellipsis;
      word-break: break-all; 
      text-align: center;
      border: 1px solid #e5e7eb;
    }
    
    #dataTable thead {
      position: sticky;
      top: 0;
      z-index: 50;
      background-color: #d1fae5;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    #dataTable thead th {
      position: sticky;
      top: 0;
      z-index: 50;
      background-color: #d1fae5;
      border: 1px solid #e5e7eb;
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
    }
    
    #dataTable thead tr:first-child th {
      position: sticky;
      top: 0;
      z-index: 51;
    }
    
    #dataTable thead tr:nth-child(2) th {
      position: sticky;
      top: 28px;
      z-index: 50;
    }
    
    #table-container {
      width: 100%;
      overflow: auto;
      max-height: 85vh;
      position: relative;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    /* Ensure table takes full width of container */
    #dataTable {
      width: 100%;
      border-collapse: collapse;
      background-color: white;
    }
    
    /* Improve sticky header compatibility */
    @supports (position: sticky) {
      #dataTable thead {
        position: -webkit-sticky;
        position: sticky;
        top: 0;
      }
      
      #dataTable thead th {
        position: -webkit-sticky;
        position: sticky;
        top: 0;
      }
    }
    
    body {
      padding-left: 0.5rem;
      padding-right: 0.5rem;
      padding-bottom: 1.5rem;
    }    
    
    @media (min-width: 1024px) {
      body {
        padding-left: 1rem;
        padding-right: 1rem;
        padding-bottom: 2rem;
      }
    }
    
    /* Larguras específicas para as colunas */
    .col-nutab { width: 40px; }    
    .col-codtab { width: 50px; }
    .col-tabela { width: 40px; }
    .col-codprod { width: 60px; }
    .col-produto { width: 80px; }
    .col-marca { width: 70px; }
    .col-vol { width: 50px; }
    .col-pond { width: 70px; }
    .col-custo { width: 80px; }
    .col-preco { width: 80px; }
    .col-margem { width: 70px; }
    .col-preco15 { width: 80px; }
    .col-margem15 { width: 70px; }
    .col-preco35 { width: 80px; }
    .col-margem35 { width: 70px; }
    .col-ticket-obj { width: 80px; }
    .col-ticket-12m { width: 80px; }
    .col-ticket-safra { width: 80px; }
    .col-custo-atu { width: 80px; }
    .col-nova-margem { width: 90px; }
    .col-novo-preco { width: 90px; }
    .col-dt-vigor { width: 90px; }


    .export-btn-overlay {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }
    
    .export-btn-overlay:hover {
      background-color: #45a049;
      transform: scale(1.1);
    }
    
    .export-btn-overlay i {
      pointer-events: none;
    }

    /* Loading overlay styles */
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .loading-content {
      background-color: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      text-align: center;
      max-width: 400px;
      width: 90%;
    }

    .loading-spinner {
      border: 4px solid #e5e7eb;
      border-top: 4px solid #10b981;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-title {
      color: #065f46;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .loading-message {
      color: #047857;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .loading-progress {
      background-color: #d1fae5;
      border-radius: 8px;
      height: 8px;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .loading-progress-bar {
      background-color: #10b981;
      height: 100%;
      width: 0%;
      transition: width 0.3s ease;
      border-radius: 8px;
    }

    /* Status overlay styles */
    .status-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .status-content {
      background-color: white;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      text-align: center;
      max-width: 350px;
      width: 90%;
    }

    .status-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
    }

    .status-icon.success {
      color: #10b981;
    }

    .status-icon.error {
      color: #ef4444;
    }

    .status-icon.processing {
      color: #f59e0b;
    }

    .status-title {
      color: #065f46;
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .status-message {
      color: #047857;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .status-button {
      background-color: #10b981;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .status-button:hover {
      background-color: #059669;
    }

    /* Cores de fundo para grupos de tabela/marca */
    tr.bg-codtab-marca-0 {
      background-color: #ffffff; /* Branco para o primeiro grupo */
    }
    
    tr.bg-codtab-marca-1 {
      background-color: #f0fdf4; /* Verde muito claro para o segundo grupo */
    }
    
    /* Remove increment/decrement controls from number inputs */
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    /*
    input[type="number"] {
      -moz-appearance: textfield;
    }
    */
    /* Destaque ao passar o mouse */
    tr:hover {
      background-color: #dcfce7 !important;
      transition: background-color 0.2s ease;
    }
    
    /* Borda de separação entre grupos distintos */
    tr.group-separator {
      border-top: 2px solid #bbf7d0;
    }
    
    /* Linhas mais escuras */
    #dataTable tbody tr {
      border-bottom: 2px solid #d1fae5;
    }
    
    #dataTable tbody tr td {
      border: 1px solid #bbf7d0;
    }
    
    /* Estilo especial para linhas de resumo (NUTAB = 0, CODPROD = NULL, DESCRPROD = 1) */
    tr.summary-row {
      background-color: #e0f2e9 !important;
      border-bottom: 3px solid #10b981;
    }
    
    tr.summary-row td {
      border: 1px solid #10b981;
    }
    
    /* Fixed header styles */
    .fixed-header {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 35px;
      background: linear-gradient(135deg, #10b981, #059669);
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
    }
    
    .header-logo {
      display: flex;
      align-items: center;
    }
    
    .header-logo img {
      width: 40px;
      height: auto;
      filter: brightness(0) invert(1);
    }
    
    .header-title {
      color: white;
      font-size: 1.5rem;
      font-weight: bold;
      margin: 0;
    }
    
    /* Adjust body padding to account for fixed header */
    body {
      padding-top: 55px !important;
    }

    /* Filtro Múltiplo por Marca - Otimizado */
    .filter-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: none;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .filter-modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 8px;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 450px;
      max-height: 70vh;
      overflow: hidden;
      animation: modalSlideIn 0.3s ease-out;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translate(-50%, -60%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }

    .filter-modal-header {
      padding: 12px 16px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8f9fa;
    }

    .filter-modal-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }

    .filter-modal-close {
      background: none;
      border: none;
      font-size: 18px;
      color: #666;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .filter-modal-close:hover {
      background: #e9ecef;
      color: #333;
    }

    .filter-modal-content {
      padding: 16px;
      max-height: 350px;
      overflow-y: auto;
    }

    .filter-search {
      margin-bottom: 12px;
    }

    .filter-search input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      font-size: 11px;
      transition: all 0.2s ease;
      height: 28px;
    }

    .filter-search input:focus {
      outline: none;
      border-color: #23a059;
      box-shadow: 0 0 0 2px rgba(35, 160, 89, 0.1);
    }

    .filter-options {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }

    .filter-option {
      display: flex;
      align-items: center;
      padding: 6px 8px;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: white;
      font-size: 11px;
    }

    .filter-option:hover {
      border-color: #23a059;
      background: #f8fff9;
    }

    .filter-option.selected {
      background: #23a059;
      border-color: #23a059;
      color: white;
    }

    .filter-option input[type="checkbox"] {
      margin-right: 6px;
      accent-color: #23a059;
      transform: scale(0.9);
    }

    .filter-option label {
      cursor: pointer;
      font-size: 11px;
      margin: 0;
      flex: 1;
    }

    .filter-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding-top: 12px;
      border-top: 1px solid #eee;
    }

    .filter-actions button {
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      font-size: 11px;
      height: 28px;
    }

    .filter-actions .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .filter-actions .btn-secondary:hover {
      background: #5a6268;
    }

    .filter-actions .btn-primary {
      background: #23a059;
      color: white;
    }

    .filter-actions .btn-primary:hover {
      background: #0e4928;
    }

    .filter-badge {
      display: inline-flex;
      align-items: center;
      background: #e3f2fd;
      color: #1976d2;
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 10px;
      margin: 1px;
      border: 1px solid #bbdefb;
    }

    .filter-badge .remove {
      margin-left: 4px;
      cursor: pointer;
      font-weight: bold;
      opacity: 0.7;
    }

    .filter-badge .remove:hover {
      opacity: 1;
    }

    .filter-trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 11px;
      color: #495057;
      height: 28px;
    }

    .filter-trigger:hover {
      background: #e9ecef;
      border-color: #adb5bd;
    }

    .filter-trigger i {
      font-size: 10px;
    }

    .no-filters {
      color: #6c757d;
      font-style: italic;
      font-size: 11px;
    }

    /* Botão overlay para filtros */
    .filter-overlay-button {
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 50px;
      height: 50px;
      background: #23a059;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      z-index: 1000;
      border: none;
      font-size: 18px;
    }

    .filter-overlay-button:hover {
      background: #0e4928;
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .filter-overlay-button:active {
      transform: scale(0.95);
    }

    /* Resumo dos filtros overlay */
    .filter-summary-overlay {
      position: fixed;
      bottom: 80px;
      left: 20px;
      max-width: 300px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 12px;
      z-index: 999;
      font-size: 11px;
      border: 1px solid #e9ecef;
    }

    .filter-summary-overlay .no-filters {
      color: #6c757d;
      font-style: italic;
    }

    .filter-summary-overlay .filter-badge {
      display: inline-flex;
      align-items: center;
      background: #e3f2fd;
      color: #1976d2;
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 10px;
      margin: 1px;
      border: 1px solid #bbdefb;
    }

    .filter-summary-overlay .filter-badge .remove {
      margin-left: 4px;
      cursor: pointer;
      font-weight: bold;
      opacity: 0.7;
    }

    .filter-summary-overlay .filter-badge .remove:hover {
      opacity: 1;
    }

    /* Custom Select Styles - Otimizado */
    .custom-select-container {
      position: relative;
      width: 100%;
      overflow: visible;
    }

    .custom-select-trigger {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 28px;
      font-size: 11px;
    }

    .custom-select-trigger:hover {
      border-color: #23a059;
    }

    .custom-select-trigger.active {
      border-color: #23a059;
      box-shadow: 0 0 0 2px rgba(35, 160, 89, 0.1);
    }

    .custom-select-trigger i {
      transition: transform 0.2s ease;
      color: #666;
      font-size: 10px;
    }

    .custom-select-trigger.active i {
      transform: rotate(180deg);
    }

    .custom-select-dropdown {
      position: fixed;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      max-height: 250px;
      overflow: visible;
      display: none;
      margin-top: 2px;
      min-width: 250px;
    }

    .custom-select-search {
      padding: 8px;
      border-bottom: 1px solid #eee;
    }

    .custom-select-search input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 11px;
      outline: none;
      height: 24px;
    }

    .custom-select-search input:focus {
      border-color: #23a059;
      box-shadow: 0 0 0 2px rgba(35, 160, 89, 0.1);
    }

    .custom-select-options {
      max-height: 200px;
      overflow-y: auto;
      padding: 0;
    }

    .custom-select-option {
      padding: 6px 8px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      border-bottom: 1px solid #f5f5f5;
      font-size: 11px;
    }

    .custom-select-option:hover {
      background-color: #f8f9fa;
    }

    .custom-select-option.selected {
      background-color: #23a059;
      color: white;
    }

    .custom-select-option:last-child {
      border-bottom: none;
    }

    .custom-select-option .parceiro-code {
      font-weight: 600;
      color: #666;
      font-size: 10px;
    }

    .custom-select-option.selected .parceiro-code {
      color: #fff;
    }

    .custom-select-option .parceiro-name {
      margin-left: 6px;
      color: #333;
      font-size: 11px;
    }

    .custom-select-option.selected .parceiro-name {
      color: #fff;
    }

    .custom-select-no-results {
      padding: 12px;
      text-align: center;
      color: #666;
      font-style: italic;
      font-size: 11px;
    }

    .custom-select-loading {
      padding: 12px;
      text-align: center;
      color: #666;
      font-size: 11px;
    }

    .custom-select-loading i {
      animation: spin 1s linear infinite;
    }

    .custom-select-stats {
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }

    .custom-select-stats small {
      font-size: 10px;
      color: #6c757d;
    }

    .custom-select-group-header {
      font-weight: 600;
      font-size: 10px;
    }

    /* Estilos para o formulário de filtros */
    .filter-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      align-items: end;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .input-group label {
      font-size: 11px;
      color: #444;
      font-weight: 500;
      margin-bottom: 2px;
    }

    input[type="text"] {
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 11px;
      font-family: inherit;
      height: 28px;
    }

    input[type="text"]:focus {
      outline: none;
      border-color: #23a059;
      box-shadow: 0 0 0 2px rgba(0,123,255,0.1);
    }

    button {
      padding: 6px 12px;
      background: #23a059;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
      height: 28px;
      min-width: 100px;
      font-size: 11px;
    }

    button:hover {
      background: #0e4928;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    button:active {
      transform: translateY(0);
    }

    select {
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 11px;
      font-family: inherit;
      width: 100%;
      background-color: white;
      height: 28px;
    }

    select:focus {
      outline: none;
      border-color: #23a059;
      box-shadow: 0 0 0 2px rgba(35, 160, 89, 0.1);
    }
  </style>
  <snk:load/>
</head>
<body class="bg-green-50 min-h-screen flex flex-col items-center py-6">
  <!-- Fixed Header -->
  <div class="fixed-header">
    <div class="header-logo">
      <a href="https://neuon.com.br/" target="_blank" rel="noopener noreferrer">
        <img src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg" alt="Neuon Logo">
      </a>
    </div>
    <h1 class="header-title">Simulação de Preço</h1>
    <div></div> <!-- Empty div for flex spacing -->
  </div>

  <!-- Botão overlay para abrir filtros -->
  <div class="filter-overlay-button" onclick="openMainFilterModal()">
    <i class="fas fa-cog"></i>
  </div>
  
  <!-- Resumo dos filtros aplicados -->
  <div class="filter-summary-overlay" id="filterSummary">
    <span class="no-filters">Nenhum filtro aplicado</span>
  </div>

  <!-- Overlay principal dos filtros -->
  <div class="filter-overlay" id="mainFilterOverlay">
    <div class="filter-modal" style="max-width: 800px; width: 95%;">
      <div class="filter-modal-header">
        <h3 class="filter-modal-title">Configuração de Filtros</h3>
        <button class="filter-modal-close" onclick="closeMainFilterModal()">&times;</button>
      </div>
      <div class="filter-modal-content" style="max-height: 70vh; overflow-y: auto;">
        <!-- Filtros Básicos -->
        <div class="filter-form" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
          <div class="input-group">
            <label for="empresaSelect">Empresa: *</label>
            <select id="empresaSelect" name="empresaSelect" required>
              <option value="">Carregando...</option>
            </select>
          </div>
          
          <div class="input-group">
            <label for="periodoInput">Período de Referência: *</label>
            <input type="text" id="periodoInput" name="periodoInput" placeholder="DD/MM/YYYY (obrigatório)" maxlength="10" required>
          </div>
          
          <div class="input-group">
            <label for="parceiroSelect">Parceiro:</label>
            <div class="custom-select-container">
              <div class="custom-select-trigger" onclick="toggleParceiroDropdown()">
                <span id="parceiroDisplay">Selecione um parceiro</span>
                <i class="fas fa-chevron-down"></i>
              </div>
              <input type="hidden" id="parceiroSelect" name="parceiroSelect" value="">
            </div>
          </div>
          
          <div class="input-group" style="align-self: end;">
            <button onclick="listarResumoMaterial()" style="width: 100%;">Consultar</button>
          </div>
        </div>

        <!-- Dropdown movido para fora do container para evitar overflow -->
        <div class="custom-select-dropdown" id="parceiroDropdown">
          <div class="custom-select-search">
            <input type="text" id="parceiroSearch" placeholder="Buscar parceiro..." onkeyup="filterParceiros()">
          </div>
          <div class="custom-select-options" id="parceiroOptions">
            <div class="custom-select-option" data-value="" onclick="selectParceiro('', 'Todos os parceiros')">
              <span>Todos os parceiros</span>
            </div>
          </div>
        </div>

        <!-- Filtros Múltiplos -->
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <h4 style="margin-bottom: 12px; color: #333; font-size: 14px;">Filtros Avançados</h4>
          <div class="flex items-center mb-2" style="gap: 12px;">
            <button class="filter-trigger" onclick="openFilterModal()">
              <i class="fas fa-filter"></i>
              Filtrar por Marca
            </button>
            <button class="filter-trigger" onclick="openPriceTableFilterModal()" style="background: #e3f2fd; border-color: #bbdefb; color: #1976d2;">
              <i class="fas fa-table"></i>
              Filtrar por Tabela de Preço
            </button>
            <button class="filter-trigger" onclick="clearAllFilters()" style="background: #fff3cd; border-color: #ffeaa7; color: #856404;">
              <i class="fas fa-times"></i>
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Filtro Múltiplo por Marca -->
  <div class="filter-overlay" id="filterOverlay">
    <div class="filter-modal">
      <div class="filter-modal-header">
        <h3 class="filter-modal-title">Filtrar por Marca</h3>
        <button class="filter-modal-close" onclick="closeFilterModal()">&times;</button>
      </div>
      <div class="filter-modal-content">
        <div class="filter-search">
          <input type="text" id="filterSearch" placeholder="Pesquisar marcas..." onkeyup="filterBrands()">
        </div>
        <div class="filter-options" id="filterOptions">
          <!-- Opções serão carregadas dinamicamente -->
        </div>
        <div class="filter-actions">
          <button class="btn-secondary" onclick="clearAllFilters()">Limpar Todos</button>
          <button class="btn-primary" onclick="applyFilters()">Aplicar Filtros</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Filtro Múltiplo por Tabela de Preço -->
  <div class="filter-overlay" id="priceTableFilterOverlay">
    <div class="filter-modal">
      <div class="filter-modal-header">
        <h3 class="filter-modal-title">Filtrar por Tabela de Preço</h3>
        <button class="filter-modal-close" onclick="closePriceTableFilterModal()">&times;</button>
      </div>
      <div class="filter-modal-content">
        <div class="filter-search">
          <input type="text" id="priceTableFilterSearch" placeholder="Pesquisar tabelas..." onkeyup="filterPriceTables()">
        </div>
        <div class="filter-options" id="priceTableFilterOptions">
          <!-- Opções serão carregadas dinamicamente -->
        </div>
        <div class="filter-actions">
          <button class="btn-secondary" onclick="clearAllPriceTableFilters()">Limpar Todos</button>
          <button class="btn-primary" onclick="applyPriceTableFilters()">Aplicar Filtros</button>
        </div>
      </div>
    </div>
  </div>


  <div class="w-full px-1 mb-4">
    <div class="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0 items-center justify-between bg-green-100 rounded-lg p-4 shadow">
      <div class="flex items-center space-x-2">
        <label for="globalNewPrice" class="font-semibold text-green-900">Novo Preço (R$):</label>
        <input id="globalNewPrice" type="number" step="0.01" class="border border-green-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400 w-32" />
        <button id="applyGlobalPrice" class="ml-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition">Aplicar a todos</button>
      </div>
      <div class="flex items-center space-x-2">
        <label for="globalDtVigor" class="font-semibold text-green-900">Dt. Vigor:</label>
        <input id="globalDtVigor" type="text" placeholder="dd/mm/aaaa" maxlength="10" class="border border-green-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400 w-40" />
        <button id="applyGlobalDtVigor" class="ml-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition">Aplicar a todos</button>
      </div>
      <div class="flex items-center space-x-2">
        <label for="globalNewMargin" class="font-semibold text-green-900">Nova Margem (%):</label>
        <input id="globalNewMargin" type="number" step="0.01" class="border border-green-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400 w-32" />
        <button id="applyGlobalMargin" class="ml-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition">Aplicar a todos</button>
      </div>
    </div>
  </div>

  <div id="table-container">
    <table id="dataTable" class="min-w-full bg-white rounded-lg shadow">
      <thead>
        <tr class="bg-green-100">
          <th></th>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
          <th>Custo</th>
          <th colspan="2" style="background-color: #E49EDD; text-align: center;">Tab.</th>
          
          <th colspan="2" style="background-color: #0000FF; text-align: center; color: white;">Tab. Consum. (-15%)</th>
          
          <th colspan="2" style="background-color: #00FF00; text-align: center;">Tab. Rev. (-35%)</th>
          <th colspan="3">Ticket</th>

          <th>Custo</th>
          <th  colspan="2">Novo</th>
          
          <th></th>
        </tr>
        <tr class="bg-green-200 text-green-900">
          <th class="col-nutab" title="Cód. Tab.">Nú.</th>
          <th class="col-codtab" title="Cód. Tab.">Cód.</th>
          <th class="col-tabela" title="Tabela">Tab.</th>
          <th class="col-codprod" title="Cód. Prod.">Cód. Prod.</th>
          <th class="col-produto" title="Produto">Produto</th>
          <th class="col-marca" title="Marca">Marca</th>
          <th class="col-vol">LT</th>
          <th class="col-pond">Peso</th>
          <th class="col-custo">Satis</th>
          <th class="col-preco" style="background-color: #E49EDD; text-align: center;">Preço</th>
          <th class="col-margem" style="background-color: #E49EDD; text-align: center;">Margem</th>
          <th class="col-preco15" style="background-color: #0000FF; text-align: center;color: white;">Preço</th>
          <th class="col-margem15" style="background-color: #0000FF; text-align: center;color: white;">Margem</th>
          <th class="col-preco35" style="background-color: #00FF00; text-align: center;">Preço</th>
          <th class="col-margem35" style="background-color: #00FF00; text-align: center;">Margem</th>
          <th class="col-ticket-obj">Objetivo</th>
          <th class="col-ticket-12m">Últ. 12M</th>
          <th class="col-ticket-safra">Safra</th>
          <th class="col-custo-atu">Atual</th>
          <th class="col-nova-margem">Margem</th>
          <th class="col-novo-preco">Preço</th>
          <th class="col-dt-vigor">Dt. Vigor</th>
        </tr>
      </thead>
        <tbody id="dataTableBody">
          <!-- Dados serão carregados dinamicamente via JavaScript -->
        </tbody>
    </table>
  </div>

  <button id="exportJsonBtn" class="export-btn-overlay" title="Exportar para Excel" style="bottom: 20px; right: 20px;">
    <i class="fas fa-file-excel"></i>
  </button>
  
  <button id="insertDataBtn" class="export-btn-overlay" title="Inserir no Banco" style="bottom: 20px; right: 90px;">
    <i class="fas fa-database"></i>
  </button>

  <!-- Loading Overlay -->
  <div id="loadingOverlay" class="loading-overlay">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <div class="loading-title">Processando...</div>
      <div id="loadingMessage" class="loading-message">Salvando dados na tabela...</div>
      <div class="loading-progress">
        <div id="loadingProgressBar" class="loading-progress-bar"></div>
      </div>
    </div>
  </div>

  <!-- Status Overlay -->
  <div id="statusOverlay" class="status-overlay">
    <div class="status-content">
      <div id="statusIcon" class="status-icon"></div>
      <div id="statusTitle" class="status-title"></div>
      <div id="statusMessage" class="status-message"></div>
      <button id="statusCloseBtn" class="status-button">OK</button>
    </div>
  </div>

  <script>

    // Variáveis globais para o filtro múltiplo
    let allBrands = [];
    let selectedBrands = [];
    let allPriceTables = [];
    let selectedPriceTables = [];
    let currentTableData = [];
    let originalTableData = [];
    let allParceiros = [];
    let filteredParceiros = [];

    // Helper functions
    function calcMargin(newPrice, custo) {
      if (!newPrice || !custo) return '';
      return (((newPrice - custo) / newPrice) * 100).toFixed(2);
    }
    function calcPrice(newMargin, custo) {
      if (!newMargin || !custo) return '';
      return (custo / (1 - (newMargin / 100))).toFixed(2);
    }
    
    function updatePriceArrow(priceInput) {
      const novoPreco = parseFloat(priceInput.value);
      const precoTab = parseFloat(priceInput.dataset.precoTab);
      const arrowSpan = priceInput.closest('td').querySelector('.price-arrow');
      
      if (isNaN(novoPreco) || isNaN(precoTab)) {
        arrowSpan.innerHTML = '';
        return;
      }
      
      if (novoPreco > precoTab) {
        arrowSpan.innerHTML = '<i class="fas fa-arrow-up text-green-600"></i>';
      } else if (novoPreco < precoTab) {
        arrowSpan.innerHTML = '<i class="fas fa-arrow-down text-red-600"></i>';
      } else {
        arrowSpan.innerHTML = '<i class="fas fa-minus text-gray-500"></i>';
      }
    }

    // Row event listeners
    document.querySelectorAll('.row-price').forEach(function(input) {
      input.addEventListener('input', function() {
        const custo = parseFloat(this.dataset.custo);
        const price = parseFloat(this.value);
        const row = this.closest('tr');
        const marginInput = row.querySelector('.row-margin');
        if (!isNaN(price) && !isNaN(custo)) {
          marginInput.value = calcMargin(price, custo);
        } else {
          marginInput.value = '';
        }
        
        // Update price arrow
        updatePriceArrow(this);
      });
    });
    document.querySelectorAll('.row-margin').forEach(function(input) {
      input.addEventListener('input', function() {
        const custo = parseFloat(this.dataset.custo);
        const margin = parseFloat(this.value);
        const row = this.closest('tr');
        const priceInput = row.querySelector('.row-price');
        if (!isNaN(margin) && !isNaN(custo)) {
          priceInput.value = calcPrice(margin, custo);
        } else {
          priceInput.value = '';
        }
      });
    });

    // Global input interactivity
    const globalPrice = document.getElementById('globalNewPrice');
    const globalMargin = document.getElementById('globalNewMargin');
    const globalDtVigor = document.getElementById('globalDtVigor');
    let globalSync = false;
    globalPrice.addEventListener('input', function() {
      if (globalSync) return;
      globalSync = true;
      const custo = getFirstCusto();
      if (!isNaN(parseFloat(this.value)) && !isNaN(custo)) {
        globalMargin.value = calcMargin(parseFloat(this.value), custo);
      } else {
        globalMargin.value = '';
      }
      globalSync = false;
    });
    globalMargin.addEventListener('input', function() {
      if (globalSync) return;
      globalSync = true;
      const custo = getFirstCusto();
      if (!isNaN(parseFloat(this.value)) && !isNaN(custo)) {
        globalPrice.value = calcPrice(parseFloat(this.value), custo);
      } else {
        globalPrice.value = '';
      }
      globalSync = false;
    });
    document.getElementById('applyGlobalPrice').addEventListener('click', function() {
      const price = parseFloat(globalPrice.value);
      document.querySelectorAll('.row-price').forEach(function(input) {
        if (!isNaN(price)) {
          input.value = price;
          const custo = parseFloat(input.dataset.custo);
          const row = input.closest('tr');
          const marginInput = row.querySelector('.row-margin');
          marginInput.value = calcMargin(price, custo);
          updatePriceArrow(input);
        }
      });
    });
    document.getElementById('applyGlobalMargin').addEventListener('click', function() {
      const margin = parseFloat(globalMargin.value);
      document.querySelectorAll('.row-margin').forEach(function(input) {
        if (!isNaN(margin)) {
          input.value = margin;
          const custo = parseFloat(input.dataset.custo);
          const row = input.closest('tr');
          const priceInput = row.querySelector('.row-price');
          priceInput.value = calcPrice(margin, custo);
          updatePriceArrow(priceInput);
        }
      });
    });
    document.getElementById('applyGlobalDtVigor').addEventListener('click', function() {
      const dtVigor = globalDtVigor.value;
      if (!isValidBRDate(dtVigor)) {
        alert('Por favor, insira a data no formato dd/mm/aaaa.');
        return;
      }
      document.querySelectorAll('.row-dtvigor').forEach(function(input) {
        input.value = dtVigor;
      });
    });
    function getFirstCusto() {
      // Use the first row's CUSTO_SATIS_ATU as reference for global calculation
      const first = document.querySelector('.row-price');
      return first ? parseFloat(first.dataset.custo) : NaN;
    }
    // Date validation for dd/mm/yyyy
    function isValidBRDate(dateStr) {
      // Regex for dd/mm/yyyy
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return false;
      const [d, m, y] = dateStr.split('/').map(Number);
      const date = new Date(y, m - 1, d);
      return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }
    // Optional: auto-format on input (for all date fields)
    function autoFormatDateInput(input) {
      input.addEventListener('input', function(e) {
        let v = input.value.replace(/\D/g, '');
        if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
        if (v.length > 5) v = v.slice(0,5) + '/' + v.slice(5,9);
        input.value = v;
      });
    }
    autoFormatDateInput(globalDtVigor);
    document.querySelectorAll('.row-dtvigor').forEach(autoFormatDateInput);
    
    // Sticky header enhancement
    const tableContainer = document.getElementById('table-container');
    const tableHeader = document.querySelector('#dataTable thead');
    
    if (tableContainer && tableHeader) {
      tableContainer.addEventListener('scroll', function() {
        // Add shadow effect when scrolled
        if (this.scrollTop > 0) {
          tableHeader.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
        } else {
          tableHeader.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        }
      });
      
      // Ensure header is properly positioned on page load
      window.addEventListener('load', function() {
        tableHeader.style.position = 'sticky';
        tableHeader.style.top = '0';
        
        // Ensure both header rows are properly positioned
        const firstRow = tableHeader.querySelector('tr:first-child');
        const secondRow = tableHeader.querySelector('tr:nth-child(2)');
        
        if (firstRow) {
          firstRow.style.position = 'sticky';
          firstRow.style.top = '0';
          firstRow.style.zIndex = '51';
        }
        
        if (secondRow) {
          secondRow.style.position = 'sticky';
          secondRow.style.top = '28px';
          secondRow.style.zIndex = '50';
        }
      });
    }

    // Funções para filtros múltiplos
    function openMainFilterModal() {
      document.getElementById('mainFilterOverlay').style.display = 'block';
      carregarEmpresas();
      carregarParceiros();
    }

    function closeMainFilterModal() {
      document.getElementById('mainFilterOverlay').style.display = 'none';
    }

    function openFilterModal() {
      document.getElementById('filterOverlay').style.display = 'block';
      loadBrandsForFilter();
    }

    function closeFilterModal() {
      document.getElementById('filterOverlay').style.display = 'none';
    }

    function openPriceTableFilterModal() {
      document.getElementById('priceTableFilterOverlay').style.display = 'block';
      loadPriceTablesForFilter();
    }

    function closePriceTableFilterModal() {
      document.getElementById('priceTableFilterOverlay').style.display = 'none';
    }

    function loadBrandsForFilter() {
      if (allBrands.length === 0) {
        // Extrair marcas únicas dos dados atuais
        const brands = [...new Set(currentTableData.map(row => row.MARCA).filter(marca => marca))];
        allBrands = brands.sort();
      }
      
      renderFilterOptions();
    }

    function loadPriceTablesForFilter() {
      if (allPriceTables.length === 0) {
        // Extrair tabelas de preço únicas dos dados atuais
        const allCodTabs = currentTableData.map(row => row.CODTAB);
        
        // Filtrar valores válidos (incluindo 0)
        const validCodTabs = allCodTabs.filter(codtab => 
          codtab !== null && 
          codtab !== undefined && 
          codtab !== '' && 
          codtab !== 'null' && 
          codtab !== 'undefined'
        );
        
        // Remover duplicatas e ordenar
        const priceTables = [...new Set(validCodTabs)];
        allPriceTables = priceTables.sort((a, b) => {
          // Ordenar numericamente se possível
          const numA = Number(a);
          const numB = Number(b);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          // Ordenar alfabeticamente se não for numérico
          return String(a).localeCompare(String(b));
        });
      }
      
      renderPriceTableFilterOptions();
    }

    function renderFilterOptions() {
      const container = document.getElementById('filterOptions');
      container.innerHTML = '';
      
      allBrands.forEach(brand => {
        const isSelected = selectedBrands.includes(brand);
        const option = document.createElement('div');
        option.className = `filter-option ${isSelected ? 'selected' : ''}`;
        option.onclick = () => toggleBrandSelection(brand);
        
        option.innerHTML = `
          <input type="checkbox" id="brand_${brand}" ${isSelected ? 'checked' : ''}>
          <label for="brand_${brand}">${brand}</label>
        `;
        
        container.appendChild(option);
      });
    }

    function renderPriceTableFilterOptions() {
      const container = document.getElementById('priceTableFilterOptions');
      container.innerHTML = '';
      
      allPriceTables.forEach(table => {
        const isSelected = selectedPriceTables.includes(table);
        const option = document.createElement('div');
        option.className = `filter-option ${isSelected ? 'selected' : ''}`;
        option.onclick = () => togglePriceTableSelection(table);
        
        option.innerHTML = `
          <input type="checkbox" id="table_${table}" ${isSelected ? 'checked' : ''}>
          <label for="table_${table}">${table}</label>
        `;
        
        container.appendChild(option);
      });
    }

    function toggleBrandSelection(brand) {
      const index = selectedBrands.indexOf(brand);
      if (index > -1) {
        selectedBrands.splice(index, 1);
      } else {
        selectedBrands.push(brand);
      }
      renderFilterOptions();
    }

    function togglePriceTableSelection(table) {
      const index = selectedPriceTables.indexOf(table);
      if (index > -1) {
        selectedPriceTables.splice(index, 1);
      } else {
        selectedPriceTables.push(table);
      }
      renderPriceTableFilterOptions();
    }

    function filterBrands() {
      const searchTerm = document.getElementById('filterSearch').value.toLowerCase();
      const options = document.querySelectorAll('#filterOptions .filter-option');
      
      options.forEach(option => {
        const label = option.querySelector('label').textContent.toLowerCase();
        if (label.includes(searchTerm)) {
          option.style.display = 'flex';
        } else {
          option.style.display = 'none';
        }
      });
    }

    function filterPriceTables() {
      const searchTerm = document.getElementById('priceTableFilterSearch').value.toLowerCase();
      const options = document.querySelectorAll('#priceTableFilterOptions .filter-option');
      
      options.forEach(option => {
        const label = option.querySelector('label').textContent.toLowerCase();
        if (label.includes(searchTerm)) {
          option.style.display = 'flex';
        } else {
          option.style.display = 'none';
        }
      });
    }

    function applyFilters() {
      applyCombinedFilters();
      closeFilterModal();
      showMsg(`Filtro aplicado: ${selectedBrands.length} marca(s) e ${selectedPriceTables.length} tabela(s) selecionada(s)`, true);
    }

    function applyPriceTableFilters() {
      applyCombinedFilters();
      closePriceTableFilterModal();
      showMsg(`Filtro aplicado: ${selectedBrands.length} marca(s) e ${selectedPriceTables.length} tabela(s) selecionada(s)`, true);
    }

    function clearAllFilters() {
      selectedBrands = [];
      selectedPriceTables = [];
      currentTableData = [...originalTableData];
      renderTableData();
      updateFilterSummary();
      closeFilterModal();
      closePriceTableFilterModal();
      showMsg('Filtros removidos', true);
    }

    function clearAllPriceTableFilters() {
      selectedPriceTables = [];
      currentTableData = [...originalTableData];
      renderTableData();
      updateFilterSummary();
      closePriceTableFilterModal();
      showMsg('Filtros de tabela removidos', true);
    }

    function updateFilterSummary() {
      const summary = document.getElementById('filterSummary');
      
      const brandFilters = selectedBrands.length > 0 ? `
        <span style="font-size: 12px; color: #666;">Marcas selecionadas:</span>
        ${selectedBrands.map(brand => `
          <span class="filter-badge">
            ${brand}
            <span class="remove" onclick="removeBrandFilter('${brand}')">&times;</span>
          </span>
        `).join('')}
      ` : '';
      
      const priceTableFilters = selectedPriceTables.length > 0 ? `
        <span style="font-size: 12px; color: #666;">Tabelas selecionadas:</span>
        ${selectedPriceTables.map(table => `
          <span class="filter-badge" style="background: #e3f2fd; color: #1976d2; border-color: #bbdefb;">
            ${table}
            <span class="remove" onclick="removePriceTableFilter('${table}')">&times;</span>
          </span>
        `).join('')}
      ` : '';
      
      if (selectedBrands.length === 0 && selectedPriceTables.length === 0) {
        summary.innerHTML = '<span class="no-filters">Nenhum filtro aplicado</span>';
      } else {
        summary.innerHTML = brandFilters + priceTableFilters;
      }
    }

    function removeBrandFilter(brand) {
      const index = selectedBrands.indexOf(brand);
      if (index > -1) {
        selectedBrands.splice(index, 1);
        applyCombinedFilters();
      }
    }

    function removePriceTableFilter(table) {
      const index = selectedPriceTables.indexOf(table);
      if (index > -1) {
        selectedPriceTables.splice(index, 1);
        applyCombinedFilters();
      }
    }

    function applyCombinedFilters() {
      let filteredData = [...originalTableData];
      
      // Aplicar filtro de marcas
      if (selectedBrands.length > 0) {
        filteredData = filteredData.filter(row => 
          selectedBrands.includes(row.MARCA)
        );
      }
      
      // Aplicar filtro de tabelas de preço
      if (selectedPriceTables.length > 0) {
        filteredData = filteredData.filter(row => 
          selectedPriceTables.includes(row.CODTAB)
        );
      }
      
      currentTableData = filteredData;
      renderTableData();
      updateFilterSummary();
    }

    function renderTableData() {
      const tbody = document.getElementById('dataTableBody');
      if (!tbody) return;
      
      tbody.innerHTML = '';
      
      currentTableData.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-green-100';
        
        // Determinar classes de grupo
        const currentCodtabMarca = `${row.CODTAB}-${row.MARCA}`;
        const isSummaryRow = row.NUTAB == 0 && row.DESCRPROD == '1';
        const rowClass = isSummaryRow ? 'summary-row' : '';
        
        tr.className = `border-b border-green-100 ${rowClass}`;
        
        tr.innerHTML = `
          <td class="col-codtab" title="${row.CODTAB}">
            ${row.NUTAB == 0 ? '0' : row.NUTAB}
          </td>
          <td class="col-codtab" title="${row.CODTAB}">${row.CODTAB}</td>
          <td class="col-tabela" title="${row.NOMETAB}">${row.NOMETAB}</td>
          <td class="col-codprod" title="${row.CODPROD}">
            ${row.CODPROD == null ? '' : row.CODPROD}
          </td>
          <td class="col-produto" title="${row.DESCRPROD}">
            ${row.DESCRPROD == '1' ? '1' : row.DESCRPROD}
          </td>
          <td class="col-marca" title="${row.MARCA}">${row.MARCA}</td>
          <td class="col-vol">${row.AD_QTDVOLLT}</td>
          <td class="col-pond">${row.POND_MARCA}</td>
          <td class="col-custo">
            ${parseFloat(row.CUSTO_SATIS).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </td>
          <td class="col-preco" style="background-color: #f3cdef;">
            ${parseFloat(row.PRECO_TAB).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </td>
          <td class="col-margem" style="background-color: #f3cdef;">
            ${parseFloat(row.MARGEM).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </td>
          <td class="col-preco15" style="background-color: #7575ec; color: white;">
            ${parseFloat(row.PRECO_TAB_MENOS15).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </td>
          <td class="col-margem15" style="background-color: #7575ec; color: white;">
            ${parseFloat(row.MARGEM_MENOS15).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </td>
          <td class="col-preco35" style="background-color: #9dec9d;">
            ${parseFloat(row.PRECO_TAB_MENOS65).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </td>
          <td class="col-margem35" style="background-color: #9dec9d;">
            ${parseFloat(row.MARGEM_MENOS65).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </td>
          <td class="col-ticket-obj">
            ${parseFloat(row.TICKET_MEDIO_OBJETIVO).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </td>
          <td class="col-ticket-12m">
            ${parseFloat(row.TICKET_MEDIO_ULT_12_M).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </td>
          <td class="col-ticket-safra">
            ${parseFloat(row.TICKET_MEDIO_SAFRA).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </td>
          <td class="col-custo-atu">
            ${parseFloat(row.CUSTO_SATIS_ATU).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </td>
          <td class="col-nova-margem">
            <input type="number" step="0.01" class="row-margin border border-green-300 rounded px-1 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-400 text-center" value="" data-custo="${row.CUSTO_SATIS_ATU}" />
          </td>
          <td class="col-novo-preco">
            <div class="flex items-center justify-center space-x-1">
              <input type="number" step="0.01" class="row-price border border-green-300 rounded px-1 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-400 text-center" value="" data-custo="${row.CUSTO_SATIS_ATU}" data-preco-tab="${row.PRECO_TAB}" />
              <span class="price-arrow text-sm ml-1"></span>
            </div>
          </td>
          <td class="col-dt-vigor">
            <input type="text" class="row-dtvigor border border-green-300 rounded px-1 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-400 text-center" value="" placeholder="dd/mm/aaaa" maxlength="10" />
          </td>
        `;
        
        tbody.appendChild(tr);
      });
      
      // Reaplicar event listeners para os novos inputs
      applyRowEventListeners();
    }

    function applyRowEventListeners() {
      // Row event listeners
      document.querySelectorAll('.row-price').forEach(function(input) {
        input.addEventListener('input', function() {
          const custo = parseFloat(this.dataset.custo);
          const price = parseFloat(this.value);
          const row = this.closest('tr');
          const marginInput = row.querySelector('.row-margin');
          if (!isNaN(price) && !isNaN(custo)) {
            marginInput.value = calcMargin(price, custo);
          } else {
            marginInput.value = '';
          }
          
          // Update price arrow
          updatePriceArrow(this);
        });
      });
      
      document.querySelectorAll('.row-margin').forEach(function(input) {
        input.addEventListener('input', function() {
          const custo = parseFloat(this.dataset.custo);
          const margin = parseFloat(this.value);
          const row = this.closest('tr');
          const priceInput = row.querySelector('.row-price');
          if (!isNaN(margin) && !isNaN(custo)) {
            priceInput.value = calcPrice(margin, custo);
          } else {
            priceInput.value = '';
          }
        });
      });
    }

    function showMsg(msg, success = true) {
      // Implementar função de mensagem se necessário
      console.log(msg);
    }

    function getFirstCusto() {
      // Use the first row's CUSTO_SATIS_ATU as reference for global calculation
      const first = document.querySelector('.row-price');
      return first ? parseFloat(first.dataset.custo) : NaN;
    }

    // Date validation for dd/mm/yyyy
    function isValidBRDate(dateStr) {
      // Regex for dd/mm/yyyy
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return false;
      const [d, m, y] = dateStr.split('/').map(Number);
      const date = new Date(y, m - 1, d);
      return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }

    // Optional: auto-format on input (for all date fields)
    function autoFormatDateInput(input) {
      input.addEventListener('input', function(e) {
        let v = input.value.replace(/\D/g, '');
        if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
        if (v.length > 5) v = v.slice(0,5) + '/' + v.slice(5,9);
        input.value = v;
      });
    }

    // Funções para carregar dados
    function carregarEmpresas() {
      const sql = `SELECT CODEMP, NOMEFANTASIA FROM TSIEMP WHERE CODEMP <> 999 ORDER BY 1`;
      
      JX.consultar(sql).then(res => {
        const empresas = res || [];
        const select = document.getElementById('empresaSelect');
        select.innerHTML = '<option value="">Selecione uma empresa *</option>';
        
        empresas.forEach(empresa => {
          const option = document.createElement('option');
          option.value = empresa.CODEMP;
          option.textContent = `${empresa.CODEMP} - ${empresa.NOMEFANTASIA}`;
          select.appendChild(option);
        });
      }).catch(() => {
        showMsg('Erro ao carregar empresas', false);
      });
    }

    function carregarParceiros() {
      const sql = `SELECT CODPARC, PARCEIRO FROM VGF_VENDAS_SATIS GROUP BY CODPARC, PARCEIRO ORDER BY 2`;
      
      // Mostrar loading
      const optionsContainer = document.getElementById('parceiroOptions');
      optionsContainer.innerHTML = '<div class="custom-select-loading"><i class="fas fa-spinner"></i> Carregando parceiros...</div>';
      
      JX.consultar(sql).then(res => {
        const parceiros = res || [];
        allParceiros = parceiros;
        filteredParceiros = [...parceiros];
        
        renderParceirosOptions();
      }).catch(() => {
        showMsg('Erro ao carregar parceiros', false);
        optionsContainer.innerHTML = '<div class="custom-select-no-results">Erro ao carregar parceiros</div>';
      });
    }

    function renderParceirosOptions() {
      const optionsContainer = document.getElementById('parceiroOptions');
      optionsContainer.innerHTML = '';
      
      // Opção padrão
      const defaultOption = document.createElement('div');
      defaultOption.className = 'custom-select-option';
      defaultOption.setAttribute('data-value', '');
      defaultOption.onclick = () => selectParceiro('', 'Todos os parceiros');
      defaultOption.innerHTML = '<span>Todos os parceiros</span>';
      optionsContainer.appendChild(defaultOption);
      
      // Mostrar estatísticas se não houver filtro
      const searchInput = document.getElementById('parceiroSearch');
      if (!searchInput.value) {
        const statsDiv = document.createElement('div');
        statsDiv.className = 'custom-select-stats';
        statsDiv.innerHTML = `<small style="color: #666; padding: 8px 12px; display: block; border-bottom: 1px solid #eee;">
          ${filteredParceiros.length} parceiro(s) disponível(is)
        </small>`;
        optionsContainer.appendChild(statsDiv);
      }
      
      // Opções filtradas - agrupadas por letra inicial se não houver filtro
      if (!searchInput.value && filteredParceiros.length > 20) {
        // Agrupar por letra inicial para melhor organização
        const grouped = {};
        filteredParceiros.forEach(parceiro => {
          const firstLetter = parceiro.PARCEIRO.charAt(0).toUpperCase();
          if (!grouped[firstLetter]) {
            grouped[firstLetter] = [];
          }
          grouped[firstLetter].push(parceiro);
        });
        
        Object.keys(grouped).sort().forEach(letter => {
          // Cabeçalho do grupo
          const groupHeader = document.createElement('div');
          groupHeader.className = 'custom-select-group-header';
          groupHeader.innerHTML = `<strong style="color: #23a059; padding: 8px 12px; display: block; background: #f8f9fa; border-bottom: 1px solid #e9ecef;">${letter}</strong>`;
          optionsContainer.appendChild(groupHeader);
          
          // Opções do grupo
          grouped[letter].forEach(parceiro => {
            const option = document.createElement('div');
            option.className = 'custom-select-option';
            option.setAttribute('data-value', parceiro.CODPARC);
            option.onclick = () => selectParceiro(parceiro.CODPARC, `${parceiro.CODPARC} - ${parceiro.PARCEIRO}`);
            
            option.innerHTML = `
              <span class="parceiro-code">${parceiro.CODPARC}</span>
              <span class="parceiro-name">${parceiro.PARCEIRO}</span>
            `;
            
            optionsContainer.appendChild(option);
          });
        });
      } else {
        // Lista simples quando há filtro ou poucos itens
        filteredParceiros.forEach(parceiro => {
          const option = document.createElement('div');
          option.className = 'custom-select-option';
          option.setAttribute('data-value', parceiro.CODPARC);
          option.onclick = () => selectParceiro(parceiro.CODPARC, `${parceiro.CODPARC} - ${parceiro.PARCEIRO}`);
          
          option.innerHTML = `
            <span class="parceiro-code">${parceiro.CODPARC}</span>
            <span class="parceiro-name">${parceiro.PARCEIRO}</span>
          `;
          
          optionsContainer.appendChild(option);
        });
      }
      
      if (filteredParceiros.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'custom-select-no-results';
        noResults.textContent = 'Nenhum parceiro encontrado';
        optionsContainer.appendChild(noResults);
      }
    }

    function toggleParceiroDropdown() {
      const dropdown = document.getElementById('parceiroDropdown');
      const trigger = document.querySelector('.custom-select-trigger');
      const isOpen = dropdown.style.display === 'block';
      
      if (isOpen) {
        dropdown.style.display = 'none';
        trigger.classList.remove('active');
      } else {
        // Fechar outros dropdowns se existirem
        document.querySelectorAll('.custom-select-dropdown').forEach(d => d.style.display = 'none');
        document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('active'));
        
        // Posicionar o dropdown
        const triggerRect = trigger.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const dropdownHeight = 300; // altura máxima do dropdown
        
        let topPosition = triggerRect.bottom + 5;
        
        // Verificar se o dropdown vai sair da tela
        if (topPosition + dropdownHeight > windowHeight) {
          topPosition = triggerRect.top - dropdownHeight - 5;
        }
        
        const windowWidth = window.innerWidth;
        let leftPosition = triggerRect.left;
        
        // Verificar se o dropdown vai sair da tela horizontalmente
        if (leftPosition + triggerRect.width > windowWidth) {
          leftPosition = windowWidth - triggerRect.width - 10;
        }
        
        dropdown.style.left = leftPosition + 'px';
        dropdown.style.top = topPosition + 'px';
        dropdown.style.width = triggerRect.width + 'px';
        
        dropdown.style.display = 'block';
        trigger.classList.add('active');
        
        // Focar no campo de busca
        setTimeout(() => {
          const searchInput = document.getElementById('parceiroSearch');
          if (searchInput) {
            searchInput.focus();
          }
        }, 100);
      }
    }

    function selectParceiro(value, displayText) {
      const hiddenInput = document.getElementById('parceiroSelect');
      const displaySpan = document.getElementById('parceiroDisplay');
      const trigger = document.querySelector('.custom-select-trigger');
      const dropdown = document.getElementById('parceiroDropdown');
      
      hiddenInput.value = value;
      displaySpan.textContent = displayText;
      
      // Atualizar seleção visual
      document.querySelectorAll('#parceiroOptions .custom-select-option').forEach(option => {
        option.classList.remove('selected');
        if (option.getAttribute('data-value') === value) {
          option.classList.add('selected');
        }
      });
      
      // Fechar dropdown
      dropdown.style.display = 'none';
      trigger.classList.remove('active');
    }

    function filterParceiros() {
      const searchTerm = document.getElementById('parceiroSearch').value.toLowerCase();
      
      if (!searchTerm) {
        filteredParceiros = [...allParceiros];
      } else {
        filteredParceiros = allParceiros.filter(parceiro => 
          parceiro.CODPARC.toString().toLowerCase().includes(searchTerm) ||
          parceiro.PARCEIRO.toLowerCase().includes(searchTerm)
        );
      }
      
      renderParceirosOptions();
    }

    // Navegação por teclado no dropdown de parceiros
    document.addEventListener('keydown', function(event) {
      const parceiroDropdown = document.getElementById('parceiroDropdown');
      const parceiroSearch = document.getElementById('parceiroSearch');
      
      if (parceiroDropdown && parceiroDropdown.style.display === 'block') {
        const options = parceiroDropdown.querySelectorAll('.custom-select-option');
        const selectedOption = parceiroDropdown.querySelector('.custom-select-option.selected');
        let currentIndex = -1;
        
        if (selectedOption) {
          currentIndex = Array.from(options).indexOf(selectedOption);
        }
        
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            if (currentIndex < options.length - 1) {
              if (selectedOption) selectedOption.classList.remove('selected');
              options[currentIndex + 1].classList.add('selected');
            }
            break;
          case 'ArrowUp':
            event.preventDefault();
            if (currentIndex > 0) {
              if (selectedOption) selectedOption.classList.remove('selected');
              options[currentIndex - 1].classList.add('selected');
            }
            break;
          case 'Enter':
            event.preventDefault();
            if (selectedOption) {
              const value = selectedOption.getAttribute('data-value');
              const text = selectedOption.textContent.trim();
              selectParceiro(value, text);
            }
            break;
          case 'Escape':
            event.preventDefault();
            parceiroDropdown.style.display = 'none';
            document.querySelector('.custom-select-trigger').classList.remove('active');
            break;
        }
      }
    });

    // Fechar modal ao clicar fora dele
    document.addEventListener('click', function(event) {
      const overlay = document.getElementById('filterOverlay');
      const priceTableOverlay = document.getElementById('priceTableFilterOverlay');
      const mainFilterOverlay = document.getElementById('mainFilterOverlay');
      const modal = document.querySelector('.filter-modal');
      
      if (event.target === overlay) {
        closeFilterModal();
      }
      
      if (event.target === priceTableOverlay) {
        closePriceTableFilterModal();
      }
      
      if (event.target === mainFilterOverlay) {
        closeMainFilterModal();
      }
      
      // Fechar dropdown de parceiros ao clicar fora
      const parceiroDropdown = document.getElementById('parceiroDropdown');
      const parceiroTrigger = document.querySelector('.custom-select-trigger');
      
      if (parceiroDropdown && parceiroTrigger && 
          !parceiroDropdown.contains(event.target) && 
          !parceiroTrigger.contains(event.target)) {
        parceiroDropdown.style.display = 'none';
        parceiroTrigger.classList.remove('active');
      }
    });

    // Função para formatar data de DD/MM/YYYY para DDMMYYYY
    function formatDateForQuery(dateStr) {
      if (!dateStr) return '';
      // Remove barras e espaços
      return dateStr.replace(/[\/\s]/g, '');
    }

    // Função para validar formato de data DD/MM/YYYY
    function isValidDate(dateStr) {
      if (!dateStr) return true; // Vazio é válido
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!regex.test(dateStr)) return false;
      
      const [, day, month, year] = dateStr.match(regex);
      const date = new Date(year, month - 1, day);
      return date.getDate() === parseInt(day) &&
             date.getMonth() === parseInt(month) - 1 &&
             date.getFullYear() === parseInt(year) &&
             date <= new Date(); // Garante que a data não é no futuro
    }

    function listarResumoMaterial() {
      const periodoInput = document.getElementById('periodoInput').value;
      const empresaSelect = document.getElementById('empresaSelect');
      const parceiroSelect = document.getElementById('parceiroSelect');
      const empresa = empresaSelect.value;
      const codparc = parceiroSelect.value;

      // Validar se empresa foi selecionada
      if (!empresa) {
        showMsg('Por favor, selecione uma empresa', false);
        return;
      }

      // Validar se período foi informado
      if (!periodoInput) {
        showMsg('Por favor, informe o período de referência', false);
        return;
      }

      // Validar formato da data
      if (!isValidDate(periodoInput)) {
        showMsg('Por favor, insira a data no formato DD/MM/YYYY', false);
        return;
      }

      const periodo = formatDateForQuery(periodoInput);

      // Usar a query existente do teste1.jsp mas com os parâmetros dinâmicos
      const sql = `
      SELECT 
        NVL(NUTAB,0)NUTAB,
        CODTAB,
        SUBSTR(NOMETAB, 1, 3) NOMETAB,
        CODPROD,
        DESCRPROD,
        MARCA,
        NVL(AD_QTDVOLLT,0) AS AD_QTDVOLLT,
        NVL(POND_MARCA,0) AS POND_MARCA,
        CUSTO_SATIS,
        PRECO_TAB,
        MARGEM,
        PRECO_TAB_MENOS15,
        MARGEM_MENOS15,
        PRECO_TAB_MENOS65,
        MARGEM_MENOS65,
        TICKET_MEDIO_OBJETIVO,
        TICKET_MEDIO_ULT_12_M,
        TICKET_MEDIO_SAFRA,
        CUSTO_SATIS_ATU 
        FROM (

        WITH CUS AS (
        SELECT CODPROD, CODEMP, CUSTO_SATIS
        FROM (
        SELECT
          CODPROD,
          CODEMP,
          OBTEMCUSTO_SATIS(CODPROD, 'S', CODEMP, 'N', 0, 'N', ' ', TO_DATE('${periodo}', 'DDMMYYYY'), 3) AS CUSTO_SATIS,
          ROW_NUMBER() OVER (PARTITION BY CODEMP, CODPROD ORDER BY DTATUAL DESC) AS RN
        FROM TGFCUS
        WHERE DTATUAL <= TO_DATE('${periodo}', 'DDMMYYYY')
        AND CODEMP = ${empresa} 
        )
        WHERE RN = 1
        ),
        CUS_ATUAL AS (
        SELECT CODPROD, CODEMP, CUSTO_SATIS
        FROM (
        SELECT
          CODPROD,
          CODEMP,
          OBTEMCUSTO_SATIS(CODPROD, 'S', CODEMP, 'N', 0, 'N', ' ', SYSDATE, 3) AS CUSTO_SATIS,
          ROW_NUMBER() OVER (PARTITION BY CODEMP, CODPROD ORDER BY DTATUAL DESC) AS RN
        FROM TGFCUS
        WHERE DTATUAL <= SYSDATE
        AND CODEMP =  ${empresa} 
        )
        WHERE RN = 1
        ),
        PON AS (
        SELECT 
        CODEMP,
        PROD,
        CODPROD,
        DESCRPROD,
        MARCA,
        CODGRUPOPROD,
        DESCRGRUPOPROD,
        ROUND(SUM(QTD) /  NULLIF(SUM(SUM(QTD)) OVER (PARTITION BY CODEMP),0),2) AS POND_MARCA

        FROM VGF_VENDAS_SATIS
        WHERE DTNEG >= ADD_MONTHS(TO_DATE('${periodo}', 'DDMMYYYY'), -12)
        AND DTNEG < TO_DATE('${periodo}', 'DDMMYYYY')
        AND CODEMP =  ${empresa} 

        GROUP BY CODEMP, PROD, CODPROD, DESCRPROD, MARCA, CODGRUPOPROD, DESCRGRUPOPROD
        ),
        MET AS (
        SELECT 
        MARCA, 
        SUM(QTDPREV) AS QTDPREV,
        SUM(VLR_PREV) AS VLR_PREV,
        SUM(VLR_PREV) / NULLIF(SUM(QTDPREV), 0) AS TICKET_MEDIO_OBJETIVO
        FROM (
        SELECT DISTINCT
          MET.CODMETA,
          MET.DTREF,
          MET.CODVEND,
          MET.CODPARC,
          MET.MARCA,
          MET.QTDPREV,
          MET.QTDPREV * PRC.VLRVENDALT AS VLR_PREV
        FROM TGFMET MET
        LEFT JOIN VGF_VENDAS_SATIS VGF 
          ON MET.DTREF = TRUNC(VGF.DTMOV, 'MM') 
        AND MET.CODVEND = VGF.CODVEND 
        AND MET.CODPARC = VGF.CODPARC 
        AND MET.MARCA = VGF.MARCA 
        AND VGF.BONIFICACAO = 'N'
        LEFT JOIN AD_PRECOMARCA PRC 
          ON MET.MARCA = PRC.MARCA 
        AND PRC.CODMETA = MET.CODMETA 
        AND PRC.DTREF = (
            SELECT MAX(DTREF)
            FROM AD_PRECOMARCA
            WHERE CODMETA = MET.CODMETA
              AND DTREF <= MET.DTREF
              AND MARCA = MET.MARCA
        )
        LEFT JOIN TGFPAR PAR ON MET.CODPARC = PAR.CODPARC
        LEFT JOIN TGFVEN VEN ON MET.CODVEND = VEN.CODVEND
        WHERE MET.CODMETA = 4
        AND (${codparc || 'NULL'} IS NULL OR MET.CODPARC = ${codparc || 'NULL'})
        AND MET.DTREF BETWEEN 
            CASE 
                WHEN EXTRACT(MONTH FROM TO_DATE('${periodo}', 'DDMMYYYY')) <= 6 
                THEN TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') - INTERVAL '6' MONTH
                ELSE TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') + INTERVAL '6' MONTH
            END
        AND 
            CASE 
                WHEN EXTRACT(MONTH FROM TO_DATE('${periodo}', 'DDMMYYYY')) <= 6 
                THEN LAST_DAY(TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') + INTERVAL '5' MONTH)
                ELSE LAST_DAY(TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') + INTERVAL '17' MONTH)
            END
        )
        GROUP BY MARCA
        ),
        FAT AS (
        SELECT CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD, NVL(SUM(QTD),0) QTD,NVL(SUM(VLR),0) VLR,
        NVL(SUM(VLR)/NULLIF(SUM(QTD),0),0) TICKET_MEDIO_ULT_12_M,NVL(SUM(VLR)/NULLIF(SUM(QTDNEG),0),0) TICKET_MEDIO_PRO_ULT_12_M
        FROM VGF_VENDAS_SATIS
        WHERE 
        DTNEG >= ADD_MONTHS(TO_DATE('${periodo}', 'DDMMYYYY'), -12)
        AND DTNEG < TO_DATE('${periodo}', 'DDMMYYYY')
        AND CODEMP =  ${empresa} 
        AND (${codparc || 'NULL'} IS NULL OR CODPARC = ${codparc || 'NULL'})
        GROUP BY CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD
        ),
        FAT1 AS (
        SELECT CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD, NVL(SUM(QTD),0) QTD_SAFRA,NVL(SUM(VLR),0) VLR_SAFRA,
        NVL(SUM(VLR)/NULLIF(SUM(QTD),0),0) TICKET_MEDIO_SAFRA,NVL(SUM(VLR)/NULLIF(SUM(QTDNEG),0),0) TICKET_MEDIO_PRO_SAFRA
        FROM VGF_VENDAS_SATIS
        WHERE 
        DTNEG BETWEEN 
        CASE 
        WHEN EXTRACT(MONTH FROM TO_DATE('${periodo}', 'DDMMYYYY')) <= 6 
        THEN TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') - INTERVAL '6' MONTH
        ELSE TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') + INTERVAL '6' MONTH
        END
        AND 
        CASE 
        WHEN EXTRACT(MONTH FROM TO_DATE('${periodo}', 'DDMMYYYY')) <= 6 
        THEN LAST_DAY(TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') + INTERVAL '5' MONTH)
        ELSE LAST_DAY(TRUNC(TO_DATE('${periodo}', 'DDMMYYYY'), 'YYYY') + INTERVAL '17' MONTH)
        END
        AND CODEMP = ${empresa}
        AND (${codparc || 'NULL'} IS NULL OR CODPARC = ${codparc || 'NULL'})
        GROUP BY CODEMP,PROD,CODPROD,DESCRPROD,MARCA,CODGRUPOPROD,DESCRGRUPOPROD
        ),
        PRE_ATUAL AS (
        SELECT 
        CODTAB,NOMETAB,DTVIGOR,CODPROD,VLRVENDA_ATUAL
        FROM (
        SELECT
        TAB.CODTAB,
        NTA.NOMETAB,
        TAB.DTVIGOR,
        PRO.CODPROD,
        NVL(EXC.VLRVENDA,0) VLRVENDA_ATUAL,
        ROW_NUMBER() OVER (PARTITION BY TAB.CODTAB,PRO.CODPROD ORDER BY TAB.DTVIGOR DESC) AS RN
        FROM TGFPRO PRO
        INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
        LEFT JOIN TGFEXC EXC ON PRO.CODPROD = EXC.CODPROD
        LEFT JOIN TGFTAB TAB ON EXC.NUTAB = TAB.NUTAB
        LEFT JOIN TGFNTA NTA ON TAB.CODTAB = NTA.CODTAB
        WHERE SUBSTR(PRO.CODGRUPOPROD, 1, 1) = '1'
        AND NTA.ATIVO = 'S' AND PRO.ATIVO = 'S' AND TAB.DTVIGOR <= SYSDATE

        ) SUB
        WHERE RN = 1
        ),
        BAS AS (
        SELECT * FROM (
        SELECT DISTINCT
        TAB.NUTAB,
        NTA.CODTAB, 
        NTA.NOMETAB, 
        PRO.CODPROD, 
        PRO.DESCRPROD, 
        PRO.MARCA,
        PRO.AD_QTDVOLLT,
        NVL(PON.POND_MARCA, 0) AS POND_MARCA,
        TAB.DTVIGOR,
        NVL(SNK_GET_PRECO(TAB.NUTAB, PRO.CODPROD, TO_DATE('${periodo}', 'DDMMYYYY')), 0) AS PRECO_TAB,
        NVL(CUS.CUSTO_SATIS, 0) AS CUSTO_SATIS,
        MET.TICKET_MEDIO_OBJETIVO * PRO.AD_QTDVOLLT AS TICKET_MEDIO_OBJETIVO,
        MET.TICKET_MEDIO_OBJETIVO TICKET_MEDIO_OBJETIVO_MARCA,
        FAT.TICKET_MEDIO_ULT_12_M,
        FAT.TICKET_MEDIO_PRO_ULT_12_M,
        FAT1.TICKET_MEDIO_SAFRA,
        FAT1.TICKET_MEDIO_PRO_SAFRA,
        PRE.VLRVENDA_ATUAL,
        CUS_ATU.CUSTO_SATIS CUSTO_SATIS_ATU,
        ROW_NUMBER() OVER (PARTITION BY TAB.CODTAB, PRO.CODPROD ORDER BY TAB.DTVIGOR DESC) AS RN
        FROM TGFPRO PRO
        INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
        LEFT JOIN TGFEXC EXC ON PRO.CODPROD = EXC.CODPROD
        LEFT JOIN TGFTAB TAB ON EXC.NUTAB = TAB.NUTAB
        LEFT JOIN TGFNTA NTA ON TAB.CODTAB = NTA.CODTAB

        LEFT JOIN CUS ON PRO.CODPROD = CUS.CODPROD
        LEFT JOIN CUS_ATUAL CUS_ATU ON PRO.CODPROD = CUS_ATU.CODPROD
        LEFT JOIN PON ON PRO.CODPROD = PON.CODPROD
        LEFT JOIN MET ON PRO.MARCA = MET.MARCA
        LEFT JOIN FAT ON PRO.CODPROD = FAT.CODPROD
        LEFT JOIN FAT1 ON PRO.CODPROD = FAT1.CODPROD
        LEFT JOIN PRE_ATUAL PRE ON PRO.CODPROD = PRE.CODPROD AND TAB.CODTAB = PRE.CODTAB
        WHERE NTA.ATIVO = 'S'
        AND PRO.CODGRUPOPROD LIKE '1%'
        AND PRO.ATIVO = 'S'
        AND TAB.DTVIGOR <= TO_DATE('${periodo}', 'DDMMYYYY')

        ORDER BY NTA.CODTAB, PRO.CODPROD
        )WHERE RN = 1)

        SELECT 
        NUTAB,
        CODTAB, 
        NOMETAB, 
        CODPROD, 
        DESCRPROD, 
        MARCA,
        AD_QTDVOLLT,
        POND_MARCA,
        DTVIGOR,
        CUSTO_SATIS,
        PRECO_TAB,
        NVL(((PRECO_TAB - CUSTO_SATIS) / NULLIF(PRECO_TAB, 0)) * 100, 0) AS MARGEM,
        PRECO_TAB * 0.85 AS PRECO_TAB_MENOS15,
        NVL((((PRECO_TAB * 0.85) - CUSTO_SATIS) / NULLIF(PRECO_TAB * 0.85, 0)) * 100, 0) AS MARGEM_MENOS15,
        PRECO_TAB * 0.65 AS PRECO_TAB_MENOS65,
        NVL((((PRECO_TAB * 0.65) - CUSTO_SATIS) / NULLIF(PRECO_TAB * 0.65, 0)) * 100, 0) AS MARGEM_MENOS65,
        NVL(TICKET_MEDIO_OBJETIVO,0)TICKET_MEDIO_OBJETIVO,
        NVL(TICKET_MEDIO_PRO_ULT_12_M,0)TICKET_MEDIO_ULT_12_M,
        NVL(TICKET_MEDIO_PRO_SAFRA,0)TICKET_MEDIO_SAFRA,
        NVL(CUSTO_SATIS_ATU,0) CUSTO_SATIS_ATU
        FROM BAS

        UNION ALL

        SELECT 
        NULL NUTAB,
        CODTAB,
        NOMETAB,
        NULL CODPROD,
        '1' DESCRPROD,
        MARCA,
        NULL AD_QTDVOLLT,
        NULL POND_MARCA,
        NULL DTVIGOR,
        SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) AS CUSTO_SATIS,
        SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) AS PRECO_TAB,

        NVL((
        SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) - 
        SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)
        ) / NULLIF(SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA), 0) * 100, 0) AS MARGEM,

        SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)*0.85 AS PRECO_TAB_MENOS15,

        NVL((
        SUM(((PRECO_TAB*0.85) / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) - 
        SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)
        ) / NULLIF( SUM(((PRECO_TAB*0.85) / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) , 0) * 100, 0) AS MARGEM_MENOS15,

        SUM((PRECO_TAB / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)*0.65 AS PRECO_TAB_MENOS65,

        NVL((
        SUM(((PRECO_TAB*0.65)  / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) - 
        SUM((CUSTO_SATIS / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA)
        ) / NULLIF(SUM(((PRECO_TAB*0.65)  / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA), 0) * 100, 0) AS MARGEM_MENOS65,


        TICKET_MEDIO_OBJETIVO_MARCA TICKET_MEDIO_OBJETIVO,
        SUM(TICKET_MEDIO_ULT_12_M  * POND_MARCA) AS TICKET_MEDIO_ULT_12_M,
        SUM(TICKET_MEDIO_SAFRA  * POND_MARCA) AS TICKET_MEDIO_SAFRA,
        SUM((CUSTO_SATIS_ATU / NULLIF(AD_QTDVOLLT, 0)) * POND_MARCA) CUSTO_SATIS_ATU
        FROM BAS
        GROUP BY 
        CODTAB,
        NOMETAB,
        MARCA,
        TICKET_MEDIO_OBJETIVO_MARCA
        )
        ORDER BY 2,6,4 DESC
      `;
      
      JX.consultar(sql).then(res => {
        const dados = res || [];
        
        // Armazenar dados originais e atuais
        originalTableData = [...dados];
        currentTableData = [...dados];
        
        // Limpar filtros anteriores
        selectedBrands = [];
        selectedPriceTables = [];
        allBrands = [];
        allPriceTables = [];
        
        // Renderizar dados
        renderTableData();
        updateFilterSummary();
        
        showMsg('Dados carregados com sucesso!', true);
      }).catch(() => showMsg('Erro ao listar dados', false));
    }

    // Inicialização quando a página carregar
    document.addEventListener('DOMContentLoaded', function() {
      // Aplicar event listeners para os controles globais
      applyRowEventListeners();
      
      // Aplicar event listeners para os controles globais existentes
      const globalPrice = document.getElementById('globalNewPrice');
      const globalMargin = document.getElementById('globalNewMargin');
      const globalDtVigor = document.getElementById('globalDtVigor');
      let globalSync = false;
      
      if (globalPrice) {
        globalPrice.addEventListener('input', function() {
          if (globalSync) return;
          globalSync = true;
          const custo = getFirstCusto();
          if (!isNaN(parseFloat(this.value)) && !isNaN(custo)) {
            globalMargin.value = calcMargin(parseFloat(this.value), custo);
          } else {
            globalMargin.value = '';
          }
          globalSync = false;
        });
      }
      
      if (globalMargin) {
        globalMargin.addEventListener('input', function() {
          if (globalSync) return;
          globalSync = true;
          const custo = getFirstCusto();
          if (!isNaN(parseFloat(this.value)) && !isNaN(custo)) {
            globalPrice.value = calcPrice(parseFloat(this.value), custo);
          } else {
            globalPrice.value = '';
          }
          globalSync = false;
        });
      }
      
      if (document.getElementById('applyGlobalPrice')) {
        document.getElementById('applyGlobalPrice').addEventListener('click', function() {
          const price = parseFloat(globalPrice.value);
          document.querySelectorAll('.row-price').forEach(function(input) {
            if (!isNaN(price)) {
              input.value = price;
              const custo = parseFloat(input.dataset.custo);
              const row = input.closest('tr');
              const marginInput = row.querySelector('.row-margin');
              marginInput.value = calcMargin(price, custo);
              updatePriceArrow(input);
            }
          });
        });
      }
      
      if (document.getElementById('applyGlobalMargin')) {
        document.getElementById('applyGlobalMargin').addEventListener('click', function() {
          const margin = parseFloat(globalMargin.value);
          document.querySelectorAll('.row-margin').forEach(function(input) {
            if (!isNaN(margin)) {
              input.value = margin;
              const custo = parseFloat(input.dataset.custo);
              const row = input.closest('tr');
              const priceInput = row.querySelector('.row-price');
              priceInput.value = calcPrice(margin, custo);
              updatePriceArrow(priceInput);
            }
          });
        });
      }
      
      if (document.getElementById('applyGlobalDtVigor')) {
        document.getElementById('applyGlobalDtVigor').addEventListener('click', function() {
          const dtVigor = globalDtVigor.value;
          if (!isValidBRDate(dtVigor)) {
            alert('Por favor, insira a data no formato dd/mm/aaaa.');
            return;
          }
          document.querySelectorAll('.row-dtvigor').forEach(function(input) {
            input.value = dtVigor;
          });
        });
      }
      
      // Auto-format para campos de data
      if (globalDtVigor) {
        autoFormatDateInput(globalDtVigor);
      }
      document.querySelectorAll('.row-dtvigor').forEach(autoFormatDateInput);
      
      // Adicionar evento do botão insertDataBtn
      const insertDataBtn = document.getElementById('insertDataBtn');
      if (insertDataBtn) {
        insertDataBtn.addEventListener('click', async function () {
          const btn = this;
          
          const rawData = collectTableData();
          
          // Validate that both novoPreco and dataVigor are filled for each record
          const invalidRecords = rawData.filter(item => 
            item.codigoProduto?.trim() !== '' && 
            (!item.novoPreco?.trim() || !item.dataVigor?.trim())
          );
          
          if (invalidRecords.length > 0) {
            showStatusOverlay('Validação', 'Todos os registros devem ter tanto o Novo Preço quanto a Data de Vigor preenchidos. Verifique os campos vazios.', 'error');
            return;
          }
          
          const data = rawData.filter(item =>
            item.codigoProduto?.trim() !== '' &&
            item.novoPreco?.trim() !== '' &&
            item.dataVigor?.trim() !== ''
          );

          if (data.length === 0) {
            showStatusOverlay('Aviso', 'Nenhum dado válido encontrado para inserir. Por favor, preencha tanto o Novo Preço quanto a Data de Vigor para pelo menos um registro.', 'error');
            return;
          }

          // Ask for user confirmation before proceeding
          const confirmMessage = `Tem certeza que deseja inserir ou atualizar registros na Tabela de Preços?\n\nEsta ação irá adicionar novos registros ou atualizar os registros atuais na tabela.`;
          
          if (!confirm(confirmMessage)) {
            return; // User cancelled the operation
          }

          btn.disabled = true;

          // Show processing overlay
          showStatusOverlay('Processando...', `Inserindo ${data.length} registros no banco de dados...`, 'processing');

          try {
            // Verificar se JX está disponível
            if (typeof JX === 'undefined') {
              throw new Error('Biblioteca JX não está carregada');
            }
            
            for (const item of data) {
              const nextId = await getNextId();

              const record = {
                ID: nextId,
                NUTAB: item.numeroTabela || '',
                CODTAB: item.codigoTabela || '',
                CODPROD: item.codigoProduto || '',
                NOVO_PRECO: item.novoPreco || '',
                DTVIGOR: item.dataVigor || ''
              };

              await JX.salvar(record, 'AD_ESTIMATIVAPRECO');
              console.log(`Registro ${nextId} salvo com sucesso.`);
            }

            showStatusOverlay('Sucesso', `${data.length} registros foram salvos com sucesso!`, 'success');
          } catch (error) {
            console.error('Erro ao salvar dados:', error);
            showStatusOverlay('Erro', 'Erro ao salvar dados. Verifique o console para detalhes.', 'error');
          } finally {
            btn.disabled = false;
          }
        });
      } else {
        console.error('Botão insertDataBtn não encontrado!');
      }
    });
  </script>

<script>
  // Função para converter data de dd/mm/aaaa para aaaa-mm-dd
  function convertDateToOracle(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0');
    }
    return null;
  }

  // Função para coletar dados da tabela
  function collectTableData() {
    const table = document.getElementById('dataTable');
    const rows = table.querySelectorAll('tbody tr');
    const data = [];
    
    rows.forEach(row => {
      // Only process visible rows (not filtered out)
      if (row.style.display === 'none') {
        return;
      }
      
      const cells = row.cells;
      const priceInput = row.querySelector('.row-price');
      const dtVigorInput = row.querySelector('.row-dtvigor');
      
      const rowData = {
        numeroTabela: cells[0].textContent.trim(),
        codigoTabela: cells[1].textContent.trim(),
        codigoProduto: cells[3].textContent.trim(),
        novoPreco: priceInput ? priceInput.value : '',
        dataVigor: dtVigorInput ? dtVigorInput.value : ''
      };
      
      // Só adiciona se pelo menos um dos campos editáveis tiver valor
      if (rowData.novoPreco || rowData.dataVigor) {
        data.push(rowData);
      }
    });
    
    return data;
  }

  // Função para formatar números no padrão brasileiro
  function formatBrazilianNumber(value) {
    if (value === null || value === undefined || value === '') return '';
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Função para converter string numérica para formato brasileiro
  function convertToBrazilianFormat(value) {
    if (!value || value.trim() === '') return '';
    
    // Remove any existing formatting and convert to number
    const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const num = parseFloat(cleanValue);
    
    if (isNaN(num)) return value;
    
    // Format with Brazilian locale (comma as decimal, dot as thousands)
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Função para coletar dados da tabela para Excel (apenas linhas visíveis)
  function collectTableDataForExcel() {
    const table = document.getElementById('dataTable');
    const rows = table.querySelectorAll('tbody tr');
    const data = [];
    
    rows.forEach(row => {
      // Only process visible rows (not filtered out)
      if (row.style.display === 'none') {
        return;
      }
      
      const cells = row.cells;
      const rowData = {
        'Nú.': cells[0].textContent.trim(),
        'Cód.': cells[1].textContent.trim(),
        'Tab.': cells[2].textContent.trim(),
        'Cód. Prod.': cells[3].textContent.trim(),
        'Produto': cells[4].textContent.trim(),
        'Marca': cells[5].textContent.trim(),
        'LT': convertToBrazilianFormat(cells[6].textContent.trim()),
        'Peso': convertToBrazilianFormat(cells[7].textContent.trim()),
        'Custo Satis': convertToBrazilianFormat(cells[8].textContent.trim()),
        'Preço Tab.': convertToBrazilianFormat(cells[9].textContent.trim()),
        'Margem Tab.': convertToBrazilianFormat(cells[10].textContent.trim()),
        'Preço Consum.': convertToBrazilianFormat(cells[11].textContent.trim()),
        'Margem Consum.': convertToBrazilianFormat(cells[12].textContent.trim()),
        'Preço Rev.': convertToBrazilianFormat(cells[13].textContent.trim()),
        'Margem Rev.': convertToBrazilianFormat(cells[14].textContent.trim()),
        'Ticket Objetivo': convertToBrazilianFormat(cells[15].textContent.trim()),
        'Ticket Últ. 12M': convertToBrazilianFormat(cells[16].textContent.trim()),
        'Ticket Safra': convertToBrazilianFormat(cells[17].textContent.trim()),
        'Custo Atual': convertToBrazilianFormat(cells[18].textContent.trim()),
        'Nova Margem': convertToBrazilianFormat(row.querySelector('.row-margin').value),
        'Novo Preço': convertToBrazilianFormat(row.querySelector('.row-price').value),
        'Dt. Vigor': row.querySelector('.row-dtvigor').value
      };
      
      data.push(rowData);
    });
    
    return data;
  }

  // Event listener para exportar Excel
  document.getElementById('exportJsonBtn').addEventListener('click', function() {
    const data = collectTableDataForExcel();
    
    if (data.length === 0) {
      showStatusOverlay('Aviso', 'Nenhum dado para exportar. A tabela está vazia ou não há linhas visíveis com o filtro atual.', 'error');
      return;
    }
    
    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Set column widths
      const colWidths = [
        { wch: 8 },   // Nú.
        { wch: 8 },   // Cód.
        { wch: 6 },   // Tab.
        { wch: 12 },  // Cód. Prod.
        { wch: 40 },  // Produto
        { wch: 10 },  // Marca
        { wch: 6 },   // LT
        { wch: 8 },   // Peso
        { wch: 12 },  // Custo Satis
        { wch: 12 },  // Preço Tab.
        { wch: 12 },  // Margem Tab.
        { wch: 12 },  // Preço Consum.
        { wch: 12 },  // Margem Consum.
        { wch: 12 },  // Preço Rev.
        { wch: 12 },  // Margem Rev.
        { wch: 12 },  // Ticket Objetivo
        { wch: 12 },  // Ticket Últ. 12M
        { wch: 12 },  // Ticket Safra
        { wch: 12 },  // Custo Atual
        { wch: 12 },  // Nova Margem
        { wch: 12 },  // Novo Preço
        { wch: 12 }   // Dt. Vigor
      ];
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Resumo Material');
      
      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const filename = `resumo_material_${dateStr}_${timeStr}.xlsx`;
      
      // Export the file
      XLSX.writeFile(wb, filename);
      
      showStatusOverlay('Sucesso', `${data.length} linhas exportadas para Excel com sucesso!`, 'success');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      showStatusOverlay('Erro', 'Erro ao exportar arquivo Excel. Verifique o console para detalhes.', 'error');
    }
  });

// Função para buscar o próximo ID disponível na tabela
async function getNextId() {
  const result = await JX.consultar('SELECT MAX(ID) AS MAXID FROM AD_ESTIMATIVAPRECO');
  const maxId = result?.[0]?.MAXID || 0;
  return parseInt(maxId, 10) + 1;
}


// Status overlay functions
function showStatusOverlay(title, message, type = 'success') {
  const overlay = document.getElementById('statusOverlay');
  const icon = document.getElementById('statusIcon');
  const titleEl = document.getElementById('statusTitle');
  const messageEl = document.getElementById('statusMessage');
  
  icon.className = `status-icon ${type}`;
  
  if (type === 'success') {
    icon.innerHTML = '<i class="fas fa-check-circle"></i>';
  } else if (type === 'error') {
    icon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
  } else if (type === 'processing') {
    icon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }
  
  titleEl.textContent = title;
  messageEl.textContent = message;
  
  overlay.style.display = 'flex';
}

function hideStatusOverlay() {
  document.getElementById('statusOverlay').style.display = 'none';
}

    // Close button event listener
    document.getElementById('statusCloseBtn').addEventListener('click', hideStatusOverlay);

    // Table filtering functionality
    const tableFilter = document.getElementById('tableFilter');
    const dataTable = document.getElementById('dataTable');
    const tbody = dataTable.querySelector('tbody');
    const originalRows = Array.from(tbody.querySelectorAll('tr'));

    function filterTable() {
      const filterValue = tableFilter.value.toLowerCase().trim();
      
      if (!filterValue) {
        // Show all rows if filter is empty
        originalRows.forEach(row => {
          row.style.display = '';
        });
        return;
      }

      // Split filter terms by pipe character
      const searchTerms = filterValue.split('|').map(term => term.trim()).filter(term => term.length > 0);
      
      originalRows.forEach(row => {
        const cells = Array.from(row.cells);
        const rowText = cells.map(cell => cell.textContent || cell.innerText).join(' ').toLowerCase();
        
        // Check if any search term matches the row text
        const matches = searchTerms.some(term => rowText.includes(term));
        
        row.style.display = matches ? '' : 'none';
      });
    }

    // Add event listener for real-time filtering
    tableFilter.addEventListener('input', filterTable);
</script>
</body>
</html>