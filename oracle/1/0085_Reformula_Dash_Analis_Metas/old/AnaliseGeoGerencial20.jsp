<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8"
pageEncoding="UTF-8"%> <%@ page import="java.util.*" %> <%@ taglib
uri="http://java.sun.com/jstl/core_rt" prefix="c" %> <%@ taglib prefix="snk"
uri="/WEB-INF/tld/sankhyaUtil.tld" %> <%@ taglib prefix="fmt"
uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Análise Geo-Gerencial Avançada</title>
    <link
      href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <!-- Leaflet para OpenStreetMap -->
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <!-- Heatmap plugin -->
    <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
    <!-- Chart.js para gráficos -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

    <style>
      /* Estilos base */
      body {
        margin: 0;
        padding: 0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        padding-top: 35px !important;
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
        font-size: 1rem;
        font-weight: 700;
        margin: 0;
        text-align: center;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        letter-spacing: 1px;
      }

      /* Container principal */
      .main-container {
        padding: 4px 12px 12px 12px;
        margin-top: 0;
      }

      /* Cards de resumo */
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;
        margin-bottom: 15px;
      }

      .summary-card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 138, 112, 0.1);
        padding: 10px;
        transition: all 0.3s ease;
      }

      .summary-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 138, 112, 0.2);
      }

      .summary-card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }

      .summary-card-icon {
        font-size: 1rem;
        color: #00afa0;
      }

      .summary-card-title {
        font-size: 0.7rem;
        color: #6e6e6e;
        font-weight: 500;
        margin: 0;
      }

      .summary-card-value {
        font-size: 1rem;
        font-weight: 700;
        color: #008a70;
        margin: 0;
        word-break: break-word;
        overflow-wrap: break-word;
      }

      /* Abas e gráficos */
      .tabs-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 138, 112, 0.1);
        margin-bottom: 12px;
      }
      .tabs-header {
        display: flex;
        border-bottom: 1px solid #ebebeb;
      }
      .tab-btn {
        padding: 10px 14px;
        background: transparent;
        border: none;
        cursor: pointer;
        font-weight: 600;
        color: #6e6e6e;
        border-bottom: 2px solid transparent;
      }
      .tab-btn.active {
        color: #008a70;
        border-bottom-color: #00afa0;
      }
      .tab-content {
        padding: 12px;
      }
      .chart-wrapper-simple {
        position: relative;
        width: 100%;
        height: 260px;
      }

      /* Em telas largas, manter os 9 cards em uma única linha */
      @media (min-width: 1024px) {
        .summary-cards {
          grid-template-columns: repeat(9, minmax(0, 1fr));
        }
      }

      /* Container do mapa com controles */
      .map-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 138, 112, 0.1);
        overflow: hidden;
        height: 650px;
        position: relative;
      }

      #geographicMap {
        width: 100%;
        height: 100%;
      }

      /* Painel de controles flutuante */
      .map-controls {
        position: absolute;
        top: 15px;
        right: 15px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        padding: 12px;
        z-index: 1000;
        min-width: 200px;
        transition: all 0.3s ease;
      }

      .map-controls.hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateX(20px);
      }

      /* Botão toggle para controles */
      .toggle-btn {
        position: absolute;
        top: 15px;
        right: 15px;
        background: white;
        border: none;
        border-radius: 4px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        z-index: 1001;
      }

      .toggle-btn:hover {
        background: #f8f9fa;
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
      }

      .toggle-btn i {
        color: #008a70;
        font-size: 0.9rem;
      }

      .control-group {
        margin-bottom: 12px;
      }

      .control-group:last-child {
        margin-bottom: 0;
      }

      .control-label {
        font-size: 0.8rem;
        color: #6e6e6e;
        font-weight: 600;
        margin-bottom: 6px;
        display: block;
      }

      .control-buttons {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .btn-control {
        flex: 1;
        min-width: 80px;
        padding: 6px 10px;
        border: 1px solid #ebebeb;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 500;
        color: #6e6e6e;
        transition: all 0.3s;
      }

      .btn-control:hover {
        background: #f8f9fa;
        border-color: #00afa0;
      }

      .btn-control.active {
        background: linear-gradient(135deg, #00afa0, #008a70);
        color: white;
        border-color: transparent;
      }

      /* Toggle switch */
      .toggle-switch {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
      }

      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #9c9c9c;
        transition: 0.4s;
        border-radius: 24px;
      }

      .slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.4s;
        border-radius: 50%;
      }

      input:checked + .slider {
        background-color: #00afa0;
      }

      input:checked + .slider:before {
        transform: translateX(20px);
      }

      /* Filtros */
      .filter-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 138, 112, 0.1);
        padding: 10px;
        margin-bottom: 12px;
      }

      .filter-row {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: nowrap;
      }

      .filter-group {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .filter-label {
        font-size: 0.7rem;
        color: #6e6e6e;
        font-weight: 500;
        margin: 0;
        white-space: nowrap;
      }

      .filter-input {
        width: 110px;
        padding: 5px 8px;
        border: 1px solid #ebebeb;
        border-radius: 4px;
        font-size: 0.8rem;
        transition: border-color 0.3s;
      }

      .filter-input:focus {
        outline: none;
        border-color: #00afa0;
      }

      .btn-filter {
        background: linear-gradient(135deg, #00afa0, #008a70);
        color: white;
        border: none;
        padding: 5px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 0.8rem;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .btn-filter:hover {
        background: linear-gradient(135deg, #008a70, #00695e);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 138, 112, 0.3);
      }

      /* Loading overlay */
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(5px);
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #ebebeb;
        border-top: 3px solid #008a70;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .loading-text {
        margin-top: 12px;
        color: #6e6e6e;
        font-weight: 500;
        font-size: 0.9rem;
      }

      /* Mensagens */
      .error-message {
        background: linear-gradient(135deg, #e30613, #f56e1e);
        color: white;
        padding: 8px;
        border-radius: 6px;
        margin-bottom: 12px;
        text-align: center;
        font-weight: 500;
        font-size: 0.85rem;
      }

      .success-message {
        background: linear-gradient(135deg, #50af32, #a2c73b);
        color: white;
        padding: 8px;
        border-radius: 6px;
        margin-bottom: 12px;
        text-align: center;
        font-weight: 500;
        font-size: 0.85rem;
      }

      /* Badge de legenda */
      .legend {
        position: absolute;
        bottom: 15px;
        left: 15px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        padding: 12px;
        z-index: 1000;
        font-size: 0.75rem;
        transition: all 0.3s ease;
      }

      .legend.hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateX(-20px);
      }

      /* Botão toggle para legenda */
      .legend-toggle-btn {
        position: absolute;
        bottom: 15px;
        left: 15px;
        background: white;
        border: none;
        border-radius: 4px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        z-index: 1001;
      }

      .legend-toggle-btn:hover {
        background: #f8f9fa;
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
      }

      .legend-toggle-btn i {
        color: #008a70;
        font-size: 0.9rem;
      }

      .legend-title {
        font-weight: 600;
        color: #008a70;
        margin-bottom: 8px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      /* Responsividade */
      @media (max-width: 768px) {
        .map-controls {
          position: relative;
          top: 0;
          right: 0;
          margin-bottom: 12px;
        }

        .legend {
          position: relative;
          bottom: 0;
          left: 0;
          margin-top: 12px;
        }

        .summary-cards {
          grid-template-columns: 1fr;
        }

        .filter-row {
          flex-wrap: wrap;
        }

        .filter-group {
          min-width: 45%;
        }

        .filter-input {
          width: 100%;
        }

        .map-container {
          height: 500px;
        }
      }
    </style>
  </head>

  <body>
    <!-- Fixed Header -->
    <div class="fixed-header">
      <div class="header-logo">
        <a
          href="https://neuon.com.br/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg"
            alt="Neuon Logo"
          />
        </a>
      </div>
      <h1 class="header-title">Análise de Metas Comerciais</h1>
    </div>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay" style="display: none">
      <div>
        <div class="loading-spinner"></div>
        <div class="loading-text">Carregando dados...</div>
      </div>
    </div>

    <div class="main-container">
      <!-- Cards de Resumo -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="summary-card-header">
            <i class="fas fa-shopping-cart summary-card-icon"></i>
            <h3 class="summary-card-title">Qtd Prevista</h3>
          </div>
          <p class="summary-card-value" id="qtdPrev">-</p>
        </div>
        <div class="summary-card">
          <div class="summary-card-header">
            <i class="fas fa-check-circle summary-card-icon"></i>
            <h3 class="summary-card-title">Qtd Realizada</h3>
          </div>
          <p class="summary-card-value" id="qtdReal">-</p>
        </div>
        <div class="summary-card">
          <div class="summary-card-header">
            <i class="fas fa-percentage summary-card-icon"></i>
            <h3 class="summary-card-title">Atingimento Qtd</h3>
          </div>
          <p class="summary-card-value" id="pctQtd">-</p>
        </div>
        <div class="summary-card">
          <div class="summary-card-header">
            <i class="fas fa-dollar-sign summary-card-icon"></i>
            <h3 class="summary-card-title">Valor Previsto</h3>
          </div>
          <p class="summary-card-value" id="vlrPrev">-</p>
        </div>
        <div class="summary-card">
          <div class="summary-card-header">
            <i class="fas fa-chart-line summary-card-icon"></i>
            <h3 class="summary-card-title">Valor Realizado</h3>
          </div>
          <p class="summary-card-value" id="vlrReal">-</p>
        </div>
        <div class="summary-card">
          <div class="summary-card-header">
            <i class="fas fa-percentage summary-card-icon"></i>
            <h3 class="summary-card-title">Atingimento Vlr</h3>
          </div>
          <p class="summary-card-value" id="pctVlr">-</p>
        </div>
        <div class="summary-card">
          <div class="summary-card-header">
            <i class="fas fa-ticket-alt summary-card-icon"></i>
            <h3 class="summary-card-title">Ticket Médio Prev</h3>
          </div>
          <p class="summary-card-value" id="ticketMedioPrev">-</p>
        </div>
        <div class="summary-card">
          <div class="summary-card-header">
            <i class="fas fa-receipt summary-card-icon"></i>
            <h3 class="summary-card-title">Ticket Médio Real</h3>
          </div>
          <p class="summary-card-value" id="ticketMedioReal">-</p>
        </div>
        <div class="summary-card">
          <div class="summary-card-header">
            <i class="fas fa-chart-bar summary-card-icon"></i>
            <h3 class="summary-card-title">Variação Ticket</h3>
          </div>
          <p class="summary-card-value" id="variacaoTicket">-</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="filter-container">
        <div class="filter-row">
          <button
            class="btn-filter"
            title="Safra Anterior"
            onclick="preencherSafra('anterior')"
            style="display: flex; align-items: center; gap: 6px"
          >
            <span style="display: inline-flex">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                style="width: 16px; height: 16px"
              >
                <path
                  fill-rule="evenodd"
                  d="M13.25 14a.75.75 0 0 1-.75-.75v-6.5H4.56l.97.97a.75.75 0 0 1-1.06 1.06L2.22 6.53a.75.75 0 0 1 0-1.06l2.25-2.25a.75.75 0 0 1 1.06 1.06l-.97.97h8.69A.75.75 0 0 1 14 6v7.25a.75.75 0 0 1-.75.75Z"
                  clip-rule="evenodd"
                />
              </svg>
            </span>
          </button>
          <button
            class="btn-filter"
            title="Safra Atual"
            onclick="preencherSafra('atual')"
            style="display: flex; align-items: center; gap: 6px"
          >
            <span style="display: inline-flex">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                style="width: 16px; height: 16px"
              >
                <path
                  fill-rule="evenodd"
                  d="M2.75 14a.75.75 0 0 0 .75-.75v-6.5h7.94l-.97.97a.75.75 0 0 0 1.06 1.06l2.25-2.25a.75.75 0 0 0 0-1.06l-2.25-2.25a.75.75 0 1 0-1.06 1.06l.97.97H2.75A.75.75 0 0 0 2 6v7.25c0 .414.336.75.75.75Z"
                  clip-rule="evenodd"
                />
              </svg>
            </span>
          </button>
          <div class="filter-group">
            <label class="filter-label">Inicial:</label>
            <input
              type="text"
              class="filter-input"
              id="dtInicio"
              placeholder="01/10/2025"
              value="01/10/2025"
            />
          </div>
          <div class="filter-group">
            <label class="filter-label">Final:</label>
            <input
              type="text"
              class="filter-input"
              id="dtFim"
              placeholder="31/10/2025"
              value="31/10/2025"
            />
          </div>
          <div class="filter-group">
            <label class="filter-label">Parceiro:</label>
            <div id="parceiroMultiContainer" style="position: relative">
              <div
                id="parceiroMultiTrigger"
                class="filter-input"
                style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  cursor: pointer;
                  width: 180px;
                  font-size: 0.75rem;
                "
                onclick="toggleParceiroDropdown()"
                title="Selecione parceiros"
              >
                <span id="parceiroMultiDisplay">Todos os parceiros</span>
                <i
                  class="fas fa-chevron-down"
                  style="color: #6e6e6e; font-size: 0.75rem"
                ></i>
              </div>
            </div>
          </div>
          <div class="filter-group">
            <label class="filter-label">Vendedor:</label>
            <div id="vendedorMultiContainer" style="position: relative">
              <div
                id="vendedorMultiTrigger"
                class="filter-input"
                style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  cursor: pointer;
                  width: 180px;
                  font-size: 0.75rem;
                "
                onclick="toggleVendedorDropdown()"
                title="Selecione vendedores"
              >
                <span id="vendedorMultiDisplay">Todos os vendedores</span>
                <i
                  class="fas fa-chevron-down"
                  style="color: #6e6e6e; font-size: 0.75rem"
                ></i>
              </div>
            </div>
          </div>
          <div class="filter-group">
            <label class="filter-label">Marca:</label>
            <div id="marcaMultiContainer" style="position: relative">
              <div
                id="marcaMultiTrigger"
                class="filter-input"
                style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  cursor: pointer;
                  width: 180px;
                  font-size: 0.75rem;
                "
                onclick="toggleMarcaDropdown()"
                title="Selecione marcas"
              >
                <span id="marcaMultiDisplay">Todas as marcas</span>
                <i
                  class="fas fa-chevron-down"
                  style="color: #6e6e6e; font-size: 0.75rem"
                ></i>
              </div>
            </div>
          </div>
          <div class="filter-group">
            <label class="filter-label">Grupo:</label>
            <div id="grupoMultiContainer" style="position: relative">
              <div
                id="grupoMultiTrigger"
                class="filter-input"
                style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  cursor: pointer;
                  width: 220px;
                  font-size: 0.75rem;
                "
                onclick="toggleGrupoDropdown()"
                title="Selecione grupos"
              >
                <span id="grupoMultiDisplay">Todos os grupos</span>
                <i
                  class="fas fa-chevron-down"
                  style="color: #6e6e6e; font-size: 0.75rem"
                ></i>
              </div>
            </div>
          </div>
          <button class="btn-filter" onclick="loadData()">
            <i class="fas fa-filter"></i>
            Filtrar
          </button>
        </div>
      </div>

      <!-- Abas de Gráficos (Quantidade e Valores) -->
      <div class="tabs-container">
        <div class="tabs-header">
          <button
            class="tab-btn active"
            id="tabQtdBtn"
            onclick="switchChartTab('qtd')"
          >
            <i class="fas fa-layer-group"></i>&nbsp;Quantidade
          </button>
          <button
            class="tab-btn"
            id="tabVlrBtn"
            onclick="switchChartTab('vlr')"
          >
            <i class="fas fa-dollar-sign"></i>&nbsp;Valores
          </button>
          <button
            class="tab-btn"
            id="tabTicketBtn"
            onclick="switchChartTab('ticket')"
          >
            <i class="fas fa-ticket-alt"></i>&nbsp;Ticket Médio
          </button>
        </div>
        <div class="tab-content">
          <div id="tabQtdContent" style="display: block">
            <div class="chart-wrapper-simple">
              <canvas id="qtdChart"></canvas>
            </div>
          </div>
          <div id="tabVlrContent" style="display: none">
            <div class="chart-wrapper-simple">
              <canvas id="vlrChart"></canvas>
            </div>
          </div>
          <div id="tabTicketContent" style="display: none">
            <div class="chart-wrapper-simple">
              <canvas id="ticketChart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Dropdown Multilist Parceiro -->
      <div
        id="parceiroMultiDropdown"
        style="
          display: none;
          position: absolute;
          z-index: 2000;
          background: white;
          border: 1px solid #ebebeb;
          border-radius: 6px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
          width: 280px;
          max-height: 320px;
          overflow: hidden;
        "
      >
        <div style="padding: 8px; border-bottom: 1px solid #f0f0f0">
          <input
            type="text"
            id="parceiroMultiSearch"
            class="filter-input"
            placeholder="Buscar parceiro..."
            style="width: 100%; box-sizing: border-box"
            onkeyup="filterParceiros()"
          />
        </div>
        <div
          id="parceiroMultiOptions"
          style="max-height: 240px; overflow: auto; padding: 6px 8px"
        ></div>
        <div
          style="
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            padding: 8px;
            border-top: 1px solid #f0f0f0;
          "
        >
          <button
            class="btn-filter"
            style="padding: 4px 10px; font-size: 0.75rem"
            onclick="applyParceiroSelection()"
          >
            Aplicar
          </button>
          <button
            class="btn-filter"
            style="padding: 4px 10px; font-size: 0.75rem; background: #9c9c9c"
            onclick="clearParceiroSelection()"
          >
            Limpar
          </button>
        </div>
      </div>

      <!-- Dropdown Multilist Vendedor -->
      <div
        id="vendedorMultiDropdown"
        style="
          display: none;
          position: absolute;
          z-index: 2000;
          background: white;
          border: 1px solid #ebebeb;
          border-radius: 6px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
          width: 280px;
          max-height: 320px;
          overflow: hidden;
        "
      >
        <div style="padding: 8px; border-bottom: 1px solid #f0f0f0">
          <input
            type="text"
            id="vendedorMultiSearch"
            class="filter-input"
            placeholder="Buscar vendedor..."
            style="width: 100%; box-sizing: border-box"
            onkeyup="filterVendedores()"
          />
        </div>
        <div
          id="vendedorMultiOptions"
          style="max-height: 240px; overflow: auto; padding: 6px 8px"
        ></div>
        <div
          style="
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            padding: 8px;
            border-top: 1px solid #f0f0f0;
          "
        >
          <button
            class="btn-filter"
            style="padding: 4px 10px; font-size: 0.75rem"
            onclick="applyVendedorSelection()"
          >
            Aplicar
          </button>
          <button
            class="btn-filter"
            style="padding: 4px 10px; font-size: 0.75rem; background: #9c9c9c"
            onclick="clearVendedorSelection()"
          >
            Limpar
          </button>
        </div>
      </div>

      <!-- Dropdown Multilist Marca -->
      <div
        id="marcaMultiDropdown"
        style="
          display: none;
          position: absolute;
          z-index: 2000;
          background: white;
          border: 1px solid #ebebeb;
          border-radius: 6px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
          width: 280px;
          max-height: 320px;
          overflow: hidden;
        "
      >
        <div style="padding: 8px; border-bottom: 1px solid #f0f0f0">
          <input
            type="text"
            id="marcaMultiSearch"
            class="filter-input"
            placeholder="Buscar marca..."
            style="width: 100%; box-sizing: border-box"
            onkeyup="filterMarcas()"
          />
        </div>
        <div
          id="marcaMultiOptions"
          style="max-height: 240px; overflow: auto; padding: 6px 8px"
        ></div>
        <div
          style="
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            padding: 8px;
            border-top: 1px solid #f0f0f0;
          "
        >
          <button
            class="btn-filter"
            style="padding: 4px 10px; font-size: 0.75rem"
            onclick="applyMarcaSelection()"
          >
            Aplicar
          </button>
          <button
            class="btn-filter"
            style="padding: 4px 10px; font-size: 0.75rem; background: #9c9c9c"
            onclick="clearMarcaSelection()"
          >
            Limpar
          </button>
        </div>
      </div>

      <!-- Dropdown Multilist Grupo -->
      <div
        id="grupoMultiDropdown"
        style="
          display: none;
          position: absolute;
          z-index: 2000;
          background: white;
          border: 1px solid #ebebeb;
          border-radius: 6px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
          width: 320px;
          max-height: 320px;
          overflow: hidden;
        "
      >
        <div style="padding: 8px; border-bottom: 1px solid #f0f0f0">
          <input
            type="text"
            id="grupoMultiSearch"
            class="filter-input"
            placeholder="Buscar grupo..."
            style="width: 100%; box-sizing: border-box"
            onkeyup="filterGrupos()"
          />
        </div>
        <div
          id="grupoMultiOptions"
          style="max-height: 240px; overflow: auto; padding: 6px 8px"
        ></div>
        <div
          style="
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            padding: 8px;
            border-top: 1px solid #f0f0f0;
          "
        >
          <button
            class="btn-filter"
            style="padding: 4px 10px; font-size: 0.75rem"
            onclick="applyGrupoSelection()"
          >
            Aplicar
          </button>
          <button
            class="btn-filter"
            style="padding: 4px 10px; font-size: 0.75rem; background: #9c9c9c"
            onclick="clearGrupoSelection()"
          >
            Limpar
          </button>
        </div>
      </div>

      <!-- Container do Mapa com Controles -->
      <div class="map-container">
        <div id="geographicMap"></div>

        <!-- Botão Toggle para Controles -->
        <button
          class="toggle-btn"
          onclick="toggleControls()"
          id="controlsToggleBtn"
          title="Exibir Controles"
        >
          <i class="fas fa-chevron-left"></i>
        </button>

        <!-- Painel de Controles -->
        <div class="map-controls hidden" id="mapControls">
          <div class="control-group">
            <label class="control-label">Tipo de Visualização</label>
            <div class="control-buttons">
              <button
                class="btn-control"
                onclick="switchViewMode('bubbles')"
                id="btnBubbles"
              >
                <i class="fas fa-circle"></i> Bolhas
              </button>
              <button
                class="btn-control"
                onclick="switchViewMode('heatmap')"
                id="btnHeatmap"
              >
                <i class="fas fa-fire"></i> Heatmap
              </button>
              <button
                class="btn-control active"
                onclick="switchViewMode('markers')"
                id="btnMarkers"
              >
                <i class="fas fa-map-marker-alt"></i> Pontos
              </button>
            </div>
          </div>
          <div class="control-group">
            <label class="control-label">Agregação por</label>
            <div class="control-buttons">
              <button
                class="btn-control active"
                onclick="switchAggregation('cidade')"
                id="btnCidade"
              >
                Cidade
              </button>
              <button
                class="btn-control"
                onclick="switchAggregation('estado')"
                id="btnEstado"
              >
                Estado
              </button>
              <button
                class="btn-control"
                onclick="switchAggregation('pais')"
                id="btnPais"
              >
                País
              </button>
            </div>
          </div>
          <div class="control-group">
            <div class="toggle-switch">
              <span class="control-label">Auto Zoom Inteligente</span>
              <label class="switch">
                <input
                  type="checkbox"
                  id="autoZoomToggle"
                  onchange="toggleAutoZoom()"
                />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Botão Toggle para Legenda -->
        <button
          class="legend-toggle-btn"
          onclick="toggleLegend()"
          id="legendToggleBtn"
          title="Exibir Legenda"
        >
          <i class="fas fa-info-circle"></i>
        </button>

        <!-- Legenda -->
        <div class="legend" id="legend">
          <div class="legend-title">
            <i class="fas fa-info-circle"></i> Legenda de Valores
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #9c9c9c"></div>
            <span>Zero</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #ffb914"></div>
            <span>Até R$ 1.000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #f56e1e"></div>
            <span>Até R$ 10.000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #e30613"></div>
            <span>Até R$ 50.000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #00afa0"></div>
            <span>Até R$ 100.000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #008a70"></div>
            <span>Até R$ 500.000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #00695e"></div>
            <span>Acima R$ 500.000</span>
          </div>
        </div>
      </div>
    </div>

    <script>
      // Variáveis globais
      let map;
      let markers = [];
      let heatmapLayer = null;
      let bubbleGroup = null;
      let data = [];
      let currentViewMode = "markers";
      let currentAggregation = "cidade";
      let autoZoomEnabled = false;
      let qtdChart = null;
      let vlrChart = null;
      let ticketChart = null;
      let allParceiros = [];
      let filteredParceiros = [];
      let selectedParceiros = [];
      let allVendedores = [];
      let filteredVendedores = [];
      let selectedVendedores = [];
      let allMarcas = [];
      let filteredMarcas = [];
      let selectedMarcas = [];
      let allGrupos = [];
      let filteredGrupos = [];
      let selectedGrupos = [];

      // Função para mostrar/ocultar loading
      function showLoading(show = true) {
        const overlay = document.getElementById("loadingOverlay");
        overlay.style.display = show ? "flex" : "none";
      }

      // Função para mostrar mensagem de erro
      function showError(message) {
        const container = document.querySelector(".main-container");
        const errorDiv = document.createElement("div");
        errorDiv.className = "error-message";
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;

        const existingError = container.querySelector(".error-message");
        if (existingError) {
          existingError.remove();
        }

        container.insertBefore(errorDiv, container.firstChild);

        setTimeout(() => {
          errorDiv.remove();
        }, 5000);
      }

      // Função para mostrar mensagem de sucesso
      function showSuccess(message) {
        const container = document.querySelector(".main-container");
        const successDiv = document.createElement("div");
        successDiv.className = "success-message";
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;

        const existingSuccess = container.querySelector(".success-message");
        if (existingSuccess) {
          existingSuccess.remove();
        }

        container.insertBefore(successDiv, container.firstChild);

        setTimeout(() => {
          successDiv.remove();
        }, 3000);
      }

      // Carrega parceiros
      async function carregarParceiros() {
        try {
          if (typeof JX === "undefined" || !JX.consultar) return;
          const sql = `SELECT DISTINCT CODPARC, PARCEIRO FROM VGF_VENDAS_SATIS ORDER BY 2`;
          const parceiros = await JX.consultar(sql);
          allParceiros = parceiros || [];
          filteredParceiros = [...allParceiros];
          renderParceirosOptions();
        } catch (e) {
          console.error("Erro ao carregar parceiros:", e);
        }
      }

      // Carrega vendedores
      async function carregarVendedores() {
        try {
          if (typeof JX === "undefined" || !JX.consultar) return;
          const sql = `SELECT DISTINCT CODVEND, APELIDO FROM VGF_VENDAS_SATIS ORDER BY 2`;
          const vendedores = await JX.consultar(sql);
          allVendedores = vendedores || [];
          filteredVendedores = [...allVendedores];
          renderVendedoresOptions();
        } catch (e) {
          console.error("Erro ao carregar vendedores:", e);
        }
      }

      // Carrega marcas
      async function carregarMarcas() {
        try {
          if (typeof JX === "undefined" || !JX.consultar) return;

          const sql = `SELECT DISTINCT MARCA FROM VGF_VENDAS_SATIS WHERE MARCA IS NOT NULL ORDER BY 1`;
          const marcas = await JX.consultar(sql);
          allMarcas = (marcas || []).map((m) => ({ MARCA: m.MARCA }));
          filteredMarcas = [...allMarcas];
          renderMarcasOptions();
        } catch (e) {
          console.error("Erro ao carregar marcas:", e);
        }
      }

      // Carrega grupos (CODGRUPOPROD, DESCRGRUPOPROD)
      async function carregarGrupos() {
        try {
          if (typeof JX === "undefined" || !JX.consultar) return;
          const sql = `SELECT DISTINCT CODGRUPOPROD, DESCRGRUPOPROD FROM VGF_VENDAS_SATIS ORDER BY 2`;
          const grupos = await JX.consultar(sql);
          allGrupos = grupos || [];
          filteredGrupos = [...allGrupos];
          renderGruposOptions();
        } catch (e) {
          console.error("Erro ao carregar grupos:", e);
        }
      }

      function toggleParceiroDropdown() {
        const trigger = document.getElementById("parceiroMultiTrigger");
        const dropdown = document.getElementById("parceiroMultiDropdown");
        if (!trigger || !dropdown) return;
        const rect = trigger.getBoundingClientRect();
        dropdown.style.left = `${rect.left + window.scrollX}px`;
        dropdown.style.top = `${rect.bottom + window.scrollY + 6}px`;
        dropdown.style.display =
          dropdown.style.display === "none" ? "block" : "none";
      }

      function toggleVendedorDropdown() {
        const trigger = document.getElementById("vendedorMultiTrigger");
        const dropdown = document.getElementById("vendedorMultiDropdown");
        if (!trigger || !dropdown) return;
        const rect = trigger.getBoundingClientRect();
        dropdown.style.left = `${rect.left + window.scrollX}px`;
        dropdown.style.top = `${rect.bottom + window.scrollY + 6}px`;
        dropdown.style.display =
          dropdown.style.display === "none" ? "block" : "none";
      }

      function toggleMarcaDropdown() {
        const trigger = document.getElementById("marcaMultiTrigger");
        const dropdown = document.getElementById("marcaMultiDropdown");
        if (!trigger || !dropdown) return;
        const rect = trigger.getBoundingClientRect();
        dropdown.style.left = `${rect.left + window.scrollX}px`;
        dropdown.style.top = `${rect.bottom + window.scrollY + 6}px`;
        dropdown.style.display =
          dropdown.style.display === "none" ? "block" : "none";
      }

      function toggleGrupoDropdown() {
        const trigger = document.getElementById("grupoMultiTrigger");
        const dropdown = document.getElementById("grupoMultiDropdown");
        if (!trigger || !dropdown) return;
        const rect = trigger.getBoundingClientRect();
        dropdown.style.left = `${rect.left + window.scrollX}px`;
        dropdown.style.top = `${rect.bottom + window.scrollY + 6}px`;
        dropdown.style.display =
          dropdown.style.display === "none" ? "block" : "none";
      }

      function renderParceirosOptions() {
        const container = document.getElementById("parceiroMultiOptions");
        if (!container) return;
        container.innerHTML = "";

        const wrapAll = document.createElement("div");
        wrapAll.style.display = "flex";
        wrapAll.style.alignItems = "center";
        wrapAll.style.gap = "8px";
        wrapAll.style.padding = "6px 4px";
        const cbAll = document.createElement("input");
        cbAll.type = "checkbox";
        cbAll.checked = selectedParceiros.length === 0;
        cbAll.onclick = () => {
          selectedParceiros = [];
          updateParceiroDisplay();
          renderParceirosOptions();
        };
        const lblAll = document.createElement("span");
        lblAll.textContent = "Todos os parceiros";
        lblAll.style.fontSize = "0.8rem";
        wrapAll.appendChild(cbAll);
        wrapAll.appendChild(lblAll);
        container.appendChild(wrapAll);

        (filteredParceiros || []).forEach((p) => {
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.gap = "8px";
          row.style.padding = "6px 4px";
          row.style.cursor = "pointer";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = selectedParceiros.includes(String(p.CODPARC));
          cb.onclick = (e) => {
            e.stopPropagation();
            toggleParceiro(String(p.CODPARC));
          };

          const text = document.createElement("span");
          text.style.fontSize = "0.8rem";
          text.textContent = `${p.CODPARC} - ${p.PARCEIRO}`;
          row.onclick = () => toggleParceiro(String(p.CODPARC));
          row.appendChild(cb);
          row.appendChild(text);
          container.appendChild(row);
        });
      }

      function renderVendedoresOptions() {
        const container = document.getElementById("vendedorMultiOptions");
        if (!container) return;
        container.innerHTML = "";

        const wrapAll = document.createElement("div");
        wrapAll.style.display = "flex";
        wrapAll.style.alignItems = "center";
        wrapAll.style.gap = "8px";
        wrapAll.style.padding = "6px 4px";
        const cbAll = document.createElement("input");
        cbAll.type = "checkbox";
        cbAll.checked = selectedVendedores.length === 0;
        cbAll.onclick = () => {
          selectedVendedores = [];
          updateVendedorDisplay();
          renderVendedoresOptions();
        };
        const lblAll = document.createElement("span");
        lblAll.textContent = "Todos os vendedores";
        lblAll.style.fontSize = "0.8rem";
        wrapAll.appendChild(cbAll);
        wrapAll.appendChild(lblAll);
        container.appendChild(wrapAll);

        (filteredVendedores || []).forEach((v) => {
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.gap = "8px";
          row.style.padding = "6px 4px";
          row.style.cursor = "pointer";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = selectedVendedores.includes(String(v.CODVEND));
          cb.onclick = (e) => {
            e.stopPropagation();
            toggleVendedor(String(v.CODVEND));
          };

          const text = document.createElement("span");
          text.style.fontSize = "0.8rem";
          text.textContent = `${v.CODVEND} - ${v.APELIDO}`;
          row.onclick = () => toggleVendedor(String(v.CODVEND));
          row.appendChild(cb);
          row.appendChild(text);
          container.appendChild(row);
        });
      }

      function renderMarcasOptions() {
        const container = document.getElementById("marcaMultiOptions");
        if (!container) return;
        container.innerHTML = "";

        const wrapAll = document.createElement("div");
        wrapAll.style.display = "flex";
        wrapAll.style.alignItems = "center";
        wrapAll.style.gap = "8px";
        wrapAll.style.padding = "6px 4px";
        const cbAll = document.createElement("input");
        cbAll.type = "checkbox";
        cbAll.checked = selectedMarcas.length === 0;
        cbAll.onclick = () => {
          selectedMarcas = [];
          updateMarcaDisplay();
          renderMarcasOptions();
        };
        const lblAll = document.createElement("span");
        lblAll.textContent = "Todas as marcas";
        lblAll.style.fontSize = "0.8rem";
        wrapAll.appendChild(cbAll);
        wrapAll.appendChild(lblAll);
        container.appendChild(wrapAll);

        (filteredMarcas || []).forEach((m) => {
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.gap = "8px";
          row.style.padding = "6px 4px";
          row.style.cursor = "pointer";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = selectedMarcas.includes(String(m.MARCA));
          cb.onclick = (e) => {
            e.stopPropagation();
            toggleMarca(String(m.MARCA));
          };

          const text = document.createElement("span");
          text.style.fontSize = "0.8rem";
          text.textContent = `${m.MARCA}`;
          row.onclick = () => toggleMarca(String(m.MARCA));
          row.appendChild(cb);
          row.appendChild(text);
          container.appendChild(row);
        });
      }

      function renderGruposOptions() {
        const container = document.getElementById("grupoMultiOptions");
        if (!container) return;
        container.innerHTML = "";

        const wrapAll = document.createElement("div");
        wrapAll.style.display = "flex";
        wrapAll.style.alignItems = "center";
        wrapAll.style.gap = "8px";
        wrapAll.style.padding = "6px 4px";
        const cbAll = document.createElement("input");
        cbAll.type = "checkbox";
        cbAll.checked = selectedGrupos.length === 0;
        cbAll.onclick = () => {
          selectedGrupos = [];
          updateGrupoDisplay();
          renderGruposOptions();
        };
        const lblAll = document.createElement("span");
        lblAll.textContent = "Todos os grupos";
        lblAll.style.fontSize = "0.8rem";
        wrapAll.appendChild(cbAll);
        wrapAll.appendChild(lblAll);
        container.appendChild(wrapAll);

        (filteredGrupos || []).forEach((g) => {
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.gap = "8px";
          row.style.padding = "6px 4px";
          row.style.cursor = "pointer";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = selectedGrupos.includes(String(g.CODGRUPOPROD));
          cb.onclick = (e) => {
            e.stopPropagation();
            toggleGrupo(String(g.CODGRUPOPROD));
          };

          const text = document.createElement("span");
          text.style.fontSize = "0.8rem";
          text.textContent = `${g.CODGRUPOPROD} - ${g.DESCRGRUPOPROD}`;
          row.onclick = () => toggleGrupo(String(g.CODGRUPOPROD));
          row.appendChild(cb);
          row.appendChild(text);
          container.appendChild(row);
        });
      }

      function toggleParceiro(codparc) {
        const idx = selectedParceiros.indexOf(codparc);
        if (idx >= 0) {
          selectedParceiros.splice(idx, 1);
        } else {
          selectedParceiros.push(codparc);
        }
        updateParceiroDisplay();
        renderParceirosOptions();
      }

      function toggleVendedor(codvend) {
        const idx = selectedVendedores.indexOf(codvend);
        if (idx >= 0) {
          selectedVendedores.splice(idx, 1);
        } else {
          selectedVendedores.push(codvend);
        }
        updateVendedorDisplay();
        renderVendedoresOptions();
      }

      function toggleMarca(marca) {
        const idx = selectedMarcas.indexOf(marca);
        if (idx >= 0) {
          selectedMarcas.splice(idx, 1);
        } else {
          selectedMarcas.push(marca);
        }
        updateMarcaDisplay();
        renderMarcasOptions();
      }

      function toggleGrupo(codgrupo) {
        const idx = selectedGrupos.indexOf(codgrupo);
        if (idx >= 0) {
          selectedGrupos.splice(idx, 1);
        } else {
          selectedGrupos.push(codgrupo);
        }
        updateGrupoDisplay();
        renderGruposOptions();
      }

      function updateParceiroDisplay() {
        const span = document.getElementById("parceiroMultiDisplay");
        if (!span) return;
        if (selectedParceiros.length === 0) {
          span.textContent = "Todos os parceiros";
        } else if (selectedParceiros.length === 1) {
          const p = allParceiros.find(
            (pp) => String(pp.CODPARC) === selectedParceiros[0]
          );
          span.textContent = p
            ? `${p.CODPARC} - ${p.PARCEIRO}`
            : "1 selecionado";
        } else {
          span.textContent = `${selectedParceiros.length} selecionados`;
        }
      }

      function updateVendedorDisplay() {
        const span = document.getElementById("vendedorMultiDisplay");
        if (!span) return;
        if (selectedVendedores.length === 0) {
          span.textContent = "Todos os vendedores";
        } else if (selectedVendedores.length === 1) {
          const v = allVendedores.find(
            (vv) => String(vv.CODVEND) === selectedVendedores[0]
          );
          span.textContent = v
            ? `${v.CODVEND} - ${v.APELIDO}`
            : "1 selecionado";
        } else {
          span.textContent = `${selectedVendedores.length} selecionados`;
        }
      }

      function updateMarcaDisplay() {
        const span = document.getElementById("marcaMultiDisplay");
        if (!span) return;
        if (selectedMarcas.length === 0) {
          span.textContent = "Todas as marcas";
        } else if (selectedMarcas.length === 1) {
          span.textContent = selectedMarcas[0];
        } else {
          span.textContent = `${selectedMarcas.length} selecionadas`;
        }
      }

      function updateGrupoDisplay() {
        const span = document.getElementById("grupoMultiDisplay");
        if (!span) return;
        if (selectedGrupos.length === 0) {
          span.textContent = "Todos os grupos";
        } else if (selectedGrupos.length === 1) {
          const g = allGrupos.find(
            (gg) => String(gg.CODGRUPOPROD) === selectedGrupos[0]
          );
          span.textContent = g
            ? `${g.CODGRUPOPROD} - ${g.DESCRGRUPOPROD}`
            : "1 selecionado";
        } else {
          span.textContent = `${selectedGrupos.length} selecionados`;
        }
      }

      function filterParceiros() {
        const input = document.getElementById("parceiroMultiSearch");
        const term = (input?.value || "").toLowerCase();
        if (!term) {
          filteredParceiros = [...allParceiros];
        } else {
          filteredParceiros = allParceiros.filter(
            (p) =>
              String(p.CODPARC).toLowerCase().includes(term) ||
              String(p.PARCEIRO).toLowerCase().includes(term)
          );
        }
        renderParceirosOptions();
      }

      function filterVendedores() {
        const input = document.getElementById("vendedorMultiSearch");
        const term = (input?.value || "").toLowerCase();
        if (!term) {
          filteredVendedores = [...allVendedores];
        } else {
          filteredVendedores = allVendedores.filter(
            (v) =>
              String(v.CODVEND).toLowerCase().includes(term) ||
              String(v.APELIDO).toLowerCase().includes(term)
          );
        }
        renderVendedoresOptions();
      }

      function filterMarcas() {
        const input = document.getElementById("marcaMultiSearch");
        const term = (input?.value || "").toLowerCase();
        if (!term) {
          filteredMarcas = [...allMarcas];
        } else {
          filteredMarcas = allMarcas.filter((m) =>
            String(m.MARCA).toLowerCase().includes(term)
          );
        }
        renderMarcasOptions();
      }

      function filterGrupos() {
        const input = document.getElementById("grupoMultiSearch");
        const term = (input?.value || "").toLowerCase();
        if (!term) {
          filteredGrupos = [...allGrupos];
        } else {
          filteredGrupos = allGrupos.filter(
            (g) =>
              String(g.CODGRUPOPROD).toLowerCase().includes(term) ||
              String(g.DESCRGRUPOPROD).toLowerCase().includes(term)
          );
        }
        renderGruposOptions();
      }

      function applyParceiroSelection() {
        toggleParceiroDropdown();
      }

      function applyVendedorSelection() {
        toggleVendedorDropdown();
      }

      function applyMarcaSelection() {
        toggleMarcaDropdown();
      }

      function applyGrupoSelection() {
        toggleGrupoDropdown();
      }

      function clearParceiroSelection() {
        selectedParceiros = [];
        updateParceiroDisplay();
        renderParceirosOptions();
      }

      function clearVendedorSelection() {
        selectedVendedores = [];
        updateVendedorDisplay();
        renderVendedoresOptions();
      }

      function clearMarcaSelection() {
        selectedMarcas = [];
        updateMarcaDisplay();
        renderMarcasOptions();
      }

      function clearGrupoSelection() {
        selectedGrupos = [];
        updateGrupoDisplay();
        renderGruposOptions();
      }

      // Utilitário: formata Date para dd/MM/yyyy
      function formatDateBR(d) {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      }

      // Calcula início e fim da safra atual com base na data de hoje
      function getPeriodoSafraAtual(today = new Date()) {
        const ano = today.getFullYear();
        const mes = today.getMonth() + 1; // 1..12
        // Safra começa em 01/07 ano X e termina em 30/06 ano X+1
        let inicioAno, fimAno;
        if (mes >= 7) {
          inicioAno = ano; // 01/07/ano
          fimAno = ano + 1; // 30/06/ano+1
        } else {
          inicioAno = ano - 1; // 01/07/ano-1
          fimAno = ano; // 30/06/ano
        }
        const inicio = new Date(inicioAno, 6, 1); // 6 = Julho
        const fim = new Date(fimAno, 5, 30); // 5 = Junho
        return { inicio, fim };
      }

      // Calcula safra anterior a partir da atual
      function getPeriodoSafraAnterior(today = new Date()) {
        const atual = getPeriodoSafraAtual(today);
        const inicioAnterior = new Date(atual.inicio);
        inicioAnterior.setFullYear(inicioAnterior.getFullYear() - 1);
        const fimAnterior = new Date(atual.fim);
        fimAnterior.setFullYear(fimAnterior.getFullYear() - 1);
        return { inicio: inicioAnterior, fim: fimAnterior };
      }

      // Preenche os campos dtInicio e dtFim com a safra solicitada
      function preencherSafra(tipo) {
        const periodo =
          tipo === "anterior"
            ? getPeriodoSafraAnterior()
            : getPeriodoSafraAtual();
        const dtInicioEl = document.getElementById("dtInicio");
        const dtFimEl = document.getElementById("dtFim");
        if (dtInicioEl && dtFimEl) {
          dtInicioEl.value = formatDateBR(periodo.inicio);
          dtFimEl.value = formatDateBR(periodo.fim);
        }
      }

      // Alternar abas dos gráficos
      function switchChartTab(which) {
        const qtdBtn = document.getElementById("tabQtdBtn");
        const vlrBtn = document.getElementById("tabVlrBtn");
        const ticketBtn = document.getElementById("tabTicketBtn");
        const qtdContent = document.getElementById("tabQtdContent");
        const vlrContent = document.getElementById("tabVlrContent");
        const ticketContent = document.getElementById("tabTicketContent");

        // Remover active de todos
        qtdBtn.classList.remove("active");
        vlrBtn.classList.remove("active");
        ticketBtn.classList.remove("active");
        qtdContent.style.display = "none";
        vlrContent.style.display = "none";
        ticketContent.style.display = "none";

        if (which === "qtd") {
          qtdBtn.classList.add("active");
          qtdContent.style.display = "block";
        } else if (which === "vlr") {
          vlrBtn.classList.add("active");
          vlrContent.style.display = "block";
        } else if (which === "ticket") {
          ticketBtn.classList.add("active");
          ticketContent.style.display = "block";
        }
      }

      // Carregar dados mensais para os gráficos (consolidação por mês/ano)
      async function loadChartsData() {
        try {
          if (typeof JX === "undefined" || !JX.consultar) {
            console.error("SankhyaJX não está disponível para os gráficos");
            return;
          }

          const dtInicio =
            document.getElementById("dtInicio").value || "01/10/2025";
          const dtFim = document.getElementById("dtFim").value || "31/10/2025";

          const parceirosIn =
            selectedParceiros && selectedParceiros.length > 0
              ? ` AND MET.CODPARC IN (${selectedParceiros.join(",")})`
              : "";
          const vendedoresIn =
            selectedVendedores && selectedVendedores.length > 0
              ? ` AND MET.CODVEND IN (${selectedVendedores.join(",")})`
              : "";
          const marcasIn =
            selectedMarcas && selectedMarcas.length > 0
              ? ` AND MET.MARCA IN ('${selectedMarcas
                  .map((m) => m.replace(/'/g, "''"))
                  .join("','")}')`
              : "";
          const gruposIn =
            selectedGrupos && selectedGrupos.length > 0
              ? ` AND NVL(VGF.CODGRUPOPROD, MAR.AD_GRUPOPROD) IN (${selectedGrupos.join(
                  ","
                )})`
              : "";

          const sqlMensal = `
            SELECT
              TO_CHAR(DTREF,'MM') MES,
              TO_CHAR(DTREF,'YYYY') ANO,
              TO_CHAR(DTREF,'MM/YYYY') MES_ANO,
              SUM(QTDREAL) AS QTD_REAL,
              SUM(QTDPREV) AS QTD_PREV,
              SUM(VLRREAL) AS VLR_REAL,
              SUM(VLRPREV) AS VLR_PREV
            FROM (
              SELECT 
                MET.DTREF,
                SUM(NVL(VGF.QTD, 0)) AS QTDREAL,
                NVL(MET.QTDPREV, 0) AS QTDPREV,
                SUM(NVL(VGF.VLR, 0)) AS VLRREAL,
                NVL(MET.QTDPREV, 0) * NVL(PRC.VLRVENDALT, 0) AS VLRPREV
              FROM TGFMET MET
              LEFT JOIN TGFMAR MAR ON MAR.DESCRICAO = MET.MARCA
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
              WHERE MET.CODMETA = 4 
                AND MET.DTREF BETWEEN '${dtInicio}' AND '${dtFim}'
                ${parceirosIn}
                ${vendedoresIn}
                ${marcasIn}
                ${gruposIn}
              GROUP BY MET.DTREF, NVL(MET.QTDPREV, 0), NVL(PRC.VLRVENDALT, 0)
            )
            GROUP BY 
              TO_CHAR(DTREF,'MM'), TO_CHAR(DTREF,'YYYY'), TO_CHAR(DTREF,'MM/YYYY')
            ORDER BY 2,1
          `;

          const mensal = await JX.consultar(sqlMensal);
          if (!mensal || mensal.length === 0) {
            if (qtdChart) {
              qtdChart.destroy();
              qtdChart = null;
            }
            if (vlrChart) {
              vlrChart.destroy();
              vlrChart = null;
            }
            if (ticketChart) {
              ticketChart.destroy();
              ticketChart = null;
            }
            return;
          }

          const labels = mensal.map((r) => r.MES_ANO);
          const qtdReal = mensal.map((r) => parseFloat(r.QTD_REAL) || 0);
          const qtdPrev = mensal.map((r) => parseFloat(r.QTD_PREV) || 0);
          const vlrReal = mensal.map((r) => parseFloat(r.VLR_REAL) || 0);
          const vlrPrev = mensal.map((r) => parseFloat(r.VLR_PREV) || 0);

          const ticketMedioPrev = mensal.map((r) => {
            const qtd = parseFloat(r.QTD_PREV) || 0;
            const vlr = parseFloat(r.VLR_PREV) || 0;
            return qtd > 0 ? vlr / qtd : 0;
          });
          const ticketMedioReal = mensal.map((r) => {
            const qtd = parseFloat(r.QTD_REAL) || 0;
            const vlr = parseFloat(r.VLR_REAL) || 0;
            return qtd > 0 ? vlr / qtd : 0;
          });

          createSimpleLineChart(
            "qtdChart",
            "Qtd Real",
            qtdReal,
            "Qtd Prev",
            qtdPrev,
            labels,
            (chart) => {
              qtdChart = chart;
            }
          );
          createSimpleLineChart(
            "vlrChart",
            "Vlr Real",
            vlrReal,
            "Vlr Prev",
            vlrPrev,
            labels,
            (chart) => {
              vlrChart = chart;
            }
          );
          createSimpleLineChart(
            "ticketChart",
            "Ticket Médio Real",
            ticketMedioReal,
            "Ticket Médio Prev",
            ticketMedioPrev,
            labels,
            (chart) => {
              ticketChart = chart;
            }
          );
        } catch (error) {
          console.error("Erro ao carregar dados dos gráficos:", error);
        }
      }

      function createSimpleLineChart(
        canvasId,
        labelReal,
        dataReal,
        labelPrev,
        dataPrev,
        labels,
        assignCb
      ) {
        if (assignCb === undefined) assignCb = () => {};
        if (typeof Chart === "undefined") return;
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        if (canvasId === "qtdChart" && qtdChart) {
          qtdChart.destroy();
          qtdChart = null;
        }
        if (canvasId === "vlrChart" && vlrChart) {
          vlrChart.destroy();
          vlrChart = null;
        }
        if (canvasId === "ticketChart" && ticketChart) {
          ticketChart.destroy();
          ticketChart = null;
        }

        const ctx = canvas.getContext("2d");
        const chart = new Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: labelReal,
                data: dataReal,
                borderColor: "#008a70",
                backgroundColor: "rgba(0, 138, 112, 0.10)",
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: "#008a70",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,
                pointRadius: 4,
              },
              {
                label: labelPrev,
                data: dataPrev,
                borderColor: "#f56e1e",
                backgroundColor: "rgba(245, 110, 30, 0.10)",
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: "#f56e1e",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,
                pointRadius: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, labels: { usePointStyle: true } },
              tooltip: { mode: "index", intersect: false },
            },
            interaction: { mode: "index", intersect: false },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.06)" } },
            },
          },
        });

        assignCb(chart);
      }

      // Função para formatar valor monetário
      function formatCurrency(value) {
        if (!value || value === "-" || value === 0) return "-";
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      }

      // Função para formatar número
      function formatNumber(value) {
        if (!value || value === "-" || value === 0) return "-";
        return new Intl.NumberFormat("pt-BR").format(value);
      }

      // Função para formatar percentual
      function formatPercent(value) {
        if (!value || isNaN(value) || value === 0) return "-";
        return new Intl.NumberFormat("pt-BR", {
          style: "percent",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value / 100);
      }

      // Função para atualizar cards de resumo
      function updateSummaryCards(dados) {
        if (!dados || dados.length === 0) {
          document.getElementById("qtdPrev").textContent = "-";
          document.getElementById("qtdReal").textContent = "-";
          document.getElementById("vlrPrev").textContent = "-";
          document.getElementById("vlrReal").textContent = "-";
          document.getElementById("pctQtd").textContent = "-";
          document.getElementById("pctVlr").textContent = "-";
          document.getElementById("ticketMedioPrev").textContent = "-";
          document.getElementById("ticketMedioReal").textContent = "-";
          document.getElementById("variacaoTicket").textContent = "-";
          return;
        }

        const totals = dados.reduce(
          (acc, item) => {
            acc.qtdPrev += parseFloat(item.QTDPREV || 0);
            acc.qtdReal += parseFloat(item.QTDREAL || 0);
            acc.vlrPrev += parseFloat(item.VLRPREV || 0);
            acc.vlrReal += parseFloat(item.VLRREAL || 0);
            return acc;
          },
          { qtdPrev: 0, qtdReal: 0, vlrPrev: 0, vlrReal: 0 }
        );

        document.getElementById("qtdPrev").textContent = formatNumber(
          totals.qtdPrev
        );
        document.getElementById("qtdReal").textContent = formatNumber(
          totals.qtdReal
        );
        document.getElementById("vlrPrev").textContent = formatCurrency(
          totals.vlrPrev
        );
        document.getElementById("vlrReal").textContent = formatCurrency(
          totals.vlrReal
        );

        const pctQtd =
          totals.qtdPrev > 0 ? (totals.qtdReal / totals.qtdPrev) * 100 : null;
        const pctVlr =
          totals.vlrPrev > 0 ? (totals.vlrReal / totals.vlrPrev) * 100 : null;

        document.getElementById("pctQtd").textContent =
          pctQtd === null ? "-" : formatPercent(pctQtd);
        document.getElementById("pctVlr").textContent =
          pctVlr === null ? "-" : formatPercent(pctVlr);

        const ticketMedioPrev =
          totals.qtdPrev > 0 ? totals.vlrPrev / totals.qtdPrev : 0;
        document.getElementById("ticketMedioPrev").textContent =
          formatCurrency(ticketMedioPrev);

        const ticketMedioReal =
          totals.qtdReal > 0 ? totals.vlrReal / totals.qtdReal : 0;
        document.getElementById("ticketMedioReal").textContent =
          formatCurrency(ticketMedioReal);

        const variacaoTicket =
          ticketMedioPrev > 0
            ? ((ticketMedioReal - ticketMedioPrev) / ticketMedioPrev) * 100
            : 0;
        document.getElementById("variacaoTicket").textContent =
          formatPercent(variacaoTicket);
      }

      // Função para inicializar o mapa
      function initMap() {
        map = L.map("geographicMap").setView([-14.235, -51.925], 4);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        if (autoZoomEnabled) {
          map.on("zoomend", function () {
            updateMapDisplay();
          });
        }
      }

      // Função para alternar modo de visualização
      function switchViewMode(mode) {
        currentViewMode = mode;

        document
          .querySelectorAll('[onclick^="switchViewMode"]')
          .forEach((btn) => {
            btn.classList.remove("active");
          });

        if (mode === "bubbles") {
          document.getElementById("btnBubbles").classList.add("active");
        } else if (mode === "heatmap") {
          document.getElementById("btnHeatmap").classList.add("active");
        } else if (mode === "markers") {
          document.getElementById("btnMarkers").classList.add("active");
        }

        updateMapDisplay();
      }

      // Função para alternar agregação
      function switchAggregation(level) {
        currentAggregation = level;

        document
          .querySelectorAll('[onclick^="switchAggregation"]')
          .forEach((btn) => {
            btn.classList.remove("active");
          });

        document
          .getElementById(
            `btn${level.charAt(0).toUpperCase() + level.slice(1)}`
          )
          .classList.add("active");

        updateMapDisplay();
      }

      // Função para alternar auto zoom
      function toggleAutoZoom() {
        autoZoomEnabled = document.getElementById("autoZoomToggle").checked;

        if (autoZoomEnabled) {
          map.on("zoomend", function () {
            updateMapDisplay();
          });
        } else {
          map.off("zoomend");
        }

        updateMapDisplay();
      }

      // Função para atualizar exibição do mapa
      function updateMapDisplay() {
        clearMapDisplay();

        if (!data || data.length === 0) return;

        const zoom = map.getZoom();
        let aggregationLevel = currentAggregation;

        if (autoZoomEnabled) {
          if (zoom >= 10) {
            aggregationLevel = "cidade";
          } else if (zoom >= 6) {
            aggregationLevel = "estado";
          } else {
            aggregationLevel = "pais";
          }
        }

        if (currentViewMode === "bubbles") {
          displayBubbles(aggregationLevel);
        } else if (currentViewMode === "heatmap") {
          displayHeatmap(aggregationLevel);
        } else if (currentViewMode === "markers") {
          displayMarkers(aggregationLevel);
        }
      }

      // Função para limpar exibição do mapa
      function clearMapDisplay() {
        markers.forEach((marker) => map.removeLayer(marker));
        markers = [];

        if (heatmapLayer) {
          map.removeLayer(heatmapLayer);
          heatmapLayer = null;
        }
        if (bubbleGroup) {
          map.removeLayer(bubbleGroup);
          bubbleGroup = null;
        }
      }

      // Função para agrupar dados
      function groupData(level) {
        const groupedData = {};

        data.forEach((item) => {
          const key = item[level.toUpperCase()] || "SEM_DEFINIR";

          if (!groupedData[key]) {
            groupedData[key] = {
              key: key,
              latitude: parseFloat(item.LATITUDE || 0),
              longitude: parseFloat(item.LONGETUDE || 0),
              QTDPREV: 0,
              QTDREAL: 0,
              VLRPREV: 0,
              VLRREAL: 0,
              count: 0,
            };
          }

          groupedData[key].QTDPREV += parseFloat(item.QTDPREV || 0);
          groupedData[key].QTDREAL += parseFloat(item.QTDREAL || 0);
          groupedData[key].VLRPREV += parseFloat(item.VLRPREV || 0);
          groupedData[key].VLRREAL += parseFloat(item.VLRREAL || 0);
          groupedData[key].count += 1;
        });

        return groupedData;
      }

      // Função para exibir bubbles
      function displayBubbles(level) {
        const grouped = groupData(level);

        bubbleGroup = L.layerGroup().addTo(map);

        Object.values(grouped).forEach((group) => {
          if (group.latitude === 0 || group.longitude === 0) return;

          const value = group.VLRREAL;
          const radius = Math.max(10, Math.min(100, Math.sqrt(value / 100)));
          const color = getColorByValue(value);

          const circle = L.circleMarker([group.latitude, group.longitude], {
            radius: radius,
            fillColor: color,
            color: "white",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7,
          }).addTo(bubbleGroup);

          const tooltip = createTooltip(group, level);
          circle.bindTooltip(tooltip, {
            permanent: false,
            direction: "top",
          });

          markers.push(circle);
        });
      }

      // Função para exibir heatmap
      function displayHeatmap(level) {
        const grouped = groupData(level);
        const heatData = [];

        Object.values(grouped).forEach((group) => {
          if (group.latitude === 0 || group.longitude === 0) return;
          heatData.push([
            group.latitude,
            group.longitude,
            group.VLRREAL / 1000,
          ]);
        });

        heatmapLayer = L.heatLayer(heatData, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: {
            0.0: "#9c9c9c",
            0.2: "#ffb914",
            0.4: "#f56e1e",
            0.6: "#e30613",
            0.8: "#00afa0",
            1.0: "#008a70",
          },
        }).addTo(map);
      }

      // Função para exibir marcadores
      function displayMarkers(level) {
        const grouped = groupData(level);

        Object.values(grouped).forEach((group) => {
          if (group.latitude === 0 || group.longitude === 0) return;

          const color = getColorByValue(group.VLRREAL);
          const icon = L.divIcon({
            className: "custom-marker",
            html: `<div style="background-color: ${color}; border: 3px solid white; border-radius: 50%; width: 30px; height: 30px; box-shadow: 0 3px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><i class="fas fa-map-marker-alt" style="color: white; font-size: 14px;"></i></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          const marker = L.marker([group.latitude, group.longitude], {
            icon: icon,
          }).addTo(map);

          const tooltip = createTooltip(group, level);
          marker.bindTooltip(tooltip, {
            permanent: false,
            direction: "top",
          });

          markers.push(marker);
        });
      }

      // Função para criar tooltip
      function createTooltip(group, level) {
        return `
          <div style="padding: 8px; min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #008a70; font-weight: 600;">${
              group.key
            }</h4>
            <div style="margin-bottom: 4px;"><strong>Nível:</strong> ${level}</div>
            <div style="margin-bottom: 4px;"><strong>Valor Realizado:</strong> ${formatCurrency(
              group.VLRREAL
            )}</div>
            <div style="margin-bottom: 4px;"><strong>Valor Previsto:</strong> ${formatCurrency(
              group.VLRPREV
            )}</div>
            <div style="margin-bottom: 4px;"><strong>Qtd Realizada:</strong> ${formatNumber(
              group.QTDREAL
            )}</div>
            <div style="margin-bottom: 4px;"><strong>Qtd Prevista:</strong> ${formatNumber(
              group.QTDPREV
            )}</div>
            <div style="margin-top: 8px; font-size: 0.85em; color: #6e6e6e;">Itens: ${
              group.count
            }</div>
          </div>
        `;
      }

      // Função para determinar cor
      function getColorByValue(value) {
        if (value <= 0) return "#9c9c9c";
        if (value <= 1000) return "#ffb914";
        if (value <= 10000) return "#f56e1e";
        if (value <= 50000) return "#e30613";
        if (value <= 100000) return "#00afa0";
        if (value <= 500000) return "#008a70";
        return "#00695e";
      }

      // Função para carregar dados
      async function loadData() {
        try {
          showLoading(true);

          if (typeof JX === "undefined" || !JX.consultar) {
            throw new Error(
              "SankhyaJX não está disponível para carregar os dados"
            );
          }

          const dtInicio =
            document.getElementById("dtInicio").value || "01/10/2025";
          const dtFim = document.getElementById("dtFim").value || "31/10/2025";

          const parceirosIn =
            selectedParceiros && selectedParceiros.length > 0
              ? ` AND MET.CODPARC IN (${selectedParceiros.join(",")})`
              : "";
          const vendedoresIn =
            selectedVendedores && selectedVendedores.length > 0
              ? ` AND MET.CODVEND IN (${selectedVendedores.join(",")})`
              : "";
          const marcasIn =
            selectedMarcas && selectedMarcas.length > 0
              ? ` AND MET.MARCA IN ('${selectedMarcas
                  .map((m) => m.replace(/'/g, "''"))
                  .join("','")}')`
              : "";
          const gruposIn =
            selectedGrupos && selectedGrupos.length > 0
              ? ` AND NVL(VGF.CODGRUPOPROD, MAR.AD_GRUPOPROD) IN (${selectedGrupos.join(
                  ","
                )})`
              : "";

          const sql = `
            SELECT LATITUDE,LONGETUDE,CIDADE,ESTADO,PAIS,SUM(QTDREAL)QTDREAL,SUM(QTDPREV)QTDPREV,SUM(VLRREAL)VLRREAL,SUM(VLRPREV)VLRPREV
            FROM(
              WITH NIVEL_BASE AS (
                SELECT 
                    NVL(MET.CODMETA, 0) AS CODMETA,
                    MET.DTREF AS DTREF,
                    NVL(MET.CODVEND, 0) AS CODVEND,
                    NVL(VEN.APELIDO, 'SEM_VENDEDOR') AS APELIDO,
                    NVL(VEN.CODGER, 0) AS CODGER,
                    NVL(MET.CODPARC, 0) AS CODPARC,
                    NVL(PAR.RAZAOSOCIAL, 'SEM_PARCEIRO') AS PARCEIRO,
                    NVL(MET.MARCA, 'SEM_MARCA') AS MARCA,
                    NVL(VGF.CODGRUPOPROD, MAR.AD_GRUPOPROD) AS CODGRUPOPROD,
                    NVL(VGF.DESCRGRUPOPROD, 'SEM_GRUPO') AS DESCRGRUPOPROD,
                    NVL(VGF.CODCENCUS, 0) AS CODCENCUS,
                    NVL(COO.LATITUDE, 0) AS LATITUDE,
                    NVL(COO.LONGETUDE, 0) AS LONGETUDE,
                    NVL(COO.MUNICIPALITY, 'SEM_CIDADE') AS CIDADE,
                    NVL(COO.ESTADO, 'SEM_ESTADO') AS ESTADO,
                    NVL(COO.PAIS, 'SEM_PAIS') AS PAIS,
                    NVL(MET.QTDPREV, 0) AS QTDPREV,
                    NVL(PRC.VLRVENDALT, 0) AS PRECOLT,
                    SUM(NVL(VGF.QTD, 0)) AS QTDREAL,
                    SUM(NVL(VGF.VLR, 0)) AS VLRREAL
                FROM TGFMET MET
                LEFT JOIN TGFMAR MAR 
                    ON MAR.DESCRICAO = MET.MARCA
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
                LEFT JOIN TGFPAR PAR 
                    ON MET.CODPARC = PAR.CODPARC
                LEFT JOIN TGFVEN VEN 
                    ON MET.CODVEND = VEN.CODVEND
                LEFT JOIN AD_LATLONGPARC COO 
                    ON MET.CODPARC = COO.CODPARC
                WHERE MET.CODMETA = 4 AND MET.DTREF BETWEEN '${dtInicio}' AND '${dtFim}'
                  ${parceirosIn}
                  ${vendedoresIn}
                  ${marcasIn}
                  ${gruposIn}
                GROUP BY 
                    NVL(VGF.CODGRUPOPROD, MAR.AD_GRUPOPROD),
                    NVL(VGF.DESCRGRUPOPROD, 'SEM_GRUPO'),
                    NVL(MET.CODMETA, 0),
                    MET.DTREF,
                    NVL(MET.CODVEND, 0),
                    NVL(VEN.APELIDO, 'SEM_VENDEDOR'),
                    NVL(VEN.CODGER, 0),
                    NVL(MET.CODPARC, 0),
                    NVL(PAR.RAZAOSOCIAL, 'SEM_PARCEIRO'),
                    NVL(MET.MARCA, 'SEM_MARCA'),
                    NVL(VGF.CODCENCUS, 0),
                    NVL(COO.LATITUDE, 0),
                    NVL(COO.LONGETUDE, 0),
                    NVL(COO.MUNICIPALITY, 'SEM_CIDADE'),
                    NVL(COO.ESTADO, 'SEM_ESTADO'),
                    NVL(COO.PAIS, 'SEM_PAIS'),
                    NVL(MET.QTDPREV, 0),
                    NVL(PRC.VLRVENDALT, 0)
            )
            SELECT 
                CODMETA,
                DTREF,
                CODVEND,
                APELIDO,
                CODGER,
                CODPARC,
                PARCEIRO,
                MARCA,
                CODGRUPOPROD,
                DESCRGRUPOPROD,
                CODCENCUS,
                LATITUDE,
                LONGETUDE,
                CIDADE,
                ESTADO,
                PAIS,
                QTDPREV,
                QTDREAL,
                VLRREAL,
                SUM(NVL(QTDPREV, 0) * NVL(PRECOLT, 0)) AS VLRPREV
            FROM NIVEL_BASE
            GROUP BY 
                CODMETA,
                DTREF,
                CODVEND,
                APELIDO,
                CODGER,
                CODPARC,
                PARCEIRO,
                MARCA,
                CODGRUPOPROD,
                DESCRGRUPOPROD,
                CODCENCUS,
                LATITUDE,
                LONGETUDE,
                CIDADE,
                ESTADO,
                PAIS,
                QTDPREV,
                QTDREAL,
                VLRREAL
            ORDER BY 
                CODMETA, DTREF, CODVEND, CODPARC
            )GROUP BY LATITUDE,LONGETUDE,CIDADE,ESTADO,PAIS
          `;

          const result = await JX.consultar(sql);

          if (result && result.length > 0) {
            data = result;
            updateSummaryCards(data);
            updateMapDisplay();
            loadChartsData();
            showSuccess(`${result.length} registros carregados com sucesso!`);
          } else {
            data = [];
            updateSummaryCards([]);
            clearMapDisplay();
            if (qtdChart) {
              qtdChart.destroy();
              qtdChart = null;
            }
            if (vlrChart) {
              vlrChart.destroy();
              vlrChart = null;
            }
            if (ticketChart) {
              ticketChart.destroy();
              ticketChart = null;
            }
            showError("Nenhum registro encontrado para o período selecionado");
          }
        } catch (error) {
          console.error("Erro ao carregar dados:", error);
          showError(`Erro ao carregar dados: ${error.message}`);
          data = [];
          updateSummaryCards([]);
        } finally {
          showLoading(false);
        }
      }

      // Função para alternar painel de controles
      function toggleControls() {
        const controls = document.getElementById("mapControls");
        const btn = document.getElementById("controlsToggleBtn");

        if (controls.classList.contains("hidden")) {
          controls.classList.remove("hidden");
          btn.innerHTML = '<i class="fas fa-cog"></i>';
          btn.title = "Ocultar Controles";
        } else {
          controls.classList.add("hidden");
          btn.innerHTML = '<i class="fas fa-chevron-left"></i>';
          btn.title = "Exibir Controles";
        }
      }

      // Função para alternar legenda
      function toggleLegend() {
        const legend = document.getElementById("legend");
        const btn = document.getElementById("legendToggleBtn");

        if (legend.classList.contains("hidden")) {
          legend.classList.remove("hidden");
          btn.innerHTML = '<i class="fas fa-info-circle"></i>';
          btn.title = "Ocultar Legenda";
        } else {
          legend.classList.add("hidden");
          btn.innerHTML = '<i class="fas fa-chevron-right"></i>';
          btn.title = "Exibir Legenda";
        }
      }

      // Inicializar ao carregar
      document.addEventListener("DOMContentLoaded", function () {
        initMap();
        preencherSafra("atual");
        carregarParceiros();
        carregarVendedores();
        carregarMarcas();
        carregarGrupos();
        loadData();
      });
    </script>
  </body>
</html>
