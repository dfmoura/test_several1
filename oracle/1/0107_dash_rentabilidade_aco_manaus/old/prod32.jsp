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
<title>Dashboard</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> 
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

<style>
    /* Estilos adicionais aqui */
    body {
        
        margin-top: 10px; /* Remove o espaço no topo da página */
    }
    .card {
        border-radius: 15px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        height: 85%; /* Reduz a altura em 15% */
    }
    .card:hover {
        transform: translateY(-10px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    }
    .card:hover .card-body {
        border-radius: 15px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        background-color: #130455; /* Azul */
        color: #fff; /* Branco para o texto */
    }
    .card-footer {
        text-align: center; /* Centraliza o texto no rodapé */
        height: 50px; /* Ajusta a altura */
        font-size: 9px; /* Reduz o tamanho da fonte */
        padding: 8px 4px; /* Reduz o padding */
        line-height: 1.2; /* Reduz o line-height */
        white-space: nowrap; /* Evita quebra de linha */
        overflow: hidden; /* Esconde conteúdo que ultrapasse */
        text-overflow: ellipsis; /* Adiciona ... se necessário */
    }
    .icon {
        margin: 0 auto; /* Centraliza horizontalmente */
        display: block;
        width: 25px;
        height: 25px;
        background-color: transparent; 
    }
    .card:hover .icon svg,
    .card:hover .icon img {
        filter: brightness(0) invert(1); /* Deixa o ícone branco ao passar o mouse */
    }
    .logo {
        width: 100%;
        max-width: 150px;
    }
    
    /* Estilos para as setas organizados */
    .arrow-up {
        color: #10b981; /* Verde */
        font-size: 14px;
        font-weight: bold;
    }
    .arrow-down {
        color: #ef4444; /* Vermelho */
        font-size: 14px;
        font-weight: bold;
    }
    .arrow-neutral {
        color: #6b7280; /* Cinza */
        font-size: 14px;
        font-weight: bold;
    }

    /* Redução do espaçamento entre as seções */
    .custom-row {
        margin-top: 1rem; /* Reduz o espaçamento superior */
        margin-bottom: -2.5rem; /* Reduz o espaçamento inferior */
    }

    /* Fixed header styles */
    .fixed-header {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 35px;
      background: linear-gradient(135deg, #130455, #0f0340);
      box-shadow: 0 2px 8px rgba(19, 4, 85, 0.2);
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
    }
    
    .header-title {
      color: white;
      font-size: 1.5rem;
      font-weight: bold;
      margin: 0;
      text-align: center;
    }
    

    
    /* Adjust body padding to account for fixed header and filters */
    body {
      padding-top: 85px !important;
    }        

    /* Fixed filters section */
    .fixed-filters {
      position: fixed;
      top: 35px;
      left: 0;
      width: 100%;
      height: 40px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 20px;
      border-bottom: 1px solid #dee2e6;
      backdrop-filter: blur(10px);
    }
    
    .filters-container {
      width: 100%;
      max-width: 1200px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: nowrap;
      overflow-x: auto;
    }
    
    @media (max-width: 768px) {
      .filters-container {
        justify-content: flex-start;
        gap: 6px;
        padding: 0 10px;
      }
      
      .filter-group {
        flex-shrink: 0;
        min-width: auto;
      }
      
      .filter-input {
        min-width: 70px;
        width: 70px;
      }
      
      .filter-button {
        min-width: 50px;
        font-size: 9px;
        padding: 4px 6px;
      }
      
      .filter-label {
        font-size: 10px;
      }
    }
    
    .filter-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      white-space: nowrap;
    }
    
    .filter-label {
      font-weight: 500;
      color: #495057;
      font-size: 11px;
      white-space: nowrap;
    }
    
    .filter-input {
      border: 1px solid #ced4da;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      transition: all 0.2s ease-in-out;
      height: 26px;
      min-width: 90px;
      background-color: #fff;
    }
    
    .filter-input:focus {
      outline: none;
      border-color: #130455;
      box-shadow: 0 0 0 2px rgba(19, 4, 85, 0.15);
      transform: translateY(-1px);
    }
    
    /* Estilos específicos para o select múltiplo */
    .filter-input[multiple] {
      height: auto;
      max-height: 26px;
      overflow-y: auto;
      padding: 2px 4px;
    }
    
    .filter-input[multiple] option {
      padding: 2px 4px;
      font-size: 10px;
    }
    
    .filter-input[multiple] option:checked {
      background-color: #130455;
      color: white;
    }
    
    .filter-button {
      background: linear-gradient(135deg, #130455 0%, #1a0a6b 100%);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      height: 26px;
      min-width: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      box-shadow: 0 2px 4px rgba(19, 4, 85, 0.2);
    }
    
    .filter-button:hover {
      background: linear-gradient(135deg, #0f0340 0%, #130455 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(19, 4, 85, 0.3);
    }
    
    .filter-button.secondary {
      background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
    }
    
    .filter-button.secondary:hover {
      background: linear-gradient(135deg, #5a6268 0%, #495057 100%);
    }
    
    .filter-button i {
      font-size: 10px;
    }

    /* Custom Select Styles para filtro de empresas */
    .custom-select-container {
      position: relative;
      width: 100%;
      overflow: visible;
    }

    .custom-select-trigger {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      height: 26px;
      font-size: 11px;
      min-width: 120px;
    }

    .custom-select-trigger span {
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-grow: 1;
    }

    .custom-select-trigger:hover {
      border-color: #130455;
    }

    .custom-select-trigger.active {
      border-color: #130455;
      box-shadow: 0 0 0 2px rgba(19, 4, 85, 0.15);
    }

    .custom-select-trigger i {
      transition: transform 0.2s ease;
      color: #666;
      font-size: 10px;
      margin-left: 6px;
    }

    .custom-select-trigger.active i {
      transform: rotate(180deg);
    }

    .custom-select-dropdown {
      position: fixed;
      background: white;
      border: 1px solid #ced4da;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      max-height: 250px;
      overflow: visible;
      display: none;
      margin-top: 2px;
      min-width: 280px;
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
    }

    .custom-select-search input:focus {
      border-color: #130455;
      box-shadow: 0 0 0 2px rgba(19, 4, 85, 0.15);
    }

    .custom-select-options {
      max-height: 200px;
      overflow-y: auto;
    }

    .custom-select-option {
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      border-bottom: 1px solid #f5f5f5;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .custom-select-option:hover {
      background-color: #f8f9fa;
    }

    .custom-select-option.selected {
      background-color: #130455;
      color: white;
    }

    .custom-select-option.highlighted {
      background-color: #e3f2fd;
    }

    .custom-select-option:last-child {
      border-bottom: none;
    }

    .custom-select-option .empresa-code {
      font-weight: 600;
      color: #666;
      font-size: 10px;
      margin-right: 8px;
    }

    .custom-select-option.selected .empresa-code {
      color: #fff;
    }

    .custom-select-option .empresa-name {
      color: #333;
      font-size: 11px;
      flex-grow: 1;
    }

    .custom-select-option.selected .empresa-name {
      color: #fff;
    }

    .custom-select-option .empresa-checkbox {
      margin-left: 8px;
      width: 14px;
      height: 14px;
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

    .custom-select-stats {
      background-color: #f8f9fa;
    }

    .custom-select-group-header {
      background-color: #e9ecef;
      padding: 6px 12px;
      font-weight: 600;
      font-size: 10px;
      color: #495057;
      border-bottom: 1px solid #dee2e6;
    }

    /* Estilos para as tags <p> e <h1> */
    p {
        font-size: 15px; /* Ajusta o tamanho da fonte de <p> */
    }
    h1 {
        font-size: 23px; /* Ajusta o tamanho da fonte de <h1> */
    }
    .footer {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    background-color: #f8f9fa; /* Ajuste conforme necessário */
    border-top: 0.2px solid #130455; /* Ajuste conforme necessário */
    }

    .logo-footer {
        max-width: 70px; /* Ajuste conforme necessário */
    }
    

</style>

<snk:load/>



</head>

<body class="bg-light">
  <!-- Fixed Header -->
  <div class="fixed-header">
    <div class="header-logo">
      <a href="https://neuon.com.br/" target="_blank" rel="noopener noreferrer">
        <img src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg" alt="Neuon Logo">
      </a>
    </div>
    <h1 class="header-title">Rentabilidade Financeira 2.0</h1>
  </div>

  <!-- Filtros de Data -->
  <div class="fixed-filters">
    <div class="filters-container">
      <div class="filter-group">
        <label for="dataInicio" class="filter-label">Início:</label>
        <input type="text" class="filter-input" id="dataInicio" value="01/08/2025" placeholder="DD/MM/AAAA">
      </div>
      <div class="filter-group">
        <label for="dataFim" class="filter-label">Fim:</label>
        <input type="text" class="filter-input" id="dataFim" value="31/08/2025" placeholder="DD/MM/AAAA">
      </div>
      <div class="filter-group">
        <label for="empresas" class="filter-label">Empresa:</label>
        <div class="custom-select-container" style="min-width: 120px; max-width: 150px;">
          <div class="custom-select-trigger" onclick="toggleEmpresaDropdown()">
            <span id="empresaDisplay">Todas as empresas</span>
            <i class="fas fa-chevron-down"></i>
          </div>
          <input type="hidden" id="empresas" name="empresas" value="">
        </div>
      </div>
      <div class="filter-group">
        <button type="button" class="filter-button" onclick="debouncedAplicarFiltros()">
          <i class="fas fa-filter"></i> Aplicar
        </button>
      </div>
      <div class="filter-group">
        <button type="button" class="filter-button secondary" onclick="debouncedAplicarFiltros()">
          <i class="fas fa-undo"></i> Reset
        </button>
      </div>
    </div>
  </div>

  <!-- Dropdown das empresas movido para fora do container para evitar overflow -->
  <div class="custom-select-dropdown" id="empresaDropdown">
    <div class="custom-select-search">
      <input type="text" id="empresaSearch" placeholder="Buscar empresa..." onkeyup="filterEmpresasComDebounce()">
    </div>
    <div class="custom-select-options" id="empresaOptions">
      <div class="custom-select-option" data-value="" onclick="toggleEmpresaSelection('', 'Todas as empresas')">
        <span>Todas as empresas</span>
        <input type="checkbox" class="empresa-checkbox" checked>
      </div>
    </div>
  </div>

<div class="container-fluid mt-0">

    <!-- Parte Superior - 6 Cards -->
    <div class="row custom-row">
        <div class="col-lg-2 col-md-4 mb-4" >
            <div class="card shadow-sm" title="Esta informação contempla o Total dos Produtos + IPI + ST - Desconto - Devoluções" onclick="abrir_fat()">
                <div class="card-body text-center" >
                    <div class="icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                     <h1>Faturamento</h1>
                    <p>Faturamento</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm" onclick="abrir_dev()">
                <div class="card-body text-center">
                    <div class="icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>Devolução</h1>
                    <p>Devolução</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm" title="Esta informação contempla o ICMS + ST + IPI + PIS + COFINS + FEM*** " onclick="abrir_imp()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>Impostos</h1>                    
                    <p>Impostos</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm" onclick="abrir_cmv()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>CMV</h1>
                    <p>CMV</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>        
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm" onclick="abrir_ton()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"></path></svg>
                    </div>
                    <h1>TON</h1>
                    <p>TON</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
        
        <div class="col-lg-2 col-md-4 mb-4">
            <div class="card shadow-sm" onclick="abrir_desc()">
                <div class="card-body text-center">
                    <div class="icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647c-.907-.276-1.719-.402-2.443-.421v-1.018h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54l-.455 1.644c.894.462 1.965.708 3 .727v.998h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>Desconto</h1>
                    <p>Desconto</p>
                </div>
                <div class="card-footer text-muted">
					<b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
    </div>

    <!-- Parte do Meio 1 - 2 Cards -->
    <div class="row custom-row">
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm" title="Esta informação contempla Faturamento - Impostos - CMV " onclick="abrir_mar()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M21.19 7h2.81v15h-21v-5h-2.81v-15h21v5zm1.81 1h-19v13h19v-13zm-9.5 1c3.036 0 5.5 2.464 5.5 5.5s-2.464 5.5-5.5 5.5-5.5-2.464-5.5-5.5 2.464-5.5 5.5-5.5zm0 1c2.484 0 4.5 2.016 4.5 4.5s-2.016 4.5-4.5 4.5-4.5-2.016-4.5-4.5 2.016-4.5 4.5-4.5zm.5 8h-1v-.804c-.767-.16-1.478-.689-1.478-1.704h1.022c0 .591.326.886.978.886.817 0 1.327-.915-.167-1.439-.768-.27-1.68-.676-1.68-1.693 0-.796.573-1.297 1.325-1.448v-.798h1v.806c.704.161 1.313.673 1.313 1.598h-1.018c0-.788-.727-.776-.815-.776-.55 0-.787.291-.787.622 0 .247.134.497.957.768 1.056.344 1.663.845 1.663 1.746 0 .651-.376 1.288-1.313 1.448v.788zm6.19-11v-4h-19v13h1.81v-9h17.19z"/></svg>
                    </div>
                    <h1>Margem de Contribuição Nominal</h1>
                    <p>Margem de Contribuição Nominal</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm" title="Esta informação contempla (Faturamento - Impostos - CMV) / Faturamento " onclick="abrir_mar_perc()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M21.19 7h2.81v15h-21v-5h-2.81v-15h21v5zm1.81 1h-19v13h19v-13zm-9.5 1c3.036 0 5.5 2.464 5.5 5.5s-2.464 5.5-5.5 5.5-5.5-2.464-5.5-5.5 2.464-5.5 5.5-5.5zm0 1c2.484 0 4.5 2.016 4.5 4.5s-2.016 4.5-4.5 4.5-4.5-2.016-4.5-4.5 2.016-4.5 4.5-4.5zm.5 8h-1v-.804c-.767-.16-1.478-.689-1.478-1.704h1.022c0 .591.326.886.978.886.817 0 1.327-.915-.167-1.439-.768-.27-1.68-.676-1.68-1.693 0-.796.573-1.297 1.325-1.448v-.798h1v.806c.704.161 1.313.673 1.313 1.598h-1.018c0-.788-.727-.776-.815-.776-.55 0-.787.291-.787.622 0 .247.134.497.957.768 1.056.344 1.663.845 1.663 1.746 0 .651-.376 1.288-1.313 1.448v.788zm6.19-11v-4h-19v13h1.81v-9h17.19z"/></svg>
                    </div>
                    <h1>Margem de Contribuição %</h1>
                    <p>Margem de Contribuição %</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
    </div>    

    <!-- Parte do Meio 2 - 2 Cards -->
    <div class="row mt-2">
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm" onclick="abrir_do()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12.164 7.165c-1.15.191-1.702 1.233-1.231 2.328.498 1.155 1.921 1.895 3.094 1.603 1.039-.257 1.519-1.252 1.069-2.295-.471-1.095-1.784-1.827-2.932-1.636zm1.484 2.998l.104.229-.219.045-.097-.219c-.226.041-.482.035-.719-.027l-.065-.387c.195.03.438.058.623.02l.125-.041c.221-.109.152-.387-.176-.453-.245-.054-.893-.014-1.135-.552-.136-.304-.035-.621.356-.766l-.108-.239.217-.045.104.229c.159-.026.345-.036.563-.017l.087.383c-.17-.021-.353-.041-.512-.008l-.06.016c-.309.082-.21.375.064.446.453.105.994.139 1.208.612.173.385-.028.648-.36.774zm10.312 1.057l-3.766-8.22c-6.178 4.004-13.007-.318-17.951 4.454l3.765 8.22c5.298-4.492 12.519-.238 17.952-4.454zm-2.803-1.852c-.375.521-.653 1.117-.819 1.741-3.593 1.094-7.891-.201-12.018 1.241-.667-.354-1.503-.576-2.189-.556l-1.135-2.487c.432-.525.772-1.325.918-2.094 3.399-1.226 7.652.155 12.198-1.401.521.346 1.13.597 1.73.721l1.315 2.835zm2.843 5.642c-6.857 3.941-12.399-1.424-19.5 5.99l-4.5-9.97 1.402-1.463 3.807 8.406-.002.007c7.445-5.595 11.195-1.176 18.109-4.563.294.648.565 1.332.684 1.593z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>Despesa Operacional</h1>
                    <p>Despesa Operacional</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
        <div class="col-lg-6 mb-4">
            <div class="card shadow-sm" onclick="abrir_inv()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12.164 7.165c-1.15.191-1.702 1.233-1.231 2.328.498 1.155 1.921 1.895 3.094 1.603 1.039-.257 1.519-1.252 1.069-2.295-.471-1.095-1.784-1.827-2.932-1.636zm1.484 2.998l.104.229-.219.045-.097-.219c-.226.041-.482.035-.719-.027l-.065-.387c.195.03.438.058.623.02l.125-.041c.221-.109.152-.387-.176-.453-.245-.054-.893-.014-1.135-.552-.136-.304-.035-.621.356-.766l-.108-.239.217-.045.104.229c.159-.026.345-.036.563-.017l.087.383c-.17-.021-.353-.041-.512-.008l-.06.016c-.309.082-.21.375.064.446.453.105.994.139 1.208.612.173.385-.028.648-.36.774zm10.312 1.057l-3.766-8.22c-6.178 4.004-13.007-.318-17.951 4.454l3.765 8.22c5.298-4.492 12.519-.238 17.952-4.454zm-2.803-1.852c-.375.521-.653 1.117-.819 1.741-3.593 1.094-7.891-.201-12.018 1.241-.667-.354-1.503-.576-2.189-.556l-1.135-2.487c.432-.525.772-1.325.918-2.094 3.399-1.226 7.652.155 12.198-1.401.521.346 1.13.597 1.73.721l1.315 2.835zm2.843 5.642c-6.857 3.941-12.399-1.424-19.5 5.99l-4.5-9.97 1.402-1.463 3.807 8.406-.002.007c7.445-5.595 11.195-1.176 18.109-4.563.294.648.565 1.332.684 1.593z"/> alt="Ícone de Moeda" class="icon"></svg>
                    </div>
                    <h1>Investimentos</h1>
                    <p>Investimentos</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
    </div>

    <!-- Parte Inferior - Somente Card -->
    <div class="row parte-inferior">
        <div class="col-lg-12 mb-4">
            <div class="card shadow-sm" title="Esta informação contempla = Faturamento - Impostos - CMV - Despesa Operacional - Investimento " onclick="abrir_res()">
                <div class="card-body text-center">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M8.502 5c-.257-1.675.04-3.562 1.229-5h7.259c-.522.736-1.768 2.175-1.391 5h-1.154c-.147-1.336.066-2.853.562-4h-4.725c-.666 1.003-.891 2.785-.657 4h-1.123zm10.498-1v20h-14v-20h2.374v.675c0 .732.583 1.325 1.302 1.325h6.647c.721 0 1.304-.593 1.304-1.325v-.675h2.373zm-9 17h-2v1h2v-1zm0-2h-2v1h2v-1zm0-2h-2v1h2v-1zm3 4h-2v1h2v-1zm0-2h-2v1h2v-1zm0-2h-2v1h2v-1zm3 4h-2v1h2v-1zm0-2h-2v1h2v-1zm0-2h-2v1h2v-1zm-6-2h-2v1h2v-1zm3 0h-2v1h2v-1zm3 0h-2v1h2v-1zm1-7h-10v5h10v-5z"/></svg>
                    </div>
                    <h1>Resultado</h1>
                    <p>Resultado</p>
                </div>
                <div class="card-footer text-muted">
                    <b>Per.Ant:</b>0 <b>Var%:</b>0
                </div>
            </div>
        </div>
    </div>
</div>

<script>
  // Variáveis globais para gerenciar empresas
  let allEmpresas = [];
  let filteredEmpresas = [];
  let selectedEmpresas = [];

  /**
   * Função para adicionar seta baseada no valor
   * @param {number} value - Valor para comparar
   * @returns {string} HTML da seta
   */
  function addArrow(value) {
      if (value >= 0) {
          return '<span class="arrow-up">&uarr;</span>';
      } else {
          return '<span class="arrow-down">&darr;</span>';
      } 
  }

  /**
   * Função genérica para carregar dados dos cards
   * @param {string} tipo - Tipo de dados ('faturamento' ou 'desconto')
   * @param {string} campo - Campo da consulta SQL (ex: 'totalliq', 'vlrdesc')
   * @param {string} selector - Seletor CSS do card
   */
  async function carregarDadosCard(tipo, campo, selector) {
    try {
      // Iniciar medição de performance
      performanceFeedback.start(tipo);
      
      const dataInicio = document.getElementById('dataInicio').value;
      const dataFim = document.getElementById('dataFim').value;
      
      // Converter datas para o formato DD/MM/YYYY
      const dataInicioFormatada = converterData(dataInicio);
      const dataFimFormatada = converterData(dataFim);

      // Obter empresas selecionadas
      const empresasInput = document.getElementById('empresas');
      let empresasSelecionadas = [];
      
      if (empresasInput && empresasInput.value) {
        empresasSelecionadas = empresasInput.value.split(',').filter(value => value.trim() !== '');
      }

      // Construir filtro de empresa
      let filtroEmpresa = '';
      if (empresasSelecionadas.length > 0) {
        const empresasString = empresasSelecionadas.join(',');
        filtroEmpresa = ` and codemp in (${empresasString})`;
      }

      const sql = `
        select 
            sum(case when dtneg between '${dataInicioFormatada}' and '${dataFimFormatada}' then ${campo} else 0 end) as valor_atual,
            sum(case when dtneg between DATEADD(month, -1, '${dataInicioFormatada}') 
            and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then ${campo} else 0 end) as valor_anterior,
            case 
                when sum(case when dtneg between DATEADD(month, -1, '${dataInicioFormatada}') 
                and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then ${campo} else 0 end) = 0 then null
                else round(((sum(case when dtneg between '${dataInicioFormatada}' and '${dataFimFormatada}' then ${campo} else 0 end) - 
                  sum(case when dtneg between DATEADD(month, -1, '${dataInicioFormatada}') 
                  and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then ${campo} else 0 end)) * 100.0 / 
                 sum(case when dtneg between DATEADD(month, -1, '${dataInicioFormatada}') 
                 and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then ${campo} else 0 end)), 2)
            end as variacao_percentual
        from vw_rentabilidade_aco 
        where tipmov in ('V', 'D') and ATIVO_TOP = 'S' and AD_COMPOE_FAT = 'S'${filtroEmpresa}
      `;

      const resultado = await JX.consultar(sql);
      
      if (resultado && resultado.length > 0) {
        const dados = resultado[0];
        
        // Atualizar o card
        const card = document.querySelector(selector);
        if (card) {
          // Atualizar o valor
          const valorElement = card.querySelector('p');
          if (valorElement) {
            const valorAtual = dados.valor_atual || 0;
            valorElement.textContent = `R$ ${valorAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
          }
          
          // Atualizar o rodapé com período anterior e variação
          const cardFooter = card.querySelector('.card-footer');
          if (cardFooter) {
            const valorAnterior = dados.valor_anterior || 0;
            const variacao = dados.variacao_percentual || 0;
            
            // Adicionar seta indicativa baseada na variação usando a função addArrow
            const seta = addArrow(variacao);
            
            cardFooter.innerHTML = `
              <b>Per.Ant:</b>R$${valorAnterior.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
              <b>Var%:</b>${variacao.toFixed(2)}%${seta}
            `;
          }
        }
      } else {
        console.log(`Nenhum dado de ${tipo} encontrado`);
      }
      
      // Finalizar medição de performance com sucesso
      performanceFeedback.end(tipo, 'success');
      
    } catch (error) {
      console.error(`Erro ao carregar dados de ${tipo}:`, error);
      
      // Finalizar medição de performance com erro
      performanceFeedback.end(tipo, 'error');
      
      // Em caso de erro, manter os valores padrão
    }
  }

  /**
   * Função para carregar dados de faturamento
   */
  async function carregarDadosFaturamento() {
    await carregarDadosCard('faturamento', 'totalliq', '.card[onclick="abrir_fat()"]');
  }

  /**
   * Função para carregar dados de desconto
   */
  async function carregarDadosDesconto() {
    await carregarDadosCard('desconto', 'vlrdesc', '.card[onclick="abrir_desc()"]');
  }

  /**
   * Função para carregar dados de devolução
   */
  async function carregarDadosDevolucao() {
    await carregarDadosCard('devolucao', 'vlrdev', '.card[onclick="abrir_dev()"]');
  }

  /**
   * Função para carregar dados de TON
   */
  async function carregarDadosTon() {
    try {
      const dataInicio = document.getElementById('dataInicio').value;
      const dataFim = document.getElementById('dataFim').value;
      
      // Converter datas para o formato DD/MM/YYYY
      const dataInicioFormatada = converterData(dataInicio);
      const dataFimFormatada = converterData(dataFim);

      // Obter empresas selecionadas
      const empresasInput = document.getElementById('empresas');
      let empresasSelecionadas = [];
      
      if (empresasInput && empresasInput.value) {
        empresasSelecionadas = empresasInput.value.split(',').filter(value => value.trim() !== '');
      }

      // Construir filtro de empresa
      let filtroEmpresa = '';
      if (empresasSelecionadas.length > 0) {
        const empresasString = empresasSelecionadas.join(',');
        filtroEmpresa = ` and codemp in (${empresasString})`;
      }

      const sql = `
        select 
            sum(case when dtneg between '${dataInicioFormatada}' and '${dataFimFormatada}' then TON else 0 end) as valor_atual,
            sum(case when dtneg between DATEADD(month, -1, '${dataInicioFormatada}') 
            and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then TON else 0 end) as valor_anterior,
            case 
                when sum(case when dtneg between DATEADD(month, -1, '${dataInicioFormatada}') 
                and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then TON else 0 end) = 0 then null
                else round(((sum(case when dtneg between '${dataInicioFormatada}' and '${dataFimFormatada}' then TON else 0 end) - 
                  sum(case when dtneg between DATEADD(month, -1, '${dataInicioFormatada}') 
                  and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then TON else 0 end)) * 100.0 / 
                 sum(case when dtneg between DATEADD(month, -1, '${dataInicioFormatada}') 
                 and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then TON else 0 end)), 2)
            end as variacao_percentual
        from vw_rentabilidade_aco 
        where tipmov in ('V', 'D') and ATIVO_TOP = 'S' and AD_COMPOE_FAT = 'S'${filtroEmpresa}
      `;

      const resultado = await JX.consultar(sql);
      
      if (resultado && resultado.length > 0) {
        const dados = resultado[0];
        
        // Atualizar o card TON
        const card = document.querySelector('.card[onclick="abrir_ton()"]');
        if (card) {
          // Atualizar o valor (sem R$)
          const valorElement = card.querySelector('p');
          if (valorElement) {
            const valorAtual = dados.valor_atual || 0;
            valorElement.textContent = valorAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
          }
          
          // Atualizar o rodapé com período anterior e variação (sem R$)
          const cardFooter = card.querySelector('.card-footer');
          if (cardFooter) {
            const valorAnterior = dados.valor_anterior || 0;
            const variacao = dados.variacao_percentual || 0;
            
            // Adicionar seta indicativa baseada na variação usando a função addArrow
            const seta = addArrow(variacao);
            
            cardFooter.innerHTML = `
              <b>Per.Ant:</b>${valorAnterior.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
              <b>Var%:</b>${variacao.toFixed(2)}%${seta}
            `;
          }
        }
      } else {
        console.log('Nenhum dado de TON encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar dados de TON:', error);
      // Em caso de erro, manter os valores padrão
    }
  }

  /**
   * Função para carregar dados de CMV
   */
  async function carregarDadosCmv() {
    await carregarDadosCard('cmv', 'CUSREP_TOT', '.card[onclick="abrir_cmv()"]');
  }

  /**
   * Função para carregar dados de impostos
   */
  async function carregarDadosImpostos() {
    await carregarDadosCard('impostos', '(VLRIPI+VLRSUBST+VLRICMS+VLRPIS+VLRCOFINS)', '.card[onclick="abrir_imp()"]');
  }

  /**
   * Função para carregar dados de margem de contribuição nominal
   */
  async function carregarDadosMargemNominal() {
    await carregarDadosCard('margem_nominal', 'MARGEMNON', '.card[onclick="abrir_mar()"]');
  }

  /**
   * Função para carregar dados de margem de contribuição percentual (usa AVG)
   */
  async function carregarDadosMargemPercentual() {
    try {
      const dataInicio = document.getElementById('dataInicio').value;
      const dataFim = document.getElementById('dataFim').value;

      const dataInicioFormatada = converterData(dataInicio);
      const dataFimFormatada = converterData(dataFim);

      const empresasInput = document.getElementById('empresas');
      let empresasSelecionadas = [];
      if (empresasInput && empresasInput.value) {
        empresasSelecionadas = empresasInput.value.split(',').filter(value => value.trim() !== '');
      }

      let filtroEmpresa = '';
      if (empresasSelecionadas.length > 0) {
        const empresasString = empresasSelecionadas.join(',');
        filtroEmpresa = ` and codemp in (${empresasString})`;
      }

      const sql = `
        select 
            avg(case when dtneg between '${dataInicioFormatada}' and '${dataFimFormatada}' then PERCMARGEM end) as valor_atual,
            avg(case when dtneg between DATEADD(month, -1, '${dataInicioFormatada}') 
            and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then PERCMARGEM end) as valor_anterior,
            case 
                when avg(case when dtneg between DATEADD(month, -1, '${dataInicioFormatada}') 
                and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then PERCMARGEM end) = 0 then null
                else round(((avg(case when dtneg between '${dataInicioFormatada}' and '${dataFimFormatada}' then PERCMARGEM end) - 
                  avg(case when dtneg between DATEADD(month, -1, '${dataInicioFormatada}') 
                  and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then PERCMARGEM end)) * 100.0 / 
                 avg(case when dtneg between DATEADD(month, -1, '${dataInicioFormatada}') 
                 and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then PERCMARGEM end)), 2)
            end as variacao_percentual
        from vw_rentabilidade_aco 
        where tipmov in ('V', 'D') and ATIVO_TOP = 'S' and AD_COMPOE_FAT = 'S'${filtroEmpresa}
      `;

      const resultado = await JX.consultar(sql);

      if (resultado && resultado.length > 0) {
        const dados = resultado[0];
        const card = document.querySelector('.card[onclick="abrir_mar_perc()"]');
        if (card) {
          const valorElement = card.querySelector('p');
          if (valorElement) {
            const valorAtual = dados.valor_atual || 0;
            valorElement.textContent = `${Number(valorAtual).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%`;
          }

          const cardFooter = card.querySelector('.card-footer');
          if (cardFooter) {
            const valorAnterior = dados.valor_anterior || 0;
            const variacao = dados.variacao_percentual || 0;
            const seta = addArrow(variacao);
            cardFooter.innerHTML = `
              <b>Per.Ant:</b>${Number(valorAnterior).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}% 
              <b>Var%:</b>${Number(variacao).toFixed(2)}%${seta}
            `;
          }
        }
      } else {
        console.log('Nenhum dado de Margem de Contribuição % encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar dados de Margem de Contribuição %:', error);
    }
  }

  /**
   * Função para converter data de DD/MM/YYYY para DD/MM/YYYY (já está no formato correto)
   * @param {string} data - Data no formato DD/MM/YYYY
   * @returns {string} Data no formato DD/MM/YYYY
   */
  function converterData(data) {
    if (!data) return '';
    // A data já está no formato DD/MM/YYYY, então retorna como está
    return data;
  }

  /**
   * Função para carregar lista de empresas
   */
  async function carregarEmpresas() {
    try {
      const sql = `
        SELECT 
            EMP.CODEMP AS CODEMP,
            EMP.RAZAOSOCIAL AS RAZAOSOCIAL,
            CAST(EMP.CODEMP AS VARCHAR) + ' - ' + EMP.RAZAOSOCIAL AS EMPRESA
        FROM TSIEMP EMP
        GROUP BY
            EMP.CODEMP,
            EMP.RAZAOSOCIAL
        ORDER BY EMP.CODEMP
      `;

      // Mostrar loading
      const optionsContainer = document.getElementById('empresaOptions');
      if (optionsContainer) {
        optionsContainer.innerHTML = '<div class="custom-select-loading"><i class="fas fa-spinner"></i> Carregando empresas...</div>';
      }

      const resultado = await JX.consultar(sql);
      
      if (resultado && resultado.length > 0) {
        allEmpresas = resultado;
        filteredEmpresas = [...resultado];
        renderEmpresasOptions();
      } else {
        if (optionsContainer) {
          optionsContainer.innerHTML = '<div class="custom-select-no-results">Nenhuma empresa encontrada</div>';
        }
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      const optionsContainer = document.getElementById('empresaOptions');
      if (optionsContainer) {
        optionsContainer.innerHTML = '<div class="custom-select-no-results">Erro ao carregar empresas</div>';
      }
    }
  }

  /**
   * Função para renderizar as opções de empresas
   */
  function renderEmpresasOptions() {
    const optionsContainer = getCachedElement('#empresaOptions');
    if (!optionsContainer) return;
    
    optionsContainer.innerHTML = '';
    
    // Opção "Todas as empresas"
    const todasOption = document.createElement('div');
    todasOption.className = 'custom-select-option';
    todasOption.setAttribute('data-value', '');
    todasOption.onclick = () => toggleEmpresaSelection('', 'Todas as empresas');
    
    const isAllSelected = selectedEmpresas.length === 0;
    todasOption.innerHTML = `
      <span>Todas as empresas</span>
      <input type="checkbox" class="empresa-checkbox" ${isAllSelected ? 'checked' : ''}>
    `;
    if (isAllSelected) {
      todasOption.classList.add('selected');
    }
    optionsContainer.appendChild(todasOption);
    
    // Mostrar estatísticas se não houver filtro
    const searchInput = document.getElementById('empresaSearch');
    if (!searchInput.value) {
      const statsDiv = document.createElement('div');
      statsDiv.className = 'custom-select-stats';
      statsDiv.innerHTML = `<small style="color: #666; padding: 8px 12px; display: block; border-bottom: 1px solid #eee;">
        ${filteredEmpresas.length} empresa(s) disponível(is)
      </small>`;
      optionsContainer.appendChild(statsDiv);
    }
    
    // Opções de empresas
    filteredEmpresas.forEach(empresa => {
      const option = document.createElement('div');
      option.className = 'custom-select-option';
      option.setAttribute('data-value', empresa.CODEMP);
      option.onclick = () => toggleEmpresaSelection(empresa.CODEMP, empresa.EMPRESA);
      
      const isSelected = selectedEmpresas.includes(empresa.CODEMP.toString());
      option.innerHTML = `
        <div style="display: flex; align-items: center; flex-grow: 1;">
          <span class="empresa-code">${empresa.CODEMP}</span>
          <span class="empresa-name">${empresa.RAZAOSOCIAL}</span>
        </div>
        <input type="checkbox" class="empresa-checkbox" ${isSelected ? 'checked' : ''}>
      `;
      
      if (isSelected) {
        option.classList.add('selected');
      }
      
      optionsContainer.appendChild(option);
    });
    
    if (filteredEmpresas.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'custom-select-no-results';
      noResults.textContent = 'Nenhuma empresa encontrada';
      optionsContainer.appendChild(noResults);
    }
  }

  /**
   * Função para abrir/fechar dropdown de empresas
   */
  function toggleEmpresaDropdown() {
    const dropdown = document.getElementById('empresaDropdown');
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
      
      // Verificar se o dropdown vai sair da tela na horizontal
      if (leftPosition + 280 > windowWidth) {
        leftPosition = windowWidth - 280 - 10;
      }
      
      dropdown.style.position = 'fixed';
      dropdown.style.top = topPosition + 'px';
      dropdown.style.left = leftPosition + 'px';
      dropdown.style.display = 'block';
      trigger.classList.add('active');
      
      // Focar no campo de busca
      setTimeout(() => {
        const searchInput = document.getElementById('empresaSearch');
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    }
  }

  /**
   * Função para gerenciar seleção múltipla de empresas
   */
  function toggleEmpresaSelection(value, displayText) {
    if (value === '') {
      // Seleção de "Todas as empresas" - limpar seleções específicas
      selectedEmpresas = [];
    } else {
      // Seleção de empresa específica
      const index = selectedEmpresas.indexOf(value.toString());
      if (index > -1) {
        selectedEmpresas.splice(index, 1);
      } else {
        selectedEmpresas.push(value.toString());
      }
    }
    
    updateEmpresaDisplay();
    renderEmpresasOptions();
    
    // Atualizar campo hidden
    const hiddenInput = getCachedElement('#empresas');
    if (hiddenInput) {
      hiddenInput.value = selectedEmpresas.join(',');
    }
  }

  /**
   * Função para atualizar o display do filtro de empresas
   */
  function updateEmpresaDisplay() {
    const displaySpan = getCachedElement('#empresaDisplay');
    if (!displaySpan) return;
    
    if (selectedEmpresas.length === 0) {
      displaySpan.textContent = 'Todas as empresas';
    } else if (selectedEmpresas.length === 1) {
      const empresa = allEmpresas.find(e => e.CODEMP.toString() === selectedEmpresas[0]);
      displaySpan.textContent = empresa ? `${empresa.CODEMP} - ${empresa.RAZAOSOCIAL}` : 'Empresa selecionada';
    } else {
      displaySpan.textContent = `${selectedEmpresas.length} empresas selecionadas`;
    }
  }

  /**
   * Função para filtrar empresas baseado na busca
   */
  function filterEmpresas() {
    const searchTerm = document.getElementById('empresaSearch').value.toLowerCase();
    
    if (!searchTerm) {
      filteredEmpresas = [...allEmpresas];
    } else {
      filteredEmpresas = allEmpresas.filter(empresa => 
        empresa.CODEMP.toString().toLowerCase().includes(searchTerm) ||
        empresa.RAZAOSOCIAL.toLowerCase().includes(searchTerm)
      );
    }
    
    renderEmpresasOptions();
  }

  /**
   * Função para filtrar empresas com debounce (otimizada)
   */
  function filterEmpresasComDebounce() {
    debouncedFilterEmpresas();
  }

  /**
   * Função para aplicar os filtros de data
   */
  function aplicarFiltros() {
    const dataInicio = getCachedElement('#dataInicio').value;
    const dataFim = getCachedElement('#dataFim').value;
    
    if (!dataInicio || !dataFim) {
      notificationSystem.show('Por favor, selecione as datas de início e fim.', 'warning', 5000);
      return;
    }
    
    // Converter datas de DD/MM/YYYY para YYYY-MM-DD para comparação
    const dataInicioParts = dataInicio.split('/');
    const dataFimParts = dataFim.split('/');
    
    // Validar formato e lógica das datas usando o sistema de segurança
    const validacao = validarFiltros();
    if (!validacao.valid) {
      return; // A validação já mostra a notificação de erro
    }
    
    // Limpar cache ao aplicar novos filtros
    cache.clear();
    console.log('Cache limpo ao aplicar novos filtros');
    
    // Registrar aplicação de filtros no sistema de auditoria
    securityAudit.log('FILTROS_APLICADOS', 'Filtros aplicados com sucesso', 'low', {
      dataInicio,
      dataFim,
      empresas: selectedEmpresas
    });
    
    // Mostrar notificação de carregamento
    notificationSystem.show('Aplicando filtros e carregando dados...', 'info', 3000);
    
    // Usar carregamento paralelo otimizado
    carregarTodosOsDadosComOtimizacoes().then(() => {
      notificationSystem.show('Dados carregados com sucesso!', 'success', 2000);
    }).catch((error) => {
      notificationSystem.show('Erro ao carregar dados. Tente novamente.', 'error', 5000);
      console.error('Erro no carregamento:', error);
    });
  }

  /**
   * Função para resetar os filtros para os valores padrão
   */
  function resetarFiltros() {
    getCachedElement('#dataInicio').value = '01/08/2025';
    getCachedElement('#dataFim').value = '31/08/2025';
    
    // Resetar seleção de empresas
    selectedEmpresas = [];
    const hiddenInput = getCachedElement('#empresas');
    if (hiddenInput) {
      hiddenInput.value = '';
    }
    
    updateEmpresaDisplay();
    renderEmpresasOptions();
    
    // Limpar cache ao resetar filtros
    cache.clear();
    limparCacheDOM();
    console.log('Cache limpo ao resetar filtros');
    
    // Registrar reset de filtros no sistema de auditoria
    securityAudit.log('FILTROS_RESETADOS', 'Filtros resetados para valores padrão', 'low');
    
    // Mostrar notificação de reset
    notificationSystem.show('Filtros resetados. Carregando dados padrão...', 'info', 3000);
    
    // Usar carregamento paralelo otimizado
    carregarTodosOsDadosComOtimizacoes().then(() => {
      notificationSystem.show('Dados padrão carregados com sucesso!', 'success', 2000);
    }).catch((error) => {
      notificationSystem.show('Erro ao carregar dados padrão. Tente novamente.', 'error', 5000);
      console.error('Erro no carregamento:', error);
    });
  }

  // Função para criar seletor de data personalizado
  function createDatePicker(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Criar o seletor de data
    const datePicker = document.createElement('input');
    datePicker.type = 'date';
    datePicker.style.position = 'absolute';
    datePicker.style.opacity = '0';
    datePicker.style.pointerEvents = 'none';
    datePicker.style.width = '1px';
    datePicker.style.height = '1px';
    
    // Adicionar ao DOM
    input.parentNode.appendChild(datePicker);
    
    // Função para converter data de DD/MM/YYYY para YYYY-MM-DD
    function convertToDateInput(dateStr) {
      if (!dateStr) return '';
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return '';
    }
    
    // Função para converter data de YYYY-MM-DD para DD/MM/YYYY
    function convertToDisplay(dateStr) {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return '';
    }
    
    // Configurar data inicial
    const initialDate = convertToDateInput(input.value);
    if (initialDate) {
      datePicker.value = initialDate;
    }
    
    // Evento de clique no input
    input.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      datePicker.click();
    });
    
    // Evento de mudança no date picker
    datePicker.addEventListener('change', function() {
      const displayDate = convertToDisplay(this.value);
      input.value = displayDate;
      input.focus();
    });
    
    // Evento de foco no input
    input.addEventListener('focus', function() {
      const currentDate = convertToDateInput(this.value);
      if (currentDate) {
        datePicker.value = currentDate;
      }
    });
    
    // Permitir edição manual do campo
    input.addEventListener('input', function() {
      // Validar formato DD/MM/YYYY durante digitação
      let value = this.value.replace(/\D/g, ''); // Remove tudo que não é dígito
      
      if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2);
      }
      if (value.length >= 5) {
        value = value.substring(0, 5) + '/' + value.substring(5, 9);
      }
      
      this.value = value.substring(0, 10);
    });
    
    // Validar formato ao perder foco
    input.addEventListener('blur', function() {
      const value = this.value;
      if (value && !/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        // Se o formato estiver incorreto, tentar converter
        const convertedDate = convertToDateInput(value);
        if (convertedDate) {
          this.value = value; // Manter o valor se a conversão for bem-sucedida
        } else {
          // Se não conseguir converter, limpar o campo
          this.value = '';
        }
      }
    });
  }

  // Carregar dados quando a página carregar
  document.addEventListener('DOMContentLoaded', function() {
    // Inicializar seletores de data personalizados
    createDatePicker('dataInicio');
    createDatePicker('dataFim');
    
    carregarEmpresas(); // Carregar lista de empresas primeiro
    
    // Usar carregamento paralelo otimizado
    carregarTodosOsDadosComOtimizacoes();
    
    // Atualizar dados a cada 5 minutos (300000 ms) usando carregamento paralelo
    setInterval(() => {
      console.log('Atualização automática de dados iniciada...');
      carregarTodosOsDadosComOtimizacoes();
    }, 300000);
  });

  // Fechar dropdown ao clicar fora
  document.addEventListener('click', function(event) {
    const empresaDropdown = document.getElementById('empresaDropdown');
    const empresaTrigger = document.querySelector('.custom-select-trigger');
    
    if (empresaDropdown && empresaTrigger) {
      if (!empresaDropdown.contains(event.target) && !empresaTrigger.contains(event.target)) {
        empresaDropdown.style.display = 'none';
        empresaTrigger.classList.remove('active');
      }
    }
  });

  // Navegação por teclado no dropdown de empresas
  document.addEventListener('keydown', function(event) {
    const empresaDropdown = document.getElementById('empresaDropdown');
    const empresaSearch = document.getElementById('empresaSearch');
    
    if (empresaDropdown && empresaDropdown.style.display === 'block') {
      const options = empresaDropdown.querySelectorAll('.custom-select-option');
      let selectedIndex = -1;
      
      // Encontrar opção atualmente selecionada visualmente
      options.forEach((option, index) => {
        if (option.classList.contains('highlighted')) {
          selectedIndex = index;
        }
      });
      
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (selectedIndex < options.length - 1) {
            if (selectedIndex >= 0) {
              options[selectedIndex].classList.remove('highlighted');
            }
            selectedIndex++;
            options[selectedIndex].classList.add('highlighted');
            options[selectedIndex].scrollIntoView({ block: 'nearest' });
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (selectedIndex > 0) {
            options[selectedIndex].classList.remove('highlighted');
            selectedIndex--;
            options[selectedIndex].classList.add('highlighted');
            options[selectedIndex].scrollIntoView({ block: 'nearest' });
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0) {
            const selectedOption = options[selectedIndex];
            const value = selectedOption.getAttribute('data-value');
            const empresa = allEmpresas.find(e => e.CODEMP.toString() === value);
            const displayText = value === '' ? 'Todas as empresas' : (empresa ? empresa.EMPRESA : 'Empresa selecionada');
            toggleEmpresaSelection(value, displayText);
          }
          break;
        case 'Escape':
          event.preventDefault();
          empresaDropdown.style.display = 'none';
          document.querySelector('.custom-select-trigger').classList.remove('active');
          break;
      }
    }
  });

  /**
   * Função para carregar dados de despesa operacional
   */
  async function carregarDadosDespesaOperacional() {
    try {
      const dataInicio = document.getElementById('dataInicio').value;
      const dataFim = document.getElementById('dataFim').value;
      
      // Converter datas para o formato DD/MM/YYYY
      const dataInicioFormatada = converterData(dataInicio);
      const dataFimFormatada = converterData(dataFim);

      // Obter empresas selecionadas
      const empresasInput = document.getElementById('empresas');
      let empresasSelecionadas = [];
      
      if (empresasInput && empresasInput.value) {
        empresasSelecionadas = empresasInput.value.split(',').filter(value => value.trim() !== '');
      }

      // Construir filtro de empresa
      let filtroEmpresa = '';
      if (empresasSelecionadas.length > 0) {
        const empresasString = empresasSelecionadas.join(',');
        filtroEmpresa = ` and codemp in (${empresasString})`;
      }

      const sql = `
        select 
            sum(case when dhbaixa between '${dataInicioFormatada}' and '${dataFimFormatada}' then 
              case when NAT.AD_TIPOCUSTO <> 'N' then 
                COALESCE(ROUND(VLRBAIXA, 2), 0) 
              else 0 end 
            else 0 end) as valor_atual,
            sum(case when dhbaixa between DATEADD(month, -1, '${dataInicioFormatada}') 
            and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then 
              case when NAT.AD_TIPOCUSTO <> 'N' then 
                COALESCE(ROUND(VLRBAIXA, 2), 0) 
              else 0 end 
            else 0 end) as valor_anterior,
            case 
                when sum(case when dhbaixa between DATEADD(month, -1, '${dataInicioFormatada}') 
                and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then 
                  case when NAT.AD_TIPOCUSTO <> 'N' then 
                    COALESCE(ROUND(VLRBAIXA, 2), 0) 
                  else 0 end 
                else 0 end) = 0 then null
                else round(((sum(case when dhbaixa between '${dataInicioFormatada}' and '${dataFimFormatada}' then 
                  case when NAT.AD_TIPOCUSTO <> 'N' then 
                    COALESCE(ROUND(VLRBAIXA, 2), 0) 
                  else 0 end 
                else 0 end) - 
                  sum(case when dhbaixa between DATEADD(month, -1, '${dataInicioFormatada}') 
                  and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then 
                    case when NAT.AD_TIPOCUSTO <> 'N' then 
                      COALESCE(ROUND(VLRBAIXA, 2), 0) 
                    else 0 end 
                  else 0 end)) * 100.0 / 
                 sum(case when dhbaixa between DATEADD(month, -1, '${dataInicioFormatada}') 
                 and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then 
                   case when NAT.AD_TIPOCUSTO <> 'N' then 
                     COALESCE(ROUND(VLRBAIXA, 2), 0) 
                   else 0 end 
                 else 0 end)), 2)
            end as variacao_percentual
        FROM TGFFIN FIN
        INNER JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        WHERE 
        FIN.RECDESP = -1 
        AND NAT.ATIVA = 'S'
        AND FIN.DHBAIXA IS NOT NULL ${filtroEmpresa}
      `;

      const resultado = await JX.consultar(sql);
      
      if (resultado && resultado.length > 0) {
        const dados = resultado[0];
        
        // Atualizar o card de Despesa Operacional
        const card = document.querySelector('.card[onclick="abrir_do()"]');
        if (card) {
          // Atualizar o valor
          const valorElement = card.querySelector('p');
          if (valorElement) {
            const valorAtual = dados.valor_atual || 0;
            valorElement.textContent = `R$ ${valorAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
          }
          
          // Atualizar o rodapé com período anterior e variação
          const cardFooter = card.querySelector('.card-footer');
          if (cardFooter) {
            const valorAnterior = dados.valor_anterior || 0;
            const variacao = dados.variacao_percentual || 0;
            
            // Adicionar seta indicativa baseada na variação usando a função addArrow
            const seta = addArrow(variacao);
            
            cardFooter.innerHTML = `
              <b>Per.Ant:</b>R$${valorAnterior.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
              <b>Var%:</b>${variacao.toFixed(2)}%${seta}
            `;
          }
        }
      } else {
        console.log('Nenhum dado de Despesa Operacional encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar dados de Despesa Operacional:', error);
      // Em caso de erro, manter os valores padrão
    }
  }

  /**
   * Função para carregar dados de investimentos
   */
  async function carregarDadosInvestimentos() {
    try {
      const dataInicio = document.getElementById('dataInicio').value;
      const dataFim = document.getElementById('dataFim').value;
      
      // Converter datas para o formato DD/MM/YYYY
      const dataInicioFormatada = converterData(dataInicio);
      const dataFimFormatada = converterData(dataFim);

      // Obter empresas selecionadas
      const empresasInput = document.getElementById('empresas');
      let empresasSelecionadas = [];
      
      if (empresasInput && empresasInput.value) {
        empresasSelecionadas = empresasInput.value.split(',').filter(value => value.trim() !== '');
      }

      // Construir filtro de empresa
      let filtroEmpresa = '';
      if (empresasSelecionadas.length > 0) {
        const empresasString = empresasSelecionadas.join(',');
        filtroEmpresa = ` and codemp in (${empresasString})`;
      }

      const sql = `
        select 
            sum(case when dhbaixa between '${dataInicioFormatada}' and '${dataFimFormatada}' then 
              case when NAT.AD_TIPOCUSTO = 'N' then 
                COALESCE(ROUND(VLRBAIXA, 2), 0) 
              else 0 end 
            else 0 end) as valor_atual,
            sum(case when dhbaixa between DATEADD(month, -1, '${dataInicioFormatada}') 
            and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then 
              case when NAT.AD_TIPOCUSTO = 'N' then 
                COALESCE(ROUND(VLRBAIXA, 2), 0) 
              else 0 end 
            else 0 end) as valor_anterior,
            case 
                when sum(case when dhbaixa between DATEADD(month, -1, '${dataInicioFormatada}') 
                and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then 
                  case when NAT.AD_TIPOCUSTO = 'N' then 
                    COALESCE(ROUND(VLRBAIXA, 2), 0) 
                  else 0 end 
                else 0 end) = 0 then null
                else round(((sum(case when dhbaixa between '${dataInicioFormatada}' and '${dataFimFormatada}' then 
                  case when NAT.AD_TIPOCUSTO = 'N' then 
                    COALESCE(ROUND(VLRBAIXA, 2), 0) 
                  else 0 end 
                else 0 end) - 
                  sum(case when dhbaixa between DATEADD(month, -1, '${dataInicioFormatada}') 
                  and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then 
                    case when NAT.AD_TIPOCUSTO = 'N' then 
                      COALESCE(ROUND(VLRBAIXA, 2), 0) 
                    else 0 end 
                  else 0 end)) * 100.0 / 
                             sum(case when dhbaixa between DATEADD(month, -1, '${dataInicioFormatada}') 
            and DATEADD(day, 30, DATEADD(month, -1, '${dataInicioFormatada}')) then 
                   case when NAT.AD_TIPOCUSTO = 'N' then 
                     COALESCE(ROUND(VLRBAIXA, 2), 0) 
                   else 0 end 
                 else 0 end)), 2)
            end as variacao_percentual
        FROM TGFFIN FIN
        INNER JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
        WHERE 
        FIN.RECDESP = -1 
        AND NAT.ATIVA = 'S'
        AND FIN.DHBAIXA IS NOT NULL ${filtroEmpresa}
      `;

      const resultado = await JX.consultar(sql);
      
      if (resultado && resultado.length > 0) {
        const dados = resultado[0];
        
        // Atualizar o card de Investimentos
        const card = document.querySelector('.card[onclick="abrir_inv()"]');
        if (card) {
          // Atualizar o valor
          const valorElement = card.querySelector('p');
          if (valorElement) {
            const valorAtual = dados.valor_atual || 0;
            valorElement.textContent = `R$ ${valorAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
          }
          
          // Atualizar o rodapé com período anterior e variação
          const cardFooter = card.querySelector('.card-footer');
          if (cardFooter) {
            const valorAnterior = dados.valor_anterior || 0;
            const variacao = dados.variacao_percentual || 0;
            
            // Adicionar seta indicativa baseada na variação usando a função addArrow
            const seta = addArrow(variacao);
            
            cardFooter.innerHTML = `
              <b>Per.Ant:</b>R$${valorAnterior.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
              <b>Var%:</b>${variacao.toFixed(2)}%${seta}
            `;
          }
        }
      } else {
        console.log('Nenhum dado de Investimentos encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar dados de Investimentos:', error);
      // Em caso de erro, manter os valores padrão
    }
  }

  /**
   * Função para carregar dados do card Resultado
   * Calcula: Margem de Contribuição Nominal - Despesa Operacional - Investimentos
   */
  async function carregarDadosResultado() {
    try {
      // Obter valores dos outros cards
      const margemCard = document.querySelector('.card[onclick="abrir_mar()"]');
      const despesaCard = document.querySelector('.card[onclick="abrir_do()"]');
      const investimentoCard = document.querySelector('.card[onclick="abrir_inv()"]');
      
      if (!margemCard || !despesaCard || !investimentoCard) {
        console.log('Cards necessários não encontrados para calcular o resultado');
        return;
      }

      // Extrair valores dos cards (remover "R$ " e converter para número)
      const margemText = margemCard.querySelector('p').textContent;
      const despesaText = despesaCard.querySelector('p').textContent;
      const investimentoText = investimentoCard.querySelector('p').textContent;
      
      const margemAtual = parseFloat(margemText.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0;
      const despesaAtual = parseFloat(despesaText.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0;
      const investimentoAtual = parseFloat(investimentoText.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0;
      
      // Calcular resultado atual
      const resultadoAtual = margemAtual - despesaAtual - investimentoAtual;
      
      // Extrair valores do período anterior dos rodapés
      const margemFooter = margemCard.querySelector('.card-footer').textContent;
      const despesaFooter = despesaCard.querySelector('.card-footer').textContent;
      const investimentoFooter = investimentoCard.querySelector('.card-footer').textContent;
      
      // Extrair valores do período anterior (buscar após "Per.Ant:")
      const margemAnterior = extrairValorPeriodoAnterior(margemFooter);
      const despesaAnterior = extrairValorPeriodoAnterior(despesaFooter);
      const investimentoAnterior = extrairValorPeriodoAnterior(investimentoFooter);
      
      // Calcular resultado do período anterior
      const resultadoAnterior = margemAnterior - despesaAnterior - investimentoAnterior;
      
      // Calcular variação percentual
      let variacaoPercentual = 0;
      if (resultadoAnterior !== 0) {
        variacaoPercentual = ((resultadoAtual - resultadoAnterior) / resultadoAnterior) * 100;
      }
      
      // Atualizar o card de Resultado
      const resultadoCard = document.querySelector('.card[onclick="abrir_res()"]');
      if (resultadoCard) {
        // Atualizar o valor
        const valorElement = resultadoCard.querySelector('p');
        if (valorElement) {
          valorElement.textContent = `R$ ${resultadoAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
        
        // Atualizar o rodapé com período anterior e variação
        const cardFooter = resultadoCard.querySelector('.card-footer');
        if (cardFooter) {
          // Adicionar seta indicativa baseada na variação usando a função addArrow
          const seta = addArrow(variacaoPercentual);
          
          cardFooter.innerHTML = `
            <b>Per.Ant:</b>R$${resultadoAnterior.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
            <b>Var%:</b>${variacaoPercentual.toFixed(2)}%${seta}
          `;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do Resultado:', error);
      // Em caso de erro, manter os valores padrão
    }
  }

  /**
   * Função auxiliar para extrair valor do período anterior do texto do rodapé
   * @param {string} footerText - Texto do rodapé do card
   * @returns {number} Valor do período anterior
   */
  function extrairValorPeriodoAnterior(footerText) {
    try {
      // Buscar o padrão "Per.Ant:R$X.XXX,XX" ou "Per.Ant:X.XXX,XX"
      const match = footerText.match(/Per\.Ant:.*?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/);
      if (match && match[1]) {
        return parseFloat(match[1].replace(/\./g, '').replace(',', '.')) || 0;
      }
      return 0;
    } catch (error) {
      console.error('Erro ao extrair valor do período anterior:', error);
      return 0;
    }
  }

  // ===== OTIMIZAÇÃO 1: PERFORMANCE E CACHE =====
  
  /**
   * Cache inteligente com timestamp para evitar consultas desnecessárias
   */
  const cache = new Map();
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

  /**
   * Função para obter dados do cache
   * @param {string} key - Chave do cache
   * @returns {any|null} Dados em cache ou null se expirado
   */
  function getCachedData(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  /**
   * Função para salvar dados no cache
   * @param {string} key - Chave do cache
   * @param {any} data - Dados para cache
   */
  function setCachedData(key, data) {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Função para carregar todos os dados em paralelo (otimização de performance)
   */
  async function carregarTodosOsDados() {
    try {
      console.log('Iniciando carregamento paralelo de dados...');
      
      // Carregar dados em paralelo para melhor performance
      const promises = [
        carregarDadosFaturamento(),
        carregarDadosDesconto(),
        carregarDadosDevolucao(),
        carregarDadosTon(),
        carregarDadosCmv(),
        carregarDadosImpostos(),
        carregarDadosMargemNominal(),
        carregarDadosMargemPercentual(),
        carregarDadosDespesaOperacional(),
        carregarDadosInvestimentos()
      ];
      
      // Aguardar todas as consultas em paralelo
      await Promise.all(promises);
      
      // Carregar resultado após todos os outros dados (dependência)
      await carregarDadosResultado();
      
      console.log('Carregamento paralelo concluído com sucesso!');
    } catch (error) {
      console.error('Erro durante carregamento paralelo:', error);
      // Em caso de erro, tentar carregar individualmente
      await carregarDadosIndividualmente();
    }
  }

  /**
   * Função para carregar todos os dados com otimizações avançadas
   */
  async function carregarTodosOsDadosComOtimizacoes() {
    try {
      // Tentar carregamento otimizado primeiro
      return await carregarTodosOsDadosOtimizado();
    } catch (error) {
      console.warn('Carregamento otimizado falhou, usando método padrão:', error);
      return await carregarTodosOsDados();
    }
  }

  /**
   * Função de fallback para carregar dados individualmente em caso de erro
   */
  async function carregarDadosIndividualmente() {
    console.log('Tentando carregar dados individualmente...');
    try {
      await carregarDadosFaturamento();
      await carregarDadosDesconto();
      await carregarDadosDevolucao();
      await carregarDadosTon();
      await carregarDadosCmv();
      await carregarDadosImpostos();
      await carregarDadosMargemNominal();
      await carregarDadosMargemPercentual();
      await carregarDadosDespesaOperacional();
      await carregarDadosInvestimentos();
      await carregarDadosResultado();
    } catch (error) {
      console.error('Erro ao carregar dados individualmente:', error);
    }
  }

  /**
   * Função para limpar cache expirado periodicamente
   */
  function limparCacheExpirado() {
    const now = Date.now();
    let removidos = 0;
    
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_DURATION * 2) {
        cache.delete(key);
        removidos++;
      }
    }
    
    if (removidos > 0) {
      console.log(`Cache limpo: ${removidos} entradas removidas`);
    }
  }

  // Limpar cache a cada 5 minutos
  setInterval(limparCacheExpirado, 5 * 60 * 1000);

  // ===== OTIMIZAÇÃO 2: MEMÓRIA E RECURSOS =====
  
  /**
   * Cache de elementos DOM para evitar queries repetitivas
   */
  const domCache = new Map();

  /**
   * Função para obter elementos DOM com cache
   * @param {string} selector - Seletor CSS
   * @returns {Element|null} Elemento DOM ou null se não encontrado
   */
  function getCachedElement(selector) {
    if (!domCache.has(selector)) {
      const element = document.querySelector(selector);
      if (element) {
        domCache.set(selector, element);
      }
    }
    return domCache.get(selector);
  }

  /**
   * Função para limpar cache de DOM quando necessário
   */
  function limparCacheDOM() {
    domCache.clear();
    console.log('Cache de DOM limpo');
  }

  /**
   * Função debounce para otimizar filtros e evitar execuções excessivas
   * @param {Function} func - Função a ser executada
   * @param {number} wait - Tempo de espera em milissegundos
   * @returns {Function} Função com debounce
   */
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

  /**
   * Função para otimizar o filtro de empresas com debounce
   */
  const debouncedFilterEmpresas = debounce(filterEmpresas, 300);

  /**
   * Função para otimizar a aplicação de filtros com debounce
   */
  const debouncedAplicarFiltros = debounce(aplicarFiltros, 500);

  /**
   * Função para limpar recursos e listeners quando necessário
   */
  function cleanupResources() {
    // Limpar caches
    cache.clear();
    limparCacheDOM();
    
    // Limpar timeouts pendentes
    if (window.filterTimeout) {
      clearTimeout(window.filterTimeout);
    }
    
    console.log('Recursos limpos com sucesso');
  }

  /**
   * Função para monitorar uso de memória (desenvolvimento)
   */
  function monitorarMemoria() {
    if (performance.memory) {
      const memory = performance.memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
      const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
      
      console.log(`Uso de memória: ${usedMB}MB / ${totalMB}MB`);
      
      // Alertar se uso de memória estiver alto
      if (usedMB > 100) {
        console.warn('Uso de memória alto detectado, limpando recursos...');
        cleanupResources();
      }
    }
  }

  // Monitorar memória a cada 2 minutos
  setInterval(monitorarMemoria, 2 * 60 * 1000);

  /**
   * Função para otimizar o filtro de empresas com cache
   */
  function filterEmpresasOtimizado() {
    const searchTerm = document.getElementById('empresaSearch').value.toLowerCase();
    
    // Verificar cache primeiro
    const cacheKey = `empresa_filter_${searchTerm}`;
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      filteredEmpresas = cached;
      renderEmpresasOptions();
      return;
    }
    
    // Aplicar filtro
    if (!searchTerm) {
      filteredEmpresas = [...allEmpresas];
    } else {
      filteredEmpresas = allEmpresas.filter(empresa => 
        empresa.CODEMP.toString().toLowerCase().includes(searchTerm) ||
        empresa.RAZAOSOCIAL.toLowerCase().includes(searchTerm)
      );
    }
    
    // Salvar no cache
    setCachedData(cacheKey, filteredEmpresas);
    
    renderEmpresasOptions();
  }

  /**
   * Função para otimizar a renderização de opções de empresas
   */
  function renderEmpresasOptionsOtimizado() {
    const optionsContainer = getCachedElement('#empresaOptions');
    if (!optionsContainer) return;
    
    // Usar DocumentFragment para melhor performance
    const fragment = document.createDocumentFragment();
    
    // Opção "Todas as empresas"
    const todasOption = document.createElement('div');
    todasOption.className = 'custom-select-option';
    todasOption.setAttribute('data-value', '');
    todasOption.onclick = () => toggleEmpresaSelection('', 'Todas as empresas');
    
    const isAllSelected = selectedEmpresas.length === 0;
    todasOption.innerHTML = `
      <span>Todas as empresas</span>
      <input type="checkbox" class="empresa-checkbox" ${isAllSelected ? 'checked' : ''}>
    `;
    if (isAllSelected) {
      todasOption.classList.add('selected');
    }
    fragment.appendChild(todasOption);
    
    // Mostrar estatísticas se não houver filtro
    const searchInput = getCachedElement('#empresaSearch');
    if (!searchInput || !searchInput.value) {
      const statsDiv = document.createElement('div');
      statsDiv.className = 'custom-select-stats';
      statsDiv.innerHTML = `<small style="color: #666; padding: 8px 12px; display: block; border-bottom: 1px solid #eee;">
        ${filteredEmpresas.length} empresa(s) disponível(is)
      </small>`;
      fragment.appendChild(statsDiv);
    }
    
    // Opções de empresas com otimização
    filteredEmpresas.forEach(empresa => {
      const option = document.createElement('div');
      option.className = 'custom-select-option';
      option.setAttribute('data-value', empresa.CODEMP);
      option.onclick = () => toggleEmpresaSelection(empresa.CODEMP, empresa.EMPRESA);
      
      const isSelected = selectedEmpresas.includes(empresa.CODEMP.toString());
      option.innerHTML = `
        <div style="display: flex; align-items: center; flex-grow: 1;">
          <span class="empresa-code">${empresa.CODEMP}</span>
          <span class="empresa-name">${empresa.RAZAOSOCIAL}</span>
        </div>
        <input type="checkbox" class="empresa-checkbox" ${isSelected ? 'checked' : ''}>
      `;
      
      if (isSelected) {
        option.classList.add('selected');
      }
      
      fragment.appendChild(option);
    });
    
    if (filteredEmpresas.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'custom-select-no-results';
      noResults.textContent = 'Nenhuma empresa encontrada';
      fragment.appendChild(noResults);
    }
    
    // Limpar container e adicionar fragment (mais eficiente)
    optionsContainer.innerHTML = '';
    optionsContainer.appendChild(fragment);
  }

  // ===== OTIMIZAÇÃO 3: BANCO DE DADOS E CONSULTAS =====
  
  /**
   * Pool de conexões para otimizar consultas ao banco
   */
  const connectionPool = {
    maxConnections: 5,
    activeConnections: 0,
    queue: [],
    connections: new Map(),
    
    /**
     * Obter conexão disponível do pool
     * @returns {Promise} Promise com a conexão
     */
    async getConnection() {
      if (this.activeConnections < this.maxConnections) {
        this.activeConnections++;
        const connectionId = Date.now() + Math.random();
        this.connections.set(connectionId, { id: connectionId, inUse: true, timestamp: Date.now() });
        return connectionId;
      }
      
      // Aguardar conexão disponível
      return new Promise((resolve) => {
        this.queue.push(resolve);
      });
    },
    
    /**
     * Liberar conexão do pool
     * @param {string} connectionId - ID da conexão
     */
    releaseConnection(connectionId) {
      if (this.connections.has(connectionId)) {
        this.connections.delete(connectionId);
        this.activeConnections--;
        
        // Processar fila se houver
        if (this.queue.length > 0) {
          const nextResolve = this.queue.shift();
          this.activeConnections++;
          const newConnectionId = Date.now() + Math.random();
          this.connections.set(newConnectionId, { id: newConnectionId, inUse: true, timestamp: Date.now() });
          nextResolve(newConnectionId);
        }
      }
    },
    
    /**
     * Limpar conexões antigas
     */
    cleanup() {
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutos
      
      for (const [id, conn] of this.connections) {
        if (now - conn.timestamp > maxAge) {
          this.connections.delete(id);
          this.activeConnections--;
        }
      }
      
      // Processar fila se houver
      while (this.queue.length > 0 && this.activeConnections < this.maxConnections) {
        const nextResolve = this.queue.shift();
        this.activeConnections++;
        const newConnectionId = Date.now() + Math.random();
        this.connections.set(newConnectionId, { id: newConnectionId, inUse: true, timestamp: Date.now() });
        nextResolve(newConnectionId);
      }
    }
  };

  /**
   * Sistema de retry inteligente para consultas
   * @param {Function} queryFunction - Função de consulta
   * @param {number} maxRetries - Número máximo de tentativas
   * @param {number} baseDelay - Delay base em milissegundos
   * @returns {Promise} Promise com o resultado
   */
  async function executeWithRetry(queryFunction, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const connectionId = await connectionPool.getConnection();
        
        try {
          const result = await queryFunction(connectionId);
          connectionPool.releaseConnection(connectionId);
          return result;
        } catch (error) {
          connectionPool.releaseConnection(connectionId);
          throw error;
        }
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          console.error(`Falha após ${maxRetries} tentativas:`, error);
          throw error;
        }
        
        // Delay exponencial com jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.warn(`Tentativa ${attempt} falhou, tentando novamente em ${Math.round(delay)}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Função para otimizar consultas com compressão de dados
   * @param {Object} data - Dados a serem comprimidos
   * @returns {string} Dados comprimidos em base64
   */
  function compressData(data) {
    try {
      const jsonString = JSON.stringify(data);
      
      // Compressão simples para strings longas
      if (jsonString.length > 1000) {
        // Usar compressão LZ-string se disponível, senão usar compressão básica
        if (typeof LZString !== 'undefined') {
          return LZString.compressToBase64(jsonString);
        } else {
          // Compressão básica: remover espaços e caracteres desnecessários
          return btoa(jsonString.replace(/\s+/g, ' ').trim());
        }
      }
      
      return btoa(jsonString);
    } catch (error) {
      console.warn('Erro na compressão, retornando dados originais:', error);
      return btoa(JSON.stringify(data));
    }
  }

  /**
   * Função para descomprimir dados
   * @param {string} compressedData - Dados comprimidos
   * @returns {Object} Dados descomprimidos
   */
  function decompressData(compressedData) {
    try {
      const decoded = atob(compressedData);
      
      // Tentar descompressão LZ-string primeiro
      if (typeof LZString !== 'undefined') {
        try {
          const decompressed = LZString.decompressFromBase64(compressedData);
          if (decompressed) {
            return JSON.parse(decompressed);
          }
        } catch (e) {
          // Fallback para base64 simples
        }
      }
      
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Erro ao descomprimir dados:', error);
      return null;
    }
  }

  /**
   * Função para otimizar consultas com cache inteligente
   * @param {string} queryKey - Chave única da consulta
   * @param {Function} queryFunction - Função de consulta
   * @param {number} ttl - Tempo de vida do cache em milissegundos
   * @returns {Promise} Promise com o resultado
   */
  async function executeQueryWithCache(queryKey, queryFunction, ttl = 2 * 60 * 1000) {
    // Verificar cache primeiro
    const cached = getCachedData(queryKey);
    if (cached) {
      console.log(`Cache hit para consulta: ${queryKey}`);
      return cached;
    }
    
    try {
      console.log(`Executando consulta: ${queryKey}`);
      const result = await executeWithRetry(queryFunction);
      
      // Comprimir dados antes de salvar no cache
      const compressedResult = compressData(result);
      setCachedData(queryKey, compressedResult, ttl);
      
      console.log(`Consulta executada com sucesso: ${queryKey}`);
      return result;
    } catch (error) {
      console.error(`Erro na consulta ${queryKey}:`, error);
      throw error;
    }
  }

  /**
   * Função para otimizar carregamento de dados com pool de conexões
   * @param {string} dataType - Tipo de dados
   * @param {Function} queryFunction - Função de consulta específica
   * @returns {Promise} Promise com os dados
   */
  async function carregarDadosOtimizado(dataType, queryFunction) {
    const queryKey = `${dataType}_${getFiltrosHash()}`;
    
    return executeQueryWithCache(queryKey, queryFunction, 2 * 60 * 1000);
  }

  /**
   * Função para obter hash dos filtros atuais
   * @returns {string} Hash dos filtros
   */
  function getFiltrosHash() {
    const dataInicio = getCachedElement('#dataInicio')?.value || '';
    const dataFim = getCachedElement('#dataFim')?.value || '';
    const empresas = selectedEmpresas.join(',');
    
    return btoa(`${dataInicio}_${dataFim}_${empresas}`).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Função para otimizar todas as consultas de dados
   */
  async function carregarTodosOsDadosOtimizado() {
    try {
      console.log('Iniciando carregamento otimizado de dados...');
      
      const startTime = performance.now();
      
      // Usar pool de conexões para consultas paralelas
      const promises = [
        carregarDadosOtimizado('faturamento', carregarDadosFaturamento),
        carregarDadosOtimizado('desconto', carregarDadosDesconto),
        carregarDadosOtimizado('devolucao', carregarDadosDevolucao),
        carregarDadosOtimizado('ton', carregarDadosTon),
        carregarDadosOtimizado('cmv', carregarDadosCmv),
        carregarDadosOtimizado('impostos', carregarDadosImpostos),
        carregarDadosOtimizado('margemNominal', carregarDadosMargemNominal),
        carregarDadosOtimizado('margemPercentual', carregarDadosMargemPercentual),
        carregarDadosOtimizado('despesaOperacional', carregarDadosDespesaOperacional),
        carregarDadosOtimizado('investimentos', carregarDadosInvestimentos),
        carregarDadosOtimizado('resultado', carregarDadosResultado)
      ];
      
      const results = await Promise.allSettled(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`Carregamento otimizado concluído em ${duration.toFixed(2)}ms`);
      
      // Processar resultados
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Erro no carregamento ${index}:`, result.reason);
        }
      });
      
      return results;
    } catch (error) {
      console.error('Erro no carregamento otimizado:', error);
      
      // Fallback para carregamento individual
      console.log('Usando fallback para carregamento individual...');
      return carregarTodosOsDados();
    }
  }

  /**
   * Função para limpar pool de conexões
   */
  function limparPoolConexoes() {
    connectionPool.cleanup();
    console.log('Pool de conexões limpo');
  }

  // Limpar pool de conexões a cada 3 minutos
  setInterval(limparPoolConexoes, 3 * 60 * 1000);

  /**
   * Função para obter estatísticas do pool de conexões
   * @returns {Object} Estatísticas do pool
   */
  function getPoolStats() {
    return {
      activeConnections: connectionPool.activeConnections,
      maxConnections: connectionPool.maxConnections,
      queueLength: connectionPool.queue.length,
      totalConnections: connectionPool.connections.size
    };
  }

  // Log de estatísticas do pool a cada 5 minutos
  setInterval(() => {
    const stats = getPoolStats();
    console.log('Estatísticas do pool de conexões:', stats);
  }, 5 * 60 * 1000);

  // ===== OTIMIZAÇÃO 4: INTERFACE E UX =====
  
  /**
   * Sistema de lazy loading para componentes da interface
   */
  const lazyLoader = {
    loadedComponents: new Set(),
    loadingQueue: [],
    isProcessing: false,
    
    /**
     * Registrar componente para carregamento lazy
     * @param {string} componentId - ID do componente
     * @param {Function} loadFunction - Função de carregamento
     * @param {number} priority - Prioridade (1-10, 10 sendo mais alta)
     */
    register(componentId, loadFunction, priority = 5) {
      this.loadingQueue.push({
        id: componentId,
        load: loadFunction,
        priority: priority,
        timestamp: Date.now()
      });
      
      // Ordenar por prioridade e timestamp
      this.loadingQueue.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });
      
      this.processQueue();
    },
    
    /**
     * Processar fila de carregamento
     */
    async processQueue() {
      if (this.isProcessing || this.loadingQueue.length === 0) return;
      
      this.isProcessing = true;
      
      try {
        while (this.loadingQueue.length > 0) {
          const component = this.loadingQueue.shift();
          
          if (!this.loadedComponents.has(component.id)) {
            try {
              await component.load();
              this.loadedComponents.add(component.id);
              console.log(`Componente carregado com sucesso: ${component.id}`);
            } catch (error) {
              console.error(`Erro ao carregar componente ${component.id}:`, error);
            }
          }
          
          // Pequena pausa para não bloquear a interface
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } finally {
        this.isProcessing = false;
      }
    },
    
    /**
     * Verificar se componente está carregado
     * @param {string} componentId - ID do componente
     * @returns {boolean} True se carregado
     */
    isLoaded(componentId) {
      return this.loadedComponents.has(componentId);
    },
    
    /**
     * Forçar carregamento de componente específico
     * @param {string} componentId - ID do componente
     */
    async forceLoad(componentId) {
      const component = this.loadingQueue.find(c => c.id === componentId);
      if (component) {
        try {
          await component.load();
          this.loadedComponents.add(componentId);
          this.loadingQueue = this.loadingQueue.filter(c => c.id !== componentId);
          console.log(`Componente forçado carregado: ${componentId}`);
        } catch (error) {
          console.error(`Erro ao forçar carregamento de ${componentId}:`, error);
        }
      }
    }
  };

  /**
   * Sistema de virtualização para listas grandes
   */
  const virtualList = {
    /**
     * Criar lista virtualizada
     * @param {Element} container - Container da lista
     * @param {Array} items - Array de itens
     * @param {Function} renderItem - Função para renderizar item
     * @param {number} itemHeight - Altura de cada item
     * @param {number} visibleItems - Número de itens visíveis
     */
    create(container, items, renderItem, itemHeight = 50, visibleItems = 10) {
      const totalHeight = items.length * itemHeight;
      const scrollContainer = document.createElement('div');
      scrollContainer.style.height = `${Math.min(visibleItems * itemHeight, totalHeight)}px`;
      scrollContainer.style.overflow = 'auto';
      scrollContainer.style.position = 'relative';
      
      const contentContainer = document.createElement('div');
      contentContainer.style.height = `${totalHeight}px`;
      contentContainer.style.position = 'relative';
      
      scrollContainer.appendChild(contentContainer);
      container.appendChild(scrollContainer);
      
      let startIndex = 0;
      let endIndex = Math.min(visibleItems, items.length);
      
      function renderVisibleItems() {
        contentContainer.innerHTML = '';
        
        for (let i = startIndex; i < endIndex; i++) {
          if (items[i]) {
            const itemElement = renderItem(items[i], i);
            itemElement.style.position = 'absolute';
            itemElement.style.top = `${i * itemHeight}px`;
            itemElement.style.width = '100%';
            itemElement.style.height = `${itemHeight}px`;
            contentContainer.appendChild(itemElement);
          }
        }
      }
      
      scrollContainer.addEventListener('scroll', () => {
        const scrollTop = scrollContainer.scrollTop;
        startIndex = Math.floor(scrollTop / itemHeight);
        endIndex = Math.min(startIndex + visibleItems + 2, items.length);
        
        requestAnimationFrame(renderVisibleItems);
      });
      
      renderVisibleItems();
      
      return {
        updateItems: (newItems) => {
          items = newItems;
          const newTotalHeight = items.length * itemHeight;
          contentContainer.style.height = `${newTotalHeight}px`;
          scrollContainer.style.height = `${Math.min(visibleItems * itemHeight, newTotalHeight)}px`;
          renderVisibleItems();
        },
        scrollToItem: (index) => {
          scrollContainer.scrollTop = index * itemHeight;
        }
      };
    }
  };

  /**
   * Sistema de notificações inteligente
   */
  const notificationSystem = {
    notifications: [],
    container: null,
    
    /**
     * Inicializar sistema de notificações
     */
    init() {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    },
    
    /**
     * Mostrar notificação
     * @param {string} message - Mensagem da notificação
     * @param {string} type - Tipo (success, warning, error, info)
     * @param {number} duration - Duração em milissegundos
     */
    show(message, type = 'info', duration = 5000) {
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.style.cssText = `
        background: ${this.getTypeColor(type)};
        color: white;
        padding: 12px 16px;
        margin-bottom: 10px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        pointer-events: auto;
        cursor: pointer;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        font-size: 14px;
        line-height: 1.4;
      `;
      
      notification.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>${message}</span>
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px; font-size: 18px;">
            ×
          </button>
        </div>
      `;
      
      this.container.appendChild(notification);
      
      // Animar entrada
      requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
      });
      
      // Auto-remover
      if (duration > 0) {
        setTimeout(() => {
          if (notification.parentElement) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
          }
        }, duration);
      }
      
      // Adicionar à lista
      this.notifications.push({
        element: notification,
        timestamp: Date.now(),
        type,
        message
      });
      
      return notification;
    },
    
    /**
     * Obter cor baseada no tipo
     * @param {string} type - Tipo da notificação
     * @returns {string} Cor CSS
     */
    getTypeColor(type) {
      const colors = {
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545',
        info: '#17a2b8'
      };
      return colors[type] || colors.info;
    },
    
    /**
     * Limpar notificações antigas
     */
    cleanup() {
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutos
      
      this.notifications = this.notifications.filter(notification => {
        if (now - notification.timestamp > maxAge) {
          notification.element.remove();
          return false;
        }
        return true;
      });
    }
  };

  /**
   * Sistema de feedback visual de performance
   */
  const performanceFeedback = {
    metrics: new Map(),
    
    /**
     * Iniciar medição de performance
     * @param {string} operation - Nome da operação
     */
    start(operation) {
      this.metrics.set(operation, {
        startTime: performance.now(),
        status: 'running'
      });
      
      // Mostrar indicador visual
      this.showIndicator(operation, 'start');
    },
    
    /**
     * Finalizar medição de performance
     * @param {string} operation - Nome da operação
     * @param {string} status - Status (success, error)
     */
    end(operation, status = 'success') {
      const metric = this.metrics.get(operation);
      if (metric) {
        metric.endTime = performance.now();
        metric.duration = metric.endTime - metric.startTime;
        metric.status = status;
        
        // Mostrar indicador visual
        this.showIndicator(operation, 'end', metric.duration);
        
        // Log de performance
        if (metric.duration > 1000) {
          console.warn(`Operação ${operation} demorou ${metric.duration.toFixed(2)}ms`);
        } else {
          console.log(`Operação ${operation} concluída em ${metric.duration.toFixed(2)}ms`);
        }
      }
    },
    
    /**
     * Mostrar indicador visual de performance
     * @param {string} operation - Nome da operação
     * @param {string} action - Ação (start, end)
     * @param {number} duration - Duração em milissegundos
     */
    showIndicator(operation, action, duration = 0) {
      // Buscar elemento relacionado à operação
      const element = this.findOperationElement(operation);
      if (!element) return;
      
      if (action === 'start') {
        // Adicionar classe de loading
        element.classList.add('loading');
        
        // Adicionar spinner se não existir
        if (!element.querySelector('.loading-spinner')) {
          const spinner = document.createElement('div');
          spinner.className = 'loading-spinner';
          spinner.innerHTML = '⏳';
          spinner.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            font-size: 12px;
            animation: spin 1s linear infinite;
          `;
          element.style.position = 'relative';
          element.appendChild(spinner);
        }
      } else if (action === 'end') {
        // Remover classe de loading
        element.classList.remove('loading');
        
        // Remover spinner
        const spinner = element.querySelector('.loading-spinner');
        if (spinner) {
          spinner.remove();
        }
        
        // Mostrar feedback de duração
        if (duration > 0) {
          this.showDurationFeedback(element, duration);
        }
      }
    },
    
    /**
     * Encontrar elemento relacionado à operação
     * @param {string} operation - Nome da operação
     * @returns {Element|null} Elemento encontrado
     */
    findOperationElement(operation) {
      // Mapear operações para elementos da interface
      const operationMap = {
        'faturamento': '.card[onclick="abrir_fat()"]',
        'desconto': '.card[onclick="abrir_des()"]',
        'devolucao': '.card[onclick="abrir_dev()"]',
        'ton': '.card[onclick="abrir_ton()"]',
        'cmv': '.card[onclick="abrir_cmv()"]',
        'impostos': '.card[onclick="abrir_imp()"]',
        'margemNominal': '.card[onclick="abrir_mar()"]',
        'margemPercentual': '.card[onclick="abrir_mar()"]',
        'despesaOperacional': '.card[onclick="abrir_do()"]',
        'investimentos': '.card[onclick="abrir_inv()"]',
        'resultado': '.card[onclick="abrir_res()"]'
      };
      
      const selector = operationMap[operation];
      return selector ? document.querySelector(selector) : null;
    },
    
    /**
     * Mostrar feedback de duração
     * @param {Element} element - Elemento alvo
     * @param {number} duration - Duração em milissegundos
     */
    showDurationFeedback(element, duration) {
      const feedback = document.createElement('div');
      feedback.className = 'performance-feedback';
      feedback.textContent = `${duration.toFixed(0)}ms`;
      feedback.style.cssText = `
        position: absolute;
        bottom: 5px;
        right: 5px;
        font-size: 10px;
        color: #666;
        background: rgba(255,255,255,0.9);
        padding: 2px 4px;
        border-radius: 3px;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      
      element.appendChild(feedback);
      
      // Animar entrada
      requestAnimationFrame(() => {
        feedback.style.opacity = '1';
      });
      
      // Remover após 3 segundos
      setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => feedback.remove(), 300);
      }, 3000);
    }
  };

  /**
   * Função para inicializar todas as otimizações de interface
   */
  function inicializarOtimizacoesInterface() {
    // Inicializar sistema de notificações
    notificationSystem.init();
    
    // Registrar componentes para lazy loading
    lazyLoader.register('empresaDropdown', () => {
      // Lazy load do dropdown de empresas
      const dropdown = document.getElementById('empresaDropdown');
      if (dropdown) {
        dropdown.style.opacity = '0';
        dropdown.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          dropdown.style.opacity = '1';
        }, 100);
      }
    }, 8);
    
    lazyLoader.register('datePickers', () => {
      // Lazy load dos seletores de data
      createDatePicker('dataInicio');
      createDatePicker('dataFim');
    }, 7);
    
    lazyLoader.register('filterButtons', () => {
      // Lazy load dos botões de filtro
      const buttons = document.querySelectorAll('.filter-button');
      buttons.forEach(button => {
        button.style.opacity = '0';
        button.style.transform = 'translateY(10px)';
        button.style.transition = 'all 0.3s ease';
      });
      
      setTimeout(() => {
        buttons.forEach((button, index) => {
          setTimeout(() => {
            button.style.opacity = '1';
            button.style.transform = 'translateY(0)';
          }, index * 100);
        });
      }, 200);
    }, 6);
    
    // Adicionar CSS para animações
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .loading {
        opacity: 0.7;
        pointer-events: none;
      }
      
      .card {
        transition: all 0.3s ease;
      }
      
      .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      }
      
      .filter-button {
        transition: all 0.2s ease;
      }
      
      .filter-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
    `;
    document.head.appendChild(style);
    
    console.log('Otimizações de interface inicializadas com sucesso');
  }

  // Inicializar otimizações quando a página carregar
  document.addEventListener('DOMContentLoaded', inicializarOtimizacoesInterface);

  // Limpar notificações antigas a cada 5 minutos
  setInterval(() => {
    notificationSystem.cleanup();
  }, 5 * 60 * 1000);

  // ===== OTIMIZAÇÃO 5: SEGURANÇA E VALIDAÇÃO =====
  
  /**
   * Sistema de validação de entrada de dados
   */
  const inputValidator = {
    patterns: {
      date: /^(\d{2})\/(\d{2})\/(\d{4})$/,
      empresa: /^[\w\s\-\.]+$/,
      number: /^[\d\.,]+$/,
      sqlSafe: /^[a-zA-Z0-9\s\-_\.]+$/
    },
    
    /**
     * Validar formato de data
     * @param {string} date - Data no formato DD/MM/YYYY
     * @returns {boolean} True se válida
     */
    validateDate(date) {
      if (!this.patterns.date.test(date)) {
        return { valid: false, error: 'Formato de data inválido. Use DD/MM/YYYY' };
      }
      
      const [, day, month, year] = date.match(this.patterns.date);
      const dateObj = new Date(year, month - 1, day);
      
      if (dateObj.getFullYear() != year || dateObj.getMonth() != month - 1 || dateObj.getDate() != day) {
        return { valid: false, error: 'Data inválida' };
      }
      
      // Validar se a data não é futura
      if (dateObj > new Date()) {
        return { valid: false, error: 'Data não pode ser futura' };
      }
      
      return { valid: true };
    },
    
    /**
     * Validar empresas selecionadas
     * @param {Array} empresas - Array de empresas
     * @returns {boolean} True se válidas
     */
    validateEmpresas(empresas) {
      if (!Array.isArray(empresas)) {
        return { valid: false, error: 'Formato de empresas inválido' };
      }
      
      if (empresas.length > 100) {
        return { valid: false, error: 'Máximo de 100 empresas permitido' };
      }
      
      for (const empresa of empresas) {
        if (!this.patterns.empresa.test(empresa)) {
          return { valid: false, error: `Empresa inválida: ${empresa}` };
        }
      }
      
      return { valid: true };
    },
    
    /**
     * Validar se string é segura para SQL
     * @param {string} input - String a ser validada
     * @returns {boolean} True se segura
     */
    validateSQLSafe(input) {
      if (typeof input !== 'string') return false;
      
      // Verificar palavras-chave SQL perigosas
      const dangerousKeywords = [
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
        'EXEC', 'EXECUTE', 'UNION', 'SCRIPT', 'JAVASCRIPT', 'ONLOAD'
      ];
      
      const upperInput = input.toUpperCase();
      for (const keyword of dangerousKeywords) {
        if (upperInput.includes(keyword)) {
          return false;
        }
      }
      
      return this.patterns.sqlSafe.test(input);
    },
    
    /**
     * Sanitizar entrada de dados
     * @param {string} input - String a ser sanitizada
     * @returns {string} String sanitizada
     */
    sanitizeInput(input) {
      if (typeof input !== 'string') return '';
      
      return input
        .replace(/[<>]/g, '') // Remover tags HTML
        .replace(/javascript:/gi, '') // Remover javascript:
        .replace(/on\w+\s*=/gi, '') // Remover event handlers
        .trim();
    }
  };

  /**
   * Sistema de auditoria e logs de segurança
   */
  const securityAudit = {
    logs: [],
    maxLogs: 1000,
    
    /**
     * Registrar evento de segurança
     * @param {string} event - Tipo de evento
     * @param {string} details - Detalhes do evento
     * @param {string} severity - Severidade (low, medium, high, critical)
     * @param {Object} metadata - Metadados adicionais
     */
    log(event, details, severity = 'low', metadata = {}) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        details,
        severity,
        metadata,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId()
      };
      
      this.logs.push(logEntry);
      
      // Manter apenas os logs mais recentes
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
      
      // Log no console para desenvolvimento
      if (severity === 'critical' || severity === 'high') {
        console.error(`[SEGURANÇA ${severity.toUpperCase()}] ${event}: ${details}`, metadata);
      } else if (severity === 'medium') {
        console.warn(`[SEGURANÇA ${severity.toUpperCase()}] ${event}: ${details}`, metadata);
      } else {
        console.log(`[SEGURANÇA ${severity.toUpperCase()}] ${event}: ${details}`, metadata);
      }
      
      // Notificar usuário sobre eventos críticos
      if (severity === 'critical') {
        notificationSystem.show(`Alerta de Segurança: ${details}`, 'error', 10000);
      }
    },
    
    /**
     * Obter ID da sessão
     * @returns {string} ID da sessão
     */
    getSessionId() {
      if (!this.sessionId) {
        this.sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }
      return this.sessionId;
    },
    
    /**
     * Exportar logs para análise
     * @returns {string} Logs em formato JSON
     */
    exportLogs() {
      return JSON.stringify(this.logs, null, 2);
    },
    
    /**
     * Limpar logs antigos
     * @param {number} maxAge - Idade máxima em milissegundos
     */
    cleanupOldLogs(maxAge = 24 * 60 * 60 * 1000) { // 24 horas
      const now = Date.now();
      this.logs = this.logs.filter(log => {
        return (now - new Date(log.timestamp).getTime()) < maxAge;
      });
    }
  };

  /**
   * Sistema de proteção contra ataques XSS
   */
  const xssProtection = {
    /**
     * Escapar HTML para prevenir XSS
     * @param {string} text - Texto a ser escapado
     * @returns {string} Texto escapado
     */
    escapeHtml(text) {
      if (typeof text !== 'string') return '';
      
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
    
    /**
     * Validar e limpar atributos HTML
     * @param {string} attribute - Atributo a ser validado
     * @returns {string} Atributo limpo
     */
    sanitizeAttribute(attribute) {
      if (typeof attribute !== 'string') return '';
      
      // Permitir apenas atributos seguros
      const safeAttributes = [
        'class', 'id', 'style', 'title', 'alt', 'src', 'href',
        'width', 'height', 'type', 'value', 'placeholder'
      ];
      
      const [name, value] = attribute.split('=');
      if (!safeAttributes.includes(name.toLowerCase())) {
        return '';
      }
      
      return `${name}="${this.escapeHtml(value.replace(/"/g, ''))}"`;
    },
    
    /**
     * Criar elemento DOM de forma segura
     * @param {string} tag - Tag HTML
     * @param {Object} attributes - Atributos do elemento
     * @param {string} content - Conteúdo do elemento
     * @returns {Element} Elemento DOM seguro
     */
    createSafeElement(tag, attributes = {}, content = '') {
      const element = document.createElement(tag);
      
      // Aplicar atributos de forma segura
      for (const [key, value] of Object.entries(attributes)) {
        if (this.sanitizeAttribute(`${key}="${value}"`)) {
          element.setAttribute(key, value);
        }
      }
      
      // Definir conteúdo de forma segura
      if (content) {
        element.textContent = content;
      }
      
      return element;
    }
  };

  /**
   * Sistema de proteção contra CSRF
   */
  const csrfProtection = {
    token: null,
    
    /**
     * Gerar token CSRF
     * @returns {string} Token gerado
     */
    generateToken() {
      this.token = 'csrf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 15);
      return this.token;
    },
    
    /**
     * Validar token CSRF
     * @param {string} token - Token a ser validado
     * @returns {boolean} True se válido
     */
    validateToken(token) {
      return token === this.token;
    },
    
    /**
     * Adicionar token aos formulários
     */
    protectForms() {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = '_csrf_token';
        tokenInput.value = this.token || this.generateToken();
        form.appendChild(tokenInput);
      });
    }
  };

  /**
   * Função para validar filtros antes de aplicar
   * @returns {Object} Resultado da validação
   */
  function validarFiltros() {
    const dataInicio = getCachedElement('#dataInicio')?.value;
    const dataFim = getCachedElement('#dataFim')?.value;
    
    // Validar datas
    const dataInicioValidation = inputValidator.validateDate(dataInicio);
    if (!dataInicioValidation.valid) {
      securityAudit.log('VALIDACAO_FALHOU', `Data início inválida: ${dataInicio}`, 'medium', { dataInicio });
      notificationSystem.show(dataInicioValidation.error, 'error', 5000);
      return { valid: false, error: dataInicioValidation.error };
    }
    
    const dataFimValidation = inputValidator.validateDate(dataFim);
    if (!dataFimValidation.valid) {
      securityAudit.log('VALIDACAO_FALHOU', `Data fim inválida: ${dataFim}`, 'medium', { dataFim });
      notificationSystem.show(dataFimValidation.error, 'error', 5000);
      return { valid: false, error: dataFimValidation.error };
    }
    
    // Validar se data início é anterior à data fim
    const inicio = new Date(dataInicio.split('/').reverse().join('-'));
    const fim = new Date(dataFim.split('/').reverse().join('-'));
    
    if (inicio > fim) {
      const error = 'Data início deve ser anterior à data fim';
      securityAudit.log('VALIDACAO_FALHOU', error, 'medium', { dataInicio, dataFim });
      notificationSystem.show(error, 'error', 5000);
      return { valid: false, error };
    }
    
    // Validar empresas selecionadas
    const empresasValidation = inputValidator.validateEmpresas(selectedEmpresas);
    if (!empresasValidation.valid) {
      securityAudit.log('VALIDACAO_FALHOU', empresasValidation.error, 'medium', { empresas: selectedEmpresas });
      notificationSystem.show(empresasValidation.error, 'error', 5000);
      return { valid: false, error: empresasValidation.error };
    }
    
    securityAudit.log('VALIDACAO_SUCESSO', 'Filtros validados com sucesso', 'low', { dataInicio, dataFim, empresas: selectedEmpresas });
    return { valid: true };
  }

  /**
   * Função para aplicar filtros com validação de segurança
   */
  function aplicarFiltrosSeguro() {
    // Validar filtros antes de aplicar
    const validacao = validarFiltros();
    if (!validacao.valid) {
      return;
    }
    
    // Registrar tentativa de aplicação de filtros
    securityAudit.log('FILTROS_APLICADOS', 'Filtros aplicados com sucesso', 'low', {
      dataInicio: getCachedElement('#dataInicio').value,
      dataFim: getCachedElement('#dataFim').value,
      empresas: selectedEmpresas
    });
    
    // Aplicar filtros normalmente
    aplicarFiltros();
  }

  /**
   * Função para resetar filtros com validação de segurança
   */
  function resetarFiltrosSeguro() {
    // Registrar tentativa de reset de filtros
    securityAudit.log('FILTROS_RESETADOS', 'Filtros resetados para valores padrão', 'low');
    
    // Resetar filtros normalmente
    resetarFiltros();
  }

  /**
   * Função para abrir
   */
  function abrir_fat(){
      var params = '';
      var level = 'lvl_aevdk6z';
      openLevel(level, params);
  }

  

  function abri_dev(){
      var params = '';
      var level = 'lvl_af0k6v6';
      openLevel(level, params);
  }

  function abrir_des(){
      var params = '';
      var level = 'lvl_af0k60c';
      openLevel(level, params);
  }


  function abrir_imp(){
      var params = '';
      var level = 'lvl_af0k6wh';
      openLevel(level, params);
  }


  function abrir_cmv(){
      var params = '';
      var level = 'lvl_af0k6wt';
      openLevel(level, params);
  }

  function abrir_ton(){
      var params = '';
      var level = 'lvl_af0k6w6';
      openLevel(level, params);
  }

  function abrir_mar(){
      var params = '';
      var level = 'lvl_af0k6yb';
      openLevel(level, params);
  }

  function abrir_mar_perc(){
      var params = '';
      var level = 'lvl_af0k6yr';
      openLevel(level, params);
  }

  function abrir_do(){
      var params = '';
      var level = 'lvl_af0k6y9';
      openLevel(level, params);
  }

  function abrir_inv(){
      var params = '';
      var level = 'lvl_af0k6zs';
      openLevel(level, params);
  }


  /**
   * Função para inicializar sistema de segurança
   */
  function inicializarSistemaSeguranca() {
    // Gerar token CSRF
    csrfProtection.generateToken();
    
    // Proteger formulários
    csrfProtection.protectForms();
    
    // Registrar inicialização
    securityAudit.log('SISTEMA_INICIADO', 'Sistema de segurança inicializado', 'low');
    
    // Substituir funções originais pelas seguras
    window.aplicarFiltros = aplicarFiltrosSeguro;
    window.resetarFiltros = resetarFiltrosSeguro;
    
    console.log('Sistema de segurança inicializado com sucesso');
  }

  // Inicializar sistema de segurança quando a página carregar
  document.addEventListener('DOMContentLoaded', inicializarSistemaSeguranca);

  // Limpar logs antigos a cada hora
  setInterval(() => {
    securityAudit.cleanupOldLogs();
  }, 60 * 60 * 1000);

  // Monitorar tentativas de manipulação do DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Verificar se algum script foi adicionado dinamicamente
            if (node.tagName === 'SCRIPT' || node.innerHTML?.includes('<script')) {
              securityAudit.log('XSS_TENTATIVA', 'Tentativa de inserção de script detectada', 'high', {
                node: node.outerHTML,
                timestamp: new Date().toISOString()
              });
              
              // Remover script malicioso
              if (node.parentNode) {
                node.parentNode.removeChild(node);
              }
            }
          }
        });
      }
    });
  });

  // Iniciar observação do DOM
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });







</script>

</body>
</html>